import { useState, useEffect } from "react";
import { useDrivingData } from "./useDrivingData";
import type {
  TrafficIncident,
  TrafficCamera,
  ExpresswayStatus,
  TravelTimeRoute,
} from "../../lib/apiClient";

// ── Camera ID → readable location label ──────────────────────────────────────

const CAMERA_LABELS: Record<string, string> = {
  // CTE – Central Expressway
  "1001": "CTE – Braddell Flyover",
  "1002": "CTE – Braddell Rd",
  "1003": "CTE – Ang Mo Kio Ave 1",
  "1004": "CTE – Ang Mo Kio Ave 5",
  "1005": "CTE – Yio Chu Kang",
  "1006": "CTE – Lentor Ave",
  // AYE – Ayer Rajah Expressway (inc. West Coast area)
  "1501": "AYE – Tuas",
  "1502": "AYE – Jurong / Jln Bahar",
  "1503": "AYE – Clementi / West Coast",
  "1504": "AYE – Kent Ridge / NUS",
  "1505": "AYE – Keppel / HarbourFront",
  "1506": "AYE – Alexandra",
  "1507": "AYE – West Coast Dr",
  "1508": "AYE – West Coast Park",
  // BKE – Bukit Timah Expressway
  "1601": "BKE – KJE Jct",
  "1602": "BKE – Chantek",
  "1603": "BKE – Dairy Farm",
  "1604": "BKE – Mandai",
  "1605": "BKE – Woodlands Ave 2",
  "1606": "BKE – Woodlands Checkpoint",
  // ECP – East Coast Parkway
  "1701": "ECP – Changi Airport",
  "1702": "ECP – Tampines",
  "1703": "ECP – Bedok",
  "1704": "ECP – Tanjong Katong",
  "1705": "ECP – Benjamin Sheares",
  "1706": "ECP – Marine Parade",
  "1707": "ECP – Mountbatten",
  "1709": "ECP – KPE Jct",
  "1711": "ECP – Laguna / Bay East",
  "1712": "ECP – Marina South",
  // PIE – Pan Island Expressway
  "2701": "PIE – Changi",
  "2702": "PIE – Tampines",
  "2703": "PIE – Bedok N",
  "2704": "PIE – Eunos",
  "2705": "PIE – Paya Lebar",
  "2706": "PIE – Toa Payoh",
  "2707": "PIE – MacPherson",
  "2708": "PIE – Thomson",
  "2709": "PIE – Bukit Timah",
  "2710": "PIE – Buona Vista",
  "2711": "PIE – Clementi",
  "2712": "PIE – Tuas",
  // TPE – Tampines Expressway
  "3702": "TPE – Changi",
  "3705": "TPE – Tampines",
  "3793": "TPE – KPE Jct",
  "3795": "TPE – SLE Jct",
  // KJE – Kranji Expressway
  "4701": "KJE – Kranji Expy",
  "4702": "KJE – BKE Jct",
  "4703": "KJE – Bukit Batok",
  "4704": "KJE – Bukit Gombak",
  "4705": "KJE – Chinese Garden",
  "4706": "KJE – Pandan",
  "4707": "KJE – AYE Jct",
  // SLE – Seletar Expressway
  "5794": "SLE – Lentor",
  "5795": "SLE – Woodlands",
  "5797": "SLE – Mandai",
  "5798": "SLE – KJE Jct",
  "5799": "SLE – Upper Thomson",
  // MCE – Marina Coastal Expressway
  "6701": "MCE – Marina Bay",
  "6703": "MCE – Marina Bay South",
  "6704": "MCE – ECP Jct",
  "6705": "MCE – Keppel / HarbourFront",
  "6706": "MCE – Telok Blangah",
  "6710": "MCE – Keppel Rd / Container Port",
  "6711": "MCE – Labrador",
  "6712": "MCE – Tanjong Pagar",
  "6716": "MCE – Sentosa Gateway",
  // KPE – Kallang–Paya Lebar Expressway
  "7791": "KPE – Tampines Expy",
  "7793": "KPE – Geylang",
  "7794": "KPE – Nicoll Hwy",
  "7795": "KPE – Kallang",
  "7796": "KPE – Queensborough",
  "7797": "KPE – Upper Boon Keng",
  "7798": "KPE – Tampines Ave 10",
  // Checkpoints
  "8701": "Woodlands Checkpoint",
  "8702": "SLE – Yishun / Sembawang",
  "9701": "Tuas Checkpoint",
  "9702": "Tuas – Second Link (W)",
  "9703": "Tuas – Benoi Rd",
  "9704": "Tuas – Tuas Ave 2",
  "9705": "Tuas – Jln Ahmad Ibrahim",
  "9706": "Tuas – Jurong Industrial",
};

const JB_CHECKPOINT_CAMERAS = new Set(["8701", "9701"]);
const WEST_COAST_FOCUS_CAMERAS = new Set([
  "1501",
  "1502",
  "1503",
  "1504",
  "1505",
  "1506",
  "1507",
  "1508",
  "6705",
  "6706",
  "6710",
  "6711",
  "6712",
  "6716",
]);

function cameraLabel(id: string): string {
  return CAMERA_LABELS[id] ?? `Camera #${id}`;
}

function isSafeCameraImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type Region = "west" | "north" | "south" | "east";
// Display and grouping order for regions in heatmap/routes
const REGION_ORDER: Region[] = ["west", "south", "east", "north"];
const REGION_LABEL: Record<Region, string> = {
  west: "West",
  north: "North",
  south: "South",
  east: "East",
};
const REGION_BADGE: Record<Region, string> = {
  west: "bg-amber-500/25 text-amber-300 border-amber-500/40",
  north: "bg-sky-500/25 text-sky-300 border-sky-500/40",
  south: "bg-fuchsia-500/25 text-fuchsia-300 border-fuchsia-500/40",
  east: "bg-emerald-500/25 text-emerald-300 border-emerald-500/40",
};

function expresswayCode(name: string): string | null {
  const n = name.toUpperCase();
  if (n.includes("AYER RAJAH") || n.includes("AYE")) return "AYE";
  if (n.includes("BUKIT TIMAH") || n.includes("BKE")) return "BKE";
  if (n.includes("CENTRAL EXPRESSWAY") || n.includes("CTE")) return "CTE";
  if (n.includes("EAST COAST") || n.includes("ECP")) return "ECP";
  if (n.includes("KALLANG PAYA LEBAR") || n.includes("KALLANG-PAYA LEBAR") || n.includes("KPE"))
    return "KPE";
  if (n.includes("KRANJI EXPRESSWAY") || n.includes("KJE")) return "KJE";
  if (n.includes("PAN ISLAND") || n.includes("PIE")) return "PIE";
  if (n.includes("SELETAR EXPRESSWAY") || n.includes("SLE")) return "SLE";
  if (n.includes("TAMPINES EXPRESSWAY") || n.includes("TPE")) return "TPE";
  if (n.includes("MARINA COAST") || n.includes("MARINA COASTAL") || n.includes("MCE"))
    return "MCE";
  return null;
}

function regionFromCoords(lat: number, lon: number): Region {
  if (lon <= 103.78) return "west";
  if (lon >= 103.9) return "east";
  if (lat >= 1.37) return "north";
  return "south";
}

function roadRegion(name: string): Region {
  const n = name.toUpperCase();
  const code = expresswayCode(name);

  // Primary: classify expressways by code
  if (code === "AYE" || code === "KJE" || code === "PIE" || code === "MCE") return "west";
  if (code === "BKE" || code === "SLE" || code === "CTE") return "north";
  if (code === "ECP" || code === "KPE" || code === "TPE") return "east";

  // Treat anything around NUS / West Coast / HarbourFront cluster as "west"
  if (
    n.includes("AYE") ||
    n.includes("KJE") ||
    n.includes("PIE") ||
    n.includes("BUONA VISTA") ||
    n.includes("WEST COAST") ||
    n.includes("CLEMENTI") ||
    n.includes("QUEENSWAY") ||
    n.includes("HARBOURFRONT") ||
    n.includes("HARBOUR FRONT") ||
    n.includes("PASIR PANJANG") ||
    n.includes("NUS") ||
    n.includes("ALEXANDRA") ||
    n.includes("LABRADOR")
  ) {
    return "west";
  }
  if (n.includes("BKE") || n.includes("SLE")) return "north";
  if (n.includes("ECP") || n.includes("TPE") || n.includes("KPE")) return "east";
  return "south";
}

function regionSort(a: Region, b: Region) {
  return REGION_ORDER.indexOf(a) - REGION_ORDER.indexOf(b);
}

function incidentIcon(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("accident")) return "💥";
  if (t.includes("breakdown")) return "🚗";
  if (t.includes("roadwork") || t.includes("road work")) return "🚧";
  if (t.includes("obstruction")) return "⛔";
  if (t.includes("heavy")) return "🐢";
  return "⚠️";
}

function bandColor(status: ExpresswayStatus["status"]) {
  if (status === "jammed")
    return {
      bg: "bg-red-500/20",
      border: "border-red-500/50",
      dot: "bg-red-500",
      text: "text-red-400",
      label: "JAM",
      glow: "shadow-red-500/20",
      badge: "bg-red-500/30 text-red-300",
    };
  if (status === "slow")
    return {
      bg: "bg-amber-500/20",
      border: "border-amber-500/50",
      dot: "bg-amber-400",
      text: "text-amber-400",
      label: "HEAVY",
      glow: "shadow-amber-500/20",
      badge: "bg-amber-500/30 text-amber-300",
    };
  return {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    label: "CLEAR",
    glow: "shadow-emerald-500/10",
    badge: "bg-emerald-500/20 text-emerald-300",
  };
}

// ── Sub-panels ────────────────────────────────────────────────────────────────

function SkeletonBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 rounded-xl bg-white/5 animate-pulse" />
      ))}
    </div>
  );
}

function IncidentsPanel({
  incidents,
  lastUpdated,
}: {
  incidents: TrafficIncident[];
  lastUpdated: Date | null;
}) {
  if (incidents.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/30 backdrop-blur-sm px-4 py-5 text-center">
        <div className="text-3xl mb-2">✅</div>
        <p className="text-sm text-emerald-300 font-bold">All clear — no active incidents</p>
        <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed">
          Live from LTA DataMall
          {lastUpdated
            ? ` · ${lastUpdated.toLocaleTimeString("en-SG", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
                timeZone: "Asia/Singapore",
              })}`
            : ""}
        </p>
      </div>
    );
  }

  const byRegion: Record<Region, TrafficIncident[]> = {
    west: [],
    north: [],
    south: [],
    east: [],
  };
  for (const inc of incidents) {
    byRegion[regionFromCoords(inc.Latitude, inc.Longitude)].push(inc);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {REGION_ORDER.map((region) => {
          const items = byRegion[region];
          return (
            <div
              key={region}
              className="rounded-xl border border-zinc-700/40 bg-zinc-800/40 backdrop-blur-sm px-2.5 py-2"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${REGION_BADGE[region]}`}
                >
                  {REGION_LABEL[region]}
                </span>
                <span className="text-[10px] font-bold text-zinc-400">{items.length}</span>
              </div>
              {items.length === 0 ? (
                <p className="text-[10px] text-zinc-500">No alerts</p>
              ) : (
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-0.5">
                  {items.map((inc, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-zinc-700/40 bg-zinc-900/35 px-2 py-1.5"
                    >
                      <p className="text-[10px] font-semibold text-zinc-100 flex items-start gap-1.5">
                        <span className="mt-0.5">{incidentIcon(inc.Type)}</span>
                        <span className="truncate">{inc.Type}</span>
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-400 leading-snug whitespace-pre-wrap break-words">
                        {inc.Message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-zinc-500 text-center">
        {lastUpdated
          ? `Updated ${lastUpdated.toLocaleTimeString("en-SG", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
              timeZone: "Asia/Singapore",
            })}`
          : "Live from LTA DataMall"}
      </p>
    </div>
  );
}

function CameraPanel({ cameras }: { cameras: TrafficCamera[] }) {
  const [selected, setSelected] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const sortedCameras = [...cameras].sort((a, b) => {
    // 1) JB checkpoints first
    const aJb = JB_CHECKPOINT_CAMERAS.has(a.CameraID) ? 0 : 1;
    const bJb = JB_CHECKPOINT_CAMERAS.has(b.CameraID) ? 0 : 1;
    if (aJb !== bJb) return aJb - bJb;

    // 2) West Coast / AYE / MCE focus cameras next
    const aWest = WEST_COAST_FOCUS_CAMERAS.has(a.CameraID) ? 0 : 1;
    const bWest = WEST_COAST_FOCUS_CAMERAS.has(b.CameraID) ? 0 : 1;
    if (aWest !== bWest) return aWest - bWest;

    // 3) Then by region and distance
    const ar = regionFromCoords(a.Latitude, a.Longitude);
    const br = regionFromCoords(b.Latitude, b.Longitude);
    return regionSort(ar, br) || a.distanceKm - b.distanceKm;
  });

  const camId = sortedCameras[selected]?.CameraID;
  useEffect(() => {
    if (selected >= sortedCameras.length) {
      setSelected(Math.max(0, sortedCameras.length - 1));
    }
  }, [selected, sortedCameras.length]);

  useEffect(() => {
    setImageFailed(false);
  }, [camId]);

  if (cameras.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-700/40 bg-zinc-800/30 backdrop-blur-sm py-8 px-4 text-center">
        <p className="text-sm text-zinc-300 font-semibold">No camera data available</p>
        <p className="text-[11px] text-zinc-500 mt-2">
          Traffic Images API may be unavailable or not subscribed.
        </p>
      </div>
    );
  }

  const cam = sortedCameras[selected] ?? sortedCameras[0];
  if (!cam) return null;
  const label = cameraLabel(cam.CameraID);
  const cameraUrlSafe = isSafeCameraImageUrl(cam.ImageLink);
  const safeCameraSrc = cameraUrlSafe
    ? cam.ImageLink
    : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225'%3E%3Crect width='400' height='225' fill='%23111827'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='13' fill='%23f59e0b' text-anchor='middle' dominant-baseline='middle'%3EBlocked insecure image URL%3C/text%3E%3C/svg%3E";

  return (
    <div className="flex flex-col gap-3">
      {/* Camera image */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 aspect-video shadow-2xl">
        <img
          key={safeCameraSrc}
          src={safeCameraSrc}
          alt={label}
          className="w-full h-full object-contain bg-zinc-950"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            setImageFailed(true);
            (e.target as HTMLImageElement).src =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225'%3E%3Crect width='400' height='225' fill='%23111827'/%3E%3Ctext x='50%25' y='45%25' font-family='sans-serif' font-size='14' fill='%239ca3af' text-anchor='middle' dominant-baseline='middle'%3EImage unavailable%3C/text%3E%3Ctext x='50%25' y='58%25' font-family='sans-serif' font-size='11' fill='%236b7280' text-anchor='middle' dominant-baseline='middle'%3ERefresh for new snapshot%3C/text%3E%3C/svg%3E";
          }}
        />
        {!cameraUrlSafe && (
          <p className="absolute bottom-12 left-0 right-0 text-center text-[11px] text-amber-300/90 px-3">
            Camera image blocked due to insecure URL.
          </p>
        )}
        {imageFailed && (
          <p className="absolute bottom-12 left-0 right-0 text-center text-[11px] text-amber-300/90 px-3">
            LTA image links expire — refresh for a new snapshot.
          </p>
        )}
        {/* Location overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 py-3">
          <p className="text-[12px] font-bold text-white leading-tight">{label}</p>
          <p className="text-[10px] text-white/60 mt-0.5">{cam.distanceKm} km from you</p>
        </div>
        {/* Live badge */}
        <div className="absolute top-2.5 right-2.5">
          <span className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm rounded-full px-2.5 py-1 text-[10px] text-red-400 font-bold border border-red-500/30">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </span>
        </div>
      </div>

      {/* Camera selector */}
      {sortedCameras.length > 1 && (
        <div className="flex flex-col gap-1.5">
          {sortedCameras.map((c, i) => (
            <button
              key={c.CameraID}
              onClick={() => setSelected(i)}
              className={`flex items-center justify-between rounded-xl border px-3.5 py-2 text-[11px] font-medium transition-all text-left ${
                i === selected
                  ? "border-sky-500/60 bg-sky-500/20 text-sky-200 shadow-lg shadow-sky-500/10"
                  : "border-zinc-700/40 bg-zinc-800/40 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600/50"
              }`}
            >
              <span className="truncate">{cameraLabel(c.CameraID)}</span>
              <div className="shrink-0 ml-2 flex items-center gap-1.5">
                <span
                  className={`rounded border px-1 py-0.5 text-[9px] font-black uppercase tracking-wide ${REGION_BADGE[regionFromCoords(c.Latitude, c.Longitude)]}`}
                >
                  {REGION_LABEL[regionFromCoords(c.Latitude, c.Longitude)]}
                </span>
                {JB_CHECKPOINT_CAMERAS.has(c.CameraID) && (
                  <span className="rounded bg-violet-500/25 px-1 py-0.5 text-[9px] font-black text-violet-300">
                    JB
                  </span>
                )}
                {WEST_COAST_FOCUS_CAMERAS.has(c.CameraID) && (
                  <span className="rounded bg-amber-500/25 px-1 py-0.5 text-[9px] font-black text-amber-300">
                    WEST
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold ${i === selected ? "text-sky-400" : "text-zinc-600"}`}
                >
                  {c.distanceKm} km
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SpeedBandsPanel({ expressways }: { expressways: ExpresswayStatus[] }) {
  if (expressways.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl border border-amber-700/40 bg-amber-950/30 backdrop-blur-sm px-4 py-5 text-center">
          <div className="text-3xl mb-2">🌡️</div>
          <p className="text-sm text-amber-300 font-bold">Speed band data unavailable</p>
          <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
            To enable the heatmap, go to{" "}
            <strong className="text-amber-300">datamall.lta.gov.sg</strong> → My Account →
            enable <strong className="text-amber-300">Traffic Speed Bands</strong> for your
            API key.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-700/30 bg-zinc-800/30 px-3 py-3">
          <p className="text-[10px] text-zinc-500 text-center">
            Once enabled, refresh the page. Data updates every ~1 min.
          </p>
        </div>
      </div>
    );
  }

  const summary = {
    jammed: expressways.filter((e) => e.status === "jammed").length,
    slow: expressways.filter((e) => e.status === "slow").length,
    clear: expressways.filter((e) => e.status === "clear").length,
  };
  const sortedExpressways = [...expressways].sort(
    (a, b) => regionSort(roadRegion(a.name), roadRegion(b.name)) || a.name.localeCompare(b.name)
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 py-3 text-center shadow-lg shadow-red-500/10">
          <p className="text-2xl font-black text-red-400">{summary.jammed}</p>
          <p className="text-[10px] text-red-400/80 uppercase tracking-widest mt-0.5">Jammed</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 py-3 text-center shadow-lg shadow-amber-500/10">
          <p className="text-2xl font-black text-amber-400">{summary.slow}</p>
          <p className="text-[10px] text-amber-400/80 uppercase tracking-widest mt-0.5">Heavy</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-3 text-center shadow-lg shadow-emerald-500/10">
          <p className="text-2xl font-black text-emerald-400">{summary.clear}</p>
          <p className="text-[10px] text-emerald-400/80 uppercase tracking-widest mt-0.5">Clear</p>
        </div>
      </div>

      {/* Expressway grid */}
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {sortedExpressways.map((exp) => {
          const c = bandColor(exp.status);
          const region = roadRegion(exp.name);
          const code = expresswayCode(exp.name);
          return (
            <div
              key={exp.name}
              className={`flex items-center justify-between rounded-xl border ${c.border} ${c.bg} px-3 py-2.5 shadow-md ${c.glow}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${c.dot} shadow-sm`} />
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-bold text-white/90 truncate">
                    {exp.name}
                    {code ? ` (${code})` : ""}
                  </span>
                  <span className="text-[9px] text-zinc-400/90">
                    {code ? `${code} · ` : ""}
                    Band {exp.avgBand} · LTA speed band
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={`rounded border px-1 py-0.5 text-[8px] font-black uppercase tracking-wide ${REGION_BADGE[region]}`}
                >
                  {REGION_LABEL[region]}
                </span>
                <span className={`text-[9px] font-black shrink-0 ml-1 ${c.text} uppercase tracking-wide`}>
                  {c.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Typical free-flow travel time reference per expressway (minutes end-to-end)
const TYPICAL_CLEAR_MINS: Record<string, number> = {
  AYE: 28,
  BKE: 12,
  CTE: 18,
  ECP: 22,
  KJE: 10,
  PIE: 48,
  SLE: 14,
  TPE: 22,
  "KALLANG-PAYA LEBAR": 22,
  "MARINA COASTAL": 8,
};

function routeStatus(
  r: TravelTimeRoute,
  speedStatus?: "jammed" | "slow" | "clear"
): "jammed" | "slow" | "clear" {
  if (speedStatus === "jammed") return "jammed";
  if (speedStatus === "slow") return "slow";
  const typical =
    TYPICAL_CLEAR_MINS[r.name] ?? TYPICAL_CLEAR_MINS[r.name.toUpperCase()] ?? null;
  if (typical != null) {
    const ratio = r.totalMinutes / typical;
    const delayMins = r.totalMinutes - typical;
    // HEAVY only if meaningfully slower AND at least +5 min delay
    if (ratio > 1.7 && delayMins >= 10) return "jammed";
    if (ratio > 1.25 && delayMins >= 5) return "slow";
  }
  return "clear";
}

function TravelTimesPanel({
  travelTimes,
  expressways,
  hideLegend = false,
}: {
  travelTimes: TravelTimeRoute[];
  expressways: ExpresswayStatus[];
  hideLegend?: boolean;
}) {
  // Index by both full road name AND extracted short code so that speed band
  // overrides correctly apply to travel-time rows (which use short codes like "BKE").
  const statusByExpressway = new Map<string, ExpresswayStatus["status"]>();
  for (const e of expressways) {
    statusByExpressway.set(e.name, e.status);
    const code = expresswayCode(e.name);
    if (code) statusByExpressway.set(code, e.status);
  }
  const shortName = (name: string) =>
    name
      .replace("KALLANG-PAYA LEBAR", "KPE")
      .replace("MARINA COASTAL", "MCE")
      .replace("AYE", "AYE")
      .trim();

  if (travelTimes.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-700/40 bg-zinc-800/30 py-8 px-4 text-center">
        <p className="text-sm text-zinc-300 font-semibold">No travel time data</p>
        <p className="text-[11px] text-zinc-500 mt-2">
          Ensure <strong>Est Travel Times</strong> is enabled in LTA DataMall.
        </p>
      </div>
    );
  }

  // Group by expressway name
  const grouped = new Map<string, TravelTimeRoute[]>();
  for (const r of travelTimes) {
    const existing = grouped.get(r.name) ?? [];
    existing.push(r);
    grouped.set(r.name, existing);
  }

  const groupedEntries = Array.from(grouped.entries()).sort(
    ([a], [b]) => regionSort(roadRegion(a), roadRegion(b)) || a.localeCompare(b)
  );

  return (
    <div className="flex flex-col gap-3">
      {!hideLegend && (
        <div className="flex gap-3 px-1 pb-1">
          {(
            [
              { color: "text-red-400", dot: "bg-red-400", label: "JAM" },
              { color: "text-amber-400", dot: "bg-amber-400", label: "HEAVY" },
              { color: "text-emerald-400", dot: "bg-emerald-400", label: "CLEAR" },
            ] as const
          ).map(({ color, dot, label }) => (
            <span key={label} className={`flex items-center gap-1.5 text-[10px] font-bold ${color}`}>
              <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Expressway cards with per-direction detail inline */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {groupedEntries.map(([name, routes]) => {
          const worstStatus = routes.reduce<"jammed" | "slow" | "clear">((acc, r) => {
            const st = routeStatus(r, statusByExpressway.get(name));
            if (st === "jammed") return "jammed";
            if (st === "slow" && acc !== "jammed") return "slow";
            return acc;
          }, "clear");
          const c = bandColor(worstStatus);
          const region = roadRegion(name);
          const sortedRoutes = [...routes].sort((a, b) => a.totalMinutes - b.totalMinutes);

          return (
            <div
              key={name}
              className={`rounded-xl border ${c.border} ${c.bg} px-3 py-2.5 shadow-md ${c.glow}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${c.dot}`} />
                  <p className="text-[13px] font-black text-white/95 truncate">{shortName(name)}</p>
                </div>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${c.badge}`}
                >
                  {c.label}
                </span>
                <span
                  className={`rounded border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide ${REGION_BADGE[region]}`}
                >
                  {REGION_LABEL[region]}
                </span>
              </div>
              {sortedRoutes.map((r, i) => {
                const st = routeStatus(r, statusByExpressway.get(name));
                const dc = bandColor(st);
                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between rounded-lg border ${dc.border} ${dc.bg} px-2 py-1.5 mt-1`}
                  >
                    <span className="text-[10px] text-zinc-200 truncate font-semibold">
                      → {r.farEndPoint}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      <span className="text-[11px] font-bold text-white/90">{r.totalMinutes}m</span>
                      <span className={`text-[9px] font-black ${dc.text}`}>{dc.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type DrivingTab = "camera" | "roads" | "alerts";

function RedCarIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 36"
      className={className}
      aria-label="Car"
      role="img"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Car body — main lower hull */}
      <rect x="4" y="20" width="56" height="11" rx="4" fill="#cc1414" />
      {/* Raised cabin roof section */}
      <path
        d="M14 20 C16 10, 20 7, 25 7 L39 7 C44 7, 48 10, 50 20 Z"
        fill="#e02020"
      />
      {/* Roof highlight */}
      <path
        d="M18 19 C20 11, 23 9, 27 9 L37 9 C41 9, 44 11, 46 19 Z"
        fill="#f03030"
        opacity="0.4"
      />
      {/* Front windscreen */}
      <path
        d="M40 19 C42 13, 45 10, 48 10 L50 19 Z"
        fill="#a8d8f0"
        opacity="0.85"
      />
      {/* Rear windscreen */}
      <path
        d="M24 19 C22 13, 19 10, 16 10 L14 19 Z"
        fill="#a8d8f0"
        opacity="0.85"
      />
      {/* Side windows (middle) */}
      <path
        d="M26 19 L28 10 L36 10 L38 19 Z"
        fill="#b8e0f5"
        opacity="0.8"
      />
      {/* Body crease / side stripe highlight */}
      <rect x="6" y="24" width="52" height="2" rx="1" fill="#ff4444" opacity="0.35" />
      {/* Front bumper */}
      <rect x="54" y="23" width="5" height="5" rx="2" fill="#b01010" />
      {/* Rear bumper */}
      <rect x="5" y="23" width="5" height="5" rx="2" fill="#b01010" />
      {/* Front headlight */}
      <rect x="56" y="21" width="4" height="3" rx="1.2" fill="#ffe066" />
      {/* Rear taillight */}
      <rect x="4" y="21" width="4" height="3" rx="1.2" fill="#ff3333" />
      {/* Left wheel arch */}
      <ellipse cx="16" cy="31" rx="7" ry="7" fill="#1a1a1a" />
      <ellipse cx="16" cy="31" rx="4.5" ry="4.5" fill="#333" />
      <ellipse cx="16" cy="31" rx="2" ry="2" fill="#999" />
      {/* Right wheel arch */}
      <ellipse cx="48" cy="31" rx="7" ry="7" fill="#1a1a1a" />
      <ellipse cx="48" cy="31" rx="4.5" ry="4.5" fill="#333" />
      <ellipse cx="48" cy="31" rx="2" ry="2" fill="#999" />
      {/* Roof shine */}
      <path
        d="M27 8 Q32 6.5 37 8"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  );
}

const TABS: { id: DrivingTab; icon: string; label: string }[] = [
  { id: "camera", icon: "📹", label: "Traffic Camera" },
  { id: "roads", icon: "🚥", label: "Expressway Conditions" },
  { id: "alerts", icon: "⚠️", label: "Traffic Alerts" },
];

const TAB_BACKGROUND: Record<DrivingTab, string> = {
  camera: "/driving-bg.png",
  roads: "/driving-routes-bg.png",
  alerts: "/driving-alerts-bg.png",
};

export function DrivingPage() {
  const [activeTab, setActiveTab] = useState<DrivingTab>("camera");
  const { data, loading, error, lastUpdated, isStale, refresh } = useDrivingData();
  const hasHardError = Boolean(error && !data);

  const jammedCount = data?.expressways.filter((e) => e.status === "jammed").length ?? 0;
  const incidentCount = data?.incidents.length ?? 0;

  return (
    <div className="flex h-full flex-col text-white overflow-hidden relative">
      {/* Background image layer */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${TAB_BACKGROUND[activeTab]})` }}
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 z-0 bg-zinc-950/82" />

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-white/10 bg-black/30 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-12 items-center justify-center rounded-xl bg-red-500/15 border border-red-500/25">
            <RedCarIcon className="h-5 w-auto" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white leading-tight tracking-wide">
              Road Jam View
            </h1>
            <p className="text-[10px] text-zinc-400">
              {loading && !data ? "Loading traffic data…" : "Live LTA traffic feed"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isStale && (
            <span className="text-[10px] text-amber-400 flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
              Stale
            </span>
          )}
          <button
            onClick={() => void refresh()}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-sm px-3 py-1.5 text-[11px] text-zinc-300 hover:text-white transition-all disabled:opacity-40 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            {loading && data ? "⟳" : "↻"} Refresh
          </button>
        </div>
      </header>

      {/* ── Status bar ── */}
      {data && (
        <div className="relative z-10 flex items-center gap-3 px-4 py-1.5 bg-black/25 backdrop-blur-sm border-b border-white/5 text-[11px] shrink-0">
          <span
            className={`flex items-center gap-1 font-semibold ${incidentCount > 0 ? "text-red-400" : "text-zinc-500"}`}
          >
            ⚠️ {incidentCount} incident{incidentCount !== 1 ? "s" : ""}
          </span>
          <span className="text-zinc-700">·</span>
          <span
            className={`flex items-center gap-1 font-semibold ${jammedCount > 0 ? "text-red-400" : "text-emerald-400"}`}
          >
            {jammedCount > 0 ? `🔴 ${jammedCount} jammed` : "🟢 Roads clear"}
          </span>
          <span className="ml-auto text-zinc-500 tabular-nums font-medium">
            {lastUpdated?.toLocaleTimeString("en-SG", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
              timeZone: "Asia/Singapore",
            }) ?? "—"}
          </span>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="relative z-10 mx-3 mt-2 rounded-xl border border-red-800/60 bg-red-950/60 backdrop-blur-sm px-3 py-2 text-xs text-red-400 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate">⚠️ {error}</span>
            <button
              onClick={() => void refresh()}
              className="rounded border border-red-500/40 bg-red-900/40 px-2 py-1 text-[10px] font-semibold text-red-200 hover:bg-red-900/70"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ── No data hint ── */}
      {data &&
        !loading &&
        !error &&
        data.cameras.length === 0 &&
        data.expressways.length === 0 &&
        data.travelTimes.length === 0 && (
          <div className="relative z-10 mx-3 mt-2 rounded-xl border border-amber-700/50 bg-amber-950/40 backdrop-blur-sm px-3 py-2 text-[11px] text-amber-300/90 shrink-0">
            No traffic data. Check that your API key has{" "}
            <strong>Traffic Images</strong>,{" "}
            <strong>Traffic Speed Bands</strong> and{" "}
            <strong>Est Travel Times</strong> enabled in LTA DataMall.
          </div>
        )}

      {/* ── Tab bar ── */}
      <div className="relative z-10 flex border-b border-white/10 bg-black/30 backdrop-blur-md shrink-0" role="tablist" aria-label="Driving sections">
        {TABS.map(({ id, icon, label }) => {
          const isActive = activeTab === id;
          const hasBadge =
            (id === "alerts" && incidentCount > 0) ||
            (id === "roads" && jammedCount > 0);
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              role="tab"
              aria-selected={isActive}
              className={`relative flex-1 py-2.5 text-[11px] font-semibold transition-all flex flex-col items-center gap-0.5 border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-inset ${
                isActive
                  ? "border-amber-400 text-amber-300 bg-amber-400/10"
                  : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              }`}
            >
              <span className="text-sm">{icon}</span>
              <span className="tracking-wide">{label}</span>
              {hasBadge && (
                <span className="absolute top-1.5 right-2.5 h-1.5 w-1.5 rounded-full bg-red-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      <main className="relative z-10 flex-1 overflow-y-auto overscroll-contain">
        <div className="px-3 py-3">
          {hasHardError && (
            <div className="rounded-2xl border border-red-800/60 bg-red-950/50 px-4 py-5 text-center">
              <p className="text-sm font-bold text-red-200">Traffic data unavailable</p>
              <p className="mt-1 text-[11px] text-red-300/80">
                Could not fetch traffic feeds. Check backend/network and retry.
              </p>
            </div>
          )}

          {!hasHardError && activeTab === "camera" && (
            <>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2 px-0.5">
                📹 Live Traffic Camera
              </p>
              {loading && !data ? (
                <div className="aspect-video rounded-2xl bg-white/5 animate-pulse" />
              ) : (
                <CameraPanel cameras={data?.cameras ?? []} />
              )}
            </>
          )}

          {!hasHardError && activeTab === "roads" && (
            <>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2 px-0.5">
                🚥 Expressways & travel times
              </p>
              {loading && !data ? (
                <SkeletonBlock rows={6} />
              ) : (
                <div className="flex flex-col gap-6">
                  {/* Legend: applies to both sections */}
                  <div className="flex flex-wrap gap-3 px-1 pb-1">
                    {(
                      [
                        { color: "text-red-400", dot: "bg-red-400", label: "JAM" },
                        { color: "text-amber-400", dot: "bg-amber-400", label: "HEAVY" },
                        { color: "text-emerald-400", dot: "bg-emerald-400", label: "CLEAR" },
                      ] as const
                    ).map(({ color, dot, label }) => (
                      <span key={label} className={`flex items-center gap-1.5 text-[10px] font-bold ${color}`}>
                        <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
                        {label}
                      </span>
                    ))}
                  </div>

                  {/* Section 1: How's this expressway? */}
                  <div>
                    <p className="text-[11px] font-bold text-zinc-400 mb-2 px-0.5">
                      How's this expressway?
                    </p>
                    <SpeedBandsPanel expressways={data?.expressways ?? []} />
                  </div>

                  {/* Section 2: How long to each end? */}
                  <div>
                    <p className="text-[11px] font-bold text-zinc-400 mb-2 px-0.5">
                      How long to each end of this expressway?
                    </p>
                    <TravelTimesPanel
                      travelTimes={data?.travelTimes ?? []}
                      expressways={data?.expressways ?? []}
                      hideLegend
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {!hasHardError && activeTab === "alerts" && (
            <>
              <div className="flex items-center justify-between mb-2 px-0.5">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                  ⚠️ Traffic Alerts
                </p>
                {incidentCount > 0 && (
                  <span className="rounded-full bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-[10px] text-red-400 font-black">
                    {incidentCount} active
                  </span>
                )}
              </div>
              {loading && !data ? (
                <SkeletonBlock rows={2} />
              ) : (
                <IncidentsPanel
                  incidents={data?.incidents ?? []}
                  lastUpdated={lastUpdated}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/8 px-4 py-2 flex items-center justify-between text-[10px] text-zinc-500 bg-black/30 backdrop-blur-md shrink-0">
        <span className="flex items-center gap-1.5 font-medium">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${isStale ? "bg-amber-500" : "bg-emerald-500"} ${!isStale ? "animate-pulse" : ""}`}
          />
          LTA DataMall · Traffic feed
        </span>
        <span className="tabular-nums font-medium">
          {lastUpdated
            ? lastUpdated.toLocaleTimeString("en-SG", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
                timeZone: "Asia/Singapore",
              })
            : "—"}
        </span>
      </footer>
    </div>
  );
}
