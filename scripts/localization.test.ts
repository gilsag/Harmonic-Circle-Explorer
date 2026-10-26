import assert from "node:assert/strict";
import { EN } from "../src/i18n/en";
import { ES } from "../src/i18n/es";
import { FR } from "../src/i18n/fr";
import { PT } from "../src/i18n/pt";
import { IT } from "../src/i18n/it";
import { DE } from "../src/i18n/de";
import { detectBrowserLanguage, resolveLanguage, translate } from "../src/i18n/catalog";
import { familyName, scaleName } from "../src/i18n/musicTerms";
const keys=Object.keys(EN).sort();
for(const [name,catalog] of Object.entries({ES,FR,PT,IT,DE})){
  assert.deepEqual(Object.keys(catalog).sort(),keys,`${name} translation keys`);
  for(const key of keys){
    const slots=(value:string)=>[...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map(v=>v[1]).sort();
    assert.deepEqual(slots(catalog[key as keyof typeof EN]),slots(EN[key as keyof typeof EN]),`${name}:${key}`);
  }
}
assert.equal(detectBrowserLanguage(["pt-PT","en-US"]),"pt");
assert.equal(detectBrowserLanguage(["ja-JP","de-DE"]),"de");
assert.equal(detectBrowserLanguage(["ja-JP"]),"en");
assert.equal(resolveLanguage("es",["de-DE"]),"es");
assert.equal(translate("es","app.sharing",{count:2,unit:"notas"}).includes("2"),true);
assert.notEqual(familyName("minor7","Minor seventh","fr"),"Minor seventh");
assert.notEqual(scaleName("aeolian","Aeolian","de"),"Aeolian");
console.log("localization.test.ts: all localization checks passed");
