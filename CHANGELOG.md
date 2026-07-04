# Changelog

## 2.3.0 — 2026-07-04

### Added
- **Support & share modal**: shown once per session after a successful export (never blocks the download) and openable anytime from the footer — star/contribute on GitHub, follow on X/LinkedIn, share to X/LinkedIn/Reddit/Email, copy-link button.
- **Bros AI footer** with social links (bros.ai, GitHub, X, LinkedIn).
- **SEO**: full meta description/keywords, canonical URL, Open Graph + Twitter cards with a generated `assets/og-image.png`, JSON-LD WebApplication structured data, `robots.txt` and `sitemap.xml`.

## 2.2.0 — 2026-07-04

### Added
- **Upload editor with background removal**: uploaded signature/initials scans open in an editor with a transparency-checkerboard preview and two gauges — *Background removal* (soft-edged luminance cutoff that makes the paper transparent) and *Ink intensity* (alpha boost + darkening for faint pens) — plus a Reset button. The original image and gauge settings are persisted, so the edit can be adjusted after a reload.

## 2.1.0 — 2026-07-04

### Added
- **Country stamp styles**: 11 authentic presets — France, Belgique, Suisse, Deutschland, United Kingdom, United States, España, Italia, India, plus two dedicated renderers: the Chinese star-center company chop (公章) and the Japanese square hanko with vertical right-to-left character columns.
- Selecting a country fills shape, border, ink color, font, separators and template text; picking a shape manually switches back to Custom.

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
