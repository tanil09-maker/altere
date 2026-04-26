import { searchGoogleShopping } from '../lib/serpapi.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const results = await searchGoogleShopping('chanel classic flap bag', { num: 3 });
    return res.status(200).json({ ok: true, count: results.length, results });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
