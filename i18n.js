// SignPDF i18n — English / French UI dictionary and helpers.
// Exposed globals: I18N.t(key), I18N.lang, I18N.setLang(lang), I18N.apply()

(function () {
    'use strict';

    const STRINGS = {
        en: {
            privacyPill: '100% local — nothing is uploaded',
            heroTitle: 'Sign, Initial & Stamp your PDFs',
            heroSubtitle: 'Draw your signature, add initials, design a realistic company stamp — then place everything on your document. Everything runs in your browser: no account, no server, no data leaves your device.',
            step1Title: 'Create your signature, initials & stamp',
            tabSignature: 'Signature',
            tabInitials: 'Initials',
            tabStamp: 'Company stamp',
            uploadImage: 'Upload image',
            drawSignature: 'Draw signature',
            drawInitials: 'Draw initials',
            dropSignature: 'Drag & drop your signature image here',
            dropInitials: 'Drag & drop your initials image here',
            dropDocument: 'Drag & drop your PDF document here',
            or: 'or',
            browseFiles: 'Browse files',
            penWidth: 'Pen width',
            clear: 'Clear',
            saveSignature: 'Save signature',
            saveInitials: 'Save initials',
            stampIntro: 'Design a realistic stamp for your own company — curved text, ink color and natural wear included.',
            stampShape: 'Shape',
            shapeRound: 'Round',
            shapeOval: 'Oval',
            shapeRect: 'Rectangular',
            stampTopText: 'Top text (curved)',
            stampBottomText: 'Bottom text (curved)',
            stampCenterLines: 'Center lines (one per line)',
            stampInk: 'Ink color',
            stampFont: 'Font',
            fontSans: 'Sans-serif (modern)',
            fontSerif: 'Serif (classic)',
            fontMono: 'Typewriter',
            stampBorder: 'Border',
            borderDouble: 'Double line',
            borderSingle: 'Single line',
            stampSeparator: 'Separators',
            sepNone: 'None',
            stampWear: 'Ink wear / texture',
            stampPressure: 'Uneven pressure',
            stampShowDate: "Include today's date",
            stampTilt: 'Natural tilt when placed',
            stampShuffle: 'New texture',
            stampDownload: 'PNG',
            stampUse: 'Save stamp',
            stampLegal: 'Only create stamps for organizations you are authorized to represent.',
            step2Title: 'Upload your document',
            page: 'Page',
            step3Title: 'Place & export',
            step3Hint: 'Drag, resize and rotate items directly on the page. Select an item and press Delete to remove it.',
            optTimestamp: 'Add date & time under signatures',
            optIP: 'Also include my IP address',
            addSignature: 'Add signature',
            addBottom: 'Signature at bottom',
            addInitials: 'Add initials',
            initialAll: 'Initial every page',
            addStamp: 'Add stamp',
            removeSelected: 'Remove selected',
            saveDocument: 'Download signed PDF',
            footerMade: 'Created with ❤️ by',
            footerPrivacy: 'Your files never leave your device.',
            // Runtime messages
            msgDrawFirst: 'Please draw a signature first',
            msgDrawInitialsFirst: 'Please draw your initials first',
            msgSignatureSaved: 'Signature saved!',
            msgInitialsSaved: 'Initials saved!',
            msgStampSaved: 'Stamp saved — you can now add it to your document',
            msgSignatureUploaded: 'Signature uploaded!',
            msgInitialsUploaded: 'Initials uploaded!',
            msgImageOnly: 'Please choose an image file',
            msgPdfOnly: 'Please choose a PDF document',
            msgFileTooBig: 'File is too large (max 25 MB)',
            msgDocLoaded: 'Document loaded — {pages} page(s)',
            msgDocError: 'Could not read this PDF: {error}',
            msgNeedSignature: 'Create or upload a signature first (step 1)',
            msgNeedInitials: 'Create or upload your initials first (step 1)',
            msgNeedStamp: 'Design and save a stamp first (step 1)',
            msgNeedDocument: 'Upload a PDF document first (step 2)',
            msgAdded: 'Added to page {page}',
            msgInitialsAll: 'Initials added to all {pages} pages',
            msgRemoved: 'Item removed',
            msgNothingSelected: 'Select an item on the page first',
            msgNothingToSave: 'Add at least one signature, initials or stamp first',
            msgSaved: 'Signed PDF downloaded!',
            msgSaveError: 'Error while saving: {error}',
            msgStampDate: 'Signed on',
            signedLabel: 'Signed:',
            ipLabel: 'IP:'
        },
        fr: {
            privacyPill: '100% local — rien n’est envoyé',
            heroTitle: 'Signez, paraphez et tamponnez vos PDF',
            heroSubtitle: 'Dessinez votre signature, ajoutez vos paraphes, créez un tampon de société réaliste — puis placez le tout sur votre document. Tout se passe dans votre navigateur : aucun compte, aucun serveur, aucune donnée ne quitte votre appareil.',
            step1Title: 'Créez votre signature, paraphe & tampon',
            tabSignature: 'Signature',
            tabInitials: 'Paraphe',
            tabStamp: 'Tampon société',
            uploadImage: 'Importer une image',
            drawSignature: 'Dessiner la signature',
            drawInitials: 'Dessiner le paraphe',
            dropSignature: 'Glissez-déposez l’image de votre signature ici',
            dropInitials: 'Glissez-déposez l’image de votre paraphe ici',
            dropDocument: 'Glissez-déposez votre document PDF ici',
            or: 'ou',
            browseFiles: 'Parcourir',
            penWidth: 'Épaisseur du stylo',
            clear: 'Effacer',
            saveSignature: 'Enregistrer la signature',
            saveInitials: 'Enregistrer le paraphe',
            stampIntro: 'Créez un tampon réaliste pour votre propre société — texte courbé, couleur d’encre et usure naturelle inclus.',
            stampShape: 'Forme',
            shapeRound: 'Rond',
            shapeOval: 'Ovale',
            shapeRect: 'Rectangulaire',
            stampTopText: 'Texte du haut (courbé)',
            stampBottomText: 'Texte du bas (courbé)',
            stampCenterLines: 'Lignes centrales (une par ligne)',
            stampInk: 'Couleur d’encre',
            stampFont: 'Police',
            fontSans: 'Sans-serif (moderne)',
            fontSerif: 'Serif (classique)',
            fontMono: 'Machine à écrire',
            stampBorder: 'Bordure',
            borderDouble: 'Double trait',
            borderSingle: 'Trait simple',
            stampSeparator: 'Séparateurs',
            sepNone: 'Aucun',
            stampWear: 'Usure de l’encre / texture',
            stampPressure: 'Pression irrégulière',
            stampShowDate: 'Inclure la date du jour',
            stampTilt: 'Inclinaison naturelle au placement',
            stampShuffle: 'Nouvelle texture',
            stampDownload: 'PNG',
            stampUse: 'Enregistrer le tampon',
            stampLegal: 'Ne créez des tampons que pour les organisations que vous êtes autorisé à représenter.',
            step2Title: 'Importez votre document',
            page: 'Page',
            step3Title: 'Placez & exportez',
            step3Hint: 'Déplacez, redimensionnez et pivotez les éléments directement sur la page. Sélectionnez un élément puis touche Suppr pour le retirer.',
            optTimestamp: 'Ajouter date & heure sous les signatures',
            optIP: 'Inclure aussi mon adresse IP',
            addSignature: 'Ajouter la signature',
            addBottom: 'Signature en bas de page',
            addInitials: 'Ajouter le paraphe',
            initialAll: 'Parapher toutes les pages',
            addStamp: 'Ajouter le tampon',
            removeSelected: 'Retirer la sélection',
            saveDocument: 'Télécharger le PDF signé',
            footerMade: 'Créé avec ❤️ par',
            footerPrivacy: 'Vos fichiers ne quittent jamais votre appareil.',
            msgDrawFirst: 'Dessinez d’abord une signature',
            msgDrawInitialsFirst: 'Dessinez d’abord votre paraphe',
            msgSignatureSaved: 'Signature enregistrée !',
            msgInitialsSaved: 'Paraphe enregistré !',
            msgStampSaved: 'Tampon enregistré — vous pouvez maintenant l’ajouter au document',
            msgSignatureUploaded: 'Signature importée !',
            msgInitialsUploaded: 'Paraphe importé !',
            msgImageOnly: 'Veuillez choisir un fichier image',
            msgPdfOnly: 'Veuillez choisir un document PDF',
            msgFileTooBig: 'Fichier trop volumineux (max 25 Mo)',
            msgDocLoaded: 'Document chargé — {pages} page(s)',
            msgDocError: 'Impossible de lire ce PDF : {error}',
            msgNeedSignature: 'Créez ou importez d’abord une signature (étape 1)',
            msgNeedInitials: 'Créez ou importez d’abord votre paraphe (étape 1)',
            msgNeedStamp: 'Créez et enregistrez d’abord un tampon (étape 1)',
            msgNeedDocument: 'Importez d’abord un document PDF (étape 2)',
            msgAdded: 'Ajouté à la page {page}',
            msgInitialsAll: 'Paraphe ajouté aux {pages} pages',
            msgRemoved: 'Élément retiré',
            msgNothingSelected: 'Sélectionnez d’abord un élément sur la page',
            msgNothingToSave: 'Ajoutez d’abord au moins une signature, un paraphe ou un tampon',
            msgSaved: 'PDF signé téléchargé !',
            msgSaveError: 'Erreur lors de l’enregistrement : {error}',
            msgStampDate: 'Signé le',
            signedLabel: 'Signé :',
            ipLabel: 'IP :'
        }
    };

    let lang = localStorage.getItem('signpdf.lang')
        || ((navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en');

    const t = (key, vars) => {
        let str = (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;
        if (vars) {
            Object.keys(vars).forEach(k => { str = str.replace('{' + k + '}', vars[k]); });
        }
        return str;
    };

    const apply = () => {
        document.documentElement.lang = lang;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = t(el.getAttribute('data-i18n'));
        });
        const toggle = document.getElementById('langToggle');
        if (toggle) toggle.textContent = lang === 'fr' ? 'EN' : 'FR';
    };

    const setLang = (next) => {
        lang = next;
        localStorage.setItem('signpdf.lang', lang);
        apply();
        document.dispatchEvent(new CustomEvent('signpdf:langchange', { detail: { lang } }));
    };

    window.I18N = {
        t,
        apply,
        setLang,
        get lang() { return lang; }
    };
})();
