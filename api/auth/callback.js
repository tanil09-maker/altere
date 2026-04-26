import { initDB, createUser } from '../../lib/db.js';
import { createSession, setSessionCookie } from '../../lib/session.js';

export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/auth/callback`;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('[auth] Token exchange failed:', tokenData);
      return res.writeHead(302, { Location: '/?auth_error=token_exchange' }).end();
    }

    // Fetch user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userInfo = await userRes.json();

    if (!userInfo.id) {
      return res.writeHead(302, { Location: '/?auth_error=no_user_info' }).end();
    }

    // Upsert user in database
    await initDB();
    const user = await createUser({
      googleId: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture
    });

    // Set session cookie
    const token = await createSession(user.id);
    setSessionCookie(res, token);

    res.writeHead(302, { Location: '/' });
    res.end();
  } catch (err) {
    console.error('[auth] Callback error:', err);
    res.writeHead(302, { Location: '/?auth_error=server_error' });
    res.end();
  }
}
