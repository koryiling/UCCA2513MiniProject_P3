# UTAR Admission Assistant (UCCA2513 Mini Project)

A website and rule-based chatbot that helps students find UTAR admission information.

- **Frontend:** HTML, CSS, JavaScript (`site/`)
- **Backend:** Node.js with Express (`server/`)
- **Database:** MySQL 8 (`database/`)
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
| `npm run dev` | Frontend-only preview with Vite (the chatbot will not answer, because there is no backend) |

## Project structure

```
site/        Website pages, CSS, JavaScript, images
  js/i18n.js   All Chinese and Malay translations
server/      Node.js backend (server.js, db.js, chatbot.js, setup-db.js)
database/    schema.sql (tables) and seed.sql (chatbot questions and answers)
wireframe/   Low-fidelity wireframe
```

## How the chatbot works

1. The browser sends the question and the current language to `POST /api/chat`.
2. The backend checks the message against the keywords in `chat_keywords`.
   If several question types match, the one with the highest `priority` wins.
3. It returns the answer from `chat_responses` in that language and records the question in `chat_logs`.

**To add or change an answer:** edit `database/seed.sql`, then run `npm run db:setup`.
Questions the chatbot could not answer are saved in `chat_logs` with `intent_code = 'fallback'`:

```sql
SELECT user_message, lang, created_at FROM chat_logs WHERE intent_code = 'fallback' ORDER BY created_at DESC;
```
