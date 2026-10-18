# Face / Play

Editable SVG caricature based on the supplied photo, with a local expression playground.

Open **index.html** in a browser. No installation, server, network request, or account is needed. Tap either side of the portrait or press **Space** to run the reaction. The four expression buttons hold a pose. The colour controls update the portrait immediately. **Download this SVG** saves the current colours and expression.

## Files

| File | Purpose |
| --- | --- |
| `portrait.svg` | Main transparent vector asset, 600 × 720 viewBox, head and shoulders |
| `head-only.svg` | Same editable portrait with the body hidden, square 600 × 600 viewBox |
| `expressions/` | Separate happy, relaxed, slapped, and sad SVG files |
| `face-rig.js` | Small controller for expressions, palette, reaction timing, and SVG export |
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
face.slap({ side: 'left' }); // screen-left cheek; also accepts 'right'
const svgSource = face.serialize(); // standalone SVG, current pose and palette
face.reset(); // original palette and happy expression
face.destroy(); // cancel pending recovery and animation when removing the view
```

`slap()` shows the impact pose immediately, changes to sad after 430 ms, and returns to happy after 1,650 ms. A new tap restarts that sequence. Selecting a pose cancels pending recovery so the selected pose stays visible. Reduced-motion mode retains expressions and timing but omits the spring animation and CSS transitions.

Colour keys are `skin`, `hair`, `lips`, `shirt`, and `blush`. Each accepts a six-digit hex colour. All palette changes are validated before being applied.

Without the controller, change `data-expression` on the root SVG and set its CSS properties (`--skin`, `--hair`, `--lips`, `--shirt`, `--blush`). For a head-only view, add `data-crop="head"` and use `viewBox="0 0 600 600"`.

Important layer IDs include `body`, `shirt`, `neck`, `head`, `hair-back`, `hair-front`, `ears`, `face`, `face-base`, `cheeks`, `cheek-reaction-left`, `cheek-reaction-right`, `brows`, `eyes`, `nose`, `mouth`, and `effects`. Eyebrows, eyes, and mouths have individually named paths/groups per expression. The relaxed pose shares the happy eyebrows. Layers within `head` move together; the body stays still. Each expression reuses the same underlying face.

Use one portrait per document as supplied. Multiple inline copies require unique IDs and corresponding updates to the CSS selectors, gradient URLs, title references, and controller.

## Scope

This delivers the editable character and a tap-to-react browser prototype. Phone motion sensing, device permissions, packaging, and physical-device testing belong to the next game step. They are not implemented or verified here.

To rebuild after edits:

```sh
python3 build.py
```

Browser checks cover expression switching, timed recovery, rapid repeated taps, manual pose cancellation, palette changes, SVG export, reduced motion, keyboard input, and narrow-screen layout. Exact likeness remains a design judgement; the original photo has closed eyes, so the supplied states preserve closed eyes.
