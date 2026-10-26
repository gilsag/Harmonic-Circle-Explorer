import { chordFamily, pitchName, type ChordFamilyId } from "./music";
import { familyName } from "./i18n/musicTerms";
import type { InterfaceLanguage } from "./i18n/catalog";
export type ChordDisplayStyle = "compact" | "letters" | "words";
/** Presentation-only formatting. Harmony engine identities never depend on this. */
export function formatChord(rootPc:number, familyId:ChordFamilyId, sectorIndex:number, enharmonics:boolean, style:ChordDisplayStyle, language:InterfaceLanguage="en") {
 const root = pitchName(rootPc, sectorIndex, enharmonics);
 const family = chordFamily(familyId);
 if (style === "words") return root.split("/").map((note) => `${note} ${familyName(familyId,family.name,language)}`).join(" / ");
 const suffix = style === "letters" && familyId === "major" ? "M" : family.suffix;
 return root.split("/").map((note) => `${note}${suffix}`).join("/");
}
