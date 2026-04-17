// Vercel Serverless Function — fetches Open Graph metadata from a URL

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ALTERE/1.0; +https://altere-chi.vercel.app)',
        'Accept': 'text/html'
      },
      signal: controller.signal,
      redirect: 'follow'
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(200).json({ title: null, image: null, description: null, domain: new URL(url).hostname });
    }

    const html = await response.text();

    // Extract OG tags
    const ogTitle = extract(html, 'og:title') || extract(html, 'twitter:title') || extractTag(html, 'title');
    const ogImage = extract(html, 'og:image') || extract(html, 'twitter:image');
    const ogDesc  = extract(html, 'og:description') || extract(html, 'twitter:description') || extractMeta(html, 'description');
    const domain  = new URL(url).hostname.replace('www.', '');

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

    return res.status(200).json({
      title: ogTitle || null,
      image: ogImage || null,
      description: ogDesc || null,
      domain
    });
  } catch (err) {
    // Return partial data on error
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return res.status(200).json({ title: null, image: null, description: null, domain });
    } catch {
      return res.status(200).json({ title: null, image: null, description: null, domain: null });
    }
  }
}

function extract(html, property) {
  const regex = new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i');
  const match = html.match(regex);
  if (match) return match[1];
  // Try reversed order (content before property)
  const regex2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i');
  const match2 = html.match(regex2);
  return match2 ? match2[1] : null;
}

function extractMeta(html, name) {
  const regex = new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
  const match = html.match(regex);
  if (match) return match[1];
  const regex2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["']`, 'i');
  const match2 = html.match(regex2);
  return match2 ? match2[1] : null;
}

function extractTag(html, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}
