# 📊 Comparativa de Tablas y Estrategia de Unificación — LTP v2.0

Este documento contiene la especificación y el análisis detallado de la unificación entre el **Sistema Integral LTP Campanario** y **Liceo Pro / Notas LTP**, resultando en la plataforma consolidada **LTP v2.0 (Liceo Técnico Profesional)**.

---

## 1. Resumen Ejecutivo de las Aplicaciones Originales

| Característica | Sistema Integral LTP Campanario | Liceo Pro / Notas LTP | Plataforma Unificada LTP v2.0 |
| :--- | :--- | :--- | :--- |
| **Módulos Principales** | Entrevistas, Convivencia Escolar, Recursos Humanos, Documentos Administrativos, Multivista QR | Matrícula Completa (FIDE/MINEDUC), Libro de Notas, Informes de Desarrollo, Auditoría Silent-Watch, Cierre Semestral | Integración total de los 10 módulos en una plataforma modular con RBAC |
| **Backend** | Python (`server.py`) con `psycopg2` / SQLite local | Node.js + Express + TypeScript + PostgreSQL | Node.js / Express / TypeScript con pool de PostgreSQL + Fallback SQLite |
| **Autenticación** | Tabla `usuarios` con contraseñas en texto plano | JWT + Bcrypt (`password_hash`) + `password_plain` (admin) | **JWT + Bcrypt obligatorio**, manteniendo campo de asistencia encriptado y control de roles estrictos |
| **Frontend** | HTML/JS Vanilla | React 19 + TypeScript + Vite | React 19 + TypeScript + Vite con diseño moderno, accesibilidad y modo oscuro/claro |

---

## 2. Matriz de Mapeo y Comparación de Tablas

A continuación se detalla cómo se relacionan y fusionan las 8 tablas de Campanario y las 17 tablas de Liceo Pro en un esquema de **20 tablas consolidadas**:

### 2.1. Gestión de Usuarios y Autenticación
- **Campanario**: `usuarios` (`username`, `rut`, `nombre`, `password`, `perfil`).
- **Liceo Pro**: `users` (`id`, `run`, `name`, `email`, `password_hash`, `password_plain`, `role`, `temp_password`).
- **LTP v2.0 (`users`)**:
  - Se toma como base la estructura robusta de `users` (Liceo Pro), agregando el campo `run` (RUT) y expandiendo los roles a: `'Admin'`, `'Docente'`, `'Entrevistador'`, `'Administrativo'`, `'Apoderado'`, `'Visita'`.
  - La autenticación se realiza mediante tokens JWT firmados y las contraseñas se almacenan con el algoritmo `bcrypt`.

### 2.2. Información de Recursos Humanos (Docentes y Asistentes)
- **Campanario**: `docentes` (`rut`, `nombres`, `apellido_paterno`, `apellido_materno`, `asignatura`, `funcion_curso`, `horas_contrato`, `idoneidad`) y `asistentes` (`rut`, `nombres`, `...`, `funcion_curso`, `horas_contrato`, `idoneidad`).
- **Liceo Pro**: Los docentes son usuarios con `role = 'Docente'` en `users`.
- **LTP v2.0 (`staff_profiles`)**:
  - Para evitar duplicidad de nombres y rut entre `users` y `docentes/asistentes`, todo el personal posee una cuenta en `users`.
  - Se añade la tabla `staff_profiles` vinculada por `user_id` para almacenar los datos específicos de RRHH: `staff_type` (`Docente` / `Asistente`), `subject_specialty`, `job_function`, `contract_hours`, e `suitability` (`idoneidad`).

### 2.3. Estudiantes y Ficha de Matrícula
- **Campanario**: `estudiantes` (`rut`, `nombres`, `apellido_paterno`, `apellido_materno`, `curso`, `profesor_jefe`, `profesor_asignatura`, `profesor_pie`, `fecha_nacimiento`, `estado`, `edad`).
- **Liceo Pro**: `students` (Esquema oficial de 54 campos con datos de salud, prioridades SEP, becas, procedencia, etc.).
- **LTP v2.0 (`students`)**:
  - Se adopta la estructura completa de `students` (Liceo Pro) por cumplir normativas FIDE/MINEDUC, e incorporando los campos `profesor_pie`, `profesor_asignatura` y `edad`.
  - El curso se normaliza mediante la relación `level_id -> levels.id`.

### 2.4. Anotaciones de Convivencia y Hoja de Vida
- **Campanario**: `anotaciones_estudiante` (`id`, `rut_estudiante`, `fecha`, `tipo` [`Positiva`, `Negativa`, `Demérito`, `Medida Pedagógica`], `detalle`, `autor`).
- **Liceo Pro**: `observations` (`id`, `student_id`, `teacher_id`, `content`, `type` [`Positive`, `Negative`]).
- **LTP v2.0 (`student_observations`)**:
  - Se fusionan en `student_observations`, conservando la tipología amplia de Campanario (`Positiva`, `Negativa`, `Demérito`, `Medida Pedagógica`) y relacionando directamente `student_id` y `author_id` (FK a `users.id`).

### 2.5. Entrevistas y Aportes Colaborativos
- **Campanario**: `entrevistas` y `participantes_entrevista`.
- **Liceo Pro**: No cuenta con este módulo.
- **LTP v2.0 (`interviews` y `interview_participants`)**:
  - Se migran de manera íntegra, asociando el RUT o `student_id` del entrevistado, la privacidad (`Pública` / `Confidencial`), el responsable, el objetivo, motivos, acuerdos y observaciones.
  - La tabla `interview_participants` mantiene el control de invitaciones, lecturas (`visto`) y comentarios firmados digitalmente.

### 2.6. Notas, Ponderaciones y Cierre Semestral
- **Liceo Pro**: `grade_columns`, `grades`, `grades_locks`.
- **Campanario**: No cuenta con este módulo.
- **LTP v2.0 (`grade_columns`, `grades`, `grades_locks`)**:
  - Se integran tal cual existen en Liceo Pro, asegurando el cálculo del promedio ponderado o aritmético y el bloqueo de edición semestral.

### 2.7. Documentación Administrativa y Configuración
- **Campanario**: `administracion` (Oficios, Resoluciones, Protocolos).
- **Liceo Pro**: `institutional_settings`, `external_links`.
- **LTP v2.0 (`institutional_documents`, `institutional_settings`, `external_links`)**:
  - Se mantienen los tres componentes para permitir el control de circulares y reglamentos institucionales, los datos del colegio y la barra de accesos docentes.

---

## 3. Configuración de Seguridad en la Plataforma Unificada

1. **Autenticación Basada en JWT**:
   - Cada petición a la API requiere la cabecera `Authorization: Bearer <token>`.
   - El token codifica `id`, `run`, `name` y `role`.
2. **Encriptación Bcrypt**:
   - Las contraseñas se procesan con un factor de costo `salt = 10`.
3. **Control de Acceso Basado en Roles (RBAC)**:
   - **Admin**: Acceso total a configuración, matrícula, notas, auditoría, usuarios y actas.
   - **Docente**: Acceso a ingreso de notas de sus asignaturas asignadas, observaciones, informes de personalidad de su jefatura y lectura de actas no confidenciales.
   - **Entrevistador**: Registro de entrevistas, seguimiento, anotaciones de convivencia y aportes colaborativos.
   - **Administrativo**: Gestión de matrícula, emisión de certificaciones y lectura de usuarios.
   - **Visita**: Modo estrictamente lectura (bloqueo automático de POST, PUT, DELETE).
4. **Auditoría Inalterable Silent-Watch**:
   - Registro automático en `audit_logs` con `user_id`, `action`, `details`, timestamp e IP para cada modificación de notas, borrado de alumnos o cambios de permisos.
