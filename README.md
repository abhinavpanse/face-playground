# Face / Play

Editable SVG caricature based on the supplied photo, with a phone-motion expression playground.

**Live demo: https://abhinavpanse.github.io/face-playground/**

On a phone, open the live demo in Safari or Chrome, tap **Enable motion**, and allow access when prompted. After the status changes to ready, a quick shake or jolt triggers the reaction. **Sensitivity** adjusts how much movement is needed: Gentle, Normal, or Firm. **Stop motion** turns sensor input off. A live meter shows incoming movement; the page reports permission problems or missing readings instead of silently claiming success. Sensor values stay in the browser.

The head movement scales with the detected impulse. A short, locally generated impact sound plays when sound is enabled. A brief vibration is attempted where supported. Repeated sensor events and tap overlap are suppressed to avoid duplicate reactions. Browser and device support varies; the page keeps tap controls available.

For the offline tap preview, open **index.html** in a browser. No installation or account is needed. Phone sensors require a supported browser and a secure context; use the HTTPS demo for phone testing. Tap either side of the portrait or press **Space** to run the reaction. The four expression buttons hold a pose. The colour controls update the portrait immediately. **Download this SVG** saves the current colours and expression.

## Files

| File | Purpose |
| --- | --- |
| `portrait.svg` | Main transparent vector asset, 600 × 720 viewBox, head and shoulders |
| `head-only.svg` | Same editable portrait with the body hidden, square 600 × 600 viewBox |
| `expressions/` | Separate happy, relaxed, slapped, and sad SVG files |
| `face-rig.js` | Small controller for expressions, palette, reaction timing, and SVG export |
| `motion-input.js` | Phone permission, sensor lifecycle, gravity filtering, and impact detection |
| `index.html` | Ready-to-open interactive preview |
| `preview.template.html` | Preview source; includes an SVG insertion marker |
| `preview.css`, `preview.js` | Preview layout and controls |
| `build.py` | Rebuilds the preview and SVG variants after editing `portrait.svg` |

The artwork contains vector shapes and paths. It has no embedded photograph, raster image, external font, or remote resource. Gradients and colours are editable. The supplied photograph is not bundled.

## Manipulate the SVG

Embed the SVG markup **inline** in the page, then load `face-rig.js`. An `<img src="portrait.svg">` displays the image, but does not expose its internal layers to the page controller.

```js
const svg = document.getElementById('portrait');
const face = FaceRig(svg);

face.setExpression('sad'); // happy | relaxed | slapped | sad
face.setPalette({ skin: '#b88762', hair: '#211f20', lips: '#a75f59' });
face.slap({ side: 'left', intensity: 1 }); // side: left/right; intensity clamped to 0.7–1.6
const svgSource = face.serialize(); // standalone SVG, current pose and palette
face.reset(); // original palette and happy expression
face.destroy(); // cancel pending recovery and animation when removing the view
```

`slap()` shows the impact pose immediately, changes to sad after 430 ms, and returns to happy after 1,650 ms. A new reaction restarts that sequence. Selecting a pose cancels pending recovery and temporarily suppresses sensor input. Reduced-motion mode retains expressions and timing but omits the spring animation and CSS transitions.

Colour keys are `skin`, `hair`, `lips`, `shirt`, and `blush`. Each accepts a six-digit hex colour. All palette changes are validated before being applied.

Without the controller, change `data-expression` on the root SVG and set its CSS properties (`--skin`, `--hair`, `--lips`, `--shirt`, `--blush`). For a head-only view, add `data-crop="head"` and use `viewBox="0 0 600 600"`.

Important layer IDs include `body`, `shirt`, `neck`, `head`, `hair-back`, `hair-front`, `ears`, `face`, `face-base`, `cheeks`, `cheek-reaction-left`, `cheek-reaction-right`, `brows`, `eyes`, `nose`, `mouth`, and `effects`. Eyebrows, eyes, and mouths have individually named paths/groups per expression. The relaxed pose shares the happy eyebrows. Layers within `head` move together; the body stays still. Each expression reuses the same underlying face.

Use one portrait per document as supplied. Multiple inline copies require unique IDs and corresponding updates to the CSS selectors, gradient URLs, title references, and controller.

## Scope

This delivers the editable character, a motion-driven browser game, and a tap preview. Motion permission must begin from a user action. Valid acceleration readings are required before reporting ready. Backgrounding the page pauses detection and discards old samples. Reloading requires enabling motion again. It remains a website, not a native app.

The initial sensitivity thresholds are 4, 8, and 14 m/s². These are tuning choices, not calibrated measures of a physical slap. Detection uses linear acceleration when available and filters gravity from the fallback readings. A jolt can come from a shake, tap, or other phone movement; the sensor cannot identify its physical cause. Real-device sensitivity and sound/haptic delivery require a phone test.

API references: [motion permission](https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent/requestPermission_static), [linear acceleration](https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent/acceleration), and [acceleration including gravity](https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent/accelerationIncludingGravity).

To rebuild after edits:

```sh
python3 build.py
node --test tests/*.test.cjs
```

Browser checks cover expression switching, timed recovery, rapid repeated taps, manual pose cancellation, palette changes, SVG export, reduced motion, keyboard input, and narrow-screen layout. Exact likeness remains a design judgement; the original photo has closed eyes, so the supplied states preserve closed eyes.
