"""
AURELIA Pro X1 — MVP scheletro v2 (diagnostic).
3 box (plinth, back_body, top_housing) + 8 placeholder spheres at anchor positions.
Use to verify cadquery+trimesh runtime before adding component detail.
"""

import math
import sys
import traceback
from pathlib import Path

import cadquery as cq
import trimesh
import numpy as np
import trimesh.transformations as T

print("[mvp] start")

# Materials
M_BODY = dict(
    name="AURELIA_CharcoalBrushed",
    baseColorFactor=[0.024, 0.022, 0.020, 1.0],
    metallicFactor=0.85, roughnessFactor=0.45,
)
M_ANCHOR = dict(
    name="AURELIA_AnchorTest",
    baseColorFactor=[0.345, 0.140, 0.045, 1.0],  # copper for visibility
    metallicFactor=1.0, roughnessFactor=0.28,
)

# Dimensions (mm). Convention internal: CadQuery default (Z up). Doc Z (back) maps
# to CadQuery -Y so that "front" in product is +Y in CadQuery, then rotation -90°
# around X at export gives glTF Y up + Z front (glTF native).
GLOBAL_W, GLOBAL_H = 280.0, 380.0
PLINTH_W, PLINTH_H = 280.0, 40.0
PLINTH_TOTAL_D = 400.0
BACK_W, BACK_H, BACK_D = 280.0, 340.0, 380.0
TOP_W, TOP_H, TOP_D = 280.0, 130.0, 200.0

# Plinth: centered Y(=internal back direction) so back face aligns with body back at Y=-190
plinth_y_center = -190.0 + PLINTH_TOTAL_D / 2.0  # = +10 (means slightly forward of body Y center)
plinth_base = (
    cq.Workplane("XY")
    .box(PLINTH_W, PLINTH_TOTAL_D, PLINTH_H)
    .edges("|Z").fillet(8.0)
    .translate((0, plinth_y_center, PLINTH_H / 2.0))
)

# Back body: simple block, no niche cut (MVP)
back_body = (
    cq.Workplane("XY")
    .box(BACK_W, BACK_D, BACK_H)
    .edges("|Z").fillet(8.0)
    .translate((0, 0, 40 + BACK_H / 2.0))  # Y centered at 0 (range -190..+190), Z top edge at 380
)

# Top housing decoy: small thin solid for anchor on the front face.
# Front face of body is at CadQuery_Y = -190 (since +Y = front-back in our internal map,
# negative = front). Place top housing decoy at Y=-190.
top_housing_decoy = (
    cq.Workplane("XY")
    .box(TOP_W - 4, 1.0, TOP_H - 4)
    .translate((0, -BACK_D / 2.0 - 0.5, 200 + TOP_H / 2.0))  # Y = -190.5, Z = 265
)

# 8 placeholder anchor spheres at the doc-spec anchor positions.
# Doc convention: front Z = -191 (e.g. display). In our internal: front = -Y, so
# doc_Z = -191 means CadQuery_Y = -(-191) = +191. WRONG — front should be -190 in
# our internal. Conversion: CadQuery_Y = -doc_Z. doc_Z=-191 → CadQuery_Y = +191. ✗
#
# Wait. Doc says front is at Z = negative values. We map doc_Z → CadQuery -Y. So
# doc_Z=-191 (front) → CadQuery -Y = -191 means CadQuery_Y = +191. But we want
# front at CadQuery_Y = -190 (where body front face is).
#
# Conclusion: CadQuery_Y = +doc_Z (NO sign flip). doc_Z=-191 → CadQuery_Y=-191.
# Doc front at -191 → CadQuery front face at -191. Body front face at -190. Match (1mm proud).
#
# So mapping is: CadQuery_X = doc_X, CadQuery_Y = doc_Z, CadQuery_Z = doc_Y. Direct copy.

anchors = [
    # (node_name, doc_x, doc_y_up, doc_z_back)  → CadQuery (x, z, y)
    ("display_glass",            -55.0, 285.0, -191.0),
    ("pressure_gauge_assembly",   75.0, 285.0, -191.0),
    ("capacitive_buttons",       -55.0, 235.0, -190.0),
    ("group_head_collar",          0.0, 175.0, -150.0),
    ("portafilter_handle",       -60.0, 145.0, -150.0),
    ("steam_wand_pipe",          110.0,  60.0, -160.0),
    ("cup_warmer_mesh",            0.0, 380.0,  -50.0),
    ("drip_tray_grate",            0.0,  60.0, -195.0),
]

anchor_solids = []
for name, x, y_up, y_back in anchors:
    s = (
        cq.Workplane("XY")
        .sphere(8.0)
        .translate((x, y_back, y_up))  # CadQuery: X=x, Y=doc_Z=y_back, Z=doc_Y=y_up
    )
    anchor_solids.append((name, s))

print("[mvp] geometry built")

# Tessellate + assemble scene
def cq_to_mesh(part, tol=0.001):
    shape = part.val() if hasattr(part, "val") else part
    verts, tris = shape.tessellate(tol)
    v = np.array([(p.x, p.y, p.z) for p in verts], dtype=np.float32)
    t = np.array(tris, dtype=np.uint32)
    return trimesh.Trimesh(vertices=v, faces=t)

def add_to_scene(scene, name, part, mat_def):
    try:
        m = cq_to_mesh(part)
        if m is None or m.is_empty:
            print(f"  [{name}] skip (empty)")
            return
        pbr = trimesh.visual.material.PBRMaterial(
            name=mat_def["name"],
            baseColorFactor=mat_def["baseColorFactor"],
            metallicFactor=mat_def["metallicFactor"],
            roughnessFactor=mat_def["roughnessFactor"],
            doubleSided=True,
        )
        m.visual = trimesh.visual.TextureVisuals(material=pbr)
        scene.add_geometry(m, node_name=name, geom_name=name)
        print(f"  [{name}] {len(m.vertices)}v {len(m.faces)}f")
    except Exception as e:
        print(f"  [{name}] ERR: {e}")
        traceback.print_exc()

scene = trimesh.Scene()
add_to_scene(scene, "plinth_base", plinth_base, M_BODY)
add_to_scene(scene, "back_body", back_body, M_BODY)
add_to_scene(scene, "top_housing", top_housing_decoy, M_BODY)
for name, s in anchor_solids:
    add_to_scene(scene, name, s, M_ANCHOR)

print("[mvp] applying transforms")

# CadQuery (X, Y, Z) where Y = doc back direction (negative = front of product), Z = up
# → glTF (X, Y_up=CadQuery_Z, Z_front=−CadQuery_Y so doc_Z negative → glTF_Z positive front)
# rotation -90° around X: (x,y,z) → (x, z, -y)
rot = T.rotation_matrix(-math.pi / 2, [1, 0, 0])
scene.apply_transform(rot)

# Center: after rotation, Y range was 0..380 (CadQuery_Z=up), now glTF_Y = 0..380. Center on origin: -190.
center_translate = T.translation_matrix([0, -GLOBAL_H / 2.0, 0])
scene.apply_transform(center_translate)

# mm → m
scale = T.scale_matrix(0.001)
scene.apply_transform(scale)

TARGET = Path("assets/raw/aurelia-mvp.glb")
TARGET.parent.mkdir(parents=True, exist_ok=True)
print(f"[mvp] export → {TARGET}")
scene.export(str(TARGET))
size_kb = TARGET.stat().st_size / 1024
print(f"[mvp] wrote {TARGET} ({size_kb:.1f} KB), geometries={len(scene.geometry)}")
print("[mvp] done")
