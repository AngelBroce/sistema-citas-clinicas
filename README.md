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
│       ├── components/           # Componentes UI (chatbot, common, dashboard, forms)
│       ├── layouts/              # Plantillas estructurales (Layout, Auth, Dashboard)
│       ├── pages/                # Vistas para Paciente, Recepción, Médico y Administrador
│       ├── services/             # Clientes de consumo de API Backend
│       ├── styles/               # Estilos globales y tokens
│       └── types/                # Definición de tipos TypeScript
│
├── backend/                      # [Angel] API REST en Node.js (Express / TypeScript)
│   └── src/
│       ├── config/               # Configuración de DB, OAuth e IA
│       ├── controllers/          # Manejadores de rutas HTTP
│       ├── middlewares/          # Autenticación, roles y validaciones
│       ├── routes/               # Enrutadores modulares de la API
│       ├── services/             # Motor de colisiones, Chatbot IA y Google Calendar
│       ├── types/                # DTOs y tipos del backend
│       └── utils/                # Utilidades de fecha, logs y formateo
│
├── database/                     # [Elvis] Base de Datos PostgreSQL
│   ├── migrations/               # Scripts SQL DDL de construcción de tablas
│   ├── seeds/                    # Datos iniciales para pruebas
│   ├── schemas/                  # DDL consolidado y diagramas
│   └── models/                   # Modelos TypeScript correspondientes
│
└── docs/                         # [Project Management & Arquitectura]
    ├── api/                      # Documentación y especificaciones OpenAPI
    ├── architecture/             # Diagramas del sistema y modelo E-R
    ├── flows/                    # Flujos de reserva, sincronización y chatbot
    └── pm/                       # Matriz de roles, Roadmap y Backlog
```
