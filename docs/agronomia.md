# Kc, ETo y datos agronómicos

## No son el mismo tipo de dato

- **Kc** depende del cultivo, variedad, etapa y manejo. Se toma de FAO-56 o de ensayos locales y debe conservar su fuente.
- **ETo** depende del lugar, fecha y clima. No existe una sola “ETo del Perú”; se calcula como una serie temporal para las coordenadas de cada parcela.
- **ETc** combina ambos: `ETc = Kc × ETo`.

## Cómo obtiene ETo el sistema

SIRA solicita temperatura máxima y mínima, humedad, viento a 2 m, radiación solar y presión. Para fechas recientes usa Open-Meteo; para históricos de al menos tres días intenta NASA POWER. Con esas variables ejecuta Penman-Monteith FAO-56 en `backend/app/agronomy/eto.py`.

### Normalización atmosférica

Antes de Penman-Monteith, SIRA normaliza los datos meteorológicos:

1. usa la presión superficial de Open-Meteo o NASA POWER y, si falta, la
   estima desde la altitud con FAO-56 Ec. 7;
2. convierte el viento de Open-Meteo desde 10 m hasta 2 m mediante FAO-56
   Ec. 47; NASA POWER ya entrega `WS2M`;
3. conserva las lecturas del nodo de campo separadas de los datos de malla:
   el sensor de suelo aplica reglas locales, pero no reemplaza temperatura,
   radiación o viento requeridos por la ETo diaria;
4. calcula presión de vapor, radiación neta y finalmente ETo con FAO-56 Ec. 6.

Para contrastar resultados peruanos se puede consultar el monitoreo decadal de ETo de SENAMHI. Ese producto sirve como control regional, no como reemplazo automático del valor diario puntual sin comprobar resolución espacial, periodo y método.

Los enlaces oficiales, el documento técnico descargado y una guía de comparación están reunidos en [referencias_oficiales.md](referencias_oficiales.md).

## Procedimiento para incorporar un cultivo

1. Definir nombre científico, variedad, región, altitud, fecha de siembra y sistema de riego.
2. Buscar primero un estudio local con lisímetro o balance hídrico y ETo FAO-56.
3. Si no existe, usar FAO-56 Tabla 12 y duraciones de Tabla 11 como referencia inicial.
4. Guardar Kc inicial, medio y final, duraciones, raíz y agotamiento permisible; la etapa de desarrollo se representa como transición.
5. Clasificar el dato como `local`, `referencia FAO` o `provisional`.
6. Registrar la cita y las condiciones del estudio en `docs/kc_fuentes.md`.
7. Agregar el cultivo en `backend/app/scripts/seed_cultivos.py` y ejecutar el seed.
8. Validar durante al menos un ciclo mediante balance de agua, caudal aplicado y respuesta de humedad del suelo.

## Criterio de calidad recomendado

| Nivel | Uso recomendado |
|---|---|
| Local validado | Misma especie/variedad y condiciones agroclimáticas comparables |
| Referencia FAO | Punto de partida con ajuste por clima y manejo |
| Provisional | Demostración o investigación; no automatización productiva sin calibrar |

## Catálogo actual

El catálogo contiene 60 cultivos presentes en la agricultura peruana. La
mayoría usa valores de referencia FAO-56; quinua y oca cuentan con referencias
peruanas identificadas. Cañihua y kiwicha permanecen como aproximaciones
explícitamente provisionales. El detalle completo está en
[kc_fuentes.md](kc_fuentes.md).

## Mejoras técnicas recomendadas

- Guardar fuente, variedad, región, confianza y fecha de revisión como campos de base de datos, no solo en documentos.
- Aplicar el ajuste climático FAO-56 de Kc medio/final con viento, humedad mínima y altura del cultivo.
- Incorporar precipitación efectiva y eficiencia del sistema de riego.
- Comparar ETo calculada con el producto de SENAMHI y registrar desviaciones.
- Permitir varias curvas Kc para una misma especie según variedad o zona agroecológica.
