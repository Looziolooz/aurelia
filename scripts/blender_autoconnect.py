"""Auto-start the BlenderMCP socket server on Blender launch — no GUI click.

Run (GUI, NOT --background, timers need the event loop):
  blender.exe --python scripts/blender_autoconnect.py

Keep this Blender window open while working with Claude on the model.
"""
import bpy
import os

ADDON_MODULE = "blender_mcp_addon"
ADDON_SRC = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "blender_mcp_addon.py"
)


def _ensure_addon():
    """Make `bpy.ops.blendermcp.start_server` exist.

    The addon ships in scripts/blender_mcp_addon.py. Being present in the
    user addons folder is NOT the same as being enabled — if it isn't
    registered the operator "could not be found". Enable it; if it was
    never installed (or enable fails), install from source then enable,
    and persist to userprefs so subsequent launches are one step.
    """
    if ADDON_MODULE in bpy.context.preferences.addons:
        return True
    try:
        bpy.ops.preferences.addon_enable(module=ADDON_MODULE)
        if ADDON_MODULE in bpy.context.preferences.addons:
            print("BLENDERMCP_ADDON_ENABLED", flush=True)
            return True
    except Exception as e:  # noqa: BLE001
        print(f"BLENDERMCP_ADDON_ENABLE_RETRY {e}", flush=True)
    try:
        bpy.ops.preferences.addon_install(filepath=ADDON_SRC, overwrite=True)
        bpy.ops.preferences.addon_enable(module=ADDON_MODULE)
    except Exception as e:  # noqa: BLE001
        print(f"BLENDERMCP_ADDON_INSTALL_FAIL {e}", flush=True)
        return False
    if ADDON_MODULE in bpy.context.preferences.addons:
        try:
            bpy.ops.wm.save_userpref()
        except Exception:  # noqa: BLE001
            pass
        print("BLENDERMCP_ADDON_INSTALLED", flush=True)
        return True
    return False


def _connect():
    scene = bpy.context.scene
    if getattr(scene, "blendermcp_server_running", False):
        print("BLENDERMCP_ALREADY_RUNNING", flush=True)
        return None
    if not _ensure_addon():
        print("BLENDERMCP_AUTOCONNECT_FAIL addon unavailable", flush=True)
        return None
    try:
        bpy.ops.blendermcp.start_server()
        print("BLENDERMCP_AUTOCONNECT_OK localhost:9876", flush=True)
    except Exception as e:  # noqa: BLE001
        print(f"BLENDERMCP_AUTOCONNECT_FAIL {e}", flush=True)
    return None  # one-shot


# Delay so the addon + scene props are fully registered.
bpy.app.timers.register(_connect, first_interval=2.0)
print("BLENDERMCP_AUTOCONNECT_SCHEDULED", flush=True)
