// Claude-based product identification — returns 2 luxury originals + dupe hints

import { searchGoogleShopping } from './serpapi.js';

const MODEL = 'claude-sonnet-4-20250514';

const IDENTIFY_SYSTEM = `You are a luxury fashion expert. Given a fashion item description, photo, or URL, identify TWO luxury originals that best represent this style.

Respond with ONLY a JSON object. No markdown, no explanation, no code fences.

JSON schema:
{
  "originals": [
    {
      "brand": "Valentino",
      "product_name": "Red Crepe Couture Midi Dress",
      "search_query": "Valentino red crepe midi dress",
      "category": "dresses",
      "color": "red",
      "material": "crepe"
    },
    {
      "brand": "Dolce & Gabbana",
      "product_name": "Red Lace Sheath Dress",
      "search_query": "Dolce Gabbana red lace dress",
      "category": "dresses",
      "color": "red",
      "material": "lace"
    }
  ],
  "key_features": ["red color", "midi length", "fitted silhouette"],
  "key_attributes": {
    "color": "red",
    "category": "dresses",
    "style": "midi",
    "material": null
  },
  "confidence": 90
}

CRITICAL ATTRIBUTE RULES — MUST FOLLOW:
1. COLOR: If the query mentions a color (red, black, beige, white, blue, green, etc.), BOTH originals MUST be that exact color. NO exceptions.
   - "red dress" → both originals MUST be red
   - "beige coat" → both originals MUST be beige/camel/tan
   - "black bag" → both originals MUST be black
2. CATEGORY: If the query mentions a category (dress, coat, bag), both MUST be that category.
3. STYLE: If the query mentions a style (mini, midi, maxi, oversized), respect it.
4. MATERIAL: If the query mentions a material (silk, leather, wool), respect it.

Other rules:
- ALWAYS return exactly 2 originals from DIFFERENT luxury brands
- Luxury brands: Burberry, Max Mara, The Row, Khaite, Chanel, Hermes, Bottega Veneta, Saint Laurent, Loewe, Prada, Gucci, Dior, Celine, Toteme, Loro Piana, Brunello Cucinelli, Valentino, Balenciaga, Fendi, Miu Miu, Jacquemus, Dolce & Gabbana, Oscar de la Renta, Carolina Herrera
- search_query: include color + product type for accurate Shopping results
- key_attributes: extract the explicit attributes from the user query (color, category, style, material). null if not specified.
- NEVER invent URLs or prices`;

function getApiKey() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not configured');
  return key;
}

async function callClaude(system, messages, maxTokens = 1024) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getApiKey(),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Claude API error ${res.status}: ${err.error?.message || 'unknown'}`);
  }

  const data = await res.json();
  const blocks = data.content || [];
  let text = '';
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i].type === 'text' && blocks[i].text.trim()) {
      text = blocks[i].text.trim();
      break;
    }
  }
  if (!text) throw new Error('No text in Claude response');
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(text);
}

export async function identifyFromText(description) {
  return callClaude(IDENTIFY_SYSTEM, [
    { role: 'user', content: `Identify 2 luxury originals for: ${description}` }
  ]);
}

export async function identifyFromImage(base64, mediaType = 'image/jpeg') {
  return callClaude(IDENTIFY_SYSTEM, [
    {
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
        { type: 'text', text: 'Identify 2 luxury originals that this fashion item is inspired by or similar to.' }
      ]
    }
  ]);
}

export async function identifyFromUrl(productUrl) {
  let pageTitle = '';
  let metaDesc = '';

  try {
    const res = await fetch(productUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ALTERE/1.0)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    pageTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || '';
    metaDesc = html.match(/<meta[^>]+(?:name=["']description["']|property=["']og:description["'])[^>]+content=["']([^"']+)["']/i)?.[1] || '';
  } catch { /* use URL only */ }

  return callClaude(IDENTIFY_SYSTEM, [
    { role: 'user', content: `Identify 2 luxury originals for this product:\n\nURL: ${productUrl}\nTitle: ${pageTitle}\nDescription: ${metaDesc}` }
  ]);
}

// Verify originals via SerpAPI Google Shopping
const LUXURY_RETAILERS = [
  'net-a-porter', 'netaporter', 'farfetch', 'mytheresa',
  'burberry', 'maxmara', 'max mara', 'chanel', 'hermes', 'hermès',
  'bottegaveneta', 'bottega veneta', 'saintlaurent', 'saint laurent',
  'loewe', 'prada', 'gucci', 'dior', 'celine', 'toteme', 'totême',
  'loropiana', 'loro piana', 'matchesfashion', 'matches fashion',
  'ssense', 'theoutnet', 'the outnet', 'modaoperandi', 'moda operandi',
  'the row', 'khaite', 'brunello cucinelli', 'valentino', 'fendi',
  'balenciaga', 'miu miu', 'jacquemus', 'selfridges', 'harrods',
  'bergdorf', 'neiman marcus', 'saks',
];

function isLuxuryRetailer(source) {
  if (!source) return false;
  const s = source.toLowerCase();
  return LUXURY_RETAILERS.some(r => s.includes(r));
}

export async function verifyOriginals(originals, serpApiParams = {}) {
  const verified = [];

  for (const orig of (originals || [])) {
    try {
      const results = await searchGoogleShopping(orig.search_query, { num: 5, ...serpApiParams });
      const luxMatch = results.find(r => isLuxuryRetailer(r.source));
      const match = luxMatch || results[0];

      if (match) {
        verified.push({
          brand: orig.brand,
          product_name: orig.product_name,
          title: match.title,
          price: match.price || '',
          extracted_price: match.extracted_price || null,
          thumbnail: match.thumbnail || '',
          link: match.link || '',
          source: match.source || '',
          category: orig.category || 'clothing',
        });
      } else {
        // No SerpAPI result — include unverified with no image/link
        verified.push({
          brand: orig.brand,
          product_name: orig.product_name,
          title: `${orig.brand} ${orig.product_name}`,
          price: '',
          extracted_price: null,
          thumbnail: '',
          link: '',
          source: '',
          category: orig.category || 'clothing',
        });
      }
    } catch (err) {
      console.error(`[identify] Verify failed for ${orig.brand}:`, err.message);
      verified.push({
        brand: orig.brand,
        product_name: orig.product_name,
        title: `${orig.brand} ${orig.product_name}`,
        price: '', extracted_price: null, thumbnail: '', link: '', source: '',
        category: orig.category || 'clothing',
      });
    }
  }

  return verified;
}
