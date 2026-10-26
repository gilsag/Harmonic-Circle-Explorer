# Harmonic Circle Explorer — User Guide

Version 0.6.1

## Purpose

Harmonic Circle Explorer creates circular diagrams that make common-tone relationships between chord families visible. The twelve sectors follow the circle of fifths. Each sector has its own reference chord, and the related chords in that sector are grouped according to how many pitch classes they share with that reference chord.

## Choose a harmony tool

Use the top navigation to select **Harmonic Circle**, **Harmonic Path Finder**, or **Chord Comparison**. The Tools panel changes to show controls for the selected tool; Settings and recording are shared. Switching tools does not discard the other tools' selections or recorded events.

### Harmonic Path Finder

Choose the starting chord, destination chord, and an exact number of transitions (2, 3, or 4). Select one intermediate chord family (all roots are eligible) or **All diatonic families**. The latter also requires a tonic and parent scale or mode; unlike the twelve-sector circle, this uses one fixed parent key/mode, saved independently from the circle’s parent mode. The endpoints may lie outside that scale. The tool returns up to five suggested simple paths, ranked by a weighted pitch-class distance, unmatched notes, and common-tone criterion. A result is not a functional harmonic analysis, proof of optimality, or an octave-specific voice-leading plan.

Select a suggested path to inspect its notes and interval movements in the exportable SVG. **Play path** auditions the sequence through the standalone synthesizer using the selected root-position or smooth voicing mode; **Add path to recording** appends its chords as recording events, whether or not live recording is on. A path with no eligible intermediates is reported as unavailable.

### Chord Comparison

Choose two chord roots and families. The comparison displays common pitch classes, tones exclusive to each chord, and minimum circular semitone movements between paired unmatched tones. Extra or missing notes are listed rather than inventing a movement for them. Click a chord in the visualization, use Play A / Play B to audition it, or Play A → B to hear a root-position or smooth-voice-leading transition, according to Settings → Playback. These are pitch-class relationships, not measured voicings.

The Download controls export the **active** tool's SVG/PNG. Language and visual settings remain shared; each tool's selections are retained while switching. Reset restores defaults only for the active tool and preserves recordings and shared preferences.

## Harmony controls

### Reference family

The reference family occupies the inner **chord** ring. When enabled, a smaller **note ring** of twelve individual pitch classes appears inside it. The default is **Major triad**, but any included chord family can be used. The twelve reference roots are arranged around the circle of fifths.

### Related chord family

This is the chord family placed in the outer relationship rings. The program tests that family at all twelve chromatic roots and sorts the resulting chords by common-tone count.

Choose **All families (diatonic only)** to combine every supported chord family in the same diagram. This mode is intentionally restricted to diatonic chords to prevent the outer rings from becoming overwhelmingly dense. The relationship-display selector is therefore locked to diatonic-only while this mode is active. The exact reference chord itself is not repeated in the outer rings because it is already present in the inner chord ring.

### Parent scale / mode

The selected scale or mode determines diatonic membership. **Ionian (Major)** is the default.

The parent is transposed separately for every sector. For example, with Ionian selected, the C sector evaluates diatonic chords against C major, the G sector against G major, the D sector against D major, and so forth.

The parent scale or mode does not itself appear in an outer ring. Outer rings always contain chords.

## Relationship display

Under **Tools → Harmonic context → Relationship display**, select **Show all chords**, **Show all, highlight diatonic**, or **Show only diatonic**. The latter removes related chords not fully contained in the sector’s selected parent scale/mode; highlighting keeps all chords visible and marks the diatonic ones. In **All families** mode, diatonic-only is mandatory. The three options preserve the existing diatonic filter and highlighting semantics.

## Ring meaning

The reference family appears in the inner chord ring. The optional innermost note ring shows one pitch class per sector and plays single notes. Outer rings are generated dynamically from the available common-tone counts. A related chord sharing more pitch classes with the reference chord is closer to the center.

Rings with no relationships under the current filter are omitted. Every available relationship ring can also be shown or hidden independently in **Settings → Diagram and rings → Outer rings**. Positive-overlap rings are visible by default; the 0-shared-notes ring is off by default. Hiding a ring is purely a display choice and does not change the underlying harmonic search.

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

The audio is a lightweight synthesizer intended for harmonic identification rather than realistic accordion emulation. In All families mode, each label still retains its own chord-family identity for playback and tooltips.

## Export

Choose SVG or PNG in the top toolbar and select **Download**.

- **SVG** is recommended for editing, publication, and lossless scaling.
- **PNG** is rendered at high resolution for convenient insertion into documents and presentations.

The exported image reflects persistent diagram settings, including legend, explanation box, separator lines, diatonic highlighting, chord-family colors, diameter, and font size. Hover tooltips and transient click-selection emphasis are interactive UI aids and are removed from exported images.

## Inner note ring

**Show inner note ring** is on by default. The twelve labels represent pitch classes, not instrument-specific note octaves. Click a note label to play an individual synthesized note (nominally in octave 4). Turning the ring off removes its geometry and its legend/explanation entry; the chord relationships stay unchanged. Note clicks can be recorded alongside chord events.

## Recording and notation

Open **Recording and notation**, select **Start recording**, then click reference chords, related chords, or note-ring labels in sequence. Repeated events are retained. **Stop recording** ends capture; **Play recording** schedules the events through the standalone synthesizer. **Clear recording** removes the sequence.

The staff preview uses `abcjs`. Download the sequence as **ABC** (editable text notation) or download the rendered staff as **SVG**. Chord symbols retain their identities, while the staff uses nominal root-position chord pitches and C4-based note events; it does not encode measured instrument pitches or the smooth voice-leading playback voicing. There is no audio-file export.

## Interface language and chord labels

Choose **Automatic (browser)** or a language under **Settings**: English, Spanish, French, Brazilian Portuguese, Italian or German. Unsupported browser languages fall back to English. The language preference persists in local browser storage; musical identifiers, pitch classes, and filenames remain language-independent.

The **Chord symbols** control offers **Compact** (e.g. `C`), **Letter-based** (`CM`) and **Word-based** (`C Major triad`, localized) display. It changes labels, not harmonic analysis. Long word-based names may require smaller fitted text in dense rings.

## Configuration files and reset

**Save settings JSON** exports the chord families, scale, filters, ring visibility, appearance, sound, format, language preference and chord-symbol style. **Load settings JSON** restores supported values from a versioned configuration object. The toolbar **Reset** menu offers **Restore tool defaults** (the active tool’s harmonic configuration and, for Harmonic Circle, ring/diameter controls, preserving shared appearance, recording, language, audio-playback preferences and download format) and **Clear recording** (confirmation required, removes recorded events). Settings files do not contain the recorded sequence.

## Diagram export details

The current SVG or PNG export includes the optional note ring, configured chord-symbol style, legend and explanation. Click selections and hover tooltips remain excluded. Notation SVG is a separate download generated from the recorded sequence.

## Workspace navigation

The upper toolbar identifies the current **Harmonic Circle** tool. Future harmonic tools can join this navigation when implemented; no inactive tool buttons are shown. **Tools** opens tool-specific harmonic controls and the recording/notation section. For Harmonic Circle, Relationship display follows the chord families and parent scale in Harmonic context. **Settings** opens shared appearance and audio playback, language, configuration import/export, and the circle-only Diagram and rings section. Tooltips appear beside the relevant label or section title. **Focus** hides the sidebar; selecting Tools or Settings reveals it again.

**Start/Stop recording** stays in the toolbar, alongside the recorded event count, even when the sidebar is hidden. Notation playback/export remains under Tools → Recording and notation. On narrow screens, Tools and Settings appear in an overlay rather than pushing the visualization below the entire sidebar. The diagram summary now appears immediately below the toolbar.

## Shared settings in Path Finder and Chord Comparison

Settings → Appearance controls chord symbols, enharmonic label alternatives, font size, family colors, and hover chord-tone tooltips in each of the three tools. Family coloring uses neutral labels and card borders when disabled; fonts scale within layout-specific limits to avoid overflowing SVG labels. Circle-specific separators, note and relationship rings, legend, explanation and diameter appear only while Harmonic Circle is selected. The circle-only settings remain saved when another tool is active.

Settings → Playback controls block/arpeggio and root/smooth voicing in all tools. For a path, smooth playback follows the chosen path step-by-step, using the preceding sounding chord as the reference for the next voicing. In Chord Comparison, Play A sounds the first chord in root position; Play B uses A as a reference in Smooth mode. Play A → B follows the voicing selector. Individual note events reset the chord-to-chord voice-leading chain in a recorded sequence. These approximate sounding MIDI arrangements are separate from the pitch-class movement reported by the analysis and from root-position notation in exported ABC.
