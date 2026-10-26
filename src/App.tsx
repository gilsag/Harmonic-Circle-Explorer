import { useEffect, useId, useMemo, useRef, useState } from "react";
import { renderAbc } from "abcjs";
import type { ReactNode, RefObject } from "react";
import "./App.css";
import type { PlaybackStyle, VoicingStyle } from "./audio";
import { playChord, playNote, playRecordedSequence, playVoiceLeadingTransition } from "./audio";
import { toAbc, type RecordedEvent } from "./recording";
import { formatChord, type ChordDisplayStyle } from "./display";
import { currentRelationshipDisplayMode, relationshipDisplayFlags, type RelationshipDisplayMode } from "./relationshipDisplay";
import { SUPPORTED_LANGUAGES, isLanguage, resolveLanguage, translate, type LanguagePreference, type InterfaceLanguage } from "./i18n/catalog";
import { familyName, scaleName } from "./i18n/musicTerms";
import { HarmonicCircle } from "./components/HarmonicCircle";
import { HarmonyToolDiagram } from "./components/HarmonyToolDiagram";
import { compareChords, findHarmonicPaths, type ChordIdentity, type IntermediatePool } from "./harmonicTools";
import { APP_INFO } from "./config/appInfo";
import { downloadPng, downloadSvg } from "./download";
import { buildDiagramExplanation } from "./explanation";
import type { ChordFamilyId, RelatedFamilyId, ScaleId } from "./music";
import {
  CHORD_FAMILIES,
  CIRCLE_OF_FIFTHS,
  pitchName,
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
  titleHelp?: string;
  helpLabel?: string;
};

function ControlSection({ title, children, defaultOpen = true, titleHelp, helpLabel }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();
  return (
    <section className="control-section">
      <div className="section-heading">
        <button className="section-title" type="button" aria-expanded={open} aria-controls={contentId} onClick={() => setOpen((value) => !value)}>
          {title}<span aria-hidden="true">{open ? "−" : "+"}</span>
        </button>
        {titleHelp && helpLabel && <HelpTip label={`${helpLabel}: ${title}`} text={titleHelp}/>}
      </div>
      <div id={contentId} className="section-content" hidden={!open}>{open ? children : null}</div>
    </section>
  );
}

/** Future tools register here, without adding empty/inactive navigation. */
const AVAILABLE_HARMONY_TOOLS = [
  { id: "circle", titleKey: "nav.harmonicCircle" },
  { id: "path", titleKey: "nav.pathFinder" },
  { id: "comparison", titleKey: "nav.chordComparison" },
] as const;
type HarmonyToolId = typeof AVAILABLE_HARMONY_TOOLS[number]["id"];
type SidebarPanel = "tools" | "settings" | null;

function HelpTip({ text, label }: { text: string; label: string }) {
  return (
    <details className="help-disclosure">
      <summary aria-label={label}>?</summary>
      <div className="help-content" role="note">{text}</div>
    </details>
  );
}

function ChordSelector({title,chord,onChange,language,showEnharmonics}:{title:string;chord:ChordIdentity;
  onChange:(next:ChordIdentity)=>void;language:InterfaceLanguage;showEnharmonics:boolean}){
  return <fieldset className="chord-selector">
    <legend>{title}</legend>
    <label>{translate(language,"analysis.root")}
      <select value={chord.rootPc} onChange={e=>onChange({...chord,rootPc:Number(e.target.value)})}>
        {Array.from({length:12},(_,pc)=><option key={pc} value={pc}>{pitchName(pc,Math.max(0,CIRCLE_OF_FIFTHS.indexOf(pc as typeof CIRCLE_OF_FIFTHS[number])),showEnharmonics)}</option>)}
      </select>
    </label>
    <label>{translate(language,"analysis.family")}
      <select value={chord.familyId} onChange={e=>onChange({...chord,familyId:e.target.value as ChordFamilyId})}>
        {CHORD_FAMILIES.map(f=><option value={f.id} key={f.id}>{familyName(f.id,f.name,language)}</option>)}
      </select>
    </label>
  </fieldset>;
}

function NotationScore({abc,hostRef,label}:{abc:string;hostRef:RefObject<HTMLDivElement|null>;label:string}) {
  useEffect(()=>{if(hostRef.current) renderAbc(hostRef.current,abc,{responsive:"resize",add_classes:true});},[abc,hostRef]);
  return <div className="notation-preview" ref={hostRef} aria-label={label}/>;
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
  const notationRef = useRef<HTMLDivElement | null>(null);
  const settingsFileRef = useRef<HTMLInputElement | null>(null);
  const resetMenuRef = useRef<HTMLDivElement | null>(null);
  const [panel, setPanel] = useState<SidebarPanel>(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 680px)").matches ? null : "tools");
  const [resetMenuOpen, setResetMenuOpen] = useState(false);
  useEffect(() => {
    if (!resetMenuOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (resetMenuRef.current && !resetMenuRef.current.contains(event.target as Node)) setResetMenuOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setResetMenuOpen(false); };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", onEscape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", onEscape); };
  }, [resetMenuOpen]);
  useEffect(() => {
    if (panel === null) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null);
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [panel]);
  const [languagePreference, setLanguagePreference] = useState<LanguagePreference>(() => {
    try { const v=localStorage.getItem("hce.language");return v==="auto"||isLanguage(v)?v:"auto"; } catch { return "auto"; }
  });
  const language=resolveLanguage(languagePreference,typeof navigator==="undefined"?[]:navigator.languages?.length?[...navigator.languages]:[navigator.language]);
  const t=(key:Parameters<typeof translate>[1],args?:Record<string,string|number>)=>translate(language,key,args);
  const [chordDisplayStyle,setChordDisplayStyle]=useState<ChordDisplayStyle>("compact");
  const [showNoteRing,setShowNoteRing]=useState(true);
  const [recording,setRecording]=useState(false);
  const [events,setEvents]=useState<RecordedEvent[]>([]);
  const notationAbc=useMemo(()=>toAbc(events),[events]);
  useEffect(()=>{ try{localStorage.setItem("hce.language",languagePreference);}catch{/* unavailable storage */}},[languagePreference]);
  const recordChord=(rootPc:number,familyId:ChordFamilyId,sectorIndex:number)=>{
    if(recording) setEvents(current=>[...current,{kind:"chord",rootPc,familyId,sectorIndex}]);
  };
  const activateNote=(pitchClass:number,sectorIndex:number)=>{
    playNote(pitchClass);
    if(recording) setEvents(current=>[...current,{kind:"note",pitchClass,sectorIndex}]);
  };

  const [activeTool,setActiveTool] = useState<HarmonyToolId>("circle");
  const [pathStart,setPathStart] = useState<ChordIdentity>({rootPc:0,familyId:"major"});
  const [pathEnd,setPathEnd] = useState<ChordIdentity>({rootPc:7,familyId:"major"});
  const [intermediatePool,setIntermediatePool] = useState<IntermediatePool>("major");
  const [pathSteps,setPathSteps] = useState<2|3|4>(2);
  const [parentRootPc,setParentRootPc] = useState(0);
  const [pathScaleId,setPathScaleId] = useState<ScaleId>("ionian");
  const [comparisonA,setComparisonA] = useState<ChordIdentity>({rootPc:0,familyId:"major7"});
  const [comparisonB,setComparisonB] = useState<ChordIdentity>({rootPc:7,familyId:"dominant7"});
  const [selectedPathIndex,setSelectedPathIndex] = useState(0);
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
  const paths=useMemo(()=>findHarmonicPaths({start:pathStart,end:pathEnd,transitions:pathSteps,
    intermediatePool,parentRootPc,parentScaleId:pathScaleId}),[pathStart,pathEnd,pathSteps,intermediatePool,parentRootPc,pathScaleId]);
  const currentPath=paths[Math.min(selectedPathIndex,Math.max(0,paths.length-1))];
  const comparisonReport=useMemo(()=>compareChords(comparisonA,comparisonB),[comparisonA,comparisonB]);
  const sectorOf=(rootPc:number)=>Math.max(0,CIRCLE_OF_FIFTHS.indexOf(rootPc as typeof CIRCLE_OF_FIFTHS[number]));
  const chordSymbol=(ch:ChordIdentity)=>{
    const family=chordFamily(ch.familyId);
    return `${pitchName(ch.rootPc,sectorOf(ch.rootPc))}${family.suffix}`;
  };
  const displayChord=(ch:ChordIdentity)=>formatChord(ch.rootPc,ch.familyId,sectorOf(ch.rootPc),
    showEnharmonics,chordDisplayStyle,language);
  const chordEvent=(ch:ChordIdentity):RecordedEvent=>({kind:"chord",rootPc:ch.rootPc,familyId:ch.familyId,sectorIndex:sectorOf(ch.rootPc)});
  const activateAnalysisChord=(ch:ChordIdentity,reference?:ChordIdentity)=>{
    playChord(ch.rootPc,ch.familyId,playbackStyle,voicingStyle,reference);
    if(recording) setEvents(current=>[...current,chordEvent(ch)]);
  };
  const playPath=()=>{if(currentPath)playRecordedSequence(currentPath.chords.map(chordEvent),playbackStyle,voicingStyle);};
  const recordPath=()=>{if(currentPath)setEvents(current=>[...current,...currentPath.chords.map(chordEvent)]);};
  const referenceFamily = chordFamily(referenceFamilyId);
  const relatedName = relatedFamilyName(relatedFamilyId);
  const relatedShortName = relatedFamilyShortName(relatedFamilyId);
  const scale = scaleDefinition(scaleId);
  const localizedReference=familyName(referenceFamilyId,referenceFamily.name,language);
  const localizedRelated=relatedFamilyId==="all"?t("tools.allFamilies"):familyName(relatedFamilyId,relatedName,language);
  const localizedScale=scaleName(scaleId,scale.name,language);
  const explanation = useMemo(
    () => buildDiagramExplanation({
      referenceFamilyName: localizedReference,
      relatedFamilyName: localizedRelated,
      scaleName: localizedScale,
      diatonicOnly: effectiveDiatonicOnly,
      highlightDiatonic: effectiveHighlightDiatonic,
      allFamiliesMode,
      counts,
      availableCounts,
      allCounts,
      showNoteRing, language,
    }),
    [localizedReference,localizedRelated,localizedScale,effectiveDiatonicOnly,effectiveHighlightDiatonic,allFamiliesMode,counts,availableCounts,allCounts,showNoteRing,language],
  );

  const resetToolDefaults = () => {
    if(activeTool==="path") {
      setPathStart({rootPc:0,familyId:"major"});setPathEnd({rootPc:7,familyId:"major"});
      setPathSteps(2);setIntermediatePool("major");setParentRootPc(0);setPathScaleId("ionian");setSelectedPathIndex(0);
      return;
    }
    if(activeTool==="comparison") {
      setComparisonA({rootPc:0,familyId:"major7"});setComparisonB({rootPc:7,familyId:"dominant7"});return;
    }
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
    setShowNoteRing(true);
    setDiameter(900);
  };

  const download = () => {
    if (!svgRef.current) return;
    const filename = activeTool==="circle" ? [
      "harmonic-circle",safeFilenamePart(referenceFamily.shortName),safeFilenamePart(relatedShortName),
      effectiveDiatonicOnly ? "diatonic" : "all",safeFilenamePart(scale.name),
    ].join("-") : activeTool==="path" ?
      `harmonic-path-${safeFilenamePart(chordSymbol(pathStart))}-${safeFilenamePart(chordSymbol(pathEnd))}` :
      `chord-comparison-${safeFilenamePart(chordSymbol(comparisonA))}-${safeFilenamePart(chordSymbol(comparisonB))}`;

    if (downloadFormat === "png") {
      downloadPng(svgRef.current, `${filename}.png`);
    } else {
      downloadSvg(svgRef.current, `${filename}.svg`);
    }
  };

  function saveBlob(text:string, filename:string, mime:string) {
    const url=URL.createObjectURL(new Blob([text],{type:mime}));
    const link=document.createElement("a");link.href=url;link.download=filename;
    document.body.appendChild(link);link.click();link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function saveSettings() {
    const settings={schemaVersion:1,activeTool,pathStart,pathEnd,pathSteps,intermediatePool,parentRootPc,pathScaleId,comparisonA,comparisonB,referenceFamilyId,relatedFamilyId,scaleId,diatonicOnly,
      highlightDiatonic,showEnharmonics,showSeparators,showLegend,showExplanation,ringVisibility,
      showToneTooltips,colorByFamily,diameter,fontSize,playbackStyle,voicingStyle,downloadFormat,
      showNoteRing,chordDisplayStyle,languagePreference};
    saveBlob(JSON.stringify(settings,null,2),"harmonic-circle-settings.json","application/json");
  }
  async function loadSettings(file:File) {
    try {
      const data:unknown=JSON.parse(await file.text());
      if(!data||typeof data!=="object"||Array.isArray(data)) throw new Error("Invalid JSON object");
      const v=data as Record<string,unknown>;
      if(v.schemaVersion!==1) throw new Error("Unsupported settings version");
      if(v.activeTool==="circle"||v.activeTool==="path"||v.activeTool==="comparison")setActiveTool(v.activeTool);
      const chordFrom=(value:unknown):ChordIdentity|null=>{
        if(!value||typeof value!=="object"||Array.isArray(value))return null;
        const c=value as Record<string,unknown>;
        return Number.isInteger(c.rootPc)&&Number(c.rootPc)>=0&&Number(c.rootPc)<12&&
          CHORD_FAMILIES.some(f=>f.id===c.familyId)
          ? {rootPc:Number(c.rootPc),familyId:c.familyId as ChordFamilyId}:null;
      };
      const start=chordFrom(v.pathStart),end=chordFrom(v.pathEnd);
      const a=chordFrom(v.comparisonA),b=chordFrom(v.comparisonB);
      if(start)setPathStart(start);if(end)setPathEnd(end);
      if(a)setComparisonA(a);if(b)setComparisonB(b);
      if(v.pathSteps===2||v.pathSteps===3||v.pathSteps===4)setPathSteps(v.pathSteps);
      if(v.intermediatePool==="diatonic"||CHORD_FAMILIES.some(f=>f.id===v.intermediatePool))setIntermediatePool(v.intermediatePool as IntermediatePool);
      if(Number.isInteger(v.parentRootPc)&&Number(v.parentRootPc)>=0&&Number(v.parentRootPc)<12)setParentRootPc(Number(v.parentRootPc));
      if(CHORD_FAMILIES.some((f)=>f.id===v.referenceFamilyId)) setReferenceFamilyId(v.referenceFamilyId as ChordFamilyId);
      if(v.relatedFamilyId==="all"||CHORD_FAMILIES.some((f)=>f.id===v.relatedFamilyId)) setRelatedFamilyId(v.relatedFamilyId as RelatedFamilyId);
      if(SCALES.some((scale)=>scale.id===v.scaleId)) setScaleId(v.scaleId as ScaleId);
      // Before v0.6.1 the Path Finder shared scaleId with the circle.
      // Import legacy configurations without losing their selected parent scale.
      const importedPathScale = v.pathScaleId ?? v.scaleId;
      if(SCALES.some((scale)=>scale.id===importedPathScale)) setPathScaleId(importedPathScale as ScaleId);
      const boolFields: Array<[string,(b:boolean)=>void]>=[
        ["diatonicOnly",setDiatonicOnly],["highlightDiatonic",setHighlightDiatonic],
        ["showEnharmonics",setShowEnharmonics],["showSeparators",setShowSeparators],
        ["showLegend",setShowLegend],["showExplanation",setShowExplanation],
        ["showToneTooltips",setShowToneTooltips],["colorByFamily",setColorByFamily],
        ["showNoteRing",setShowNoteRing],
      ];
      for(const [key,setter] of boolFields) if(typeof v[key]==="boolean") setter(v[key]);
      if(v.ringVisibility&&typeof v.ringVisibility==="object"&&!Array.isArray(v.ringVisibility)) {
        const r=Object.entries(v.ringVisibility).filter(([k,val])=>/^[0-9]+$/.test(k)&&typeof val==="boolean");
        setRingVisibility(Object.fromEntries(r) as Record<number,boolean>);
      }
      if(typeof v.diameter==="number"&&v.diameter>=600&&v.diameter<=1400) setDiameter(v.diameter);
      if(typeof v.fontSize==="number"&&v.fontSize>=11&&v.fontSize<=30) setFontSize(v.fontSize);
      if(v.playbackStyle==="block"||v.playbackStyle==="arpeggio") setPlaybackStyle(v.playbackStyle);
      if(v.voicingStyle==="root"||v.voicingStyle==="smooth") setVoicingStyle(v.voicingStyle);
      if(v.downloadFormat==="svg"||v.downloadFormat==="png") setDownloadFormat(v.downloadFormat);
      if(v.chordDisplayStyle==="compact"||v.chordDisplayStyle==="letters"||v.chordDisplayStyle==="words")setChordDisplayStyle(v.chordDisplayStyle);
      if(v.languagePreference==="auto"||isLanguage(v.languagePreference))setLanguagePreference(v.languagePreference);
    } catch {window.alert(t("app.settingsError"));}
  }
  function downloadNotationSvg() {
    const node=notationRef.current?.querySelector("svg");
    if(!node || !events.length) return;
    const copy=node.cloneNode(true) as SVGSVGElement;
    copy.setAttribute("xmlns","http://www.w3.org/2000/svg");
    saveBlob(new XMLSerializer().serializeToString(copy),"harmonic-circle-notation.svg","image/svg+xml");
  }
  const clearRecording = () => {
    if (!events.length || window.confirm(t("nav.confirmClearRecording"))) {
      setRecording(false);
      setEvents([]);
    }
    setResetMenuOpen(false);
  };
  const togglePanel = (target: Exclude<SidebarPanel,null>) => setPanel((current) => current === target ? null : target);
  const chooseSeventhPreset = (familyId: ChordFamilyId) => {
    setReferenceFamilyId("major");
    setRelatedFamilyId(familyId);
  };

  return (
    <div className={`app-shell${panel === null ? " panel-hidden" : " panel-open"}`}>
      {panel !== null && <button type="button" className="mobile-backdrop" aria-label={t("nav.closePanel")} onClick={() => setPanel(null)}/>}
      <aside id="hce-sidebar" className="left-panel" aria-label={t("nav.sidebarAria")} aria-hidden={panel === null} inert={panel === null}>
        <div className="brand-row">
          <h1>{APP_INFO.name}</h1><p className="version">v{APP_INFO.version}</p>
          <button className="mobile-close" type="button" onClick={() => setPanel(null)}>{t("nav.closePanel")}</button>
        </div>
        {panel === "tools" ? <>
        {activeTool==="path" && <>
          <ControlSection key="path-settings" title={t("nav.pathFinder")} titleHelp={t("analysis.pathHelp")} helpLabel={t("nav.helpLabel")}>
            <ChordSelector title={t("analysis.start")} chord={pathStart} language={language} showEnharmonics={showEnharmonics} onChange={ch=>{setPathStart(ch);setSelectedPathIndex(0);}}/>
            <ChordSelector title={t("analysis.destination")} chord={pathEnd} language={language} showEnharmonics={showEnharmonics} onChange={ch=>{setPathEnd(ch);setSelectedPathIndex(0);}}/>
            <label>{t("analysis.transitions")}
              <select value={pathSteps} onChange={e=>{setPathSteps(Number(e.target.value) as 2|3|4);setSelectedPathIndex(0);}}>
                {[2,3,4].map(n=><option key={n} value={n}>{t("analysis.stepsValue",{count:n})}</option>)}
              </select>
            </label>
            <label>{t("analysis.intermediates")}
              <select value={intermediatePool} onChange={e=>{setIntermediatePool(e.target.value as IntermediatePool);setSelectedPathIndex(0);}}>
                <option value="diatonic">{t("analysis.allDiatonic")}</option>
                {CHORD_FAMILIES.map(f=><option key={f.id} value={f.id}>{familyName(f.id,f.name,language)}</option>)}
              </select>
            </label>
            {intermediatePool==="diatonic" && <label>{t("analysis.parentTonic")}
              <select value={parentRootPc} onChange={e=>{setParentRootPc(Number(e.target.value));setSelectedPathIndex(0);}}>
                {Array.from({length:12},(_,pc)=><option key={pc} value={pc}>{pitchName(pc,sectorOf(pc),showEnharmonics)}</option>)}
              </select>
            </label>}
            {intermediatePool==="diatonic" && <label>{t("tools.parentScale")}
              <select value={pathScaleId} onChange={e=>{setPathScaleId(e.target.value as ScaleId);setSelectedPathIndex(0);}}>
                {SCALES.map(sc=><option value={sc.id} key={sc.id}>{scaleName(sc.id,sc.name,language)}</option>)}
              </select>
            </label>}
          </ControlSection>
          <ControlSection key="path-routes" title={t("analysis.routes")}>
            {paths.length===0?<p className="hint">{t("analysis.noRoutes")}</p>:
              <div className="route-list">{paths.map((route,i)=><button key={i} type="button"
                className={i===Math.min(selectedPathIndex,paths.length-1)?"route active":"route"}
                aria-pressed={i===Math.min(selectedPathIndex,paths.length-1)} onClick={()=>setSelectedPathIndex(i)}>
                <span>{route.chords.map(displayChord).join(" → ")}</span>
                <small>{t("analysis.score",{score:route.score.toFixed(1)})}</small>
              </button>)}</div>}
            <div className="button-grid">
              <button type="button" disabled={!currentPath} onClick={playPath}>{t("analysis.playPath")}</button>
              <button type="button" disabled={!currentPath} onClick={recordPath}>{t("analysis.addPath")}</button>
            </div>
          </ControlSection>
        </>}
        {activeTool==="comparison" && <>
          <ControlSection key="comparison-settings" title={t("nav.chordComparison")}>
            <ChordSelector title={t("analysis.chordA")} chord={comparisonA} language={language} showEnharmonics={showEnharmonics} onChange={setComparisonA}/>
            <ChordSelector title={t("analysis.chordB")} chord={comparisonB} language={language} showEnharmonics={showEnharmonics} onChange={setComparisonB}/>
            <div className="button-grid">
              <button type="button" onClick={()=>activateAnalysisChord(comparisonA)}>{t("analysis.playA")}</button>
              <button type="button" onClick={()=>activateAnalysisChord(comparisonB,comparisonA)}>{t("analysis.playB")}</button>
              <button type="button" onClick={()=>playVoiceLeadingTransition(comparisonA,comparisonB.rootPc,comparisonB.familyId,playbackStyle,voicingStyle)}>{t("analysis.playTransition")}</button>
            </div>
          </ControlSection>
          <ControlSection key="comparison-movement" title={t("analysis.voiceLeading")} titleHelp={t("analysis.comparisonHelp")} helpLabel={t("nav.helpLabel")}>
            <p className="analysis-line"><strong>{t("analysis.shared")}:</strong> {comparisonReport.sharedPitchClasses.map(pc=>pitchName(pc,0,showEnharmonics)).join(", ")||t("analysis.none")}</p>
            <p className="analysis-line"><strong>{t("analysis.exclusiveA")}:</strong> {comparisonReport.removedPitchClasses.concat(comparisonReport.moves.map(m=>m.fromPc)).map(pc=>pitchName(pc,0,showEnharmonics)).join(", ")||t("analysis.none")}</p>
            <p className="analysis-line"><strong>{t("analysis.exclusiveB")}:</strong> {comparisonReport.addedPitchClasses.concat(comparisonReport.moves.map(m=>m.toPc)).map(pc=>pitchName(pc,0,showEnharmonics)).join(", ")||t("analysis.none")}</p>
            {comparisonReport.moves.map((move,i)=><p key={i} className="analysis-line">{pitchName(move.fromPc,0,showEnharmonics)} → {pitchName(move.toPc,0,showEnharmonics)}: {move.distance} {t("analysis.semitones")}</p>)}
            <p className="analysis-line"><strong>{t("analysis.totalMotion")}:</strong> {comparisonReport.totalMotion} {t("analysis.semitones")}</p>
          </ControlSection>
        </>}
        {activeTool==="circle" && <>
        <ControlSection key="circle-harmonic-context" title={t("nav.harmonicContext")}>
          <label>
            {t("tools.referenceFamily")}
            <select
              value={referenceFamilyId}
              onChange={(event) => setReferenceFamilyId(event.target.value as ChordFamilyId)}
            >
              {CHORD_FAMILIES.map((family) => (
                <option key={family.id} value={family.id}>{familyName(family.id,family.name,language)}</option>
              ))}
            </select>
          </label>

          <label>
            {t("tools.relatedFamily")}
            <select
              value={relatedFamilyId}
              onChange={(event) => setRelatedFamilyId(event.target.value as RelatedFamilyId)}
            >
              <option value="all">{t("tools.allFamilies")}</option>
              {CHORD_FAMILIES.map((family) => (
                <option key={family.id} value={family.id}>{familyName(family.id,family.name,language)}</option>
              ))}
            </select>
          </label>

          <label>
            {t("tools.parentScale")}
            <select value={scaleId} onChange={(event) => setScaleId(event.target.value as ScaleId)}>
              {SCALES.map((scaleOption) => (
                <option key={scaleOption.id} value={scaleOption.id}>{scaleName(scaleOption.id,scaleOption.name,language)}</option>
              ))}
            </select>
          </label>

          <div className="preset-block">
            <span className="control-caption">{t("app.commonSevenths")} <HelpTip label={t("nav.helpLabel")} text={t("nav.presetsHelp")}/></span>
            <div className="button-grid">
              <button type="button" onClick={() => chooseSeventhPreset("minor7")}>{t("app.minor7")}</button>
              <button type="button" onClick={() => chooseSeventhPreset("major7")}>{t("app.major7")}</button>
              <button type="button" onClick={() => chooseSeventhPreset("dominant7")}>{t("app.dominant7")}</button>
              <button type="button" onClick={() => chooseSeventhPreset("diminished7")}>{t("app.diminished7")}</button>
            </div>
          </div>
          <div className="control-field">
            <div className="setting-label"><span>{t("nav.relationshipDisplay")}</span><HelpTip label={t("nav.helpLabel")} text={t("app.helpDiatonic")}/></div>
            <select value={currentRelationshipDisplayMode(diatonicOnly, highlightDiatonic, allFamiliesMode)}
              disabled={allFamiliesMode}
              onChange={(event) => {
                const flags = relationshipDisplayFlags(event.target.value as RelationshipDisplayMode);
                setDiatonicOnly(flags.diatonicOnly);
                setHighlightDiatonic(flags.highlightDiatonic);
              }}>
              <option value="all">{t("nav.allChords")}</option>
              <option value="highlight">{t("nav.highlightChords")}</option>
              <option value="only">{t("nav.onlyDiatonic")}</option>
            </select>
            {allFamiliesMode && <p className="hint">{t("nav.allFamiliesConstraint")}</p>}
          </div>
        </ControlSection>

        <ControlSection key="circle-recording" title={`${t("app.recording")} · ${events.length}${recording ? ` · ${t("nav.recordingNow")}` : ""}`} defaultOpen={false} titleHelp={t("app.helpRecording")} helpLabel={t("nav.helpLabel")}>
          <div className="button-grid">
            <button type="button" disabled={!events.length} onClick={()=>playRecordedSequence(events,playbackStyle,voicingStyle)}>{t("app.play")}</button>
            <button type="button" disabled={!events.length} onClick={clearRecording}>{t("app.clear")}</button>
            <button type="button" disabled={!events.length} onClick={()=>saveBlob(notationAbc,"harmonic-circle-recording.abc","text/plain")}>{t("app.exportAbc")}</button>
            <button type="button" disabled={!events.length} onClick={downloadNotationSvg}>{t("app.exportNotationSvg")}</button>
          </div>
          {events.length ? <p className="control-caption">{t("app.eventsCount",{count:events.length})}</p> : <p className="hint">{t("app.none")}</p>}
          <NotationScore abc={notationAbc} hostRef={notationRef} label={t("app.notation")}/>
        </ControlSection>
        </>}
        {activeTool!=="circle" && <ControlSection key="analysis-recording" title={`${t("app.recording")} · ${events.length}${recording ? ` · ${t("nav.recordingNow")}` : ""}`} defaultOpen={false} titleHelp={t("app.helpRecording")} helpLabel={t("nav.helpLabel")}>
          <p className="hint">{t("app.eventsCount",{count:events.length})}</p>
          <div className="button-grid">
            <button type="button" disabled={!events.length} onClick={()=>playRecordedSequence(events,playbackStyle,voicingStyle)}>{t("app.play")}</button>
            <button type="button" disabled={!events.length} onClick={clearRecording}>{t("app.clear")}</button>
            <button type="button" disabled={!events.length} onClick={()=>saveBlob(notationAbc,"harmonic-circle-recording.abc","text/plain")}>{t("app.exportAbc")}</button>
            <button type="button" disabled={!events.length} onClick={downloadNotationSvg}>{t("app.exportNotationSvg")}</button>
          </div>
          <NotationScore abc={notationAbc} hostRef={notationRef} label={t("app.notation")}/>
        </ControlSection>}
        </> : panel === "settings" ? <>
        <ControlSection key="shared-appearance" title={t("nav.appearance")}>
          <label className="check-row">
            <input
              type="checkbox"
              checked={showEnharmonics}
              onChange={(event) => setShowEnharmonics(event.target.checked)}
            />
            {t("settings.showEnharmonics")}
          </label>
          <div className="check-field">
            <label className="check-row">
              <input type="checkbox" checked={showToneTooltips} onChange={(event) => setShowToneTooltips(event.target.checked)}/>
              {t("settings.chordToneTooltips")}
            </label>
            <HelpTip label={t("nav.helpLabel")} text={t("nav.chordToneTooltipHelp")}/>
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={colorByFamily}
              onChange={(event) => setColorByFamily(event.target.checked)}
            />
            {t("settings.colorByFamily")}
          </label>
          <label>{t("app.chordStyle")}
            <select value={chordDisplayStyle} onChange={(event)=>setChordDisplayStyle(event.target.value as ChordDisplayStyle)}>
              <option value="compact">{t("app.compact")}</option>
              <option value="letters">{t("app.letters")}</option>
              <option value="words">{t("app.words")}</option>
            </select>
          </label>
          <label>
            {t("app.font",{value:fontSize})}
            <input
              type="range"
              min="11"
              max="30"
              step="1"
              value={fontSize}
              onChange={(event) => setFontSize(Number(event.target.value))}
            />
          </label>
        </ControlSection>
        {activeTool==="circle" && <>
        <ControlSection key="circle-diagram" title={t("nav.diagramDisplay")} titleHelp={t("app.helpDiagram")} helpLabel={t("nav.helpLabel")}>
          <label className="check-row">
            <input
              type="checkbox"
              checked={showSeparators}
              onChange={(event) => setShowSeparators(event.target.checked)}
            />
            {t("settings.segmentLines")}
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={showLegend}
              onChange={(event) => setShowLegend(event.target.checked)}
            />
            {t("settings.showLegend")}
          </label>
          <label className="check-row">
            <input type="checkbox" checked={showNoteRing} onChange={(e)=>setShowNoteRing(e.target.checked)}/>
            {t("settings.noteRing")}
          </label>
          <div className="ring-control-block">
            <span className="control-caption">{t("settings.outerRings")}</span>
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
                    {t("ui.ringShared",{count})}
                  </label>
                ))}
              </div>
            ) : (
              <p className="hint">{t("app.noRings")}</p>
            )}
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={showExplanation}
              onChange={(event) => setShowExplanation(event.target.checked)}
            />
            {t("settings.showExplanation")}
          </label>
          <label>
            {t("app.diameter",{value:diameter})}
            <input
              type="range"
              min="600"
              max="1400"
              step="20"
              value={diameter}
              onChange={(event) => setDiameter(Number(event.target.value))}
            />
          </label>
        </ControlSection>
        </>}
        <ControlSection key="shared-playback" title={t("nav.playback")}>
          <label>
            {t("app.soundPlayback")}
            <select
              value={playbackStyle}
              onChange={(event) => setPlaybackStyle(event.target.value as PlaybackStyle)}
            >
              <option value="block">{t("app.block")}</option>
              <option value="arpeggio">{t("app.arpeggio")}</option>
            </select>
          </label>
          <div className="control-field">
            <div className="setting-label"><span>{t("app.voicing")}</span><HelpTip label={t("nav.helpLabel")} text={t("app.helpAudio")}/></div>
            <select
              value={voicingStyle}
              onChange={(event) => setVoicingStyle(event.target.value as VoicingStyle)}
            >
              <option value="root">{t("app.root")}</option>
              <option value="smooth">{t("app.smooth")}</option>
            </select>
          </div>
        </ControlSection>

        <ControlSection key="shared-preferences" title={t("nav.preferences")} defaultOpen={false}>
          <label>{t("app.language")}
            <select value={languagePreference} onChange={(event)=>setLanguagePreference(event.target.value as LanguagePreference)}>
              <option value="auto">{t("settings.languageAuto")}</option>
              {SUPPORTED_LANGUAGES.map(({code,label})=><option key={code} value={code}>{label}</option>)}
            </select>
          </label>
          <div className="button-grid">
            <button type="button" onClick={saveSettings}>{t("app.save")}</button>
            <button type="button" onClick={()=>settingsFileRef.current?.click()}>{t("app.load")}</button>
          </div>
          <input ref={settingsFileRef} type="file" accept="application/json,.json" hidden onChange={(event)=>{
            const file=event.currentTarget.files?.[0];if(file)void loadSettings(file);
            event.currentTarget.value="";
          }}/>
        </ControlSection>
          <div className="sidebar-actions">
            <button type="button" className="secondary-action" onClick={() => setShowAbout(true)}>{t("app.about")}</button>
          </div>
        </> : null}
      </aside>
      <main className="workspace">
        <header className="topbar">
          <nav className="tool-nav" aria-label={t("nav.toolsAria")}>
            {AVAILABLE_HARMONY_TOOLS.map((tool) => <button type="button" key={tool.id} className={activeTool===tool.id?"active-tool":"tool-tab"}
              aria-current={activeTool===tool.id?"page":undefined} aria-pressed={activeTool===tool.id}
              onClick={()=>{setActiveTool(tool.id);setPanel("tools");}}>{t(tool.titleKey)}</button>)}
          </nav>
          <div className="topbar-controls">
            <button type="button" className="toolbar-button" aria-controls="hce-sidebar" aria-expanded={panel === "tools"}
              aria-pressed={panel === "tools"} onClick={() => togglePanel("tools")}>{t("nav.tools")}</button>
            <button type="button" className="toolbar-button" aria-controls="hce-sidebar" aria-expanded={panel === "settings"}
              aria-pressed={panel === "settings"} onClick={() => togglePanel("settings")}>{t("app.settings")}</button>
            <button type="button" className="toolbar-button" aria-pressed={panel === null}
              onClick={() => setPanel((current) => current === null ? "tools" : null)}>
              {panel === null ? t("nav.exitFocus") : t("nav.focus")}
            </button>
            <span className="topbar-divider" aria-hidden="true" />
            <button type="button" className={`toolbar-button${recording ? " is-recording" : ""}`} aria-pressed={recording}
              onClick={() => setRecording((current) => !current)}>{recording ? t("tools.stopRecording") : t("tools.startRecording")}</button>
            <span className="record-count" role="status" aria-live="polite">{t("app.eventsCount",{count:events.length})}</span>
            <div className="reset-container" ref={resetMenuRef}>
              <button type="button" className="toolbar-button" aria-expanded={resetMenuOpen} aria-controls="reset-options"
                onClick={() => setResetMenuOpen((current) => !current)}>{t("app.reset")} ▾</button>
              {resetMenuOpen && <div className="reset-options" id="reset-options">
                <button type="button" onClick={() => { resetToolDefaults(); setResetMenuOpen(false); }}>{t("nav.restoreTool")}</button>
                <button type="button" disabled={!events.length} onClick={clearRecording}>{t("nav.clearRecording")}</button>
              </div>}
            </div>
            <span className="topbar-divider" aria-hidden="true" />
            <select className="download-select" value={downloadFormat}
              onChange={(event) => setDownloadFormat(event.target.value as DownloadFormat)} aria-label={t("app.format")}>
              <option value="svg">SVG</option><option value="png">PNG</option>
            </select>
            <button type="button" className="download-button" onClick={download}>
              {t("app.download",{format:downloadFormat.toUpperCase()})}
            </button>
          </div>
        </header>
        <div className="diagram-context" aria-label={t("nav.currentContext")}>
          {activeTool==="circle" ? <><strong>{localizedReference}</strong> <span aria-hidden="true">→</span> <strong>{localizedRelated}</strong><span className="summary-detail"> · {localizedScale}</span></> :
            activeTool==="path" ? <><strong>{displayChord(pathStart)}</strong> <span>→</span> <strong>{displayChord(pathEnd)}</strong><span className="summary-detail"> · {t("nav.pathFinder")}</span></> :
            <><strong>{displayChord(comparisonA)}</strong> <span>↔</span> <strong>{displayChord(comparisonB)}</strong><span className="summary-detail"> · {t("nav.chordComparison")}</span></>}
        </div>

        {activeTool==="circle" && availableCounts.length === 0 && (
          <div className="empty-result">{t("app.empty")}</div>
        )}
        {activeTool==="circle" && availableCounts.length > 0 && counts.length === 0 && (
          <div className="empty-result">{t("app.hidden")}</div>
        )}

        <div className="canvas-wrap">
          <div className="svg-host" style={{ width: activeTool==="circle" ? `${diameter + (showLegend || showExplanation ? Math.max(460, diameter * 0.65) : 0)}px` : "min(1040px, 100%)", minWidth:activeTool==="circle"?undefined:"600px" }}>
            {activeTool==="circle" ? <HarmonicCircle
              sectors={sectors}
              language={language}
              chordDisplayStyle={chordDisplayStyle}
              showNoteRing={showNoteRing}
              onPlayNote={activateNote}
              onChordActivated={recordChord}
              counts={counts}
              referenceFamilyId={referenceFamilyId}
              relatedFamilyName={localizedRelated}
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
            /> : <HarmonyToolDiagram kind={activeTool} path={currentPath} first={activeTool==="path"?pathStart:comparisonA}
              second={activeTool==="path"?pathEnd:comparisonB} language={language} style={chordDisplayStyle}
              svgRef={svgRef} showEnharmonics={showEnharmonics} showToneTooltips={showToneTooltips}
              colorByFamily={colorByFamily} fontSize={fontSize}
              onChordClick={(ch,index) => activateAnalysisChord(ch, activeTool==="path" ? currentPath?.chords[index-1] : index===1 ? comparisonA : undefined)}
              heading={t(activeTool==="path"?"nav.pathFinder":"nav.chordComparison")}
              sharedLabel={t("analysis.shared")} moveLabel={t("analysis.totalMotion")} noRouteLabel={t("analysis.noRoutes")}/>}
          </div>
        </div>

      </main>

      {showAbout && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowAbout(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="about-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 id="about-title">{t("app.about")} {APP_INFO.name}</h2>
              <button type="button" className="icon-button" onClick={() => setShowAbout(false)} aria-label={t("nav.closeDialog")}>×</button>
            </div>
            <p>{t("app.aboutDescription")}</p>
            <p>{t("app.aboutMeaning")}</p>
            <p><strong>{t("about.version")}:</strong> {APP_INFO.version}</p>
            <p><strong>{t("about.author")}:</strong> {APP_INFO.authorName}</p>
            <p><strong>{t("about.license")}:</strong> {APP_INFO.licenseName}</p>
            <p className="hint">{t("app.docsHint")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
