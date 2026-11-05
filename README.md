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

## Project structure

```
site/        Website pages, CSS, JavaScript, images
  js/i18n.js   All Chinese and Malay translations
server/      Node.js backend (server.js, db.js, chatbot.js, ai.js, setup-db.js, ai-instructions.md)
knowledge/   UTAR information files the AI reads
database/    schema.sql (tables) and seed.sql (chatbot questions and answers)
wireframe/   Low-fidelity wireframe
```

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
