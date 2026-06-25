const AI_CACHE = {};

async function generateMountainBriefing(mountain, weatherData, verdict, dayOffset = 0) {
  const cacheKey = `${mountain.id}-${dayOffset}-${new Date().toDateString()}`;
  if (AI_CACHE[cacheKey]) return AI_CACHE[cacheKey];

  const apiKey = localStorage.getItem('anthropicApiKey');
  if (!apiKey) return null;

  const aiEnabled = localStorage.getItem('aiEnabled') !== 'false';
  if (!aiEnabled) return null;

  const summary = getSummaryForDay(weatherData, dayOffset);
  if (!summary) return null;

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + dayOffset);
  const dateStr = targetDate.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });

  const prompt = `Eres un guía de montaña experto en el País Vasco y Navarra. Analiza las condiciones meteorológicas para ${mountain.name} (${mountain.altitude}m, zona ${mountain.zone}) el ${dateStr}.

DATOS METEOROLÓGICOS (franja 6:00-20:00):
Cumbre (${mountain.altitude}m):
- Temperatura: min ${summary.summit.tempMin}°C, max ${summary.summit.tempMax}°C
- Viento: media ${summary.summit.windAvg} km/h, racha máx ${summary.summit.gustMax} km/h
- Precipitación total: ${summary.summit.precipTotal} mm
- Visibilidad mínima: ${summary.summit.visMin} m
- Cota de nieve: ${summary.summit.freezingAvg} m
- UV máximo: ${summary.summit.uvMax}
- Código meteorológico máximo: ${summary.summit.maxCode}

Base (${mountain.base.name}):
- Temperatura: min ${summary.base.tempMin}°C, max ${summary.base.tempMax}°C
- Viento: ${summary.base.windAvg} km/h, precipitación ${summary.base.precipTotal} mm

Diferencia térmica base-cumbre: ${summary.tempDiff}°C
Veredicto calculado: ${verdict.verdict} (peligrosidad ${verdict.danger})
Ventana horaria óptima: ${verdict.optimalWindow ? `${verdict.optimalWindow.startStr} - ${verdict.optimalWindow.endStr}` : 'no determinada'}

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "resumen": "párrafo de 3-4 frases describiendo la evolución del día",
  "ventana": "frase concisa con la ventana horaria recomendada y por qué",
  "peligrosidad": "frase explicando el nivel de peligrosidad y qué lo causa",
  "material": [
    {"item": "nombre del material", "razon": "motivo específico basado en los datos"}
  ]
}

El material debe tener entre 3 y 6 items. Solo incluir los realmente necesarios según las condiciones. Items posibles: Chubasquero, Forro polar, Cortavientos, Gorra de sol, Protector solar, Bastones, Capa impermeable, Guantes, Buff, Frontal. Todo en castellano, tono directo y práctico.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-calls': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const text = data.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const result = JSON.parse(jsonMatch[0]);
    AI_CACHE[cacheKey] = result;
    return result;
  } catch (err) {
    console.error('AI briefing error:', err);
    return null;
  }
}
