const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 300 },
  plugins: {
    legend: { labels: { color: '#6C7A86', font: { size: 11, family: "'IBM Plex Mono', monospace" } } },
    tooltip: {
      backgroundColor: '#16202B',
      titleColor: '#FFFFFF',
      bodyColor: '#DCE3E9',
      borderColor: '#2d3748',
      borderWidth: 1
    }
  },
  scales: {
    x: {
      ticks: { color: '#8A96A2', maxTicksLimit: 8, font: { family: "'IBM Plex Mono', monospace", size: 10 } },
      grid: { color: '#E7ECF0' }
    },
    y: {
      ticks: { color: '#8A96A2', font: { family: "'IBM Plex Mono', monospace", size: 10 } },
      grid: { color: '#E7ECF0' }
    }
  }
};

function getChartColors() {
  return {
    base: '#60a5fa', mid: '#a78bfa', summit: '#f472b6',
    wind: '#38bdf8', gust: '#f59e0b', precip: '#3b82f6',
    snow: '#94a3b8', apparent: '#fb923c', visibility: '#10b981',
    freezing: '#818cf8'
  };
}

function formatHourLabels(times) {
  return times.map(t => new Date(t).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }));
}

function destroyChart(id) {
  const existing = Chart.getChart(id);
  if (existing) existing.destroy();
}

function renderTemperatureChart(canvasId, hourlyData) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx || !hourlyData?.summit) return;

  const labels = formatHourLabels(hourlyData.summit.time || []);
  const c = getChartColors();
  const freezing = hourlyData.summit.freezinglevel_height || [];

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Cumbre', data: hourlyData.summit.temperature_2m || [],
          borderColor: c.summit, backgroundColor: c.summit + '20',
          tension: 0.3, pointRadius: 2
        },
        {
          label: 'Media', data: hourlyData.mid?.temperature_2m || [],
          borderColor: c.mid, backgroundColor: c.mid + '20',
          tension: 0.3, pointRadius: 2
        },
        {
          label: 'Base', data: hourlyData.base?.temperature_2m || [],
          borderColor: c.base, backgroundColor: c.base + '20',
          tension: 0.3, pointRadius: 2
        }
      ]
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: {
        ...CHART_DEFAULTS.plugins,
        title: { display: true, text: 'Temperatura por cotas (°C)', color: '#16202B' }
      },
      scales: {
        ...CHART_DEFAULTS.scales,
        y: { ...CHART_DEFAULTS.scales.y, title: { display: true, text: '°C', color: '#8A96A2' } }
      }
    }
  });
}

function renderWindChart(canvasId, hourlyData) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx || !hourlyData?.summit) return;

  const labels = formatHourLabels(hourlyData.summit.time || []);
  const c = getChartColors();

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Rachas (km/h)', data: hourlyData.summit.windgusts_10m || [],
          borderColor: c.gust, backgroundColor: c.gust + '30',
          fill: false, tension: 0.2, pointRadius: 2
        },
        {
          label: 'Viento (km/h)', data: hourlyData.summit.windspeed_10m || [],
          borderColor: c.wind, backgroundColor: c.wind + '40',
          fill: true, tension: 0.2, pointRadius: 2
        }
      ]
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: {
        ...CHART_DEFAULTS.plugins,
        title: { display: true, text: 'Viento en cumbre (km/h)', color: '#16202B' },
        annotation: {
          annotations: {
            line50: {
              type: 'line', yMin: 50, yMax: 50,
              borderColor: '#ef4444', borderWidth: 1, borderDash: [4, 4]
            }
          }
        }
      },
      scales: {
        ...CHART_DEFAULTS.scales,
        y: { ...CHART_DEFAULTS.scales.y, min: 0 }
      }
    }
  });
}

function renderPrecipChart(canvasId, hourlyData) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx || !hourlyData?.summit) return;

  const labels = formatHourLabels(hourlyData.summit.time || []);
  const c = getChartColors();

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Nieve (cm)', data: hourlyData.summit.snowfall || [],
          backgroundColor: c.snow + 'cc', stack: 'precip'
        },
        {
          label: 'Lluvia (mm)', data: hourlyData.summit.precipitation || [],
          backgroundColor: c.precip + 'cc', stack: 'precip'
        }
      ]
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: {
        ...CHART_DEFAULTS.plugins,
        title: { display: true, text: 'Precipitación en cumbre', color: '#16202B' }
      },
      scales: {
        ...CHART_DEFAULTS.scales,
        y: { ...CHART_DEFAULTS.scales.y, min: 0, stacked: true }
      }
    }
  });
}

function renderApparentTempChart(canvasId, hourlyData) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx || !hourlyData?.summit) return;

  const labels = formatHourLabels(hourlyData.summit.time || []);
  const c = getChartColors();

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Temperatura real (°C)', data: hourlyData.summit.temperature_2m || [],
          borderColor: c.summit, tension: 0.3, pointRadius: 2
        },
        {
          label: 'Sensación térmica (°C)', data: hourlyData.summit.apparent_temperature || [],
          borderColor: c.apparent, borderDash: [5, 3], tension: 0.3, pointRadius: 2
        }
      ]
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: {
        ...CHART_DEFAULTS.plugins,
        title: { display: true, text: 'Temperatura vs Sensación térmica (°C)', color: '#16202B' }
      }
    }
  });
}

function renderVisibilityChart(canvasId, hourlyData) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx || !hourlyData?.summit) return;

  const labels = formatHourLabels(hourlyData.summit.time || []);
  const c = getChartColors();
  const visData = (hourlyData.summit.visibility || []).map(v => Math.round(v / 100) / 10);

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Visibilidad (km)', data: visData,
        borderColor: c.visibility, backgroundColor: c.visibility + '30',
        fill: true, tension: 0.3, pointRadius: 2
      }]
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: {
        ...CHART_DEFAULTS.plugins,
        title: { display: true, text: 'Visibilidad en cumbre (km)', color: '#16202B' }
      },
      scales: {
        ...CHART_DEFAULTS.scales,
        y: {
          ...CHART_DEFAULTS.scales.y, min: 0,
          title: { display: true, text: 'km', color: '#8A96A2' }
        }
      }
    }
  });
}

function renderAllCharts(hourlyData) {
  renderTemperatureChart('chart-temp', hourlyData);
  renderWindChart('chart-wind', hourlyData);
  renderPrecipChart('chart-precip', hourlyData);
  renderApparentTempChart('chart-apparent', hourlyData);
  renderVisibilityChart('chart-visibility', hourlyData);
}
