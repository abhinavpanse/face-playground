# Face / Play

Static, dependency-free SVG caricature and mobile expression playground.

- `portrait.svg` is the source artwork. Named vector layers and CSS custom properties control appearance.
- `face-rig.js` controls expressions, reaction timing, and SVG export.
- Edit `preview.template.html`, then run `python3 build.py` to rebuild `index.html` and SVG variants.
- `preview.js` and `preview.css` provide touch, keyboard, colour, and export controls.
- `motion-input.js` handles sensor permission, acceleration filtering, impact detection, and lifecycle. Keep sensor state separate from permission state; report ready only after receiving valid samples and finishing calibration.
- Keep the original photograph, credentials, and unrelated workspace files out of this repository.
- Verify syntax with `node --check face-rig.js`, `node --check preview.js`, and `node --check motion-input.js`. Run `node --test tests/*.test.cjs` for motion detection and lifecycle checks.
- Browser verification must cover permission grants/denials, missing sensor readings, motion-triggered recovery, tap/sensor overlap, mobile viewport, colour controls, and export.
- Deployment: commit verified source to `main`, push to GitHub, and verify the automatic GitHub Pages workflow plus the public page. Never publish uncommitted local files.
- Phone motion and tap inputs are implemented. Simulated sensor tests do not prove physical phone sensitivity; keep that distinction in completion reports.
