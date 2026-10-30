"""Renders one BLACKOUT character from CC0 MakeHuman/MPFB2 assets into a transparent PNG.

Run with Blender (4.2+), MPFB2 installed and the MakeHuman CC0 asset packs unpacked into MPFB's user data folder:

    blender -b --python render_character.py -- <spec.json> <out.png>

The spec names only existing, openly licensed assets (see docs/ART_ASSETS.md); nothing is drawn or generated here.
Everything that makes a character recognisable (body proportions, skin, hair, brows, clothes) comes from the spec, so the
same spec always gives the same person. Only the expression, head turn and camera change between panels.
"""
import json
import math
import os
import sys

import bpy
from mathutils import Vector

from bl_ext.user_default.mpfb.services.faceservice import FaceService
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.locationservice import LocationService
from bl_ext.user_default.mpfb.services.targetservice import TargetService

argv = sys.argv[sys.argv.index("--") + 1:]
spec = json.load(open(argv[0], encoding="utf-8"))
out_png = argv[1]
DATA = LocationService.get_user_data()


def data(*parts):
    return os.path.join(DATA, *parts)


bpy.ops.wm.read_factory_settings(use_empty=True)

# ---- body -------------------------------------------------------------------------------------------------------
macro = TargetService.get_default_macro_info_dict()
macro.update(spec["macro"])
macro["race"] = spec["race"]
# Native MakeHuman units (decimetres) keep clothes and hair the same size as the body; U converts metres to scene units.
U = 10.0
base = HumanService.create_human(macro_detail_dict=macro, scale=1.0)

def add(kind, folder, name, material="MAKESKIN"):
    try:
        HumanService.add_mhclo_asset(data(folder, name, name + ".mhclo"), base, asset_type=kind, material_type=material)
    except Exception as exc:  # report and carry on: a missing garnish must not hide the rest
        print("ADD FAILED", kind, name, exc)

HumanService.set_character_skin(data("skins", spec["skin"], spec["skin"] + ".mhmat"), base, skin_type="MAKESKIN")
add("Eyes", "eyes", "high-poly" if os.path.isdir(data("eyes", "high-poly")) else "low-poly", "MAKESKIN")
add("Eyebrows", "eyebrows", spec["eyebrows"])
if not spec.get("no_lashes"):
    add("Eyelashes", "eyelashes", spec["eyelashes"])
add("Hair", "hair", spec["hair"])
if spec.get("open_mouth"):
    add("Teeth", "teeth", "teeth_base")
    add("Tongue", "tongue", "tongue01")
for cloth in spec["clothes"]:
    add("Clothes", "clothes", cloth)

# ---- expression -------------------------------------------------------------------------------------------------
FaceService.clear_expression(base)
FaceService.set_expression(base, spec.get("expression", {}))

# ---- head turn (rotate the whole figure slightly; no rig needed for busts) ---------------------------------------
base.rotation_euler[2] = math.radians(spec.get("turn_deg", 0))
for obj in bpy.data.objects:
    if obj.parent == base:
        pass

# ---- bring every part of the figure together to measure it -------------------------------------------------------
parts = [o for o in bpy.data.objects if o.type == "MESH"]
head_z = max(v.z for o in parts for v in (o.matrix_world @ Vector(c) for c in o.bound_box))
target = Vector((0, 0, head_z - spec.get("target_drop", 0.13) * U))
for o in parts:
    print("PART", o.name, tuple(round(x, 3) for x in o.dimensions), tuple(round(x, 3) for x in o.location), o.hide_render, o.hide_viewport)
print("HEADZ", head_z)

# ---- lighting: cool screen light + warm emergency light + rim --------------------------------------------------
def light(name, kind, loc, energy, color, size=1.0):
    d = bpy.data.lights.new(name, kind)
    d.energy = energy * U * U
    d.color = color
    if kind == "AREA":
        d.size = size * U
    o = bpy.data.objects.new(name, d)
    bpy.context.collection.objects.link(o)
    o.location = loc
    direction = target - Vector(loc)
    o.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    return o

L = spec["light"]
light("key", "AREA", (L["key_x"] * U, -1.4 * U, target.z + 0.25 * U), L.get("key_energy", 90), L.get("key_color", (0.55, 0.72, 1.0)), 0.8)
light("fill", "AREA", (-L["key_x"] * U, -1.2 * U, target.z - 0.1 * U), L.get("fill_energy", 45), L.get("fill_color", (1.0, 0.62, 0.28)), 1.0)
light("rim", "AREA", (0.0, 1.2 * U, target.z + 0.5 * U), L.get("rim_energy", 120), (0.7, 0.85, 1.0), 0.6)

cam_data = bpy.data.cameras.new("cam")
cam_data.lens = spec.get("lens", 85)
cam = bpy.data.objects.new("cam", cam_data)
bpy.context.collection.objects.link(cam)
cam.location = (spec.get("cam_x", 0.0) * U, -spec.get("cam_dist", 1.15) * U, target.z + spec.get("cam_up", 0.02) * U)
cam_data.clip_end = 1000
cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
bpy.context.scene.camera = cam

# ---- render: Eevee with ink lines (Freestyle), transparent background --------------------------------------------
sc = bpy.context.scene
sc.render.engine = "BLENDER_EEVEE_NEXT" if hasattr(bpy.types, "RenderSettings") and "BLENDER_EEVEE_NEXT" in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items] else "BLENDER_EEVEE"
sc.render.film_transparent = True
sc.render.resolution_x, sc.render.resolution_y = spec.get("size", [1000, 1100])
sc.render.image_settings.file_format = "PNG"
sc.render.image_settings.color_mode = "RGBA"
sc.view_settings.view_transform = "Filmic" if "Filmic" in [v.identifier for v in sc.view_settings.bl_rna.properties["view_transform"].enum_items] else "Standard"
sc.world = bpy.data.worlds.new("w")
sc.world.use_nodes = True
sc.world.node_tree.nodes["Background"].inputs[0].default_value = (0.02, 0.03, 0.05, 1)
sc.world.node_tree.nodes["Background"].inputs[1].default_value = 0.4

# ---- hair colour (the CC0 hair assets ship grey) ---------------------------------------------------------------------
def tint_material(obj, rgb):
    for slot in obj.material_slots:
        mat = slot.material
        if not mat or not mat.use_nodes:
            continue
        for node in mat.node_tree.nodes:
            if node.type == "BSDF_PRINCIPLED":
                for link in list(node.inputs["Base Color"].links):
                    mat.node_tree.links.remove(link)
                node.inputs["Base Color"].default_value = (*rgb, 1)
                node.inputs["Roughness"].default_value = 0.55

for o in parts:
    if o.name.startswith("Human.") and spec["hair"] in o.name and "hair_rgb" in spec:
        tint_material(o, spec["hair_rgb"])
    if o.name.startswith("Human.") and spec["eyebrows"] in o.name and "hair_rgb" in spec:
        tint_material(o, spec["hair_rgb"])

# ---- ink outline: an inverted hull (back faces only, solid black) around body, clothes and hair ------------------
if spec.get("ink", True):
    ink = bpy.data.materials.new("ink")
    ink.use_nodes = True
    ink.use_backface_culling = True
    em = ink.node_tree.nodes["Principled BSDF"]
    em.inputs["Base Color"].default_value = (0.01, 0.01, 0.015, 1)
    em.inputs["Roughness"].default_value = 1.0
    em.inputs["Emission Color"].default_value = (0.01, 0.01, 0.015, 1)
    em.inputs["Emission Strength"].default_value = 1.0
    for o in parts:
        if o.name == "Human" or spec["hair"] in o.name or any(c in o.name for c in spec["clothes"]):
            o.data.materials.append(ink)
            mod = o.modifiers.new("outline", "SOLIDIFY")
            mod.thickness = -spec.get("ink_width", 0.018)
            mod.offset = 1
            mod.use_flip_normals = True
            mod.material_offset = len(o.data.materials) - 1

sc.render.filepath = out_png
bpy.ops.render.render(write_still=True)
print("RENDERED", out_png)
