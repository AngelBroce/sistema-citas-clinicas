# 📋 Registro Limpio de Incidencias y Cierres de Bloque (MedPulse)

> **Propósito:** Mantener una bitácora ultra-compacta de bloques completados, decisiones técnicas e incidencias resueltas para evitar que Antigravity re-escanee el historial o reinterprete código en cada sesión (optimización de Context Caching y ahorro de tokens).

---

## ✅ Bloque 1: Infraestructura Base, Calendario Anti-Colisiones y Roles
- **Estado:** Cerrado y Verificado.
- **Nodos:** Nodo 1, Nodo 2, Nodo 3, Nodo 5.
- **Resumen Técnico:**
  - Esquema PostgreSQL con restricción `EXCLUDE USING gist` anti double-booking.
  - Asignación automática de citas (`POST /api/citas/asignar-automatica`) y soporte de Cédula Panameña (`8-XXXX-XXXXX`).
  - Calendario interactivo (`Calendar.astro`) y tabla reactiva (`Appointments.astro`) sincronizados con `medpulse_citas_v2`.

---

## ✅ Bloque 2: Optimización de Tokens, Context Caching, TOON MCP y GEMINI.md
- **Fecha:** 2026-10-28
- **Estado:** Cerrado y Activo.
- **Cambios Aplicados:**
  1. **Context Caching Activado:** Habilitado `contextCaching: true` y `contextCachingEnabled: true` en `~/.gemini/settings.json`, `~/.gemini/config/config.json` y `~/.gemini/antigravity-cli/settings.json`.
  2. **Servidor TOON MCP Integrado:** Añadido servidor `toon` (`npx -y git+https://github.com/kweinmeister/toon-mcp.git`) en `~/.gemini/config/mcp_config.json`, `~/.gemini/settings.json` y `.agents/mcp_config.json`.
  3. **Gema / Prompt Maestro Previo:** Creada plantilla lista para Gemini Gems en `docs/GEMA_MEDPULSE_ARCHITECT.md`.
  4. **Optimización de `GEMINI.md`:** Creado `GEMINI.md` acotado en la raíz del proyecto y depurados `~/.gemini/GEMINI.md`, `~/.gemini/AGENTS.md` y `~/.gemini/config/rules/prompt_maestro.md` eliminando texto redundante.

---

## ✅ Bloque 3: Módulo de Conexión por WhatsApp Empresarial (+507 6598-2118), Prompt IA de Respuestas Elegibles, NLU y Código QR
- **Fecha:** 2026-10-28
- **Estado:** Cerrado y Verificado en Vivo (`:4000` y `:4321`).
- **Nodos:** Nodo 3 (`AgendamientoService`), Nodo 4 (`ChatbotService`, `WhatsAppController`, `whatsapp.routes.ts`), Nodo 5 (`src/pages/whatsapp.astro`, `Layout.astro`).
- **Resumen Técnico:**
  1. **System Prompt de IA Clínica y Guardrails:** Sabe cómo responder con menú de opciones elegibles (`1, 2, 3, 4`) o lenguaje libre, y cómo NO responder (bloquea solicitudes de recetar medicamentos y bloquea citas ambulatorias en emergencias rojas).
  2. **Extractor Eficaz NLU:** Identifica automáticamente **Nombre del Paciente**, **Cédula Panameña** (`8-1234-56789`), **Fechas relativas** (`"hoy"` $\rightarrow$ fecha actual, `"mañana"` $\rightarrow$ fecha de mañana) y **Horas específicas** (`"a las 5"` $\rightarrow$ `17:00`, `"a las 7"` $\rightarrow$ `07:00`).
  3. **Validación de Horas Llenas / Fuera de Turno (`verificarSlotEspecifico`):** Si la hora solicitada ya fue reservada o está fuera de horario, avisa que está llena y sugiere opciones numeradas de horarios libres para elegir otra hora.
  4. **Generador de Código QR en Vivo:** Implementado con `@whiskeysockets/baileys` + `qrcode` en `GET /api/whatsapp/qr` y consola visual en `http://localhost:4321/whatsapp`.

---

## ✅ Bloque 4: Sincronización en Tiempo Real de Citas WhatsApp hacia Vistas Web (Admin, Médico, Secretaria y Paciente)
- **Fecha:** 2026-10-28
- **Estado:** Cerrado y Verificado (`GET /api/citas` $\leftrightarrow$ `medpulse_citas_v2`).
- **Nodos:** Nodo 3 (`citas.controller.ts`, `agendamiento.service.ts`), Nodo 4 (`chatbot.service.ts`), Nodo 5 (`Appointments.astro`, `Calendar.astro`, `whatsapp.astro`, `citas.astro`).
- **Incidencia Resuelta:**
  - Las citas creadas por WhatsApp se guardaban en la memoria del backend (`AgendamientoService.citas`), pero las vistas de Médico (`/doctor`, `/doctor/agenda`), Secretaria (`/secretaria`, `/secretaria/citas`) y Admin (`/citas`, `/dashboard`) leían únicamente `localStorage` o filtraban por el médico titular (`Dr. Roberto Mendoza`).
- **Solución Aplicada:**
  1. `Appointments.astro` y `Calendar.astro` ejecutan sincronización automática cada 4 segundos contra `GET /api/citas`, inyectando cualquier cita nueva de WhatsApp (tanto del simulador como de celulares reales por QR) en `medpulse_citas_v2` y `medpulse_custom_patients`.
  2. Se almacena y muestra directamente el **Nombre extraído** (`pacienteNombre`) y la **Cédula Panameña** (`pacienteDocumento`) en la tabla y en el calendario de todos los roles.
  3. Se asigna por defecto al médico activo del portal (`Dr. Roberto Mendoza`, `c0000000-0000-0000-0000-000000000001`) para que las citas de WhatsApp aparezcan de inmediato en la vista del Médico, además de Admin, Secretaria y Paciente.
  4. **Flujo de Aprobación (`PENDIENTE` $\rightarrow$ `CONFIRMADA`):** Las citas solicitadas por pacientes/WhatsApp ingresan siempre en estado **`PENDIENTE`** (etiqueta ámbar). Se habilitó el botón **`✓ Confirmar Cita`** tanto para **Administrador** (`/citas`, `/dashboard`) como para **Secretaria** (`/secretaria`, `/secretaria/citas`) y el endpoint `PATCH /api/citas/:id/estado` para pasarlas a **`CONFIRMADA`** manualmente.
  5. **Limpieza Total de Citas (`0 citas`):** Se vaciaron todas las citas semilla en [agendamiento.service.ts](../backend/src/services/agendamiento.service.ts) y [seeds.json](../frontend/src/data/seeds.json), se reseteó `localStorage` (`medpulse_reset_zero_v2`) y se añadió el botón **`🗑️ Eliminar todas las citas`** (`DELETE /api/citas`) para iniciar las pruebas desde cero.
  6. **Corrección de Login Administrador (`admin@medpulse.clinic`):** En [login.astro](../frontend/src/pages/login.astro) y [auth.controller.ts](../backend/src/controllers/auth.controller.ts), se unificó la respuesta `{ ok: true, success: true, data: { usuario } }`, se agregó el reconocimiento directo de `admin@medpulse.clinic` y se añadieron 4 botones de **Acceso Rápido en 1 Clic** en `/login`.

## ✅ Bloque 5: Rutas Dedicadas de Agendamiento para Admin y Secretaria + Protección GitHub
- **Fecha:** 2026-11-12
- **Estado:** Cerrado y Verificado (`npm run build` en backend y frontend + `git push origin main`).
- **Nodos:** Nodo 0 (`.gitignore`, `README.md`, `docs/INCIDENCIAS_Y_CIERRES.md`), Nodo 5 (`StaffBookingForm.astro`, `reservar.astro`, `secretaria/reservar.astro`, `Layout.astro`, `Calendar.astro`, `Appointments.astro`, `dashboard.astro`, `medicos.astro`, `pacientes.astro`, `secretaria/*`).
- **Incidencia Resuelta:**
  - Al pulsar **"Agendar cita"** desde el portal Administrador o Secretaria, los enlaces dirigían a `/paciente/reservar?mode=admin`, lo cual cambiaba el `Layout` lateral y la navegación al **Portal del Paciente**.
- **Solución Aplicada:**
  1. Se extrajo el componente reutilizable [`StaffBookingForm.astro`](../frontend/src/components/StaffBookingForm.astro) (`role: 'admin' | 'secretaria'`) con detección dinámica de fecha actual (`hoyStr`) para evitar fechas mínimas obsoletas.
  2. Se habilitaron rutas dedicadas [`/reservar`](../frontend/src/pages/reservar.astro) (`role="admin"`) y [`/secretaria/reservar`](../frontend/src/pages/secretaria/reservar.astro) (`role="secretaria"`), manteniendo el sidebar y contexto de cada rol intactos tras agendar o regresar.
  3. Se actualizaron todos los enlaces de agendamiento en `Layout.astro`, `Calendar.astro`, `Appointments.astro`, `dashboard.astro`, `medicos.astro`, `pacientes.astro` y vistas de `secretaria/`, con redirección de respaldo en `paciente/reservar.astro` si se recibe `?mode=admin`.
  4. Se reforzó `.gitignore` bloqueando `.wa_auth_session/` y `.env.*` (excepto `.env.example`) antes de publicar en GitHub (`origin/main`).

## ✅ Bloque 6: Limpieza de Documentación, Pruebas Automatizadas y Middlewares RBAC
- **Fecha:** 2026-11-12
- **Estado:** Cerrado y Verificado (`tsc` + `tsx --test` 15/15 + `astro build`).
- **Nodos:** Nodo 0 (`README.md`, `GRAPH_INDEX.md`, `package.json`), Nodo 1 (`database/schemas/README.md`), Nodo 2 (`auth.middleware.ts`, `auth.controller.ts`, `auth.routes.ts`, `env.ts`), Nodo 3 (`citas.routes.ts`), Nodo 4 (`whatsapp.routes.ts`), Nodo 5 (`api.ts`, `Appointments.astro`).
- **Mejoras Aplicadas:**
  1. **Documentación portable y UTF-8:** Corregido mojibake y enlaces locales en `GRAPH_INDEX.md`, `INCIDENCIAS_Y_CIERRES.md` y `database/schemas/README.md`, y alineado el árbol real en `README.md`.
  2. **Limpieza del índice de Git (`dist/`):** Retirados del tracking de Git los compilados antiguos de `frontend/MedPulse_Astro/medpulse-astro/dist/` sin borrar archivos locales.
  3. **Suite de Pruebas Automatizadas (`backend/tests/`):** Añadidos tests para `AgendamientoService` (anti double-booking, slots, asignación automática), `TriajeService`, `ChatbotService` (NLU/guardrails/WhatsApp) y `AuthMiddleware` (HMAC-SHA256 y RBAC).
  4. **Seguridad Backend (HMAC + RBAC):** Creado `backend/src/middlewares/auth.middleware.ts`, emisión de tokens firmados desde `auth.controller.ts`, ruta `GET /api/auth/me`, protección de rutas administrativas (`DELETE /api/citas`, `/whatsapp/config`, `/whatsapp/qr/iniciar`) y envío de `Authorization: Bearer` desde `api.ts` / `Appointments.astro`.

## ✅ Bloque 7: Parte 5 — Persistencia Dual PostgreSQL + Desanidación de `frontend/` + Spec Kit Global
- **Fecha:** 2026-11-12
- **Estado:** Cerrado y Verificado (`tsc` + `tsx --test` 15/15 + `astro build` + `git push origin main`).
- **Nodos:** Nodo 0 (`start-dev.mjs`, `package.json`, `README.md`, `GEMINI.md`, `GRAPH_INDEX.md`), Nodo 3 (`agendamiento.service.ts`), Nodo 5 (`frontend/`).
- **Solución Aplicada:**
  1. **5A — Monorepo Simplificado (`frontend/`):** Reubicada toda la aplicación Astro desde `frontend/MedPulse_Astro/medpulse-astro/` a `frontend/` y actualizadas todas las referencias en scripts, `GEMINI.md`, `README.md`, `GRAPH_INDEX.md` y `docs/`.
  2. **5B — Persistencia Dual PostgreSQL (`citas`):** Conectado `AgendamientoService` a `pool.query` (`SELECT/INSERT/UPDATE/DELETE` en `citas`, propagación de error `23P01` anti double-booking físico) manteniendo respaldo automático en memoria si PostgreSQL no está disponible en local.
  3. **GitHub Spec Kit Global:** Instaladas 10 skills `speckit*` desde `github/spec-kit` en `~/.gemini/config/skills/` e integradas en las directivas globales de seguimiento para todos los proyectos.








