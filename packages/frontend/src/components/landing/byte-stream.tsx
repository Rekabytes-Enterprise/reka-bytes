'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/use-media-query';

/**
 * ByteStream — signature WebGL hero visual.
 * A fullscreen-quad fragment shader renders a drifting field of "bit" cells
 * (bright square = 1, dim dot = 0) that flicker and glow near the cursor.
 * Pauses when offscreen; static gradient when reduced-motion is preferred.
 * Decorative only — aria-hidden.
 */
export function ByteStream({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reducedMotion) return;

    const gl = canvas.getContext('webgl', { antialias: false });
    if (!gl) return;

    const VERT = `
      attribute vec2 a_pos;
      void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
    `;

    const FRAG = `
      precision highp float;
      uniform vec2 u_res;
      uniform float u_time;
      uniform vec2 u_mouse;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      void main() {
        // bit cells
        float cellSize = 26.0;
        vec2 frag = gl_FragCoord.xy;
        vec2 cell = floor(frag / cellSize);
        // slow upward drift
        float drift = floor(u_time * 3.0);
        vec2 scrolled = vec2(cell.x, cell.y + drift);
        float r = hash(scrolled);

        vec2 g = fract(frag / cellSize);
        // bit glyph: filled square for "1", small dot for "0"
        float sq = step(0.25, g.x) * step(g.x, 0.75) * step(0.2, g.y) * step(g.y, 0.8);
        float dot_ = step(length(g - 0.5), 0.14);
        float shape = r > 0.72 ? sq : dot_;

        // sparse population + flicker
        float alive = step(0.22, hash(cell * 0.77));
        float flicker = 0.75 + 0.25 * sin(u_time * (1.0 + r * 6.0) + r * 40.0);

        // accent color near cursor, faint mono elsewhere
        vec2 mousePx = u_mouse * u_res;
        float d = length(frag - mousePx) / min(u_res.x, u_res.y);
        float glow = exp(-d * 5.0);

        vec3 dimColor = vec3(0.34, 0.37, 0.40);   // brighter mono bits
        vec3 accent = vec3(0.776, 1.0, 0.29);      // #C6FF4A

        vec3 col = mix(dimColor, accent, clamp(glow * 1.6, 0.0, 1.0));
        float alpha = shape * alive * flicker * (0.32 + glow * 0.85);

        gl_FragColor = vec4(col * alpha, alpha);
      }
    `;

    function compile(type: number, src: string): WebGLShader {
      const shader = gl!.createShader(type)!;
      gl!.shaderSource(shader, src);
      gl!.compileShader(shader);
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
        throw new Error(gl!.getShaderInfoLog(shader) ?? 'shader compile failed');
      }
      return shader;
    }

    let program: WebGLProgram;
    try {
      program = gl.createProgram()!;
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('link failed');
    } catch (e) {
      console.warn('[ByteStream] WebGL init failed, hero falls back to grid:', e);
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, 'u_res');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uMouse = gl.getUniformLocation(program, 'u_mouse');

    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
    });
    io.observe(canvas);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const mouse = { x: 0.5, y: 0.5 };
    const onMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      // convert to shader coords (y up)
      mouse.x = (e.clientX - rect.left) / rect.width;
      mouse.y = 1 - (e.clientY - rect.top) / rect.height;
    };
    window.addEventListener('mousemove', onMouse, { passive: true });

    let raf = 0;
    let running = true;
    const start = performance.now();
    const loop = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.clearColor(0.039, 0.043, 0.051, 1); // #0A0B0D
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [reducedMotion]);

  if (reducedMotion) {
    // Static fallback — blueprint grid instead of animation
    return (
      <div aria-hidden className={`blueprint-grid bg-inset ${className ?? ''}`} />
    );
  }

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}
