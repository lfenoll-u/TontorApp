// ============================================================
// TontorApp — Main Application
// ============================================================

const APP_VERSION = '1.0.0';
let allWeatherData = {};
let allVerdicts = {};
let mainMap = null;
let mainMapMarkers = {};
let currentTab = 'mountains';
let selectedMountainId = null;
let selectedDay = 0;
let detailDayOffset = 0;
let dataLoaded = false;
let loadingStartTime = null;

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  checkWelcome();
  setupTabs();
  setupSettings();

  const mountains = getMountains();
  initMainMap(mountains);
  renderSkeletons(mountains);
  await loadAllData(mountains);
  renderMountainCards(mountains);
  updateMapMarkers(mountains);
  setupFilters(mountains);
  setupAddMountainForm(mountains);
});

// ---- Welcome screen ----
function checkWelcome() {
  const welcomed = localStorage.getItem('welcomed');
  if (!welcomed) {
    document.getElementById('welcome-screen').classList.remove('hidden');
  }
}

function closeWelcome() {
  localStorage.setItem('welcomed', '1');
  document.getElementById('welcome-screen').classList.add('hidden');
}

window.saveApiKey = function() {
  const key = document.getElementById('welcome-api-key')?.value?.trim();
  if (key) {
    localStorage.setItem('anthropicApiKey', key);
    localStorage.setItem('aiEnabled', 'true');
  }
  closeWelcome();
};

window.skipAI = function() {
  localStorage.setItem('aiEnabled', 'false');
  closeWelcome();
};

// ---- Tabs ----
function setupTabs() {
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
  document.getElementById(`tab-${tab}`)?.classList.remove('hidden');
  document.querySelectorAll('[data-tab]').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });

  if (tab === 'mountains' && mainMap) {
    setTimeout(() => mainMap.invalidateSize(), 100);
  }
}

// ---- Main Map ----
function initMainMap(mountains) {
  const container = document.getElementById('main-map');
  if (!container || mainMap) return;

  mainMap = L.map('main-map').setView([43.1, -2.2], 9);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 19
  }).addTo(mainMap);

  document.getElementById('btn-recenter')?.addEventListener('click', () => {
    mainMap.setView([43.1, -2.2], 9);
  });
}

function updateMapMarkers(mountains) {
  if (!mainMap) return;
  Object.values(mainMapMarkers).forEach(m => mainMap.removeLayer(m));
  mainMapMarkers = {};

  mountains.forEach(mountain => {
    const verdict = allVerdicts[mountain.id]?.[0];
    const color = verdict?.color || '#6b7280';

    const marker = L.circleMarker([mountain.lat, mountain.lon], {
      radius: 10, fillColor: color, color: '#fff',
      weight: 2, opacity: 1, fillOpacity: 0.9
    }).addTo(mainMap);

    marker.bindTooltip(`<b>${mountain.name}</b><br>${mountain.altitude}m<br>${verdict?.verdict || '…'}`, {
      direction: 'top'
    });

    marker.on('click', () => {
      const card = document.querySelector(`[data-mountain-id="${mountain.id}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('highlighted');
        setTimeout(() => card.classList.remove('highlighted'), 2000);
      }
    });

    mainMapMarkers[mountain.id] = marker;
  });
}

// ---- Data Loading ----
async function loadAllData(mountains) {
  loadingStartTime = Date.now();
  dataLoaded = false;
  allWeatherData = await fetchAllMountainsWeather(mountains);
  dataLoaded = true;
  localStorage.setItem('lastUpdate', new Date().toISOString());
  document.getElementById('last-update')?.setAttribute('data-time', new Date().toISOString());
  updateLastUpdateDisplay();
}

function updateLastUpdateDisplay() {
  const el = document.getElementById('last-update-text');
  const stored = localStorage.getItem('lastUpdate');
  if (el && stored) {
    const d = new Date(stored);
    el.textContent = `Última actualización: ${d.toLocaleString('es')}`;
  }
}

// ---- Verdicts ----
function computeAllVerdicts(mountains) {
  mountains.forEach(m => {
    const data = allWeatherData[m.id];
    if (!data?.summit) return;
    allVerdicts[m.id] = Array.from({ length: 8 }, (_, i) => calculateVerdict(data.summit, i));
  });
}

// ---- Skeletons ----
function renderSkeletons(mountains) {
  const list = document.getElementById('mountains-list');
  if (!list) return;
  list.innerHTML = mountains.map(() => `
    <div class="skeleton-card">
      <div class="skeleton-line" style="width:60%;height:18px"></div>
      <div class="skeleton-line" style="width:40%;height:14px;margin-top:8px"></div>
      <div class="skeleton-block" style="height:80px;margin-top:12px"></div>
    </div>
  `).join('');
}

// ---- Mountain Cards ----
function renderMountainCards(mountains, filter = 'all', sort = 'verdict') {
  computeAllVerdicts(mountains);
  const list = document.getElementById('mountains-list');
  if (!list) return;

  let filtered = mountains;
  if (filter === 'favorites') filtered = mountains.filter(m => isFavorite(m.id));
  else if (['Gipuzkoa', 'Bizkaia', 'Navarra', 'Personalizada'].includes(filter))
    filtered = mountains.filter(m => m.zone === filter);

  if (sort === 'verdict') {
    const order = { 'ÓPTIMO': 0, 'BUENO': 1, 'ACEPTABLE': 2, 'MALO': 3, 'SIN DATOS': 4, 'DESCONOCIDO': 5 };
    filtered.sort((a, b) => (order[allVerdicts[a.id]?.[0]?.verdict] ?? 5) - (order[allVerdicts[b.id]?.[0]?.verdict] ?? 5));
  } else if (sort === 'zone') {
    filtered.sort((a, b) => a.zone.localeCompare(b.zone) || a.name.localeCompare(b.name));
  } else if (sort === 'altitude') {
    filtered.sort((a, b) => b.altitude - a.altitude);
  }

  if (isFavoriteFirst()) {
    const favs = filtered.filter(m => isFavorite(m.id));
    const rest = filtered.filter(m => !isFavorite(m.id));
    filtered = [...favs, ...rest];
  }

  list.innerHTML = filtered.map(m => renderMountainCard(m)).join('');
  setupCardListeners();
}

function renderMountainCard(mountain) {
  const dayVerdicts = allVerdicts[mountain.id] || [];
  const fav = isFavorite(mountain.id);
  const currentVerdict = dayVerdicts[selectedDay] || { verdict: 'Cargando...', color: '#6b7280', danger: '…', dangerColor: '#6b7280' };
  const data = allWeatherData[mountain.id];

  const dayTabs = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    const label = i === 0 ? 'Hoy' : i === 1 ? 'Mañana'
      : d.toLocaleDateString('es', { weekday: 'short', day: 'numeric' });
    const v = dayVerdicts[i];
    return `<button class="day-tab ${i === selectedDay ? 'active' : ''}" data-day="${i}" data-mountain="${mountain.id}"
      style="${i === selectedDay ? `border-bottom: 2px solid ${v?.color || '#6b7280'}` : ''}">
      <span class="day-tab-label">${label}</span>
      <span class="day-tab-dot" style="background:${v?.color || '#6b7280'}"></span>
    </button>`;
  }).join('');

  const summary = data ? getSummaryForDay(data, selectedDay) : null;
  const optimal = currentVerdict.optimalWindow;

  return `
    <div class="mountain-card" data-mountain-id="${mountain.id}">
      <div class="card-header">
        <div>
          <h3 class="mountain-name">${mountain.name}</h3>
          <span class="mountain-meta">${mountain.altitude}m · ${mountain.zone} · base: ${mountain.base.name}</span>
        </div>
        <button class="fav-btn ${fav ? 'active' : ''}" data-fav="${mountain.id}" title="Favorita">
          ${fav ? '★' : '☆'}
        </button>
      </div>

      <div class="day-tabs-scroll">${dayTabs}</div>

      <div class="verdict-row">
        <div class="verdict-badge" style="background:${currentVerdict.color}20;border-color:${currentVerdict.color}">
          <span class="verdict-icon">${verdictIcon(currentVerdict.verdict)}</span>
          <span class="verdict-text" style="color:${currentVerdict.color}">${currentVerdict.verdict}</span>
        </div>
        <div class="danger-badge" style="color:${currentVerdict.dangerColor || '#6b7280'}">
          ⚠ Peligrosidad: ${currentVerdict.danger || '…'}
        </div>
      </div>

      ${summary ? `
      <div class="cotas-row">
        <div class="cota-col">
          <div class="cota-label">🏘 Base</div>
          <div class="cota-val">${summary.base.tempMax}°C</div>
          <div class="cota-sub">${summary.base.windAvg} km/h · ${summary.base.precipTotal}mm</div>
        </div>
        <div class="cota-col">
          <div class="cota-label">⛰ Media</div>
          <div class="cota-val">${data?.mid ? getSummaryForDay(data, selectedDay)?.summit?.tempAvg + '°C' : '…'}</div>
          <div class="cota-sub">—</div>
        </div>
        <div class="cota-col">
          <div class="cota-label">🏔 Cumbre</div>
          <div class="cota-val">${summary.summit.tempMax}°C</div>
          <div class="cota-sub">${summary.summit.windAvg} km/h · ${summary.summit.precipTotal}mm</div>
        </div>
      </div>
      ` : '<div class="no-data">Sin datos disponibles</div>'}

      ${optimal ? `
      <div class="optimal-window">
        <span class="window-label">🕐 Ventana óptima:</span>
        <span class="window-time">${optimal.startStr} – ${optimal.endStr}</span>
        ${renderHourBar(optimal)}
      </div>` : ''}

      <button class="btn-detail" data-detail="${mountain.id}">Ver análisis completo ▸</button>
    </div>
  `;
}

function renderHourBar(optimal) {
  const hours = Array.from({ length: 15 }, (_, i) => i + 6);
  return `<div class="hour-bar">${hours.map(h => `
    <div class="hour-cell ${h >= optimal.start && h < optimal.end ? 'optimal' : ''}"
      title="${h}:00">${h}</div>
  `).join('')}</div>`;
}

function verdictIcon(verdict) {
  const icons = { 'ÓPTIMO': '☀️', 'BUENO': '🌤', 'ACEPTABLE': '⛅', 'MALO': '🌧', 'SIN DATOS': '❓', 'DESCONOCIDO': '❓' };
  return icons[verdict] || '❓';
}

function setupCardListeners() {
  document.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.fav;
      const isFav = toggleFavorite(id);
      btn.textContent = isFav ? '★' : '☆';
      btn.classList.toggle('active', isFav);
    });
  });

  document.querySelectorAll('.day-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedDay = parseInt(btn.dataset.day);
      renderMountainCards(getMountains(), getCurrentFilter(), getCurrentSort());
    });
  });

  document.querySelectorAll('[data-detail]').forEach(btn => {
    btn.addEventListener('click', () => openDetail(btn.dataset.detail, selectedDay));
  });
}

// ---- Detail Panel ----
async function openDetail(mountainId, dayOffset = 0) {
  selectedMountainId = mountainId;
  detailDayOffset = dayOffset;
  const mountain = getMountains().find(m => m.id === mountainId);
  if (!mountain) return;

  const panel = document.getElementById('detail-panel');
  const overlay = document.getElementById('detail-overlay');
  if (!panel) return;

  panel.classList.add('open');
  overlay?.classList.remove('hidden');
  document.body.classList.add('panel-open');

  const weatherData = allWeatherData[mountainId];
  const verdict = allVerdicts[mountainId]?.[dayOffset];

  renderDetailHeader(panel, mountain, dayOffset, verdict);
  renderDetailCharts(weatherData, dayOffset);

  // AI briefing
  const aiSection = document.getElementById('detail-ai');
  if (aiSection) {
    aiSection.innerHTML = '<div class="ai-loading">Generando análisis IA…</div>';
    const briefing = await generateMountainBriefing(mountain, weatherData, verdict, dayOffset);
    if (briefing) renderAIBriefing(aiSection, briefing);
    else aiSection.innerHTML = '<div class="ai-unavailable">Análisis IA no disponible. Revisa la API key en Ajustes.</div>';
  }
}

function renderDetailHeader(panel, mountain, dayOffset, verdict) {
  const d = new Date(); d.setDate(d.getDate() + dayOffset);
  const dateStr = dayOffset === 0 ? 'Hoy' : dayOffset === 1 ? 'Mañana'
    : d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });

  document.getElementById('detail-title').textContent = mountain.name;
  document.getElementById('detail-subtitle').textContent = `${mountain.altitude}m · ${mountain.zone} · ${dateStr}`;
  document.getElementById('detail-verdict').textContent = verdict?.verdict || '…';
  document.getElementById('detail-verdict').style.color = verdict?.color || '#6b7280';
}

function renderDetailCharts(weatherData, dayOffset) {
  const hourlyData = getHourlyDataForDay(weatherData, dayOffset);
  if (!hourlyData) return;
  setTimeout(() => renderAllCharts(hourlyData), 50);
}

function renderAIBriefing(container, briefing) {
  container.innerHTML = `
    <div class="ai-briefing">
      <div class="ai-section">
        <h4>📋 Resumen de la jornada</h4>
        <p>${briefing.resumen}</p>
      </div>
      <div class="ai-section">
        <h4>🕐 Ventana recomendada</h4>
        <p>${briefing.ventana}</p>
      </div>
      <div class="ai-section">
        <h4>⚠️ Peligrosidad</h4>
        <p>${briefing.peligrosidad}</p>
      </div>
      <div class="ai-section">
        <h4>🎒 Material recomendado</h4>
        <ul class="material-list">
          ${briefing.material.map(item => `
            <li><strong>${item.item}</strong><span>${item.razon}</span></li>
          `).join('')}
        </ul>
      </div>
    </div>
  `;
}

window.closeDetail = function() {
  document.getElementById('detail-panel')?.classList.remove('open');
  document.getElementById('detail-overlay')?.classList.add('hidden');
  document.body.classList.remove('panel-open');
};

// ---- Filters ----
let currentFilter = 'all';
let currentSort = 'verdict';
let favFirst = false;

function getCurrentFilter() { return currentFilter; }
function getCurrentSort() { return currentSort; }
function isFavoriteFirst() { return favFirst; }

function setupFilters(mountains) {
  document.getElementById('filter-zone')?.addEventListener('change', e => {
    currentFilter = e.target.value;
    renderMountainCards(getMountains(), currentFilter, currentSort);
  });

  document.getElementById('sort-select')?.addEventListener('change', e => {
    currentSort = e.target.value;
    renderMountainCards(getMountains(), currentFilter, currentSort);
  });

  document.getElementById('fav-first')?.addEventListener('change', e => {
    favFirst = e.target.checked;
    renderMountainCards(getMountains(), currentFilter, currentSort);
  });
}

// ---- Add Mountain Form ----
function setupAddMountainForm(mountains) {
  const form = document.getElementById('add-mountain-form');
  form?.addEventListener('submit', e => {
    e.preventDefault();
    const data = new FormData(form);
    const m = {
      name: data.get('name'),
      lat: parseFloat(data.get('lat')),
      lon: parseFloat(data.get('lon')),
      altitude: parseInt(data.get('altitude')),
      baseName: data.get('baseName') || ''
    };
    if (!m.name || isNaN(m.lat) || isNaN(m.lon) || isNaN(m.altitude)) return;
    const newM = addCustomMountain(m);
    form.reset();
    document.getElementById('add-mountain-panel')?.classList.add('hidden');
    const allMtns = getMountains();
    fetchMountainWeather(newM).then(data => {
      allWeatherData[newM.id] = data;
      renderMountainCards(allMtns, currentFilter, currentSort);
      updateMapMarkers(allMtns);
    });
  });

  document.getElementById('btn-add-mountain')?.addEventListener('click', () => {
    document.getElementById('add-mountain-panel')?.classList.toggle('hidden');
  });

  document.getElementById('btn-cancel-add')?.addEventListener('click', () => {
    document.getElementById('add-mountain-panel')?.classList.add('hidden');
  });
}

// ---- Settings ----
function setupSettings() {
  updateLastUpdateDisplay();

  const keyInput = document.getElementById('settings-api-key');
  const savedKey = localStorage.getItem('anthropicApiKey');
  if (keyInput && savedKey) {
    keyInput.placeholder = '••••••••••••••••' + savedKey.slice(-4);
  }

  document.getElementById('btn-save-key')?.addEventListener('click', () => {
    const val = keyInput?.value?.trim();
    if (val) {
      localStorage.setItem('anthropicApiKey', val);
      if (keyInput) keyInput.value = '';
      if (keyInput) keyInput.placeholder = '••••••••••••••••' + val.slice(-4);
      showToast('API key guardada');
    }
  });

  const aiToggle = document.getElementById('toggle-ai');
  if (aiToggle) {
    aiToggle.checked = localStorage.getItem('aiEnabled') !== 'false';
    aiToggle.addEventListener('change', () => {
      localStorage.setItem('aiEnabled', aiToggle.checked ? 'true' : 'false');
    });
  }

  document.getElementById('btn-clear-cache')?.addEventListener('click', () => {
    clearWeatherCache();
    Object.keys(AI_CACHE).forEach(k => delete AI_CACHE[k]);
    showToast('Caché limpiada');
  });

  document.getElementById('btn-reload-data')?.addEventListener('click', async () => {
    clearWeatherCache();
    const mountains = getMountains();
    renderSkeletons(mountains);
    await loadAllData(mountains);
    renderMountainCards(mountains, currentFilter, currentSort);
    updateMapMarkers(mountains);
    showToast('Datos actualizados');
  });

  document.getElementById('app-version').textContent = APP_VERSION;
}

// ---- Toast ----
function showToast(msg, duration = 3000) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), duration);
}

// ---- Register SW ----
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered'))
      .catch(err => console.error('SW error', err));
  });
}

// ---- PWA Install ----
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  document.getElementById('btn-install')?.classList.remove('hidden');
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  document.getElementById('btn-install')?.classList.add('hidden');
  showToast('¡TontorApp instalada correctamente!');
});

window.installApp = async function() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    document.getElementById('btn-install')?.classList.add('hidden');
  } else {
    showToast('iOS: Safari → Compartir → «Añadir a inicio»', 5000);
  }
};

// Always show install button on iOS Safari (beforeinstallprompt never fires there)
if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.navigator.standalone) {
  document.getElementById('btn-install')?.classList.remove('hidden');
}
