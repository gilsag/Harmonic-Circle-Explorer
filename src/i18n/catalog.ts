import { EN } from "./en";
import { ES } from "./es";
import { FR } from "./fr";
import { PT } from "./pt";
import { IT } from "./it";
import { DE } from "./de";
export type TranslationKey = keyof typeof EN;
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" }, { code: "es", label: "Español" },
  { code: "fr", label: "Français" }, { code: "pt", label: "Português (Brasil)" },
  { code: "it", label: "Italiano" }, { code: "de", label: "Deutsch" },
] as const;
export type InterfaceLanguage = typeof SUPPORTED_LANGUAGES[number]["code"];
export type LanguagePreference = InterfaceLanguage | "auto";
const catalogs: Record<InterfaceLanguage, Readonly<Partial<Record<TranslationKey,string>>>> =
  { en: EN, es: ES, fr: FR, pt: PT, it: IT, de: DE };
export function isLanguage(value: unknown): value is InterfaceLanguage {
  return SUPPORTED_LANGUAGES.some(({code}) => code === value);
}
export function detectBrowserLanguage(locales: readonly string[]): InterfaceLanguage {
  for (const locale of locales) {
    const code = locale.trim().replace(/_/g,"-").split("-")[0].toLowerCase();
    if (isLanguage(code)) return code;
  }
  return "en";
}
export function resolveLanguage(pref: LanguagePreference, locales: readonly string[]): InterfaceLanguage {
  return pref === "auto" ? detectBrowserLanguage(locales) : pref;
}
export function translate(language: InterfaceLanguage, key: TranslationKey, params?: Record<string,string|number>) {
  const value = catalogs[language][key] ?? EN[key];
  return value.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g,(raw,name:string) =>
    params && Object.prototype.hasOwnProperty.call(params,name) ? String(params[name]) : raw);
}
