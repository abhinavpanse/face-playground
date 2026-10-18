# Face / Play

Static, dependency-free detailed vector portrait and mobile expression playground.

- `portrait.svg` is the source artwork. Keep genuine vector paths, reusable groups, feature clips, and named expression layers. Do not replace the portrait with an embedded raster image. The generated reference image is an intermediate drawing source only.
- Preserve the latest reference photo's facial proportions, half-lowered eyes, restrained smile, bindi, hairline, earrings, and patterned shawl when editing the artwork.
- Keep the controller-required IDs `portrait`, `portrait-title`, and `head`. Preserve local `use`, clipping-path, and filter references when editing or renaming vector groups.
- `face-rig.js` controls expressions, reaction timing, and SVG export.
- Detailed palette changes use tint filters with `data-tint` set to `skin`, `hair`, `lips`, or `shirt` and a six-digit `data-source` anchor. The anchors match the defaults: skin `#bd896b`, hair `#211c1a`, lips `#99555a`, and shirt `#25443c`. Keep these anchors aligned with the default palette so reset uses identity filters and preserves the traced tones. Preserve the filters' `feComponentTransfer` RGB gamma functions; `setPalette()` updates the channel exponents so highlights and shadows remain distinct. CSS properties also colour overlays and blush; CSS changes alone do not tint the detailed traced layers.
- Default palette: skin `#bd896b`, hair `#211c1a`, lips `#99555a`, shirt `#25443c`, blush `#d16d6b`. Retain `shirt` as the API key; label the control **Shawl** in the UI.
- Edit `preview.template.html`, then run `python3 build.py` to rebuild `index.html` and SVG variants.
- `preview.js` and `preview.css` provide touch, keyboard, colour, and export controls.
- `motion-input.js` handles sensor permission, acceleration filtering, impact detection, and lifecycle. Keep sensor state separate from permission state; report ready only after receiving valid samples and finishing calibration.
- Keep the original photograph, generated reference raster, credentials, and unrelated workspace files out of this repository.
- Verify syntax with `node --check face-rig.js`, `node --check preview.js`, and `node --check motion-input.js`. Run `node --test tests/*.test.cjs` for motion detection and lifecycle checks.
- Browser verification must cover permission grants/denials, missing sensor readings, motion-triggered recovery, tap/sensor overlap, mobile viewport, colour controls, and export. Inspect an exported SVG independently for the selected pose, palette, shading, and intact clipping. Verify that final SVG assets contain no embedded or externally linked raster images.
- Deployment: commit verified source to `main`, push to GitHub, and verify the automatic GitHub Pages workflow plus the public page. Never publish uncommitted local files.
- Phone motion and tap inputs are implemented. A physical phone test is still pending for motion sensitivity and sound/haptic delivery. Simulated sensor tests do not prove physical phone behaviour; keep that distinction in completion reports.
