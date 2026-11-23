// Creates the tables and loads the chatbot and programme data:  npm run db:setup
// Runs database/schema.sql, seed.sql, programmes.sql, application.sql and finance.sql using the settings in server/.env.
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

  for (const file of ["schema.sql", "seed.sql", "programmes.sql", "application.sql", "finance.sql"]) {
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
  const [[programmes]] = await conn.query(
    `SELECT (SELECT COUNT(*) FROM programmes) AS programmes, (SELECT COUNT(*) FROM entry_requirements) AS requirements`
  );
  console.log(`Programme data loaded: ${programmes.programmes} programmes, ${programmes.requirements} entry requirements`);
  const [[app]] = await conn.query(
    `SELECT (SELECT COUNT(*) FROM checklist_items) AS items, (SELECT COUNT(*) FROM journey_stages) AS stages,
            (SELECT COUNT(*) FROM important_dates) AS dates`
  );
  console.log(`Application tools data loaded: ${app.items} checklist items, ${app.stages} journey stages, ${app.dates} dates`);
  const [[finance]] = await conn.query(
    `SELECT (SELECT COUNT(*) FROM programme_fees) AS fees, (SELECT COUNT(*) FROM scholarship_tiers) AS tiers,
            (SELECT COUNT(*) FROM scholarships) AS scholarships`
  );
  console.log(`Fees and scholarships loaded: ${finance.fees} programme fees, ${finance.tiers} scholarship tiers, ${finance.scholarships} other scholarships`);
  await conn.end();
}

main().catch(err => {
  console.error("Database setup failed:", err.code || "", err.message);
  process.exit(1);
});
