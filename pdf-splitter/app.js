/**
 * PDF Splitter Application
 * Browser-based PDF splitting tool using PDF.js and pdf-lib
 */

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Application State
const state = {
    pdfDoc: null,
    pdfBytes: null,
    fileName: '',
    totalPages: 0,
    selectedPages: new Set(),
    renderedPages: new Map()
};

// DOM Elements
const elements = {
    uploadSection: document.getElementById('upload-section'),
    uploadArea: document.getElementById('upload-area'),
    fileInput: document.getElementById('file-input'),
    previewSection: document.getElementById('preview-section'),
    fileName: document.getElementById('file-name'),
    pageCount: document.getElementById('page-count'),
    pagesGrid: document.getElementById('pages-grid'),
    selectedCount: document.getElementById('selected-count'),
    splitBtn: document.getElementById('split-btn'),
    splitMode: document.getElementById('split-mode'),
    selectAllBtn: document.getElementById('select-all-btn'),
    clearSelectionBtn: document.getElementById('clear-selection-btn'),
    newFileBtn: document.getElementById('new-file-btn'),
    pageRange: document.getElementById('page-range'),
    applyRangeBtn: document.getElementById('apply-range-btn'),
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingText: document.getElementById('loading-text')
};

// ===================================
// Event Listeners
// ===================================

// Upload area click
elements.uploadArea.addEventListener('click', () => {
    elements.fileInput.click();
});

// File input change
elements.fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
});

// Drag and drop
elements.uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.uploadArea.classList.add('dragover');
});

elements.uploadArea.addEventListener('dragleave', () => {
    elements.uploadArea.classList.remove('dragover');
});

elements.uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
        handleFileUpload(file);
    }
});

// Toolbar buttons
elements.selectAllBtn.addEventListener('click', selectAllPages);
elements.clearSelectionBtn.addEventListener('click', clearSelection);
elements.newFileBtn.addEventListener('click', resetApp);

// Range input
elements.applyRangeBtn.addEventListener('click', applyPageRange);
elements.pageRange.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') applyPageRange();
});

// Split button
elements.splitBtn.addEventListener('click', splitPDF);

// ===================================
// File Handling
// ===================================

async function handleFileUpload(file) {
    if (file.type !== 'application/pdf') {
        alert('PDFファイルを選択してください。');
        return;
    }

    showLoading('PDFを読み込み中...');

    try {
        const arrayBuffer = await file.arrayBuffer();
        state.pdfBytes = new Uint8Array(arrayBuffer);
        state.fileName = file.name;

        // Load PDF with PDF.js for rendering
        state.pdfDoc = await pdfjsLib.getDocument({ data: state.pdfBytes.slice() }).promise;
        state.totalPages = state.pdfDoc.numPages;

        // Update UI
        elements.fileName.textContent = state.fileName;
        elements.pageCount.textContent = `${state.totalPages} ページ`;

        // Render page thumbnails
        await renderThumbnails();

        // Show preview section
        elements.uploadSection.classList.add('hidden');
        elements.previewSection.classList.remove('hidden');

    } catch (error) {
        console.error('Error loading PDF:', error);
        alert('PDFの読み込みに失敗しました。ファイルが破損していないか確認してください。');
    } finally {
        hideLoading();
    }
}

// ===================================
// Thumbnail Rendering
// ===================================

async function renderThumbnails() {
    elements.pagesGrid.innerHTML = '';
    state.selectedPages.clear();
    state.renderedPages.clear();

    const thumbnailWidth = 200;

    for (let pageNum = 1; pageNum <= state.totalPages; pageNum++) {
        const pageCard = createPageCard(pageNum);
        elements.pagesGrid.appendChild(pageCard);

        // Render page asynchronously
        renderPageThumbnail(pageNum, thumbnailWidth);
    }

    updateSelectionUI();
}

function createPageCard(pageNum) {
    const card = document.createElement('div');
    card.className = 'page-card';
    card.dataset.page = pageNum;

    const canvas = document.createElement('canvas');
    card.appendChild(canvas);

    const pageNumber = document.createElement('div');
    pageNumber.className = 'page-number';
    pageNumber.textContent = `${pageNum}`;
    card.appendChild(pageNumber);

    const checkbox = document.createElement('div');
    checkbox.className = 'page-checkbox';
    card.appendChild(checkbox);

    card.addEventListener('click', () => togglePageSelection(pageNum));

    return card;
}

async function renderPageThumbnail(pageNum, width) {
    try {
        const page = await state.pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        const scale = width / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        const card = elements.pagesGrid.querySelector(`[data-page="${pageNum}"]`);
        const canvas = card.querySelector('canvas');
        const context = canvas.getContext('2d');

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        await page.render({
            canvasContext: context,
            viewport: scaledViewport
        }).promise;

        state.renderedPages.set(pageNum, true);
    } catch (error) {
        console.error(`Error rendering page ${pageNum}:`, error);
    }
}

// ===================================
// Page Selection
// ===================================

function togglePageSelection(pageNum) {
    if (state.selectedPages.has(pageNum)) {
        state.selectedPages.delete(pageNum);
    } else {
        state.selectedPages.add(pageNum);
    }
    updateSelectionUI();
}

function selectAllPages() {
    for (let i = 1; i <= state.totalPages; i++) {
        state.selectedPages.add(i);
    }
    updateSelectionUI();
}

function clearSelection() {
    state.selectedPages.clear();
    updateSelectionUI();
}

function applyPageRange() {
    const rangeInput = elements.pageRange.value.trim();
    if (!rangeInput) return;

    try {
        const pages = parsePageRange(rangeInput);
        state.selectedPages.clear();
        pages.forEach(p => {
            if (p >= 1 && p <= state.totalPages) {
                state.selectedPages.add(p);
            }
        });
        updateSelectionUI();
        elements.pageRange.value = '';
    } catch (error) {
        alert('無効なページ範囲です。例: 1-3, 5, 7-10');
    }
}

function parsePageRange(rangeStr) {
    const pages = new Set();
    const parts = rangeStr.split(',');

    for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.includes('-')) {
            const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()));
            if (isNaN(start) || isNaN(end)) throw new Error('Invalid range');
            for (let i = start; i <= end; i++) {
                pages.add(i);
            }
        } else {
            const num = parseInt(trimmed);
            if (isNaN(num)) throw new Error('Invalid number');
            pages.add(num);
        }
    }

    return Array.from(pages).sort((a, b) => a - b);
}

function updateSelectionUI() {
    // Update page cards
    elements.pagesGrid.querySelectorAll('.page-card').forEach(card => {
        const pageNum = parseInt(card.dataset.page);
        if (state.selectedPages.has(pageNum)) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });

    // Update selection count
    elements.selectedCount.textContent = state.selectedPages.size;

    // Update split button
    elements.splitBtn.disabled = state.selectedPages.size === 0;
}

// ===================================
// PDF Splitting
// ===================================

async function splitPDF() {
    if (state.selectedPages.size === 0) return;

    const mode = elements.splitMode.value;
    showLoading('PDFを分割中...');

    try {
        const { PDFDocument } = PDFLib;
        const srcDoc = await PDFDocument.load(state.pdfBytes);
        const sortedPages = Array.from(state.selectedPages).sort((a, b) => a - b);

        if (mode === 'single') {
            // Create single PDF with selected pages
            await createSinglePDF(srcDoc, sortedPages);
        } else {
            // Create individual PDFs for each page
            await createIndividualPDFs(srcDoc, sortedPages);
        }

    } catch (error) {
        console.error('Error splitting PDF:', error);
        alert('PDFの分割に失敗しました。');
    } finally {
        hideLoading();
    }
}

async function createSinglePDF(srcDoc, pages) {
    const { PDFDocument } = PDFLib;
    const newDoc = await PDFDocument.create();

    for (const pageNum of pages) {
        const [copiedPage] = await newDoc.copyPages(srcDoc, [pageNum - 1]);
        newDoc.addPage(copiedPage);
    }

    const pdfBytes = await newDoc.save();
    const baseName = state.fileName.replace('.pdf', '');
    downloadFile(pdfBytes, `${baseName}_split.pdf`, 'application/pdf');
}

async function createIndividualPDFs(srcDoc, pages) {
    const { PDFDocument } = PDFLib;
    const baseName = state.fileName.replace('.pdf', '');

    // If more than one file, create a zip
    if (pages.length > 1) {
        // For simplicity, download each file individually
        for (let i = 0; i < pages.length; i++) {
            const pageNum = pages[i];
            elements.loadingText.textContent = `ページ ${pageNum} を処理中... (${i + 1}/${pages.length})`;

            const newDoc = await PDFDocument.create();
            const [copiedPage] = await newDoc.copyPages(srcDoc, [pageNum - 1]);
            newDoc.addPage(copiedPage);

            const pdfBytes = await newDoc.save();
            downloadFile(pdfBytes, `${baseName}_page${pageNum}.pdf`, 'application/pdf');

            // Small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    } else {
        const pageNum = pages[0];
        const newDoc = await PDFDocument.create();
        const [copiedPage] = await newDoc.copyPages(srcDoc, [pageNum - 1]);
        newDoc.addPage(copiedPage);

        const pdfBytes = await newDoc.save();
        downloadFile(pdfBytes, `${baseName}_page${pageNum}.pdf`, 'application/pdf');
    }
}

function downloadFile(data, filename, mimeType) {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ===================================
// App Reset
// ===================================

function resetApp() {
    state.pdfDoc = null;
    state.pdfBytes = null;
    state.fileName = '';
    state.totalPages = 0;
    state.selectedPages.clear();
    state.renderedPages.clear();

    elements.pagesGrid.innerHTML = '';
    elements.fileInput.value = '';
    elements.pageRange.value = '';

    elements.previewSection.classList.add('hidden');
    elements.uploadSection.classList.remove('hidden');
}

// ===================================
// Loading UI
// ===================================

function showLoading(text = '処理中...') {
    elements.loadingText.textContent = text;
    elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingOverlay.classList.add('hidden');
}

// ===================================
// Initialize
// ===================================

console.log('PDF Splitter initialized');
