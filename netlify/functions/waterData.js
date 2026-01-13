import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize SQLite database
const dbPath = join(__dirname, '../../water_levels.db');
let db;

function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
      } else {
        console.log('Connected to SQLite database');
        // Create table if it doesn't exist
        db.run(`
          CREATE TABLE IF NOT EXISTS water_levels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            level REAL NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            received_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            console.error('Error creating table:', err);
            reject(err);
          } else {
            console.log('Water levels table ready');
            resolve();
          }
        });
      }
    });
  });
}

function insertWaterLevel(level) {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    db.run(
      'INSERT INTO water_levels (level, timestamp, received_at) VALUES (?, ?, ?)',
      [level, now, now],
      function(err) {
        if (err) {
          console.error('Error inserting data:', err);
          reject(err);
        } else {
          console.log(`Water level ${level} saved with ID: ${this.lastID}`);
          resolve(this.lastID);
        }
      }
    );
  });
}

function getLatestWaterLevel() {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM water_levels ORDER BY timestamp DESC LIMIT 1',
      (err, row) => {
        if (err) {
          console.error('Error getting latest data:', err);
          reject(err);
        } else {
          resolve(row);
        }
      }
    );
  });
}

function getAllWaterLevels(limit = 100) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM water_levels ORDER BY timestamp DESC LIMIT ?',
      [limit],
      (err, rows) => {
        if (err) {
          console.error('Error getting all data:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

export async function handler(event, context) {
  try {
    // Initialize database if not already done
    if (!db) {
      await initDatabase();
    }

    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body);
      console.log("Received water level:", data.level);

      // Validate the data
      if (typeof data.level !== 'number' && typeof data.level !== 'string') {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Invalid level data" }),
        };
      }

      const level = parseFloat(data.level);
      if (isNaN(level)) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Level must be a valid number" }),
        };
      }

      // Save to SQLite database
      const insertId = await insertWaterLevel(level);

      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: "Data received and saved", 
          receivedLevel: level,
          recordId: insertId,
          timestamp: new Date().toISOString()
        }),
      };
    }

    if (event.httpMethod === "GET") {
      const queryParams = event.queryStringParameters || {};
      
      if (queryParams.all === 'true') {
        // Return all records (limited to 100 by default)
        const limit = parseInt(queryParams.limit) || 100;
        const allLevels = await getAllWaterLevels(limit);
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            data: allLevels,
            count: allLevels.length 
          }),
        };
      } else {
        // Return latest record
        const latestLevel = await getLatestWaterLevel();
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            latestLevel: latestLevel ? latestLevel.level : null,
            timestamp: latestLevel ? latestLevel.timestamp : null,
            data: latestLevel
          }),
        };
      }
    }

    return { statusCode: 405, body: "Method Not Allowed" };
  } catch (err) {
    console.error("Error:", err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        error: "Internal server error",
        message: err.message 
      })
    };
  }
}
