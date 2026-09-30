-- =============================================================================
-- ESQUEMA UNIFICADO DE PRODUCCIÓN — LICEO TÉCNICO PROFESIONAL (LTP v2.0)
-- Compatible con PostgreSQL (Supabase Cloud)
-- Total de tablas: 48
-- =============================================================================

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT PRIMARY KEY,
    "user_name" TEXT,
    "user_role" TEXT,
    "action" TEXT,
    "details" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,
    "level_id" TEXT,
    "subject_id" TEXT
);

CREATE TABLE IF NOT EXISTS "course_support_professionals" (
    "id" TEXT PRIMARY KEY,
    "course_name" TEXT,
    "professional_name" TEXT,
    "role" TEXT,
    "intervention_days" TEXT,
    "intervention_type" TEXT,
    "target_students" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "notes" TEXT,
    "academic_year" INTEGER,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "courses" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT,
    "teacher" TEXT,
    "capacity" INTEGER,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "cra_book_copies" (
    "id" TEXT PRIMARY KEY,
    "book_id" TEXT,
    "copy_code" TEXT,
    "status" TEXT,
    "condition_notes" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "cra_books" (
    "id" TEXT PRIMARY KEY,
    "biblio_code" TEXT,
    "title" TEXT,
    "author" TEXT,
    "publisher" TEXT,
    "year" INTEGER,
    "isbn" TEXT,
    "category" TEXT,
    "level_suggested" TEXT,
    "is_reading_plan" INTEGER,
    "reading_period" TEXT,
    "location" TEXT,
    "total_copies" INTEGER,
    "available_copies" INTEGER,
    "borrowed_copies" INTEGER,
    "observations" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "cra_daily_loans" (
    "id" TEXT PRIMARY KEY,
    "material_id" TEXT,
    "material_name" TEXT,
    "material_code" TEXT,
    "student_id" TEXT,
    "student_name" TEXT,
    "course_name" TEXT,
    "loan_date" TEXT,
    "time_out" TEXT,
    "time_in" TEXT,
    "status" TEXT,
    "registered_by" TEXT,
    "returned_by" TEXT,
    "observations" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "cra_daily_materials" (
    "id" TEXT PRIMARY KEY,
    "material_code" TEXT,
    "name" TEXT,
    "category" TEXT,
    "total_qty" INTEGER,
    "available_qty" INTEGER,
    "borrowed_qty" INTEGER,
    "status" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "cra_email_logs" (
    "id" TEXT PRIMARY KEY,
    "teacher_name" TEXT,
    "teacher_email" TEXT,
    "subject" TEXT,
    "body_text" TEXT,
    "student_cases_count" INTEGER,
    "cases_json" TEXT,
    "sent_by" TEXT,
    "status" TEXT,
    "sent_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "cra_loans" (
    "id" TEXT PRIMARY KEY,
    "book_id" TEXT,
    "copy_id" TEXT,
    "student_id" TEXT,
    "student_name" TEXT,
    "course_name" TEXT,
    "teacher_name" TEXT,
    "book_title" TEXT,
    "book_author" TEXT,
    "copy_code" TEXT,
    "loan_date" TEXT,
    "due_date" TEXT,
    "return_date" TEXT,
    "status" TEXT,
    "overdue_days" INTEGER,
    "registered_by" TEXT,
    "returned_by" TEXT,
    "override_reason" TEXT,
    "return_condition" TEXT,
    "observations" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "cumulative_evaluations" (
    "id" TEXT PRIMARY KEY,
    "grade_column_id" TEXT,
    "title" TEXT,
    "sub_evaluations" TEXT,
    "level_id" TEXT,
    "subject_id" TEXT,
    "academic_year" INTEGER,
    "period" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "cumulative_sub_grades" (
    "id" TEXT PRIMARY KEY,
    "grade_column_id" TEXT,
    "sub_evaluation_id" TEXT,
    "student_id" TEXT,
    "sub_grade_value" DECIMAL(3,1),
    "period" TEXT,
    "level_id" TEXT,
    "subject_id" TEXT,
    "academic_year" INTEGER,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "enrollments" (
    "id" TEXT PRIMARY KEY,
    "student_id" TEXT,
    "level_id" INTEGER,
    "academic_year" INTEGER,
    "status" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "external_links" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT,
    "url" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "grade_columns" (
    "id" TEXT PRIMARY KEY,
    "level_id" TEXT,
    "subject_id" TEXT,
    "academic_year" INTEGER,
    "title" TEXT,
    "weighting" DECIMAL(5,2),
    "position" INTEGER,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "is_cumulative" INTEGER,
    "period" TEXT
);

CREATE TABLE IF NOT EXISTS "grades" (
    "id" TEXT PRIMARY KEY,
    "student_id" TEXT,
    "student_name" TEXT,
    "course_name" TEXT,
    "subject_name" TEXT,
    "period" TEXT,
    "score" DECIMAL(3,1),
    "evaluation_name" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "grade_column_id" TEXT,
    "grade_value" DECIMAL(3,1),
    "level_id" TEXT,
    "subject_id" TEXT,
    "academic_year" INTEGER
);

CREATE TABLE IF NOT EXISTS "grades_locks" (
    "id" TEXT PRIMARY KEY,
    "level_id" TEXT,
    "subject_id" TEXT,
    "academic_year" INTEGER,
    "period" TEXT,
    "is_locked" INTEGER,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "guardians" (
    "id" TEXT PRIMARY KEY,
    "student_id" TEXT,
    "guardian_type" TEXT,
    "run" TEXT,
    "full_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "relationship" TEXT,
    "address" TEXT,
    "occupation" TEXT,
    "education_level" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "homeroom_teachers" (
    "id" SERIAL PRIMARY KEY,
    "level_id" INTEGER,
    "teacher_id" TEXT,
    "teacher_name" TEXT,
    "academic_year" INTEGER,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "institutional_documents" (
    "id" SERIAL PRIMARY KEY,
    "date" TEXT,
    "type" TEXT,
    "title" TEXT,
    "responsible" TEXT,
    "status" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "institutional_links" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT,
    "url" TEXT,
    "color" TEXT
);

CREATE TABLE IF NOT EXISTS "integration_settings" (
    "setting_key" TEXT PRIMARY KEY,
    "setting_value" TEXT,
    "description" TEXT,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "interview_participants" (
    "id" TEXT PRIMARY KEY,
    "interview_id" TEXT,
    "user_id" TEXT,
    "username" TEXT,
    "status" TEXT,
    "comment" TEXT,
    "comment_date" TEXT,
    "is_read" INTEGER,
    "role" TEXT,
    "signature" TEXT,
    "user_run" TEXT,
    "requested_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "request_deadline" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "time_limit_minutes" INTEGER
);

CREATE TABLE IF NOT EXISTS "interviews" (
    "id" TEXT PRIMARY KEY,
    "student_id" TEXT,
    "student_name" TEXT,
    "interviewer_name" TEXT,
    "date" TEXT,
    "topics" TEXT,
    "agreements" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "interviewee_run" TEXT,
    "interviewee_name" TEXT,
    "interviewee_role" TEXT,
    "course_name" TEXT,
    "homeroom_teacher" TEXT,
    "subject_teacher" TEXT,
    "pie_specialist" TEXT,
    "time" TEXT,
    "interviewer_id" TEXT,
    "status" TEXT,
    "privacy" TEXT,
    "followup_date" TEXT,
    "objective" TEXT,
    "reason" TEXT,
    "general_observations" TEXT,
    "drive_url" TEXT,
    "drive_title" TEXT,
    "show_in_resume" INTEGER
);

CREATE TABLE IF NOT EXISTS "levels" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT,
    "total_capacity" INTEGER,
    "current_enrolled" INTEGER,
    "homeroom_teacher_id" TEXT
);

CREATE TABLE IF NOT EXISTS "mineduc_reports" (
    "id" TEXT PRIMARY KEY,
    "student_run" TEXT,
    "report_type" TEXT,
    "academic_year" INTEGER,
    "evaluation_date" TEXT,
    "professional_run" TEXT,
    "professional_name" TEXT,
    "professional_role" TEXT,
    "professional_reg" TEXT,
    "report_data" TEXT,
    "status" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "multiview_sessions" (
    "id" TEXT PRIMARY KEY,
    "session_code" TEXT,
    "student_id" TEXT,
    "active" INTEGER,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "observations" (
    "id" TEXT PRIMARY KEY,
    "student_id" TEXT,
    "type" TEXT,
    "detail" TEXT,
    "author_name" TEXT,
    "date" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "password_resets" (
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT,
    "temp_password_hash" TEXT,
    "temp_password_plain" TEXT,
    "expires_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "used" INTEGER,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "pedagogical_evaluations" (
    "id" TEXT PRIMARY KEY,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "teacher_name" TEXT,
    "teacher_email" TEXT,
    "teacher_run" TEXT,
    "evaluation_title" TEXT,
    "course_name" TEXT,
    "subject_name" TEXT,
    "evaluation_date" TEXT,
    "block_label" TEXT,
    "status" TEXT,
    "original_file_name" TEXT,
    "original_file_url" TEXT,
    "original_uploaded_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "pie_file_name" TEXT,
    "pie_file_url" TEXT,
    "pie_teacher_name" TEXT,
    "pie_teacher_email" TEXT,
    "pie_uploaded_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "calendar_event_id" TEXT
);

CREATE TABLE IF NOT EXISTS "pedagogical_trip_students" (
    "id" TEXT PRIMARY KEY,
    "trip_id" TEXT,
    "student_id" TEXT,
    "student_run" TEXT,
    "student_name" TEXT,
    "course_name" TEXT,
    "authorized" INTEGER,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "pedagogical_trips" (
    "id" TEXT PRIMARY KEY,
    "title" TEXT,
    "destination" TEXT,
    "trip_date" TEXT,
    "time_range" TEXT,
    "departure_time" TEXT,
    "return_time" TEXT,
    "responsible_teacher" TEXT,
    "issue_date" TEXT,
    "city" TEXT,
    "institution_name" TEXT,
    "institution_sub" TEXT,
    "director_name" TEXT,
    "description" TEXT,
    "academic_year" INTEGER,
    "created_by" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "personality_reports" (
    "id" TEXT PRIMARY KEY,
    "student_id" TEXT,
    "teacher_id" TEXT,
    "level_id" TEXT,
    "academic_year" INTEGER,
    "semester" INTEGER,
    "report_type" TEXT,
    "evaluation_data" TEXT,
    "observations" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "pie_course_permissions" (
    "id" SERIAL PRIMARY KEY,
    "teacher_email" TEXT,
    "teacher_name" TEXT,
    "courses_allowed" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "role_permissions" (
    "id" TEXT PRIMARY KEY,
    "role" TEXT,
    "function_id" TEXT,
    "can_access" INTEGER,
    "can_edit" INTEGER,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "room_reservations" (
    "id" TEXT PRIMARY KEY,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "teacher_name" TEXT,
    "teacher_email" TEXT,
    "teacher_run" TEXT,
    "course_name" TEXT,
    "subject_name" TEXT,
    "activity_detail" TEXT,
    "reservation_date" TEXT,
    "block_key" TEXT,
    "block_label" TEXT,
    "start_time" TEXT,
    "end_time" TEXT,
    "status" TEXT,
    "rejection_reason" TEXT,
    "calendar_event_id" TEXT
);

CREATE TABLE IF NOT EXISTS "secure_file_vault" (
    "id" TEXT PRIMARY KEY,
    "file_id" TEXT,
    "storage_name" TEXT,
    "original_name" TEXT,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "mime_type" TEXT,
    "file_url" TEXT,
    "file_size" INTEGER,
    "uploaded_by" TEXT,
    "is_anonymized" INTEGER,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "staff_job_positions" (
    "id" TEXT PRIMARY KEY,
    "category" TEXT,
    "name" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "staff_profiles" (
    "id" TEXT PRIMARY KEY,
    "full_name" TEXT,
    "email" TEXT,
    "role" TEXT,
    "phone" TEXT,
    "department" TEXT,
    "status" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "run" TEXT,
    "first_name" TEXT,
    "paternal_surname" TEXT,
    "maternal_surname" TEXT,
    "gender" TEXT,
    "birth_date" TEXT,
    "staff_type" TEXT,
    "job_function" TEXT,
    "title" TEXT,
    "institution" TEXT,
    "contract_hours" INTEGER,
    "classroom_hours" INTEGER,
    "subject_specialty" TEXT,
    "suitability_status" TEXT,
    "user_id" TEXT
);

CREATE TABLE IF NOT EXISTS "student_checklists" (
    "id" TEXT PRIMARY KEY,
    "student_id" TEXT,
    "type" TEXT,
    "student_type" TEXT,
    "items" TEXT,
    "completed_items" INTEGER,
    "total_items" INTEGER,
    "receiver_name" TEXT,
    "receiver_run" TEXT,
    "officer_name" TEXT,
    "destination_school" TEXT,
    "notes" TEXT,
    "academic_year" INTEGER,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "student_observations" (
    "id" TEXT PRIMARY KEY,
    "student_id" TEXT,
    "type" TEXT,
    "detail" TEXT,
    "author_id" TEXT,
    "author_name" TEXT,
    "date" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "student_passes" (
    "id" TEXT PRIMARY KEY,
    "folio" SERIAL,
    "student_id" TEXT,
    "student_run" TEXT,
    "student_name" TEXT,
    "course_name" TEXT,
    "pass_type" TEXT,
    "pass_date" TEXT,
    "pass_time" TEXT,
    "reason" TEXT,
    "status" TEXT,
    "justification_detail" TEXT,
    "inspector_name" TEXT,
    "inspector_id" TEXT,
    "academic_year" INTEGER,
    "period" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "students" (
    "id" TEXT PRIMARY KEY,
    "run" TEXT,
    "full_name" TEXT,
    "desc_grado" TEXT,
    "status" TEXT,
    "is_retired" INTEGER,
    "withdrawal_date" TEXT,
    "withdrawal_reason" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "academic_year" INTEGER,
    "rbd" INTEGER,
    "cod_tipo_ensenanza" INTEGER,
    "cod_grado" INTEGER,
    "letra_curso" TEXT,
    "run_num" TEXT,
    "dv_run" TEXT,
    "gender" TEXT,
    "first_name" TEXT,
    "paternal_surname" TEXT,
    "maternal_surname" TEXT,
    "address" TEXT,
    "commune" TEXT,
    "commune_code" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "mobile_phone" TEXT,
    "birth_date" TEXT,
    "ethnicity_code" INTEGER,
    "enrollment_date" TEXT,
    "attendance_percentage" DECIMAL(5,2),
    "final_average" DECIMAL(3,1),
    "list_number" INTEGER,
    "profesor_jefe" TEXT,
    "promedio_final" DECIMAL(3,1),
    "anno" INTEGER,
    "entry_year" INTEGER,
    "document_type" TEXT,
    "nationality" TEXT,
    "marital_status" TEXT,
    "religion" TEXT,
    "has_religion" INTEGER,
    "ethnicity" TEXT,
    "indigenous_origin" TEXT,
    "region" TEXT,
    "postal_code" TEXT,
    "previous_school" TEXT,
    "phone_type" TEXT,
    "email_type" TEXT,
    "health_system" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "enrollment_number" TEXT,
    "incorporation_date" TEXT,
    "profesor_asignatura" TEXT,
    "profesor_pie" TEXT,
    "edad" INTEGER,
    "guardian_name" TEXT,
    "guardian_run" TEXT,
    "guardian_phone" TEXT,
    "guardian_email" TEXT,
    "guardian_relation" TEXT,
    "guardian_occupation" TEXT,
    "guardian_education" TEXT,
    "guardian_address" TEXT,
    "guardian_is_financial" INTEGER,
    "guardian_is_health_load" INTEGER,
    "guardian_sec_name" TEXT,
    "guardian_sec_run" TEXT,
    "guardian_sec_phone" TEXT,
    "guardian_sec_email" TEXT,
    "guardian_sec_relation" TEXT,
    "father_name" TEXT,
    "father_run" TEXT,
    "father_phone" TEXT,
    "father_email" TEXT,
    "father_occupation" TEXT,
    "father_education" TEXT,
    "father_living" INTEGER,
    "mother_name" TEXT,
    "mother_run" TEXT,
    "mother_phone" TEXT,
    "mother_email" TEXT,
    "mother_occupation" TEXT,
    "mother_education" TEXT,
    "mother_living" INTEGER,
    "lives_with" TEXT,
    "lives_with_other" TEXT,
    "family_type" TEXT,
    "family_members" INTEGER,
    "total_siblings" INTEGER,
    "school_siblings" INTEGER,
    "school_age_siblings" INTEGER,
    "liceo_siblings" INTEGER,
    "sibling_position" INTEGER,
    "has_allergies" INTEGER,
    "allergies_detail" TEXT,
    "has_chronic_disease" INTEGER,
    "chronic_disease_detail" TEXT,
    "health_observations" TEXT,
    "has_psychological_care" INTEGER,
    "psychological_care_detail" TEXT,
    "has_neurological_care" INTEGER,
    "neurological_care_detail" TEXT,
    "pie_program" INTEGER,
    "pie_diagnosis" TEXT,
    "differential_group" INTEGER,
    "is_repeater" INTEGER,
    "uses_mineduc_texts" INTEGER,
    "is_priority" INTEGER,
    "is_preferential" INTEGER,
    "is_vulnerable" INTEGER,
    "is_high_vulnerability" INTEGER,
    "scholarship_indigenous" INTEGER,
    "scholarship_president" INTEGER,
    "scholarship_retention" INTEGER,
    "scholarship_junaeb" INTEGER,
    "scholarship_other" TEXT,
    "observaciones" TEXT,
    "enrolled_by_name" TEXT,
    "enrolled_by_run" TEXT,
    "enrolled_by_role" TEXT,
    "has_complementary_insurance" INTEGER,
    "complementary_insurance_name" TEXT,
    "complementary_insurance_coverage" TEXT,
    "authorize_image_use" INTEGER,
    "image_auth_scope" TEXT
);

CREATE TABLE IF NOT EXISTS "subjects" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT,
    "level_id" INTEGER,
    "academic_year" INTEGER
);

CREATE TABLE IF NOT EXISTS "system_notifications" (
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT,
    "target_role" TEXT,
    "type" TEXT,
    "title" TEXT,
    "message" TEXT,
    "is_read" INTEGER,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "target_run" TEXT,
    "reference_id" TEXT
);

CREATE TABLE IF NOT EXISTS "system_permissions_matrix" (
    "id" TEXT PRIMARY KEY,
    "matrix_json" TEXT,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "system_settings" (
    "id" TEXT PRIMARY KEY,
    "config_key" TEXT,
    "config_value" TEXT,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "teacher_assignments" (
    "id" TEXT PRIMARY KEY,
    "teacher_id" TEXT,
    "teacher_name" TEXT,
    "level_id" TEXT,
    "level_name" TEXT,
    "subject_id" TEXT,
    "subject_name" TEXT,
    "academic_year" INTEGER,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "teacher_id_2" TEXT,
    "teacher_name_2" TEXT
);

CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "password_hash" TEXT,
    "role" TEXT,
    "roles" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "run" TEXT,
    "password_plain" TEXT,
    "staff_type" TEXT,
    "job_function" TEXT,
    "temp_password" INTEGER
);

