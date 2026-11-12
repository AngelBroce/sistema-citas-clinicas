# 📋 Especificación de Interfaz de Usuario (UI Contract)
## Módulo 1: Conexión al Calendario / Agendamiento y Triaje Clínico Inteligente

> **Documento:** `docs/flows/ESPECIFICACION_UI_CALENDARIO_Y_TRIAJE.md`  
> **Fase del Flujo:** FASE 2: ESPECIFICACIÓN DE UI Y PAUSA ESTRATÉGICA (COMPUERTA MANUAL)  
> **Tecnología Frontend de Destino:** Astro (Vanilla CSS / SSR / Componentes reactivos)  
> **APIs Backend Asociadas:** `/api/citas` y `/api/triaje`

---

## 1. Submódulo A: Triaje Clínico Inteligente (Entrada al Flujo)

### 📥 1.1 Elementos de Entrada (Inputs / Formularios)
1. **Selector o Entrada de Motivo Principal:**
   - Tipo: Input de texto o textarea (`#motivoPrincipal`).
   - Propósito: Describir en lenguaje natural el motivo de la consulta (ej. "dolor de cabeza agudo", "molestias en el pecho").
   - Validación: Campo obligatorio (mínimo 5 caracteres).
2. **Listado de Síntomas Detectables / Tags seleccionables:**
   - Tipo: Checkboxes o badges interactivos (`#sintomas`).
   - Opciones frecuentes: Dolor de cabeza, Fiebre, Tos, Erupción cutánea, Mareo, Vómitos, Palpitaciones.
3. **Interruptores de Signos de Alerta Rápida (Triage Flags):**
   - Switch / Checkbox: `tieneDolorPecho` (¿Dolor opresivo o punzante en el pecho?).
   - Switch / Checkbox: `dificultadRespiratoria` (¿Sensación de ahogo o falta de aire?).
   - Switch / Checkbox: `perdidaConocimiento` (¿Desmayo o pérdida momentánea de consciencia?).
4. **Campos Opcionales de Signos Vitales:**
   - Input numérico: `temperatura` (en °C, ej. 38.2).
   - Input texto: `presionArterial` (ej. "120/80").
   - Input numérico: `duracionDias` (días de evolución de los síntomas).

### 🔘 1.2 Botones y Acciones
- **Botón Principal:** `Evaluar Síntomas y Triaje` (ejecuta `POST /api/triaje/evaluar`).
- **Botón Secundario:** `Limpiar Formulario / Reiniciar`.
- **Botón de Transición:** `Proceder a Seleccionar Médico y Cita` (se habilita tras obtener el resultado del triaje, transfiriendo la especialidad recomendada).

### 📊 1.3 Variables y Datos a Mostrar (Output de la API)
- `triajeId`: Identificador único de la evaluación.
- `nivelTriaje`: Nivel de clasificación clínica (`LEVE`, `MODERADO`, `URGENTE`).
- `colorAlerta`: Color semafórico del badge (`verde`, `amarillo`, `rojo`).
- `prioridadAtencion`: Etiqueta explicativa (ej. *"Atención Inmediata o Urgencias Hospitalarias (Prioridad 1)"* o *"Consulta Prioritaria en menos de 24-48 horas"*).
- `especialidadNombre`: Especialidad médica recomendada automáticamente (ej. *Medicina General*, *Cardiología*, *Pediatría*, *Dermatología*).
- `especialidadSugeridaId`: ID interno para preseleccionar la especialidad en el calendario.
- `recomendaciones`: Lista de viñetas con indicaciones preventivas y de cuidado previo a la consulta.
- `requiereAtencionInmediata`: Booleano para activar banner de advertencia crítica de emergencia.

### ⚠️ 1.4 Estados de la Interfaz
- **Estado Inicial:** Formulario limpio esperando entrada del paciente.
- **Estado Evaluando (Loading):** Spinner de análisis clínico y deshabilitación de botones.
- **Estado Éxito (Triaje Clasificado):** Tarjeta con color semafórico destacado, resumen clínico y sugerencia de agendamiento.
- **Estado Alerta Crítica (Nivel URGENTE):** Alerta en rojo parpadeante con número de emergencias y botón de asistencia prioritaria.
- **Estado Error:** Mensaje de error de validación o fallo de conexión.

---

## 2. Submódulo B: Conexión al Calendario y Agendamiento Anti-Colisión

### 📥 2.1 Elementos de Entrada (Inputs / Selectores)
1. **Selector de Especialidad Médica:**
   - Tipo: Desplegable `<select>` (`#especialidadId`).
   - Comportamiento: Pre-seleccionado con el resultado del triaje.
2. **Selector de Médico:**
   - Tipo: Desplegable `<select>` (`#medicoId`).
   - Comportamiento: Filtra los profesionales habilitados para la especialidad seleccionada.
3. **Selector de Fecha de Consulta:**
   - Tipo: Input de calendario `<input type="date">` (`#fecha`).
   - Validación: Restringido a fechas futuras (`min = hoy`).
4. **Matriz de Selección de Turnos Horarios (Slots Grid):**
   - Tipo: Botones de radio o cuadrícula de chips clicables (`#slotHora`).
   - Comportamiento: Alimentado reactivamente por `GET /api/citas/disponibilidad?medicoId=...&fecha=...`. Solo muestra horas libres reales.
5. **Checkbox de Sincronización Externa:**
   - Switch / Checkbox: `sincronizarGoogleCalendar` (por defecto `true`).
   - Etiqueta: *"Añadir automáticamente a mi Google Calendar y generar enlace de recordatorio"*.
6. **Campo de Notas / Motivo:**
   - Tipo: Input o Textarea (`#motivoConsulta`).
   - Comportamiento: Precargado con el resumen del triaje.

### 🔘 2.2 Botones y Acciones
- **Botón Primario:** `Confirmar y Agendar Cita` (ejecuta `POST /api/citas/reservar`).
- **Botón Secundario:** `Cambiar Fecha / Médico`.
- **Botón de Enlace Externo:** `Abrir en Google Calendar` (visible tras confirmar la cita).

### 📊 2.3 Variables y Datos a Mostrar (Output de la API)
- `codigoCita`: Código único de reserva (ej. `CITA-202610-001`).
- `fechaHoraInicio` y `fechaHoraFin`: Rango exacto de la cita formateado en hora local.
- `consultorio`: Nombre del consultorio y piso asignado.
- `estado`: Estado actual de la cita (`PENDIENTE` o `CONFIRMADA`).
- `googleCalendarEvent.linkEvento`: Enlace de reunión o acceso directo al evento sincronizado.
- `totalSlotsDisponibles`: Contador de turnos libres para la fecha elegida.

### ⚠️ 2.4 Estados de la Interfaz
- **Estado Sin Horarios:** Banner informativo *"No hay turnos disponibles para este profesional en la fecha seleccionada. Por favor seleccione otro día o médico."*
- **Estado Conflicto / Colisión (HTTP 409):** Mensaje de bloqueo en tiempo real: *"El horario seleccionado acaba de ser reservado. Por favor seleccione otro turno."*
- **Estado Exitoso de Reserva:** Tarjeta de confirmación con ticket descargable, badge de estado y enlace directo al Google Calendar del paciente.

---

## 3. Próximo Paso en el Flujo de Trabajo (Compuerta Manual)
De acuerdo a la **Fase 2 de las reglas de arquitectura**, queda detenida toda generación de vistas o invocación de diseño hasta recibir el boceto visual del usuario en formato `.png` (exportado desde Pencil Project).
