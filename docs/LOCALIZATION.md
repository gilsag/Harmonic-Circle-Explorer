# Adding an Interface Language

## Catalog structure

The standalone Harmonic Circle Explorer uses `src/i18n/catalog.ts` as the language registry and six locale files: `en.ts`, `es.ts`, `fr.ts`, `pt.ts`, `it.ts`, `de.ts`. The English catalog defines the reference keys. Music terms are mapped independently in `src/i18n/musicTerms.ts`.

## Procedure

1. Create `src/i18n/<code>.ts` containing every English key translated into the new language. Preserve interpolation placeholders such as `{count}`, `{scale}` and `{reference}` exactly.
2. Register the language code and display name in `SUPPORTED_LANGUAGES`, import the catalog, and add it to the registry in `catalog.ts`.
3. Add localized names for every `ChordFamilyId` and `ScaleId` in `musicTerms.ts`, using the canonical IDs from `music.ts`. Do not change harmonic intervals or root numbering.
4. Review diagrams, the legend, tooltips, explanations, recording panel, settings, and About at short/long text lengths. Check browser-locale detection and the English fallback for unsupported languages.
5. Extend `scripts/localization.test.ts` to verify complete key parity, placeholder parity, sample musical terminology, and locale detection. Run `npm test`, `npm run lint`, and `npm run build`.
6. Check downloaded SVG/PNG and notation SVG in the browser. Musical identifiers and export filenames must remain independent of the UI language.

The `pt` catalog currently uses Brazilian Portuguese, including as the fallback for `pt-PT`. This is an interface-language setting, not a pitch-naming or notation-mode setting.

Bundled documentation is written in English. Interface translation does not automatically translate README or the user guide.
