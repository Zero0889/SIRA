# Design System

## Design Direction

Interfaz agronómica de confianza: lienzo mineral muy claro, superficies blancas, tipografía oscura, cabecera verde bosque y fotografía real de cultivo. La identidad toma del tablero de marca las terrazas, curvas topográficas, agua y sensores, pero reserva las superficies oscuras para navegación y contexto principal.

Lectura de diales: `DESIGN_VARIANCE 5`, `MOTION_INTENSITY 3`, `VISUAL_DENSITY 7`. Evolución dirigida sobre la arquitectura actual.

## Typography

- Familia: Segoe UI Variable / Aptos / system-ui, con números tabulares.
- Jerarquía: títulos compactos, etiquetas operativas breves y cifras grandes sin adornos.
- Medida: 45-75 caracteres para texto técnico; los paneles de datos priorizan escaneo.
- Carga: fuentes del sistema, sin solicitudes externas.

## Tokens

- Espaciado: 4, 8, 16, 24, 32, 48 y 64 px.
- Lienzo: blanco mineral con tinte agronómico leve; superficies principales blancas; superficie secundaria `#F4F7F4`.
- Marca: `#17643A`; marca fuerte `#10502E`; marca suave `#DCEEE3`.
- Cabecera: escala perceptual OKLCH de verde bosque, texto casi blanco y superficies de interacción diferenciadas.
- Tinta: `#132018`; tinta secundaria `#536259`; línea `#D5DFD6`.
- Radio: 12-16 px en superficies, 8-12 px en controles, cápsulas solo para estado breve.
- Sombras: verdes muy tenues y reservadas para jerarquía real.

## Components
| Component | Decision | Status |
|---|---|---|
| Encabezado de producto | Marca vectorial, navegación estable y superficie verde bosque de alto contraste | done |
| Centro de documentación | Portada, navegación persistente y rutas por tarea | done |
| Catálogo de cultivos | Maestro-detalle con 60 fotografías específicas | done |
| Centro de operaciones | Resumen agregado, tendencia y prioridades | done |
| Estado de parcela | Una fila compacta con salud, lectura y acción sugerida | done |

## UX Audit Findings
| Issue | Heuristic | Severity (0-4) | Fix | Status |
|---|---|---:|---|---|
| El resumen solicita una vez por cada parcela | Rendimiento / eficiencia | 3 | Endpoint agregado de operaciones | done |
| Las reglas de alerta se duplican en frontend y backend | Consistencia y estándares | 3 | Hacer del backend la fuente única de alertas | done |
| No hay tendencia temporal del portafolio | Visibilidad del estado | 2 | Agregar tendencia de minutos y volumen de riego | done |
| El estado global no incluye hora de corte | Correspondencia con el mundo real | 2 | Mostrar fecha de generación y frescura | done |
| Configuración y resumen no exponen salud del backend | Recuperación de errores | 2 | Añadir estado operacional contextual | done |
| Listas de parcelas usan un icono genérico | Reconocimiento sobre recuerdo | 1 | Usar imagen real de cultivo y estado semántico | done |
| Una ruta inválida dependía de la respuesta genérica del framework | Recuperación de errores | 1 | Añadir 404 propia con rutas de regreso | done |
| Un fallo inesperado no ofrecía recuperación global | Control y libertad | 2 | Añadir límite de error con reintento y retorno al resumen | done |

## Microinteraction Inventory
| Interaction | Trigger/Rules/Feedback/Loops | Fix | Status |
|---|---|---|---|
| Actualización automática | Cada 10 s; conservar datos previos; anunciar cambio sin mover layout | Indicador de frescura estable | done |
| Seleccionar parcela | Click; abrir detalle; feedback táctil inmediato | Mantener active/hover y foco visible | done |
| Reintentar conexión | Click solo en error; mostrar carga; resolver en el mismo panel | Botón deshabilitado, icono en progreso y texto “Reintentando” | done |
| Alerta operativa | Umbral backend; ordenar por gravedad; enlazar a la parcela | Fila contextual y accionable | done |
| Abrir menú del operador | Click; mostrar opciones; cerrar con Escape o click exterior | Entrada corta con origen en el botón y foco visible | done |
| Filtrar parcelas o cultivos | Click; una selección activa; conservar resultados visibles | Estado seleccionado con color, conteo y transición breve | done |

Diagnóstico de microinteracciones: 9/10. La evolución según uso queda diferida hasta disponer de identidad o persistencia por operador.
