-- UTAR Admission Assistant - data for the application tools.
-- Run after schema.sql (npm run db:setup does this). Safe to run again: it reloads these tables only;
-- students' ticks, progress and reminders are kept.
--
-- Sources (checked 12 November 2026):
--   Application Checklist:   https://admission.utar.edu.my/Apply_Now.php ("Application Checklist" PDF)
--   Orientation documents:   https://admission.utar.edu.my/Acceptance-and-Registration.php
--   Application steps:       https://admission.utar.edu.my/Apply_Now.php
--   Intake dates:            https://admission.utar.edu.my/intake-and-Academic-Calendar.php
-- The text of each item is translated in site/js/i18n-app.js; applies_to codes are explained in server/application.js.

USE utar_admission;

SET NAMES utf8mb4;

-- Upsert, so that students' saved ticks (which refer to these rows) are not deleted
INSERT INTO checklist_items (item_code, phase, applies_to, sort_order) VALUES
  ('id_mykad',          'apply',       'malaysian',       1),
  ('id_passport',       'apply',       'international',   2),
  ('school_results',    'apply',       'all',             3),
  ('preu_results',      'apply',       'preu',            4),
  ('english_results',   'apply',       'english_test',    5),
  ('ihl_transcript',    'apply',       'higher_learning', 6),
  ('ihl_certificate',   'apply',       'higher_learning', 7),
  ('ihl_syllabus',      'apply',       'diploma_up',      8),
  ('ct_documents',      'apply',       'credit_transfer', 9),
  ('portfolio_arch',    'apply',       'architecture',    10),
  ('portfolio_art',     'apply',       'art',             11),
  ('health_report',     'orientation', 'not_medical',     20),
  ('health_report_med', 'orientation', 'medical',         21),
  ('mbbs_declaration',  'orientation', 'mbbs',            22),
  ('certificates',      'orientation', 'all',             23),
  ('id_original',       'orientation', 'all',             24)
AS new ON DUPLICATE KEY UPDATE phase = new.phase, applies_to = new.applies_to, sort_order = new.sort_order;

INSERT INTO journey_stages (stage_code, sort_order) VALUES
  ('explore', 1), ('eligibility', 2), ('documents', 3), ('submit', 4),
  ('outcome', 5), ('accept', 6), ('student_id', 7), ('orientation', 8)
AS new ON DUPLICATE KEY UPDATE sort_order = new.sort_order;

-- Programme start dates of the coming intakes
DELETE FROM important_dates;
INSERT INTO important_dates (date_code, applies_to, event_date, sort_order) VALUES
  ('jan2027',      'general', '2027-01-25', 1),   -- Foundation and Bachelor's (except MBBS and Nursing)
  ('jun2027',      'general', '2027-06-09', 2),   -- Foundation and Bachelor's (except MBBS and Nursing)
  ('jun2027_nur',  'nursing', '2027-06-09', 3),
  ('oct_nur',      'nursing', NULL,         4),   -- Nursing October intake: date not announced
  ('oct_mbbs',     'mbbs',    NULL,         5);   -- MBBS: one intake a year in October, date not announced
