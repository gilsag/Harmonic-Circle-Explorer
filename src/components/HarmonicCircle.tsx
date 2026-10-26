import type { ChordDisplayStyle } from "../display";
import { formatChord } from "../display";
import { familyName, scaleName } from "../i18n/musicTerms";
import { translate, type InterfaceLanguage } from "../i18n/catalog";
import { wrapLegendText } from "../legendTextLayout";
import { useEffect, useState } from "react";
import type { Ref, MouseEvent as ReactMouseEvent } from "react";
import type { PlaybackStyle, VoicingStyle } from "../audio";
import { playChord, playVoiceLeadingTransition } from "../audio";
import type { ChordCandidate, ChordFamilyId, ScaleId, SectorRelationships } from "../music";
import {
  analyzeVoiceLeading,
  chordFamily,
  chordFamilyColor,
  chordPitchNames,
  isSubset,
  pitchClassesForScale,
  pitchName,
  romanNumeralForChord,
  scaleDefinition,
} from "../music";

type HarmonicCircleProps = {
  sectors: SectorRelationships[];
  counts: number[];
  referenceFamilyId: ChordFamilyId;
  relatedFamilyName: string;
  language: InterfaceLanguage;
  chordDisplayStyle: ChordDisplayStyle;
  showNoteRing: boolean;
  onPlayNote?: (pc:number,sectorIndex:number)=>void;
  onChordActivated?: (rootPc:number,familyId:ChordFamilyId,sectorIndex:number)=>void;
  allFamiliesMode: boolean;
  scaleId: ScaleId;
  diatonicOnly: boolean;
  highlightDiatonic: boolean;
  showEnharmonics: boolean;
  showSeparators: boolean;
  showLegend: boolean;
  showExplanation: boolean;
  explanation: string;
  showToneTooltips: boolean;
  colorByFamily: boolean;
  diameter: number;
  fontSize: number;
  playbackStyle: PlaybackStyle;
  voicingStyle: VoicingStyle;
  svgRef?: Ref<SVGSVGElement>;
};

type RingLayout = {
  count: number;
  inner: number;
  outer: number;
  radius: number;
  width: number;
};


type TooltipTone = {
  name: string;
  shared: boolean;
};

type TooltipData = {
  x: number;
  y: number;
  label: string;
  familyName: string;
  tones: TooltipTone[];
  sharedNames: string[];
  romanNumeral: string | null;
  diatonic: boolean;
  voiceLeadingText?: string;
};

type SelectedComparison = {
  sectorIndex: number;
  sharedCount: number;
  candidate: ChordCandidate;
};

function polar(cx: number, cy: number, radius: number, angleDegrees: number) {
  const angle = (angleDegrees * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function fittedFontSize(
  requested: number,
  ringWidth: number,
  radius: number,
  labels: readonly string[],
) {
  if (labels.length === 0) return requested;
  const maxChars = Math.max(...labels.map((label) => label.length));
  const verticalMax = (ringWidth * 0.76) / (labels.length * 1.16);
  const arcWidth = 2 * radius * Math.sin((12.7 * Math.PI) / 180);
  const horizontalMax = arcWidth / Math.max(1, maxChars * 0.57);
  return Math.max(4.5, Math.min(requested, verticalMax, horizontalMax));
}

type DenseLayoutMetrics = {
  columns: number;
  rowsPerColumn: number;
  fontSize: number;
  lineHeight: number;
  columnSpacing: number;
  rowsFollowTangent: boolean;
};

function denseLayoutMetrics(
  requested: number,
  ringWidth: number,
  radius: number,
  labels: readonly string[],
  angleRadians: number,
): DenseLayoutMetrics {
  if (labels.length === 0) {
    return {
      columns: 1,
      rowsPerColumn: 1,
      fontSize: requested,
      lineHeight: requested * 1.2,
      columnSpacing: 0,
      rowsFollowTangent: false,
    };
  }

  const sectorArcWidth = 2 * radius * Math.sin((12.7 * Math.PI) / 180);

  // Text itself stays horizontal. Near the left and right sides of the circle,
  // therefore, stacking rows radially makes adjacent words collide horizontally.
  // In those sectors we transpose the grid: rows follow the tangent (mostly
  // vertical) and columns follow the radius (mostly horizontal). Near the top
  // and bottom the conventional orientation is better.
  const rowsFollowTangent = Math.abs(Math.cos(angleRadians)) > Math.abs(Math.sin(angleRadians));
  const horizontalSpan = (rowsFollowTangent ? ringWidth : sectorArcWidth) * 0.84;
  const verticalSpan = (rowsFollowTangent ? sectorArcWidth : ringWidth) * 0.80;

  let bestColumns = 1;
  let bestRows = labels.length;
  let bestFont = 0;
  const maximumColumns = Math.min(3, labels.length);

  for (let columns = 1; columns <= maximumColumns; columns += 1) {
    const rows = Math.ceil(labels.length / columns);
    const verticalMax = verticalSpan / Math.max(1, rows * 1.22);
    const columnWidth = horizontalSpan / columns;
    let horizontalMax = requested;

    for (let column = 0; column < columns; column += 1) {
      const start = column * rows;
      const end = Math.min(labels.length, start + rows);
      const columnLabels = labels.slice(start, end);
      if (columnLabels.length === 0) continue;
      const maxChars = Math.max(...columnLabels.map((label) => label.length));
      horizontalMax = Math.min(horizontalMax, columnWidth / Math.max(1, maxChars * 0.56));
    }

    const candidateFont = Math.min(requested, verticalMax, horizontalMax);
    if (candidateFont > bestFont + 0.01) {
      bestFont = candidateFont;
      bestColumns = columns;
      bestRows = rows;
    }
  }

  const fontSize = Math.max(6.25, Math.min(requested, bestFont));
  const lineHeight = Math.min(verticalSpan / Math.max(1, bestRows), fontSize * 1.22);
  const columnSpacing = bestColumns > 1 ? horizontalSpan / bestColumns : 0;

  return {
    columns: bestColumns,
    rowsPerColumn: bestRows,
    fontSize,
    lineHeight,
    columnSpacing,
    rowsFollowTangent,
  };
}

function fittedSingleLineFontSize(requested: number, width: number, text: string) {
  if (!text) return requested;
  const estimated = width / Math.max(1, text.length * 0.56);
  return Math.max(9.5, Math.min(requested, estimated));
}

function maxCandidatesForCount(sectors: readonly SectorRelationships[], count: number) {
  return Math.max(0, ...sectors.map((sector) => sector.bySharedCount.get(count)?.length ?? 0));
}

function relationshipRingWeight(sectors: readonly SectorRelationships[], count: number, allFamiliesMode: boolean) {
  if (!allFamiliesMode) return 1;
  const maximum = maxCandidatesForCount(sectors, count);
  // Give dense aggregate rings additional radial room, but leave enough space
  // for neighbouring rings. The geometry-aware text grid handles the remaining
  // variation between top/bottom and side sectors.
  return Math.max(1, Math.min(2.5, maximum / 5));
}


function voiceLeadingText(
  referencePitches: readonly number[],
  targetPitches: readonly number[],
  sectorIndex: number,
  language: InterfaceLanguage,
) {
  const analysis = analyzeVoiceLeading(referencePitches, targetPitches);
  const parts = [translate(language,"app.motionUnit",{count:analysis.totalMotion})];
  if (analysis.addedPitchClasses.length > 0) {
    parts.push(`+${analysis.addedPitchClasses.map((pc) => pitchName(pc, sectorIndex, false)).join("/")}`);
  }
  if (analysis.removedPitchClasses.length > 0) {
    parts.push(`−${analysis.removedPitchClasses.map((pc) => pitchName(pc, sectorIndex, false)).join("/")}`);
  }
  return parts.join(" · ");
}

function tooltipPosition(x: number, y: number, width: number, height: number, canvasWidth: number, canvasHeight: number) {
  const offset = 16;
  const preferredX = x + offset;
  const preferredY = y + offset;
  return {
    x: Math.max(8, Math.min(preferredX, canvasWidth - width - 8)),
    y: Math.max(8, Math.min(preferredY, canvasHeight - height - 8)),
  };
}

export function HarmonicCircle({
  sectors,
  counts,
  referenceFamilyId,
  relatedFamilyName,
  language,
  chordDisplayStyle,
  showNoteRing,
  onPlayNote,
  onChordActivated,
  allFamiliesMode,
  scaleId,
  diatonicOnly,
  highlightDiatonic,
  showEnharmonics,
  showSeparators,
  showLegend,
  showExplanation,
  explanation,
  showToneTooltips,
  colorByFamily,
  diameter,
  fontSize,
  playbackStyle,
  voicingStyle,
  svgRef,
}: HarmonicCircleProps) {
  const t=(key:Parameters<typeof translate>[1],args?:Record<string,string|number>)=>translate(language,key,args);
  const labelFor=(pc:number,id:ChordFamilyId,sector:number)=>formatChord(pc,id,sector,showEnharmonics,chordDisplayStyle,language);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [selected, setSelected] = useState<SelectedComparison | null>(null);
  useEffect(() => {
    setTooltip(null);
    setSelected(null);
  }, [sectors, counts]);
  const margin = Math.max(22, diameter * 0.03);
  const gap = Math.max(34, diameter * 0.045);
  const rightColumnWidth = Math.max(380, diameter * 0.55);
  const hasRightColumn = showLegend || showExplanation;
  const referenceFamily = chordFamily(referenceFamilyId);
  const scale = scaleDefinition(scaleId);
  const referenceName=familyName(referenceFamilyId,referenceFamily.name,language);
  const scaleLabel=scaleName(scaleId,scale.name,language);
  const strokeWidth = Math.max(1.3, diameter / 520);

  const legendFont = Math.max(11,fontSize);
  const legendNoteFont=Math.max(10,fontSize*0.73);
  const legendNoteLineHeight=Math.max(14,legendNoteFont*1.35);
  const legendContentX=Math.max(150,rightColumnWidth*0.40);
  const legendValueWidth=rightColumnWidth-legendContentX-22;
  type LegendRow={ heading:string; values:string[]; y:number; height:number };
  const rowSpecs:[string,string[]][]=[];
  if(showNoteRing) rowSpecs.push([t("app.noteRing"),[t("app.notesDetail")]]);
  rowSpecs.push([t("app.chordRing"),[referenceName]]);
  counts.forEach((count,index)=>rowSpecs.push([
    t("app.ringOrdinal",{count:index+(showNoteRing?3:2)}),
    [allFamiliesMode?t("app.diatonicRelated"):(diatonicOnly?t("ui.diatonicFamily",{family:relatedFamilyName.toLowerCase()}):relatedFamilyName),
    t("app.sharing",{count,unit:count===1?t("ui.oneNote"):t("ui.manyNotes")})],
  ]));
  let rowY=50;
  const legendRows:LegendRow[]=rowSpecs.map(([heading,values])=>{
    const wrapped=values.flatMap(value=>wrapLegendText(value,legendValueWidth,legendFont));
    const height=Math.max(42,wrapped.length*legendFont*1.21+13);
    const row={heading,values:wrapped,y:rowY,height};rowY+=height;return row;
  });
  const legendNotesContent=[t("app.parent",{scale:scaleLabel})];
  if(highlightDiatonic&&!diatonicOnly) legendNotesContent.push(t(colorByFamily?"app.bold":"app.blue"));
  if(colorByFamily) legendNotesContent.push(t("app.colors"));
  const legendNotes=legendNotesContent.flatMap(note=>wrapLegendText(note,rightColumnWidth-48,legendNoteFont));
  const legendNotesY=rowY+8;
  const legendBoxHeight=legendNotesY+legendNotes.length*legendNoteLineHeight+23;

  const explanationFont = Math.max(11, fontSize * 0.78);
  const explanationLineHeight = explanationFont * 1.35;
  const explanationLines = wrapLegendText(explanation, rightColumnWidth - 48, explanationFont);
  const explanationBoxHeight = 58 + explanationLines.length * explanationLineHeight + 18;
  const stackGap = showLegend && showExplanation ? 18 : 0;
  const rightStackHeight =
    (showLegend ? legendBoxHeight : 0) +
    stackGap +
    (showExplanation ? explanationBoxHeight : 0);

  const canvasWidth = diameter + margin * 2 + (hasRightColumn ? gap + rightColumnWidth : 0);
  const canvasHeight = Math.max(diameter + margin * 2, rightStackHeight + margin * 2);
  const cx = margin + diameter / 2;
  const cy = canvasHeight / 2;
  const outerRadius = diameter / 2 - 10;
  // Reserve an explicit inner annulus for the twelve individual pitch classes.
  const holeRadius = outerRadius * (showNoteRing ? 0.34 : 0.27);
  const centerHoleRadius=showNoteRing ? holeRadius*0.56 : holeRadius;
  const noteRingRadius=(holeRadius+centerHoleRadius)/2;
  const noteRingWidth=holeRadius-centerHoleRadius;

  // Single-family diagrams retain equal-width bands. Aggregate diagrams use
  // wider bands for the relationship classes with the densest sector lists.
  const referenceWeight = 1;
  const relationshipWeights = counts.map((count) => relationshipRingWeight(sectors, count, allFamiliesMode));
  const totalWeight = referenceWeight + relationshipWeights.reduce((sum, value) => sum + value, 0);
  const radialUnit = (outerRadius - holeRadius) / Math.max(1, totalWeight);
  const referenceBandWidth = radialUnit * referenceWeight;
  const referenceRadius = holeRadius + referenceBandWidth / 2;

  let ringCursor = holeRadius + referenceBandWidth;
  const ringLayouts: RingLayout[] = counts.map((count, index) => {
    const width = radialUnit * relationshipWeights[index];
    const inner = ringCursor;
    const outer = inner + width;
    ringCursor = outer;
    return { count, inner, outer, radius: inner + width / 2, width };
  });
  const ringBoundaries = [holeRadius, holeRadius + referenceBandWidth, ...ringLayouts.map((layout) => layout.outer)];

  const rightX = margin * 2 + diameter + gap;
  const rightStartY = (canvasHeight - rightStackHeight) / 2;
  const legendY = rightStartY;
  const explanationY = rightStartY + (showLegend ? legendBoxHeight + stackGap : 0);

  const showCandidateTooltip = (
    candidate: ChordCandidate,
    sector: SectorRelationships,
    sectorIndex: number,
    label: string,
    x: number,
    y: number,
  ) => {
    if (!showToneTooltips) return;
    const sharedSet = new Set(sector.referencePitches.filter((pc) => candidate.pitchClasses.includes(pc)));
    const toneNames = candidate.pitchClasses.map((pc) => ({
      name: pitchName(pc, sectorIndex, false),
      shared: sharedSet.has(pc),
    }));
    const sharedNames = candidate.pitchClasses
      .filter((pc) => sharedSet.has(pc))
      .map((pc) => pitchName(pc, sectorIndex, false));
    setTooltip({
      x,
      y,
      label,
      familyName: familyName(candidate.familyId,chordFamily(candidate.familyId).name,language),
      tones: toneNames,
      sharedNames,
      romanNumeral: romanNumeralForChord(candidate.rootPc, candidate.familyId, sector.referenceRootPc, scaleId),
      diatonic: candidate.diatonic,
      voiceLeadingText: voiceLeadingText(sector.referencePitches, candidate.pitchClasses, sectorIndex,language),
    });
  };

  const selectAndPlayCandidate = (
    event: ReactMouseEvent<SVGTextElement>,
    candidate: ChordCandidate,
    sector: SectorRelationships,
    sectorIndex: number,
    sharedCount: number,
  ) => {
    event.stopPropagation();
    setSelected({ sectorIndex, sharedCount, candidate });
    onChordActivated?.(candidate.rootPc,candidate.familyId,sectorIndex);
    const reference = { rootPc: sector.referenceRootPc, familyId: referenceFamilyId };
    if (voicingStyle === "smooth") {
      playVoiceLeadingTransition(reference, candidate.rootPc, candidate.familyId, playbackStyle);
    } else {
      playChord(candidate.rootPc, candidate.familyId, playbackStyle, "root");
    }
  };

  return (
    <svg
      ref={svgRef}
      className="harmonic-diagram"
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      aria-label={t("ui.harmonicCircleAria")}
      onClick={() => setSelected(null)}
    >
      <rect x="0" y="0" width={canvasWidth} height={canvasHeight} fill="#ffffff" />

      <g className="circle-geometry">
        {ringBoundaries.map((radius, index) => (
          <circle
            key={`ring-${index}-${radius}`}
            cx={cx}
            cy={cy}
            r={radius}
            fill={index === 0 ? "#ffffff" : "none"}
            stroke="#16191f"
            strokeWidth={strokeWidth}
          />
        ))}

        {showNoteRing && <circle cx={cx} cy={cy} r={centerHoleRadius} fill="none" stroke="#16191f" strokeWidth={strokeWidth}/>}
        {showSeparators &&
          Array.from({ length: 12 }, (_unused, index) => {
            const angle = -105 + index * 30;
            const inner = polar(cx, cy, showNoteRing?centerHoleRadius:holeRadius, angle);
            const outer = polar(cx, cy, outerRadius, angle);
            return (
              <line
                key={`separator-${index}`}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="#16191f"
                strokeWidth={strokeWidth * 0.82}
              />
            );
          })}
      </g>

      {showNoteRing && (
        <g className="note-ring" aria-label={t("app.noteRing")}>
          {sectors.map((sector,index)=>{
            const position=polar(cx,cy,noteRingRadius,-90+index*30);
            const name=pitchName(sector.referenceRootPc,index,showEnharmonics);
            return <text key={`note-${sector.referenceRootPc}`} className="chord-label note-ring-label"
              x={position.x} y={position.y} textAnchor="middle" dominantBaseline="middle"
              fontSize={Math.max(8,Math.min(fontSize*0.8,noteRingWidth*0.42))}
              role="button" tabIndex={0} aria-label={`${t("app.noteRingAria")}: ${name}`}
              onClick={(event)=>{event.stopPropagation();onPlayNote?.(sector.referenceRootPc,index);}}
              onKeyDown={(event)=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();onPlayNote?.(sector.referenceRootPc,index);}}}
            ><title>{name}</title>{name}</text>;
          })}
        </g>
      )}
      <g className="reference-ring">
        {sectors.map((sector, sectorIndex) => {
          const angle = -90 + sectorIndex * 30;
          const position = polar(cx, cy, referenceRadius, angle);
          const label = labelFor(sector.referenceRootPc,referenceFamilyId,sectorIndex);
          const toneNames = chordPitchNames(sector.referenceRootPc, referenceFamilyId, sectorIndex);
          const referenceFont = fittedFontSize(fontSize * 1.12, referenceBandWidth, referenceRadius, [label]);
          const romanNumeral = romanNumeralForChord(
            sector.referenceRootPc,
            referenceFamilyId,
            sector.referenceRootPc,
            scaleId,
          );
          const referenceSelected = selected?.sectorIndex === sectorIndex;
          return (
            <text
              key={`reference-${sector.referenceRootPc}`}
              className={`chord-label reference-label${referenceSelected ? " selected-reference" : ""}`}
              x={position.x}
              y={position.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={referenceFont}
              style={colorByFamily ? { fill: chordFamilyColor(referenceFamilyId) } : undefined}
              onMouseEnter={() => {
                if (!showToneTooltips) return;
                setTooltip({
                  x: position.x,
                  y: position.y,
                  label,
                  familyName: referenceName,
                  tones: toneNames.map((name) => ({ name, shared: false })),
                  sharedNames: [],
                  romanNumeral,
                  diatonic: isSubset(
                    sector.referencePitches,
                    pitchClassesForScale(sector.referenceRootPc, scaleId),
                  ),
                });
              }}
              onMouseLeave={() => setTooltip(null)}
              onClick={(event) => {
                event.stopPropagation();
                setSelected(null);
                playChord(sector.referenceRootPc, referenceFamilyId, playbackStyle, "root");
                onChordActivated?.(sector.referenceRootPc,referenceFamilyId,sectorIndex);
              }}
            >
              {label}
            </text>
          );
        })}
      </g>

      {ringLayouts.map((layout) => {
        const sharedCount = layout.count;
        return (
          <g key={`relationship-${sharedCount}`} className="relationship-ring">
            {sectors.map((sector, sectorIndex) => {
              const candidates = sector.bySharedCount.get(sharedCount) ?? [];
              if (candidates.length === 0) return null;
              const angleDegrees = -90 + sectorIndex * 30;
              const angle = (angleDegrees * Math.PI) / 180;
              const center = polar(cx, cy, layout.radius, angleDegrees);
              const labels = candidates.map((candidate) =>
                labelFor(candidate.rootPc,candidate.familyId,sectorIndex),
              );

              if (allFamiliesMode) {
                const denseLayout = denseLayoutMetrics(fontSize, layout.width, layout.radius, labels, angle);
                const radialX = Math.cos(angle);
                const radialY = Math.sin(angle);
                const tangentX = -Math.sin(angle);
                const tangentY = Math.cos(angle);

                return (
                  <g key={`sector-${sectorIndex}-shared-${sharedCount}`}>
                    {candidates.map((candidate, candidateIndex) => {
                      const column = Math.floor(candidateIndex / denseLayout.rowsPerColumn);
                      const row = candidateIndex % denseLayout.rowsPerColumn;
                      const itemsInColumn = Math.min(
                        denseLayout.rowsPerColumn,
                        candidates.length - column * denseLayout.rowsPerColumn,
                      );
                      const rowOffset = (row - (itemsInColumn - 1) / 2) * denseLayout.lineHeight;
                      const columnOffset = (column - (denseLayout.columns - 1) / 2) * denseLayout.columnSpacing;

                      // At the sides, rows run tangentially (mostly vertically) and
                      // columns radially (mostly horizontally). At the top/bottom the
                      // axes are left in their conventional orientation. This keeps
                      // horizontal chord labels from colliding in side sectors.
                      const radialOffset = denseLayout.rowsFollowTangent ? columnOffset : rowOffset;
                      const tangentOffset = denseLayout.rowsFollowTangent ? rowOffset : columnOffset;
                      const x = center.x + radialOffset * radialX + tangentOffset * tangentX;
                      const y = center.y + radialOffset * radialY + tangentOffset * tangentY;
                      const label = labels[candidateIndex];
                      const isHighlighted = !diatonicOnly && highlightDiatonic && candidate.diatonic;
                      const isSelected = selected?.sectorIndex === sectorIndex
                        && selected.sharedCount === sharedCount
                        && selected.candidate.familyId === candidate.familyId
                        && selected.candidate.rootPc === candidate.rootPc;
                      const highlightClass = isHighlighted
                        ? (colorByFamily ? " diatonic-family-highlight" : " diatonic-highlight")
                        : "";
                      return (
                        <text
                          key={`${sectorIndex}-${sharedCount}-${candidate.familyId}-${candidate.rootPc}`}
                          className={`chord-label related-label${highlightClass}${isSelected ? " selected-chord" : ""}`}
                          x={x}
                          y={y}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={denseLayout.fontSize}
                          style={colorByFamily ? { fill: chordFamilyColor(candidate.familyId) } : undefined}
                          onMouseEnter={() => showCandidateTooltip(candidate, sector, sectorIndex, label, x, y)}
                          onMouseLeave={() => setTooltip(null)}
                          onClick={(event) => selectAndPlayCandidate(event, candidate, sector, sectorIndex, sharedCount)}
                        >
                          {label}
                        </text>
                      );
                    })}
                  </g>
                );
              }

              const candidateFont = fittedFontSize(fontSize, layout.width, layout.radius, labels);
              const lineHeight = candidateFont * 1.18;
              const firstOffset = -((candidates.length - 1) * lineHeight) / 2;

              return (
                <g key={`sector-${sectorIndex}-shared-${sharedCount}`}>
                  {candidates.map((candidate, candidateIndex) => {
                    const label = labels[candidateIndex];
                    const isHighlighted = !diatonicOnly && highlightDiatonic && candidate.diatonic;
                    const isSelected = selected?.sectorIndex === sectorIndex
                      && selected.sharedCount === sharedCount
                      && selected.candidate.familyId === candidate.familyId
                      && selected.candidate.rootPc === candidate.rootPc;
                    const highlightClass = isHighlighted
                      ? (colorByFamily ? " diatonic-family-highlight" : " diatonic-highlight")
                      : "";
                    const y = center.y + firstOffset + candidateIndex * lineHeight;
                    return (
                      <text
                        key={`${sectorIndex}-${sharedCount}-${candidate.familyId}-${candidate.rootPc}`}
                        className={`chord-label related-label${highlightClass}${isSelected ? " selected-chord" : ""}`}
                        x={center.x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={candidateFont}
                        style={colorByFamily ? { fill: chordFamilyColor(candidate.familyId) } : undefined}
                        onMouseEnter={() => showCandidateTooltip(candidate, sector, sectorIndex, label, center.x, y)}
                        onMouseLeave={() => setTooltip(null)}
                        onClick={(event) => selectAndPlayCandidate(event, candidate, sector, sectorIndex, sharedCount)}
                      >
                        {label}
                      </text>
                    );
                  })}
                </g>
              );
            })}
          </g>
        );
      })}

      {selected && (() => {
        const sector = sectors[selected.sectorIndex];
        if (!sector) return null;
        const candidate = selected.candidate;
        const referenceLabel = labelFor(sector.referenceRootPc,referenceFamilyId,selected.sectorIndex);
        const targetLabel = labelFor(candidate.rootPc,candidate.familyId,selected.sectorIndex);
        const analysis = analyzeVoiceLeading(sector.referencePitches, candidate.pitchClasses);
        const sharedNames = candidate.pitchClasses
          .filter((pc) => analysis.sharedPitchClasses.includes(pc))
          .map((pc) => pitchName(pc, selected.sectorIndex, false));
        const romanNumeral = romanNumeralForChord(
          candidate.rootPc,
          candidate.familyId,
          sector.referenceRootPc,
          scaleId,
        );
        const comparisonFont = Math.max(8.5, Math.min(fontSize * 0.72, centerHoleRadius * 0.15));
        const lineHeight = comparisonFont * 1.38;
        const lines = 4;
        const startY = cy - ((lines - 1) * lineHeight) / 2;
        return (
          <g className="selection-comparison" data-export-ignore="true" pointerEvents="none">
            <text
              x={cx}
              y={startY}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={comparisonFont * 1.08}
              fontWeight="800"
            >
              {`${referenceLabel} → ${targetLabel}`}
            </text>
            <text
              x={cx}
              y={startY + lineHeight}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={comparisonFont}
              className="comparison-roman"
            >
              {`${t("app.roman")}: ${romanNumeral ?? t("app.chromaticRoot")}`}
            </text>
            <text
              x={cx}
              y={startY + lineHeight * 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={comparisonFont}
              className="comparison-shared"
              fontWeight="750"
            >
              {`${t("app.shared")}: ${sharedNames.length > 0 ? sharedNames.join(" · ") : t("app.noneShared")}`}
            </text>
            <text
              x={cx}
              y={startY + lineHeight * 3}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={comparisonFont * 0.92}
              className="comparison-motion"
            >
              {voiceLeadingText(sector.referencePitches, candidate.pitchClasses, selected.sectorIndex,language)}
            </text>
          </g>
        );
      })()}



      {showLegend && (
        <g className="legend" transform={`translate(${rightX}, ${legendY})`}>
          <rect x="0" y="0" width={rightColumnWidth} height={legendBoxHeight}
            fill="#ffffff" stroke="#16191f" strokeWidth={strokeWidth}/>
          {legendRows.map((row,index)=><g key={`legend-row-${index}`}>
            <text x="24" y={row.y} className="legend-heading" fontSize={fittedSingleLineFontSize(legendFont,legendContentX-42,row.heading)} fontWeight="800">{row.heading}</text>
            {row.values.map((line,lineIndex)=><text key={`${index}-${lineIndex}`} x={legendContentX}
              y={row.y+lineIndex*legendFont*1.21} className="legend-row" fontSize={legendFont}>{line}</text>)}
          </g>)}
          {legendNotes.map((line,index)=><text key={`legend-note-${index}`} x="24" y={legendNotesY+index*legendNoteLineHeight}
            className="legend-note" fontSize={legendNoteFont}>{line}</text>)}
        </g>
      )}

      {showExplanation && (
        <g className="explanation" transform={`translate(${rightX}, ${explanationY})`}>
          <rect
            x="0"
            y="0"
            width={rightColumnWidth}
            height={explanationBoxHeight}
            fill="#ffffff"
            stroke="#16191f"
            strokeWidth={strokeWidth}
          />
          <text x="24" y="35" className="explanation-heading" fontSize={fontSize} fontWeight="800">
            {t("app.explanationTitle")}
          </text>
          <text x="24" y="59" className="explanation-text" fontSize={explanationFont}>
            {explanationLines.map((line, index) => (
              <tspan key={`${index}-${line}`} x="24" dy={index === 0 ? 0 : explanationLineHeight}>
                {line}
              </tspan>
            ))}
          </text>
        </g>
      )}
      {tooltip && showToneTooltips && (() => {
        const tooltipWidth = Math.max(280, Math.min(360, diameter * 0.42));
        const tooltipHeight = tooltip.voiceLeadingText ? 176 : 150;
        const position = tooltipPosition(
          tooltip.x,
          tooltip.y,
          tooltipWidth,
          tooltipHeight,
          canvasWidth,
          canvasHeight,
        );
        return (
          <foreignObject
            data-export-ignore="true"
            className="rich-tooltip-host"
            x={position.x}
            y={position.y}
            width={tooltipWidth}
            height={tooltipHeight}
            pointerEvents="none"
          >
            <div className="rich-tooltip">
              <div className="tooltip-title">{tooltip.label}</div>
              <div className="tooltip-family">{tooltip.familyName}</div>
              <div className="tooltip-row">
                <span className="tooltip-label">{t("app.tones")}:</span>{" "}
                {tooltip.tones.map((tone, index) => (
                  <span key={`${tone.name}-${index}`}>
                    <span className={tone.shared ? "shared-tone" : undefined}>{tone.name}</span>
                    {index < tooltip.tones.length - 1 ? " · " : ""}
                  </span>
                ))}
              </div>
              {tooltip.sharedNames.length > 0 && (
                <div className="tooltip-row">
                  <span className="tooltip-label">{t("app.shared")}:</span>{" "}
                  <span className="shared-tone">{tooltip.sharedNames.join(" · ")}</span>
                </div>
              )}
              <div className="tooltip-row">
                <span className="tooltip-label">{t("app.roman")}:</span>{" "}
                {tooltip.romanNumeral ?? t("app.chromaticRoot")}
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">{t("app.parentRelation")}:</span>{" "}
                {tooltip.diatonic ? t("app.diatonic") : t("app.chromatic")}
              </div>
              {tooltip.voiceLeadingText && (
                <div className="tooltip-row">
                  <span className="tooltip-label">{t("app.motion")}:</span>{" "}
                  {tooltip.voiceLeadingText}
                </div>
              )}
            </div>
          </foreignObject>
        );
      })()}

    </svg>
  );
}
