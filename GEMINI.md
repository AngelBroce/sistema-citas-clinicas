# GEMINI.md — Contexto Acotado del Proyecto MedPulse (Zero-Waste Tokens)

## 1. Stack y Arquitectura Base
- **Backend (`backend/`):** Node.js + Express + TypeScript (`tsx`), PostgreSQL 14+ (`pg`) con fallback resiliente en memoria. Puerto `4000`.
- **Frontend (`frontend/`):** Astro 5 + TypeScript + CSS Dark (`Clinical Pulse Dark`: `#090D16`, `#10B981`, `#06B6D4`, `#8B5CF6`). Puerto `4321`.
- **Almacenamiento Sincronizado Frontend:** `localStorage` clave `medpulse_citas_v2` + API REST `/api/*`.

## 2. Mapa Quirúrgico de Nodos (Referencia Rápida sin Escaneo)
- **Nodo 0 (Docs/Cierres):** `objetivos.md`, `docs/INCIDENCIAS_Y_CIERRES.md`, `docs/GEMA_MEDPULSE_ARCHITECT.md`.
- **Nodo 1 (DB):** `database/schemas/schema.sql`, `database/init_local_db.sql`.
- **Nodo 2 (Core/Auth):** `backend/src/controllers/auth.controller.ts`, `backend/src/config/db.ts`.
- **Nodo 3 (Calendario/Citas):** `backend/src/services/agendamiento.service.ts`, `backend/src/controllers/citas.controller.ts`.
- **Nodo 4 (WhatsApp/Triaje):** `backend/src/services/chatbot.service.ts`, `backend/src/controllers/whatsapp.controller.ts`, `backend/src/services/triaje.service.ts`.
- **Nodo 5 (UI Astro):** `frontend/src/pages/`, `frontend/src/components/Calendar.astro`, `frontend/src/components/Appointments.astro`, `frontend/src/components/StaffBookingForm.astro`.

## 3. Reglas de Dominio Inmutables (No reinterpretar)
1. **Anti Double-Booking:** Prohibido solapar turnos de un mismo médico.
2. **Asignación Automática:** El paciente elige médico y fecha; el sistema asigna el primer slot libre de 30 min.
3. **Cédula Panameña:** Formato `Prefijo-Tomo-Asiento` (ej. `8-1234-56789`).
4. **Cierre por Bloque:** Al finalizar cada bloque, actualizar `docs/INCIDENCIAS_Y_CIERRES.md` con una única instrucción de cierre.

