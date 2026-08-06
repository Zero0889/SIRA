# Improve App Plan

## Context

- Inicio: 2026-08-03.
- Producto: SIRA, sistema web de supervisión y decisión de riego agrícola basado en telemetría y FAO-56.
- Trabajo principal inferido y confirmado mediante libertad creativa: detectar qué parcela requiere atención, entender la causa y actuar sin revisar nodo por nodo.
- Superficie prioritaria: web de escritorio. No existen paywall, upsell ni afirmaciones comerciales.
- Evidencia disponible: código y base local, pruebas automatizadas, inspección de las pantallas a 1440 px y referencia visual aportada por el usuario. No hay analítica de uso ni entrevistas.
- Flujo con mayor fricción: Resumen construye el estado operativo con múltiples solicitudes por parcela y repite reglas de alertas en el navegador.

## Phase Status
| Phase | Skill | Status | Artifact | Date |
|---|---|---|---|---|
| 1 | jobs-to-be-done | done (método local) | CUSTOMER.md | 2026-08-03 |
| 2 | ux-heuristics | done (método local) | DESIGN.md, EXPERIMENTS.md | 2026-08-03 |
| 3 | design-everyday-things | done | DESIGN.md, EXPERIMENTS.md | 2026-08-03 |
| 4 | refactoring-ui | done | DESIGN.md, EXPERIMENTS.md | 2026-08-03 |
| 5 | microinteractions | done | DESIGN.md, EXPERIMENTS.md | 2026-08-06 |
| 6 | made-to-stick | done (método local) | POSITIONING.md, EXPERIMENTS.md | 2026-08-06 |
| 7 | influence-psychology | skipped: SIRA no vende ni ofrece planes dentro del producto | POSITIONING.md, EXPERIMENTS.md | 2026-08-03 |
| 8 | high-perf-browser | done (baseline técnico) | DESIGN.md, EXPERIMENTS.md | 2026-08-03 |
| 9 | steve-jobs-design-review | done (método local) | PRODUCT.md, DESIGN.md, EXPERIMENTS.md | 2026-08-06 |

## Key Decisions
| Date | Phase | Decision | Rationale |
|---|---|---|---|
| 2026-08-03 | 1 | Priorizar el uso diario sobre el primer registro | El producto ya crea parcelas; el costo recurrente está en interpretar el portafolio completo. |
| 2026-08-03 | 2 | Convertir Resumen en un centro de operaciones servido por un único endpoint | Elimina solicitudes N+1, centraliza reglas y mejora coherencia. |
| 2026-08-03 | 4 | Mantener tema blanco con verde como acento | Decisión explícita del usuario y mejor legibilidad de datos. |
| 2026-08-03 | 4 | Evolución dirigida, sin cambiar rutas ni navegación primaria | La arquitectura de información ya es clara y reconocible. |
| 2026-08-03 | 8 | Objetivos: INP < 200 ms, LCP < 2.5 s, CLS < 0.1 | Límites operativos para la web de escritorio. |
| 2026-08-06 | 5 | Feedback contextual y movimiento mínimo | SIRA debe comunicar estado sin distraer de las mediciones. |
| 2026-08-06 | 6 | Usar verbos y nombres observables en cada pantalla | Reduce jerga interna y evita promesas que la interfaz actual no cumple. |
| 2026-08-06 | 9 | Declarar el frontend listo para demostración formal | Las seis rutas, estados de recuperación y formatos escritorio/compacto mantienen una jerarquía coherente y compilan sin errores. |

## Next Actions
- [x] Implementar `GET /operations/overview` con métricas, alertas y tendencia (Codex).
- [x] Reemplazar el fan-out de solicitudes de Resumen por el endpoint agregado (Codex).
- [x] Integrar tendencia de riego y salud de parcelas en la interfaz (Codex).
- [ ] Medir rendimiento con datos de uso reales cuando exista telemetría suficiente (equipo SIRA).
- [x] Revisar las seis rutas principales en escritorio y formato compacto (Codex).
- [x] Añadir recuperación global de error y una ruta 404 propia (Codex).
