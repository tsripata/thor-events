# Blender planet sprites

`../planets/*.webp` are Blender (Cycles) renders of each planet spinning: 96 frames, one full turn.
`explore.html` cross-fades between frames. If a sheet is missing, the page falls back to the old procedural spheres.

Re-render (e.g. on the Mac with the Metal GPU, at higher quality):

    cd space/blender
    node export_tex.mjs ../shared.js        # writes tex/*.rgba (the same procedural textures the page uses)
    python3 -c "from PIL import Image;import glob,os;[Image.frombytes('RGBA',(1024,1) if 'ring' in f else (1024,512) if 'moon' in f else (2048,1024),open(f,'rb').read()).save(f[:-5]+'.png') for f in glob.glob('tex/*.rgba')]"
    blender -b -P render_planets.py -- --gpu --samples 64 --scale 1.5
    cp out/*.webp ../planets/ && python3 -c "import json;print('window.PLANET_SPRITES = '+json.dumps(json.load(open('out/planets.json')))+';')" > ../planets/planets.js

To use real planet photos instead, drop 2:1 equirectangular maps into tex/<planet>.png before rendering.
