// SignPDF v2 — main application.
//
// Architecture notes:
// - All placements (signatures, initials, stamps) are stored in PDF *points*
//   (scale-1 viewport units, y-down from the top-left of the page). The fabric
//   canvas only ever shows them multiplied by the current zoom, so zooming and
//   exporting are lossless.
// - Export embeds each PNG individually at its true resolution with pdf-lib
//   (no page flattening), so the output stays crisp and the original PDF
//   content is untouched.

(function () {
    'use strict';

    const t = (key, vars) => window.I18N.t(key, vars);

    // ------------------------------------------------------------ constants

    const ZOOMS = [0.75, 1, 1.25, 1.5, 2, 2.5];
    const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
    const MAX_PDF_BYTES = 60 * 1024 * 1024;
    const TARGET_HEIGHTS_PT = { signature: 60, paraf: 32, stampRound: 115, stampOval: 95, stampRect: 85, stampStarCenter: 115, stampHanko: 62 };
    const SELECTION_STYLE = { cornerColor: '#4361ee', cornerSize: 10, transparentCorners: false, borderColor: '#4361ee' };

    // ---------------------------------------------------------------- state

    const state = {
        signatureImage: null,
        parafImage: null,
        stampImage: null,
        stampCfg: null,

        pdfDocument: null,
        pdfBytes: null,          // pristine copy for pdf-lib
        pdfFileName: 'document',
        totalPages: 0,
        currentPage: 1,
        zoomIndex: 3,            // ZOOMS[3] === 1.5
        baseDims: {},            // pageNum -> {width, height} at scale 1 (PDF points)

        placements: {},          // pageNum -> [placement]
        fabricCanvas: null,
        ipAddress: null,
        rngSeed: 987654321
    };

    const Z = () => ZOOMS[state.zoomIndex];

    const rng = () => {
        state.rngSeed = (state.rngSeed * 1103515245 + 12345) % 2147483648;
        return state.rngSeed / 2147483648;
    };

    const $ = (id) => document.getElementById(id);

    // ---------------------------------------------------------------- toast

    const toast = (message, type = 'info') => {
        const stack = $('toastStack');
        const el = document.createElement('div');
        el.className = `toast toast-${type}`;
        el.textContent = message;
        stack.appendChild(el);
        setTimeout(() => el.classList.add('toast-out'), 2800);
        setTimeout(() => el.remove(), 3300);
    };

    // ------------------------------------------------------- theme & lang

    const initChrome = () => {
        const savedTheme = localStorage.getItem('signpdf.theme')
            || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        setTheme(savedTheme);
        $('themeToggle').addEventListener('click', () =>
            setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
        $('langToggle').addEventListener('click', () =>
            I18N.setLang(I18N.lang === 'fr' ? 'en' : 'fr'));
        I18N.apply();
    };

    const setTheme = (theme) => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem('signpdf.theme', theme);
        $('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
    };

    // ---------------------------------------------------------------- tabs

    const initTabs = () => {
        const tabs = document.querySelectorAll('.signature-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(x => {
                    x.classList.toggle('active', x === tab);
                    x.setAttribute('aria-selected', x === tab ? 'true' : 'false');
                });
                document.querySelectorAll('.signature-tab-content').forEach(panel => {
                    const isActive = panel.id === tab.dataset.tab + '-tab';
                    panel.classList.toggle('active', isActive);
                    panel.hidden = !isActive;
                });
            });
        });
    };

    // -------------------------------------------------------- drawing pads

    // Smooth quadratic-curve pad with HiDPI support and content trimming.
    const createPad = (canvas, getColor, getWidth) => {
        const ctx = canvas.getContext('2d');
        let drawing = false;
        let points = [];
        let hasInk = false;

        const dpr = () => window.devicePixelRatio || 1;

        const resize = () => {
            const saved = hasInk ? canvas.toDataURL() : null;
            canvas.width = canvas.clientWidth * dpr();
            canvas.height = canvas.clientHeight * dpr();
            ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);
            if (saved) {
                const img = new Image();
                img.onload = () => ctx.drawImage(img, 0, 0, canvas.clientWidth, canvas.clientHeight);
                img.src = saved;
            }
        };

        const pos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const src = e.touches ? e.touches[0] : e;
            return { x: src.clientX - rect.left, y: src.clientY - rect.top };
        };

        const stroke = () => {
            ctx.strokeStyle = getColor();
            ctx.lineWidth = getWidth();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            if (points.length < 3) {
                const p = points[0];
                ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
                ctx.fillStyle = getColor();
                ctx.fill();
                return;
            }
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length - 1; i++) {
                const mid = { x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2 };
                ctx.quadraticCurveTo(points[i].x, points[i].y, mid.x, mid.y);
            }
            ctx.stroke();
        };

        const start = (e) => {
            e.preventDefault();
            drawing = true;
            hasInk = true;
            points = [pos(e)];
            stroke();
        };
        const move = (e) => {
            if (!drawing) return;
            e.preventDefault();
            points.push(pos(e));
            if (points.length > 4) points = points.slice(-4);
            stroke();
        };
        const end = () => { drawing = false; points = []; };

        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('mousemove', move);
        window.addEventListener('mouseup', end);
        canvas.addEventListener('touchstart', start, { passive: false });
        canvas.addEventListener('touchmove', move, { passive: false });
        canvas.addEventListener('touchend', end);

        return {
            resize,
            clear() {
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.restore();
                hasInk = false;
            },
            isEmpty() {
                if (!hasInk) return true;
                const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) return false;
                return true;
            },
            // Crop to inked bounding box (+ padding) for tighter placement.
            trimmedDataURL() {
                const { width: W, height: H } = canvas;
                const data = ctx.getImageData(0, 0, W, H).data;
                let minX = W, minY = H, maxX = 0, maxY = 0;
                for (let y = 0; y < H; y++) {
                    for (let x = 0; x < W; x++) {
                        if (data[(y * W + x) * 4 + 3] > 8) {
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                        }
                    }
                }
                if (maxX <= minX || maxY <= minY) return canvas.toDataURL('image/png');
                const pad = 8;
                minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
                maxX = Math.min(W, maxX + pad); maxY = Math.min(H, maxY + pad);
                const out = document.createElement('canvas');
                out.width = maxX - minX;
                out.height = maxY - minY;
                out.getContext('2d').drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
                return out.toDataURL('image/png');
            }
        };
    };

    let signaturePad = null;
    let parafPad = null;
    let penColor = '#111827';

    const initPads = () => {
        signaturePad = createPad($('signaturePad'), () => penColor, () => Number($('penWidth').value));
        parafPad = createPad($('parafPad'), () => penColor, () => 2.5);

        document.querySelectorAll('#penColors .swatch').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#penColors .swatch').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                penColor = btn.dataset.color;
            });
        });

        $('clearSignature').addEventListener('click', () => signaturePad.clear());
        $('clearParaf').addEventListener('click', () => parafPad.clear());

        $('saveSignature').addEventListener('click', () => {
            if (signaturePad.isEmpty()) return toast(t('msgDrawFirst'), 'error');
            closeEditor('signature');
            setAsset('signature', signaturePad.trimmedDataURL());
            switchToUpload('signature');
            toast(t('msgSignatureSaved'), 'success');
        });
        $('saveParaf').addEventListener('click', () => {
            if (parafPad.isEmpty()) return toast(t('msgDrawInitialsFirst'), 'error');
            closeEditor('paraf');
            setAsset('paraf', parafPad.trimmedDataURL());
            switchToUpload('paraf');
            toast(t('msgInitialsSaved'), 'success');
        });

        let resizeTimer = null;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (!$('drawContainer').hidden) signaturePad.resize();
                if (!$('drawParafContainer').hidden) parafPad.resize();
            }, 150);
        });
    };

    const switchToUpload = (kind) => {
        const map = kind === 'signature'
            ? { up: 'uploadOption', draw: 'drawOption', upC: 'uploadContainer', drawC: 'drawContainer' }
            : { up: 'uploadParafOption', draw: 'drawParafOption', upC: 'uploadParafContainer', drawC: 'drawParafContainer' };
        $(map.up).classList.add('active');
        $(map.draw).classList.remove('active');
        $(map.upC).hidden = false;
        $(map.drawC).hidden = true;
    };

    const switchToDraw = (kind) => {
        const map = kind === 'signature'
            ? { up: 'uploadOption', draw: 'drawOption', upC: 'uploadContainer', drawC: 'drawContainer', pad: () => signaturePad }
            : { up: 'uploadParafOption', draw: 'drawParafOption', upC: 'uploadParafContainer', drawC: 'drawParafContainer', pad: () => parafPad };
        $(map.draw).classList.add('active');
        $(map.up).classList.remove('active');
        $(map.upC).hidden = true;
        $(map.drawC).hidden = false;
        requestAnimationFrame(() => map.pad().resize());
    };

    // -------------------------------------------------------------- assets

    const setAsset = (kind, dataURL, showImgPreview = true) => {
        if (kind === 'signature') state.signatureImage = dataURL;
        else state.parafImage = dataURL;
        const img = $(kind === 'signature' ? 'signaturePreview' : 'parafPreview');
        img.src = dataURL;
        img.classList.toggle('visible', showImgPreview);
        try { localStorage.setItem('signpdf.' + kind, dataURL); } catch (e) { /* quota */ }
    };

    // --------------------------------------------- upload editor (bg removal)

    // Uploaded scans/photos usually sit on a white background. The editor
    // shows the image on a transparency checkerboard with two gauges:
    // background removal (luminance cutoff with a soft alpha ramp, so edges
    // stay smooth) and ink intensity (alpha boost + darkening for faint pens).
    const editors = { signature: { orig: null }, paraf: { orig: null } };

    const processScan = async (orig, bg, ink) => {
        const el = await loadImageEl(orig);
        const c = document.createElement('canvas');
        c.width = el.naturalWidth;
        c.height = el.naturalHeight;
        const ctx = c.getContext('2d');
        ctx.drawImage(el, 0, 0);
        if (bg > 0 || ink > 0) {
            const id = ctx.getImageData(0, 0, c.width, c.height);
            const d = id.data;
            const cutoff = 255 - bg * 1.7;   // higher gauge -> lower cutoff -> more removed
            const soft = 42;                 // alpha ramp width below the cutoff
            const boost = ink / 100;
            for (let i = 0; i < d.length; i += 4) {
                const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                let a = d[i + 3];
                if (bg > 0) {
                    a *= lum >= cutoff ? 0 : Math.min(1, (cutoff - lum) / soft);
                }
                if (boost > 0 && a > 0) {
                    a = Math.min(255, a * (1 + boost * 1.6));
                    d[i] *= 1 - boost * 0.35;
                    d[i + 1] *= 1 - boost * 0.35;
                    d[i + 2] *= 1 - boost * 0.35;
                }
                d[i + 3] = a;
            }
            ctx.putImageData(id, 0, 0);
        }
        return c.toDataURL('image/png');
    };

    const editorRefresh = async (kind) => {
        const ed = editors[kind];
        if (!ed.orig) return;
        const bg = Number($(kind + 'Bg').value);
        const ink = Number($(kind + 'Ink').value);
        const processed = await processScan(ed.orig, bg, ink);
        setAsset(kind, processed, false);
        try { localStorage.setItem('signpdf.' + kind + '.edit', JSON.stringify({ bg, ink })); } catch (e) { /* quota */ }
        const canvas = $(kind + 'EditCanvas');
        const el = await loadImageEl(processed);
        canvas.width = el.naturalWidth;
        canvas.height = el.naturalHeight;
        canvas.getContext('2d').drawImage(el, 0, 0);
    };

    const openEditor = async (kind, orig, bg, ink) => {
        editors[kind].orig = orig;
        try { localStorage.setItem('signpdf.' + kind + '.orig', orig); } catch (e) { /* quota */ }
        if (bg !== undefined) $(kind + 'Bg').value = bg;
        if (ink !== undefined) $(kind + 'Ink').value = ink;
        $(kind + 'Editor').hidden = false;
        $(kind === 'signature' ? 'signaturePreview' : 'parafPreview').classList.remove('visible');
        await editorRefresh(kind);
    };

    // A drawn signature replaces the uploaded one — drop the editor state.
    const closeEditor = (kind) => {
        editors[kind].orig = null;
        $(kind + 'Editor').hidden = true;
        try {
            localStorage.removeItem('signpdf.' + kind + '.orig');
            localStorage.removeItem('signpdf.' + kind + '.edit');
        } catch (e) { /* blocked storage */ }
    };

    const initSigEditors = () => {
        ['signature', 'paraf'].forEach(kind => {
            let timer = null;
            const onInput = () => { clearTimeout(timer); timer = setTimeout(() => editorRefresh(kind), 90); };
            $(kind + 'Bg').addEventListener('input', onInput);
            $(kind + 'Ink').addEventListener('input', onInput);
            $(kind + 'EditReset').addEventListener('click', () => {
                $(kind + 'Bg').value = 0;
                $(kind + 'Ink').value = 0;
                editorRefresh(kind);
            });
        });
    };

    const restoreAssets = () => {
        try {
            ['signature', 'paraf'].forEach(kind => {
                const orig = localStorage.getItem('signpdf.' + kind + '.orig');
                const processed = localStorage.getItem('signpdf.' + kind);
                if (orig) {
                    let cfg = { bg: 45, ink: 0 };
                    try { cfg = JSON.parse(localStorage.getItem('signpdf.' + kind + '.edit')) || cfg; } catch (e) { /* corrupt */ }
                    openEditor(kind, orig, cfg.bg, cfg.ink);
                } else if (processed) {
                    setAsset(kind, processed);
                }
            });
        } catch (e) { /* blocked storage */ }
    };

    const readImageFile = (file, kind, successMsg) => {
        if (!file.type.startsWith('image/')) return toast(t('msgImageOnly'), 'error');
        if (file.size > MAX_IMAGE_BYTES) return toast(t('msgFileTooBig'), 'error');
        const reader = new FileReader();
        reader.onload = async (e) => {
            await openEditor(kind, e.target.result, Number($(kind + 'Bg').value), Number($(kind + 'Ink').value));
            toast(t(successMsg), 'success');
        };
        reader.readAsDataURL(file);
    };

    const wireDropzone = (zoneId, inputId, browseId, onFile) => {
        const zone = $(zoneId), input = $(inputId);
        $(browseId).addEventListener('click', () => input.click());
        input.addEventListener('change', (e) => {
            if (e.target.files.length) onFile(e.target.files[0]);
            input.value = '';
        });
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('active'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('active'));
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('active');
            if (e.dataTransfer.files.length) onFile(e.dataTransfer.files[0]);
        });
    };

    const initUploads = () => {
        wireDropzone('signatureDropzone', 'signatureUpload', 'browseSignature',
            (f) => readImageFile(f, 'signature', 'msgSignatureUploaded'));
        wireDropzone('parafDropzone', 'parafUpload', 'browseParaf',
            (f) => readImageFile(f, 'paraf', 'msgInitialsUploaded'));
        wireDropzone('documentDropzone', 'documentUpload', 'browseDocument', (f) => {
            const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
            if (!isPdf) return toast(t('msgPdfOnly'), 'error');
            if (f.size > MAX_PDF_BYTES) return toast(t('msgFileTooBig'), 'error');
            loadPdfDocument(f);
        });

        $('uploadOption').addEventListener('click', () => switchToUpload('signature'));
        $('drawOption').addEventListener('click', () => switchToDraw('signature'));
        $('uploadParafOption').addEventListener('click', () => switchToUpload('paraf'));
        $('drawParafOption').addEventListener('click', () => switchToDraw('paraf'));
    };

    // ------------------------------------------------------------ PDF load

    const loadPdfDocument = async (file) => {
        $('documentLoading').hidden = false;
        $('documentPreview').hidden = true;
        try {
            const buffer = await file.arrayBuffer();
            state.pdfBytes = new Uint8Array(buffer);
            state.pdfFileName = file.name.replace(/\.pdf$/i, '') || 'document';

            // pdf.js transfers its buffer to the worker — hand it a copy.
            const pdf = await pdfjsLib.getDocument({ data: state.pdfBytes.slice() }).promise;

            state.pdfDocument = pdf;
            state.totalPages = pdf.numPages;
            state.currentPage = 1;
            state.placements = {};
            state.baseDims = {};
            $('totalPages').textContent = state.totalPages;

            await renderPage(1);
            $('documentPreview').hidden = false;
            $('documentLoading').hidden = true;
            toast(t('msgDocLoaded', { pages: state.totalPages }), 'success');
            $('step2').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) {
            console.error('Error loading PDF:', error);
            $('documentLoading').hidden = true;
            toast(t('msgDocError', { error: error.message }), 'error');
        }
    };

    // Width/height of a page in PDF points (cached).
    const getBaseDims = async (pageNum) => {
        if (!state.baseDims[pageNum]) {
            const page = await state.pdfDocument.getPage(pageNum);
            const vp = page.getViewport({ scale: 1 });
            state.baseDims[pageNum] = { width: vp.width, height: vp.height };
        }
        return state.baseDims[pageNum];
    };

    // ---------------------------------------------------------- pagination

    const createPagination = () => {
        const pagination = $('pagination');
        pagination.innerHTML = '';
        const mkBtn = (label, disabled, onClick, active) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'page-btn' + (active ? ' active' : '');
            b.innerHTML = label;
            b.disabled = !!disabled;
            b.addEventListener('click', onClick);
            pagination.appendChild(b);
        };
        mkBtn('&laquo;', state.currentPage === 1, () => renderPage(state.currentPage - 1));
        const maxButtons = 5;
        let start = Math.max(1, state.currentPage - Math.floor(maxButtons / 2));
        const end = Math.min(state.totalPages, start + maxButtons - 1);
        start = Math.max(1, end - maxButtons + 1);
        for (let i = start; i <= end; i++) {
            mkBtn(String(i), false, () => renderPage(i), i === state.currentPage);
        }
        mkBtn('&raquo;', state.currentPage === state.totalPages, () => renderPage(state.currentPage + 1));
    };

    // ------------------------------------------------------------- render

    let renderToken = 0;

    const renderPage = async (pageNum) => {
        if (!state.pdfDocument || pageNum < 1 || pageNum > state.totalPages) return;
        const token = ++renderToken;
        try {
            state.currentPage = pageNum;
            $('currentPage').textContent = pageNum;
            $('zoomLevel').textContent = Math.round(Z() * 100) + '%';
            createPagination();

            const page = await state.pdfDocument.getPage(pageNum);
            const viewport = page.getViewport({ scale: Z() });
            await getBaseDims(pageNum);

            const temp = document.createElement('canvas');
            temp.width = viewport.width;
            temp.height = viewport.height;
            await page.render({ canvasContext: temp.getContext('2d'), viewport }).promise;
            if (token !== renderToken) return; // superseded by a newer render

            if (state.fabricCanvas) state.fabricCanvas.dispose();
            const pdfCanvas = $('pdfCanvas');
            pdfCanvas.width = viewport.width;
            pdfCanvas.height = viewport.height;
            state.fabricCanvas = new fabric.Canvas(pdfCanvas, {
                selection: true,
                width: viewport.width,
                height: viewport.height
            });

            const bg = new fabric.Image(temp, { left: 0, top: 0, selectable: false, evented: false });
            state.fabricCanvas.setBackgroundImage(bg, state.fabricCanvas.renderAll.bind(state.fabricCanvas));

            (state.placements[pageNum] || []).forEach(p => addPlacementToCanvas(p));
        } catch (error) {
            console.error('Error rendering page:', error);
            toast(t('msgDocError', { error: error.message }), 'error');
        }
    };

    const initZoom = () => {
        $('zoomIn').addEventListener('click', () => {
            if (state.zoomIndex < ZOOMS.length - 1) { state.zoomIndex++; renderPage(state.currentPage); }
        });
        $('zoomOut').addEventListener('click', () => {
            if (state.zoomIndex > 0) { state.zoomIndex--; renderPage(state.currentPage); }
        });
    };

    // ----------------------------------------------------------- placement

    // placement = { id, kind: 'signature'|'paraf'|'stamp', image, natW, natH,
    //               leftPt, topPt, scaleXPt, scaleYPt, angle,
    //               info: {text, fontSizePt} | null }

    const loadImageEl = (src) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });

    const currentIP = async () => {
        if (state.ipAddress) return state.ipAddress;
        try {
            const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(4000) });
            state.ipAddress = (await res.json()).ip;
        } catch (e) {
            state.ipAddress = 'unknown';
        }
        return state.ipAddress;
    };

    const buildInfoText = async (kind) => {
        if (!$('includeTimestamp').checked || kind === 'stamp') return null;
        const now = new Date();
        const locale = I18N.lang === 'fr' ? 'fr-FR' : 'en-GB';
        let text = `${t('signedLabel')} ${now.toLocaleDateString(locale)} ${now.toLocaleTimeString(locale)}`;
        if ($('includeIP').checked) {
            text += `\n${t('ipLabel')} ${await currentIP()}`;
        }
        return { text, fontSizePt: kind === 'paraf' ? 6 : 8 };
    };

    // Draw a placement on the fabric canvas at the current zoom and keep the
    // store in sync when the user moves/scales/rotates it.
    const addPlacementToCanvas = (p, select) => {
        fabric.Image.fromURL(p.image, (img) => {
            img.set({
                left: p.leftPt * Z(),
                top: p.topPt * Z(),
                scaleX: p.scaleXPt * Z(),
                scaleY: p.scaleYPt * Z(),
                angle: p.angle || 0,
                placementId: p.id,
                ...SELECTION_STYLE
            });

            let infoText = null;
            if (p.info) {
                infoText = new fabric.Text(p.info.text, {
                    fontSize: p.info.fontSizePt * Z(),
                    fill: '#666666',
                    fontFamily: 'Helvetica, Arial, sans-serif',
                    selectable: false,
                    evented: false,
                    placementId: p.id,
                    isInfo: true
                });
            }

            const positionInfo = () => {
                if (!infoText) return;
                const br = img.getBoundingRect(true, true);
                infoText.set({ left: br.left, top: br.top + br.height + 4 });
                infoText.setCoords();
            };

            const syncStore = () => {
                p.leftPt = img.left / Z();
                p.topPt = img.top / Z();
                p.scaleXPt = img.scaleX / Z();
                p.scaleYPt = img.scaleY / Z();
                p.angle = img.angle || 0;
            };

            ['moving', 'scaling', 'rotating'].forEach(ev => img.on(ev, () => {
                positionInfo();
            }));
            img.on('modified', () => { syncStore(); positionInfo(); state.fabricCanvas.requestRenderAll(); });

            state.fabricCanvas.add(img);
            if (infoText) { positionInfo(); state.fabricCanvas.add(infoText); }
            if (select) state.fabricCanvas.setActiveObject(img);
            state.fabricCanvas.requestRenderAll();
        });
    };

    // Create a placement record + draw it. position: 'center'|'bottom'|'corner'|'stamp'
    const addPlacement = async (kind, image, position) => {
        if (!state.pdfDocument) { toast(t('msgNeedDocument'), 'error'); return null; }

        const el = await loadImageEl(image);
        const dims = await getBaseDims(state.currentPage);
        const style = state.stampCfg ? (state.stampCfg.special || state.stampCfg.shape) : 'round';
        const targetH = kind === 'stamp'
            ? TARGET_HEIGHTS_PT['stamp' + style.charAt(0).toUpperCase() + style.slice(1)] || 100
            : TARGET_HEIGHTS_PT[kind];
        const scalePt = targetH / el.naturalHeight;
        const w = el.naturalWidth * scalePt;
        const h = targetH;

        let leftPt, topPt, angle = 0;
        switch (position) {
            case 'bottom':
                leftPt = (dims.width - w) / 2;
                topPt = dims.height - h - 90;
                break;
            case 'corner':
                leftPt = dims.width - w - 28;
                topPt = dims.height - h - 34;
                break;
            case 'stamp':
                leftPt = dims.width - w - 70;
                topPt = dims.height - h - 110;
                if (state.stampCfg && state.stampCfg.tilt) angle = -4 + rng() * 8;
                break;
            default: // center
                leftPt = (dims.width - w) / 2;
                topPt = dims.height * 0.35;
        }

        const p = {
            id: Date.now().toString(36) + Math.floor(rng() * 1e6).toString(36),
            kind,
            image,
            natW: el.naturalWidth,
            natH: el.naturalHeight,
            leftPt, topPt,
            scaleXPt: scalePt,
            scaleYPt: scalePt,
            angle,
            info: await buildInfoText(kind)
        };

        if (!state.placements[state.currentPage]) state.placements[state.currentPage] = [];
        state.placements[state.currentPage].push(p);
        addPlacementToCanvas(p, true);
        toast(t('msgAdded', { page: state.currentPage }), 'success');
        return p;
    };

    // Initials on every page — computed directly in point space, no re-rendering.
    const addParafToAllPages = async () => {
        if (!state.parafImage) return toast(t('msgNeedInitials'), 'error');
        if (!state.pdfDocument) return toast(t('msgNeedDocument'), 'error');

        const el = await loadImageEl(state.parafImage);
        const scalePt = TARGET_HEIGHTS_PT.paraf / el.naturalHeight;
        const w = el.naturalWidth * scalePt;
        const h = TARGET_HEIGHTS_PT.paraf;
        const info = await buildInfoText('paraf');

        for (let pageNum = 1; pageNum <= state.totalPages; pageNum++) {
            const dims = await getBaseDims(pageNum);
            const p = {
                id: Date.now().toString(36) + pageNum + Math.floor(rng() * 1e6).toString(36),
                kind: 'paraf',
                image: state.parafImage,
                natW: el.naturalWidth,
                natH: el.naturalHeight,
                leftPt: dims.width - w - 28,
                topPt: dims.height - h - 34,
                scaleXPt: scalePt,
                scaleYPt: scalePt,
                angle: 0,
                info: info ? { ...info } : null
            };
            if (!state.placements[pageNum]) state.placements[pageNum] = [];
            state.placements[pageNum].push(p);
            if (pageNum === state.currentPage) addPlacementToCanvas(p);
        }
        toast(t('msgInitialsAll', { pages: state.totalPages }), 'success');
    };

    // ------------------------------------------------------------ deletion

    const removeSelected = () => {
        const canvas = state.fabricCanvas;
        if (!canvas) return toast(t('msgNothingSelected'), 'error');
        const active = canvas.getActiveObjects().filter(o => o.placementId && !o.isInfo);
        if (!active.length) return toast(t('msgNothingSelected'), 'error');

        const ids = new Set(active.map(o => o.placementId));
        canvas.getObjects().filter(o => ids.has(o.placementId)).forEach(o => canvas.remove(o));
        canvas.discardActiveObject();
        canvas.requestRenderAll();

        const list = state.placements[state.currentPage] || [];
        state.placements[state.currentPage] = list.filter(p => !ids.has(p.id));
        toast(t('msgRemoved'), 'success');
    };

    const initDeletion = () => {
        $('removeSelected').addEventListener('click', removeSelected);
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Delete' && e.key !== 'Backspace') return;
            const tag = (document.activeElement || {}).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            if (state.fabricCanvas && state.fabricCanvas.getActiveObject()) {
                e.preventDefault();
                removeSelected();
            }
        });
    };

    // -------------------------------------------------------------- export

    const dataURLToBytes = (dataURL) => {
        const b64 = dataURL.split(',')[1];
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
    };

    // Bottom-left corner of a rect at (L,T) size (w,h) rotated `deg` clockwise
    // around its top-left corner, in top-down point coordinates.
    const rotatedBottomLeft = (L, T, h, deg) => {
        const th = (deg * Math.PI) / 180;
        return { x: L - h * Math.sin(th), y: T + h * Math.cos(th) };
    };

    // Axis-aligned bounding box of the rotated rect (for info-text placement).
    const rotatedBBox = (L, T, w, h, deg) => {
        const th = (deg * Math.PI) / 180;
        const cos = Math.cos(th), sin = Math.sin(th);
        const pts = [
            { x: L, y: T },
            { x: L + w * cos, y: T + w * sin },
            { x: L + w * cos - h * sin, y: T + w * sin + h * cos },
            { x: L - h * sin, y: T + h * cos }
        ];
        return {
            minX: Math.min(...pts.map(p => p.x)),
            maxY: Math.max(...pts.map(p => p.y))
        };
    };

    const saveSignedDocument = async () => {
        const pages = Object.keys(state.placements).filter(k => (state.placements[k] || []).length);
        if (!state.pdfDocument || !pages.length) return toast(t('msgNothingToSave'), 'error');

        $('progressBar').hidden = false;
        $('progress').style.width = '0%';

        try {
            const { PDFDocument, StandardFonts, rgb, degrees } = PDFLib;
            const pdfDoc = await PDFDocument.load(state.pdfBytes);
            const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const embedded = new Map(); // dataURL -> embedded image

            const pageNums = pages.map(Number).sort((a, b) => a - b);
            for (let i = 0; i < pageNums.length; i++) {
                const pageNum = pageNums[i];
                const page = pdfDoc.getPage(pageNum - 1);
                const { height: pageH } = page.getSize();

                for (const p of state.placements[pageNum]) {
                    if (!embedded.has(p.image)) {
                        embedded.set(p.image, await pdfDoc.embedPng(dataURLToBytes(p.image)));
                    }
                    const img = embedded.get(p.image);
                    const w = p.natW * p.scaleXPt;
                    const h = p.natH * p.scaleYPt;
                    const bl = rotatedBottomLeft(p.leftPt, p.topPt, h, p.angle || 0);

                    page.drawImage(img, {
                        x: bl.x,
                        y: pageH - bl.y,
                        width: w,
                        height: h,
                        rotate: degrees(-(p.angle || 0))
                    });

                    if (p.info) {
                        const bb = rotatedBBox(p.leftPt, p.topPt, w, h, p.angle || 0);
                        const fs = p.info.fontSizePt;
                        page.drawText(p.info.text, {
                            x: bb.minX,
                            y: pageH - (bb.maxY + 4 + fs * 0.9),
                            size: fs,
                            font: helvetica,
                            color: rgb(0.4, 0.4, 0.4),
                            lineHeight: fs * 1.25
                        });
                    }
                }
                $('progress').style.width = `${((i + 1) / pageNums.length) * 100}%`;
            }

            const bytes = await pdfDoc.save();
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${state.pdfFileName}-signed.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 500);

            $('progressBar').hidden = true;
            toast(t('msgSaved'), 'success');
        } catch (error) {
            console.error('Error saving document:', error);
            $('progressBar').hidden = true;
            toast(t('msgSaveError', { error: error.message }), 'error');
        }
    };

    // ------------------------------------------------------------- actions

    const initActions = () => {
        $('addSignature').addEventListener('click', () => {
            if (!state.signatureImage) return toast(t('msgNeedSignature'), 'error');
            addPlacement('signature', state.signatureImage, 'center');
        });
        $('addBottomSignature').addEventListener('click', () => {
            if (!state.signatureImage) return toast(t('msgNeedSignature'), 'error');
            addPlacement('signature', state.signatureImage, 'bottom');
        });
        $('addParaf').addEventListener('click', () => {
            if (!state.parafImage) return toast(t('msgNeedInitials'), 'error');
            addPlacement('paraf', state.parafImage, 'corner');
        });
        $('addAllParaf').addEventListener('click', addParafToAllPages);
        $('addStamp').addEventListener('click', () => {
            if (!state.stampImage) return toast(t('msgNeedStamp'), 'error');
            addPlacement('stamp', state.stampImage, 'stamp');
        });
        $('saveDocument').addEventListener('click', saveSignedDocument);
    };

    // ----------------------------------------------------------------- go

    const initApp = () => {
        initChrome();
        initTabs();
        initPads();
        initUploads();
        initSigEditors();
        initZoom();
        initDeletion();
        initActions();
        restoreAssets();

        StampDesigner.init();
        state.stampImage = StampDesigner.getImage();
        state.stampCfg = StampDesigner.getConfig();
        StampDesigner.onSave((image, cfg) => {
            state.stampImage = image;
            state.stampCfg = cfg;
            toast(t('msgStampSaved'), 'success');
        });
    };

    window.addEventListener('DOMContentLoaded', initApp);
})();
