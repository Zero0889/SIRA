# Product

## Vision

Hacer que una decisión diaria de riego sea visible, explicable y ejecutable aun cuando la infraestructura de campo sea limitada o intermitente.

## MVP Definition

Aplicación web local con catálogo agronómico, parcelas georreferenciadas, ingestión de telemetría, cálculo FAO-56, recomendación de riego, alertas y documentación. Excluye control autónomo irreversible, facturación y gestión multiempresa.

## Outcome Roadmap
| Outcome / problem | Job served | Priority | Status |
|---|---|---|---|
| Ver la prioridad de todas las parcelas en una carga | Supervisión diaria | P0 | done |
| Entender tendencia de uso de agua y actividad | Planificación | P1 | done |
| Recuperarse de nodo o proveedor meteorológico caído | Continuidad operativa | P1 | in-progress |
| Calibrar umbrales por parcela | Precisión local | P2 | pending |
| Mantener una experiencia coherente en todas las rutas y tamaños | Confianza operativa | P1 | done |

## Opportunity Solution Tree Notes

Oportunidad principal: reducir el tiempo entre una anomalía y una acción informada. Solución actual: resumen agregado con alertas ordenadas, tendencia y enlaces directos a cada parcela.

## Hook Model

Lectura o revisión diaria → abrir Resumen → encontrar prioridad y causa → entrar a parcela → registrar o ejecutar la acción. El punto más débil es la recompensa variable: el resumen todavía no muestra evolución temporal del portafolio.

## Activation & Retention Plan
| Friction / moment | Fix | Owner | Status |
|---|---|---|---|
| Resumen lento con varias parcelas | Endpoint agregado | Codex | in-progress |
| Falta de confianza en frescura | Hora de corte e indicador de conexión | Codex | in-progress |
| Falta de contexto histórico global | Tendencia de 14 días | Codex | in-progress |

## Discovery Cadence

Revisar semanalmente alertas repetidas, tiempos sin conexión y recomendaciones que el operador ignora. Convertir cada patrón en una hipótesis medible antes de ampliar automatización.

## Final Product Review

- Veredicto: listo para demostración formal y evaluación de concurso.
- Una cosa: mostrar qué parcela o condición necesita atención y explicar por qué.
- Pasos al valor principal: abrir Resumen y seleccionar la prioridad detectada.
- Superficies revisadas: Resumen, Parcelas, Cultivos, Documentación, Configuración, detalle de parcela, carga, error y ruta no encontrada.
- Deuda posterior: medir INP, LCP y CLS con telemetría real; validar recomendaciones y calibración con datos de campo.
