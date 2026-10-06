// Product description and candidate search, without claiming exact identification.

import { searchGoogleShopping } from './serpapi.js';

const MODEL = 'claude-sonnet-4-5';

const IDENTIFY_SYSTEM = `You help find fashion products from descriptions, photos or product links.
Return ONLY JSON using this schema:
{"originals":[{"brand":"","product_name":"","search_query":"","category":"bags","color":"black","material":""}],"key_features":[],"key_attributes":{"color":null,"category":null,"style":null,"material":null},"confidence":0}
Rules:
- Return up to two useful search candidates. These are hypotheses, NOT verified original products.
- Include high-street and independent brands as well as luxury. Never force a luxury brand.
- For a generic description or uncertain photo, leave brand empty and use a descriptive product name and search query. Do not invent a model name.
- Only mention a brand/model if supported by the input. A similar silhouette is not proof of identity.
- Preserve explicit color, category, style and material. If material is not known, leave it empty.
- category must be bags, shoes, clothing, jewellery or accessories.
- Never invent prices, URLs or availability. confidence is your uncertainty, not a measured visual match.`;

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
  return parseJsonLoose(text);
}

// Robustly parse JSON that may be wrapped in stray prose. Tries a direct parse
// first, then falls back to extracting the first balanced {...} / [...] block.
function parseJsonLoose(text) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.search(/[[{]/);
    if (start === -1) throw new Error('No JSON found in Claude response');
    const open = text[start];
    const close = open === '{' ? '}' : ']';
    let depth = 0;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) return JSON.parse(text.slice(start, i + 1));
      }
    }
    throw new Error('Unbalanced JSON in Claude response');
  }
}

export async function identifyFromText(description) {
  return callClaude(IDENTIFY_SYSTEM, [
    { role: 'user', content: `Describe the item and suggest product search queries for: ${description}` }
  ]);
}

export async function identifyFromImage(base64, mediaType = 'image/jpeg') {
  return callClaude(IDENTIFY_SYSTEM, [
    {
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
        { type: 'text', text: 'Describe this item and suggest product search queries. Do not guess a brand from style alone.' }
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
    { role: 'user', content: `Describe this product and suggest search queries:\n\nURL: ${productUrl}\nTitle: ${pageTitle}\nDescription: ${metaDesc}` }
  ]);
}

// Shopping listings are candidates, not proof that the pictured product was identified.
export async function verifyOriginals(originals, serpApiParams = {}) {
  const candidates = await Promise.all((originals || []).slice(0, 2).map(async orig => {
    try {
      const results = await searchGoogleShopping(orig.search_query, { num: 5, ...serpApiParams });
      const match = results.find(r => r.link && r.title);
      if (!match) return null;
      return {
        brand: '', product_name: match.title, title: match.title,
        price: match.price || '', extracted_price: match.extracted_price || null,
        thumbnail: match.thumbnail || '', link: match.link, source: match.source || '',
        category: orig.category || 'clothing', match_type: 'candidate',
      };
    } catch (err) {
      console.error('[identify] Shopping lookup failed:', err.message);
      return null;
    }
  }));
  return candidates.filter(Boolean).filter((item, index, items) =>
    items.findIndex(other => other.link === item.link) === index);
}
