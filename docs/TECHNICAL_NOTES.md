# Harmonic Circle Explorer — Technical Notes

Version 0.4.0

## Architecture

The standalone tool separates musical logic from rendering and audio:

- `src/music.ts` — chord families, scales/modes, circle-of-fifths roots, pitch-class calculations, diatonic tests, enharmonic labels, relationship generation, Roman numerals, family colors, and pitch-class voice-leading analysis.
- `src/components/HarmonicCircle.tsx` — SVG diagram renderer, legend layout, rich interactive tooltips, click-to-compare state, and optional explanation box.
- `src/explanation.ts` — pure generation of short visualization explanations, including detection of overlap rings removed by the diatonic filter.
- `src/audio.ts` — click-triggered block/arpeggio Web Audio playback with root-position and smooth voice-led voicing strategies.
- `src/download.ts` — SVG serialization and PNG raster export.
- `src/App.tsx` — controls, presets, state, and About dialog.

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
