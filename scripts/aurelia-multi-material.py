# scripts/aurelia-multi-material.py
#
# AURELIA Pro X1 — Blender multi-material assignment toolkit
# ==========================================================
# Questo script richiede BLENDER 4.x installato (gratuito su blender.org).
# Apre il GLB esistente, crea 9 materiali PBR brand-coerenti,
# fa una pre-assegnazione automatica per regioni di altezza,
# e installa un pannello laterale "AURELIA" in 3D View per
# rifinire manualmente le assegnazioni in Edit Mode.
#
# In alternativa, vedi `scripts/multi-material-by-height.mjs` che replica
# la logica auto-tag-by-regions in Node (senza Blender) per pipeline
# completamente automatizzata.
#
# COME USARE:
# 1. Apri Blender 4.x (gratuito su blender.org)
# 2. File → Open → seleziona aurelia-prox1.glb
#    (oppure Import → glTF 2.0 se parti da scena vuota)
# 3. Scripting tab → "Open" → seleziona questo file → "Run Script"
#    Oppure: spazio "Text Editor" → New → incolla → Alt+P
# 4. Premi N nel viewport per aprire la sidebar → tab "AURELIA"
# 5. Tab → vai in Edit Mode (Tab) → Face Select Mode (3)
# 6. Seleziona le facce (L per linked, B per box-select, click+shift)
# 7. Click sul materiale corrispondente nel pannello
# 8. Ripeti per ogni regione del modello
# 9. Click "Export Optimized GLB" quando hai finito
#
# REQUISITI: Blender 4.0+ (testato su 4.2 LTS)
# OUTPUT: aurelia-prox1-textured.glb (con .webp embedded)

import bpy
import bmesh
import os
from mathutils import Vector

# ============================================================
# CONFIG
# ============================================================

OUTPUT_FILENAME = "aurelia-prox1-textured.glb"
OUTPUT_DIRECTORY = ""

# ============================================================
# COLORI BRAND AURELIA (sRGB lineare-corretti)
# ============================================================

BRAND = {
    "ink_charcoal":  (0.025, 0.025, 0.030),
    "ink_warm":      (0.020, 0.018, 0.014),
    "steel_brushed": (0.55,  0.55,  0.57),
    "copper_warm":   (0.78,  0.32,  0.10),
    "chrome_mirror": (0.85,  0.85,  0.88),
    "walnut_base":   (0.18,  0.09,  0.04),
    "walnut_light":  (0.32,  0.18,  0.09),
    "white_enamel":  (0.85,  0.83,  0.78),
    "display_off":   (0.04,  0.04,  0.05),
    "display_glow":  (0.95,  0.55,  0.28),
    "rubber_black":  (0.015, 0.015, 0.015),
}


def _principled(name, base_color, metallic=0.0, roughness=0.5,
                emission=None, emission_strength=0.0, ior=1.45):
    mat = bpy.data.materials.get(name)
    if mat:
        bpy.data.materials.remove(mat)
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    p = nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = (*base_color, 1.0)
    p.inputs["Metallic"].default_value = metallic
    p.inputs["Roughness"].default_value = roughness
    p.inputs["IOR"].default_value = ior
    if emission:
        if "Emission Color" in p.inputs:
            p.inputs["Emission Color"].default_value = (*emission, 1.0)
            p.inputs["Emission Strength"].default_value = emission_strength
        else:
            p.inputs["Emission"].default_value = (*emission, 1.0)
    return mat


def create_walnut_wood():
    name = "AURELIA_Walnut"
    mat = bpy.data.materials.get(name)
    if mat:
        bpy.data.materials.remove(mat)
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    nodes = nt.nodes
    links = nt.links
    nodes.clear()

    out = nodes.new("ShaderNodeOutputMaterial")
    out.location = (600, 0)
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (300, 0)
    bsdf.inputs["Roughness"].default_value = 0.55
    bsdf.inputs["Metallic"].default_value = 0.0

    coord = nodes.new("ShaderNodeTexCoord"); coord.location = (-1100, 0)
    mapping = nodes.new("ShaderNodeMapping"); mapping.location = (-900, 0)
    mapping.inputs["Scale"].default_value = (8.0, 1.5, 8.0)

    noise = nodes.new("ShaderNodeTexNoise"); noise.location = (-650, 0)
    noise.inputs["Scale"].default_value = 4.0
    noise.inputs["Detail"].default_value = 8.0
    noise.inputs["Roughness"].default_value = 0.6
    noise.inputs["Distortion"].default_value = 1.5

    wave = nodes.new("ShaderNodeTexWave"); wave.location = (-650, -200)
    wave.wave_type = 'BANDS'
    wave.bands_direction = 'X'
    wave.inputs["Scale"].default_value = 6.0
    wave.inputs["Distortion"].default_value = 12.0
    wave.inputs["Detail"].default_value = 4.0

    mix_pattern = nodes.new("ShaderNodeMix")
    mix_pattern.data_type = 'FLOAT'
    mix_pattern.location = (-400, -100)
    mix_pattern.inputs[0].default_value = 0.7

    ramp = nodes.new("ShaderNodeValToRGB"); ramp.location = (-150, 0)
    ramp.color_ramp.elements[0].position = 0.25
    ramp.color_ramp.elements[0].color = (*BRAND["walnut_base"], 1.0)
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[1].color = (*BRAND["walnut_light"], 1.0)

    bump = nodes.new("ShaderNodeBump"); bump.location = (50, -250)
    bump.inputs["Strength"].default_value = 0.15

    links.new(coord.outputs["Object"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    links.new(mapping.outputs["Vector"], wave.inputs["Vector"])
    links.new(noise.outputs["Fac"], mix_pattern.inputs[2])
    links.new(wave.outputs["Fac"], mix_pattern.inputs[3])
    links.new(mix_pattern.outputs["Result"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def create_brushed_steel():
    name = "AURELIA_BrushedSteel"
    mat = bpy.data.materials.get(name)
    if mat:
        bpy.data.materials.remove(mat)
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    nodes = nt.nodes
    links = nt.links
    p = nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = (*BRAND["steel_brushed"], 1.0)
    p.inputs["Metallic"].default_value = 1.0
    p.inputs["Roughness"].default_value = 0.32

    coord = nodes.new("ShaderNodeTexCoord"); coord.location = (-900, -200)
    mapping = nodes.new("ShaderNodeMapping"); mapping.location = (-700, -200)
    mapping.inputs["Scale"].default_value = (60.0, 2.0, 1.0)
    noise = nodes.new("ShaderNodeTexNoise"); noise.location = (-500, -200)
    noise.inputs["Scale"].default_value = 30.0
    noise.inputs["Detail"].default_value = 2.0
    ramp = nodes.new("ShaderNodeValToRGB"); ramp.location = (-300, -200)
    ramp.color_ramp.elements[0].position = 0.4
    ramp.color_ramp.elements[1].position = 0.6
    ramp.color_ramp.elements[0].color = (0.28, 0.28, 0.28, 1.0)
    ramp.color_ramp.elements[1].color = (0.38, 0.38, 0.38, 1.0)
    links.new(coord.outputs["Object"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], p.inputs["Roughness"])
    return mat


def setup_all_materials():
    materials = {}
    materials["body"] = _principled("AURELIA_BodyMatte", BRAND["ink_charcoal"], 0.0, 0.62)
    materials["body_warm"] = _principled("AURELIA_BodyWarm", BRAND["ink_warm"], 0.0, 0.55)
    materials["steel"] = create_brushed_steel()
    materials["copper"] = _principled("AURELIA_Copper", BRAND["copper_warm"], 1.0, 0.18)
    materials["chrome"] = _principled("AURELIA_Chrome", BRAND["chrome_mirror"], 1.0, 0.04)
    materials["walnut"] = create_walnut_wood()
    materials["rubber"] = _principled("AURELIA_RubberBlack", BRAND["rubber_black"], 0.0, 0.78)
    materials["enamel"] = _principled("AURELIA_WhiteEnamel", BRAND["white_enamel"], 0.0, 0.28)
    materials["display"] = _principled("AURELIA_DisplayGlow", BRAND["display_off"],
                                        0.0, 0.18, BRAND["display_glow"], 2.5)
    return materials


def get_or_join_target():
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not meshes:
        return None
    if len(meshes) == 1:
        return meshes[0]
    print(f"[AURELIA] {len(meshes)} mesh trovate, joining…")
    bpy.ops.object.select_all(action='DESELECT')
    for m in meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    return bpy.context.active_object


def auto_tag_by_regions(obj, materials):
    mesh = obj.data
    obj.data.materials.clear()
    order = ["body", "body_warm", "steel", "copper", "chrome",
             "walnut", "rubber", "enamel", "display"]
    for key in order:
        obj.data.materials.append(materials[key])
    idx = {key: i for i, key in enumerate(order)}

    coords = [v.co for v in mesh.vertices]
    if not coords:
        return
    range_y = max(c.y for c in coords) - min(c.y for c in coords)
    range_z = max(c.z for c in coords) - min(c.z for c in coords)
    range_x = max(c.x for c in coords) - min(c.x for c in coords)
    if range_z >= range_y and range_z >= range_x:
        up_axis = 2
    elif range_y >= range_x:
        up_axis = 1
    else:
        up_axis = 2
    print(f"[AURELIA] Asse up rilevato: {'XYZ'[up_axis]}")

    min_v = min(c[up_axis] for c in coords)
    max_v = max(c[up_axis] for c in coords)
    height = max_v - min_v
    if height < 0.001:
        return

    bands = [
        (0.00, 0.04, "rubber"),
        (0.04, 0.10, "body"),
        (0.10, 0.16, "chrome"),
        (0.16, 0.50, "steel"),
        (0.50, 0.92, "body"),
        (0.92, 1.00, "copper"),
    ]
    for poly in mesh.polygons:
        avg = sum(mesh.vertices[v].co[up_axis] for v in poly.vertices) / len(poly.vertices)
        rel = (avg - min_v) / height
        assigned = False
        for lo, hi, key in bands:
            if lo <= rel < hi:
                poly.material_index = idx[key]
                assigned = True
                break
        if not assigned:
            poly.material_index = idx["body"]
    print(f"[AURELIA] Pre-assegnazione completata su {len(mesh.polygons)} facce.")


class AURELIA_OT_assign(bpy.types.Operator):
    bl_idname = "aurelia.assign"
    bl_label = "Assign material"
    bl_options = {'REGISTER', 'UNDO'}
    mat_name: bpy.props.StringProperty()

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Nessuna mesh attiva")
            return {'CANCELLED'}
        mat = bpy.data.materials.get(self.mat_name)
        if not mat:
            self.report({'ERROR'}, f"Materiale {self.mat_name} non trovato")
            return {'CANCELLED'}
        slot = -1
        for i, s in enumerate(obj.material_slots):
            if s.material == mat:
                slot = i
                break
        if slot == -1:
            obj.data.materials.append(mat)
            slot = len(obj.material_slots) - 1
        obj.active_material_index = slot
        if obj.mode != 'EDIT':
            self.report({'WARNING'}, "Devi essere in Edit Mode → Face Select")
            return {'CANCELLED'}
        bpy.ops.object.material_slot_assign()
        return {'FINISHED'}


class AURELIA_OT_export(bpy.types.Operator):
    bl_idname = "aurelia.export"
    bl_label = "Export Optimized GLB"

    def execute(self, context):
        if OUTPUT_DIRECTORY:
            out_dir = OUTPUT_DIRECTORY
        elif bpy.data.filepath:
            out_dir = os.path.dirname(bpy.data.filepath)
        else:
            out_dir = bpy.app.tempdir
        path = os.path.join(out_dir, OUTPUT_FILENAME)
        bpy.ops.object.select_all(action='SELECT')
        try:
            bpy.ops.export_scene.gltf(
                filepath=path, export_format='GLB',
                export_image_format='WEBP', export_image_quality=85,
                export_yup=True, export_apply=True,
                export_materials='EXPORT', export_extras=False,
                export_lights=False, export_cameras=False,
            )
        except Exception as e:
            self.report({'ERROR'}, f"Export fallito: {e}")
            return {'CANCELLED'}
        self.report({'INFO'}, f"Esportato: {path}")
        return {'FINISHED'}


class AURELIA_OT_reauto(bpy.types.Operator):
    bl_idname = "aurelia.reauto"
    bl_label = "Re-run auto-tag"

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Nessuna mesh attiva")
            return {'CANCELLED'}
        materials = {
            "body": bpy.data.materials.get("AURELIA_BodyMatte"),
            "body_warm": bpy.data.materials.get("AURELIA_BodyWarm"),
            "steel": bpy.data.materials.get("AURELIA_BrushedSteel"),
            "copper": bpy.data.materials.get("AURELIA_Copper"),
            "chrome": bpy.data.materials.get("AURELIA_Chrome"),
            "walnut": bpy.data.materials.get("AURELIA_Walnut"),
            "rubber": bpy.data.materials.get("AURELIA_RubberBlack"),
            "enamel": bpy.data.materials.get("AURELIA_WhiteEnamel"),
            "display": bpy.data.materials.get("AURELIA_DisplayGlow"),
        }
        auto_tag_by_regions(obj, materials)
        return {'FINISHED'}


class AURELIA_PT_panel(bpy.types.Panel):
    bl_label = "AURELIA Materials"
    bl_idname = "AURELIA_PT_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "AURELIA"

    def draw(self, context):
        layout = self.layout
        obj = context.active_object
        if obj and obj.type == 'MESH':
            box = layout.box()
            box.label(text=f"Target: {obj.name}", icon='MESH_DATA')
            box.label(text=f"Mode: {obj.mode}")
            if obj.mode != 'EDIT':
                box.label(text="→ Tab per Edit Mode", icon='INFO')
                box.label(text="→ 3 per Face Select", icon='INFO')
        layout.separator()
        layout.label(text="Assegna materiale a facce sel.:")
        col = layout.column(align=True)

        def btn(label, mat, icon='MATERIAL'):
            op = col.operator("aurelia.assign", text=label, icon=icon)
            op.mat_name = mat

        btn("Corpo (charcoal)", "AURELIA_BodyMatte")
        btn("Corpo (warm dark)", "AURELIA_BodyWarm")
        btn("Acciaio spazzolato", "AURELIA_BrushedSteel")
        btn("Rame brunito", "AURELIA_Copper")
        btn("Cromo specchio", "AURELIA_Chrome")
        btn("Noce italiano", "AURELIA_Walnut")
        btn("Gomma nera", "AURELIA_RubberBlack")
        btn("Smalto bianco", "AURELIA_WhiteEnamel")
        btn("Display glow (copper)", "AURELIA_DisplayGlow")
        layout.separator()
        layout.operator("aurelia.reauto", text="Re-run auto-tag", icon='FILE_REFRESH')
        layout.separator()
        layout.operator("aurelia.export", text="Export Optimized GLB", icon='EXPORT')


CLASSES = (
    AURELIA_OT_assign,
    AURELIA_OT_reauto,
    AURELIA_OT_export,
    AURELIA_PT_panel,
)


def register():
    for cls in CLASSES:
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
        bpy.utils.register_class(cls)


def unregister():
    for cls in reversed(CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass


def main():
    print("=" * 60)
    print("[AURELIA] Multi-material toolkit — avvio")
    print("=" * 60)
    materials = setup_all_materials()
    print(f"[AURELIA] Creati {len(materials)} materiali PBR")
    target = get_or_join_target()
    if not target:
        print("[AURELIA] ⚠ Nessuna mesh nella scena. Importa prima il GLB.")
        register()
        return
    print(f"[AURELIA] Target: {target.name} "
          f"({len(target.data.vertices)} vert, "
          f"{len(target.data.polygons)} facce)")
    auto_tag_by_regions(target, materials)
    register()
    print()
    print("[AURELIA] ✓ Setup completato.")
    print("[AURELIA] → Premi N nel viewport, vai al tab 'AURELIA'")
    print("=" * 60)


if __name__ == "__main__":
    main()
