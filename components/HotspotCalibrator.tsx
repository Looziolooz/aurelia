"use client";

/**
 * Visual calibration tool for hotspot positions (R3F-aware).
 *
 * URL flag: ?calibrate=1
 *
 * Two modes:
 *   - NUDGE: select a hotspot, push +/-X/Y/Z in 5 mm steps. Updates DOM-side
 *     so the marker moves live (R3F re-renders the position on each frame).
 *   - PLACE BY CLICK: arm targeting → click anywhere on the rendered model
 *     → we read the latest click event surface position from a global the
 *     R3F canvas publishes to, snap the active hotspot to it.
 *
 * "Copy JSON" exports the full hotspots array ready to paste into
 * data/hotspots.json. Component renders nothing if ?calibrate=1 is absent.
 *
 * Persistence: the calibrator stores its working copy in window state so
 * the R3F <Scene> picks up live position changes via the
 * useCalibratorOverrides hook. When the calibrator is not mounted, no
 * overrides exist and the JSON file's positions are used directly.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import hotspotsData from "@/data/hotspots.json";

type HotspotRow = {
  id: string;
  anchor_node: string;
  fallback_position: string;
  fallback_normal: string;
  icon: string;
  i18nKey: string;
  order: number;
};

// Shared global between calibrator and the R3F scene: the scene reads from
// window.__aureliaHotspotOverrides every frame. The calibrator writes to it
// on nudge or click-to-place. Map<id, {position, normal}>.
type Override = { position: string; normal: string };

declare global {
  interface Window {
    __aureliaHotspotOverrides?: Record<string, Override>;
    __aureliaPickedSurface?: {
      x: number;
      y: number;
      z: number;
      nx: number;
      ny: number;
      nz: number;
      timestamp: number;
    } | null;
    __aureliaPlaceMode?: boolean;
  }
}

const STEP_M = 0.005;

function parseVec(s: string): [number, number, number] {
  const [x, y, z] = s.split(/\s+/).map(Number);
  return [x, y, z];
}

function formatVec(v: [number, number, number]): string {
  return `${v[0].toFixed(3)} ${v[1].toFixed(3)} ${v[2].toFixed(3)}`;
}

function broadcastOverrides(rows: HotspotRow[]) {
  if (typeof window === "undefined") return;
  const map: Record<string, Override> = {};
  for (const r of rows) {
    map[r.id] = { position: r.fallback_position, normal: r.fallback_normal };
  }
  window.__aureliaHotspotOverrides = map;
  // Dispatch a synthetic event so the R3F scene can re-render with the
  // new positions immediately, not on the next frame tick.
  window.dispatchEvent(new CustomEvent("aurelia:hotspot-override"));
}

export function HotspotCalibrator() {
  const [enabled, setEnabled] = useState(false);
  const initial = useMemo(
    () => (hotspotsData.hotspots as HotspotRow[]).map((h) => ({ ...h })),
    [],
  );
  const [rows, setRows] = useState<HotspotRow[]>(initial);
  const [activeId, setActiveId] = useState<string>(initial[0]?.id ?? "");
  const [placeMode, setPlaceMode] = useState(false);
  const activeRef = useRef(activeId);
  activeRef.current = activeId;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setEnabled(params.get("calibrate") === "1");
  }, []);

  // Publish current rows to the R3F scene whenever they change.
  useEffect(() => {
    if (!enabled) return;
    broadcastOverrides(rows);
  }, [enabled, rows]);

  // Sync place-mode flag with the scene so it knows to publish raycast hits.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__aureliaPlaceMode = placeMode;
  }, [placeMode]);

  // Poll for raycast hits published by the R3F scene's onClick handler.
  // We don't pass callbacks through window globals; the scene just sets
  // __aureliaPickedSurface with the latest hit and we read it here.
  useEffect(() => {
    if (!enabled || !placeMode) return;
    const onPick = () => {
      const hit = window.__aureliaPickedSurface;
      if (!hit) return;
      const age = Date.now() - hit.timestamp;
      if (age > 250) return; // stale
      const id = activeRef.current;
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                fallback_position: formatVec([hit.x, hit.y, hit.z]),
                fallback_normal: formatVec([hit.nx, hit.ny, hit.nz]),
              }
            : r,
        ),
      );
      window.__aureliaPickedSurface = null;
      setPlaceMode(false);
    };
    window.addEventListener("aurelia:surface-picked", onPick);
    return () => window.removeEventListener("aurelia:surface-picked", onPick);
  }, [enabled, placeMode]);

  if (!enabled) return null;

  const active = rows.find((r) => r.id === activeId);

  const nudge = (axis: 0 | 1 | 2, dir: 1 | -1) => {
    if (!active) return;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== active.id) return r;
        const p = parseVec(r.fallback_position);
        p[axis] += dir * STEP_M;
        return { ...r, fallback_position: formatVec(p) };
      }),
    );
  };

  const copyJson = async () => {
    const out = {
      _comment: hotspotsData._comment,
      hotspots: rows,
    };
    const text = JSON.stringify(out, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      // eslint-disable-next-line no-alert
      window.alert("hotspots.json copied to clipboard - paste it into data/hotspots.json");
    } catch {
      // eslint-disable-next-line no-alert
      window.prompt("Copy this JSON into data/hotspots.json:", text);
    }
  };

  return (
    <>
      {placeMode && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 top-2 z-[60] mx-auto w-fit rounded-full border border-copper-500/60 bg-black/85 px-4 py-1.5 font-mono text-[12px] uppercase tracking-widest text-copper-300 shadow-xl"
        >
          Targeting {activeId} - click on the feature
        </div>
      )}

      <div
        role="dialog"
        aria-label="Hotspot calibrator"
        className="pointer-events-auto fixed right-4 top-4 z-50 w-72 rounded-lg border border-copper-500/30 bg-black/85 p-4 font-mono text-[12px] text-cream-100 shadow-xl backdrop-blur"
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold uppercase tracking-widest text-copper-300">
            Calibrate
          </span>
          <button
            type="button"
            onClick={copyJson}
            className="rounded border border-copper-500/50 px-2 py-0.5 text-[11px] hover:bg-copper-500/20"
          >
            Copy JSON
          </button>
        </div>

        <label className="mb-2 block">
          <span className="block text-cream-400">Hotspot</span>
          <select
            value={activeId}
            onChange={(e) => setActiveId(e.target.value)}
            className="mt-1 w-full rounded border border-copper-500/30 bg-black/60 px-2 py-1 text-cream-100"
          >
            {rows.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} ({r.anchor_node})
              </option>
            ))}
          </select>
        </label>

        {active && (
          <>
            <div className="mb-2 text-cream-300">
              pos: {active.fallback_position}
              <br />
              normal: {active.fallback_normal}
            </div>

            <button
              type="button"
              onClick={() => setPlaceMode((v) => !v)}
              className={`mb-2 w-full rounded border px-2 py-1.5 text-[12px] font-semibold uppercase tracking-widest transition-colors ${
                placeMode
                  ? "border-copper-300 bg-copper-500/40 text-cream-100"
                  : "border-copper-500/60 bg-copper-500/10 text-copper-300 hover:bg-copper-500/20"
              }`}
            >
              {placeMode ? "Cancel targeting" : "Place by click"}
            </button>

            <div className="grid grid-cols-3 gap-1">
              {(["X", "Y", "Z"] as const).map((label, i) => (
                <div key={label} className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => nudge(i as 0 | 1 | 2, 1)}
                    className="w-full rounded border border-copper-500/40 px-1 py-0.5 hover:bg-copper-500/20"
                  >
                    +{label}
                  </button>
                  <span className="my-0.5 text-cream-400">{label}</span>
                  <button
                    type="button"
                    onClick={() => nudge(i as 0 | 1 | 2, -1)}
                    className="w-full rounded border border-copper-500/40 px-1 py-0.5 hover:bg-copper-500/20"
                  >
                    -{label}
                  </button>
                </div>
              ))}
            </div>

            <p className="mt-2 text-[10px] text-cream-400">
              Place = click on the rendered model. Nudge step: 5 mm.
            </p>
          </>
        )}
      </div>
    </>
  );
}
