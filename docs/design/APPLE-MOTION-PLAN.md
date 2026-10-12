# AXIOM — Apple fluid-interface plan (Tier 2)

- **Status**: TODO (plan only, no code in this change)
- **Commit**: `eb89313` (Tier 1 landed in `5853295` and `eb89313` on `claude/loving-bardeen-pq2koq`)
- **Scope**: the Next app (`src/`), the public site inside it, and the phone guide (`dosage-guide/index.html`)
- **Not in scope**: `web-app/mockup/index.html` (the frozen visual contract), print-only sheets

Tier 1 already shipped: reduced-motion cross-fades (no movement), Reduce Transparency and Increase
Contrast fallbacks on every glass surface, explicit transition properties everywhere, hover gated to
`(hover:hover) and (pointer:fine)`, 1 px press feedback (the brand's own "Pressed: 1 px down,
120 ms"), 44 px touch hit areas on the smallest controls, `100dvh`/`100svh` with `100vh`
fallbacks, no tap flash, `touch-action: manipulation`. This document is what is left, in the order
it should be done. Every item cites the rule it comes from, so an executor with no context can
check the reasoning.

## Sources cited

| Short name | File |
| --- | --- |
| apple-motion §n | `.claude/skills/apple-motion/SKILL.md` (WWDC18 *Designing Fluid Interfaces* for the web) |
| AUDIT §n | `.claude/skills/improve-animations/AUDIT.md` (Emil Kowalski's audit categories) |
| STANDARDS › x | `.claude/skills/review-animations/STANDARDS.md` |
| mobile-native §n | `.claude/skills/mobile-native/SKILL.md` |
| perf › x | `.claude/skills/animation-performance/SKILL.md` |
| HIG Accessibility › x | `apple-look/references/hig/accessibility.md` |
| HIG Typography › x | `apple-look/references/hig/typography.md` |
| HIG Liquid Glass › x | `apple-look/references/hig/liquid-glass.md` |

## The brand's own motion rules (do not break these)

From `docs/superpowers/specs/2026-09-02-axiom-alive-ux-design.md` §2 and `src/styles/app.css`
("Alive" block): **one ease** `--ease: cubic-bezier(.16,1,.3,1)` (a strong ease-out — keep it),
**four budgets** micro 220 ms · reveal 700 ms · draw 950 ms · stagger 65 ms, **moves under 18 px**,
**nothing bounces**, bronze is a line or a point, never a wash. Where an Apple value would add
overshoot, this plan uses the critically damped version instead (damping 1.0, Motion `bounce: 0`).

## Order of work

| # | Title | Severity | Category | Effort | Risk | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| 001 | Sheet: 1:1 drag, velocity hand-off, projection, rubber band, interruptible | HIGH | Gesture / interruptibility | M | Medium | — |
| 002 | Sheet: enter and exit along one path (`@starting-style`) | HIGH | Spatial consistency | S | Low | 001 (shares the close path) |
| 003 | Inputs at 16 px on touch (iOS focus zoom) | HIGH | Mobile / typography | XS | Low | — |
| 004 | Sheet focus: move in, trap on phone, return on close | HIGH | Accessibility (keyboard) | S | Low | 001 |
| 005 | Layout-property animations to `transform` | MEDIUM | Performance | S | Low | — |
| 006 | Main-thread motion: count-up through a ref, hero loop paused off-screen, frame-rate-independent smoothing | MEDIUM | Performance | S | Low | — |
| 007 | Glass discipline: no glass over glass, one bar on the phone, dead glass CSS | MEDIUM | Materials | S | Low | — |
| 008 | Contrast: `--muted-2` and `--err` to WCAG AA | MEDIUM | Accessibility (vision) | XS | Medium (brand token) | owner sign-off |
| 009 | Touch targets that need layout room | MEDIUM | Accessibility (mobility) | S | Medium (layout) | — |
| 010 | Springs: where they replace fixed easing, and the value map | LOW | Behaviour over animation | — (reference) | — | 001 |
| 011 | Typography: label floor, tracking and leading per size | LOW | Typography | M | High (brand type) | owner sign-off |
| 012 | Small motion corrections (badge pop, card hover lift under stagger, site nav menu origin) | LOW | Physicality / cohesion | XS | Low | — |

Verification common to every plan: `pnpm typecheck`, `pnpm test`, `pnpm gates:lint`,
`pnpm gates:grep`, `node scripts/gates/i18n.mjs`, `pnpm build`, and the Playwright gates
(`pnpm exec playwright test`, needs Postgres via `pnpm run setup`). Gate 19 (reduced motion) must
stay green: it counts running animations whose duration is not `0.001` ms.

---

## 001 — Sheet: 1:1 drag, velocity hand-off, projection, rubber band, interruptible

- **Severity** HIGH · **Category** gesture surfaces · **Effort** M (~120 lines TSX, ~15 CSS) · **Risk** Medium (route-driven close; e2e opens sheets)

### Problem

`src/components/shell/sheet.tsx:31-32` — the phone's bottom sheet only measures the start and end
of a touch:

```tsx
onTouchStart={e => { start.current = e.touches[0].clientY; }}
onTouchEnd={e => { if (start.current !== null && e.changedTouches[0].clientY - start.current > 80) close(); start.current = null; }}>
```

Nothing moves while the finger moves (apple-motion §1 "feedback must be continuous during the
interaction", §2 "touch and content should move together"); a fast 40 px flick does not dismiss
(STANDARDS › Gestures & drag "a flick should be enough"); there is no resistance past the top edge
(apple-motion §9); the close is a route push, so the sheet vanishes rather than travelling down
(apple-motion §5 velocity hand-off, §3 interruptibility); and a drag inside `.sh-b` that is
scrolling content also counts as a dismiss.

### Target

- Pointer Events on the grab handle **and** the header (`.grab`, `.sh-h`) only, never on `.sh-b`
  (which scrolls). `setPointerCapture` on `pointerdown`; `touch-action: none` on `.grab, .sh-h`
  (mobile-native §9: the custom gesture owns every axis only where it really does).
- Hysteresis: start tracking after **10 px** of vertical travel (apple-motion §10).
- 1:1 tracking from the grab offset: `el.style.transform = \`translateY(${dy}px)\`` written to the
  element itself — never through a CSS variable on a parent (perf › Two traps; STANDARDS ›
  Performance).
- Upward past 0: `rubberband(overshoot, sheetHeight, 0.55)` from apple-motion §9:
  `(o * d * c) / (d + c * Math.abs(o))`.
- Velocity from the last pointer samples within **100 ms** (keep ≤ 5 `{y, t}` entries).
- Release: `projected = dy + (v / 1000) * 0.99 / (1 - 0.99)` (apple-motion §6, `d = 0.99` for the
  snappier sheet feel). **Dismiss** when `v > 0.11 px/ms` downward (STANDARDS › Gestures) or
  `projected > 0.5 * sheetHeight`; an upward release (`v < 0`) always settles back
  (apple-motion Quick Reference "decide reverse vs commit by velocity sign").
- Settle / dismiss: critically damped spring, **damping 1.0, response 0.30 s** (Apple's drawer is
  0.8 / 0.3; the brand forbids bounce, so damping 1.0), seeded with the release velocity
  (apple-motion §5). There is no animation library in `package.json` and none should be added for
  this; a 20-line rAF spring is enough:

```ts
// x'' = -ω²(x - target) - 2ζω·x'  with ζ = 1 (critically damped), ω = 2π / response
function settle(el: HTMLElement, from: number, to: number, v0: number /* px/s */, done?: () => void) {
  const w = (2 * Math.PI) / 0.30; let x = from, v = v0, last = performance.now(), raf = 0;
  const step = (now: number) => {
    const dt = Math.min(0.032, (now - last) / 1000); last = now;
    v += (-w * w * (x - to) - 2 * w * v) * dt; x += v * dt;
    el.style.transform = `translateY(${x}px)`;
    if (Math.abs(x - to) < 0.5 && Math.abs(v) < 10) { el.style.transform = to ? `translateY(${to}px)` : ''; done?.(); return; }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf); // interrupt: the caller reads the live transform and starts again
}
```

- Interruptible: a `pointerdown` during a settle cancels it and starts tracking from the **live**
  transform (`new DOMMatrix(getComputedStyle(el).transform).m42`), never from the target
  (apple-motion §3).
- Dismiss: settle to `sheetHeight + 8` px with the release velocity, **then** `router.push(backHref)`.
- Reduced motion: the drag still tracks 1:1 (HIG Accessibility › Cognitive "tracking animations
  directly with people's gestures" is allowed); on release, skip the spring — fade `opacity` to 0
  over 200 ms and close, or snap back to 0 (apple-motion §14).
- Desktop (≥ 1024 px, the docked panel): no drag; it is not a sheet there.

### Repo conventions

- Motion constants beside the existing ones: `--ease` in `src/app/globals.css`; durations in the
  "Alive" block of `src/styles/app.css`.
- Client components live in `src/components/shell/`; the sheet stays one component for both
  surfaces (`sheet.tsx` docblock).

### Steps

1. In `sheet.tsx`, replace the two `onTouch*` props with `onPointerDown` on `.grab` and `.sh-h`;
   track in a `useRef` (no React state per frame — perf › React).
2. Add `rubberband`, `project`, `settle` as module functions (above).
3. `close()` becomes `dismiss(v)` → settle down → `router.push(backHref, { scroll: false })`.
   Escape and the close button call `dismiss(0)`.
4. CSS: `.sheet .grab, .sheet .sh-h { touch-action: none; }` inside `@media (max-width:1023px)`;
   make `.grab` a 44 px tall hit area (`padding: 20px 0; margin: -10px auto -6px; background-clip: content-box`).
5. Keep `.sheet`'s CSS transition for the non-drag path; set `el.style.transition = 'none'` while
   dragging/settling and clear it after.

### Boundaries

- Do NOT add a dependency. Do NOT change the sheet's markup order or its route-driven contract.
- Do NOT add bounce (brand). If a step does not match the code at `eb89313`, stop and report.

### Verification

- Mechanical: the common checks above.
- Feel (real phone; emulation does not reproduce this — mobile-native §11): the sheet stays under
  the finger from the exact point grabbed; a short fast flick dismisses; a slow 60 % drag released
  slowly settles back; dragging up resists and slows; grabbing a settling sheet catches it with no
  jump; scrolling inside the body never moves the sheet.
- DevTools Animations at 10 %: the release continues at the finger's speed — no seam.
- Done when: all of the above, and Gate 18/19 still pass.

---

## 002 — Sheet: enter and exit along one path

- **Severity** HIGH · **Category** spatial consistency · **Effort** S · **Risk** Low

### Problem

`src/components/shell/sheet.tsx:29-30` mounts the scrim and the panel already `on`; with no
starting style the `transform .22s` transition at `src/styles/app.css:357-365` never plays, so the
sheet appears in one frame and leaves in one frame (route change). apple-motion §7 "if something
disappears one way, we expect it to emerge from where it came"; AUDIT §8 "spatially-connected UI
with no motion explaining where it came from".

```css
/* src/styles/app.css:365 — current */
.sheet.on{transform:translateY(0)}
```

### Target

```css
/* phone: rises from below, 220 ms (brand micro), brand ease */
@starting-style { .sheet.on { transform: translateY(101%); } .scrim.on { opacity: 0; } }
@media (min-width:1024px) {
  /* desk: the docked panel arrives from the right edge it lives on */
  @starting-style { .sheet.on { transform: translateX(18px); opacity: 0; } }
}
@media (prefers-reduced-motion:reduce) {
  @starting-style { .sheet.on { transform: none; opacity: 0; } }   /* cross-fade only */
}
```

Exit: handled by 001's `dismiss()` (it settles out along the same axis before the route push).
Browsers without `@starting-style` keep today's instant appearance — no regression.

### Verification

Open and close a sheet from the orders list on a phone and at 1440 px: it rises from / returns to
the bottom (phone) and slides 18 px from / to the right (desk); with Reduce Motion it only fades.

---

## 003 — Inputs at 16 px on touch

- **Severity** HIGH · **Category** mobile / typography · **Effort** XS · **Risk** Low (phones only)

### Problem

iOS Safari zooms into any focused input under 16 px and does not zoom back (mobile-native §4).
Current sizes: `src/styles/app.css:427` `.field input… font-size:13.5px`; `src/styles/app.css:121`
`.topbar .search input… font-size:13px`; `src/styles/site.css:160` `.site .field input… font-size:14px`;
`dosage-guide/index.html:142` `.field input[type=date]{font-size:15px}`; `dosage-guide/index.html:259`
`.search input … font-size:15px`.

### Target

```css
/* src/styles/app.css, after the .field rules; and the same block in dosage-guide/index.html */
@media (pointer:coarse){ input, select, textarea { font-size: 16px; } }
```

Desktop keeps the current sizes. Never `maximum-scale=1` (mobile-native Hard Rule 4).

### Verification

On an iPhone, focus the price-list search, the console search and the guide's date field: no zoom.

---

## 004 — Sheet focus: move in, trap on phone, return on close

- **Severity** HIGH · **Category** accessibility (keyboard) · **Effort** S · **Risk** Low

### Problem

`src/components/shell/sheet.tsx:30` declares `role="dialog" aria-modal="true"` but never moves
focus into the panel, never contains Tab, and never returns focus to the row that opened it. On a
desk the panel is docked beside a list that stays interactive, which is not modal at all.
HIG Accessibility › Speech "Let people use the keyboard alone to navigate and interact"; HIG
Accessibility › Mobility "Support mobility-related assistive technologies".

### Target

- On mount: focus the close button (`.sh-h .iconbtn`).
- Phone (`matchMedia('(max-width:1023px)')`): `aria-modal="true"`, Tab/Shift-Tab wrap inside the
  sheet, the rest of `.app` gets `inert`.
- Desk: `aria-modal` absent and `role="region"` with the same `aria-label` (it is a parallel,
  non-blocking panel — apple-motion §12 "separate to keep flow").
- On close: focus returns to the element that was focused before the sheet mounted (store
  `document.activeElement` in a ref on mount).

### Verification

Keyboard only: open an order from the list (Enter), Tab cycles inside on a phone viewport, Escape
closes, focus lands back on the same row link. Gate 18 still passes.

---

## 005 — Layout-property animations to `transform`

- **Severity** MEDIUM · **Category** performance (AUDIT §5, perf › What you animate) · **Effort** S · **Risk** Low

| Where | Current | Target | Why |
| --- | --- | --- | --- |
| `src/styles/app.css:581` + `src/components/shell/shell-client.tsx:39` | `.tab-ind{…transition:left .22s var(--ease)…}` and `style={{ left: \`${i * 20}%\` }}` | `.tab-ind{transition:transform .22s var(--ease),opacity .22s var(--ease)}` and `style={{ transform: \`translateX(${i * 100}%)\` }}` | `left` is layout; the indicator is 20 % wide, so `translateX(i*100%)` lands on the same spot (percent of its own width — STANDARDS › Transforms) |
| `src/styles/app.css:169` + `src/components/console/dashboard/screen.tsx:128`, `src/components/console/pricing/screen.tsx:152` | `.bar-fill{…transition:width .95s var(--ease)}` with inline `width:%` | keep the inline `width` (static layout), animate the draw with `transform-origin:left; @starting-style{.bar-fill{transform:scaleX(0)}} .bar-fill{transition:transform .95s var(--ease)}` | `width` re-lays-out each frame; and today it never animates on first paint anyway (no starting value) — this makes the brand's 950 ms "draw" real |
| `src/styles/app.css:391-393` | `.scroll{transition:margin-right .22s}` / `.app.panel .ruo-bar{…transition:margin-right .22s}` | no transition on `margin-right` (snap the column; the panel's own transform/opacity carries the motion) | animating `margin-right` re-lays out the whole list every frame while the panel opens (perf › "a sidebar's margin-left pushes the content beside it on every frame") |

Verification: DevTools Performance while switching tabs and opening a sheet on a mid-range phone:
no Layout entries per frame during the motion.

---

## 006 — Main-thread motion

- **Severity** MEDIUM · **Category** performance · **Effort** S · **Risk** Low

1. `src/components/console/motion.tsx:29` — `CountUp` calls `setShown(value * e)` every frame:
   a React render per frame while the dashboard is hydrating (perf › React: Don't Animate Through
   State). Target: render the finished value, keep a `ref` on a `<span>`, write
   `ref.current.textContent = idr(Math.round(value * e))` in the rAF; no state.
2. `src/components/site/hero-field.tsx:255-263` — the WebGL loop only pauses on
   `visibilitychange`; it keeps rendering 9 000–20 000 points with bloom after the visitor has
   scrolled past the hero. Target: an `IntersectionObserver` on `#sceneWrap`'s hero section (or
   `scroll > 1.2 * innerHeight`, already computed at `:211`) calls `pause()`/`play()`.
3. `src/components/site/hero-field.tsx:230-234` — pointer smoothing `pointer.x += (tx - x) * 0.04`
   per frame runs twice as fast on a 120 Hz screen. Target: `const k = 1 - Math.exp(-dt / 0.4)`
   with `dt` in seconds since the last frame (τ = 0.4 s ≈ today's 60 Hz feel); same for
   `activity` (τ = 0.16 s) and the `0.94` decay (`Math.pow(0.94, dt * 60)`).

---

## 007 — Glass discipline

- **Severity** MEDIUM · **Category** materials · **Effort** S · **Risk** Low

Inventory (live surfaces with `backdrop-filter`): `.rail` (desk sidebar), `.topbar`, `.tabbar`
(phone), `.ruo-bar` (phone, directly above the tab bar), `.sheet`, `.scrim` (blur 6 px), `.site-nav`
— **7**. Declared but unused in any component: `.glass`, `.toast`, `.spanel` (`src/styles/app.css`).
All are the **regular** variant (blur 18–24 px, fill .62–.74) — correct, since every one carries
text (HIG Liquid Glass › Which variant). No clear-variant surface exists or is needed.

| Finding | Where | Target | Rule |
| --- | --- | --- | --- |
| Glass sheet over a blurred scrim: two backdrop filters stacked, the lower one full-viewport | `src/styles/app.css:351-356` `.scrim{…background:rgba(0,0,0,.6);backdrop-filter:blur(6px)…}` | `.scrim{background:rgba(0,0,0,.66)}` — dim only, no blur | HIG Liquid Glass › Review checklist 2 "glass stacked on glass blurs the hierarchy"; apple-motion §12 "dim to focus"; perf › Blur |
| Two glass bars stacked on the phone (RUO strip on the tab bar) | `src/styles/app.css:253-255` + `:321` | make the RUO strip part of the content layer: `background: var(--bg)` (solid), keep its top hairline; the tab bar stays the one floating bar | HIG Liquid Glass › Where the material belongs "don't use Liquid Glass in the content layer" / restraint |
| Hard 1 px divider under floating bars instead of an edge effect | `.topbar` `:109-113`, `.site-nav` `site.css:22` | optional: `mask-image: linear-gradient(to bottom, #000 calc(100% - 12px), transparent)` on the scroll container's top edge only where content passes under | HIG Liquid Glass › Review checklist 6 (scroll edge effect) — LOW, look change, owner call |
| Dead glass CSS | `.glass`, `.toast`, `.spanel` | delete, or keep with a comment that names their future owner | AUDIT §1 (delete what has no purpose) |

Target count after: **5** live glass surfaces, at most **3** on screen at once on a phone
(top bar, tab bar, sheet).

---

## 008 — Contrast to WCAG AA

- **Severity** MEDIUM · **Category** accessibility (vision) · **Effort** XS · **Risk** Medium — brand tokens, needs the owner

HIG Accessibility › Vision: text up to 17 pt needs **4.5:1**. Measured on `--bg #070605`:

| Token | Value | Ratio | Used for | Proposed | Ratio on `--bg` / on solid glass `#100d0b` |
| --- | --- | --- | --- | --- | --- |
| `--muted-2` | `#6A635A` | 3.42:1 | 9–11 px secondary text (`.row .t2`, `.tbl td .sub`, `.steps .s .t1`, `.kpi .def`, placeholders) | `#81796E` | 4.72 / 4.51 |
| `--err` | `#B0553B` | 4.06:1 | refusal text, `.tone-err`, `.nx-t.tone-err` (10.5–12.5 px) | `#C05E42` | 4.74 / 4.54 |

Both keep their hue; they are lifted in lightness only. Tier 1 already raises `--muted-2` under
`prefers-contrast: more`; this item fixes the default. Same values in `dosage-guide/index.html:21`
and `company-profile/index.html` `:root` blocks.

---

## 009 — Touch targets that need layout room

- **Severity** MEDIUM · **Category** accessibility (mobility) · **Effort** S · **Risk** Medium (layout)

HIG Accessibility › Mobility: 44 × 44 pt default, 28 × 28 pt minimum. Tier 1 grew the isolated
controls with a transparent `::after`; these sit too close to neighbours for that and need room:

| Control | Where | Size now | Target |
| --- | --- | --- | --- |
| Dose chips on the account catalogue card | `src/styles/app.css:226` `.pcard .dose{padding:3px 8px;font-size:9.5px}`, gap 4 px | ~22 px tall | `@media (pointer:coarse){.app-root .pcard .dose{min-height:32px;padding:7px 10px}.app-root .pcard .doses{gap:8px}}` (≥ 28 pt minimum, spacing per HIG "about 12 points of padding" ≈ 8 px gap + border) |
| Small buttons | `src/styles/app.css:50` `.btn-sm{padding:8px 13px}` | ~33 px | `@media (pointer:coarse){.btn-sm{min-height:44px}}` |
| Invoice line controls | `src/styles/app.css:446` `.li-ctl button{width:30px;height:30px}`, gap 4 px | 30 px | `@media (pointer:coarse){.li-ctl{gap:8px}.li-ctl button{width:40px;height:40px}}` |
| RUO "read the full notice" | `src/styles/app.css:257` `.ruo-bar button{font-size:9px}` | ~16 px | `@media (pointer:coarse){.ruo-bar button{padding:12px 0;margin:-12px 0}}` |
| Filter chips (app) | `src/styles/app.css:53` `.chip{padding:4px 11px}` (when a `<button>`) | ~25 px | `@media (pointer:coarse){button.chip{min-height:36px}}` + hit-area `::after{inset:-4px 0}` |

---

## 010 — Springs: where they replace fixed easing

- **Category** behaviour over animation (apple-motion §4) · reference for 001 and any future gesture

Rule: springs for anything a hand can grab or redirect; CSS transitions / keyframes for
predetermined motion (STANDARDS › Interruptibility; perf › "The working split").

| Motion | Where | Today | Keep or spring | Apple damping / response | Motion / Framer equivalent |
| --- | --- | --- | --- | --- | --- |
| Sheet drag release / dismiss | `sheet.tsx` (001) | none | **Spring** | 1.0 / 0.30 (Apple ships 0.8 / 0.3; brand: no bounce) | `{ type: 'spring', bounce: 0, duration: 0.3, velocity: v }` |
| Docked panel open (desk) | `app.css:382-388` | `transform/opacity .22s var(--ease)` | Keep CSS (no gesture; already interruptible as a transition) | — | — |
| Tab indicator | `app.css:581` | `.22s var(--ease)` | Keep CSS (transitions retarget mid-flight) after 005 | 1.0 / 0.25 if ever made draggable | `{ type: 'spring', bounce: 0, duration: 0.25 }` |
| Site nav hide on scroll | `site.css:22-24` | `transform .3s var(--ease)` | Keep CSS — it reverses with scroll direction and a transition retargets from the current value | — | — |
| Hero pointer swirl | `hero-field.tsx:230` | per-frame lerp | Decorative spring is right (STANDARDS › Springs "decorative mouse-tracking"); fix frame-rate dependence (006) | ≈ 1.0 / 0.4 | `useSpring(x, { bounce: 0, duration: 0.4 })` |
| Reveal, hairline draw, sparkline, count-up | `app.css:543-566`, `site.css:188-191` | keyframes / transitions | Keep (predetermined, plays once) | — | — |

Mapping, for when a spring library is ever adopted: Motion's `bounce` ≈ `1 − damping`
(`bounce: 0` is critically damped) and `duration` ≈ Apple's `response`. Apple's table: move 1.0 /
0.4 → `bounce 0, duration 0.4`; rotation 0.8 / 0.4 → `bounce 0.2, duration 0.4`; drawer 0.8 / 0.3
→ `bounce 0.2, duration 0.3`. In this brand every `bounce` stays 0. Do not add a library for 001
alone; the 20-line spring in 001 is sufficient.

---

## 011 — Typography: label floor, tracking and leading per size

- **Severity** LOW · **Category** typography · **Effort** M · **Risk** High (brand type — owner sign-off)

HIG Typography › Ensuring legibility: minimum 11 pt on iOS; light weights get larger sizes.
apple-motion §15: tracking is size-specific; large display text tightens, small text loosens a
little — never one value for all sizes. Note: SF Pro's tracking table (HIG Typography › Tracking
values) does not transfer to Jost/Inter numerically; the *direction* does.

| Finding | Where | Target |
| --- | --- | --- |
| Uppercase micro labels below 9 px carry .3–.42 em tracking | `.rail .brand .sub` 7 px / .4em (`app.css:95`), `.site .brand .wmsub` 7 px / .42em (`site.css:32`) | Exempt: these are the wordmark lock-up, i.e. logo artwork |
| Functional labels at 7.5–8.5 px | `.steps .s .t1` 7.5 px mobile (`app.css:692`), `.kpi .lab` 8.5 px mobile (`app.css:309`), `.spanel .grp` 8.5 px | floor at **10 px** with **.16 em** (wider tracking does not buy legibility below 10 px; size does) |
| Display headings at one tracking from 34 to 72 px | `.site .hero h1` `clamp(34px,5.4vw,72px)` with `.site h1{letter-spacing:-.01em}` (`site.css:11`, `:74`) | `-.01em` up to ~40 px, `-.02em` from ~48 px (apple-motion §15 example): `@media (min-width:900px){.site .hero h1,.site .page-hero h1,.site .cp-head h1{letter-spacing:-.02em}}` |
| Leading | body 1.6, prose 1.85, h1 1.02–1.1, KPI values 1 | already tracks size inversely — keep |
| Sizes in px, not rem | `body{font-size:14px}` (`globals.css`), every component | Respect the user's text size (HIG Typography › Supporting Dynamic Type): move body copy and `.prose`/`.lead` to `rem` first; leave dense console tables in px. Large change — schedule separately |

---

## 012 — Small motion corrections

- **Severity** LOW · **Category** physicality / cohesion · **Effort** XS · **Risk** Low

1. `src/styles/app.css:590` `@keyframes pop{from{transform:scale(.6);opacity:0}…}` → `scale(.9)`
   (STANDARDS › Physicality: start from 0.9–0.97 + opacity).
2. `src/styles/site.css:191` `.site .stagger.in>*{opacity:1;transform:none}` comes after and has the
   same specificity as `.site .pcard:hover{…transform:translateY(-3px)}` (`site.css:125`), so on
   every staggered card grid the hover lift never shows (measured in Tier 1 verification: hovered
   card computes `transform: none`). Either drop the lift (STANDARDS frequency table: hover is
   tens/day — reduce) or raise it: `.site .stagger.in>.pcard:hover{transform:translateY(-3px)}`.
   Recommendation: drop it; keep the bronze hairline draw as the hover signal.
3. `src/styles/site.css:41-42` — the phone nav menu (`.nav-links.open{display:flex}`) appears in one
   frame. Target: grows from the toggle (top-right), STANDARDS › Physicality "origin-aware":
   `.site .nav-links.open{transform-origin:top right;transition:opacity .2s var(--ease),transform .2s var(--ease)}
   @starting-style{.site .nav-links.open{opacity:0;transform:scale(.97)}}`; reduced motion: opacity only.
4. `src/styles/site.css:124` the card hairline `transition:transform .45s cubic-bezier(.65,0,.35,1)`
   is a hover decoration slower than the UI budget; use the brand micro `220ms var(--ease)`.
