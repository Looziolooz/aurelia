import bpy
print([op for op in dir(bpy.ops) if 'step' in op.lower()])
print([op for op in dir(bpy.ops.import_scene) if hasattr(bpy.ops.import_scene, op)])