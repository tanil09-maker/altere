import { detectRegion, getRegionConfig } from '../lib/region.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  const countryCode = req.headers['x-vercel-ip-country'] || null;
  const region = detectRegion(countryCode);
  const config = getRegionConfig(region);

  res.status(200).json({
    detected_country: countryCode,
    region,
    currency: config.currency,
    symbol: config.symbol,
  });
}
