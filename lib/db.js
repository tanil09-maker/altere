import { neon } from '@neondatabase/serverless';

let sql;

function getSQL() {
  if (!sql) {
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
}

export async function initDB() {
  const db = getSQL();
  await db`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      google_id TEXT UNIQUE NOT NULL,
      email TEXT,
      name TEXT,
      picture TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS search_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      ip TEXT,
      query TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS anonymous_searches (
      id SERIAL PRIMARY KEY,
      ip TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function getUserByGoogleId(googleId) {
  const db = getSQL();
  const rows = await db`SELECT * FROM users WHERE google_id = ${googleId} LIMIT 1`;
  return rows[0] || null;
}

export async function createUser({ googleId, email, name, picture }) {
  const db = getSQL();
  const rows = await db`
    INSERT INTO users (google_id, email, name, picture)
    VALUES (${googleId}, ${email}, ${name}, ${picture})
    ON CONFLICT (google_id) DO UPDATE SET email = ${email}, name = ${name}, picture = ${picture}
    RETURNING *
  `;
  return rows[0];
}

export async function getTodaySearchCount(userId) {
  const db = getSQL();
  const rows = await db`
    SELECT COUNT(*)::int AS count FROM search_history
    WHERE user_id = ${userId}
      AND created_at >= CURRENT_DATE
      AND created_at < CURRENT_DATE + INTERVAL '1 day'
  `;
  return rows[0]?.count || 0;
}

export async function getAnonymousSearchCount(ip) {
  const db = getSQL();
  const rows = await db`
    SELECT COUNT(*)::int AS count FROM anonymous_searches
    WHERE ip = ${ip}
  `;
  return rows[0]?.count || 0;
}

export async function logSearch(userId, ip, query) {
  const db = getSQL();
  await db`INSERT INTO search_history (user_id, ip, query) VALUES (${userId}, ${ip}, ${query})`;
}

export async function logAnonymousSearch(ip) {
  const db = getSQL();
  await db`INSERT INTO anonymous_searches (ip) VALUES (${ip})`;
}
