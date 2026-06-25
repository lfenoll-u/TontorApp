let radarData = null;
let radarMap = null;
let radarLayer = null;
let radarFrames = [];
let currentFrameIdx = 0;
let radarAnimating = false;
let radarAnimTimer = null;
let radarInitialized = false;

async function initRadar(mountains) {
  if (radarInitialized && radarMap) return;

  const container = document.getElementById('radar-map');
  if (!container) return;

  if (!radarMap) {
    radarMap = L.map('radar-map', { zoomControl: true }).setView([43.1, -2.2], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors', maxZoom: 19
    }).addTo(radarMap);

    // Add mountain markers
    if (mountains) {
      mountains.forEach(m => {
        const color = window.allVerdicts?.[m.id]?.[0]?.color || '#6b7280';
        const marker = L.circleMarker([m.lat, m.lon], {
          radius: 8, fillColor: color, color: '#fff',
          weight: 2, opacity: 1, fillOpacity: 0.9
        }).addTo(radarMap);
        marker.bindTooltip(m.name, { permanent: false, direction: 'top' });
      });
    }
  }

  await loadRadarData();
  radarInitialized = true;
}

async function loadRadarData() {
  try {
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    radarData = await res.json();

    const past = radarData.radar?.past || [];
    const nowcast = radarData.radar?.nowcast || [];
    radarFrames = [
      ...past.map(f => ({ ...f, type: 'past' })),
      ...nowcast.map(f => ({ ...f, type: 'nowcast' }))
    ];

    currentFrameIdx = past.length > 0 ? past.length - 1 : 0;
    buildRadarControls();
    showRadarFrame(currentFrameIdx);
  } catch (err) {
    console.error('RainViewer load error:', err);
    document.getElementById('radar-status')?.classList.remove('hidden');
  }
}

function showRadarFrame(idx) {
  if (!radarMap || !radarFrames[idx]) return;
  if (radarLayer) { radarMap.removeLayer(radarLayer); radarLayer = null; }

  const frame = radarFrames[idx];
  const ts = frame.time;
  radarLayer = L.tileLayer(
    `https://tilecache.rainviewer.com/v2/radar/${ts}/256/{z}/{x}/{y}/2/1_1.png`,
    { opacity: 0.7, zIndex: 10, attribution: '© RainViewer' }
  );
  radarLayer.addTo(radarMap);
  currentFrameIdx = idx;
  updateRadarUI();
}

function buildRadarControls() {
  const slider = document.getElementById('radar-slider');
  const timeline = document.getElementById('radar-timeline');
  if (!slider || !radarFrames.length) return;

  slider.min = 0;
  slider.max = radarFrames.length - 1;
  slider.value = currentFrameIdx;

  if (timeline) {
    timeline.innerHTML = '';
    const past = radarFrames.filter(f => f.type === 'past').length;
    radarFrames.forEach((f, i) => {
      const tick = document.createElement('div');
      tick.className = `radar-tick ${f.type === 'past' ? 'past' : 'nowcast'}`;
      tick.style.width = `${100 / radarFrames.length}%`;
      timeline.appendChild(tick);
    });
  }

  slider.addEventListener('input', () => {
    if (radarAnimating) stopRadarAnimation();
    showRadarFrame(parseInt(slider.value));
  });
}

function updateRadarUI() {
  const slider = document.getElementById('radar-slider');
  const timeLabel = document.getElementById('radar-time-label');
  const frameType = document.getElementById('radar-frame-type');

  if (slider) slider.value = currentFrameIdx;

  const frame = radarFrames[currentFrameIdx];
  if (!frame) return;

  const d = new Date(frame.time * 1000);
  const now = new Date();
  const diffMin = Math.round((now - d) / 60000);

  let timeStr;
  if (Math.abs(diffMin) < 5) timeStr = 'Ahora';
  else if (diffMin > 0) timeStr = `Hace ${diffMin < 60 ? diffMin + ' min' : Math.round(diffMin / 60) + 'h ' + (diffMin % 60) + 'min'}`;
  else timeStr = `En ${Math.abs(diffMin) < 60 ? Math.abs(diffMin) + ' min' : Math.round(Math.abs(diffMin) / 60) + 'h'}`;

  if (timeLabel) timeLabel.textContent = `${d.toLocaleDateString('es', { weekday: 'short' })} ${d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })} (${timeStr})`;
  if (frameType) {
    frameType.textContent = frame.type === 'past' ? 'Dato real' : 'Previsión';
    frameType.className = `radar-frame-type ${frame.type}`;
  }
}

function startRadarAnimation() {
  radarAnimating = true;
  document.getElementById('btn-radar-play')?.classList.add('active');
  radarAnimTimer = setInterval(() => {
    const next = (currentFrameIdx + 1) % radarFrames.length;
    showRadarFrame(next);
  }, 500);
}

function stopRadarAnimation() {
  radarAnimating = false;
  document.getElementById('btn-radar-play')?.classList.remove('active');
  if (radarAnimTimer) { clearInterval(radarAnimTimer); radarAnimTimer = null; }
}

function toggleRadarAnimation() {
  radarAnimating ? stopRadarAnimation() : startRadarAnimation();
}

function resetRadarView() {
  if (radarMap) radarMap.setView([43.1, -2.2], 9);
}
