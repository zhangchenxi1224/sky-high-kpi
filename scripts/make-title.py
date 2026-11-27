"""Build editable SVG title outlines from the OFL Ark Pixel font release ZIP.

Usage: python scripts/make-title.py path/to/ark-pixel-font-12px-proportional-otf-v2026.11.10.zip
Requires fontTools. Download/provenance: https://github.com/TakWolf/ark-pixel-font/releases/tag/2026.11.10
No font download or build step is needed to run the game.
"""
import io
import sys
import zipfile
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

archive = zipfile.ZipFile(sys.argv[1])
font = TTFont(io.BytesIO(archive.read('ark-pixel-12px-proportional-zh_hans.otf')))
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()

def run(text, x, y, width, height, spacing=0):
    cursor = 0
    bounds = BoundsPen(glyphs)
    for char in text:
        name = cmap[ord(char)]
        glyphs[name].draw(TransformPen(bounds, (1, 0, 0, 1, cursor, 0)))
        cursor += glyphs[name].width + spacing
    x0, y0, x1, y1 = bounds.bounds
    sx, sy = width / (x1-x0), height / (y1-y0)
    cursor, paths = 0, []
    for char in text:
        name = cmap[ord(char)]
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(TransformPen(pen, (sx, 0, 0, -sy, x+(cursor-x0)*sx, y+y1*sy)))
        paths.append(pen.getCommands())
        cursor += glyphs[name].width + spacing
    return ' '.join(paths)

headline = run("Don't Collapse,", 55, 25, 790, 86, 25)
subtitle = run('MY GPA!', 174, 155, 552, 92, 25)
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="900" height="280" viewBox="0 0 900 280">
<title>Don't Collapse, MY GPA!</title>
<!-- Glyph outlines: Ark Pixel Font 12px, 2026.11.10, SIL OFL 1.1. -->
<defs><linearGradient id="gold" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#fff6ad"/><stop offset=".12" stop-color="#ffe98d"/><stop offset=".18" stop-color="#ffdc42"/><stop offset=".73" stop-color="#ffcf25"/><stop offset="1" stop-color="#e9a218"/></linearGradient><path id="headline" d="{headline}"/><path id="subtitle" d="{subtitle}"/></defs>
<g stroke-linejoin="miter">
<g transform="translate(1 12)" fill="#17223e" stroke="#17223e" stroke-width="19"><use href="#headline"/><use href="#subtitle"/></g>
<g fill="url(#gold)" stroke="#17223e" stroke-width="15" paint-order="stroke"><use href="#headline"/><use href="#subtitle"/></g>
<g fill="url(#gold)" stroke="url(#gold)" stroke-width="5" paint-order="stroke"><use href="#headline"/><use href="#subtitle"/></g>
<path d="M65 190h73v25H65Z M762 190h73v25H762Z" fill="url(#gold)" stroke="#17223e" stroke-width="10"/>
<path d="M68 193h67 M766 193h66" stroke="#fff8bd" stroke-width="4"/>
</g></svg>'''
Path('public/assets/title.svg').write_text(svg, encoding='utf-8')
Path('public/ARK_PIXEL_OFL.txt').write_bytes(archive.read('OFL.txt'))
print(f'Title SVG: {len(svg.encode())} bytes; all requested glyphs present.')
