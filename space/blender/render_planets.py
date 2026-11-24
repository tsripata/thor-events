"""Space Crayon — Blender planet sprite renderer.

Renders each planet spinning (seamless loop) with real lighting, bump, ocean
gloss, atmospheres and Saturn's ring (with the planet's shadow on it), then packs
the frames into sprite sheets the explore page plays back.

Run headless:
  blender -b -P render_planets.py -- [--samples 24] [--frames 96] [--scale 1.0] [--only earth,saturn] [--still]
or as a module:  python3 render_planets.py -- ...   (pip install bpy)

On a Mac with Apple silicon add --gpu to render with Metal (much faster).
Outputs: ./out/<planet>.webp sprite sheets + ./out/planets.json manifest.
"""
import sys, os, json, math, argparse, shutil

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--samples', type=int, default=24)
ap.add_argument('--frames', type=int, default=96)
ap.add_argument('--scale', type=float, default=1.0, help='multiply sprite pixel sizes')
ap.add_argument('--only', default='')
ap.add_argument('--still', action='store_true', help='render frame 0 only (preview)')
ap.add_argument('--gpu', action='store_true')
ap.add_argument('--tex', default=os.path.join(HERE, 'tex'))
ap.add_argument('--out', default=os.path.join(HERE, 'out'))
A = ap.parse_args(argv)

# Light comes from the Sun on the left side of the page, a little toward the viewer and from above.
LIGHT_DIR = Vector((-1.0, -0.55, 0.35)).normalized()   # direction *towards* the light
SUN_STRENGTH = 1.7

# r: planet radius in sprite pixels · tilt/pitch match explore.html · hw/hh: half frame size in planet radii
PLANETS = {
    'mercury': dict(r=48,  tilt=0.10, pitch=0.12, bump=0.35),
    'venus':   dict(r=72,  tilt=0.10, pitch=0.12, bump=0.0, atmo=(1.0, 0.85, 0.55), atmo_k=1.1),
    'earth':   dict(r=80,  tilt=0.10, pitch=0.12, bump=0.12, ocean=True, atmo=(0.35, 0.62, 1.0), atmo_k=1.5),
    'mars':    dict(r=56,  tilt=0.10, pitch=0.12, bump=0.3, atmo=(1.0, 0.6, 0.4), atmo_k=0.35),
    'jupiter': dict(r=170, tilt=0.10, pitch=0.12, bump=0.0),
    'saturn':  dict(r=128, tilt=0.30, pitch=0.26, bump=0.0, ring=True),
    'uranus':  dict(r=96,  tilt=1.40, pitch=0.12, bump=0.0, atmo=(0.6, 0.95, 1.0), atmo_k=1.0),
    'neptune': dict(r=96,  tilt=0.10, pitch=0.12, bump=0.0, atmo=(0.4, 0.6, 1.0), atmo_k=1.2),
    'moon':    dict(r=32,  tilt=0.0,  pitch=0.0,  bump=0.4, still=True),
}
for k, p in PLANETS.items():
    p['hw'] = 2.08 if p.get('ring') else 1.02
    p['hh'] = 1.03 if p.get('ring') else p['hw']


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    cy = sc.cycles
    cy.samples = A.samples
    cy.use_adaptive_sampling = True
    cy.use_denoising = True
    try: cy.denoiser = 'OPENIMAGEDENOISE'
    except Exception: pass
    cy.max_bounces = 4; cy.transparent_max_bounces = 16
    if A.gpu:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        for t in ('METAL', 'OPTIX', 'CUDA', 'HIP'):
            try:
                prefs.compute_device_type = t; prefs.get_devices()
                for d in prefs.devices: d.use = True
                cy.device = 'GPU'; break
            except Exception: continue
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.resolution_percentage = 100
    world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.012, 0.014, 0.02, 1)
    # camera looking at +Y, screen right = +X, screen up = +Z
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    cam.data.type = 'ORTHO'; cam.location = (0, -20, 0); cam.rotation_euler = (math.pi / 2, 0, 0)
    sc.collection.objects.link(cam); sc.camera = cam
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = SUN_STRENGTH; sun.data.angle = math.radians(0.6)
    sun.rotation_euler = (-LIGHT_DIR).to_track_quat('-Z', 'Y').to_euler()
    sc.collection.objects.link(sun)
    return sc, cam


def node(nt, kind, loc=(0, 0), **inputs):
    n = nt.nodes.new(kind); n.location = loc
    for k, v in inputs.items(): n.inputs[k].default_value = v
    return n


def planet_material(key, p):
    m = bpy.data.materials.new(key); m.use_nodes = True; nt = m.node_tree; L = nt.links
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.9
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.location = (-600, 200)
    tex.image = bpy.data.images.load(os.path.join(A.tex, key + '.png')); tex.interpolation = 'Cubic'
    L.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    if p.get('bump'):
        bump = node(nt, 'ShaderNodeBump', (-250, -250), Strength=p['bump'], Distance=0.02)
        L.new(tex.outputs['Color'], bump.inputs['Height']); L.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    if p.get('ocean'):  # glossy oceans: mask = blue - red
        sep = nt.nodes.new('ShaderNodeSeparateColor'); sep.location = (-350, 0)
        L.new(tex.outputs['Color'], sep.inputs['Color'])
        sub = node(nt, 'ShaderNodeMath', (-180, 0)); sub.operation = 'SUBTRACT'; sub.use_clamp = True
        L.new(sep.outputs['Blue'], sub.inputs[0]); L.new(sep.outputs['Red'], sub.inputs[1])
        mr = node(nt, 'ShaderNodeMapRange', (-20, 0)); mr.inputs['From Max'].default_value = 0.25
        mr.inputs['To Min'].default_value = 0.92; mr.inputs['To Max'].default_value = 0.28
        L.new(sub.outputs[0], mr.inputs['Value']); L.new(mr.outputs[0], bsdf.inputs['Roughness'])
    if p.get('atmo'):
        out = nt.nodes['Material Output']
        lw = node(nt, 'ShaderNodeLayerWeight', (-800, -500), Blend=0.35)
        rim = node(nt, 'ShaderNodeMath', (-600, -500)); rim.operation = 'POWER'; rim.inputs[1].default_value = 2.0
        L.new(lw.outputs['Facing'], rim.inputs[0])
        geo = node(nt, 'ShaderNodeNewGeometry', (-900, -700))
        dot = node(nt, 'ShaderNodeVectorMath', (-700, -700)); dot.operation = 'DOT_PRODUCT'
        dot.inputs[1].default_value = LIGHT_DIR; L.new(geo.outputs['Normal'], dot.inputs[0])
        lit = node(nt, 'ShaderNodeMapRange', (-500, -700)); lit.interpolation_type = 'SMOOTHSTEP'
        lit.inputs['From Min'].default_value = -0.3; lit.inputs['From Max'].default_value = 0.6
        L.new(dot.outputs['Value'], lit.inputs['Value'])
        f = node(nt, 'ShaderNodeMath', (-350, -550)); f.operation = 'MULTIPLY'
        L.new(rim.outputs[0], f.inputs[0]); L.new(lit.outputs[0], f.inputs[1])
        k = node(nt, 'ShaderNodeMath', (-200, -550)); k.operation = 'MULTIPLY'; k.inputs[1].default_value = p.get('atmo_k', 1.0)
        L.new(f.outputs[0], k.inputs[0])
        em = nt.nodes.new('ShaderNodeEmission'); em.location = (0, -550); em.inputs['Color'].default_value = (*p['atmo'], 1)
        L.new(k.outputs[0], em.inputs['Strength'])
        add = nt.nodes.new('ShaderNodeAddShader'); add.location = (300, -200)
        L.new(bsdf.outputs[0], add.inputs[0]); L.new(em.outputs[0], add.inputs[1]); L.new(add.outputs[0], out.inputs['Surface'])
    return m


def atmo_material(p):
    """Thin shell: rim glow (fresnel) that only shows on the sunlit side."""
    m = bpy.data.materials.new('atmo'); m.use_nodes = True; nt = m.node_tree; L = nt.links
    nt.nodes.remove(nt.nodes['Principled BSDF']); out = nt.nodes['Material Output']
    lw = node(nt, 'ShaderNodeLayerWeight', (-800, 200), Blend=0.5)
    rim = node(nt, 'ShaderNodeMath', (-600, 200)); rim.operation = 'POWER'; rim.inputs[1].default_value = 2.2
    L.new(lw.outputs['Facing'], rim.inputs[0])   # 0 facing the camera -> 1 at the limb
    geo = node(nt, 'ShaderNodeNewGeometry', (-900, -100))
    dot = node(nt, 'ShaderNodeVectorMath', (-700, -100)); dot.operation = 'DOT_PRODUCT'
    dot.inputs[1].default_value = LIGHT_DIR
    L.new(geo.outputs['Normal'], dot.inputs[0])
    lit = node(nt, 'ShaderNodeMapRange', (-500, -100)); lit.inputs['From Min'].default_value = -0.35; lit.inputs['From Max'].default_value = 0.7
    lit.interpolation_type = 'SMOOTHSTEP'; L.new(dot.outputs['Value'], lit.inputs['Value'])
    fac = node(nt, 'ShaderNodeMath', (-350, 100)); fac.operation = 'MULTIPLY'
    L.new(rim.outputs[0], fac.inputs[0]); L.new(lit.outputs[0], fac.inputs[1])
    fk = node(nt, 'ShaderNodeMath', (-200, 100)); fk.operation = 'MULTIPLY'; fk.use_clamp = True
    fk.inputs[1].default_value = p.get('atmo_k', 1.0); L.new(fac.outputs[0], fk.inputs[0])
    em = node(nt, 'ShaderNodeEmission', (-200, -150), Strength=1.6); em.inputs['Color'].default_value = (*p['atmo'], 1)
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); tr.location = (-200, -300)
    mix = nt.nodes.new('ShaderNodeMixShader'); mix.location = (50, 0)
    L.new(fk.outputs[0], mix.inputs['Fac']); L.new(tr.outputs[0], mix.inputs[1]); L.new(em.outputs[0], mix.inputs[2])
    L.new(mix.outputs[0], out.inputs['Surface'])
    m.blend_method = 'BLEND' if hasattr(m, 'blend_method') else None
    return m


def ring_material():
    m = bpy.data.materials.new('ring'); m.use_nodes = True; nt = m.node_tree; L = nt.links
    nt.nodes.remove(nt.nodes['Principled BSDF']); out = nt.nodes['Material Output']
    tc = node(nt, 'ShaderNodeTexCoord', (-1000, 0))
    ln = node(nt, 'ShaderNodeVectorMath', (-800, 0)); ln.operation = 'LENGTH'
    L.new(tc.outputs['Object'], ln.inputs[0])
    mr = node(nt, 'ShaderNodeMapRange', (-600, 0)); mr.inputs['From Min'].default_value = 1.25; mr.inputs['From Max'].default_value = 2.25
    L.new(ln.outputs['Value'], mr.inputs['Value'])
    cmb = node(nt, 'ShaderNodeCombineXYZ', (-420, 0), Y=0.5); L.new(mr.outputs[0], cmb.inputs['X'])
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.location = (-250, 0); tex.extension = 'EXTEND'
    tex.image = bpy.data.images.load(os.path.join(A.tex, 'ring.png')); tex.image.alpha_mode = 'STRAIGHT'
    L.new(cmb.outputs[0], tex.inputs['Vector'])
    # sunlight grazes the ring plane, so boost albedo to keep it bright like the old page
    boost = node(nt, 'ShaderNodeMix', (0, 150)); boost.data_type = 'RGBA'; boost.blend_type = 'MULTIPLY'
    boost.inputs['Factor'].default_value = 1.0; boost.inputs['B'].default_value = (3.2, 3.0, 2.8, 1)
    L.new(tex.outputs['Color'], boost.inputs['A'])
    dif = nt.nodes.new('ShaderNodeBsdfDiffuse'); dif.location = (200, 150)
    trl = nt.nodes.new('ShaderNodeBsdfTranslucent'); trl.location = (200, 0)
    L.new(boost.outputs['Result'], dif.inputs['Color']); L.new(boost.outputs['Result'], trl.inputs['Color'])
    both = nt.nodes.new('ShaderNodeAddShader'); both.location = (400, 100)
    L.new(dif.outputs[0], both.inputs[0]); L.new(trl.outputs[0], both.inputs[1])
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); tr.location = (400, -100)
    mix = nt.nodes.new('ShaderNodeMixShader'); mix.location = (600, 0)
    L.new(tex.outputs['Alpha'], mix.inputs['Fac']); L.new(tr.outputs[0], mix.inputs[1]); L.new(both.outputs[0], mix.inputs[2])
    L.new(mix.outputs[0], out.inputs['Surface'])
    return m


def build(key, p):
    sc, cam = reset_scene()
    s = A.scale
    sc.render.resolution_x = round(2 * p['hw'] * p['r'] * s)
    sc.render.resolution_y = round(2 * p['hh'] * p['r'] * s)
    cam.data.ortho_scale = 2 * p['hw']
    axis = bpy.data.objects.new('axis', None); sc.collection.objects.link(axis)
    axis.rotation_euler = (p['pitch'], p['tilt'], 0)            # north pole toward viewer, then roll clockwise
    bpy.ops.mesh.primitive_uv_sphere_add(segments=160, ring_count=80, radius=1.0)
    body = bpy.context.active_object; body.name = key
    bpy.ops.object.shade_smooth()
    body.data.materials.append(planet_material(key, p)); body.parent = axis
    if p.get('ring'):
        bpy.ops.mesh.primitive_circle_add(vertices=256, radius=2.25, fill_type='NOTHING')
        ring = bpy.context.active_object
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.extrude_region_move(TRANSFORM_OT_translate={'value': (0, 0, 0)})
        bpy.ops.transform.resize(value=(1.25 / 2.25, 1.25 / 2.25, 1))
        bpy.ops.object.mode_set(mode='OBJECT')
        ring.data.materials.append(ring_material()); ring.parent = axis
    return sc, body


def render(key, p, frames_dir):
    sc, body = build(key, p)
    n = 1 if (A.still or p.get('still')) else A.frames
    os.makedirs(frames_dir, exist_ok=True)
    for f in range(n):
        body.rotation_euler = (0, 0, 2 * math.pi * f / A.frames)   # seamless loop: frame n == frame 0
        sc.render.filepath = os.path.join(frames_dir, f'{f:03d}.png')
        bpy.ops.render.render(write_still=True)
    return n, sc.render.resolution_x, sc.render.resolution_y


def pack(key, p, frames_dir, n, fw, fh):
    from PIL import Image
    cols = min(n, 12); rows = math.ceil(n / cols)
    sheet = Image.new('RGBA', (cols * fw, rows * fh), (0, 0, 0, 0))
    for f in range(n):
        sheet.paste(Image.open(os.path.join(frames_dir, f'{f:03d}.png')), ((f % cols) * fw, (f // cols) * fh))
    sheet.save(os.path.join(A.out, key + '.webp'), 'WEBP', quality=88, method=6)
    return dict(frames=n, cols=cols, fw=fw, fh=fh, r=p['r'] * A.scale, hw=p['hw'], hh=p['hh'], ring=bool(p.get('ring')), atmo=bool(p.get('atmo')))


if __name__ == '__main__':
    os.makedirs(A.out, exist_ok=True)
    keys = [k for k in PLANETS if not A.only or k in A.only.split(',')]
    man_path = os.path.join(A.out, 'planets.json')
    manifest = json.load(open(man_path)) if os.path.exists(man_path) else {}
    for key in keys:
        p = PLANETS[key]; fd = os.path.join(A.out, 'frames', key)
        shutil.rmtree(fd, ignore_errors=True)
        n, fw, fh = render(key, p, fd)
        manifest[key] = pack(key, p, fd, n, fw, fh)
        json.dump(manifest, open(man_path, 'w'), indent=1)
        print(f'### {key}: {n} frames {fw}x{fh}', flush=True)
