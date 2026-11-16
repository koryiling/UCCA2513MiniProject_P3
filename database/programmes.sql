-- UTAR Admission Assistant - programmes and minimum entry requirements for the admission tools.
-- Run after schema.sql (npm run db:setup does this). Safe to run again: it clears and reloads these tables only.
--
-- The 76 Bachelor's degree programmes offered on this website, with requirements from UTAR's official
-- "Minimum Entry Requirements" PDFs of each programme cluster (documents dated October 2026, checked 12-16 November 2026):
--   https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php
-- Foundation in Science / Arts are not offered as programmes here; they are kept only as the route that
-- SPM / O-Level students take before a degree (https://study.utar.edu.my/foundation.php).
--
-- Programmes with the same requirements share one requirement group. Each row of entry_requirements is one
-- accepted qualification: either at least min_subjects subjects with grade min_grade or better, or a CGPA of
-- min_cgpa (review_cgpa: from this CGPA the faculty may still consider the applicant, e.g. with work experience
-- or an interview). Both empty: the requirement is checked only by the rules.
-- rules / english_rule are rule codes explained in server/eligibility.js ('none' = no general English rule,
-- because the programme sets its own English test score in its rules).
-- Grades: UEC "Grade B" = B6; "GP 2.33" in STPM = C+. SAM, CPU, IB, STAM and TVET diplomas are shown on the
-- official pages only.

USE utar_admission;

SET NAMES utf8mb4;

DELETE FROM entry_requirements;
DELETE FROM programmes;
DELETE FROM requirement_groups;

INSERT INTO requirement_groups (group_code, level, english_rule, foundation_group, source_url, sort_order) VALUES
  ('FIS',     'foundation', 'eng_foundation', NULL,  'https://study.utar.edu.my/foundation-in-science.php', 1),
  ('FIA',     'foundation', 'eng_foundation', NULL,  'https://study.utar.edu.my/foundation-in-arts.php', 2),
  -- Accounting, Economics and Finance / Business Administration and Process Management
  ('ACC',     'bachelor', 'eng_credit',     'FIA', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 10),
  ('BUS',     'bachelor', 'eng_flex',       'FIA', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 11),
  ('BF',      'bachelor', 'eng_flex',       'FIA', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 12),
  ('ECON',    'bachelor', 'eng_flex',       'FIA', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 13),
  ('FIN',     'bachelor', 'eng_bachelor',   'FIA', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 14),
  ('LIS',     'bachelor', 'eng_bachelor',   'FIA', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 15),
  -- Education, Psychology and Humanities / Communications Studies and Creative Technology
  ('CHI',     'bachelor', 'eng_pass_only',  'FIA', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 20),
  ('ART',     'bachelor', 'eng_bachelor',   'FIA', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 21),
  ('ENGL',    'bachelor', 'none',           'FIA', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 22),
  ('JCM',     'bachelor', 'eng_bachelor',   'FIA', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 23),
  ('COMM',    'bachelor', 'eng_bachelor',   'FIA', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 24),
  ('ECE',     'bachelor', 'eng_bachelor',   'FIA', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 25),
  ('GAMEDEV', 'bachelor', 'eng_bachelor',   'FIS', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 26),
  ('GC',      'bachelor', 'eng_bachelor',   'FIA', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 27),
  ('PSY',     'bachelor', 'eng_flex',       'FIA', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 28),
  -- Medicine and Health Sciences / Agriculture, Food Science and Biological Science
  ('TCM',     'bachelor', 'eng_bachelor',   'FIS', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 30),
  ('MBBS',    'bachelor', 'none',           'FIS', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 31),
  ('NUR',     'bachelor', 'none',           'FIS', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 32),
  ('MED3',    'bachelor', 'eng_pass_only',  'FIS', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 33),
  ('AGFOOD',  'bachelor', 'eng_bachelor',   'FIS', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 34),
  ('SCI',     'bachelor', 'eng_bachelor',   'FIS', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 35),
  ('BIOTECH', 'bachelor', 'eng_bachelor',   'FIS', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 36),
  ('OSH',     'bachelor', 'eng_bachelor',   'FIS', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 37),
  -- Information and Communication Technology / Actuarial Science and Applied Mathematics
  ('CS',      'bachelor', 'eng_bachelor',   'FIS', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 40),
  ('CS2U2I',  'bachelor', 'eng_bachelor',   'FIS', 'https://study.utar.edu.my/SE_2u2i.php', 41),
  ('ICT',     'bachelor', 'eng_bachelor',   'FIS', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 42),
  ('ICT_CE',  'bachelor', 'eng_bachelor',   'FIS', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 43),
  ('ASM',     'bachelor', 'eng_bachelor',   'FIS', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 44),
  -- Engineering, Technology and Physics / Architecture, Surveying and Construction
  ('ENG',     'bachelor', 'eng_bachelor',   'FIS', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 50),
  ('ESYS',    'bachelor', 'eng_bachelor',   'FIS', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 51),
  ('PHY',     'bachelor', 'eng_bachelor',   'FIS', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 52),
  ('BPM',     'bachelor', 'eng_flex',       'FIA', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 53),
  ('ARCH',    'bachelor', 'eng_bachelor',   'FIA', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 54),
  ('QS',      'bachelor', 'eng_bachelor',   'FIS', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 55),
  ('CM',      'bachelor', 'eng_bachelor',   'FIS', 'https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php', 56);

-- The 76 programmes, in the order of the project's programme list
INSERT INTO programmes (group_code, name, sort_order) VALUES
  ('FIS',     'Foundation in Science', 0),
  ('FIA',     'Foundation in Arts', 0),
  ('ACC',     'Bachelor of Accounting (Honours)', 1),
  ('BUS',     'Bachelor of Business Administration (Honours)', 2),
  ('BF',      'Bachelor of Business Administration (Honours) Banking and Finance', 3),
  ('BUS',     'Bachelor of Business Administration (Honours) Entrepreneurship', 4),
  ('BUS',     'Bachelor of Business Administration (Honours) Healthcare Management', 5),
  ('BUS',     'Bachelor in Logistics and Supply Chain Management (Honours)', 6),
  ('BUS',     'Bachelor of Business Administration (Honours) Retail Management', 7),
  ('BF',      'Bachelor of Business Administration (Honours) Risk Management', 8),
  ('BUS',     'Bachelor of Business Administration (Honours) Tourism Destination Marketing', 9),
  ('ACC',     'Bachelor of Commerce (Honours) Accounting', 10),
  ('BF',      'Bachelor in Financial Economics Analytics (Honours)', 11),
  ('ECON',    'Bachelor of Economics (Honours) Global Economics', 12),
  ('FIN',     'Bachelor of Finance (Honours)', 13),
  ('FIN',     'Bachelor of Finance (Financial Technology) with Honours', 14),
  ('BUS',     'Bachelor of International Business (Honours)', 15),
  ('BUS',     'Bachelor of Marketing (Honours)', 16),
  ('LIS',     'Bachelor of Science (Honours) Logistics and International Shipping', 17),
  ('CHI',     'Bachelor of Arts (Honours) Chinese Studies', 18),
  ('ART',     'Bachelor of Arts (Honours) Digital Animation', 19),
  ('ENGL',    'Bachelor of Arts (Honours) English Education', 20),
  ('ENGL',    'Bachelor of Arts (Honours) English Language', 21),
  ('ART',     'Bachelor of Arts (Honours) Game Design', 22),
  ('ART',     'Bachelor of Arts (Honours) Graphic Design and Multimedia', 23),
  ('JCM',     'Bachelor of Arts (Honours) Journalism in Chinese Media', 24),
  ('COMM',    'Bachelor of Communication (Honours) Advertising', 25),
  ('COMM',    'Bachelor of Communication (Honours) Broadcasting', 26),
  ('COMM',    'Bachelor of Communication (Honours) Journalism', 27),
  ('COMM',    'Bachelor of Communication (Honours) Public Relations', 28),
  ('COMM',    'Bachelor in Corporate Communication (Honours)', 29),
  ('ECE',     'Bachelor of Early Childhood Education (Honours)', 30),
  ('COMM',    'Bachelor in Creative Media (Honours)', 31),
  ('GAMEDEV', 'Bachelor of Science (Honours) Game Development', 32),
  ('GC',      'Bachelor of Social Science (Honours) Guidance and Counselling', 33),
  ('PSY',     'Bachelor of Social Science (Honours) Psychology', 34),
  ('TCM',     'Bachelor of Chinese Medicine (Honours)', 35),
  ('MBBS',    'Bachelor of Medicine and Bachelor of Surgery (MBBS)', 36),
  ('NUR',     'Bachelor of Nursing (Honours)', 37),
  ('MED3',    'Bachelor of Physiotherapy (Honours)', 38),
  ('AGFOOD',  'Bachelor of Science (Honours) Agricultural Science', 39),
  ('SCI',     'Bachelor of Science (Honours) Biochemistry', 40),
  ('MED3',    'Bachelor of Science (Honours) Biomedical Science', 41),
  ('BIOTECH', 'Bachelor of Science (Honours) Biotechnology', 42),
  ('SCI',     'Bachelor of Science (Honours) Chemistry', 43),
  ('MED3',    'Bachelor of Science (Honours) Dietetics', 44),
  ('OSH',     'Bachelor of Science (Honours) Occupational Safety and Health with Environmental Health', 45),
  ('AGFOOD',  'Bachelor of Science (Honours) Food Science', 46),
  ('CS',      'Bachelor of Computer Science (Honours)', 47),
  ('ICT',     'Bachelor of Information Systems (Honours) Business Information Systems', 48),
  ('ICT',     'Bachelor of Information Systems (Honours) Digital Economy Technology', 49),
  ('ICT',     'Bachelor of Information Systems (Honours) Information Systems Engineering', 50),
  ('ICT',     'Bachelor of Information Technology (Honours) Communications and Networking', 51),
  ('ICT_CE',  'Bachelor of Information Technology (Honours) Computer Engineering', 52),
  ('ICT',     'Bachelor of Information Technology (Honours) Industrial Intelligent Systems', 53),
  ('ASM',     'Bachelor of Science (Honours) Actuarial Science', 54),
  ('ASM',     'Bachelor of Science (Honours) Applied Mathematics with Computing', 55),
  ('ASM',     'Bachelor of Science (Honours) Financial Mathematics', 56),
  ('CS',      'Bachelor of Software Engineering (Honours)', 57),
  ('CS2U2I',  'Bachelor of Software Engineering (Honours) 2u2i', 58),
  ('ENG',     'Bachelor of Biomedical Engineering with Honours', 59),
  ('BPM',     'Bachelor of Building and Property Management (Honours)', 60),
  ('ENG',     'Bachelor of Chemical Engineering (Process) with Honours', 61),
  ('ENG',     'Bachelor of Chemical Engineering (Petrochemical) with Honours', 62),
  ('ENG',     'Bachelor of Civil Engineering with Honours', 63),
  ('ENG',     'Bachelor of Civil Engineering (Environmental) with Honours', 64),
  ('ENG',     'Bachelor of Electrical and Electronic Engineering with Honours', 65),
  ('ENG',     'Bachelor of Electronics Engineering with Honours', 66),
  ('ENG',     'Bachelor of Engineering (Honours) Industrial Engineering', 67),
  ('ENG',     'Bachelor of Materials Engineering with Honours', 68),
  ('ENG',     'Bachelor of Mechanical Engineering with Honours', 69),
  ('ENG',     'Bachelor of Mechatronics Engineering with Honours', 70),
  ('ENG',     'Bachelor of Telecommunication Engineering with Honours', 71),
  ('ESYS',    'Bachelor of Technology (Honours) in Electronic Systems', 72),
  ('ARCH',    'Bachelor of Science (Honours) Architecture', 73),
  ('PHY',     'Bachelor of Science (Honours) Physics', 74),
  ('QS',      'Bachelor of Science in Quantity Surveying with Honours', 75),
  ('CM',      'Bachelor of Technology (Honours) Construction Management', 76);

INSERT INTO entry_requirements (group_code, qualification, study_field, min_grade, min_subjects, min_cgpa, review_cgpa, rules) VALUES
  -- Foundation in Science: 5 credits including 1 Mathematics and 2 Science subjects (UEC: Grade B in 3 subjects)
  ('FIS', 'spm',    NULL, 'C',  5, NULL, NULL, 'fis_subjects'),
  ('FIS', 'olevel', NULL, 'C',  5, NULL, NULL, 'fis_subjects'),
  ('FIS', 'uec',    NULL, 'B6', 3, NULL, NULL, 'fis_subjects'),
  -- Foundation in Arts: 5 credits (UEC: Grade B in 3 subjects)
  ('FIA', 'spm',    NULL, 'C',  5, NULL, NULL, ''),
  ('FIA', 'olevel', NULL, 'C',  5, NULL, NULL, ''),
  ('FIA', 'uec',    NULL, 'B6', 3, NULL, NULL, ''),

  -- Accounting, Commerce Accounting
  ('ACC', 'stpm',       NULL,       'C+', 2, NULL, NULL, 'math_credit_mec'),
  ('ACC', 'alevel',     NULL,       'D',  2, NULL, NULL, 'math_credit_mec'),
  ('ACC', 'uec',        NULL,       'B5', 5, NULL, NULL, 'math_credit_mec'),
  ('ACC', 'foundation', NULL,       NULL, NULL, 2.50, NULL, 'math_credit_mec'),
  ('ACC', 'diploma',    'business', NULL, NULL, 2.50, 2.00, 'math_credit_mec'),
  ('ACC', 'diploma',    NULL,       NULL, NULL, 2.50, NULL, 'math_credit_mec'),
  -- Business Administration and related programmes: pass in SPM Mathematics and English
  ('BUS', 'stpm',       NULL, 'C',  2, NULL, NULL, 'math_pass_mec'),
  ('BUS', 'alevel',     NULL, 'D',  2, NULL, NULL, 'math_pass_mec'),
  ('BUS', 'uec',        NULL, 'B6', 5, NULL, NULL, 'math_pass_mec'),
  ('BUS', 'foundation', NULL, NULL, NULL, 2.00, NULL, 'math_pass_mec'),
  ('BUS', 'diploma',    NULL, NULL, NULL, 2.00, NULL, 'math_pass_mec'),
  -- Banking and Finance, Risk Management, Financial Economics Analytics
  ('BF', 'stpm',       NULL, 'C',  2, NULL, NULL, 'math_pass_mec'),
  ('BF', 'alevel',     NULL, 'D',  2, NULL, NULL, 'math_pass_mec'),
  ('BF', 'uec',        NULL, 'B6', 5, NULL, NULL, 'math_pass_mec'),
  ('BF', 'foundation', NULL, NULL, NULL, 2.00, NULL, 'math_pass_mec'),
  ('BF', 'diploma',    NULL, NULL, NULL, 2.00, NULL, 'math_pass_mec'),
  -- Global Economics: grades in relevant subjects, pass in SPM Mathematics and English
  ('ECON', 'stpm',       NULL, 'C',  2, NULL, NULL, 'math_pass_mec'),
  ('ECON', 'alevel',     NULL, 'D',  2, NULL, NULL, 'math_pass_mec'),
  ('ECON', 'uec',        NULL, 'B6', 5, NULL, NULL, 'math_pass_mec'),
  ('ECON', 'foundation', NULL, NULL, NULL, 2.00, NULL, 'math_pass_mec'),
  ('ECON', 'diploma',    NULL, NULL, NULL, 2.00, NULL, 'math_pass_mec'),
  -- Finance, Finance (Financial Technology): credit in SPM Mathematics unless the qualification has Mathematics
  ('FIN', 'stpm',       NULL,       'C+', 2, NULL, NULL, 'fin_math'),
  ('FIN', 'alevel',     NULL,       'D',  2, NULL, NULL, 'fin_math'),
  ('FIN', 'uec',        NULL,       'B5', 5, NULL, NULL, 'fin_math'),
  ('FIN', 'foundation', NULL,       NULL, NULL, 2.50, NULL, 'math_credit'),
  ('FIN', 'diploma',    'business', NULL, NULL, 2.50, NULL, ''),
  -- Logistics and International Shipping
  ('LIS', 'stpm',       NULL,       'C',  2, NULL, NULL, ''),
  ('LIS', 'alevel',     NULL,       'D',  2, NULL, NULL, ''),
  ('LIS', 'uec',        NULL,       'B6', 5, NULL, NULL, ''),
  ('LIS', 'foundation', NULL,       NULL, NULL, 2.00, NULL, ''),
  ('LIS', 'diploma',    'business', NULL, NULL, 2.00, NULL, ''),

  -- Chinese Studies: credit in SPM Chinese, pass in SPM English
  ('CHI', 'stpm',       NULL, 'C',  2, NULL, NULL, 'chinese_credit'),
  ('CHI', 'alevel',     NULL, 'D',  2, NULL, NULL, 'chinese_credit'),
  ('CHI', 'uec',        NULL, 'B6', 5, NULL, NULL, 'chinese_credit'),
  ('CHI', 'foundation', NULL, NULL, NULL, 2.00, NULL, 'chinese_credit'),
  ('CHI', 'diploma',    NULL, NULL, NULL, 2.00, NULL, 'chinese_credit'),
  -- Digital Animation, Game Design, Graphic Design and Multimedia: portfolio for everyone
  ('ART', 'stpm',       NULL, 'C',  2, NULL, NULL, 'portfolio'),
  ('ART', 'alevel',     NULL, 'D',  2, NULL, NULL, 'portfolio'),
  ('ART', 'uec',        NULL, 'B6', 5, NULL, NULL, 'portfolio'),
  ('ART', 'foundation', NULL, NULL, NULL, 2.00, NULL, 'portfolio'),
  ('ART', 'diploma',    NULL, NULL, NULL, 2.00, NULL, 'portfolio'),
  -- English Education (TESL), English Language: credit in SPM English and MUET Band 4.0 / IELTS 6.0
  ('ENGL', 'stpm',       NULL, 'C',  2, NULL, NULL, 'eng_credit_req,english_high'),
  ('ENGL', 'alevel',     NULL, 'D',  2, NULL, NULL, 'eng_credit_req,english_high'),
  ('ENGL', 'uec',        NULL, 'B6', 5, NULL, NULL, 'eng_credit_req,english_high'),
  ('ENGL', 'foundation', NULL, NULL, NULL, 2.00, NULL, 'eng_credit_req,english_high'),
  ('ENGL', 'diploma',    NULL, NULL, NULL, 2.00, NULL, 'eng_credit_req,english_high'),
  -- Journalism in Chinese Media: as Communication, plus a pass in SPM Chinese
  ('JCM', 'stpm',       NULL, 'C',  2, NULL, NULL, 'eng_credit_req,chinese_pass'),
  ('JCM', 'alevel',     NULL, 'D',  2, NULL, NULL, 'chinese_pass'),
  ('JCM', 'uec',        NULL, 'B6', 5, NULL, NULL, 'eng_credit_req,chinese_pass'),
  ('JCM', 'foundation', NULL, NULL, NULL, 2.00, NULL, 'eng_credit_req,chinese_pass'),
  ('JCM', 'diploma',    NULL, NULL, NULL, 2.00, NULL, 'chinese_pass'),
  -- Communication programmes, Corporate Communication, Creative Media: credit in SPM English (A-Level: pass)
  ('COMM', 'stpm',       NULL, 'C',  2, NULL, NULL, 'eng_credit_req'),
  ('COMM', 'alevel',     NULL, 'D',  2, NULL, NULL, ''),
  ('COMM', 'uec',        NULL, 'B6', 5, NULL, NULL, 'eng_credit_req'),
  ('COMM', 'foundation', NULL, NULL, NULL, 2.00, NULL, 'eng_credit_req'),
  ('COMM', 'diploma',    NULL, NULL, NULL, 2.00, NULL, ''),
  -- Early Childhood Education
  ('ECE', 'stpm',       NULL, 'C',  2, NULL, NULL, ''),
  ('ECE', 'alevel',     NULL, 'D',  2, NULL, NULL, ''),
  ('ECE', 'uec',        NULL, 'B6', 5, NULL, NULL, ''),
  ('ECE', 'foundation', NULL, NULL, NULL, 2.00, NULL, ''),
  ('ECE', 'diploma',    NULL, NULL, NULL, 2.00, NULL, ''),
  -- Game Development: logical thinking test
  ('GAMEDEV', 'stpm',       NULL, 'C',  2, NULL, NULL, 'logic_test'),
  ('GAMEDEV', 'alevel',     NULL, 'D',  2, NULL, NULL, 'logic_test'),
  ('GAMEDEV', 'uec',        NULL, 'B6', 5, NULL, NULL, 'logic_test'),
  ('GAMEDEV', 'foundation', NULL, NULL, NULL, 2.00, NULL, 'logic_test'),
  ('GAMEDEV', 'diploma',    NULL, NULL, NULL, 2.00, NULL, 'logic_test'),
  -- Guidance and Counselling: personal suitability and readiness interview
  ('GC', 'stpm',       NULL, 'C',  2, NULL, NULL, 'interview_gc'),
  ('GC', 'alevel',     NULL, 'D',  2, NULL, NULL, 'interview_gc'),
  ('GC', 'uec',        NULL, 'B6', 5, NULL, NULL, 'interview_gc'),
  ('GC', 'foundation', NULL, NULL, NULL, 2.00, NULL, 'interview_gc'),
  ('GC', 'diploma',    NULL, NULL, NULL, 2.00, NULL, 'interview_gc'),
  -- Psychology: credit in SPM Mathematics and 1 Science subject, pass in SPM English
  ('PSY', 'stpm',       NULL, 'C',  2, NULL, NULL, 'math_credit_mec,science_credit'),
  ('PSY', 'alevel',     NULL, 'D',  2, NULL, NULL, 'math_credit_mec,science_credit'),
  ('PSY', 'uec',        NULL, 'B6', 5, NULL, NULL, 'math_credit_mec,science_credit'),
  ('PSY', 'foundation', NULL, NULL, NULL, 2.00, NULL, 'math_credit_mec,science_credit'),
  ('PSY', 'diploma',    NULL, NULL, NULL, 2.00, NULL, 'math_credit_mec,science_credit'),

  -- Chinese Medicine
  ('TCM', 'stpm',       NULL,      'C',  2, NULL, NULL, 'stpm_cgpa_250,tcm_sci'),
  ('TCM', 'alevel',     NULL,      'C',  2, NULL, NULL, 'tcm_sci'),
  ('TCM', 'uec',        NULL,      'B5', 5, NULL, NULL, 'tcm_sci'),
  ('TCM', 'foundation', 'science', NULL, NULL, 2.50, NULL, ''),
  ('TCM', 'foundation', NULL,      NULL, NULL, 2.50, NULL, 'spm_2sci_math'),
  ('TCM', 'diploma',    'science', NULL, NULL, 2.50, 2.00, ''),
  -- Medicine (MBBS): specific subjects and grades, English test, interview
  ('MBBS', 'stpm',       NULL,      NULL, NULL, NULL, NULL, 'mbbs_subjects,mbbs_english,interview_mbbs'),
  ('MBBS', 'alevel',     NULL,      NULL, NULL, NULL, NULL, 'mbbs_subjects,mbbs_english,interview_mbbs'),
  ('MBBS', 'uec',        NULL,      'B4', 5, NULL, NULL, 'mbbs_subjects,mbbs_english,interview_mbbs'),
  ('MBBS', 'foundation', 'science', NULL, NULL, 3.50, NULL, 'mbbs_found,mbbs_spm5b,mbbs_english,interview_mbbs'),
  ('MBBS', 'diploma',    'science', NULL, NULL, 3.50, NULL, 'mbbs_dip_spm,mbbs_english,interview_mbbs'),
  -- Nursing: credit in SPM Bahasa Melayu, MUET Band 3 / IELTS 5.5
  ('NUR', 'stpm',       NULL, NULL, NULL, NULL, NULL, 'stpm_cgpa_200,bm_credit,muet3'),
  ('NUR', 'alevel',     NULL, 'C',  3, NULL, NULL, 'bm_credit,muet3'),
  ('NUR', 'uec',        NULL, 'B6', 5, NULL, NULL, 'nursing_uec_spm,muet3'),
  ('NUR', 'foundation', NULL, NULL, NULL, 2.50, NULL, 'bm_credit,muet3'),
  ('NUR', 'diploma',    NULL, NULL, NULL, 2.50, NULL, 'bm_credit,muet3'),
  -- Biomedical Science, Dietetics, Physiotherapy: 2 of Biology, Chemistry, Physics/Mathematics; MUET Band 3 / IELTS 5.5
  ('MED3', 'stpm',       NULL,      'C+', 2, NULL, NULL, 'med3_subjects,muet3'),
  ('MED3', 'alevel',     NULL,      'D',  2, NULL, NULL, 'med3_subjects'),
  ('MED3', 'uec',        NULL,      'B6', 5, NULL, NULL, 'med3_subjects,muet3'),
  ('MED3', 'foundation', 'science', NULL, NULL, NULL, NULL, 'found_bio2,muet3'),
  ('MED3', 'diploma',    'science', NULL, NULL, 2.75, 0.00, 'muet3'),
  -- Agricultural Science, Food Science
  ('AGFOOD', 'stpm',       NULL,      'C',  2, NULL, NULL, ''),
  ('AGFOOD', 'alevel',     NULL,      'D',  2, NULL, NULL, ''),
  ('AGFOOD', 'uec',        NULL,      'B6', 5, NULL, NULL, ''),
  ('AGFOOD', 'foundation', NULL,      NULL, NULL, 2.00, NULL, ''),
  ('AGFOOD', 'diploma',    'science', NULL, NULL, 2.00, NULL, ''),
  -- Biochemistry, Chemistry
  ('SCI', 'stpm',       NULL,      'C',  2, NULL, NULL, ''),
  ('SCI', 'alevel',     NULL,      'D',  2, NULL, NULL, ''),
  ('SCI', 'uec',        NULL,      'B6', 5, NULL, NULL, ''),
  ('SCI', 'foundation', 'science', NULL, NULL, 2.00, NULL, ''),
  ('SCI', 'diploma',    'science', NULL, NULL, 2.00, NULL, ''),
  -- Biotechnology: credits in SPM Mathematics, 1 Science subject and 1 other subject
  ('BIOTECH', 'stpm',       NULL,      'C',  2, NULL, NULL, 'biotech_spm'),
  ('BIOTECH', 'alevel',     NULL,      'D',  2, NULL, NULL, 'biotech_spm'),
  ('BIOTECH', 'uec',        NULL,      'B6', 5, NULL, NULL, 'biotech_spm'),
  ('BIOTECH', 'foundation', NULL,      NULL, NULL, 2.00, NULL, 'biotech_spm'),
  ('BIOTECH', 'diploma',    'science', NULL, NULL, 2.00, NULL, ''),
  -- Occupational Safety and Health with Environmental Health: credit in 1 SPM Science subject
  ('OSH', 'stpm',       NULL, 'C',  2, NULL, NULL, 'science_credit_osh'),
  ('OSH', 'alevel',     NULL, 'D',  2, NULL, NULL, 'science_credit_osh'),
  ('OSH', 'uec',        NULL, 'B6', 5, NULL, NULL, 'science_credit_osh'),
  ('OSH', 'foundation', NULL, NULL, NULL, 2.00, NULL, 'science_credit_osh'),
  ('OSH', 'diploma',    NULL, NULL, NULL, 2.00, NULL, ''),

  -- Computer Science, Software Engineering
  ('CS', 'stpm',       NULL,        'C',  2, NULL, NULL, 'cs_maths'),
  ('CS', 'alevel',     NULL,        'D',  2, NULL, NULL, 'cs_maths'),
  ('CS', 'uec',        NULL,        'B6', 5, NULL, NULL, 'cs_maths'),
  ('CS', 'foundation', NULL,        NULL, NULL, 2.00, NULL, 'cs_maths'),
  ('CS', 'diploma',    'computing', NULL, NULL, 2.50, 2.00, ''),
  ('CS', 'diploma',    'science',   NULL, NULL, 2.75, 2.50, 'cs_maths'),
  -- Software Engineering 2u2i: same entry as Software Engineering; the industry mode has its own selection later
  ('CS2U2I', 'stpm',       NULL,        'C',  2, NULL, NULL, 'cs_maths,industry_mode'),
  ('CS2U2I', 'alevel',     NULL,        'D',  2, NULL, NULL, 'cs_maths,industry_mode'),
  ('CS2U2I', 'uec',        NULL,        'B6', 5, NULL, NULL, 'cs_maths,industry_mode'),
  ('CS2U2I', 'foundation', NULL,        NULL, NULL, 2.00, NULL, 'cs_maths,industry_mode'),
  ('CS2U2I', 'diploma',    'computing', NULL, NULL, 2.50, 2.00, 'industry_mode'),
  ('CS2U2I', 'diploma',    'science',   NULL, NULL, 2.75, 2.50, 'cs_maths,industry_mode'),
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
  -- Actuarial Science, Applied Mathematics with Computing, Financial Mathematics: credit in SPM Mathematics
  ('ASM', 'stpm',       NULL,       'C',  2, NULL, NULL, 'math_credit'),
  ('ASM', 'alevel',     NULL,       'D',  2, NULL, NULL, 'math_credit'),
  ('ASM', 'uec',        NULL,       'B6', 5, NULL, NULL, 'math_credit'),
  ('ASM', 'foundation', 'science',  NULL, NULL, 2.00, NULL, 'math_credit'),
  ('ASM', 'foundation', 'business', NULL, NULL, 2.00, NULL, 'math_credit'),
  ('ASM', 'diploma',    'science',  NULL, NULL, 2.50, 0.00, 'math_credit'),
  ('ASM', 'diploma',    'business', NULL, NULL, 2.50, 0.00, 'math_credit'),

  -- Engineering: Mathematics and 1 relevant Natural Science subject
  ('ENG', 'stpm',       NULL,      'C',  2, NULL, NULL, 'math_sci'),
  ('ENG', 'alevel',     NULL,      'D',  2, NULL, NULL, 'math_sci'),
  ('ENG', 'uec',        NULL,      'B6', 5, NULL, NULL, 'math_sci'),
  ('ENG', 'foundation', 'science', NULL, NULL, 2.00, NULL, ''),
  ('ENG', 'diploma',    'science', NULL, NULL, 2.00, NULL, ''),
  -- Electronic Systems
  ('ESYS', 'stpm',       NULL,      'C',  2, NULL, NULL, ''),
  ('ESYS', 'alevel',     NULL,      'D',  2, NULL, NULL, ''),
  ('ESYS', 'uec',        NULL,      'B6', 5, NULL, NULL, ''),
  ('ESYS', 'foundation', 'science', NULL, NULL, 2.00, NULL, ''),
  ('ESYS', 'diploma',    'science', NULL, NULL, 2.00, NULL, ''),
  -- Physics: Physics among the subjects (otherwise subject to the faculty's recommendation)
  ('PHY', 'stpm',       NULL,      'C',  2, NULL, NULL, 'physics_subject'),
  ('PHY', 'alevel',     NULL,      'D',  2, NULL, NULL, 'physics_subject'),
  ('PHY', 'uec',        NULL,      'B6', 5, NULL, NULL, 'physics_subject'),
  ('PHY', 'foundation', 'science', NULL, NULL, 2.00, NULL, ''),
  ('PHY', 'diploma',    'science', NULL, NULL, 2.00, NULL, ''),
  -- Building and Property Management: 3 subjects, pass in SPM Mathematics and English
  ('BPM', 'stpm',       NULL, 'C',  3, NULL, NULL, 'math_pass_mec'),
  ('BPM', 'alevel',     NULL, 'D',  3, NULL, NULL, 'math_pass_mec'),
  ('BPM', 'uec',        NULL, 'B6', 5, NULL, NULL, 'math_pass_mec'),
  ('BPM', 'foundation', NULL, NULL, NULL, 2.00, NULL, 'math_pass_mec'),
  ('BPM', 'diploma',    NULL, NULL, NULL, 2.00, NULL, ''),
  -- Architecture: credit in SPM Art (otherwise a portfolio) and in SPM Mathematics
  ('ARCH', 'stpm',       NULL,      'C',  2, NULL, NULL, 'art_portfolio,math_credit'),
  ('ARCH', 'alevel',     NULL,      'D',  2, NULL, NULL, 'art_portfolio,math_credit'),
  ('ARCH', 'uec',        NULL,      'B6', 5, NULL, NULL, 'art_portfolio,math_credit'),
  ('ARCH', 'foundation', NULL,      NULL, NULL, 2.00, NULL, 'art_portfolio'),
  ('ARCH', 'diploma',    'science', NULL, NULL, 2.00, NULL, 'art_portfolio'),
  -- Quantity Surveying: Mathematics among the subjects, credits in SPM Mathematics and Bahasa Melayu / English
  ('QS', 'stpm',       NULL,      'C',  3, NULL, NULL, 'math_subject,math_credit,bm_or_english'),
  ('QS', 'alevel',     NULL,      'D',  3, NULL, NULL, 'math_subject,math_credit,bm_or_english'),
  ('QS', 'uec',        NULL,      'B6', 5, NULL, NULL, 'math_subject,bm_or_english'),
  ('QS', 'foundation', NULL,      NULL, NULL, 2.50, NULL, 'math_credit,bm_or_english'),
  ('QS', 'diploma',    'science', NULL, NULL, 2.67, 2.00, 'math_credit,bm_or_english'),
  -- Construction Management: passes in SPM Mathematics, English and 1 science / technical / vocational subject
  ('CM', 'stpm',       NULL,      'C',  2, NULL, NULL, 'cm_spm'),
  ('CM', 'alevel',     NULL,      'D',  2, NULL, NULL, 'cm_spm'),
  ('CM', 'uec',        NULL,      'B6', 5, NULL, NULL, 'cm_spm'),
  ('CM', 'foundation', NULL,      NULL, NULL, 2.00, NULL, ''),
  ('CM', 'diploma',    'science', NULL, NULL, 2.50, 2.00, '');
