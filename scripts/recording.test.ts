import assert from "node:assert/strict";
import { midiToAbc, recordedMidiNotes, toAbc, type RecordedEvent } from "../src/recording";
import { chordMidiNotes } from "../src/music";
assert.equal(midiToAbc(60),"C");
assert.equal(midiToAbc(61),"^C");
assert.equal(midiToAbc(59),"B,");
assert.equal(midiToAbc(72),"c");
const events:RecordedEvent[]=[
  {kind:"chord",rootPc:0,familyId:"major",sectorIndex:0},
  {kind:"note",pitchClass:1,sectorIndex:7},
  {kind:"chord",rootPc:7,familyId:"dominant7",sectorIndex:1},
];
assert.deepEqual(recordedMidiNotes(events[0]),chordMidiNotes(0,"major",4));
assert.deepEqual(recordedMidiNotes(events[1]),[61]);
const abc=toAbc(events);
assert.match(abc,/\[CEG\]/);
assert.match(abc,/\^C/);
assert.match(abc,/\[GBdf\]/i);
assert.match(abc,/K:C/);
assert.ok(!abc.includes("Stradella"));
assert.match(toAbc([]),/z4/);
console.log("recording.test.ts: recording and ABC tests passed");
