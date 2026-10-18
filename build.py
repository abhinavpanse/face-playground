"""Assemble the local preview and static expression assets without dependencies."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
svg = (ROOT / 'portrait.svg').read_text()
template = (ROOT / 'preview.template.html').read_text()
assert template.count('<!-- PORTRAIT_SVG -->') == 1
(ROOT / 'index.html').write_text(template.replace('<!-- PORTRAIT_SVG -->', svg))
head = svg.replace('width="600" height="720" viewBox="0 0 600 720"',
                   'width="600" height="600" viewBox="0 0 600 600" data-crop="head"', 1)
(ROOT / 'head-only.svg').write_text(head)
variants = ROOT / 'expressions'
variants.mkdir(exist_ok=True)
for expression in ('happy', 'relaxed', 'slapped', 'sad'):
    variant = svg.replace('data-expression="happy"', f'data-expression="{expression}"', 1)
    variant = re.sub(r'<title id="portrait-title">.*?</title>',
                     f'<title id="portrait-title">A {expression} detailed vector portrait</title>', variant)
    (variants / f'{expression}.svg').write_text(variant)
print('Built index.html, head-only.svg, and four vector expression files.')
