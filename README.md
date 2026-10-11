# Harmonic Circle Explorer

**Version 0.4.0**

Harmonic Circle Explorer is a standalone interactive tool for generating circular diagrams of chord relationships around the circle of fifths. It was developed as a companion project to Accordion-Tools and is designed so that its harmonic engine and SVG renderer can later be integrated into Accordion-Tools.

The diagrams place a selectable reference chord family in the innermost ring. Successive outer rings contain a selected related chord family, grouped by the number of pitch classes each chord shares with the reference chord in the same sector. Chords with more common tones appear closer to the center.

## Main features

- Selectable **reference chord family** for the inner ring.
- Selectable **related chord family** for the outer rings.
- **All families (diatonic only)** mode combines every supported chord family in the same diagram while automatically restricting results to the selected parent scale/mode. The exact reference chord is not duplicated in the outer rings because it is already visible in the inner ring.
- Parent **scale or mode** used to determine which related chords are diatonic in each sector.
- **Ionian (major)** as the default parent scale/mode.
- Show **all relationships** or **diatonic relationships only**.
- When all relationships are shown, optionally **highlight diatonic chords**.
- Optional display of **enharmonic equivalents**; pitch-class duplicates are suppressed by default.
- Independent **outer-ring visibility controls** for every available shared-note count. Positive-overlap rings are on by default; the 0-shared-notes ring is off by default.
- Optional radial **segment separator lines**.
- Optional **legend**, with consistent two-column row alignment.
- Rich **chord tooltips** on hover showing chord family, chord tones, highlighted common tones, Roman numeral relative to the parent scale/mode, diatonic status, and voice-leading information.
- Optional generated **explanation box** for the current visualization, including notes about relationship rings removed by the diatonic filter.
- Adjustable **circle diameter** and **maximum font size**.
- Adaptive dense-sector layout: All-families diagrams use wider high-density bands and geometry-aware multi-column placement. Side sectors automatically transpose their text grid so horizontal chord labels do not collide before font size is reduced.
- Click any related chord to **compare it with the sector reference chord**; the selected pair and their shared tones appear in the center of the circle.
- Optional **chord-family color highlighting** while preserving a monochrome default.
- **Voice-leading analysis** in related-chord tooltips based on holding exact common tones and minimizing total semitone motion of the remaining paired voices.
- Click any chord to hear it as a **block chord** or **arpeggio**, with either root-position or smooth voice-led playback.
- Export the current diagram as **SVG** or **PNG**.
- Presets for minor seventh, major seventh, dominant seventh, and diminished seventh diagrams with major triads as the reference family.

## Included chord families

The first release includes major, minor, diminished, augmented, suspended, sixth, and several seventh-chord families, including major seventh, dominant seventh, minor seventh, minor-major seventh, half-diminished seventh, diminished seventh, augmented seventh, and augmented-major seventh.

## Included parent scales and modes

The first release includes the seven diatonic modes (Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, and Locrian), harmonic minor, melodic minor, harmonic major, major and minor pentatonic, and whole-tone scales.

Diatonic membership is always evaluated **relative to the selected parent scale or mode using the root of each circle-of-fifths sector as the tonic**. The outer rings still contain chords, never scales or modes.

## Running locally

Requires a current Node.js installation.

```bash
npm install
npm run dev
```

Vite will print a local URL, normally `http://localhost:5173/`.

To verify the production build:

```bash
npm test
npm run build
npm run preview
```

## GitHub Pages

A GitHub Actions workflow is included in `.github/workflows/deploy.yml`. It installs dependencies, runs the harmonic-engine test suite, builds the Vite application, and deploys `dist/` to GitHub Pages. The Vite base path is relative (`./`), so the app is not tied to a specific repository name.

## How the diagram is constructed

For each of the twelve circle-of-fifths sectors:

1. The selected reference chord is constructed from the sector root.
2. All twelve roots of the selected related chord family are generated. In **All families** mode, this is repeated for every supported family.
3. The pitch-class intersection between the reference chord and each related chord is counted.
4. Candidates are assigned to rings by shared-note count, highest count nearest the center.
5. Each available outer ring can be shown or hidden independently. Positive-overlap rings are visible by default; the 0-shared-notes ring starts hidden.
6. If **Diatonic only** is enabled, a related chord is retained only when all of its pitch classes belong to the selected parent scale/mode for that sector. **All families** mode always applies this rule, even if the ordinary diatonic-only setting was previously off.
7. If **Highlight diatonic** is enabled while all chords are shown, diatonic labels are drawn in blue (or bold/underlined when chord-family colors are active).

Enharmonic spellings affect labels only; the relationship engine works with pitch classes and does not duplicate enharmonically equivalent chords.

## Audio

Audio is triggered only by clicking a chord label. The standalone version uses a lightweight Web Audio synthesizer. Root-position playback preserves the original behavior. **Smooth voice leading** plays the sector reference chord first and then the related chord in its minimum-motion voicing; in block mode, exact common tones are sustained across the change where possible. The harmonic engine itself remains pitch-class based and does not depend on octave placement, which is important for later Stradella integration. The playback layer is intentionally isolated so Accordion-Tools audio resources can be substituted later.

## Documentation

See [docs/USER_GUIDE.md](docs/USER_GUIDE.md) for usage details and [docs/TECHNICAL_NOTES.md](docs/TECHNICAL_NOTES.md) for the data model and integration notes.

## Versioning

The current standalone version is **0.4.0**. See [VERSION_HISTORY.md](VERSION_HISTORY.md).

## License

This project uses the same CC BY-NC 4.0 license file currently used by Accordion-Tools. See `LICENSE` for the complete terms.
