-- UTAR Admission Assistant - database schema (MySQL 8)
-- Run this first, then seed.sql. Safe to run again: tables are only created if missing.
-- The database itself is created once by an admin (see README.md):
--   CREATE DATABASE utar_admission CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE utar_admission;

-- Student accounts (passwords are stored as salted scrypt hashes, never as plain text; see server/auth.js)
CREATE TABLE IF NOT EXISTS users (
  user_id        INT AUTO_INCREMENT PRIMARY KEY,
  full_name      VARCHAR(100) NOT NULL,
  email          VARCHAR(255) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Chatbot: one row per type of question the chatbot understands (e.g. "fees", "intake_dates").
-- When a message matches keywords of several intents, the one with the highest priority wins
-- (specific topics such as "scholarship" have a higher priority than general ones such as "apply");
-- on a tie, the intent with more matching keywords wins.
CREATE TABLE IF NOT EXISTS chat_intents (
  intent_id    INT PRIMARY KEY,
  intent_code  VARCHAR(50)  NOT NULL UNIQUE,
  description  VARCHAR(255) NOT NULL,
  priority     INT NOT NULL DEFAULT 0
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Chatbot: words or phrases that point to an intent, in English (en), Chinese (zh) or Malay (ms)
CREATE TABLE IF NOT EXISTS chat_keywords (
  keyword_id  INT AUTO_INCREMENT PRIMARY KEY,
  intent_id   INT NOT NULL,
  lang        ENUM('en', 'zh', 'ms') NOT NULL,
  keyword     VARCHAR(100) NOT NULL,
  UNIQUE KEY uq_keyword (intent_id, lang, keyword),
  CONSTRAINT fk_keyword_intent FOREIGN KEY (intent_id) REFERENCES chat_intents (intent_id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Chatbot: the answer for each intent in each language (may contain simple HTML links)
CREATE TABLE IF NOT EXISTS chat_responses (
  response_id    INT AUTO_INCREMENT PRIMARY KEY,
  intent_id      INT NOT NULL,
  lang           ENUM('en', 'zh', 'ms') NOT NULL,
  response_text  TEXT NOT NULL,
  UNIQUE KEY uq_response (intent_id, lang),
  CONSTRAINT fk_response_intent FOREIGN KEY (intent_id) REFERENCES chat_intents (intent_id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Chatbot: every question asked, the matching intent ('fallback' = not understood by the rules)
-- and who answered it (source: 'ai' = AI model, 'rules' = rule-based backup).
-- Useful for finding questions the chatbot cannot answer yet.
CREATE TABLE IF NOT EXISTS chat_logs (
  log_id        INT AUTO_INCREMENT PRIMARY KEY,
  lang          ENUM('en', 'zh', 'ms') NOT NULL,
  user_message  VARCHAR(500) NOT NULL,
  intent_code   VARCHAR(50)  NOT NULL,
  source        ENUM('ai', 'rules') NOT NULL DEFAULT 'rules',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Admission tools (Requirement Explainer, Eligibility Checker, Pathway Recommendation).
-- Programmes with the same minimum entry requirements share one requirement group.
-- english_rule and the rules in entry_requirements are rule codes defined in server/eligibility.js.
CREATE TABLE IF NOT EXISTS requirement_groups (
  group_code        VARCHAR(20)  PRIMARY KEY,
  level             ENUM('foundation', 'bachelor') NOT NULL,
  english_rule      VARCHAR(30)  NOT NULL,
  foundation_group  VARCHAR(20)  NULL,          -- for SPM / O-Level students: the Foundation programme that leads here
  source_url        VARCHAR(255) NOT NULL,      -- official UTAR page the requirements were taken from
  sort_order        INT NOT NULL DEFAULT 0
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS programmes (
  programme_id  INT AUTO_INCREMENT PRIMARY KEY,
  group_code    VARCHAR(20)  NOT NULL,
  name          VARCHAR(200) NOT NULL UNIQUE,   -- official programme name (kept in English)
  sort_order    INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_programme_group FOREIGN KEY (group_code) REFERENCES requirement_groups (group_code) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- One row per accepted qualification. For Foundation and Diploma holders the requirement can depend on
-- the field of study (study_field); NULL means any field.
--   Grade-based qualifications: at least min_subjects subjects with grade min_grade or better.
--   CGPA-based qualifications:  CGPA of min_cgpa or more; from review_cgpa the faculty may still admit
--                               after an internal evaluation.
--   rules: extra conditions, comma-separated (e.g. 'math_credit_mec,physics_pass').
CREATE TABLE IF NOT EXISTS entry_requirements (
  requirement_id  INT AUTO_INCREMENT PRIMARY KEY,
  group_code      VARCHAR(20) NOT NULL,
  qualification   ENUM('spm', 'olevel', 'uec', 'stpm', 'alevel', 'foundation', 'diploma') NOT NULL,
  study_field     ENUM('science', 'computing', 'business', 'arts') NULL,
  min_grade       VARCHAR(3)   NULL,
  min_subjects    TINYINT      NULL,
  min_cgpa        DECIMAL(3,2) NULL,
  review_cgpa     DECIMAL(3,2) NULL,
  rules           VARCHAR(255) NOT NULL DEFAULT '',
  CONSTRAINT fk_requirement_group FOREIGN KEY (group_code) REFERENCES requirement_groups (group_code) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Login sessions. The browser keeps a random token in a cookie; only its SHA-256 hash is stored here.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash  CHAR(64)  PRIMARY KEY,
  user_id     INT       NOT NULL,
  expires_at  DATETIME  NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Application tools ------------------------------------------------------------------------------

-- The student's situation, used to build their document checklist and reminders
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id          INT PRIMARY KEY,
  nationality      ENUM('malaysian', 'international') NOT NULL,
  qualification    ENUM('school', 'preu', 'foundation', 'diploma', 'degree') NOT NULL,
  programme_type   ENUM('general', 'mbbs', 'nursing', 'architecture', 'art') NOT NULL,
  english_test     TINYINT(1) NOT NULL DEFAULT 0,   -- has a MUET / IELTS / TOEFL / ... result
  credit_transfer  TINYINT(1) NOT NULL DEFAULT 0,   -- wants credit transfer for earlier studies
  target_intake    VARCHAR(20) NULL,                -- date_code from important_dates, e.g. 'jan2027'
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Personalized Document Checklist: every possible document, and when it applies (condition codes in server/application.js)
CREATE TABLE IF NOT EXISTS checklist_items (
  item_code   VARCHAR(40) PRIMARY KEY,
  phase       ENUM('apply', 'orientation') NOT NULL,
  applies_to  VARCHAR(40) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS checklist_progress (
  user_id     INT NOT NULL,
  item_code   VARCHAR(40) NOT NULL,
  checked_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, item_code),
  CONSTRAINT fk_checklist_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_checklist_item FOREIGN KEY (item_code) REFERENCES checklist_items (item_code) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Application Journey Tracker: the stages, and the date the student marked each one as done
CREATE TABLE IF NOT EXISTS journey_stages (
  stage_code  VARCHAR(30) PRIMARY KEY,
  sort_order  INT NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS journey_progress (
  user_id     INT NOT NULL,
  stage_code  VARCHAR(30) NOT NULL,
  done_on     DATE NOT NULL,
  PRIMARY KEY (user_id, stage_code),
  CONSTRAINT fk_journey_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_journey_stage FOREIGN KEY (stage_code) REFERENCES journey_stages (stage_code) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Application Date & Reminder: official intake dates (event_date NULL = not announced yet)
CREATE TABLE IF NOT EXISTS important_dates (
  date_code   VARCHAR(20) PRIMARY KEY,
  applies_to  VARCHAR(100) NOT NULL,   -- which programmes, as a translation key suffix (e.g. 'general')
  event_date  DATE NULL,
  sort_order  INT NOT NULL DEFAULT 0
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- The student's own reminders, e.g. "Pay fees in Student Bill"
CREATE TABLE IF NOT EXISTS user_reminders (
  reminder_id  INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  title        VARCHAR(120) NOT NULL,
  due_date     DATE NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reminder_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
