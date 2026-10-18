(() => {
  'use strict';
  const svg = document.getElementById('portrait');
  const stage = document.getElementById('portrait-stage');
  const announcer = document.getElementById('announcer');
  if (!svg || typeof window.FaceRig !== 'function') {
    announcer.textContent = 'The portrait could not be loaded. Please open the complete preview folder.';
    return;
  }

  const rig = window.FaceRig(svg);
  const defaults = { skin: '#b88762', hair: '#211f20', lips: '#a75f59', shirt: '#242d32', blush: '#d66a64' };
  const emotionNames = { happy: 'Feeling happy', relaxed: 'Nice and relaxed', slapped: 'Ouch!', sad: 'A little sad' };
  const expressionButtons = [...document.querySelectorAll('.expression-button[data-expression]')];
  const colourInputs = [...document.querySelectorAll('input[type="color"]')];
  let currentExpression = 'happy';
  let reactionCount = 0;

  function updateExpression(expression) {
    currentExpression = expression;
    expressionButtons.forEach((button) => {
      const active = button.dataset.expression === expression;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelector('.portrait-panel').dataset.expression = expression;
    document.getElementById('mood-label').textContent = emotionNames[expression] || expression;
    document.querySelectorAll('[data-step]').forEach((step) => step.classList.toggle('is-current', step.dataset.step === expression));
    announcer.textContent = emotionNames[expression] || expression;
  }

  svg.addEventListener('faceexpression', (event) => updateExpression(event.detail.expression));
  expressionButtons.forEach((button) => {
    button.addEventListener('click', () => rig.setExpression(button.dataset.expression));
  });

  colourInputs.forEach((input) => {
    input.addEventListener('input', () => rig.setPalette({ [input.name]: input.value }));
  });

  function react(event) {
    const bounds = stage.getBoundingClientRect();
    const hasPoint = event && typeof event.clientX === 'number' && event.detail !== 0;
    const side = hasPoint ? (event.clientX < bounds.left + bounds.width / 2 ? 'left' : 'right') : (reactionCount % 2 ? 'right' : 'left');
    reactionCount += 1;
    rig.slap({ side });
  }

  stage.addEventListener('click', react);
  stage.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!event.repeat) react();
    }
  });
  document.getElementById('play-reaction').addEventListener('click', () => react());
  document.addEventListener('keydown', (event) => {
    if (event.key !== ' ' || event.repeat || event.defaultPrevented) return;
    const activeElement = document.activeElement;
    if (activeElement && activeElement !== document.body && activeElement !== document.documentElement) return;
    event.preventDefault();
    react();
  });

  document.getElementById('reset-palette').addEventListener('click', () => {
    rig.setPalette(defaults);
    colourInputs.forEach((input) => { input.value = defaults[input.name]; });
    announcer.textContent = 'Original colours restored.';
  });

  document.getElementById('export-svg').addEventListener('click', () => {
    const blob = new Blob([rig.serialize()], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `face-${currentExpression}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    announcer.textContent = 'Your portrait is ready to download.';
  });

  rig.setExpression('happy');
})();
