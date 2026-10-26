import { chordFamily, chordMidiNotes, mod12, type ChordFamilyId } from "./music";
export type RecordedEvent =
 | {kind:"chord"; rootPc:number; familyId:ChordFamilyId; sectorIndex:number}
 | {kind:"note"; pitchClass:number; sectorIndex:number};
const NAMES = ["C","^C","D","_E","E","F","^F","G","_A","A","_B","B"] as const;
/** ABC notation uses actual nominal MIDI octaves, independent of displayed enharmonics. */
export function midiToAbc(midi:number):string {
 const octave=Math.floor(midi/12)-1;
 const symbol=NAMES[mod12(midi)];
 const letter=symbol.at(-1)!;
 const acc=symbol.slice(0,-1);
 if (octave>=5) return `${acc}${letter.toLowerCase()}${"'".repeat(octave-5)}`;
 return `${acc}${letter}${",".repeat(Math.max(0,4-octave))}`;
}
export function recordedMidiNotes(event:RecordedEvent):number[] {
 return event.kind === "note" ? [60+mod12(event.pitchClass)] : chordMidiNotes(event.rootPc,event.familyId,4);
}
export function toAbc(events:readonly RecordedEvent[]):string {
 const notes=events.map((event)=>{
  const pitches=recordedMidiNotes(event).map(midiToAbc);
  return pitches.length===1 ? pitches[0] : `[${pitches.join("")}]`;
 });
 return ["X:1","T:Harmonic Circle recording","M:4/4","L:1/4","K:C",notes.length ? notes.map((note,index)=>note+((index+1)%4===0?" |":"")).join(" ")+" |]" : "z4 |]"].join("\n");
}
export function recordedEventLabel(event:RecordedEvent) {
 return event.kind==="note"?`Note ${event.pitchClass}`:`${chordFamily(event.familyId).shortName} (${event.rootPc})`;
}
