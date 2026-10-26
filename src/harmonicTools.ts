import {
  analyzeVoiceLeading, CHORD_FAMILIES, chordFamily, isSubset, mod12, pitchClassesForChord,
  pitchClassesForScale, type ChordFamilyId, type ScaleId, type VoiceLeadingAnalysis,
} from "./music";

/** These operations are pitch-class analyses, not physical or octave-specific voicings. */
export type ChordIdentity = Readonly<{rootPc:number; familyId:ChordFamilyId}>;
export type IntermediatePool = ChordFamilyId | "diatonic";
export type PathOptions = Readonly<{
  start:ChordIdentity;
  end:ChordIdentity;
  transitions:2|3|4;
  intermediatePool:IntermediatePool;
  parentRootPc:number;
  parentScaleId:ScaleId;
  resultLimit?:number;
}>;
export type HarmonicPath = {chords:ChordIdentity[]; score:number; transitions:VoiceLeadingAnalysis[]};

export function chordIdentityKey(chord:ChordIdentity) { return `${mod12(chord.rootPc)}:${chord.familyId}`; }
export function compareChords(a:ChordIdentity,b:ChordIdentity):VoiceLeadingAnalysis {
  return analyzeVoiceLeading(pitchClassesForChord(a.rootPc,a.familyId),pitchClassesForChord(b.rootPc,b.familyId));
}

/**
 * Consistent heuristic: lower score means less pitch-class motion, fewer
 * unmatched tones, and better common-tone retention. Not harmonic function.
 * No octave or physical-instrument assumptions are made.
 */
export function transitionCost(analysis:VoiceLeadingAnalysis) {
  return analysis.totalMotion +
    2 * (analysis.addedPitchClasses.length + analysis.removedPitchClasses.length) +
    1.5 * Math.max(0, 3 - analysis.sharedPitchClasses.length);
}

function candidatePool(options:PathOptions):ChordIdentity[] {
  const candidates:ChordIdentity[]=[];
  const parent= pitchClassesForScale(options.parentRootPc, options.parentScaleId);
  const families = options.intermediatePool === "diatonic"
    ? CHORD_FAMILIES.map(family=>family.id)
    : [options.intermediatePool];
  for (const familyId of families) {
    // Validate a family ID through the existing registry.
    chordFamily(familyId);
    for (let rootPc=0;rootPc<12;rootPc++) {
      const chord={rootPc,familyId};
      if(options.intermediatePool!=="diatonic" || isSubset(pitchClassesForChord(rootPc,familyId),parent))
        candidates.push(chord);
    }
  }
  return candidates;
}

/**
 * Beam search for simple paths of EXACTLY `transitions` edges. Endpoints are
 * fixed, intermediates never repeat, and the result order is deterministic.
 * A bounded beam prevents the all-diatonic case from becoming exponential.
 */
export function findHarmonicPaths(options:PathOptions):HarmonicPath[] {
  const limit=Math.max(1,Math.min(10,Math.trunc(options.resultLimit??5)));
  if(chordIdentityKey(options.start)===chordIdentityKey(options.end)) return [];
  const excluded=new Set([chordIdentityKey(options.start),chordIdentityKey(options.end)]);
  const pool=candidatePool(options).filter(chord=>!excluded.has(chordIdentityKey(chord)));
  if(pool.length<options.transitions-1) return [];
  type Partial={chords:ChordIdentity[];score:number;analyses:VoiceLeadingAnalysis[];keys:Set<string>};
  const analysisCache = new Map<string,VoiceLeadingAnalysis>();
  const analyze=(a:ChordIdentity,b:ChordIdentity)=>{
    const key=`${chordIdentityKey(a)}>${chordIdentityKey(b)}`;
    let result=analysisCache.get(key);
    if(!result){result=compareChords(a,b);analysisCache.set(key,result);}
    return result;
  };
  const keyOf=(path:Partial)=>path.chords.map(chordIdentityKey).join(">");
  const order=(a:Partial,b:Partial)=>a.score-b.score || keyOf(a).localeCompare(keyOf(b));
  let frontier:Partial[]=[{chords:[options.start],score:0,analyses:[],keys:new Set([chordIdentityKey(options.start)])}];
  // Reserve one transition for the destination chord.
  for(let depth=1;depth<options.transitions;depth++){
    const expanded:Partial[]=[];
    for(const path of frontier){
      const prev=path.chords[path.chords.length-1];
      for(const next of pool){
        const key=chordIdentityKey(next);
        if(path.keys.has(key))continue;
        const movement=analyze(prev,next);
        expanded.push({
          chords:[...path.chords,next],score:path.score+transitionCost(movement),
          analyses:[...path.analyses,movement],keys:new Set([...path.keys,key]),
        });
      }
    }
    // Keep enough diverse routes so all suggestions don't share a single first chord.
    expanded.sort(order);
    const beamWidth=Math.max(48,limit*18);
    const seen=new Set<string>();
    frontier=[];
    for(const path of expanded){
      const key=keyOf(path);
      if(seen.has(key)) continue;
      seen.add(key);frontier.push(path);
      if(frontier.length>=beamWidth) break;
    }
  }
  return frontier.map(path=>{
    const final=analyze(path.chords[path.chords.length-1],options.end);
    return {chords:[...path.chords,options.end],score:path.score+transitionCost(final),transitions:[...path.analyses,final]};
  }).sort((a,b)=>a.score-b.score || a.chords.map(chordIdentityKey).join(">").localeCompare(b.chords.map(chordIdentityKey).join(">"))).slice(0,limit);
}
