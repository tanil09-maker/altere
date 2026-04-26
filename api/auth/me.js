import { initDB, getTodaySearchCount, getAnonymousSearchCount } from '../../lib/db.js';
import { getSessionFromRequest } from '../../lib/session.js';
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await initDB();
    const userId = await getSessionFromRequest(req);

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
             || req.headers['x-real-ip']
             || req.socket?.remoteAddress
             || 'unknown';

    if (userId) {
      // Authenticated user
      const sql = neon(process.env.DATABASE_URL);
      const rows = await sql`SELECT id, name, email, picture FROM users WHERE id = ${userId} LIMIT 1`;
      const user = rows[0];
      if (!user) return res.status(401).json({ authenticated: false });

      const searchesToday = await getTodaySearchCount(userId);
      return res.status(200).json({
        authenticated: true,
        user: { name: user.name, email: user.email, picture: user.picture },
        searches_today: searchesToday,
        daily_limit: 1,
        searches_remaining: Math.max(0, 1 - searchesToday)
      });
    }

    // Anonymous user
    const anonCount = await getAnonymousSearchCount(ip);
    return res.status(200).json({
      authenticated: false,
      anonymous_searches_used: anonCount,
      anonymous_limit: 3,
      searches_remaining: Math.max(0, 3 - anonCount)
    });
  } catch (err) {
    console.error('[auth/me] Error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
