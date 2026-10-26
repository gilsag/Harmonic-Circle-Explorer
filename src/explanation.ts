import { translate, type InterfaceLanguage } from "./i18n/catalog";
export type DiagramExplanationInput = {
  referenceFamilyName: string;
  relatedFamilyName: string;
  scaleName: string;
  diatonicOnly: boolean;
  highlightDiatonic: boolean;
  allFamiliesMode: boolean;
  counts: readonly number[];
  availableCounts: readonly number[];
  allCounts: readonly number[];
  showNoteRing?:boolean;
  language?:InterfaceLanguage;
};

function listNumbers(values: readonly number[]) {
  if (values.length === 1) return String(values[0]);
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function ringPhrase(values: readonly number[]) {
  if (values.length === 1) {
    const count = values[0];
    return `The ${count}-shared-${count === 1 ? "note" : "notes"} ring is hidden by the display settings.`;
  }
  return `The rings for ${listNumbers(values)} shared notes are hidden by the display settings.`;
}

export function buildDiagramExplanation({
  referenceFamilyName,
  relatedFamilyName,
  scaleName,
  diatonicOnly,
  highlightDiatonic,
  allFamiliesMode,
  counts,
  availableCounts,
  allCounts,
  showNoteRing = false,
  language = "en",
}: DiagramExplanationInput) {
  if (language !== "en") {
    const t=(key:Parameters<typeof translate>[1],args?:Record<string,string|number>)=>translate(language,key,args);
    const parts=[t(allFamiliesMode?"analysis.harmonyAll":"analysis.harmonyInner",{
      reference:referenceFamilyName.toLowerCase(),related:relatedFamilyName.toLowerCase()})];
    if(showNoteRing) parts.push(t("analysis.harmonyNoteRing"));
    const hidden=availableCounts.filter((count)=>!counts.includes(count));
    if(allFamiliesMode) {
      parts.push(t("analysis.harmonyAllDiatonic",{scale:scaleName}));
      parts.push(t(availableCounts.length?"analysis.harmonyOnlyAvailable":"analysis.harmonyNoSupported"));
    } else if(diatonicOnly) {
      parts.push(t("analysis.harmonyOnlyDiatonic",{scale:scaleName}));
      const removed=allCounts.filter((count)=>!availableCounts.includes(count));
      if (!availableCounts.length && allCounts.length) parts.push(t("analysis.harmonyNoDiatonic"));
      else if(removed.length===1) parts.push(t("analysis.harmonyFilteredOne",{count:removed[0],unit:removed[0]===1?t("analysis.noteSingular"):t("analysis.notePlural")}));
      else if(removed.length>1) parts.push(t("analysis.harmonyFilteredMany",{counts:removed.join(", ")}));
    } else parts.push(t(highlightDiatonic?"analysis.harmonyHighlight":"analysis.harmonyWithoutHighlight",{scale:scaleName}));
    if(hidden.length) {
      parts.push(hidden.length===1?t("analysis.harmonyRingOne",{count:hidden[0],unit:hidden[0]===1?t("analysis.noteSingular"):t("analysis.notePlural")}):t("analysis.harmonyRingMany",{counts:hidden.join(", ")}));
    }
    return parts.join(" ");
  }
  const parts = [
    allFamiliesMode
      ? `The inner chord ring shows ${referenceFamilyName.toLowerCase()} chords. Outer rings combine all supported chord families, with more shared pitch classes placed closer to the center.`
      : `The inner chord ring shows ${referenceFamilyName.toLowerCase()} chords. Outer rings show ${relatedFamilyName.toLowerCase()} chords, with more shared pitch classes placed closer to the center.`,
  ];

  if (showNoteRing) parts.push(translate("en", "analysis.harmonyNoteRing"));

  const hiddenCounts = availableCounts.filter((count) => !counts.includes(count));

  if (allFamiliesMode) {
    parts.push(`All-families diagrams are intentionally limited to chords diatonic to ${scaleName}, transposed to each sector root, to keep the visualization readable.`);
    if (availableCounts.length === 0) {
      parts.push(`No supported diatonic chord satisfies the current relationship settings, so no relationship rings are available.`);
    } else {
      parts.push(`Only shared-note counts represented by at least one diatonic chord are available as rings.`);
      if (hiddenCounts.length > 0) parts.push(ringPhrase(hiddenCounts));
    }
    return parts.join(" ");
  }

  if (diatonicOnly) {
    parts.push(`Only chords diatonic to ${scaleName}, transposed to each sector root, are included.`);
    const filteredOutCounts = allCounts.filter((count) => !availableCounts.includes(count));
    if (availableCounts.length === 0 && allCounts.length > 0) {
      parts.push(`No related chords satisfy the diatonic filter, so no relationship rings are available.`);
    } else if (filteredOutCounts.length === 1) {
      const count = filteredOutCounts[0];
      parts.push(`The ring for chords sharing ${count} ${count === 1 ? "note" : "notes"} is unavailable because no diatonic chord has that overlap.`);
    } else if (filteredOutCounts.length > 1) {
      parts.push(`Rings for chords sharing ${listNumbers(filteredOutCounts)} notes are unavailable because no diatonic chords have those overlaps.`);
    }
  } else if (highlightDiatonic) {
    parts.push(`All qualifying chords are available; labels in blue are diatonic to ${scaleName} in their sector.`);
  } else {
    parts.push(`All qualifying chords are available, without distinguishing diatonic relationships.`);
  }

  if (hiddenCounts.length > 0) parts.push(ringPhrase(hiddenCounts));

  return parts.join(" ");
}
