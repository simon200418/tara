import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// export const pool = new Pool({
//   host: process.env.DB_HOST || "localhost",
//   port: Number(process.env.DB_PORT) || 5432,
//   user: process.env.DB_USER || "postgres",
//   password: process.env.DB_PASSWORD || "1234",
//   database: process.env.DB_NAME || "provue_tara",
// });


export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function initDB() {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        date DATE NOT NULL,
        merchant TEXT NOT NULL,
        normalized_merchant TEXT NOT NULL,
        category TEXT,
        amount NUMERIC(12,2) NOT NULL,
        currency TEXT DEFAULT 'INR',
        memo TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS funds (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS fund_navs (
        fund_id TEXT NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        nav NUMERIC(12,4) NOT NULL,
        PRIMARY KEY (fund_id, date)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS holdings (
        id SERIAL PRIMARY KEY,
        fund_id TEXT NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
        fund_name TEXT,
        units NUMERIC(12,4) NOT NULL,
        purchase_date DATE,
        purchase_nav NUMERIC(12,4)
      );
    `);

    // Helpful indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_date
      ON transactions(date);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_merchant
      ON transactions(normalized_merchant);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_category
      ON transactions(category);
    `);

    console.log("✅ Database initialized");
  } finally {
    client.release();
  }
}