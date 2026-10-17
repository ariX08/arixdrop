'use client';

import { useEffect, useRef } from 'react';
import './Dither.css';
import { VERTEX, WAVE_FRAGMENT, DITHER_FRAGMENT } from './ditherShaders';

const MODES = { bayer: 0, bayer4: 1, bayer2: 2, halftone: 3, lines: 4, crosshatch: 5, random: 6, none: 7 };
const EFFECTS = { erase: 0, reveal: 1, ripple: 2 };
const MAX_TRAIL = 16;
const MAX_RIPPLES = 4;
const MAX_PALETTE = 8;
const INTRO_SECONDS = 1.8;
const RIPPLE_SECONDS = 1.6;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const toLinear = (value) => (value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4));

const compile = (gl, type, source) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
};

const link = (gl, fragmentSource) => {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, 'aPosition');
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const uniforms = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info) uniforms[info.name.replace('[0]', '')] = gl.getUniformLocation(program, info.name);
  }
  return { program, uniforms };
};

const Dither = ({
  waveSpeed = 0.05,
  waveFrequency = 3,
  waveAmplitude = 0.3,
  waveColor = [0.5, 0.5, 0.5],
  backgroundColor = [0, 0, 0],
  colorNum = 4,
  pixelSize = 2,
  disableAnimation = false,
  enableMouseInteraction = true,
  mouseRadius = 1,
  ditherMode = 'bayer',
  palette,
  scale = 1,
  contrast = 1,
  brightness = 0,
  mouseEffect = 'erase',
  mouseStrength = 1,
  trail = 0.5,
  clickRipple = true,
  intro = true,
  dpr = undefined,
  className = '',
  style = undefined
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const wakeRef = useRef(null);
  const settings = {
    waveSpeed, waveFrequency, waveAmplitude, waveColor, backgroundColor,
    colorNum: Math.max(2, colorNum), pixelSize: Math.max(1, pixelSize),
    disableAnimation, enableMouseInteraction,
    mouseRadius: Math.max(0.001, mouseRadius),
    mode: MODES[ditherMode] ?? 0,
    palette: Array.isArray(palette) ? palette.filter(Boolean).slice(0, MAX_PALETTE) : [],
    scale: Math.max(0.05, scale), contrast, brightness,
    effect: EFFECTS[mouseEffect] ?? 0,
    mouseStrength: Math.max(0, mouseStrength),
    trail: clamp(trail, 0, 1), clickRipple, intro, dpr
  };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    if (!container || !canvas || !gl) return undefined;

    const wave = link(gl, WAVE_FRAGMENT);
    const dither = link(gl, DITHER_FRAGMENT);
    if (!wave || !dither) return undefined;

    const buffer = gl.createBuffer();
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const field = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, field);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const framebuffer = gl.createFramebuffer();

    const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const cache = new Map();
    const toColor = (value) => {
      if (Array.isArray(value)) return [0, 1, 2].map((i) => clamp(Number(value[i]) || 0, 0, 1));
      const key = String(value);
      if (cache.has(key)) return cache.get(key);
      let rgb = [0, 0, 0];
      if (probe) {
        probe.clearRect(0, 0, 1, 1);
        probe.fillStyle = '#000000';
        probe.fillStyle = key;
        probe.fillRect(0, 0, 1, 1);
        const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
        rgb = [r, g, b].map((channel) => toLinear(channel / 255));
      }
      cache.set(key, rgb);
      return rgb;
    };

    const view = { width: 1, height: 1, ratio: 1, cell: 1, cellCss: 1, cols: 1, rows: 1 };
    const pointer = { x: 0, y: 0, inside: false, set: false };
    const trailPoints = [];
    const ripples = [];
    const trailData = new Float32Array(MAX_TRAIL * 3);
    const rippleData = new Float32Array(MAX_RIPPLES * 4);
    const paletteData = new Float32Array(MAX_PALETTE * 3);
    const state = { time: 0, hx: 0, hy: 0, presence: 0, reveal: settingsRef.current.intro && !reduce ? 0 : 1 };
    let raf = 0;
    let last = 0;
    let visible = true;

    const allocate = () => {
      const s = settingsRef.current;
      view.cell = Math.max(1, Math.round(s.pixelSize * view.ratio));
      view.cellCss = view.cell / view.ratio;
      view.cols = Math.max(1, Math.ceil(canvas.width / view.cell));
      view.rows = Math.max(1, Math.ceil(canvas.height / view.cell));
      gl.bindTexture(gl.TEXTURE_2D, field);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, view.cols, view.rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, field, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    const toUv = (x, y) => {
      const aspect = view.width / view.height;
      return [(x / view.width - 0.5) * aspect, -(y / view.height - 0.5)];
    };

    const render = () => {
      const s = settingsRef.current;
      const expected = Math.max(1, Math.round(s.pixelSize * view.ratio));
      if (expected !== view.cell) allocate();
      let trailCount = 0;
      for (let i = 0; i < trailPoints.length && trailCount < MAX_TRAIL; i++) {
        const point = trailPoints[i];
        if (point.weight <= 0.01) continue;
        trailData.set([point.x, point.y, point.weight], trailCount * 3);
        trailCount++;
      }
      let rippleCount = 0;
      for (let i = ripples.length - 1; i >= 0 && rippleCount < MAX_RIPPLES; i--) {
        rippleData.set([ripples[i].x, ripples[i].y, ripples[i].age, 1], rippleCount * 4);
        rippleCount++;
      }
      const eased = s.intro && !reduce ? state.reveal * state.reveal * (3 - 2 * state.reveal) : 1;
      gl.bindVertexArray(vao);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.viewport(0, 0, view.cols, view.rows);
      gl.useProgram(wave.program);
      const w = wave.uniforms;
      gl.uniform2f(w.uResolution, canvas.width / view.ratio, canvas.height / view.ratio);
      gl.uniform1f(w.uCell, view.cellCss);
      gl.uniform1f(w.uTime, state.time);
      gl.uniform1f(w.uWaveSpeed, s.waveSpeed);
      gl.uniform1f(w.uWaveFrequency, s.waveFrequency);
      gl.uniform1f(w.uWaveAmplitude, s.waveAmplitude);
      gl.uniform1f(w.uScale, s.scale);
      gl.uniform1f(w.uContrast, s.contrast);
      gl.uniform1f(w.uBrightness, s.brightness);
      gl.uniform1i(w.uEffect, s.effect);
      gl.uniform1f(w.uRadius, s.mouseRadius);
      gl.uniform1f(w.uStrength, s.mouseStrength);
      gl.uniform3fv(w.uTrail, trailData);
      gl.uniform1i(w.uTrailCount, trailCount);
      gl.uniform4fv(w.uRipples, rippleData);
      gl.uniform1i(w.uRippleCount, rippleCount);
      gl.uniform1f(w.uIntro, eased);
      gl.uniform1f(w.uReach, 0.5 * Math.hypot(view.width / view.height, 1) + 0.45);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(dither.program);
      const d = dither.uniforms;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, field);
      gl.uniform1i(d.uField, 0);
      gl.uniform2i(d.uFieldSize, view.cols, view.rows);
      gl.uniform1f(d.uCellDevice, view.cell);
      gl.uniform1i(d.uMode, s.mode);
      gl.uniform1f(d.uColorNum, s.colorNum);
      gl.uniform3fv(d.uWave, toColor(s.waveColor));
      const transparent = s.backgroundColor === 'transparent';
      gl.uniform3fv(d.uBackground, transparent ? [0, 0, 0] : toColor(s.backgroundColor));
      gl.uniform1f(d.uTransparent, transparent ? 1 : 0);
      s.palette.forEach((value, index) => paletteData.set(toColor(value), index * 3));
      gl.uniform3fv(d.uPalette, paletteData);
      gl.uniform1i(d.uPaletteCount, s.palette.length);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const frame = (now) => {
      raf = 0;
      if (!visible || document.hidden) return;
      const s = settingsRef.current;
      const dt = last ? clamp((now - last) / 1000, 0.0005, 0.05) : 1 / 60;
      last = now;
      if (!s.disableAnimation && !reduce) state.time += dt;
      const engaged = s.enableMouseInteraction && pointer.inside && !reduce;
      state.presence += ((engaged ? 1 : 0) - state.presence) * (1 - Math.exp(-dt / (engaged ? 0.12 : 0.35)));
      if (pointer.set) {
        const [tx, ty] = toUv(pointer.x, pointer.y);
        const follow = 1 - Math.exp(-dt / 0.06);
        const moved = Math.hypot(tx - state.hx, ty - state.hy);
        state.hx += (tx - state.hx) * follow;
        state.hy += (ty - state.hy) * follow;
        const decay = Math.exp(-dt / (0.08 + s.trail * 0.7));
        trailPoints.forEach((point) => { point.weight *= decay; });
        const head = trailPoints[0];
        if (!head || Math.hypot(head.x - state.hx, head.y - state.hy) > 0.012 || moved > 0.012) {
          trailPoints.unshift({ x: state.hx, y: state.hy, weight: state.presence });
        } else {
          head.x = state.hx; head.y = state.hy; head.weight = state.presence;
        }
        if (s.trail <= 0.001) trailPoints.length = Math.min(trailPoints.length, 1);
        while (trailPoints.length > MAX_TRAIL || (trailPoints.length > 1 && trailPoints[trailPoints.length - 1].weight < 0.01)) trailPoints.pop();
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].age += dt;
        if (ripples[i].age >= RIPPLE_SECONDS) ripples.splice(i, 1);
      }
      if (!s.intro || reduce) state.reveal = 1;
      else if (state.reveal < 1) state.reveal = Math.min(1, state.reveal + dt / INTRO_SECONDS);
      render();
      const busy = !s.disableAnimation || state.reveal < 1 || ripples.length > 0 || state.presence > 0.002 || trailPoints.some((p) => p.weight > 0.01);
      if (busy && !reduce) raf = requestAnimationFrame(frame);
      else last = 0;
    };

    const wake = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };

    const resize = () => {
      const s = settingsRef.current;
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      const ratio = Math.min(s.dpr || window.devicePixelRatio || 1, 2);
      view.width = width; view.height = height;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      view.ratio = canvas.width / width;
      allocate(); render(); wake();
    };

    const locate = (event) => {
      const rect = container.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.inside = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= rect.width && pointer.y <= rect.height;
      if (pointer.inside && !pointer.set) {
        const [x, y] = toUv(pointer.x, pointer.y);
        state.hx = x; state.hy = y; pointer.set = true;
      }
    };

    const onPointerMove = (event) => { locate(event); wake(); };
    const onPointerDown = (event) => {
      const s = settingsRef.current;
      locate(event);
      if (!pointer.inside || !s.clickRipple || reduce) return;
      const [x, y] = toUv(pointer.x, pointer.y);
      ripples.push({ x, y, age: 0 });
      if (ripples.length > MAX_RIPPLES) ripples.shift();
      wake();
    };
    const onPointerUp = (event) => { if (event.pointerType !== 'mouse') pointer.inside = false; };
    const onPointerLeave = () => { pointer.inside = false; };
    const onVisibility = () => { last = 0; wake(); };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) { last = 0; wake(); }
    });
    intersection.observe(container);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibility);
    resize();

    let lastDpr = settingsRef.current.dpr;
    wakeRef.current = () => {
      const s = settingsRef.current;
      if (s.dpr !== lastDpr) { lastDpr = s.dpr; resize(); return; }
      if (!raf) render();
      wake();
    };

    return () => {
      cancelAnimationFrame(raf);
      wakeRef.current = null;
      resizeObserver.disconnect();
      intersection.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      gl.deleteProgram(wave.program);
      gl.deleteProgram(dither.program);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteTexture(field);
      gl.deleteFramebuffer(framebuffer);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  useEffect(() => { wakeRef.current?.(); });

  return (
    <div ref={containerRef} className={`dither-container${className ? ` ${className}` : ''}`} style={style}>
      <canvas ref={canvasRef} className="dither-canvas" aria-hidden="true" />
    </div>
  );
};

export default Dither;
