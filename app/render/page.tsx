"use client";

/**
 * AURELIA Pro X1 — OFFLINE hero-render route (NOT shipped to users).
 *
 * Purpose: a dedicated, deterministic still-capture page for a headless
 * Playwright script. Unlike the live ProductViewer (shadows OFF for the
 * weak kiosk iGPU budget), this route turns REAL PCF cast shadows ON with
 * a fixed world-space key light + a ground plane, so the shadow is
 * physically coherent with the model form and light direction across all
 * four canonical views. No entrance animation, no auto-rotate, no idle
 * bob — a frozen, pixel-exact frame at an explicit w×h.
 *
 * URL contract (the capture script depends on this EXACTLY):
 *   /render?view=<front|3q_right|3q_left|3q_left_close>&w=<int>&h=<int>&sm=<int>
 *   defaults: view=front, w=1600, h=2133, sm=2048
 *
 * Ready signalling (capture script polls these on `window`):
 *   window.__heroReady  — boolean, flips true ~4 rAF ticks after the model
 *                         reports ready (textures + shadow map settled).
 *   window.__heroError  — string, set on WebGL context-creation/loss
 *                         failure or on a 25s overall safety timeout.
 *   Exactly one of the two is guaranteed to be set within ~25s.
 *
 * This page lives OUTSIDE app/[locale]; it inherits the root layout's
 * <html>/<body> only. It is robots-noindex via the root metadata and is
 * never linked from the product UI.
 */

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import dynamic from "next/dynamic";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";
import {
  applyVariant,
  buildEspressoMachine,
} from "@/lib/espressoMachine";

// Capture-script handshake globals. Declared the same way ProductViewer
// declares its window globals so tsc stays strict-clean.
declare global {
  interface Window {
    __heroReady?: boolean;
    __heroError?: string;
  }
}

// SSR-safe client-only reads via useSyncExternalStore — identical pattern
// to ProductViewer.useMounted(): the store returns the server snapshot
// during SSR, then the client snapshot after hydration. No setState in an
// effect (react-hooks/set-state-in-effect).
const subscribeNoop = () => () => {};
function useMounted(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

// Read the query string the same SSR-safe way: "" on the server, the real
// search on the client. Reading it through useSyncExternalStore (instead
// of useState+useEffect) keeps render pure and avoids both the
// set-state-in-effect lint and the Next 16 useSearchParams Suspense
// bailout. getServerSnapshot returns "" so server/client markup agree.
function useLocationSearch(): string {
  return useSyncExternalStore(
    subscribeNoop,
    () => window.location.search,
    () => "",
  );
}

// Minimal runtime patch, replicated from ProductViewer's initRuntimePatches.
// (Postprocessing was removed from this route — it pushed the weak GPU into
// webglcontextlost before ready — so the EffectComposer.addPass-defer guard
// is no longer needed here.)
//
// DEV-only: React 19's dev error/component-stack builder calls
// JSON.stringify on fiber props that hold cyclic Three.js scene objects →
// "Converting circular structure to JSON" crash that takes down the Canvas
// on first paint. The toJSON overrides + a circular-safe JSON.stringify
// wrapper neutralise it. Never ships to prod (gated on NODE_ENV).
//
// Idempotent via a window sentinel so HMR re-imports don't double-wrap.
(function initRenderRuntimePatches() {
  if (typeof window === "undefined") return;
  const w = window as unknown as Record<string, unknown>;
  if (w.__aureliaPatched) return;
  w.__aureliaPatched = true;
  if (typeof THREE === "undefined") return;

  if (process.env.NODE_ENV === "production") return;

  type Patchable = { __aureliaToJSON?: boolean; toJSON?: () => unknown };
  const o3d = THREE.Object3D.prototype as unknown as Patchable & {
    type: string;
    uuid: string;
    name: string;
  };
  if (!o3d.__aureliaToJSON) {
    o3d.toJSON = function (this: THREE.Object3D) {
      return {
        metadata: { version: 4.6, type: "Object", generator: "aurelia" },
        object: { type: this.type, uuid: this.uuid, name: this.name },
      };
    };
    o3d.__aureliaToJSON = true;
  }
  const texP = THREE.Texture.prototype as unknown as Patchable;
  if (!texP.__aureliaToJSON) {
    texP.toJSON = function (this: THREE.Texture) {
      return { type: "Texture", uuid: this.uuid, name: this.name };
    };
    texP.__aureliaToJSON = true;
  }
  const matP = THREE.Material.prototype as unknown as Patchable;
  if (!matP.__aureliaToJSON) {
    matP.toJSON = function (this: THREE.Material) {
      return {
        metadata: { version: 4.6, type: "Material", generator: "aurelia" },
        object: { type: this.type, uuid: this.uuid, name: this.name },
      };
    };
    matP.__aureliaToJSON = true;
  }

  const _origStringify = JSON.stringify.bind(JSON);
  JSON.stringify = function (
    value: unknown,
    replacer?: unknown,
    space?: string | number,
  ) {
    const seen = new WeakSet<object>();
    const safeReplacer = function (this: unknown, key: string, val: unknown) {
      if (typeof val === "object" && val !== null) {
        if (seen.has(val as object)) return "[Circular]";
        seen.add(val as object);
      }
      return typeof replacer === "function"
        ? (replacer as (k: string, v: unknown) => unknown).call(this, key, val)
        : val;
    };
    try {
      return _origStringify(value, safeReplacer, space as never);
    } catch {
      return "{}";
    }
  } as typeof JSON.stringify;
})();

// ── Camera math (mirrors ProductViewer.sphericalToCartesian) ─────────────
const DEG = Math.PI / 180;
function sphericalToCartesian(
  az: number,
  pol: number,
  r: number,
): [number, number, number] {
  const x = r * Math.sin(pol) * Math.sin(az);
  const y = r * Math.cos(pol);
  const z = r * Math.sin(pol) * Math.cos(az);
  return [x, y, z];
}

// Same framing target as the live viewer.
const CAMERA_TARGET: [number, number, number] = [0, 2.0, 0];

type ViewId = "front" | "3q_right" | "3q_left" | "3q_left_close";

// Per-view spherical angles (az, pol, r in degrees/units). Tuned for the
// ~3.75-unit-tall model: full machine in frame with slight headroom,
// ~60-70% vertical fill. Offsets are added to CAMERA_TARGET.
const VIEW_ANGLES: Record<
  ViewId,
  { az: number; pol: number; r: number }
> = {
  front: { az: 0, pol: 80, r: 9.8 },
  "3q_right": { az: 52, pol: 76, r: 9.6 },
  "3q_left": { az: -52, pol: 76, r: 9.6 },
  "3q_left_close": { az: -40, pol: 84, r: 7.4 },
};

function cameraPositionFor(view: ViewId): [number, number, number] {
  const a = VIEW_ANGLES[view];
  const [x, y, z] = sphericalToCartesian(a.az * DEG, a.pol * DEG, a.r);
  return [
    x + CAMERA_TARGET[0],
    y + CAMERA_TARGET[1],
    z + CAMERA_TARGET[2],
  ];
}

// Studio softbox HDR — same 1k file the live viewer uses (reflection
// profile parity with the shipped product).
const ENV_HDR = "/hdr/studio_small_03_1k.hdr";

// Visible backdrop = same CSS gradient as ProductViewer's wrapper, so the
// captured still reads on-brand (near-black "lusso quieto"). The Canvas is
// alpha:false (opaque), so we clear it to the same base tone and let the
// gradient sit behind it for the soft radial pool.
const BACKDROP =
  "radial-gradient(ellipse 65% 55% at 50% 46%, rgba(46,45,50,0.35) 0%, rgba(12,11,14,0) 60%), rgb(12,11,14)";
const BASE_BG = "#0c0b0e";

interface RenderParams {
  view: ViewId;
  w: number;
  h: number;
  sm: number;
  // Debug budget gates (default ON). `&env=0` drops the PMREM studio
  // environment, `&cs=0` drops the baked ContactShadows — used to bisect
  // which pass tips the weak GPU into webglcontextlost.
  env: boolean;
  cs: boolean;
}

function parseParams(search: string): RenderParams {
  const q = new URLSearchParams(search);
  const rawView = q.get("view");
  const view: ViewId =
    rawView === "3q_right" ||
    rawView === "3q_left" ||
    rawView === "3q_left_close"
      ? rawView
      : "front";

  const toInt = (v: string | null, dflt: number): number => {
    const n = v === null ? NaN : Number.parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : dflt;
  };

  const toBool = (v: string | null, dflt: boolean): boolean =>
    v === null ? dflt : v !== "0" && v !== "false";

  return {
    view,
    w: toInt(q.get("w"), 1600),
    h: toInt(q.get("h"), 2133),
    sm: toInt(q.get("sm"), 2048),
    env: toBool(q.get("env"), true),
    cs: toBool(q.get("cs"), true),
  };
}

// ── The model, static (no animation) ─────────────────────────────────────
function HeroModel({ onReady }: { onReady: () => void }) {
  const built = useMemo(() => {
    // buildEspressoMachine() synthesises ~20 canvas textures (browser
    // only) — safe here because the whole Canvas is ssr:false dynamic.
    // Apply the locked hero colour "nero" SYNCHRONOUSLY before first
    // paint (never a frame of raw anthracite). DEFAULT_COLOR is "nero".
    const group = buildEspressoMachine();
    applyVariant(group, "nero");
    return group;
  }, []);

  // Push texture anisotropy to the GPU max for crisp oblique reads, and
  // force cast+receive shadow on every mesh (the whole point of this
  // route). Same defensive traversal pattern as ProductViewer.
  const { gl } = useThree();
  const maxAniso = useMemo(
    () => gl.capabilities.getMaxAnisotropy?.() ?? 1,
    [gl],
  );

  useEffect(() => {
    built.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const fixMat = (m: THREE.MeshStandardMaterial) => {
        const texKeys = [
          "map",
          "normalMap",
          "roughnessMap",
          "metalnessMap",
          "aoMap",
          "emissiveMap",
        ] as const;
        for (const key of texKeys) {
          const tex = (
            m as unknown as Record<string, THREE.Texture | null>
          )[key];
          if (tex && tex.isTexture) {
            tex.anisotropy = maxAniso;
            tex.needsUpdate = true;
          }
        }
        m.needsUpdate = true;
      };
      const mat = mesh.material as
        | THREE.MeshStandardMaterial
        | THREE.MeshStandardMaterial[];
      if (Array.isArray(mat)) mat.forEach(fixMat);
      else if (mat) fixMat(mat);
    });
    // Signal the parent: the model is built, textured and shadow-flagged.
    // The parent then waits a few frames before flipping __heroReady so
    // the shadow map + PMREM env are fully settled.
    const timer = setTimeout(() => onReady(), 120);
    return () => clearTimeout(timer);
  }, [built, onReady, maxAniso]);

  // Static mount — NO entrance tween, NO bob, NO auto-rotate. A still.
  return <primitive object={built} />;
}

// ── Studio rig with a REAL cast-shadow key light ─────────────────────────
// Adapted from ProductViewer.Lights() but the KEY directional light casts
// a real shadow and is FIXED in world space (NOT parented to the camera),
// so the cast shadow stays physically consistent across all four views.
function HeroLights({ sm }: { sm: number }) {
  const keyRef = useRef<THREE.DirectionalLight>(null);
  const keyTarget = useMemo(() => {
    const t = new THREE.Object3D();
    t.position.set(0, 1.6, 0);
    return t;
  }, []);

  useEffect(() => {
    const light = keyRef.current;
    if (!light) return;
    light.target = keyTarget;
    light.target.updateMatrixWorld();
  }, [keyTarget]);

  return (
    <>
      {/* The key light's target object must be in the scene graph for
       *  three to track it. */}
      <primitive object={keyTarget} />

      {/* KEY — soft near-neutral from front-upper-right, world-fixed.
       *  Casts the real PCF shadow. Tight orthographic shadow frustum
       *  framed to the model bbox (~2.05 × 2.85 footprint, ~3.75 tall)
       *  so the shadow texels are dense and the cast edge is crisp. */}
      <directionalLight
        ref={keyRef}
        position={[6, 9, 5]}
        intensity={0.78}
        color="#fdf6ec"
        castShadow
        shadow-mapSize={[sm, sm]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
        shadow-camera-near={0.1}
        shadow-camera-far={30}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
      />

      {/* FILL — front-left, faintly cool, shadowless. Keeps the shadow
       *  side neutral without a second shadow caster. */}
      <directionalLight
        position={[-6.5, 2.6, 4]}
        intensity={0.42}
        color="#dde4ee"
        castShadow={false}
      />

      {/* RIM / kicker — behind-above, opposite the key, shadowless.
       *  Separates the wand / bezel / cup-warmer top from the backdrop. */}
      <directionalLight
        position={[-3.5, 6.5, -6]}
        intensity={0.3}
        color="#eef3fb"
        castShadow={false}
      />

      {/* COPPER ACCENT — desaturated, dim, low, shadowless. A touch of
       *  local bronze warmth on the bezel/collar (matches the live
       *  viewer's restrained copper point — not a glowing orange). */}
      <pointLight
        position={[2.4, 2.5, 3]}
        intensity={0.65}
        distance={8}
        decay={2}
        color="#d9bd9c"
      />

      {/* Ambient bounce: neutral light-grey floor + soft neutral sky, so
       *  the underside of the portafilter / group head lifts off pure
       *  black for material read. */}
      <hemisphereLight args={["#eef0f2", "#8f8d8c"]} intensity={0.5} />
    </>
  );
}

function HeroScene({
  sm,
  env,
  cs,
  onModelReady,
}: {
  sm: number;
  env: boolean;
  cs: boolean;
  onModelReady: () => void;
}) {
  return (
    <>
      {/* Reflection-only studio env (no visible background — the visible
       *  backdrop is the CSS gradient behind the opaque canvas). Same
       *  blurred low-res profile as the shipped viewer for parity.
       *  Gated (&env=0) — PMREM is a notable GPU allocation; bisecting. */}
      {env && (
        <Environment
          files={ENV_HDR}
          environmentIntensity={0.4}
          blur={0.72}
          resolution={64}
        />
      )}

      <HeroLights sm={sm} />

      <Suspense fallback={null}>
        <HeroModel onReady={onModelReady} />
      </Suspense>

      {/* Real ground/floor at Y=0. Dark void tone (~#0c0b0e) matching the
       *  backdrop so there is no horizon line; the cast shadow lands here.
       *  Plain MeshStandardMaterial (no reflector FBO — this is an offline
       *  still, the budget concern doesn't apply, and a matte floor reads
       *  the cast shadow most cleanly). */}
      <mesh
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial
          color={BASE_BG}
          roughness={0.95}
          metalness={0}
        />
      </mesh>

      {/* Subtle contact shadow UNDER the real cast shadow, just for
       *  grounding the footprint so the machine doesn't read as floating
       *  at grazing angles. Baked once (frames={1}) — the model is
       *  static. Gated (&cs=0) for GPU bisection. */}
      {cs && (
        <ContactShadows
          position={[0, 0.012, 0]}
          opacity={0.55}
          scale={9}
          blur={2.6}
          far={5}
          frames={1}
          resolution={512}
          color="#050302"
        />
      )}
    </>
  );
}

// Waits N requestAnimationFrame ticks after the model reports ready, then
// flips window.__heroReady. The extra frames let the PCF shadow map and
// the PMREM env settle so the captured still is fully resolved.
function ReadyGate({ armed }: { armed: boolean }) {
  useEffect(() => {
    if (!armed) return;
    if (typeof window === "undefined") return;
    let raf = 0;
    let n = 0;
    const tick = () => {
      n += 1;
      if (n >= 4) {
        window.__heroReady = true;
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [armed]);
  return null;
}

function HeroCanvas() {
  const mounted = useMounted();
  const search = useLocationSearch();
  const [modelReady, setModelReady] = useState(false);

  // Derive params purely from the SSR-safe search string. On the server /
  // first paint search is "" → defaults; once mounted it's the real query.
  // We only commit to rendering the Canvas after `mounted` so we never
  // build the browser-only espresso textures during SSR.
  const params = useMemo<RenderParams | null>(
    () => (mounted ? parseParams(search) : null),
    [mounted, search],
  );

  // Overall safety net: if the model never reports ready within 25s,
  // declare an error so the capture script never hangs forever.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = window.setTimeout(() => {
      if (!window.__heroReady && !window.__heroError) {
        window.__heroError = "timeout: model did not become ready in 25s";
      }
    }, 25000);
    return () => window.clearTimeout(t);
  }, []);

  if (!mounted || !params) {
    // Server + first client paint: nothing but the backdrop. The capture
    // script waits on window.__heroReady, never on this transient state.
    return null;
  }

  const { view, w, h, sm, env, cs } = params;
  const camPos = cameraPositionFor(view);

  return (
    <div
      style={{
        width: `${w}px`,
        height: `${h}px`,
        position: "relative",
        overflow: "hidden",
        background: BACKDROP,
        backgroundColor: BASE_BG,
      }}
    >
      <Canvas
        // Size is driven EXACTLY by the w/h container; dpr=1 so the
        // drawing buffer is exactly w×h device pixels (pixel-exact
        // screenshot, no devicePixelRatio multiplication).
        dpr={1}
        shadows="soft"
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "default",
          preserveDrawingBuffer: true,
          toneMapping: THREE.AgXToneMapping,
          toneMappingExposure: 1.0,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        camera={{
          position: camPos,
          fov: 32,
          near: 0.1,
          far: 200,
        }}
        onCreated={({ gl, camera }) => {
          // Make absolutely sure the camera looks at the framing target
          // (Canvas only sets position; orientation is identity until we
          // aim it — there are no OrbitControls on this route).
          camera.lookAt(
            CAMERA_TARGET[0],
            CAMERA_TARGET[1],
            CAMERA_TARGET[2],
          );
          camera.updateProjectionMatrix();

          const canvas = gl.domElement;
          canvas.addEventListener(
            "webglcontextlost",
            (e) => {
              e.preventDefault();
              if (typeof window !== "undefined" && !window.__heroReady) {
                window.__heroError =
                  "webgl: context lost before ready";
              }
            },
            false,
          );
        }}
        onError={() => {
          if (typeof window !== "undefined" && !window.__heroReady) {
            window.__heroError =
              "webgl: canvas onError (context creation failed)";
          }
        }}
      >
        <HeroScene
          sm={sm}
          env={env}
          cs={cs}
          onModelReady={() => setModelReady(true)}
        />

        {/* No postprocessing: EffectComposer's full-screen FBOs + addPass
         *  pushed the weak GPU into webglcontextlost before ready. Canvas
         *  antialias:true (MSAA) carries edge AA for a still; the CSS
         *  backdrop already darkens the frame edges (no Vignette pass). */}
      </Canvas>

      <ReadyGate armed={modelReady} />
    </div>
  );
}

// Disable SSR for the whole route — R3F + drei + postprocessing +
// buildEspressoMachine()'s canvas textures all touch browser-only APIs.
// Same dynamic(ssr:false) pattern as ProductViewer; the loading state is
// just the on-brand backdrop (the capture script gates on __heroReady).
const HeroCanvasClient = dynamic(() => Promise.resolve(HeroCanvas), {
  ssr: false,
  loading: () => (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: BACKDROP,
        backgroundColor: BASE_BG,
      }}
    />
  ),
});

export default function RenderPage() {
  return (
    <main
      style={{
        margin: 0,
        padding: 0,
        overflow: "hidden",
        width: "100vw",
        height: "100vh",
        background: BASE_BG,
        display: "block",
      }}
    >
      <HeroCanvasClient />
    </main>
  );
}
