import { MODELS, thumbUrl, pageUrl } from './models.js';

const grid = document.getElementById('grid');

const arrow =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

grid.innerHTML = MODELS.map((m, i) => {
  const idx = String(i + 1).padStart(2, '0');
  return `
    <a class="tile" href="${pageUrl(m)}" data-accent="${m.accent}" style="--i:${i}"
       aria-label="${escapeHtml(m.name)}: open 3D viewer">
      <div class="tile-media">
        <img src="${thumbUrl(m)}" alt="" width="512" height="512" loading="${i < 3 ? 'eager' : 'lazy'}" decoding="async" />
        <span class="tile-index">${idx} / ${String(MODELS.length).padStart(2, '0')}</span>
        <span class="tile-chip">${escapeHtml(m.category)}</span>
      </div>
      <div class="tile-body">
        <h3>${escapeHtml(m.name)}</h3>
        <p>${escapeHtml(m.description)}</p>
        <div class="tile-meta">
          <span class="specs">
            <span>FBX · PBR</span>
            <span>${m.sizeMB} MB</span>
          </span>
          <span class="tile-cta">View 3D ${arrow}</span>
        </div>
      </div>
    </a>`;
}).join('');

// Cursor-tracking spotlight on tiles (pointer devices only).
if (window.matchMedia('(hover: hover)').matches) {
  grid.addEventListener('pointermove', (e) => {
    const tile = e.target.closest('.tile');
    if (!tile) return;
    const r = tile.getBoundingClientRect();
    tile.style.setProperty('--mx', `${e.clientX - r.left}px`);
    tile.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
}
