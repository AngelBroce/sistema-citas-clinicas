# 📋 Especificación de UI y Arquitectura de Pantallas Responsivas (Fase 2)
# Sistema Inteligente de Gestión de Citas Clínicas (MedPulse)

> **Documento:** ESPECIFICACION_UI_REDISENO_RESPONSIVE.md  
> **Fecha:** 2026-10-15  
> **Fase del Ciclo:** Fase 2 (Especificación de UI y Compuerta Manual)  
> **Estado:** Listo para revisión y bocetado visual en Pencil Project / Stitch  

---

## 1. 🎯 Objetivos de la Redefinición de Interfaz

1. **Diseño 100% Responsivo (Mobile-First):**
   - Adaptación fluida para teléfonos inteligentes (360px – 480px), tablets (768px – 1024px) y pantallas de escritorio (> 1200px).
   - Navegación táctil ergonómica (mínimo 44px de zona de toque por botón).
   - Reemplazo de tablas densas en móviles por tarjetas apiladas con badges legibles.
2. **Nueva Dirección Cromática (Sustitución Total del Azul):**
   - Eliminación del azul corporativo tradicional (`#172a52` / `#080f21`).
   - Adopción de la **Paleta Clínica Esmeralda & Neutros Modernos**:
     - **Color Primario:** Verde Esmeralda Clínico (`#059669` / `#10b981`) que transmite salud, precisión y calma médica.
     - **Superficies y Fondos:** Slate Grafito de alto confort óptico (`#0b0f19` en fondo general, `#111827` en tarjetas y `#1e293b` en bordes).
     - **Acentos Distintivos por Rol:**
       - 👤 **Paciente:** Verde Esmeralda (`#10b981`).
       - 🩺 **Médico:** Menta / Teal Profesional (`#14b8a6`).
       - 📋 **Recepción / Secretaria:** Ámbar Dorado Cálido (`#d97706`).
       - 🛡️ **Administrador:** Amatista Imperial (`#7c3aed`).
3. **Flujo de Agendamiento Automático de Citas:**
   - El paciente **no elige la hora manualmente**; únicamente selecciona médico, especialidad y fecha.
   - El motor asigna automáticamente el primer turno laboral disponible garantizando **cero colisiones (anti double-booking)** e informa la hora confirmada.

---

## 2. 🔌 Contratos de Datos y Endpoints API (Fase 1)

### A. Registro de Nuevo Paciente (con Gmail)
* **Endpoint:** `POST /api/auth/register-paciente`
* **Inputs Requeridos:**
  - `email`: string (ej. `nombre.paciente@gmail.com`)
  - `password`: string
  - `nombres`: string
  - `apellidos`: string
  - `documento_tipo`: 'DNI' | 'PASAPORTE' | 'CARNET_EXT'
  - `documento_numero`: string
  - `telefono`: string
* **Respuesta Exitosa (201):**
  ```json
  {
    "ok": true,
    "mensaje": "¡Paciente registrado exitosamente!",
    "token": "mock-jwt-token-paciente-...",
    "usuario": {
      "id": "p-18b...",
      "email": "nuevo.paciente@gmail.com",
      "nombreCompleto": "Carlos Mendoza",
      "rol": "PACIENTE",
      "redirectUrl": "/paciente"
    }
  }
  ```

### B. Inicio de Sesión
* **Endpoint:** `POST /api/auth/login`
* **Inputs:** `email` y `password`
* **Respuesta Exitosa (200):** Objeto `usuario` con campo `redirectUrl` (`/paciente`, `/doctor/agenda`, `/secretaria`, `/citas`).

### C. Asignación Automática de Cita Médica
* **Endpoint:** `POST /api/citas/asignar-automatica`
* **Inputs Requeridos:**
  - `pacienteId`: string
  - `medicoId`: string
  - `especialidadId`: number
  - `fecha`: string (`YYYY-MM-DD`)
  - `motivoConsulta`: string (opcional)
* **Respuesta Exitosa (201):**
  ```json
  {
    "ok": true,
    "message": "Cita asignada automáticamente para las 08:00 hrs (30 min de consulta).",
    "data": {
      "horaAsignada": "08:00 - 08:30",
      "consultorioId": 3,
      "cita": {
        "codigoCita": "CIT-PAC-4512",
        "fechaHoraInicio": "2026-10-20T08:00:00Z",
        "estado": "CONFIRMADA"
      }
    }
  }
  ```

---

## 3. 📱 Especificación Detallada de Pantallas por Rol

### 📍 PANTALLA 1: Login de Acceso Rápido y Registro
* **Propósito:** Entrada principal dividida entre acceso por credenciales (con cuentas Gmail) y atajos de demostración por rol.
* **Elementos en Móvil (< 768px):**
  - Encabezado con isotipo clínico en verde esmeralda `✚ MedPulse`.
  - Tarjetas de rol apiladas verticalmente (1 columna) con badges diferenciados.
  - Pestañas conmutables: **[Iniciar Sesión]** / **[Registrarme como Paciente con Gmail]**.
  - Formulario de Registro:
    - Input `email` (tipo email con placeholder `tu.correo@gmail.com`).
    - Input `nombres` y `apellidos`.
    - Input `documento_numero` y selector de `documento_tipo`.
    - Input `telefono`.
    - Botón primario: *"Crear cuenta e ingresar"*.
* **Estados:**
  - Estado Inicial: Tarjetas de rol listas y formulario visible.
  - Estado Cargando: Spinner esmeralda con texto *"Verificando credenciales..."*.
  - Estado Error: Banner rojo con borde redondeado indicando mensaje de validación.

---

### 📍 PANTALLA 2: Portal del Paciente · Reserva Automática de Cita
* **Propósito:** Agendamiento simplificado donde el paciente selecciona la fecha deseada y el sistema le asigna el turno sin permitir colisiones.
* **Elementos en Móvil (< 768px):**
  - Barra superior compacta con saludo: *"Hola, [Nombre del Paciente]"* y badge verde `👤 Paciente`.
  - Selector de Especialidad (tarjetas o desplegable táctil).
  - Selector de Médico con foto de avatar y número de colegiatura.
  - Selector de Fecha (Date Picker táctil con botones de acceso rápido para la semana actual).
  - **Aviso Informativo:** *"El sistema asignará el primer turno disponible de tu médico según su horario de atención laboral"*.
  - Textarea para `Motivo de la consulta`.
  - Botón de Acción Principal: *"📅 Solicitar y Asignar Cita Médica"*.
* **Tarjeta de Confirmación Dinámica (Éxito):**
  - Badge de confirmación: `✓ CITA AGENDADA`.
  - Horario Asignado Destacado: *"🕒 08:00 a 08:30 hrs"*.
  - Consultorio asignado y nombre del profesional.
  - Botón: *"Ver en mis citas"* / *"Agendar otra consulta"*.

---

### 📍 PANTALLA 3: Portal del Médico · Agenda y Consultas
* **Propósito:** Vista personal del Dr. Mendoza o Dra. Silva para revisar citas programadas en su consultorio.
* **Elementos en Móvil (< 768px):**
  - Selector deslizante de fechas (Lunes a Viernes).
  - Contador de pacientes del día: *"8 citas programadas hoy"*.
  - Lista de pacientes citados en formato tarjeta:
    - Hora del turno (`08:00 - 08:30`).
    - Nombre del paciente y DNI.
    - Motivo clínico declarado.
    - Botón táctil: *"Iniciar Consulta / Completar"*.

---

### 📍 PANTALLA 4: Mesa de Recepción / Secretaria
* **Propósito:** Control de sala de espera y registro presencial.
* **Elementos en Móvil (< 768px):**
  - Barra de búsqueda rápida de pacientes por DNI o apellido.
  - Lista de citas del día con botón directo: *"✓ Marcar Presente / En Consultorio"*.
  - Botón flotante para registrar paciente presencial nuevo.

---

### 📍 PANTALLA 5: Panel de Administración General
* **Propósito:** Supervisión total de la clínica, consultorios y especialidades.
* **Elementos en Móvil (< 768px):**
  - Indicadores métricos clave (Citas de Paciente vs Recepción, Ocupación de Consultorios).
  - Selector de vistas globales y auditoría de usuarios.

---

## 4. 🛑 PAUSA ESTRATÉGICA (COMPUERTA MANUAL - FASE 2)

> [!IMPORTANT]
> **REGLA ESTRICTA DE LA FASE 2:**
> La especificación técnica de contratos de datos, flujo de asignación automática, paleta esmeralda y comportamiento móvil está formalmente generada.
> 
> **Próximo Paso:**
> Para continuar hacia la **Fase 3 (Integración con Google Stitch)**, por favor:
> 1. Proporciona el archivo boceto exportado desde **Pencil Project** en formato `.png` (indicando su ruta o subiéndolo), **O**
> 2. Confirma si deseas que utilicemos la herramienta `open_pencil` / `create_mockup_workspace` o invoquemos a Google Stitch directamente con esta especificación textual.
