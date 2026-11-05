-- UTAR Admission Assistant - database schema (MySQL 8)
-- Run this first, then seed.sql. Safe to run again: tables are only created if missing.
-- The database itself is created once by an admin (see README.md):
--   CREATE DATABASE utar_admission CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE utar_admission;

-- Student accounts (passwords are stored as bcrypt hashes, never as plain text)
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

-- Chatbot: every question asked and which intent answered it ('fallback' = not understood).
-- Useful for finding questions the chatbot cannot answer yet.
CREATE TABLE IF NOT EXISTS chat_logs (
  log_id        INT AUTO_INCREMENT PRIMARY KEY,
  lang          ENUM('en', 'zh', 'ms') NOT NULL,
  user_message  VARCHAR(500) NOT NULL,
  intent_code   VARCHAR(50)  NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
