# Slap Your Ex

A mobile browser game with a detailed, editable vector character. Tap the face or use phone motion to trigger an impact, a sad expression, and a happy recovery. The artwork preserves the supplied photo's swept-back hair, half-lowered eyes, rounded nose, compact smile, bindi, earrings, and patterned green shawl.

**Play: https://abhinavpanse.github.io/face-playground/**

## Play

Each accepted hit advances the current round counter. Land the next hit within **1,400 ms** to continue the streak; a longer pause ends it. The game saves the best streak in browser storage. A round reset or page reload starts the round counter at zero. The best streak belongs to this browser and device; clearing site data removes it.

On a phone, open the live demo in Safari or Chrome, tap **Enable motion**, and allow access when prompted. After the status changes to ready, a quick shake or jolt triggers the reaction. **Sensitivity** adjusts how much movement is needed: Gentle, Normal, or Firm. **Stop motion** turns sensor input off. A live meter shows incoming movement; the page reports permission problems or missing readings instead of silently claiming success. Sensor values stay in the browser.

The head movement scales with the detected impulse. A short, locally generated impact sound plays when sound is enabled. A brief vibration is attempted where supported. Repeated sensor events and tap overlap are suppressed to avoid duplicate reactions. Browser and device support varies; the page keeps tap controls available.

Tap either side of the portrait or press **Space** to play without motion input. No account is needed. Phone sensors require a supported browser and a secure context; use the HTTPS site for phone testing.

Motion and sound controls are available during play. The character settings dialog provides four expression poses, editable colours, sensitivity, and reset controls. Choosing a pose holds it for inspection; palette controls update the portrait immediately. SVG export saves the current colours and expression as an editable vector file.

The app includes a web manifest and home-screen icons. Use the browser's **Add to Home Screen** option when available. The manifest requests a standalone window; available install behaviour depends on the browser. There is no service worker or offline caching.

## Files

| File | Purpose |
| --- | --- |
| `portrait.svg` | Main transparent vector asset with named layers, feature clips, and expression variants |
| `head-only.svg` | Generated head crop of the same editable portrait |
| `expressions/` | Separate happy, relaxed, slapped, and sad SVG files |
| `face-rig.js` | Small controller for expressions, palette, reaction timing, and SVG export |
| `game-state.js` | Round counter, streak timing, and local records |
| `motion-input.js` | Phone permission, sensor lifecycle, gravity filtering, and impact detection |
| `index.html` | Generated game page |
| `preview.template.html` | Page source; includes an SVG insertion marker |
| `preview.css`, `preview.js` | Game layout, controls, and input handling |
| `manifest.webmanifest` | App name, relative start URL and scope, standalone display, and icon references |
| `app-icon.svg`, `icons/` | Vector palm icon and 192 px, 512 px, and 180 px PNG exports |
| `fonts/` | Self-hosted Anton display font and its OFL licence |
| `build.py` | Rebuilds the page and SVG variants after editing `portrait.svg` |

The final artwork contains genuine vector paths, reusable vector groups, clipping paths, and SVG filters. It has no embedded photograph or raster image, and needs no external font or remote resource. A generated portrait reference was used as an intermediate drawing source; neither that reference nor the supplied photograph is bundled in the final SVG. Facial features and colours remain editable.

## Manipulate the SVG

Embed the SVG markup **inline** in the page, then load `face-rig.js`. An `<img src="portrait.svg">` displays the image, but does not expose its internal layers to the page controller.

```js
const svg = document.getElementById('portrait');
const face = FaceRig(svg);

face.setExpression('sad'); // happy | relaxed | slapped | sad
face.setPalette({ skin: '#bd896b', hair: '#211c1a', lips: '#99555a' });
face.slap({ side: 'left', intensity: 1 }); // side: left/right; intensity clamped to 0.7–1.6
const svgSource = face.serialize(); // standalone SVG, current pose and palette
face.reset(); // original palette and happy expression
face.destroy(); // cancel pending recovery and animation when removing the view
```

`slap()` shows the impact pose immediately, changes to sad after 430 ms, and returns to happy after 1,650 ms. A new reaction restarts that sequence. Selecting a pose cancels pending recovery and temporarily suppresses sensor input. Reduced-motion mode retains expressions and timing but omits the spring animation and CSS transitions.

Colour keys are `skin`, `hair`, `lips`, `shirt`, and `blush`. Each accepts a six-digit hex colour. All palette changes are validated before being applied. The `shirt` API key is retained for compatibility and controls the garment shown as **Shawl** in the interface.

Default colours are skin `#bd896b`, hair `#211c1a`, lips `#99555a`, shawl `#25443c`, and blush `#d16d6b`.

The detailed skin, hair, lips, and shawl contain many highlight and shadow colours. `setPalette()` adjusts their SVG gamma filters instead of replacing every fill with one flat colour. Each tint filter has a `data-tint` key (`skin`, `hair`, `lips`, or `shirt`) and a six-digit `data-source` colour anchor. The anchors match the defaults: skin `#bd896b`, hair `#211c1a`, lips `#99555a`, and shawl `#25443c`. Selecting these defaults gives an identity filter and preserves the original traced tones. Each filter's `feComponentTransfer` contains gamma functions for the red, green, and blue channels; the controller updates their exponents to map the source anchor to the requested colour while retaining tonal detail. CSS custom properties also control the palette of expression overlays and blush. SVG export includes the current filter values and CSS properties.

Without the controller, change `data-expression` on the root SVG to select a pose. To recolour the detailed traced layers, update the tint-filter gamma exponents as well as the CSS properties (`--skin`, `--hair`, `--lips`, `--shirt`, `--blush`); changing CSS properties alone does not recolour those layers. Use `head-only.svg` for the prepared head crop.

Keep the controller's required IDs: `portrait` on the root SVG, `portrait-title` on its title, and `head` on the animated head group. Named groups and feature clips separate the facial features from the underlying portrait. Eyebrows, eyes, and mouth have expression variants, while the nose, hairline, and face shape provide a consistent likeness across poses. Layers within `head` move together. Edit feature geometry within its matching clip so details do not spill into neighbouring features.

Use one portrait per document as supplied. Multiple inline copies require unique IDs and corresponding updates to CSS selectors, local `use` references, filter and clipping-path URLs, title references, and the controller.

## Scope

The game runs in the browser and uses local storage for its best streak. Round counts restart on page reload. Motion permission must begin from a user action. Valid acceleration readings are required before reporting ready. Backgrounding the page pauses detection and discards old samples. Reloading requires enabling motion again. Home-screen presentation does not turn it into a native app.

The initial sensitivity thresholds are 4, 8, and 14 m/s². These are tuning choices, not calibrated measures of a physical slap. Detection uses linear acceleration when available and filters gravity from the fallback readings. A jolt can come from a shake, tap, or other phone movement; the sensor cannot identify its physical cause. Real-device sensitivity and sound/haptic delivery require a phone test.

API references: [motion permission](https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent/requestPermission_static), [linear acceleration](https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent/acceleration), and [acceleration including gravity](https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent/accelerationIncludingGravity).

To rebuild after edits:

```sh
python3 build.py
node --check face-rig.js
node --check preview.js
node --check motion-input.js
node --check game-state.js
node --test tests/*.test.cjs
```

Browser checks should cover the round counter, 1,400 ms streak boundary, local-best persistence, round reset, expression switching, timed recovery, rapid repeated taps, manual pose cancellation, palette changes, SVG export, reduced motion, keyboard input, and narrow-screen layout. Check the exported SVG independently to confirm that its pose, colours, clipping, and shading survive export. Exact likeness remains a design judgement; the default expression follows the latest photo's half-lowered eyes and restrained smile. A physical phone test is still pending for motion sensitivity, sound/haptic delivery, and home-screen behaviour.
