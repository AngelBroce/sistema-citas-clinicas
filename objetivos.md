# 🎯 Objetivos del Proyecto

## 📌 Objetivo General

Desarrollar una **plataforma web integral** enfocada exclusivamente en automatizar la gestión de citas y agendas clínicas, integrando **asistencia por inteligencia artificial**, flujos de **triaje de pacientes** y **sincronización de calendarios digitales** para:
- Optimizar el control estricto de horarios.
- Reducir la saturación administrativa.
- Disminuir los índices de ausentismo de pacientes.

---

## 🎯 Objetivos Específicos

1. **Implementar asistencia inteligente y triaje**
   - Integrar un módulo de **Asistente Virtual (Chatbot IA)** operativo 24/7 para guiar al paciente en la reserva y resolver preguntas frecuentes.
   - Aplicar un flujo de triaje preliminar para clasificar el motivo de la consulta antes de derivar y asignar la especialidad médica adecuada.

2. **Garantizar el control estricto de horarios**
   - Desarrollar un **motor de agendamiento** respaldado en **PostgreSQL**.
   - Aplicar validaciones y bloqueos en tiempo real para impedir solapamientos de citas (*doble booking*) y asignaciones fuera del horario laboral del profesional médico.

3. **Reducir el ausentismo de pacientes**
   - Habilitar la sincronización digital directa de las reservas con calendarios personales de los usuarios (como **Google Calendar**).
   - Automatizar recordatorios y notificaciones previas a las citas programadas.

4. **Desarrollar interfaces orientadas a roles**
   - Construir portales específicos y responsivos utilizando **Astro** adaptados a cada tipo de usuario:
     - **Paciente:** Reserva de citas, historial y gestión de recordatorios.
     - **Recepción:** Confirmación de asistencias y soporte presencial/telefónico.
     - **Médico:** Visualización y control de su agenda diaria.
     - **Administrador:** Configuración global de parámetros, especialidades y horarios.

5. **Generar visibilidad y análisis de datos**
   - Proveer un módulo en el panel del Administrador con **reportes estadísticos y métricas clave** sobre:
     - Volumen y flujo de atención clínica.
     - Especialidades y médicos con mayor demanda.
     - Índices de inasistencia y cancelaciones para respaldar la toma de decisiones estratégicas.
