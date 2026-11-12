// MySQL connection pool, shared by the whole backend.
// Settings come from server/.env (see server/.env.example).
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "utar_admission",
  charset: "utf8mb4",
  dateStrings: true, // DATE columns come back as "YYYY-MM-DD" text, not time-zone-shifted Date objects
  connectionLimit: 10,
});

module.exports = pool;
