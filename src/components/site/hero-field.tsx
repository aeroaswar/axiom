'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from 'react';

// The AXIOM particle field, ported verbatim in behaviour from the legacy site's hero module:
// a simplex-noise flow field of additive copper points, a bloom pass, a luminous thread, pointer
// swirl and a click shockwave. It is a brand asset, so the shader is unchanged.
//
// It only ever mounts when the caller has already decided motion is wanted (see hero-mount.tsx):
// never under prefers-reduced-motion, never before first paint. The colours here are the brand
// tokens as numbers because a WebGL uniform cannot read a CSS custom property.
const BG = 0x070605;
const LOW = 0x7c4c24;   // --accent-deep
const HIGH = 0xe7b173;  // --accent-bright
const THREAD = 0xc88a4e; // --accent

const SNOISE = `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + 2.0*C.xxx; vec3 x3 = x0 - 1.0 + 3.0*C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0; vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy; vec4 y = y_ * ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y); vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m*m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

const VERT = `
${SNOISE}
attribute vec3 seed; attribute float rnd;
uniform float uTime, uAppear, uScroll, uSize, uDpr, uActivity, uBurst;
uniform vec2 uPointer;
uniform vec3 uPointerW, uBurstW;
varying float vGlow; varying float vDepth;
void main(){
  vec3 p = seed;
  float t = uTime*0.06 + rnd*6.28318;
  float n1 = snoise(p*0.11 + vec3(t, 0.0, 0.0));
  float n2 = snoise(p*0.16 + vec3(0.0, t*0.8, 4.0));
  float n3 = snoise(p*0.09 + vec3(2.0, 0.0, t*0.6));
  p.x += n1*2.6;
  p.y += n2*2.0 + sin(t + seed.x*0.3)*0.6;
  p.z += n3*2.2;
  p.y += uScroll*3.0;
  p.xy += uPointer * (1.2 + p.z*0.05);
  vec2 toP = p.xy - uPointerW.xy;
  float d = length(toP);
  float radius = 2.6 + uActivity*2.4;
  float infl = smoothstep(radius, 0.0, d);
  vec2 dir = toP / max(d, 0.0001);
  vec2 tang = vec2(-dir.y, dir.x);
  p.xy += (dir*(0.9 + uActivity*1.8) + tang*(0.5 + uActivity*0.9)*sin(t*3.0 + rnd*9.0)) * infl;
  p.z  += infl * uActivity * 1.2;
  float bd = length(p.xy - uBurstW.xy);
  float ringR = (1.0 - uBurst) * 9.0;
  float ring = smoothstep(1.6, 0.0, abs(bd - ringR)) * uBurst;
  p.xy += (p.xy - uBurstW.xy) / max(bd, 0.0001) * ring * 2.4;
  p.y -= (1.0 - uAppear)*4.0;
  float flick = 0.55 + 0.45*sin(t*2.0 + rnd*20.0);
  vGlow = flick + infl*(0.7 + uActivity*1.5) + ring*1.6;
  vec4 mv = modelViewMatrix * vec4(p,1.0);
  vDepth = clamp((mv.z + 18.0)/16.0, 0.0, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uDpr * (140.0 / -mv.z) * (0.5 + rnd*0.9) * uAppear * (1.0 + infl*(0.5 + uActivity*0.7) + ring*0.8);
}`;

const FRAG = `
precision highp float;
uniform vec3 uLow, uHigh; uniform float uAppear;
varying float vGlow; varying float vDepth;
void main(){
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  if(r > 0.5) discard;
  float a = smoothstep(0.5, 0.0, r);
  float g = clamp(vGlow, 0.0, 2.4);
  vec3 col = mix(uLow, uHigh, clamp(g*vDepth, 0.0, 1.0));
  col = mix(col, vec3(1.0, 0.93, 0.82), clamp(g - 1.0, 0.0, 1.0)*0.65);
  gl_FragColor = vec4(col, a * (0.10 + 0.20*g) * (0.4 + 0.6*vDepth) * uAppear);
}`;

export default function HeroField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      const THREE: any = await import('three');
      const { EffectComposer } = await import('three/examples/jsm/postprocessing/EffectComposer.js') as any;
      const { RenderPass } = await import('three/examples/jsm/postprocessing/RenderPass.js') as any;
      const { UnrealBloomPass } = await import('three/examples/jsm/postprocessing/UnrealBloomPass.js') as any;
      if (disposed) return;

      const renderer = new THREE.WebGL1Renderer({ canvas, antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(BG);
      scene.fog = new THREE.FogExp2(BG, 0.055);

      const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 200);
      camera.position.set(0, 0, 15);
      camera.lookAt(0, 0, 0);

      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.9, 0.72, 0.12);
      composer.addPass(bloom);

      const COUNT = Math.min(window.innerWidth < 680 ? 9000 : 20000, 20000);
      const seed = new Float32Array(COUNT * 3);
      const rnd = new Float32Array(COUNT);
      for (let i = 0; i < COUNT; i++) {
        seed[i * 3] = (Math.random() * 2 - 1) * 14.0;
        seed[i * 3 + 1] = (Math.random() * 2 - 1) * 7.5;
        seed[i * 3 + 2] = (Math.random() * 2 - 1) * 4.5;
        rnd[i] = Math.random();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('seed', new THREE.BufferAttribute(seed, 3));
      geo.setAttribute('rnd', new THREE.BufferAttribute(rnd, 1));

      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 }, uAppear: { value: 0 }, uScroll: { value: 0 },
          uPointer: { value: new THREE.Vector2(0, 0) },
          uPointerW: { value: new THREE.Vector3(0, 0, 0) },
          uActivity: { value: 0 },
          uBurst: { value: 0 }, uBurstW: { value: new THREE.Vector3(0, 0, 0) },
          uLow: { value: new THREE.Color(LOW) },
          uHigh: { value: new THREE.Color(HIGH) },
          uSize: { value: window.innerWidth < 680 ? 2.1 : 2.7 },
          uDpr: { value: Math.min(window.devicePixelRatio, 2) },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
      });
      const field = new THREE.Points(geo, mat);
      scene.add(field);

      const threadCurve = new THREE.CatmullRomCurve3(
        Array.from({ length: 14 }, (_, i) => {
          const a = i / 13;
          return new THREE.Vector3(
            Math.sin(a * 6.28318 * 1.5) * 5.5 + a * 3.0 - 3.0,
            Math.cos(a * 6.28318 * 1.2) * 2.6,
            Math.sin(a * 6.28318) * 3.0,
          );
        }), false, 'catmullrom', 0.4,
      );
      const threadGeo = new THREE.TubeGeometry(threadCurve, 240, 0.028, 8, false);
      const threadMat = new THREE.MeshBasicMaterial({ color: THREAD, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const thread = new THREE.Mesh(threadGeo, threadMat);
      scene.add(thread);

      const pointer = { x: 0, y: 0, tx: 0, ty: 0, ndcX: 0, ndcY: 0, activity: 0, tActivity: 0, live: false };
      let lastMove: { x: number | null; y: number | null; t: number } = { x: null, y: null, t: 0 };
      let burst = 0;
      let scroll = 0;

      const _v = new THREE.Vector3(), _dir = new THREE.Vector3(), _world = new THREE.Vector3();
      const unprojectToField = (nx: number, ny: number) => {
        _v.set(nx, ny, 0.5).unproject(camera);
        _dir.copy(_v).sub(camera.position).normalize();
        const t = -camera.position.z / _dir.z;
        _world.copy(camera.position).addScaledVector(_dir, t);
        return field.worldToLocal(_world.clone());
      };

      const onMove = (e: MouseEvent) => {
        pointer.live = true;
        pointer.tx = e.clientX / window.innerWidth - 0.5;
        pointer.ty = -(e.clientY / window.innerHeight - 0.5);
        pointer.ndcX = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.ndcY = -((e.clientY / window.innerHeight) * 2 - 1);
        const t = performance.now();
        if (lastMove.x !== null) {
          const dt = Math.max(t - lastMove.t, 1);
          const v = Math.hypot(e.clientX - lastMove.x, e.clientY - (lastMove.y as number)) / dt;
          pointer.tActivity = Math.min(pointer.tActivity + v * 0.45, 1);
        }
        lastMove = { x: e.clientX, y: e.clientY, t };
      };
      const onDown = (e: PointerEvent) => {
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = -((e.clientY / window.innerHeight) * 2 - 1);
        mat.uniforms.uBurstW.value.copy(unprojectToField(nx, ny));
        burst = 1;
      };
      const onScroll = () => { scroll = Math.min(window.scrollY / window.innerHeight, 1.2); };
      const resize = () => {
        const w = window.innerWidth, h = window.innerHeight;
        renderer.setSize(w, h); composer.setSize(w, h);
        bloom.resolution.set(w, h);
        camera.aspect = w / h; camera.updateProjectionMatrix();
        mat.uniforms.uDpr.value = Math.min(window.devicePixelRatio, 2);
      };

      addEventListener('mousemove', onMove, { passive: true });
      addEventListener('pointerdown', onDown, { passive: true });
      addEventListener('scroll', onScroll, { passive: true });
      addEventListener('resize', resize);

      const start = performance.now();
      let running = false;
      let raf = 0;
      const frame = (nowMs: number) => {
        const t = (nowMs - start) / 1000;
        pointer.x += (pointer.tx - pointer.x) * 0.04;
        pointer.y += (pointer.ty - pointer.y) * 0.04;
        pointer.activity += (pointer.tActivity - pointer.activity) * 0.1;
        pointer.tActivity *= 0.94;
        burst = Math.max(burst - 0.016, 0);
        const appear = Math.min(Math.max((t - 0.15) / 1.8, 0), 1);
        const ease = 1 - Math.pow(1 - appear, 3);
        mat.uniforms.uTime.value = nowMs / 1000;
        mat.uniforms.uAppear.value = ease;
        mat.uniforms.uScroll.value = scroll;
        mat.uniforms.uPointer.value.set(pointer.x * 1.4, pointer.y * 1.0);
        mat.uniforms.uActivity.value = pointer.activity;
        mat.uniforms.uBurst.value = burst;
        field.rotation.y = pointer.x * 0.25 + t * 0.012;
        field.rotation.x = pointer.y * 0.12;
        thread.rotation.y = field.rotation.y;
        thread.rotation.x = field.rotation.x;
        field.updateMatrixWorld();
        if (pointer.live) mat.uniforms.uPointerW.value.copy(unprojectToField(pointer.ndcX, pointer.ndcY));
        else mat.uniforms.uPointerW.value.set(999, 999, 0);
        bloom.strength = 0.9 + pointer.activity * 0.55 + burst * 0.4;
        threadMat.opacity = (0.5 + pointer.activity * 0.25) * ease;
        camera.position.y = -scroll * 1.5;
        composer.render();
      };
      const loop = (nowMs?: number) => {
        if (!running) return;
        frame(nowMs || performance.now());
        raf = requestAnimationFrame(loop);
      };
      const play = () => { if (running) return; running = true; raf = requestAnimationFrame(loop); };
      const pause = () => { running = false; cancelAnimationFrame(raf); };
      const onVisibility = () => { if (document.hidden) pause(); else play(); };
      document.addEventListener('visibilitychange', onVisibility);

      resize();
      canvas.style.opacity = '1';
      play();

      cleanup = () => {
        pause();
        removeEventListener('mousemove', onMove);
        removeEventListener('pointerdown', onDown);
        removeEventListener('scroll', onScroll);
        removeEventListener('resize', resize);
        document.removeEventListener('visibilitychange', onVisibility);
        composer.dispose?.();
        geo.dispose(); mat.dispose(); threadGeo.dispose(); threadMat.dispose();
        renderer.dispose();
      };
    })().catch(() => { /* no WebGL, no three: the static fallback stays */ });

    return () => { disposed = true; cleanup?.(); };
  }, []);

  return (
    <div id="sceneWrap" aria-hidden="true">
      <canvas id="scene" ref={canvasRef} style={{ opacity: 0, transition: 'opacity .6s linear' }} />
      <div className="scene-scrim" />
    </div>
  );
}
