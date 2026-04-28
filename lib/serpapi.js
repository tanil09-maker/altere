// SerpAPI client for Google Shopping, Images, and Lens searches

const BASE_URL = 'https://serpapi.com/search.json';

function getApiKey() {
  const key = process.env.SERPAPI_KEY;
  if (!key) throw new Error('SERPAPI_KEY not configured');
  return key;
}

export async function searchGoogleShopping(query, options = {}) {
  const params = new URLSearchParams({
    engine: 'google_shopping',
    q: query,
    api_key: getApiKey(),
    gl: options.gl || options.country || 'us',
    hl: options.hl || options.lang || 'en',
    num: String(options.num || 10),
  });
  if (options.google_domain) params.set('google_domain', options.google_domain);

  const res = await fetch(`${BASE_URL}?${params}`);
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) throw new Error('SerpAPI rate limit reached');
    throw new Error(`SerpAPI error ${res.status}: ${body.substring(0, 200)}`);
  }

  const data = await res.json();
  const results = data.shopping_results || [];

  return results.map(item => ({
    title: item.title || '',
    price: item.extracted_price != null ? `$${item.extracted_price}` : (item.price || ''),
    extracted_price: item.extracted_price || null,
    source: item.source || '',
    link: item.link || item.product_link || '',
    thumbnail: item.thumbnail || '',
    rating: item.rating || null,
    reviews: item.reviews || null,
    position: item.position || null,
  }));
}

export async function searchGoogleImages(query, options = {}) {
  const params = new URLSearchParams({
    engine: 'google_images',
    q: query,
    api_key: getApiKey(),
    gl: options.gl || options.country || 'us',
    hl: options.hl || options.lang || 'en',
    num: String(options.num || 5),
  });
  if (options.google_domain) params.set('google_domain', options.google_domain);

  const res = await fetch(`${BASE_URL}?${params}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SerpAPI images error ${res.status}: ${body.substring(0, 200)}`);
  }

  const data = await res.json();
  const results = data.images_results || [];

  return results.map(item => ({
    title: item.title || '',
    link: item.link || '',
    thumbnail: item.thumbnail || '',
    original: item.original || '',
    source: item.source || '',
  }));
}

export async function reverseImageSearch(imageUrl) {
  const params = new URLSearchParams({
    engine: 'google_lens',
    url: imageUrl,
    api_key: getApiKey(),
  });

  const res = await fetch(`${BASE_URL}?${params}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SerpAPI Lens error ${res.status}: ${body.substring(0, 200)}`);
  }

  const data = await res.json();

  // Google Lens returns visual_matches and knowledge_graph
  const matches = data.visual_matches || [];
  const knowledge = data.knowledge_graph || [];

  return {
    matches: matches.slice(0, 10).map(item => ({
      title: item.title || '',
      link: item.link || '',
      thumbnail: item.thumbnail || '',
      source: item.source || '',
      price: item.price?.extracted_value ? `$${item.price.extracted_value}` : (item.price?.value || ''),
    })),
    knowledge: knowledge.slice(0, 5).map(item => ({
      title: item.title || '',
      link: item.link || '',
      thumbnail: item.thumbnail || item.images?.[0]?.link || '',
    })),
  };
}
