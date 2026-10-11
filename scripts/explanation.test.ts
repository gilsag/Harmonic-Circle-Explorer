import assert from "node:assert/strict";
import { buildDiagramExplanation } from "../src/explanation.ts";

const filtered = buildDiagramExplanation({
  referenceFamilyName: "Major triad",
  relatedFamilyName: "Dominant seventh",
  scaleName: "Ionian (Major)",
  diatonicOnly: true,
  highlightDiatonic: true,
  allFamiliesMode: false,
  counts: [1],
  availableCounts: [1],
  allCounts: [3, 2, 1],
});
assert.match(filtered, /Rings for chords sharing 3 and 2 notes are unavailable/);
assert.match(filtered, /Only chords diatonic to Ionian \(Major\)/);

const highlighted = buildDiagramExplanation({
  referenceFamilyName: "Major triad",
  relatedFamilyName: "Minor seventh",
  scaleName: "Dorian",
  diatonicOnly: false,
  highlightDiatonic: true,
  allFamiliesMode: false,
  counts: [3, 2, 1],
  availableCounts: [3, 2, 1],
  allCounts: [3, 2, 1],
});
assert.match(highlighted, /labels in blue are diatonic to Dorian/);

const hiddenRing = buildDiagramExplanation({
  referenceFamilyName: "Major triad",
  relatedFamilyName: "Minor seventh",
  scaleName: "Ionian (Major)",
  diatonicOnly: false,
  highlightDiatonic: false,
  allFamiliesMode: false,
  counts: [3, 1],
  availableCounts: [3, 2, 1, 0],
  allCounts: [3, 2, 1, 0],
});
assert.match(hiddenRing, /rings for 2 and 0 shared notes are hidden/i);

const allFamilies = buildDiagramExplanation({
  referenceFamilyName: "Major triad",
  relatedFamilyName: "All chord families",
  scaleName: "Ionian (Major)",
  diatonicOnly: true,
  highlightDiatonic: false,
  allFamiliesMode: true,
  counts: [3, 2, 1],
  availableCounts: [3, 2, 1, 0],
  allCounts: [3, 2, 1, 0],
});
assert.match(allFamilies, /combine all supported chord families/);
assert.match(allFamilies, /intentionally limited to chords diatonic to Ionian \(Major\)/);
assert.match(allFamilies, /0-shared-notes ring is hidden by the display settings/);

console.log("explanation.test.ts: all explanation tests passed");
