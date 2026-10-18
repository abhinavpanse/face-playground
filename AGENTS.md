# Face / Play

Static, dependency-free SVG caricature and mobile expression playground.

- `portrait.svg` is the source artwork. Named vector layers and CSS custom properties control appearance.
- `face-rig.js` controls expressions, reaction timing, and SVG export.
- Edit `preview.template.html`, then run `python3 build.py` to rebuild `index.html` and SVG variants.
- `preview.js` and `preview.css` provide touch, keyboard, colour, and export controls.
- Keep the original photograph, credentials, and unrelated workspace files out of this repository.
- Verify syntax with `node --check face-rig.js` and `node --check preview.js`.
- Browser verification must cover the reaction sequence, repeated taps, mobile viewport, colour controls, and export.
- Deployment: commit verified source to `main`, push to GitHub, and verify the automatic GitHub Pages workflow plus the public page. Never publish uncommitted local files.
- Current interaction is tap-based. Physical phone motion detection is not implemented.
