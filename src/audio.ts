import type { RecordedEvent } from "./recording";
import { recordedMidiNotes } from "./recording";
import type { ChordFamilyId } from "./music";
import { analyzeVoiceLeading, chordFamily, mod12, pitchClassesForChord } from "./music";

export type PlaybackStyle = "block" | "arpeggio";
export type VoicingStyle = "root" | "smooth";

export type ReferenceChord = {
  rootPc: number;
  familyId: ChordFamilyId;
};

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (!audioContext) audioContext = new AudioContext();
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

function midiToFrequency(midi: number) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function rootPositionMidiNotes(rootPc: number, familyId: ChordFamilyId, baseOctave = 4) {
  const rootMidi = 12 * (baseOctave + 1) + mod12(rootPc);
  return chordFamily(familyId).intervals.map((interval) => rootMidi + interval);
}

function nearestMidiForPc(pc: number, aroundMidi: number) {
  const normalized = mod12(pc);
  const approximateOctave = Math.floor(aroundMidi / 12);
  let best = normalized + approximateOctave * 12;
  let bestDistance = Math.abs(best - aroundMidi);
  for (let octaveOffset = -2; octaveOffset <= 2; octaveOffset += 1) {
    const candidate = normalized + (approximateOctave + octaveOffset) * 12;
    const distance = Math.abs(candidate - aroundMidi);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

function smoothMidiFrom(referenceNotes: readonly number[], targetRootPc: number, targetFamilyId: ChordFamilyId) {
  const referencePcs = referenceNotes.map(mod12);
  const targetPcs = pitchClassesForChord(targetRootPc, targetFamilyId);
  const analysis = analyzeVoiceLeading(referencePcs, targetPcs);
  const output: number[] = [];

  analysis.sharedPitchClasses.forEach((pc) => {
    const held = referenceNotes.find((midi) => mod12(midi) === pc);
    if (held !== undefined) output.push(held);
  });

  analysis.moves.forEach((move) => {
    const source = referenceNotes.find((midi) => mod12(midi) === move.fromPc);
    if (source !== undefined) output.push(nearestMidiForPc(move.toPc, source));
  });

  const centre = referenceNotes.reduce((sum, midi) => sum + midi, 0) / Math.max(1, referenceNotes.length);
  analysis.addedPitchClasses.forEach((pc) => output.push(nearestMidiForPc(pc, centre)));

  return output.sort((a, b) => a - b);
}

function smoothMidiNotes(reference: ReferenceChord, targetRootPc: number, targetFamilyId: ChordFamilyId) {
  return smoothMidiFrom(rootPositionMidiNotes(reference.rootPc, reference.familyId, 4), targetRootPc, targetFamilyId);
}

/** Playback pitches are illustrative; they do not replace pitch-class path scores or nominal notation. */
export function sequencePlaybackNotes(events: readonly RecordedEvent[], voicing: VoicingStyle): number[][] {
  let previousChord: number[] | null = null;
  return events.map((event) => {
    if (event.kind === "note") {
      previousChord = null;
      return recordedMidiNotes(event);
    }
    const notes: number[] = voicing === "smooth" && previousChord !== null
      ? smoothMidiFrom(previousChord, event.rootPc, event.familyId)
      : rootPositionMidiNotes(event.rootPc, event.familyId, 4);
    previousChord = notes;
    return notes;
  });
}

function playVoice(context: AudioContext, midi: number, startAt: number, duration: number) {
  const frequency = midiToFrequency(midi);
  const master = context.createGain();
  const filter = context.createBiquadFilter();
  const fundamental = context.createOscillator();
  const reed = context.createOscillator();
  const reedGain = context.createGain();

  fundamental.type = "triangle";
  fundamental.frequency.setValueAtTime(frequency, startAt);

  reed.type = "sawtooth";
  reed.frequency.setValueAtTime(frequency, startAt);
  reed.detune.setValueAtTime(4, startAt);
  reedGain.gain.setValueAtTime(0.11, startAt);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(Math.min(4200, frequency * 8), startAt);
  filter.Q.setValueAtTime(0.35, startAt);

  master.gain.setValueAtTime(0.0001, startAt);
  master.gain.exponentialRampToValueAtTime(0.16, startAt + 0.025);
  master.gain.setValueAtTime(0.16, Math.max(startAt + 0.03, startAt + duration - 0.14));
  master.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  fundamental.connect(filter);
  reed.connect(reedGain);
  reedGain.connect(filter);
  filter.connect(master);
  master.connect(context.destination);

  fundamental.start(startAt);
  reed.start(startAt);
  fundamental.stop(startAt + duration + 0.02);
  reed.stop(startAt + duration + 0.02);
}

function scheduleNotes(
  context: AudioContext,
  notes: readonly number[],
  style: PlaybackStyle,
  startAt: number,
) {
  if (style === "arpeggio") {
    const step = 0.14;
    const duration = 0.58;
    notes.forEach((midi, index) => playVoice(context, midi, startAt + index * step, duration));
    return startAt + Math.max(0, notes.length - 1) * step + duration;
  }

  notes.forEach((midi) => playVoice(context, midi, startAt, 0.9));
  return startAt + 0.9;
}

export function playChord(
  rootPc: number,
  familyId: ChordFamilyId,
  style: PlaybackStyle,
  voicing: VoicingStyle = "root",
  reference?: ReferenceChord,
) {
  const context = getAudioContext();
  const notes = voicing === "smooth" && reference
    ? smoothMidiNotes(reference, rootPc, familyId)
    : rootPositionMidiNotes(rootPc, familyId, 4);
  const now = context.currentTime + 0.015;
  scheduleNotes(context, notes, style, now);
}

/**
 * Audibly demonstrates voice leading by sounding the reference chord first and
 * then the target chord in the selected root-position or nearby MIDI voicing.
 * For block playback, exact common MIDI tones are sustained through the change instead of being
 * retriggered. Arpeggiated playback presents the two voicings sequentially.
 */
export function playVoiceLeadingTransition(
  reference: ReferenceChord,
  targetRootPc: number,
  targetFamilyId: ChordFamilyId,
  style: PlaybackStyle,
  voicing: VoicingStyle = "smooth",
) {
  const context = getAudioContext();
  const referenceNotes = rootPositionMidiNotes(reference.rootPc, reference.familyId, 4);
  const targetNotes = voicing === "smooth"
    ? smoothMidiNotes(reference, targetRootPc, targetFamilyId)
    : rootPositionMidiNotes(targetRootPc, targetFamilyId, 4);
  const now = context.currentTime + 0.015;

  if (style === "arpeggio") {
    const referenceEnd = scheduleNotes(context, referenceNotes, "arpeggio", now);
    scheduleNotes(context, targetNotes, "arpeggio", referenceEnd + 0.08);
    return;
  }

  const transitionAt = now + 0.72;
  const targetSet = new Set(targetNotes);
  const sharedMidi = new Set(referenceNotes.filter((midi) => targetSet.has(midi)));

  referenceNotes.forEach((midi) => {
    playVoice(context, midi, now, sharedMidi.has(midi) ? 1.62 : 0.68);
  });
  targetNotes.forEach((midi) => {
    if (!sharedMidi.has(midi)) playVoice(context, midi, transitionAt, 0.9);
  });
}

/** Single-note events use the standalone synthesizer, not accordion samples. */
export function playNote(pitchClass:number) {
 const context=getAudioContext();
 playVoice(context, 60+mod12(pitchClass), context.currentTime+0.015, 0.65);
}
/** Schedule the complete captured sequence in the shared Web Audio context. */
export function playRecordedSequence(events:readonly RecordedEvent[], style:PlaybackStyle, voicing:VoicingStyle="root") {
 if(!events.length) return;
 const context=getAudioContext();
 let start=context.currentTime+0.04;
 for(const notes of sequencePlaybackNotes(events,voicing)) {
  scheduleNotes(context,notes,style,start);
  start+=style==="arpeggio" ? 0.18*Math.max(1,notes.length)+0.57 : 0.96;
 }
}
