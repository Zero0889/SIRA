"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BoundingBox,
  Check,
  Copy,
  Cpu,
  Crosshair,
  Drop,
  MapPin,
  Mountains,
  Plant,
  SpinnerGap,
  ArrowsClockwise,
  WarningCircle,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import type { Cultivo } from "@/lib/types";

const Map = dynamic(() => import("@/components/Map").then((module) => module.Map), {
  ssr: false,
  loading: () => <div className="skeleton h-full min-h-[34rem] rounded-none" />,
});

type Step = 1 | 2 | 3;
type Point = { lat: number; lon: number };

const steps = [
  { id: 1 as const, label: "Ubicación", icon: MapPin },
  { id: 2 as const, label: "Dispositivo", icon: Cpu },
  { id: 3 as const, label: "Cultivo", icon: Plant },
];

export function ParcelRegistrationWizard({
  cultivos,
  onCancel,
  onSaved,
}: {
  cultivos: Cultivo[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [step, setStep] = useState<Step>(1);
  const [point, setPoint] = useState<Point | null>(null);
  const [name, setName] = useState("");
  const [areaM2, setAreaM2] = useState(100);
  const [altitude, setAltitude] = useState<number | null>(null);
  const [deviceId, setDeviceId] = useState("");
  const [deviceIdLoading, setDeviceIdLoading] = useState(false);
  const [deviceIdError, setDeviceIdError] = useState<string | null>(null);
  const [flow, setFlow] = useState(4);
  const [emitters, setEmitters] = useState(50);
  const [cropId, setCropId] = useState("");
  const [plantingDate, setPlantingDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 60);
    return date.toISOString().slice(0, 10);
  });
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [elevationLoading, setElevationLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const elevationRequest = useRef(0);

  async function generateDeviceId() {
    setDeviceIdLoading(true);
    setDeviceIdError(null);
    try {
      const response = await api.generarIdentificadorNodo();
      setDeviceId(response.device_id);
    } catch {
      setDeviceId("");
      setDeviceIdError("No pudimos generar el identificador. Comprueba la conexión e inténtalo otra vez.");
    } finally {
      setDeviceIdLoading(false);
    }
  }

  const locationValid = Boolean(name.trim() && point && altitude !== null && areaM2 > 0);
  const deviceValid = Boolean(deviceId.trim() && flow > 0 && emitters > 0);
  const cropValid = Boolean(cropId && plantingDate);

  async function selectPoint(lat: number, lon: number, reportedAccuracy: number | null = null) {
    const requestId = ++elevationRequest.current;
    setPoint({ lat, lon });
    setAccuracy(reportedAccuracy);
    setAltitude(null);
    setLocationError(null);
    setElevationLoading(true);

    try {
      const response = await api.elevacion(lat, lon);
      if (requestId === elevationRequest.current) {
        setAltitude(Math.round(response.altitud_m));
      }
    } catch {
      if (requestId === elevationRequest.current) {
        setLocationError("No pudimos calcular la elevación. Puedes escribirla manualmente.");
      }
    } finally {
      if (requestId === elevationRequest.current) setElevationLoading(false);
    }
  }

  function useCurrentLocation() {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Este navegador no permite obtener la ubicación. Selecciona un punto en el mapa.");
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationLoading(false);
        void selectPoint(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy,
        );
      },
      () => {
        setLocationLoading(false);
        setLocationError("No se concedió acceso a la ubicación. Puedes elegir el punto directamente en el mapa.");
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  function goNext() {
    setSaveError(null);
    if (step === 1 && locationValid) {
      setStep(2);
      if (!deviceId && !deviceIdLoading) void generateDeviceId();
    }
    if (step === 2 && deviceValid) setStep(3);
  }

  function goBack() {
    setSaveError(null);
    setStep((current) => (current === 3 ? 2 : 1));
  }

  async function saveParcel() {
    if (!point || altitude === null || !locationValid || !deviceValid || !cropValid) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.crearParcela({
        nombre: name.trim(),
        device_id: deviceId.trim(),
        latitud: point.lat,
        longitud: point.lon,
        altitud_m: altitude,
        area_m2: areaM2,
        caudal_emisor_l_h: flow,
        n_emisores: emitters,
        cultivo_id: Number(cropId),
        fecha_siembra: plantingDate,
      });
      onSaved();
    } catch (caught) {
      setSaveError(
        caught instanceof Error
          ? humanizeApiError(caught.message)
          : "No pudimos crear la parcela. Revisa los datos e inténtalo otra vez.",
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedCrop = cultivos.find((crop) => crop.id === Number(cropId));

  return (
    <div className="registration-workspace">
      <header className="registration-header">
        <button type="button" onClick={onCancel} className="registration-back">
          <ArrowLeft size={18} aria-hidden="true" />
          Volver a parcelas
        </button>
        <div>
          <p className="eyebrow">Nueva unidad operativa</p>
          <h1 className="page-title mt-1">Registrar nueva parcela</h1>
        </div>
      </header>

      <div className="registration-split">
        <section className="registration-map-pane" aria-label="Seleccionar ubicación de la parcela">
          <Map
            parcelas={[]}
            puntoSeleccionado={point}
            onMapClick={(lat, lon) => void selectPoint(lat, lon)}
            height="100%"
            showSavedAreas={false}
            areaEditor={{
              enabled: Boolean(point),
              areaM2,
              onAreaChange: (value) => setAreaM2(Math.max(1, value)),
            }}
          />

          <div className="registration-map-tip">
            <MapPin size={18} weight="fill" aria-hidden="true" />
            <div>
              <strong>{point ? "Punto aproximado seleccionado" : "Selecciona el centro de la parcela"}</strong>
              <span>
                {point
                  ? `${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`
                  : "Haz clic sobre el mapa para comenzar."}
              </span>
            </div>
          </div>

          {point && (
            <div className="registration-area-tip">
              <BoundingBox size={17} aria-hidden="true" />
              <span>Arrastra el perímetro para ajustar {formatArea(areaM2)}</span>
            </div>
          )}
        </section>

        <section className="registration-panel" aria-label="Registro guiado de parcela">
          <RegistrationStepper current={step} onStepChange={setStep} />

          <div className="registration-stage" key={step}>
            {step === 1 && (
              <LocationStep
                name={name}
                setName={setName}
                point={point}
                altitude={altitude}
                setAltitude={setAltitude}
                areaM2={areaM2}
                setAreaM2={setAreaM2}
                accuracy={accuracy}
                elevationLoading={elevationLoading}
                locationLoading={locationLoading}
                locationError={locationError}
                useCurrentLocation={useCurrentLocation}
              />
            )}

            {step === 2 && (
              <DeviceStep
                deviceId={deviceId}
                deviceIdLoading={deviceIdLoading}
                deviceIdError={deviceIdError}
                generateDeviceId={generateDeviceId}
                flow={flow}
                setFlow={setFlow}
                emitters={emitters}
                setEmitters={setEmitters}
              />
            )}

            {step === 3 && point && altitude !== null && (
              <CropStep
                cultivos={cultivos}
                cropId={cropId}
                setCropId={setCropId}
                plantingDate={plantingDate}
                setPlantingDate={setPlantingDate}
                selectedCrop={selectedCrop}
                name={name}
                point={point}
                altitude={altitude}
                areaM2={areaM2}
                deviceId={deviceId}
                flow={flow}
                emitters={emitters}
              />
            )}

            {saveError && (
              <div className="registration-error" role="alert">
                <WarningCircle size={19} weight="fill" aria-hidden="true" />
                <span>{saveError}</span>
              </div>
            )}
          </div>

          <footer className="registration-actions">
            {step === 1 ? (
              <button type="button" onClick={onCancel} className="button-secondary">Cancelar</button>
            ) : (
              <button type="button" onClick={goBack} className="button-secondary">
                <ArrowLeft size={17} aria-hidden="true" />Anterior
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={step === 1 ? !locationValid : !deviceValid}
                className="button-primary"
              >
                Continuar<ArrowRight size={17} weight="bold" aria-hidden="true" />
              </button>
            ) : (
              <button type="button" onClick={() => void saveParcel()} disabled={!cropValid || saving} className="button-primary">
                {saving ? <SpinnerGap size={18} className="animate-spin" aria-hidden="true" /> : <Check size={18} weight="bold" aria-hidden="true" />}
                {saving ? "Creando parcela" : "Crear parcela"}
              </button>
            )}
          </footer>
        </section>
      </div>
    </div>
  );
}

function RegistrationStepper({ current, onStepChange }: { current: Step; onStepChange: (step: Step) => void }) {
  return (
    <nav className="registration-stepper" aria-label="Progreso del registro">
      <ol>
        {steps.map(({ id, label, icon: Icon }) => {
          const complete = id < current;
          const active = id === current;
          return (
            <li key={id} className={complete ? "is-complete" : active ? "is-current" : "is-pending"} aria-current={active ? "step" : undefined}>
              <button type="button" disabled={id > current} onClick={() => onStepChange(id)} aria-controls={`registration-step-${id}`}>
                <span className="registration-step-icon">
                  {complete ? <Check size={15} weight="bold" aria-hidden="true" /> : <Icon size={15} weight={active ? "fill" : "regular"} aria-hidden="true" />}
                </span>
                <span>{label}</span>
                <span className="sr-only">{complete ? " completado" : active ? " actual" : " pendiente"}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function LocationStep({
  name,
  setName,
  point,
  altitude,
  setAltitude,
  areaM2,
  setAreaM2,
  accuracy,
  elevationLoading,
  locationLoading,
  locationError,
  useCurrentLocation,
}: {
  name: string;
  setName: (value: string) => void;
  point: Point | null;
  altitude: number | null;
  setAltitude: (value: number | null) => void;
  areaM2: number;
  setAreaM2: (value: number) => void;
  accuracy: number | null;
  elevationLoading: boolean;
  locationLoading: boolean;
  locationError: string | null;
  useCurrentLocation: () => void;
}) {
  return (
    <div id="registration-step-1">
      <p className="registration-step-count">Paso 1 de 3</p>
      <h2 className="registration-title">Ubica la parcela</h2>
      <p className="registration-description">Marca el centro aproximado en el mapa y ajusta la superficie del sembrío.</p>

      <div className="registration-form-grid mt-7">
        <WizardField label="Nombre de la parcela" className="registration-field-wide">
          <input aria-label="Nombre de la parcela" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Chacra norte" className="field-control" autoFocus />
        </WizardField>

        <WizardField label="Latitud">
          <input aria-label="Latitud" value={point?.lat.toFixed(6) ?? ""} placeholder="Selecciona en el mapa" className="field-control metric-value" readOnly />
        </WizardField>
        <WizardField label="Longitud">
          <input aria-label="Longitud" value={point?.lon.toFixed(6) ?? ""} placeholder="Selecciona en el mapa" className="field-control metric-value" readOnly />
        </WizardField>

        <WizardField label="Elevación estimada" helper={elevationLoading ? "Consultando elevación…" : "Metros sobre el nivel del mar."}>
          <div className="registration-input-unit">
            <input
              aria-label="Elevación estimada"
              type="number"
              value={altitude ?? ""}
              onChange={(event) => setAltitude(event.target.value === "" ? null : Number(event.target.value))}
              placeholder={elevationLoading ? "Calculando" : "0"}
              className="field-control metric-value"
            />
            <span>m s. n. m.</span>
          </div>
        </WizardField>
        <WizardField label="Superficie aproximada" helper="También puedes arrastrar el círculo del mapa.">
          <div className="registration-input-unit">
            <input aria-label="Superficie aproximada" type="number" min="1" step="1" value={areaM2} onChange={(event) => setAreaM2(Math.max(1, Number(event.target.value) || 1))} className="field-control metric-value" />
            <span>m²</span>
          </div>
        </WizardField>
      </div>

      <div className="registration-location-row">
        <button type="button" onClick={useCurrentLocation} disabled={locationLoading} className="button-secondary">
          {locationLoading ? <SpinnerGap size={18} className="animate-spin" /> : <Crosshair size={18} />}
          {locationLoading ? "Localizando" : "Usar mi ubicación"}
        </button>
        <p>{accuracy ? `Precisión aproximada ± ${Math.round(accuracy)} m.` : "Puedes elegir el punto manualmente sin compartir tu ubicación."}</p>
      </div>

      {locationError && <div className="registration-inline-note is-warning" role="status"><WarningCircle size={18} weight="fill" />{locationError}</div>}
      {!point && <div className="registration-inline-note"><MapPin size={18} />Haz clic en el mapa para obtener coordenadas y elevación.</div>}
    </div>
  );
}

function DeviceStep({ deviceId, deviceIdLoading, deviceIdError, generateDeviceId, flow, setFlow, emitters, setEmitters }: {
  deviceId: string;
  deviceIdLoading: boolean;
  deviceIdError: string | null;
  generateDeviceId: () => Promise<void>;
  flow: number;
  setFlow: (value: number) => void;
  emitters: number;
  setEmitters: (value: number) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyDeviceId() {
    if (!deviceId) return;
    await navigator.clipboard.writeText(deviceId);
    setCopied(true);
  }

  return (
    <div id="registration-step-2">
      <p className="registration-step-count">Paso 2 de 3</p>
      <h2 className="registration-title">Configura el nodo de riego</h2>
      <p className="registration-description">SIRA genera un código exclusivo para vincular esta parcela con cualquier controlador compatible.</p>

      <div className="registration-form-grid mt-7">
        <WizardField label="Identificador único del nodo" helper="Copia este valor en la configuración del firmware. No funciona como contraseña." className="registration-field-wide">
          <div className="registration-device-id">
            <div className="registration-input-icon">
            <Cpu size={19} aria-hidden="true" />
              <input
                aria-label="Identificador único del nodo"
                value={deviceId}
                placeholder={deviceIdLoading ? "Generando identificador…" : "Identificador no disponible"}
                className="field-control"
                readOnly
                autoFocus
              />
            </div>
            <button type="button" onClick={() => void copyDeviceId()} disabled={!deviceId || deviceIdLoading} className="registration-id-action" aria-label="Copiar identificador">
              {copied ? <Check size={17} weight="bold" aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
            <button type="button" onClick={() => { setCopied(false); void generateDeviceId(); }} disabled={deviceIdLoading} className="registration-id-action is-icon" aria-label="Generar otro identificador" title="Generar otro identificador">
              <ArrowsClockwise size={18} className={deviceIdLoading ? "animate-spin" : undefined} aria-hidden="true" />
            </button>
          </div>
          {deviceIdError && <span className="registration-id-error" role="alert">{deviceIdError}</span>}
        </WizardField>
        <WizardField label="Caudal por emisor" helper="Flujo nominal de cada gotero o emisor.">
          <div className="registration-input-unit">
            <input aria-label="Caudal por emisor" type="number" min="0.1" step="0.1" value={flow} onChange={(event) => setFlow(Math.max(0, Number(event.target.value) || 0))} className="field-control metric-value" />
            <span>L/h</span>
          </div>
        </WizardField>
        <WizardField label="Número de emisores" helper="Cantidad total conectada al nodo.">
          <input aria-label="Número de emisores" type="number" min="1" step="1" value={emitters} onChange={(event) => setEmitters(Math.max(0, Math.round(Number(event.target.value) || 0)))} className="field-control metric-value" />
        </WizardField>
      </div>

      <div className="registration-connectivity-note">
        <span><Cpu size={20} weight="duotone" aria-hidden="true" /></span>
        <div><strong>Compatible con distintos controladores</strong><p>El código funciona igual con ESP32, STM32, Arduino o Linux embebido. El nodo solo debe enviar el mismo identificador mediante la API de SIRA.</p></div>
      </div>

      <dl className="registration-calculation">
        <div><dt>Caudal total configurado</dt><dd>{(flow * emitters).toLocaleString("es-PE", { maximumFractionDigits: 1 })} L/h</dd></div>
        <div><dt>Lectura esperada</dt><dd>Al enlazar el nodo</dd></div>
      </dl>
    </div>
  );
}

function CropStep({ cultivos, cropId, setCropId, plantingDate, setPlantingDate, selectedCrop, name, point, altitude, areaM2, deviceId, flow, emitters }: {
  cultivos: Cultivo[];
  cropId: string;
  setCropId: (value: string) => void;
  plantingDate: string;
  setPlantingDate: (value: string) => void;
  selectedCrop?: Cultivo;
  name: string;
  point: Point;
  altitude: number;
  areaM2: number;
  deviceId: string;
  flow: number;
  emitters: number;
}) {
  return (
    <div id="registration-step-3">
      <p className="registration-step-count">Paso 3 de 3</p>
      <h2 className="registration-title">Define el cultivo</h2>
      <p className="registration-description">Selecciona el cultivo principal y revisa la configuración antes de crear la parcela.</p>

      <div className="registration-form-grid mt-7">
        <WizardField label="Tipo de cultivo">
          <select aria-label="Tipo de cultivo" value={cropId} onChange={(event) => setCropId(event.target.value)} className="field-control" autoFocus>
            <option value="">Selecciona un cultivo</option>
            {cultivos.map((crop) => <option key={crop.id} value={crop.id}>{crop.nombre_comun}</option>)}
          </select>
        </WizardField>
        <WizardField label="Fecha de siembra">
          <input aria-label="Fecha de siembra" type="date" value={plantingDate} onChange={(event) => setPlantingDate(event.target.value)} className="field-control" />
        </WizardField>
      </div>

      {selectedCrop && (
        <p className="registration-crop-context">
          <Plant size={18} weight="duotone" aria-hidden="true" />
          {selectedCrop.nombre_cientifico ?? selectedCrop.nombre_comun} · raíz de referencia {selectedCrop.profundidad_raiz_m} m
        </p>
      )}

      <section className="registration-summary" aria-labelledby="registration-summary-title">
        <h3 id="registration-summary-title">Resumen de la parcela</h3>
        <dl>
          <SummaryRow icon={MapPin} label="Parcela" value={name} />
          <SummaryRow icon={Crosshair} label="Coordenadas" value={`${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`} />
          <SummaryRow icon={Mountains} label="Elevación" value={`${altitude.toLocaleString("es-PE")} m s. n. m.`} />
          <SummaryRow icon={BoundingBox} label="Superficie" value={formatArea(areaM2)} />
          <SummaryRow icon={Cpu} label="Nodo" value={deviceId} />
          <SummaryRow icon={Drop} label="Riego" value={`${emitters} emisores · ${flow.toLocaleString("es-PE")} L/h`} />
        </dl>
      </section>
    </div>
  );
}

function WizardField({ label, helper, className = "", children }: { label: string; helper?: string; className?: string; children: React.ReactNode }) {
  return <div className={`registration-field ${className}`}><span>{label}</span>{children}{helper && <small>{helper}</small>}</div>;
}

function SummaryRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return <div><dt><Icon size={17} aria-hidden="true" />{label}</dt><dd>{value}</dd></div>;
}

function formatArea(areaM2: number) {
  return areaM2 >= 10_000
    ? `${(areaM2 / 10_000).toLocaleString("es-PE", { maximumFractionDigits: 2 })} ha`
    : `${Math.round(areaM2).toLocaleString("es-PE")} m²`;
}

function humanizeApiError(message: string) {
  if (message.includes("device_id") || message.includes("UNIQUE")) return "Ese identificador de nodo ya está vinculado a otra parcela.";
  return "No pudimos crear la parcela. Revisa los datos y la conexión con SIRA.";
}
