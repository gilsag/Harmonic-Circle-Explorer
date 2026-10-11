import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import "./App.css";
import type { PlaybackStyle, VoicingStyle } from "./audio";
import { HarmonicCircle } from "./components/HarmonicCircle";
import { APP_INFO } from "./config/appInfo";
import { downloadPng, downloadSvg } from "./download";
import { buildDiagramExplanation } from "./explanation";
import type { ChordFamilyId, RelatedFamilyId, ScaleId } from "./music";
import {
  CHORD_FAMILIES,
  DEFAULT_RING_VISIBILITY,
  SCALES,
  buildSectorRelationships,
  chordFamily,
  filterRelationshipCounts,
  relatedFamilyName,
  relatedFamilyShortName,
  relationshipCounts,
  scaleDefinition,
} from "./music";

type DownloadFormat = "svg" | "png";

type SectionProps = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

function ControlSection({ title, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="control-section">
      <button className="section-title" type="button" onClick={() => setOpen((value) => !value)}>
        {title}<span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="section-content">{children}</div>}
    </section>
  );
}

function safeFilenamePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function App() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [referenceFamilyId, setReferenceFamilyId] = useState<ChordFamilyId>("major");
  const [relatedFamilyId, setRelatedFamilyId] = useState<RelatedFamilyId>("minor7");
  const [scaleId, setScaleId] = useState<ScaleId>("ionian");
  const [diatonicOnly, setDiatonicOnly] = useState(false);
  const [highlightDiatonic, setHighlightDiatonic] = useState(true);
  const [showEnharmonics, setShowEnharmonics] = useState(false);
  const [showSeparators, setShowSeparators] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [showExplanation, setShowExplanation] = useState(false);
  const [ringVisibility, setRingVisibility] = useState<Record<number, boolean>>(() => ({ ...DEFAULT_RING_VISIBILITY }));
  const [showToneTooltips, setShowToneTooltips] = useState(true);
  const [colorByFamily, setColorByFamily] = useState(false);
  const [diameter, setDiameter] = useState(900);
  const [fontSize, setFontSize] = useState(18);
  const [playbackStyle, setPlaybackStyle] = useState<PlaybackStyle>("block");
  const [voicingStyle, setVoicingStyle] = useState<VoicingStyle>("root");
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>("svg");
  const [showAbout, setShowAbout] = useState(false);

  const allFamiliesMode = relatedFamilyId === "all";
  const effectiveDiatonicOnly = diatonicOnly || allFamiliesMode;
  const effectiveHighlightDiatonic = !effectiveDiatonicOnly && highlightDiatonic;

  // Build the complete candidate set (including zero-overlap relationships) first.
  // Ring visibility is a rendering choice, so hiding a ring never changes the
  // underlying harmonic search and a hidden ring can always be restored.
  const sectors = useMemo(
    () => buildSectorRelationships(referenceFamilyId, relatedFamilyId, scaleId, effectiveDiatonicOnly, true),
    [referenceFamilyId, relatedFamilyId, scaleId, effectiveDiatonicOnly],
  );
  const availableCounts = useMemo(() => relationshipCounts(sectors), [sectors]);
  const counts = useMemo(
    () => filterRelationshipCounts(availableCounts, ringVisibility),
    [availableCounts, ringVisibility],
  );
  const allSectors = useMemo(
    () => buildSectorRelationships(referenceFamilyId, relatedFamilyId, scaleId, allFamiliesMode, true),
    [referenceFamilyId, relatedFamilyId, scaleId, allFamiliesMode],
  );
  const allCounts = useMemo(() => relationshipCounts(allSectors), [allSectors]);
  const referenceFamily = chordFamily(referenceFamilyId);
  const relatedName = relatedFamilyName(relatedFamilyId);
  const relatedShortName = relatedFamilyShortName(relatedFamilyId);
  const scale = scaleDefinition(scaleId);
  const explanation = useMemo(
    () => buildDiagramExplanation({
      referenceFamilyName: referenceFamily.name,
      relatedFamilyName: relatedName,
      scaleName: scale.name,
      diatonicOnly: effectiveDiatonicOnly,
      highlightDiatonic: effectiveHighlightDiatonic,
      allFamiliesMode,
      counts,
      availableCounts,
      allCounts,
    }),
    [referenceFamily.name, relatedName, scale.name, effectiveDiatonicOnly, effectiveHighlightDiatonic, allFamiliesMode, counts, availableCounts, allCounts],
  );

  const reset = () => {
    setReferenceFamilyId("major");
    setRelatedFamilyId("minor7");
    setScaleId("ionian");
    setDiatonicOnly(false);
    setHighlightDiatonic(true);
    setShowEnharmonics(false);
    setShowSeparators(true);
    setShowLegend(true);
    setShowExplanation(false);
    setRingVisibility({ ...DEFAULT_RING_VISIBILITY });
    setShowToneTooltips(true);
    setColorByFamily(false);
    setDiameter(900);
    setFontSize(18);
    setPlaybackStyle("block");
    setVoicingStyle("root");
    setDownloadFormat("svg");
  };

  const download = () => {
    if (!svgRef.current) return;
    const filename = [
      "harmonic-circle",
      safeFilenamePart(referenceFamily.shortName),
      safeFilenamePart(relatedShortName),
      effectiveDiatonicOnly ? "diatonic" : "all",
      safeFilenamePart(scale.name),
    ].join("-");

    if (downloadFormat === "png") {
      downloadPng(svgRef.current, `${filename}.png`);
    } else {
      downloadSvg(svgRef.current, `${filename}.svg`);
    }
  };

  const chooseSeventhPreset = (familyId: ChordFamilyId) => {
    setReferenceFamilyId("major");
    setRelatedFamilyId(familyId);
  };

  return (
    <div className="app-shell">
      <aside className="left-panel">
        <div className="brand-row">
          <div>
            <h1>{APP_INFO.name}</h1>
            <p className="version">v{APP_INFO.version}</p>
          </div>
        </div>

        <ControlSection title="Harmony">
          <label>
            Reference family (inner ring)
            <select
              value={referenceFamilyId}
              onChange={(event) => setReferenceFamilyId(event.target.value as ChordFamilyId)}
            >
              {CHORD_FAMILIES.map((family) => (
                <option key={family.id} value={family.id}>{family.name}</option>
              ))}
            </select>
          </label>

          <label>
            Related chord family (outer rings)
            <select
              value={relatedFamilyId}
              onChange={(event) => setRelatedFamilyId(event.target.value as RelatedFamilyId)}
            >
              <option value="all">All families (diatonic only)</option>
              {CHORD_FAMILIES.map((family) => (
                <option key={family.id} value={family.id}>{family.name}</option>
              ))}
            </select>
          </label>

          <label>
            Parent scale / mode
            <select value={scaleId} onChange={(event) => setScaleId(event.target.value as ScaleId)}>
              {SCALES.map((scaleOption) => (
                <option key={scaleOption.id} value={scaleOption.id}>{scaleOption.name}</option>
              ))}
            </select>
          </label>

          <div className="preset-block">
            <span className="control-caption">Common seventh diagrams</span>
            <div className="button-grid">
              <button type="button" onClick={() => chooseSeventhPreset("minor7")}>Minor 7</button>
              <button type="button" onClick={() => chooseSeventhPreset("major7")}>Major 7</button>
              <button type="button" onClick={() => chooseSeventhPreset("dominant7")}>Dominant 7</button>
              <button type="button" onClick={() => chooseSeventhPreset("diminished7")}>Diminished 7</button>
            </div>
          </div>
        </ControlSection>

        <ControlSection title="Diatonic relationships">
          <label className={`check-row${allFamiliesMode ? " disabled-row" : ""}`}>
            <input
              type="checkbox"
              checked={effectiveDiatonicOnly}
              disabled={allFamiliesMode}
              onChange={(event) => setDiatonicOnly(event.target.checked)}
            />
            Show only diatonic chords
          </label>
          <label className={`check-row${effectiveDiatonicOnly ? " disabled-row" : ""}`}>
            <input
              type="checkbox"
              checked={effectiveHighlightDiatonic}
              disabled={effectiveDiatonicOnly}
              onChange={(event) => setHighlightDiatonic(event.target.checked)}
            />
            Highlight diatonic chords when showing all
          </label>
          <p className="hint">
            {allFamiliesMode
              ? "All families mode is intentionally diatonic-only to keep the diagram readable. Diatonic membership is evaluated against the selected parent scale or mode in each sector."
              : "Diatonic membership is evaluated against the selected scale or mode using each sector root as the tonic."}
          </p>
        </ControlSection>

        <ControlSection title="Diagram">
          <label className="check-row">
            <input
              type="checkbox"
              checked={showSeparators}
              onChange={(event) => setShowSeparators(event.target.checked)}
            />
            Segment separator lines
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={showLegend}
              onChange={(event) => setShowLegend(event.target.checked)}
            />
            Show legend
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={showEnharmonics}
              onChange={(event) => setShowEnharmonics(event.target.checked)}
            />
            Show enharmonic equivalents
          </label>
          <div className="ring-control-block">
            <span className="control-caption">Outer rings</span>
            {availableCounts.length > 0 ? (
              <div className="ring-control-list">
                {availableCounts.map((count) => (
                  <label className="check-row" key={`ring-control-${count}`}>
                    <input
                      type="checkbox"
                      checked={ringVisibility[count] ?? count !== 0}
                      onChange={(event) =>
                        setRingVisibility((current) => ({ ...current, [count]: event.target.checked }))
                      }
                    />
                    {`Show ${count}-shared-${count === 1 ? "note" : "notes"} ring`}
                  </label>
                ))}
              </div>
            ) : (
              <p className="hint">No relationship rings are available for the current harmonic settings.</p>
            )}
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={showToneTooltips}
              onChange={(event) => setShowToneTooltips(event.target.checked)}
            />
            Show chord-tone tooltips
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={colorByFamily}
              onChange={(event) => setColorByFamily(event.target.checked)}
            />
            Color labels by chord family
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={showExplanation}
              onChange={(event) => setShowExplanation(event.target.checked)}
            />
            Show explanation box
          </label>
          <label>
            Circle diameter: {diameter}px
            <input
              type="range"
              min="600"
              max="1400"
              step="20"
              value={diameter}
              onChange={(event) => setDiameter(Number(event.target.value))}
            />
          </label>
          <label>
            Maximum font size: {fontSize}px
            <input
              type="range"
              min="11"
              max="30"
              step="1"
              value={fontSize}
              onChange={(event) => setFontSize(Number(event.target.value))}
            />
          </label>
          <p className="hint">Outer rings can be shown or hidden independently. The 0-shared-notes ring is off by default. In All families mode, dense sectors use an adaptive multi-column layout and wider bands before reducing text size. Chord tooltips include tones, highlighted shared tones, Roman numerals, and voice-leading information. Family colors are optional. The explanation box is included in exports when enabled.</p>
        </ControlSection>

        <ControlSection title="Audio">
          <label>
            Playback
            <select
              value={playbackStyle}
              onChange={(event) => setPlaybackStyle(event.target.value as PlaybackStyle)}
            >
              <option value="block">Block chord</option>
              <option value="arpeggio">Arpeggio</option>
            </select>
          </label>
          <label>
            Voicing
            <select
              value={voicingStyle}
              onChange={(event) => setVoicingStyle(event.target.value as VoicingStyle)}
            >
              <option value="root">Root position</option>
              <option value="smooth">Smooth voice leading</option>
            </select>
          </label>
          <p className="hint">Click a related chord to hear it and compare it with the reference chord in that sector. Smooth voice leading plays the reference chord first, then the related chord in its minimum-motion voicing so the movement can be heard directly. Nothing plays on hover.</p>
        </ControlSection>

        <div className="sidebar-actions">
          <button type="button" className="secondary-action" onClick={() => setShowAbout(true)}>About</button>
          <button type="button" className="danger-action" onClick={reset}>Reset</button>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="diagram-summary">
            <strong>{referenceFamily.name}</strong>
            <span>→</span>
            <strong>{allFamiliesMode ? "All diatonic chord families" : relatedName}</strong>
            <span className="summary-detail">· {scale.name}</span>
          </div>
          <div className="topbar-spacer" />
          <select
            className="download-select"
            value={downloadFormat}
            onChange={(event) => setDownloadFormat(event.target.value as DownloadFormat)}
            aria-label="Download file type"
          >
            <option value="svg">SVG</option>
            <option value="png">PNG</option>
          </select>
          <button type="button" className="download-button" onClick={download}>
            Download {downloadFormat.toUpperCase()}
          </button>
        </header>

        {availableCounts.length === 0 && (
          <div className="empty-result">
            No {allFamiliesMode ? "diatonic chord" : relatedName.toLowerCase()} relationships satisfy the current filter for {scale.name}.
          </div>
        )}
        {availableCounts.length > 0 && counts.length === 0 && (
          <div className="empty-result">
            All available outer rings are hidden. Re-enable at least one ring in Diagram → Outer rings.
          </div>
        )}

        <div className="canvas-wrap">
          <div className="svg-host" style={{ width: `${diameter + (showLegend || showExplanation ? Math.max(460, diameter * 0.65) : 0)}px` }}>
            <HarmonicCircle
              sectors={sectors}
              counts={counts}
              referenceFamilyId={referenceFamilyId}
              relatedFamilyName={relatedName}
              allFamiliesMode={allFamiliesMode}
              scaleId={scaleId}
              diatonicOnly={effectiveDiatonicOnly}
              highlightDiatonic={effectiveHighlightDiatonic}
              showEnharmonics={showEnharmonics}
              showSeparators={showSeparators}
              showLegend={showLegend}
              showExplanation={showExplanation}
              explanation={explanation}
              showToneTooltips={showToneTooltips}
              colorByFamily={colorByFamily}
              diameter={diameter}
              fontSize={fontSize}
              playbackStyle={playbackStyle}
              voicingStyle={voicingStyle}
              svgRef={svgRef}
            />
          </div>
        </div>

      </main>

      {showAbout && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowAbout(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="about-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 id="about-title">About {APP_INFO.name}</h2>
              <button type="button" className="icon-button" onClick={() => setShowAbout(false)} aria-label="Close">×</button>
            </div>
            <p>{APP_INFO.description}</p>
            <p>
              Outer rings group related chords by the number of pitch classes shared with the reference chord in the same circle-of-fifths sector. Diatonic relationships are evaluated relative to the selected parent scale or mode.
            </p>
            <p><strong>Version:</strong> {APP_INFO.version}</p>
            <p><strong>Author:</strong> {APP_INFO.authorName}</p>
            <p><strong>License:</strong> {APP_INFO.licenseName}</p>
            <p className="hint">See README.md and docs/USER_GUIDE.md for complete documentation.</p>
          </div>
        </div>
      )}
    </div>
  );
}
