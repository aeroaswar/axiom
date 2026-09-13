'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';
import { SPRITE } from '@/components/shell/sprite-svg';

// the wordmark is the sprite's own path (582 × 70), so the label carries the real mark
const WORDMARK = SPRITE.match(/id="wm"[^>]*><path[^>]*d="([^"]+)"/)?.[1] ?? '';

// The hero pen as a lit object: a matte black capsule with a bronze clicker, a bronze ring at the
// window, a charcoal label wrapped on the barrel carrying the compound name and the wordmark.
// It turns slowly about its own axis, so the label rolls in and out of view, and leans a few
// degrees toward the pointer. Everything on the label is a prop: nothing here names a product.
//
// It only mounts when the caller has decided motion is wanted (pen-hero.tsx): never under
// prefers-reduced-motion, never before the browser is idle, never without WebGL. The colours are
// the brand tokens as numbers because a material cannot read a CSS custom property.
const INK = 0xf2ede5;
const BRONZE = 0xc88a4e;
const BRONZE_BRIGHT = 0xe7b173;
const BODY = 0x080706;

/** A colour token from the document, so the label is drawn in the site's own palette. */
function token(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export type PenLabel = { name: string; qty?: string; wordmark: string; ruo: string; purity?: string };

function labelTexture(label: PenLabel): THREE.CanvasTexture {
  // 2:1 label like the printed one; drawn upright then wrapped so the text runs along the barrel
  const W = 720, H = 360;
  const c = document.createElement('canvas');
  c.width = H; c.height = W; // the cylinder's u runs around the barrel, v along it
  const ctx = c.getContext('2d')!;
  const ink = token('--ink', 'rgb(242,237,229)');
  const muted = token('--muted', 'rgb(159,159,156)');
  const accentBright = token('--accent-bright', 'rgb(231,178,79)');
  const accent = token('--accent', 'rgb(200,138,78)');
  ctx.fillStyle = 'rgb(26,24,22)'; // the sticker's matte charcoal, as the printed catalogue renders it
  ctx.fillRect(0, 0, c.width, c.height);
  // a faint matte grain so the sticker reads as a different finish, not a different colour
  ctx.globalAlpha = 0.035;
  ctx.fillStyle = ink;
  for (let i = 0; i < 900; i++) ctx.fillRect(Math.random() * c.width, Math.random() * c.height, 1.2, 1.2);
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.translate(0, W);
  ctx.rotate(-Math.PI / 2);
  // now drawing in a W×H space, x along the barrel, y around it
  const sans = 'Inter, "Instrument Sans", system-ui, sans-serif';
  const display = 'Jost, "Instrument Sans", system-ui, sans-serif';
  ctx.fillStyle = ink;
  ctx.textBaseline = 'alphabetic';
  if (WORDMARK) {
    ctx.save();
    ctx.translate(40, 36);
    const k = 32 / 70;
    ctx.scale(k, k);
    ctx.fill(new Path2D(WORDMARK), 'evenodd');
    ctx.restore();
  } else {
    ctx.font = `300 34px ${display}`;
    ctx.fillText(label.wordmark.toUpperCase().split('').join(String.fromCharCode(0x2009)), 40, 66);
  }
  ctx.fillStyle = accentBright;
  ctx.font = `600 15px ${sans}`;
  ctx.fillText((label.purity ?? '').toUpperCase(), 520, 60);
  ctx.fillStyle = accent;
  ctx.fillRect(40, 82, 640, 1.5);
  ctx.fillStyle = ink;
  let size = 52;
  ctx.font = `600 ${size}px ${sans}`;
  while (ctx.measureText(label.name).width > 640 && size > 22) { size -= 2; ctx.font = `600 ${size}px ${sans}`; }
  ctx.fillText(label.name, 40, 160);
  if (label.qty) {
    ctx.fillStyle = muted;
    ctx.font = `500 22px ${sans}`;
    ctx.fillText('QTY', 40, 232);
    ctx.fillStyle = ink;
    ctx.font = `500 26px ${sans}`;
    ctx.fillText(label.qty, 112, 233);
  }
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = accent;
  ctx.fillRect(40, 262, 640, 1.5);
  ctx.globalAlpha = 1;
  ctx.fillStyle = muted;
  ctx.font = `500 17px ${sans}`;
  ctx.fillText(label.ruo.toUpperCase().split('').join(String.fromCharCode(0x200a)), 40, 300);
  ctx.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.encoding = THREE.sRGBEncoding;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function windowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgb(5,4,10)';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = token('--ink', 'rgb(242,237,229)');
  ctx.font = 'italic 600 74px Inter, "Instrument Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('0', 64, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.encoding = THREE.sRGBEncoding;
  return tex;
}

export default function Pen3D({ label, onReady }: { label: PenLabel; onReady?: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const ready = useRef(onReady);
  ready.current = onReady;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let raf = 0;
    let alive = true;
    let visible = true;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
    camera.position.set(0, 0.4, 14);
    camera.lookAt(0, 0, 0);

    const key = new THREE.DirectionalLight(BRONZE_BRIGHT, 1.1);
    key.position.set(3, 5, 6);
    const rim = new THREE.DirectionalLight(0x9fb8cc, 0.9);
    rim.position.set(-5, 2, -4);
    const fill = new THREE.HemisphereLight(0x2a231c, 0x070605, 0.5);
    scene.add(key, rim, fill);

    const pen = new THREE.Group();
    scene.add(pen);
    const disposables: { dispose(): void }[] = [];
    const track = <T extends { dispose(): void }>(x: T) => { disposables.push(x); return x; };

    const bodyMat = track(new THREE.MeshPhysicalMaterial({ color: BODY, roughness: 0.55, metalness: 0.05, clearcoat: 0.35, clearcoatRoughness: 0.4, envMapIntensity: 0.22 }));
    const bronzeMat = track(new THREE.MeshPhysicalMaterial({ color: BRONZE, roughness: 0.3, metalness: 0.9, clearcoat: 0.2, envMapIntensity: 0.8 }));
    const inkMat = track(new THREE.MeshStandardMaterial({ color: INK, roughness: 0.6, metalness: 0.1 }));

    const R = 0.42;
    const body = new THREE.Mesh(track(new THREE.CapsuleGeometry(R, 6.6, 10, 56)), bodyMat);
    body.rotation.z = Math.PI / 2;
    pen.add(body);

    // the clicker end: a bronze collar and a black button, on the right
    const collar = new THREE.Mesh(track(new THREE.CylinderGeometry(R * 1.02, R * 1.02, 0.22, 56)), bronzeMat);
    collar.rotation.z = Math.PI / 2; collar.position.x = 3.5;
    const button = new THREE.Mesh(track(new THREE.CylinderGeometry(R * 0.74, R * 0.74, 0.7, 48)), bodyMat);
    button.rotation.z = Math.PI / 2; button.position.x = 3.95;
    pen.add(collar, button);

    // the dose window, a dark glass panel with the zero, just inside the collar
    const win = new THREE.Mesh(track(new THREE.CylinderGeometry(R * 1.005, R * 1.005, 0.72, 48, 1, true, Math.PI * 0.32, Math.PI * 0.36)), track(new THREE.MeshPhysicalMaterial({ map: track(windowTexture()), roughness: 0.15, metalness: 0.05, clearcoat: 1 })));
    win.rotation.z = Math.PI / 2; win.position.x = 2.7;
    pen.add(win);
    const ring = new THREE.Mesh(track(new THREE.TorusGeometry(R * 1.01, 0.028, 16, 72)), bronzeMat);
    ring.rotation.y = Math.PI / 2; ring.position.x = 2.2;
    pen.add(ring);

    // the tip end: a short bronze band and the cap, on the left
    const band = new THREE.Mesh(track(new THREE.TorusGeometry(R * 1.01, 0.03, 16, 72)), bronzeMat);
    band.rotation.y = Math.PI / 2; band.position.x = -2.35;
    const cap = new THREE.Mesh(track(new THREE.CylinderGeometry(R * 0.92, R * 0.62, 1.1, 48)), bodyMat);
    cap.rotation.z = -Math.PI / 2; cap.position.x = -3.6;
    pen.add(band, cap);

    // the label: 2:1 sticker, matte, wrapped over the front half of the barrel
    const along = 2.6;
    const around = along / 2;
    const theta = around / (R * 1.012);
    const labelGeo = track(new THREE.CylinderGeometry(R * 1.012, R * 1.012, along, 64, 1, true, -theta / 2, theta));
    const labelMat = track(new THREE.MeshStandardMaterial({ map: track(labelTexture(label)), roughness: 0.88, metalness: 0, envMapIntensity: 0.25, side: THREE.FrontSide }));
    const sticker = new THREE.Mesh(labelGeo, labelMat);
    sticker.rotation.z = -Math.PI / 2; // the cylinder's axis along the barrel, the patch facing the camera
    sticker.position.x = 0.15;
    pen.add(sticker);

    // a soft contact shadow underneath
    const sc = document.createElement('canvas'); sc.width = 256; sc.height = 64;
    const sctx = sc.getContext('2d')!;
    const g = sctx.createRadialGradient(128, 32, 4, 128, 32, 120);
    g.addColorStop(0, 'rgba(0,0,0,.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    sctx.scale(1, 0.25); sctx.fillStyle = g; sctx.fillRect(0, 0, 256, 256);
    const shadow = new THREE.Mesh(track(new THREE.PlaneGeometry(9.5, 2.4)), track(new THREE.MeshBasicMaterial({ map: track(new THREE.CanvasTexture(sc)), transparent: true, depthWrite: false })));
    shadow.position.y = -1.15; shadow.rotation.x = -Math.PI / 2;
    scene.add(shadow);

    const wm = new THREE.Mesh(track(new THREE.SphereGeometry(0.001)), inkMat); // keeps inkMat referenced for disposal
    pen.add(wm);

    pen.rotation.z = -0.1;

    const pointer = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    const size = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(el);
    const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); }, { threshold: 0.01 });
    io.observe(el);

    const start = performance.now();
    let told = false;
    const tick = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden) return;
      const t = (now - start) / 1000;
      const appear = Math.min(1, t / 1.4);
      const ease = 1 - Math.pow(1 - appear, 3);
      pen.rotation.x = Math.sin(t * 0.32) * 0.42 + (1 - ease) * 0.9;
      pen.rotation.y += ((pointer.x * 0.16) - pen.rotation.y) * 0.04;
      pen.rotation.z += ((-0.1 - pointer.y * 0.07) - pen.rotation.z) * 0.04;
      pen.position.y = Math.sin(t * 0.55) * 0.05 + (1 - ease) * -0.5;
      pen.scale.setScalar(0.94 + ease * 0.06);
      (shadow.material as THREE.MeshBasicMaterial).opacity = ease * (0.9 - Math.abs(pen.position.y) * 2);
      renderer.render(scene, camera);
      if (!told) { told = true; ready.current?.(); }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      ro.disconnect();
      io.disconnect();
      disposables.forEach(d => d.dispose());
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [label]);

  return <div ref={host} className="pen3d-canvas" />;
}
