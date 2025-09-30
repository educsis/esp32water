import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const db = drizzle(pool);

// Function to ensure table exists
async function ensureTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS water_levels (
      id SERIAL PRIMARY KEY,
      level INT NOT NULL,
      timestamp TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function handler(event, context) {
  try {
    await ensureTable(); // Make sure table exists

    if(event.httpMethod === "POST"){
      const data = JSON.parse(event.body);
      const level = parseInt(data.level);

      await db.execute('INSERT INTO water_levels(level) VALUES($1)', [level]);

      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Data saved", level })
      };
    }

    if(event.httpMethod === "GET"){
      const result = await db.execute(`
        SELECT * FROM water_levels ORDER BY timestamp DESC LIMIT 10
      `);

      return {
        statusCode: 200,
        body: JSON.stringify({ records: result.rows })
      };
    }

    return { statusCode: 405, body: "Method Not Allowed" };
  } catch(err){
    console.error(err);
    return { statusCode: 500, body: "Server Error" };
  }
}
