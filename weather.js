const WEATHER_CACHE = {};
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const HOURLY_VARS_BASE = [
  'temperature_2m', 'precipitation', 'windspeed_10m', 'windgusts_10m',
  'weathercode', 'relative_humidity_2m', 'apparent_temperature'
].join(',');

const HOURLY_VARS_MID = HOURLY_VARS_BASE + ',visibility,freezinglevel_height';
const HOURLY_VARS_SUMMIT = HOURLY_VARS_MID + ',snowfall,uv_index,precipitation_probability';

async function fetchOpenMeteo(lat, lon, elevation, vars) {
  let url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${vars}&timezone=Europe%2FMadrid&forecast_days=8`;
  if (elevation !== null) url += `&elevation=${elevation}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenMeteo HTTP ${res.status}`);
  return res.json();
}

async function fetchMountainWeather(mountain) {
  const cacheKey = mountain.id;
  const cached = WEATHER_CACHE[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) return cached.data;

  const midAlt = Math.round(mountain.altitude / 2);

  const [baseResult, midResult, summitResult] = await Promise.allSettled([
    fetchOpenMeteo(mountain.base.lat, mountain.base.lon, null, HOURLY_VARS_BASE),
    fetchOpenMeteo(mountain.lat, mountain.lon, midAlt, HOURLY_VARS_MID),
    fetchOpenMeteo(mountain.lat, mountain.lon, mountain.altitude, HOURLY_VARS_SUMMIT)
  ]);

  const data = {
    base: baseResult.status === 'fulfilled' ? baseResult.value : null,
    mid: midResult.status === 'fulfilled' ? midResult.value : null,
    summit: summitResult.status === 'fulfilled' ? summitResult.value : null,
    fetchedAt: new Date().toISOString()
  };

  WEATHER_CACHE[cacheKey] = { timestamp: Date.now(), data };
  return data;
}

async function fetchAllMountainsWeather(mountains) {
  const results = await Promise.allSettled(mountains.map(m => fetchMountainWeather(m)));
  const map = {};
  results.forEach((r, i) => {
    map[mountains[i].id] = r.status === 'fulfilled' ? r.value : null;
  });
  return map;
}

function getHourIndices(times, startH = 6, endH = 20) {
  return times.reduce((acc, t, i) => {
    const h = new Date(t).getHours();
    if (h >= startH && h <= endH) acc.push(i);
    return acc;
  }, []);
}

function getDayIndices(times, dayOffset) {
  const target = new Date();
  target.setDate(target.getDate() + dayOffset);
  const dateStr = target.toISOString().slice(0, 10);
  return times.reduce((acc, t, i) => {
    if (t.startsWith(dateStr)) acc.push(i);
    return acc;
  }, []);
}

function calculateVerdict(summitData, dayOffset) {
  if (!summitData) return { verdict: 'DESCONOCIDO', color: '#6b7280', danger: 'Desconocido' };

  const times = summitData.hourly.time;
  const dayIdx = getDayIndices(times, dayOffset);
  const activeIdx = dayIdx.filter(i => {
    const h = new Date(times[i]).getHours();
    return h >= 6 && h <= 20;
  });

  if (activeIdx.length === 0) return { verdict: 'SIN DATOS', color: '#6b7280', danger: 'Desconocido' };

  const get = (key) => activeIdx.map(i => summitData.hourly[key]?.[i] ?? 0);

  const precips = get('precipitation');
  const gusts = get('windgusts_10m');
  const vis = get('visibility');
  const codes = get('weathercode');
  const snowfall = get('snowfall');
  const precipProb = get('precipitation_probability');

  const totalPrecip = precips.reduce((a, b) => a + b, 0);
  const maxGust = Math.max(...gusts);
  const minVis = Math.min(...vis.filter(v => v > 0)) || 9999;
  const maxCode = Math.max(...codes);
  const maxSnow = Math.max(...snowfall);
  const maxStormProb = Math.max(...precipProb);

  let verdict, color;
  if (totalPrecip < 1 && maxGust < 40 && minVis > 8000 && maxCode < 60) {
    verdict = 'ÓPTIMO'; color = '#22c55e';
  } else if (totalPrecip < 3 && maxGust < 55 && minVis > 5000 && maxCode < 80) {
    verdict = 'BUENO'; color = '#86efac';
  } else if (totalPrecip < 8 && maxGust < 70 && minVis > 2000) {
    verdict = 'ACEPTABLE'; color = '#eab308';
  } else {
    verdict = 'MALO'; color = '#ef4444';
  }

  // Danger level
  let dangerScore = 0;
  if (maxGust > 80) dangerScore += 3;
  else if (maxGust > 60) dangerScore += 2;
  else if (maxGust > 40) dangerScore += 1;
  if (maxCode >= 95) dangerScore += 3;
  else if (maxCode >= 80) dangerScore += 1;
  if (maxSnow > 2) dangerScore += 2;
  else if (maxSnow > 0.5) dangerScore += 1;

  let danger, dangerColor;
  if (dangerScore >= 4) { danger = 'Alto'; dangerColor = '#ef4444'; }
  else if (dangerScore >= 2) { danger = 'Medio'; dangerColor = '#eab308'; }
  else { danger = 'Bajo'; dangerColor = '#22c55e'; }

  const optimalWindow = calculateOptimalWindow(summitData, dayOffset);

  return {
    verdict, color, danger, dangerColor,
    totalPrecip: totalPrecip.toFixed(1),
    maxGust: Math.round(maxGust),
    minVis: Math.round(minVis),
    maxCode,
    maxSnow: maxSnow.toFixed(1),
    optimalWindow
  };
}

function calculateOptimalWindow(summitData, dayOffset) {
  if (!summitData) return null;
  const times = summitData.hourly.time;
  const dayIdx = getDayIndices(times, dayOffset).filter(i => {
    const h = new Date(times[i]).getHours();
    return h >= 6 && h <= 20;
  });

  if (dayIdx.length < 4) return null;

  let bestScore = -Infinity, bestStart = 0, bestLen = 0;

  for (let start = 0; start < dayIdx.length - 3; start++) {
    for (let len = 4; len <= Math.min(6, dayIdx.length - start); len++) {
      const slice = dayIdx.slice(start, start + len);
      let score = 0;
      slice.forEach(i => {
        score -= (summitData.hourly.windgusts_10m?.[i] || 0);
        score -= (summitData.hourly.precipitation?.[i] || 0) * 10;
        score += Math.min(summitData.hourly.visibility?.[i] || 0, 10000) / 1000;
      });
      if (score > bestScore) { bestScore = score; bestStart = start; bestLen = len; }
    }
  }

  const startTime = times[dayIdx[bestStart]];
  const endTime = times[dayIdx[bestStart + bestLen - 1]];
  return {
    start: new Date(startTime).getHours(),
    end: new Date(endTime).getHours() + 1,
    startStr: new Date(startTime).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
    endStr: new Date(endTime).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  };
}

function getHourlyDataForDay(weatherData, dayOffset) {
  if (!weatherData) return null;
  const result = {};
  ['base', 'mid', 'summit'].forEach(level => {
    const data = weatherData[level];
    if (!data) { result[level] = null; return; }
    const times = data.hourly.time;
    const dayIdx = getDayIndices(times, dayOffset).filter(i => {
      const h = new Date(times[i]).getHours();
      return h >= 6 && h <= 21;
    });
    result[level] = {};
    Object.keys(data.hourly).forEach(key => {
      if (key === 'time') result[level].time = dayIdx.map(i => data.hourly.time[i]);
      else result[level][key] = dayIdx.map(i => data.hourly[key]?.[i]);
    });
  });
  return result;
}

function getSummaryForDay(weatherData, dayOffset) {
  if (!weatherData?.summit) return null;
  const summitData = weatherData.summit;
  const baseData = weatherData.base;
  const times = summitData.hourly.time;
  const dayIdx = getDayIndices(times, dayOffset).filter(i => {
    const h = new Date(times[i]).getHours();
    return h >= 6 && h <= 20;
  });
  if (!dayIdx.length) return null;

  const get = (data, key) => dayIdx.map(i => data?.hourly?.[key]?.[i] ?? null).filter(v => v !== null);

  const summitTemps = get(summitData, 'temperature_2m');
  const baseTemps = get(baseData, 'temperature_2m');
  const summitGusts = get(summitData, 'windgusts_10m');
  const summitWind = get(summitData, 'windspeed_10m');
  const summitPrecip = get(summitData, 'precipitation');
  const summitVis = get(summitData, 'visibility');
  const freezing = get(summitData, 'freezinglevel_height');
  const uvIndex = get(summitData, 'uv_index');
  const codes = get(summitData, 'weathercode');

  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const max = arr => arr.length ? Math.max(...arr) : null;
  const min = arr => arr.length ? Math.min(...arr) : null;

  return {
    summit: {
      tempMin: min(summitTemps)?.toFixed(1),
      tempMax: max(summitTemps)?.toFixed(1),
      tempAvg: avg(summitTemps)?.toFixed(1),
      windAvg: avg(summitWind)?.toFixed(0),
      gustMax: max(summitGusts)?.toFixed(0),
      precipTotal: summitPrecip.reduce((a, b) => a + b, 0).toFixed(1),
      visMin: min(summitVis)?.toFixed(0),
      freezingAvg: avg(freezing)?.toFixed(0),
      uvMax: max(uvIndex)?.toFixed(1),
      maxCode: max(codes)
    },
    base: {
      tempMin: min(baseTemps)?.toFixed(1),
      tempMax: max(baseTemps)?.toFixed(1),
      windAvg: avg(get(baseData, 'windspeed_10m'))?.toFixed(0),
      precipTotal: get(baseData, 'precipitation').reduce((a, b) => a + b, 0).toFixed(1)
    },
    tempDiff: baseTemps.length && summitTemps.length
      ? (avg(baseTemps) - avg(summitTemps)).toFixed(1) : null
  };
}

function clearWeatherCache() {
  Object.keys(WEATHER_CACHE).forEach(k => delete WEATHER_CACHE[k]);
}
