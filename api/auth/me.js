import { initDB, getTodaySearchCount, getAnonymousSearchCount, getUserById } from '../../lib/db.js';
import { getSessionFromRequest } from '../../lib/session.js';

const DAILY_LIMIT = 10;

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
      const user = await getUserById(userId);
      if (!user) return res.status(401).json({ authenticated: false });

      const isAdmin = user.is_admin === true;
      const searchesToday = await getTodaySearchCount(userId);

      return res.status(200).json({
        authenticated: true,
        user: {
          name: user.name,
          email: user.email,
          picture: user.picture,
          is_admin: isAdmin,
        },
        searches_today: searchesToday,
        daily_limit: isAdmin ? -1 : DAILY_LIMIT,
        searches_remaining: isAdmin ? -1 : Math.max(0, DAILY_LIMIT - searchesToday),
      });
    }

    // Anonymous user
    const anonCount = await getAnonymousSearchCount(ip);
    return res.status(200).json({
      authenticated: false,
      anonymous_searches_used: anonCount,
      anonymous_limit: 3,
      searches_remaining: Math.max(0, 3 - anonCount),
    });
  } catch (err) {
    console.error('[auth/me] Error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
