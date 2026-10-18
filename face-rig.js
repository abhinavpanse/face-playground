(function (global) {
  'use strict';

  const expressions = new Set(['happy', 'relaxed', 'slapped', 'sad']);
  const defaultPalette = Object.freeze({
    skin: '#bd896b', hair: '#211c1a', lips: '#99555a',
    shirt: '#25443c', blush: '#d16d6b',
  });

  function FaceRig(svg) {
    if (!svg || svg.namespaceURI !== 'http://www.w3.org/2000/svg' || svg.id !== 'portrait') {
      throw new TypeError('FaceRig requires the inline portrait.svg root element.');
    }
    let timers = [];
    let reactionAnimation = null;
    const head = svg.querySelector('#head');

    function cancelSequence() {
      timers.forEach(global.clearTimeout);
      timers = [];
      if (reactionAnimation) reactionAnimation.cancel();
      reactionAnimation = null;
    }

    function render(expression) {
      svg.dataset.expression = expression;
      svg.querySelector('#portrait-title').textContent = `A ${expression} detailed vector portrait`;
      svg.dispatchEvent(new CustomEvent('faceexpression', {detail: {expression}}));
    }

    function setExpression(expression) {
      if (!expressions.has(expression)) throw new RangeError(`Unknown expression: ${expression}`);
      cancelSequence();
      delete svg.dataset.reaction;
      render(expression);
    }

    function setPalette(palette) {
      for (const [key, value] of Object.entries(palette)) {
        if (!Object.hasOwn(defaultPalette, key) || !/^#[0-9a-f]{6}$/i.test(value)) {
          throw new TypeError('Use skin, hair, lips, shirt, or blush with a six-digit hex colour.');
        }
      }
      for (const [key, value] of Object.entries(palette)) {
        svg.style.setProperty(`--${key}`, value);
        const filter = svg.querySelector(`filter[data-tint="${key}"]`);
        if (!filter) continue;
        const source = filter.dataset.source;
        if (!/^#[0-9a-f]{6}$/i.test(source)) continue;
        ['R', 'G', 'B'].forEach((channel, index) => {
          const start = 1 + index * 2;
          const from = Math.max(1, Math.min(254, parseInt(source.slice(start, start + 2), 16)));
          const to = Math.max(1, Math.min(254, parseInt(value.slice(start, start + 2), 16)));
          const exponent = Math.log(to / 255) / Math.log(from / 255);
          filter.querySelector(`feFunc${channel}`).setAttribute('exponent', String(exponent));
        });
      }
    }

    function slap({side = 'left', intensity = 1} = {}) {
      if (side !== 'left' && side !== 'right') throw new RangeError('Side must be left or right.');
      if (!Number.isFinite(intensity)) throw new TypeError('Intensity must be a finite number.');
      intensity = Math.max(.7, Math.min(1.6, intensity));
      cancelSequence();
      svg.dataset.side = side;
      svg.dataset.reaction = 'true';
      render('slapped');
      const reduceMotion = global.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduceMotion && head.animate) {
        const direction = side === 'left' ? 1 : -1;
        reactionAnimation = head.animate([
          {transform: 'translate(0, 0) rotate(0deg) scale(1)'},
          {transform: `translate(${25 * direction * intensity}px, 3px) rotate(${9 * direction * intensity}deg) scale(${1 - .06 * intensity}, ${1 + .02 * intensity})`, offset: .45},
          {transform: `translate(${18 * direction}px, 3px) rotate(${7 * direction}deg) scale(.965, 1.015)`},
        ], {duration: 230, easing: 'cubic-bezier(.2,.75,.25,1)'});
      }
      timers.push(global.setTimeout(() => render('sad'), 430));
      timers.push(global.setTimeout(() => {
        delete svg.dataset.reaction;
        render('happy');
        timers = [];
      }, 1650));
    }

    function reset() {
      cancelSequence();
      setPalette(defaultPalette);
      svg.dataset.side = 'left';
      delete svg.dataset.reaction;
      render('happy');
    }

    function serialize() {
      const copy = svg.cloneNode(true);
      copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      copy.querySelector('style').textContent += '\n#portrait #head, #portrait .cheek-reaction { transition: none !important; }';
      return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(copy);
    }

    return Object.freeze({setExpression, setPalette, slap, reset, serialize, destroy: cancelSequence});
  }

  global.FaceRig = FaceRig;
})(window);
