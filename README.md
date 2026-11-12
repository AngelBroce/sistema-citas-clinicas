# 🏥 Sistema Inteligente de Gestión de Citas Clínicas

Proyecto en arquitectura monorepo para la gestión integral de citas médicas con validación en tiempo real, integración de Chatbot con Inteligencia Artificial 24/7 y sincronización con Google Calendar.

---

## 👥 División de Tareas por Rol

| Integrante | Rol | Área Principal | Responsabilidades |
| :--- | :--- | :--- | :--- |
| **Elvis** | Base de Datos (DBA) | `database/` (PostgreSQL) | • Diseño y mantenimiento de la BD relacional en PostgreSQL.<br>• Creación de entidades de acceso y roles (`usuarios`, `pacientes`, `administradores`).<br>• Tablas de gestión médica (`medicos`, `especialidades`, `consultorios`).<br>• Motor de agendamiento relacionando estrictamente `horarios_medicos` y `citas` para evitar colisiones.<br>• Tablas de soporte (`conversaciones_chatbot`, `calendarios_usuarios`). |
| **Angel** | Project Manager & Backend | `backend/` (Node.js) + `docs/` | • Gestión y planificación del proyecto asegurando cumplimiento de objetivos y tiempos.<br>• Desarrollo de API REST con Express / NestJS en TypeScript.<br>• Lógica de negocio para validación en tiempo real de horarios y prevención de conflictos.<br>• Integración de Chatbot IA y sincronización de calendarios digitales externos (Google Calendar). |
| **Elias** | Frontend Developer | `frontend/` (Astro) | • Desarrollo de la plataforma web integral con arquitectura de componentes en Astro.<br>• Construcción de interfaces específicas por perfil: Paciente, Recepción, Médico, Administrador.<br>• Integración del cliente del Chatbot asistente para reservas 24/7.<br>• Consumo de API REST de Node.js para conectar vistas con la base de datos. |

---

## 📁 Estructura del Monorepo

```text
├── frontend/                     # [Elias] Aplicación Web en Astro
│   ├── public/                   # Recursos estáticos
│   └── src/
│       ├── components/           # Componentes UI (Calendar, Appointments, StaffBookingForm, EntityForm)
│       ├── data/                 # Cliente API REST (api.ts), seeds.json e interacciones
│       ├── layouts/              # Plantilla principal por rol y navegación responsiva (Layout.astro)
│       ├── pages/                # Vistas para Paciente, Recepción (secretaria/), Médico (doctor/) y Admin
│       └── styles/               # Estilos globales y tokens (Clinical Pulse Dark)
│
├── backend/                      # [Angel] API REST en Node.js (Express / TypeScript)
│   ├── api/                      # Entrypoint Serverless para Vercel (index.ts)
│   └── src/
│       ├── config/               # Configuración de DB (PostgreSQL + fallback) y entorno
│       ├── controllers/          # Controladores HTTP (auth, citas, triaje, whatsapp)
│       ├── middlewares/          # Middlewares de autenticación, roles y validaciones
│       ├── routes/               # Enrutadores modulares de la API
│       ├── services/             # Motor anti-colisión, Chatbot WhatsApp IA/QR y Google Calendar
│       ├── types/                # DTOs y tipos TypeScript del backend
│       └── utils/                # Utilidades y script de verificación inicial
│
├── database/                     # [Elvis] Base de Datos PostgreSQL
│   ├── init_local_db.sql         # Script único ejecutable con esquema y seeds locales
│   ├── migrations/               # Scripts SQL DDL versionados
│   ├── seeds/                    # Datos iniciales para pruebas
│   ├── schemas/                  # DDL consolidado y diagramas E-R
│   └── models/                   # Modelos TypeScript correspondientes
│
└── docs/                         # [Project Management & Arquitectura]
    ├── api/                      # Documentación y especificaciones OpenAPI
    ├── architecture/             # Diagramas del sistema y modelo E-R
    ├── flows/                    # Especificaciones UI y flujos (calendario, triaje, WhatsApp)
    ├── pm/                       # Matriz de roles, Roadmap y Backlog
    └── INCIDENCIAS_Y_CIERRES.md  # Bitácora de incidencias resueltas y cierres por bloque
```

---

## 🚀 Cómo Iniciar Todo el Proyecto

Puedes iniciar el sistema completo (Backend en `:4000` + Frontend en `:4321`) con cualquiera de estas opciones:

### Opción 1: Doble Clic o CMD (Windows)
Ejecuta el archivo [iniciar.bat](./iniciar.bat) directamente haciendo doble clic o escribiendo en la terminal:
```cmd
.\iniciar.bat
```

### Opción 2: Script Directo de Node.js (Recomendado, sin problemas de permisos)
```bash
node start-dev.mjs
```

### Opción 3: PowerShell
```powershell
.\iniciar.ps1
```

### Opción 4: Con npm (usando npm.cmd en Windows)
```bash
npm.cmd run dev
# o si no tienes restricciones de ejecución en PowerShell:
npm run dev
```

### 🌐 Direcciones y Puertos:
- **Frontend (Astro UI):** [http://localhost:4321](http://localhost:4321)
- **Backend (Express API):** [http://localhost:4000](http://localhost:4000)
- **API Health:** [http://localhost:4000/api/health](http://localhost:4000/api/health)

