/** Presentation of the existing diatonic filtering/highlighting flags. */
export type RelationshipDisplayMode = "all" | "highlight" | "only";

export function currentRelationshipDisplayMode(
  diatonicOnly: boolean,
  highlightDiatonic: boolean,
  allFamiliesMode: boolean,
): RelationshipDisplayMode {
  return diatonicOnly || allFamiliesMode ? "only" : highlightDiatonic ? "highlight" : "all";
}

export function relationshipDisplayFlags(mode: RelationshipDisplayMode) {
  return {
    diatonicOnly: mode === "only",
    highlightDiatonic: mode === "highlight",
  };
}
