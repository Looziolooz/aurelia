"""
AURELIA Pro X1 — GLB CAD-grade v3 reference-faithful
======================================================
Built reading the 18 reference angles in `public/foto 360 gradi/`.

KEY CHANGES vs v2:
  - Per-node UNIQUE PBRMaterial instances (fix trimesh node-dedup bug).
    v2 produced node-names = material-names because trimesh's GLB exporter
    collapses nodes that share a material instance reference. v3 creates a
    fresh PBRMaterial per SCENE_ENTRY so every hotspot anchor name survives
    in the exported glTF. Identical material definitions are then collapsed
    back together by gltf-transform `dedup` post-process.
  - Corrected proportions (H 380 → 320, D 380 → 350).
  - Top face is now FULL chrome-mesh cup-warmer with rectangular tank slot
    cut at the back, matching `dettaglio frontale.png`.
  - Side vents added on right panel (8 horizontal slots).
  - Copper SHELF band (15 mm) between display panel and group-head niche
    instead of the 4 mm edge of v2.
  - Steam wand pipe is now CHROME (was incorrectly copper in v2).
  - Drip tray grate uses horizontal slats + central chevron arrow,
    matching the macro detail in `dettagli singoli.png`.
  - Back panel adds power switch (red), IEC C13 socket, brass water valve.
  - Smaller display (50×35), gauge (38 mm), buttons (8 mm) per macro photos.

HOTSPOT CONTRACT — these node names MUST exist in the exported glTF:
  display_glass, pressure_gauge_assembly, capacitive_buttons,
  group_head_collar, portafilter_handle, steam_wand_pipe,
  cup_warmer_mesh, drip_tray_grate

CONVENTION (internal, mm):
  Origin: center of base footprint on bench
  +X right, +Y depth (back direction is +Y), +Z up
  Final transform: rotate -90° X → glTF (+Y up, +Z towards viewer = front)
  Then translate Y by -H/2 to center, scale × 0.001 to meters.
"""

import math
import sys
import traceback
from pathlib import Path

import cadquery as cq
import trimesh
import numpy as np
import trimesh.transformations as T

# ════════════════════════════════════════════════════════════════════
# MATERIALS (factor-only PBR, linearized sRGB)
# ════════════════════════════════════════════════════════════════════

MATERIALS = {
    "charcoal_brushed": dict(
        baseColorFactor=[0.024, 0.022, 0.020, 1.0],
        metallicFactor=0.85,
        roughnessFactor=0.45,
    ),
    "copper_brushed": dict(
        baseColorFactor=[0.345, 0.140, 0.045, 1.0],
        metallicFactor=1.0,
        roughnessFactor=0.28,
    ),
    "chrome_mirror": dict(
        baseColorFactor=[0.65, 0.65, 0.66, 1.0],
        metallicFactor=1.0,
        roughnessFactor=0.05,
    ),
    "chrome_mesh": dict(
        baseColorFactor=[0.49, 0.49, 0.50, 1.0],
        metallicFactor=1.0,
        roughnessFactor=0.18,
    ),
    "walnut": dict(
        baseColorFactor=[0.105, 0.052, 0.018, 1.0],
        metallicFactor=0.0,
        roughnessFactor=0.55,
    ),
    "rubber_black": dict(
        baseColorFactor=[0.005, 0.005, 0.005, 1.0],
        metallicFactor=0.0,
        roughnessFactor=0.85,
    ),
    "display_glow": dict(
        baseColorFactor=[0.003, 0.003, 0.004, 1.0],
        metallicFactor=0.0,
        roughnessFactor=0.15,
        emissiveFactor=[0.34, 0.18, 0.088],
    ),
    "button_chrome": dict(
        baseColorFactor=[0.55, 0.55, 0.57, 1.0],
        metallicFactor=1.0,
        roughnessFactor=0.20,
    ),
    "gauge_face_white": dict(
        baseColorFactor=[0.78, 0.75, 0.70, 1.0],
        metallicFactor=0.0,
        roughnessFactor=0.40,
    ),
    "gauge_needle_black": dict(
        baseColorFactor=[0.010, 0.010, 0.010, 1.0],
        metallicFactor=0.5,
        roughnessFactor=0.30,
    ),
    "brass_valve": dict(
        baseColorFactor=[0.35, 0.20, 0.04, 1.0],
        metallicFactor=1.0,
        roughnessFactor=0.35,
    ),
    "switch_red": dict(
        baseColorFactor=[0.30, 0.025, 0.025, 1.0],
        metallicFactor=0.0,
        roughnessFactor=0.60,
    ),
}

# ════════════════════════════════════════════════════════════════════
# DIMENSIONS (mm)
# Coord: +X right, +Y back, +Z up   (glTF after transform: +Y up)
# ════════════════════════════════════════════════════════════════════

W = 280.0
H = 320.0
D = 350.0

# Plinth (base)
PLINTH_H = 35.0
PLINTH_D = 360.0  # 10 mm front protrusion
PLINTH_Y_CENTER = +5.0  # protrudes 10 mm forward (-Y) and matches body back

# Body (above plinth)
BODY_Y_BASE = PLINTH_H  # 35
BODY_Y_TOP = H  # 320
BODY_W = W
BODY_D = D

# Copper shelf — horizontal band between front panel and group-head niche
SHELF_H = 15.0  # 15 mm thick band
SHELF_Y_BASE = 165.0
SHELF_Y_TOP = SHELF_Y_BASE + SHELF_H  # 180
SHELF_FRONT_Z_RECESS = 5.0  # the shelf tongue protrudes slightly forward

# Upper front panel (above shelf)
UPPER_PANEL_Y_BASE = SHELF_Y_TOP  # 180
UPPER_PANEL_Y_TOP = H - 5.0  # leave room for copper edge top → 315

# Group-head niche (below shelf, recess into front face)
NICHE_Y_BASE = PLINTH_H  # 35
NICHE_Y_TOP = SHELF_Y_BASE  # 165
NICHE_DEPTH = 90.0  # how far the niche cuts into the body from the front

# Display
DISPLAY_W, DISPLAY_H_SIZE = 50.0, 35.0
DISPLAY_BEZEL_INSET = 2.0
DISPLAY_X = -65.0
DISPLAY_Y = 250.0

# Pressure gauge
GAUGE_OUTER = 38.0
GAUGE_INNER = 30.0
GAUGE_DEPTH = 14.0
GAUGE_BEZEL_THK = 4.0
GAUGE_X = 80.0
GAUGE_Y = 250.0
GAUGE_NEEDLE_LEN = 10.0
GAUGE_NEEDLE_W = 0.8
GAUGE_NEEDLE_ANGLE = -25.0

# 3 capacitive buttons
BUTTON_DIAM = 8.0
BUTTON_BASE_DIAM = 9.5
BUTTON_H_PROFILE = 1.0
BUTTON_BASE_PROFILE = 0.4
BUTTON_Y = 215.0
BUTTON_POSITIONS_X = (-90.0, -65.0, -40.0)

# Group-head + portafilter
GROUP_X = 0.0
GROUP_Y = 110.0
GROUP_Z = -15.0  # height above plinth (Z is up internal)
GROUP_COLLAR_DIAM = 70.0
GROUP_COLLAR_H = 18.0
GROUP_CHROME_DIAM = 60.0
GROUP_CHROME_H = 12.0

# Portafilter
PF_HEAD_DIAM = 65.0
PF_HEAD_H = 22.0
PF_HEAD_Y = 95.0  # forward of group-head
PF_HEAD_Z = 0.0   # below group-head
PF_HANDLE_LEN = 95.0
PF_HANDLE_ROOT_D = 26.0
PF_HANDLE_TIP_D = 22.0
PF_HANDLE_FERRULE_LEN = 10.0
PF_HANDLE_DIR_X = -60.0  # handle extends to -X (operator's left)
PF_BEAK_W = 24.0
PF_BEAK_D = 20.0
PF_BEAK_THK = 4.0

# Steam wand (CHROME) — mounts to right-front of niche, extends forward+down.
# Internal Y NEGATIVE = front of body. Body half-depth is D/2 = 175.
STEAM_PIPE_DIAM = 6.0
STEAM_BOOT_DIAM = 12.0
STEAM_BOOT_LEN = 28.0
STEAM_TIP_DIAM = 9.0
STEAM_MOUNT_X = 110.0   # near right edge, inside the body
STEAM_MOUNT_Y = -85.0   # at niche back wall (front of group-head zone)
STEAM_MOUNT_Z = 130.0   # height: just under copper shelf
# S-curve waypoints (extends forward = -Y, downward = lower Z)
STEAM_MID_X = 130.0
STEAM_MID_Y = -130.0
STEAM_MID_Z = 80.0
STEAM_TIP_X = 130.0
STEAM_TIP_Y = -150.0
STEAM_TIP_Z = 40.0

# Drip tray
DRIP_BASIN_W = 200.0
DRIP_BASIN_H = 30.0
DRIP_BASIN_D = 165.0
DRIP_GRATE_THK = 3.5
DRIP_X = 0.0
DRIP_Y = 50.0  # at front, just in front of the body
DRIP_Z = PLINTH_H + DRIP_BASIN_H / 2.0 - 2.0  # slightly recessed into plinth top

# Cup warmer (full top)
WARMER_INSET = 5.0
WARMER_W = W - 2 * WARMER_INSET  # 270
WARMER_D = D - 2 * WARMER_INSET  # 340
WARMER_THK = 1.5
WARMER_Z = H + WARMER_THK / 2.0
WARMER_TANK_SLOT_W = 80.0
WARMER_TANK_SLOT_D = 28.0
WARMER_TANK_SLOT_Y = +120.0  # at the back

# Side vents (right side panel, mid-depth)
VENT_COUNT = 8
VENT_LEN = 50.0
VENT_THK = 0.6
VENT_HEIGHT = 2.0
VENT_X = W / 2.0 - 0.5   # right face
VENT_Y_CENTER = 30.0     # slightly behind body center (toward back panel)
VENT_Z_TOP = 245.0
VENT_Z_STEP = 7.5

# Back panel
BACK_PANEL_Y = D / 2.0 - 0.5  # back face
PWR_SWITCH_W = 18.0
PWR_SWITCH_H = 11.0
PWR_SWITCH_DEPTH = 4.0
PWR_SWITCH_X = -70.0
PWR_SWITCH_Z = 80.0
IEC_SOCKET_W = 28.0
IEC_SOCKET_H = 14.0
IEC_SOCKET_DEPTH = 4.0
IEC_SOCKET_X = 0.0
IEC_SOCKET_Z = 80.0
WATER_VALVE_DIAM = 7.0
WATER_VALVE_LEN = 12.0
WATER_VALVE_X = 80.0
WATER_VALVE_Z = 80.0

# Feet
FOOT_DIAM = 18.0
FOOT_H = 8.0
FOOT_INSET = 22.0

# Edge fillets
OUTER_FILLET = 6.0
PANEL_FILLET = 1.5

# ════════════════════════════════════════════════════════════════════
# UTILITIES
# ════════════════════════════════════════════════════════════════════

def cq_to_mesh(parts, tolerance=0.0008):
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


def cyl_between(p1, p2, radius):
    """Cylinder bridging two 3D points; aligned along the vector p2-p1."""
    dx, dy, dz = p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]
    length = math.sqrt(dx * dx + dy * dy + dz * dz)
    if length < 1e-6:
        return cq.Workplane("XY").circle(radius).extrude(0.001).translate(p1)
    cyl = cq.Workplane("XY").circle(radius).extrude(length)
    nx, ny, nz = dx / length, dy / length, dz / length
    angle = math.degrees(math.acos(max(-1.0, min(1.0, nz))))
    if abs(angle) < 0.001:
        return cyl.translate(p1)
    if abs(angle - 180.0) < 0.001:
        return cyl.rotate((0, 0, 0), (1, 0, 0), 180.0).translate(p2)
    ax, ay, az = -ny, nx, 0.0
    al = math.sqrt(ax * ax + ay * ay)
    ax, ay = ax / al, ay / al
    cyl = cyl.rotate((0, 0, 0), (ax, ay, az), angle)
    return cyl.translate(p1)


# ════════════════════════════════════════════════════════════════════
# GEOMETRY
# CadQuery box(L, W, H): X=L, Y=W, Z=H. Workplane is XY (Z is up).
# All translates use (x, y, z) with our internal frame.
# ════════════════════════════════════════════════════════════════════

print("[v3] geometry build start")

# ─── 1. PLINTH ──────────────────────────────────────────────────────
plinth = (
    cq.Workplane("XY")
    .box(W, PLINTH_D, PLINTH_H)
    .edges("|Z").fillet(OUTER_FILLET)
    .edges(">Z").fillet(PANEL_FILLET)
    .translate((0, PLINTH_Y_CENTER, PLINTH_H / 2.0))
)

# ─── 2. BODY ENVELOPE then carve niche ──────────────────────────────
body_envelope = (
    cq.Workplane("XY")
    .box(W, D, H - PLINTH_H)
    .edges("|Z").fillet(OUTER_FILLET)
    .edges(">Z").fillet(PANEL_FILLET)
    .translate((0, 0, PLINTH_H + (H - PLINTH_H) / 2.0))
)

# Group-head niche cut (front-lower)
niche_cut_w = W + 4.0
niche_cut_h = NICHE_Y_TOP - NICHE_Y_BASE  # 130
niche_cut_d = NICHE_DEPTH + 2.0
niche_y_center = -D / 2.0 + niche_cut_d / 2.0 - 1.0  # front-aligned cut
niche_z_center = (NICHE_Y_BASE + NICHE_Y_TOP) / 2.0  # 100
niche_cut = (
    cq.Workplane("XY")
    .box(niche_cut_w, niche_cut_d, niche_cut_h)
    .translate((0, niche_y_center, niche_z_center))
)
body_with_niche = body_envelope.cut(niche_cut)

# Split body into "lower" (just above plinth, behind niche) and "upper" (above shelf)
# Use cuts to slice — but simpler: keep as one body and assign single material.
# We'll expose two SCENE entries that are each a slice of the same envelope, so
# the user can target lower/upper with hotspots if they want.
# For simplicity v3 keeps the body as a single mesh under one node:
back_body = body_with_niche

# ─── 3. SIDE VENTS (right side) — recessed slots ────────────────────
# Each vent is a thin rectangular cut into the right face.
side_vent_cuts = []
for i in range(VENT_COUNT):
    z = VENT_Z_TOP - i * VENT_Z_STEP
    cut = (
        cq.Workplane("XY")
        .box(2.0, VENT_LEN, VENT_HEIGHT)
        .translate((W / 2.0 - 0.5, VENT_Y_CENTER, z))
    )
    side_vent_cuts.append(cut)

# Apply vent cuts to body
back_body_vented = back_body
for cut in side_vent_cuts:
    back_body_vented = back_body_vented.cut(cut)

# Back panel inset (visual recess for power-area block, slight 1.5mm offset)
back_inset_cut = (
    cq.Workplane("XY")
    .box(160.0, 1.5, 60.0)
    .translate((0, BACK_PANEL_Y - 0.75, 80.0))
)
back_body_vented = back_body_vented.cut(back_inset_cut)

# ─── 4. COPPER SHELF ────────────────────────────────────────────────
# Horizontal band between niche and upper-panel, slightly protruding forward.
copper_shelf = (
    cq.Workplane("XY")
    .box(W - 4.0, NICHE_DEPTH + SHELF_FRONT_Z_RECESS * 2, SHELF_H)
    .edges("|Z").fillet(2.0)
    .translate((0, niche_y_center, (SHELF_Y_BASE + SHELF_Y_TOP) / 2.0))
)

# ─── 5. CUP WARMER TOP (chrome mesh) ────────────────────────────────
warmer_plate = (
    cq.Workplane("XY")
    .box(WARMER_W, WARMER_D, WARMER_THK)
    .edges("|Z").fillet(3.0)
    .translate((0, 0, WARMER_Z))
)
warmer_tank_cut = (
    cq.Workplane("XY")
    .box(WARMER_TANK_SLOT_W, WARMER_TANK_SLOT_D, WARMER_THK + 1.0)
    .translate((0, WARMER_TANK_SLOT_Y, WARMER_Z))
)
warmer_plate = warmer_plate.cut(warmer_tank_cut)

# Cross-hatch overlay strips (cosmetic mesh detail)
warmer_strips = []
hatch_step = 18.0
n_strips = int(max(WARMER_W, WARMER_D) / hatch_step) + 4
for i in range(-n_strips // 2, n_strips // 2):
    offset = i * hatch_step
    strip_a = (
        cq.Workplane("XY")
        .box(min(WARMER_W, WARMER_D) * 1.1, 1.2, 0.8)
        .translate((offset / 1.41, offset / 1.41, WARMER_Z + 0.6))
        .rotate((0, 0, WARMER_Z + 0.6),
                (0, 0, WARMER_Z + 1.6),
                45.0)
    )
    strip_b = (
        cq.Workplane("XY")
        .box(min(WARMER_W, WARMER_D) * 1.1, 1.2, 0.8)
        .translate((offset / 1.41, -offset / 1.41, WARMER_Z + 0.6))
        .rotate((0, 0, WARMER_Z + 0.6),
                (0, 0, WARMER_Z + 1.6),
                -45.0)
    )
    warmer_strips.append(strip_a)
    warmer_strips.append(strip_b)

# ─── 6. DISPLAY ─────────────────────────────────────────────────────
display_panel_y = -D / 2.0 + 0.5  # at front face (front = -Y)
display_bezel = (
    cq.Workplane("XY")
    .box(DISPLAY_W + 2 * DISPLAY_BEZEL_INSET,
         2.0,
         DISPLAY_H_SIZE + 2 * DISPLAY_BEZEL_INSET)
    .edges("|Y").fillet(0.8)
    .translate((DISPLAY_X, display_panel_y + 1.0, DISPLAY_Y))
)
display_glass = (
    cq.Workplane("XY")
    .box(DISPLAY_W, 0.8, DISPLAY_H_SIZE)
    .translate((DISPLAY_X, display_panel_y - 0.3, DISPLAY_Y))
)

# ─── 7. PRESSURE GAUGE ─────────────────────────────────────────────
gauge_y_face = display_panel_y
gauge_bezel = (
    cq.Workplane("XZ")
    .center(GAUGE_X, GAUGE_Y)
    .circle(GAUGE_OUTER / 2.0).extrude(GAUGE_DEPTH)
    .edges(">Y").fillet(1.5)
    .translate((0, gauge_y_face + GAUGE_DEPTH / 2.0 - 8.0, 0))
)
gauge_face = (
    cq.Workplane("XZ")
    .center(GAUGE_X, GAUGE_Y)
    .circle(GAUGE_INNER / 2.0).extrude(1.5)
    .translate((0, gauge_y_face + 3.5, 0))
)
gauge_needle = (
    cq.Workplane("XZ")
    .center(GAUGE_X, GAUGE_Y)
    .rect(GAUGE_NEEDLE_W, GAUGE_NEEDLE_LEN).extrude(0.5)
    .translate((0, gauge_y_face + 5.0, 0))
    .rotate((GAUGE_X, gauge_y_face + 5.0, GAUGE_Y),
            (GAUGE_X, gauge_y_face + 5.0 + 1, GAUGE_Y),
            GAUGE_NEEDLE_ANGLE)
)
gauge_glass = (
    cq.Workplane("XZ")
    .center(GAUGE_X, GAUGE_Y)
    .circle(GAUGE_INNER / 2.0 + 0.4).extrude(0.6)
    .translate((0, gauge_y_face + 5.8, 0))
)

# ─── 8. CAPACITIVE BUTTONS (×3, chrome — no glow per photos) ─────────
button_faces = []
for x in BUTTON_POSITIONS_X:
    base = (
        cq.Workplane("XZ")
        .center(x, BUTTON_Y)
        .circle(BUTTON_BASE_DIAM / 2.0).extrude(BUTTON_BASE_PROFILE)
        .translate((0, gauge_y_face + 0.4, 0))
    )
    face = (
        cq.Workplane("XZ")
        .center(x, BUTTON_Y)
        .circle(BUTTON_DIAM / 2.0).extrude(BUTTON_H_PROFILE)
        .edges(">Y").fillet(0.3)
        .translate((0, gauge_y_face + 0.9, 0))
    )
    button_faces.append(base)
    button_faces.append(face)

# ─── 9. GROUP HEAD ─────────────────────────────────────────────────
# Position: center-front of body, at the rear of the niche.
group_y = -D / 2.0 + NICHE_DEPTH - 5.0  # 5mm into the niche from its back wall
group_head_collar = (
    cq.Workplane("XZ")
    .center(GROUP_X, NICHE_Y_BASE + 70.0)  # ~half-height of niche
    .circle(GROUP_COLLAR_DIAM / 2.0).extrude(GROUP_COLLAR_H)
    .edges(">Y").fillet(2.0)
    .translate((0, group_y, 0))
)
group_head_chrome = (
    cq.Workplane("XZ")
    .center(GROUP_X, NICHE_Y_BASE + 70.0)
    .circle(GROUP_CHROME_DIAM / 2.0).extrude(GROUP_CHROME_H)
    .edges(">Y").chamfer(1.5)
    .translate((0, group_y - GROUP_COLLAR_H + 4.0, 0))
)

# ─── 10. PORTAFILTER ─────────────────────────────────────────────────
# Portafilter head: chrome cup hanging below group-head chrome.
pf_y_pos = group_y - 4.0  # slightly forward of the group
pf_head = (
    cq.Workplane("XZ")
    .center(GROUP_X, NICHE_Y_BASE + 50.0)
    .circle(PF_HEAD_DIAM / 2.0).extrude(PF_HEAD_H)
    .edges(">Y").chamfer(2.0)
    .translate((0, pf_y_pos + PF_HEAD_H / 2.0 - 6.0, 0))
)

# Walnut handle: cylinder extending to operator's left (-X).
# Built along +Z then rotated to align with -X.
pf_handle = cyl_between(
    (PF_HANDLE_DIR_X, pf_y_pos, NICHE_Y_BASE + 50.0),
    (PF_HANDLE_DIR_X - PF_HANDLE_LEN, pf_y_pos, NICHE_Y_BASE + 50.0),
    PF_HANDLE_ROOT_D / 2.0,
)

# Chrome ferrule (collar between handle and head)
pf_ferrule = cyl_between(
    (PF_HANDLE_DIR_X + 5.0, pf_y_pos, NICHE_Y_BASE + 50.0),
    (PF_HANDLE_DIR_X - PF_HANDLE_FERRULE_LEN, pf_y_pos, NICHE_Y_BASE + 50.0),
    PF_HANDLE_ROOT_D / 2.0 + 1.0,
)

# Spout beak (chrome) — under the head
pf_beak = (
    cq.Workplane("XY")
    .box(PF_BEAK_W, PF_BEAK_D, PF_BEAK_THK)
    .edges("|Z").fillet(1.5)
    .translate((0, pf_y_pos, NICHE_Y_BASE + 50.0 - PF_HEAD_H / 2.0 - 2.0))
)

# ─── 11. STEAM WAND (CHROME) ──────────────────────────────────────
# Boot is a stubby black cylinder where the pipe exits the body.
# Use cyl_between so it aligns with the first segment direction.
steam_boot_p1 = (STEAM_MOUNT_X, STEAM_MOUNT_Y, STEAM_MOUNT_Z)
steam_boot_p2 = (
    STEAM_MOUNT_X + (STEAM_MID_X - STEAM_MOUNT_X) * 0.18,
    STEAM_MOUNT_Y + (STEAM_MID_Y - STEAM_MOUNT_Y) * 0.18,
    STEAM_MOUNT_Z + (STEAM_MID_Z - STEAM_MOUNT_Z) * 0.18,
)
steam_boot = cyl_between(steam_boot_p1, steam_boot_p2, STEAM_BOOT_DIAM / 2.0)

# Two-segment S-curve pipe
steam_seg1 = cyl_between(
    steam_boot_p2,
    (STEAM_MID_X, STEAM_MID_Y, STEAM_MID_Z),
    STEAM_PIPE_DIAM / 2.0,
)
steam_seg2 = cyl_between(
    (STEAM_MID_X, STEAM_MID_Y, STEAM_MID_Z),
    (STEAM_TIP_X, STEAM_TIP_Y, STEAM_TIP_Z),
    STEAM_PIPE_DIAM / 2.0,
)

# Tip diffuser — small cylinder at the tip, slightly larger
steam_tip = cyl_between(
    (STEAM_TIP_X, STEAM_TIP_Y, STEAM_TIP_Z),
    (STEAM_TIP_X, STEAM_TIP_Y, STEAM_TIP_Z - 12.0),
    STEAM_TIP_DIAM / 2.0,
)

# ─── 12. DRIP TRAY ─────────────────────────────────────────────────
drip_basin = (
    cq.Workplane("XY")
    .box(DRIP_BASIN_W, DRIP_BASIN_D, DRIP_BASIN_H)
    .edges("|Z").fillet(2.5)
    .translate((DRIP_X, DRIP_Y - D / 2.0 + DRIP_BASIN_D / 2.0, DRIP_Z))
)

# Grate: frame + horizontal slats + central chevron arrow
grate_y_top = DRIP_Z + DRIP_BASIN_H / 2.0 + DRIP_GRATE_THK / 2.0
drip_y_center = DRIP_Y - D / 2.0 + DRIP_BASIN_D / 2.0
grate_frame_outer = (
    cq.Workplane("XY")
    .box(DRIP_BASIN_W * 0.96, DRIP_BASIN_D * 0.96, DRIP_GRATE_THK)
    .edges("|Z").fillet(1.5)
    .translate((DRIP_X, drip_y_center, grate_y_top))
)
grate_frame_inner_cut = (
    cq.Workplane("XY")
    .box(DRIP_BASIN_W * 0.86, DRIP_BASIN_D * 0.86, DRIP_GRATE_THK + 1.0)
    .translate((DRIP_X, drip_y_center, grate_y_top))
)
grate_frame = grate_frame_outer.cut(grate_frame_inner_cut)

# Horizontal slats (parallel to X axis, spaced along Y)
grate_slats = []
slat_count = 9
slat_spacing = (DRIP_BASIN_D * 0.86) / (slat_count + 1)
for i in range(slat_count):
    y_off = -DRIP_BASIN_D * 0.43 + (i + 1) * slat_spacing
    slat = (
        cq.Workplane("XY")
        .box(DRIP_BASIN_W * 0.84, 1.5, DRIP_GRATE_THK)
        .translate((DRIP_X, drip_y_center + y_off, grate_y_top))
    )
    grate_slats.append(slat)

# Central chevron arrow (two arms meeting at center, pointing forward -Y)
chevron_arms = []
for sign in (-1, 1):
    arm = (
        cq.Workplane("XY")
        .box(DRIP_BASIN_W * 0.42, 2.0, DRIP_GRATE_THK)
        .translate((DRIP_X + sign * DRIP_BASIN_W * 0.18, drip_y_center, grate_y_top + 0.2))
        .rotate((DRIP_X, drip_y_center, grate_y_top),
                (DRIP_X, drip_y_center, grate_y_top + 1),
                sign * 18.0)
    )
    chevron_arms.append(arm)

# ─── 13. BACK PANEL components ──────────────────────────────────────
back_y_face = D / 2.0 - 0.5
pwr_switch = (
    cq.Workplane("XY")
    .box(PWR_SWITCH_W, PWR_SWITCH_DEPTH, PWR_SWITCH_H)
    .edges("|Y").fillet(1.0)
    .translate((PWR_SWITCH_X, back_y_face - PWR_SWITCH_DEPTH / 2.0, PWR_SWITCH_Z))
)
iec_socket = (
    cq.Workplane("XY")
    .box(IEC_SOCKET_W, IEC_SOCKET_DEPTH, IEC_SOCKET_H)
    .edges("|Y").fillet(1.5)
    .translate((IEC_SOCKET_X, back_y_face - IEC_SOCKET_DEPTH / 2.0, IEC_SOCKET_Z))
)
water_valve = cyl_between(
    (WATER_VALVE_X, back_y_face - 0.5, WATER_VALVE_Z),
    (WATER_VALVE_X, back_y_face + WATER_VALVE_LEN, WATER_VALVE_Z),
    WATER_VALVE_DIAM / 2.0,
)

# ─── 14. FEET (×4) ──────────────────────────────────────────────────
def foot(x, y):
    return (
        cq.Workplane("XY")
        .circle(FOOT_DIAM / 2.0).extrude(FOOT_H)
        .translate((x, y, FOOT_H / 2.0 - 2.0))
    )

foot_x_off = W / 2.0 - FOOT_INSET
foot_y_front = -PLINTH_D / 2.0 + PLINTH_Y_CENTER + FOOT_INSET
foot_y_back = +PLINTH_D / 2.0 + PLINTH_Y_CENTER - FOOT_INSET
feet_parts = [
    foot(+foot_x_off, foot_y_front),
    foot(-foot_x_off, foot_y_front),
    foot(+foot_x_off, foot_y_back),
    foot(-foot_x_off, foot_y_back),
]

print("[v3] geometry build complete")

# ════════════════════════════════════════════════════════════════════
# SCENE_ENTRIES — node_name MUST match data/hotspots.json anchors
# ════════════════════════════════════════════════════════════════════

SCENE_ENTRIES = [
    # Body (charcoal_brushed)
    ("plinth_base",            "charcoal_brushed", [plinth]),
    ("back_body",              "charcoal_brushed", [back_body_vented]),
    ("display_bezel_recess",   "charcoal_brushed", [display_bezel]),
    ("drip_tray_basin",        "charcoal_brushed", [drip_basin]),

    # Copper accents
    ("copper_shelf",           "copper_brushed",   [copper_shelf]),
    ("group_head_collar",      "copper_brushed",   [group_head_collar]),
    ("pressure_gauge_assembly","copper_brushed",   [gauge_bezel]),

    # Chrome mirror
    ("group_head_chrome",      "chrome_mirror",    [group_head_chrome]),
    ("portafilter_head",       "chrome_mirror",    [pf_head, pf_ferrule]),
    ("portafilter_spout_beak", "chrome_mirror",    [pf_beak]),
    ("steam_wand_pipe",        "chrome_mirror",    [steam_seg1, steam_seg2]),
    ("steam_wand_tip",         "chrome_mirror",    [steam_tip]),

    # Chrome mesh (drip grate + cup warmer)
    ("drip_tray_grate",        "chrome_mesh",      [grate_frame, *grate_slats, *chevron_arms]),
    ("cup_warmer_mesh",        "chrome_mesh",      [warmer_plate, *warmer_strips]),

    # Walnut
    ("portafilter_handle",     "walnut",           [pf_handle]),

    # Display + buttons
    ("display_glass",          "display_glow",     [display_glass]),
    ("capacitive_buttons",     "button_chrome",    button_faces),

    # Gauge composite
    ("gauge_face",             "gauge_face_white", [gauge_face]),
    ("gauge_needle",           "gauge_needle_black",[gauge_needle]),
    ("gauge_glass",            "display_glow",     [gauge_glass]),

    # Back panel
    ("back_power_switch",      "switch_red",       [pwr_switch]),
    ("back_iec_socket",        "rubber_black",     [iec_socket]),
    ("back_water_valve",       "brass_valve",      [water_valve]),

    # Steam wand boot
    ("steam_wand_boot",        "rubber_black",     [steam_boot]),

    # Feet
    ("feet",                   "rubber_black",     feet_parts),
]

# ════════════════════════════════════════════════════════════════════
# TESSELLATE + ASSEMBLE SCENE
# CRITICAL: each entry gets its OWN PBRMaterial instance so trimesh
# does NOT collapse nodes that share a material reference. The exported
# glTF has duplicate material defs which gltf-transform `dedup` will
# collapse later — but the per-node identity is preserved.
# ════════════════════════════════════════════════════════════════════

print("[v3] tessellating + scene assembly")
scene = trimesh.Scene()
total_verts = 0
total_faces = 0
exported_nodes = []

for node_name, mat_key, parts in SCENE_ENTRIES:
    print(f"  → {node_name}  ({mat_key})  parts={len(parts)}")
    mesh = cq_to_mesh(parts)
    if mesh is None or mesh.is_empty:
        print(f"    skip {node_name} (empty)")
        continue
    mat_def = MATERIALS[mat_key]
    try:
        pbr = trimesh.visual.material.PBRMaterial(
            name=f"{mat_key}__{node_name}",
            baseColorFactor=mat_def["baseColorFactor"],
            metallicFactor=mat_def["metallicFactor"],
            roughnessFactor=mat_def["roughnessFactor"],
            emissiveFactor=mat_def.get("emissiveFactor", [0, 0, 0]),
            doubleSided=True,
        )
        mesh.visual = trimesh.visual.TextureVisuals(material=pbr)
        scene.add_geometry(mesh, node_name=node_name, geom_name=node_name)
        exported_nodes.append(node_name)
        total_verts += len(mesh.vertices)
        total_faces += len(mesh.faces)
        print(f"    {len(mesh.vertices)} verts, {len(mesh.faces)} faces")
    except Exception as e:
        print(f"    {node_name}: ERR {e}")
        traceback.print_exc()

# Hotspot contract verification
HOTSPOT_ANCHORS = {
    "display_glass",
    "pressure_gauge_assembly",
    "capacitive_buttons",
    "group_head_collar",
    "portafilter_handle",
    "steam_wand_pipe",
    "cup_warmer_mesh",
    "drip_tray_grate",
}
present = set(exported_nodes)
missing = HOTSPOT_ANCHORS - present
if missing:
    print(f"[v3] WARNING — hotspot anchors missing: {missing}")
else:
    print(f"[v3] hotspot contract OK — all 8 anchors present")

# ════════════════════════════════════════════════════════════════════
# TRANSFORM: internal (mm, +Z up) → glTF (m, +Y up, +Z front)
#   rotation -90° around X:  (x, y, z) → (x, z, -y)
#   center vertically:       Y -= H/2 (after rotation, our up is Y)
#   scale:                   × 0.001
# ════════════════════════════════════════════════════════════════════

print("[v3] applying transforms")
rot = T.rotation_matrix(-math.pi / 2, [1, 0, 0])
scene.apply_transform(rot)
center_translate = T.translation_matrix([0, -H / 2.0, 0])
scene.apply_transform(center_translate)
scale_m = T.scale_matrix(0.001)
scene.apply_transform(scale_m)

# ════════════════════════════════════════════════════════════════════
# EXPORT
# ════════════════════════════════════════════════════════════════════

TARGET = Path("assets/raw/aurelia-cadquery-v3.glb")
TARGET.parent.mkdir(parents=True, exist_ok=True)
print(f"[v3] exporting → {TARGET}")

try:
    scene.export(str(TARGET))
    size_kb = TARGET.stat().st_size / 1024
    print(f"[v3] wrote {TARGET} ({size_kb:.1f} KB)")
    print(f"[v3] scene geometries: {len(scene.geometry)}")
    print(f"[v3] total: {total_verts} verts, {total_faces} faces")
    print(f"[v3] exported nodes: {len(exported_nodes)}")
except Exception as e:
    print(f"[v3] export ERR: {e}")
    traceback.print_exc()
    sys.exit(1)

print("[v3] done")
