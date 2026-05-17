/**
 * AURELIA Pro X1 — GLB parametric v3 reference-faithful (JSCAD)
 * ===================================================================
 * v3 changes vs v2:
 *   - Proportions corrected: H 380→320, D 380→350 (photo-driven).
 *   - Removed top_housing decoy + thin perimeter copper_top_edge.
 *     Replaced with `copper_shelf`: a solid 15mm copper band between
 *     display panel and group-head niche (reference: aurellia front.png).
 *   - Steam wand pipe re-materialed: chrome_mirror (was wrongly copper).
 *   - Display 90×60→50×35, gauge 50→38 OD, buttons 11→8 (reference:
 *     dettaglio frontale.png + dettagli singoli.png).
 *   - Cup warmer: full top 270×340 (was 240×320), tank slot at back.
 *   - Drip tray protrudes 30mm forward of body front face.
 *
 * Convention: +X right, +Y up, +Z front (glTF native). Y=0 at ground.
 * CadQuery v3 path is currently blocked by stuck OCCT bindings; this
 * jscad path is the pipeline the dev-server consumes.
 *
 * Run:
 *   bun scripts/build-aurelia-jscad.mjs
 * Then post-process + promote to public:
 *   bun scripts/post-process-glb.mjs
 *
 * Hotspot contract (must exist in exported glTF, see data/hotspots.json):
 *   display_glass, pressure_gauge_assembly, capacitive_buttons,
 *   group_head_collar, portafilter_handle, steam_wand_pipe,
 *   cup_warmer_mesh, drip_tray_grate
 */

import { primitives, transforms, booleans } from "@jscad/modeling";
import { Document, NodeIO } from "@gltf-transform/core";

const { cuboid, cylinder, sphere } = primitives;
const { translate, rotate } = transforms;
const { union, subtract } = booleans;

// ════════════════════════════════════════════════════════════════════
// MATERIALS PBR v2 (linearized sRGB)
// ════════════════════════════════════════════════════════════════════
const MATERIALS = {
  charcoal_brushed: {
    label: "AURELIA_CharcoalBrushed",
    // Reference photos show matte anodized black with negligible specular —
    // close to a textured plastic. metallic kept very low so the body stays
    // dark-charcoal regardless of HDR lighting direction.
    baseColor: [0.012, 0.011, 0.010, 1.0],
    metallic: 0.05,
    roughness: 0.78,
  },
  copper_brushed: {
    label: "AURELIA_CopperBrushed",
    // Bumped saturation + warmth so the shelf and gauge bezel read as
    // copper-orange under the studio HDR (which would otherwise reflect
    // mostly neutral-white and wash the tint).
    baseColor: [0.55, 0.22, 0.075, 1.0],
    metallic: 0.95,
    roughness: 0.30,
  },
  chrome_mirror: {
    label: "AURELIA_ChromeMirror",
    baseColor: [0.65, 0.65, 0.66, 1.0],
    metallic: 1.0,
    roughness: 0.05,
  },
  chrome_mesh: {
    label: "AURELIA_ChromeMesh",
    baseColor: [0.49, 0.49, 0.50, 1.0],
    metallic: 1.0,
    roughness: 0.18,
  },
  walnut: {
    label: "AURELIA_Walnut",
    baseColor: [0.105, 0.052, 0.018, 1.0],
    metallic: 0.0,
    roughness: 0.55,
  },
  rubber_black: {
    label: "AURELIA_RubberBlack",
    baseColor: [0.0046, 0.0046, 0.0046, 1.0],
    metallic: 0.0,
    roughness: 0.85,
  },
  display_glow: {
    // Bump emissive so the small display reads as a clear warm-orange UI
    // panel under exposure 0.6. Reference photo shows a definite bright
    // glow on the screen.
    label: "AURELIA_DisplayGlow",
    baseColor: [0.003, 0.003, 0.004, 1.0],
    metallic: 0.0,
    roughness: 0.15,
    emissive: [0.85, 0.45, 0.22],
  },
  button_glow: {
    // Buttons in the reference are small chrome dots, NOT emissive. The v2
    // material name is kept for compatibility with SCENE_ENTRIES, but values
    // are now a polished metal so they read as small reflective coins
    // distinct from the bright gauge face.
    label: "AURELIA_ButtonChrome",
    baseColor: [0.62, 0.62, 0.64, 1.0],
    metallic: 1.0,
    roughness: 0.20,
  },
  gauge_dial_copper: {
    // Reference photos show a WHITE pressure-gauge face with copper bezel.
    // Renamed conceptually but keeping the key for SCENE_ENTRIES compat.
    // Bright off-white matte so the dial reads as a clear white circle
    // distinct from the chrome buttons.
    label: "AURELIA_GaugeFaceWhite",
    baseColor: [0.88, 0.85, 0.78, 1.0],
    metallic: 0.0,
    roughness: 0.45,
  },
  gauge_needle_black: {
    label: "AURELIA_GaugeNeedleBlack",
    baseColor: [0.010, 0.010, 0.010, 1.0],
    metallic: 0.5,
    roughness: 0.3,
  },
};

// ════════════════════════════════════════════════════════════════════
// DIMENSIONS v3 (meters)
// Convention: +X right, +Y up, +Z front. Y=0 at ground.
// Photo-driven proportions: H reduced 380→320, D reduced 380→350,
// shorter and slightly less deep than v2 to match reference photos.
// ════════════════════════════════════════════════════════════════════

const W = 0.280;
const H = 0.320;
const D = 0.350;

// Plinth (35mm tall, slight 10mm front protrusion)
const PLINTH_H = 0.035;
const PLINTH_PROTR = 0.010;
const PLINTH_TOTAL_D = D + PLINTH_PROTR;
const PLINTH_Z_CENTER = (-D / 2 + PLINTH_TOTAL_D / 2);
const PLINTH_Y_CENTER = PLINTH_H / 2;

// Back body
const BACK_H = H - PLINTH_H;
const BACK_Y_BASE = PLINTH_H;
const BACK_Y_CENTER = BACK_Y_BASE + BACK_H / 2;

// Copper SHELF — horizontal band between niche and upper panel.
// 15mm thick, full body width, slight forward protrusion.
const SHELF_H = 0.015;
const SHELF_Y_BASE = 0.165;
const SHELF_Y_TOP = SHELF_Y_BASE + SHELF_H;
const SHELF_Y_CENTER = (SHELF_Y_BASE + SHELF_Y_TOP) / 2;
const SHELF_PROTR = 0.005;

// Niche (cut from back body — lower-front cavity for group head)
// Below the shelf: Y[BACK_Y_BASE .. SHELF_Y_BASE]
const NICHE_Y_BASE = BACK_Y_BASE;
const NICHE_Y_TOP = SHELF_Y_BASE;
const NICHE_Y_CENTER = (NICHE_Y_BASE + NICHE_Y_TOP) / 2;
const NICHE_H = NICHE_Y_TOP - NICHE_Y_BASE;
const NICHE_D = 0.090;
const NICHE_Z_CENTER = +D / 2 - NICHE_D / 2 + 0.001;

// Display (smaller than v2 per macro photo)
// Z anchor is at the BACK of the device — geometry extends FORWARD from there.
const DISPLAY_X = -0.065, DISPLAY_Y = 0.250;
const DISPLAY_Z_BACK = +D / 2 - 0.002;  // back of bezel sits 2mm into body
const DISPLAY_W = 0.050, DISPLAY_H = 0.035;
const DISPLAY_BEZEL_INSET = 0.002;
const DISPLAY_BEZEL_DEPTH = 0.005;
const DISPLAY_GLASS_DEPTH = 0.0015;

// Pressure gauge (smaller, ~38mm OD)
const GAUGE_X = +0.080, GAUGE_Y = 0.250;
const GAUGE_Z_BACK = +D / 2;             // bezel back face flush with body face
const GAUGE_OUTER_R = 0.019;
const GAUGE_INNER_R = 0.015;
const GAUGE_DEPTH = 0.012;               // protrudes 12mm forward
const GAUGE_FACE_DEPTH = 0.002;
const GAUGE_GLASS_DEPTH = 0.001;
const GAUGE_NEEDLE_DEPTH = 0.0006;

// 3 capacitive buttons (smaller per photos) — coins protruding forward
const BUTTON_Y = 0.215;
const BUTTON_Z_BACK = +D / 2;
const BUTTON_FACE_DEPTH = 0.0025;
const BUTTON_BASE_DEPTH = 0.0008;
const BUTTON_R = 0.0055;
const BUTTON_BASE_R = 0.007;
const BUTTON_POSITIONS_X = [-0.090, -0.065, -0.040];

// Group head + portafilter
const GROUP_X = 0, GROUP_Y = 0.115, GROUP_Z = +D / 2 - NICHE_D + 0.005;
const GROUP_COLLAR_R = 0.035;
const GROUP_COLLAR_H = 0.018;
const GROUP_CHROME_R = 0.030;
const GROUP_CHROME_H = 0.012;

// Portafilter — head sits inside niche, handle pokes OUT to operator's left
// past the body side panel. PF_HANDLE_LEN sized so tip exits body.
const PF_X = 0, PF_Y = 0.085, PF_Z = +D / 2 - NICHE_D + 0.010;
const PF_HEAD_R = 0.0325;
const PF_HEAD_H = 0.022;
const PF_HANDLE_R = 0.013;
const PF_HANDLE_LEN = 0.130;       // long enough to exit body (W/2 = 0.140)
const PF_HANDLE_OFFSET_X = -0.030; // root just inside niche, tip at X=-0.160

// Steam wand (CHROME — was incorrectly copper in v2)
// Mounts on the right-front of niche, S-curve forward + down.
const STEAM_MOUNT = [+0.110, 0.130, +D / 2 - NICHE_D + 0.005];
const STEAM_MID   = [+0.130, 0.080, +D / 2 + 0.005];
const STEAM_TIP   = [+0.130, 0.040, +D / 2 + 0.025];
const STEAM_PIPE_R = 0.003;
const STEAM_BOOT_R = 0.006;
const STEAM_BOOT_LEN = 0.028;
const STEAM_TIP_R = 0.0045;

// Drip tray (in front of body, sticks forward)
const DRIP_X = 0, DRIP_Y = 0.045, DRIP_Z = +D / 2 + 0.030;
const DRIP_BASIN_W = 0.200, DRIP_BASIN_H = 0.025, DRIP_BASIN_D = 0.150;
const DRIP_GRATE_THK = 0.0035;

// Cup warmer (full top — much bigger than v2)
const WARMER_X = 0, WARMER_Y = H, WARMER_Z = 0;
const WARMER_W = 0.270, WARMER_D = 0.340, WARMER_THK = 0.0015;
const WARMER_TANK_SLOT_W = 0.080, WARMER_TANK_SLOT_D = 0.028;
const WARMER_TANK_SLOT_Z = -0.120;

// Feet
const FOOT_R = 0.009, FOOT_H = 0.008;
const FOOT_INSET = 0.022;

// ════════════════════════════════════════════════════════════════════
// GEOMETRY
// ════════════════════════════════════════════════════════════════════

console.log("[v2-jscad] building geometry…");

// 1. PLINTH
const plinth = translate(
  [0, PLINTH_Y_CENTER, PLINTH_Z_CENTER],
  cuboid({ size: [W, PLINTH_H, PLINTH_TOTAL_D] }),
);

// 2. BACK BODY (with niche cut)
// Niche is NARROWER than body width — leaves body side panels intact left/right.
// Reference: aurellia front.png + frontale destro.png clearly show side panels.
const NICHE_W = 0.220;
const backBodyEnv = translate(
  [0, BACK_Y_CENTER, 0],
  cuboid({ size: [W, BACK_H, D] }),
);
const niche = translate(
  [0, NICHE_Y_CENTER, NICHE_Z_CENTER],
  cuboid({ size: [NICHE_W, NICHE_H, NICHE_D] }),
);
const backBody = subtract(backBodyEnv, niche);

// 3. COPPER SHELF — chunky horizontal band that reads as a copper accent
// from the front. 15mm tall × full-width × 20mm deep, with 15mm protruding
// forward of the body front face (Z=+D/2). Reference: aurellia front.png.
const copperShelf = translate(
  [0, SHELF_Y_CENTER, +D / 2 + 0.005],
  cuboid({ size: [W - 0.004, SHELF_H, 0.020] }),
);

// 5. DISPLAY (bezel recess + emissive glass face)
// Bezel: charcoal recess slab. Glass: thin slab in front of bezel that glows.
const displayBezel = translate(
  [DISPLAY_X, DISPLAY_Y, DISPLAY_Z_BACK + DISPLAY_BEZEL_DEPTH / 2],
  cuboid({
    size: [
      DISPLAY_W + 2 * DISPLAY_BEZEL_INSET,
      DISPLAY_H + 2 * DISPLAY_BEZEL_INSET,
      DISPLAY_BEZEL_DEPTH,
    ],
  }),
);
const displayGlass = translate(
  [
    DISPLAY_X,
    DISPLAY_Y,
    DISPLAY_Z_BACK + DISPLAY_BEZEL_DEPTH + DISPLAY_GLASS_DEPTH / 2,
  ],
  cuboid({ size: [DISPLAY_W, DISPLAY_H, DISPLAY_GLASS_DEPTH] }),
);

// 6. PRESSURE GAUGE — bezel + dial + needle + glass.
// Stacked on +Z axis: bezel (back) → dial (mid) → needle (front of dial)
// → glass (front). All cylinders use default Z-axis orientation so they
// face the camera as coins.
const gaugeBezel = translate(
  [GAUGE_X, GAUGE_Y, GAUGE_Z_BACK + GAUGE_DEPTH / 2],
  cylinder({ radius: GAUGE_OUTER_R, height: GAUGE_DEPTH, segments: 40 }),
);
const gaugeDial = translate(
  [
    GAUGE_X,
    GAUGE_Y,
    GAUGE_Z_BACK + GAUGE_DEPTH - GAUGE_FACE_DEPTH / 2 - 0.0005,
  ],
  cylinder({
    radius: GAUGE_INNER_R,
    height: GAUGE_FACE_DEPTH,
    segments: 40,
  }),
);
const gaugeNeedle = translate(
  [GAUGE_X, GAUGE_Y, GAUGE_Z_BACK + GAUGE_DEPTH - 0.0001],
  rotate(
    [0, 0, (-25 * Math.PI) / 180],
    cuboid({ size: [0.0014, 0.014, GAUGE_NEEDLE_DEPTH] }),
  ),
);
const gaugeGlass = translate(
  [
    GAUGE_X,
    GAUGE_Y,
    GAUGE_Z_BACK + GAUGE_DEPTH + GAUGE_GLASS_DEPTH / 2,
  ],
  cylinder({
    radius: GAUGE_INNER_R + 0.0005,
    height: GAUGE_GLASS_DEPTH,
    segments: 40,
  }),
);

// 7. CAPACITIVE BUTTONS (3 base rings + 3 face caps)
const buttonBases = [];
const buttonFaces = [];
for (const x of BUTTON_POSITIONS_X) {
  // Buttons are coins viewed from +Z. Default cylinder axis = Z is correct.
  buttonBases.push(
    translate(
      [x, BUTTON_Y, BUTTON_Z_BACK + BUTTON_BASE_DEPTH / 2],
      cylinder({
        radius: BUTTON_BASE_R,
        height: BUTTON_BASE_DEPTH,
        segments: 24,
      }),
    ),
  );
  buttonFaces.push(
    translate(
      [x, BUTTON_Y, BUTTON_Z_BACK + BUTTON_BASE_DEPTH + BUTTON_FACE_DEPTH / 2],
      cylinder({
        radius: BUTTON_R,
        height: BUTTON_FACE_DEPTH,
        segments: 24,
      }),
    ),
  );
}
const buttonsBaseUnion = union(...buttonBases);
const buttonsFaceUnion = union(...buttonFaces);

// 8. GROUP HEAD (copper collar + chrome disc)
// Discs face the camera at +Z — default cylinder axis is along Z, no rotation.
const groupHeadCollar = translate(
  [GROUP_X, GROUP_Y, GROUP_Z - GROUP_COLLAR_H / 2 + 0.005],
  cylinder({ radius: GROUP_COLLAR_R, height: GROUP_COLLAR_H, segments: 40 }),
);
const groupHeadChrome = translate(
  [GROUP_X, GROUP_Y - 0.005, GROUP_Z + 0.001],
  cylinder({ radius: GROUP_CHROME_R, height: GROUP_CHROME_H, segments: 40 }),
);

// 9. PORTAFILTER (head chrome + walnut handle + chrome beak)
const portafilterHead = translate(
  [PF_X, PF_Y, PF_Z + 0.002],
  cylinder({ radius: PF_HEAD_R, height: PF_HEAD_H, segments: 40 }),
);
const portafilterSpoutBeak = translate(
  [PF_X, PF_Y - PF_HEAD_R - 0.002, PF_Z + 0.008],
  cuboid({ size: [0.028, 0.004, 0.018] }),
);
// Handle: cylinder along -X (operator's left). Default cylinder along Z, so
// rotate around Y by 90° to align axis with X.
const portafilterHandle = translate(
  [PF_HANDLE_OFFSET_X - PF_HANDLE_LEN / 2, PF_Y, PF_Z + 0.005],
  rotate(
    [0, Math.PI / 2, 0],
    cylinder({ radius: PF_HANDLE_R, height: PF_HANDLE_LEN, segments: 24 }),
  ),
);

// 10. STEAM WAND (boot rubber + 2 copper segments + chrome tip)
function cylBetween(p1, p2, radius, segments = 16) {
  const dx = p2[0] - p1[0],
    dy = p2[1] - p1[1],
    dz = p2[2] - p1[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < 1e-6) {
    return translate(p1, sphere({ radius, segments }));
  }
  // Default cylinder along +Z. Compute angle to align Z-axis with (dx,dy,dz).
  const nx = dx / len,
    ny = dy / len,
    nz = dz / len;
  const cosA = nz;
  const angle = Math.acos(Math.max(-1, Math.min(1, cosA)));
  if (Math.abs(angle) < 1e-4) {
    return translate(
      [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2],
      cylinder({ radius, height: len, segments }),
    );
  }
  const ax = -ny;
  const ay = nx;
  const al = Math.sqrt(ax * ax + ay * ay);
  if (al < 1e-6) {
    return translate(
      [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2],
      rotate([Math.PI, 0, 0], cylinder({ radius, height: len, segments })),
    );
  }
  // Rotate cylinder around (ax, ay, 0) by angle
  // jscad rotate takes [rx, ry, rz] euler angles, not arbitrary axis; we approximate
  // using the axis components projected onto the cardinal rotations.
  // For our use case (steam wand near vertical), this approximation is adequate.
  const rx = ay * angle;
  const ry = -ax * angle;
  return translate(
    [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2],
    rotate([rx, ry, 0], cylinder({ radius, height: len, segments })),
  );
}

const steamBoot = translate(
  [STEAM_MOUNT[0], STEAM_MOUNT[1] - STEAM_BOOT_LEN / 2, STEAM_MOUNT[2]],
  cylinder({ radius: STEAM_BOOT_R, height: STEAM_BOOT_LEN, segments: 24 }),
);
const steamSeg1 = cylBetween(STEAM_MOUNT, STEAM_MID, STEAM_PIPE_R);
const steamSeg2 = cylBetween(STEAM_MID, STEAM_TIP, STEAM_PIPE_R);
const steamWandPipe = union(steamSeg1, steamSeg2);
const steamWandTip = translate(
  [STEAM_TIP[0], STEAM_TIP[1] - 0.007, STEAM_TIP[2]],
  cylinder({ radius: STEAM_TIP_R, height: 0.014, segments: 16 }),
);

// 11. DRIP TRAY BASIN + GRATE (chevron pattern overlay, no boolean)
const dripBasin = translate(
  [DRIP_X, DRIP_Y - 0.003, DRIP_Z],
  cuboid({ size: [DRIP_BASIN_W, DRIP_BASIN_H, DRIP_BASIN_D] }),
);
// Chevron grate: 8 V-shaped rows on top of basin (fake overlay)
const grateY = DRIP_Y + DRIP_BASIN_H / 2 + DRIP_GRATE_THK / 2;
const grateSegs = [];
const N_CHEV = 8;
for (let i = 1; i <= N_CHEV; i++) {
  const zOffset =
    DRIP_Z - DRIP_BASIN_D / 2 + (i * DRIP_BASIN_D) / (N_CHEV + 1);
  // Left arm rotated +15° around Y
  const leftArm = translate(
    [DRIP_X - DRIP_BASIN_W * 0.225 + 0.004, grateY, zOffset],
    rotate(
      [0, (15 * Math.PI) / 180, 0],
      cuboid({
        size: [DRIP_BASIN_W * 0.45, DRIP_GRATE_THK, 0.004],
      }),
    ),
  );
  const rightArm = translate(
    [DRIP_X + DRIP_BASIN_W * 0.225 - 0.004, grateY, zOffset],
    rotate(
      [0, (-15 * Math.PI) / 180, 0],
      cuboid({
        size: [DRIP_BASIN_W * 0.45, DRIP_GRATE_THK, 0.004],
      }),
    ),
  );
  grateSegs.push(leftArm, rightArm);
}
// Frame around the grate
const grateFrameOuter = translate(
  [DRIP_X, grateY, DRIP_Z],
  cuboid({
    size: [DRIP_BASIN_W * 0.96, DRIP_GRATE_THK, DRIP_BASIN_D * 0.96],
  }),
);
const grateFrameInnerCut = translate(
  [DRIP_X, grateY, DRIP_Z],
  cuboid({
    size: [DRIP_BASIN_W * 0.86, DRIP_GRATE_THK + 0.001, DRIP_BASIN_D * 0.86],
  }),
);
const grateFrame = subtract(grateFrameOuter, grateFrameInnerCut);

// 12. CUP WARMER (mesh plate + diamond cross-hatch fake overlay + tank slot cut)
const warmerPlateEnv = translate(
  [WARMER_X, WARMER_Y - WARMER_THK / 2, WARMER_Z],
  cuboid({ size: [WARMER_W, WARMER_THK, WARMER_D] }),
);
const warmerTankCut = translate(
  [WARMER_X, WARMER_Y - WARMER_THK / 2, WARMER_TANK_SLOT_Z],
  cuboid({
    size: [WARMER_TANK_SLOT_W, WARMER_THK + 0.002, WARMER_TANK_SLOT_D],
  }),
);
const warmerPlate = subtract(warmerPlateEnv, warmerTankCut);

// Diamond cross-hatch: array of thin bars at ±45° (fake mesh)
const hatchSegs = [];
const HATCH_SPACING = 0.018;
const HATCH_THK = 0.0015;
const HATCH_LEN = Math.max(WARMER_W, WARMER_D) * 1.2;
const N_HATCH = Math.ceil(Math.max(WARMER_W, WARMER_D) / HATCH_SPACING) + 4;
for (let i = -Math.floor(N_HATCH / 2); i <= Math.floor(N_HATCH / 2); i++) {
  const offset = i * HATCH_SPACING * Math.sqrt(2);
  const stripA = translate(
    [WARMER_X + offset / Math.SQRT2, WARMER_Y + 0.0005, WARMER_Z + offset / Math.SQRT2],
    rotate(
      [0, Math.PI / 4, 0],
      cuboid({ size: [HATCH_LEN, HATCH_THK, HATCH_THK] }),
    ),
  );
  const stripB = translate(
    [WARMER_X + offset / Math.SQRT2, WARMER_Y + 0.0005, WARMER_Z - offset / Math.SQRT2],
    rotate(
      [0, -Math.PI / 4, 0],
      cuboid({ size: [HATCH_LEN, HATCH_THK, HATCH_THK] }),
    ),
  );
  hatchSegs.push(stripA, stripB);
}

// 13. FEET (4 rubber cylinders)
const footPositions = [
  [+W / 2 - FOOT_INSET, FOOT_H / 2 - 0.002, +D / 2 - FOOT_INSET],
  [-W / 2 + FOOT_INSET, FOOT_H / 2 - 0.002, +D / 2 - FOOT_INSET],
  [+W / 2 - FOOT_INSET, FOOT_H / 2 - 0.002, -D / 2 + FOOT_INSET],
  [-W / 2 + FOOT_INSET, FOOT_H / 2 - 0.002, -D / 2 + FOOT_INSET],
];
const feetParts = footPositions.map((p) =>
  translate(p, cylinder({ radius: FOOT_R, height: FOOT_H, segments: 16 })),
);

// 14. LATERAL VENT SLOTS (24 thin vertical slots on right side, from laterale.png)
// Fake overlay: thin rubber_black bars stuck to the right face for darker-recessed look.
const VENT_LAT_X = +W / 2 + 0.0005; // right face + tiny offset
const VENT_LAT_Y = 0.220;
const VENT_LAT_SLOT_W = 0.0015;
const VENT_LAT_SLOT_H = 0.050;
const VENT_LAT_SPACING = 0.003;
const VENT_LAT_COUNT = 24;
const lateralVentParts = [];
for (let i = 0; i < VENT_LAT_COUNT; i++) {
  const offset =
    (i - (VENT_LAT_COUNT - 1) / 2) * VENT_LAT_SPACING; // center the array around Z=0
  lateralVentParts.push(
    translate(
      [VENT_LAT_X, VENT_LAT_Y, offset],
      cuboid({ size: [0.001, VENT_LAT_SLOT_H, VENT_LAT_SLOT_W] }),
    ),
  );
}

// 15. REAR VENT GRILL (26 horizontal slots on back face, from posteriore.png)
const VENT_REAR_Z = -D / 2 - 0.0005; // back face + tiny offset (in glTF +Z front)
const VENT_REAR_Y = 0.240;
const VENT_REAR_SLOT_W = 0.0025;
const VENT_REAR_SPACING = 0.004;
const VENT_REAR_COUNT = 26;
const VENT_REAR_LEN = 0.200;
const rearVentParts = [];
for (let i = 0; i < VENT_REAR_COUNT; i++) {
  const offsetY =
    (i - (VENT_REAR_COUNT - 1) / 2) * VENT_REAR_SPACING;
  rearVentParts.push(
    translate(
      [0, VENT_REAR_Y + offsetY, VENT_REAR_Z],
      cuboid({ size: [VENT_REAR_LEN, VENT_REAR_SLOT_W, 0.001] }),
    ),
  );
}

// 16. REAR COMPONENTS (power switch + IEC inlet + water connection)
// Position on back face Z=-D/2, lower section Y=0.090
const REAR_Y = 0.090;
const REAR_Z_FACE = -D / 2 - 0.005; // 5mm proud of back face
// 16a. Power rocker switch (charcoal body + red emissive face)
const switchBody = translate(
  [-0.100, REAR_Y, REAR_Z_FACE],
  cuboid({ size: [0.022, 0.012, 0.010] }),
);
const switchRedFace = translate(
  [-0.100, REAR_Y, REAR_Z_FACE - 0.005],
  cuboid({ size: [0.018, 0.008, 0.001] }),
);
// 16b. IEC C13 inlet (charcoal recessed)
const iecInlet = translate(
  [0, REAR_Y, REAR_Z_FACE],
  cuboid({ size: [0.032, 0.028, 0.008] }),
);
// 16c. Water connection (chrome cylinder protruding)
const waterConnection = translate(
  [+0.100, REAR_Y, REAR_Z_FACE - 0.009],
  cylinder({ radius: 0.008, height: 0.018, segments: 24 }),
);

console.log("[v2-jscad] geometry built");

// ════════════════════════════════════════════════════════════════════
// SCENE ENTRIES — node_name maps to hotspots.json anchor_node values
// ════════════════════════════════════════════════════════════════════
const SCENE_ENTRIES = [
  // Body (charcoal_brushed)
  { node: "plinth_base", mat: "charcoal_brushed", parts: [plinth] },
  { node: "back_body", mat: "charcoal_brushed", parts: [backBody] },
  { node: "display_bezel_recess", mat: "charcoal_brushed", parts: [displayBezel] },
  { node: "drip_tray_basin", mat: "charcoal_brushed", parts: [dripBasin] },

  // Copper accents (v3: copper SHELF replaces top edge)
  { node: "copper_shelf", mat: "copper_brushed", parts: [copperShelf] },
  { node: "group_head_collar", mat: "copper_brushed", parts: [groupHeadCollar] },

  // Chrome mirror (v3: steam wand pipe is chrome, not copper)
  { node: "group_head_chrome", mat: "chrome_mirror", parts: [groupHeadChrome] },
  { node: "portafilter_head", mat: "chrome_mirror", parts: [portafilterHead] },
  { node: "portafilter_spout_beak", mat: "chrome_mirror", parts: [portafilterSpoutBeak] },
  { node: "steam_wand_pipe", mat: "chrome_mirror", parts: [steamWandPipe] },
  { node: "steam_wand_tip", mat: "chrome_mirror", parts: [steamWandTip] },

  // Chrome mesh (drip tray grate + cup warmer)
  { node: "drip_tray_grate", mat: "chrome_mesh", parts: [grateFrame, ...grateSegs] },
  { node: "cup_warmer_mesh", mat: "chrome_mesh", parts: [warmerPlate, ...hatchSegs] },

  // Walnut
  { node: "portafilter_handle", mat: "walnut", parts: [portafilterHandle] },

  // Display + buttons
  { node: "display_glass", mat: "display_glow", parts: [displayGlass] },
  { node: "capacitive_buttons", mat: "button_glow", parts: [buttonsFaceUnion] },
  { node: "capacitive_buttons_base", mat: "rubber_black", parts: [buttonsBaseUnion] },

  // Gauge composite
  { node: "pressure_gauge_assembly", mat: "copper_brushed", parts: [gaugeBezel] },
  { node: "gauge_dial", mat: "gauge_dial_copper", parts: [gaugeDial] },
  { node: "gauge_needle", mat: "gauge_needle_black", parts: [gaugeNeedle] },
  { node: "gauge_glass", mat: "display_glow", parts: [gaugeGlass] },

  // Steam wand boot
  { node: "steam_wand_boot", mat: "rubber_black", parts: [steamBoot] },

  // Feet
  { node: "feet", mat: "rubber_black", parts: feetParts },

  // Vent slots & grill
  { node: "vent_slots_lateral", mat: "rubber_black", parts: lateralVentParts },
  { node: "vent_grill_rear", mat: "rubber_black", parts: rearVentParts },

  // Rear components
  { node: "rear_switch_body", mat: "charcoal_brushed", parts: [switchBody] },
  { node: "rear_switch_red", mat: "button_glow", parts: [switchRedFace] },
  { node: "rear_iec_inlet", mat: "charcoal_brushed", parts: [iecInlet] },
  { node: "rear_water_connection", mat: "chrome_mirror", parts: [waterConnection] },
];

// ════════════════════════════════════════════════════════════════════
// JSCAD geom → triangles
// ════════════════════════════════════════════════════════════════════
function jscadToTriangles(geoms) {
  const positions = [];
  const normals = [];
  const indices = [];
  let vertexOffset = 0;

  for (const g of geoms) {
    const polys = g.polygons || [];
    for (const poly of polys) {
      const verts = poly.vertices;
      if (verts.length < 3) continue;
      let nx = 0,
        ny = 0,
        nz = 0;
      for (let i = 0; i < verts.length; i++) {
        const a = verts[i];
        const b = verts[(i + 1) % verts.length];
        nx += (a[1] - b[1]) * (a[2] + b[2]);
        ny += (a[2] - b[2]) * (a[0] + b[0]);
        nz += (a[0] - b[0]) * (a[1] + b[1]);
      }
      const nlen = Math.hypot(nx, ny, nz) || 1;
      nx /= nlen;
      ny /= nlen;
      nz /= nlen;

      const baseIdx = vertexOffset;
      for (const v of verts) {
        positions.push(v[0], v[1], v[2]);
        normals.push(nx, ny, nz);
        vertexOffset++;
      }
      for (let i = 1; i < verts.length - 1; i++) {
        indices.push(baseIdx, baseIdx + i, baseIdx + i + 1);
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint32Array(indices),
  };
}

// ════════════════════════════════════════════════════════════════════
// BUILD glTF DOCUMENT
// ════════════════════════════════════════════════════════════════════
console.log("[v2-jscad] building glTF document…");

const doc = new Document();
doc.createBuffer();
const scene = doc.createScene("AURELIA_v2");

// Create materials
const materials = {};
for (const [key, def] of Object.entries(MATERIALS)) {
  const mat = doc
    .createMaterial(def.label)
    .setBaseColorFactor(def.baseColor)
    .setMetallicFactor(def.metallic)
    .setRoughnessFactor(def.roughness)
    .setDoubleSided(true);
  if (def.emissive) {
    mat.setEmissiveFactor(def.emissive);
  }
  materials[key] = mat;
}

// One mesh per scene entry → one node per mesh with explicit name (anchor)
let totalVerts = 0;
let totalTris = 0;

for (const entry of SCENE_ENTRIES) {
  const tri = jscadToTriangles(entry.parts);
  if (tri.positions.length === 0) {
    console.log(`  [${entry.node}] skip (empty)`);
    continue;
  }
  const buf = doc.getRoot().listBuffers()[0];
  const posAcc = doc
    .createAccessor()
    .setType("VEC3")
    .setArray(tri.positions)
    .setBuffer(buf);
  const normAcc = doc
    .createAccessor()
    .setType("VEC3")
    .setArray(tri.normals)
    .setBuffer(buf);
  const idxAcc = doc
    .createAccessor()
    .setType("SCALAR")
    .setArray(tri.indices)
    .setBuffer(buf);

  const prim = doc
    .createPrimitive()
    .setMaterial(materials[entry.mat])
    .setAttribute("POSITION", posAcc)
    .setAttribute("NORMAL", normAcc)
    .setIndices(idxAcc);

  const mesh = doc.createMesh(entry.node).addPrimitive(prim);
  const node = doc.createNode(entry.node).setMesh(mesh);
  scene.addChild(node);

  totalVerts += tri.positions.length / 3;
  totalTris += tri.indices.length / 3;
  console.log(
    `  [${entry.node}] ${tri.positions.length / 3}v ${tri.indices.length / 3}f`,
  );
}

const TARGET = "assets/raw/aurelia-prox1-built.glb";
const io = new NodeIO();
console.log(`[v2-jscad] writing → ${TARGET}`);
await io.write(TARGET, doc);

console.log(`[v2-jscad] done`);
console.log(`  scene nodes: ${doc.getRoot().listNodes().length}`);
console.log(`  meshes: ${doc.getRoot().listMeshes().length}`);
console.log(`  materials: ${doc.getRoot().listMaterials().length}`);
console.log(`  total vertices: ${totalVerts}`);
console.log(`  total triangles: ${totalTris}`);
