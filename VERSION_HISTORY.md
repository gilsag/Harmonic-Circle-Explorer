# Version History

## v0.4.0 — Interactive harmonic comparison and voice leading

- Replaced plain browser chord tooltips with rich tooltips showing family, chord tones, highlighted common tones, Roman numeral, and diatonic status.
- Added pitch-class **voice-leading analysis** to related-chord tooltips: exact common tones are held, remaining voices are matched for minimum semitone motion, and added/removed tones are reported separately.
- Added click-to-compare behavior between an outer chord and its sector reference chord, with shared tones shown in the center of the circle.
- Added optional **chord-family color highlighting**; when combined with diatonic highlighting, diatonic labels use weight/underline instead of competing color encodings.
- Added **Smooth voice leading** as an audio option for both block and arpeggiated playback; it now previews the reference-to-related-chord transition directly, sustaining exact common tones in block mode where possible.
- Added Roman-numeral information relative to the selected parent scale/mode. Chromatic roots are identified explicitly rather than assigned speculative accidentals.
- Excluded transient hover/selection overlays from SVG and PNG exports.
- Added regression checks for Roman numerals and minimum-motion voice-leading examples.
- Updated README, user guide, technical notes, and version metadata.

## v0.3.0 — All diatonic chord families

- Added **All families (diatonic only)** to the Related chord family selector.
- Aggregate diagrams now combine every supported chord family while grouping chords by shared-note count with the selected reference family.
- Improved **All families** readability with density-aware ring widths and geometry-aware multi-column label placement. Side sectors transpose the local grid to prevent horizontal chord labels from overlapping.
- Generalized outer-ring controls so **every available shared-note ring can be shown or hidden independently**. Positive-overlap rings remain on by default, while the 0-shared-notes ring remains off by default.
- All-families mode automatically enforces the selected parent scale/mode and disables non-diatonic display/highlighting controls.
- Preserved concrete chord-family identity for labels, audio playback, tooltips, and sorting inside aggregate diagrams.
- Avoided repeating the exact reference chord in the outer rings; it remains represented by the inner ring.
- Updated legend and generated explanation text for aggregate diagrams.
- Added regression tests confirming that All families mode remains diatonic-only even when called with the ordinary filter disabled.
- Updated README, user guide, technical notes, and version metadata.

## v0.2.0 — Tooltips, legend refinement, and visualization explanations

- Added an option to show chord-tone tooltips for reference and related chords.
- Reworked legend rows to use consistent description alignment and remove the awkward line jump in multi-line entries.
- Removed the enharmonic-display caveat from the legend; enharmonic behavior remains documented in the controls and user guide.
- Added an optional generated explanation box, off by default.
- Added specific explanation text when the diatonic filter causes an otherwise possible shared-note ring to disappear.
- Included the explanation box in SVG and PNG exports when enabled.
- Added explanation-generation tests and updated the standalone documentation.

## v0.1.0 — Initial standalone release

- Added interactive circle-of-fifths harmonic relationship diagrams.
- Added selectable reference chord family for the inner ring.
- Added selectable related chord family for outer rings.
- Added dynamic grouping by number of shared pitch classes.
- Added parent scale/mode selection with Ionian (Major) as the default.
- Added diatonic-only filtering relative to the selected parent scale/mode in each sector.
- Added optional diatonic highlighting when all relationships are displayed.
- Added optional enharmonic-equivalent labels while suppressing pitch-class duplicates by default.
- Added optional segment separator lines and legend.
- Added adjustable circle diameter and maximum font size with local text fitting.
- Added click-to-play block chord and arpeggio playback.
- Added SVG and PNG export.
- Added common seventh-diagram presets.
- Added README, user guide, technical documentation, tests, and GitHub Pages workflow.
