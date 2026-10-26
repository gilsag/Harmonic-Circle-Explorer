# Harmonic Circle Explorer — Technical Notes

Version 0.6.1

## Architecture

The standalone tool separates musical logic from rendering and audio:

- `src/music.ts` — chord families, scales/modes, circle-of-fifths roots, pitch-class calculations, diatonic tests, enharmonic labels, relationship generation, Roman numerals, family colors, and pitch-class voice-leading analysis.
- `src/components/HarmonicCircle.tsx` — SVG diagram renderer, legend layout, rich interactive tooltips, click-to-compare state, and optional explanation box.
- `src/explanation.ts` — pure generation of short visualization explanations, including detection of overlap rings removed by the diatonic filter.
- `src/audio.ts` — click-triggered block/arpeggio Web Audio playback with root-position and smooth voice-led voicing strategies.
- `src/download.ts` — SVG serialization and PNG raster export.
- `src/App.tsx` — controls, presets, recorder, JSON settings, language preferences, and About dialog.
- `src/recording.ts` — typed chord/note event model and ABC encoding of nominal MIDI pitches.
- `src/display.ts` — presentation-only chord-symbol styles without changing harmonic identifiers.
- `src/i18n/` — independent translation catalogs, locale registry, chord-family names, and scale/mode names.
- `src/legendTextLayout.ts` — SVG legend glyph-width estimates and word wrapping.

This separation keeps the harmonic engine, rendering, and audio layers independently reusable and testable, without coupling the musical logic to the standalone interface.

## Relationship algorithm

For sector tonic `T`, reference family `R`, related selection `Q`, and parent scale/mode `S`:

1. Construct `R(T)` as a set of pitch classes.
2. Construct `S(T)` as the parent pitch-class set.
3. For each chromatic root `q` from 0 to 11, construct `Q(q)`. If `Q = All families`, repeat this for every supported chord family.
4. Calculate `|R(T) ∩ Q(q)|`.
5. Retain all overlap classes, including zero overlap, so ring visibility remains a presentation choice rather than a harmonic-search choice.
6. Mark `Q(q)` as diatonic exactly when `Q(q) ⊆ S(T)`.
7. Apply the diatonic-only filter if requested. In **All families** mode this filter is mandatory and is enforced by the music engine, not only by the UI.
8. Group candidates by overlap cardinality in descending order.
9. Apply the independent ring-visibility map at the presentation layer. Positive-overlap rings default to visible; zero overlap defaults to hidden.

Enharmonic identity does not alter the pitch-class set. Therefore enharmonic display can be switched on without producing duplicate harmonic candidates.

## Circle geometry

The twelve sector centers are spaced by 30 degrees with C at the top. In ordinary single-family diagrams, the reference band and active relationship bands divide the radial space equally. In **All families** mode the same fixed outer diameter is preserved, but relationship-band widths are weighted by sector density. Dense sectors use a geometry-aware local grid. Near the top and bottom, rows follow the radial direction and columns follow the tangent. Near the left and right sides, that grid is transposed so rows follow the tangent (mostly vertical) and columns follow the radius (mostly horizontal). The renderer evaluates one-, two-, and three-column arrangements and chooses the one that permits the largest readable font for the available wedge geometry.

## Embedding in other applications

The code is intentionally modular so the harmonic engine and renderer can be reused elsewhere. A typical integration path is:

1. Reuse the relationship functions from `music.ts` directly or move them into a host application's music-utility layer.
2. Embed or adapt the SVG renderer to the host application's workspace and export controls.
3. Replace or supplement `audio.ts` with the host application's preferred sound engine.
4. Connect diagram defaults to the host application's settings/persistence system if required.
5. Integrate help and About content using the host application's own documentation conventions.

No part of the relationship engine depends on React or browser audio, so it can be tested independently.

## Explanation generation

The explanation layer compares the common-tone counts visible under the current filter with the counts available when the same chord families are evaluated without the diatonic restriction. If a shared-note class disappears only because of the diatonic filter, the generated explanation names that missing class. The explanation is rendered inside the SVG when enabled, so it is preserved in SVG and PNG exports.

Chord tooltips are custom SVG `foreignObject` overlays so individual shared tones can be styled within the tone list. They include family, tones, shared tones, Roman numeral, diatonic status, and voice-leading information. Tooltip and click-selection elements carry `data-export-ignore="true"`; `download.ts` removes them before SVG serialization, so transient interaction state never leaks into exports.

## Roman numerals and voice leading

Roman numerals are calculated relative to the selected parent scale/mode for each sector. If a chord root is not a degree of that parent, the tooltip reports a chromatic root rather than inventing an accidental Roman numeral. Chord quality is encoded through numeral case and familiar suffixes such as `V7`, `vi7`, `iiø7`, or `Imaj7`.

Voice-leading analysis is deliberately narrow and style-neutral. Exact common pitch classes are held. The remaining pitch classes are paired by exhaustive minimum-distance matching using chromatic semitone distance; if chord cardinalities differ, unmatched target/reference tones are reported as additions/removals rather than being assigned an arbitrary penalty. This is a proximity measure, not a set of classical SATB rules. Smooth audio voicing uses the same pairing logic but chooses concrete MIDI octave placements only inside the audio layer. The smooth mode audibly previews the relationship by playing the reference chord followed by the target voicing; block playback sustains exact common MIDI tones across the change where possible. The harmonic engine remains octave-independent so the audio layer or a host application can impose its own register and voicing constraints.

## All-families mode

`RelatedFamilyId` extends the ordinary `ChordFamilyId` with the sentinel value `"all"`. Candidate records always retain a concrete `familyId`, so labels, tooltips, audio playback, sorting, and downstream integrations continue to operate on real chord families after the aggregate search. The candidate matching the inner-ring reference root and family is suppressed in aggregate mode to avoid a redundant label. This mode deliberately does not generate non-diatonic candidates. Zero-overlap candidates are generated with the rest of the relationship set and are hidden by the default ring-visibility map. The same map can independently hide or reveal any shared-note class.

## Note ring and interactive events

The twelve sector pitch classes are displayed in a dedicated annulus inside the chord-reference ring when enabled. The chart geometry reserves more inner space; the twelve reference and relationship sectors remain independent of note-ring visibility. The legend and explanation derive their note-ring text from the same boolean state, so toggling visibility changes export content immediately. Note events use the standalone synthesizer; they are not modeled as chords.

## Recording, notation, and localization boundaries

`RecordedEvent` distinguishes `{kind:"chord", rootPc, familyId, sectorIndex}` from `{kind:"note", pitchClass, sectorIndex}`. IDs and pitch classes remain musical data, never translated labels. `toAbc` generates a score in C major with quarter-note events; chords use root-position nominal MIDI notes and individual notes are mapped to octave 4. Smooth voice-led auditory transitions do not alter this encoded score. The existing `abcjs` dependency renders staff notation; its SVG is downloaded separately from the relationship diagram.

`src/i18n/catalog.ts` defines the language registry, browser-language resolution, and English fallback. The `en.ts` catalog defines stable keys, with parallel Spanish, French, Portuguese, Italian and German catalogs. `musicTerms.ts` localizes family/scale names only at presentation boundaries. Core pitch classes, enharmonic logic, chord symbols for files, and filenames remain stable across languages.

Settings JSON uses `schemaVersion: 1`; import checks enumeration membership, booleans, and slider bounds before assigning state. Only the interface-language preference is automatically stored in local storage. Reset restores active-tool defaults, not recordings or shared audio and interface preferences.

## Validation

Run `npm test`, `npm run lint`, and `npm run build`. Check note-ring on/off and multilingual legend wrapping at both diagram diameter extremes, long word-based chord names, audio/note recording, ABC rendering, SVG/PNG relationship export, notation SVG export, narrow layouts, and JSON import/export. Unit tests do not establish browser-rendering or exported-image appearance.

## Tool-oriented UI architecture (v0.5.1)

The standalone application has a top-level tool registry (`AVAILABLE_HARMONY_TOOLS` in `src/App.tsx`) containing Harmonic Circle, Harmonic Path Finder and Chord Comparison. Future tools should register real implementations and expose their own settings without inserting disabled navigation. Shared appearance, playback, recording, notation and export behavior stays independent of any future tool-specific harmonic search.

The left panel has two views, Tools and Settings; Focus hides it. Relationship display uses the pure conversions in `src/relationshipDisplay.ts` over the existing `diatonicOnly` / `highlightDiatonic` values, preserving configuration JSON schema 1. The All families constraint remains diatonic-only. Restore tool defaults preserves shared playback/download preferences, interface language and recording events; clearing recorded events requires explicit confirmation. On mobile, the panel overlays the visualization rather than preceding it in document flow.


## Harmonic exploration tools (v0.6.0)

`src/harmonicTools.ts` provides `compareChords` and `findHarmonicPaths` as pure, accordion-independent functions over canonical root pitch classes and `ChordFamilyId`. Comparison delegates to the existing `analyzeVoiceLeading()` in `music.ts`, preserving the established common-tone-first matching convention. Path transitions use its `totalMotion` with modest unmatched-note and common-tone penalties. The search selects exactly 2–4 edges, avoids repeated chord identities and returns a deterministically ordered, bounded-beam shortlist (not exhaustive optimization). The diatonic intermediate pool is evaluated against one explicitly selected tonic and `ScaleId`, different from the per-sector context in the existing circle. Path endpoints are not subjected to that intermediate constraint.

The toolbar in `src/App.tsx` selects the three implemented tools. Tool settings are independent, shared recording/notation and Web Audio synthesis are retained, and a tool-specific diagram is rendered by `src/components/HarmonyToolDiagram.tsx` using native SVG (not nested `foreignObject`). Diagram SVG/PNG export operates through the existing download helpers. Chord-label presentation uses `formatChord`; saved settings extend JSON schema v1 with optional validated tool-specific fields, preserving backwards compatibility. The new locale keys are present in all six catalogs.

Acceptance must include paths with 2/3/4 transitions, insufficient candidates, chromatic endpoints with a diatonic intermediate pool, chords with different cardinalities, recording/export behavior, tooltip/readability at long translations and narrow widths. Passing TypeScript and source tests is not a substitute for real browser and SVG/PNG inspection.

## Shared settings and sound-preview consistency (v0.6.1)

Relationship display now appears inside the Harmonic Circle Harmonic context section; the former standalone Relationships block is removed. Diagram/ring controls and circle diameter appear in Settings only when the circle is selected. Shared appearance settings (label style, enharmonic display, maximum font size, family colors and hover chord information) are passed explicitly to the SVG view of each tool. The linear path and comparison diagrams scale and fit labels within their own card geometry rather than applying circle diameter to unrelated SVGs. All help affordances are attached beside their associated section title or control label, not in independent rows.

`src/audio.ts` exposes pure `sequencePlaybackNotes()` to calculate MIDI preview sequences for root/smooth modes independently of Web Audio. It reuses the existing pitch-class matching in `analyzeVoiceLeading()` while positioning subsequent chord tones near the *previous sounded MIDI voicing*. Notes are scheduled through the existing synthesizer; a single-note event interrupts the chord-to-chord chain. `playVoiceLeadingTransition()` selects a root-position target or smooth target from the same setting. Playback pitch ranges are illustrative and remain distinct from the octave-independent harmonic path score and nominal ABC staff export.

Settings JSON retains schema version 1 and all existing fields. It adds optional `pathScaleId` so changing Path Finder’s diatonic parent mode does not change the circle’s parent scale; older imports use their existing `scaleId` when the new field is absent. Active-tool Reset preserves globally shared display, audio, language, and recording state; restoring Circle defaults still resets circle-only ring/diameter controls. Tests include translation parity, settings scope, MIDI sequence construction, and targeted source contracts. Browser and SVG/PNG export review are separate acceptance steps.
