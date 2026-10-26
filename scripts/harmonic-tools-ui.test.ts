import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EN } from "../src/i18n/en";
import { ES } from "../src/i18n/es";
import { FR } from "../src/i18n/fr";
import { PT } from "../src/i18n/pt";
import { IT } from "../src/i18n/it";
import { DE } from "../src/i18n/de";
const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
const svg=readFileSync(new URL("../src/components/HarmonyToolDiagram.tsx",import.meta.url),"utf8");
for(const catalog of [ES,FR,PT,IT,DE]) assert.deepEqual(Object.keys(catalog).sort(),Object.keys(EN).sort());
for(const key of ["nav.pathFinder","nav.chordComparison","analysis.noRoutes","analysis.playTransition"]) {
  assert.ok(EN[key]);
}
assert.match(app,/activeTool==="circle" \? <HarmonicCircle/);
assert.match(app,/\bHarmonyToolDiagram\b/);
assert.match(app,/activeTool==="path"/);
assert.match(app,/activeTool==="comparison"/);
assert.match(app,/playRecordedSequence\(currentPath\.chords\.map\(chordEvent\),playbackStyle,voicingStyle\)/);
assert.match(app,/playVoiceLeadingTransition\(comparisonA,comparisonB\.rootPc,comparisonB\.familyId,playbackStyle,voicingStyle\)/);
assert.match(app,/src\/App\.css|\.\/App\.css/);
assert.match(svg,/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
assert.match(svg,/wrapLabel/);
console.log("harmonic tools UI/source checks passed");
