"""Carga inicial de cultivos con Kc por etapa fenológica.

FUENTES (ver docs/kc_fuentes.md para el detalle bibliográfico):

  [FAO-56]   Allen R.G., Pereira L.S., Raes D., Smith M. (1998).
             Crop evapotranspiration — Guidelines for computing crop water
             requirements. FAO Irrigation and Drainage Paper 56, Tabla 12.
             https://www.fao.org/4/x0490e/x0490e00.htm

  [HUANCA13] Huanca-Quiroz E. & Calapuja-Ayamamani R. (2013). Determinación
             del coeficiente de cultivo (Kc) y eficiencia en el uso de agua
             en la producción de oca (Oxalis tuberosa Mol.) en Puno.
             Revista de Ciencias Agrarias 7(7), UNA-Puno. Lisímetro NFC,
             3825 msnm, campaña 2011-2012.

  [GARCIA17] García M., Huahuachampi J. & Soto R. (2017). Estudio del
             coeficiente de cultivo (Kc) en quinua variedad QML01 en Perú.
             Revista Científica I+D Aswan Science.

  [PROV]     Valores provisionales por analogía taxonómica o promedio de
             literatura general. REQUIEREN calibración local. Documentado
             como pendiente en docs/kc_fuentes.md.

Ejecutar:  python -m app.scripts.seed_cultivos
"""
import asyncio

from sqlalchemy import select

from app.config import get_settings
from app.db import Base, SessionLocal, engine
from app.models.cultivo import Cultivo, EtapaFenologica, KcEtapa

settings = get_settings()

# (nombre, cientifico, familia, raiz_m, agotamiento, [(etapa, dias, kc), ...], fuente)
CULTIVOS = [
    (
        "Papa",
        "Solanum tuberosum",
        "Solanaceae",
        0.5, 0.35,
        [
            (EtapaFenologica.INICIAL,    25, 0.50),
            (EtapaFenologica.DESARROLLO, 30, 0.80),
            (EtapaFenologica.MEDIA,      30, 1.15),
            (EtapaFenologica.FINAL,      20, 0.75),
        ],
        "FAO-56 Tabla 12 (Allen et al. 1998)",
    ),
    (
        "Camote",
        "Ipomoea batatas",
        "Convolvulaceae",
        0.4, 0.60,
        [
            (EtapaFenologica.INICIAL,    20, 0.50),
            (EtapaFenologica.DESARROLLO, 30, 0.85),
            (EtapaFenologica.MEDIA,      60, 1.15),
            (EtapaFenologica.FINAL,      40, 0.65),
        ],
        "FAO-56 Tabla 12 (Allen et al. 1998)",
    ),
    (
        "Arroz",
        "Oryza sativa",
        "Poaceae",
        0.75, 0.20,
        [
            (EtapaFenologica.INICIAL,    30, 1.05),
            (EtapaFenologica.DESARROLLO, 30, 1.10),
            (EtapaFenologica.MEDIA,      60, 1.20),
            (EtapaFenologica.FINAL,      30, 0.90),
        ],
        "FAO-56 Tabla 12 (Allen et al. 1998)",
    ),
    (
        "Maíz",
        "Zea mays",
        "Poaceae",
        1.0, 0.55,
        [
            (EtapaFenologica.INICIAL,    20, 0.30),
            (EtapaFenologica.DESARROLLO, 35, 0.80),
            (EtapaFenologica.MEDIA,      40, 1.20),
            (EtapaFenologica.FINAL,      30, 0.60),
        ],
        "FAO-56 Tabla 12 (Allen et al. 1998)",
    ),
    (
        "Quinua",
        "Chenopodium quinoa",
        "Amaranthaceae",
        0.6, 0.55,
        [
            (EtapaFenologica.INICIAL,    25, 0.55),
            (EtapaFenologica.DESARROLLO, 45, 0.99),
            (EtapaFenologica.MEDIA,      60, 1.27),
            (EtapaFenologica.FINAL,      30, 0.90),
        ],
        "García et al. 2017 (Perú, variedad QML01)",
    ),
    (
        "Oca",
        "Oxalis tuberosa",
        "Oxalidaceae",
        0.4, 0.35,
        [
            (EtapaFenologica.INICIAL,    35, 0.41),
            (EtapaFenologica.DESARROLLO, 57, 0.81),
            (EtapaFenologica.MEDIA,      68, 1.15),
            (EtapaFenologica.FINAL,      30, 0.95),
        ],
        "Huanca-Quiroz & Calapuja 2013 (UNA-Puno, 3825 msnm)",
    ),
    (
        "Cañihua",
        "Chenopodium pallidicaule",
        "Amaranthaceae",
        0.5, 0.55,
        [
            (EtapaFenologica.INICIAL,    25, 0.50),
            (EtapaFenologica.DESARROLLO, 40, 0.85),
            (EtapaFenologica.MEDIA,      60, 1.05),
            (EtapaFenologica.FINAL,      30, 0.75),
        ],
        "PROVISIONAL - analogía con quinua, requiere calibración local",
    ),
    (
        "Kiwicha",
        "Amaranthus caudatus",
        "Amaranthaceae",
        0.6, 0.55,
        [
            (EtapaFenologica.INICIAL,    20, 0.35),
            (EtapaFenologica.DESARROLLO, 40, 0.75),
            (EtapaFenologica.MEDIA,      60, 1.10),
            (EtapaFenologica.FINAL,      40, 0.60),
        ],
        "PROVISIONAL - literatura general Amaranthus, requiere calibración local",
    ),
    (
        "Tomate",
        "Solanum lycopersicum",
        "Solanaceae",
        0.9, 0.40,
        [
            (EtapaFenologica.INICIAL,    30, 0.60),
            (EtapaFenologica.DESARROLLO, 40, 0.85),
            (EtapaFenologica.MEDIA,      45, 1.15),
            (EtapaFenologica.FINAL,      30, 0.80),
        ],
        "FAO-56 Tabla 12 (Allen et al. 1998)",
    ),
    (
        "Cebolla",
        "Allium cepa",
        "Amaryllidaceae",
        0.4, 0.30,
        [
            (EtapaFenologica.INICIAL,    20, 0.70),
            (EtapaFenologica.DESARROLLO, 45, 0.95),
            (EtapaFenologica.MEDIA,      40, 1.05),
            (EtapaFenologica.FINAL,      30, 0.75),
        ],
        "FAO-56 Tabla 12 bulbo seco (Allen et al. 1998)",
    ),
]


def cultivo_fao(
    nombre: str,
    cientifico: str,
    familia: str,
    raiz_m: float,
    agotamiento: float,
    duraciones: tuple[int, int, int, int],
    kc_ini: float,
    kc_mid: float,
    kc_end: float,
    variante: str = "",
):
    """Crea una curva de cuatro etapas desde los tres puntos de FAO-56.

    FAO-56 define Kc_ini, Kc_mid y Kc_end. Para el registro discreto de SIRA,
    la etapa de desarrollo usa el punto medio de Kc_ini y Kc_mid. Las
    duraciones son referencias de planificación y deben calibrarse por
    variedad, fecha de siembra y localidad peruana.
    """
    ini, desarrollo, media, final = duraciones
    fuente = "FAO-56 Tabla 12 (Allen et al. 1998)"
    if variante:
        fuente += f" - {variante}"
    return (
        nombre,
        cientifico,
        familia,
        raiz_m,
        agotamiento,
        [
            (EtapaFenologica.INICIAL, ini, kc_ini),
            (EtapaFenologica.DESARROLLO, desarrollo, round((kc_ini + kc_mid) / 2, 2)),
            (EtapaFenologica.MEDIA, media, kc_mid),
            (EtapaFenologica.FINAL, final, kc_end),
        ],
        fuente,
    )


# Cultivos presentes en la agricultura peruana y con coeficientes explícitos
# en FAO-56 Tabla 12. La selección de especies cultivadas en Perú se contrasta
# con el Informe Nacional del Perú sobre recursos fitogenéticos (FAO/INIA).
# No se agregan especies que no tengan un equivalente claro en la tabla FAO.
CULTIVOS.extend([
    # Hortalizas pequeñas
    cultivo_fao("Brócoli", "Brassica oleracea var. italica", "Brassicaceae", 0.45, 0.45, (25, 35, 40, 15), 0.70, 1.05, 0.95),
    cultivo_fao("Repollo", "Brassica oleracea var. capitata", "Brassicaceae", 0.50, 0.45, (30, 40, 50, 20), 0.70, 1.05, 0.95),
    cultivo_fao("Zanahoria", "Daucus carota", "Apiaceae", 0.50, 0.35, (20, 30, 40, 20), 0.70, 1.05, 0.95),
    cultivo_fao("Coliflor", "Brassica oleracea var. botrytis", "Brassicaceae", 0.45, 0.45, (30, 40, 45, 15), 0.70, 1.05, 0.95),
    cultivo_fao("Apio", "Apium graveolens", "Apiaceae", 0.40, 0.20, (25, 40, 45, 20), 0.70, 1.05, 1.00),
    cultivo_fao("Ajo", "Allium sativum", "Amaryllidaceae", 0.40, 0.30, (20, 40, 50, 30), 0.70, 1.00, 0.70),
    cultivo_fao("Lechuga", "Lactuca sativa", "Asteraceae", 0.35, 0.30, (20, 30, 15, 10), 0.70, 1.00, 0.95),
    cultivo_fao("Espinaca", "Spinacia oleracea", "Amaranthaceae", 0.35, 0.20, (15, 25, 15, 10), 0.70, 1.00, 0.95),
    cultivo_fao("Rábano", "Raphanus sativus", "Brassicaceae", 0.30, 0.30, (10, 15, 10, 5), 0.70, 0.90, 0.85),
    # Solanáceas y cucurbitáceas
    cultivo_fao("Berenjena", "Solanum melongena", "Solanaceae", 0.75, 0.45, (30, 40, 60, 30), 0.60, 1.05, 0.90),
    cultivo_fao("Pimiento", "Capsicum annuum", "Solanaceae", 0.70, 0.30, (30, 40, 80, 30), 0.60, 1.05, 0.90, "pimiento dulce"),
    cultivo_fao("Pepino", "Cucumis sativus", "Cucurbitaceae", 0.45, 0.50, (20, 30, 40, 15), 0.60, 1.00, 0.75, "mercado fresco"),
    cultivo_fao("Zapallo", "Cucurbita maxima", "Cucurbitaceae", 0.60, 0.50, (20, 30, 40, 20), 0.50, 1.00, 0.80, "winter squash"),
    cultivo_fao("Zapallito italiano", "Cucurbita pepo", "Cucurbitaceae", 0.45, 0.50, (20, 25, 30, 15), 0.50, 0.95, 0.75, "zucchini"),
    cultivo_fao("Melón", "Cucumis melo", "Cucurbitaceae", 0.55, 0.50, (25, 35, 40, 20), 0.50, 1.05, 0.75),
    cultivo_fao("Sandía", "Citrullus lanatus", "Cucurbitaceae", 0.60, 0.40, (20, 30, 30, 20), 0.40, 1.00, 0.75),
    # Raíces, tubérculos y leguminosas
    cultivo_fao("Betarraga", "Beta vulgaris", "Amaranthaceae", 0.50, 0.50, (15, 25, 40, 20), 0.50, 1.05, 0.95, "table beet"),
    cultivo_fao("Yuca", "Manihot esculenta", "Euphorbiaceae", 0.80, 0.35, (30, 60, 120, 60), 0.30, 0.80, 0.30, "primer año"),
    cultivo_fao("Frijol verde", "Phaseolus vulgaris", "Fabaceae", 0.60, 0.45, (20, 30, 30, 10), 0.50, 1.05, 0.90),
    cultivo_fao("Frijol seco", "Phaseolus vulgaris", "Fabaceae", 0.70, 0.45, (20, 30, 40, 20), 0.40, 1.15, 0.35),
    cultivo_fao("Garbanzo", "Cicer arietinum", "Fabaceae", 0.80, 0.50, (20, 35, 45, 25), 0.40, 1.00, 0.35),
    cultivo_fao("Haba verde", "Vicia faba", "Fabaceae", 0.80, 0.45, (25, 35, 45, 20), 0.50, 1.15, 1.10, "cosecha fresca"),
    cultivo_fao("Haba seca", "Vicia faba", "Fabaceae", 0.80, 0.45, (25, 35, 50, 30), 0.50, 1.15, 0.30, "grano seco"),
    cultivo_fao("Maní", "Arachis hypogaea", "Fabaceae", 0.70, 0.50, (25, 35, 45, 25), 0.40, 1.15, 0.60),
    cultivo_fao("Lenteja", "Lens culinaris", "Fabaceae", 0.60, 0.50, (20, 30, 40, 20), 0.40, 1.10, 0.30),
    cultivo_fao("Arveja verde", "Pisum sativum", "Fabaceae", 0.60, 0.35, (20, 30, 35, 15), 0.50, 1.15, 1.10, "cosecha fresca"),
    cultivo_fao("Soya", "Glycine max", "Fabaceae", 0.80, 0.50, (20, 35, 60, 25), 0.40, 1.15, 0.50),
    # Hortalizas perennes, fibras y oleaginosas
    cultivo_fao("Alcachofa", "Cynara cardunculus var. scolymus", "Asteraceae", 0.80, 0.45, (40, 40, 70, 30), 0.50, 1.00, 0.95),
    cultivo_fao("Espárrago", "Asparagus officinalis", "Asparagaceae", 1.20, 0.45, (30, 50, 90, 30), 0.50, 0.95, 0.30),
    cultivo_fao("Fresa", "Fragaria × ananassa", "Rosaceae", 0.35, 0.20, (20, 30, 75, 25), 0.40, 0.85, 0.75),
    cultivo_fao("Algodón", "Gossypium barbadense", "Malvaceae", 1.20, 0.65, (30, 50, 55, 45), 0.35, 1.18, 0.60),
    cultivo_fao("Sésamo", "Sesamum indicum", "Pedaliaceae", 0.90, 0.60, (20, 30, 40, 20), 0.35, 1.10, 0.25),
    cultivo_fao("Girasol", "Helianthus annuus", "Asteraceae", 1.00, 0.45, (25, 35, 45, 25), 0.35, 1.10, 0.35),
    # Cereales y forrajes
    cultivo_fao("Cebada", "Hordeum vulgare", "Poaceae", 1.00, 0.55, (20, 30, 50, 30), 0.30, 1.15, 0.25),
    cultivo_fao("Avena", "Avena sativa", "Poaceae", 1.00, 0.55, (20, 30, 50, 30), 0.30, 1.15, 0.25),
    cultivo_fao("Trigo", "Triticum aestivum", "Poaceae", 1.00, 0.55, (20, 30, 50, 30), 0.30, 1.15, 0.30, "trigo de primavera"),
    cultivo_fao("Maíz choclo", "Zea mays", "Poaceae", 1.00, 0.55, (20, 35, 40, 20), 0.30, 1.15, 1.05, "maíz dulce cosechado fresco"),
    cultivo_fao("Sorgo", "Sorghum bicolor", "Poaceae", 1.20, 0.55, (20, 35, 45, 30), 0.30, 1.05, 0.55, "grano"),
    cultivo_fao("Alfalfa", "Medicago sativa", "Fabaceae", 1.20, 0.55, (10, 20, 40, 10), 0.40, 0.95, 0.90, "promedio entre cortes"),
    cultivo_fao("Caña de azúcar", "Saccharum officinarum", "Poaceae", 1.50, 0.65, (35, 60, 190, 60), 0.40, 1.25, 0.75),
    # Frutales y cultivos tropicales relevantes en Perú
    cultivo_fao("Plátano", "Musa spp.", "Musaceae", 1.20, 0.35, (60, 90, 150, 65), 0.50, 1.10, 1.00, "primer año"),
    cultivo_fao("Cacao", "Theobroma cacao", "Malvaceae", 1.20, 0.30, (60, 90, 120, 95), 1.00, 1.05, 1.05),
    cultivo_fao("Café", "Coffea arabica", "Rubiaceae", 1.20, 0.40, (60, 90, 120, 95), 0.90, 0.95, 0.95, "suelo sin cobertura activa"),
    cultivo_fao("Piña", "Ananas comosus", "Bromeliaceae", 0.60, 0.50, (60, 90, 180, 90), 0.50, 0.30, 0.30, "suelo desnudo con acolchado plástico"),
    cultivo_fao("Vid", "Vitis vinifera", "Vitaceae", 1.00, 0.45, (30, 60, 120, 60), 0.30, 0.85, 0.45, "uva de mesa"),
    cultivo_fao("Palta", "Persea americana", "Lauraceae", 1.20, 0.40, (60, 90, 120, 95), 0.60, 0.85, 0.75, "sin cobertura del suelo"),
    cultivo_fao("Cítricos", "Citrus spp.", "Rutaceae", 1.10, 0.50, (60, 90, 120, 95), 0.65, 0.60, 0.65, "50 % de cobertura, suelo sin cobertura activa"),
    cultivo_fao("Olivo", "Olea europaea", "Oleaceae", 1.20, 0.65, (60, 90, 120, 95), 0.65, 0.70, 0.70, "40 a 60 % de cobertura"),
    cultivo_fao("Manzano", "Malus domestica", "Rosaceae", 1.20, 0.50, (30, 50, 120, 60), 0.60, 0.95, 0.75, "sin cobertura activa y sin helada terminal"),
    cultivo_fao("Durazno", "Prunus persica", "Rosaceae", 1.20, 0.50, (30, 50, 120, 60), 0.55, 0.90, 0.65, "frutal de carozo, suelo sin cobertura y sin helada terminal"),
])


async def seed():
    # En desarrollo local puede inicializar SQLite. En producción, Alembic debe
    # ejecutarse primero y permanece como única fuente de verdad del esquema.
    if settings.app_env == "development":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as db:
        for nombre, cientifico, familia, raiz, agot, kcs, fuente in CULTIVOS:
            existing = await db.execute(
                select(Cultivo).where(Cultivo.nombre_comun == nombre)
            )
            if existing.scalar_one_or_none():
                print(f"  - {nombre}: ya existe, se omite")
                continue

            cultivo = Cultivo(
                nombre_comun=nombre,
                nombre_cientifico=cientifico,
                familia=familia,
                profundidad_raiz_m=raiz,
                agotamiento_permisible=agot,
            )
            db.add(cultivo)
            await db.flush()

            for orden, (etapa, dur, kc) in enumerate(kcs, start=1):
                db.add(
                    KcEtapa(
                        cultivo_id=cultivo.id,
                        etapa=etapa,
                        orden=orden,
                        duracion_dias=dur,
                        kc=kc,
                    )
                )
            print(f"  [OK] {nombre:10s} ({len(kcs)} etapas, Kc max={max(k[2] for k in kcs):.2f}) - {fuente}")

        await db.commit()
        print(f"\nSeed completado ({len(CULTIVOS)} cultivos).")


if __name__ == "__main__":
    asyncio.run(seed())
