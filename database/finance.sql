-- UTAR Admission Assistant - Module 3: Tuition Fees & Scholarship Information.
-- Run after programmes.sql (npm run db:setup does this). Safe to run again: it clears and reloads these tables only.
--
-- programme_fees: total programme fee of each of the 76 Bachelor's degree programmes in programmes.sql, for Malaysian
--   and international students, taken from each programme's page on https://study.utar.edu.my (checked 16 November 2026).
--   UTAR notes the estimated totals may vary by 10%, and international fees exclude 6% SST.
-- scholarship_tiers: UTAR Scholarship for Top Achievers, from the DSFA page (checked 16 November 2026):
--   https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php
--   Awarded automatically on actual results in a single sitting; criteria may change without notice.
--   The M. Kandiah Faculty of Medicine and Health Sciences programmes (Chinese Medicine, MBBS, Nursing, Physiotherapy)
--   have their own criteria on that page and are not covered here.
-- scholarships: the other UTAR scholarships and financial aid listed on the same DSFA page (name, levels, link only).

USE utar_admission;

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS programme_fees (
  programme_id        INT PRIMARY KEY,
  duration_years      DECIMAL(3,1)  NOT NULL,   -- full-time duration
  fee_malaysian       DECIMAL(10,2) NOT NULL,   -- estimated total programme fee (RM)
  fee_international   DECIMAL(10,2) NOT NULL,   -- estimated total programme fee (RM), before 6% SST
  campus              VARCHAR(40)   NOT NULL,
  faculty             VARCHAR(20)   NOT NULL,
  source_url          VARCHAR(255)  NOT NULL,   -- page the fee was taken from
  last_checked        DATE          NOT NULL,
  CONSTRAINT fk_fee_programme FOREIGN KEY (programme_id) REFERENCES programmes (programme_id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- One row per tier. result_type 'count_a': at least min_value subjects with grade A (condition 'a_plus_a_only':
-- only A+ and A count). result_type 'cgpa': CGPA from min_value to max_value (NULL = no upper limit).
CREATE TABLE IF NOT EXISTS scholarship_tiers (
  tier_id         INT AUTO_INCREMENT PRIMARY KEY,
  study_level     ENUM('foundation', 'bachelor') NOT NULL,   -- the programme the scholarship is for
  qualification   ENUM('spm', 'olevel', 'stpm', 'alevel', 'uec', 'foundation', 'diploma') NOT NULL,
  result_type     ENUM('count_a', 'cgpa') NOT NULL,
  min_value       DECIMAL(5,4) NOT NULL,
  max_value       DECIMAL(5,4) NULL,
  waiver_percent  TINYINT NOT NULL,                          -- tuition fee waiver
  conditions      VARCHAR(100) NOT NULL DEFAULT '',          -- comma-separated: a_plus_a_only, straight_passes
  source_url      VARCHAR(255) NOT NULL,
  last_checked    DATE NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS scholarships (
  code            VARCHAR(40)  PRIMARY KEY,
  name            VARCHAR(150) NOT NULL,                     -- official name (kept in English)
  kind            ENUM('scholarship', 'aid') NOT NULL,       -- aid = financial aid or loan
  for_foundation  BOOLEAN NOT NULL,
  for_bachelor    BOOLEAN NOT NULL,
  applies_by      ENUM('apply_week_1_2', 'apply_week_1_4', 'see_page') NOT NULL,
  source_url      VARCHAR(255) NOT NULL,
  last_checked    DATE NOT NULL,
  sort_order      INT NOT NULL DEFAULT 0
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

DELETE FROM programme_fees;
DELETE FROM scholarship_tiers;
DELETE FROM scholarships;

-- Joined on the programme name, so the fees follow the programme_id that programmes.sql gives each programme.
INSERT INTO programme_fees (programme_id, duration_years, fee_malaysian, fee_international, campus, faculty, source_url, last_checked)
  SELECT programme_id, 3.5, 58450, 82250, 'Sungai Long', 'FAM', 'https://study.utar.edu.my/accounting.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Accounting (Honours)'
  UNION ALL
  SELECT programme_id, 3, 54400, 76650, 'Kampar', 'THP FBF', 'https://study.utar.edu.my/business-administration.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Business Administration (Honours)'
  UNION ALL
  SELECT programme_id, 3, 55700, 78250, 'Kampar', 'THP FBF', 'https://study.utar.edu.my/banking-finance.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Business Administration (Honours) Banking and Finance'
  UNION ALL
  SELECT programme_id, 3, 55800, 78450, 'Kampar', 'THP FBF', 'https://study.utar.edu.my/entrepreneurship.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Business Administration (Honours) Entrepreneurship'
  UNION ALL
  SELECT programme_id, 3, 57850, 80750, 'Kampar', 'THP FBF', 'https://study.utar.edu.my/healthcare-management.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Business Administration (Honours) Healthcare Management'
  UNION ALL
  SELECT programme_id, 3, 57450, 80450, 'Kampar', 'THP FBF', 'https://study.utar.edu.my/LSC.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor in Logistics and Supply Chain Management (Honours)'
  UNION ALL
  SELECT programme_id, 3, 55100, 77550, 'Kampar', 'THP FBF', 'https://study.utar.edu.my/retail-management.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Business Administration (Honours) Retail Management'
  UNION ALL
  SELECT programme_id, 3, 56400, 79100, 'Kampar', 'THP FBF', 'https://study.utar.edu.my/risk-management.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Business Administration (Honours) Risk Management'
  UNION ALL
  SELECT programme_id, 3, 55800, 78450, 'Kampar', 'THP FBF', 'https://study.utar.edu.my/tourism-destination-marketing.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Business Administration (Honours) Tourism Destination Marketing'
  UNION ALL
  SELECT programme_id, 3, 56350, 79050, 'Kampar', 'THP FBF', 'https://study.utar.edu.my/commerce-accounting.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Commerce (Honours) Accounting'
  UNION ALL
  SELECT programme_id, 3, 54450, 76550, 'Kampar', 'THP FBF', 'https://study.utar.edu.my/financial-economics.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor in Financial Economics Analytics (Honours)'
  UNION ALL
  SELECT programme_id, 3, 55500, 78150, 'Sungai Long', 'FAM', 'https://study.utar.edu.my/global-economics.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Economics (Honours) Global Economics'
  UNION ALL
  SELECT programme_id, 3, 54450, 76850, 'Kampar', 'THP FBF', 'https://study.utar.edu.my/finance.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Finance (Honours)'
  UNION ALL
  SELECT programme_id, 3, 57800, 81000, 'Sungai Long', 'FAM', 'https://study.utar.edu.my/financial-technology.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Finance (Financial Technology) with Honours'
  UNION ALL
  SELECT programme_id, 3, 56700, 79650, 'Sungai Long', 'FAM', 'https://study.utar.edu.my/international-business.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of International Business (Honours)'
  UNION ALL
  SELECT programme_id, 3, 54300, 76550, 'Kampar', 'THP FBF', 'https://study.utar.edu.my/marketing.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Marketing (Honours)'
  UNION ALL
  SELECT programme_id, 3, 58400, 81900, 'Kampar', 'FSc', 'https://study.utar.edu.my/logistics-international-shipping.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Science (Honours) Logistics and International Shipping'
  UNION ALL
  SELECT programme_id, 3, 54850, 77550, 'Kampar', 'FCS', 'https://study.utar.edu.my/chinese-studies.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Arts (Honours) Chinese Studies'
  UNION ALL
  SELECT programme_id, 3, 59050, 82750, 'Sungai Long', 'FCI', 'https://study.utar.edu.my/digital-animation.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Arts (Honours) Digital Animation'
  UNION ALL
  SELECT programme_id, 3, 55250, 78150, 'Kampar', 'FEd', 'https://study.utar.edu.my/english-education.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Arts (Honours) English Education'
  UNION ALL
  SELECT programme_id, 3, 54300, 76850, 'Kampar', 'FAS', 'https://study.utar.edu.my/english-language.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Arts (Honours) English Language'
  UNION ALL
  SELECT programme_id, 3, 59650, 83500, 'Sungai Long', 'FCI', 'https://study.utar.edu.my/game-design.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Arts (Honours) Game Design'
  UNION ALL
  SELECT programme_id, 3, 59550, 83400, 'Sungai Long', 'FCI', 'https://study.utar.edu.my/graphic-design-multimedia.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Arts (Honours) Graphic Design and Multimedia'
  UNION ALL
  SELECT programme_id, 3, 56650, 79700, 'Sungai Long', 'FCI', 'https://study.utar.edu.my/journalism-chinese-media.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Arts (Honours) Journalism in Chinese Media'
  UNION ALL
  SELECT programme_id, 3, 56550, 79550, 'Kampar', 'FAS', 'https://study.utar.edu.my/advertising.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Communication (Honours) Advertising'
  UNION ALL
  SELECT programme_id, 3, 56950, 80000, 'Sungai Long', 'FCI', 'https://study.utar.edu.my/broadcasting.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Communication (Honours) Broadcasting'
  UNION ALL
  SELECT programme_id, 3, 56000, 78900, 'Kampar', 'FAS', 'https://study.utar.edu.my/journalism.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Communication (Honours) Journalism'
  UNION ALL
  SELECT programme_id, 3, 56150, 79050, 'Kampar', 'FAS', 'https://study.utar.edu.my/public-relations.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Communication (Honours) Public Relations'
  UNION ALL
  SELECT programme_id, 3, 56850, 79950, 'Sungai Long', 'FCI', 'https://study.utar.edu.my/corporate-communication.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor in Corporate Communication (Honours)'
  UNION ALL
  SELECT programme_id, 3, 55250, 78150, 'Sungai Long', 'FEd', 'https://study.utar.edu.my/early-childhood-education.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Early Childhood Education (Honours)'
  UNION ALL
  SELECT programme_id, 3, 56950, 80050, 'Sungai Long', 'FCI', 'https://study.utar.edu.my/media-creative-studies.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor in Creative Media (Honours)'
  UNION ALL
  SELECT programme_id, 3, 58650, 82300, 'Sungai Long', 'FCI', 'https://study.utar.edu.my/game-development.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Science (Honours) Game Development'
  UNION ALL
  SELECT programme_id, 4, 56150, 78500, 'Kampar', 'FAS', 'https://study.utar.edu.my/guidance-counselling.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Social Science (Honours) Guidance and Counselling'
  UNION ALL
  SELECT programme_id, 3, 57550, 80750, 'Kampar', 'FAS', 'https://study.utar.edu.my/psychology.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Social Science (Honours) Psychology'
  UNION ALL
  SELECT programme_id, 5, 113700, 147650, 'Sungai Long', 'MK FMHS', 'https://study.utar.edu.my/chinese-medicine.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Chinese Medicine (Honours)'
  UNION ALL
  SELECT programme_id, 5, 320950, 393750, 'Sungai Long', 'MK FMHS', 'https://study.utar.edu.my/medicine-surgery.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Medicine and Bachelor of Surgery (MBBS)'
  UNION ALL
  SELECT programme_id, 4, 76050, 102750, 'Sungai Long', 'MK FMHS', 'https://study.utar.edu.my/nursing.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Nursing (Honours)'
  UNION ALL
  SELECT programme_id, 4, 84850, 114000, 'Sungai Long', 'MK FMHS', 'https://study.utar.edu.my/physiotherapy.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Physiotherapy (Honours)'
  UNION ALL
  SELECT programme_id, 3, 63600, 88200, 'Kampar', 'FSc', 'https://study.utar.edu.my/agricultural-science.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Science (Honours) Agricultural Science'
  UNION ALL
  SELECT programme_id, 3, 63600, 88200, 'Kampar', 'FSc', 'https://study.utar.edu.my/biochemistry.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Science (Honours) Biochemistry'
  UNION ALL
  SELECT programme_id, 3.5, 66300, 90900, 'Kampar', 'FSc', 'https://study.utar.edu.my/biomedical-science.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Science (Honours) Biomedical Science'
  UNION ALL
  SELECT programme_id, 3, 63650, 88250, 'Kampar', 'FSc', 'https://study.utar.edu.my/biotechnology.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Science (Honours) Biotechnology'
  UNION ALL
  SELECT programme_id, 3, 63650, 87850, 'Kampar', 'FSc', 'https://study.utar.edu.my/chemistry.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Science (Honours) Chemistry'
  UNION ALL
  SELECT programme_id, 4, 72200, 98750, 'Kampar', 'FSc', 'https://study.utar.edu.my/dietetics.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Science (Honours) Dietetics'
  UNION ALL
  SELECT programme_id, 3.5, 64300, 88550, 'Kampar', 'FEGT', 'https://study.utar.edu.my/OSHEH.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Science (Honours) Occupational Safety and Health with Environmental Health'
  UNION ALL
  SELECT programme_id, 3, 63600, 88200, 'Kampar', 'FSc', 'https://study.utar.edu.my/food-science.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Science (Honours) Food Science'
  UNION ALL
  SELECT programme_id, 3, 58500, 82050, 'Kampar', 'FICT', 'https://study.utar.edu.my/computer-science.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Computer Science (Honours)'
  UNION ALL
  SELECT programme_id, 3, 58400, 81950, 'Kampar', 'FICT', 'https://study.utar.edu.my/business-information-system.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Information Systems (Honours) Business Information Systems'
  UNION ALL
  SELECT programme_id, 3, 57250, 80400, 'Kampar', 'FICT', 'https://study.utar.edu.my/digital-economy-technology.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Information Systems (Honours) Digital Economy Technology'
  UNION ALL
  SELECT programme_id, 3, 58450, 81950, 'Kampar', 'FICT', 'https://study.utar.edu.my/information-systems-engineering.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Information Systems (Honours) Information Systems Engineering'
  UNION ALL
  SELECT programme_id, 3, 58050, 81450, 'Kampar', 'FICT', 'https://study.utar.edu.my/communications-networking.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Information Technology (Honours) Communications and Networking'
  UNION ALL
  SELECT programme_id, 3, 58500, 82050, 'Kampar', 'FICT', 'https://study.utar.edu.my/computer-engineering.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Information Technology (Honours) Computer Engineering'
  UNION ALL
  SELECT programme_id, 3, 58050, 81450, 'Kampar', 'FICT', 'https://study.utar.edu.my/industrial-intelligent-systems.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Information Technology (Honours) Industrial Intelligent Systems'
  UNION ALL
  SELECT programme_id, 3, 58900, 82500, 'Sungai Long', 'LKC FES', 'https://study.utar.edu.my/actuarial-science.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Science (Honours) Actuarial Science'
  UNION ALL
  SELECT programme_id, 3, 59450, 83250, 'Sungai Long', 'LKC FES', 'https://study.utar.edu.my/applied-math-computing.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Science (Honours) Applied Mathematics with Computing'
  UNION ALL
  SELECT programme_id, 3, 58700, 82250, 'Sungai Long', 'LKC FES', 'https://study.utar.edu.my/financial-math.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Science (Honours) Financial Mathematics'
  UNION ALL
  SELECT programme_id, 3, 56900, 80050, 'Sungai Long', 'LKC FES', 'https://study.utar.edu.my/software-engineering.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Software Engineering (Honours)'
  UNION ALL
  SELECT programme_id, 3, 56900, 80050, 'Sungai Long', 'LKC FES', 'https://study.utar.edu.my/SE_2u2i.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Software Engineering (Honours) 2u2i'
  UNION ALL
  SELECT programme_id, 4, 71800, 98550, 'Sungai Long', 'LKC FES', 'https://study.utar.edu.my/biomedical-engineering.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Biomedical Engineering with Honours'
  UNION ALL
  SELECT programme_id, 3, 55500, 78150, 'Sungai Long', 'FAM', 'https://study.utar.edu.my/building-property-management.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Building and Property Management (Honours)'
  UNION ALL
  SELECT programme_id, 4, 71800, 98550, 'Sungai Long', 'LKC FES', 'https://study.utar.edu.my/chemical-engineering.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Chemical Engineering (Process) with Honours'
  UNION ALL
  SELECT programme_id, 4, 72100, 98650, 'Kampar', 'FEGT', 'https://study.utar.edu.my/petrochemical-engineering.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Chemical Engineering (Petrochemical) with Honours'
  UNION ALL
  SELECT programme_id, 4, 71800, 98550, 'Sungai Long', 'LKC FES', 'https://study.utar.edu.my/civil-engineering.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Civil Engineering with Honours'
  UNION ALL
  SELECT programme_id, 4, 72100, 98650, 'Kampar', 'FEGT', 'https://study.utar.edu.my/environmental-engineering.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Civil Engineering (Environmental) with Honours'
  UNION ALL
  SELECT programme_id, 4, 71600, 98300, 'Sungai Long', 'LKC FES', 'https://study.utar.edu.my/electrical-electronic-engineering.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Electrical and Electronic Engineering with Honours'
  UNION ALL
  SELECT programme_id, 4, 71950, 98500, 'Kampar', 'FEGT', 'https://study.utar.edu.my/electronic-engineering.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Electronics Engineering with Honours'
  UNION ALL
  SELECT programme_id, 4, 71700, 98150, 'Kampar', 'FEGT', 'https://study.utar.edu.my/industrial-engineering.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Engineering (Honours) Industrial Engineering'
  UNION ALL
  SELECT programme_id, 4, 71800, 98550, 'Sungai Long', 'LKC FES', 'https://study.utar.edu.my/materials-engineering.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Materials Engineering with Honours'
  UNION ALL
  SELECT programme_id, 4, 71800, 98550, 'Sungai Long', 'LKC FES', 'https://study.utar.edu.my/mechanical-engineering.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Mechanical Engineering with Honours'
  UNION ALL
  SELECT programme_id, 4, 71800, 98550, 'Sungai Long', 'LKC FES', 'https://study.utar.edu.my/mechatronics-engineering.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Mechatronics Engineering with Honours'
  UNION ALL
  SELECT programme_id, 4, 71600, 98300, 'Sungai Long', 'LKC FES', 'https://study.utar.edu.my/telecommunications-engineering.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Telecommunication Engineering with Honours'
  UNION ALL
  SELECT programme_id, 3, 59850, 83700, 'Kampar', 'FEGT', 'https://study.utar.edu.my/electronic-systems.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Technology (Honours) in Electronic Systems'
  UNION ALL
  SELECT programme_id, 3, 63600, 85100, 'Sungai Long', 'LKC FES', 'https://study.utar.edu.my/architecture.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Science (Honours) Architecture'
  UNION ALL
  SELECT programme_id, 3, 62000, 83700, 'Sungai Long', 'LKC FES', 'https://study.utar.edu.my/physics.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Science (Honours) Physics'
  UNION ALL
  SELECT programme_id, 4, 65200, 90400, 'Sungai Long', 'LKC FES', 'https://study.utar.edu.my/quantity-surveying.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Science in Quantity Surveying with Honours'
  UNION ALL
  SELECT programme_id, 3, 63700, 88350, 'Kampar', 'FEGT', 'https://study.utar.edu.my/construction-management.php', '2026-11-16' FROM programmes WHERE name = 'Bachelor of Technology (Honours) Construction Management';

-- Foundation / Matriculation / Diploma share the CGPA tiers (matriculation is entered as 'foundation').
INSERT INTO scholarship_tiers (study_level, qualification, result_type, min_value, max_value, waiver_percent, conditions, source_url, last_checked) VALUES
  ('foundation', 'spm', 'count_a', 8, NULL, 100, 'a_plus_a_only', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16'),
  ('foundation', 'spm', 'count_a', 8, NULL, 50, '', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16'),
  ('foundation', 'spm', 'count_a', 7, NULL, 25, '', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16'),
  ('foundation', 'spm', 'count_a', 6, NULL, 20, '', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16'),
  ('foundation', 'spm', 'count_a', 5, NULL, 15, '', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16'),
  ('foundation', 'olevel', 'count_a', 8, NULL, 100, '', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16'),
  ('foundation', 'olevel', 'count_a', 7, NULL, 50, '', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16'),
  ('foundation', 'olevel', 'count_a', 6, NULL, 25, '', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16'),
  ('foundation', 'olevel', 'count_a', 5, NULL, 20, '', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16'),
  ('foundation', 'olevel', 'count_a', 4, NULL, 15, '', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16'),
  ('bachelor', 'stpm', 'count_a', 3, NULL, 100, '', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16'),
  ('bachelor', 'stpm', 'count_a', 2, NULL, 50, '', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16'),
  ('bachelor', 'stpm', 'count_a', 1, NULL, 25, '', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16'),
  ('bachelor', 'alevel', 'count_a', 3, NULL, 100, '', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16'),
  ('bachelor', 'alevel', 'count_a', 2, NULL, 50, '', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16'),
  ('bachelor', 'alevel', 'count_a', 1, NULL, 25, '', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16'),
  ('bachelor', 'uec', 'count_a', 8, NULL, 100, '', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16'),
  ('bachelor', 'uec', 'count_a', 7, NULL, 50, '', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16'),
  ('bachelor', 'uec', 'count_a', 6, NULL, 25, '', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16'),
  ('bachelor', 'uec', 'count_a', 5, NULL, 20, '', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16'),
  ('bachelor', 'uec', 'count_a', 4, NULL, 10, '', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16'),
  ('bachelor', 'foundation', 'cgpa', 3.9000, NULL, 100, 'straight_passes', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16'),
  ('bachelor', 'foundation', 'cgpa', 3.8000, 3.8999, 50, 'straight_passes', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16'),
  ('bachelor', 'diploma', 'cgpa', 3.9000, NULL, 100, 'straight_passes', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16'),
  ('bachelor', 'diploma', 'cgpa', 3.8000, 3.8999, 50, 'straight_passes', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16');

-- Internal scholarships (except those UTAR marks *) open in week 1-2 of each intake; loans in week 1-4.
INSERT INTO scholarships (code, name, kind, for_foundation, for_bachelor, applies_by, source_url, last_checked, sort_order) VALUES
  ('care', 'UTAR Care Scholarships', 'scholarship', 1, 0, 'apply_week_1_2', 'https://dsfa.utar.edu.my/UTAR-Care-Scholarships.php', '2026-11-16', 1),
  ('sports', 'UTAR Sports Scholarship', 'scholarship', 1, 1, 'apply_week_1_2', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16', 2),
  ('talent', 'UTAR Talent Scholarship', 'scholarship', 1, 1, 'apply_week_1_2', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16', 3),
  ('uec', 'UTAR-UEC Scholarship', 'scholarship', 0, 1, 'see_page', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16', 4),
  ('uec_cis', 'UTAR-UEC Scholarship for CIS Teacher Project Programme', 'scholarship', 0, 1, 'see_page', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16', 5),
  ('nursing', 'UTAR Nursing Scholarship (Degree)', 'scholarship', 0, 1, 'apply_week_1_2', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16', 6),
  ('star', 'The Star Education Fund', 'scholarship', 0, 1, 'see_page', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16', 7),
  ('sinchew', 'Sin Chew Daily Education Fund Scholarship', 'scholarship', 0, 1, 'see_page', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16', 8),
  ('he_group', 'HE Group-UTAR Care Scholarships', 'scholarship', 1, 1, 'see_page', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16', 9),
  ('lgt', 'Tan Sri (Dr) Lim Goh Tong - UTAR Scholarship Fund', 'scholarship', 1, 1, 'apply_week_1_2', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16', 10),
  ('lee', 'UTAR-Lee Foundation Scholarship', 'scholarship', 0, 1, 'apply_week_1_2', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16', 11),
  ('ng', 'Mr. Ng Chin Kiat S.M.J. Scholarship', 'scholarship', 0, 1, 'apply_week_1_2', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16', 12),
  ('msp', 'Muhibbah Students Program (MSP)', 'scholarship', 0, 1, 'apply_week_1_2', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16', 13),
  ('relief', 'UTAR Relief Financial Aid', 'aid', 1, 1, 'see_page', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16', 14),
  ('loan', 'UTAR Student Loan', 'aid', 1, 1, 'apply_week_1_4', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16', 15),
  ('bridging', 'UTAR Student Bridging Loan', 'aid', 1, 1, 'apply_week_1_4', 'https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php', '2026-11-16', 16);
