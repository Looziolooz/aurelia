"""
AURELIA Pro X1 — GLB CAD-grade v2 reference-faithful
======================================================
Costruito leggendo le 7+ angolazioni reference in `public/foto 360 gradi/`:
  - frontale.png, aurellia front.png    (DNA reference)
  - aurelia left.png, laterale.png      (3/4 sinistra, profilo)
  - aurelia right.png, laterale 3.png   (3/4 destra, lato lancia vapore)
  - posteriore.png, lato posteriore.png (retro, connessioni)
  - Low-Angle Shot.png                  (vista "Verme" — drip tray, gambe)
  - alto angolazione.png                (vista "Uccello" — cup warmer, tank slot)
  - dettaglio frontale.png, dettagli singoli.png (macro: walnut, brushed copper, E61)

Convention:
  - Origin: centro della base inferiore, sul piano del banco
  - +X right, +Y up, +Z back (operatore guarda da Z negativo)
  - Unità interne: mm. Export: × 0.001 → meters glTF.

Pipeline:
  python scripts/build-aurelia-cadquery.py
  bunx --bun @gltf-transform/cli weld → prune → dedup → draco
"""

import math
import sys
import traceback
from pathlib import Path

import cadquery as cq
import trimesh
import numpy as np

# ════════════════════════════════════════════════════════════════════
# MATERIALS PBR v2 (linearized sRGB, factor-only)
# ════════════════════════════════════════════════════════════════════

MATERIALS = {
    "charcoal_brushed": dict(
        name="AURELIA_CharcoalBrushed",
        baseColorFactor=[0.024, 0.022, 0.020, 1.0],
        metallicFactor=0.85,
        roughnessFactor=0.45,
    ),
    "copper_brushed": dict(
        name="AURELIA_CopperBrushed",
        baseColorFactor=[0.345, 0.140, 0.045, 1.0],
        metallicFactor=1.0,
        roughnessFactor=0.28,
    ),
    "chrome_mirror": dict(
        name="AURELIA_ChromeMirror",
        baseColorFactor=[0.65, 0.65, 0.66, 1.0],
        metallicFactor=1.0,
        roughnessFactor=0.05,
    ),
    "chrome_mesh": dict(
        name="AURELIA_ChromeMesh",
        baseColorFactor=[0.49, 0.49, 0.50, 1.0],
        metallicFactor=1.0,
        roughnessFactor=0.18,
    ),
    "walnut": dict(
        name="AURELIA_Walnut",
        baseColorFactor=[0.105, 0.052, 0.018, 1.0],
        metallicFactor=0.0,
        roughnessFactor=0.55,
    ),
    "rubber_black": dict(
        name="AURELIA_RubberBlack",
        baseColorFactor=[0.0046, 0.0046, 0.0046, 1.0],
        metallicFactor=0.0,
        roughnessFactor=0.85,
    ),
    "display_glow": dict(
        name="AURELIA_DisplayGlow",
        baseColorFactor=[0.003, 0.003, 0.004, 1.0],
        metallicFactor=0.0,
        roughnessFactor=0.15,
        emissiveFactor=[0.34, 0.18, 0.088],  # subtle copper-warm UI
    ),
    "button_glow": dict(
        name="AURELIA_ButtonGlow",
        baseColorFactor=[0.55, 0.55, 0.57, 1.0],
        metallicFactor=0.0,
        roughnessFactor=0.35,
        emissiveFactor=[0.4, 0.4, 0.4],
    ),
    "gauge_dial_copper": dict(
        name="AURELIA_GaugeDialCopper",
        baseColorFactor=[0.32, 0.13, 0.04, 1.0],
        metallicFactor=0.7,
        roughnessFactor=0.4,
    ),
    "gauge_needle_black": dict(
        name="AURELIA_GaugeNeedleBlack",
        baseColorFactor=[0.010, 0.010, 0.010, 1.0],
        metallicFactor=0.5,
        roughnessFactor=0.3,
    ),
}

# ════════════════════════════════════════════════════════════════════
# DIMENSIONS (mm) — coord +X right, +Y up, +Z back
# ════════════════════════════════════════════════════════════════════

# Globali
GLOBAL_W, GLOBAL_H, GLOBAL_D = 280.0, 380.0, 380.0
OUTER_FILLET = 8.0
PANEL_FILLET = 2.0

# C. PLINTH (base 40mm, drip tray sporge frontalmente +20mm)
PLINTH_W = 280.0
PLINTH_H = 40.0
PLINTH_D_BACK = 380.0           # depth back body
PLINTH_PROTRUSION = 20.0        # sporge frontalmente (Z negativo)
PLINTH_TOTAL_D = PLINTH_D_BACK + PLINTH_PROTRUSION  # 400 mm

# B. BACK BODY (corpo full Y[40..380], Z[-190..+190])
BACK_W = 280.0
BACK_H = 340.0
BACK_D = 380.0
BACK_Y_BASE = 40.0
BACK_Y_TOP = BACK_Y_BASE + BACK_H  # 380 = top
BACK_Z_FRONT = -190.0
BACK_Z_BACK = +190.0

# A. TOP HOUSING NICHE — sub-volume del back body, sezione Y[200..330] Z[-190..+10]
# La nicchia frontale-inferiore (per group head) Y[40..200] Z[-190..+10] viene cut.
TOP_Y_BASE = 200.0
TOP_Y_TOP = 330.0
TOP_Z_FRONT = -190.0
TOP_Z_BACK_LIMIT = +10.0  # dove il top housing finisce in profondità

NICHE_Z_FRONT = -190.0
NICHE_Z_BACK = +10.0
NICHE_Y_TOP = 200.0       # nicchia da plinth top a top housing base

# Display
DISPLAY_W, DISPLAY_H = 90.0, 60.0
DISPLAY_BEZEL_INSET = 3.0
DISPLAY_X, DISPLAY_Y, DISPLAY_Z = -55.0, 285.0, -191.0

# Pressure gauge
GAUGE_OUTER, GAUGE_INNER = 50.0, 38.0
GAUGE_DEPTH = 18.0
GAUGE_BEZEL_THK = 6.0
GAUGE_X, GAUGE_Y, GAUGE_Z = 75.0, 285.0, -191.0
GAUGE_NEEDLE_LEN = 15.0
GAUGE_NEEDLE_W = 1.2
GAUGE_NEEDLE_ANGLE = -25.0  # ~9 bar reading

# 3 capacitive buttons
BUTTON_DIAM = 11.0
BUTTON_BASE_DIAM = 13.0
BUTTON_H = 1.5
BUTTON_BASE_H = 0.5
BUTTON_Y = 235.0
BUTTON_Z = -190.5
BUTTON_POSITIONS_X = (-75.0, -55.0, -35.0)

# Group head + portafilter + spout
GROUP_X, GROUP_Y, GROUP_Z = 0.0, 175.0, -150.0
GROUP_COLLAR_DIAM = 75.0
GROUP_COLLAR_H = 22.0
GROUP_CHROME_DIAM = 65.0
GROUP_CHROME_H = 14.0
GROUP_SOCKET_DIAM = 58.0
GROUP_SOCKET_DEPTH = 8.0

PF_X, PF_Y, PF_Z = 0.0, 145.0, -150.0
PF_HEAD_DIAM = 70.0
PF_HEAD_H = 25.0
PF_HANDLE_LEN = 110.0
PF_HANDLE_ROOT_D = 28.0
PF_HANDLE_TIP_D = 22.0
PF_HANDLE_CHROME = 12.0
PF_HANDLE_OFFSET_X = -50.0   # punto di partenza handle (sporge verso sinistra)
PF_BEAK_W = 28.0
PF_BEAK_D = 18.0
PF_BEAK_THK = 4.0

# Steam wand (in copper brushed, S-curve approximated 3 segments)
STEAM_PIPE_DIAM = 8.0
STEAM_BOOT_DIAM = 14.0
STEAM_BOOT_LEN = 35.0
STEAM_TIP_DIAM = 11.0
STEAM_MOUNT_X, STEAM_MOUNT_Y, STEAM_MOUNT_Z = 90.0, 175.0, -150.0
STEAM_MID_X, STEAM_MID_Y, STEAM_MID_Z = 105.0, 110.0, -155.0
STEAM_TIP_X, STEAM_TIP_Y, STEAM_TIP_Z = 110.0, 60.0, -160.0

# Drip tray
DRIP_X, DRIP_Y, DRIP_Z = 0.0, 60.0, -195.0
DRIP_BASIN_W = 200.0
DRIP_BASIN_H = 35.0
DRIP_BASIN_D = 180.0
DRIP_GRATE_THK = 4.0
DRIP_GRATE_CHEVRON_LINES = 8

# Cup warmer mesh top
WARMER_X, WARMER_Y, WARMER_Z = 0.0, 380.0, -50.0
WARMER_W = 240.0
WARMER_D = 320.0
WARMER_THK = 2.0
WARMER_TANK_SLOT_W = 80.0
WARMER_TANK_SLOT_D = 18.0
WARMER_TANK_SLOT_Z = +120.0

# Copper top edge (perimetro)
COPPER_EDGE_W = 4.0
COPPER_EDGE_H = 4.0

# Feet
FOOT_DIAM = 22.0
FOOT_H = 12.0
FOOT_INSET = 25.0

# ════════════════════════════════════════════════════════════════════
# HELPERS
# ════════════════════════════════════════════════════════════════════

def cq_to_mesh(parts, tolerance=0.0008):
    """Tessellate CadQuery objects to a single trimesh.Trimesh (concatenated)."""
    meshes = []
    for i, p in enumerate(parts):
        try:
            shape = p.val() if hasattr(p, "val") else p
            if shape is None:
                continue
            vertices, triangles = shape.tessellate(tolerance)
            if not vertices:
                continue
            verts = np.array([(v.x, v.y, v.z) for v in vertices], dtype=np.float32)
            tris = np.array(triangles, dtype=np.uint32)
            meshes.append(trimesh.Trimesh(vertices=verts, faces=tris))
        except Exception as e:
            print(f"    part {i}: ERR {e}")
            traceback.print_exc()
    if not meshes:
        return None
    if len(meshes) == 1:
        return meshes[0]
    return trimesh.util.concatenate(meshes)


# ════════════════════════════════════════════════════════════════════
# GEOMETRY BUILD — CadQuery objects
# ════════════════════════════════════════════════════════════════════

print("[v2] building geometry…")

# ─── 1. PLINTH BASE (charcoal_brushed) ────────────────────────────────
# X centered, Y from 0 to 40, Z from -200 (front protrusion) to +180 (back-20 to align with body)
# Total depth: 400mm; body back at +190 → plinth from -210 to +190? Let me recenter:
# Plinth depth 400mm, centered such that BACK face matches body BACK face at Z=+190.
# So plinth Z range = [+190 - 400, +190] = [-210, +190]. Body Z range = [-190, +190].
# Plinth protrudes 20mm in front (-210 vs -190).
plinth_z_center = (+190.0 - PLINTH_TOTAL_D / 2.0)  # = -10
plinth_base = (
    cq.Workplane("XY")
    .box(PLINTH_W, PLINTH_TOTAL_D, PLINTH_H)  # X=W, Y=D, Z=H (cq box order)
    .edges("|Z").fillet(OUTER_FILLET)
    .edges(">Z").fillet(PANEL_FILLET)
    .translate((0, plinth_z_center, PLINTH_H / 2.0))
)

# ─── 2. BACK BODY (charcoal_brushed) — L-shape ────────────────────────
# Build full Y[40..380] Z[-190..+190] envelope, then cut frontal-inferior niche.
back_body_envelope = (
    cq.Workplane("XY")
    .box(BACK_W, BACK_D, BACK_H)
    .edges("|Z").fillet(OUTER_FILLET)
    .edges(">Z").fillet(PANEL_FILLET)
    .translate((0, 0, BACK_Y_BASE + BACK_H / 2.0))  # center Y at 210
)

# Niche: the frontal-inferior cut (where group head sits).
# Y[40..200], Z[-190..+10], X full width.
niche_w = BACK_W + 4.0  # over-wide cut for clean boolean
niche_h = NICHE_Y_TOP - BACK_Y_BASE  # 160 mm
niche_d = NICHE_Z_BACK - NICHE_Z_FRONT  # 200 mm
niche_y_center = (BACK_Y_BASE + NICHE_Y_TOP) / 2.0  # 120
niche_z_center = (NICHE_Z_FRONT + NICHE_Z_BACK) / 2.0  # -90
niche_cut = (
    cq.Workplane("XY")
    .box(niche_w, niche_d, niche_h)
    .translate((0, niche_z_center, niche_y_center))
)
back_body = back_body_envelope.cut(niche_cut)

# ─── 3. TOP HOUSING decoy (charcoal_brushed) ──────────────────────────
# Already part of back body geometrically. We make a small overlay solid for
# the anchor node, positioned on the top housing front face.
top_housing_decoy = (
    cq.Workplane("XY")
    .box(TOP_W := 280.0 - 2, 1.0, TOP_Y_TOP - TOP_Y_BASE - 2)
    .translate((0, TOP_Z_FRONT - 0.1, (TOP_Y_BASE + TOP_Y_TOP) / 2.0))
)

# ─── 4. COPPER TOP EDGE (copper_brushed) — perimeter at Y=380 ─────────
# 4 segments: front, back, left, right. Each is a thin bar.
copper_top_y = BACK_Y_TOP + COPPER_EDGE_H / 2.0  # 382
copper_front = (
    cq.Workplane("XY")
    .box(BACK_W + 2 * COPPER_EDGE_W, COPPER_EDGE_W, COPPER_EDGE_H)
    .translate((0, BACK_Z_FRONT - COPPER_EDGE_W / 2.0, copper_top_y))
)
copper_back = (
    cq.Workplane("XY")
    .box(BACK_W + 2 * COPPER_EDGE_W, COPPER_EDGE_W, COPPER_EDGE_H)
    .translate((0, BACK_Z_BACK + COPPER_EDGE_W / 2.0, copper_top_y))
)
copper_left = (
    cq.Workplane("XY")
    .box(COPPER_EDGE_W, BACK_D + 2 * COPPER_EDGE_W, COPPER_EDGE_H)
    .translate((-BACK_W / 2.0 - COPPER_EDGE_W / 2.0, 0, copper_top_y))
)
copper_right = (
    cq.Workplane("XY")
    .box(COPPER_EDGE_W, BACK_D + 2 * COPPER_EDGE_W, COPPER_EDGE_H)
    .translate((BACK_W / 2.0 + COPPER_EDGE_W / 2.0, 0, copper_top_y))
)
copper_top_edge_parts = [copper_front, copper_back, copper_left, copper_right]

# ─── 5. DISPLAY ─────────────────────────────────────────────────────
# Bezel recess (charcoal) + glass (display_glow)
display_bezel = (
    cq.Workplane("XY")
    .box(DISPLAY_W + 2 * DISPLAY_BEZEL_INSET, 2.0, DISPLAY_H + 2 * DISPLAY_BEZEL_INSET)
    .edges("|Y").fillet(1.0)
    .translate((DISPLAY_X, DISPLAY_Z + 1.0, DISPLAY_Y))
)
display_glass = (
    cq.Workplane("XY")
    .box(DISPLAY_W, 1.0, DISPLAY_H)
    .translate((DISPLAY_X, DISPLAY_Z - 0.3, DISPLAY_Y))
)

# ─── 6. PRESSURE GAUGE ASSEMBLY ─────────────────────────────────────
# 4 sub-meshes: bezel(copper), glass front, dial(copper-warm), needle(black)
gauge_bezel = (
    cq.Workplane("XZ")
    .center(GAUGE_X, GAUGE_Y)
    .circle(GAUGE_OUTER / 2.0).extrude(GAUGE_DEPTH)
    .edges(">Y").fillet(2.0)
    .translate((0, GAUGE_Z + GAUGE_DEPTH / 2.0 - 9.0, 0))
)
gauge_dial = (
    cq.Workplane("XZ")
    .center(GAUGE_X, GAUGE_Y)
    .circle(GAUGE_INNER / 2.0).extrude(2.0)
    .translate((0, GAUGE_Z + 4.0, 0))
)
gauge_needle = (
    cq.Workplane("XZ")
    .center(GAUGE_X, GAUGE_Y)
    .rect(GAUGE_NEEDLE_W, GAUGE_NEEDLE_LEN).extrude(0.6)
    .translate((0, GAUGE_Z + 5.5, 0))
    .rotate((GAUGE_X, GAUGE_Z + 5.5, GAUGE_Y),
            (GAUGE_X, GAUGE_Z + 5.5 + 1, GAUGE_Y),
            GAUGE_NEEDLE_ANGLE)
)
gauge_glass = (
    cq.Workplane("XZ")
    .center(GAUGE_X, GAUGE_Y)
    .circle(GAUGE_INNER / 2.0 + 0.5).extrude(0.8)
    .translate((0, GAUGE_Z + 6.5, 0))
)

# ─── 7. CAPACITIVE BUTTONS (×3) ─────────────────────────────────────
# Each: rubber base ring + chrome face + glow material
# rubber_black for ring base, button_glow for surface (icon backlight)
button_bases = []
button_faces = []
for x in BUTTON_POSITIONS_X:
    base = (
        cq.Workplane("XZ")
        .center(x, BUTTON_Y)
        .circle(BUTTON_BASE_DIAM / 2.0).extrude(BUTTON_BASE_H)
        .translate((0, BUTTON_Z + BUTTON_BASE_H / 2.0, 0))
    )
    face = (
        cq.Workplane("XZ")
        .center(x, BUTTON_Y)
        .circle(BUTTON_DIAM / 2.0).extrude(BUTTON_H)
        .edges(">Y").fillet(0.4)
        .translate((0, BUTTON_Z - BUTTON_H / 2.0, 0))
    )
    button_bases.append(base)
    button_faces.append(face)

# ─── 8. GROUP HEAD COLLAR (copper) + chrome disc + socket ───────────
group_head_collar = (
    cq.Workplane("XZ")
    .center(GROUP_X, GROUP_Y)
    .circle(GROUP_COLLAR_DIAM / 2.0).extrude(GROUP_COLLAR_H)
    .edges(">Y").fillet(2.0)
    .translate((0, GROUP_Z + GROUP_COLLAR_H / 2.0 - 11.0, 0))
)
group_head_chrome = (
    cq.Workplane("XZ")
    .center(GROUP_X, GROUP_Y - 12.0)
    .circle(GROUP_CHROME_DIAM / 2.0).extrude(GROUP_CHROME_H)
    .edges(">Y").chamfer(2.0)
    .translate((0, GROUP_Z + 5.0, 0))
)

# ─── 9. PORTAFILTER (chrome head + walnut handle + chrome beak) ─────
portafilter_head = (
    cq.Workplane("XZ")
    .center(PF_X, PF_Y)
    .circle(PF_HEAD_DIAM / 2.0).extrude(PF_HEAD_H)
    .edges(">Y").chamfer(2.0)
    .translate((0, PF_Z + PF_HEAD_H / 2.0 - 12.0, 0))
)
# Handle: cylinder roughly horizontal -X, with chrome collar at root
portafilter_handle_chrome_collar = (
    cq.Workplane("XZ")
    .center(PF_HANDLE_OFFSET_X, PF_Y)
    .circle(PF_HANDLE_ROOT_D / 2.0 + 1.0).extrude(PF_HANDLE_CHROME)
    .translate((0, PF_Z, 0))
    .rotate((PF_HANDLE_OFFSET_X, PF_Z, PF_Y),
            (PF_HANDLE_OFFSET_X, PF_Z, PF_Y + 1),
            90.0)
)
portafilter_handle = (
    cq.Workplane("YZ")
    .center(PF_Z, PF_Y)
    .circle(PF_HANDLE_ROOT_D / 2.0).extrude(PF_HANDLE_LEN)
    .edges(">X").chamfer(3.0)
    .translate((PF_HANDLE_OFFSET_X - PF_HANDLE_LEN, 0, 0))
)
# Spout beak (chrome) — small chevron-like shape under PF head
portafilter_spout_beak = (
    cq.Workplane("XY")
    .box(PF_BEAK_W, PF_BEAK_D, PF_BEAK_THK)
    .edges("|Z").fillet(2.0)
    .translate((0, PF_Z, PF_Y - PF_HEAD_H / 2.0 - 2.0))
)

# ─── 10. STEAM WAND (copper pipe + rubber boot + chrome tip) ────────
# Approximated S-curve as 3 cylindrical segments connected
def cyl_between(p1, p2, radius):
    """Cylinder from p1 to p2 in 3D space."""
    dx, dy, dz = p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]
    length = math.sqrt(dx * dx + dy * dy + dz * dz)
    cyl = (
        cq.Workplane("XY")
        .circle(radius).extrude(length)
        # default extrudes along +Z; align to vector
    )
    # Direction vector
    if length < 1e-6:
        return cyl.translate(p1)
    # Compute rotation: align +Z to (dx,dy,dz)
    nx, ny, nz = dx / length, dy / length, dz / length
    # rotation axis = +Z × (nx,ny,nz) = (-ny, nx, 0)
    # angle = acos(nz)
    angle = math.degrees(math.acos(max(-1.0, min(1.0, nz))))
    if abs(angle) < 0.001:
        return cyl.translate(p1)
    # axis (unnormalized)
    ax, ay, az = -ny, nx, 0.0
    al = math.sqrt(ax * ax + ay * ay)
    if al < 1e-6:
        # angle = 180 → flip Z
        return cyl.rotate((0, 0, 0), (1, 0, 0), 180.0).translate(p2)
    ax, ay = ax / al, ay / al
    cyl = cyl.rotate((0, 0, 0), (ax, ay, az), angle)
    return cyl.translate(p1)


steam_boot = (
    cq.Workplane("XY")
    .circle(STEAM_BOOT_DIAM / 2.0).extrude(STEAM_BOOT_LEN)
    .translate((STEAM_MOUNT_X, STEAM_MOUNT_Z, STEAM_MOUNT_Y - STEAM_BOOT_LEN / 2.0))
)

steam_seg1 = cyl_between(
    (STEAM_MOUNT_X, STEAM_MOUNT_Z, STEAM_MOUNT_Y - 5.0),
    (STEAM_MID_X, STEAM_MID_Z, STEAM_MID_Y),
    STEAM_PIPE_DIAM / 2.0,
)
steam_seg2 = cyl_between(
    (STEAM_MID_X, STEAM_MID_Z, STEAM_MID_Y),
    (STEAM_TIP_X, STEAM_TIP_Z, STEAM_TIP_Y + 8.0),
    STEAM_PIPE_DIAM / 2.0,
)

steam_tip = (
    cq.Workplane("XY")
    .circle(STEAM_TIP_DIAM / 2.0).extrude(14.0)
    .edges("<Z").chamfer(1.0)
    .translate((STEAM_TIP_X, STEAM_TIP_Z, STEAM_TIP_Y))
)

# ─── 11. DRIP TRAY BASIN + GRATE CHEVRON ─────────────────────────────
# Basin (charcoal_brushed for matte ABS look — but per spec it's a separate part)
# In v2 we use chrome_mesh for the grate, charcoal_brushed for the basin.
drip_basin = (
    cq.Workplane("XY")
    .box(DRIP_BASIN_W, DRIP_BASIN_D, DRIP_BASIN_H)
    .edges("|Z").fillet(3.0)
    .translate((DRIP_X, DRIP_Z, DRIP_Y - 3.0))
)
# Chevron grate: array of V-shaped solids on top of the basin (fake overlay).
# Each chevron is two thin rectangular bars meeting at center pointing forward (-Z).
grate_y = DRIP_Y + DRIP_BASIN_H / 2.0 + DRIP_GRATE_THK / 2.0  # ~78
grate_segs = []
total_basin_d = DRIP_BASIN_D
chevron_step_z = total_basin_d / (DRIP_GRATE_CHEVRON_LINES + 1)
for i in range(1, DRIP_GRATE_CHEVRON_LINES + 1):
    z_offset = DRIP_Z - total_basin_d / 2.0 + i * chevron_step_z
    # Left arm of V
    left_arm = (
        cq.Workplane("XY")
        .box(DRIP_BASIN_W * 0.45, 4.0, DRIP_GRATE_THK)
        .translate((DRIP_X - DRIP_BASIN_W * 0.225 + 4.0, z_offset, grate_y))
        .rotate((DRIP_X, z_offset, grate_y),
                (DRIP_X, z_offset, grate_y + 1),
                15.0)
    )
    right_arm = (
        cq.Workplane("XY")
        .box(DRIP_BASIN_W * 0.45, 4.0, DRIP_GRATE_THK)
        .translate((DRIP_X + DRIP_BASIN_W * 0.225 - 4.0, z_offset, grate_y))
        .rotate((DRIP_X, z_offset, grate_y),
                (DRIP_X, z_offset, grate_y + 1),
                -15.0)
    )
    grate_segs.append(left_arm)
    grate_segs.append(right_arm)

# Frame around the grate (steel)
grate_frame_outer = (
    cq.Workplane("XY")
    .box(DRIP_BASIN_W * 0.96, DRIP_BASIN_D * 0.96, DRIP_GRATE_THK)
    .edges("|Z").fillet(2.0)
    .translate((DRIP_X, DRIP_Z, grate_y))
)
grate_frame_inner_cut = (
    cq.Workplane("XY")
    .box(DRIP_BASIN_W * 0.86, DRIP_BASIN_D * 0.86, DRIP_GRATE_THK + 1.0)
    .translate((DRIP_X, DRIP_Z, grate_y))
)
grate_frame = grate_frame_outer.cut(grate_frame_inner_cut)

# ─── 12. CUP WARMER MESH TOP ─────────────────────────────────────────
# Plate base + diamond cross-hatch overlay (fake mesh — array of thin strips)
warmer_plate = (
    cq.Workplane("XY")
    .box(WARMER_W, WARMER_D, WARMER_THK)
    .edges("|Z").fillet(3.0)
    .translate((WARMER_X, WARMER_Z, WARMER_Y - WARMER_THK / 2.0))
)
# Cut tank slot
warmer_tank_cut = (
    cq.Workplane("XY")
    .box(WARMER_TANK_SLOT_W, WARMER_TANK_SLOT_D, WARMER_THK + 2.0)
    .translate((WARMER_X, WARMER_TANK_SLOT_Z, WARMER_Y - WARMER_THK / 2.0))
)
warmer_plate = warmer_plate.cut(warmer_tank_cut)

# Diamond cross-hatch overlay: array of thin bars in 2 directions
warmer_strips = []
hatch_spacing = 14.0
hatch_h = 1.5
hatch_w = 1.5
# Diagonal +45° (X+Z direction)
diag_step = hatch_spacing * math.sqrt(2)
nstrips = int(max(WARMER_W, WARMER_D) / diag_step) + 6
for i in range(-nstrips // 2, nstrips // 2):
    offset = i * diag_step
    strip_a = (
        cq.Workplane("XY")
        .box(min(WARMER_W, WARMER_D) * 1.2, hatch_w, hatch_h)
        .translate((WARMER_X + offset / 1.41, WARMER_Z + offset / 1.41, WARMER_Y + 0.3))
        .rotate((WARMER_X, WARMER_Z, WARMER_Y),
                (WARMER_X, WARMER_Z, WARMER_Y + 1),
                45.0)
    )
    strip_b = (
        cq.Workplane("XY")
        .box(min(WARMER_W, WARMER_D) * 1.2, hatch_w, hatch_h)
        .translate((WARMER_X + offset / 1.41, WARMER_Z - offset / 1.41, WARMER_Y + 0.3))
        .rotate((WARMER_X, WARMER_Z, WARMER_Y),
                (WARMER_X, WARMER_Z, WARMER_Y + 1),
                -45.0)
    )
    warmer_strips.append(strip_a)
    warmer_strips.append(strip_b)

# ─── 13. FEET (×4 rubber) ──────────────────────────────────────────
def foot(x, z):
    return (
        cq.Workplane("XY")
        .circle(FOOT_DIAM / 2.0).extrude(FOOT_H)
        .translate((x, z, FOOT_H / 2.0 - 2.0))
    )

# Foot positions: corners of plinth bottom
foot_x_pos = GLOBAL_W / 2.0 - FOOT_INSET
foot_z_front = -PLINTH_TOTAL_D / 2.0 + plinth_z_center + FOOT_INSET
foot_z_back = +PLINTH_TOTAL_D / 2.0 + plinth_z_center - FOOT_INSET

feet_parts = [
    foot(+foot_x_pos, foot_z_front),
    foot(-foot_x_pos, foot_z_front),
    foot(+foot_x_pos, foot_z_back),
    foot(-foot_x_pos, foot_z_back),
]

print("[v2] geometry build complete")

# ════════════════════════════════════════════════════════════════════
# GROUP BY MATERIAL — keys map to MATERIALS dict
# Each entry has explicit `node_name` for hotspot anchoring (matches data/hotspots.json).
# ════════════════════════════════════════════════════════════════════

# Each scene entry: (node_name, material_key, parts_list)
SCENE_ENTRIES = [
    # Body frames (charcoal_brushed)
    ("plinth_base",         "charcoal_brushed", [plinth_base]),
    ("back_body",           "charcoal_brushed", [back_body]),
    ("top_housing",         "charcoal_brushed", [top_housing_decoy]),
    ("display_bezel_recess","charcoal_brushed", [display_bezel]),
    ("drip_tray_basin",     "charcoal_brushed", [drip_basin]),

    # Copper accents
    ("copper_top_edge",     "copper_brushed",   copper_top_edge_parts),
    ("group_head_collar",   "copper_brushed",   [group_head_collar]),
    ("steam_wand_pipe",     "copper_brushed",   [steam_seg1, steam_seg2]),

    # Chrome mirror parts
    ("group_head_chrome",   "chrome_mirror",    [group_head_chrome]),
    ("portafilter_head",    "chrome_mirror",    [portafilter_head, portafilter_handle_chrome_collar]),
    ("portafilter_spout_beak","chrome_mirror",  [portafilter_spout_beak]),
    ("steam_wand_tip",      "chrome_mirror",    [steam_tip]),

    # Chrome mesh (drip grate + cup warmer)
    ("drip_tray_grate",     "chrome_mesh",      [grate_frame, *grate_segs]),
    ("cup_warmer_mesh",     "chrome_mesh",      [warmer_plate, *warmer_strips]),

    # Walnut
    ("portafilter_handle",  "walnut",           [portafilter_handle]),

    # Display + buttons
    ("display_glass",       "display_glow",     [display_glass]),
    ("capacitive_buttons",  "button_glow",      button_faces),
    ("capacitive_buttons_base","rubber_black",  button_bases),

    # Gauge composite
    ("pressure_gauge_assembly","copper_brushed",[gauge_bezel]),
    ("gauge_dial",          "gauge_dial_copper",[gauge_dial]),
    ("gauge_needle",        "gauge_needle_black",[gauge_needle]),
    ("gauge_glass",         "display_glow",     [gauge_glass]),

    # Steam wand boot
    ("steam_wand_boot",     "rubber_black",     [steam_boot]),

    # Feet
    ("feet",                "rubber_black",     feet_parts),
]

# ════════════════════════════════════════════════════════════════════
# TESSELLATE + ASSEMBLE TRIMESH SCENE
# ════════════════════════════════════════════════════════════════════

print("[v2] tessellating + building scene…")
scene = trimesh.Scene()
total_verts = 0
total_faces = 0

for node_name, mat_key, parts in SCENE_ENTRIES:
    print(f"  → {node_name}  ({mat_key})  parts={len(parts)}")
    mesh = cq_to_mesh(parts)
    if mesh is None or mesh.is_empty:
        print(f"    skip {node_name} (empty)")
        continue
    mat_def = MATERIALS[mat_key]
    try:
        pbr = trimesh.visual.material.PBRMaterial(
            name=mat_def["name"],
            baseColorFactor=mat_def["baseColorFactor"],
            metallicFactor=mat_def["metallicFactor"],
            roughnessFactor=mat_def["roughnessFactor"],
            emissiveFactor=mat_def.get("emissiveFactor", [0, 0, 0]),
            doubleSided=True,
        )
        mesh.visual = trimesh.visual.TextureVisuals(material=pbr)
        # CRITICAL: node_name = anchor used by hotspots.json
        scene.add_geometry(mesh, node_name=node_name, geom_name=node_name)
        total_verts += len(mesh.vertices)
        total_faces += len(mesh.faces)
        print(f"    {len(mesh.vertices)} verts, {len(mesh.faces)} faces")
    except Exception as e:
        print(f"    {node_name}: ERR setting material - {e}")
        traceback.print_exc()

# ════════════════════════════════════════════════════════════════════
# TRANSFORM: mm → meters  +  CadQuery (+Z up internal? we used XY plane so
# vertical was Z) → glTF (+Y up). Our coords already use +Y up internal,
# so we only need scale. But CadQuery .box(W, D, H) produces (X=W, Y=D, Z=H).
# When we .translate((x, z, y)), we put X-axis as X (right), Y-axis as Z (depth back),
# Z-axis as Y (up). So our internal: X=right, Y=back, Z=up.
# For glTF: X=right, Y=up, Z=back (with operator at -Z). So we need swap Y↔Z and
# possibly flip one axis.
# Easier: rotate scene -90° around X to swap Y/Z so that internal Y (back) becomes
# glTF -Z (back, since operator is at -Z means front, +Z is back). Actually:
# internal Y range was -210..+190 (back direction) → becomes glTF +Z (back).
# Let's verify: rotate -90 around X swaps (Y,Z) → (-Z, Y). So internal Y=190
# (back) becomes glTF Z=-190 = front. WRONG.
# Use +90 around X: (Y,Z) → (Z, -Y). Internal Y=190 becomes glTF Z=190 = back. ✓
#                                    Internal Z=380 (top) becomes glTF Y=380. ✓
# ════════════════════════════════════════════════════════════════════

print("[v2] applying transforms…")

import trimesh.transformations as T

# CadQuery internal: X=right, Y=in-plane (mapped to doc's "back direction"), Z=up.
# We translated so that Y values from doc (originally meaning back) are placed as
# CadQuery_Y (negative Y == "front of product" in our internal frame).
# glTF target: X=right, Y=up, Z=front (glTF native: +Z is "forward/front" of the
# asset, which is also the typical camera viewing direction).
#
# Rotation -90° around X axis maps:
#   CadQuery (x, y, z) → glTF (x, z, -y)
# So:
#   CadQuery_Y_negative (front in our internal) → glTF +Z (front in glTF). ✓
#   CadQuery_Z (up) → glTF +Y (up). ✓
rot = T.rotation_matrix(-math.pi / 2, [1, 0, 0])
scene.apply_transform(rot)

# Center vertically: after rotation, glTF Y range is [0..380] (height of model).
# We want it centered on origin so model-viewer auto-frames nicely: Y range [-190..+190].
center_translate = T.translation_matrix([0, -GLOBAL_H / 2.0, 0])
scene.apply_transform(center_translate)

# Scale mm → m
scale = T.scale_matrix(0.001)
scene.apply_transform(scale)

# ════════════════════════════════════════════════════════════════════
# EXPORT
# ════════════════════════════════════════════════════════════════════

TARGET = Path("assets/raw/aurelia-cadquery.glb")
TARGET.parent.mkdir(parents=True, exist_ok=True)
print(f"[v2] exporting → {TARGET}")

try:
    scene.export(str(TARGET))
    size_kb = TARGET.stat().st_size / 1024
    print(f"[v2] wrote {TARGET} ({size_kb:.1f} KB)")
    print(f"[v2] scene geometries: {len(scene.geometry)}")
    print(f"[v2] total: {total_verts} verts, {total_faces} faces")
except Exception as e:
    print(f"[v2] export ERR: {e}")
    traceback.print_exc()
    sys.exit(1)

print("[v2] done")
