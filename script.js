/* ============================================================
   ALTERE — Main Script
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ============================================================
     Constants & State
     ============================================================ */

  const PROXY_URL    = '/api/chat';
  const LS_KEY       = 'altere_api_key';
  const UNSPLASH_KEY = 'altere_unsplash_key';
  const UNSPLASH_API = 'https://api.unsplash.com/search/photos';
  const SAVED_KEY    = 'altere_saved_items';
  const FREE_LIMIT   = 10;

  let currentFile = null;
  let isSearching = false;

  // Muted fashion palette for colour placeholders (fallback when no Unsplash key)
  const CARD_COLORS = [
    '#D5C6B0', '#B8A99A', '#C4B7A6', '#A89F91', '#CABFB1', '#BDB1A0'
  ];

  // Category-based fallback images (when AI doesn't return image_url)
  const CATEGORY_FALLBACKS = {
    bags: [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=400&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?w=400&h=400&fit=crop&q=80'
    ],
    shoes: [
      'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=400&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=400&fit=crop&q=80'
    ],
    clothing: [
      'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1653660666869-2345adc51155?w=400&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1618597724686-aee8bba9cf99?w=400&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=400&fit=crop&q=80'
    ],
    jewellery: [
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=400&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=400&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?w=400&h=400&fit=crop&q=80'
    ],
    accessories: [
      'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1509319117193-57bab727e09d?w=400&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=400&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?w=400&h=400&fit=crop&q=80'
    ]
  };

  function getCategoryFallback(category) {
    const imgs = CATEGORY_FALLBACKS[category] || CATEGORY_FALLBACKS.clothing;
    return imgs[Math.floor(Math.random() * imgs.length)];
  }

  /* ============================================================
     DOM refs
     ============================================================ */

  const nav             = document.getElementById('nav');
  const hamburger       = document.getElementById('hamburger');
  const navLinks        = document.getElementById('navLinks');
  const uploadArea      = document.getElementById('uploadArea');
  const fileInput       = document.getElementById('fileInput');
  const uploadSearchBtn = document.getElementById('uploadSearchBtn');
  const uploadDefault   = document.getElementById('uploadDefault');
  const uploadPreview   = document.getElementById('uploadPreview');
  const uploadThumb     = document.getElementById('uploadThumb');
  const uploadFilename  = document.getElementById('uploadFilename');
  const uploadFilesize  = document.getElementById('uploadFilesize');
  const uploadRemove    = document.getElementById('uploadRemove');
  const resultsGrid     = document.querySelector('.results__grid');
  const resultsHeader   = document.querySelector('.results__header');
  const categoryFilters = document.getElementById('categoryFilters');
  const materialFilters = document.getElementById('materialFilters');
  const priceFilters    = document.getElementById('priceFilters');
  const storeFilters    = document.getElementById('storeFilters');
  const toast           = document.getElementById('toast');
  const savedLink       = document.getElementById('savedLink');
  const savedBadge      = document.getElementById('savedBadge');
  const savedPage       = document.getElementById('savedPage');
  const savedBack       = document.getElementById('savedBack');
  const savedGrid       = document.getElementById('savedGrid');
  const savedEmpty      = document.getElementById('savedEmpty');
  const savedClearAll   = document.getElementById('savedClearAll');

  let activeMinPrice  = 0;
  let activeMaxPrice  = 0;
  let activeCategory  = 'all';
  let activeMaterial  = 'all';
  let activeStores    = new Set(); // empty = show all

  /* ============================================================
     Dark mode toggle
     ============================================================ */

  const THEME_KEY    = 'altere_theme';
  const themeToggle  = document.getElementById('themeToggle');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }

  // Restore saved preference on load — dark luxury is the default experience
  const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(savedTheme);

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
    if (typeof updateCalc === 'function') updateCalc();
  });

  /* ============================================================
     Region / Country switcher
     ============================================================ */

  const REGION_KEY    = 'altere_region';
  const COUNTRY_KEY   = 'altere_country';
  const regionSwitcher = document.getElementById('regionSwitcher');
  const regionBtn     = document.getElementById('regionBtn');
  const regionMenu    = document.getElementById('regionMenu');
  const regionFlag    = document.getElementById('regionFlag');
  const regionCode    = document.getElementById('regionCode');

  const REGION_FLAGS = {
    US: '\ud83c\uddfa\ud83c\uddf8', EU: '\ud83c\uddea\ud83c\uddfa', UK: '\ud83c\uddec\ud83c\udde7',
    CA: '\ud83c\udde8\ud83c\udde6', AU: '\ud83c\udde6\ud83c\uddfa', JP: '\ud83c\uddef\ud83c\uddf5',
    WW: '\ud83c\udf0d',
  };
  const COUNTRY_FLAGS = {
    NL: '\ud83c\uddf3\ud83c\uddf1', ES: '\ud83c\uddea\ud83c\uddf8', FR: '\ud83c\uddeb\ud83c\uddf7',
    DE: '\ud83c\udde9\ud83c\uddea', IT: '\ud83c\uddee\ud83c\uddf9', BE: '\ud83c\udde7\ud83c\uddea',
    AT: '\ud83c\udde6\ud83c\uddf9', PT: '\ud83c\uddf5\ud83c\uddf9', SE: '\ud83c\uddf8\ud83c\uddea',
    DK: '\ud83c\udde9\ud83c\uddf0', FI: '\ud83c\uddeb\ud83c\uddee', IE: '\ud83c\uddee\ud83c\uddea',
    PL: '\ud83c\uddf5\ud83c\uddf1', GR: '\ud83c\uddec\ud83c\uddf7', NO: '\ud83c\uddf3\ud83c\uddf4',
    CH: '\ud83c\udde8\ud83c\udded', NZ: '\ud83c\uddf3\ud83c\uddff',
  };

  let currentRegion  = localStorage.getItem(REGION_KEY) || null;
  let currentCountry = localStorage.getItem(COUNTRY_KEY) || null;

  function updateRegionUI(region, country) {
    currentRegion = region;
    currentCountry = country;
    const flag = (country && COUNTRY_FLAGS[country.toUpperCase()]) || REGION_FLAGS[region] || REGION_FLAGS.WW;
    if (regionFlag) regionFlag.textContent = flag;
    if (regionCode) regionCode.textContent = region || '--';
    // Highlight active option
    regionMenu?.querySelectorAll('.nav__region-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.region === region);
    });
  }

  // Detect on first load
  const REGION_SYMBOLS = { US: '$', EU: '\u20ac', UK: '\u00a3', CA: 'C$', AU: 'A$', JP: '\u00a5', WW: '$' };

  function applyRegionMeta(region) {
    if (typeof currentRegionMeta !== 'undefined') {
      currentRegionMeta.symbol = REGION_SYMBOLS[region] || '$';
      currentRegionMeta.region = region;
    }
  }

  async function initRegion() {
    if (currentRegion) {
      updateRegionUI(currentRegion, currentCountry);
      applyRegionMeta(currentRegion);
      if (typeof renderDupeOfDay === 'function') renderDupeOfDay();
      return;
    }
    try {
      const res = await fetch('/api/region');
      const data = await res.json();
      currentRegion = data.region;
      currentCountry = data.detected_country || '';
      localStorage.setItem(REGION_KEY, currentRegion);
      localStorage.setItem(COUNTRY_KEY, currentCountry);
      updateRegionUI(currentRegion, currentCountry);
      applyRegionMeta(currentRegion);
      if (typeof renderDupeOfDay === 'function') renderDupeOfDay();
    } catch {
      updateRegionUI('WW', '');
    }
  }
  initRegion();

  // Toggle dropdown
  if (regionBtn) {
    regionBtn.addEventListener('click', e => {
      e.stopPropagation();
      regionSwitcher.classList.toggle('open');
      // Close lang menu if open
      document.getElementById('langSwitcher')?.classList.remove('open');
    });
  }

  // Pick region
  if (regionMenu) {
    regionMenu.addEventListener('click', e => {
      const opt = e.target.closest('[data-region]');
      if (!opt) return;
      const region = opt.dataset.region;
      localStorage.setItem(REGION_KEY, region);
      localStorage.setItem(COUNTRY_KEY, '');
      updateRegionUI(region, '');
      applyRegionMeta(region);
      if (typeof renderDupeOfDay === 'function') renderDupeOfDay();
      regionSwitcher.classList.remove('open');
    });
  }

  // Close on outside click
  document.addEventListener('click', e => {
    if (regionSwitcher && !regionSwitcher.contains(e.target)) {
      regionSwitcher.classList.remove('open');
    }
  });

  /* ============================================================
     Language switcher
     ============================================================ */

  const LANG_KEY      = 'altere_lang';
  const langSwitcher  = document.getElementById('langSwitcher');
  const langBtn       = document.getElementById('langBtn');
  const langCurrent   = document.getElementById('langCurrent');
  const langMenu      = document.getElementById('langMenu');

  const TRANSLATIONS = {
    en: {
      'nav.discover': 'Discover', 'nav.brands': 'Brands', 'nav.saved': 'Saved', 'nav.signin': 'Sign in',
      'hero.eyebrow': 'AI-Powered Fashion Discovery',
      'hero.headline': 'Spot it.<br>We\u2019ll source it.',
      'hero.sub': 'See something on social media, on the street or on TV? Upload a photo and our AI identifies the exact item \u2014 with every store and price. Too steep? We\u2019ll show smarter alternatives too.',
      'search.tab.link': 'Paste link', 'search.tab.upload': 'Upload photo', 'search.tab.text': 'Alternatives',
      'search.placeholder.link': 'Paste a product URL from any fashion site...',
      'search.placeholder.text': 'Describe the item, e.g. "cream satin midi skirt"...',
      'search.btn': 'Find alternatives',
      'search.upload.hint': 'Drag & drop or <strong>browse</strong>',
      'search.upload.formats': 'JPG, PNG or WEBP up to 10 MB',
      'search.upload.ready': 'Ready to search',
      'search.status': 'AI is identifying your item',
      'search.tab.camera': 'Take photo', 'camera.start': 'Tap to open camera', 'camera.hint': 'Point at any item \u2014 we\u2019ll identify it.', 'camera.retake': 'Retake', 'camera.use': 'Identify it', 'camera.error': 'Could not access camera. Please check permissions.',
      'recent.label': 'Recent', 'recent.clear': 'Clear',
      'trending.label': 'Trending now',
      'hero.searching': 'Searching across', 'hero.scroll': 'Scroll to explore',
      'dotd.eyebrow': 'Spotted Today', 'dotd.original': 'The Original', 'dotd.dupe': 'Smart alternative', 'dotd.vs': 'VS', 'dotd.btn': 'Shop it',
      'calc.eyebrow': 'Smart Sourcing', 'calc.title': 'How much could you save?', 'calc.sub': 'Same item, different stores \u2014 see what smart sourcing saves you.', 'calc.budget': 'Monthly fashion budget', 'calc.perMonth': 'Per month', 'calc.perYear': 'Per year', 'calc.fiveYears': 'In 5 years', 'calc.note': 'Based on the average price difference we find for the same look across stores and alternatives.',
      'celeb.eyebrow': 'Style Inspiration', 'celeb.title': 'Get the look', 'celeb.sub': 'Spot the aesthetic \u2014 we\u2019ll find the exact items.', 'celeb.btn': 'Shop the look',
      'celeb.c1.name': 'The Quiet Luxury', 'celeb.c1.desc': 'Understated elegance. Neutral tones, cashmere knits and clean silhouettes inspired by old-money minimalism.',
      'celeb.c2.name': 'Street Chic', 'celeb.c2.desc': 'Bold, confident and effortless. Oversized blazers, leather trousers and statement sneakers straight from fashion week.',
      'celeb.c3.name': 'Old Money', 'celeb.c3.desc': 'Prep meets polish. Tailored wool coats, pearl accents, loafers and structured bags that whisper wealth.',
      'celeb.c4.name': 'French Girl', 'celeb.c4.desc': 'Effortlessly chic. Breton stripes, midi skirts, ballet flats and that perfectly undone Parisian je ne sais quoi.',
      'cookie.text': 'We use cookies to enhance your experience.', 'cookie.accept': 'Accept all', 'cookie.manage': 'Manage preferences',
      'about.mission': 'Luxury aesthetics, accessible prices.', 'about.storyEyebrow': 'Our Story', 'about.storyTitle': 'Fashion should be for everyone',
      'about.storyP1': 'ALTERE was born from a simple frustration: falling in love with a runway piece, then seeing the price tag. We believe great style shouldn\u2019t require a trust fund.',
      'about.storyP2': 'So we built an AI that sees fashion the way a stylist does \u2014 analysing fabric, cut, colour and silhouette \u2014 then scours thousands of high-street products to find the closest match at a fraction of the cost.',
      'about.howEyebrow': 'The Technology', 'about.howTitle': 'How our AI works',
      'about.step1Title': 'Visual deconstruction', 'about.step1Desc': 'Our vision model breaks down any fashion item into its core attributes: material, texture, shape, proportions, colour palette and construction details.',
      'about.step2Title': 'Cross-store matching', 'about.step2Desc': 'We scan inventories from Zara, H&M, Mango, ASOS, COS and & Other Stories in real time, scoring each product against the original on many style dimensions.',
      'about.step3Title': 'Smart ranking', 'about.step3Desc': 'Results are ranked by match accuracy, price savings and availability \u2014 so the best match always rises to the top.',
      'about.teamEyebrow': 'Who We Are', 'about.teamTitle': 'Founded by fashion lovers,<br>powered by AI',
      'about.teamDesc': 'We\u2019re a small team of designers, engineers and fashion obsessives on a mission to democratise style. Every feature we build starts with the same question: does this help someone look incredible without overspending?',
      'about.cta': 'Start identifying items',
      'faq.eyebrow': 'Support', 'faq.title': 'Frequently asked questions',
      'faq.q1': 'How does the AI identify items?', 'faq.a1': 'Our AI vision model analyses the item in your photo, link or description \u2014 breaking it down into fabric, cut, colour, silhouette and construction. It then identifies the exact piece and where to buy it, and if you\u2019d rather spend less, surfaces the closest alternatives ranked by accuracy.',
      'faq.q2': 'Are the links affiliate links?', 'faq.a2': 'Some links may be affiliate links, which means we earn a small commission when you make a purchase \u2014 at no extra cost to you. This helps us keep ALTERE free and continue improving the AI. We never let commissions influence which items are shown; results are always ranked purely by match quality.',
      'faq.q3': 'Is ALTERE free to use?', 'faq.a3': 'Yes, ALTERE is completely free to use. You can run unlimited searches, save your favourites and share them \u2014 all without creating an account or paying anything. We plan to keep the core experience free forever.',
      'faq.q4': 'How accurate are the match percentages?', 'faq.a4': 'Match percentages reflect how closely a match resembles the original item across many style dimensions including material, shape, colour and proportions. A score above 90% means the match is visually very close; 80\u201390% indicates a strong resemblance with minor differences. We continuously refine our model to improve accuracy.',
      'faq.q5': 'Can I suggest a store to add?', 'faq.a5': 'Absolutely! We\u2019re always looking to expand our store network. Drop us a message with the store name and we\u2019ll evaluate adding it. Popular requests include Uniqlo, Arket and Massimo Dutti \u2014 all on our roadmap.',
      'results.eyebrow': 'Most Wanted',
      'results.title': 'The week\u2019s most spotted',
      'results.subtitle': 'Curated this week \u2014 ready to shop.',
      'filter.category': 'Category', 'filter.bags': 'Bags', 'filter.shoes': 'Shoes', 'filter.clothing': 'Clothing', 'filter.jewellery': 'Jewellery', 'filter.accessories': 'Accessories',
      'filter.material': 'Material', 'filter.natural': 'Natural fibres', 'filter.nopolyester': 'No polyester', 'filter.vegan': 'Vegan',
      'filter.price': 'Price', 'filter.all': 'All', 'filter.store': 'Store', 'filter.allStores': 'All Stores', 'filter.sortBy': 'Sort by',
      'sort.match': 'Best match', 'sort.priceAsc': 'Price: Low to High', 'sort.priceDesc': 'Price: High to Low', 'sort.saving': 'Biggest saving',
      'how.eyebrow': 'How it works', 'how.title': 'Three steps to find what you love',
      'demo.eyebrow': 'See it in action', 'demo.title': 'Spotted to sourced, in seconds', 'demo.sub': 'Point your camera at any piece and watch ALTERE identify the exact item \u2014 then show you where to buy it.', 'demo.step1': 'Snap a photo', 'demo.step2': 'We identify the original', 'demo.step3': 'Get every store & price',
      'how.step1.title': 'Upload or paste', 'how.step1.desc': 'Share a photo, product link or description of any fashion item \u2014 luxury or high-street.',
      'how.step2.title': 'AI analysis', 'how.step2.desc': 'Our vision model deconstructs fabric, cut, colour and silhouette in seconds.',
      'how.step3.title': 'Discover alternatives', 'how.step3.desc': 'Browse ranked alternatives with match scores, prices and direct store links.',
      'waitlist.eyebrow': 'Early Access', 'waitlist.title': 'Be the first to know<br>when we launch',
      'waitlist.sub': 'Join thousands of fashion lovers already on the list.',
      'waitlist.placeholder': 'Enter your email address', 'waitlist.btn': 'Join the waitlist',
      'waitlist.hint': 'No spam, ever. Unsubscribe anytime.',
      'waitlist.success.title': 'You\u2019re on the list', 'waitlist.success.desc': 'We\u2019ll let you know as soon as ALTERE is live.',
      'saved.back': 'Back', 'saved.eyebrow': 'Your Collection', 'saved.title': 'Saved Items', 'saved.clearAll': 'Clear all',
      'saved.empty': 'No saved items yet', 'saved.emptyHint': 'Tap the heart on any find to save it here',
      'footer.tagline': 'AI fashion visual search. Spot it, we\u2019ll source it.',
      'footer.explore': 'Explore', 'footer.trending': 'Trending', 'footer.newArrivals': 'New arrivals', 'footer.collections': 'Collections',
      'footer.company': 'Company', 'footer.about': 'About', 'footer.careers': 'Careers', 'footer.privacy': 'Privacy', 'footer.terms': 'Terms',
      'toast.saved': 'Saved to your collection', 'toast.removed': 'Removed from saved', 'toast.cleared': 'All saved items cleared',
      'search.searching': 'Searching...', 'search.joining': 'Joining...',
      'results.ai.eyebrow': 'AI Results', 'results.ai.title': 'Your results are ready', 'results.demo.eyebrow': 'Demo Results', 'results.demo.hint': 'Add your API key in settings for real AI results', 'results.bestDupe': 'Best match', 'results.moreAlts': 'Spotted Alternatives',
      'free.remaining': 'free AI searches left today', 'free.totalRemaining': 'free AI searches remaining', 'free.exhausted': 'Free searches used \u2014 showing demo results', 'free.unregExhausted': 'Free searches used \u2014 sign in for 3 daily searches', 'free.pro': 'Unlimited AI searches (Pro)',
      'auth.title': 'Sign in to ALTERE', 'auth.subtitle': 'Create a free account to save your finds and share them.', 'auth.email': 'Email', 'auth.name': 'Name', 'auth.create': 'Create free account', 'auth.tiers': 'Free: 3 AI searches/day. Add your API key for unlimited.', 'auth.signout': 'Sign out', 'auth.freeTier': 'Free', 'auth.freeDesc': '3 AI searches per day + unlimited demo', 'auth.proDesc': 'Unlimited AI searches with your API key', 'auth.welcome': 'Welcome!', 'auth.signedOut': 'Signed out', 'auth.invalidEmail': 'Please enter a valid email.', 'auth.invalidName': 'Please enter your name.',
      'search.tab.reverse': 'Find original', 'search.placeholder.reverse': 'Describe the item you spotted, e.g. "black quilted chain bag"...', 'search.btnReverse': 'Find original', 'search.btnSource': 'Identify it', 'search.subtab.describe': 'Describe', 'search.subtab.photo': 'Photo', 'search.subtab.link': 'Link',
      'reverse.loading': 'Identifying the luxury original\u2026', 'reverse.loadingSub': 'Matching your item to designer collections', 'reverse.eyebrow': 'Sourced Original', 'reverse.title': 'We found the original', 'reverse.for': 'Original identified for', 'reverse.originalLabel': 'The Original', 'reverse.identifiedAs': 'Identified as', 'reverse.dupeBelow': 'Spotted Alternatives',
      'results.loading.title': 'Our AI is analysing your item\u2026', 'results.loading.sub': 'Finding the best alternatives across 6 stores',
      'share.whatsapp': 'WhatsApp', 'share.copy': 'Copy link', 'share.copied': 'Copied!',
      'share.text': 'Check out this find: {name} from {store} for just {price} \u2014 spotted on ALTERE',
      'share.results': 'Share results', 'share.story': 'Download for Stories', 'share.story.footer': 'Found with ALTERE', 'share.story.downloaded': 'Story image downloaded',
      'invite.eyebrow': 'Spread the Word', 'invite.title': 'Share ALTERE with friends', 'invite.sub': 'Know someone who loves fashion but hates overpaying? Send them our way.', 'invite.copyLink': 'Copy link',
      'invite.message': 'Check out ALTERE \u2014 AI fashion visual search. Snap any item and it finds the exact piece, every store and price (plus smarter alternatives)!'
    },
    nl: {
      'nav.discover': 'Ontdek', 'nav.brands': 'Merken', 'nav.saved': 'Opgeslagen', 'nav.signin': 'Inloggen',
      'hero.eyebrow': 'AI-Gestuurde Mode Ontdekking',
      'hero.headline': 'Spot het.<br>Wij vinden het.',
      'hero.sub': 'Zie je een item op social media, op straat of op tv? Upload een foto en onze AI identificeert het exacte item \u2014 met alle winkels en prijzen. Te duur? We tonen ook slimmere alternatieven.',
      'search.tab.link': 'Link plakken', 'search.tab.upload': 'Foto uploaden', 'search.tab.text': 'Alternatieven',
      'search.placeholder.link': 'Plak een product-URL van een modesite...',
      'search.placeholder.text': 'Beschrijf het item, bijv. "cr\u00e8me satijnen midi rok"...',
      'search.btn': 'Vind alternatieven',
      'search.tab.reverse': 'Vind origineel', 'search.btnReverse': 'Vind origineel', 'search.btnSource': 'Identificeer', 'search.subtab.describe': 'Beschrijf', 'search.subtab.photo': 'Foto', 'search.subtab.link': 'Link', 'search.placeholder.reverse': 'Beschrijf het item dat je spotte, bijv. "zwarte gewatteerde ketting-tas"...',
      'search.upload.hint': 'Sleep of <strong>blader</strong>',
      'search.upload.formats': 'JPG, PNG of WEBP tot 10 MB',
      'search.upload.ready': 'Klaar om te zoeken',
      'search.status': 'AI identificeert je item',
      'search.tab.camera': 'Maak foto', 'camera.start': 'Tik om camera te openen', 'camera.hint': 'Richt op een item \u2014 wij identificeren het.', 'camera.retake': 'Opnieuw', 'camera.use': 'Identificeer', 'camera.error': 'Kan camera niet openen. Controleer de machtigingen.',
      'recent.label': 'Recent', 'recent.clear': 'Wissen',
      'trending.label': 'Trending nu',
      'hero.searching': 'Zoeken bij', 'hero.scroll': 'Scroll om te ontdekken',
      'dotd.eyebrow': 'Vandaag Gespot', 'dotd.original': 'Het Origineel', 'dotd.dupe': 'Slim alternatief', 'dotd.vs': 'VS', 'dotd.btn': 'Shop het',
      'calc.eyebrow': 'Slim Shoppen', 'calc.title': 'Hoeveel kun je besparen?', 'calc.sub': 'Hetzelfde item, verschillende winkels \u2014 zie wat slim shoppen je scheelt.', 'calc.budget': 'Maandelijks modebudget', 'calc.perMonth': 'Per maand', 'calc.perYear': 'Per jaar', 'calc.fiveYears': 'In 5 jaar', 'calc.note': 'Gebaseerd op het gemiddelde prijsverschil dat we vinden voor dezelfde look tussen winkels en alternatieven.',
      'celeb.eyebrow': 'Stijlinspiratie', 'celeb.title': 'Krijg de look', 'celeb.sub': 'Spot de aesthetic \u2014 wij vinden de items.', 'celeb.btn': 'Shop de look',
      'celeb.c1.name': 'The Quiet Luxury', 'celeb.c1.desc': 'Ingetogen elegantie. Neutrale tinten, kasjmier en strakke silhouetten ge\u00efnspireerd door old-money minimalisme.',
      'celeb.c2.name': 'Street Chic', 'celeb.c2.desc': 'Gedurfd, zelfverzekerd en moeiteloos. Oversized blazers, leren broeken en opvallende sneakers recht van fashion week.',
      'celeb.c3.name': 'Old Money', 'celeb.c3.desc': 'Preppy meets gepolijst. Maatwerkjassen, parelaccenten, loafers en gestructureerde tassen die rijkdom fluisteren.',
      'celeb.c4.name': 'French Girl', 'celeb.c4.desc': 'Moeiteloos chic. Bretonse strepen, midirokken, ballerina\u2019s en dat perfect nonchalante Parijse je ne sais quoi.',
      'cookie.text': 'We gebruiken cookies om je ervaring te verbeteren.', 'cookie.accept': 'Alles accepteren', 'cookie.manage': 'Voorkeuren beheren',
      'about.mission': 'Luxe esthetiek, betaalbare prijzen.', 'about.storyEyebrow': 'Ons Verhaal', 'about.storyTitle': 'Mode moet er voor iedereen zijn',
      'about.storyP1': 'ALTERE is ontstaan uit een simpele frustratie: verliefd worden op een catwalk-stuk en dan het prijskaartje zien. Wij geloven dat geweldige stijl geen vermogen zou moeten kosten.',
      'about.storyP2': 'Dus bouwden we een AI die mode ziet zoals een stylist dat doet \u2014 stof, snit, kleur en silhouet analyseert \u2014 en vervolgens duizenden producten doorzoekt om de beste match te vinden voor een fractie van de prijs.',
      'about.howEyebrow': 'De Technologie', 'about.howTitle': 'Hoe onze AI werkt',
      'about.step1Title': 'Visuele deconstructie', 'about.step1Desc': 'Ons model ontleedt elk mode-item in kernattributen: materiaal, textuur, vorm, verhoudingen, kleurenpalet en constructiedetails.',
      'about.step2Title': 'Cross-store matching', 'about.step2Desc': 'We scannen voorraden van Zara, H&M, Mango, ASOS, COS en & Other Stories in realtime, en scoren elk product op vele stijldimensies.',
      'about.step3Title': 'Slimme rangschikking', 'about.step3Desc': 'Resultaten worden gerangschikt op match-nauwkeurigheid, prijs en beschikbaarheid \u2014 zodat het exacte item, en daarna de beste alternatieven, altijd bovenaan staan.',
      'about.teamEyebrow': 'Wie Wij Zijn', 'about.teamTitle': 'Opgericht door modeliefhebbers,<br>aangedreven door AI',
      'about.teamDesc': 'We zijn een klein team van ontwerpers, engineers en mode-obsessieven met \u00e9\u00e9n missie: stijl democratiseren. Elke functie begint met dezelfde vraag: helpt dit iemand er fantastisch uit te zien zonder te veel uit te geven?',
      'about.cta': 'Begin met items identificeren',
      'faq.eyebrow': 'Ondersteuning', 'faq.title': 'Veelgestelde vragen',
      'faq.q1': 'Hoe identificeert de AI items?', 'faq.a1': 'Ons AI-visiemodel analyseert het item op je foto, link of beschrijving \u2014 en breekt het af in stof, snit, kleur, silhouet en constructie. Vervolgens identificeert het het exacte item en waar je het koopt, en als je liever minder uitgeeft, tonen we de dichtstbijzijnde alternatieven gerangschikt op nauwkeurigheid.',
      'faq.q2': 'Zijn de links affiliate links?', 'faq.a2': 'Sommige links kunnen affiliate links zijn, wat betekent dat we een kleine commissie verdienen bij een aankoop \u2014 zonder extra kosten voor jou. Commissies bepalen nooit welke items we tonen; resultaten worden puur op matchkwaliteit gerangschikt.',
      'faq.q3': 'Is ALTERE gratis?', 'faq.a3': 'Ja, ALTERE is volledig gratis. Je kunt onbeperkt zoeken, favorieten opslaan en delen \u2014 zonder account of betaling. We houden de kernervaring altijd gratis.',
      'faq.q4': 'Hoe nauwkeurig zijn de matchpercentages?', 'faq.a4': 'Matchpercentages geven aan hoe nauw een gevonden item het origineel benadert op vele stijldimensies. Een score boven 90% betekent visueel zeer dichtbij; 80\u201390% duidt op sterke gelijkenis met kleine verschillen.',
      'faq.q5': 'Kan ik een winkel voorstellen?', 'faq.a5': 'Absoluut! We zijn altijd op zoek naar uitbreiding. Stuur ons de winkelnaam en we evalueren het. Populaire verzoeken zijn Uniqlo, Arket en Massimo Dutti \u2014 allemaal op onze roadmap.',
      'results.eyebrow': 'Meest Gezocht',
      'results.title': 'De meest gespotte items van de week',
      'results.subtitle': 'Deze week gecureerd \u2014 direct shopbaar.',
      'filter.category': 'Categorie', 'filter.bags': 'Tassen', 'filter.shoes': 'Schoenen', 'filter.clothing': 'Kleding', 'filter.jewellery': 'Sieraden', 'filter.accessories': 'Accessoires',
      'filter.price': 'Prijs', 'filter.all': 'Alles', 'filter.store': 'Winkel', 'filter.allStores': 'Alle Winkels', 'filter.sortBy': 'Sorteer op',
      'sort.match': 'Beste match', 'sort.priceAsc': 'Prijs: Laag naar Hoog', 'sort.priceDesc': 'Prijs: Hoog naar Laag', 'sort.saving': 'Grootste besparing',
      'how.eyebrow': 'Hoe het werkt', 'how.title': 'In drie stappen naar wat je zoekt',
      'demo.eyebrow': 'Zie het in actie', 'demo.title': 'Gespot tot gevonden, in seconden', 'demo.sub': 'Richt je camera op elk item en zie hoe ALTERE het exacte stuk identificeert \u2014 en je toont waar je het koopt.', 'demo.step1': 'Maak een foto', 'demo.step2': 'Wij identificeren het origineel', 'demo.step3': 'Alle winkels & prijzen',
      'how.step1.title': 'Upload of plak', 'how.step1.desc': 'Deel een foto, productlink of beschrijving van elk fashion item \u2014 luxe of high-street.',
      'how.step2.title': 'AI-analyse', 'how.step2.desc': 'Ons model ontleedt stof, snit, kleur en silhouet in seconden.',
      'how.step3.title': 'Ontdek alternatieven', 'how.step3.desc': 'Bekijk gerangschikte alternatieven met matchscores, prijzen en directe winkellinks.',
      'waitlist.eyebrow': 'Vroege Toegang', 'waitlist.title': 'Wees de eerste<br>die het weet bij lancering',
      'waitlist.sub': 'Sluit je aan bij duizenden modeliefhebbers op de lijst.',
      'waitlist.placeholder': 'Vul je e-mailadres in', 'waitlist.btn': 'Schrijf je in',
      'waitlist.hint': 'Geen spam, ooit. Schrijf je op elk moment uit.',
      'waitlist.success.title': 'Je staat op de lijst', 'waitlist.success.desc': 'We laten je weten zodra ALTERE live is.',
      'saved.back': 'Terug', 'saved.eyebrow': 'Jouw Collectie', 'saved.title': 'Opgeslagen Items', 'saved.clearAll': 'Alles wissen',
      'saved.empty': 'Nog geen opgeslagen items', 'saved.emptyHint': 'Tik op het hartje om een item hier op te slaan',
      'footer.tagline': 'AI fashion visual search. Spot it, wij sourcen het.',
      'footer.explore': 'Ontdek', 'footer.trending': 'Trending', 'footer.newArrivals': 'Nieuw binnen', 'footer.collections': 'Collecties',
      'footer.company': 'Bedrijf', 'footer.about': 'Over ons', 'footer.careers': 'Vacatures', 'footer.privacy': 'Privacy', 'footer.terms': 'Voorwaarden',
      'toast.saved': 'Opgeslagen in je collectie', 'toast.removed': 'Verwijderd uit opgeslagen', 'toast.cleared': 'Alle opgeslagen items gewist',
      'search.searching': 'Zoeken...', 'search.joining': 'Aanmelden...',
      'results.ai.eyebrow': 'AI Resultaten', 'results.ai.title': 'Je resultaten zijn klaar', 'results.demo.eyebrow': 'Demoresultaten', 'results.demo.hint': 'Voeg je API-sleutel toe in instellingen voor echte AI-resultaten', 'results.bestDupe': 'Beste match', 'results.moreAlts': 'Spotted Alternatives',
      'results.loading.title': 'Onze AI analyseert je item\u2026', 'results.loading.sub': 'De beste alternatieven zoeken bij 6 winkels',
      'share.whatsapp': 'WhatsApp', 'share.copy': 'Link kopi\u00ebren', 'share.copied': 'Gekopieerd!',
      'share.text': 'Bekijk deze vondst: {name} van {store} voor slechts {price} \u2014 gespot op ALTERE',
      'share.results': 'Resultaten delen', 'share.story': 'Download voor Stories', 'share.story.footer': 'Gevonden met ALTERE', 'share.story.downloaded': 'Story-afbeelding gedownload',
      'invite.eyebrow': 'Vertel het Verder', 'invite.title': 'Deel ALTERE met vrienden', 'invite.sub': 'Ken je iemand die van mode houdt maar niet te veel wil betalen? Stuur ze onze kant op.', 'invite.copyLink': 'Link kopi\u00ebren',
      'invite.message': 'Bekijk ALTERE \u2014 AI fashion visual search. Fotografeer elk item en het vindt het exacte stuk, alle winkels en prijzen (plus slimmere alternatieven)!'
    },
    fr: {
      'nav.discover': 'D\u00e9couvrir', 'nav.brands': 'Marques', 'nav.saved': 'Sauv\u00e9s', 'nav.signin': 'Connexion',
      'hero.eyebrow': 'D\u00e9couverte Mode par IA',
      'hero.headline': 'Rep\u00e9rez-le.<br>On le trouve.',
      'hero.sub': 'Vous rep\u00e9rez une pi\u00e8ce sur les r\u00e9seaux, dans la rue ou \u00e0 la t\u00e9l\u00e9 ? Envoyez une photo et notre IA identifie l\u2019article exact \u2014 avec toutes les boutiques et les prix. Trop cher ? Nous montrons aussi des alternatives plus malines.',
      'search.tab.link': 'Coller un lien', 'search.tab.upload': 'Uploader une photo', 'search.tab.text': 'Alternatives',
      'search.placeholder.link': 'Collez l\u2019URL d\u2019un produit de mode...',
      'search.placeholder.text': 'D\u00e9crivez l\u2019article, ex. "jupe midi en satin cr\u00e8me"...',
      'search.btn': 'Trouver des alternatives',
      'search.tab.reverse': 'Trouver l\u2019original', 'search.btnReverse': 'Trouver l\u2019original', 'search.btnSource': 'Identifier', 'search.subtab.describe': 'D\u00e9crire', 'search.subtab.photo': 'Photo', 'search.subtab.link': 'Lien', 'search.placeholder.reverse': 'D\u00e9crivez l\u2019article rep\u00e9r\u00e9, ex. "sac matelass\u00e9 \u00e0 cha\u00eene noir"...',
      'search.upload.hint': 'Glisser-d\u00e9poser ou <strong>parcourir</strong>',
      'search.upload.formats': 'JPG, PNG ou WEBP jusqu\u2019\u00e0 10 Mo',
      'search.upload.ready': 'Pr\u00eat \u00e0 rechercher',
      'search.status': 'L\u2019IA identifie votre article',
      'search.tab.camera': 'Prendre photo', 'camera.start': 'Appuyez pour ouvrir la cam\u00e9ra', 'camera.hint': 'Visez un article \u2014 nous l\u2019identifions.', 'camera.retake': 'Reprendre', 'camera.use': 'Identifier', 'camera.error': 'Impossible d\u2019acc\u00e9der \u00e0 la cam\u00e9ra. V\u00e9rifiez les permissions.',
      'recent.label': 'R\u00e9cents', 'recent.clear': 'Effacer',
      'trending.label': 'Tendances',
      'hero.searching': 'Recherche sur', 'hero.scroll': 'D\u00e9filez pour explorer',
      'dotd.eyebrow': 'Rep\u00e9r\u00e9 Aujourd\u2019hui', 'dotd.original': 'L\u2019Original', 'dotd.dupe': 'Alternative maline', 'dotd.vs': 'VS', 'dotd.btn': 'Shopper',
      'calc.eyebrow': 'Sourcing Malin', 'calc.title': 'Combien pourriez-vous \u00e9conomiser ?', 'calc.sub': 'M\u00eame article, boutiques diff\u00e9rentes \u2014 voyez ce que le sourcing malin vous fait \u00e9conomiser.', 'calc.budget': 'Budget mode mensuel', 'calc.perMonth': 'Par mois', 'calc.perYear': 'Par an', 'calc.fiveYears': 'En 5 ans', 'calc.note': 'Bas\u00e9 sur l\u2019\u00e9cart de prix moyen que nous trouvons pour le m\u00eame look entre boutiques et alternatives.',
      'celeb.eyebrow': 'Inspiration Style', 'celeb.title': 'Adoptez le look', 'celeb.sub': 'Rep\u00e9rez l\u2019esth\u00e9tique \u2014 nous trouvons les articles exacts.', 'celeb.btn': 'Shopper le look',
      'celeb.c1.name': 'The Quiet Luxury', 'celeb.c1.desc': '\u00c9l\u00e9gance discr\u00e8te. Tons neutres, cachemire et silhouettes \u00e9pur\u00e9es inspir\u00e9es du minimalisme old-money.',
      'celeb.c2.name': 'Street Chic', 'celeb.c2.desc': 'Audacieux, confiant et sans effort. Blazers oversize, pantalons en cuir et baskets statement tout droit de la fashion week.',
      'celeb.c3.name': 'Old Money', 'celeb.c3.desc': 'Preppy rencontre le raffin\u00e9. Manteaux taill\u00e9s, accents perl\u00e9s, mocassins et sacs structur\u00e9s qui murmurent la richesse.',
      'celeb.c4.name': 'French Girl', 'celeb.c4.desc': 'Chic sans effort. Rayures bretonnes, jupes midi, ballerines et ce je ne sais quoi parfaitement d\u00e9contract\u00e9.',
      'cookie.text': 'Nous utilisons des cookies pour am\u00e9liorer votre exp\u00e9rience.', 'cookie.accept': 'Tout accepter', 'cookie.manage': 'G\u00e9rer les pr\u00e9f\u00e9rences',
      'about.mission': 'Esth\u00e9tique luxe, prix accessibles.', 'about.storyEyebrow': 'Notre Histoire', 'about.storyTitle': 'La mode devrait \u00eatre pour tous',
      'about.storyP1': 'ALTERE est n\u00e9 d\u2019une frustration simple : tomber amoureux d\u2019une pi\u00e8ce de d\u00e9fil\u00e9, puis voir le prix. Nous croyons que le grand style ne devrait pas n\u00e9cessiter une fortune.',
      'about.storyP2': 'Alors nous avons cr\u00e9\u00e9 une IA qui voit la mode comme un styliste \u2014 analysant tissu, coupe, couleur et silhouette \u2014 puis parcourt des milliers de produits pour trouver le meilleur match \u00e0 une fraction du co\u00fbt.',
      'about.howEyebrow': 'La Technologie', 'about.howTitle': 'Comment fonctionne notre IA',
      'about.step1Title': 'D\u00e9construction visuelle', 'about.step1Desc': 'Notre mod\u00e8le d\u00e9compose chaque article en attributs cl\u00e9s : mati\u00e8re, texture, forme, proportions, palette de couleurs et d\u00e9tails de construction.',
      'about.step2Title': 'Matching multi-enseignes', 'about.step2Desc': 'Nous analysons les inventaires de Zara, H&M, Mango, ASOS, COS et & Other Stories en temps r\u00e9el, \u00e9valuant chaque produit sur de nombreuses dimensions de style.',
      'about.step3Title': 'Classement intelligent', 'about.step3Desc': 'Les r\u00e9sultats sont class\u00e9s par pr\u00e9cision, prix et disponibilit\u00e9 \u2014 pour que l\u2019article exact, puis les meilleures alternatives, soient toujours en t\u00eate.',
      'about.teamEyebrow': 'Qui Nous Sommes', 'about.teamTitle': 'Fond\u00e9 par des passionn\u00e9s de mode,<br>propuls\u00e9 par l\u2019IA',
      'about.teamDesc': 'Nous sommes une petite \u00e9quipe de designers, ing\u00e9nieurs et obsess\u00e9s de la mode avec une mission : d\u00e9mocratiser le style. Chaque fonctionnalit\u00e9 commence par la m\u00eame question : cela aide-t-il quelqu\u2019un \u00e0 \u00eatre \u00e9l\u00e9gant sans trop d\u00e9penser ?',
      'about.cta': 'Commencer \u00e0 identifier des articles',
      'faq.eyebrow': 'Aide', 'faq.title': 'Questions fr\u00e9quentes',
      'faq.q1': 'Comment l\u2019IA identifie-t-elle les articles ?', 'faq.a1': 'Notre mod\u00e8le de vision IA analyse l\u2019article de votre photo, lien ou description \u2014 en le d\u00e9composant en tissu, coupe, couleur, silhouette et construction. Il identifie ensuite la pi\u00e8ce exacte et o\u00f9 l\u2019acheter, et si vous pr\u00e9f\u00e9rez d\u00e9penser moins, propose les alternatives les plus proches class\u00e9es par pr\u00e9cision.',
      'faq.q2': 'Les liens sont-ils des liens d\u2019affiliation ?', 'faq.a2': 'Certains liens peuvent \u00eatre des liens d\u2019affiliation, ce qui signifie que nous touchons une petite commission lors d\u2019un achat \u2014 sans co\u00fbt suppl\u00e9mentaire pour vous. Les commissions ne d\u00e9terminent jamais quels articles sont montr\u00e9s ; les r\u00e9sultats sont class\u00e9s uniquement selon la qualit\u00e9 de correspondance.',
      'faq.q3': 'ALTERE est-il gratuit ?', 'faq.a3': 'Oui, ALTERE est enti\u00e8rement gratuit. Vous pouvez lancer des recherches illimit\u00e9es, sauvegarder vos favoris et les partager \u2014 sans compte ni paiement.',
      'faq.q4': 'Les pourcentages de correspondance sont-ils fiables ?', 'faq.a4': 'Les pourcentages refl\u00e8tent \u00e0 quel point un article trouv\u00e9 ressemble \u00e0 l\u2019original sur de nombreuses dimensions de style. Au-dessus de 90%, la ressemblance est tr\u00e8s forte ; 80\u201390% indique une bonne ressemblance avec des diff\u00e9rences mineures.',
      'faq.q5': 'Puis-je sugg\u00e9rer un magasin \u00e0 ajouter ?', 'faq.a5': 'Bien s\u00fbr ! Nous cherchons toujours \u00e0 \u00e9tendre notre r\u00e9seau. Envoyez-nous le nom du magasin. Les demandes populaires incluent Uniqlo, Arket et Massimo Dutti.',
      'results.eyebrow': 'Les Plus Recherch\u00e9s',
      'results.title': 'Les plus rep\u00e9r\u00e9s de la semaine',
      'results.subtitle': 'S\u00e9lection de la semaine \u2014 pr\u00eate \u00e0 shopper.',
      'filter.category': 'Cat\u00e9gorie', 'filter.bags': 'Sacs', 'filter.shoes': 'Chaussures', 'filter.clothing': 'V\u00eatements', 'filter.jewellery': 'Bijoux', 'filter.accessories': 'Accessoires',
      'filter.price': 'Prix', 'filter.all': 'Tout', 'filter.store': 'Magasin', 'filter.allStores': 'Tous les Magasins', 'filter.sortBy': 'Trier par',
      'sort.match': 'Meilleure correspondance', 'sort.priceAsc': 'Prix : Croissant', 'sort.priceDesc': 'Prix : D\u00e9croissant', 'sort.saving': 'Plus grande \u00e9conomie',
      'how.eyebrow': 'Comment \u00e7a marche', 'how.title': 'Trois \u00e9tapes pour trouver ce que vous aimez',
      'demo.eyebrow': 'Voir en action', 'demo.title': 'Rep\u00e9r\u00e9 puis trouv\u00e9, en secondes', 'demo.sub': 'Pointez votre cam\u00e9ra vers une pi\u00e8ce et regardez ALTERE identifier l\u2019article exact \u2014 puis vous montrer o\u00f9 l\u2019acheter.', 'demo.step1': 'Prenez une photo', 'demo.step2': 'Nous identifions l\u2019original', 'demo.step3': 'Toutes les boutiques & prix',
      'how.step1.title': 'Uploadez ou collez', 'how.step1.desc': 'Partagez une photo, un lien ou une description de tout article de mode \u2014 luxe ou fast-fashion.',
      'how.step2.title': 'Analyse IA', 'how.step2.desc': 'Notre mod\u00e8le de vision d\u00e9construit tissu, coupe, couleur et silhouette en secondes.',
      'how.step3.title': 'D\u00e9couvrez les alternatives', 'how.step3.desc': 'Parcourez des alternatives class\u00e9es avec scores, prix et liens directs.',
      'waitlist.eyebrow': 'Acc\u00e8s Anticip\u00e9', 'waitlist.title': 'Soyez les premiers inform\u00e9s<br>du lancement',
      'waitlist.sub': 'Rejoignez des milliers de passionn\u00e9s de mode d\u00e9j\u00e0 inscrits.',
      'waitlist.placeholder': 'Entrez votre adresse e-mail', 'waitlist.btn': 'Rejoindre la liste',
      'waitlist.hint': 'Pas de spam, jamais. D\u00e9sinscription \u00e0 tout moment.',
      'waitlist.success.title': 'Vous \u00eates sur la liste', 'waitlist.success.desc': 'Nous vous pr\u00e9viendrons d\u00e8s qu\u2019ALTERE sera en ligne.',
      'saved.back': 'Retour', 'saved.eyebrow': 'Votre Collection', 'saved.title': 'Articles Sauv\u00e9s', 'saved.clearAll': 'Tout effacer',
      'saved.empty': 'Aucun article sauv\u00e9', 'saved.emptyHint': 'Appuyez sur le c\u0153ur pour sauvegarder un article ici',
      'footer.tagline': 'Recherche visuelle mode par IA. Rep\u00e9rez-le, on le trouve.',
      'footer.explore': 'Explorer', 'footer.trending': 'Tendances', 'footer.newArrivals': 'Nouveaut\u00e9s', 'footer.collections': 'Collections',
      'footer.company': 'Entreprise', 'footer.about': '\u00c0 propos', 'footer.careers': 'Carri\u00e8res', 'footer.privacy': 'Confidentialit\u00e9', 'footer.terms': 'Conditions',
      'toast.saved': 'Sauv\u00e9 dans votre collection', 'toast.removed': 'Retir\u00e9 des sauvegardes', 'toast.cleared': 'Tous les articles sauv\u00e9s effac\u00e9s',
      'search.searching': 'Recherche...', 'search.joining': 'Inscription...',
      'results.ai.eyebrow': 'R\u00e9sultats IA', 'results.ai.title': 'Vos r\u00e9sultats sont pr\u00eats', 'results.demo.eyebrow': 'R\u00e9sultats d\u00e9mo', 'results.demo.hint': 'Ajoutez votre cl\u00e9 API dans les param\u00e8tres pour de vrais r\u00e9sultats IA', 'results.bestDupe': 'Meilleure correspondance', 'results.moreAlts': 'Spotted Alternatives',
      'results.loading.title': 'Notre IA analyse votre article\u2026', 'results.loading.sub': 'Recherche des meilleures alternatives dans 6 magasins',
      'share.whatsapp': 'WhatsApp', 'share.copy': 'Copier le lien', 'share.copied': 'Copi\u00e9 !',
      'share.text': 'Regardez cette trouvaille : {name} de {store} pour seulement {price} \u2014 rep\u00e9r\u00e9 sur ALTERE',
      'share.results': 'Partager les r\u00e9sultats', 'share.story': 'T\u00e9l\u00e9charger pour Stories', 'share.story.footer': 'Trouv\u00e9 avec ALTERE', 'share.story.downloaded': 'Image story t\u00e9l\u00e9charg\u00e9e',
      'invite.eyebrow': 'Faites Passer le Mot', 'invite.title': 'Partagez ALTERE avec vos amis', 'invite.sub': 'Vous connaissez quelqu\u2019un qui aime la mode mais d\u00e9teste surpayer ? Envoyez-le chez nous.', 'invite.copyLink': 'Copier le lien',
      'invite.message': 'D\u00e9couvrez ALTERE \u2014 la recherche visuelle mode par IA. Photographiez un article et elle trouve la pi\u00e8ce exacte, toutes les boutiques et les prix (et des alternatives plus malines) !'
    },
    de: {
      'nav.discover': 'Entdecken', 'nav.brands': 'Marken', 'nav.saved': 'Gespeichert', 'nav.signin': 'Anmelden',
      'hero.eyebrow': 'KI-gest\u00fctzte Mode-Entdeckung',
      'hero.headline': 'Entdeckt.<br>Wir finden es.',
      'hero.sub': 'Etwas auf Social Media, auf der Stra\u00dfe oder im TV entdeckt? Lade ein Foto hoch und unsere KI identifiziert das exakte Teil \u2014 mit allen Shops und Preisen. Zu teuer? Wir zeigen auch clevere Alternativen.',
      'search.tab.link': 'Link einf\u00fcgen', 'search.tab.upload': 'Foto hochladen', 'search.tab.text': 'Alternativen',
      'search.placeholder.link': 'Produkt-URL von einer Modeseite einf\u00fcgen...',
      'search.placeholder.text': 'Artikel beschreiben, z.B. "cremefarbener Satin-Midirock"...',
      'search.btn': 'Alternativen finden',
      'search.tab.reverse': 'Original finden', 'search.btnReverse': 'Original finden', 'search.btnSource': 'Identifizieren', 'search.subtab.describe': 'Beschreiben', 'search.subtab.photo': 'Foto', 'search.subtab.link': 'Link', 'search.placeholder.reverse': 'Beschreibe das entdeckte Teil, z.B. "schwarze gesteppte Kettentasche"...',
      'search.upload.hint': 'Ziehen & ablegen oder <strong>durchsuchen</strong>',
      'search.upload.formats': 'JPG, PNG oder WEBP bis 10 MB',
      'search.upload.ready': 'Bereit zum Suchen',
      'search.status': 'KI identifiziert dein Teil',
      'search.tab.camera': 'Foto machen', 'camera.start': 'Tippen um Kamera zu \u00f6ffnen', 'camera.hint': 'Richte auf ein Teil \u2014 wir identifizieren es.', 'camera.retake': 'Nochmal', 'camera.use': 'Identifizieren', 'camera.error': 'Kamera konnte nicht ge\u00f6ffnet werden. Bitte Berechtigungen pr\u00fcfen.',
      'recent.label': 'K\u00fcrzlich', 'recent.clear': 'L\u00f6schen',
      'trending.label': 'Jetzt im Trend',
      'hero.searching': 'Suche bei', 'hero.scroll': 'Scrollen zum Entdecken',
      'dotd.eyebrow': 'Heute Gespottet', 'dotd.original': 'Das Original', 'dotd.dupe': 'Clevere Alternative', 'dotd.vs': 'VS', 'dotd.btn': 'Shoppen',
      'calc.eyebrow': 'Cleveres Sourcing', 'calc.title': 'Wie viel k\u00f6nntest du sparen?', 'calc.sub': 'Gleiches Teil, verschiedene Shops \u2014 sieh, was cleveres Sourcing dir spart.', 'calc.budget': 'Monatliches Modebudget', 'calc.perMonth': 'Pro Monat', 'calc.perYear': 'Pro Jahr', 'calc.fiveYears': 'In 5 Jahren', 'calc.note': 'Basierend auf dem durchschnittlichen Preisunterschied, den wir f\u00fcr denselben Look zwischen Shops und Alternativen finden.',
      'celeb.eyebrow': 'Stil-Inspiration', 'celeb.title': 'Hol dir den Look', 'celeb.sub': 'Spotte die \u00c4sthetik \u2014 wir finden die exakten Teile.', 'celeb.btn': 'Look shoppen',
      'celeb.c1.name': 'The Quiet Luxury', 'celeb.c1.desc': 'Zur\u00fcckhaltende Eleganz. Neutrale T\u00f6ne, Kaschmir und klare Silhouetten inspiriert von Old-Money-Minimalismus.',
      'celeb.c2.name': 'Street Chic', 'celeb.c2.desc': 'Mutig, selbstbewusst und m\u00fchelos. Oversized Blazer, Lederhosen und Statement-Sneaker direkt von der Fashion Week.',
      'celeb.c3.name': 'Old Money', 'celeb.c3.desc': 'Preppy trifft Eleganz. Ma\u00dfgeschneiderte M\u00e4ntel, Perlenakzente, Loafer und strukturierte Taschen, die Reichtum fl\u00fcstern.',
      'celeb.c4.name': 'French Girl', 'celeb.c4.desc': 'M\u00fchelos schick. Breton-Streifen, Midir\u00f6cke, Ballerinas und das perfekt ungezwungene Pariser Je ne sais quoi.',
      'cookie.text': 'Wir verwenden Cookies, um Ihre Erfahrung zu verbessern.', 'cookie.accept': 'Alle akzeptieren', 'cookie.manage': 'Einstellungen verwalten',
      'about.mission': 'Luxus-\u00c4sthetik, bezahlbare Preise.', 'about.storyEyebrow': 'Unsere Geschichte', 'about.storyTitle': 'Mode sollte f\u00fcr alle sein',
      'about.storyP1': 'ALTERE entstand aus einer einfachen Frustration: sich in ein Laufsteg-Piece zu verlieben und dann das Preisschild zu sehen. Wir glauben, dass gro\u00dfartiger Stil kein Verm\u00f6gen kosten sollte.',
      'about.storyP2': 'Also bauten wir eine KI, die Mode so sieht wie ein Stylist \u2014 Stoff, Schnitt, Farbe und Silhouette analysiert \u2014 und dann tausende Produkte durchsucht, um den besten Match zu einem Bruchteil des Preises zu finden.',
      'about.howEyebrow': 'Die Technologie', 'about.howTitle': 'Wie unsere KI funktioniert',
      'about.step1Title': 'Visuelle Dekonstruktion', 'about.step1Desc': 'Unser Modell zerlegt jedes Mode-Item in Kernattribute: Material, Textur, Form, Proportionen, Farbpalette und Konstruktionsdetails.',
      'about.step2Title': 'Cross-Store-Matching', 'about.step2Desc': 'Wir scannen Best\u00e4nde von Zara, H&M, Mango, ASOS, COS und & Other Stories in Echtzeit und bewerten jedes Produkt auf viele Stildimensionen.',
      'about.step3Title': 'Intelligentes Ranking', 'about.step3Desc': 'Ergebnisse werden nach Match-Genauigkeit, Preis und Verf\u00fcgbarkeit sortiert \u2014 damit das exakte Teil und danach die besten Alternativen immer oben stehen.',
      'about.teamEyebrow': 'Wer Wir Sind', 'about.teamTitle': 'Gegr\u00fcndet von Modeliebhabern,<br>angetrieben von KI',
      'about.teamDesc': 'Wir sind ein kleines Team aus Designern, Ingenieuren und Mode-Besessenen mit einer Mission: Stil zu demokratisieren. Jede Funktion beginnt mit derselben Frage: Hilft das jemandem, unglaublich auszusehen, ohne zu viel auszugeben?',
      'about.cta': 'Jetzt Teile identifizieren',
      'faq.eyebrow': 'Hilfe', 'faq.title': 'H\u00e4ufig gestellte Fragen',
      'faq.q1': 'Wie identifiziert die KI Teile?', 'faq.a1': 'Unser KI-Vision-Modell analysiert das Teil auf deinem Foto, Link oder in deiner Beschreibung \u2014 und zerlegt es in Stoff, Schnitt, Farbe, Silhouette und Verarbeitung. Dann identifiziert es das exakte Teil und wo du es kaufst, und wenn du lieber weniger ausgibst, zeigt es die n\u00e4chstliegenden Alternativen, sortiert nach Genauigkeit.',
      'faq.q2': 'Sind die Links Affiliate-Links?', 'faq.a2': 'Einige Links k\u00f6nnen Affiliate-Links sein, was bedeutet, dass wir bei einem Kauf eine kleine Provision erhalten \u2014 ohne Mehrkosten f\u00fcr dich. Provisionen bestimmen niemals, welche Teile angezeigt werden; Ergebnisse werden rein nach Match-Qualit\u00e4t sortiert.',
      'faq.q3': 'Ist ALTERE kostenlos?', 'faq.a3': 'Ja, ALTERE ist v\u00f6llig kostenlos. Du kannst unbegrenzt suchen, Favoriten speichern und teilen \u2014 ohne Konto oder Zahlung.',
      'faq.q4': 'Wie genau sind die Match-Prozents\u00e4tze?', 'faq.a4': 'Die Prozents\u00e4tze zeigen, wie genau ein gefundenes Teil dem Original auf viele Stildimensionen entspricht. \u00dcber 90% bedeutet sehr hohe \u00c4hnlichkeit; 80\u201390% zeigt starke \u00c4hnlichkeit mit kleinen Unterschieden.',
      'faq.q5': 'Kann ich ein Gesch\u00e4ft vorschlagen?', 'faq.a5': 'Nat\u00fcrlich! Wir suchen immer nach Erweiterungen. Senden Sie uns den Gesch\u00e4ftsnamen. Beliebte Anfragen sind Uniqlo, Arket und Massimo Dutti.',
      'results.eyebrow': 'Am meisten gesucht',
      'results.title': 'Die meistgespotteten Teile der Woche',
      'results.subtitle': 'Diese Woche kuratiert \u2014 direkt shoppbar.',
      'filter.category': 'Kategorie', 'filter.bags': 'Taschen', 'filter.shoes': 'Schuhe', 'filter.clothing': 'Kleidung', 'filter.jewellery': 'Schmuck', 'filter.accessories': 'Accessoires',
      'filter.price': 'Preis', 'filter.all': 'Alle', 'filter.store': 'Gesch\u00e4ft', 'filter.allStores': 'Alle Gesch\u00e4fte', 'filter.sortBy': 'Sortieren nach',
      'sort.match': 'Beste \u00dcbereinstimmung', 'sort.priceAsc': 'Preis: Aufsteigend', 'sort.priceDesc': 'Preis: Absteigend', 'sort.saving': 'Gr\u00f6\u00dfte Ersparnis',
      'how.eyebrow': 'So funktioniert es', 'how.title': 'In drei Schritten finden, was du liebst',
      'demo.eyebrow': 'In Aktion sehen', 'demo.title': 'Entdeckt bis gefunden, in Sekunden', 'demo.sub': 'Richte deine Kamera auf ein Teil und sieh, wie ALTERE das exakte St\u00fcck identifiziert \u2014 und dir zeigt, wo du es kaufst.', 'demo.step1': 'Mach ein Foto', 'demo.step2': 'Wir identifizieren das Original', 'demo.step3': 'Alle Shops & Preise',
      'how.step1.title': 'Hochladen oder einf\u00fcgen', 'how.step1.desc': 'Teile ein Foto, einen Produktlink oder eine Beschreibung jedes Mode-Items \u2014 Luxus oder High-Street.',
      'how.step2.title': 'KI-Analyse', 'how.step2.desc': 'Unser Modell analysiert Stoff, Schnitt, Farbe und Silhouette in Sekunden.',
      'how.step3.title': 'Alternativen entdecken', 'how.step3.desc': 'Durchst\u00f6bere bewertete Alternativen mit Match-Scores, Preisen und direkten Shop-Links.',
      'waitlist.eyebrow': 'Fr\u00fcher Zugang', 'waitlist.title': 'Erfahre als Erste/r<br>vom Launch',
      'waitlist.sub': 'Schlie\u00dfe dich tausenden Modebegeisterten auf der Liste an.',
      'waitlist.placeholder': 'E-Mail-Adresse eingeben', 'waitlist.btn': 'Auf die Warteliste',
      'waitlist.hint': 'Kein Spam, niemals. Jederzeit abmeldbar.',
      'waitlist.success.title': 'Du bist auf der Liste', 'waitlist.success.desc': 'Wir benachrichtigen dich, sobald ALTERE live ist.',
      'saved.back': 'Zur\u00fcck', 'saved.eyebrow': 'Deine Kollektion', 'saved.title': 'Gespeicherte Artikel', 'saved.clearAll': 'Alle l\u00f6schen',
      'saved.empty': 'Noch keine gespeicherten Artikel', 'saved.emptyHint': 'Tippe auf das Herz, um ein Teil hier zu speichern',
      'footer.tagline': 'KI-Mode-Bildersuche. Entdecke es, wir finden es.',
      'footer.explore': 'Entdecken', 'footer.trending': 'Trends', 'footer.newArrivals': 'Neuheiten', 'footer.collections': 'Kollektionen',
      'footer.company': 'Unternehmen', 'footer.about': '\u00dcber uns', 'footer.careers': 'Karriere', 'footer.privacy': 'Datenschutz', 'footer.terms': 'AGB',
      'toast.saved': 'In deiner Kollektion gespeichert', 'toast.removed': 'Aus Gespeicherten entfernt', 'toast.cleared': 'Alle gespeicherten Artikel gel\u00f6scht',
      'search.searching': 'Suche...', 'search.joining': 'Anmelden...',
      'results.ai.eyebrow': 'KI-Ergebnisse', 'results.ai.title': 'Deine Ergebnisse sind bereit', 'results.demo.eyebrow': 'Demo-Ergebnisse', 'results.demo.hint': 'F\u00fcge deinen API-Schl\u00fcssel in den Einstellungen hinzu f\u00fcr echte KI-Ergebnisse', 'results.bestDupe': 'Beste \u00dcbereinstimmung', 'results.moreAlts': 'Spotted Alternatives',
      'results.loading.title': 'Unsere KI analysiert deinen Artikel\u2026', 'results.loading.sub': 'Suche nach den besten Alternativen in 6 Gesch\u00e4ften',
      'share.whatsapp': 'WhatsApp', 'share.copy': 'Link kopieren', 'share.copied': 'Kopiert!',
      'share.text': 'Schau dir diesen Fund an: {name} von {store} f\u00fcr nur {price} \u2014 entdeckt auf ALTERE',
      'share.results': 'Ergebnisse teilen', 'share.story': 'F\u00fcr Stories herunterladen', 'share.story.footer': 'Gefunden mit ALTERE', 'share.story.downloaded': 'Story-Bild heruntergeladen',
      'invite.eyebrow': 'Weitersagen', 'invite.title': 'Teile ALTERE mit Freunden', 'invite.sub': 'Kennst du jemanden, der Mode liebt, aber nicht zu viel ausgeben will? Schick sie zu uns.', 'invite.copyLink': 'Link kopieren',
      'invite.message': 'Schau dir ALTERE an \u2014 KI-Mode-Bildersuche. Fotografiere ein Teil und sie findet das exakte St\u00fcck, alle Shops und Preise (plus clevere Alternativen)!'
    },
    es: {
      'nav.discover': 'Descubrir', 'nav.brands': 'Marcas', 'nav.saved': 'Guardados', 'nav.signin': 'Iniciar sesi\u00f3n',
      'hero.eyebrow': 'Descubrimiento de Moda con IA',
      'hero.headline': 'Lo viste.<br>Nosotros lo encontramos.',
      'hero.sub': '\u00bfVes una prenda en redes, en la calle o en la tele? Sube una foto y nuestra IA identifica el art\u00edculo exacto \u2014 con todas las tiendas y precios. \u00bfDemasiado caro? Tambi\u00e9n te mostramos alternativas m\u00e1s inteligentes.',
      'search.tab.link': 'Pegar enlace', 'search.tab.upload': 'Subir foto', 'search.tab.text': 'Alternativas',
      'search.placeholder.link': 'Pega la URL de un producto de cualquier tienda de moda...',
      'search.placeholder.text': 'Describe el art\u00edculo, ej. "falda midi de sat\u00e9n crema"...',
      'search.btn': 'Buscar alternativas',
      'search.tab.reverse': 'Buscar original', 'search.btnReverse': 'Buscar original', 'search.btnSource': 'Identificar', 'search.subtab.describe': 'Describir', 'search.subtab.photo': 'Foto', 'search.subtab.link': 'Enlace', 'search.placeholder.reverse': 'Describe la prenda que viste, ej. "bolso acolchado con cadena negro"...',
      'search.upload.hint': 'Arrastra o <strong>explora</strong>',
      'search.upload.formats': 'JPG, PNG o WEBP hasta 10 MB',
      'search.upload.ready': 'Listo para buscar',
      'search.status': 'La IA identifica tu art\u00edculo',
      'search.tab.camera': 'Tomar foto', 'camera.start': 'Toca para abrir la c\u00e1mara', 'camera.hint': 'Apunta a cualquier prenda \u2014 la identificamos.', 'camera.retake': 'Repetir', 'camera.use': 'Identificar', 'camera.error': 'No se pudo acceder a la c\u00e1mara. Verifica los permisos.',
      'recent.label': 'Recientes', 'recent.clear': 'Borrar',
      'trending.label': 'Tendencia ahora',
      'hero.searching': 'Buscando en', 'hero.scroll': 'Despl\u00e1zate para explorar',
      'dotd.eyebrow': 'Visto Hoy', 'dotd.original': 'El Original', 'dotd.dupe': 'Alternativa inteligente', 'dotd.vs': 'VS', 'dotd.btn': 'Comprarlo',
      'calc.eyebrow': 'Compra Inteligente', 'calc.title': '\u00bfCu\u00e1nto podr\u00edas ahorrar?', 'calc.sub': 'El mismo art\u00edculo, distintas tiendas \u2014 mira lo que ahorras comprando con cabeza.', 'calc.budget': 'Presupuesto mensual de moda', 'calc.perMonth': 'Al mes', 'calc.perYear': 'Al a\u00f1o', 'calc.fiveYears': 'En 5 a\u00f1os', 'calc.note': 'Basado en la diferencia de precio media que encontramos para el mismo look entre tiendas y alternativas.',
      'celeb.eyebrow': 'Inspiraci\u00f3n de Estilo', 'celeb.title': 'Consigue el look', 'celeb.sub': 'Detecta la est\u00e9tica \u2014 nosotros encontramos las prendas exactas.', 'celeb.btn': 'Comprar el look',
      'celeb.c1.name': 'The Quiet Luxury', 'celeb.c1.desc': 'Elegancia discreta. Tonos neutros, cachemira y siluetas limpias inspiradas en el minimalismo old-money.',
      'celeb.c2.name': 'Street Chic', 'celeb.c2.desc': 'Audaz, seguro y sin esfuerzo. Blazers oversize, pantalones de cuero y zapatillas statement directos de la fashion week.',
      'celeb.c3.name': 'Old Money', 'celeb.c3.desc': 'Preppy con clase. Abrigos a medida, acentos de perlas, mocasines y bolsos estructurados que susurran riqueza.',
      'celeb.c4.name': 'French Girl', 'celeb.c4.desc': 'Chic sin esfuerzo. Rayas bretonas, faldas midi, bailarinas y ese je ne sais quoi parisino perfectamente desenfadado.',
      'cookie.text': 'Usamos cookies para mejorar tu experiencia.', 'cookie.accept': 'Aceptar todo', 'cookie.manage': 'Gestionar preferencias',
      'about.mission': 'Est\u00e9tica de lujo, precios accesibles.', 'about.storyEyebrow': 'Nuestra Historia', 'about.storyTitle': 'La moda deber\u00eda ser para todos',
      'about.storyP1': 'ALTERE naci\u00f3 de una frustraci\u00f3n simple: enamorarse de una pieza de pasarela y luego ver la etiqueta de precio. Creemos que el gran estilo no deber\u00eda requerir una fortuna.',
      'about.storyP2': 'As\u00ed que construimos una IA que ve la moda como un estilista \u2014 analizando tela, corte, color y silueta \u2014 y luego recorre miles de productos para encontrar la mejor coincidencia a una fracci\u00f3n del costo.',
      'about.howEyebrow': 'La Tecnolog\u00eda', 'about.howTitle': 'C\u00f3mo funciona nuestra IA',
      'about.step1Title': 'Deconstrucci\u00f3n visual', 'about.step1Desc': 'Nuestro modelo descompone cada art\u00edculo en atributos clave: material, textura, forma, proporciones, paleta de colores y detalles de construcci\u00f3n.',
      'about.step2Title': 'B\u00fasqueda multi-tienda', 'about.step2Desc': 'Escaneamos inventarios de Zara, H&M, Mango, ASOS, COS y & Other Stories en tiempo real, evaluando cada producto en muchas dimensiones de estilo.',
      'about.step3Title': 'Ranking inteligente', 'about.step3Desc': 'Los resultados se ordenan por precisi\u00f3n, precio y disponibilidad \u2014 para que el art\u00edculo exacto, y luego las mejores alternativas, siempre est\u00e9n arriba.',
      'about.teamEyebrow': 'Qui\u00e9nes Somos', 'about.teamTitle': 'Fundado por amantes de la moda,<br>impulsado por IA',
      'about.teamDesc': 'Somos un peque\u00f1o equipo de dise\u00f1adores, ingenieros y obsesivos de la moda con una misi\u00f3n: democratizar el estilo. Cada funci\u00f3n comienza con la misma pregunta: \u00bfesto ayuda a alguien a verse incre\u00edble sin gastar de m\u00e1s?',
      'about.cta': 'Empieza a identificar art\u00edculos',
      'faq.eyebrow': 'Ayuda', 'faq.title': 'Preguntas frecuentes',
      'faq.q1': '\u00bfC\u00f3mo identifica la IA los art\u00edculos?', 'faq.a1': 'Nuestro modelo de visi\u00f3n IA analiza la prenda de tu foto, enlace o descripci\u00f3n \u2014 descomponi\u00e9ndola en tejido, corte, color, silueta y confecci\u00f3n. Luego identifica la pieza exacta y d\u00f3nde comprarla, y si prefieres gastar menos, muestra las alternativas m\u00e1s cercanas ordenadas por precisi\u00f3n.',
      'faq.q2': '\u00bfSon enlaces de afiliados?', 'faq.a2': 'Algunos enlaces pueden ser de afiliados, lo que significa que ganamos una peque\u00f1a comisi\u00f3n con tu compra \u2014 sin costo extra para ti. Las comisiones nunca deciden qu\u00e9 art\u00edculos se muestran; los resultados se ordenan solo por calidad de coincidencia.',
      'faq.q3': '\u00bfEs ALTERE gratis?', 'faq.a3': 'S\u00ed, ALTERE es completamente gratis. Puedes hacer b\u00fasquedas ilimitadas, guardar favoritos y compartirlos \u2014 sin cuenta ni pago.',
      'faq.q4': '\u00bfQu\u00e9 tan precisos son los porcentajes?', 'faq.a4': 'Los porcentajes reflejan cu\u00e1nto se parece un art\u00edculo encontrado al original en muchas dimensiones de estilo. M\u00e1s del 90% significa muy alta similitud; 80\u201390% indica fuerte parecido con diferencias menores.',
      'faq.q5': '\u00bfPuedo sugerir una tienda?', 'faq.a5': '\u00a1Por supuesto! Siempre buscamos expandirnos. Env\u00edanos el nombre de la tienda. Las solicitudes populares incluyen Uniqlo, Arket y Massimo Dutti.',
      'results.eyebrow': 'Los M\u00e1s Buscados',
      'results.title': 'Lo m\u00e1s visto de la semana',
      'results.subtitle': 'Selecci\u00f3n de esta semana \u2014 lista para comprar.',
      'filter.category': 'Categor\u00eda', 'filter.bags': 'Bolsos', 'filter.shoes': 'Zapatos', 'filter.clothing': 'Ropa', 'filter.jewellery': 'Joyer\u00eda', 'filter.accessories': 'Accesorios',
      'filter.price': 'Precio', 'filter.all': 'Todo', 'filter.store': 'Tienda', 'filter.allStores': 'Todas las Tiendas', 'filter.sortBy': 'Ordenar por',
      'sort.match': 'Mejor coincidencia', 'sort.priceAsc': 'Precio: Menor a Mayor', 'sort.priceDesc': 'Precio: Mayor a Menor', 'sort.saving': 'Mayor ahorro',
      'how.eyebrow': 'C\u00f3mo funciona', 'how.title': 'Tres pasos para encontrar lo que amas',
      'demo.eyebrow': 'M\u00edralo en acci\u00f3n', 'demo.title': 'De visto a encontrado, en segundos', 'demo.sub': 'Apunta tu c\u00e1mara a cualquier prenda y mira c\u00f3mo ALTERE identifica el art\u00edculo exacto \u2014 y te muestra d\u00f3nde comprarlo.', 'demo.step1': 'Haz una foto', 'demo.step2': 'Identificamos el original', 'demo.step3': 'Todas las tiendas y precios',
      'how.step1.title': 'Sube o pega', 'how.step1.desc': 'Comparte una foto, enlace o descripci\u00f3n de cualquier art\u00edculo de moda \u2014 lujo o high-street.',
      'how.step2.title': 'An\u00e1lisis IA', 'how.step2.desc': 'Nuestro modelo analiza tela, corte, color y silueta en segundos.',
      'how.step3.title': 'Descubre alternativas', 'how.step3.desc': 'Explora alternativas clasificadas con puntuaciones, precios y enlaces directos.',
      'waitlist.eyebrow': 'Acceso Anticipado', 'waitlist.title': 'S\u00e9 el primero en saber<br>cu\u00e1ndo lanzamos',
      'waitlist.sub': '\u00danete a miles de amantes de la moda ya en la lista.',
      'waitlist.placeholder': 'Introduce tu correo electr\u00f3nico', 'waitlist.btn': '\u00danete a la lista',
      'waitlist.hint': 'Sin spam, nunca. Canc\u00e9late en cualquier momento.',
      'waitlist.success.title': 'Est\u00e1s en la lista', 'waitlist.success.desc': 'Te avisaremos cuando ALTERE est\u00e9 en l\u00ednea.',
      'saved.back': 'Volver', 'saved.eyebrow': 'Tu Colecci\u00f3n', 'saved.title': 'Art\u00edculos Guardados', 'saved.clearAll': 'Borrar todo',
      'saved.empty': 'A\u00fan no hay art\u00edculos guardados', 'saved.emptyHint': 'Toca el coraz\u00f3n en cualquier art\u00edculo para guardarlo aqu\u00ed',
      'footer.tagline': 'B\u00fasqueda visual de moda con IA. Det\u00e9ctalo, lo encontramos.',
      'footer.explore': 'Explorar', 'footer.trending': 'Tendencias', 'footer.newArrivals': 'Novedades', 'footer.collections': 'Colecciones',
      'footer.company': 'Empresa', 'footer.about': 'Acerca de', 'footer.careers': 'Empleo', 'footer.privacy': 'Privacidad', 'footer.terms': 'T\u00e9rminos',
      'toast.saved': 'Guardado en tu colecci\u00f3n', 'toast.removed': 'Eliminado de guardados', 'toast.cleared': 'Todos los art\u00edculos guardados eliminados',
      'search.searching': 'Buscando...', 'search.joining': 'Uni\u00e9ndose...',
      'results.ai.eyebrow': 'Resultados IA', 'results.ai.title': 'Tus resultados est\u00e1n listos', 'results.demo.eyebrow': 'Resultados demo', 'results.demo.hint': 'A\u00f1ade tu clave API en ajustes para resultados reales de IA', 'results.bestDupe': 'Mejor coincidencia', 'results.moreAlts': 'Spotted Alternatives',
      'results.loading.title': 'Nuestra IA analiza tu art\u00edculo\u2026', 'results.loading.sub': 'Buscando las mejores alternativas en 6 tiendas',
      'share.whatsapp': 'WhatsApp', 'share.copy': 'Copiar enlace', 'share.copied': '\u00a1Copiado!',
      'share.text': 'Mira este hallazgo: {name} de {store} por solo {price} \u2014 encontrado en ALTERE',
      'share.results': 'Compartir resultados', 'share.story': 'Descargar para Stories', 'share.story.footer': 'Encontrado con ALTERE', 'share.story.downloaded': 'Imagen de story descargada',
      'invite.eyebrow': 'Corre la Voz', 'invite.title': 'Comparte ALTERE con amigos', 'invite.sub': '\u00bfConoces a alguien que ama la moda pero odia pagar de m\u00e1s? Env\u00edalos hacia nosotros.', 'invite.copyLink': 'Copiar enlace',
      'invite.message': '\u00a1Mira ALTERE \u2014 b\u00fasqueda visual de moda con IA. Fotograf\u00eda cualquier prenda y encuentra la pieza exacta, todas las tiendas y precios (y alternativas m\u00e1s inteligentes)!'
    },
    it: {
      'nav.discover': 'Scopri', 'nav.brands': 'Marchi', 'nav.saved': 'Salvati', 'nav.signin': 'Accedi',
      'hero.eyebrow': 'Scoperta Moda con IA',
      'hero.headline': 'L\u2019hai visto.<br>Noi lo troviamo.',
      'hero.sub': 'Vedi un capo sui social, per strada o in TV? Carica una foto e la nostra IA identifica l\u2019articolo esatto \u2014 con tutti i negozi e i prezzi. Troppo caro? Ti mostriamo anche alternative pi\u00f9 intelligenti.',
      'search.tab.link': 'Incolla link', 'search.tab.upload': 'Carica foto', 'search.tab.text': 'Alternative',
      'search.placeholder.link': 'Incolla l\u2019URL di un prodotto da un sito di moda...',
      'search.placeholder.text': 'Descrivi l\u2019articolo, es. "gonna midi in raso panna"...',
      'search.btn': 'Trova alternative',
      'search.tab.reverse': 'Trova originale', 'search.btnReverse': 'Trova originale', 'search.btnSource': 'Identifica', 'search.subtab.describe': 'Descrivi', 'search.subtab.photo': 'Foto', 'search.subtab.link': 'Link', 'search.placeholder.reverse': 'Descrivi il capo avvistato, es. "borsa trapuntata con catena nera"...',
      'search.upload.hint': 'Trascina o <strong>sfoglia</strong>',
      'search.upload.formats': 'JPG, PNG o WEBP fino a 10 MB',
      'search.upload.ready': 'Pronto per cercare',
      'search.status': 'L\u2019IA sta identificando il tuo capo',
      'search.tab.camera': 'Scatta foto', 'camera.start': 'Tocca per aprire la fotocamera', 'camera.hint': 'Inquadra un capo \u2014 lo identifichiamo.', 'camera.retake': 'Riprova', 'camera.use': 'Identifica', 'camera.error': 'Impossibile accedere alla fotocamera. Controlla i permessi.',
      'recent.label': 'Recenti', 'recent.clear': 'Cancella',
      'trending.label': 'Di tendenza',
      'hero.searching': 'Ricerca su', 'hero.scroll': 'Scorri per esplorare',
      'dotd.eyebrow': 'Avvistato Oggi', 'dotd.original': 'L\u2019Originale', 'dotd.dupe': 'Alternativa intelligente', 'dotd.vs': 'VS', 'dotd.btn': 'Acquista',
      'calc.eyebrow': 'Sourcing Intelligente', 'calc.title': 'Quanto potresti risparmiare?', 'calc.sub': 'Stesso articolo, negozi diversi \u2014 scopri quanto ti fa risparmiare un sourcing intelligente.', 'calc.budget': 'Budget moda mensile', 'calc.perMonth': 'Al mese', 'calc.perYear': 'All\u2019anno', 'calc.fiveYears': 'In 5 anni', 'calc.note': 'Basato sulla differenza di prezzo media che troviamo per lo stesso look tra negozi e alternative.',
      'celeb.eyebrow': 'Ispirazione Stile', 'celeb.title': 'Ottieni il look', 'celeb.sub': 'Individua l\u2019estetica \u2014 noi troviamo i capi esatti.', 'celeb.btn': 'Acquista il look',
      'celeb.c1.name': 'The Quiet Luxury', 'celeb.c1.desc': 'Eleganza sobria. Toni neutri, cashmere e silhouette pulite ispirate al minimalismo old-money.',
      'celeb.c2.name': 'Street Chic', 'celeb.c2.desc': 'Audace, sicuro e senza sforzo. Blazer oversize, pantaloni in pelle e sneaker statement direttamente dalla fashion week.',
      'celeb.c3.name': 'Old Money', 'celeb.c3.desc': 'Preppy incontra il raffinato. Cappotti su misura, accenti di perle, mocassini e borse strutturate che sussurrano ricchezza.',
      'celeb.c4.name': 'French Girl', 'celeb.c4.desc': 'Chic senza sforzo. Righe alla bretone, gonne midi, ballerine e quel je ne sais quoi parigino perfettamente disinvolto.',
      'cookie.text': 'Utilizziamo i cookie per migliorare la tua esperienza.', 'cookie.accept': 'Accetta tutto', 'cookie.manage': 'Gestisci preferenze',
      'about.mission': 'Estetica di lusso, prezzi accessibili.', 'about.storyEyebrow': 'La Nostra Storia', 'about.storyTitle': 'La moda dovrebbe essere per tutti',
      'about.storyP1': 'ALTERE \u00e8 nato da una frustrazione semplice: innamorarsi di un capo da passerella e poi vedere il cartellino del prezzo. Crediamo che il grande stile non debba richiedere una fortuna.',
      'about.storyP2': 'Cos\u00ec abbiamo costruito un\u2019IA che vede la moda come un\u2019esperta \u2014 analizzando tessuto, taglio, colore e silhouette \u2014 e poi setaccia migliaia di prodotti per trovare la migliore corrispondenza a una frazione del costo.',
      'about.howEyebrow': 'La Tecnologia', 'about.howTitle': 'Come funziona la nostra IA',
      'about.step1Title': 'Decostruzione visiva', 'about.step1Desc': 'Il nostro modello scompone ogni articolo nei suoi attributi chiave: materiale, texture, forma, proporzioni, palette colori e dettagli costruttivi.',
      'about.step2Title': 'Matching multi-negozio', 'about.step2Desc': 'Analizziamo gli inventari di Zara, H&M, Mango, ASOS, COS e & Other Stories in tempo reale, valutando ogni prodotto su molte dimensioni di stile.',
      'about.step3Title': 'Classificazione intelligente', 'about.step3Desc': 'I risultati sono ordinati per precisione, prezzo e disponibilit\u00e0 \u2014 cos\u00ec l\u2019articolo esatto, e poi le migliori alternative, sono sempre in cima.',
      'about.teamEyebrow': 'Chi Siamo', 'about.teamTitle': 'Fondato da amanti della moda,<br>alimentato dall\u2019IA',
      'about.teamDesc': 'Siamo un piccolo team di designer, ingegneri e appassionati di moda con una missione: democratizzare lo stile. Ogni funzione inizia con la stessa domanda: questo aiuta qualcuno ad apparire incredibile senza spendere troppo?',
      'about.cta': 'Inizia a identificare i capi',
      'faq.eyebrow': 'Supporto', 'faq.title': 'Domande frequenti',
      'faq.q1': 'Come fa l\u2019IA a identificare i capi?', 'faq.a1': 'Il nostro modello di visione IA analizza il capo della tua foto, link o descrizione \u2014 scomponendolo in tessuto, taglio, colore, silhouette e costruzione. Poi identifica il pezzo esatto e dove acquistarlo e, se preferisci spendere meno, propone le alternative pi\u00f9 simili ordinate per precisione.',
      'faq.q2': 'I link sono link di affiliazione?', 'faq.a2': 'Alcuni link possono essere di affiliazione, il che significa che guadagniamo una piccola commissione con il tuo acquisto \u2014 senza costi aggiuntivi per te. Le commissioni non decidono mai quali articoli mostrare; i risultati sono ordinati solo per qualit\u00e0 della corrispondenza.',
      'faq.q3': 'ALTERE \u00e8 gratuito?', 'faq.a3': 'S\u00ec, ALTERE \u00e8 completamente gratuito. Puoi fare ricerche illimitate, salvare i preferiti e condividerli \u2014 senza account o pagamento.',
      'faq.q4': 'Quanto sono precise le percentuali?', 'faq.a4': 'Le percentuali indicano quanto un articolo trovato somiglia all\u2019originale su molte dimensioni di stile. Sopra il 90% significa somiglianza molto alta; 80\u201390% indica forte somiglianza con differenze minori.',
      'faq.q5': 'Posso suggerire un negozio?', 'faq.a5': 'Certamente! Cerchiamo sempre di espanderci. Inviaci il nome del negozio. Le richieste popolari includono Uniqlo, Arket e Massimo Dutti.',
      'results.eyebrow': 'I Pi\u00f9 Cercati',
      'results.title': 'I pi\u00f9 avvistati della settimana',
      'results.subtitle': 'Selezione della settimana \u2014 pronta da acquistare.',
      'filter.category': 'Categoria', 'filter.bags': 'Borse', 'filter.shoes': 'Scarpe', 'filter.clothing': 'Abbigliamento', 'filter.jewellery': 'Gioielli', 'filter.accessories': 'Accessori',
      'filter.price': 'Prezzo', 'filter.all': 'Tutti', 'filter.store': 'Negozio', 'filter.allStores': 'Tutti i Negozi', 'filter.sortBy': 'Ordina per',
      'sort.match': 'Migliore corrispondenza', 'sort.priceAsc': 'Prezzo: Crescente', 'sort.priceDesc': 'Prezzo: Decrescente', 'sort.saving': 'Maggiore risparmio',
      'how.eyebrow': 'Come funziona', 'how.title': 'Tre passi per trovare ci\u00f2 che ami',
      'demo.eyebrow': 'Guardalo in azione', 'demo.title': 'Da avvistato a trovato, in secondi', 'demo.sub': 'Punta la fotocamera su un capo e guarda ALTERE identificare l\u2019articolo esatto \u2014 poi mostrarti dove acquistarlo.', 'demo.step1': 'Scatta una foto', 'demo.step2': 'Identifichiamo l\u2019originale', 'demo.step3': 'Tutti i negozi e prezzi',
      'how.step1.title': 'Carica o incolla', 'how.step1.desc': 'Condividi una foto, un link o una descrizione di qualsiasi capo \u2014 lusso o high-street.',
      'how.step2.title': 'Analisi IA', 'how.step2.desc': 'Il nostro modello analizza tessuto, taglio, colore e silhouette in pochi secondi.',
      'how.step3.title': 'Scopri le alternative', 'how.step3.desc': 'Sfoglia alternative classificate con punteggi, prezzi e link diretti ai negozi.',
      'waitlist.eyebrow': 'Accesso Anticipato', 'waitlist.title': 'Sii il primo a sapere<br>del lancio',
      'waitlist.sub': 'Unisciti a migliaia di appassionati di moda gi\u00e0 in lista.',
      'waitlist.placeholder': 'Inserisci il tuo indirizzo email', 'waitlist.btn': 'Unisciti alla lista',
      'waitlist.hint': 'Niente spam, mai. Cancellati in qualsiasi momento.',
      'waitlist.success.title': 'Sei nella lista', 'waitlist.success.desc': 'Ti avviseremo appena ALTERE sar\u00e0 online.',
      'saved.back': 'Indietro', 'saved.eyebrow': 'La Tua Collezione', 'saved.title': 'Articoli Salvati', 'saved.clearAll': 'Cancella tutto',
      'saved.empty': 'Nessun articolo salvato', 'saved.emptyHint': 'Tocca il cuore su un articolo per salvarlo qui',
      'footer.tagline': 'Ricerca visiva di moda con IA. Individualo, lo troviamo.',
      'footer.explore': 'Esplora', 'footer.trending': 'Tendenze', 'footer.newArrivals': 'Novit\u00e0', 'footer.collections': 'Collezioni',
      'footer.company': 'Azienda', 'footer.about': 'Chi siamo', 'footer.careers': 'Lavora con noi', 'footer.privacy': 'Privacy', 'footer.terms': 'Termini',
      'toast.saved': 'Salvato nella tua collezione', 'toast.removed': 'Rimosso dai salvati', 'toast.cleared': 'Tutti gli articoli salvati cancellati',
      'search.searching': 'Ricerca...', 'search.joining': 'Iscrizione...',
      'results.ai.eyebrow': 'Risultati IA', 'results.ai.title': 'I tuoi risultati sono pronti', 'results.demo.eyebrow': 'Risultati demo', 'results.demo.hint': 'Aggiungi la tua chiave API nelle impostazioni per risultati IA reali', 'results.bestDupe': 'Miglior corrispondenza', 'results.moreAlts': 'Spotted Alternatives',
      'results.loading.title': 'La nostra IA analizza il tuo articolo\u2026', 'results.loading.sub': 'Ricerca delle migliori alternative in 6 negozi',
      'share.whatsapp': 'WhatsApp', 'share.copy': 'Copia link', 'share.copied': 'Copiato!',
      'share.text': 'Guarda questa scoperta: {name} di {store} a solo {price} \u2014 trovato su ALTERE',
      'share.results': 'Condividi risultati', 'share.story': 'Scarica per Stories', 'share.story.footer': 'Trovato con ALTERE', 'share.story.downloaded': 'Immagine story scaricata',
      'invite.eyebrow': 'Passa Parola', 'invite.title': 'Condividi ALTERE con gli amici', 'invite.sub': 'Conosci qualcuno che ama la moda ma odia spendere troppo? Mandalo da noi.', 'invite.copyLink': 'Copia link',
      'invite.message': 'Scopri ALTERE \u2014 ricerca visiva di moda con IA. Fotografa un capo e trova il pezzo esatto, tutti i negozi e i prezzi (pi\u00f9 alternative intelligenti)!'
    },
    ar: {
      'nav.discover': '\u0627\u0643\u062a\u0634\u0641', 'nav.brands': '\u0627\u0644\u0639\u0644\u0627\u0645\u0627\u062a', 'nav.saved': '\u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0627\u062a', 'nav.signin': '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644',
      'hero.eyebrow': '\u0627\u0643\u062a\u0634\u0627\u0641 \u0627\u0644\u0645\u0648\u0636\u0629 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a',
      'hero.headline': '\u0634\u0641\u062a\u0647.<br>\u0646\u062d\u0646 \u0646\u062c\u062f\u0647.',
      'hero.sub': '\u0631\u0623\u064a\u062a \u0642\u0637\u0639\u0629 \u0639\u0644\u0649 \u0648\u0633\u0627\u0626\u0644 \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0623\u0648 \u0641\u064a \u0627\u0644\u0634\u0627\u0631\u0639 \u0623\u0648 \u0639\u0644\u0649 \u0627\u0644\u062a\u0644\u0641\u0627\u0632\u061f \u0627\u0631\u0641\u0639 \u0635\u0648\u0631\u0629 \u0648\u0630\u0643\u0627\u0624\u0646\u0627 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u064a\u062d\u062f\u0651\u062f \u0627\u0644\u0642\u0637\u0639\u0629 \u0628\u0627\u0644\u0636\u0628\u0637 \u2014 \u0645\u0639 \u0643\u0644 \u0627\u0644\u0645\u062a\u0627\u062c\u0631 \u0648\u0627\u0644\u0623\u0633\u0639\u0627\u0631. \u0645\u0643\u0644\u0641\u0629 \u062c\u062f\u064b\u0627\u061f \u0646\u0639\u0631\u0636 \u0644\u0643 \u0623\u064a\u0636\u064b\u0627 \u0628\u062f\u0627\u0626\u0644 \u0623\u0630\u0643\u0649.',
      'search.tab.link': '\u0644\u0635\u0642 \u0631\u0627\u0628\u0637', 'search.tab.upload': '\u0631\u0641\u0639 \u0635\u0648\u0631\u0629', 'search.tab.text': '\u0628\u062f\u0627\u0626\u0644', 'search.tab.camera': '\u0627\u0644\u062a\u0642\u0637 \u0635\u0648\u0631\u0629',
      'search.placeholder.link': '\u0627\u0644\u0635\u0642 \u0631\u0627\u0628\u0637 \u0645\u0646\u062a\u062c \u0645\u0646 \u0623\u064a \u0645\u0648\u0642\u0639 \u0623\u0632\u064a\u0627\u0621...',
      'search.placeholder.text': '\u0635\u0641 \u0627\u0644\u0642\u0637\u0639\u0629\u060c \u0645\u062b\u0644 "\u062a\u0646\u0648\u0631\u0629 \u0633\u0627\u062a\u0627\u0646 \u0643\u0631\u064a\u0645\u064a"...',
      'search.btn': '\u0627\u0628\u062d\u062b \u0639\u0646 \u0628\u062f\u0627\u0626\u0644',
      'search.tab.reverse': '\u0627\u0639\u062b\u0631 \u0639\u0644\u0649 \u0627\u0644\u0623\u0635\u0644\u064a', 'search.btnReverse': '\u0627\u0639\u062b\u0631 \u0639\u0644\u0649 \u0627\u0644\u0623\u0635\u0644\u064a', 'search.btnSource': '\u062d\u062f\u0651\u062f\u0647\u0627', 'search.subtab.describe': '\u0648\u0635\u0641', 'search.subtab.photo': '\u0635\u0648\u0631\u0629', 'search.subtab.link': '\u0631\u0627\u0628\u0637', 'search.placeholder.reverse': '\u0635\u0641 \u0627\u0644\u0642\u0637\u0639\u0629 \u0627\u0644\u062a\u064a \u0631\u0623\u064a\u062a\u0647\u0627\u060c \u0645\u062b\u0644 "\u062d\u0642\u064a\u0628\u0629 \u0633\u0648\u062f\u0627\u0621 \u0645\u0628\u0637\u0646\u0629 \u0628\u0633\u0644\u0633\u0644\u0629"...',
      'search.upload.hint': '\u0627\u0633\u062d\u0628 \u0623\u0648 <strong>\u062a\u0635\u0641\u0651\u062d</strong>',
      'search.upload.formats': 'JPG \u0623\u0648 PNG \u0623\u0648 WEBP \u062d\u062a\u0649 10 \u0645\u064a\u063a\u0627',
      'search.upload.ready': '\u062c\u0627\u0647\u0632 \u0644\u0644\u0628\u062d\u062b',
      'search.status': '\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u064a\u062d\u062f\u0651\u062f \u0642\u0637\u0639\u062a\u0643',
      'search.tab.camera': '\u0627\u0644\u062a\u0642\u0637 \u0635\u0648\u0631\u0629', 'camera.start': '\u0627\u0646\u0642\u0631 \u0644\u0641\u062a\u062d \u0627\u0644\u0643\u0627\u0645\u064a\u0631\u0627', 'camera.hint': '\u0648\u062c\u0651\u0647 \u0627\u0644\u0643\u0627\u0645\u064a\u0631\u0627 \u0646\u062d\u0648 \u0623\u064a \u0642\u0637\u0639\u0629 \u2014 \u0633\u0646\u062d\u062f\u062f\u0647\u0627.', 'camera.retake': '\u0625\u0639\u0627\u062f\u0629', 'camera.use': '\u062d\u062f\u0651\u062f\u0647\u0627', 'camera.error': '\u062a\u0639\u0630\u0651\u0631 \u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0644\u0643\u0627\u0645\u064a\u0631\u0627. \u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0623\u0630\u0648\u0646\u0627\u062a.',
      'recent.label': '\u0627\u0644\u0623\u062e\u064a\u0631\u0629', 'recent.clear': '\u0645\u0633\u062d',
      'trending.label': '\u0631\u0627\u0626\u062c \u0627\u0644\u0622\u0646',
      'hero.searching': '\u0628\u062d\u062b \u0641\u064a', 'hero.scroll': '\u0645\u0631\u0631 \u0644\u0644\u0623\u0633\u0641\u0644 \u0644\u0644\u0627\u0633\u062a\u0643\u0634\u0627\u0641',
      'celeb.eyebrow': '\u0625\u0644\u0647\u0627\u0645 \u0627\u0644\u0623\u0633\u0644\u0648\u0628', 'celeb.title': '\u0627\u062d\u0635\u0644 \u0639\u0644\u0649 \u0627\u0644\u0625\u0637\u0644\u0627\u0644\u0629', 'celeb.sub': '\u0627\u0644\u062a\u0642\u0637 \u0627\u0644\u0623\u0633\u0644\u0648\u0628 \u2014 \u0648\u0646\u062d\u0646 \u0646\u062c\u062f \u0627\u0644\u0642\u0637\u0639 \u0628\u0627\u0644\u0636\u0628\u0637.', 'celeb.btn': '\u062a\u0633\u0648\u0651\u0642 \u0627\u0644\u0625\u0637\u0644\u0627\u0644\u0629',
      'celeb.c1.name': '\u0627\u0644\u0641\u062e\u0627\u0645\u0629 \u0627\u0644\u0647\u0627\u062f\u0626\u0629', 'celeb.c1.desc': '\u0623\u0646\u0627\u0642\u0629 \u0631\u0627\u0642\u064a\u0629. \u0623\u0644\u0648\u0627\u0646 \u0645\u062d\u0627\u064a\u062f\u0629\u060c \u0643\u0634\u0645\u064a\u0631 \u0648\u062e\u0637\u0648\u0637 \u0646\u0638\u064a\u0641\u0629 \u0645\u0633\u062a\u0648\u062d\u0627\u0629 \u0645\u0646 \u0627\u0644\u0628\u0633\u0627\u0637\u0629 \u0627\u0644\u0641\u0627\u062e\u0631\u0629.',
      'celeb.c2.name': '\u0623\u0646\u0627\u0642\u0629 \u0627\u0644\u0634\u0627\u0631\u0639', 'celeb.c2.desc': '\u062c\u0631\u064a\u0621 \u0648\u0648\u0627\u062b\u0642. \u0628\u0644\u064a\u0632\u0631\u0627\u062a \u0643\u0628\u064a\u0631\u0629\u060c \u0633\u0631\u0627\u0648\u064a\u0644 \u062c\u0644\u062f\u064a\u0629 \u0648\u0623\u062d\u0630\u064a\u0629 \u0645\u0645\u064a\u0632\u0629 \u0645\u0646 \u0623\u0633\u0627\u0628\u064a\u0639 \u0627\u0644\u0645\u0648\u0636\u0629.',
      'celeb.c3.name': '\u0627\u0644\u062b\u0631\u0627\u0621 \u0627\u0644\u0642\u062f\u064a\u0645', 'celeb.c3.desc': '\u0623\u0646\u0627\u0642\u0629 \u0643\u0644\u0627\u0633\u064a\u0643\u064a\u0629. \u0645\u0639\u0627\u0637\u0641 \u0645\u0641\u0635\u0644\u0629\u060c \u0644\u0645\u0633\u0627\u062a \u0644\u0624\u0644\u0624\u060c \u0623\u062d\u0630\u064a\u0629 \u0644\u0648\u0641\u0631 \u0648\u062d\u0642\u0627\u0626\u0628 \u0645\u0647\u064a\u0643\u0644\u0629.',
      'celeb.c4.name': '\u0627\u0644\u0641\u062a\u0627\u0629 \u0627\u0644\u0641\u0631\u0646\u0633\u064a\u0629', 'celeb.c4.desc': '\u0623\u0646\u0627\u0642\u0629 \u0628\u0644\u0627 \u062c\u0647\u062f. \u062e\u0637\u0648\u0637 \u0628\u0631\u064a\u062a\u0648\u0646\u064a\u0629\u060c \u062a\u0646\u0627\u0646\u064a\u0631 \u0645\u064a\u062f\u064a\u060c \u0628\u0627\u0644\u064a\u0631\u064a\u0646\u0627 \u0648\u0630\u0644\u0643 \u0627\u0644\u0633\u062d\u0631 \u0627\u0644\u0628\u0627\u0631\u064a\u0633\u064a.',
      'dotd.eyebrow': '\u0631\u064f\u0635\u062f \u0627\u0644\u064a\u0648\u0645', 'dotd.original': '\u0627\u0644\u0623\u0635\u0644\u064a', 'dotd.dupe': '\u0628\u062f\u064a\u0644 \u0630\u0643\u064a', 'dotd.vs': 'VS', 'dotd.btn': '\u062a\u0633\u0648\u0651\u0642\u0647\u0627',
      'calc.eyebrow': '\u062a\u0633\u0648\u0651\u0642 \u0630\u0643\u064a', 'calc.title': '\u0643\u0645 \u064a\u0645\u0643\u0646\u0643 \u062a\u0648\u0641\u064a\u0631\u0647\u061f', 'calc.sub': '\u0646\u0641\u0633 \u0627\u0644\u0642\u0637\u0639\u0629\u060c \u0645\u062a\u0627\u062c\u0631 \u0645\u062e\u062a\u0644\u0641\u0629 \u2014 \u0634\u0627\u0647\u062f \u0643\u0645 \u064a\u0648\u0641\u0651\u0631 \u0644\u0643 \u0627\u0644\u062a\u0633\u0648\u0651\u0642 \u0627\u0644\u0630\u0643\u064a.', 'calc.budget': '\u0645\u064a\u0632\u0627\u0646\u064a\u0629 \u0627\u0644\u0623\u0632\u064a\u0627\u0621 \u0627\u0644\u0634\u0647\u0631\u064a\u0629', 'calc.perMonth': '\u0634\u0647\u0631\u064a\u064b\u0627', 'calc.perYear': '\u0633\u0646\u0648\u064a\u064b\u0627', 'calc.fiveYears': '\u0641\u064a 5 \u0633\u0646\u0648\u0627\u062a', 'calc.note': '\u0628\u0646\u0627\u0621\u064b \u0639\u0644\u0649 \u0645\u062a\u0648\u0633\u0637 \u0641\u0631\u0642 \u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0630\u064a \u0646\u062c\u062f\u0647 \u0644\u0646\u0641\u0633 \u0627\u0644\u0625\u0637\u0644\u0627\u0644\u0629 \u0628\u064a\u0646 \u0627\u0644\u0645\u062a\u0627\u062c\u0631 \u0648\u0627\u0644\u0628\u062f\u0627\u0626\u0644.',
      'filter.category': '\u0627\u0644\u0641\u0626\u0629', 'filter.bags': '\u062d\u0642\u0627\u0626\u0628', 'filter.shoes': '\u0623\u062d\u0630\u064a\u0629', 'filter.clothing': '\u0645\u0644\u0627\u0628\u0633', 'filter.jewellery': '\u0645\u062c\u0648\u0647\u0631\u0627\u062a', 'filter.accessories': '\u0625\u0643\u0633\u0633\u0648\u0627\u0631\u0627\u062a',
      'results.eyebrow': '\u0627\u0644\u0623\u0643\u062b\u0631 \u0628\u062d\u062b\u064b\u0627',
      'results.title': '\u0627\u0644\u0623\u0643\u062b\u0631 \u0631\u0635\u062f\u064b\u0627 \u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639',
      'results.subtitle': '\u0645\u062e\u062a\u0627\u0631\u0627\u062a \u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u2014 \u062c\u0627\u0647\u0632\u0629 \u0644\u0644\u062a\u0633\u0648\u0642.',
      'filter.price': '\u0627\u0644\u0633\u0639\u0631', 'filter.all': '\u0627\u0644\u0643\u0644', 'filter.store': '\u0627\u0644\u0645\u062a\u062c\u0631', 'filter.allStores': '\u0643\u0644 \u0627\u0644\u0645\u062a\u0627\u062c\u0631', 'filter.sortBy': '\u062a\u0631\u062a\u064a\u0628 \u062d\u0633\u0628',
      'sort.match': '\u0623\u0641\u0636\u0644 \u062a\u0637\u0627\u0628\u0642', 'sort.priceAsc': '\u0627\u0644\u0633\u0639\u0631: \u0645\u0646 \u0627\u0644\u0623\u0642\u0644', 'sort.priceDesc': '\u0627\u0644\u0633\u0639\u0631: \u0645\u0646 \u0627\u0644\u0623\u0639\u0644\u0649', 'sort.saving': '\u0623\u0643\u0628\u0631 \u062a\u0648\u0641\u064a\u0631',
      'how.eyebrow': '\u0643\u064a\u0641 \u064a\u0639\u0645\u0644', 'how.title': '\u062b\u0644\u0627\u062b \u062e\u0637\u0648\u0627\u062a \u0644\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0645\u0627 \u062a\u062d\u0628',
      'demo.eyebrow': '\u0634\u0627\u0647\u062f\u0647 \u0623\u062b\u0646\u0627\u0621 \u0627\u0644\u0639\u0645\u0644', 'demo.title': '\u0645\u0646 \u0627\u0644\u0631\u0635\u062f \u0625\u0644\u0649 \u0627\u0644\u0645\u0635\u062f\u0631\u060c \u0641\u064a \u062b\u0648\u0627\u0646\u064d', 'demo.sub': '\u0648\u062c\u0651\u0647 \u0643\u0627\u0645\u064a\u0631\u062a\u0643 \u0646\u062d\u0648 \u0623\u064a \u0642\u0637\u0639\u0629 \u0648\u0634\u0627\u0647\u062f ALTERE \u064a\u062d\u062f\u0651\u062f \u0627\u0644\u0642\u0637\u0639\u0629 \u0628\u0627\u0644\u0636\u0628\u0637 \u2014 \u062b\u0645 \u064a\u0631\u064a\u0643 \u0623\u064a\u0646 \u062a\u0634\u062a\u0631\u064a\u0647\u0627.', 'demo.step1': '\u0627\u0644\u062a\u0642\u0637 \u0635\u0648\u0631\u0629', 'demo.step2': '\u0646\u062d\u062f\u0651\u062f \u0627\u0644\u0642\u0637\u0639\u0629 \u0627\u0644\u0623\u0635\u0644\u064a\u0629', 'demo.step3': '\u0643\u0644 \u0627\u0644\u0645\u062a\u0627\u062c\u0631 \u0648\u0627\u0644\u0623\u0633\u0639\u0627\u0631',
      'how.step1.title': '\u0627\u0631\u0641\u0639 \u0623\u0648 \u0627\u0644\u0635\u0642', 'how.step1.desc': '\u0634\u0627\u0631\u0643 \u0635\u0648\u0631\u0629 \u0623\u0648 \u0631\u0627\u0628\u0637 \u0623\u0648 \u0648\u0635\u0641 \u0644\u0623\u064a \u0642\u0637\u0639\u0629 \u0623\u0632\u064a\u0627\u0621 \u2014 \u0641\u0627\u062e\u0631\u0629 \u0623\u0648 \u0639\u0627\u062f\u064a\u0629.',
      'how.step2.title': '\u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a', 'how.step2.desc': '\u064a\u062d\u0644\u0644 \u0646\u0645\u0648\u0630\u062c\u0646\u0627 \u0627\u0644\u0642\u0645\u0627\u0634 \u0648\u0627\u0644\u0642\u0635 \u0648\u0627\u0644\u0644\u0648\u0646 \u0648\u0627\u0644\u0634\u0643\u0644 \u0641\u064a \u062b\u0648\u0627\u0646\u064d.',
      'how.step3.title': '\u0627\u0643\u062a\u0634\u0641 \u0627\u0644\u0628\u062f\u0627\u0626\u0644', 'how.step3.desc': '\u062a\u0635\u0641\u062d \u0628\u062f\u0627\u0626\u0644 \u0645\u0631\u062a\u0628\u0629 \u0645\u0639 \u0646\u0633\u0628 \u0627\u0644\u062a\u0637\u0627\u0628\u0642 \u0648\u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0648\u0631\u0648\u0627\u0628\u0637 \u0645\u0628\u0627\u0634\u0631\u0629.',
      'faq.eyebrow': '\u0627\u0644\u062f\u0639\u0645', 'faq.title': '\u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629',
      'faq.q1': '\u0643\u064a\u0641 \u064a\u062d\u062f\u0651\u062f \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u0627\u0644\u0642\u0637\u0639\u061f', 'faq.a1': '\u064a\u062d\u0644\u0651\u0644 \u0646\u0645\u0648\u0630\u062c \u0627\u0644\u0631\u0624\u064a\u0629 \u0644\u062f\u064a\u0646\u0627 \u0627\u0644\u0642\u0637\u0639\u0629 \u0641\u064a \u0635\u0648\u0631\u062a\u0643 \u0623\u0648 \u0631\u0627\u0628\u0637\u0643 \u0623\u0648 \u0648\u0635\u0641\u0643 \u2014 \u0648\u064a\u0641\u0643\u0651\u0643\u0647\u0627 \u0625\u0644\u0649 \u0627\u0644\u0642\u0645\u0627\u0634 \u0648\u0627\u0644\u0642\u0635\u0651\u0629 \u0648\u0627\u0644\u0644\u0648\u0646 \u0648\u0627\u0644\u0635\u0648\u0631\u0629 \u0627\u0644\u0638\u0644\u064a\u0629 \u0648\u0627\u0644\u062a\u0635\u0646\u064a\u0639. \u062b\u0645 \u064a\u062d\u062f\u0651\u062f \u0627\u0644\u0642\u0637\u0639\u0629 \u0628\u0627\u0644\u0636\u0628\u0637 \u0648\u0623\u064a\u0646 \u062a\u0634\u062a\u0631\u064a\u0647\u0627\u060c \u0648\u0625\u0630\u0627 \u0643\u0646\u062a \u062a\u0641\u0636\u0651\u0644 \u0625\u0646\u0641\u0627\u0642 \u0623\u0642\u0644\u060c \u064a\u0639\u0631\u0636 \u0623\u0642\u0631\u0628 \u0627\u0644\u0628\u062f\u0627\u0626\u0644 \u0645\u0631\u062a\u0651\u0628\u0629 \u062d\u0633\u0628 \u0627\u0644\u062f\u0642\u0629.',
      'faq.q2': '\u0647\u0644 \u0627\u0644\u0631\u0648\u0627\u0628\u0637 \u0631\u0648\u0627\u0628\u0637 \u062a\u0633\u0648\u064a\u0642\u064a\u0629\u061f', 'faq.a2': '\u0628\u0639\u0636 \u0627\u0644\u0631\u0648\u0627\u0628\u0637 \u0642\u062f \u062a\u0643\u0648\u0646 \u062a\u0633\u0648\u064a\u0642\u064a\u0629\u060c \u0645\u0645\u0627 \u064a\u0639\u0646\u064a \u0623\u0646\u0646\u0627 \u0646\u062d\u0635\u0644 \u0639\u0644\u0649 \u0639\u0645\u0648\u0644\u0629 \u0635\u063a\u064a\u0631\u0629 \u0639\u0646\u062f \u0627\u0644\u0634\u0631\u0627\u0621 \u2014 \u062f\u0648\u0646 \u062a\u0643\u0644\u0641\u0629 \u0625\u0636\u0627\u0641\u064a\u0629 \u0639\u0644\u064a\u0643. \u0627\u0644\u0639\u0645\u0648\u0644\u0627\u062a \u0644\u0627 \u062a\u062d\u062f\u0651\u062f \u0623\u0628\u062f\u064b\u0627 \u0627\u0644\u0642\u0637\u0639 \u0627\u0644\u0645\u0639\u0631\u0648\u0636\u0629\u061b \u0627\u0644\u0646\u062a\u0627\u0626\u062c \u0645\u0631\u062a\u0651\u0628\u0629 \u062d\u0633\u0628 \u062c\u0648\u062f\u0629 \u0627\u0644\u062a\u0637\u0627\u0628\u0642 \u0641\u0642\u0637.',
      'faq.q3': '\u0647\u0644 ALTERE \u0645\u062c\u0627\u0646\u064a\u061f', 'faq.a3': '\u0646\u0639\u0645\u060c ALTERE \u0645\u062c\u0627\u0646\u064a \u062a\u0645\u0627\u0645\u064b\u0627. \u064a\u0645\u0643\u0646\u0643 \u0625\u062c\u0631\u0627\u0621 \u0639\u0645\u0644\u064a\u0627\u062a \u0628\u062d\u062b \u063a\u064a\u0631 \u0645\u062d\u062f\u0648\u062f\u0629 \u0648\u062d\u0641\u0638 \u0627\u0644\u0645\u0641\u0636\u0644\u0629 \u0648\u0645\u0634\u0627\u0631\u0643\u062a\u0647\u0627 \u2014 \u062f\u0648\u0646 \u062d\u0633\u0627\u0628 \u0623\u0648 \u062f\u0641\u0639.',
      'faq.q4': '\u0645\u0627 \u0645\u062f\u0649 \u062f\u0642\u0629 \u0646\u0633\u0628 \u0627\u0644\u062a\u0637\u0627\u0628\u0642\u061f', 'faq.a4': '\u062a\u0639\u0643\u0633 \u0627\u0644\u0646\u0633\u0628 \u0645\u062f\u0649 \u062a\u0637\u0627\u0628\u0642 \u0627\u0644\u0642\u0637\u0639\u0629 \u0627\u0644\u062a\u064a \u0646\u062c\u062f\u0647\u0627 \u0645\u0639 \u0627\u0644\u0623\u0635\u0644 \u0639\u0628\u0631 \u0627\u0644\u0639\u062f\u064a\u062f \u0645\u0646 \u0627\u0644\u0623\u0628\u0639\u0627\u062f \u0627\u0644\u0623\u0633\u0644\u0648\u0628\u064a\u0629. \u0623\u0643\u062b\u0631 \u0645\u0646 90% \u064a\u0639\u0646\u064a \u062a\u0637\u0627\u0628\u0642\u064b\u0627 \u0628\u0635\u0631\u064a\u064b\u0627 \u0643\u0628\u064a\u0631\u064b\u0627 \u062c\u062f\u064b\u0627\u061b \u064880\u201390% \u062a\u0634\u0627\u0628\u0647 \u0642\u0648\u064a \u0645\u0639 \u0641\u0631\u0648\u0642 \u0628\u0633\u064a\u0637\u0629.',
      'faq.q5': '\u0647\u0644 \u064a\u0645\u0643\u0646\u0646\u064a \u0627\u0642\u062a\u0631\u0627\u062d \u0645\u062a\u062c\u0631\u061f', 'faq.a5': '\u0628\u0627\u0644\u062a\u0623\u0643\u064a\u062f! \u0646\u062d\u0646 \u062f\u0627\u0626\u0645\u064b\u0627 \u0646\u0628\u062d\u062b \u0639\u0646 \u0627\u0644\u062a\u0648\u0633\u0639. \u0623\u0631\u0633\u0644 \u0644\u0646\u0627 \u0627\u0633\u0645 \u0627\u0644\u0645\u062a\u062c\u0631 \u0648\u0633\u0646\u0642\u064a\u0645\u0647.',
      'cookie.text': '\u0646\u0633\u062a\u062e\u062f\u0645 \u0645\u0644\u0641\u0627\u062a \u062a\u0639\u0631\u064a\u0641 \u0627\u0644\u0627\u0631\u062a\u0628\u0627\u0637 \u0644\u062a\u062d\u0633\u064a\u0646 \u062a\u062c\u0631\u0628\u062a\u0643.', 'cookie.accept': '\u0642\u0628\u0648\u0644 \u0627\u0644\u0643\u0644', 'cookie.manage': '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u062a\u0641\u0636\u064a\u0644\u0627\u062a',
      'about.mission': '\u062c\u0645\u0627\u0644\u064a\u0627\u062a \u0641\u0627\u062e\u0631\u0629\u060c \u0623\u0633\u0639\u0627\u0631 \u0645\u062a\u0627\u062d\u0629.', 'about.storyEyebrow': '\u0642\u0635\u062a\u0646\u0627', 'about.storyTitle': '\u0627\u0644\u0645\u0648\u0636\u0629 \u064a\u062c\u0628 \u0623\u0646 \u062a\u0643\u0648\u0646 \u0644\u0644\u062c\u0645\u064a\u0639',
      'about.storyP1': '\u0648\u0644\u062f ALTERE \u0645\u0646 \u0625\u062d\u0628\u0627\u0637 \u0628\u0633\u064a\u0637: \u0627\u0644\u0648\u0642\u0648\u0639 \u0641\u064a \u062d\u0628 \u0642\u0637\u0639\u0629 \u0645\u0646 \u0639\u0631\u0636 \u0627\u0644\u0623\u0632\u064a\u0627\u0621 \u062b\u0645 \u0631\u0624\u064a\u0629 \u0627\u0644\u0633\u0639\u0631.',
      'about.storyP2': '\u0644\u0630\u0644\u0643 \u0628\u0646\u064a\u0646\u0627 \u0630\u0643\u0627\u0621\u064b \u0627\u0635\u0637\u0646\u0627\u0639\u064a\u064b\u0627 \u064a\u0631\u0649 \u0627\u0644\u0645\u0648\u0636\u0629 \u0643\u0645\u0635\u0645\u0645 \u2014 \u064a\u062d\u0644\u0644 \u0627\u0644\u0642\u0645\u0627\u0634 \u0648\u0627\u0644\u0642\u0635 \u0648\u0627\u0644\u0644\u0648\u0646 \u2014 \u062b\u0645 \u064a\u0628\u062d\u062b \u0641\u064a \u0622\u0644\u0627\u0641 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a.',
      'about.howEyebrow': '\u0627\u0644\u062a\u0643\u0646\u0648\u0644\u0648\u062c\u064a\u0627', 'about.howTitle': '\u0643\u064a\u0641 \u064a\u0639\u0645\u0644 \u0630\u0643\u0627\u0624\u0646\u0627 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a',
      'about.step1Title': '\u062a\u0641\u0643\u064a\u0643 \u0628\u0635\u0631\u064a', 'about.step1Desc': '\u064a\u062d\u0644\u0644 \u0646\u0645\u0648\u0630\u062c\u0646\u0627 \u0643\u0644 \u0642\u0637\u0639\u0629 \u0625\u0644\u0649 \u0633\u0645\u0627\u062a\u0647\u0627 \u0627\u0644\u0623\u0633\u0627\u0633\u064a\u0629.',
      'about.step2Title': '\u0645\u0637\u0627\u0628\u0642\u0629 \u0639\u0628\u0631 \u0627\u0644\u0645\u062a\u0627\u062c\u0631', 'about.step2Desc': '\u0646\u0641\u062d\u0635 \u0645\u062e\u0632\u0648\u0646\u0627\u062a Zara \u0648H&M \u0648Mango \u0648ASOS \u0648COS \u0648& Other Stories \u0641\u064a \u0627\u0644\u0648\u0642\u062a \u0627\u0644\u0641\u0639\u0644\u064a.',
      'about.step3Title': '\u062a\u0631\u062a\u064a\u0628 \u0630\u0643\u064a', 'about.step3Desc': '\u062a\u064f\u0631\u062a\u064e\u0651\u0628 \u0627\u0644\u0646\u062a\u0627\u0626\u062c \u062d\u0633\u0628 \u0627\u0644\u062f\u0642\u0629 \u0648\u0627\u0644\u0633\u0639\u0631 \u0648\u0627\u0644\u062a\u0648\u0641\u0631 \u2014 \u0628\u062d\u064a\u062b \u062a\u0638\u0647\u0631 \u0627\u0644\u0642\u0637\u0639\u0629 \u0627\u0644\u0623\u0635\u0644\u064a\u0629 \u0628\u0627\u0644\u0636\u0628\u0637\u060c \u062b\u0645 \u0623\u0641\u0636\u0644 \u0627\u0644\u0628\u062f\u0627\u0626\u0644\u060c \u062f\u0627\u0626\u0645\u064b\u0627 \u0641\u064a \u0627\u0644\u0623\u0639\u0644\u0649.',
      'about.teamEyebrow': '\u0645\u0646 \u0646\u062d\u0646', 'about.teamTitle': '\u0623\u0633\u0633\u0647\u0627 \u0639\u0634\u0627\u0642 \u0627\u0644\u0645\u0648\u0636\u0629\u060c<br>\u064a\u062f\u0639\u0645\u0647\u0627 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a',
      'about.teamDesc': '\u0646\u062d\u0646 \u0641\u0631\u064a\u0642 \u0635\u063a\u064a\u0631 \u0645\u0646 \u0627\u0644\u0645\u0635\u0645\u0645\u064a\u0646 \u0648\u0627\u0644\u0645\u0647\u0646\u062f\u0633\u064a\u0646 \u0648\u0639\u0634\u0627\u0642 \u0627\u0644\u0645\u0648\u0636\u0629 \u0628\u0645\u0647\u0645\u0629 \u0648\u0627\u062d\u062f\u0629: \u062c\u0639\u0644 \u0627\u0644\u0623\u0646\u0627\u0642\u0629 \u0644\u0644\u062c\u0645\u064a\u0639.',
      'about.cta': '\u0627\u0628\u062f\u0623 \u0628\u062a\u062d\u062f\u064a\u062f \u0627\u0644\u0642\u0637\u0639',
      'waitlist.eyebrow': '\u0648\u0635\u0648\u0644 \u0645\u0628\u0643\u0631', 'waitlist.title': '\u0643\u0646 \u0623\u0648\u0644 \u0645\u0646 \u064a\u0639\u0631\u0641<br>\u0639\u0646\u062f \u0627\u0644\u0625\u0637\u0644\u0627\u0642',
      'waitlist.sub': '\u0627\u0646\u0636\u0645 \u0625\u0644\u0649 \u0622\u0644\u0627\u0641 \u0645\u062d\u0628\u064a \u0627\u0644\u0645\u0648\u0636\u0629 \u0627\u0644\u0645\u0648\u062c\u0648\u062f\u064a\u0646 \u0628\u0627\u0644\u0641\u0639\u0644 \u0641\u064a \u0627\u0644\u0642\u0627\u0626\u0645\u0629.',
      'waitlist.placeholder': '\u0623\u062f\u062e\u0644 \u0628\u0631\u064a\u062f\u0643 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a', 'waitlist.btn': '\u0627\u0646\u0636\u0645 \u0644\u0644\u0642\u0627\u0626\u0645\u0629',
      'waitlist.hint': '\u0644\u0627 \u0631\u0633\u0627\u0626\u0644 \u0645\u0632\u0639\u062c\u0629 \u0623\u0628\u062f\u064b\u0627. \u064a\u0645\u0643\u0646\u0643 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0641\u064a \u0623\u064a \u0648\u0642\u062a.',
      'waitlist.success.title': '\u0623\u0646\u062a \u0641\u064a \u0627\u0644\u0642\u0627\u0626\u0645\u0629', 'waitlist.success.desc': '\u0633\u0646\u062e\u0628\u0631\u0643 \u0641\u0648\u0631 \u0625\u0637\u0644\u0627\u0642 ALTERE.',
      'saved.back': '\u0631\u062c\u0648\u0639', 'saved.eyebrow': '\u0645\u062c\u0645\u0648\u0639\u062a\u0643', 'saved.title': '\u0627\u0644\u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0629', 'saved.clearAll': '\u0645\u0633\u062d \u0627\u0644\u0643\u0644',
      'saved.empty': '\u0644\u0627 \u062a\u0648\u062c\u062f \u0639\u0646\u0627\u0635\u0631 \u0645\u062d\u0641\u0648\u0638\u0629', 'saved.emptyHint': '\u0627\u0646\u0642\u0631 \u0639\u0644\u0649 \u0627\u0644\u0642\u0644\u0628 \u0644\u062d\u0641\u0638 \u0623\u064a \u0642\u0637\u0639\u0629 \u0647\u0646\u0627',
      'footer.tagline': '\u0628\u062d\u062b \u0627\u0644\u0645\u0648\u0636\u0629 \u0627\u0644\u0628\u0635\u0631\u064a \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a. \u0627\u0643\u062a\u0634\u0641\u0647\u0627\u060c \u0648\u0646\u062d\u0646 \u0646\u062c\u062f\u0647\u0627.',
      'footer.explore': '\u0627\u0633\u062a\u0643\u0634\u0641', 'footer.trending': '\u0631\u0627\u0626\u062c', 'footer.newArrivals': '\u0648\u0635\u0644 \u062d\u062f\u064a\u062b\u064b\u0627', 'footer.collections': '\u0645\u062c\u0645\u0648\u0639\u0627\u062a',
      'footer.company': '\u0627\u0644\u0634\u0631\u0643\u0629', 'footer.about': '\u0639\u0646\u0651\u0627', 'footer.careers': '\u0648\u0638\u0627\u0626\u0641', 'footer.privacy': '\u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629', 'footer.terms': '\u0627\u0644\u0634\u0631\u0648\u0637',
      'toast.saved': '\u062a\u0645 \u0627\u0644\u062d\u0641\u0638 \u0641\u064a \u0645\u062c\u0645\u0648\u0639\u062a\u0643', 'toast.removed': '\u062a\u0645 \u0627\u0644\u0625\u0632\u0627\u0644\u0629 \u0645\u0646 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0627\u062a', 'toast.cleared': '\u062a\u0645 \u0645\u0633\u062d \u0643\u0644 \u0627\u0644\u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0629',
      'search.searching': '\u062c\u0627\u0631\u064a \u0627\u0644\u0628\u062d\u062b...', 'search.joining': '\u062c\u0627\u0631\u064a \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645...',
      'results.ai.eyebrow': '\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a', 'results.ai.title': '\u0646\u062a\u0627\u0626\u062c\u0643 \u062c\u0627\u0647\u0632\u0629', 'results.demo.eyebrow': '\u0646\u062a\u0627\u0626\u062c \u062a\u062c\u0631\u064a\u0628\u064a\u0629', 'results.demo.hint': '\u0623\u0636\u0641 \u0645\u0641\u062a\u0627\u062d API \u0641\u064a \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0644\u0646\u062a\u0627\u0626\u062c \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064a \u062d\u0642\u064a\u0642\u064a\u0629',
      'results.loading.title': '\u0630\u0643\u0627\u0624\u0646\u0627 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u064a\u062d\u0644\u0644 \u0642\u0637\u0639\u062a\u0643\u2026', 'results.loading.sub': '\u0627\u0644\u0628\u062d\u062b \u0639\u0646 \u0623\u0641\u0636\u0644 \u0627\u0644\u0628\u062f\u0627\u0626\u0644 \u0641\u064a 6 \u0645\u062a\u0627\u062c\u0631',
      'share.whatsapp': 'WhatsApp', 'share.copy': '\u0646\u0633\u062e \u0627\u0644\u0631\u0627\u0628\u0637', 'share.copied': '\u062a\u0645 \u0627\u0644\u0646\u0633\u062e!',
      'share.text': '\u0634\u0627\u0647\u062f \u0647\u0630\u0647 \u0627\u0644\u0642\u0637\u0639\u0629: {name} \u0645\u0646 {store} \u0628\u0633\u0639\u0631 {price} \u0641\u0642\u0637 \u2014 \u0639\u0628\u0631 ALTERE',
      'share.results': '\u0645\u0634\u0627\u0631\u0643\u0629 \u0627\u0644\u0646\u062a\u0627\u0626\u062c', 'share.story': '\u062a\u062d\u0645\u064a\u0644 \u0644\u0644\u0633\u062a\u0648\u0631\u064a\u0632', 'share.story.footer': '\u0648\u064f\u062c\u062f \u0639\u0628\u0631 ALTERE', 'share.story.downloaded': '\u062a\u0645 \u062a\u062d\u0645\u064a\u0644 \u0635\u0648\u0631\u0629 \u0627\u0644\u0633\u062a\u0648\u0631\u064a',
      'invite.eyebrow': '\u0627\u0646\u0634\u0631 \u0627\u0644\u0643\u0644\u0645\u0629', 'invite.title': '\u0634\u0627\u0631\u0643 ALTERE \u0645\u0639 \u0623\u0635\u062f\u0642\u0627\u0626\u0643', 'invite.sub': '\u062a\u0639\u0631\u0641 \u0634\u062e\u0635\u064b\u0627 \u064a\u062d\u0628 \u0627\u0644\u0645\u0648\u0636\u0629 \u0644\u0643\u0646 \u064a\u0643\u0631\u0647 \u0627\u0644\u062f\u0641\u0639 \u0627\u0644\u0632\u0627\u0626\u062f\u061f \u0623\u0631\u0633\u0644\u0647 \u0625\u0644\u064a\u0646\u0627.', 'invite.copyLink': '\u0646\u0633\u062e \u0627\u0644\u0631\u0627\u0628\u0637',
      'invite.message': '\u0627\u0643\u062a\u0634\u0641 ALTERE \u2014 \u0628\u062d\u062b \u0627\u0644\u0645\u0648\u0636\u0629 \u0627\u0644\u0628\u0635\u0631\u064a \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a. \u0635\u0648\u0651\u0631 \u0623\u064a \u0642\u0637\u0639\u0629 \u0644\u064a\u062c\u062f \u0627\u0644\u0642\u0637\u0639\u0629 \u0628\u0627\u0644\u0636\u0628\u0637 \u0648\u0643\u0644 \u0627\u0644\u0645\u062a\u0627\u062c\u0631 \u0648\u0627\u0644\u0623\u0633\u0639\u0627\u0631 (\u0645\u0639 \u0628\u062f\u0627\u0626\u0644 \u0623\u0630\u0643\u0649)!'
    },
    zh: {
      'nav.discover': '\u53d1\u73b0', 'nav.brands': '\u54c1\u724c', 'nav.saved': '\u6536\u85cf', 'nav.signin': '\u767b\u5f55',
      'hero.eyebrow': 'AI\u65f6\u5c1a\u53d1\u73b0',
      'hero.headline': '\u53d1\u73b0\u5b83\u3002<br>\u6211\u4eec\u627e\u5230\u5b83\u3002',
      'hero.sub': '\u5728\u793e\u4ea4\u5a92\u4f53\u3001\u8857\u4e0a\u6216\u7535\u89c6\u4e0a\u770b\u5230\u67d0\u4ef6\u5355\u54c1\uff1f\u4e0a\u4f20\u4e00\u5f20\u7167\u7247\uff0c\u6211\u4eec\u7684AI\u7cbe\u51c6\u8bc6\u522b\u8be5\u5355\u54c1\u2014\u2014\u9644\u4e0a\u6240\u6709\u5546\u5e97\u548c\u4ef7\u683c\u3002\u592a\u8d35\uff1f\u6211\u4eec\u4e5f\u4f1a\u63a8\u8350\u66f4\u806a\u660e\u7684\u66ff\u4ee3\u9009\u62e9\u3002',
      'search.tab.link': '\u7c98\u8d34\u94fe\u63a5', 'search.tab.upload': '\u4e0a\u4f20\u7167\u7247', 'search.tab.text': '\u66ff\u4ee3\u9009\u62e9', 'search.tab.camera': '\u62cd\u7167',
      'search.tab.reverse': '\u627e\u539f\u578b', 'search.btnReverse': '\u627e\u539f\u578b', 'search.btnSource': '\u8bc6\u522b', 'search.subtab.describe': '\u63cf\u8ff0', 'search.subtab.photo': '\u7167\u7247', 'search.subtab.link': '\u94fe\u63a5', 'search.placeholder.reverse': '\u63cf\u8ff0\u4f60\u770b\u5230\u7684\u5355\u54c1\uff0c\u4f8b\u5982"\u9ed1\u8272\u7ed7\u7f1d\u94fe\u6761\u5305"...',
      'search.placeholder.link': '\u7c98\u8d34\u4efb\u4f55\u65f6\u5c1a\u7f51\u7ad9\u7684\u4ea7\u54c1\u94fe\u63a5...',
      'search.placeholder.text': '\u63cf\u8ff0\u5355\u54c1\uff0c\u4f8b\u5982\u201c\u5976\u6cb9\u8272\u7f0e\u9762\u4e2d\u88d9\u201d...',
      'search.btn': '\u627e\u66ff\u4ee3\u9009\u62e9',
      'search.upload.hint': '\u62d6\u653e\u6216<strong>\u6d4f\u89c8</strong>',
      'search.upload.formats': 'JPG\u3001PNG\u6216WEBP\uff0c\u6700\u592710MB',
      'search.upload.ready': '\u51c6\u5907\u641c\u7d22',
      'search.status': 'AI\u6b63\u5728\u8bc6\u522b\u4f60\u7684\u5355\u54c1',
      'search.tab.camera': '\u62cd\u7167', 'camera.start': '\u70b9\u51fb\u6253\u5f00\u76f8\u673a', 'camera.hint': '\u5bf9\u51c6\u4efb\u610f\u5355\u54c1\u2014\u2014\u6211\u4eec\u6765\u8bc6\u522b\u3002', 'camera.retake': '\u91cd\u62cd', 'camera.use': '\u8bc6\u522b', 'camera.error': '\u65e0\u6cd5\u8bbf\u95ee\u76f8\u673a\uff0c\u8bf7\u68c0\u67e5\u6743\u9650\u3002',
      'recent.label': '\u6700\u8fd1', 'recent.clear': '\u6e05\u9664',
      'trending.label': '\u70ed\u95e8\u641c\u7d22',
      'hero.searching': '\u641c\u7d22\u8303\u56f4', 'hero.scroll': '\u5411\u4e0b\u6ed1\u52a8\u63a2\u7d22',
      'celeb.eyebrow': '\u98ce\u683c\u7075\u611f', 'celeb.title': '\u590d\u523b\u8fd9\u8eab\u9020\u578b', 'celeb.sub': '\u53d1\u73b0\u8fd9\u79cd\u7f8e\u5b66\u2014\u2014\u6211\u4eec\u5e2e\u4f60\u627e\u5230\u540c\u6b3e\u5355\u54c1\u3002', 'celeb.btn': '\u9009\u8d2d\u8fd9\u8eab\u9020\u578b',
      'celeb.c1.name': '\u9759\u5962', 'celeb.c1.desc': '\u4f4e\u8c03\u7684\u4f18\u96c5\u3002\u4e2d\u6027\u8272\u8c03\u3001\u7f8a\u7ed2\u886b\u548c\u5229\u843d\u7684\u5267\u5f71\uff0c\u7075\u611f\u6765\u81ea\u8001\u94b1\u7b80\u7ea6\u4e3b\u4e49\u3002',
      'celeb.c2.name': '\u8857\u5934\u65f6\u5c1a', 'celeb.c2.desc': '\u5927\u80c6\u3001\u81ea\u4fe1\u3001\u6f47\u6d12\u3002\u5bbd\u677e\u897f\u88c5\u3001\u76ae\u88e4\u548c\u6f6e\u978b\uff0c\u76f4\u63a5\u6765\u81ea\u65f6\u88c5\u5468\u3002',
      'celeb.c3.name': '\u8001\u94b1\u98ce', 'celeb.c3.desc': '\u7ecf\u5178\u4f18\u96c5\u3002\u5b9a\u5236\u5927\u8863\u3001\u73cd\u73e0\u70b9\u7f00\u3001\u4e50\u798f\u978b\u548c\u7ed3\u6784\u5316\u624b\u888b\u3002',
      'celeb.c4.name': '\u6cd5\u5f0f\u5973\u5b69', 'celeb.c4.desc': '\u6bc5\u4e0d\u8d39\u529b\u7684\u65f6\u5c1a\u3002\u6d77\u9b42\u886b\u3001\u4e2d\u88d9\u3001\u82ad\u857e\u821e\u978b\u548c\u5b8c\u7f8e\u7684\u5df4\u9ece\u98ce\u60c5\u3002',
      'dotd.eyebrow': '\u4eca\u65e5\u53d1\u73b0', 'dotd.original': '\u539f\u578b', 'dotd.dupe': '\u806a\u660e\u66ff\u4ee3', 'dotd.vs': 'VS', 'dotd.btn': '\u53bb\u9009\u8d2d',
      'calc.eyebrow': '\u667a\u80fd\u5bfb\u6e90', 'calc.title': '\u4f60\u80fd\u8282\u7701\u591a\u5c11\uff1f', 'calc.sub': '\u540c\u4e00\u5355\u54c1\uff0c\u4e0d\u540c\u5546\u5e97\u2014\u2014\u770b\u770b\u667a\u80fd\u5bfb\u6e90\u4e3a\u4f60\u7701\u4e0b\u591a\u5c11\u3002', 'calc.budget': '\u6bcf\u6708\u65f6\u5c1a\u9884\u7b97', 'calc.perMonth': '\u6bcf\u6708', 'calc.perYear': '\u6bcf\u5e74', 'calc.fiveYears': '5\u5e74\u5185', 'calc.note': '\u57fa\u4e8e\u6211\u4eec\u4e3a\u540c\u4e00\u9020\u578b\u5728\u4e0d\u540c\u5546\u5e97\u548c\u66ff\u4ee3\u9009\u62e9\u95f4\u627e\u5230\u7684\u5e73\u5747\u4ef7\u683c\u5dee\u3002',
      'filter.category': '\u5206\u7c7b', 'filter.bags': '\u5305\u888b', 'filter.shoes': '\u978b\u5b50', 'filter.clothing': '\u670d\u88c5', 'filter.jewellery': '\u73e0\u5b9d', 'filter.accessories': '\u914d\u9970',
      'filter.material': '\u6750\u8d28', 'filter.natural': '\u5929\u7136\u7ea4\u7ef4', 'filter.nopolyester': '\u65e0\u805a\u916f', 'filter.vegan': '\u7d20\u98df',
      'filter.price': '\u4ef7\u683c', 'filter.all': '\u5168\u90e8', 'filter.store': '\u5e97\u94fa', 'filter.allStores': '\u6240\u6709\u5e97\u94fa', 'filter.sortBy': '\u6392\u5e8f',
      'sort.match': '\u6700\u4f73\u5339\u914d', 'sort.priceAsc': '\u4ef7\u683c\uff1a\u4ece\u4f4e\u5230\u9ad8', 'sort.priceDesc': '\u4ef7\u683c\uff1a\u4ece\u9ad8\u5230\u4f4e', 'sort.saving': '\u6700\u5927\u8282\u7701',
      'results.eyebrow': '\u6700\u60f3\u8981', 'results.title': '\u672c\u5468\u6700\u5e38\u88ab\u8bc6\u522b', 'results.subtitle': '\u672c\u5468\u7504\u9009\u2014\u2014\u5373\u523b\u9009\u8d2d\u3002',
      'results.ai.eyebrow': 'AI\u7ed3\u679c', 'results.ai.title': '\u4f60\u7684\u7ed3\u679c\u5df2\u5c31\u7eea', 'results.demo.eyebrow': '\u6f14\u793a\u7ed3\u679c', 'results.demo.hint': '\u5728\u8bbe\u7f6e\u4e2d\u6dfb\u52a0API\u5bc6\u94a5\u4ee5\u83b7\u53d6\u771f\u5b9eAI\u7ed3\u679c', 'results.bestDupe': '\u6700\u4f73\u5339\u914d', 'results.moreAlts': 'Spotted Alternatives',
      'results.loading.title': 'AI\u6b63\u5728\u5206\u6790\u60a8\u7684\u5355\u54c1\u2026', 'results.loading.sub': '\u5728\u516d\u5bb6\u5e97\u94fa\u4e2d\u5bfb\u627e\u6700\u4f73\u66ff\u4ee3',
      'reverse.loading': '\u6b63\u5728\u8bc6\u522b\u5962\u4f88\u54c1\u539f\u578b\u2026', 'reverse.loadingSub': '\u5c06\u60a8\u7684\u5355\u54c1\u4e0e\u8bbe\u8ba1\u5e08\u7cfb\u5217\u5339\u914d', 'reverse.eyebrow': 'Sourced Original', 'reverse.title': '\u627e\u5230\u539f\u578b\u4e86', 'reverse.for': '\u5df2\u8bc6\u522b\u539f\u578b', 'reverse.originalLabel': '\u539f\u578b', 'reverse.identifiedAs': '\u8bc6\u522b\u4e3a', 'reverse.dupeBelow': 'Spotted Alternatives',
      'how.eyebrow': '\u5982\u4f55\u8fd0\u4f5c', 'how.title': '\u4e09\u6b65\u627e\u5230\u4f60\u7231\u7684',
      'demo.eyebrow': '\u89c2\u770b\u6f14\u793a', 'demo.title': '\u4ece\u53d1\u73b0\u5230\u6e90\u5934\uff0c\u53ea\u9700\u51e0\u79d2', 'demo.sub': '\u5c06\u955c\u5934\u5bf9\u51c6\u4efb\u610f\u5355\u54c1\uff0c\u770bALTERE\u7cbe\u51c6\u8bc6\u522b\u8be5\u5355\u54c1\u2014\u2014\u5e76\u544a\u8bc9\u4f60\u5728\u54ea\u91cc\u8d2d\u4e70\u3002', 'demo.step1': '\u62cd\u4e00\u5f20\u7167\u7247', 'demo.step2': '\u6211\u4eec\u8bc6\u522b\u539f\u54c1', 'demo.step3': '\u6240\u6709\u5546\u5e97\u4e0e\u4ef7\u683c',
      'how.step1.title': '\u4e0a\u4f20\u6216\u7c98\u8d34', 'how.step1.desc': '\u5206\u4eab\u4efb\u4f55\u65f6\u5c1a\u5355\u54c1\u7684\u7167\u7247\u3001\u94fe\u63a5\u6216\u63cf\u8ff0 \u2014 \u5962\u4f88\u6216\u5e73\u4ef7\u3002',
      'how.step2.title': 'AI\u5206\u6790', 'how.step2.desc': '\u6211\u4eec\u7684\u6a21\u578b\u5728\u51e0\u79d2\u5185\u5206\u6790\u9762\u6599\u3001\u526a\u88c1\u3001\u989c\u8272\u548c\u5251\u5f71\u3002',
      'how.step3.title': '\u53d1\u73b0\u66ff\u4ee3\u54c1', 'how.step3.desc': '\u6d4f\u89c8\u5e26\u6709\u5339\u914d\u5ea6\u3001\u4ef7\u683c\u548c\u76f4\u63a5\u94fe\u63a5\u7684\u6392\u540d\u66ff\u4ee3\u54c1\u3002',
      'faq.eyebrow': '\u5e2e\u52a9', 'faq.title': '\u5e38\u89c1\u95ee\u9898',
      'faq.q1': 'AI\u5982\u4f55\u8bc6\u522b\u5355\u54c1\uff1f', 'faq.a1': '\u6211\u4eec\u7684AI\u89c6\u89c9\u6a21\u578b\u5206\u6790\u4f60\u7167\u7247\u3001\u94fe\u63a5\u6216\u63cf\u8ff0\u4e2d\u7684\u5355\u54c1\u2014\u2014\u5c06\u5176\u62c6\u89e3\u4e3a\u9762\u6599\u3001\u526a\u88c1\u3001\u989c\u8272\u3001\u5ed3\u5f62\u548c\u5de5\u827a\uff0c\u7136\u540e\u7cbe\u51c6\u8bc6\u522b\u8be5\u5355\u54c1\u53ca\u8d2d\u4e70\u6e20\u9053\uff1b\u5982\u679c\u4f60\u60f3\u5c11\u82b1\u70b9\uff0c\u4e5f\u4f1a\u6309\u5339\u914d\u5ea6\u5448\u73b0\u6700\u63a5\u8fd1\u7684\u66ff\u4ee3\u9009\u62e9\u3002',
      'faq.q2': '\u94fe\u63a5\u662f\u8054\u76df\u94fe\u63a5\u5417\uff1f', 'faq.a2': '\u90e8\u5206\u94fe\u63a5\u53ef\u80fd\u662f\u8054\u76df\u94fe\u63a5\uff0c\u610f\u5473\u7740\u4f60\u8d2d\u4e70\u65f6\u6211\u4eec\u4f1a\u83b7\u5f97\u5c11\u91cf\u4f63\u91d1\u2014\u2014\u4f60\u65e0\u9700\u989d\u5916\u4ed8\u8d39\u3002\u4f63\u91d1\u7edd\u4e0d\u4f1a\u51b3\u5b9a\u5c55\u793a\u54ea\u4e9b\u5355\u54c1\uff1b\u7ed3\u679c\u4ec5\u6309\u5339\u914d\u8d28\u91cf\u6392\u5e8f\u3002',
      'faq.q3': 'ALTERE\u514d\u8d39\u5417\uff1f', 'faq.a3': '\u662f\u7684\uff0cALTERE\u5b8c\u5168\u514d\u8d39\u3002\u4f60\u53ef\u4ee5\u65e0\u9650\u6b21\u641c\u7d22\u3001\u4fdd\u5b58\u6536\u85cf\u5e76\u5206\u4eab\u2014\u2014\u65e0\u9700\u8d26\u6237\u6216\u4ed8\u8d39\u3002',
      'faq.q4': '\u5339\u914d\u767e\u5206\u6bd4\u51c6\u786e\u5417\uff1f', 'faq.a4': '\u5339\u914d\u767e\u5206\u6bd4\u53cd\u6620\u627e\u5230\u7684\u5355\u54c1\u5728\u591a\u4e2a\u98ce\u683c\u7ef4\u5ea6\u4e0a\u4e0e\u539f\u54c1\u7684\u63a5\u8fd1\u7a0b\u5ea6\u300290%\u4ee5\u4e0a\u8868\u793a\u89c6\u89c9\u4e0a\u975e\u5e38\u63a5\u8fd1\uff1b80\u201390%\u8868\u793a\u9ad8\u5ea6\u76f8\u4f3c\u4f46\u6709\u7ec6\u5fae\u5dee\u5f02\u3002',
      'faq.q5': '\u53ef\u4ee5\u5efa\u8bae\u6dfb\u52a0\u5e97\u94fa\u5417\uff1f', 'faq.a5': '\u5f53\u7136\uff01\u8bf7\u53d1\u9001\u5e97\u94fa\u540d\u79f0\u7ed9\u6211\u4eec\u3002',
      'cookie.text': '\u6211\u4eec\u4f7f\u7528Cookie\u6765\u63d0\u5347\u60a8\u7684\u4f53\u9a8c\u3002', 'cookie.accept': '\u5168\u90e8\u63a5\u53d7', 'cookie.manage': '\u7ba1\u7406\u504f\u597d',
      'about.mission': '\u5962\u534e\u7f8e\u5b66\uff0c\u4eb2\u6c11\u4ef7\u683c\u3002', 'about.storyEyebrow': '\u6211\u4eec\u7684\u6545\u4e8b', 'about.storyTitle': '\u65f6\u5c1a\u5e94\u8be5\u5c5e\u4e8e\u6bcf\u4e2a\u4eba',
      'about.storyP1': 'ALTERE\u8bde\u751f\u4e8e\u4e00\u4e2a\u7b80\u5355\u7684\u6cae\u4e27\uff1a\u7231\u4e0a\u4e00\u4ef6T\u53f0\u5355\u54c1\uff0c\u7136\u540e\u770b\u5230\u4ef7\u683c\u3002',
      'about.storyP2': '\u6240\u4ee5\u6211\u4eec\u6784\u5efa\u4e86\u4e00\u4e2aAI\uff0c\u50cf\u9020\u578b\u5e08\u4e00\u6837\u770b\u65f6\u5c1a \u2014 \u7136\u540e\u641c\u7d22\u6570\u5343\u4ea7\u54c1\u627e\u5230\u6700\u4f73\u5339\u914d\u3002',
      'about.howEyebrow': '\u6280\u672f', 'about.howTitle': '\u6211\u4eec\u7684AI\u5982\u4f55\u5de5\u4f5c',
      'about.step1Title': '\u89c6\u89c9\u89e3\u6784', 'about.step1Desc': '\u6211\u4eec\u7684\u6a21\u578b\u5c06\u6bcf\u4ef6\u5355\u54c1\u5206\u89e3\u4e3a\u6838\u5fc3\u5c5e\u6027\u3002',
      'about.step2Title': '\u8de8\u5e97\u5339\u914d', 'about.step2Desc': '\u5b9e\u65f6\u626b\u63cfZara\u3001H&M\u3001Mango\u3001ASOS\u3001COS\u548c& Other Stories\u7684\u5e93\u5b58\u3002',
      'about.step3Title': '\u667a\u80fd\u6392\u540d', 'about.step3Desc': '\u7ed3\u679c\u6309\u5339\u914d\u7cbe\u5ea6\u3001\u4ef7\u683c\u548c\u53ef\u83b7\u5f97\u6027\u6392\u5e8f\u2014\u2014\u8ba9\u7cbe\u51c6\u7684\u539f\u54c1\u3001\u4ee5\u53ca\u4e4b\u540e\u6700\u4f73\u7684\u66ff\u4ee3\u9009\u62e9\uff0c\u59cb\u7ec8\u6392\u5728\u6700\u524d\u3002',
      'about.teamEyebrow': '\u6211\u4eec\u662f\u8c01', 'about.teamTitle': '\u65f6\u5c1a\u7231\u597d\u8005\u521b\u7acb\uff0c<br>AI\u9a71\u52a8',
      'about.teamDesc': '\u6211\u4eec\u662f\u4e00\u4e2a\u5c0f\u56e2\u961f\uff0c\u7531\u8bbe\u8ba1\u5e08\u3001\u5de5\u7a0b\u5e08\u548c\u65f6\u5c1a\u8fbe\u4eba\u7ec4\u6210\uff0c\u4f7f\u547d\u662f\u8ba9\u65f6\u5c1a\u6c11\u4e3b\u5316\u3002',
      'about.cta': '\u5f00\u59cb\u8bc6\u522b\u5355\u54c1',
      'waitlist.eyebrow': '\u65e9\u671f\u8bbf\u95ee', 'waitlist.title': '\u6210\u4e3a\u7b2c\u4e00\u4e2a\u77e5\u9053\u7684\u4eba<br>\u5f53\u6211\u4eec\u4e0a\u7ebf\u65f6',
      'waitlist.sub': '\u52a0\u5165\u6570\u5343\u540d\u5df2\u5728\u5217\u8868\u4e2d\u7684\u65f6\u5c1a\u7231\u597d\u8005\u3002',
      'waitlist.placeholder': '\u8f93\u5165\u60a8\u7684\u7535\u5b50\u90ae\u4ef6', 'waitlist.btn': '\u52a0\u5165\u7b49\u5f85\u540d\u5355',
      'waitlist.hint': '\u6c38\u8fdc\u4e0d\u4f1a\u53d1\u9001\u5783\u573e\u90ae\u4ef6\u3002\u968f\u65f6\u53ef\u4ee5\u9000\u8ba2\u3002',
      'waitlist.success.title': '\u60a8\u5df2\u52a0\u5165\u540d\u5355', 'waitlist.success.desc': 'ALTERE\u4e0a\u7ebf\u65f6\u6211\u4eec\u4f1a\u901a\u77e5\u60a8\u3002',
      'saved.back': '\u8fd4\u56de', 'saved.eyebrow': '\u60a8\u7684\u6536\u85cf', 'saved.title': '\u5df2\u4fdd\u5b58\u5355\u54c1', 'saved.clearAll': '\u6e05\u9664\u5168\u90e8',
      'saved.empty': '\u8fd8\u6ca1\u6709\u4fdd\u5b58\u7684\u5355\u54c1', 'saved.emptyHint': '\u70b9\u51fb\u5fc3\u5f62\u4fdd\u5b58\u4efb\u4f55\u5355\u54c1',
      'footer.tagline': 'AI\u65f6\u5c1a\u89c6\u89c9\u641c\u7d22\u3002\u53d1\u73b0\u5b83\uff0c\u6211\u4eec\u5e2e\u4f60\u627e\u5230\u3002',
      'footer.explore': '\u63a2\u7d22', 'footer.trending': '\u70ed\u95e8', 'footer.newArrivals': '\u65b0\u54c1', 'footer.collections': '\u7cfb\u5217',
      'footer.company': '\u516c\u53f8', 'footer.about': '\u5173\u4e8e', 'footer.careers': '\u62db\u8058', 'footer.privacy': '\u9690\u79c1', 'footer.terms': '\u6761\u6b3e',
      'toast.saved': '\u5df2\u4fdd\u5b58\u5230\u6536\u85cf', 'toast.removed': '\u5df2\u4ece\u6536\u85cf\u4e2d\u79fb\u9664', 'toast.cleared': '\u5df2\u6e05\u9664\u6240\u6709\u4fdd\u5b58\u7684\u5355\u54c1',
      'search.searching': '\u641c\u7d22\u4e2d...', 'search.joining': '\u52a0\u5165\u4e2d...',
      'share.whatsapp': 'WhatsApp', 'share.copy': '\u590d\u5236\u94fe\u63a5', 'share.copied': '\u5df2\u590d\u5236\uff01',
      'share.text': '\u770b\u770b\u8fd9\u4ef6\u5355\u54c1\uff1a{name}\u6765\u81ea{store}\uff0c\u4ec5{price} \u2014 \u901a\u8fc7ALTERE\u53d1\u73b0',
      'share.results': '\u5206\u4eab\u7ed3\u679c', 'share.story': '\u4e0b\u8f7d\u7528\u4e8e\u6545\u4e8b', 'share.story.footer': '\u901a\u8fc7ALTERE\u627e\u5230', 'share.story.downloaded': '\u6545\u4e8b\u56fe\u7247\u5df2\u4e0b\u8f7d',
      'invite.eyebrow': '\u5206\u4eab\u7ed9\u670b\u53cb', 'invite.title': '\u4e0e\u670b\u53cb\u5206\u4eabALTERE', 'invite.sub': '\u8ba4\u8bc6\u559c\u6b22\u65f6\u5c1a\u4f46\u4e0d\u60f3\u591a\u82b1\u94b1\u7684\u4eba\uff1f\u628a\u4ed6\u4eec\u5e26\u6765\u3002', 'invite.copyLink': '\u590d\u5236\u94fe\u63a5',
      'invite.message': '\u770b\u770bALTERE \u2014 AI\u65f6\u5c1a\u89c6\u89c9\u641c\u7d22\u3002\u62cd\u4e0b\u4efb\u610f\u5355\u54c1\uff0c\u5b83\u5c31\u80fd\u627e\u5230\u7cbe\u51c6\u540c\u6b3e\u3001\u6240\u6709\u5546\u5e97\u548c\u4ef7\u683c\uff08\u8fd8\u6709\u66f4\u806a\u660e\u7684\u66ff\u4ee3\u9009\u62e9\uff09\uff01'
    }
  };

  const LANG_LABELS = { en: 'EN', nl: 'NL', fr: 'FR', de: 'DE', es: 'ES', it: 'IT', ar: 'AR', zh: '\u4e2d' };
  const RTL_LANGS   = new Set(['ar']);
  let currentLang = localStorage.getItem(LANG_KEY) || 'en';

  function t(key) {
    return (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) || TRANSLATIONS.en[key] || key;
  }

  function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', RTL_LANGS.has(lang) ? 'rtl' : 'ltr');
    langCurrent.textContent = LANG_LABELS[lang];

    // Update active state
    langMenu.querySelectorAll('.nav__lang-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.lang === lang);
    });

    // Translate all data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if (val) {
        // Preserve child badge spans (like the saved badge)
        const badge = el.querySelector('.nav__badge');
        el.innerHTML = val;
        if (badge) el.appendChild(badge);
      }
    });

    // Translate placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const val = t(key);
      if (val) el.setAttribute('placeholder', val);
    });

    langSwitcher.classList.remove('open');
  }

  // Toggle dropdown — close others first
  langBtn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    // Close other open dropdowns
    sortSelect.classList.remove('open');
    resultsShareDiv?.classList.remove('open');
    closeAllShareDropdowns();
    // Toggle this one
    const isOpen = langSwitcher.classList.contains('open');
    langSwitcher.classList.toggle('open', !isOpen);
  });

  // Prevent clicks inside menu from closing it
  langMenu.addEventListener('click', e => {
    e.stopPropagation();
    const opt = e.target.closest('.nav__lang-option');
    if (!opt) return;
    applyLanguage(opt.dataset.lang);
  });

  // Apply saved language on load
  if (currentLang !== 'en') applyLanguage(currentLang);

  /* ============================================================
     Navigation scroll effect
     ============================================================ */

  const onScroll = () => {
    nav.classList.toggle('nav--scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ============================================================
     Mobile hamburger
     ============================================================ */

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('open');
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('open');
    });
  });

  /* ============================================================
     Search box tabs + sub-tabs
     ============================================================ */

  const tabs      = document.querySelectorAll('.search-box__tab');
  const panels    = document.querySelectorAll('.search-box__panel');
  const subtabRow = document.getElementById('subtabRow');
  const subtabs   = document.querySelectorAll('.search-box__subtab');
  const subpanes  = document.querySelectorAll('.search-box__subpane');

  let activeMainTab = 'reverse'; // 'reverse' | 'text' | 'camera'

  function updateSubmitButtons() {
    // Set button text based on active main tab
    const isOriginal = activeMainTab === 'reverse';
    const btnText = isOriginal
      ? (t('search.btnReverse') || 'Find original')
      : (t('search.btn') || 'Find alternatives');
    const btnClass = isOriginal ? 'search-box__btn--reverse' : '';

    subpanes.forEach(pane => {
      const btn = pane.querySelector('.search-box__btn');
      if (!btn) return;
      btn.textContent = btnText;
      btn.classList.toggle('search-box__btn--reverse', isOriginal);
    });
  }

  // Main tab click
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      activeMainTab = target;

      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      if (target === 'camera') {
        // Hide sub-tabs, show camera panel
        subtabRow.style.display = 'none';
        subpanes.forEach(p => p.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        document.querySelector('.search-box__panel[data-panel="camera"]').classList.add('active');
      } else {
        // Show sub-tabs, hide camera panel
        subtabRow.style.display = '';
        panels.forEach(p => p.classList.remove('active'));
        // Restore active sub-pane
        const activeSub = document.querySelector('.search-box__subtab.active');
        if (activeSub) {
          const subTarget = activeSub.dataset.subtab;
          subpanes.forEach(p => p.classList.remove('active'));
          const pane = document.querySelector(`.search-box__subpane[data-subpane="${subTarget}"]`);
          if (pane) pane.classList.add('active');
        }
        updateSubmitButtons();
      }
    });
  });

  // Sub-tab click
  subtabs.forEach(stab => {
    stab.addEventListener('click', () => {
      const target = stab.dataset.subtab;
      subtabs.forEach(s => s.classList.remove('active'));
      stab.classList.add('active');
      subpanes.forEach(p => p.classList.remove('active'));
      const pane = document.querySelector(`.search-box__subpane[data-subpane="${target}"]`);
      if (pane) pane.classList.add('active');
    });
  });

  /* ============================================================
     File upload / drag-drop
     ============================================================ */

  if (uploadArea) {
    ['dragenter', 'dragover'].forEach(evt => {
      uploadArea.addEventListener(evt, e => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(evt => {
      uploadArea.addEventListener(evt, e => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
      });
    });

    uploadArea.addEventListener('drop', e => {
      const files = e.dataTransfer.files;
      if (files.length) handleFile(files[0]);
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) handleFile(fileInput.files[0]);
    });
  }

  function handleFile(file) {
    if (!file.type.startsWith('image/')) return;
    currentFile = file;

    // Show preview thumbnail
    const url = URL.createObjectURL(file);
    uploadThumb.src = url;
    uploadThumb.onload = () => URL.revokeObjectURL(url);

    // Populate meta
    uploadFilename.textContent = file.name;
    uploadFilesize.textContent = formatFileSize(file.size);

    // Switch to preview state
    uploadArea.classList.add('has-file');
    uploadSearchBtn.disabled = false;
  }

  function clearFile() {
    currentFile = null;
    fileInput.value = '';
    uploadThumb.src = '';
    uploadFilename.textContent = '';
    uploadFilesize.textContent = '';
    uploadArea.classList.remove('has-file');
    uploadSearchBtn.disabled = true;
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // Remove button — prevent label click from reopening file picker
  if (uploadRemove) {
    uploadRemove.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      clearFile();
    });
  }

  /* ============================================================
     Link preview
     ============================================================ */

  const linkInput = document.getElementById('linkInput');

  /* ============================================================
     Camera capture
     ============================================================ */

  const cameraStart      = document.getElementById('cameraStart');
  const cameraViewfinder = document.getElementById('cameraViewfinder');
  const cameraVideo      = document.getElementById('cameraVideo');
  const cameraShutter    = document.getElementById('cameraShutter');
  const cameraPreview    = document.getElementById('cameraPreview');
  const cameraCanvas     = document.getElementById('cameraCanvas');
  const cameraRetake     = document.getElementById('cameraRetake');
  const cameraUse        = document.getElementById('cameraUse');
  let cameraStream       = null;
  let capturedBlob       = null;

  // Open camera
  cameraStart.addEventListener('click', async () => {
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } }
      });
      cameraVideo.srcObject = cameraStream;
      cameraStart.style.display = 'none';
      cameraViewfinder.classList.add('active');
      cameraPreview.classList.remove('active');
    } catch (err) {
      showToast(t('camera.error') || 'Could not access camera. Please check permissions.', true);
    }
  });

  // Capture photo
  cameraShutter.addEventListener('click', () => {
    if (!cameraStream) return;
    const ctx = cameraCanvas.getContext('2d');
    cameraCanvas.width  = cameraVideo.videoWidth;
    cameraCanvas.height = cameraVideo.videoHeight;
    ctx.drawImage(cameraVideo, 0, 0);

    // Convert to blob
    cameraCanvas.toBlob(blob => {
      capturedBlob = blob;
    }, 'image/jpeg', 0.9);

    // Stop stream and show preview
    stopCamera();
    cameraViewfinder.classList.remove('active');
    cameraPreview.classList.add('active');
  });

  // Retake
  cameraRetake.addEventListener('click', async () => {
    capturedBlob = null;
    cameraPreview.classList.remove('active');
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } }
      });
      cameraVideo.srcObject = cameraStream;
      cameraViewfinder.classList.add('active');
    } catch {
      cameraStart.style.display = '';
    }
  });

  // Use photo → search
  cameraUse.addEventListener('click', () => {
    if (!capturedBlob) return;
    const file = new File([capturedBlob], 'camera-photo.jpg', { type: 'image/jpeg' });
    cameraUse.textContent = t('search.searching');
    cameraUse.style.background = '#B8954F';
    performSearch('Camera photo', 'image', file);

    // Reset after search starts
    setTimeout(() => {
      cameraUse.textContent = t('camera.use') || 'Identify it';
      cameraUse.style.background = '';
    }, 2000);
  });

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
  }

  // Stop camera when switching away from the camera tab
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      if (tab.dataset.tab !== 'camera') {
        stopCamera();
        cameraViewfinder.classList.remove('active');
        cameraPreview.classList.remove('active');
        cameraStart.style.display = '';
      }
    });
  });

  /* ============================================================
     Filters (price + store)
     ============================================================ */

  // --- Category filter (single-select) ---
  categoryFilters.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn--cat');
    if (!btn) return;

    categoryFilters.querySelectorAll('.filter-btn--cat').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCategory = btn.dataset.category;
    applyFilters();
  });

  // --- Material filter (single-select) ---
  materialFilters.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn--mat');
    if (!btn) return;

    materialFilters.querySelectorAll('.filter-btn--mat').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeMaterial = btn.dataset.material;
    applyFilters();
  });

  // --- Price filter (single-select) ---
  priceFilters.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;

    priceFilters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    activeMinPrice = parseInt(btn.dataset.min, 10);
    activeMaxPrice = parseInt(btn.dataset.max, 10);
    applyFilters();
  });

  // --- Store filter (multi-select) ---
  storeFilters.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn--store');
    if (!btn) return;

    const store = btn.dataset.store;
    const allBtn = storeFilters.querySelector('[data-store="all"]');

    if (store === 'all') {
      // "All Stores" clears individual selections
      activeStores.clear();
      storeFilters.querySelectorAll('.filter-btn--store').forEach(b => b.classList.remove('active'));
      allBtn.classList.add('active');
    } else {
      // Toggle individual store
      allBtn.classList.remove('active');

      if (activeStores.has(store)) {
        activeStores.delete(store);
        btn.classList.remove('active');
      } else {
        activeStores.add(store);
        btn.classList.add('active');
      }

      // If nothing selected, revert to "All"
      if (activeStores.size === 0) {
        allBtn.classList.add('active');
      }
    }

    applyFilters();
  });

  // --- Shared apply logic ---
  function applyFilters() {
    const cards = resultsGrid.querySelectorAll('.dupe-card:not(.dupe-card--skeleton)');
    let visibleCount = 0;

    cards.forEach(card => {
      const price    = parseFloat(card.dataset.price);
      const store    = card.dataset.store;
      const category = card.dataset.category || '';

      // Category check
      const catPass = activeCategory === 'all' || category === activeCategory;

      // Material check
      const material = card.dataset.material || '';
      const matPass = activeMaterial === 'all' || material === activeMaterial;

      // Price check
      const priceAll  = activeMinPrice === 0 && activeMaxPrice === 0;
      const aboveMin  = activeMinPrice === 0 || price >= activeMinPrice;
      const belowMax  = activeMaxPrice === 0 || price < activeMaxPrice;
      const pricePass = priceAll || (aboveMin && belowMax);

      // Store check
      const storePass = activeStores.size === 0 || activeStores.has(store);

      const show = catPass && matPass && pricePass && storePass;
      card.classList.toggle('filter-hidden', !show);
      if (show) visibleCount++;
    });

    // Empty state
    const existing = resultsGrid.querySelector('.results__empty');
    if (visibleCount === 0 && cards.length > 0) {
      if (!existing) {
        const empty = document.createElement('div');
        empty.className = 'results__empty';
        empty.innerHTML = '<p>No items match those filters</p><small>Try adjusting your price or store selection</small>';
        resultsGrid.appendChild(empty);
      }
    } else if (existing) {
      existing.remove();
    }
  }

  function resetFilters() {
    activeMinPrice = 0;
    activeMaxPrice = 0;
    activeCategory = 'all';
    activeMaterial = 'all';
    activeStores.clear();
    activeSort = 'match';
    categoryFilters.querySelectorAll('.filter-btn--cat').forEach(b => {
      b.classList.toggle('active', b.dataset.category === 'all');
    });
    materialFilters.querySelectorAll('.filter-btn--mat').forEach(b => {
      b.classList.toggle('active', b.dataset.material === 'all');
    });
    priceFilters.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.min === '0' && b.dataset.max === '0');
    });
    storeFilters.querySelectorAll('.filter-btn--store').forEach(b => {
      b.classList.toggle('active', b.dataset.store === 'all');
    });
    sortMenu.querySelectorAll('.sort-select__option').forEach(o => {
      o.classList.toggle('active', o.dataset.sort === 'match');
    });
    sortLabel.textContent = 'Best match';
    sortSelect.classList.remove('open');
  }

  /* ============================================================
     Sort
     ============================================================ */

  const sortSelect  = document.getElementById('sortSelect');
  const sortTrigger = document.getElementById('sortTrigger');
  const sortLabel   = document.getElementById('sortLabel');
  const sortMenu    = document.getElementById('sortMenu');
  let activeSort    = 'match';

  sortTrigger.addEventListener('click', e => {
    e.stopPropagation();
    langSwitcher.classList.remove('open');
    resultsShareDiv?.classList.remove('open');
    sortSelect.classList.toggle('open');
  });

  sortMenu.addEventListener('click', e => {
    const opt = e.target.closest('.sort-select__option');
    if (!opt) return;
    e.stopPropagation();

    activeSort = opt.dataset.sort;
    sortLabel.textContent = opt.textContent;
    sortMenu.querySelectorAll('.sort-select__option').forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
    sortSelect.classList.remove('open');

    applySortAndFilter();
  });

  // Sort dropdown close is handled by the global handler below

  function applySortAndFilter() {
    // Gather non-skeleton cards
    const cards = Array.from(resultsGrid.querySelectorAll('.dupe-card:not(.dupe-card--skeleton)'));
    if (cards.length === 0) return;

    // Sort
    cards.sort((a, b) => {
      const priceA = parseFloat(a.dataset.price) || 0;
      const priceB = parseFloat(b.dataset.price) || 0;
      const matchA = parseInt(a.querySelector('.dupe-card__match span')?.textContent) || 0;
      const matchB = parseInt(b.querySelector('.dupe-card__match span')?.textContent) || 0;
      const origA  = parseFloat((a.querySelector('.dupe-card__original')?.textContent || '0').replace(/[^0-9.]/g, '')) || 0;
      const origB  = parseFloat((b.querySelector('.dupe-card__original')?.textContent || '0').replace(/[^0-9.]/g, '')) || 0;
      const savingA = origA > 0 ? origA - priceA : 0;
      const savingB = origB > 0 ? origB - priceB : 0;

      switch (activeSort) {
        case 'price-asc':  return priceA - priceB;
        case 'price-desc': return priceB - priceA;
        case 'saving':     return savingB - savingA;
        case 'match':
        default:           return matchB - matchA;
      }
    });

    // Re-append in sorted order (preserves elements + event listeners)
    cards.forEach(card => resultsGrid.appendChild(card));

    // Re-apply price + store filters on the new order
    applyFilters();
  }

  /* ============================================================
     Saved items system
     ============================================================ */

  function getSavedItems() {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || []; }
    catch { return []; }
  }

  function setSavedItems(items) {
    localStorage.setItem(SAVED_KEY, JSON.stringify(items));
    updateBadge();
  }

  function generateItemId(item) {
    return `${item.store}::${item.product_name}`.toLowerCase();
  }

  function isItemSaved(item) {
    const id = generateItemId(item);
    return getSavedItems().some(s => generateItemId(s) === id);
  }

  function saveItem(item) {
    const items = getSavedItems();
    const id = generateItemId(item);
    if (!items.some(s => generateItemId(s) === id)) {
      items.push(item);
      setSavedItems(items);
    }
  }

  function unsaveItem(item) {
    const id = generateItemId(item);
    setSavedItems(getSavedItems().filter(s => generateItemId(s) !== id));
  }

  function updateBadge() {
    const count = getSavedItems().length;
    savedBadge.textContent = count;
    savedBadge.classList.toggle('visible', count > 0);
  }

  // Extract item data from a card DOM element
  function extractCardData(card) {
    const img = card.querySelector('.dupe-card__image img');
    return {
      store: card.dataset.store || '',
      product_name: card.querySelector('.dupe-card__name')?.textContent || '',
      dupe_price: parseFloat(card.dataset.price) || 0,
      original_price: parseFloat((card.querySelector('.dupe-card__original')?.textContent || '0').replace(/[^0-9.]/g, '')) || 0,
      match_percentage: parseInt((card.querySelector('.dupe-card__match span')?.textContent || '0')) || 0,
      image_url: (img && img.src && !img.classList.contains('loading')) ? img.src : ''
    };
  }

  // Bind save handler to all heart buttons in a container
  function bindSaveButtons(container) {
    container.querySelectorAll('.dupe-card__save').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const card = btn.closest('.dupe-card');
        if (!card) return;
        const item = extractCardData(card);

        if (btn.classList.contains('saved')) {
          btn.classList.remove('saved');
          unsaveItem(item);
          showToast(t('toast.removed'));
        } else {
          btn.classList.add('saved', 'pop');
          btn.addEventListener('animationend', () => btn.classList.remove('pop'), { once: true });
          saveItem(item);
          showToast(t('toast.saved'));
        }
      });
    });
  }

  // Mark hearts on cards that are already saved
  function syncSaveStates(container) {
    container.querySelectorAll('.dupe-card').forEach(card => {
      const item = extractCardData(card);
      const btn = card.querySelector('.dupe-card__save');
      if (btn && isItemSaved(item)) {
        btn.classList.add('saved');
      }
    });
  }

  // --- Share buttons ---
  function buildShareText(card) {
    const name  = card.querySelector('.dupe-card__name')?.textContent || '';
    const store = card.querySelector('.dupe-card__store')?.textContent || '';
    const price = card.querySelector('.dupe-card__price')?.textContent || '';
    return t('share.text').replace('{name}', name).replace('{store}', store).replace('{price}', price);
  }

  function bindShareButtons(container) {
    container.querySelectorAll('.dupe-card__share').forEach(btn => {
      // Toggle dropdown
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const wasActive = btn.classList.contains('active');
        closeAllShareDropdowns();
        if (!wasActive) btn.classList.add('active');
      });

      // WhatsApp
      btn.querySelector('.share-dropdown__whatsapp')?.addEventListener('click', e => {
        e.stopPropagation();
        const card = btn.closest('.dupe-card');
        const text = encodeURIComponent(buildShareText(card));
        window.open(`https://wa.me/?text=${text}`, '_blank');
        closeAllShareDropdowns();
      });

      // Copy link
      btn.querySelector('.share-dropdown__copy')?.addEventListener('click', e => {
        e.stopPropagation();
        const card = btn.closest('.dupe-card');
        const text = buildShareText(card);
        navigator.clipboard.writeText(text).then(() => {
          const copyBtn = btn.querySelector('.share-dropdown__copy');
          copyBtn.classList.add('copied');
          copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>${t('share.copied')}`;
          setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Copy link`;
            closeAllShareDropdowns();
          }, 1200);
        });
      });
    });
  }

  function closeAllShareDropdowns() {
    document.querySelectorAll('.dupe-card__share.active').forEach(s => s.classList.remove('active'));
  }

  // Card share dropdown close is handled by the global handler below

  // --- Saved page ---
  savedLink.addEventListener('click', e => {
    e.preventDefault();
    hamburger.classList.remove('active');
    navLinks.classList.remove('open');
    openSavedPage();
  });

  savedBack.addEventListener('click', () => closeSavedPage());

  savedClearAll.addEventListener('click', () => {
    setSavedItems([]);
    renderSavedPage();
    // Unsave hearts on visible cards
    document.querySelectorAll('.dupe-card__save.saved').forEach(b => b.classList.remove('saved'));
    showToast(t('toast.cleared'));
  });

  function openSavedPage() {
    renderSavedPage();
    savedPage.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeSavedPage() {
    savedPage.classList.remove('open');
    document.body.style.overflow = '';
  }

  function renderSavedPage() {
    const items = getSavedItems();
    savedGrid.innerHTML = '';
    savedEmpty.classList.toggle('visible', items.length === 0);
    savedClearAll.style.display = items.length === 0 ? 'none' : '';

    items.forEach((item, i) => {
      const savings = item.original_price > 0
        ? Math.round(((item.original_price - item.dupe_price) / item.original_price) * 100)
        : 0;

      const card = document.createElement('article');
      card.className = 'dupe-card reveal visible';
      card.style.transitionDelay = `${i * 0.06}s`;

      let imageContent;
      if (item.image_url) {
        imageContent = `<img src="${escapeAttr(item.image_url)}" alt="${escapeAttr(item.product_name)}" loading="lazy">`;
      } else {
        const fallbackImages = [
          'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=400&fit=crop&q=80',
          'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=400&h=400&fit=crop&q=80', 
          'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&h=400&fit=crop&q=80',
          'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=400&h=400&fit=crop&q=80'
        ];
        imageContent = `<img src="${fallbackImages[i % fallbackImages.length]}" alt="${escapeAttr(item.product_name)}" loading="lazy">`;
      }

      card.innerHTML = `
        <div class="dupe-card__image">
          ${imageContent}
          <button class="saved-card__remove" aria-label="Remove" data-index="${i}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          ${savings > 0 ? `<span class="dupe-card__badge">&minus;${savings}%</span>` : ''}
        </div>
        <div class="dupe-card__info">
          <span class="dupe-card__store">${escapeHtml(item.store)}</span>
          <h3 class="dupe-card__name">${escapeHtml(item.product_name)}</h3>
          <div class="dupe-card__price-row">
            <span class="dupe-card__price">$${item.dupe_price.toFixed(2)}</span>
            ${item.original_price > 0 ? `<span class="dupe-card__original">$${item.original_price.toFixed(2)}</span>` : ''}
          </div>
          ${item.match_percentage > 0 ? `
          <div class="dupe-card__match">
            <div class="dupe-card__match-bar"><div class="dupe-card__match-fill" style="width:${item.match_percentage}%"></div></div>
            <span>${item.match_percentage}% match</span>
          </div>` : ''}
        </div>`;

      savedGrid.appendChild(card);
    });

    // Bind remove buttons
    savedGrid.querySelectorAll('.saved-card__remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        const items = getSavedItems();
        const removed = items.splice(idx, 1)[0];
        setSavedItems(items);
        // Unsync heart on the main page
        if (removed) {
          document.querySelectorAll('.dupe-card').forEach(card => {
            const data = extractCardData(card);
            if (generateItemId(data) === generateItemId(removed)) {
              card.querySelector('.dupe-card__save')?.classList.remove('saved');
            }
          });
        }
        renderSavedPage();
        showToast(t('toast.removed'));
      });
    });
  }

  // Update image_url on a saved item when its Unsplash image finishes loading
  function updateSavedItemImage(item) {
    if (!item.image_url) return;
    const items = getSavedItems();
    const id = generateItemId(item);
    const saved = items.find(s => generateItemId(s) === id);
    if (saved && saved.image_url !== item.image_url) {
      saved.image_url = item.image_url;
      setSavedItems(items);
    }
  }

  // Initialize badge on load
  updateBadge();

  /* ============================================================
     Image key helper (Unsplash, optional — server handles AI keys)
     ============================================================ */

  function getUnsplashKey() { return localStorage.getItem(UNSPLASH_KEY) || ''; }

  /* ============================================================
     Auth — Google OAuth + Rate Limit Modals
     ============================================================ */

  const authBtn = document.getElementById('authBtn');
  const navUser = document.getElementById('navUser');
  const navAvatar = document.getElementById('navAvatar');
  const navUserName = document.getElementById('navUserName');
  const navUserEmail = document.getElementById('navUserEmail');
  const navUserDropdown = document.getElementById('navUserDropdown');
  const authModal = document.getElementById('authModal');
  const authModalClose = document.getElementById('authModalClose');
  const anonLimitModal = document.getElementById('anonLimitModal');
  const anonLimitClose = document.getElementById('anonLimitClose');
  const dailyLimitModal = document.getElementById('dailyLimitModal');
  const dailyLimitClose = document.getElementById('dailyLimitClose');
  const dailyCountdown = document.getElementById('dailyCountdown');

  let currentUser = null;
  let searchesRemaining = null;

  // Fetch auth state on load
  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
      const data = await res.json();
      if (data.authenticated) {
        currentUser = data.user;
        searchesRemaining = data.searches_remaining;
        authBtn.style.display = 'none';
        navUser.style.display = '';
        navAvatar.src = data.user.picture || '';
        navUserName.textContent = data.user.name || '';
        navUserEmail.textContent = data.user.email || '';
      } else {
        currentUser = null;
        searchesRemaining = data.searches_remaining;
        authBtn.style.display = '';
        navUser.style.display = 'none';
      }
      updateFreeCounter(searchesRemaining);
    } catch {
      authBtn.style.display = '';
      navUser.style.display = 'none';
    }
  }
  checkAuth();

  // Sign in button → open modal
  if (authBtn) {
    authBtn.addEventListener('click', e => {
      e.preventDefault();
      hamburger.classList.remove('active');
      navLinks.classList.remove('open');
      authModal.classList.add('open');
    });
  }

  // User avatar → toggle dropdown
  if (navUser) {
    navUser.addEventListener('click', () => {
      navUserDropdown.classList.toggle('open');
    });
    document.addEventListener('click', e => {
      if (!navUser.contains(e.target)) navUserDropdown.classList.remove('open');
    });
  }

  // Modal close buttons
  [authModalClose, anonLimitClose, dailyLimitClose].forEach(btn => {
    if (btn) btn.addEventListener('click', () => {
      authModal.classList.remove('open');
      anonLimitModal.classList.remove('open');
      dailyLimitModal.classList.remove('open');
    });
  });

  // Close modals on overlay click
  [authModal, anonLimitModal, dailyLimitModal].forEach(modal => {
    if (modal) modal.addEventListener('click', e => {
      if (e.target === modal) modal.classList.remove('open');
    });
  });

  // Daily countdown timer
  let countdownInterval;
  function startDailyCountdown(resetAt) {
    clearInterval(countdownInterval);
    const target = resetAt ? new Date(resetAt).getTime() : (() => {
      const t = new Date(); t.setUTCHours(24, 0, 0, 0); return t.getTime();
    })();
    function tick() {
      const diff = target - Date.now();
      if (diff <= 0) { dailyCountdown.textContent = '00:00:00'; clearInterval(countdownInterval); return; }
      const days = Math.floor(diff / 86400000);
      const h = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      dailyCountdown.textContent = days > 0 ? `${days}d ${h}:${m}:${s}` : `${h}:${m}:${s}`;
    }
    tick();
    countdownInterval = setInterval(tick, 1000);
  }

  // Show rate limit modal based on error type
  function showRateLimitModal(errorData) {
    // Admin should never see rate limit modals
    if (currentUser?.is_admin) return;

    if (errorData.error === 'signup_required') {
      anonLimitModal.classList.add('open');
    } else if (errorData.error === 'daily_limit') {
      startDailyCountdown(errorData.reset_at);
      dailyLimitModal.classList.add('open');
    }
  }

  /* ============================================================
     Toast notifications
     ============================================================ */

  let toastTimer;
  function showToast(message, isError = false) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.className = isError ? 'toast toast--error visible' : 'toast visible';
    toastTimer = setTimeout(() => { toast.className = 'toast'; }, 4000);
  }

  /* ============================================================
     Loading skeleton cards
     ============================================================ */

  const searchStatus = document.getElementById('searchStatus');

  function showSearchStatus() {
    searchStatus.classList.add('visible');
  }

  function hideSearchStatus() {
    searchStatus.classList.remove('visible');
  }

  function renderSkeletons() {
    resultsGrid.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const card = document.createElement('article');
      card.className = 'dupe-card dupe-card--skeleton reveal visible';
      card.style.animationDelay = `${i * 0.07}s`;
      card.innerHTML = `
        <div class="dupe-card__image">
          <div class="skeleton-block skeleton-block--image"></div>
        </div>
        <div class="dupe-card__info">
          <div class="skeleton-block skeleton-block--accent"></div>
          <div class="skeleton-block skeleton-block--store"></div>
          <div class="skeleton-block skeleton-block--name"></div>
          <div class="skeleton-block skeleton-block--name2"></div>
          <div class="skeleton-block skeleton-block--price"></div>
          <div class="skeleton-block skeleton-block--bar"></div>
        </div>`;
      resultsGrid.appendChild(card);
    }
  }

  /* ============================================================
     Unsplash image search
     ============================================================ */

  async function searchUnsplashImage(query) {
    const key = getUnsplashKey();
    if (!key) return null;

    const params = new URLSearchParams({
      query,
      per_page: '1',
      orientation: 'portrait',
      content_filter: 'high'
    });

    const res = await fetch(`${UNSPLASH_API}?${params}`, {
      headers: { Authorization: `Client-ID ${key}` }
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.results || data.results.length === 0) return null;

    const photo = data.results[0];
    return {
      url: photo.urls.regular + '&w=600&h=800&fit=crop&crop=center',
      alt: photo.alt_description || query,
      credit: photo.user.name,
      link: photo.user.links.html
    };
  }

  function buildImageSearchQuery(dupe) {
    // Build a focused search: garment type + key descriptors
    const name = dupe.product_name;
    // Strip very generic words, keep fashion-relevant terms
    const stripped = name
      .replace(/\b(the|a|an|with|and|in|for|of)\b/gi, '')
      .trim();
    return `${stripped} fashion clothing`;
  }


  async function loadCardImage(card, dupe, index) {
    const imgEl  = card.querySelector('.dupe-card__image img');
    const shimmer = card.querySelector('.dupe-card__img-shimmer');
    if (!imgEl) return;

    const searchQuery = buildImageSearchQuery(dupe);

    try {
      const result = await searchUnsplashImage(searchQuery);

      if (result) {
        // Preload image before showing
        const preload = new Image();
        preload.onload = () => {
          imgEl.src = result.url;
          imgEl.alt = result.alt;
          imgEl.classList.remove('loading');
          imgEl.classList.add('loaded');
          // Update saved item image if already saved
          updateSavedItemImage(extractCardData(card));
          // Fade out shimmer
          if (shimmer) {
            shimmer.style.opacity = '0';
            shimmer.style.transition = 'opacity 0.4s ease';
            setTimeout(() => shimmer.remove(), 400);
          }
        };
        preload.onerror = () => {
          showColorFallback(card, index, shimmer);
        };
        preload.src = result.url;
      } else {
        // No results — show colour fallback
        showColorFallback(card, index, shimmer);
      }
    } catch {
      showColorFallback(card, index, shimmer);
    }
  }

  function showColorFallback(card, index, shimmer) {
    const imageDiv = card.querySelector('.dupe-card__image');
    // Remove shimmer and img
    if (shimmer) shimmer.remove();
    const img = imageDiv.querySelector('img');
    if (img) img.remove();
    // Use working images from Daily Source data
    const fallbackImages = [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=400&h=400&fit=crop&q=80', 
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=400&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1614179689702-355944cd0918?w=400&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1524672353063-4f66ee1f385e?w=400&h=400&fit=crop&q=80'
    ];
    const workingImg = document.createElement('img');
    workingImg.src = fallbackImages[index % fallbackImages.length];
    workingImg.alt = imageDiv.parentElement.querySelector('.dupe-card__name')?.textContent || 'Fashion item';
    workingImg.loading = 'lazy';
    imageDiv.insertBefore(workingImg, imageDiv.firstChild);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---- Free searches remaining tracker ---- */

  let freeRemaining = FREE_LIMIT;

  function updateFreeCounter(remaining) {
    freeRemaining = remaining;
    searchesRemaining = remaining;
    const el = document.getElementById('freeCounter');
    if (!el) return;

    if (remaining === null || remaining === undefined) {
      el.style.display = 'none';
      return;
    }
    // Admin: unlimited
    if (currentUser?.is_admin || remaining === -1) {
      el.textContent = 'Unlimited searches';
      el.style.display = '';
      return;
    }
    if (remaining > 0) {
      const label = currentUser
        ? `${remaining} searches left this month`
        : `${remaining} free searches remaining`;
      el.textContent = label;
      el.style.display = '';
    } else {
      el.textContent = currentUser ? 'Daily searches used' : 'Free searches used';
      el.style.display = '';
    }
  }

  /* ---- Region meta for currency display ---- */
  let currentRegionMeta = { symbol: '$', currency: 'USD', region: 'WW' };

  function formatPrice(price, symbol) {
    if (!price && price !== 0) return '';
    const sym = symbol || currentRegionMeta.symbol || '$';
    if (typeof price === 'string') {
      const numeric = price.replace(/[^0-9.,]/g, '').replace(',', '.');
      const num = parseFloat(numeric);
      if (!isNaN(num)) return `${sym}${Math.round(num).toLocaleString()}`;
      return price;
    }
    return `${sym}${Math.round(price).toLocaleString()}`;
  }

  /* ---- Search API call ---- */

  async function callSearch(searchBody) {
    // Inject region into every search request
    searchBody.region = currentRegion || localStorage.getItem(REGION_KEY) || '';
    searchBody.country = currentCountry || localStorage.getItem(COUNTRY_KEY) || '';

    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(searchBody),
    });

    if (res.status === 429) {
      const errData = await res.json().catch(() => ({}));
      updateFreeCounter(0);
      showRateLimitModal(errData);
      throw new Error(errData.message || 'Limit reached');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || `Search error ${res.status}`);
    }

    const data = await res.json();
    if (data._rateLimit) {
      updateFreeCounter(data._rateLimit.remaining);
    }
    if (data.region_meta) {
      currentRegionMeta = data.region_meta;
    }

    return data;
  }

  /* ============================================================
     File → base64 helper
     ============================================================ */

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function getMediaType(file) {
    const map = {
      'image/jpeg': 'image/jpeg',
      'image/jpg': 'image/jpeg',
      'image/png': 'image/png',
      'image/webp': 'image/webp',
      'image/gif': 'image/gif'
    };
    return map[file.type] || 'image/jpeg';
  }

  /* ============================================================
     Recent searches
     ============================================================ */

  const RECENT_KEY    = 'altere_recent_searches';
  const RECENT_MAX    = 5;
  const recentWrapper = document.getElementById('recentSearches');
  const recentChips   = document.getElementById('recentChips');
  const recentClear   = document.getElementById('recentClear');

  function getRecentSearches() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; }
    catch { return []; }
  }

  function saveRecentSearch(query, type) {
    if (!query || type === 'image') return; // don't save image uploads
    let items = getRecentSearches();
    // Remove duplicate (case-insensitive)
    items = items.filter(s => s.query.toLowerCase() !== query.toLowerCase());
    items.unshift({ query, type });
    if (items.length > RECENT_MAX) items = items.slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(items));
    renderRecentSearches();
  }

  function renderRecentSearches() {
    const items = getRecentSearches();
    recentChips.innerHTML = '';

    if (items.length === 0) {
      recentWrapper.classList.remove('visible');
      return;
    }

    recentWrapper.classList.add('visible');

    items.forEach(item => {
      const chip = document.createElement('button');
      chip.className = 'recent-chip';
      chip.type = 'button';
      // Truncate display text
      const display = item.query.length > 32 ? item.query.slice(0, 30) + '\u2026' : item.query;
      chip.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${escapeHtml(display)}`;
      chip.title = item.query;
      chip.addEventListener('click', () => {
        performSearch(item.query, item.type, null);
      });
      recentChips.appendChild(chip);
    });
  }

  recentClear.addEventListener('click', () => {
    localStorage.removeItem(RECENT_KEY);
    renderRecentSearches();
  });

  // Initial render
  renderRecentSearches();

  /* ============================================================
     Trending chips
     ============================================================ */

  document.querySelectorAll('.trending__chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const query = chip.dataset.query;
      if (query) performSearch(query, 'text', null);
    });
  });

  /* ============================================================
     Celebrity Looks buttons
     ============================================================ */

  document.querySelectorAll('.celeb__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const query = btn.dataset.query;
      if (query) performSearch(query, 'text', null);
    });
  });

  /* ============================================================
     Reverse search (Find Original)
     ============================================================ */

  /* ---- Describe sub-pane handler ---- */
  const describeInput = document.getElementById('describeInput');
  const describeBtn   = document.getElementById('describeBtn');

  if (describeBtn) {
    describeBtn.addEventListener('click', () => {
      const value = describeInput.value.trim();
      if (!value) {
        describeInput.style.borderColor = '#C9A96E';
        setTimeout(() => { describeInput.style.borderColor = ''; }, 2000);
        return;
      }
      describeBtn.textContent = t('search.searching');
      describeBtn.disabled = true;
      const intent = activeMainTab === 'text' ? 'dupes_only' : 'identify_and_dupes';
      performSearch(value, 'text', null, intent);
    });
  }

  if (describeInput) {
    describeInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && describeBtn) describeBtn.click();
    });
  }

  /* ---- Link sub-pane handler ---- */
  const linkBtn = document.getElementById('linkBtn');

  if (linkBtn) {
    linkBtn.addEventListener('click', () => {
      const value = (linkInput?.value || '').trim();
      if (!value) {
        if (linkInput) linkInput.style.borderColor = '#C9A96E';
        setTimeout(() => { if (linkInput) linkInput.style.borderColor = ''; }, 2000);
        return;
      }
      linkBtn.textContent = t('search.searching');
      linkBtn.disabled = true;
      const intent = activeMainTab === 'text' ? 'dupes_only' : 'identify_and_dupes';
      performSearch(value, 'link', null, intent);
    });
  }

  if (linkInput) {
    linkInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && linkBtn) linkBtn.click();
    });
  }

  /* ============================================================
     Unified Results Renderer
     ============================================================ */

  function renderFullResults(result, query) {
    resultsGrid.innerHTML = '';
    resetFilters();

    const originalFoundEl = document.getElementById('originalFound');
    const bestDupeEl = document.getElementById('bestDupe');
    const moreAltsEl = document.getElementById('moreAlts');

    // Clear previous
    bestDupeEl.innerHTML = '';
    bestDupeEl.classList.remove('visible');
    originalFoundEl.innerHTML = '';
    originalFoundEl.classList.remove('visible');
    const oldNotice = resultsGrid.parentElement.querySelector('p[style*="font-style:italic"]');
    if (oldNotice) oldNotice.remove();
    moreAltsEl.classList.remove('visible');

    const eyebrow = resultsHeader.querySelector('.results__eyebrow');
    const title   = resultsHeader.querySelector('.results__title');
    const sub     = resultsHeader.querySelector('.results__subtitle');

    const originals = result.originals || [];
    const dupes = result.dupes || [];
    const symbol = currentRegionMeta.symbol || '$';

    // --- Not found state ---
    if (result.not_found) {
      eyebrow.textContent = 'No Results';
      title.textContent   = 'Product not found';
      sub.textContent     = result.message || 'Try a different description or a clearer photo.';
      return;
    }

    // --- Luxury Originals (2 cards) ---
    if (originals.length > 0) {
      eyebrow.textContent = 'Luxury Originals';
      title.textContent   = 'The Inspiration';
      sub.textContent     = `Found for \u201c${query}\u201d`;

      const origCards = originals.map(item => {
        const img = item.thumbnail || getCategoryFallback(item.category || 'clothing');
        const price = item.extracted_price ? formatPrice(item.extracted_price, symbol) : (item.price || '');
        const linkAttr = item.link ? `href="${escapeAttr(item.link)}" target="_blank" rel="noopener"` : '';
        return `
          <a ${linkAttr} class="luxury-card">
            <div class="luxury-card__image">
              <img src="${escapeAttr(img)}" alt="${escapeAttr(item.product_name || '')}" loading="lazy" onerror="this.src='${getCategoryFallback(item.category || 'clothing')}'">
            </div>
            <div class="luxury-card__info">
              <div class="luxury-card__brand">${escapeHtml(item.brand || '')}</div>
              <div class="luxury-card__name">${escapeHtml(item.product_name || item.title || '')}</div>
              <div class="luxury-card__price">${escapeHtml(price)}</div>
              ${item.source ? `<div class="luxury-card__cta">View at ${escapeHtml(item.source)} \u2192</div>` : ''}
            </div>
          </a>`;
      }).join('');

      originalFoundEl.innerHTML = `
        <div class="luxury-originals__grid">${origCards}</div>
        <div class="luxury-originals__divider">
          <span>Save up to 95% with high-street alternatives below</span>
        </div>`;
      originalFoundEl.classList.add('visible');
    } else {
      eyebrow.textContent = t('results.ai.eyebrow') || 'AI Results';
      title.textContent   = t('results.ai.title') || 'Your dupes are ready';
      sub.textContent     = `${dupes.length} alternatives for \u201c${query}\u201d`;
    }

    // --- Dupes in grid ---
    if (dupes.length > 0) {
      moreAltsEl.classList.add('visible');
    }

    // --- Limited results notice ---
    if ((result.dupes_limited || dupes.length < 3) && dupes.length > 0) {
      const notice = document.createElement('p');
      notice.style.cssText = 'text-align:center;color:var(--grey-500);font-size:13px;font-style:italic;margin:0 0 16px;padding:0 20px';
      notice.innerHTML = '<span style="color:var(--gold)">Limited matches</span> \u2014 luxury items often have fewer high-street dupes available';
      resultsGrid.parentElement.insertBefore(notice, resultsGrid);
    }

    const category = originals[0]?.category || 'clothing';

    dupes.forEach((dupe, i) => {
      const dupeImg = dupe.image || getCategoryFallback(category);

      const card = document.createElement('article');
      card.className = 'dupe-card reveal';
      card.dataset.store = dupe.store || '';
      card.dataset.category = category;
      card.dataset.material = 'natural';
      card.dataset.price = String(dupe.extracted_price || '0');
      card.style.transitionDelay = `${i * 0.08}s`;

      // Gold pill badge = ONLY for savings
      let savingsBadge = '';
      if (dupe.savings_display && dupe.savings_percent >= 5) {
        savingsBadge = dupe.savings_display.type === 'amount'
          ? `<span class="dupe-card__badge">Save ${escapeHtml(dupe.savings_display.value)}</span>`
          : `<span class="dupe-card__badge">&minus;${escapeHtml(dupe.savings_display.value)}</span>`;
      }

      const dupePrice = dupe.extracted_price ? formatPrice(dupe.extracted_price, symbol) : (dupe.price || '');

      card.innerHTML = `
        <div class="dupe-card__image">
          <img src="${escapeAttr(dupeImg)}" alt="${escapeAttr(dupe.name || '')}" loading="lazy" onerror="this.src='${getCategoryFallback(category)}'">
          <span class="dupe-card__save" aria-label="Save">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </span>
          ${savingsBadge}
        </div>
        <div class="dupe-card__info">
          <span class="dupe-card__store">${escapeHtml(dupe.store || '')}</span>
          <h3 class="dupe-card__name">${escapeHtml(dupe.name || '')}</h3>
          <div class="dupe-card__price-row">
            <span class="dupe-card__price">${escapeHtml(dupePrice)}</span>
          </div>
          <div class="dupe-card__match">
            <div class="dupe-card__match-bar"><div class="dupe-card__match-fill" style="width:0%"></div></div>
            <span>${dupe.match_score || 0}% match</span>
          </div>
        </div>`;

      resultsGrid.appendChild(card);

      requestAnimationFrame(() => requestAnimationFrame(() => {
        card.classList.add('visible');
        const fill = card.querySelector('.dupe-card__match-fill');
        if (fill) fill.style.width = `${dupe.match_score || 0}%`;
      }));
    });

    bindSaveButtons(resultsGrid);
    bindShareButtons(resultsGrid);
    syncSaveStates(resultsGrid);
  }

  /* ============================================================
     Dupe of the Day
     ============================================================ */

  const DOTD_ITEMS = [
    {
      id: 1,
      origBrand: 'BOTTEGA VENETA', origName: 'Cassette Padded Intrecciato Leather Shoulder Bag', origPrice: 4200,
      origImg: 'https://wjhzkqnbxa5dr2rj.public.blob.vercel-storage.com/dotd/1-original-Y42vrzWnHv5X752IwUhoIANFCE2H6R.jpg',
      origLink: 'https://www.google.es/search?ibp=oshop&q=Bottega+Veneta+Cassette+black+leather+shoulder+bag',
      dupeBrand: 'ASOS', dupeName: 'Dickies Samburg Tote Bag', dupePrice: 45,
      dupeImg: 'https://wjhzkqnbxa5dr2rj.public.blob.vercel-storage.com/dotd/1-dupe-y4XcGLj4DO4K1zaPf7IpziD3AsmIEA.jpg',
      dupeLink: 'https://www.google.es/search?ibp=oshop&q=black+quilted+shoulder+bag+woven',
      query: 'Cassette Padded Intrecciato Leather Shoulder Bag'
    },
    {
      id: 2,
      origBrand: 'THE ROW', origName: 'Margaux 15 Suede Tote Bag', origPrice: 6735.73,
      origImg: 'https://wjhzkqnbxa5dr2rj.public.blob.vercel-storage.com/dotd/2-original-oR6fqsJWbMnvulsldqXzf8rhZcBaRw.jpg',
      origLink: 'https://www.google.es/search?ibp=oshop&q=The+Row+Margaux+15+suede+tote+bag',
      dupeBrand: 'COS', dupeName: 'COS Women\'s Bolso Tote Paradigm Ante', dupePrice: 199,
      dupeImg: 'https://wjhzkqnbxa5dr2rj.public.blob.vercel-storage.com/dotd/2-dupe-YzMTqHDOGpkJXX0Paax00h5w7sHcQE.jpg',
      dupeLink: 'https://www.google.es/search?ibp=oshop&q=suede+structured+tote+bag',
      query: 'Margaux 15 Suede Tote Bag'
    },
    {
      id: 3,
      origBrand: 'LOEWE', origName: 'Puzzle Small Bag Black Leather', origPrice: 3000,
      origImg: 'https://wjhzkqnbxa5dr2rj.public.blob.vercel-storage.com/dotd/3-original-iPkejjWkREuKFuHBE5bV8ueAKSPtzN.jpg',
      origLink: 'https://www.google.es/search?ibp=oshop&q=Loewe+Puzzle+small+bag+black+leather',
      dupeBrand: 'PAUL COSTELLOE BAGS', dupeName: 'Bonita Jet Black', dupePrice: 76.55,
      dupeImg: 'https://wjhzkqnbxa5dr2rj.public.blob.vercel-storage.com/dotd/3-dupe-RwQMOo7KVbppfwAKOt66FI4ZT5SRq3.jpg',
      dupeLink: 'https://www.google.es/search?ibp=oshop&q=black+leather+structured+small+bag',
      query: 'Puzzle Small Bag Black Leather'
    },
    {
      id: 4,
      origBrand: 'TOTEME', origName: 'Signature Wool Coat Camel', origPrice: 1190,
      origImg: 'https://wjhzkqnbxa5dr2rj.public.blob.vercel-storage.com/dotd/4-original-FQ5JbWBSNEcxAnBD4CxVF5eVGN0GlF.jpg',
      origLink: 'https://www.google.es/search?ibp=oshop&q=Toteme+Signature+wool+coat+camel',
      dupeBrand: 'ASOS', dupeName: 'New Look Formal Coat In Camel-Neutral', dupePrice: 55.99,
      dupeImg: 'https://wjhzkqnbxa5dr2rj.public.blob.vercel-storage.com/dotd/4-dupe-bqT9MVKPXeZQu4iGVOBT7Q73Eccqkc.jpg',
      dupeLink: 'https://www.google.es/search?ibp=oshop&q=camel+wool+coat+minimalist',
      query: 'Signature Wool Coat Camel'
    },
    {
      id: 5,
      origBrand: 'THE ROW', origName: 'Bare Leather Flat Sandals', origPrice: 1240,
      origImg: 'https://cdn-images.farfetch-contents.com/36/33/27/08/36332708_68312164_1000.jpg',
      origLink: 'https://www.google.es/search?ibp=oshop&q=The+Row+Bare+black+leather+sandals',
      dupeBrand: 'ASOS', dupeName: 'Calvin Klein Black Leather Square Toe Thong Sandals', dupePrice: 99.9,
      dupeImg: 'https://wjhzkqnbxa5dr2rj.public.blob.vercel-storage.com/dotd/5-dupe-QjRAp7nYm4ouhxxCLiTozQSo0yPF99.jpg',
      dupeLink: 'https://www.google.es/search?ibp=oshop&q=black+leather+flat+sandals+minimalist',
      query: 'Bare Leather Flat Sandals'
    },
    {
      id: 6,
      origBrand: 'KHAITE', origName: 'Elena Cashmere Ribbed Tank Top', origPrice: 854,
      origImg: 'https://wjhzkqnbxa5dr2rj.public.blob.vercel-storage.com/dotd/6-original-rv1G7hpKK6VF7qcohQ7jmwT1xFvIAv.jpg',
      origLink: 'https://www.google.es/search?ibp=oshop&q=Khaite+Elena+cashmere+tank+top+cream',
      dupeBrand: 'LOOP CASHMERE', dupeName: 'Ribbed Detail Lofty Cashmere Tank', dupePrice: 258.95,
      dupeImg: 'https://wjhzkqnbxa5dr2rj.public.blob.vercel-storage.com/dotd/6-dupe-vFYUVkF4rmsGDTnFe8Cyh5m7DY1E55.jpg',
      dupeLink: 'https://www.google.es/search?ibp=oshop&q=cream+ribbed+tank+top+cashmere',
      query: 'Elena Cashmere Ribbed Tank Top'
    },
    {
      id: 7,
      origBrand: 'BOTTEGA VENETA', origName: 'Andiamo Mini Intrecciato Bag', origPrice: 3900,
      origImg: 'https://wjhzkqnbxa5dr2rj.public.blob.vercel-storage.com/dotd/7-original-KwM4S45kptYDNTvCXak59gdnhBXxpK.jpg',
      origLink: 'https://www.google.es/search?ibp=oshop&q=Bottega+Veneta+Andiamo+mini+intrecciato+bag',
      dupeBrand: 'ASOS', dupeName: 'Topshop Cheryl large nylon crossbody bag', dupePrice: 34.99,
      dupeImg: 'https://wjhzkqnbxa5dr2rj.public.blob.vercel-storage.com/dotd/7-dupe-7PFzYRQWddoaldlTgLF7Yw3O6yioDK.jpg',
      dupeLink: 'https://www.google.es/search?ibp=oshop&q=compact+textured+crossbody+purse',
      query: 'Andiamo Mini Intrecciato Bag'
    }
  ];

  function renderDupeOfDay() {
    // Pick item based on day of year so it changes daily
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(),0,0)) / 86400000);
    const item = DOTD_ITEMS[dayOfYear % DOTD_ITEMS.length];
    const savings = Math.round(((item.origPrice - item.dupePrice) / item.origPrice) * 100);

    document.getElementById('dotdOrigImg').style.backgroundImage = `url('${item.origImg}')`;
    document.getElementById('dotdOrigBrand').textContent = item.origBrand;
    document.getElementById('dotdOrigName').textContent = item.origName;
    document.getElementById('dotdOrigPrice').textContent = `${currentRegionMeta.symbol}${item.origPrice.toLocaleString()}`;

    document.getElementById('dotdDupeImg').style.backgroundImage = `url('${item.dupeImg}')`;
    document.getElementById('dotdDupeBrand').textContent = item.dupeBrand;
    document.getElementById('dotdDupeName').textContent = item.dupeName;
    document.getElementById('dotdDupePrice').textContent = `${currentRegionMeta.symbol}${item.dupePrice.toFixed(2)}`;

    document.getElementById('dotdSavings').textContent = `\u2212${savings}%`;

    document.getElementById('dotdBtn').addEventListener('click', () => {
      performSearch(item.query, 'text', null);
    });
  }

  renderDupeOfDay();

  /* ============================================================
     Savings Calculator
     ============================================================ */

  const calcSlider  = document.getElementById('calcSlider');
  const calcAmount  = document.getElementById('calcAmount');
  const calcMonth   = document.getElementById('calcMonth');
  const calcYear    = document.getElementById('calcYear');
  const calcFive    = document.getElementById('calcFive');
  const SAVINGS_RATE = 0.68; // average 68% saving

  function formatEuro(n) {
    return '\u20ac' + Math.round(n).toLocaleString();
  }

  function updateCalc() {
    const budget   = parseInt(calcSlider.value, 10);
    const monthly  = Math.round(budget * SAVINGS_RATE);
    const yearly   = monthly * 12;
    const fiveYear = yearly * 5;

    calcAmount.textContent = formatEuro(budget);
    calcMonth.textContent  = formatEuro(monthly);
    calcYear.textContent   = formatEuro(yearly);
    calcFive.textContent   = formatEuro(fiveYear);

    // Update slider track fill via CSS gradient
    const pct = ((budget - 50) / (2000 - 50)) * 100;
    const trackColor = document.documentElement.getAttribute('data-theme') === 'dark' ? '#333' : '#F0EDE8';
    calcSlider.style.background = `linear-gradient(to right, #C9A96E 0%, #C9A96E ${pct}%, ${trackColor} ${pct}%, ${trackColor} 100%)`;
  }

  calcSlider.addEventListener('input', updateCalc);
  updateCalc();

  /* ============================================================
     Main search handler
     ============================================================ */

  async function performSearch(query, type, imageFile, intent) {
    if (isSearching) return;
    isSearching = true;

    showSearchStatus();
    renderSkeletons();
    const resultsSection = document.getElementById('results');
    resultsSection.scrollIntoView({ behavior: 'smooth' });

    const eyebrow = resultsHeader.querySelector('.results__eyebrow');
    const title   = resultsHeader.querySelector('.results__title');
    const sub     = resultsHeader.querySelector('.results__subtitle');
    eyebrow.textContent = t('search.searching').replace('...', '');
    title.textContent   = t('results.loading.title');
    sub.textContent     = t('results.loading.sub');

    try {
      let searchBody;
      let displayQuery = query;

      const searchIntent = intent || 'identify_and_dupes';

      if (type === 'image' && imageFile) {
        const base64 = await fileToBase64(imageFile);
        displayQuery = imageFile.name;
        searchBody = { type: 'image', image: base64, media_type: getMediaType(imageFile), intent: searchIntent };
      } else if (type === 'link') {
        searchBody = { type: 'url', url: query, intent: searchIntent };
      } else {
        searchBody = { type: 'text', query: query, intent: searchIntent };
      }

      const result = await callSearch(searchBody);
      if (result) {
        renderFullResults(result, displayQuery);
        saveRecentSearch(query, type);
      }
    } catch (err) {
      showToast(err.message, true);
      eyebrow.textContent = t('results.eyebrow');
      title.textContent   = t('results.title');
      sub.textContent     = t('results.subtitle');
      restoreDefaultCards();
    } finally {
      isSearching = false;
      hideSearchStatus();
      updateSubmitButtons();
      document.querySelectorAll('.search-box__btn').forEach(b => {
        b.style.background = '';
        if (b.classList.contains('search-box__btn--upload')) {
          b.disabled = !currentFile;
        } else {
          b.disabled = false;
        }
      });
    }
  }

  /* ============================================================
     Default cards (restore on error)
     ============================================================ */

  const defaultCardsHTML = resultsGrid.innerHTML;

  function restoreDefaultCards() {
    resultsGrid.innerHTML = defaultCardsHTML;
    resetFilters();
    // Hide best dupe and more alts
    document.getElementById('bestDupe').innerHTML = '';
    document.getElementById('bestDupe').classList.remove('visible');
    document.getElementById('originalFound').innerHTML = '';
    document.getElementById('originalFound').classList.remove('visible');
    document.getElementById('moreAlts').classList.remove('visible');
    bindSaveButtons(resultsGrid);
    bindShareButtons(resultsGrid);
    syncSaveStates(resultsGrid);
    resultsGrid.querySelectorAll('.dupe-card').forEach((card, i) => {
      card.classList.add('reveal', 'visible');
      card.style.transitionDelay = `${i * 0.08}s`;
    });
  }


  /* ============================================================
     Upload panel search button
     ============================================================ */

  uploadSearchBtn.addEventListener('click', () => {
    if (!currentFile) return;
    uploadSearchBtn.textContent = t('search.searching');
    uploadSearchBtn.style.background = '#C9A96E';
    uploadSearchBtn.disabled = true;
    const intent = activeMainTab === 'text' ? 'dupes_only' : 'identify_and_dupes';
    performSearch(currentFile.name, 'image', currentFile, intent);
  });

  /* ============================================================
     Save / heart toggle (initial cards)
     ============================================================ */

  bindSaveButtons(resultsGrid);
  bindShareButtons(resultsGrid);
  syncSaveStates(resultsGrid);

  /* ============================================================
     FAQ Accordion
     ============================================================ */

  document.getElementById('faqList').addEventListener('click', e => {
    const btn = e.target.closest('.faq__question');
    if (!btn) return;
    const item = btn.parentElement;
    const wasOpen = item.classList.contains('open');
    // Close all
    document.querySelectorAll('.faq__item.open').forEach(i => i.classList.remove('open'));
    // Toggle clicked
    if (!wasOpen) item.classList.add('open');
  });

  /* ============================================================
     About Page
     ============================================================ */

  const aboutPage  = document.getElementById('aboutPage');
  const aboutLink  = document.getElementById('aboutLink');
  const aboutClose = document.getElementById('aboutClose');
  const aboutCta   = document.getElementById('aboutCta');

  aboutLink.addEventListener('click', e => {
    e.preventDefault();
    aboutPage.classList.add('open');
    document.body.style.overflow = 'hidden';
  });

  aboutClose.addEventListener('click', () => {
    aboutPage.classList.remove('open');
    document.body.style.overflow = '';
  });

  aboutCta.addEventListener('click', () => {
    aboutPage.classList.remove('open');
    document.body.style.overflow = '';
    document.getElementById('discover').scrollIntoView({ behavior: 'smooth' });
  });

  /* ============================================================
     Share Results
     ============================================================ */

  const shareResultsBtn  = document.getElementById('shareResultsBtn');
  const shareResultsMenu = document.getElementById('shareResultsMenu');
  const resultsShareDiv  = document.getElementById('resultsShare');

  shareResultsBtn.addEventListener('click', e => {
    e.stopPropagation();
    resultsShareDiv.classList.toggle('open');
  });

  // Results share close is handled by the global handler below

  function getResultsSummary() {
    const cards = resultsGrid.querySelectorAll('.dupe-card:not(.dupe-card--skeleton):not(.filter-hidden)');
    if (cards.length === 0) return t('share.results') + ' \u2014 ALTERE';
    const items = [];
    cards.forEach(card => {
      const name = card.querySelector('.dupe-card__name')?.textContent || '';
      const store = card.querySelector('.dupe-card__store')?.textContent || '';
      const price = card.querySelector('.dupe-card__price')?.textContent || '';
      if (name) items.push(`${name} (${store}) ${price}`);
    });
    return `${t('share.results')} on ALTERE:\n${items.slice(0, 4).join('\n')}${items.length > 4 ? '\n...' : ''}`;
  }

  const siteUrl = 'https://altere-chi.vercel.app';

  document.getElementById('shareResultsWA').addEventListener('click', () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(getResultsSummary() + '\n' + siteUrl)}`, '_blank');
    resultsShareDiv.classList.remove('open');
  });

  document.getElementById('shareResultsX').addEventListener('click', () => {
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(getResultsSummary())}&url=${encodeURIComponent(siteUrl)}`, '_blank');
    resultsShareDiv.classList.remove('open');
  });

  document.getElementById('shareResultsCopy').addEventListener('click', () => {
    navigator.clipboard.writeText(getResultsSummary() + '\n' + siteUrl).then(() => {
      showToast(t('share.copied'));
    });
    resultsShareDiv.classList.remove('open');
  });

  /* ============================================================
     Share to Instagram Stories (image generator)
     ============================================================ */

  document.getElementById('shareResultsStory').addEventListener('click', () => {
    resultsShareDiv.classList.remove('open');
    generateStoryImage();
  });

  function generateStoryImage() {
    const canvas = document.getElementById('storyCanvas');
    const ctx = canvas.getContext('2d');
    const W = 1080, H = 1920;

    // Background
    ctx.fillStyle = '#FAF8F5';
    ctx.fillRect(0, 0, W, H);

    // Gold accent bar at top
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#C9A96E');
    grad.addColorStop(1, '#D4BA85');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 6);

    // Logo
    ctx.fillStyle = '#1A1A1A';
    ctx.font = '500 64px "Cormorant Garamond", Georgia, serif';
    ctx.letterSpacing = '12px';
    ctx.textAlign = 'center';
    ctx.fillText('ALTERE', W / 2, 160);

    // Tagline
    ctx.fillStyle = '#C9A96E';
    ctx.font = '300 italic 28px "Cormorant Garamond", Georgia, serif';
    ctx.letterSpacing = '0px';
    ctx.fillText(t('about.mission'), W / 2, 220);

    // Divider line
    ctx.strokeStyle = '#F0EDE8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(340, 280);
    ctx.lineTo(740, 280);
    ctx.stroke();

    // "My dupes" heading
    ctx.fillStyle = '#1A1A1A';
    ctx.font = '300 42px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(t('results.ai.title'), W / 2, 350);

    // List visible cards
    const cards = resultsGrid.querySelectorAll('.dupe-card:not(.dupe-card--skeleton):not(.filter-hidden)');
    let y = 430;

    cards.forEach((card, i) => {
      if (i >= 4 || y > 1500) return;
      const store = card.querySelector('.dupe-card__store')?.textContent || '';
      const name = card.querySelector('.dupe-card__name')?.textContent || '';
      const price = card.querySelector('.dupe-card__price')?.textContent || '';
      const orig = card.querySelector('.dupe-card__original')?.textContent || '';

      // Card background
      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, 80, y, W - 160, 180, 20);
      ctx.fill();

      // Store name
      ctx.fillStyle = '#C9A96E';
      ctx.font = '600 20px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.letterSpacing = '3px';
      ctx.fillText(store.toUpperCase(), 120, y + 48);

      // Product name
      ctx.fillStyle = '#1A1A1A';
      ctx.font = '400 30px "Cormorant Garamond", Georgia, serif';
      ctx.letterSpacing = '0px';
      ctx.fillText(name.slice(0, 35), 120, y + 95);

      // Dupe price
      ctx.fillStyle = '#1A1A1A';
      ctx.font = '600 32px Inter, sans-serif';
      ctx.fillText(price, 120, y + 145);

      // Original price (strikethrough)
      if (orig) {
        const priceWidth = ctx.measureText(price).width;
        ctx.fillStyle = '#888888';
        ctx.font = '400 22px Inter, sans-serif';
        ctx.fillText(orig, 120 + priceWidth + 16, y + 145);
      }

      y += 200;
    });

    // Bottom CTA
    ctx.fillStyle = '#C9A96E';
    roundRect(ctx, 280, H - 260, W - 560, 60, 30);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '500 22px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '1px';
    ctx.fillText('altere-chi.vercel.app', W / 2, H - 222);

    // Footer text
    ctx.fillStyle = '#CCCCCC';
    ctx.font = '400 20px Inter, sans-serif';
    ctx.letterSpacing = '0px';
    ctx.fillText(t('share.story.footer') || 'Found with ALTERE', W / 2, H - 140);

    // Download
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'altere-dupes.png';
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('share.story.downloaded') || 'Story image downloaded');
    }, 'image/png');
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* ============================================================
     Invite Friends
     ============================================================ */

  const inviteText = () => t('invite.message') || 'Check out ALTERE \u2014 an AI-powered fashion dupe finder that finds luxury look-alikes at high-street prices!';

  document.getElementById('inviteWA').addEventListener('click', () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(inviteText() + '\n' + siteUrl)}`, '_blank');
  });

  document.getElementById('inviteX').addEventListener('click', () => {
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(inviteText())}&url=${encodeURIComponent(siteUrl)}`, '_blank');
  });

  document.getElementById('inviteCopy').addEventListener('click', () => {
    navigator.clipboard.writeText(inviteText() + '\n' + siteUrl).then(() => {
      showToast(t('share.copied'));
    });
  });

  /* ============================================================
     Global click handler — close all dropdowns
     ============================================================ */

  document.addEventListener('click', () => {
    langSwitcher.classList.remove('open');
    sortSelect.classList.remove('open');
    resultsShareDiv.classList.remove('open');
    closeAllShareDropdowns();
  });

  /* ============================================================
     Cookie Consent
     ============================================================ */

  const COOKIE_KEY     = 'altere_cookies';
  const cookieBanner   = document.getElementById('cookieBanner');
  const cookieAccept   = document.getElementById('cookieAccept');
  const cookieManage   = document.getElementById('cookieManage');

  if (!localStorage.getItem(COOKIE_KEY)) {
    setTimeout(() => cookieBanner.classList.add('visible'), 1200);
  }

  function dismissCookie(value) {
    localStorage.setItem(COOKIE_KEY, value);
    cookieBanner.classList.remove('visible');
  }

  cookieAccept.addEventListener('click', () => dismissCookie('accepted'));
  cookieManage.addEventListener('click', () => dismissCookie('managed'));

  /* ============================================================
     Match bars — animate width on scroll-in.
     (Generic scroll-reveal now handled by js/scroll-reveal.js via data-reveal.)
     ============================================================ */

  document.querySelectorAll('.dupe-card__match-fill').forEach(fill => {
    const width = fill.style.width;
    fill.style.width = '0%';
    const barObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            fill.style.width = width;
            barObserver.unobserve(fill);
          }
        });
      },
      { threshold: 0.5 }
    );
    barObserver.observe(fill);
  });

});
