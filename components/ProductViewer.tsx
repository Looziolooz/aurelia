"use client";

/**
 * AURELIA Pro X1 — Product viewer (React Three Fiber).
 *
 * Why R3F instead of @google/model-viewer:
 *   - Real anti-aliasing (SMAA shader + 8x MSAA), not the 4x default.
 *   - Real back-face culling on hotspots via <Html occlude>, not CSS guesses.
 *   - Real 360deg HDR environment with configurable blur on the skybox.
 *   - Real post-FX: bloom on chrome highlights, vignette, no Lit warnings.
 *   - Custom pixel ratio without monkey-patching window.devicePixelRatio.
 *
 * External API is unchanged: <ProductViewer /> with no props. The component
 * still reads hotspots from data/hotspots.json, still binds to useTotemStore
 * for phase transitions, still emits the same translated alt text.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  MeshReflectorMaterial,
  OrbitControls,
} from "@react-three/drei";
import {
  Bloom,
  BrightnessContrast,
  EffectComposer,
  SMAA,
  Vignette,
} from "@react-three/postprocessing";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { EffectComposer as EffectComposerImpl } from "postprocessing";
import { useTotemStore } from "@/lib/store";
import {
  applyEmergencyDegrade,
  applyVariant,
  buildEspressoMachine,
} from "@/lib/espressoMachine";
import hotspotsData from "@/data/hotspots.json";

// Runtime patches. Idempotent via a window-level sentinel so HMR
// re-imports don't double-wrap.
//
// 1) `EffectComposer.addPass` deferral (PROD + DEV): postprocessing reads
//    `gl.getContext().getContextAttributes()` synchronously in addPass.
//    Under React 19 StrictMode + Turbopack the WebGL context can be
//    transiently lost between the double-mount → attributes null → crash.
//    Defer to the next frame. Also fires in prod on GPU reset / backgrounded
//    tabs (same null-attrs window).
//
// 2) `console.warn` filter (DEV-only, cosmetic): HLSL precision noise +
//    THREE.Clock deprecation banner from upstream code we don't own.
//
// 3) `JSON.stringify` circular-safe wrapper + Three.js `toJSON` overrides
//    (DEV-only, NECESSARY — not dead weight). React 19's dev-mode error /
//    component-stack builder inside @react-three/fiber calls
//    `JSON.stringify` on component props. Those props hold Three.js scene
//    objects whose `parent`/`children` form a cycle → "Converting circular
//    structure to JSON" crash that takes down the whole Canvas. The
//    `toJSON` overrides additionally silence the "THREE.Texture: Unable to
//    serialize Texture" flood from the same walker. Confirmed still
//    required on next 16.2.4 + React 19.2.4 + @react-three/fiber 9.6.1 +
//    Turbopack dev — removing it reproduces the crash on first paint.
//    Gated on NODE_ENV !== production: React doesn't do this walk in prod
//    builds, so the global JSON.stringify replacement never ships.
(function initRuntimePatches() {
  if (typeof window === "undefined") return;
  const w = window as unknown as Record<string, unknown>;
  if (w.__aureliaPatched) return;
  w.__aureliaPatched = true;
  if (typeof THREE === "undefined") return;

  // (1) Production-safe: defer addPass when WebGL context is lost.
  const __origAddPass = EffectComposerImpl.prototype.addPass;
  EffectComposerImpl.prototype.addPass = function (pass, index) {
    const renderer = (this as unknown as { renderer?: { getContext?: () => WebGL2RenderingContext | null } }).renderer;
    if (renderer) {
      const ctx = renderer.getContext?.();
      if (!ctx || !ctx.getContextAttributes?.()) {
        requestAnimationFrame(() => {
          try { __origAddPass.call(this, pass, index); } catch {}
        });
        return;
      }
    }
    return __origAddPass.call(this, pass, index);
  };

  // (2) + (3) are dev-only. Production React never JSON.stringifies the
  // fiber tree, and the prod console has no HLSL flood.
  if (process.env.NODE_ENV === "production") return;

  // (2) console.warn filter — cosmetic.
  const _origWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === "string") {
      const s = args[0];
      if (s.includes("THREE.Clock: This module has been deprecated")) return;
      if (
        s.includes("THREE.WebGLProgram: Program Info Log") &&
        (s.includes("warning X4122") || s.includes("warning X3595"))
      )
        return;
    }
    _origWarn(...(args as Parameters<typeof console.warn>));
  };

  // (3a) Three.js prototype toJSON overrides — stop the
  // "Unable to serialize Texture" flood and give the dev stack walker a
  // shallow, acyclic shape for Object3D/Material/Texture.
  type Patchable = { __aureliaToJSON?: boolean; toJSON?: () => unknown };
  const o3d = THREE.Object3D.prototype as unknown as Patchable & {
    type: string; uuid: string; name: string;
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

  // (3b) Circular-safe JSON.stringify. The toJSON overrides cover Three.js
  // instances, but R3F reconciler nodes are plain objects with their own
  // parent/children cycle and no toJSON — a WeakSet replacer breaks those.
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

interface HotspotConfig {
  id: string;
  anchor_node: string;
  fallback_position: string;
  fallback_normal: string;
  camera_target?: string;
  camera_position?: string;
  icon: string;
  i18nKey: string;
  order: number;
}

const HOTSPOTS = hotspotsData.hotspots as HotspotConfig[];

// Studio softbox HDR — neutral, controlled reflection profile so the
// brushed anthracite + copper accents read as a finished spec.
// 1k (not 2k): the 2k file decoded to a float env texture + PMREM is a
// large GPU allocation that, stacked on the reflector/shadow/post FBOs,
// pushed a weak kiosk iGPU into WebGL context loss. 1k is visually
// identical for a blurred reflection-only environment.
const ENV_HDR = "/hdr/studio_small_03_1k.hdr";

// Camera defaults — spherical coords → Cartesian. The procedural machine is
// ~4.14 native units tall with its base at Y=0, so we frame around its
// vertical mid-point (~Y=2.0) from ~9.5 units back.
const DEG = Math.PI / 180;
function sphericalToCartesian(az: number, pol: number, r: number): [number, number, number] {
  const x = r * Math.sin(pol) * Math.sin(az);
  const y = r * Math.cos(pol);
  const z = r * Math.sin(pol) * Math.cos(az);
  return [x, y, z];
}
const CAMERA_TARGET: [number, number, number] = [0, 2.0, 0];
const CAMERA_POSITION: [number, number, number] = (() => {
  // Azimuth +54° (front-right three-quarter), polar 75°, distance 9.5.
  const [x, y, z] = sphericalToCartesian(54 * DEG, 75 * DEG, 9.5);
  return [x + CAMERA_TARGET[0], y + CAMERA_TARGET[1], z + CAMERA_TARGET[2]];
})();

function parseVec3(s: string): [number, number, number] {
  const [x, y, z] = s.split(/\s+/).map(Number);
  return [x, y, z];
}

function ProductModel({ onReady }: { onReady?: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const cloned = useMemo(() => {
    // buildEspressoMachine() already returns a group centred on X/Z with
    // its base at Y=0 in native units (~4.14 tall). No auto-fit needed —
    // the camera + hotspots are configured for this scale.
    const group = buildEspressoMachine();
    // Sync with the project's initial part: apply the selected glossy
    // colour synchronously, BEFORE first paint, so the attractor already
    // shows the Smeg machine in colour — never a frame of the raw
    // anthracite body.
    applyVariant(group, useTotemStore.getState().colorVariant);
    return group;
  }, []);

  // Entrance animation + idle breathing
  useEffect(() => {
    if (!groupRef.current) return;
    const group = groupRef.current;

    // Initial state for entrance. Native units (~4 tall model), so the
    // bob amplitude is scaled up from the old 0.32-m values.
    group.scale.set(0.92, 0.92, 0.92);
    group.position.y = -0.6;

    gsap.to(group.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 1.2,
      ease: "elastic.out(1, 0.5)",
      delay: 0.2,
    });

    gsap.to(group.position, {
      y: 0,
      duration: 1.2,
      ease: "power3.out",
      delay: 0.2,
    });

    // Idle breathing — gentle vertical bob.
    gsap.to(group.position, {
      y: 0.18,
      duration: 3.5,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      delay: 1.4,
    });
  }, []);

  // The procedural builder already sets per-material metalness / roughness
  // / envMapIntensity (copper ≠ chrome ≠ body). Don't flatten those here —
  // only push texture anisotropy to the GPU max so the canvas textures
  // stay crisp at oblique angles. Shadow flags are set in the builder too
  // but re-assert defensively.
  const { gl } = useThree();
  const maxAniso = useMemo(
    () => gl.capabilities.getMaxAnisotropy?.() ?? 1,
    [gl],
  );
  useEffect(() => {
    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const fixMat = (m: THREE.MeshStandardMaterial) => {
        const texKeys = [
          "map", "normalMap", "roughnessMap", "metalnessMap",
          "aoMap", "emissiveMap",
        ] as const;
        for (const key of texKeys) {
          const tex = (m as unknown as Record<string, THREE.Texture | null>)[key];
          if (tex && tex.isTexture) {
            tex.anisotropy = maxAniso;
            tex.needsUpdate = true;
          }
        }
        m.needsUpdate = true;
      };
      const mat = mesh.material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[];
      if (Array.isArray(mat)) mat.forEach(fixMat);
      else if (mat) fixMat(mat);
    });
    const timer = setTimeout(() => onReady?.(), 150);
    return () => clearTimeout(timer);
  }, [cloned, onReady, maxAniso]);

  // Smeg colour (glossy enamel only). Recolours the shell in place — no
  // rebuild, no GPU allocation after the first call — so the Canvas is
  // never remounted (remount = re-synthesise ~20 canvas textures =
  // context-loss risk on the kiosk iGPU). The initial colour is already
  // applied synchronously in the build above; this only handles switches.
  const colorVariant = useTotemStore((s) => s.colorVariant);
  useEffect(() => {
    applyVariant(cloned, colorVariant);
  }, [cloned, colorVariant]);

  // Kiosk iGPU guardrail (non-negotiable — project memory: "WebGL GPU
  // budget ceiling, context loss = white screen"). No user-facing matte
  // exists; instead, on context loss we degrade the single shared glossy
  // body material in place (drop clearcoat, raise roughness) so the
  // restored context renders the lighter shader. One-way, allocation-free.
  useEffect(() => {
    const canvas = gl.domElement;
    const onLost = () => applyEmergencyDegrade();
    canvas.addEventListener("webglcontextlost", onLost);
    return () => canvas.removeEventListener("webglcontextlost", onLost);
  }, [gl]);

  // Two-level structure:
  //  - <group ref={groupRef}>  → the entrance/idle GSAP animation lives
  //    here. It animates scale 0.92→1.0 and a small Y bob. Because it's a
  //    SEPARATE wrapper, it never overwrites the auto-fit scale baked into
  //    `cloned` (the earlier single-node version had the entrance tween
  //    reset cloned.scale 0.22 → 1.0, making the model 5× too big).
  //  - <primitive object={cloned}> → carries the auto-fit scale + centering.
  return (
    <group ref={groupRef}>
      <primitive object={cloned} />
    </group>
  );
}

function CameraRig({ active, detail }: { active: boolean; detail: boolean }) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const rotationSpeed = useRef(0);
  const { camera } = useThree();
  const activeHotspotId = useTotemStore((s) => s.activeHotspotId);

  // Smooth auto-rotation with cinematographic easing. Pauses while a
  // hotspot is active (the fly-to needs a still camera to land on).
  useFrame(() => {
    const c = controlsRef.current;
    if (!c) return;

    if (active && !detail) {
      rotationSpeed.current = gsap.utils.interpolate(rotationSpeed.current, 0.6, 0.05);
      c.autoRotate = true;
      c.autoRotateSpeed = rotationSpeed.current;
    } else {
      rotationSpeed.current = gsap.utils.interpolate(rotationSpeed.current, 0, 0.1);
      c.autoRotate = rotationSpeed.current > 0.01;
    }
    c.update();
  });

  // Fly camera + orbit target whenever the active hotspot changes. On
  // close (activeHotspotId === null) return to the default framing.
  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;

    const hotspot = activeHotspotId
      ? HOTSPOTS.find((h) => h.id === activeHotspotId)
      : null;

    const targetVec = hotspot?.camera_target
      ? parseVec3(hotspot.camera_target)
      : CAMERA_TARGET;
    const positionVec = hotspot?.camera_position
      ? parseVec3(hotspot.camera_position)
      : CAMERA_POSITION;

    // Tween both the camera position and the controls' target. GSAP
    // handles object literal interpolation and we copy onUpdate.
    const camProxy = {
      px: camera.position.x,
      py: camera.position.y,
      pz: camera.position.z,
      tx: c.target.x,
      ty: c.target.y,
      tz: c.target.z,
    };

    const tween = gsap.to(camProxy, {
      px: positionVec[0],
      py: positionVec[1],
      pz: positionVec[2],
      tx: targetVec[0],
      ty: targetVec[1],
      tz: targetVec[2],
      duration: 1.1,
      ease: "power3.inOut",
      onUpdate: () => {
        camera.position.set(camProxy.px, camProxy.py, camProxy.pz);
        c.target.set(camProxy.tx, camProxy.ty, camProxy.tz);
        c.update();
      },
    });

    return () => {
      tween.kill();
    };
  }, [activeHotspotId, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      target={CAMERA_TARGET}
      minDistance={4}
      maxDistance={18}
      minPolarAngle={20 * DEG}
      maxPolarAngle={100 * DEG}
      enablePan={false}
      enableZoom
      enableDamping
      dampingFactor={0.1}
      autoRotateSpeed={0}
      makeDefault
    />
  );
}

// Studio three-point rig, sized to the real model: ~4.14 units tall, base
// at Y=0, visual centre ≈Y=2, top edge ≈Y=3.75, footprint 2.05×2.85. All
// lights are shadowless (Canvas shadows={false}; depth is carried by the
// baked ContactShadows + AgX tone mapping) so this stays inside the GPU
// budget — forward-shaded lights are nearly free vs the FBO passes we cut.
function Lights() {
  return (
    <>
      {/* Palette target = the Cycles hero render (sampled): body ≈
       *  rgb(54,47,43) dark-neutral, copper ≈ rgb(150,135,121) muted
       *  bronze. The live scene must read as the same neutral studio
       *  sweep, so the rig is near-neutral white — no warm cast. */}

      {/* KEY — soft near-neutral from front-upper-right. Models the form
       *  (two visible faces separate) without tinting the anthracite. */}
      <directionalLight
        position={[6, 7, 5.5]}
        intensity={1.2}
        color="#fdf6ec"
        castShadow={false}
      />
      {/* FILL — front-left, faintly cool. Mostly the bright floor sweep
       *  does the fill now; this just keeps the shadow side neutral. */}
      <directionalLight
        position={[-6.5, 2.6, 4]}
        intensity={0.45}
        color="#dde4ee"
        castShadow={false}
      />
      {/* RIM / kicker — behind-above, opposite the key. Neutral-cool
       *  silhouette edge: steam wand, gauge bezel, cup-warmer top. */}
      <directionalLight
        position={[-3.5, 6.5, -6]}
        intensity={0.85}
        color="#eef3fb"
        castShadow={false}
      />
      {/* COPPER ACCENT — desaturated, dim. The Cycles copper is a muted
       *  bronze, not a glowing orange; this just gives the bezel/collar a
       *  touch of local warmth so it doesn't read as grey plastic. */}
      <pointLight
        position={[2.4, 2.5, 3]}
        intensity={2.4}
        distance={8}
        decay={2}
        color="#d9bd9c"
      />
      {/* TOP HAIR LIGHT — overhead softbox above the machine (Y=8, was
       *  buried at Y=1.6). Near-white; lays the highlight band on the top
       *  edge — the overhead-strip trick from product photography. */}
      <spotLight
        position={[0, 8, 1]}
        angle={0.6}
        penumbra={0.95}
        intensity={40}
        distance={20}
        decay={2}
        color="#fdfbf6"
        castShadow={false}
      />
      {/* Ambient bounce: neutral. Bright light-grey "floor" + soft neutral
       *  sky, matching the Cycles studio sweep that lifts the underside of
       *  the portafilter and group head off pure black. */}
      <hemisphereLight args={["#eef0f2", "#8f8d8c", 0.5]} />
    </>
  );
}

function useCalibratorOverrides(): Record<string, { position: string; normal: string }> {
  const [overrides, setOverrides] = useState<Record<string, { position: string; normal: string }>>({});
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => {
      setOverrides({ ...(window.__aureliaHotspotOverrides ?? {}) });
    };
    sync();
    window.addEventListener("aurelia:hotspot-override", sync);
    return () => window.removeEventListener("aurelia:hotspot-override", sync);
  }, []);
  return overrides;
}

// When the calibrator is in "Place by click" mode, intercept the next click
// on the model and publish its world-space surface hit so the calibrator
// can snap the active hotspot to it. We attach to the parent <group> so the
// raycaster naturally hits whatever's under the cursor.
function ClickToPlaceCatcher({ children }: { children: React.ReactNode }) {
  return (
    <group
      onPointerDown={(e) => {
        if (typeof window === "undefined") return;
        if (!window.__aureliaPlaceMode) return;
        // e.point is the world-space hit position. e.face.normal is in
        // mesh-local space; transform it back to world.
        const normal = e.face
          ? e.face.normal.clone().transformDirection(e.object.matrixWorld).normalize()
          : new THREE.Vector3(0, 0, 1);
        e.stopPropagation();
        window.__aureliaPickedSurface = {
          x: e.point.x,
          y: e.point.y,
          z: e.point.z,
          nx: normal.x,
          ny: normal.y,
          nz: normal.z,
          timestamp: Date.now(),
        };
        window.dispatchEvent(new CustomEvent("aurelia:surface-picked"));
      }}
    >
      {children}
    </group>
  );
}

// Publishes the ACTIVE hotspot's 3D point as viewport pixel coords so the
// DOM-side HotspotPanel can draw a leader line from the card to the part.
// fallback_position is world-space (the calibrator click-to-place writes
// e.point world coords), so a straight camera projection is correct — no
// model matrix threading. Cost: one Vector3.project() per frame, only
// while a detail panel is open; writes a window global (no React state,
// no re-render, no GPU pass — within the kiosk budget).
declare global {
  interface Window {
    __aureliaHotspotScreen?: { x: number; y: number; on: boolean } | null;
  }
}

function HotspotScreenProjector() {
  const { camera, gl } = useThree();
  const activeHotspotId = useTotemStore((s) => s.activeHotspotId);
  const phase = useTotemStore((s) => s.phase);
  const v = useRef(new THREE.Vector3());

  useFrame(() => {
    if (typeof window === "undefined") return;
    if (phase !== "detail" || !activeHotspotId) {
      window.__aureliaHotspotScreen = null;
      return;
    }
    const hs = HOTSPOTS.find((h) => h.id === activeHotspotId);
    if (!hs) {
      window.__aureliaHotspotScreen = null;
      return;
    }
    const ov = window.__aureliaHotspotOverrides?.[activeHotspotId];
    const [px, py, pz] = parseVec3(ov?.position ?? hs.fallback_position);
    v.current.set(px, py, pz).project(camera);
    const rect = gl.domElement.getBoundingClientRect();
    const x = rect.left + (v.current.x * 0.5 + 0.5) * rect.width;
    const y = rect.top + (-v.current.y * 0.5 + 0.5) * rect.height;
    const on =
      v.current.z < 1 &&
      v.current.x >= -1.05 &&
      v.current.x <= 1.05 &&
      v.current.y >= -1.05 &&
      v.current.y <= 1.05;
    window.__aureliaHotspotScreen = { x, y, on };
  });

  return null;
}

function PostFXInner() {
  const { gl, camera } = useThree();
  const bloomRef = useRef<any>(null);
  const bloomIntensity = useRef(0.32);
  // postprocessing's EffectComposer reads `gl.getContext().getContextAttributes().alpha`
  // synchronously in its constructor. In React 19 StrictMode + Turbopack dev,
  // the WebGL context can be transiently lost (or not yet primed) between the
  // double mount, making getContextAttributes() return null → crash.
  // Gate EffectComposer creation until the context reports valid attributes.
  const [contextOk, setContextOk] = useState(false);

  useEffect(() => {
    if (!gl) return;
    let raf = 0;
    let cancelled = false;
    const verify = () => {
      if (cancelled) return;
      const ctx = (gl as any).getContext?.();
      const attrs = ctx && typeof ctx.getContextAttributes === "function"
        ? ctx.getContextAttributes()
        : null;
      if (attrs) {
        setContextOk(true);
      } else {
        raf = requestAnimationFrame(verify);
      }
    };
    verify();
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      setContextOk(false);
    };
  }, [gl]);

  // Pulsing bloom intensity for cinematographic glow on chrome/copper
  // Uses performance.now() instead of THREE.Clock to avoid deprecation warnings
  // (THREE.Clock was deprecated in r184+ in favor of THREE.Timer).
  const startTime = useRef(performance.now());
  useFrame(() => {
    if (!bloomRef.current) return;
    const elapsed = (performance.now() - startTime.current) / 1000;
    const pulse = Math.sin(elapsed * 0.5) * 0.025; // calmer, was *0.08
    bloomIntensity.current = 0.16 + pulse;          // lower base, was 0.32
    bloomRef.current.intensity = bloomIntensity.current;
  });

  if (!gl || !camera || !contextOk) return null;

  // multisampling=0: the Canvas already has antialias:true, so the underlying
  // drawing buffer is MSAA. EffectComposer renders into its own render targets,
  // and SMAA in the pass chain handles smoothing on the postprocessed output.
  // Setting multisampling=8 here was redundant and triggered extra buffer
  // allocation churn on StrictMode remounts.
  return (
    <EffectComposer multisampling={0} stencilBuffer={false}>
      <SMAA />
      {/* N8AO removed: screen-space AO is the heaviest pass in this chain
       *  (depth prepass + multi-sample AO + blur, all at backbuffer res
       *  every frame). On the kiosk's integrated GPU it was the tipping
       *  point into WebGL context loss. The baked ContactShadows + the
       *  studio key/fill lighting already carry the crevice depth. */}
      {/* threshold 0.82→0.92: only true blown highlights bloom, so the
       *  moving env/specular sweep on the metals no longer flares as the
       *  camera orbits. */}
      <Bloom
        ref={bloomRef}
        intensity={0.16}
        luminanceThreshold={0.92}
        luminanceSmoothing={0.28}
        mipmapBlur
        radius={0.6}
      />
      {/* Lift mid contrast a hair so the matte black body keeps depth
       *  without crushing the copper highlights. */}
      <BrightnessContrast brightness={-0.02} contrast={0.09} />
      {/* Tighter vignette: studio product photo, soggetto stacca dal nero. */}
      <Vignette eskil={false} offset={0.22} darkness={0.7} />
    </EffectComposer>
  );
}

function PostFX() {
  return (
    <Suspense fallback={null}>
      <PostFXInner />
    </Suspense>
  );
}

function Scene({
  onModelReady,
}: {
  onModelReady?: () => void;
}) {
  const phase = useTotemStore((s) => s.phase);
  const isAttractor = phase === "attractor";
  const isDetail = phase === "detail";

  return (
    <>
      {/* Studio softbox env for reflections only — no visible background.
       *  The visible backdrop is a CSS gradient on the Canvas wrapper so we
       *  can dial the warm undertone directly with brand tokens instead of
       *  fighting an HDR sphere. */}
      {/* 0.7: the env reflection is the view-dependent term that "sweeps"
       *  across the metals as the camera orbits. Lower = calmer mirror,
       *  and closer to the matte-ish Cycles hero (coherence-positive). */}
      <Environment files={ENV_HDR} environmentIntensity={0.7} />

      <Lights />

      <HotspotScreenProjector />

      <Suspense fallback={null}>
        <ClickToPlaceCatcher>
          <ProductModel onReady={onModelReady} />
        </ClickToPlaceCatcher>
      </Suspense>

      {/* Luxury product table: glossy dark surface that picks up a subtle
       *  reflection of the machine. mixStrength=0.45 keeps it from being a
       *  mirror — closer to "polished walnut tabletop under studio light"
       *  than to an ice rink. Resolution 1024 is enough for a blurry
       *  reflection that won't out-detail the model. */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        {/* Seamless dark "void": the floor albedo matches the backdrop wall
         *  tone (~rgb(12,11,14)) so there is no horizon line — the machine
         *  sits in one uniform dark space. The scene lights still graze the
         *  floor into a soft pool, and a soft footprint reflection +
         *  ContactShadows keep it grounded so it doesn't look like it
         *  floats. FBO budget unchanged (resolution 256) — GPU constraint. */}
        <MeshReflectorMaterial
          blur={[180, 50]}
          resolution={256}
          mixBlur={1}
          mixStrength={0.32}
          mixContrast={0.9}
          mirror={0}
          roughness={0.93}
          depthScale={1.4}
          minDepthThreshold={0.85}
          maxDepthThreshold={1}
          color="#0c0b0e"
          metalness={0}
        />
      </mesh>

      {/* Shadow FBO 2048→512 and baked once (frames={1}): the model only
       *  does a tiny idle bob, so a static contact shadow is unnoticeable
       *  and saves a full 512² depth render every frame. */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.55}
        scale={9}
        blur={2.4}
        far={6}
        frames={1}
        resolution={512}
        color="#050302"
      />

      <CameraRig active={isAttractor} detail={isDetail} />
    </>
  );
}

function ProductCanvas() {
  const [ready, setReady] = useState(false);
  const [effectsReady, setEffectsReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  // Kiosk safety net. If the GPU drops the WebGL context (driver reset,
  // memory pressure, weak iGPU) the canvas would otherwise stay frozen
  // until something remounts it — that was the "static frozen image →
  // change language → 3D reappears" bug (the locale route change was the
  // accidental remount). We now SELF-RECOVER: on context loss we bump a
  // key to remount the Canvas, which creates a fresh GL context
  // automatically. While that ~350 ms gap is open we show the neutral
  // loading indicator, never a frozen product still.
  const [contextLost, setContextLost] = useState(false);
  const [glKey, setGlKey] = useState(0);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => setEffectsReady(true), 100);
    return () => clearTimeout(timer);
  }, [ready]);

  // Keep the canvas at full opacity even in `detail` phase — the popup is
  // a glass card to the side, not a full-screen overlay, so dimming the
  // model defeats the purpose of the new layout.
  // Seamless dark void: one uniform tone (rgb(12,11,14)) for wall AND the
  // zone behind the floor, so there is no visible horizon — the in-scene
  // reflector floor shares this albedo. Only a faint radial pool behind
  // the model gives depth.
  return (
    <div
      suppressHydrationWarning
      className={`absolute inset-0 z-canvas transition-all duration-700 ease-out ${
        ready ? "backdrop-blur-0" : "backdrop-blur-sm"
      }`}
      style={{
        background:
          "radial-gradient(ellipse 65% 55% at 50% 48%, rgba(46,45,50,0.35) 0%, rgba(12,11,14,0) 60%), rgb(12,11,14)",
      }}
    >
      {ready && (
        <Canvas
          key={glKey}
          shadows={false}
          // dpr cap 3→1.75. At dpr 3 on a 1440px-wide kiosk the backbuffer
          // is ~4320px wide; every post/reflector/shadow FBO is allocated
          // at that size. That 9× pixel cost vs dpr 1 was the dominant
          // driver of context loss. 1.75 still looks crisp on the panel.
          dpr={[1, 1.75]}
          gl={{
            antialias: true,
            alpha: true,
            // "default" not "high-performance": forcing the discrete-GPU
            // path can land on the weaker Radeon 520 and also disables the
            // browser's own memory-pressure throttling. Let the UA pick.
            powerPreference: "default",
            preserveDrawingBuffer: false,
            toneMapping: THREE.AgXToneMapping,
            // 1.05→1.2: the glare fix cut a lot of light energy (key −23%,
            // rim −32%, spot −56%, env −30%, bloom −50%), leaving the model
            // under-exposed. Exposure is the right lever to recover the
            // mid-tones globally WITHOUT bringing back the harsh per-light
            // speculars — AgX rolls highlights off gracefully so speculars
            // stay controlled. Also lifts the live mid-key toward the
            // (well-exposed) Filmic Cycles hero.
            toneMappingExposure: 1.2,
            outputColorSpace: THREE.SRGBColorSpace,
            stencil: false,
            depth: true,
          }}
          camera={{
            position: CAMERA_POSITION,
            fov: 32,
            near: 0.1,
            far: 200,
          }}
          onCreated={({ gl }) => {
            // Fresh context is healthy.
            setContextLost(false);
            const canvas = gl.domElement;
            canvas.addEventListener(
              "webglcontextlost",
              (e) => {
                // preventDefault keeps the context restorable, then we
                // force a clean remount so it self-heals without needing
                // a route change.
                e.preventDefault();
                setContextLost(true);
                window.setTimeout(() => setGlKey((k) => k + 1), 350);
              },
              false,
            );
            canvas.addEventListener(
              "webglcontextrestored",
              () => setContextLost(false),
              false,
            );
          }}
          style={{ touchAction: "pan-y" }}
        >
          <Scene
            onModelReady={() => {
              setEffectsReady(true);
              setModelReady(true);
            }}
          />
          {effectsReady && <PostFX />}
        </Canvas>
      )}
      {/* Loading overlay stays visible until the model has finished parsing,
       *  textures uploaded, and onReady() has fired. Without it the canvas
       *  flashes the bare studio backdrop for several seconds while the
       *  24 MB GLB downloads and decodes — looks like a broken page. */}
      {!modelReady && <ProductLoadingIndicator />}

      {/* GPU dropped the context: show the neutral loading indicator for
       *  the brief moment before the Canvas self-remounts with a fresh
       *  context. Never a frozen product still (that was the bug). */}
      {contextLost && <ProductLoadingIndicator />}
    </div>
  );
}

function ProductLoadingIndicator() {
  // Track download progress for the 23 MB GLB. drei's useProgress hook
  // exposes a global counter across all useGLTF / useTexture / Three.js
  // loaders, so this also covers the HDR environment file.
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      // Read the loading manager state lazily — importing useProgress at
      // module top would introduce a Three.js dep cycle through drei in
      // the loading-only path. window.__DREI_LOADING_PROGRESS__ is not a
      // public API, so poll the DefaultLoadingManager directly.
      const lm = THREE.DefaultLoadingManager as unknown as {
        itemsLoaded?: number;
        itemsTotal?: number;
      };
      if (lm.itemsTotal && lm.itemsTotal > 0) {
        setProgress(
          Math.min(100, ((lm.itemsLoaded ?? 0) / lm.itemsTotal) * 100),
        );
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-0 z-canvas bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950"
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className="w-2 h-2 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full animate-pulse" />
        {progress > 0 && progress < 100 && (
          <span className="font-mono text-[11px] tracking-[0.2em] text-cream-400/60 tabular-nums">
            {progress.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}

// Disable SSR for the whole viewer — R3F + drei + postprocessing all touch
// browser-only APIs (WebGL context, window). Next.js' dynamic() with ssr:false
// guarantees we never render this server-side, and the loading state shows
// the same translated "Caricamento del modello" string as before.
const ProductCanvasClient = dynamic(
  () => Promise.resolve(ProductCanvas),
  { ssr: false, loading: () => <ProductLoadingIndicator /> },
);

export function ProductViewer() {
  return <ProductCanvasClient />;
}
