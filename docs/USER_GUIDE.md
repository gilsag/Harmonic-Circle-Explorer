# Harmonic Circle Explorer — User Guide

Version 0.4.0

## Purpose

Harmonic Circle Explorer creates circular diagrams that make common-tone relationships between chord families visible. The twelve sectors follow the circle of fifths. Each sector has its own reference chord, and the related chords in that sector are grouped according to how many pitch classes they share with that reference chord.

## Harmony controls

### Reference family

The reference family occupies the innermost labeled ring. The default is **Major triad**, but any included chord family can be used. The twelve reference roots are arranged around the circle of fifths.

### Related chord family

This is the chord family placed in the outer relationship rings. The program tests that family at all twelve chromatic roots and sorts the resulting chords by common-tone count.

Choose **All families (diatonic only)** to combine every supported chord family in the same diagram. This mode is intentionally restricted to diatonic chords to prevent the outer rings from becoming overwhelmingly dense. The diatonic-only checkbox is therefore locked on while this mode is active. The exact reference chord itself is not repeated in the outer rings because it is already present in the inner ring.

### Parent scale / mode

The selected scale or mode determines diatonic membership. **Ionian (Major)** is the default.

The parent is transposed separately for every sector. For example, with Ionian selected, the C sector evaluates diatonic chords against C major, the G sector against G major, the D sector against D major, and so forth.

The parent scale or mode does not itself appear in an outer ring. Outer rings always contain chords.

## Diatonic options

**Show only diatonic chords** removes every related chord whose pitch classes are not entirely contained in the selected parent scale/mode.

**Highlight diatonic chords when showing all** leaves all relationships visible but draws diatonic chord labels in blue. This makes it possible to compare diatonic and non-diatonic relationships in the same diagram.

In **All families** mode, every displayed outer-ring chord is diatonic by definition, so highlighting is unnecessary and disabled.

A fully diminished seventh chord, for example, produces no diatonic relationships when Ionian is selected because no complete diminished-seventh pitch set is contained in a major scale.

## Ring meaning

The innermost labeled ring is the reference family. Outer rings are generated dynamically from the available common-tone counts. A related chord sharing more pitch classes with the reference chord is closer to the center.

Rings with no relationships under the current filter are omitted. Every available relationship ring can also be shown or hidden independently in **Diagram → Outer rings**. Positive-overlap rings are visible by default; the 0-shared-notes ring is off by default. Hiding a ring is purely a display choice and does not change the underlying harmonic search.

## Enharmonic equivalents

Enharmonic duplicates are suppressed by default: a pitch-class chord appears only once. The program selects a practical sharp or flat spelling based on the circle-of-fifths sector.

When **Show enharmonic equivalents** is enabled, common alternative spellings are displayed together, for example `F♯m7/G♭m7`. This changes the label, not the underlying harmonic relationship.

## Diagram appearance

- **Outer rings** provides a checkbox for each shared-note count currently available. Any ring can be hidden or restored independently. The 0-shared-notes ring is off by default; the other available rings are on by default.
- **Segment separator lines** controls the radial lines between circle-of-fifths sectors. Circular ring boundaries remain visible.
- **Show legend** adds a right-side explanation of the reference ring and each relationship ring. The legend uses fixed description alignment so multi-line rows remain visually consistent.
- **Show chord-tone tooltips** displays a rich tooltip with the exact chord family, chord tones, Roman numeral, and diatonic status. For related chords, tones shared with the sector reference chord are highlighted.
- Related-chord tooltips always include a compact **voice-leading** summary. Exact common tones are held first; remaining voices are paired to minimize semitone motion. Added or removed tones are reported separately rather than assigned an arbitrary movement cost.
- **Color labels by chord family** assigns a consistent color to each supported family. The monochrome layout remains the default. If diatonic highlighting is also active, diatonic labels become bold/underlined so the two encodings do not compete.
- **Show explanation box** adds a short generated text box describing the current visualization. It is off by default. When the diatonic filter removes a common-tone class that otherwise exists, the explanation identifies the missing ring.
- **Circle diameter** changes the physical diameter of the circle while preserving its proportions.
- **Maximum font size** controls the preferred text size. In single-family diagrams crowded sectors may reduce their local font size. In **All families** mode, dense rings first receive extra radial space and labels are distributed using a geometry-aware grid. The grid changes orientation around the circle so side sectors remain readable; font reduction is used only after those layout measures.

## Interactive comparison

Clicking a related chord selects it for comparison with the reference chord in the same circle-of-fifths sector. The two labels are emphasized and the center of the circle shows the selected pair, its Roman numeral, and the common tones. The center also shows the minimum semitone motion. Clicking a reference chord or the diagram background clears the comparison. This transient selection is intentionally excluded from SVG/PNG exports.

## Audio

Select either **Block chord** or **Arpeggio**. The **Voicing** control offers **Root position** or **Smooth voice leading**. Smooth voice leading makes the comparison audible: it plays the reference chord first and then the related chord in the closest available voicing. In block playback, exact common tones are sustained through the transition where possible. Hovering never triggers audio.

The audio in v0.4.0 is a lightweight synthesizer intended for harmonic identification rather than realistic accordion emulation. In All families mode, each label still retains its own chord-family identity for playback and tooltips.

## Export

Choose SVG or PNG in the top toolbar and select **Download**.

- **SVG** is recommended for editing, publication, and lossless scaling.
- **PNG** is rendered at high resolution for convenient insertion into documents and presentations.

The exported image reflects persistent diagram settings, including legend, explanation box, separator lines, diatonic highlighting, chord-family colors, diameter, and font size. Hover tooltips and transient click-selection emphasis are interactive UI aids and are removed from exported images.
