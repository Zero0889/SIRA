import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowRight,
  BookOpenText,
  BracketsCurly,
  Calculator,
  CheckCircle,
  CloudSun,
} from "@phosphor-icons/react/dist/ssr";
import { MathBlock, MathInline } from "@/components/Math";
import { DocsCropTable } from "@/components/DocsCropTable";
import { DocsToc } from "@/components/DocsToc";

export const metadata: Metadata = {
  title: "Documentación",
  description: "Documentación técnica de SIRA: metodología FAO-56, fórmulas de ETo y Kc, fuentes de datos e instrucciones de uso",
};

const TOC = [
  { id: "guia", label: "Guía rápida", group: "Inicio" },
  { id: "intro", label: "Introducción", group: "Inicio" },
  { id: "flujo", label: "Flujo de decisión", group: "Inicio" },
  { id: "origen-datos", label: "Del dato a la parcela", group: "Datos atmosféricos" },
  { id: "presion", label: "Presión y altitud", group: "Datos atmosféricos" },
  { id: "viento", label: "Viento a 2 metros", group: "Datos atmosféricos" },
  { id: "vapor-radiacion", label: "Vapor y radiación", group: "Datos atmosféricos" },
  { id: "eto", label: "ETo: Penman-Monteith", group: "Modelo agronómico" },
  { id: "kc", label: "Coeficiente de cultivo", group: "Modelo agronómico" },
  { id: "etc", label: "ETc y tiempo de riego", group: "Modelo agronómico" },
  { id: "datos", label: "Fuentes meteorológicas", group: "Referencia" },
  { id: "tabla", label: "Catálogo Kc", group: "Referencia" },
  { id: "api", label: "API e integración", group: "Referencia" },
  { id: "ref", label: "Bibliografía", group: "Referencia" },
];

function Seccion({ id, titulo, children }: { id: string; titulo: string; children: React.ReactNode }) {
  return (
    <section id={id} className="docs-section scroll-mt-28">
      <div className="mb-5 flex items-start gap-3">
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#17643a]" aria-hidden="true" />
        <h2 className="text-2xl font-bold tracking-[-0.035em] text-gray-950 md:text-[1.7rem]">{titulo}</h2>
      </div>
      <div className="docs-prose space-y-5">{children}</div>
    </section>
  );
}

function FlowBox({
  title, sub, tone = "plain",
}: { title: React.ReactNode; sub?: string; tone?: "plain" | "accent" | "highlight" }) {
  const tones = {
    plain: "bg-gray-50 border-gray-200",
    accent: "bg-sira-green/10 border-sira-green/30",
    highlight: "bg-[#e7f3eb] text-[#10502e] border-[#17643a]/30",
  }[tone];
  return (
    <div className={`rounded-lg border px-4 py-3 text-center ${tones}`}>
      <div className="font-semibold text-sm">{title}</div>
      {sub && <div className="mt-0.5 text-xs text-gray-500">{sub}</div>}
    </div>
  );
}
function Arrow() {
  return <div className="text-center text-sira-green text-xl leading-none select-none">↓</div>;
}

export default function DocumentacionPage() {
  return (
    <div className="space-y-7">
      <header className="docs-hero overflow-hidden rounded-2xl border bg-white">
        <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,.85fr)]">
          <div className="flex flex-col justify-center p-7 sm:p-9 xl:p-12">
            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e7f3eb] text-[#17643a]">
                <BookOpenText size={23} weight="duotone" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#17643a]">Centro de conocimiento</p>
                <p className="mt-1 text-xs text-gray-500">Manual técnico · versión de campo</p>
              </div>
            </div>
            <h1 className="max-w-3xl text-4xl font-bold leading-[1.04] tracking-[-0.04em] text-gray-950 sm:text-5xl">Entiende cada decisión de riego.</h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600">Una guía práctica y trazable del recorrido completo: desde el dato meteorológico y el cultivo hasta la lámina de agua y los minutos de bomba.</p>
            <div className="mt-7 flex flex-wrap gap-2 text-xs font-semibold text-gray-600">
              {['FAO-56', 'Open-Meteo', 'NASA POWER', 'SENAMHI'].map((tag) => <span key={tag} className="rounded-full border bg-white px-3 py-1.5">{tag}</span>)}
            </div>
          </div>
          <figure className="relative min-h-[19rem] border-t bg-[#f4f7f4] lg:min-h-full lg:border-l lg:border-t-0">
            <Image src="/images/sira-andes-irrigation.webp" alt="Sistema de riego SIRA operando en terrazas agrícolas andinas" fill priority sizes="(min-width:1280px) 480px, 100vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-white/35 via-transparent to-transparent" />
            <figcaption className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/70 bg-white/90 p-3 text-xs leading-relaxed text-gray-600 shadow-sm backdrop-blur-md">La documentación conecta clima, cultivo, sensores y actuación en un único flujo verificable.</figcaption>
          </figure>
        </div>
        <div className="grid border-t sm:grid-cols-3 sm:divide-x">
          <DocMetric icon={<CheckCircle size={19} weight="duotone" />} label="Metodología" value="FAO-56 trazable" />
          <DocMetric icon={<CloudSun size={19} weight="duotone" />} label="Fuentes" value="3 proveedores climáticos" />
          <DocMetric icon={<BracketsCurly size={19} weight="duotone" />} label="Integración" value="API + nodos compatibles" />
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)] lg:items-start lg:gap-8 xl:gap-10">
      <aside className="mb-7 lg:sticky lg:top-24 lg:mb-0 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:pr-2">
        <div className="rounded-xl border bg-white p-2.5 lg:p-3.5">
          <DocsToc items={TOC} />
        </div>
      </aside>

      {/* ---------- Contenido ---------- */}
      <article className="min-w-0 space-y-5">

        <Seccion id="guia" titulo="Guía rápida de la documentación">
          <p className="text-gray-700 leading-relaxed">
            Usa esta página según lo que necesites resolver. Así se separa el uso cotidiano del sistema de su
            fundamento técnico y de la integración con otros dispositivos.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <a href="#uso" className="docs-route-card group">
              <BookOpenText size={21} weight="duotone" aria-hidden="true" />
              <div className="font-semibold text-gray-900">Quiero usar SIRA</div>
              <div className="mt-1 text-sm text-gray-500">Arranque, parcela, cultivo y lectura de resultados.</div>
              <ArrowRight size={16} className="mt-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a href="#eto" className="docs-route-card group">
              <Calculator size={21} weight="duotone" aria-hidden="true" />
              <div className="font-semibold text-gray-900">Quiero entender el cálculo</div>
              <div className="mt-1 text-sm text-gray-500">ETo, Kc, ETc, lluvia y minutos de bomba.</div>
              <ArrowRight size={16} className="mt-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a href="#api" className="docs-route-card group">
              <BracketsCurly size={21} weight="duotone" aria-hidden="true" />
              <div className="font-semibold text-gray-900">Quiero integrar un equipo</div>
              <div className="mt-1 text-sm text-gray-500">Identificador único, endpoints y autenticación del nodo.</div>
              <ArrowRight size={16} className="mt-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
          <div id="uso" className="scroll-mt-24 rounded-xl bg-gray-50 border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900">Puesta en marcha en 5 pasos</h3>
            <ol className="mt-3 list-decimal list-outside ml-5 space-y-2 text-sm text-gray-700 leading-relaxed">
              <li>Ejecuta <span className="font-mono">iniciar_sira.bat</span> para iniciar backend, frontend y puente serial.</li>
              <li>Comprueba el backend en <span className="font-mono">http://localhost:8000/health</span>.</li>
              <li>Revisa los coeficientes disponibles en <strong>Cultivos</strong>.</li>
              <li>Crea una parcela, elige cultivo y fecha de siembra, y registra su <em>Device ID</em>.</li>
              <li>Abre el panel de la parcela para revisar sensores, ETo, Kc, ETc y decisión de riego.</li>
            </ol>
          </div>
        </Seccion>

        {/* Introducción */}
        <Seccion id="intro" titulo="1. Introducción">
          <p className="text-gray-700 leading-relaxed">
            El riego tradicional suele aplicar agua por costumbre o calendario fijo, lo que genera desperdicio
            (sobre-riego) o estrés hídrico (sub-riego). SIRA sustituye esa intuición por un cálculo agronómico:
            estima la <strong>evapotranspiración del cultivo</strong> (el agua que la planta realmente consume
            cada día) y riega exactamente esa cantidad, descontando la lluvia.
          </p>
          <p className="text-gray-700 leading-relaxed">
            El cálculo se apoya en dos pilares. El primero es la <strong>evapotranspiración de referencia (ETo)</strong>,
            que depende solo del clima y se obtiene con la ecuación de Penman-Monteith. El segundo es el{" "}
            <strong>coeficiente de cultivo (Kc)</strong>, que ajusta esa referencia al cultivo concreto y a su
            etapa de crecimiento. El producto de ambos, <MathInline tex="ET_c = K_c \times ET_o" />, es la demanda
            hídrica diaria.
          </p>
          <div className="bg-sira-green/5 border border-sira-green/20 rounded-lg p-4 text-sm text-gray-700">
            <strong className="text-sira-green">En una frase:</strong> SIRA une datos meteorológicos en vivo con
            coeficientes agronómicos publicados para decidir <em>cuándo</em> y <em>cuánto</em> regar, sin
            intervención humana.
          </div>
        </Seccion>

        {/* Flujo */}
        <Seccion id="flujo" titulo="2. ¿Cómo funciona?">
          <p className="text-gray-700 leading-relaxed">
            En cada lectura recibida del sensor (o del simulador Proteus), el motor de decisión ejecuta la
            siguiente cadena. Los dos insumos, clima y cultivo, se combinan para obtener la lámina de agua a
            aplicar y, finalmente, los minutos de bomba:
          </p>
          <div className="space-y-1 max-w-md mx-auto py-2">
            <div className="grid grid-cols-2 gap-3">
              <FlowBox title="Clima" sub="lat · lon · altitud" />
              <FlowBox title="Cultivo" sub="etapa fenológica" />
            </div>
            <div className="grid grid-cols-2 text-center text-sira-green text-xl leading-none select-none"><span>↓</span><span>↓</span></div>
            <div className="grid grid-cols-2 gap-3">
              <FlowBox title={<MathInline tex="ET_o" />} sub="Penman-Monteith" tone="accent" />
              <FlowBox title={<MathInline tex="K_c" />} sub="tabla por etapa" tone="accent" />
            </div>
            <div className="grid grid-cols-2 text-center text-sira-green text-xl leading-none select-none"><span>↘</span><span>↙</span></div>
            <FlowBox title={<MathInline tex="ET_c = K_c \times ET_o" />} sub="agua que pide el cultivo hoy" tone="highlight" />
            <Arrow />
            <FlowBox title={<MathInline tex="\text{lámina} = ET_c - \text{lluvia}" />} sub="agua a reponer" />
            <Arrow />
            <FlowBox title="Minutos de bomba" sub="según área, emisores y caudal" />
          </div>
          <p className="text-gray-700 leading-relaxed">
            Antes de calcular, el motor aplica <strong>reglas de seguridad</strong> que pueden cancelar el riego:
            si el nivel del tanque está por debajo del mínimo, si el sensor de humedad indica que el suelo aún
            tiene agua suficiente, o si llueve (detectado por el sensor o por el pronóstico de las próximas 24 h).
          </p>
        </Seccion>

        <Seccion id="origen-datos" titulo="3. Del dato meteorológico a la parcela">
          <p className="max-w-4xl text-gray-700 leading-relaxed">
            SIRA trabaja con dos familias de datos que cumplen funciones distintas. El nodo de campo mide el
            estado local del sistema (humedad del suelo, temperatura, humedad relativa, lluvia y nivel del
            tanque), mientras que los proveedores meteorológicos entregan las variables atmosféricas necesarias
            para estimar la ETo. Una lectura remota no se transforma en una lectura del sensor de suelo: ambas se
            conservan separadas y se combinan recién en el motor de decisión.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-emerald-950/10 bg-white p-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-emerald-700">Nodo de campo</p>
              <h3 className="mt-2 font-bold text-gray-950">Condición real de la parcela</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">ESP32, STM32, Arduino u otro controlador transmite humedad del suelo, lluvia, nivel de agua y variables ambientales. Estas lecturas activan reglas de seguridad inmediatas.</p>
            </div>
            <div className="rounded-xl border border-emerald-950/10 bg-white p-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-sky-700">Malla meteorológica</p>
              <h3 className="mt-2 font-bold text-gray-950">Demanda atmosférica de la zona</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">Las coordenadas seleccionan el punto de malla más próximo de Open-Meteo o NASA POWER. SIRA normaliza unidades y alturas de medición antes de aplicar FAO-56.</p>
            </div>
          </div>
          <div className="rounded-xl bg-[#edf4ef] p-5">
            <div className="grid gap-2 text-center text-sm md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] md:items-center">
              <FlowBox title="Latitud, longitud y altitud" sub="georreferencia de la parcela" />
              <span className="hidden text-emerald-700 md:block">→</span>
              <FlowBox title="Proveedor meteorológico" sub="punto de malla cercano" />
              <span className="hidden text-emerald-700 md:block">→</span>
              <FlowBox title="Normalización FAO" sub="unidades, presión y viento" />
              <span className="hidden text-emerald-700 md:block">→</span>
              <FlowBox title="Motor SIRA" sub="ETo + Kc + sensores" tone="highlight" />
            </div>
          </div>
        </Seccion>

        <Seccion id="presion" titulo="4. Presión atmosférica y corrección por altitud">
          <p className="max-w-4xl text-gray-700 leading-relaxed">
            La presión disminuye con la altitud y modifica la constante psicrométrica empleada por
            Penman-Monteith. SIRA prioriza la <strong>presión superficial diaria del proveedor meteorológico</strong>.
            Cuando ese dato no está disponible, aplica la ecuación barométrica estándar de FAO-56:
          </p>
          <MathBlock tex="P = 101.3\left(\frac{293 - 0.0065\,z}{293}\right)^{5.26} \tag{7}" />
          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <dl className="rounded-xl border border-emerald-950/10 bg-white p-5 text-sm">
              <div className="flex justify-between gap-4 border-b border-gray-100 py-2"><dt className="text-gray-500">P</dt><dd className="font-semibold">presión atmosférica, kPa</dd></div>
              <div className="flex justify-between gap-4 border-b border-gray-100 py-2"><dt className="text-gray-500">z</dt><dd className="font-semibold">altitud, m s. n. m.</dd></div>
              <div className="flex justify-between gap-4 py-2"><dt className="text-gray-500">Conversión</dt><dd className="font-semibold">1 kPa = 10 hPa</dd></div>
            </dl>
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-5 text-sm leading-relaxed text-sky-950">
              <strong>Ejemplo de la parcela CAMOTE.</strong> Para 2326 m, la ecuación produce 76.663 kPa
              (766.63 hPa). Open-Meteo reportó 776.6 hPa como media diaria el 26/07/2026. La diferencia de
              aproximadamente 1.3 % es coherente: la fórmula representa una atmósfera estándar y el modelo
              meteorológico incorpora el estado real de la atmósfera.
            </div>
          </div>
          <p className="text-sm leading-relaxed text-gray-600">
            Con la presión seleccionada, SIRA calcula la constante psicrométrica mediante <MathInline tex="\gamma = 0.665\times10^{-3}P" />.
            Por eso registrar correctamente la altitud sigue siendo importante incluso cuando no se instala un barómetro físico.
          </p>
        </Seccion>

        <Seccion id="viento" titulo="5. Conversión del viento desde 10 m hasta 2 m">
          <p className="max-w-4xl text-gray-700 leading-relaxed">
            Open-Meteo entrega la velocidad del viento a 10 m sobre la superficie, pero FAO-56 necesita
            <MathInline tex="u_2" />, medida o estimada a 2 m sobre un cultivo de referencia. SIRA aplica el perfil
            logarítmico de viento de la ecuación 47:
          </p>
          <MathBlock tex="u_2 = u_z\,\frac{4.87}{\ln(67.8z - 5.42)} \tag{47}" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4"><span className="text-xs font-bold text-gray-500">Entrada</span><strong className="mt-1 block text-gray-950">u₁₀ de Open-Meteo</strong><p className="mt-1 text-xs text-gray-500">viento a z = 10 m</p></div>
            <div className="rounded-xl bg-emerald-50 p-4"><span className="text-xs font-bold text-emerald-700">Factor para 10 m</span><strong className="mt-1 block text-emerald-950">≈ 0.748</strong><p className="mt-1 text-xs text-emerald-800/70">4.87 / ln(672.58)</p></div>
            <div className="rounded-xl bg-gray-50 p-4"><span className="text-xs font-bold text-gray-500">Salida</span><strong className="mt-1 block text-gray-950">u₂ para FAO-56</strong><p className="mt-1 text-xs text-gray-500">m/s a 2 m</p></div>
          </div>
          <p className="text-sm leading-relaxed text-gray-600">
            Ejemplo: si Open-Meteo entrega 4.0 m/s a 10 m, SIRA utiliza aproximadamente 2.99 m/s a 2 m. NASA
            POWER ya entrega la variable WS2M a 2 m, por lo que esa fuente no necesita conversión.
          </p>
        </Seccion>

        <Seccion id="vapor-radiacion" titulo="6. Presión de vapor, humedad y radiación">
          <p className="max-w-4xl text-gray-700 leading-relaxed">
            La temperatura y la humedad describen la capacidad del aire para extraer agua. Primero se calcula la
            presión de vapor a saturación para las temperaturas máxima y mínima; después, la humedad relativa
            permite estimar la presión real de vapor. Su diferencia <MathInline tex="e_s-e_a" /> es el déficit de
            presión de vapor que impulsa la evapotranspiración.
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            <MathBlock tex="e^{\circ}(T) = 0.6108\,\exp\!\left(\frac{17.27T}{T+237.3}\right) \tag{11}" />
            <MathBlock tex="\Delta = \frac{4098\,e^{\circ}(T)}{(T+237.3)^2} \tag{13}" />
          </div>
          <p className="max-w-4xl text-gray-700 leading-relaxed">
            La radiación solar incidente se corrige por albedo para obtener radiación neta de onda corta. La
            radiación neta de onda larga considera temperatura, humedad y nubosidad. La altitud interviene otra
            vez en la radiación de cielo despejado:
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            <MathBlock tex="R_{so} = (0.75 + 2\times10^{-5}z)R_a \tag{37}" />
            <MathBlock tex="R_{ns} = (1-0.23)R_s \tag{38}" />
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-950">
            SIRA no toma la radiación del sensor de humedad del suelo. Open-Meteo aporta la suma diaria de
            radiación de onda corta y NASA POWER aporta ALLSKY_SFC_SW_DWN; el sensor local conserva una función
            independiente de control y validación de la parcela.
          </div>
        </Seccion>

        {/* ETo */}
        <Seccion id="eto" titulo="7. ETo: evapotranspiración de referencia (Penman-Monteith FAO-56)">
          <p className="text-gray-700 leading-relaxed">
            La ETo cuantifica la demanda evaporativa de la atmósfera sobre un cultivo de referencia hipotético
            (pasto de 12 cm, bien regado). Es un valor puramente <strong>climático</strong>: no depende del
            cultivo real. SIRA la calcula con la ecuación combinada de Penman-Monteith, considerada el método
            estándar mundial por la FAO (ecuación 6):
          </p>
          <MathBlock tex="ET_o = \dfrac{0.408\,\Delta\,(R_n - G) + \gamma\,\dfrac{900}{T+273}\,u_2\,(e_s - e_a)}{\Delta + \gamma\,(1 + 0.34\,u_2)} \tag{6}" />
          <p className="text-gray-700 leading-relaxed">Cada término y su procedencia:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-4">Símbolo</th><th className="pr-4">Significado</th>
                  <th className="pr-4">Unidad</th><th>Se obtiene de</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr className="border-b border-gray-100"><td className="py-1.5"><MathInline tex="\Delta" /></td><td>pendiente de la curva de presión de vapor</td><td>kPa/°C</td><td>temperatura media (Ec. 13)</td></tr>
                <tr className="border-b border-gray-100"><td className="py-1.5"><MathInline tex="R_n" /></td><td>radiación neta en la superficie</td><td>MJ/m²·día</td><td>Rns − Rnl (Ec. 40)</td></tr>
                <tr className="border-b border-gray-100"><td className="py-1.5"><MathInline tex="G" /></td><td>flujo de calor hacia el suelo</td><td>MJ/m²·día</td><td>≈ 0 en paso diario</td></tr>
                <tr className="border-b border-gray-100"><td className="py-1.5"><MathInline tex="\gamma" /></td><td>constante psicrométrica</td><td>kPa/°C</td><td>presión atmosférica (Ec. 8)</td></tr>
                <tr className="border-b border-gray-100"><td className="py-1.5"><MathInline tex="T" /></td><td>temperatura media diaria</td><td>°C</td><td>(T_máx + T_mín)/2</td></tr>
                <tr className="border-b border-gray-100"><td className="py-1.5"><MathInline tex="u_2" /></td><td>velocidad del viento a 2 m</td><td>m/s</td><td>Open-Meteo (convertido, Ec. 47)</td></tr>
                <tr className="border-b border-gray-100"><td className="py-1.5"><MathInline tex="e_s" /></td><td>presión de vapor a saturación</td><td>kPa</td><td>T_máx y T_mín (Ec. 12)</td></tr>
                <tr><td className="py-1.5"><MathInline tex="e_a" /></td><td>presión de vapor real</td><td>kPa</td><td>humedad relativa (Ec. 17)</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-gray-700 leading-relaxed">
            Los términos <MathInline tex="\Delta" /> y <MathInline tex="\gamma" /> no requieren mediciones extra:
            se derivan de datos que ya se tienen. <MathInline tex="\gamma" /> depende solo de la presión (que a su
            vez puede estimarse desde la altitud), y <MathInline tex="\Delta" /> depende solo de la temperatura
            media. Ecuaciones de apoyo:
          </p>
          <MathBlock tex="\gamma = 0.665\times10^{-3}\,P \tag{8}" />
          <MathBlock tex="\Delta = \frac{4098\,e^{\circ}(T)}{(T+237.3)^2} \tag{13}" />
          <MathBlock tex="e^{\circ}(T) = 0.6108\,\exp\!\left(\frac{17.27\,T}{T+237.3}\right) \tag{11}" />
          <MathBlock tex="P = 101.3\left(\frac{293 - 0.0065\,z}{293}\right)^{5.26} \tag{7}" />
          <p className="text-gray-600 text-sm leading-relaxed">
            Puedes ver todos estos valores calculados en vivo para cada parcela, en la sección{" "}
            <em>&ldquo;Desglose del cálculo de ETo&rdquo;</em> de su panel.
          </p>
        </Seccion>

        {/* Kc */}
        <Seccion id="kc" titulo="8. Coeficiente de cultivo (Kc)">
          <p className="text-gray-700 leading-relaxed">
            El Kc es un factor adimensional que traduce la referencia (ETo) a la demanda del cultivo real. A
            diferencia de la ETo, <strong>no se calcula con una fórmula</strong>: se determina experimentalmente
            (típicamente con lisímetros de pesada) y se publica en tablas. Por definición:
          </p>
          <MathBlock tex="K_c = \dfrac{ET_c\ \text{(agua que consume el cultivo, medida)}}{ET_o\ \text{(evapotranspiración de referencia)}} \tag{K}" />
          <p className="text-gray-700 leading-relaxed">
            El valor del Kc cambia a lo largo del ciclo porque la planta modifica su tamaño y cobertura foliar.
            La FAO define cuatro etapas fenológicas con una curva característica:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-sm">
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3"><div className="font-semibold">Inicial</div><div className="text-xs text-gray-500 mt-0.5">planta pequeña, suelo expuesto</div><div className="text-sira-green font-bold mt-1">Kc bajo</div></div>
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3"><div className="font-semibold">Desarrollo</div><div className="text-xs text-gray-500 mt-0.5">crece el follaje</div><div className="text-sira-green font-bold mt-1">Kc sube</div></div>
            <div className="rounded-lg bg-sira-green/10 border border-sira-green/30 p-3"><div className="font-semibold">Media</div><div className="text-xs text-gray-500 mt-0.5">cobertura total</div><div className="text-sira-green font-bold mt-1">Kc máximo</div></div>
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3"><div className="font-semibold">Final</div><div className="text-xs text-gray-500 mt-0.5">madurez / senescencia</div><div className="text-sira-green font-bold mt-1">Kc baja</div></div>
          </div>
          <p className="text-gray-700 leading-relaxed">
            SIRA identifica la etapa vigente calculando los días transcurridos desde la siembra
            (<MathInline tex="\text{día del ciclo} = \text{fecha actual} - \text{fecha de siembra}" />) y recorriendo
            las duraciones cargadas para cada cultivo hasta ubicar el tramo correspondiente; de ahí toma el Kc a
            aplicar ese día.
          </p>
        </Seccion>

        {/* ETc */}
        <Seccion id="etc" titulo="9. ETc y cálculo del riego">
          <p className="text-gray-700 leading-relaxed">
            La evapotranspiración del cultivo (ETc) es la demanda hídrica diaria y se obtiene multiplicando ambos
            factores (ecuación 56). Luego se descuenta la lluvia efectiva para obtener la lámina a reponer, y esa
            lámina se convierte en tiempo de bomba según la geometría del sistema de riego:
          </p>
          <MathBlock tex="ET_c = K_c \times ET_o \quad (\text{mm/día}) \tag{56}" />
          <MathBlock tex="L = ET_c - P_{\text{efectiva}} \quad (\text{lámina, mm})" />
          <MathBlock tex="t_{\text{riego}} = \frac{L \times A}{n \cdot q}\times 60 \quad (\text{minutos})" />
          <p className="text-gray-700 leading-relaxed text-sm">
            donde <MathInline tex="A" /> es el área de la parcela (m²), <MathInline tex="n" /> el número de emisores
            y <MathInline tex="q" /> el caudal por emisor (L/h). La equivalencia clave es{" "}
            <MathInline tex="1\ \text{mm} \times 1\ \text{m}^2 = 1\ \text{L}" />.
          </p>
          <p className="text-gray-700 leading-relaxed text-sm"><strong>Ejemplo</strong> (Camote, etapa media, parcela de 100 m² con 50 emisores de 4 L/h):</p>
          <MathBlock tex="ET_c = 1.15 \times 3.33 = 3.83\ \text{mm} \;\Rightarrow\; t = \frac{3.83 \times 100}{50 \cdot 4}\times 60 \approx 115\ \text{min}" />
          <div className="bg-sira-warn/10 border border-sira-warn/30 rounded-lg p-4 text-sm text-gray-700">
            <strong>Verificación de adecuación.</strong> Comparando el agua realmente aplicada con la ETc se
            evalúa la calidad del riego: <MathInline tex="\text{aplicado}/ET_c \approx 1.0" /> es correcto,{" "}
            <MathInline tex="> 1.2" /> indica sobre-riego (desperdicio), y <MathInline tex="< 0.8" /> sub-riego
            (riesgo de estrés hídrico).
          </div>
        </Seccion>

        {/* Fuentes de datos */}
        <Seccion id="datos" titulo="10. Fuentes de datos meteorológicos">
          <p className="text-gray-700 leading-relaxed">
            SIRA obtiene el clima de proveedores públicos según la disponibilidad y la antigüedad del dato,
            combinándolos con una jerarquía clara:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-4">Fuente</th><th className="pr-4">Rol</th><th>Variables que entrega</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr className="border-b border-gray-100"><td className="py-1.5 pr-4 font-medium">Open-Meteo</td><td className="pr-4">Fuente principal: clima actual, pronóstico y días recientes</td><td>temperatura, HR, viento, radiación, presión, lluvia</td></tr>
                <tr className="border-b border-gray-100"><td className="py-1.5 pr-4 font-medium">NASA POWER</td><td className="pr-4">Series históricas (más de 3 días de antigüedad)</td><td>datos diarios históricos</td></tr>
                <tr><td className="py-1.5 pr-4 font-medium">SENAMHI (WIS2)</td><td className="pr-4">Validación regional con estación oficial &lt; 50 km</td><td>temperatura, presión, viento (<em>sin radiación ni pronóstico</em>)</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-gray-700 leading-relaxed">
            Dos observaciones importantes: (1) la <strong>presión</strong> puede derivarse de las coordenadas.
            De la posición se obtiene la altitud, y de la altitud la presión (Ec. 7), por lo que no requiere
            sensor; (2) la <strong>radiación solar</strong> es imprescindible para la ETo y solo la proveen
            Open-Meteo y NASA POWER, razón por la cual SENAMHI se emplea como validación y no como fuente
            principal.
          </p>
        </Seccion>

        {/* Tabla Kc */}
        <Seccion id="tabla" titulo="11. Catálogo Kc para cultivos presentes en el Perú">
          <p className="text-gray-700 leading-relaxed">
            El catálogo reúne especies reportadas en la agricultura peruana que tienen un equivalente explícito
            en la Tabla 12 de FAO-56, además de las curvas locales de quinua y oca. La tabla se carga directamente
            desde la API, por lo que siempre coincide con los cultivos disponibles al crear una parcela.
          </p>
          <DocsCropTable />
          <p className="text-gray-500 text-sm leading-relaxed">
            FAO publica Kc inicial, medio y final. Para representar las cuatro etapas en SIRA, el valor mostrado
            durante desarrollo es una transición entre Kc inicial y Kc medio. Las duraciones son referencias de
            planificación y deben reemplazarse con el calendario de la variedad y localidad cuando exista.
          </p>
        </Seccion>

        <Seccion id="api" titulo="12. API: para qué sirve y cómo probarla">
          <p className="text-gray-700 leading-relaxed">
            La API es el puente entre las partes de SIRA. El nodo de campo le envía mediciones al backend; el dashboard
            consulta parcelas, cultivos y resultados; y el backend consulta servicios meteorológicos. Gracias a
            ella cada parte puede cambiar sin rehacer las demás.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead><tr className="text-left text-gray-500 border-b"><th className="py-2 pr-4">Ruta</th><th className="pr-4">Uso</th><th>Quién la consume</th></tr></thead>
              <tbody className="text-gray-700">
                <tr className="border-b"><td className="py-2 pr-4 font-mono">GET /cultivos</td><td className="pr-4">Lista Kc y etapas</td><td>Dashboard</td></tr>
                <tr className="border-b"><td className="py-2 pr-4 font-mono">GET/POST /parcelas</td><td className="pr-4">Consulta o registra parcelas</td><td>Dashboard</td></tr>
                <tr className="border-b"><td className="py-2 pr-4 font-mono">GET /weather/*</td><td className="pr-4">Clima, pronóstico y ETo</td><td>Dashboard y motor</td></tr>
                <tr className="border-b"><td className="py-2 pr-4 font-mono">POST /parcelas/device-identifiers/generate</td><td className="pr-4">Genera un identificador único</td><td>Dashboard</td></tr>
                <tr><td className="py-2 pr-4 font-mono">POST /ingest</td><td className="pr-4">Recibe sensores y devuelve la decisión</td><td>ESP32, STM32 o simulador</td></tr>
              </tbody>
            </table>
          </div>
          <div className="rounded-lg border border-sira-green/30 bg-sira-green/5 p-4 text-sm text-gray-700">
            Prueba la API en <a href="http://localhost:8000/docs" target="_blank" rel="noopener" className="font-medium text-sira-green hover:underline">Swagger /docs</a>.
            El endpoint <span className="font-mono">POST /ingest</span> exige la cabecera <span className="font-mono">X-API-Key</span>, cuyo valor se configura como <span className="font-mono">INGEST_API_KEY</span> en <span className="font-mono">.env</span>.
            La versión actual usa HTTP; MQTT puede añadirse después conservando el mismo identificador del nodo.
          </div>
        </Seccion>

        {/* Referencias */}
        <Seccion id="ref" titulo="13. Referencias y trazabilidad">
          <ul className="space-y-2 text-sm text-gray-700 leading-relaxed">
            <li>Allen, R.G., Pereira, L.S., Raes, D., Smith, M. (1998). <em>Crop evapotranspiration: Guidelines for computing crop water requirements.</em> FAO Irrigation and Drainage Paper 56 (Tablas 11, 12 y 22). <a href="https://www.fao.org/4/x0490e/x0490e00.htm" target="_blank" rel="noopener" className="text-sira-green hover:underline">fao.org/4/x0490e</a></li>
            <li>García, M., Huahuachampi, J., Soto, R. (2017). Coeficiente de cultivo (Kc) en quinua variedad QML01, Perú.</li>
            <li>Huanca-Quiroz, E., Calapuja-Ayamamani, R. Determinación del Kc en oca (<em>Oxalis tuberosa</em>), UNA-Puno (lisímetro NFC, 3825 msnm).</li>
            <li>El coeficiente de cultivo (Kc) en cultivos andinos del Perú. <a href="https://portal.amelica.org/ameli/journal/752/7524027005/html/" target="_blank" rel="noopener" className="text-sira-green hover:underline">amelica.org</a></li>
            <li>Lisimetría de drenaje para determinación del Kc de pitaya (<em>Hylocereus</em> spp.), revista Irriga (UNESP). <a href="https://revistas.fca.unesp.br/index.php/irriga/article/view/4959" target="_blank" rel="noopener" className="text-sira-green hover:underline">revistas.fca.unesp.br</a></li>
          </ul>
        </Seccion>
      </article>
      </div>
    </div>
  );
}

function DocMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-6 py-4">
      <span className="text-[#17643a]" aria-hidden="true">{icon}</span>
      <span>
        <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">{label}</span>
        <strong className="mt-0.5 block text-sm text-gray-900">{value}</strong>
      </span>
    </div>
  );
}
