# MedPulse — pantallas en Astro

Interfaz estática inspirada en las nueve pantallas de Stitch. Sin backend, endpoints, conexión PostgreSQL, autenticación real, IA ni sincronización de calendario.

## Ejecutar

Requiere Node.js 22.12 o superior compatible con Astro 7.

```sh
npm install
npm run dev
```

Abrir la dirección que imprime Astro (habitualmente http://localhost:4321).

```sh
npm run build
npm run preview
```

## Pantallas

- `/`: panel clínico.
- `/citas`: citas y calendario.
- `/pacientes`: pacientes, datos personales e historial de citas.
- `/asistente`: asistente clínico de ejemplo.
- `/paciente`: panel del paciente.
- `/paciente/citas`: mis citas y calendario.
- `/paciente/perfil`: perfil médico del paciente.
- `/paciente/reservar`: reserva con especialidad, médico, fecha y horarios dependientes.
- `/paciente/asistente`: asistente del paciente.
- `/medicos`, `/horarios`, `/especialidades`, `/consultorios`, `/usuarios`: formularios basados en los campos del SQL.

## Datos y alcance

`src/data/seeds.json` contiene los registros proporcionados, sin hashes de contraseñas. `schema.json` documenta las columnas presentes en INSERT; el archivo recibido es un seed, no el DDL completo. No se inventan diagnósticos, recetas o resultados. Los UUID se muestran como identificadores de referencia. El calendario representa octubre de 2026 y las dos citas originales; no muestra disponibilidad en tiempo real.

La edición de formularios se guarda en localStorage por registro y puede restablecerse. Los cambios de formularios no actualizan las relaciones ni los demás listados. La reserva se guarda como demostración local y muestra su código; no se incorpora a la agenda ni constituye una reserva real. No se realiza control de concurrencia. El asistente utiliza respuestas fijas. Cambiar de portal es navegación, no autorización de roles.

`referencias/` incluye los nueve diseños originales y su guía visual, para comparación. Los nombres y datos del proyecto principal corresponden al SQL, conservando sus documentos, teléfonos y fechas originales. No se necesita ejecutar el SQL.
