# 🏫 Liceo Técnico Profesional v2.0 (LTP v2.0)
## Plataforma Unificada de Gestión Escolar, Académica, Convivencia y RRHH

Este proyecto es la **consolidación unificada** de dos sistemas institucionales:
1. **Sistema Integral LTP Campanario** (Entrevistas, Aportes Colaborativos, Convivencia Escolar, Recursos Humanos, Multivista QR, Protocolos).
2. **Liceo Pro / Notas LTP** (Matrícula MINEDUC/FIDE, Libro de Calificaciones Ponderadas, Informes de Desarrollo, Auditoría Inalterable Silent-Watch, Bloqueo de Semestres).

---

## 🛠️ Stack Tecnológico Unificado

- **Frontend**: React 19 + TypeScript + Vite + CSS Vanilla Modular + Lucide Icons + SweetAlert2.
- **Backend**: Node.js + Express + TypeScript + PostgreSQL (Supabase) + JWT + Bcrypt + Helmet.
- **Base de Datos**: PostgreSQL relacional (20 tablas consolidadas) con compatibilidad para fallback local SQLite.
- **Seguridad**: JWT (Tokens de acceso de 12h), Hash Bcrypt en contraseñas, RBAC con 6 roles (`Admin`, `Docente`, `Entrevistador`, `Administrativo`, `Apoderado`, `Visita`), Auditoría Silent-Watch (`audit_logs`) y Privacidad de Entrevistas (`Pública`/`Confidencial`).

---

## 📂 Estructura del Proyecto Local (`c:\proyectos\LTP v2.0`)

```
LTP v2.0/
├── database/
│   └── unified_schema.sql         # Script SQL consolidado con las 20 tablas relacionales
├── docs/
│   └── COMPARATIVA_TABLAS_Y_UNIFICACION.md  # Análisis comparativo detallado y matriz de mapeo
├── backend/
│   ├── package.json               # Dependencias Express, JWT, Bcrypt, PG
│   └── src/
│       └── server.ts              # Servidor HTTP con JWT, RBAC, auditoría y endpoints integrados
├── frontend/
│   └── package.json               # Dependencias React, Vite, Lucide, SweetAlert2
└── README.md                      # Guía general de uso y arquitectura
```

---

## 🔐 Matriz de Funcionalidades y Seguridad Unificada

| Módulo | Descripción | Control de Seguridad |
| :--- | :--- | :--- |
| **Autenticación** | Login centralizado con RUT y Contraseña | Encriptación `bcrypt` + Emisión de JWT firmados |
| **Matrícula** | Nómina y Ficha Completa MINEDUC / FIDE | Permiso de edición restringido a `Admin` y `Administrativo` |
| **Recursos Humanos** | Docentes y Asistentes con Horas e Idoneidad | Gestión por `Admin`, vinculación con `users` |
| **Entrevistas y Compromisos** | Actas con aportes colaborativos firmados | Control de privacidad `Pública` vs `Confidencial` |
| **Hoja de Vida / Observaciones** | Anotaciones conductuales (Positiva/Negativa/Demérito) | Asignación directa de `author_id` y auditoría |
| **Libro de Calificaciones** | Hoja de cálculo interactiva con pesos | Bloqueo semestral `grades_locks` + Auditoría |
| **Auditoría "Silent-Watch"** | Registro inalterable de cada acción | Inserción automática en `audit_logs` con IP y Usuario |

---

## 🚀 Guía de Inicio Rápido Local

### 1. Configurar la Base de Datos
Ejecuta el script SQL `database/unified_schema.sql` en tu instancia de **PostgreSQL (Supabase)** o SQLite local.

### 2. Iniciar el Backend
```bash
cd backend
npm install
npm run dev
```

### 3. Iniciar el Frontend
```bash
cd frontend
npm install
npm run dev
```
