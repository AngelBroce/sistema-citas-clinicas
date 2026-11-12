# 📋 Especificación de Interfaz de Usuario (UI Contract)
## Módulo 5: Conexión Empresarial por WhatsApp (Número Personal como Empresa de Prueba) y Agendamiento Conversacional 24/7

> **Documento:** `docs/flows/ESPECIFICACION_UI_WHATSAPP_EMPRESA.md`  
> **Fase del Flujo:** FASE 2: ESPECIFICACIÓN DE UI Y PAUSA ESTRATÉGICA (COMPUERTA MANUAL)  
> **Tecnología Frontend de Destino:** Astro (Clinical Pulse Dark / Componentes Reactivos)  
> **APIs Backend Asociadas (Fase 1 Completada):**  
> - `GET /api/whatsapp/config` & `POST /api/whatsapp/config`  
> - `GET /api/whatsapp/conversaciones`  
> - `POST /api/whatsapp/simular`  
> - `POST /api/whatsapp/reiniciar`  
> - `GET /api/whatsapp/webhook` & `POST /api/whatsapp/webhook`  
> - `POST /api/citas/asignar-automatica` (Sincronizado con `AgendamientoService`)

---

## 1. Submódulo A: Panel de Vinculación de Número Personal como Cuenta de Empresa (WhatsApp Business Sandbox)

Permite que el usuario registre su propio número de teléfono personal como el **Número Oficial de la Clínica/Empresa** para realizar pruebas reales o simuladas de extremo a extremo.

### 📥 1.1 Elementos de Entrada (Inputs / Formularios)
1. **Input de Número de WhatsApp Empresarial (Tu Número):**
   - Identificador: `#numeroWhatsAppEmpresa` (`type="tel"`).
   - Placeholder: `ej. +507 6123-4567`.
   - Propósito: Registrar el número personal del usuario como la línea receptora/emisora de la clínica.
2. **Input de Nombre de la Empresa / Clínica en WhatsApp:**
   - Identificador: `#nombreEmpresa` (`type="text"`).
   - Valor por defecto: `MedPulse Clínica Inteligente (Panamá)`.
3. **Selector de Modo de Operación:**
   - Identificador: `#modoOperacion` (`<select>`).
   - Opciones:
     - `SIMULACION_LOCAL_Y_WEBHOOK`: Pruebas inmediatas sin requerir token de Meta (guarda citas directamente en la agenda clínica).
     - `META_CLOUD_API_LIVE`: Conexión en vivo con Meta for Developers (WhatsApp Cloud API).
4. **Campos Opcionales de Credenciales Meta Cloud API (Colapsables):**
   - `#phoneNumberId`: ID del número de teléfono en Meta Developer Portal.
   - `#wabaId`: ID de la cuenta de WhatsApp Business.
   - `#verifyToken`: Token de seguridad para el Webhook (`medpulse_wa_secure_2026`).
   - `#accessToken`: Token Bearer temporal o permanente de Meta Graph API.

### 🔘 1.2 Botones y Acciones
- **Botón Principal:** `Vincular Mi Número como Empresa` (ejecuta `POST /api/whatsapp/config`).
- **Botón de Enlace Directo (`wa.me`):** `Abrir en mi WhatsApp Real` (genera enlace `https://wa.me/<numero>?text=...` y código QR escaneable para probar desde el teléfono físico).
- **Botón Copiar Webhook:** `Copiar URL del Webhook` (`/api/whatsapp/webhook`).

### 📊 1.3 Variables a Mostrar
- `numeroWhatsAppEmpresa`: Número activo vinculado actualmente.
- `nombreEmpresa`: Nombre visible en la cabecera del perfil comercial de WhatsApp.
- `modoOperacion`: Badge indicador (`Modo Sandbox Activo` en verde esmeralda o `Meta Cloud API Live` en cian).
- `verifyToken`: Token listo para pegar en la consola de Meta.

---

## 2. Submódulo B: Consola Interactiva de WhatsApp y Guardado Automático de Citas

Permite conversar en tiempo real con el bot clínico usando el número del usuario, realizar el triaje de síntomas y **guardar automáticamente la cita médica** tanto en el backend (`AgendamientoService`) como en la agenda global del frontend (`localStorage` / Calendario y Tabla de Citas).

### 📥 2.1 Elementos de Entrada (Inputs / Controles del Chat)
1. **Input de Número Remitente de Prueba:**
   - Identificador: `#telefonoRemitente` (sincronizado automáticamente con el número del usuario).
2. **Chips de Mensajes Rápidos de Prueba (1-Click Prompts):**
   - Chip 1 (Paso 1 - Síntomas Leves): *"Hola, tengo dolor de cabeza y malestar general desde ayer"*
   - Chip 2 (Paso 1 - Síntomas Cardiológicos Moderados): *"Hola, siento palpitaciones y presión arterial alta"*
   - Chip 3 (Paso 2 - Confirmar Cédula y Fecha para Guardar Cita): *"Mi cédula es 8-1234-56789 para el 2026-10-20"*
   - Chip 4 (Caso Urgente / Alerta Roja): *"Tengo fuerte dolor de pecho y falta de aire"*
3. **Caja de Texto de Mensaje de WhatsApp:**
   - Identificador: `#mensajeWhatsAppInput` (`type="text"`).
   - Placeholder: *"Escribe un mensaje o tu Cédula + Fecha para agendar..."*

### 🔘 2.2 Botones y Acciones
- **Botón Enviar Mensaje:** `Enviar a WhatsApp` (ejecuta `POST /api/whatsapp/simular`).
- **Botón Reiniciar Chat:** `Reiniciar Conversación` (ejecuta `POST /api/whatsapp/reiniciar`).
- **Botón Ver en Calendario:** `Ver Cita Guardada en el Calendario` (redirige a `/citas` o `/paciente/citas` resaltando la cita recién creada por WhatsApp).

### 📊 2.3 Variables y Datos a Mostrar (Output de la API)
- **Historial de Burbujas de Chat (`mensajes`):**
  - `remitente`: `USUARIO` (burbuja verde derecha) vs `BOT` (burbuja oscura izquierda con formato WhatsApp).
  - `contenido`: Texto formateado con negritas, iconos médicos y hora de envío (`creadoEn`).
  - `intencionDetectada`: Badge técnico en cada mensaje (`EVALUACION_TRIAJE`, `PROPUESTA_AGENDAMIENTO`, `CITA_GUARDADA`).
- **Tarjeta de Estado de la Conversación y Triaje En Vivo:**
  - `estadoConversacion`: (`ACTIVA`, `ESPERANDO_CEDULA_FECHA`, `FINALIZADA`, `DERIVADA_RECEPCION`).
  - `nivelTriaje`: Badge semafórico (`LEVE`, `MODERADO`, `URGENTE`).
  - `especialidadSugerida`: Especialidad asignada por el motor clínico.
  - `medicoSugerido`: Médico asignado según disponibilidad.
- **Tarjeta de Confirmación de Cita Guardada (`citaCreada`):**
  - `codigoCita`: Código único generado (ej. `CITA-849201`).
  - `fechaHoraInicio` / `fechaHoraFin`: Fecha y turno asignado automáticamente sin colisiones.
  - `consultorioId`: Consultorio asignado.
  - `canalOrigen`: `CHATBOT_WHATSAPP`.

### ⚠️ 2.4 Estados de la Interfaz
- **Estado Inicial:** Chat con mensaje de bienvenida de la empresa y chips de prueba rápida listos.
- **Estado Escribiendo (`Typing...`):** Indicador visual *"MedPulse Bot está evaluando síntomas..."*.
- **Estado Esperando Confirmación:** Banner indicando que solo falta responder con **Cédula + Fecha** para guardar la cita.
- **Estado Éxito (Cita Guardada en Agenda):** Alerta verde esmeralda confirmando que la cita se ha guardado en el calendario clínico y sincronizado con `medpulse_citas_v2`, mostrando el botón directo para verla en `/citas`.
- **Estado Alerta Roja (`URGENTE`):** Banner rojo indicando derivación inmediata a urgencias hospitalarias (bloqueando agendamiento ambulatorio por seguridad).

