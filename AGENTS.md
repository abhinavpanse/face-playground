# Slap Your Ex

Static, dependency-free mobile browser game with a detailed vector character, phone-motion input, round counter, streaks, and local records.

- `portrait.svg` is the source artwork. Keep genuine vector paths, reusable groups, feature clips, and named expression layers. Do not replace the portrait with an embedded raster image. The generated reference image is an intermediate drawing source only.
- Preserve the latest reference photo's facial proportions, half-lowered eyes, restrained smile, bindi, hairline, earrings, and patterned shawl when editing the artwork.
- Keep the controller-required IDs `portrait`, `portrait-title`, and `head`. Preserve local `use`, clipping-path, and filter references when editing or renaming vector groups.
- `face-rig.js` controls expressions, reaction timing, and SVG export.
- `game-state.js` owns round counts, the 1,400 ms streak window, and the best streak saved locally. Round counts restart at zero after reload. Count accepted hits once even when tap and sensor input overlap. Keep game scoring separate from character expression inspection.
- Detailed palette changes use tint filters with `data-tint` set to `skin`, `hair`, `lips`, or `shirt` and a six-digit `data-source` anchor. The anchors match the defaults: skin `#bd896b`, hair `#211c1a`, lips `#99555a`, and shirt `#25443c`. Keep these anchors aligned with the default palette so reset uses identity filters and preserves the traced tones. Preserve the filters' `feComponentTransfer` RGB gamma functions; `setPalette()` updates the channel exponents so highlights and shadows remain distinct. CSS properties also colour overlays and blush; CSS changes alone do not tint the detailed traced layers.
- Default palette: skin `#bd896b`, hair `#211c1a`, lips `#99555a`, shirt `#25443c`, blush `#d16d6b`. Retain `shirt` as the API key; label the control **Shawl** in the UI.
- Edit `preview.template.html`, then run `python3 build.py` to rebuild `index.html` and SVG variants.
- `preview.js` and `preview.css` provide the game interface, touch and keyboard input, sound, settings, character colours, and SVG export.
- `motion-input.js` handles sensor permission, acceleration filtering, impact detection, and lifecycle. Keep sensor state separate from permission state; report ready only after receiving valid samples and finishing calibration.
- `manifest.webmanifest` uses the name and short name `Slap Your Ex`, relative `./` id/start URL/scope, standalone display, and dark `#181b18` theme/background colours. Keep icon references relative for the GitHub Pages project path.
- `app-icon.svg` is the source icon: acid yellow `#e8fc74` with a dark `#181b18` palm. `icons/` contains 192 px and 512 px manifest icons plus the 180 px Apple touch icon. Regenerate PNGs from the vector when changing the icon.
- There is no service worker or offline caching. Do not claim offline availability or verified home-screen installation without testing it. Browser Add to Home Screen is an option when offered.
- Keep the original photograph, generated reference raster, credentials, and unrelated workspace files out of this repository.
- Verify syntax with `node --check face-rig.js`, `node --check preview.js`, `node --check motion-input.js`, and `node --check game-state.js`. Run `node --test tests/*.test.cjs` for game, motion detection, and lifecycle checks.
- Browser verification must cover the round counter, streak expiry and continuation at the 1,400 ms boundary, local-best persistence, round reset, permission grants/denials, missing sensor readings, motion-triggered recovery, tap/sensor overlap, mobile viewport, colour controls, and export. Inspect an exported SVG independently for the selected pose, palette, shading, and intact clipping. Verify that final SVG assets contain no embedded or externally linked raster images.
- Deployment: commit verified source to `main`, push to GitHub, and verify the automatic GitHub Pages workflow plus the public page. Never publish uncommitted local files.
- The Pages workflow publishes an explicit asset list. Keep the manifest, icons, vector icon, `fonts/` (including its OFL licence), and `game-state.js` in that list when changing page dependencies.
- Phone motion and tap inputs are implemented. A physical phone test is still pending for motion sensitivity, sound/haptic delivery, and home-screen behaviour. Simulated sensor tests do not prove physical phone behaviour; keep that distinction in completion reports.
