import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { currentRelationshipDisplayMode, relationshipDisplayFlags } from "../src/relationshipDisplay";
import { EN } from "../src/i18n/en";
import { ES } from "../src/i18n/es";
import { FR } from "../src/i18n/fr";
import { PT } from "../src/i18n/pt";
import { IT } from "../src/i18n/it";
import { DE } from "../src/i18n/de";

for (const mode of ["all", "highlight", "only"] as const) {
  const flags = relationshipDisplayFlags(mode);
  assert.equal(currentRelationshipDisplayMode(flags.diatonicOnly, flags.highlightDiatonic, false), mode);
}
assert.equal(currentRelationshipDisplayMode(false, false, true), "only", "All families must be diatonic-only");
assert.equal(currentRelationshipDisplayMode(false, true, true), "only");
const keyList = Object.keys(EN).sort();
for (const catalog of [ES, FR, PT, IT, DE]) assert.deepEqual(Object.keys(catalog).sort(), keyList);
const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/App.css", import.meta.url), "utf8");
assert.match(app, /aria-expanded=\{panel === "tools"\}/, "Tool panel should expose expanded state");
assert.match(app, /aria-expanded=\{panel === "settings"\}/, "Settings panel should expose expanded state");
assert.match(app, /setRecording\(\(current\) => !current\)/, "Record control stays in toolbar");
assert.match(app, /resetToolDefaults\(\); setResetMenuOpen\(false\)/);
const resetDefinition = app.slice(app.indexOf("const resetToolDefaults ="), app.indexOf("const download ="));
assert.doesNotMatch(resetDefinition, /setEvents\(|setRecording\(|setDownloadFormat\(|setPlaybackStyle\(|setVoicingStyle\(/, "Tool reset must preserve recording and shared playback/download settings");
assert.match(app, /window\.confirm\(t\("nav\.confirmClearRecording"\)\)/, "Destructive clear must ask first");
assert.match(app, /defaultOpen=\{false\}/, "Recording notation remains collapsible");
assert.match(css, /\.app-shell\.panel-open \.left-panel \{ transform: translateX\(0\)/, "Mobile overlay opens");
assert.match(css, /\.workspace \{ order: 0/, "Main visualization stays first on mobile");
console.log("navigation.test.ts: toolbar, relationship modes, settings and recording safeguards passed");
