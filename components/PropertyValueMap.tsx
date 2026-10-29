"use client";

// components/PropertyValueMap.tsx — Leaflet map of Pembroke property sales.
//
// Uses Leaflet from a CDN so we don't add a heavy dependency to the site
// bundle for one page. The map is progressively enhanced: the table below
// always works, the map is the visual layer on top.
//
// Pins are colored by how the sale compared to the town's assessed value:
//   green  = sold above assessment
//   amber  = sold within 10% of assessment
//   red    = sold below assessment  <- what Tyler is looking for

import { useEffect, useRef, useState } from "react";

export interface MapPin {
  id: string;
  lat: number;
  lon: number;
  address: string;
  salePrice: number;
  assessed: number;
  pct: number | null;
  below: boolean;
  saleDate: string;
}

interface Props {
  pins: MapPin[];
  focusId: string | null;
  onSelect: (id: string) => void;
}

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

function pinColor(p: MapPin): string {
  if (p.below) return "#b91c1c";      // red — sold below assessment
  if (p.pct !== null && p.pct < 10) return "#b45309"; // amber — within 10%
  return "#15803d";                    // green — above assessment
}

function popupHtml(p: MapPin): string {
  const money = (n: number) => "$" + n.toLocaleString("en-US");
  const diff = p.salePrice - p.assessed;
  const sign = diff >= 0 ? "+" : "−";
  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;min-width:190px">
      <div style="font-weight:700;font-size:14px;margin-bottom:2px">${p.address ?? "Pembroke, NH"}</div>
      <div style="font-size:12px;color:#57534e;margin-bottom:6px">Sold ${p.saleDate}</div>
      <div style="font-size:13px;line-height:1.55">
        Sale price <b>${money(p.salePrice)}</b><br/>
        Town assessed <b>${money(p.assessed)}</b><br/>
        <span style="color:${pinColor(p)};font-weight:700">${sign}${money(Math.abs(diff))} (${
          p.pct !== null ? (diff >= 0 ? "+" : "−") + Math.abs(p.pct).toFixed(1) : "—"
        }%)</span>
      </div>
    </div>`;
}

export function PropertyValueMap({ pins, focusId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Load Leaflet once.
  useEffect(() => {
    if (mapRef.current) return;
    let cancelled = false;

    const boot = () => {
      if (cancelled || mapRef.current || !containerRef.current) return;
      const L = (window as any).L;
      if (!L) {
        setFailed(true);
        return;
      }
      const map = L.map(containerRef.current, {
        center: [43.1476, -71.458],
        zoom: 13,
        scrollWheelZoom: false,
        zoomControl: true,
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      setReady(true);
      // Leaflet needs a nudge when it mounts inside a flex/grid container.
      setTimeout(() => map.invalidateSize(), 120);
    };

    if ((window as any).L) {
      boot();
      return;
    }

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }

    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = boot;
    script.onerror = () => setFailed(true);
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, []);

  // Draw the pins.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const L = (window as any).L;
    const layer = layerRef.current;
    if (!L || !layer) return;

    layer.clearLayers();
    markersRef.current.clear();

    for (const p of pins) {
      const marker = L.circleMarker([p.lat, p.lon], {
        radius: 7,
        color: pinColor(p),
        weight: 2,
        fillColor: pinColor(p),
        fillOpacity: 0.75,
      });
      marker.bindPopup(popupHtml(p), { closeButton: false, maxWidth: 240 });
      marker.on("click", () => onSelect(p.id));
      marker.addTo(layer);
      markersRef.current.set(p.id, marker);
    }
  }, [pins, ready, onSelect]);

  // Pan to whatever the user picked in the table.
  useEffect(() => {
    if (!ready || !focusId) return;
    const marker = markersRef.current.get(focusId);
    if (!marker || !mapRef.current) return;
    const pin = pins.find((p) => p.id === focusId);
    if (!pin) return;
    mapRef.current.setView([pin.lat, pin.lon], Math.max(mapRef.current.getZoom(), 16), {
      animate: true,
    });
    marker.openPopup();
  }, [focusId, ready, pins]);

  if (failed) {
    return (
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-6 text-center text-sm text-stone-600">
        The map couldn&apos;t load. The full list below has everything the map shows.
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-[380px] w-full rounded-lg border border-stone-200 bg-stone-100 sm:h-[480px]"
        aria-label="Map of Pembroke home sales compared to town assessed value"
      />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-stone-500">
          Loading map…
        </div>
      )}
    </div>
  );
}
