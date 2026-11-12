# MedPulse Modern Clinical Design System (DESIGN.md)

## Brand Identity & Aesthetic Principles
MedPulse is a next-generation clinical management platform designed with a high-tech, human-centric aesthetic. The interface eliminates outdated corporate white grids and replaces them with an immersive, dynamic command-center experience using **Bento Grid Architecture**, **Refractive Glassmorphism**, and **Vibrant High-Chroma Healthcare Accents**.

---

## 1. Color Tokens (Semantic & High-Chroma)

### Canvas & Surfaces (Obsidian Slate)
- `--bg-canvas`: `#090D16` (Deep obsidian base)
- `--bg-surface-glass`: `rgba(15, 23, 42, 0.70)` (Frosted glass card surface)
- `--bg-surface-elevated`: `rgba(30, 41, 59, 0.85)` (Elevated modal/dropdown surface)
- `--border-glass`: `rgba(255, 255, 255, 0.08)` (Crisp 1px refractive light edge)
- `--border-active-glow`: `rgba(16, 185, 129, 0.40)` (Focused emerald outline)

### Core Semantic Accents
- `--accent-emerald`: `#10B981` (Primary clinical action, verified status, healthy state)
- `--accent-emerald-glow`: `rgba(16, 185, 129, 0.25)` (Soft ambient light for badges and active pills)
- `--accent-teal-cyan`: `#14B8A6` (Medical appointments, triage AI, diagnostic cues)
- `--accent-amber-gold`: `#F59E0B` (Waiting queue, reminders, pending actions)
- `--accent-violet`: `#8B5CF6` (Specialized modules, analytics, admin actions)
- `--accent-rose-coral`: `#F43F5E` (Urgent triage, cancelled slots, emergency alerts)

### Typography Colors
- `--text-primary`: `#F8FAFC` (High contrast pure clarity)
- `--text-secondary`: `#94A3B8` (Soft muted slate)
- `--text-tertiary`: `#64748B` (Subtle metadata and timestamp text)

---

## 2. Layout & Spatial Architecture
- **Grid Paradigm:** Modular Responsive Bento Grid with asymmetric 12-column spans (e.g., 8-col active schedule + 4-col quick triage summary).
- **Corner Radii:**
  - Container / Cards: `20px` (`rounded-2xl`)
  - Buttons & Inputs: `12px` (`rounded-xl`)
  - Badges & Pills: `9999px` (`rounded-full`)
- **Spacing Scale:** 4px baseline grid (8px, 12px, 16px, 24px, 32px, 48px).

---

## 3. Depth & Visual Texture (Glassmorphism)
- **Blur Intensity:** `backdrop-filter: blur(16px)` with `-webkit-backdrop-filter: blur(16px)`.
- **Lighting Bleed:** Ambient mesh gradients (`radial-gradient(ellipse at top left, rgba(16, 185, 129, 0.15) 0%, transparent 50%)`).
- **Card Shadow:** Multi-tier soft elevation `box-shadow: 0 12px 32px -4px rgba(0, 0, 0, 0.6), 0 4px 12px -2px rgba(16, 185, 129, 0.1)`.

---

## 4. Motion & Micro-Interactions
- **Status Indicators:** Live pulsing beacon dots (`animation: pulse 2s infinite ease-in-out`) indicating active medical staff or real-time appointment updates.
- **Hover Transitions:** Smooth spring lift (`transform: translateY(-2px) scale(1.015); transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1)`).
- **Data Visualizations:** Smooth curved area charts with dynamic emerald-to-transparent gradient fills underneath.
- **Button Feedback:** Soft glow border expansion on focus and press.
