// Region detection, store whitelists, and SerpAPI config per region

const COUNTRY_TO_REGION = {
  'NL': 'EU', 'BE': 'EU', 'DE': 'EU', 'FR': 'EU', 'ES': 'EU', 'IT': 'EU',
  'PT': 'EU', 'AT': 'EU', 'IE': 'EU', 'FI': 'EU', 'SE': 'EU', 'DK': 'EU',
  'PL': 'EU', 'CZ': 'EU', 'GR': 'EU', 'RO': 'EU', 'HU': 'EU', 'BG': 'EU',
  'HR': 'EU', 'SK': 'EU', 'SI': 'EU', 'EE': 'EU', 'LT': 'EU', 'LV': 'EU',
  'CY': 'EU', 'MT': 'EU', 'LU': 'EU', 'NO': 'EU', 'CH': 'EU',
  'GB': 'UK',
  'US': 'US',
  'CA': 'CA',
  'AU': 'AU', 'NZ': 'AU',
  'JP': 'JP',
};

const EU_SERPAPI = {
  'NL': { gl: 'nl', google_domain: 'google.nl' },
  'BE': { gl: 'be', google_domain: 'google.be' },
  'DE': { gl: 'de', google_domain: 'google.de' },
  'FR': { gl: 'fr', google_domain: 'google.fr' },
  'ES': { gl: 'es', google_domain: 'google.es' },
  'IT': { gl: 'it', google_domain: 'google.it' },
  'PT': { gl: 'pt', google_domain: 'google.pt' },
  'AT': { gl: 'at', google_domain: 'google.at' },
};

const REGION_CONFIG = {
  US: { currency: 'USD', symbol: '$', serpapi: { gl: 'us', google_domain: 'google.com', hl: 'en' } },
  EU: { currency: 'EUR', symbol: '\u20ac', serpapi: { gl: 'es', google_domain: 'google.es', hl: 'en' } },
  UK: { currency: 'GBP', symbol: '\u00a3', serpapi: { gl: 'uk', google_domain: 'google.co.uk', hl: 'en' } },
  CA: { currency: 'CAD', symbol: 'C$', serpapi: { gl: 'ca', google_domain: 'google.ca', hl: 'en' } },
  AU: { currency: 'AUD', symbol: 'A$', serpapi: { gl: 'au', google_domain: 'google.com.au', hl: 'en' } },
  JP: { currency: 'JPY', symbol: '\u00a5', serpapi: { gl: 'jp', google_domain: 'google.co.jp', hl: 'en' } },
  WW: { currency: 'USD', symbol: '$', serpapi: { gl: 'us', google_domain: 'google.com', hl: 'en' } },
};

// Store whitelists per region — arrays, converted to Set at runtime
const REGION_STORES = {
  US: [
    'zara', 'zara usa', 'h&m', 'hm', 'h and m', 'h&m usa',
    'mango', 'mango usa', 'asos', 'asos com', 'uniqlo', 'uniqlo us',
    'forever 21', 'old navy', 'gap', 'j.crew', 'jcrew', 'j crew',
    'banana republic', 'madewell', 'abercrombie', 'abercrombie & fitch',
    'american eagle', 'urban outfitters',
  ],
  EU: [
    'zara', 'zara home', 'h&m', 'hm', 'h and m', 'h&m home',
    'mango', 'mango outlet', 'mango man', 'asos', 'asos com',
    'cos', 'cos stores', '& other stories', 'other stories',
    'massimo dutti', 'pull&bear', 'pull and bear', 'pullandbear',
    'bershka', 'stradivarius', 'arket', 'weekday', 'monki',
    'uniqlo', 'sandro', 'maje',
  ],
  UK: [
    'zara', 'zara uk', 'h&m', 'hm', 'h and m', 'h&m uk',
    'mango', 'mango uk', 'asos', 'asos com', 'asos uk',
    'cos', 'cos uk', '& other stories', 'other stories', 'massimo dutti',
    'uniqlo', 'uniqlo uk',
    'marks & spencer', 'marks and spencer', 'm&s', 'topshop',
    'river island', 'next', 'next co uk', 'reiss', 'whistles', 'jigsaw',
    'oasis', 'warehouse',
  ],
  CA: [
    'zara', 'h&m', 'hm', 'h and m', 'mango', 'asos', 'asos com',
    'uniqlo', 'aritzia', 'simons', 'roots',
    'old navy', 'gap', 'banana republic',
  ],
  AU: [
    'zara', 'h&m', 'hm', 'h and m', 'mango', 'asos', 'asos com',
    'uniqlo', 'cotton on', 'sportsgirl', 'witchery', 'country road',
    'seed heritage', 'forever new', 'glassons',
  ],
  JP: [
    'zara', 'h&m', 'hm', 'uniqlo', 'gu', 'shimamura',
    'beams', 'united arrows', 'urban research', 'muji',
  ],
  WW: [
    'zara', 'h&m', 'hm', 'mango', 'asos', 'asos com', 'uniqlo',
  ],
};

// Pre-build Sets for fast lookup
const REGION_STORE_SETS = {};
for (const [region, stores] of Object.entries(REGION_STORES)) {
  REGION_STORE_SETS[region] = new Set(stores);
}

export function detectRegion(countryCode) {
  if (!countryCode) return 'WW';
  return COUNTRY_TO_REGION[countryCode.toUpperCase()] || 'WW';
}

export function getRegionConfig(region) {
  return REGION_CONFIG[region] || REGION_CONFIG.WW;
}

export function getRegionStoreSet(region) {
  return REGION_STORE_SETS[region] || REGION_STORE_SETS.WW;
}

export function getSerpApiParams(region, countryCode) {
  if (region === 'EU' && countryCode) {
    const params = EU_SERPAPI[countryCode.toUpperCase()];
    if (params) return { ...params, hl: 'en' };
  }
  return (REGION_CONFIG[region] || REGION_CONFIG.WW).serpapi;
}

export { REGION_CONFIG, REGION_STORES };
