# Changelog

## 2.0.0 — 2026-07-04

### Added
- **Company stamp designer** ("tampon de société"): round / oval / rectangular shapes, double or single borders, curved top & bottom text, star/dot separators, center lines, 5 ink colors, 3 typefaces, optional date line, transparent PNG export.
- **Realistic ink rendering**: deterministic ink-wear speckle, fibrous streaks, uneven-pressure blotches, directional fade and soft ink bleed, with a texture shuffle button and optional natural tilt at placement.
- Zoom controls for the document viewer (75%–250%).
- Delete key / "Remove selected" button to remove placed items.
- Dark mode (auto-detected, toggleable, persisted).
- English/French interface (auto-detected, toggleable, persisted).
- Signature, initials and stamp designs persisted in `localStorage`.
- Pen color and width controls; smooth quadratic-curve strokes; HiDPI-sharp pads; drawn signatures auto-cropped to their ink.
- Toast notifications, SRI integrity hashes on CDN scripts, ARIA roles, reduced-motion support.

### Changed
- **Lossless PDF export**: each item is embedded individually at full resolution with pdf-lib instead of flattening a rasterized overlay onto the page. Captions are drawn as real PDF text.
- Placements are stored in PDF points, making zoom and export exact; "initial every page" no longer re-renders every page.
- Output filename now derives from the source document (`<name>-signed.pdf`).
- IP address in captions is now **opt-in** (privacy); date/time caption is optional.

### Fixed
- Duplicate window-resize listeners and lost drawings on resize.
- Detached ArrayBuffer issues when re-saving (pdf.js worker buffer transfer).
- Re-selecting the same file in a file input not triggering a reload.
