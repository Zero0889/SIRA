"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { Parcela } from "@/lib/types";

type SiraMap = L.Map & { _siraResizing?: boolean };

// Fix iconos de Leaflet cuando se usa con webpack
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function ClickCapturer({ onClick }: { onClick?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      if ((e.target as SiraMap)._siraResizing) return;
      onClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FitBounds({ parcelas }: { parcelas: Parcela[] }) {
  const map = useMap();
  useEffect(() => {
    if (parcelas.length === 0) return;
    const bounds = L.latLngBounds(parcelas.map((p) => [p.latitud, p.longitud]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }, [parcelas, map]);
  return null;
}

function KeepPointVisible({ point }: { point?: { lat: number; lon: number } | null }) {
  const map = useMap();
  const lat = point?.lat;
  const lon = point?.lon;

  useEffect(() => {
    if (lat === undefined || lon === undefined) return;
    map.panTo([lat, lon], { animate: true, duration: 0.25 });
  }, [lat, lon, map]);

  return null;
}

function cursorDeRedimension(center: L.LatLng, point: L.LatLng) {
  const dx = (point.lng - center.lng) * Math.cos((center.lat * Math.PI) / 180);
  const dy = point.lat - center.lat;
  const angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 180) % 180;

  if (angle < 22.5 || angle >= 157.5) return "ew-resize";
  if (angle < 67.5) return "nesw-resize";
  if (angle < 112.5) return "ns-resize";
  return "nwse-resize";
}

function AreaRedimensionable({
  center,
  radius,
  onAreaChange,
}: {
  center: [number, number];
  radius: number;
  onAreaChange: (areaM2: number) => void;
}) {
  const map = useMap();
  const visualRef = useRef<L.Circle | null>(null);
  const boundaryRef = useRef<L.Circle | null>(null);
  const centerLat = center[0];
  const centerLon = center[1];

  useEffect(() => {
    const boundary = boundaryRef.current;
    const visual = visualRef.current;
    if (!boundary || !visual) return;

    const mapContainer = map.getContainer();
    const boundaryElement = boundary.getElement() as SVGElement | null;
    const centerPoint = L.latLng(centerLat, centerLon);
    let resizing = false;
    let currentRadius = boundary.getRadius();
    let lastAreaUpdate = 0;
    let releaseTimer: number | null = null;

    const setResizeCursor = (point: L.LatLng) => {
      const cursor = cursorDeRedimension(centerPoint, point);
      mapContainer.style.cursor = cursor;
      if (boundaryElement) boundaryElement.style.cursor = cursor;
    };

    const clearResizeCursor = () => {
      mapContainer.style.cursor = "";
      if (boundaryElement) boundaryElement.style.cursor = "";
    };

    const onMove = (event: L.LeafletMouseEvent) => {
      if (!resizing) return;
      currentRadius = Math.max(0.57, centerPoint.distanceTo(event.latlng));
      boundary.setRadius(currentRadius);
      visual.setRadius(currentRadius);
      setResizeCursor(event.latlng);

      const now = Date.now();
      if (now - lastAreaUpdate >= 40) {
        lastAreaUpdate = now;
        onAreaChange(Math.max(1, Math.round(Math.PI * currentRadius * currentRadius)));
      }
    };

    const stopResize = () => {
      if (!resizing) return;
      resizing = false;
      map.off("mousemove", onMove);
      map.off("mouseup", stopResize);
      map.dragging.enable();
      clearResizeCursor();
      onAreaChange(Math.max(1, Math.round(Math.PI * currentRadius * currentRadius)));
      releaseTimer = window.setTimeout(() => {
        (map as SiraMap)._siraResizing = false;
      }, 0);
    };

    const onDown = (event: L.LeafletMouseEvent) => {
      resizing = true;
      currentRadius = boundary.getRadius();
      L.DomEvent.stopPropagation(event.originalEvent);
      L.DomEvent.preventDefault(event.originalEvent);
      (map as SiraMap)._siraResizing = true;
      map.dragging.disable();
      setResizeCursor(event.latlng);
      map.on("mousemove", onMove);
      map.on("mouseup", stopResize);
    };

    const onHover = (event: L.LeafletMouseEvent) => setResizeCursor(event.latlng);
    const onLeave = () => {
      if (!resizing) clearResizeCursor();
    };
    const stopBoundaryClick = (event: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(event.originalEvent);
      L.DomEvent.preventDefault(event.originalEvent);
    };

    boundary.on("mousedown", onDown);
    boundary.on("mousemove", onHover);
    boundary.on("mouseout", onLeave);
    boundary.on("click", stopBoundaryClick);
    boundary.on("dblclick", stopBoundaryClick);

    return () => {
      boundary.off("mousedown", onDown);
      boundary.off("mousemove", onHover);
      boundary.off("mouseout", onLeave);
      boundary.off("click", stopBoundaryClick);
      boundary.off("dblclick", stopBoundaryClick);
      map.off("mousemove", onMove);
      map.off("mouseup", stopResize);
      if (releaseTimer !== null) window.clearTimeout(releaseTimer);
      (map as SiraMap)._siraResizing = false;
      if (resizing) map.dragging.enable();
      clearResizeCursor();
    };
  }, [centerLat, centerLon, map, onAreaChange]);

  return (
    <>
      <Circle
        ref={visualRef}
        center={center}
        radius={radius}
        interactive={false}
        pathOptions={{
          color: "#2e7d32",
          weight: 3,
          dashArray: "8 6",
          fillColor: "#66bb6a",
          fillOpacity: 0.22,
        }}
      />
      <Circle
        ref={boundaryRef}
        center={center}
        radius={radius}
        fill={false}
        bubblingMouseEvents={false}
        pathOptions={{ color: "#2e7d32", weight: 22, opacity: 0.01 }}
      />
    </>
  );
}

export function Map({
  parcelas,
  onMapClick,
  puntoSeleccionado,
  height = "520px",
  showSavedAreas = false,
  areaEditor,
}: {
  parcelas: Parcela[];
  onMapClick?: (lat: number, lon: number) => void;
  puntoSeleccionado?: { lat: number; lon: number } | null;
  height?: string;
  showSavedAreas?: boolean;
  areaEditor?: {
    enabled: boolean;
    areaM2: number;
    onAreaChange: (areaM2: number) => void;
  };
}) {
  const center: [number, number] =
    puntoSeleccionado
      ? [puntoSeleccionado.lat, puntoSeleccionado.lon]
      : parcelas.length > 0
      ? [parcelas[0].latitud, parcelas[0].longitud]
      : [-16.409, -71.537]; // Arequipa por defecto

  const tileUrl = "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";
  const tileAttr = '&copy; <a href="https://maps.google.com">Google Maps Satélite</a>';

  const parcelaIcon = L.divIcon({
    className: "",
    html: '<div class="sira-map-marker"><span>P</span></div>',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30],
  });

  const nuevoIcon = L.divIcon({
    className: "",
    html: '<div class="sira-map-marker sira-map-marker-new"><span>+</span></div>',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30],
  });

  const areaValida = Math.max(1, areaEditor?.areaM2 ?? 100);
  const radioM = Math.sqrt(areaValida / Math.PI);

  return (
    <div
      style={{ height }}
      className="relative overflow-hidden rounded-xl border border-emerald-950/10 bg-[#dfe7e2] shadow-[0_4px_8px_rgba(20,49,31,0.08)]"
    >
      <MapContainer center={center} zoom={11} scrollWheelZoom>
        <TileLayer attribution={tileAttr} url={tileUrl} maxZoom={21} />

        <ClickCapturer onClick={onMapClick} />
        <FitBounds parcelas={parcelas} />
        <KeepPointVisible point={puntoSeleccionado} />

        {parcelas.map((parcela) => {
          const radius = Math.sqrt(Math.max(1, parcela.area_m2) / Math.PI);
          return showSavedAreas ? (
            <Circle
              key={`area-${parcela.id}`}
              center={[parcela.latitud, parcela.longitud]}
              radius={radius}
              pathOptions={{ color: "#2e7d32", weight: 2, fillColor: "#66bb6a", fillOpacity: 0.16 }}
            />
          ) : null;
        })}

        {areaEditor?.enabled && puntoSeleccionado && (
          <AreaRedimensionable
            center={[puntoSeleccionado.lat, puntoSeleccionado.lon]}
            radius={radioM}
            onAreaChange={areaEditor.onAreaChange}
          />
        )}

        {puntoSeleccionado && (
          <Marker position={[puntoSeleccionado.lat, puntoSeleccionado.lon]} icon={nuevoIcon}>
            <Popup>
              <div className="min-w-44 text-sm">
                <strong className="text-gray-950">Nueva ubicación</strong>
                <span className="mt-1 block text-xs text-gray-500">
                  {puntoSeleccionado.lat.toFixed(5)}, {puntoSeleccionado.lon.toFixed(5)}
                </span>
                <span className="mt-2 block text-xs font-semibold text-emerald-800">
                  Completa el formulario lateral.
                </span>
              </div>
            </Popup>
          </Marker>
        )}

        {parcelas.map((p) => (
          <Marker key={p.id} position={[p.latitud, p.longitud]} icon={parcelaIcon}>
            <Popup>
              <div className="min-w-48 text-sm">
                <div className="font-bold text-gray-950">{p.nombre}</div>
                <div className="mt-0.5 text-xs font-medium text-gray-500">{p.device_id}</div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <dt className="text-gray-500">Área</dt>
                  <dd className="text-right font-semibold text-gray-800">{p.area_m2} m²</dd>
                  <dt className="text-gray-500">Altitud</dt>
                  <dd className="text-right font-semibold text-gray-800">{p.altitud_m} m</dd>
                </dl>
                <Link
                  href={`/parcelas/${p.id}`}
                  className="mt-3 flex min-h-9 items-center justify-center rounded-lg bg-[#17643a] px-3 text-xs font-semibold text-white transition hover:bg-[#10502e]"
                >
                  Abrir parcela
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
