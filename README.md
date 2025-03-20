# SignPDF

> Simple PDF signing tool for everyone. No accounts needed.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## About

SignPDF lets you easily sign PDF documents right in your browser. No installation, no accounts, no complexity.


## Features

- Draw or upload your signature
- Save signatures for reuse
- Add initials to documents
- Works with multi-page PDFs
- Everything stays in your browser - no data uploaded to servers

## Quick Start

1. Open `index.html` in your browser
2. Create your signature (draw or upload)
3. Upload a PDF document
4. Place your signature on the document
5. Download the signed PDF

## How It Works

```mermaid
graph LR
    A[Create Signature] --> B[Upload PDF]
    B --> C[Place Signature]
    C --> D[Download]
```

## Usage

### Create Your Signature

Draw a signature using the pad or upload an image file. Customize with different colors and pen sizes.

### Sign Documents

After uploading a PDF, you can:
- Add signatures to specific locations
- Add initials to pages
- Position everything exactly where you want it

### Download & Share

Get your signed document with one click - ready to email or submit.

## Browser Support

Works with all modern browsers:
- Chrome
- Firefox
- Safari
- Edge

## Development

This project uses:
- HTML/CSS/JavaScript
- PDF.js for rendering
- Fabric.js for the canvas
- PDF-Lib for document editing

## License

MIT License - see [LICENSE](LICENSE) file

---

Made with simplicity in mind. No fuss, just signing.
