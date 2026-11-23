# UTAR Admission Assistant (UCCA2513 Mini Project)

A website and AI chatbot (with a rule-based backup) that helps students find UTAR admission information.

- **Frontend:** HTML, CSS, JavaScript (`site/`)
- **Backend:** Node.js with Express (`server/`)
- **Database:** MySQL 8 (`database/`)
- **AI:** any OpenAI-compatible AI API (e.g. Google Gemini, Groq or Ollama), with a rule-based backup
- **Languages:** English, Chinese, Malay

## First-time setup

1. **Install** [Node.js](https://nodejs.org/) and MySQL 8 (MySQL Installer: MySQL Server + Workbench).
2. **Create the database and app user.** In MySQL Workbench, log in as `root` and run (choose your own password):
   ```sql
   CREATE DATABASE IF NOT EXISTS utar_admission CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'utar_app'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON utar_admission.* TO 'utar_app'@'localhost';
   ```
3. **Create your settings file.** Copy `server/.env.example` to `server/.env` and set `DB_PASSWORD` to the password above.
   `server/.env` is not uploaded to GitHub, so never put your password in `.env.example`.
4. **Install packages:** `npm install`
5. **Create the tables and load the chatbot data:** `npm run db:setup`
6. **Start the website:** `npm start`, then open <http://localhost:3000>

## Commands

| Command | What it does |
|---|---|
| `npm start` | Runs the website and API at http://localhost:3000 (chatbot works) |
| `npm run db:setup` | Creates the tables and reloads the chatbot data (safe to run again) |
| `npm run dev` | Frontend preview with Vite; chat requests go to the backend, so run `npm start` too |
| `npm test` | Runs the tests for the fees and scholarship logic (no database needed) |

## Project structure

```
site/        Website pages, CSS, JavaScript, images
  js/i18n.js   All Chinese and Malay translations
server/      Node.js backend (server.js, db.js, chatbot.js, ai.js, setup-db.js, ai-instructions.md)
knowledge/   UTAR information files the AI reads
database/    schema.sql (tables), seed.sql (chatbot), programmes.sql (entry requirements), application.sql (checklist items, journey steps, intake dates),
             finance.sql (programme fees, scholarship tiers, other scholarships)
test/        Automated tests (npm test)
```

## Admission tools

Three pages, open to everyone (linked from the Admission page):

| Page | Tool |
|---|---|
| `explainer.html` | Admission Requirement Explainer: a programme's minimum entry requirements in simple points |
| `eligibility.html` | Smart Eligibility Checker: indicative result for one programme from the student's grades or CGPA |
| `pathway.html` | Alternative Pathway Recommendation: every programme the student may enter, plus the Foundation route |

- **Data:** `database/programmes.sql` (tables `requirement_groups`, `programmes`, `entry_requirements`), taken from UTAR's official
  Minimum Entry Requirements documents: the 76 Bachelor's degrees offered on this website (Foundation in Science / Arts are kept
  only as the route for SPM / O-Level students). After editing, run `npm run db:setup`.
- **Logic:** `server/eligibility.js` (grade scales, questions and rule codes such as `math_credit_mec`), API `GET /api/admission-data`,
  `POST /api/eligibility`, `POST /api/pathways`.
- **Page code and text:** `site/js/admission-tools.js` and `site/js/i18n-tools.js` (English, Chinese, Malay).
- Results are guidance only; nothing the student enters is saved on the server.

## Fees and scholarships in the chatbot (Tuition Fees & Scholarship Information module)

Scholarship checks and cost estimates are answered by the **chatbot**, e.g.:
"I got 2As in STPM, how much is Software Engineering?" -> 50% Top Achievers waiver, RM28,450 in total (RM9,483 per year).
The student can give the details one at a time ("How much is Computer Science?" ... "I got 3As in STPM" ... "I'm international"),
and the chatbot asks for anything missing (qualification, number of As or CGPA, programme, Malaysian or international).

- **Logic:** `server/finance.js`: Message Parser (programme, qualification, result, student type, in English, Chinese or Malay),
  Scholarship Matcher (UTAR Scholarship for Top Achievers tier and what is missing for the next one) and Cost Estimator
  (total, per year, per trimester, 6% SST for international students, comparison of two programmes).
  `chatbot.js` calls `finance.forChat()` with the conversation; the figures go to the AI, which must use those exact numbers.
  If no AI answers, the rule-based reply shows the same figures in English, Chinese or Malay.
- **Data:** `database/finance.sql` (tables `programme_fees`, `scholarship_tiers`, `scholarships`). Fees come from each programme's page on
  https://study.utar.edu.my and the tiers from the DSFA page, all checked 16 November 2026. `programme_fees` is linked to `programmes`
  by the programme name, so both modules use the same 76 programmes. Fees change every intake: update the numbers and the
  `last_checked` dates, then run `npm run db:setup`.
- **Pages:** `fees.html` (fee table of all 76 programmes) and `scholarship.html` (Top Achievers tiers, other scholarships and aid)
  are reference pages with example questions that open the chatbot. They use `GET /api/finance-data`, `site/js/finance-tools.js`
  and `site/js/i18n-finance.js`.
- **Tests:** `test/finance.test.js`, 31 tests including multi-message conversations (`npm test`, no database needed).
- Every figure shows its official source and last checked date. All amounts are estimates; nothing the student enters is saved.

## Accounts and application tools

Students sign up and log in on `login.html` (one page with a sliding sign-in / sign-up panel; `signup.html` redirects to it).
Only the Application section needs an account.

- **Accounts:** `server/auth.js`, API `/api/auth/signup`, `/login`, `/logout`, `/me`. Passwords are stored as salted scrypt hashes;
  the login session is a random token in an HttpOnly cookie, and only its SHA-256 hash is stored (table `sessions`).
  "Remember me" keeps the student logged in for 30 days, otherwise until the browser is closed (at most 1 day).
- **Tools** (login required, `server/application.js`, API under `/api/app/...`):

| Page | Tool | Saved in |
|---|---|---|
| `checklist.html` | Personalized Document Checklist, from UTAR's Application Checklist | `user_profiles`, `checklist_progress` |
| `tracker.html` | Application Journey Tracker, 8 steps from exploring to orientation | `journey_progress` |
| `dates.html` | Application Date & Reminder: intakes, countdowns, own reminders, calendar (.ics) download | `user_reminders` |

- `application.html` shows a "My progress" summary (`GET /api/app/dashboard`).
- Checklist items, journey steps and intake dates are in `database/application.sql`; their text is in `site/js/i18n-app.js`.
- The tools are the student's own records and are not connected to UTAR's official application system.

## How the chatbot works

The chatbot is an **AI chatbot with a rule-based backup**.

1. The browser sends the question, the current language and the last few messages to `POST /api/chat`.
2. **AI answer (if configured):** the backend sends the question to an AI model together with
   - `server/ai-instructions.md`: the assistant's role and rules (tone, topics, "never guess facts"), and
   - every `.md` / `.txt` file in `knowledge/`: the UTAR information the AI is allowed to use.
   - the text of the website page the student is on, plus pages related to the question
     (e.g. `fees.html` for fee questions). Pages already covered by `knowledge/` are not sent again
     (see `INTENT_PAGES` and `NO_INFO_PAGES` in `server/ai.js`), because free AI plans limit how much text can be sent per minute.
3. **Backup:** if no AI is set up, or the AI fails, the backend answers from the keywords and answers in MySQL
   (`chat_keywords`, `chat_responses`). If several question types match, the one with the highest `priority` wins.
4. Every question is saved in `chat_logs`, with `source` = `ai` or `rules`.

### Set up the AI (free options)

Fill in `AI_BASE_URL`, `AI_API_KEY` and `AI_MODEL` in `server/.env`, then restart with `npm start`.
Any provider with an OpenAI-compatible API works, so you can switch provider by editing `.env` only.
`server/.env.example` has ready-made settings for Google Gemini, Groq and Ollama.
Check http://localhost:3000/api/health to see which AI model is active.

### Customize the chatbot

- **Change how it behaves:** edit `server/ai-instructions.md` (takes effect on the next question, no restart needed).
- **Teach it new information:** add or edit files in `knowledge/`, e.g. `knowledge/fees.md`. Only put in facts from official UTAR sources.
- **Change the backup answers:** edit `database/seed.sql`, then run `npm run db:setup`.

Questions the rule-based backup could not match are saved with `intent_code = 'fallback'`:

```sql
SELECT user_message, lang, source, created_at FROM chat_logs WHERE intent_code = 'fallback' ORDER BY created_at DESC;
```
