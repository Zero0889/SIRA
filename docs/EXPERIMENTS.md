# Experiments

## Experiment Cards

### EXP-001 - Resumen agregado
- Hypothesis: creemos que el centro de operaciones se sentirá más rápido y confiable si una sola respuesta contiene parcelas, métricas, alertas y tendencia, porque elimina el fan-out y las reglas duplicadas.
- Type: sprint.
- Primary metric & threshold (pre-committed): una solicitud de datos para cargar Resumen, independientemente del número de parcelas.
- Guardrail metric: no perder ningún campo visible ni alerta existente.
- Decision rule (pivot / persevere / iterate): perseverar si las pruebas de contrato pasan y la interfaz reproduce todos los estados; iterar si falta contexto por parcela.
- Result & verdict: perseverar. El resumen usa una única solicitud SWR a `/operations/overview`, el contrato backend tiene pruebas dedicadas y la revisión de escritorio mostró métricas, alertas, tendencia y parcelas sin errores de consola ni desbordamiento horizontal.

### EXP-002 - Pulido integral del frontend
- Hypothesis: creemos que una jerarquía, color, feedback y lenguaje coherentes entre rutas aumentarán la confianza percibida sin ocultar estados técnicos.
- Type: polish.
- Primary metric & threshold (pre-committed): seis rutas principales verificadas en escritorio y formato compacto sin recorte horizontal ni pérdida de acciones.
- Guardrail metric: conservar rutas, datos, metodología, estados semánticos y navegación por teclado.
- Decision rule (pivot / persevere / iterate): perseverar si la compilación, TypeScript y ESLint pasan y todas las rutas responden; iterar ante cualquier desbordamiento o estado sin recuperación.
- Result & verdict: perseverar. Las seis rutas respondieron con HTTP 200, la ruta inválida con 404 propia, no hubo errores en el registro del frontend y la revisión visual confirmó reflujo correcto.

## Experiment Backlog
| Idea | ICE (impact/confidence/ease) | Status |
|---|---|---|
| Endpoint agregado de operaciones | 9/9/8 | done |
| Tendencia de riego de 14 días | 8/8/7 | done |
| Estado de frescura de datos | 7/9/9 | done |
| Fila de salud por parcela | 8/8/8 | done |
| Optimistic UI para acciones de configuración | 5/6/5 | pending |
| Feedback contextual al reintentar conexión | 7/9/9 | done |
| Compactar tarjetas de parcelas en móvil | 8/8/9 | done |
| Sustituir etiquetas abstractas por estado observable | 7/9/10 | done |
