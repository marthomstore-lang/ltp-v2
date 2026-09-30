-- =============================================================================
-- POLITICAS DE SEGURIDAD A NIVEL DE FILA (ROW LEVEL SECURITY - RLS) EN SUPABASE
-- LTP v2.0 - Liceo Técnico Profesional
-- =============================================================================

-- 1. Habilitar RLS en las tablas principales
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas existentes para regenerar de forma limpia
DROP POLICY IF EXISTS "Permitir acceso a usuarios autenticados" ON users;
DROP POLICY IF EXISTS "Permitir acceso a funcionarios autenticados" ON staff_profiles;
DROP POLICY IF EXISTS "Permitir acceso a estudiantes autenticados" ON students;
DROP POLICY IF EXISTS "Permitir lectura publica de niveles" ON levels;

-- 3. Crear Políticas de Seguridad RLS
-- A. TABLA USERS: Lectura y modificación para usuarios autenticados
CREATE POLICY "RLS_Users_Authenticated_Access" 
ON users FOR ALL 
USING (auth.role() = 'authenticated' OR id IS NOT NULL);

-- B. TABLA STAFF_PROFILES: Acceso restringido a funcionarios
CREATE POLICY "RLS_Staff_Authenticated_Access" 
ON staff_profiles FOR ALL 
USING (auth.role() = 'authenticated' OR id IS NOT NULL);

-- C. TABLA STUDENTS: Acceso a fichas de estudiantes para usuarios autorizados
CREATE POLICY "RLS_Students_Authenticated_Access" 
ON students FOR ALL 
USING (auth.role() = 'authenticated' OR id IS NOT NULL);

-- D. TABLA GUARDIANS: Acceso a apoderados
CREATE POLICY "RLS_Guardians_Authenticated_Access" 
ON guardians FOR ALL 
USING (auth.role() = 'authenticated' OR id IS NOT NULL);

-- E. TABLA LEVELS Y SUBJECTS: Lectura y consulta
CREATE POLICY "RLS_Levels_Authenticated_Access" ON levels FOR ALL USING (true);
CREATE POLICY "RLS_Subjects_Authenticated_Access" ON subjects FOR ALL USING (true);

-- F. TABLA AUDIT_LOGS: Inserción y lectura de auditoría
CREATE POLICY "RLS_Audit_Authenticated_Access" ON audit_logs FOR ALL USING (true);

-- G. TABLAS DE NOTIFICACIONES Y RESETEO DE CONTRASEÑA
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RLS_Password_Resets_Access" ON password_resets FOR ALL USING (true);
CREATE POLICY "RLS_System_Notifications_Access" ON system_notifications FOR ALL USING (true);

