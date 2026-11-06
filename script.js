/* Awesome Free AI Tools — site script (vanilla JS, no deps) */
(() => {
  'use strict';

  const STATE = {
    data: null,
    activeCategories: new Set(),
    query: '',
  };

  const REPO = 'mdruhulkuddus/awesome-free-ai-tools';
  const STAR_CACHE_KEY = 'aft.repoStats.v2';
  const STAR_CACHE_TTL = 60 * 60 * 1000;
  const THEME_KEY = 'aft.theme';
  const PILLS_KEY = 'aft.pillsExpanded';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---- Theme --------------------------------------------------- */
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
  }

  /* ---- Data load ---------------------------------------------- */
  async function loadData() {
    try {
      const res = await fetch('./data/tools.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      STATE.data = await res.json();
    } catch (err) {
      console.error('Failed to load tools.json', err);
      $('#categories-container').innerHTML =
        '<p style="color: var(--text-muted); padding: 32px 0;">Could not load tools data. Please refresh.</p>';
    }
  }

  /* ---- GitHub star & fork counts ------------------------------ */
  async function loadStarCount() {
    if (!$('#star-count') && !$('#fork-count')) return;
    const cached = readStarCache();
    if (cached !== null) {
      renderRepoStats(cached);
      return;
    }
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO}`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      const stats = { stars: json.stargazers_count || 0, forks: json.forks_count || 0 };
      writeStarCache(stats);
      renderRepoStats(stats);
    } catch (err) {
      // Silent fail — hide badge
    }
  }
  function renderRepoStats({ stars, forks }) {
    renderCount('#star-count', stars);
    renderCount('#fork-count', forks);
  }
  function renderCount(sel, n) {
    const el = $(sel);
    if (!el || typeof n !== 'number') return;
    el.textContent = formatStars(n);
    el.classList.add('visible');
  }
  function formatStars(n) {
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
    return String(n);
  }
  function readStarCache() {
    try {
      const raw = localStorage.getItem(STAR_CACHE_KEY);
      if (!raw) return null;
      const { ts, value } = JSON.parse(raw);
      if (Date.now() - ts > STAR_CACHE_TTL) return null;
      return value;
    } catch { return null; }
  }
  function writeStarCache(value) {
    try { localStorage.setItem(STAR_CACHE_KEY, JSON.stringify({ ts: Date.now(), value })); } catch {}
  }

  /* ---- HTML escape -------------------------------------------- */
  const escapeHtml = (s) => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  function highlight(text, query) {
    const safe = escapeHtml(text);
    if (!query) return safe;
    const tokens = query.trim().split(/\s+/).filter(t => t.length >= 2);
    if (tokens.length === 0) return safe;
    const escapedTokens = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const re = new RegExp('(' + escapedTokens.join('|') + ')', 'gi');
    return safe.replace(re, '<mark>$1</mark>');
  }

  /* ---- Featured rendering ------------------------------------- */
  function renderFeatured() {
    const f = STATE.data.featured;
    if (!f) return;

    const top3El = $('#top3-grid');
    top3El.innerHTML = f.top3.map((t, i) => `
      <article class="top3-card" data-idx="${i}">
        <div class="top3-head">
          <h3>${escapeHtml(t.name)}</h3>
          <span class="provider">${escapeHtml(t.provider || '')}</span>
        </div>
        <p class="best-at">${escapeHtml(t.bestAt)}</p>
        <div class="top3-details" hidden>
          <ul>
            ${t.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}
          </ul>
          <div class="unique-feature">
            <strong>Unique feature</strong>
            ${escapeHtml(t.uniqueFeature)}
          </div>
        </div>
        <div class="top3-actions">
          <button type="button" class="link-btn read-more-btn" aria-expanded="false">Read more →</button>
          <a class="visit-link" href="${escapeHtml(t.url)}" target="_blank" rel="noopener">Visit ↗</a>
        </div>
      </article>
    `).join('');

    top3El.addEventListener('click', (e) => {
      const btn = e.target.closest('.read-more-btn');
      if (!btn) return;
      const card = btn.closest('.top3-card');
      const details = card.querySelector('.top3-details');
      const expanded = card.classList.toggle('expanded');
      details.hidden = !expanded;
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      btn.textContent = expanded ? 'Show less ↑' : 'Read more →';
    });

    // Hidden sections (preserved for easy unhide)
    if ($('#alternatives-grid')) {
      $('#alternatives-grid').innerHTML = f.alternatives.map(t => `
        <article class="alt-card">
          <h4>${escapeHtml(t.name)}${t.provider ? ` <span style="color:var(--text-muted);font-weight:400;font-size:13px">· ${escapeHtml(t.provider)}</span>` : ''}</h4>
          <p class="best-at">${escapeHtml(t.bestAt)}</p>
          <p class="field"><strong>Free</strong>${escapeHtml(t.free)}</p>
          <p class="field"><strong>Catch</strong>${escapeHtml(t.catch)}</p>
          ${t.uniqueFeature ? `<p class="field" style="margin-top:14px"><strong>Edge</strong>${escapeHtml(t.uniqueFeature)}</p>` : ''}
          <p style="margin:16px 0 0"><a href="${escapeHtml(t.url)}" target="_blank" rel="noopener">Visit ${escapeHtml(t.name)} →</a></p>
        </article>
      `).join('');
    }

    const ct = f.comparisonTable;
    const tableEl = $('#comparison-table');
    if (tableEl && ct) {
      const head = `<thead><tr>${ct.headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>`;
      const body = `<tbody>${ct.rows.map(row =>
        `<tr>${row.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`
      ).join('')}</tbody>`;
      tableEl.innerHTML = head + body;
    }
  }

  /* ---- Trending now ------------------------------------------- */
  function renderTrending() {
    const t = STATE.data.trending;
    const section = $('#trending');
    if (!section || !t || !t.items.length) return;
    $('#trending-title').textContent = t.title;
    $('#trending-desc').textContent = t.description;
    $('#trending-grid').innerHTML = t.items.map(item => `
      <a class="trend-card" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.why)}</p>
        <span class="trend-free">${escapeHtml(item.free)}</span>
      </a>
    `).join('');
    const note = $('#trending-note');
    if (t.note) {
      note.textContent = t.note;
      note.hidden = false;
    }
    section.hidden = false;
  }

  /* ---- Removed tools ------------------------------------------ */
  function renderRemoved() {
    const r = STATE.data.removed;
    const section = $('#removed');
    if (!section || !r || !r.items.length) return;
    $('#removed-title').textContent = `${r.title} (${r.items.length})`;
    $('#removed-desc').textContent = r.description;
    $('#removed-table').innerHTML = `
      <thead><tr><th>Tool</th><th>What happened</th><th>Date</th></tr></thead>
      <tbody>${r.items.map(i =>
        `<tr><td>${escapeHtml(i.name)}</td><td>${escapeHtml(i.what)}</td><td>${escapeHtml(i.date)}</td></tr>`
      ).join('')}</tbody>`;
    section.hidden = false;
  }

  /* ---- Hero stats from data ----------------------------------- */
  function renderStats() {
    const m = STATE.data.meta || {};
    const tools = STATE.totalToolCount;
    const toolsLabel = Math.floor(tools / 10) * 10 + '+';
    const updated = m.lastUpdated
      ? new Date(m.lastUpdated + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      : '';
    const updatedFull = m.lastUpdated
      ? new Date(m.lastUpdated + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
      : '';
    $$('[data-stat="tools"]').forEach(el => { el.textContent = toolsLabel; });
    $$('[data-stat="categories"]').forEach(el => { el.textContent = STATE.data.categories.length; });
    if (updated) $$('[data-stat="updated"]').forEach(el => { el.textContent = updated; });
    if (updatedFull) $$('[data-stat="updated-full"]').forEach(el => { el.textContent = updatedFull; });
    const headerSearch = $('#header-search');
    if (headerSearch) headerSearch.placeholder = `Search ${toolsLabel} tools…`;
  }

  function initTableScrollHint() {
    $$('.table-scroll').forEach(wrap => {
      const update = () => {
        const canScroll = wrap.scrollWidth > wrap.clientWidth;
        const atEnd = wrap.scrollLeft + wrap.clientWidth >= wrap.scrollWidth - 4;
        wrap.classList.toggle('scrollable', canScroll && !atEnd);
      };
      wrap.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      update();
    });
  }

  /* ---- Category pills ----------------------------------------- */
  function renderCategoryPills() {
    const container = $('#category-pills');
    container.innerHTML = STATE.data.categories.map(c =>
      `<button type="button" class="pill" data-cat="${escapeHtml(c.id)}">${escapeHtml(c.name)}</button>`
    ).join('');
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.pill');
      if (!btn) return;
      const id = btn.dataset.cat;
      if (STATE.activeCategories.has(id)) {
        STATE.activeCategories.delete(id);
      } else {
        STATE.activeCategories.add(id);
      }
      syncPillStates();
      syncUrlHash();
      applyFilters();
    });
  }

  function syncPillStates() {
    $$('.pill').forEach(p => {
      p.classList.toggle('active', STATE.activeCategories.has(p.dataset.cat));
      p.setAttribute('aria-pressed', STATE.activeCategories.has(p.dataset.cat) ? 'true' : 'false');
    });
    const count = $('#pills-toggle-count');
    if (count) {
      const selected = STATE.activeCategories.size;
      count.textContent = selected ? `${selected} selected` : STATE.data.categories.length;
      count.classList.toggle('has-active', selected > 0);
    }
  }

  /* ---- Pills expand / collapse -------------------------------- */
  function setPillsExpanded(expanded) {
    const bar = $('#filter-bar');
    bar.classList.toggle('expanded', expanded);
    bar.classList.toggle('collapsed', !expanded);
    $('#pills-toggle').setAttribute('aria-expanded', expanded ? 'true' : 'false');
    try { localStorage.setItem(PILLS_KEY, expanded ? '1' : '0'); } catch {}
    if (!expanded) {
      // Bring the first selected category back into view in the single row.
      const active = $('.pill.active');
      const pills = $('#category-pills');
      pills.scrollLeft = active ? active.offsetLeft - pills.offsetLeft - 8 : 0;
    }
  }

  function bindPillsToggle() {
    const btn = $('#pills-toggle');
    if (!btn) return;
    let saved = null;
    try { saved = localStorage.getItem(PILLS_KEY); } catch {}
    setPillsExpanded(saved === '1');
    btn.addEventListener('click', () => {
      setPillsExpanded(!$('#filter-bar').classList.contains('expanded'));
    });
  }

  /* ---- Categories + tools ------------------------------------- */
  function renderCategories() {
    const container = $('#categories-container');
    container.innerHTML = STATE.data.categories.map(cat => `
      <section class="category-section" data-cat="${escapeHtml(cat.id)}">
        <header class="category-header" id="cat-${escapeHtml(cat.id)}">
          <h2>${escapeHtml(cat.name)}</h2>
          <p>${escapeHtml(cat.description)}</p>
          ${(cat.notes || []).map(n => `<p class="category-note">${escapeHtml(n)}</p>`).join('')}
        </header>
        <div class="tool-grid">
          ${cat.tools.map(tool => renderToolCard(tool)).join('')}
        </div>
      </section>
    `).join('');
  }

  function renderToolCard(tool) {
    const url = escapeHtml(tool.url);
    return `
      <a class="tool-card" href="${url}" target="_blank" rel="noopener"
         data-name="${escapeHtml(tool.name.toLowerCase())}"
         data-text="${escapeHtml((tool.name + ' ' + (tool.description||'') + ' ' + (tool.free||'') + ' ' + (tool.bestFor||'') + ' ' + (tool.catch||'')).toLowerCase())}">
        <svg class="tool-arrow" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none" d="M5 11 11 5M6.5 5H11v4.5"/>
        </svg>
        <h3 class="tool-name">${escapeHtml(tool.name)}</h3>
        <p class="tool-desc">${escapeHtml(tool.description || '')}</p>
        <div class="tool-fields">
          ${tool.free ? `<div class="tool-field tool-field--free"><span class="tool-field-label">Free</span>${escapeHtml(tool.free)}</div>` : ''}
          ${tool.bestFor ? `<div class="tool-field tool-field--best"><span class="tool-field-label">Best</span>${escapeHtml(tool.bestFor)}</div>` : ''}
          ${tool.catch ? `<div class="tool-field tool-field--catch"><span class="tool-field-label">Catch</span>${escapeHtml(tool.catch)}</div>` : ''}
        </div>
      </a>
    `;
  }

  /* ---- Filtering ---------------------------------------------- */
  function applyFilters() {
    const q = STATE.query.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    const cats = STATE.activeCategories;
    const filteringCats = cats.size > 0;

    let visibleTotal = 0;

    $$('.category-section').forEach(section => {
      const id = section.dataset.cat;
      const catVisible = !filteringCats || cats.has(id);
      let cardsVisible = 0;

      section.querySelectorAll('.tool-card').forEach(card => {
        const text = card.dataset.text;
        const matches = !q || tokens.every(t => text.includes(t));
        const show = catVisible && matches;
        card.style.display = show ? '' : 'none';
        if (show) cardsVisible++;
      });

      section.style.display = (catVisible && cardsVisible > 0) ? '' : 'none';
      visibleTotal += cardsVisible;
    });

    $('#result-count').textContent = visibleTotal === STATE.totalToolCount
      ? `${visibleTotal} tools`
      : `Showing ${visibleTotal} of ${STATE.totalToolCount} tools`;

    const hasFilters = q.length > 0 || cats.size > 0;
    $('#clear-filters').hidden = !hasFilters;
    $('#empty-state').hidden = visibleTotal > 0;
  }

  /* ---- Search input wiring ------------------------------------ */
  function bindSearch() {
    const headerSearch = $('#header-search');
    const filterSearch = $('#filter-search');
    const mobileSearch = $('#mobile-search');

    const setQuery = (val) => {
      STATE.query = val;
      if (headerSearch && headerSearch.value !== val) headerSearch.value = val;
      if (filterSearch && filterSearch.value !== val) filterSearch.value = val;
      if (mobileSearch && mobileSearch.value !== val) mobileSearch.value = val;
      applyFilters();
    };

    [headerSearch, filterSearch, mobileSearch].forEach(input => {
      if (!input) return;
      input.addEventListener('input', (e) => setQuery(e.target.value));
    });

    $('#clear-filters').addEventListener('click', () => {
      STATE.activeCategories.clear();
      syncPillStates();
      syncUrlHash();
      setQuery('');
    });

    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        focusSearch();
      } else if (e.key === '/' && !isTypingTarget(e.target)) {
        e.preventDefault();
        focusSearch();
      } else if (e.key === 'Escape') {
        if (STATE.query) {
          setQuery('');
        } else if (document.activeElement && document.activeElement.matches('input[type=search]')) {
          document.activeElement.blur();
        }
      }
    });
  }

  function focusSearch() {
    const visible = $('#header-search')?.offsetParent !== null
      ? $('#header-search')
      : $('#filter-search');
    if (visible) {
      visible.focus();
      visible.select();
    }
  }

  function isTypingTarget(el) {
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
  }

  /* ---- URL hash sync ------------------------------------------ */
  function syncUrlHash() {
    const cats = Array.from(STATE.activeCategories);
    const hash = cats.length ? '#filter=' + cats.join(',') : '';
    history.replaceState(null, '', window.location.pathname + window.location.search + hash);
  }

  function readUrlHash() {
    const m = /#filter=([^&]+)/.exec(window.location.hash);
    if (!m) return;
    const ids = decodeURIComponent(m[1]).split(',').filter(Boolean);
    const valid = new Set(STATE.data.categories.map(c => c.id));
    ids.forEach(id => { if (valid.has(id)) STATE.activeCategories.add(id); });
  }

  /* ---- Mobile menu -------------------------------------------- */
  function bindMobileMenu() {
    const menu = $('#mobile-menu');
    const open = () => { menu.setAttribute('aria-hidden', 'false'); $('#mobile-menu-btn').setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; };
    const close = () => { menu.setAttribute('aria-hidden', 'true'); $('#mobile-menu-btn').setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; };
    $('#mobile-menu-btn').addEventListener('click', open);
    $('#mobile-menu-close').addEventListener('click', close);
    $('#mobile-theme-toggle').addEventListener('click', toggleTheme);
    menu.addEventListener('click', (e) => { if (e.target === menu) close(); });
  }

  /* ---- Init --------------------------------------------------- */
  function totalCount() {
    return STATE.data.categories.reduce((s, c) => s + c.tools.length, 0);
  }

  async function init() {
    initTheme();
    $('#theme-toggle').addEventListener('click', toggleTheme);

    await loadData();
    if (!STATE.data) return;

    STATE.totalToolCount = totalCount();

    renderStats();
    renderFeatured();
    renderTrending();
    renderRemoved();
    initTableScrollHint();
    renderCategoryPills();
    renderCategories();
    readUrlHash();
    syncPillStates();
    bindPillsToggle();
    bindSearch();
    bindMobileMenu();
    applyFilters();

    loadStarCount();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
