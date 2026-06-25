# TontorApp — Meteorología de Montaña

Previsión meteorológica técnica para senderismo y trail running en Euskadi y Navarra. PWA (Progressive Web App) sin backend, todo en el cliente.

## Características

- Previsión detallada para 13 cumbres predefinidas del País Vasco y Navarra
- Datos en tres cotas: base (pueblo), zona media y cumbre
- Veredicto diario: ÓPTIMO / BUENO / ACEPTABLE / MALO con nivel de peligrosidad
- Ventana horaria óptima calculada automáticamente (6:00–20:00)
- Gráficas interactivas: temperatura, viento, precipitación, sensación térmica, visibilidad
- Radar de precipitaciones en tiempo real con animación (RainViewer)
- Análisis IA con resumen, recomendaciones y material necesario (Anthropic Claude)
- Instalable como PWA en iOS y Android
- Funciona offline con datos cacheados

## Cumbres incluidas

| Cumbre | Zona | Altitud | Base |
|--------|------|---------|------|
| Aizkorri | Gipuzkoa | 1528m | Oñati |
| Aratz | Gipuzkoa | 1443m | Aretxabaleta |
| Txindoki | Gipuzkoa | 1346m | Lazkao |
| Aralar | Gipuzkoa | 1427m | Ataun |
| Ernio | Gipuzkoa | 1075m | Zestoa |
| Anboto | Bizkaia | 1331m | Durango |
| Gorbeia | Bizkaia | 1482m | Zuia |
| Urkiola | Bizkaia | 1000m | Abadiño |
| Orhi | Navarra | 2021m | Ochagavía |
| Mendaur | Navarra | 1131m | Saldías |
| Larrun | Navarra | 900m | Vera de Bidasoa |
| Peñas de Aia | Navarra | 833m | Oiartzun |
| Autza | Navarra | 1305m | Elizondo |

## Desplegar en GitHub Pages (3 pasos)

1. Fork o clona este repositorio en tu cuenta de GitHub
2. Ve a **Settings → Pages**, selecciona la rama `main` como fuente
3. Tu app estará disponible en `https://<tu-usuario>.github.io/<repo>/`

## Instalar como PWA

**iOS (Safari):**
1. Abre la URL en Safari
2. Pulsa el botón Compartir (cuadrado con flecha)
3. Selecciona «Añadir a pantalla de inicio»
4. Confirma con «Añadir»

**Android (Chrome):**
1. Abre la URL en Chrome
2. Aparecerá un banner automático «Instalar app», o usa el menú (⋮) → «Instalar app»
3. Confirma la instalación

## Obtener API Key de Anthropic (para análisis IA)

1. Ve a [console.anthropic.com](https://console.anthropic.com)
2. Crea una cuenta o inicia sesión
3. Ve a **API Keys** y genera una nueva clave
4. Pégala en TontorApp: pantalla de bienvenida o **Ajustes → API Key**

La clave se guarda únicamente en tu dispositivo (localStorage). Los textos IA son opcionales; la app funciona completamente sin ellos.

## Fuentes de datos

- **Open-Meteo** (gratuito, sin API key): previsión meteorológica
- **RainViewer** (gratuito): radar de precipitaciones
- **Anthropic Claude** (requiere API key): análisis y recomendaciones IA
- **OpenStreetMap**: tiles de mapa base
