// SignPDF — Company stamp designer ("tampon de société").
// Renders a realistic rubber-stamp impression on a transparent canvas:
// curved text on round/oval stamps, double borders, star separators,
// ink-wear speckle, uneven pressure blotches and a soft ink bleed.
//
// Exposed global: StampDesigner { init(), getConfig(), getImage(), onSave(cb) }

(function () {
    'use strict';

    // ---------------------------------------------------------------- utils

    // Deterministic RNG so a given (config, seed) always renders the same texture.
    const mulberry32 = (a) => () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const FONTS = {
        sans: '"Arial Narrow", Arial, Helvetica, sans-serif',
        serif: 'Georgia, "Times New Roman", serif',
        mono: '"Courier New", Courier, monospace'
    };

    const font = (cfg, size, bold) =>
        `${bold ? 'bold ' : ''}${size}px ${FONTS[cfg.font] || FONTS.sans}`;

    // Shrink a font size until `text` fits within maxWidth.
    const fitFontSize = (ctx, cfg, text, startSize, maxWidth, bold) => {
        let size = startSize;
        while (size > 10) {
            ctx.font = font(cfg, size, bold);
            if (ctx.measureText(text).width <= maxWidth) break;
            size -= 2;
        }
        return size;
    };

    // ------------------------------------------------------------ arc text

    // Angular width consumed by a chunk of text at parametric angle `theta`
    // on an ellipse (rx, ry): d(theta) ≈ width / local arc-length derivative.
    const angularStep = (width, theta, rx, ry) => {
        const ds = Math.sqrt(
            Math.pow(rx * Math.sin(theta), 2) + Math.pow(ry * Math.cos(theta), 2)
        );
        return width / Math.max(ds, 1);
    };

    // Draw text along the top or bottom of an ellipse, centered on centerTheta.
    // flip=false → letters upright along the top arc (reads left to right);
    // flip=true  → letters upright along the bottom arc.
    const drawEllipseText = (ctx, cfg, text, cx, cy, rx, ry, centerTheta, size, flip) => {
        if (!text) return;
        ctx.font = font(cfg, size, true);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const chars = [...text];
        const widths = chars.map(c => ctx.measureText(c).width);
        const tracking = size * 0.14; // letter spacing typical of stamps

        // Dry run: total angular span (walk from centerTheta symmetrically).
        let span = 0;
        let theta = centerTheta;
        for (let i = 0; i < chars.length; i++) {
            const step = angularStep(widths[i] + tracking, theta, rx, ry);
            span += step;
            theta = flip ? theta - step : theta + step;
        }

        // Walk again, starting half a span before the center.
        theta = flip ? centerTheta + span / 2 : centerTheta - span / 2;
        for (let i = 0; i < chars.length; i++) {
            const step = angularStep(widths[i] + tracking, theta, rx, ry);
            const mid = flip ? theta - step / 2 : theta + step / 2;

            const x = cx + rx * Math.cos(mid);
            const y = cy + ry * Math.sin(mid);
            // Outward normal of the ellipse at parameter `mid`.
            const normal = Math.atan2(Math.sin(mid) / ry, Math.cos(mid) / rx);

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(normal + (flip ? -Math.PI / 2 : Math.PI / 2));
            ctx.fillText(chars[i], 0, 0);
            ctx.restore();

            theta = flip ? theta - step : theta + step;
        }
    };

    // Angular span of a text at a given size (used to keep arcs inside limits).
    const measureSpan = (ctx, cfg, text, rx, ry, centerTheta, size) => {
        ctx.font = font(cfg, size, true);
        const tracking = size * 0.14;
        let span = 0;
        let theta = centerTheta;
        for (const c of [...text]) {
            const step = angularStep(ctx.measureText(c).width + tracking, theta, rx, ry);
            span += step;
            theta += step;
        }
        return span;
    };

    const fitArcFontSize = (ctx, cfg, text, rx, ry, centerTheta, startSize, maxSpan) => {
        let size = startSize;
        while (size > 12) {
            if (measureSpan(ctx, cfg, text, rx, ry, centerTheta, size) <= maxSpan) break;
            size -= 2;
        }
        return size;
    };

    // ------------------------------------------------------- realism pass

    // Erode the ink like a real rubber stamp: speckle, fibrous streaks and
    // larger low-pressure blotches, all cut out of the drawn ink.
    const applyWear = (canvas, cfg, rng) => {
        const ctx = canvas.getContext('2d');
        const { width: W, height: H } = canvas;
        const wear = cfg.wear / 100;
        const pressure = cfg.pressure / 100;

        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';

        // 1. Fine speckle — paper grain breaking the ink film.
        const speckles = Math.floor(wear * W * H / 900);
        for (let i = 0; i < speckles; i++) {
            ctx.globalAlpha = 0.35 + rng() * 0.65;
            const s = 1 + rng() * 2.6;
            ctx.fillRect(rng() * W, rng() * H, s, s);
        }

        // 2. Short fibrous streaks.
        const streaks = Math.floor(wear * 90);
        ctx.lineCap = 'round';
        for (let i = 0; i < streaks; i++) {
            ctx.globalAlpha = 0.25 + rng() * 0.45;
            ctx.lineWidth = 0.8 + rng() * 1.6;
            const x = rng() * W, y = rng() * H;
            const a = rng() * Math.PI, l = 3 + rng() * 14;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
            ctx.stroke();
        }

        // 3. Uneven pressure — a few soft blotches where the stamp pressed lightly.
        const blobs = 2 + Math.round(pressure * 4);
        for (let i = 0; i < blobs; i++) {
            const x = rng() * W, y = rng() * H;
            const r = (0.10 + rng() * 0.16) * Math.max(W, H);
            const peak = pressure * (0.25 + rng() * 0.45);
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, `rgba(0,0,0,${peak})`);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.globalAlpha = 1;
            ctx.fillStyle = g;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }

        // 4. Gentle directional fade — the hand never presses perfectly flat.
        if (pressure > 0.05) {
            const a = rng() * Math.PI * 2;
            const g = ctx.createLinearGradient(
                W / 2 + Math.cos(a) * W / 2, H / 2 + Math.sin(a) * H / 2,
                W / 2 - Math.cos(a) * W / 2, H / 2 - Math.sin(a) * H / 2
            );
            g.addColorStop(0, `rgba(0,0,0,${0.22 * pressure})`);
            g.addColorStop(0.5, 'rgba(0,0,0,0)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
        }

        ctx.restore();
    };

    // -------------------------------------------------------- shape layers

    const drawSeparators = (ctx, cfg, cx, cy, rx, ry, size) => {
        if (cfg.separator === 'none') return;
        const glyph = cfg.separator === 'dot' ? '●' : '★';
        ctx.font = font(cfg, size, false);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        [Math.PI, 0].forEach(theta => {
            ctx.fillText(glyph, cx + rx * Math.cos(theta), cy + ry * Math.sin(theta));
        });
    };

    const drawCenterLines = (ctx, cfg, lines, cx, cy, maxWidth, baseSize) => {
        if (!lines.length) return;
        // Fit each line, first line slightly larger/bold.
        const specs = lines.map((text, i) => {
            const bold = i === 0 || text.startsWith('**');
            const clean = text.replace(/^\*\*/, '');
            const start = i === 0 ? baseSize * 1.15 : baseSize;
            const size = fitFontSize(ctx, cfg, clean, start, maxWidth, bold);
            return { text: clean, size, bold };
        });
        const lineGap = 1.32;
        const total = specs.reduce((s, l) => s + l.size * lineGap, 0);
        let y = cy - total / 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        specs.forEach(l => {
            y += (l.size * lineGap) / 2;
            ctx.font = font(cfg, l.size, l.bold);
            ctx.fillText(l.text, cx, y);
            y += (l.size * lineGap) / 2;
        });
    };

    const centerLinesOf = (cfg) => {
        const lines = cfg.lines.slice(0, 6);
        if (cfg.showDate) {
            const locale = (window.I18N && I18N.lang === 'fr') ? 'fr-FR' : 'en-GB';
            const date = new Date().toLocaleDateString(locale, {
                day: '2-digit', month: 'short', year: 'numeric'
            }).toUpperCase().replace(/\./g, '');
            lines.splice(Math.min(1, lines.length), 0, '**' + date);
        }
        return lines;
    };

    const drawRoundOrOval = (ctx, cfg, W, H) => {
        const cx = W / 2, cy = H / 2;
        const rx = W / 2 - 14, ry = H / 2 - 14;
        const stroke = 9;

        // Borders
        ctx.strokeStyle = cfg.color;
        ctx.lineWidth = stroke;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (cfg.border === 'double') {
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx - 15, ry - 15, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Text ring radius (between border and inner circle)
        const trx = rx - 52, try_ = ry - 52;
        const maxSpan = Math.PI * 0.82;

        ctx.fillStyle = cfg.color;
        if (cfg.topText) {
            const size = fitArcFontSize(ctx, cfg, cfg.topText, trx, try_, -Math.PI / 2, 54, maxSpan);
            drawEllipseText(ctx, cfg, cfg.topText, cx, cy, trx, try_, -Math.PI / 2, size, false);
        }
        if (cfg.bottomText) {
            const size = fitArcFontSize(ctx, cfg, cfg.bottomText, trx, try_, Math.PI / 2, 46, maxSpan);
            drawEllipseText(ctx, cfg, cfg.bottomText, cx, cy, trx, try_, Math.PI / 2, size, true);
        }
        drawSeparators(ctx, cfg, cx, cy, trx, try_, 34);

        // Inner circle separating the arcs from the center block.
        const irx = rx - 96, iry = ry - 96;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(cx, cy, irx, iry, 0, 0, Math.PI * 2);
        ctx.stroke();

        drawCenterLines(ctx, cfg, centerLinesOf(cfg), cx, cy, irx * 2 * 0.86, 36);
    };

    const drawRect = (ctx, cfg, W, H) => {
        const pad = 14, r = 22;
        ctx.strokeStyle = cfg.color;
        ctx.lineWidth = 9;
        roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, r);
        ctx.stroke();
        if (cfg.border === 'double') {
            ctx.lineWidth = 3.5;
            roundRect(ctx, pad + 15, pad + 15, W - (pad + 15) * 2, H - (pad + 15) * 2, r - 8);
            ctx.stroke();
        }

        // Rectangular stamps read as a block: top text = heading,
        // then center lines, then bottom text.
        const lines = [];
        if (cfg.topText) lines.push(cfg.topText);
        lines.push(...centerLinesOf(cfg));
        if (cfg.bottomText) lines.push(cfg.bottomText);

        ctx.fillStyle = cfg.color;
        drawCenterLines(ctx, cfg, lines, W / 2, H / 2, W - 110, 42);
    };

    const roundRect = (ctx, x, y, w, h, r) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    };

    // ------------------------------------------------------------- render

    const CANVAS_SIZE = {
        round: [760, 760],
        oval: [980, 660],
        rect: [980, 560]
    };

    const render = (cfg) => {
        const [W, H] = CANVAS_SIZE[cfg.shape] || CANVAS_SIZE.round;

        // Draw the crisp artwork on its own layer.
        const art = document.createElement('canvas');
        art.width = W; art.height = H;
        const actx = art.getContext('2d');
        if (cfg.shape === 'rect') drawRect(actx, cfg, W, H);
        else drawRoundOrOval(actx, cfg, W, H);

        // Realism pass (deterministic per seed).
        applyWear(art, cfg, mulberry32(cfg.seed));

        // Composite with a subtle ink bleed (soft edges) onto the final canvas.
        const out = document.createElement('canvas');
        out.width = W; out.height = H;
        const octx = out.getContext('2d');
        try { octx.filter = 'blur(1.1px)'; } catch (e) { /* older engines */ }
        octx.globalAlpha = 0.96;
        octx.drawImage(art, 0, 0);
        octx.filter = 'none';
        octx.globalAlpha = 1;
        return out;
    };

    // ----------------------------------------------------------- designer

    const state = {
        cfg: null,
        seed: 12345,
        savedImage: null,   // dataURL of the last saved stamp
        savedCfg: null,
        saveCallbacks: []
    };

    const readConfig = () => {
        const shapeBtn = document.querySelector('#stampShape .seg-btn.active');
        const colorBtn = document.querySelector('#stampColors .swatch.active');
        return {
            shape: shapeBtn ? shapeBtn.dataset.value : 'round',
            topText: document.getElementById('stampTop').value.trim().toUpperCase(),
            bottomText: document.getElementById('stampBottom').value.trim().toUpperCase(),
            lines: document.getElementById('stampLines').value
                .split('\n').map(s => s.trim()).filter(Boolean),
            color: colorBtn ? colorBtn.dataset.color : '#2f4e9e',
            font: document.getElementById('stampFont').value,
            border: document.getElementById('stampBorder').value,
            separator: document.getElementById('stampSeparator').value,
            wear: Number(document.getElementById('stampWear').value),
            pressure: Number(document.getElementById('stampPressure').value),
            showDate: document.getElementById('stampShowDate').checked,
            tilt: document.getElementById('stampTilt').checked,
            seed: state.seed
        };
    };

    let previewTimer = null;
    const schedulePreview = () => {
        clearTimeout(previewTimer);
        previewTimer = setTimeout(updatePreview, 120);
    };

    const updatePreview = () => {
        state.cfg = readConfig();
        const canvas = render(state.cfg);
        const preview = document.getElementById('stampPreview');
        preview.width = canvas.width;
        preview.height = canvas.height;
        preview.getContext('2d').drawImage(canvas, 0, 0);
        // Display at quarter resolution — the extra pixels keep the PDF crisp.
        preview.style.width = Math.round(canvas.width / 3.2) + 'px';
        preview.style.height = Math.round(canvas.height / 3.2) + 'px';
    };

    const init = () => {
        // Segmented shape control
        document.querySelectorAll('#stampShape .seg-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#stampShape .seg-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                schedulePreview();
            });
        });
        // Ink swatches
        document.querySelectorAll('#stampColors .swatch').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#stampColors .swatch').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                schedulePreview();
            });
        });
        // Text & option inputs
        ['stampTop', 'stampBottom', 'stampLines', 'stampFont', 'stampBorder',
            'stampSeparator', 'stampWear', 'stampPressure', 'stampShowDate']
            .forEach(id => {
                const el = document.getElementById(id);
                el.addEventListener('input', schedulePreview);
                el.addEventListener('change', schedulePreview);
            });

        document.getElementById('stampShuffle').addEventListener('click', () => {
            state.seed = (state.seed * 1103515245 + 12345) >>> 0;
            updatePreview();
        });

        document.getElementById('stampDownload').addEventListener('click', () => {
            const cfg = readConfig();
            const url = render(cfg).toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = 'stamp.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });

        document.getElementById('stampUse').addEventListener('click', () => {
            const cfg = readConfig();
            state.savedImage = render(cfg).toDataURL('image/png');
            state.savedCfg = cfg;
            try {
                localStorage.setItem('signpdf.stamp.cfg', JSON.stringify(cfg));
            } catch (e) { /* storage full/blocked — stamp still usable this session */ }
            state.saveCallbacks.forEach(cb => cb(state.savedImage, cfg));
        });

        // Restore last saved stamp configuration.
        try {
            const saved = JSON.parse(localStorage.getItem('signpdf.stamp.cfg'));
            if (saved) {
                document.getElementById('stampTop').value = saved.topText || '';
                document.getElementById('stampBottom').value = saved.bottomText || '';
                document.getElementById('stampLines').value = (saved.lines || []).join('\n');
                document.getElementById('stampFont').value = saved.font || 'sans';
                document.getElementById('stampBorder').value = saved.border || 'double';
                document.getElementById('stampSeparator').value = saved.separator || 'star';
                document.getElementById('stampWear').value = saved.wear ?? 35;
                document.getElementById('stampPressure').value = saved.pressure ?? 40;
                document.getElementById('stampShowDate').checked = !!saved.showDate;
                document.getElementById('stampTilt').checked = saved.tilt !== false;
                state.seed = saved.seed || state.seed;
                document.querySelectorAll('#stampShape .seg-btn').forEach(b =>
                    b.classList.toggle('active', b.dataset.value === (saved.shape || 'round')));
                document.querySelectorAll('#stampColors .swatch').forEach(b =>
                    b.classList.toggle('active', b.dataset.color === (saved.color || '#2f4e9e')));
                state.savedImage = render(saved).toDataURL('image/png');
                state.savedCfg = saved;
            }
        } catch (e) { /* corrupt storage — start fresh */ }

        // Re-render preview when the language changes (date format).
        document.addEventListener('signpdf:langchange', schedulePreview);

        updatePreview();
    };

    window.StampDesigner = {
        init,
        render,
        getConfig: () => state.savedCfg || readConfig(),
        getImage: () => state.savedImage,
        onSave: (cb) => state.saveCallbacks.push(cb)
    };
})();
