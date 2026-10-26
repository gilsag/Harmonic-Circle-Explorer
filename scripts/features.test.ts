import assert from "node:assert/strict";
import { buildDiagramExplanation } from "../src/explanation";
import { wrapLegendText,estimateLegendTextWidth } from "../src/legendTextLayout";
import { formatChord } from "../src/display";
const base={referenceFamilyName:"Major triad",relatedFamilyName:"Minor seventh",scaleName:"Ionian (Major)",
 diatonicOnly:false,highlightDiatonic:false,allFamiliesMode:false,counts:[2,1],availableCounts:[2,1],allCounts:[2,1]};
const on=buildDiagramExplanation({...base,showNoteRing:true});
const off=buildDiagramExplanation({...base,showNoteRing:false});
assert.match(on,/note ring/i);assert.doesNotMatch(off,/note ring/i);
for(const language of ["es","fr","pt","it","de"] as const){
 const text=buildDiagramExplanation({...base,showNoteRing:true,language});
 assert.ok(text.length>70);assert.ok(!text.includes("{reference}"));
}
assert.equal(formatChord(0,"major",0,false,"compact"),"C");
assert.equal(formatChord(0,"major",0,false,"letters"),"CM");
assert.match(formatChord(0,"major",0,false,"words"),/Major triad/);
assert.match(formatChord(0,"major",0,false,"words","es"),/tríada mayor/);
for(const line of wrapLegendText("Diatonic chords across many families",150,16)) {
 assert.ok(estimateLegendTextWidth(line,16)<=150+1,`Line overflows: ${line}`);
}
console.log("features.test.ts: note ring, formatting, legend tests passed");
