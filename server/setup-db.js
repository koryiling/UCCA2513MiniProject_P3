// Creates the tables and loads the chatbot data:  npm run db:setup
// Runs database/schema.sql and then database/seed.sql using the settings in server/.env.
// The database and the utar_app user must already exist (see README.md).
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });
const mysql = require("mysql2/promise");

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "utar_admission",
    charset: "utf8mb4",
    multipleStatements: true,
  });

  for (const file of ["schema.sql", "seed.sql"]) {
    const sql = fs.readFileSync(path.join(__dirname, "..", "database", file), "utf8");
    await conn.query(sql);
    console.log(`Ran database/${file}`);
  }

  // Upgrade older databases: chat_logs.source was added later
  const [cols] = await conn.query(
    "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_logs' AND COLUMN_NAME = 'source'"
  );
  if (!cols.length) {
    await conn.query("ALTER TABLE chat_logs ADD COLUMN source ENUM('ai', 'rules') NOT NULL DEFAULT 'rules' AFTER intent_code");
    console.log("Added chat_logs.source column");
  }

  const [[counts]] = await conn.query(
    `SELECT (SELECT COUNT(*) FROM chat_intents)   AS intents,
            (SELECT COUNT(*) FROM chat_keywords)  AS keywords,
            (SELECT COUNT(*) FROM chat_responses) AS responses`
  );
  console.log(`Chatbot data loaded: ${counts.intents} intents, ${counts.keywords} keywords, ${counts.responses} responses`);
  await conn.end();
}

main().catch(err => {
  console.error("Database setup failed:", err.code || "", err.message);
  process.exit(1);
});
