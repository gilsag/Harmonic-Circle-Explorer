import type { ChordFamilyId, ScaleId } from "../music";
import type { InterfaceLanguage } from "./catalog";
const HARMONY_FAMILIES_ES: Record<ChordFamilyId, string> = {
  major: "tríada mayor", minor: "tríada menor", diminished: "tríada disminuida", augmented: "tríada aumentada",
  sus2: "segunda suspendida", sus4: "cuarta suspendida", sixth: "sexta mayor", minor6: "sexta menor",
  dominant7: "séptima de dominante", major7: "séptima mayor", minor7: "séptima menor",
  minorMajor7: "séptima mayor con tercera menor", halfDiminished7: "séptima semidisminuida",
  diminished7: "séptima disminuida", augmented7: "séptima de dominante aumentada",
  augmentedMajor7: "séptima mayor aumentada",
};
const HARMONY_FAMILIES_FR: Record<ChordFamilyId, string> = {
  major: "triade majeure", minor: "triade mineure", diminished: "triade diminuée", augmented: "triade augmentée",
  sus2: "seconde suspendue", sus4: "quarte suspendue", sixth: "sixte majeure", minor6: "sixte mineure",
  dominant7: "septième de dominante", major7: "septième majeure", minor7: "septième mineure",
  minorMajor7: "septième majeure avec tierce mineure", halfDiminished7: "septième demi-diminuée",
  diminished7: "septième diminuée", augmented7: "septième de dominante augmentée",
  augmentedMajor7: "septième majeure augmentée",
};
const HARMONY_FAMILIES_PT: Record<ChordFamilyId, string> = {
  major: "tríade maior", minor: "tríade menor", diminished: "tríade diminuta", augmented: "tríade aumentada",
  sus2: "segunda suspensa", sus4: "quarta suspensa", sixth: "sexta maior", minor6: "sexta menor",
  dominant7: "sétima da dominante", major7: "sétima maior", minor7: "sétima menor",
  minorMajor7: "sétima maior com terça menor", halfDiminished7: "sétima meio-diminuta",
  diminished7: "sétima diminuta", augmented7: "sétima da dominante aumentada",
  augmentedMajor7: "sétima maior aumentada",
};
const HARMONY_FAMILIES_IT: Record<ChordFamilyId, string> = {
  major: "triade maggiore", minor: "triade minore", diminished: "triade diminuita", augmented: "triade aumentata",
  sus2: "seconda sospesa", sus4: "quarta sospesa", sixth: "sesta maggiore", minor6: "sesta minore",
  dominant7: "settima di dominante", major7: "settima maggiore", minor7: "settima minore",
  minorMajor7: "settima maggiore con terza minore", halfDiminished7: "settima semidiminuita",
  diminished7: "settima diminuita", augmented7: "settima di dominante aumentata",
  augmentedMajor7: "settima maggiore aumentata",
};
const HARMONY_FAMILIES_DE: Record<ChordFamilyId, string> = {
  major: "Dur-Dreiklang", minor: "Moll-Dreiklang", diminished: "verminderter Dreiklang", augmented: "übermäßiger Dreiklang",
  sus2: "Sekundvorhalt", sus4: "Quartvorhalt", sixth: "große Sexte", minor6: "kleine Sexte",
  dominant7: "Dominantseptakkord", major7: "große Septime", minor7: "kleine Septime",
  minorMajor7: "große Septime mit kleiner Terz", halfDiminished7: "halbverminderter Septakkord",
  diminished7: "verminderter Septakkord", augmented7: "übermäßiger Dominantseptakkord",
  augmentedMajor7: "übermäßiger Durmaj7-Akkord",
};
const SCALES_ES: Record<ScaleId, string> = {
  ionian: "jónico (mayor)", dorian: "dórico", phrygian: "frigio", lydian: "lidio",
  mixolydian: "mixolidio", aeolian: "eólico (menor natural)", locrian: "locrio",
  harmonicMinor: "menor armónica", melodicMinor: "menor melódica (ascendente)",
  harmonicMajor: "mayor armónica", majorPentatonic: "pentatónica mayor",
  minorPentatonic: "pentatónica menor", wholeTone: "tonos enteros",
};
const SCALES_FR: Record<ScaleId, string> = {
  ionian: "ionien (majeur)", dorian: "dorien", phrygian: "phrygien", lydian: "lydien",
  mixolydian: "mixolydien", aeolian: "éolien (mineur naturel)", locrian: "locrien",
  harmonicMinor: "mineur harmonique", melodicMinor: "mineur mélodique (ascendant)",
  harmonicMajor: "majeur harmonique", majorPentatonic: "pentatonique majeure",
  minorPentatonic: "pentatonique mineure", wholeTone: "gamme par tons",
};
const SCALES_PT: Record<ScaleId, string> = {
  ionian: "jônio (maior)", dorian: "dórico", phrygian: "frígio", lydian: "lídio",
  mixolydian: "mixolídio", aeolian: "eólio (menor natural)", locrian: "lócrio",
  harmonicMinor: "menor harmônica", melodicMinor: "menor melódica (ascendente)",
  harmonicMajor: "maior harmônica", majorPentatonic: "pentatônica maior",
  minorPentatonic: "pentatônica menor", wholeTone: "tons inteiros",
};
const SCALES_IT: Record<ScaleId, string> = {
  ionian: "ionico (maggiore)", dorian: "dorico", phrygian: "frigio", lydian: "lidio",
  mixolydian: "misolidio", aeolian: "eolio (minore naturale)", locrian: "locrio",
  harmonicMinor: "minore armonica", melodicMinor: "minore melodica (ascendente)",
  harmonicMajor: "maggiore armonica", majorPentatonic: "pentatonica maggiore",
  minorPentatonic: "pentatonica minore", wholeTone: "toni interi",
};
const SCALES_DE: Record<ScaleId, string> = {
  ionian: "ionisch (Dur)", dorian: "dorisch", phrygian: "phrygisch", lydian: "lydisch",
  mixolydian: "mixolydisch", aeolian: "äolisch (natürliches Moll)", locrian: "lokrisch",
  harmonicMinor: "harmonisch Moll", melodicMinor: "melodisch Moll (aufsteigend)",
  harmonicMajor: "harmonisch Dur", majorPentatonic: "Durpentatonik",
  minorPentatonic: "Mollpentatonik", wholeTone: "Ganztonleiter",
};
const FAMILIES: Partial<Record<InterfaceLanguage, Record<ChordFamilyId, string>>> =
 {es:HARMONY_FAMILIES_ES,fr:HARMONY_FAMILIES_FR,pt:HARMONY_FAMILIES_PT,it:HARMONY_FAMILIES_IT,de:HARMONY_FAMILIES_DE};
const MODES: Partial<Record<InterfaceLanguage, Record<ScaleId, string>>> =
 {es:SCALES_ES,fr:SCALES_FR,pt:SCALES_PT,it:SCALES_IT,de:SCALES_DE};
export function familyName(id:ChordFamilyId, english:string, lang:InterfaceLanguage) {return FAMILIES[lang]?.[id]??english;}
export function scaleName(id:ScaleId, english:string, lang:InterfaceLanguage) {return MODES[lang]?.[id]??english;}
