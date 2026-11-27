"""Build a complete subset from the official Fusion Pixel 12px proportional ZIP.

Fusion uses Ark's base glyphs/metrics and fills its CJK gaps. Missing characters
are errors, never silently omitted. Five UI symbols use original pixel outlines.
"""
import hashlib, io, json, sys, zipfile
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools import subset

archive = zipfile.ZipFile(sys.argv[1])
font = TTFont(io.BytesIO(archive.read('fusion-pixel-12px-proportional-zh_hans.otf')))
font.ensureDecompiled()
patterns = {
    '−': ['........'] * 5 + ['.######.'] + ['........'] * 6,
    '≤': ['........', '.....#..', '...##...', '.##.....', '...##...', '.....#..', '........', '.#####..'] + ['........'] * 4,
    '≥': ['........', '..#.....', '...##...', '.....##.', '...##...', '..#.....', '........', '..#####.'] + ['........'] * 4,
    '✦': ['.....#.....', '.....#.....', '....###....', '....###....', '..#######..', '###########', '..#######..', '....###....', '....###....', '.....#.....', '.....#.....', '...........'],
    '❄': ['.....#.....', '.#...#...#.', '..#..#..#..', '...#.#.#...', '....###....', '###########', '....###....', '...#.#.#...', '..#..#..#..', '.#...#...#.', '.....#.....', '...........'],
}
top = font['CFF '].cff.topDictIndex[0]
for character, rows in patterns.items():
    if ord(character) in font.getBestCmap():
        continue
    name = f'uni{ord(character):04X}'
    advance = (len(rows[0]) + 1) * 100
    pen = T2CharStringPen(advance, None)
    for row, pixels in enumerate(rows):
        for col, pixel in enumerate(pixels):
            if pixel != '#':
                continue
            x, y = col * 100, (10 - row) * 100
            pen.moveTo((x, y)); pen.lineTo((x, y + 100))
            pen.lineTo((x + 100, y + 100)); pen.lineTo((x + 100, y)); pen.closePath()
    glyph = pen.getCharString(private=top.Private, globalSubrs=top.GlobalSubrs)
    top.CharStrings.charStrings[name] = len(top.CharStrings.charStringsIndex)
    top.CharStrings.charStringsIndex.append(glyph)
    top.charset.append(name)
    font['hmtx'].metrics[name] = (advance, 0)
    if 'vmtx' in font:
        font['vmtx'].metrics[name] = (1600, 200)
    for table in font['cmap'].tables:
        if table.isUnicode():
            table.cmap[ord(character)] = name
font.setGlyphOrder(top.charset)
font['maxp'].numGlyphs = len(top.charset)

chars = set(chr(i) for i in range(32, 127))
for path in Path('src').rglob('*'):
    if path.suffix in {'.ts', '.tsx', '.json', '.css'}:
        chars.update(path.read_text(encoding='utf-8'))
chars = {c for c in chars if not c.isspace() or c == ' '}
missing = sorted(ord(c) for c in chars if ord(c) not in font.getBestCmap())
if missing:
    raise SystemExit('Unsupported UI glyphs: ' + ', '.join(f'U+{cp:04X}' for cp in missing))
options = subset.Options(); options.flavor = 'woff'; options.layout_features = ['*']; options.name_IDs = ['*']
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=[ord(c) for c in chars]); subsetter.subset(font)
# Modified fonts use a project-specific name; preserve all copyright/license records.
for name_id, value in {1:'Campus Pixel', 2:'Regular', 3:'CampusPixel-Regular-20261128', 4:'Campus Pixel Regular', 6:'CampusPixel-Regular', 16:'Campus Pixel', 17:'Regular'}.items():
    font['name'].setName(value, name_id, 3, 1, 0x409)
top = font['CFF '].cff.topDictIndex[0]
top.FamilyName = 'Campus Pixel'; top.FullName = 'Campus Pixel Regular'
font['CFF '].cff.fontNames = ['CampusPixel-Regular']
output = Path('public/assets/campus-pixel.woff')
font.flavor = 'woff'; font.save(output)
actual = TTFont(output).getBestCmap()
assert all(ord(c) in actual for c in chars)
Path('public/assets/campus-pixel-coverage.json').write_text(json.dumps({
    'sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
    'codepoints': sorted(actual),
}, separators=(',', ':')), encoding='utf-8')
licenses = ['Fusion Pixel Font 2026.11.10\n' + archive.read('OFL.txt').decode()]
for name in archive.namelist():
    if name.startswith('LICENSES/') and not name.endswith('/'):
        licenses.append(name + '\n' + archive.read(name).decode())
Path('public/FUSION_PIXEL_LICENSES.txt').write_text('\n'.join(line.rstrip() for line in '\n\n---\n\n'.join(licenses).splitlines()) + '\n', encoding='utf-8')
print(f'Pixel font: {output.stat().st_size} bytes; {len(actual)} covered characters; no missing UI glyphs')
