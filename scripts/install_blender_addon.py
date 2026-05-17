"""Headless installer for the BlenderMCP addon.

Run: blender --background --python scripts/install_blender_addon.py
Installs the addon into Blender's user prefs, enables it, and persists
so the GUI just needs the one-click "Connect to Claude".
"""
import bpy
import os

ADDON_SRC = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "blender_mcp_addon.py"
)
MODULE = "blender_mcp_addon"

print(f"[install] source = {ADDON_SRC}", flush=True)
bpy.ops.preferences.addon_install(filepath=ADDON_SRC, overwrite=True)
bpy.ops.preferences.addon_enable(module=MODULE)
bpy.ops.wm.save_userpref()

enabled = MODULE in bpy.context.preferences.addons.keys()
print(f"[install] enabled={enabled}", flush=True)
print("ADDON_INSTALL_OK" if enabled else "ADDON_INSTALL_FAILED", flush=True)
