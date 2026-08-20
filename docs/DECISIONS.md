# Decisions

## 2026-08-20 — MVP runtime

The initial release prioritizes a self-contained simulation over requiring API credentials, databases, queues, or external assets. It will use Next.js server routes and an in-memory deterministic demo provider. This reduces operational risk while preserving interfaces for durable storage and live providers.

## 2026-08-20 — Codex connection

The app will not pretend it can control an arbitrary Codex Web/Desktop session. A Codex adapter will expose its configuration and capabilities clearly, while the documented integration route remains server-side and opt-in.

## 2026-08-20 — Visual engine

The warehouse is built with responsive DOM/CSS/SVG primitives in this MVP, rather than PixiJS. It is easier to test and deploy while still supporting a sophisticated animated visual. A dedicated renderer interface can support a canvas implementation later.
