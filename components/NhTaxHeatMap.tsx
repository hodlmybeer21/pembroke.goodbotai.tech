"use client";

// components/NhTaxHeatMap.tsx — a zoomable choropleth of New Hampshire
// property tax rates.
//
// Every New Hampshire municipality, shaded by its tax rate per $1,000 of
// assessed value, so a resident can zoom from the whole state down to
// their own town and see exactly where Pembroke sits.
//
// Data: NH Department of Revenue Administration "Municipal Tax Rates".
// Shapes: NH DOT town boundary layer.
//
// The map is loaded lazily — the 114KB payload is only fetched when the
// section scrolls into view, so it never slows the home page down for
// someone who scrolls straight past.

import { useEffect, useMemo, useRef, useState } from "react";

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const DATA_URL = "/data/nh-tax-rates.json";

export type TaxMetric = "total" | "school" | "muni";

interface Town {
  n: string;
  c: string | null;
  k: string | null;
  u: boolean;
  total: number | null;
  muni: number | null;
  county_tax: number | null;
  state_ed: number | null;
  local_ed: number | null;
  school: number | null;
  set: string | null;
  g: number[][][];
}

interface TaxMapData {
  source: string;
  source_url: string;
  shape_source: string;
  tax_year: number;
  completed_as_of: string;
  unit: string;
  count: number;
  city_town_count: number;
  median_city_town: number;
  pembroke_total: number | null;
  pembroke_rank_pct: number | null;
  bounds: number[];
  scale: {
    min: number;
    max: number;
    median: number;
    edges: number[];
    bins: number;
  };
  towns: Town[];
}

/** Sequential ramp: pale for low, deep for high. */
const RAMP = [
  "#f7fcf5",
  "#e3f2d9",
  "#f6e8a8",
  "#f3c184",
  "#e8895e",
  "#cf4a37",
  "#96301f",
];

const NO_RATE_FILL = "#e7e5e4";
const PEMBROKE_STROKE = "#1c1917";

function rampColor(t: number): string {
  const i = Math.round(t * (RAMP.length - 1));
  return RAMP[Math.max(0, Math.min(RAMP.length - 1, i))];
}

function money(n: number): string {
  return "$" + n.toFixed(2);
}

function metricLabel(m: TaxMetric): string {
  if (m === "school") return "School (state + local)";
  if (m === "muni") return "Town services (municipal)";
  return "Total tax rate";
}

function metricValue(t: Town, m: TaxMetric): number | null {
  if (m === "school") return t.school;
  if (m === "muni") return t.muni;
  return t.total;
}

/** Where a town falls in the equal-count bins, 0..1. */
function binFraction(v: number, scale: TaxMapData["scale"]): number {
  const edges = scale.edges;
  for (let i = 0; i < edges.length; i++) {
    if (v < edges[i]) return i / (edges.length + 1);
  }
  return 1;
}

function legendRows(scale: TaxMapData["scale"]) {
  const bounds = [scale.min, ...scale.edges, scale.max];
  const rows: { from: number; to: number; color: string }[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    rows.push({
      from: bounds[i],
      to: bounds[i + 1],
      color: rampColor((i + 0.5) / (bounds.length - 1)),
    });
  }
  return rows;
}

export function NhTaxHeatMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [data, setData] = useState<TaxMapData | null>(null);
  const [metric, setMetric] = useState<TaxMetric>("total");
  const [leafletReady, setLeafletReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Fetch the payload on mount.
  //
  // This used to wait on an IntersectionObserver so the 114KB file would
  // only load if the reader scrolled to the map. That turned out to be
  // a silent-failure trap: the observer never fires in some rendering
  // contexts (backgrounded tabs, prerendering, headless browsers), and
  // when it doesn't the map simply never appears with no error. At 29KB
  // gzipped it is not worth the risk.
  useEffect(() => {
    let cancelled = false;
    fetch(DATA_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        center: [43.35, -71.6],
        zoom: 7,
        minZoom: 6,
        maxZoom: 13,
        scrollWheelZoom: false,
        zoomControl: true,
        attributionControl: true,
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      setLeafletReady(true);
      setTimeout(() => map.invalidateSize(), 150);
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

  // Draw the towns.
  useEffect(() => {
    if (!leafletReady || !data || !mapRef.current || !layerRef.current) return;
    const L = (window as any).L;
    layerRef.current.clearLayers();

    const rows = legendRows(data.scale);

    for (const t of data.towns) {
      const v = metricValue(t, metric);
      const noRate = v === null;
      const frac = noRate
        ? 0
        : binFraction(v, data.scale);
      const fill = noRate
        ? NO_RATE_FILL
        : rampColor(frac);

      const latlngs: number[][][] = t.g.map((ring) =>
        ring.map(([lon, lat]) => [lat, lon] as [number, number]),
      );

      const isPembroke = t.n === "PEMBROKE";

      const poly = L.polygon(latlngs as any, {
        color: isPembroke ? PEMBROKE_STROKE : "#ffffff",
        weight: isPembroke ? 3 : 0.6,
        opacity: isPembroke ? 1 : 0.8,
        fillColor: fill,
        fillOpacity: noRate ? 0.5 : 0.88,
      });

      const label = noRate
        ? `${titleCase(t.n)}<br><span style="color:#78716c">No separately published tax rate</span>`
        : `<strong>${titleCase(t.n)}</strong><br>${money(v)} per $1,000` +
          (metric === "total" && t.total !== null
            ? `<br><span style="color:#78716c">School ${money(t.school ?? 0)} · Town services ${money(
                t.muni ?? 0
              )}</span>`
            : "");

      poly.bindTooltip(label, {
        sticky: true,
        direction: "top",
        className: "tax-tip",
      });

      poly.bindPopup(popupHtml(t, metric, data, rows));
      poly.on("mouseover", () => poly.setStyle({ weight: isPembroke ? 3.5 : 1.8, color: isPembroke ? PEMBROKE_STROKE : "#57534e" }));
      poly.on("mouseout", () => poly.setStyle({ weight: isPembroke ? 3 : 0.6, color: isPembroke ? PEMBROKE_STROKE : "#ffffff" }));

      poly.addTo(layerRef.current);
    }

    // Mark Pembroke so it is findable at any zoom level.
    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    const pb = data.towns.find((t) => t.n === "PEMBROKE");
    if (pb && pb.g.length) {
      const ring = pb.g[0];
      const cx = ring.reduce((a, c) => a + c[0], 0) / ring.length;
      const cy = ring.reduce((a, c) => a + c[1], 0) / ring.length;
      const marker = L.marker([cy, cx], {
        icon: L.divIcon({
          className: "tax-pin",
          html: '<span></span>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
        zIndexOffset: 1000,
      }).addTo(mapRef.current);
      marker.bindTooltip(
        `<strong>Pembroke</strong><br>${money(pb.total ?? 0)} per $1,000`,
        { direction: "top", offset: [0, -8] },
      );
      markerRef.current = marker;
    }
  }, [leafletReady, data, metric]);

  // Fit the state once the data lands.
  useEffect(() => {
    if (!leafletReady || !data || !mapRef.current) return;
    const [w, s, e, n] = data.bounds;
    mapRef.current.fitBounds(
      [
        [s, w],
        [n, e],
      ],
      { padding: [12, 12] },
    );
  }, [leafletReady, data]);

  const legend = useMemo(
    () => (data ? legendRows(data.scale) : []),
    [data],
  );

  const pembroke = data?.towns.find((t) => t.n === "PEMBROKE");

  return (
    <div>
      {/* ------------------------------------------------- the stat row */}
      {data && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Stat
            label="Pembroke"
            value={money(data.pembroke_total ?? 0)}
            sub="per $1,000 of assessed value"
          />
          <Stat
            label="NH median"
            value={money(data.median_city_town)}
            sub={`across ${data.city_town_count} cities and towns`}
          />
          <Stat
            label="Where Pembroke lands"
            value={
              data.pembroke_rank_pct !== null
                ? `${Math.round(data.pembroke_rank_pct)}th`
                : "—"
            }
            sub="percentile — higher rate than most towns"
          />
        </div>
      )}

      {/* ------------------------------------------------- metric toggle */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-stone-500">
          Shade by
        </span>
        {(["total", "school", "muni"] as TaxMetric[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMetric(m)}
            aria-pressed={metric === m}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              metric === m
                ? "bg-stone-900 text-white"
                : "border border-stone-300 bg-white text-stone-700 hover:border-stone-500"
            }`}
          >
            {metricLabel(m)}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------- the map */}
      <div className="relative overflow-hidden rounded-xl border border-stone-300 bg-stone-100">
        <div
          ref={containerRef}
          className="h-[380px] w-full sm:h-[480px]"
          aria-label="Map of New Hampshire property tax rates by town"
        />
        {(!data || failed) && !failed && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-stone-500">
            Loading the map…
          </div>
        )}
        {failed && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-stone-600">
            The map could not load. The numbers are above and below it.
          </div>
        )}
        {/* Jump-to-Pembroke control — the whole point is finding your
            own town on a 235-town map. */}
        {data && (
          <button
            type="button"
            onClick={() => {
              if (!mapRef.current || !pembroke || !pembroke.g.length) return;
              const ring = pembroke.g[0];
              const cx = ring.reduce((a, c) => a + c[0], 0) / ring.length;
              const cy = ring.reduce((a, c) => a + c[1], 0) / ring.length;
              mapRef.current.flyTo([cy, cx], 11, { duration: 0.8 });
            }}
            className="absolute bottom-3 right-3 z-[500] rounded-full bg-white px-3 py-1.5 text-xs font-medium text-stone-800 shadow-lg ring-1 ring-stone-300 hover:ring-stone-500"
          >
            Find Pembroke
          </button>
        )}
      </div>

      {/* ------------------------------------------------------- legend */}
      {data && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-1.5">
            {legend.map((r, i) => (
              <div key={i} className="text-center">
                <div
                  className="h-3 w-10 rounded-sm border border-black/10"
                  style={{ background: r.color }}
                />
              </div>
            ))}
          </div>
          <div className="flex w-64 justify-between text-[11px] text-stone-500">
            <span>{money(data.scale.min)}</span>
            <span>{money(data.scale.median)} median</span>
            <span>{money(data.scale.max)}</span>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-stone-500">
        {data ? (
          <>
            {data.tax_year} rates from the {data.source}, completed{" "}
            {new Date(data.completed_as_of + "T12:00:00").toLocaleDateString(
              "en-US",
              { month: "long", day: "numeric", year: "numeric" },
            )}
            . Shades are equal-count bands, so each one holds the same
            number of towns. Grey areas have no separately published
            rate. Tap a town for its breakdown.
          </>
        ) : (
          "Loading New Hampshire tax rates…"
        )}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3">
      <div className="text-[11px] uppercase tracking-wide text-stone-500">
        {label}
      </div>
      <div className="mt-0.5 font-serif text-xl font-semibold text-stone-900">
        {value}
      </div>
      <div className="text-xs text-stone-600">{sub}</div>
    </div>
  );
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function popupHtml(
  t: Town,
  metric: TaxMetric,
  data: TaxMapData,
  rows: { from: number; to: number; color: string }[],
): string {
  if (t.total === null) {
    return (
      `<div style="font:13px/1.5 system-ui,sans-serif;min-width:180px">` +
      `<strong>${titleCase(t.n)}</strong>` +
      `<div style="color:#78716c;margin-top:4px">The state publishes no ` +
      `separate tax rate for this place.</div></div>`
    );
  }
  const row = rows.find(
    (r) => t.total! >= r.from && t.total! <= r.to,
  );
  const swatch = row ? row.color : "#e3f2d9";
  return (
    `<div style="font:13px/1.55 system-ui,sans-serif;min-width:210px">` +
    `<div style="display:flex;align-items:center;gap:7px">` +
    `<span style="width:11px;height:11px;border-radius:3px;background:${swatch};border:1px solid #0002"></span>` +
    `<strong style="font-size:14px">${titleCase(t.n)}</strong>` +
    (t.c ? `<span style="color:#78716c">${t.c} County</span>` : "") +
    `</div>` +
    `<div style="margin-top:7px;font-size:15px"><strong>${money(t.total)}</strong> per $1,000</div>` +
    `<table style="margin-top:7px;border-collapse:collapse;font-size:12px">` +
    `<tr><td style="padding:1px 10px 1px 0;color:#57534e">School</td>` +
    `<td style="text-align:right;padding:1px 0">${money(t.school ?? 0)}</td>` +
    `<td style="padding-left:8px;color:#a8a29e">${(
      ((t.school ?? 0) / t.total) * 100
    ).toFixed(0)}%</td></tr>` +
    `<tr><td style="padding:1px 10px 1px 0;color:#57534e">Town services</td>` +
    `<td style="text-align:right;padding:1px 0">${money(t.muni ?? 0)}</td>` +
    `<td style="padding-left:8px;color:#a8a29e">${(
      ((t.muni ?? 0) / t.total) * 100
    ).toFixed(0)}%</td></tr>` +
    `<tr><td style="padding:1px 10px 1px 0;color:#57534e">County</td>` +
    `<td style="text-align:right;padding:1px 0">${money(t.county_tax ?? 0)}</td>` +
    `<td style="padding-left:8px;color:#a8a29e">${(
      ((t.county_tax ?? 0) / t.total) * 100
    ).toFixed(0)}%</td></tr>` +
    `<tr><td style="padding:1px 10px 1px 0;color:#57534e">State education</td>` +
    `<td style="text-align:right;padding:1px 0">${money(t.state_ed ?? 0)}</td>` +
    `<td style="padding-left:8px;color:#a8a29e">${(
      ((t.state_ed ?? 0) / t.total) * 100
    ).toFixed(0)}%</td></tr>` +
    `</table>` +
    `<div style="margin-top:7px;color:#78716c;font-size:11px">Rate set ${t.set} · ` +
    `viewing ${metricLabel(metric).toLowerCase()}</div>` +
    `</div>`
  );
}
