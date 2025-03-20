// DOM Elements
const uploadOption = document.getElementById('uploadOption');
const drawOption = document.getElementById('drawOption');
const uploadContainer = document.getElementById('uploadContainer');
const drawContainer = document.getElementById('drawContainer');
const signatureDropzone = document.getElementById('signatureDropzone');
const signatureUpload = document.getElementById('signatureUpload');
const browseSignature = document.getElementById('browseSignature');
const signaturePreview = document.getElementById('signaturePreview');

const uploadParafOption = document.getElementById('uploadParafOption');
const drawParafOption = document.getElementById('drawParafOption');
const uploadParafContainer = document.getElementById('uploadParafContainer');
const drawParafContainer = document.getElementById('drawParafContainer');
const parafDropzone = document.getElementById('parafDropzone');
const parafUpload = document.getElementById('parafUpload');
const browseParaf = document.getElementById('browseParaf');
const parafPreview = document.getElementById('parafPreview');

const documentDropzone = document.getElementById('documentDropzone');
const documentUpload = document.getElementById('documentUpload');
const browseDocument = document.getElementById('browseDocument');
const documentPreview = document.getElementById('documentPreview');
const documentLoading = document.getElementById('documentLoading');
const pdfCanvas = document.getElementById('pdfCanvas');
const currentPageElement = document.getElementById('currentPage');
const totalPagesElement = document.getElementById('totalPages');
const pagination = document.getElementById('pagination');
const addSignatureBtn = document.getElementById('addSignature');
const addBottomSignatureBtn = document.getElementById('addBottomSignature');
const addParafBtn = document.getElementById('addParaf');
const addAllParafBtn = document.getElementById('addAllParaf');
const saveDocumentBtn = document.getElementById('saveDocument');
const clearSignatureBtn = document.getElementById('clearSignature');
const saveSignatureBtn = document.getElementById('saveSignature');
const clearParafBtn = document.getElementById('clearParaf');
const saveParafBtn = document.getElementById('saveParaf');
const progressBar = document.getElementById('progressBar');
const progress = document.getElementById('progress');
const successAlert = document.getElementById('successAlert');
const errorAlert = document.getElementById('errorAlert');

// Tabs
const signatureTabs = document.querySelectorAll('.signature-tab');
const signatureTabContents = document.querySelectorAll('.signature-tab-content');

// App state
let signatureImage = null;
let parafImage = null;
let pdfDocument = null;
let currentPdfFile = null; // Store the original PDF file
let pdfPages = [];
let currentPage = 1;
let totalPages = 0;
let signatureCanvas = null;
let parafCanvas = null;
let fabricCanvas = null;
let signatures = {};
let userIPAddress = '0.0.0.0'; // Default IP address
let signatureDate = new Date();

// Get user IP address
const getUserIPAddress = async () => {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        userIPAddress = data.ip;
    } catch (error) {
        console.warn('Could not fetch IP address', error);
        userIPAddress = 'Unknown';
    }
};

// Initialize the app
const initApp = async () => {
    // Attempt to get the user's IP address
    await getUserIPAddress();
    
    // Initialize tabs functionality
    signatureTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            signatureTabs.forEach(t => t.classList.remove('active'));
            signatureTabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to current tab and content
            tab.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
    
    // Initialize signature and paraf pads
    initSignaturePad();
    initParafPad();
    initPdfRenderer();
};

// Initialize signature pad
const initSignaturePad = () => {
    signatureCanvas = document.getElementById('signaturePad');
    const ctx = signatureCanvas.getContext('2d');
    
    // Function to resize canvas properly
    const resizeSignatureCanvas = () => {
        // Get the display width and height
        const width = signatureCanvas.clientWidth;
        const height = signatureCanvas.clientHeight;
        
        // If the canvas is not the same size
        if (signatureCanvas.width !== width || signatureCanvas.height !== height) {
            // Make the canvas the same size
            signatureCanvas.width = width;
            signatureCanvas.height = height;
            
            // Reset line style after resize
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }
    };
    
    // Initial resize
    resizeSignatureCanvas();
    
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    
    const startDrawing = (e) => {
        isDrawing = true;
        const { offsetX, offsetY } = getCoordinates(e);
        lastX = offsetX;
        lastY = offsetY;
        
        // Start a new path for better line quality
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(lastX, lastY); // Draw a dot
        ctx.stroke();
    };
    
    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault(); // Prevent scrolling on touch devices
        
        const { offsetX, offsetY } = getCoordinates(e);
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
        
        lastX = offsetX;
        lastY = offsetY;
    };
    
    const stopDrawing = () => {
        isDrawing = false;
    };
    
    const getCoordinates = (event) => {
        if (event.touches && event.touches[0]) {
            const rect = signatureCanvas.getBoundingClientRect();
            return {
                offsetX: event.touches[0].clientX - rect.left,
                offsetY: event.touches[0].clientY - rect.top
            };
        } else if (event.offsetX !== undefined && event.offsetY !== undefined) {
            return {
                offsetX: event.offsetX,
                offsetY: event.offsetY
            };
        } else {
            // Fallback for other events
            const rect = signatureCanvas.getBoundingClientRect();
            return {
                offsetX: event.clientX - rect.left,
                offsetY: event.clientY - rect.top
            };
        }
    };
    
    // Remove any existing event listeners to prevent duplicates
    signatureCanvas.removeEventListener('mousedown', startDrawing);
    signatureCanvas.removeEventListener('mousemove', draw);
    signatureCanvas.removeEventListener('mouseup', stopDrawing);
    signatureCanvas.removeEventListener('mouseout', stopDrawing);
    
    // Mouse events
    signatureCanvas.addEventListener('mousedown', startDrawing);
    signatureCanvas.addEventListener('mousemove', draw);
    signatureCanvas.addEventListener('mouseup', stopDrawing);
    signatureCanvas.addEventListener('mouseout', stopDrawing);
    
    // Touch events
    signatureCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startDrawing(e);
    });
    
    signatureCanvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        draw(e);
    });
    
    signatureCanvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopDrawing();
    });
    
    // Clear signature
    clearSignatureBtn.addEventListener('click', () => {
        ctx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    });
    
    // Save signature
    saveSignatureBtn.addEventListener('click', () => {
        // Check if canvas is empty
        const pixelData = ctx.getImageData(0, 0, signatureCanvas.width, signatureCanvas.height).data;
        const isEmpty = !pixelData.some(channel => channel !== 0);
        
        if (isEmpty) {
            showAlert('Please draw a signature first', 'error');
            return;
        }
        
        const dataUrl = signatureCanvas.toDataURL('image/png');
        signatureImage = dataUrl;
        signaturePreview.src = dataUrl;
        signaturePreview.style.display = 'inline-block';
        
        // Switch back to upload option view
        uploadOption.classList.add('active');
        drawOption.classList.remove('active');
        uploadContainer.style.display = 'block';
        drawContainer.style.display = 'none';
        
        showAlert('Signature saved successfully!', 'success');
    });
};

// Initialize paraf pad
const initParafPad = () => {
    parafCanvas = document.getElementById('parafPad');
    const ctx = parafCanvas.getContext('2d');
    
    // Function to resize canvas properly
    const resizeParafCanvas = () => {
        // Get the display width and height
        const width = parafCanvas.clientWidth;
        const height = parafCanvas.clientHeight;
        
        // If the canvas is not the same size
        if (parafCanvas.width !== width || parafCanvas.height !== height) {
            // Make the canvas the same size
            parafCanvas.width = width;
            parafCanvas.height = height;
            
            // Reset line style after resize
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }
    };
    
    // Initial resize
    resizeParafCanvas();
    
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    
    const startDrawing = (e) => {
        isDrawing = true;
        const { offsetX, offsetY } = getCoordinates(e);
        lastX = offsetX;
        lastY = offsetY;
        
        // Start a new path for better line quality
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(lastX, lastY); // Draw a dot
        ctx.stroke();
    };
    
    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault(); // Prevent scrolling on touch devices
        
        const { offsetX, offsetY } = getCoordinates(e);
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
        
        lastX = offsetX;
        lastY = offsetY;
    };
    
    const stopDrawing = () => {
        isDrawing = false;
    };
    
    const getCoordinates = (event) => {
        if (event.touches && event.touches[0]) {
            const rect = parafCanvas.getBoundingClientRect();
            return {
                offsetX: event.touches[0].clientX - rect.left,
                offsetY: event.touches[0].clientY - rect.top
            };
        } else if (event.offsetX !== undefined && event.offsetY !== undefined) {
            return {
                offsetX: event.offsetX,
                offsetY: event.offsetY
            };
        } else {
            // Fallback for other events
            const rect = parafCanvas.getBoundingClientRect();
            return {
                offsetX: event.clientX - rect.left,
                offsetY: event.clientY - rect.top
            };
        }
    };
    
    // Remove any existing event listeners to prevent duplicates
    parafCanvas.removeEventListener('mousedown', startDrawing);
    parafCanvas.removeEventListener('mousemove', draw);
    parafCanvas.removeEventListener('mouseup', stopDrawing);
    parafCanvas.removeEventListener('mouseout', stopDrawing);
    
    // Mouse events
    parafCanvas.addEventListener('mousedown', startDrawing);
    parafCanvas.addEventListener('mousemove', draw);
    parafCanvas.addEventListener('mouseup', stopDrawing);
    parafCanvas.addEventListener('mouseout', stopDrawing);
    
    // Touch events
    parafCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startDrawing(e);
    });
    
    parafCanvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        draw(e);
    });
    
    parafCanvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopDrawing();
    });
    
    // Clear paraf
    clearParafBtn.addEventListener('click', () => {
        ctx.clearRect(0, 0, parafCanvas.width, parafCanvas.height);
    });
    
    // Save paraf
    saveParafBtn.addEventListener('click', () => {
        // Check if canvas is empty
        const pixelData = ctx.getImageData(0, 0, parafCanvas.width, parafCanvas.height).data;
        const isEmpty = !pixelData.some(channel => channel !== 0);
        
        if (isEmpty) {
            showAlert('Please draw your initials first', 'error');
            return;
        }
        
        const dataUrl = parafCanvas.toDataURL('image/png');
        parafImage = dataUrl;
        parafPreview.src = dataUrl;
        parafPreview.style.display = 'inline-block';
        
        // Switch back to upload option view
        uploadParafOption.classList.add('active');
        drawParafOption.classList.remove('active');
        uploadParafContainer.style.display = 'block';
        drawParafContainer.style.display = 'none';
        
        showAlert('Initials saved successfully!', 'success');
    });
};

// Initialize PDF renderer
const initPdfRenderer = () => {
    // Ensure the PDF canvas is initially empty
    if (fabricCanvas) {
        fabricCanvas.dispose();
    }
    
    // Initialize fabric.js canvas with default settings
    fabricCanvas = new fabric.Canvas(pdfCanvas, {
        selection: false,
        renderOnAddRemove: true,
        stateful: true
    });
    
    // Add event listeners
    addSignatureBtn.addEventListener('click', () => addSignatureToPage('center'));
    addBottomSignatureBtn.addEventListener('click', () => addSignatureToPage('bottom'));
    addParafBtn.addEventListener('click', () => addParafToPage('corner'));
    addAllParafBtn.addEventListener('click', addParafToAllPages);
    saveDocumentBtn.addEventListener('click', saveSignedDocument);
    
    // Resize handler
    window.addEventListener('resize', resizeCanvas);
};

// Load PDF document
const loadPdfDocument = async (file) => {
    documentLoading.style.display = 'flex';
    documentPreview.style.display = 'none';
    
    try {
        // Store the file for later use
        currentPdfFile = file;
        
        // Read the file as an ArrayBuffer
        const fileReader = new FileReader();
        
        const arrayBufferPromise = new Promise((resolve, reject) => {
            fileReader.onload = () => resolve(fileReader.result);
            fileReader.onerror = reject;
        });
        
        fileReader.readAsArrayBuffer(file);
        const arrayBuffer = await arrayBufferPromise;
        
        // Load PDF with PDF.js
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        pdfDocument = pdf;
        totalPages = pdf.numPages;
        totalPagesElement.textContent = totalPages;
        
        // Initialize pages array
        pdfPages = new Array(totalPages).fill(null);
        signatures = {};
        
        // Create pagination
        createPagination();
        
        // Render first page
        await renderPage(1);
        
        documentPreview.style.display = 'flex';
        documentLoading.style.display = 'none';
        
        showAlert('Document loaded successfully!', 'success');
    } catch (error) {
        console.error('Error loading PDF:', error);
        documentLoading.style.display = 'none';
        showAlert('Error loading PDF: ' + error.message, 'error');
    }
};

// Create pagination buttons
const createPagination = () => {
    pagination.innerHTML = '';
    
    // Add previous button
    const prevButton = document.createElement('button');
    prevButton.className = 'page-btn';
    prevButton.innerHTML = '&laquo;';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            renderPage(currentPage - 1);
        }
    });
    pagination.appendChild(prevButton);
    
    // Add page buttons
    let maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage + 1 < maxButtons) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.className = 'page-btn';
        pageButton.textContent = i;
        
        if (i === currentPage) {
            pageButton.classList.add('active');
        }
        
        pageButton.addEventListener('click', () => {
            renderPage(i);
        });
        
        pagination.appendChild(pageButton);
    }
    
    // Add next button
    const nextButton = document.createElement('button');
    nextButton.className = 'page-btn';
    nextButton.innerHTML = '&raquo;';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            renderPage(currentPage + 1);
        }
    });
    pagination.appendChild(nextButton);
};

// Render PDF page
const renderPage = async (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    
    try {
        currentPage = pageNumber;
        currentPageElement.textContent = currentPage;
        
        // Update pagination
        createPagination();
        
        // Check if we already have this page cached
        if (!pdfPages[pageNumber - 1]) {
            // Get page from the PDF document
            const page = await pdfDocument.getPage(pageNumber);
            
            // Get viewport (scale 1.5 for better quality)
            const viewport = page.getViewport({ scale: 1.5 });
            
            // Store the page in memory
            pdfPages[pageNumber - 1] = {
                page,
                viewport
            };
        }
        
        const { page, viewport } = pdfPages[pageNumber - 1];
        
        // Create a temporary canvas for PDF rendering
        const tempCanvas = document.createElement('canvas');
        const tempContext = tempCanvas.getContext('2d');
        
        // Set the canvas dimensions to match the viewport
        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;
        
        // Render PDF to the temporary canvas
        const renderContext = {
            canvasContext: tempContext,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Initialize fabric canvas with the correct dimensions
        if (fabricCanvas) {
            fabricCanvas.dispose();
        }
        
        // Set PDF canvas dimensions
        pdfCanvas.width = viewport.width;
        pdfCanvas.height = viewport.height;
        
        // Create new fabric canvas
        fabricCanvas = new fabric.Canvas(pdfCanvas, {
            selection: true,
            renderOnAddRemove: true,
            width: viewport.width,
            height: viewport.height
        });
        
        // Create background image from the rendered PDF
        fabric.Image.fromURL(tempCanvas.toDataURL('image/png'), img => {
            img.set({
                left: 0,
                top: 0,
                selectable: false,
                evented: false
            });
            
            fabricCanvas.setBackgroundImage(img, fabricCanvas.renderAll.bind(fabricCanvas));
            
            // Load signatures for this page after background is set
            loadSignaturesForPage(pageNumber);
        });
        
    } catch (error) {
        console.error('Error rendering page:', error);
        showAlert('Error rendering page: ' + error.message, 'error');
    }
};

// Resize canvas on window resize
const resizeCanvas = () => {
    if (pdfPages[currentPage - 1]) {
        // Rerender the current page to adjust the canvas size
        renderPage(currentPage);
    }
};

// Format date for display
const formatDate = (date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

// Create signature info
const createSignatureInfo = () => {
    const date = new Date();
    signatureDate = date;
    return {
        date: formatDate(date),
        ip: userIPAddress,
        timestamp: date.getTime()
    };
};

// Add signature to current page
const addSignatureToPage = (position = 'center') => {
    if (!signatureImage) {
        showAlert('Please add a signature first', 'error');
        return;
    }
    
    if (!pdfDocument) {
        showAlert('Please upload a document first', 'error');
        return;
    }
    
    fabric.Image.fromURL(signatureImage, (img) => {
        const signatureId = Date.now().toString();
        const info = createSignatureInfo();
        
        // Set initial size and position
        const maxHeight = 100;
        const ratio = img.width / img.height;
        const newHeight = Math.min(img.height, maxHeight);
        const newWidth = newHeight * ratio;
        
        let left = 50;
        let top = 50;
        
        // Position at bottom of the page if requested
        if (position === 'bottom') {
            left = fabricCanvas.width / 2 - (newWidth * img.scaleX) / 2;
            top = fabricCanvas.height - 150; // Position near bottom
        }
        
        img.set({
            left: left,
            top: top,
            scaleX: newWidth / img.width,
            scaleY: newHeight / img.height,
            cornerColor: '#4361ee',
            cornerSize: 12,
            transparentCorners: false,
            borderColor: '#4361ee',
            signatureId: signatureId,
            signatureType: 'full'
        });
        
        // Add the signature info as text
        const infoText = new fabric.Text(`Signed: ${info.date}\nIP: ${info.ip}`, {
            left: left,
            top: top + (newHeight * img.scaleY) + 5,
            fontSize: 10,
            fill: '#666666',
            fontFamily: 'Arial',
            signatureId: signatureId,
            signatureType: 'info',
            selectable: false
        });
        
        fabricCanvas.add(img);
        fabricCanvas.add(infoText);
        fabricCanvas.setActiveObject(img);
        
        // Store signature data
        if (!signatures[currentPage]) {
            signatures[currentPage] = [];
        }
        
        // Add event listener for object modification
        img.on('modified', function() {
            // Update the info text position when signature moves
            const sigId = this.signatureId;
            const infoObj = fabricCanvas.getObjects().find(o => 
                o.signatureId === sigId && o.signatureType === 'info');
            
            if (infoObj) {
                infoObj.set({
                    left: this.left,
                    top: this.top + (this.height * this.scaleY) + 5
                });
                fabricCanvas.renderAll();
                
                // Also update the stored position
                const pageSignatures = signatures[currentPage] || [];
                const signatureIndex = pageSignatures.findIndex(s => s.id === sigId);
                
                if (signatureIndex !== -1) {
                    signatures[currentPage][signatureIndex].left = this.left;
                    signatures[currentPage][signatureIndex].top = this.top;
                    signatures[currentPage][signatureIndex].scaleX = this.scaleX;
                    signatures[currentPage][signatureIndex].scaleY = this.scaleY;
                    signatures[currentPage][signatureIndex].angle = this.angle;
                    
                    // Update info position
                    const infoIndex = pageSignatures.findIndex(s => s.id === sigId && s.type === 'info');
                    if (infoIndex !== -1) {
                        signatures[currentPage][infoIndex].left = infoObj.left;
                        signatures[currentPage][infoIndex].top = infoObj.top;
                    }
                }
            }
        });
        
        signatures[currentPage].push({
            id: signatureId,
            type: 'full',
            image: signatureImage,
            left: img.left,
            top: img.top,
            scaleX: img.scaleX,
            scaleY: img.scaleY,
            angle: img.angle || 0,
            info: info
        });
        
        // Add info text object to signatures array
        signatures[currentPage].push({
            id: signatureId,
            type: 'info',
            text: `Signed: ${info.date}\nIP: ${info.ip}`,
            left: infoText.left,
            top: infoText.top,
            fontSize: 10,
            info: info
        });
        
        showAlert('Signature added to page ' + currentPage, 'success');
    });
};

// Add paraf (initials) to current page
const addParafToPage = (position = 'corner') => {
    if (!parafImage) {
        showAlert('Please add your initials first', 'error');
        return;
    }
    
    if (!pdfDocument) {
        showAlert('Please upload a document first', 'error');
        return;
    }
    
    fabric.Image.fromURL(parafImage, (img) => {
        const parafId = Date.now().toString();
        const info = createSignatureInfo();
        
        // Set initial size and position
        const maxHeight = 50;
        const ratio = img.width / img.height;
        const newHeight = Math.min(img.height, maxHeight);
        const newWidth = newHeight * ratio;
        
        let left = 50;
        let top = 50;
        
        // Position at corner of the page if requested
        if (position === 'corner') {
            left = fabricCanvas.width - 100;
            top = fabricCanvas.height - 80;
        }
        
        img.set({
            left: left,
            top: top,
            scaleX: newWidth / img.width,
            scaleY: newHeight / img.height,
            cornerColor: '#4361ee',
            cornerSize: 10,
            transparentCorners: false,
            borderColor: '#4361ee',
            signatureId: parafId,
            signatureType: 'paraf'
        });
        
        // Add the signature info as text (smaller for paraf)
        const infoText = new fabric.Text(`${info.date.split(' ')[0]}`, {
            left: left,
            top: top + (newHeight * img.scaleY) + 5,
            fontSize: 8,
            fill: '#666666',
            fontFamily: 'Arial',
            signatureId: parafId,
            signatureType: 'info',
            selectable: false
        });
        
        fabricCanvas.add(img);
        fabricCanvas.add(infoText);
        fabricCanvas.setActiveObject(img);
        
        // Store signature data
        if (!signatures[currentPage]) {
            signatures[currentPage] = [];
        }
        
        // Add event listener for object modification
        img.on('modified', function() {
            // Update the info text position when paraf moves
            const sigId = this.signatureId;
            const infoObj = fabricCanvas.getObjects().find(o => 
                o.signatureId === sigId && o.signatureType === 'info');
            
            if (infoObj) {
                infoObj.set({
                    left: this.left,
                    top: this.top + (this.height * this.scaleY) + 5
                });
                fabricCanvas.renderAll();
                
                // Also update the stored position
                const pageSignatures = signatures[currentPage] || [];
                const signatureIndex = pageSignatures.findIndex(s => s.id === sigId);
                
                if (signatureIndex !== -1) {
                    signatures[currentPage][signatureIndex].left = this.left;
                    signatures[currentPage][signatureIndex].top = this.top;
                    signatures[currentPage][signatureIndex].scaleX = this.scaleX;
                    signatures[currentPage][signatureIndex].scaleY = this.scaleY;
                    signatures[currentPage][signatureIndex].angle = this.angle;
                    
                    // Update info position
                    const infoIndex = pageSignatures.findIndex(s => s.id === sigId && s.type === 'info');
                    if (infoIndex !== -1) {
                        signatures[currentPage][infoIndex].left = infoObj.left;
                        signatures[currentPage][infoIndex].top = infoObj.top;
                    }
                }
            }
        });
        
        signatures[currentPage].push({
            id: parafId,
            type: 'paraf',
            image: parafImage,
            left: img.left,
            top: img.top,
            scaleX: img.scaleX,
            scaleY: img.scaleY,
            angle: img.angle || 0,
            info: info
        });
        
        // Add info text object to signatures array
        signatures[currentPage].push({
            id: parafId,
            type: 'info',
            text: `${info.date.split(' ')[0]}`,
            left: infoText.left,
            top: infoText.top,
            fontSize: 8,
            info: info
        });
        
        showAlert('Initials added to page ' + currentPage, 'success');
    });
};

// Add paraf to all pages
const addParafToAllPages = async () => {
    if (!parafImage) {
        showAlert('Please add your initials first', 'error');
        return;
    }
    
    if (!pdfDocument) {
        showAlert('Please upload a document first', 'error');
        return;
    }
    
    // Save current page to return to it later
    const oldPage = currentPage;
    
    // Show loading
    documentLoading.style.display = 'flex';
    
    try {
        // Process each page
        for (let i = 1; i <= totalPages; i++) {
            // Update progress
            await renderPage(i);
            
            // Add paraf to this page (in the corner)
            addParafToPage('corner');
            
            // Small delay to allow rendering
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Return to original page
        await renderPage(oldPage);
        
        documentLoading.style.display = 'none';
        showAlert(`Initials added to all ${totalPages} pages`, 'success');
    } catch (error) {
        console.error('Error adding initials to all pages:', error);
        documentLoading.style.display = 'none';
        showAlert('Error adding initials: ' + error.message, 'error');
    }
};

// Load signatures for specific page
const loadSignaturesForPage = (pageNumber) => {
    const pageSignatures = signatures[pageNumber] || [];
    
    pageSignatures.forEach(signature => {
        if (signature.type === 'full' || signature.type === 'paraf') {
            // Load image
            fabric.Image.fromURL(signature.image, (img) => {
                img.set({
                    left: signature.left,
                    top: signature.top,
                    scaleX: signature.scaleX,
                    scaleY: signature.scaleY,
                    angle: signature.angle,
                    cornerColor: '#4361ee',
                    cornerSize: signature.type === 'paraf' ? 10 : 12,
                    transparentCorners: false,
                    borderColor: '#4361ee',
                    signatureId: signature.id,
                    signatureType: signature.type
                });
                
                // Add event listener for object modification
                img.on('modified', function() {
                    // Update the info text position when signature moves
                    const sigId = this.signatureId;
                    const infoObj = fabricCanvas.getObjects().find(o => 
                        o.signatureId === sigId && o.signatureType === 'info');
                    
                    if (infoObj) {
                        infoObj.set({
                            left: this.left,
                            top: this.top + (this.height * this.scaleY) + 5
                        });
                        fabricCanvas.renderAll();
                        
                        // Update stored signature position
                        const pageSignatures = signatures[currentPage] || [];
                        const signatureIndex = pageSignatures.findIndex(s => s.id === sigId && (s.type === 'full' || s.type === 'paraf'));
                        
                        if (signatureIndex !== -1) {
                            signatures[currentPage][signatureIndex].left = this.left;
                            signatures[currentPage][signatureIndex].top = this.top;
                            signatures[currentPage][signatureIndex].scaleX = this.scaleX;
                            signatures[currentPage][signatureIndex].scaleY = this.scaleY;
                            signatures[currentPage][signatureIndex].angle = this.angle;
                            
                            // Update info position
                            const infoIndex = pageSignatures.findIndex(s => s.id === sigId && s.type === 'info');
                            if (infoIndex !== -1) {
                                signatures[currentPage][infoIndex].left = infoObj.left;
                                signatures[currentPage][infoIndex].top = infoObj.top;
                            }
                        }
                    }
                });
                
                fabricCanvas.add(img);
            });
        } else if (signature.type === 'info') {
            // Add info text
            const infoText = new fabric.Text(signature.text, {
                left: signature.left,
                top: signature.top,
                fontSize: signature.fontSize || 10,
                fill: '#666666',
                fontFamily: 'Arial',
                signatureId: signature.id,
                signatureType: 'info',
                selectable: false
            });
            
            fabricCanvas.add(infoText);
        }
    });
    
    fabricCanvas.renderAll();
};

// Save signed document
const saveSignedDocument = async () => {
    if (!pdfDocument || !Object.keys(signatures).length) {
        showAlert('Please add at least one signature to the document', 'error');
        return;
    }
    
    progressBar.style.display = 'block';
    progress.style.width = '0%';
    
    try {
        // Get original PDF as ArrayBuffer
        const fileReader = new FileReader();
        const arrayBufferPromise = new Promise((resolve, reject) => {
            fileReader.onload = () => resolve(fileReader.result);
            fileReader.onerror = reject;
        });
        
        fileReader.readAsArrayBuffer(currentPdfFile);
        const pdfBytes = await arrayBufferPromise;
        
        // Load PDF document with PDF-lib
        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.load(pdfBytes);
        
        // Create a temporary canvas for rendering signatures
        const tempCanvas = document.createElement('canvas');
        const tempContext = tempCanvas.getContext('2d');
        
        // Process each page with signatures
        const signedPageNumbers = Object.keys(signatures).map(Number).sort((a, b) => a - b);
        
        for (let i = 0; i < signedPageNumbers.length; i++) {
            const pageNum = signedPageNumbers[i];
            
            // Update progress
            progress.style.width = `${((i + 1) / signedPageNumbers.length) * 100}%`;
            
            if (!pdfPages[pageNum - 1]) continue;
            
            const pageData = pdfPages[pageNum - 1];
            const pageSignatures = signatures[pageNum] || [];
            
            if (pageSignatures.length === 0) continue;
            
            // Get the PDF page dimensions
            const pdfPage = pdfDoc.getPage(pageNum - 1);
            const { width: pdfWidth, height: pdfHeight } = pdfPage.getSize();
            
            // Set canvas dimensions to match PDF page size
            tempCanvas.width = pdfWidth;
            tempCanvas.height = pdfHeight;
            
            // Clear the canvas
            tempContext.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            // Create a fabric canvas for signatures
            const sigCanvas = new fabric.StaticCanvas(tempCanvas);
            sigCanvas.clear();
            
            // Get only image signatures (not info text)
            const imageSignatures = pageSignatures.filter(sig => sig.type === 'full' || sig.type === 'paraf');
            const infoTexts = pageSignatures.filter(sig => sig.type === 'info');
            
            // Add each signature to the canvas
            for (const signature of imageSignatures) {
                await new Promise(resolve => {
                    fabric.Image.fromURL(signature.image, (img) => {
                        // Convert coordinates from fabric canvas viewport to PDF coordinates
                        // This ensures signatures appear in exactly the same position in the PDF
                        const pdfLeft = signature.left * (pdfWidth / pageData.viewport.width);
                        const pdfTop = signature.top * (pdfHeight / pageData.viewport.height);
                        const pdfScaleX = signature.scaleX * (pdfWidth / pageData.viewport.width);
                        const pdfScaleY = signature.scaleY * (pdfHeight / pageData.viewport.height);
                        
                        img.set({
                            left: pdfLeft,
                            top: pdfTop,
                            scaleX: pdfScaleX,
                            scaleY: pdfScaleY,
                            angle: signature.angle,
                            originX: 'left',
                            originY: 'top'
                        });
                        
                        sigCanvas.add(img);
                        resolve();
                    });
                });
            }
            
            // Add each info text to the canvas
            for (const info of infoTexts) {
                const infoText = new fabric.Text(info.text, {
                    left: info.left * (pdfWidth / pageData.viewport.width),
                    top: info.top * (pdfHeight / pageData.viewport.height),
                    fontSize: info.fontSize * (pdfWidth / pageData.viewport.width),
                    fill: '#666666',
                    fontFamily: 'Arial'
                });
                
                sigCanvas.add(infoText);
            }
            
            sigCanvas.renderAll();
            
            // Get the PNG image of the signatures
            const signaturesPng = tempCanvas.toDataURL('image/png');
            
            // Embed the PNG in the PDF
            const signaturesPngBytes = await fetch(signaturesPng).then(res => res.arrayBuffer());
            const pngImage = await pdfDoc.embedPng(signaturesPngBytes);
            
            // Draw the signature layer on the PDF page
            pdfPage.drawImage(pngImage, {
                x: 0,
                y: 0,
                width: pdfWidth,
                height: pdfHeight,
            });
        }
        
        // Generate filename with date
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const filename = `signed_document_${dateStr}.pdf`;
        
        // Save the PDF
        const modifiedPdfBytes = await pdfDoc.save();
        
        // Create a Blob and download
        const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
        
        downloadFile(blob, filename);
        
        progressBar.style.display = 'none';
        showAlert('Document signed and saved successfully!', 'success');
        
    } catch (error) {
        console.error('Error saving document:', error);
        progressBar.style.display = 'none';
        showAlert('Error saving document: ' + error.message, 'error');
    }
};

// Download file
const downloadFile = (content, filename) => {
    // For PDF files (Blob)
    if (content instanceof Blob) {
        const url = URL.createObjectURL(content);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a); // Needed for Firefox
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 100);
        return;
    }
    
    // For HTML or text content
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 100);
};

// Show alert message
const showAlert = (message, type) => {
    const alert = type === 'success' ? successAlert : errorAlert;
    alert.textContent = message;
    alert.style.display = 'block';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, 3000);
};

// Event Listeners for Signature Tab
uploadOption.addEventListener('click', () => {
    uploadOption.classList.add('active');
    drawOption.classList.remove('active');
    uploadContainer.style.display = 'block';
    drawContainer.style.display = 'none';
});

drawOption.addEventListener('click', () => {
    drawOption.classList.add('active');
    uploadOption.classList.remove('active');
    drawContainer.style.display = 'flex';
    uploadContainer.style.display = 'none';
    
    // Force canvas resize when switching to draw mode
    setTimeout(() => {
        const canvas = document.getElementById('signaturePad');
        const ctx = canvas.getContext('2d');
        
        // Reset canvas dimensions
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        canvas.width = width;
        canvas.height = height;
        
        // Reset line style
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, 50);
});

// Event Listeners for Paraf Tab
uploadParafOption.addEventListener('click', () => {
    uploadParafOption.classList.add('active');
    drawParafOption.classList.remove('active');
    uploadParafContainer.style.display = 'block';
    drawParafContainer.style.display = 'none';
});

drawParafOption.addEventListener('click', () => {
    drawParafOption.classList.add('active');
    uploadParafOption.classList.remove('active');
    drawParafContainer.style.display = 'flex';
    uploadParafContainer.style.display = 'none';
    
    // Force canvas resize when switching to draw mode
    setTimeout(() => {
        const canvas = document.getElementById('parafPad');
        const ctx = canvas.getContext('2d');
        
        // Reset canvas dimensions
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        canvas.width = width;
        canvas.height = height;
        
        // Reset line style
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, 50);
});

browseSignature.addEventListener('click', () => {
    signatureUpload.click();
});

signatureUpload.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = (event) => {
            signatureImage = event.target.result;
            signaturePreview.src = signatureImage;
            signaturePreview.style.display = 'inline-block';
            showAlert('Signature uploaded successfully!', 'success');
        };
        
        reader.readAsDataURL(file);
    }
});

browseParaf.addEventListener('click', () => {
    parafUpload.click();
});

parafUpload.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = (event) => {
            parafImage = event.target.result;
            parafPreview.src = parafImage;
            parafPreview.style.display = 'inline-block';
            showAlert('Initials uploaded successfully!', 'success');
        };
        
        reader.readAsDataURL(file);
    }
});

browseDocument.addEventListener('click', () => {
    documentUpload.click();
});

documentUpload.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        const file = e.target.files[0];
        if (file.type === 'application/pdf') {
            loadPdfDocument(file);
        } else {
            showAlert('Please upload a PDF document', 'error');
        }
    }
});

// Drag and drop handlers for signature
signatureDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    signatureDropzone.classList.add('active');
});

signatureDropzone.addEventListener('dragleave', () => {
    signatureDropzone.classList.remove('active');
});

signatureDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    signatureDropzone.classList.remove('active');
    
    if (e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                signatureImage = event.target.result;
                signaturePreview.src = signatureImage;
                signaturePreview.style.display = 'inline-block';
                showAlert('Signature uploaded successfully!', 'success');
            };
            
            reader.readAsDataURL(file);
        } else {
            showAlert('Please drop an image file', 'error');
        }
    }
});

// Drag and drop handlers for paraf
parafDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    parafDropzone.classList.add('active');
});

parafDropzone.addEventListener('dragleave', () => {
    parafDropzone.classList.remove('active');
});

parafDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    parafDropzone.classList.remove('active');
    
    if (e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                parafImage = event.target.result;
                parafPreview.src = parafImage;
                parafPreview.style.display = 'inline-block';
                showAlert('Initials uploaded successfully!', 'success');
            };
            
            reader.readAsDataURL(file);
        } else {
            showAlert('Please drop an image file', 'error');
        }
    }
});

// Drag and drop handlers for document
documentDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    documentDropzone.classList.add('active');
});

documentDropzone.addEventListener('dragleave', () => {
    documentDropzone.classList.remove('active');
});

documentDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    documentDropzone.classList.remove('active');
    
    if (e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type === 'application/pdf') {
            loadPdfDocument(file);
        } else {
            showAlert('Please drop a PDF document', 'error');
        }
    }
});

// Initialize app
window.addEventListener('DOMContentLoaded', initApp);

// Reinitialize signature pad when window is resized
window.addEventListener('resize', () => {
    if (drawOption.classList.contains('active')) {
        const canvas = document.getElementById('signaturePad');
        const ctx = canvas.getContext('2d');
        
        // Save current drawing
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Resize canvas
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        
        // Reset line style
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Restore drawing
        ctx.putImageData(imageData, 0, 0);
    }
    
    if (drawParafOption.classList.contains('active')) {
        const canvas = document.getElementById('parafPad');
        const ctx = canvas.getContext('2d');
        
        // Save current drawing
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Resize canvas
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        
        // Reset line style
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Restore drawing
        ctx.putImageData(imageData, 0, 0);
    }
});