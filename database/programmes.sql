-- UTAR Admission Assistant - programmes and minimum entry requirements for the admission tools.
-- Run after schema.sql (npm run db:setup does this). Safe to run again: it clears and reloads these tables only.
--
-- Facts come from UTAR's official pages (checked 12 November 2026, documents dated October 2026):
--   Bachelor's degrees: https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php
--                       ("Minimum Entry Requirements" PDF of each programme cluster)
--   Foundation:         https://study.utar.edu.my/foundation-in-science.php
--                       https://study.utar.edu.my/foundation-in-arts.php
--
-- Only part of UTAR's programmes is included so far. To add a programme with the same requirements as
-- an existing group, add a row to programmes. For new requirements, add a group and its entry_requirements.
-- Grades: SPM / O-Level credit = C, UEC "Grade B" = B6, STPM and A-Level grades as printed on the certificate.
-- Rule codes (rules, english_rule) are explained in server/eligibility.js.

USE utar_admission;

SET NAMES utf8mb4;

DELETE FROM entry_requirements;
DELETE FROM programmes;
DELETE FROM requirement_groups;

INSERT INTO requirement_groups (group_code, level, english_rule, foundation_group, source_url, sort_order) VALUES
  ('FIS',    'foundation', 'eng_foundation', NULL,  'https://study.utar.edu.my/foundation-in-science.php', 1),
  ('FIA',    'foundation', 'eng_foundation', NULL,  'https://study.utar.edu.my/foundation-in-arts.php', 2),
  ('ACC',    'bachelor',   'eng_credit',     'FIA', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 3),
  ('BF',     'bachelor',   'eng_flex',       'FIA', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 4),
  ('BUS',    'bachelor',   'eng_flex',       'FIA', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 5),
  ('CS',     'bachelor',   'eng_bachelor',   'FIS', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 6),
  ('ICT',    'bachelor',   'eng_bachelor',   'FIS', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 7),
  ('ICT_CE', 'bachelor',   'eng_bachelor',   'FIS', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 8),
  ('ENG',    'bachelor',   'eng_bachelor',   'FIS', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 9);

INSERT INTO programmes (group_code, name, sort_order) VALUES
  ('FIS',    'Foundation in Science', 1),
  ('FIA',    'Foundation in Arts', 2),
  ('ACC',    'Bachelor of Accounting (Honours)', 10),
  ('ACC',    'Bachelor of Commerce (Honours) Accounting', 11),
  ('BF',     'Bachelor of Business Administration (Honours) Banking and Finance', 20),
  ('BF',     'Bachelor of Business Administration (Honours) (Risk Management)', 21),
  ('BF',     'Bachelor in Financial Economics Analytics (Honours)', 22),
  ('BUS',    'Bachelor of Business Administration (Honours)', 30),
  ('BUS',    'Bachelor of Business Administration (Honours) Entrepreneurship', 31),
  ('BUS',    'Bachelor of Business Administration (Honours) with Healthcare Management', 32),
  ('BUS',    'Bachelor of Business Administration (Honours) Retail Management', 33),
  ('BUS',    'Bachelor of Business Administration (Honours) (Tourism Destination Marketing)', 34),
  ('BUS',    'Bachelor in Logistics and Supply Chain Management (Honours)', 35),
  ('BUS',    'Bachelor of International Business (Honours)', 36),
  ('BUS',    'Bachelor of Marketing (Honours)', 37),
  ('CS',     'Bachelor of Computer Science (Honours)', 40),
  ('CS',     'Bachelor of Software Engineering (Honours)', 41),
  ('ICT',    'Bachelor of Information Systems (Honours) (Business Information Systems)', 50),
  ('ICT',    'Bachelor of Information Systems (Honours) (Digital Economy Technology)', 51),
  ('ICT',    'Bachelor of Information Systems (Honours) (Information Systems Engineering)', 52),
  ('ICT',    'Bachelor of Information Technology (Honours) (Communications and Networking)', 53),
  ('ICT',    'Bachelor of Information Technology (Honours) (Industrial Intelligent Systems)', 54),
  ('ICT_CE', 'Bachelor of Information Technology (Honours) (Computer Engineering)', 60),
  ('ENG',    'Bachelor of Biomedical Engineering with Honours', 70),
  ('ENG',    'Bachelor of Chemical Engineering with Honours', 71),
  ('ENG',    'Bachelor of Chemical Engineering (Process) with Honours', 72),
  ('ENG',    'Bachelor of Civil Engineering with Honours', 73),
  ('ENG',    'Bachelor of Civil Engineering (Environmental) with Honours', 74),
  ('ENG',    'Bachelor of Electrical and Electronic Engineering with Honours', 75),
  ('ENG',    'Bachelor of Electronics Engineering with Honours', 76),
  ('ENG',    'Bachelor of Engineering (Honours) Industrial Engineering', 77),
  ('ENG',    'Bachelor of Materials Engineering with Honours', 78),
  ('ENG',    'Bachelor of Mechanical Engineering with Honours', 79),
  ('ENG',    'Bachelor of Mechatronics Engineering with Honours', 80),
  ('ENG',    'Bachelor of Telecommunications Engineering with Honours', 81);

INSERT INTO entry_requirements (group_code, qualification, study_field, min_grade, min_subjects, min_cgpa, review_cgpa, rules) VALUES
  -- Foundation in Science: 5 credits including 1 Mathematics and 2 Science subjects (UEC: Grade B in 3 subjects)
  ('FIS', 'spm',    NULL, 'C',  5, NULL, NULL, 'fis_subjects'),
  ('FIS', 'olevel', NULL, 'C',  5, NULL, NULL, 'fis_subjects'),
  ('FIS', 'uec',    NULL, 'B6', 3, NULL, NULL, 'fis_subjects'),
  -- Foundation in Arts: 5 credits (UEC: Grade B in 3 subjects)
  ('FIA', 'spm',    NULL, 'C',  5, NULL, NULL, ''),
  ('FIA', 'olevel', NULL, 'C',  5, NULL, NULL, ''),
  ('FIA', 'uec',    NULL, 'B6', 3, NULL, NULL, ''),
  -- Accounting
  ('ACC', 'stpm',       NULL,       'C+', 2, NULL, NULL, 'math_credit_mec'),
  ('ACC', 'alevel',     NULL,       'D',  2, NULL, NULL, 'math_credit_mec'),
  ('ACC', 'uec',        NULL,       'B5', 5, NULL, NULL, 'math_credit_mec'),
  ('ACC', 'foundation', NULL,       NULL, NULL, 2.50, NULL, 'math_credit_mec'),
  ('ACC', 'diploma',    'business', NULL, NULL, 2.50, 2.00, 'math_credit_mec'),
  ('ACC', 'diploma',    NULL,       NULL, NULL, 2.50, NULL, 'math_credit_mec'),
  -- Banking and Finance, Risk Management, Financial Economics Analytics
  ('BF', 'stpm',       NULL, 'C',  2, NULL, NULL, 'math_pass_mec'),
  ('BF', 'alevel',     NULL, 'D',  2, NULL, NULL, 'math_pass_mec'),
  ('BF', 'uec',        NULL, 'B6', 5, NULL, NULL, 'math_pass_mec'),
  ('BF', 'foundation', NULL, NULL, NULL, 2.00, NULL, 'math_pass_mec'),
  ('BF', 'diploma',    NULL, NULL, NULL, 2.00, NULL, 'math_pass_mec'),
  -- Business Administration and related programmes
  ('BUS', 'stpm',       NULL, 'C',  2, NULL, NULL, 'math_pass_mec'),
  ('BUS', 'alevel',     NULL, 'D',  2, NULL, NULL, 'math_pass_mec'),
  ('BUS', 'uec',        NULL, 'B6', 5, NULL, NULL, 'math_pass_mec'),
  ('BUS', 'foundation', NULL, NULL, NULL, 2.00, NULL, 'math_pass_mec'),
  ('BUS', 'diploma',    NULL, NULL, NULL, 2.00, NULL, 'math_pass_mec'),
  -- Computer Science, Software Engineering
  ('CS', 'stpm',       NULL,        'C',  2, NULL, NULL, 'cs_maths'),
  ('CS', 'alevel',     NULL,        'D',  2, NULL, NULL, 'cs_maths'),
  ('CS', 'uec',        NULL,        'B6', 5, NULL, NULL, 'cs_maths'),
  ('CS', 'foundation', NULL,        NULL, NULL, 2.00, NULL, 'cs_maths'),
  ('CS', 'diploma',    'computing', NULL, NULL, 2.50, 2.00, ''),
  ('CS', 'diploma',    'science',   NULL, NULL, 2.75, 2.50, 'cs_maths'),
  -- Information Systems, IT (Communications and Networking, Industrial Intelligent Systems)
  ('ICT', 'stpm',       NULL,        'C',  2, NULL, NULL, 'math_credit_mec'),
  ('ICT', 'alevel',     NULL,        'D',  2, NULL, NULL, 'math_credit_mec'),
  ('ICT', 'uec',        NULL,        'B6', 5, NULL, NULL, 'math_credit_mec'),
  ('ICT', 'foundation', NULL,        NULL, NULL, 2.00, NULL, 'math_credit_mec'),
  ('ICT', 'diploma',    'computing', NULL, NULL, 2.50, 2.00, ''),
  ('ICT', 'diploma',    NULL,        NULL, NULL, 2.75, 2.50, 'math_credit_mec'),
  -- IT (Computer Engineering)
  ('ICT_CE', 'stpm',       NULL,        'C',  2, NULL, NULL, 'math_credit,physics_pass'),
  ('ICT_CE', 'alevel',     NULL,        'D',  2, NULL, NULL, 'math_credit,physics_pass'),
  ('ICT_CE', 'uec',        NULL,        'B6', 5, NULL, NULL, 'math_credit,physics_pass'),
  ('ICT_CE', 'foundation', 'science',   NULL, NULL, 2.00, NULL, 'math_credit'),
  ('ICT_CE', 'diploma',    'computing', NULL, NULL, 2.50, 2.00, ''),
  ('ICT_CE', 'diploma',    'science',   NULL, NULL, 2.75, 2.00, ''),
  -- Engineering: Mathematics and 1 relevant Natural Science subject
  ('ENG', 'stpm',       NULL,      'C',  2, NULL, NULL, 'math_sci'),
  ('ENG', 'alevel',     NULL,      'D',  2, NULL, NULL, 'math_sci'),
  ('ENG', 'uec',        NULL,      'B6', 5, NULL, NULL, 'math_sci'),
  ('ENG', 'foundation', 'science', NULL, NULL, 2.00, NULL, ''),
  ('ENG', 'diploma',    'science', NULL, NULL, 2.00, NULL, '');
