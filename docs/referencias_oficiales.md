# Referencias oficiales adjuntas

## 1. Monitoreo decadal de ETo - SENAMHI

- **Institución:** Servicio Nacional de Meteorología e Hidrología del Perú (SENAMHI).
- **Producto:** mapa de evapotranspiración de referencia con periodo decadal, es decir, un resultado para cada intervalo aproximado de diez días del mes.
- **Variables indicadas por SENAMHI:** radiación, temperatura del aire, humedad atmosférica y velocidad del viento.
- **Acceso oficial:** <https://sia.senamhi.gob.pe/monitoreo/evapotranspiracion>
- **Geoportal IDESEP:** <https://idesep.senamhi.gob.pe/portalidesep/idesep_tema_monitoreo_evapotranspiracion.jsp>
- **Acceso a geoservicios:** <https://idesep.senamhi.gob.pe/portalidesep/idesep_componente_catalogo_geoservicios_wfs.jsp>

También se adjunta el acceso directo [SENAMHI_monitoreo_decadal_ETo.url](SENAMHI_monitoreo_decadal_ETo.url), que abre el visor oficial en Windows.

### Cómo utilizarlo con SIRA

1. Seleccionar la década y zona donde se encuentra la parcela.
2. Anotar la ETo representativa del periodo y sus unidades.
3. Calcular el promedio de las ETo diarias de SIRA para las mismas fechas.
4. Comparar ambos valores mediante diferencia absoluta y porcentual.
5. Documentar resolución espacial, estación o píxel utilizado y fecha de consulta.

El mapa de SENAMHI no incorpora características del cultivo ni del suelo. Por ello se compara con la **ETo** de SIRA y no directamente con ETc o con los minutos de riego.

## 2. Documento técnico ANA - Cuenca del Mantaro

- **Institución:** Autoridad Nacional del Agua (ANA).
- **Documento adjunto:** [ANA - Proyecto de embalses y lagunas en la cuenca del Mantaro](../output/pdf/ANA_proyecto_embalses_coeficientes_Kc.pdf).
- **Contenido relevante:** página 53 del PDF (página 35 del documento), cuadros 22, 23 y 24.

La página relevante contiene:

- registros meteorológicos de la estación Huayao;
- ETo diaria promedio por mes y total anual;
- Kc mensuales para quinua, papa, alfalfa, avena forrajera, trigo, haba grano verde y maíz choclo.

Estos Kc son parte de una cédula mensual de cultivos para una zona y calendario específicos. No deben copiarse como si fueran coeficientes universales por etapa. Antes de incorporarlos a SIRA hay que reconstruir el calendario de siembra, relacionar cada mes con la etapa fenológica y comprobar que la ubicación sea agroclimáticamente comparable.

## 3. Manual metodológico FAO-56

- **Institución:** Organización de las Naciones Unidas para la Alimentación y la Agricultura (FAO).
- **Documento:** Allen, Pereira, Raes y Smith (1998), *Crop evapotranspiration - Guidelines for computing crop water requirements*.
- **Acceso oficial:** <https://www.fao.org/4/x0490e/x0490e00.htm>

La descarga automática del PDF completo puede fallar por disponibilidad del servidor de FAO; el enlace oficial por capítulos permanece incluido como fuente primaria. Para SIRA son especialmente relevantes las tablas 11, 12 y 22 y las ecuaciones 6, 17, 39, 47, 56 y 62.

## Trazabilidad recomendada

Al usar un valor en el catálogo, registrar siempre:

| Campo | Ejemplo |
|---|---|
| Institución y documento | ANA, proyecto de la cuenca del Mantaro |
| Página y cuadro | PDF p. 53, cuadro 24 |
| Cultivo y variedad | Quinua; variedad no indicada |
| Lugar | Estación Huayao, Mantaro |
| Altitud | 3308 m s. n. m. |
| Tipo de valor | Kc mensual de cédula |
| Nivel de confianza | Referencia regional; requiere adaptación |
| Fecha de consulta | 25 de julio de 2026 |

