/* Viewer complet utilisant pdf.mjs/pdf.worker.mjs
   Place pdf.mjs et pdf.worker.mjs dans ./pdfjs/
   Place numero_1.pdf dans le même dossier que cette page
   Serveur requis (python -m http.server, live-server, etc.)
*/

import * as pdfjsLib from '../pdfjs/pdf.mjs';

// indiquer le worker (important : chemin relatif à la page HTML)
pdfjsLib.GlobalWorkerOptions.workerSrc = '../pdfjs/pdf.worker.mjs';

const container = document.getElementById('pages');
const tocEl = document.getElementById('toc');
const thumbsEl = document.getElementById('thumbs');

const statusEl = document.getElementById('status');
const pageNumInput = document.getElementById('page-num');
const pageCountEl = document.getElementById('page-count');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const zoomInput = document.getElementById('zoom');
const zoomIn = document.getElementById('zoom-in');
const zoomOut = document.getElementById('zoom-out');
const fitWidthBtn = document.getElementById('fit-width');
const downloadBtn = document.getElementById('download');

let pdfDoc = null;
let currentPage = 1;
let numPages = 0;
let scale = parseFloat(zoomInput.value) || 1.6;
const RENDERED = new Map(); // pageNum -> canvas (for reuse)
const dpr = window.devicePixelRatio || 1;

/* UTIL: slugify simple */
function slugify(text){
  return text.toLowerCase()
    .replace(/[^\w\s-]/g,'')
    .trim()
    .replace(/\s+/g,'-');
}

/* Affiche message court */
function setStatus(text){
  statusEl.textContent = text;
}

/* Render d'une page dans un canvas (async) */
async function renderPage(pageNum) {
  const key = pageNum + '@' + scale;
  if (RENDERED.has(key)) {
    return RENDERED.get(key);
  }

  const page = await pdfDoc.getPage(pageNum);
  const dpr = window.devicePixelRatio || 1;

  // viewport logique (CSS)
  const viewport = page.getViewport({ scale });

  // viewport réel (haute résolution)
  const renderViewport = page.getViewport({ scale: scale * dpr });

  // wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'page-container';
  wrapper.id = 'page-' + pageNum;
  wrapper.dataset.page = pageNum;

  // canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // résolution réelle
  canvas.width  = Math.floor(renderViewport.width);
  canvas.height = Math.floor(renderViewport.height);

  // taille affichée
  canvas.style.width  = Math.floor(viewport.width) + 'px';
  canvas.style.height = Math.floor(viewport.height) + 'px';

  wrapper.appendChild(canvas);

  // rendu
  await page.render({
    canvasContext: ctx,
    viewport: renderViewport
  }).promise;

  RENDERED.set(key, { wrapper, canvas });
  return { wrapper, canvas, page };
}


/* Render visible pages: simple strategy -> render all pages sequentially (pour fiabilité) */
async function renderAllPages() {
  container.innerHTML = '';
  setStatus('Rendering…');
  const frag = document.createDocumentFragment();
  for (let i = 1; i <= numPages; i++) {
    const { wrapper } = await renderPage(i);
    frag.appendChild(wrapper);
  }
  container.appendChild(frag);
  setStatus('');
}

/* Render uniquement la page active (et une ou deux alentours) pour performance */
async function renderAround(pageNum) {
  // Clear container and append only few pages centered on current
  container.innerHTML = '';
  const start = Math.max(1, pageNum - 2);
  const end = Math.min(numPages, pageNum + 2);
  for (let i = start; i <= end; i++) {
    const { wrapper } = await renderPage(i);
    container.appendChild(wrapper);
  }
  // focus sur l current
  document.getElementById('page-' + pageNum)?.scrollIntoView({behavior:'smooth', block:'start'});
}

/* Générer miniatures (vignettes) */
async function generateThumbs() {
  thumbsEl.innerHTML = '';
  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const vp = page.getViewport({ scale: 0.2*dpr });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(vp.width);
    canvas.height = Math.floor(vp.height);
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    thumb.dataset.page = i;
    thumb.appendChild(canvas);
    thumb.title = 'Page ' + i;
    thumb.addEventListener('click', () => {
      goToPage(i);
    });
    thumbsEl.appendChild(thumb);
  }
}

/* Téléchargement simple */
downloadBtn.addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL_PDF;
  a.download = URL_PDF;
  a.click();
});

/* Pagination controls */
prevBtn.addEventListener('click', () => goToPage(currentPage - 1));
nextBtn.addEventListener('click', () => goToPage(currentPage + 1));
pageNumInput.addEventListener('change', () => {
  let v = parseInt(pageNumInput.value, 10);
  if (isNaN(v) || v < 1) v = 1;
  if (v > numPages) v = numPages;
  goToPage(v);
});

/* Zoom controls */
zoomIn.addEventListener('click', () => setZoom(scale + 0.2));
zoomOut.addEventListener('click', () => setZoom(Math.max(0.3, scale - 0.2)));
zoomInput.addEventListener('change', () => setZoom(parseFloat(zoomInput.value) || 1));
fitWidthBtn.addEventListener('click', fitWidth);

/* Ajuster zoom et re-render */
async function setZoom(newScale) {
  scale = Math.max(0.3, Math.min(4, newScale));
  zoomInput.value = scale.toFixed(2);

  // clear cached canvases pour l'ancien scale
  for (const k of Array.from(RENDERED.keys())) {
    if (!k.endsWith('@' + scale)) RENDERED.delete(k);
  }

  // rendre toutes les pages avec le nouveau scale
  await renderAllPages();
}


/* Fit width: calc scale to page width to container width for first page */
async function fitWidth() {
  const page = await pdfDoc.getPage(currentPage);
  const vp = page.getViewport({ scale: 1 });
  // viewer-wrap width available
  const wrap = document.getElementById('viewer-wrap');
  const available = Math.max(200, wrap.clientWidth - (wrap.clientWidth/3)); //80% of the dispolible width
  const newScale = Math.floor((available / vp.width) * 100) / 100;
  setZoom(newScale || 1);
}

/* Aller à une page */
async function goToPage(n) {
  if (n < 1) n = 1;
  if (n > numPages) n = numPages;
  currentPage = n;
  pageNumInput.value = n;

  // toujours rendre toutes les pages
  await renderAllPages();

  // scroll vers la page active
  const el = document.getElementById('page-' + n);
  if (el) {
    el.scrollIntoView({behavior:'smooth', block:'start'});
  }
}


/* EXTRACTION des titres (H1) - heuristique basée sur la taille des glyphes */
async function extractHeadings() {
  const headings = []; // {text, page, y, slug}
  for (let p = 1; p <= numPages; p++) {
    const page = await pdfDoc.getPage(p);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });
    const pageHeight = viewport.height;

    // Regrouper items par "ligne" en utilisant la coord y (transform[5])
    const lines = []; // {y, items: [{str, fontSize}]}
    textContent.items.forEach(item => {
      // approx font size (transform matrix[0] is scaleX; use hypot)
      const t = item.transform || [1,0,0,1,0,0];
      const fontSize = Math.hypot(t[0], t[1]);
      const y = Math.round((t[5] + Number.EPSILON) * 10) / 10; // arrondi
      // find line near same y
      let line = lines.find(l => Math.abs(l.y - y) < 4); // 4pt threshold
      if (!line) {
        line = { y, items: [] };
        lines.push(line);
      }
      line.items.push({ str: item.str, fontSize });
    });

    // pour chaque ligne concatène le texte et calcule taille moyenne
    const processedLines = lines.map(l => {
      const text = l.items.map(it => it.str).join(' ').trim();
      const avgSize = l.items.reduce((s, it) => s + it.fontSize, 0) / l.items.length;
      return { text, avgSize, y: l.y };
    }).filter(l => l.text.length > 1);

    if (processedLines.length === 0) continue;

    // calculer médiane des tailles pour la page
    const sizes = processedLines.map(l => l.avgSize).sort((a,b)=>a-b);
    const median = sizes[Math.floor(sizes.length / 2)] || sizes[0];

    // heuristique: titres = lignes >= median * 1.5 (ajustable)
    const threshold = median * 1.5;
    const TOP_CUTOFF = 0.3;

    processedLines.forEach(l => {
      if (p === 1 && l.y > pageHeight * (1 - TOP_CUTOFF)) return
      if (l.avgSize >= threshold && l.text.length < 120) {
        const text = l.text;
        const slug = slugify(text).slice(0,80) || ('p' + p + '-' + Math.random().toString(36).slice(2,8));
        headings.push({ text, page: p, y: l.y, slug });
      }
    });
  }

  // remplir TOC
  tocEl.innerHTML = '';
  if (headings.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No titles detected.';
    li.style.color = 'var(--muted)';
    tocEl.appendChild(li);
    return;
  }
  headings.forEach(h => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#page-' + h.page;
    a.className = 'summary-link';
    a.textContent = h.text;
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      goToPage(h.page);
      // focus the page container
      setTimeout(()=> {
        const el = document.getElementById('page-' + h.page);
        if (el) el.scrollIntoView({behavior:'smooth', block:'start'});
      }, 50);
    });
    li.appendChild(a);
    tocEl.appendChild(li);
  });
}

/* Initialisation */
async function init() {
  try {
    setStatus('Downloading PDF…');
    const loadingTask = pdfjsLib.getDocument(URL_PDF);
    pdfDoc = await loadingTask.promise;
    numPages = pdfDoc.numPages;
    pageCountEl.textContent = numPages;
    setStatus('PDF loaded with ' + numPages + ' pages');
    pageNumInput.value = 1;

    // pré-générer miniatures (asynchrone) et headings
    generateThumbs().catch(e => console.warn('Thumbs error', e));
    await extractHeadings();

    // render initial area
    await renderAllPages();
    setTimeout(() => {setStatus('');}, 1000);
  } catch (err) {
    console.error(err);
    setStatus('Error: ' + (err.message || err));
  }
}

/* kick off */
init();