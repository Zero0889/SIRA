# Fuentes bibliográficas de los coeficientes de cultivo (Kc)

Este documento respalda cada valor de Kc cargado por
[`backend/app/scripts/seed_cultivos.py`](../backend/app/scripts/seed_cultivos.py).

Es el documento a citar en la defensa del proyecto ante cualquier pregunta
del jurado sobre "¿de dónde sacaron esos números?".

## Resumen por nivel de evidencia

| Cultivo | Fuente | Confianza | Ubicación del estudio |
|---|---|---|---|
| Papa | FAO-56 Tabla 12 | Alta | Global (referencia mundial) |
| Camote | FAO-56 Tabla 12 | Alta | Global |
| Arroz | FAO-56 Tabla 12 | Alta | Global |
| Maíz | FAO-56 Tabla 12 | Alta | Global |
| Tomate | FAO-56 Tabla 12 | Alta | Global |
| Cebolla | FAO-56 Tabla 12 (bulbo seco) | Alta | Global |
| **Oca** | Huanca-Quiroz & Calapuja 2013 | **Alta** | Puno, Perú (3825 msnm) |
| **Quinua** | García et al. 2017 | **Alta** | Perú, variedad QML01 |
| Cañihua | Analogía con quinua (mismo género *Chenopodium*) | **Provisional** | — |
| Kiwicha | Literatura general *Amaranthus* | **Provisional** | — |

El catálogo operativo se amplió a **60 cultivos**. Además de los diez
anteriores, incorpora especies cultivadas en el Perú con un equivalente
explícito en la Tabla 12 de FAO-56:

- hortalizas: brócoli, repollo, zanahoria, coliflor, apio, ajo, lechuga,
  espinaca, rábano, berenjena, pimiento, pepino, zapallo, zapallito, melón y
  sandía;
- raíces y leguminosas: betarraga, yuca, frijoles, garbanzo, habas, maní,
  lenteja, arveja y soya;
- cultivos comerciales: alcachofa, espárrago, fresa, algodón, sésamo y
  girasol;
- cereales y forrajes: cebada, avena, trigo, maíz choclo, sorgo, alfalfa y
  caña de azúcar;
- frutales y tropicales: plátano, cacao, café, piña, vid, palta, cítricos,
  olivo, manzano y durazno.

La presencia de estas especies en la agricultura peruana se contrastó con
el *Informe nacional sobre el estado de los recursos fitogenéticos para la
agricultura y la alimentación* (Perú, INIA/FAO). Su inclusión no convierte
los Kc estándar en una calibración peruana: salvo quinua y oca, siguen siendo
valores de referencia FAO bajo condiciones estándar.

---

## Fuente primaria: FAO-56

> **Allen, R.G., Pereira, L.S., Raes, D., Smith, M. (1998).**
> *Crop evapotranspiration — Guidelines for computing crop water requirements.*
> FAO Irrigation and Drainage Paper 56. Roma: FAO. ISBN 92-5-104219-5.
>
> Enlace: <https://www.fao.org/4/x0490e/x0490e00.htm>

Es la referencia mundial para riego agrícola. Los valores de Kc por etapa
provienen de la **Tabla 12** del documento (Kc_ini, Kc_mid, Kc_end).
Las duraciones de etapa provienen de la **Tabla 11**. La profundidad de
raíces y agotamiento permisible provienen de la **Tabla 22**.

**Cobertura**: unos 90 cultivos mayoritariamente de zonas templadas y
tropicales de gran escala comercial. **No incluye** cultivos andinos
nativos (quinua, cañihua, oca, olluco, mashua, kiwicha, tarwi, yacón).

---

## Fuente peruana: Oca (Huanca-Quiroz & Calapuja 2013)

> **Huanca-Quiroz, E. & Calapuja-Ayamamani, R. (2013).**
> Determinación del coeficiente de cultivo (Kc) y eficiencia en el uso
> de agua en la producción de oca (*Oxalis tuberosa* Mol.) en Puno.
> *Revista de Ciencias Agrarias* 7(7). Universidad Nacional del
> Altiplano, Puno, Perú.
>
> Enlace: <https://revistas.unap.edu.pe/agr/index.php/agr/article/view/455>

- **Ubicación**: CIP-ILLPA UNA-Puno, 3825 msnm (15°42'38"S, 70°04'54"W).
- **Método**: Lisímetro tipo NFC (Nivel Freático Constante) + validación
  Penman-Monteith y Hargreaves con datos SENAMHI.
- **Variedad**: clon "K'eny".
- **Campaña**: 2011-2012 (siembra 18-oct-2011, cosecha 30-abr-2012).
- **Ciclo total**: 190 días.
- **ETc total**: 566.23 mm (5662.3 m³/ha).
- **Rendimiento obtenido**: 41.3 t/ha.
- **Valores de Kc por método FAO (Tabla 3 del paper)**:

| Fase FAO | Duración (días) | Kc |
|---|---|---|
| Inicial | 35 | 0.41 |
| Desarrollo | 57 | 0.81 |
| Media | 68 | 1.15 |
| Final | 30 | 0.95 |

Nota: el paper también reporta valores por lisímetro directo (pico Kc=1.56 en
floración) más altos que la curva FAO. Elegimos la curva FAO por ser la
metodología estándar que usa nuestro motor de decisión.

---

## Fuente peruana: Quinua (García et al. 2017)

> **García M., Huahuachampi J. & Soto R. (2017).**
> Estudio del coeficiente de cultivo (Kc) en quinua variedad QML01 en Perú.
> *Revista Científica I+D Aswan Science*.
>
> Enlace de referencia: <https://portal.amelica.org/ameli/journal/752/7524027005/html/>

- **Variedad estudiada**: QML01.
- **Valores de Kc**:

| Fase | Duración (días) | Kc |
|---|---|---|
| Inicial | 25 | 0.55 |
| Desarrollo | 45 | 0.99 |
| Media | 60 | 1.27 |
| Final | 30 | 0.90 |

Estudios complementarios que respaldan el orden de magnitud:

- **Coaquira D. (2009)** — Tesis UNA-Puno sobre necesidades de agua en
  quinua *Salcedo INIA* en Puno. Kc reportados 0.6 – 1.4 según etapa.
- **Choquecallata et al. (1990)** — Quinua var. sajama amarantiforme en
  Altiplano boliviano (La Paz), IBTA-SENAMHI. ETM = 3.64 mm/día
  (promedio), pico 4.71 mm/día en floración.

---

## Cañihua — PROVISIONAL

> *No existe un estudio de Kc por etapa fenológica de cañihua
> (Chenopodium pallidicaule) con la misma solidez metodológica que los
> anteriores, o al menos no fue accesible al momento de este trabajo.*

Los valores cargados son **estimaciones por analogía taxonómica** con la
quinua (mismo género *Chenopodium*), ajustados a la baja por la reconocida
tolerancia a sequía de la cañihua.

Referencias que apoyan el orden de magnitud (ETc, no Kc):

- ETc reportada por lisímetro en CIP-ILLPA: **445.3 mm** ciclo completo.
- ETc en zona Suni-altiplano: **513 mm**.

**Tareas pendientes**: calibrar contra la tesis
"Huella hídrica del cultivo de kañiwa en las cuencas Coata e Illpa, Puno"
(ResearchGate publication 362500879) cuando se pueda acceder al PDF completo.

---

## Kiwicha — PROVISIONAL

> *Situación similar a cañihua: no se encontró estudio publicado con Kc
> por etapa para Amaranthus caudatus específicamente en condiciones
> peruanas.*

Los valores cargados son una **estimación general para amarantos** (planta
C4 con tolerancia media a sequía, área foliar amplia en fase media).

Duración de etapas basada en observación fenológica reportada:
inflorescencia visible a 50-70 días post-siembra, ciclo total ~150 días.

**Tareas pendientes**: contactar INIA-Ayacucho o UNSCH (Universidad
Nacional San Cristóbal de Huamanga) que trabaja variedades comerciales
de kiwicha (Oscar Blanco, Centenario, etc.) para pedir Kc calibrados.

---

## Recomendación para la defensa

Si te preguntan **"¿cómo validarían estos valores en campo?"**, la respuesta
técnica correcta es:

1. **Balance hídrico del suelo**: comparar ETc calculada (Kc × ETo) contra
   la variación de humedad medida por los sensores capacitivos del sistema.
2. **Ajuste de Kc local**: si tras un ciclo completo el balance no cierra,
   se ajusta el Kc de esa etapa por factor multiplicativo.
3. **Ajuste FAO-56 Ec. 62** para Kc_mid y Kc_end según humedad relativa
   mínima y velocidad del viento locales (ya implementable con las APIs
   Open-Meteo / NASA POWER que el sistema consulta).

Esa capacidad de auto-calibrar es un **diferencial defendible** del
proyecto frente a simples tablas fijas.

## Cómo agregar un cultivo nuevo

Editar `backend/app/scripts/seed_cultivos.py`, agregar una tupla al listado
`CULTIVOS` con: `(nombre, científico, familia, raíz_m, agotamiento,
[etapas...], fuente)`. Luego correr:

```bash
python -m app.scripts.seed_cultivos
```

El script detecta duplicados por `nombre_comun` y no re-inserta.

### Criterio usado para la etapa de desarrollo

La Tabla 12 publica tres puntos: `Kc_ini`, `Kc_mid` y `Kc_end`. SIRA almacena
cuatro etapas. Para los cultivos FAO incorporados en la ampliación, el valor
discreto de desarrollo es el punto medio entre `Kc_ini` y `Kc_mid`. Esto sirve
para el catálogo actual, aunque la implementación agronómica ideal debe
interpolar diariamente la recta de desarrollo conforme a FAO-56 Ec. 66.

Las duraciones cargadas son referencias de planificación, no calendarios
universales. Deben reemplazarse con fechas fenológicas locales por variedad,
campaña, altitud y sistema de manejo.
