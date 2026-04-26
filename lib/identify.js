// Claude-based product identification — no URL/image generation, only recognition

const MODEL = 'claude-sonnet-4-20250514';

const IDENTIFY_SYSTEM = `You are a fashion product identification expert. Your ONLY job is to identify what fashion product the user is describing or showing.

Respond with ONLY a JSON object. No markdown, no explanation, no code fences.

JSON schema:
{
  "brand": "The designer/luxury brand name, or 'Unknown' if not identifiable",
  "product_name": "The specific product name if recognizable, or a descriptive name",
  "category": "bags | shoes | clothing | jewellery | accessories",
  "color": "primary color(s)",
  "material": "primary material if identifiable",
  "key_features": ["list", "of", "distinctive", "visual", "features"],
  "search_query": "optimized Google Shopping search query to find this exact product",
  "dupe_search_hints": ["3-5 search queries for finding affordable alternatives, e.g. 'quilted chain crossbody bag'"],
  "confidence": 85
}

Rules:
- NEVER invent URLs, image links, or product page links
- NEVER guess prices — leave pricing to the search step
- confidence: 90-100 = very sure of exact brand/product, 70-89 = confident in type but not exact model, below 70 = uncertain
- search_query should be specific enough to find this product on Google Shopping
- dupe_search_hints should describe the STYLE not the brand (e.g. "quilted leather chain strap bag" not "Chanel bag dupe")`;

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

  // Strip code fences if present
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  return JSON.parse(text);
}

export async function identifyFromText(description) {
  return callClaude(IDENTIFY_SYSTEM, [
    { role: 'user', content: `Identify this fashion item: ${description}` }
  ]);
}

export async function identifyFromImage(base64, mediaType = 'image/jpeg') {
  return callClaude(IDENTIFY_SYSTEM, [
    {
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
        { type: 'text', text: 'Identify this fashion item. What brand, product, and style is this?' }
      ]
    }
  ]);
}

export async function identifyFromUrl(productUrl) {
  // Fetch the page and extract useful metadata
  let pageTitle = '';
  let ogImage = '';
  let metaDesc = '';

  try {
    const res = await fetch(productUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ALTERE/1.0)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();

    // Extract OG/meta tags with simple regex (no DOM parser in serverless)
    pageTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || '';
    ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
    metaDesc = html.match(/<meta[^>]+(?:name=["']description["']|property=["']og:description["'])[^>]+content=["']([^"']+)["']/i)?.[1] || '';
  } catch {
    // If fetch fails, just use the URL itself
  }

  const context = [pageTitle, metaDesc, productUrl].filter(Boolean).join('\n');
  const result = await callClaude(IDENTIFY_SYSTEM, [
    { role: 'user', content: `Identify this fashion product from this webpage info:\n\nURL: ${productUrl}\nTitle: ${pageTitle}\nDescription: ${metaDesc}\n\nWhat brand and product is this?` }
  ]);

  // If we got an OG image, attach it for later SerpAPI Lens use
  if (ogImage) result._ogImage = ogImage;
  return result;
}
