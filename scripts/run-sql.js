#!/usr/bin/env node
/**
 * Run a SQL file or inline SQL against the database.
 * Uses DATABASE_URL from .env (project root).
 *
 * Usage:
 *   node scripts/run-sql.js <path-to.sql>
 *   node scripts/run-sql.js --inline "SELECT 1"
 */
import dotenv from "dotenv";
import pg from "pg";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env from project root (parent of scripts/)
const root = resolve(process.cwd());
dotenv.config({ path: resolve(root, ".env") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const args = process.argv.slice(2);
let sql;
if (args[0] === "--inline" && args[1]) {
  sql = args[1];
} else if (args[0]) {
  const filePath = resolve(process.cwd(), args[0]);
  sql = readFileSync(filePath, "utf8");
} else {
  console.error("Usage: node scripts/run-sql.js <file.sql> | node scripts/run-sql.js --inline \"SQL\"");
  process.exit(1);
}

const client = new pg.Client({ connectionString });
try {
  await client.connect();
  const result = await client.query(sql);
  if (result.rows && result.rows.length > 0) {
    console.log(JSON.stringify(result.rows, null, 2));
  } else {
    console.log("SQL executed successfully.");
  }
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
} finally {
  await client.end();
}
