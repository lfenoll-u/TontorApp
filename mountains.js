const MOUNTAINS = [
  // País Vasco - Gipuzkoa
  {
    id: 'aizkorri', name: 'Aizkorri', zone: 'Gipuzkoa',
    lat: 42.9676, lon: -2.3089, altitude: 1528,
    base: { name: 'Oñati', lat: 43.0340, lon: -2.4170 }
  },
  {
    id: 'aratz', name: 'Aratz', zone: 'Gipuzkoa',
    lat: 42.9800, lon: -2.2800, altitude: 1443,
    base: { name: 'Aretxabaleta', lat: 43.0297, lon: -2.5014 }
  },
  {
    id: 'txindoki', name: 'Txindoki', zone: 'Gipuzkoa',
    lat: 43.0681, lon: -2.0789, altitude: 1346,
    base: { name: 'Lazkao', lat: 43.0486, lon: -2.1722 }
  },
  {
    id: 'aralar', name: 'Aralar', zone: 'Gipuzkoa',
    lat: 43.0200, lon: -2.0500, altitude: 1427,
    base: { name: 'Ataun', lat: 43.0156, lon: -2.0983 }
  },
  {
    id: 'ernio', name: 'Ernio', zone: 'Gipuzkoa',
    lat: 43.1833, lon: -2.2333, altitude: 1075,
    base: { name: 'Zestoa', lat: 43.2189, lon: -2.2583 }
  },
  // País Vasco - Bizkaia
  {
    id: 'anboto', name: 'Anboto', zone: 'Bizkaia',
    lat: 43.0833, lon: -2.6167, altitude: 1331,
    base: { name: 'Durango', lat: 43.1692, lon: -2.6328 }
  },
  {
    id: 'gorbeia', name: 'Gorbeia', zone: 'Bizkaia',
    lat: 43.0333, lon: -2.7667, altitude: 1482,
    base: { name: 'Zuia', lat: 42.9833, lon: -2.8333 }
  },
  {
    id: 'urkiola', name: 'Urkiola', zone: 'Bizkaia',
    lat: 43.0500, lon: -2.6000, altitude: 1000,
    base: { name: 'Abadiño', lat: 43.1264, lon: -2.6092 }
  },
  // Navarra
  {
    id: 'orhi', name: 'Orhi', zone: 'Navarra',
    lat: 42.9833, lon: -1.0000, altitude: 2021,
    base: { name: 'Ochagavía', lat: 42.9083, lon: -1.0758 }
  },
  {
    id: 'mendaur', name: 'Mendaur', zone: 'Navarra',
    lat: 43.1167, lon: -1.7167, altitude: 1131,
    base: { name: 'Saldías', lat: 43.0997, lon: -1.7294 }
  },
  {
    id: 'larrun', name: 'Larrun', zone: 'Navarra',
    lat: 43.3167, lon: -1.6500, altitude: 900,
    base: { name: 'Vera de Bidasoa', lat: 43.2961, lon: -1.6786 }
  },
  {
    id: 'penas-aia', name: 'Peñas de Aia', zone: 'Navarra',
    lat: 43.2833, lon: -1.8500, altitude: 833,
    base: { name: 'Oiartzun', lat: 43.2886, lon: -1.8631 }
  },
  {
    id: 'autza', name: 'Autza', zone: 'Navarra',
    lat: 43.2000, lon: -1.5833, altitude: 1305,
    base: { name: 'Elizondo', lat: 43.1572, lon: -1.5131 }
  }
];

function getMountains() {
  const custom = JSON.parse(localStorage.getItem('customMountains') || '[]');
  return [...MOUNTAINS, ...custom];
}

function addCustomMountain(mountain) {
  const custom = JSON.parse(localStorage.getItem('customMountains') || '[]');
  const id = 'custom-' + Date.now();
  const newMtn = { ...mountain, id, zone: 'Personalizada', custom: true,
    base: { name: mountain.baseName || 'Base', lat: mountain.lat, lon: mountain.lon }
  };
  custom.push(newMtn);
  localStorage.setItem('customMountains', JSON.stringify(custom));
  return newMtn;
}

function removeCustomMountain(id) {
  const custom = JSON.parse(localStorage.getItem('customMountains') || '[]');
  localStorage.setItem('customMountains', JSON.stringify(custom.filter(m => m.id !== id)));
}

function toggleFavorite(id) {
  const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
  const idx = favs.indexOf(id);
  if (idx === -1) favs.push(id); else favs.splice(idx, 1);
  localStorage.setItem('favorites', JSON.stringify(favs));
  return idx === -1;
}

function isFavorite(id) {
  const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
  return favs.includes(id);
}
