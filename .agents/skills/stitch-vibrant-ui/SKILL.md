---
name: stitch-vibrant-ui
description: >-
  Directrices, tecnicas de prompting 'Zoom-Out / Zoom-In' y tokens de diseno para generar interfaces vibrantes, dinamicas y de alta fidelidad con Google Stitch, incorporando micro-interacciones de Emil Kowalski y evitando disenos planos, blancos o monocromaticos.
---

# Skill: Generacion de UI Dinamica y Vibrante en Google Stitch

Esta habilidad ensena como transformar requerimientos clinicos en prompts avanzados para **Google Stitch**, garantizando interfaces vivas con Bento Grid, Glassmorphism, cromatica de alto impacto y micro-interacciones de Emil Kowalski.

---

## 1. El Flujo de Trabajo en Google Stitch
Para que Stitch no genere pantallas genericas por defecto:
1. **Cargar `DESIGN.md`:** Utilizar `upload_design_md` con el contenido base64 de [DESIGN.md](file:///c:/Users/fioni/Documents/Proyecto%20de%20SOftware/DESIGN.md).
2. **Generar el Design System:** Ejecutar inmediatamente `create_design_system_from_design_md`.
3. **Generar Pantalla Enlazada:** Al llamar a `generate_screen_from_text`, pasar el `designSystem` obtenido y el prompt formulado con la estructura **Zoom-Out / Zoom-In**.

---

## 2. Plantilla de Prompting "Zoom-Out, Zoom-In" para Stitch

Cuando formules la propiedad `prompt` para Stitch, utiliza siempre esta estructura:

```text
Context & Identity:
Design an ultra-modern, production-grade clinical command-center interface for MedPulse.
Target audience expects a high-tech, reassuring, and dynamic medical dashboard experience.

Visual Paradigm & Layout:
- Structure: Responsive Bento Grid architecture with asymmetric card groupings and generous 16px/24px internal padding.
- Containers: Frosted glass panels (backdrop-blur 16px, background rgba(15, 23, 42, 0.7), subtle 1px refractive light borders).
- Corners: Smooth rounded-2xl (20px) radius on containers, rounded-full on status pills.

Dynamic Color & Tokens:
- Canvas: Deep obsidian slate foundation (#090D16) with subtle ambient mesh glow behind primary widgets.
- Accents: High-chroma electric emerald (#10B981) for primary actions, verified doctor badges and active statuses.
- Secondary Accents: Cyber teal/cyan (#14B8A6) for triage telemetry, warm amber (#F59E0B) for waiting slots, imperial violet (#8B5CF6) for clinical analytics.
- Text: Pure crisp ice-white (#F8FAFC) for headers and values, slate (#94A3B8) for labels.

Emil Kowalski Motion & Micro-Interactions:
- Micro-interactions: Active pulse indicators (pulsing dot rings) next to online doctors.
- Tactile feedback: :active scale(0.97) pressed physics and subtle hover elevations with accent halo glow.
- Transitions: Under 250ms snappy response with ease-out spring-feel curve.
- Mobile: Minimum 44px touch targets and fixed bottom mobile navigation bar.
```
