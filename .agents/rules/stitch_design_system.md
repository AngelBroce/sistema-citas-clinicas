# Normas Maestras de Diseno UI y Prompting para Stitch (MedPulse)

Estas directivas son de aplicacion obligatoria para todas las solicitudes a **Google Stitch** y componentes de interfaz en MedPulse. Se prohibe terminantemente la generacion de pantallas monocromaticas, planas, totalmente blancas o estaticas.

---

## 1. Direccion Cromatica y Contraste de Alto Impacto
- **Prohibido:** Fondos blancos puros (`#ffffff`) o interfaces monocromaticas de un solo color opaco.
- **Base Visual:** Slate Grafito / Obsidian Profundo (`#090D16` / `#0F172A`) para dar profundidad de panel de control moderno ("Command Center").
- **Acentos Vibrantes y Semanticos:**
  - 🟢 **Esmeralda Electrico:** `#10B981` / `#059669` (Acciones principales, citas confirmadas, salud activa).
  - 🩺 **Teal / Menta Neon:** `#14B8A6` / `#06B6D4` (Turnos medicos, triaje, diagnosticos IA).
  - ⚡ **Ambar / Oro Electrico:** `#F59E0B` / `#D97706` (Alertas pendientes, sala de espera).
  - 💜 **Violeta Imperial:** `#8B5CF6` / `#7C3AED` (Administracion, analiticas, configuraciones avanzadas).
  - 🚨 **Coral / Rojo Neon:** `#F43F5E` (Urgencias clinicas, cancelaciones).
- **Gradientes de Fondo (Mesh Gradients):** Fondos con gradientes sutiles y radiales difusos (ej. `radial-gradient(circle at 15% 15%, rgba(16, 185, 129, 0.12) 0%, transparent 60%)`).

---

## 2. Arquitectura Visual: Bento Grid + Glassmorphism
- **Bento Grid Modular:** En lugar de listas o tablas planas, organizar la informacion en tarjetas asimetricas (`col-span-2`, tarjetas metricas 1x1, tarjetas de accion rapida tipo pastilla) con bordes suaves de radio `16px` o `20px` (`rounded-2xl`).
- **Glassmorphism (Frosted Glass):**
  - Fondos traslucidos en tarjetas: `background: rgba(17, 24, 39, 0.65)` o `rgba(255, 255, 255, 0.05)`.
  - Desenfoque de fondo: `backdrop-filter: blur(16px)`.
  - Bordes de cristal de 1px con destello tenue: `border: 1px solid rgba(255, 255, 255, 0.08)` o `rgba(16, 185, 129, 0.25)` en elementos activos.
  - Sombras multinivel: sombras suaves con tintes del color de acento (`box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5)`).

---

## 3. Dinamismo y Micro-Interacciones (Filosofia Emil Kowalski)
Para que las pantallas se sientan vivas, dinamicas y táctiles:
- **Regla Sub-300ms:** Transiciones rápidas y agiles (150ms a 250ms). La interfaz debe sentirse instantanea.
- **Curvas de Easing Naturales:** Siempre `ease-out` o curvas de resorte (*spring physics*), NUNCA `ease-in` ni lineal en transiciones de entrada.
- **Respuesta Tactil Activa (:active):** Todo boton y tarjeta interactiva debe incorporar estado presionado con escala sutil (`transform: scale(0.97)` o `scale(0.98)`).
- **Indicadores de Estado Vivos:**
  - Puntos pulsantes con micro-animacion ping (`animate-ping`) en verde neon para medicos disponibles o sistema online.
  - Barras de progreso con gradiente liquido continuo.
- **Micro-estados Reactivos:**
  - Efecto elevacion suave al cursor (`hover:translate-y-[-2px]` con incremento de resplandor).
  - Resplandor sutil (glow) al enfocar inputs (`ring-2 ring-emerald-500/40`).
  - Badges tipo pastilla interactivos con gradiente e iconos dinamicos.
- **Ergonomia Movil Nativa:**
  - Area de toque minima de `44x44px` en todos los controles interactivos.
  - Navegacion inferior fija (*Bottom Navigation Bar*) en pantallas moviles para acceso natural con el pulgar.

---

## 4. Filosofia Impeccable Style (Paul Bakaus) - Cero 'AI Slop'
- **Sin textos con gradientes artificiales.**
- **Sin tarjetas anidadas:** jerarquía limpia y directa.
- **Sin encabezados con etiquetas 'eyebrow' innecesarias.**
- **Iconos vectoriales reales (SVG)**, nunca emojis como iconos de interfaz.
- **Superficies del navegador tematizadas:** selección de texto, scrollbars y anillos de foco.
- **Contraste 4.5:1 riguroso.**

---

## 5. Estructura Obligatoria para Prompts a Google Stitch
Cada vez que se envie un prompt a Stitch mediante `generate_screen_from_text`:
1. **Zoom-Out (Contexto):** Especificar que es una interfaz de telemedicina/gestion clinica ultra-moderna de alta tecnologia.
2. **Estructura (Bento Grid):** Detallar la cuadricula asimetrica y la jerarquia de las tarjetas.
3. **Estilo y Tokens:** Exigir explicitamente el uso del tema Slate Obsidian oscuro con acentos Esmeralda y Teal Neon, tarjetas con efecto cristal (frosted glass) y sombras con resplandor.
4. **Elementos Dinamicos:** Describir badges de pulso, indicadores vivos, graficas fluidas con area de gradiente y botones de alto contraste tactil.
