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
  let lastReactionAt = -Infinity;
  let lastReactionSource = null;
  let motionEnabled = false;
  const feedback = createImpactFeedback();
  const motionToggle = document.getElementById('motion-toggle');
  const motionPanel = document.getElementById('motion-panel');
  const motion = typeof window.PhoneMotion === 'function' ? window.PhoneMotion({
    onImpact: ({side, intensity}) => performReaction(side, intensity, 'motion'),
    onState: updateMotionState,
    onLevel: (level) => {
      document.getElementById('motion-level').style.transform = `scaleX(${Math.max(0, Math.min(1, level))})`;
    },
  }) : null;

  function updateMotionState({status, message}) {
    motionEnabled = ['requesting', 'waiting', 'calibrating', 'active', 'paused', 'no-data'].includes(status);
    motionPanel.dataset.status = status;
    motionToggle.setAttribute('aria-pressed', String(motionEnabled));
    motionToggle.disabled = status === 'unsupported';
    motionToggle.textContent = status === 'requesting' ? 'Cancel' : motionEnabled ? 'Stop motion' : 'Enable motion';
    document.getElementById('motion-status').textContent = message;
    document.querySelector('.portrait-panel').classList.toggle('motion-playing', status === 'active');
  }

  motionToggle.addEventListener('click', () => {
    if (!motion) {
      updateMotionState({status: 'error', message: 'Motion could not load. Refresh this page and try again.'});
      return;
    }
    if (motionEnabled) {
      motion.disable();
      return;
    }
    // Both permission and audio activation must begin inside this user gesture.
    const permission = motion.enable();
    feedback.unlock();
    Promise.resolve(permission).catch(() => {
      updateMotionState({status: 'error', message: 'Open this page in Safari or Chrome, then try enabling motion again.'});
    });
  });
  document.getElementById('motion-sensitivity').addEventListener('change', (event) => {
    if (motion) motion.setSensitivity(event.target.value);
  });
  document.getElementById('sound-toggle').addEventListener('click', (event) => {
    const enabled = event.currentTarget.getAttribute('aria-pressed') !== 'true';
    event.currentTarget.setAttribute('aria-pressed', String(enabled));
    event.currentTarget.textContent = enabled ? 'Sound on' : 'Sound off';
    feedback.setSound(enabled);
    if (enabled) feedback.unlock();
  });

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
    button.addEventListener('click', () => {
      if (motion) motion.suppress(1000);
      rig.setExpression(button.dataset.expression);
    });
  });

  colourInputs.forEach((input) => {
    input.addEventListener('input', () => rig.setPalette({ [input.name]: input.value }));
  });

  function react(event) {
    feedback.unlock();
    const bounds = stage.getBoundingClientRect();
    const hasPoint = event && typeof event.clientX === 'number' && event.detail !== 0;
    const side = hasPoint ? (event.clientX < bounds.left + bounds.width / 2 ? 'left' : 'right') : (reactionCount % 2 ? 'right' : 'left');
    performReaction(side, 1);
  }

  function performReaction(side, intensity, source = 'tap') {
    const now = performance.now();
    if (now - lastReactionAt < 180) return;
    if (source === 'tap' && lastReactionSource === 'motion' && now - lastReactionAt < 600) return;
    lastReactionAt = now;
    lastReactionSource = source;
    reactionCount += 1;
    if (motion) motion.suppress(600);
    rig.slap({side, intensity});
    feedback.play(intensity);
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

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) rig.setExpression('happy');
  });
  window.addEventListener('pagehide', () => {
    if (motion) motion.disable();
    rig.destroy();
  });

  function createImpactFeedback() {
    let audio = null;
    let noise = null;
    let soundEnabled = true;
    let audioReady = null;

    function unlock() {
      if (!soundEnabled) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        if (!audio) {
          audio = new AudioContext();
          noise = audio.createBuffer(1, Math.ceil(audio.sampleRate * .09), audio.sampleRate);
          const samples = noise.getChannelData(0);
          for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;
        }
        if (audio.state === 'suspended') {
          audioReady = audio.resume();
          audioReady.catch(() => {});
        }
      } catch {
        // A browser may block audio; visual and motion play remain available.
      }
    }

    function play(intensity) {
      try {
        if (typeof navigator.vibrate === 'function') navigator.vibrate(18);
      } catch {
        // Some browsers expose vibration but deny access in embedded pages.
      }
      if (!soundEnabled || !audio) return;
      if (audio.state === 'running') {
        playAudio(intensity);
      } else if (audioReady) {
        const requestedAt = performance.now();
        audioReady.then(() => {
          if (soundEnabled && !document.hidden && audio.state === 'running' && performance.now() - requestedAt < 250) playAudio(intensity);
        }).catch(() => {});
      }
    }

    function playAudio(intensity) {
      try {
        const time = audio.currentTime;
        const source = audio.createBufferSource();
        source.buffer = noise;
        const filter = audio.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1250;
        filter.Q.value = .65;
        const gain = audio.createGain();
        gain.gain.setValueAtTime(.35 * intensity, time);
        gain.gain.exponentialRampToValueAtTime(.001, time + .085);
        source.connect(filter).connect(gain).connect(audio.destination);
        source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
        source.start(time);
        source.stop(time + .09);
      } catch {
        // Feedback support varies by browser; never interrupt the face reaction.
      }
    }

    return {unlock, play, setSound: (enabled) => { soundEnabled = enabled; }};
  }
})();
