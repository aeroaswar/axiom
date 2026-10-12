---
name: apple-skills
description: >
  One trigger for Apple's design standard. Use whenever the user says "use apple skills",
  "apple skills", "apple standard", "make it feel like Apple", "Apple-quality", or asks to build or
  review UI, layout, typography, accessibility or motion to Apple's level. Routes the work to
  apple-look (Apple's Human Interface Guidelines, for apps: iOS, macOS, Flutter, React Native,
  Tauri, Electron) and/or apple-motion (Apple's WWDC fluid-motion rules for the web: springs,
  gestures, interruption, velocity, reduced motion). Load this first; it decides which of the two
  to apply.
---

# Apple Skills

A router. It picks the right Apple skill for what is on screen, loads it, and holds the work to one
output format. It adds no rules of its own: every rule comes from `apple-look` or `apple-motion`.

## 1. Route

Decide from the target, not from the wording of the request:

| Target | Load |
| --- | --- |
| An app: iOS, iPadOS, macOS, SwiftUI, UIKit, AppKit, Flutter, React Native, Tauri, Electron | `apple-look` |
| A website or web app: HTML/CSS/JS, React, Next.js, Vite, GSAP, Framer Motion | `apple-motion` |
| A website, and the request is about layout, type, color, contrast or accessibility | `apple-motion`, plus `apple-look` for its typography, color and accessibility pages only |
| An app, and the request is about animation, gestures or transitions | both: `apple-look` first, then `apple-motion` |
| A screenshot with no code | `apple-look` if it is an app screen, `apple-motion` if it is a web page |

If the target is truly unclear, ask one question: "Is this an app or a website?"

## 2. Load

Load the chosen skill(s) with the Skill tool (`apple-look`, `apple-motion`) before writing anything.
If a skill is not installed, say which one is missing in one line and continue with the other.
Never apply rules from memory: open the skill and its references and cite them.

## 3. Work in one of two modes

**Build** (the user wants something made):
1. List the guideline decisions first: spacing, type sizes, control sizes, grouping, color,
   dark mode, motion type (spring or curve, damping/response), reduced-motion behavior.
2. Then write the code.

**Review** (the user points at something that exists and "feels off"):
1. For every issue give **What / Why / Fix**, most important first. **Why** cites the skill
   section or HIG page and heading (for example `buttons.md › Style`, or `apple-motion §3`).
2. Then show or apply the fixed version.

## 4. Non-negotiables from both skills

- Feedback on press, not on release.
- Anything a person can touch can be interrupted, and it moves from its current on-screen value.
- Default springs have no bounce. Add bounce only when the gesture carried momentum.
- Honor reduced motion, reduced transparency and increased contrast.
- Tap targets of at least 44 by 44 points on touch.
- Glass only on the floating controls layer, never on content.
- Neither skill makes a product look like Apple. They make it follow Apple's rules, so the
  brand keeps its own look.
