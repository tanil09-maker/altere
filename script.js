/* ============================================================
   ALTERE — Main Script
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ============================================================
     Constants & State
     ============================================================ */

  const API_URL      = 'https://api.anthropic.com/v1/messages';
  const PROXY_URL    = '/api/chat';
  const MODEL        = 'claude-sonnet-4-20250514';
  const LS_KEY       = 'altere_api_key';
  const UNSPLASH_KEY = 'altere_unsplash_key';
  const UNSPLASH_API = 'https://api.unsplash.com/search/photos';
  const SAVED_KEY    = 'altere_saved_items';
  const FREE_LIMIT   = 3;

  let currentFile = null;
  let isSearching = false;

  // Muted fashion palette for colour placeholders (fallback when no Unsplash key)
  const CARD_COLORS = [
    '#D5C6B0', '#B8A99A', '#C4B7A6', '#A89F91', '#CABFB1', '#BDB1A0'
  ];

  /* ============================================================
     DOM refs
     ============================================================ */

  const nav             = document.getElementById('nav');
  const hamburger       = document.getElementById('hamburger');
  const navLinks        = document.getElementById('navLinks');
  const settingsBtn     = document.getElementById('settingsBtn');
  const settingsModal   = document.getElementById('settingsModal');
  const modalClose      = document.getElementById('modalClose');
  const apiKeyInput     = document.getElementById('apiKeyInput');
  const unsplashInput   = document.getElementById('unsplashKeyInput');
  const apiStatus       = document.getElementById('apiStatus');
  const saveApiKeyBtn   = document.getElementById('saveApiKey');
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

  // Restore saved preference on load
  const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  if (savedTheme === 'dark') applyTheme('dark');

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
    if (typeof updateCalc === 'function') updateCalc();
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
      'hero.sub': 'Describe any high-street item and our AI identifies the luxury original it was inspired by \u2014 plus more affordable alternatives.',
      'search.tab.link': 'Paste link', 'search.tab.upload': 'Upload photo', 'search.tab.text': 'Spot & Source',
      'search.placeholder.link': 'Paste a product URL from any fashion site...',
      'search.placeholder.text': 'Describe the item, e.g. "cream satin midi skirt"...',
      'search.btn': 'Spot Alternatives',
      'search.upload.hint': 'Drag & drop or <strong>browse</strong>',
      'search.upload.formats': 'JPG, PNG or WEBP up to 10 MB',
      'search.upload.ready': 'Ready to search',
      'search.status': 'AI is finding your dupes',
      'search.tab.camera': 'Take photo', 'camera.start': 'Tap to open camera', 'camera.hint': 'Point at any fashion item to find dupes', 'camera.retake': 'Retake', 'camera.use': 'Spot Alternatives', 'camera.error': 'Could not access camera. Please check permissions.',
      'recent.label': 'Recent', 'recent.clear': 'Clear',
      'trending.label': 'Trending now',
      'hero.searching': 'Searching across', 'hero.scroll': 'Scroll to explore',
      'dotd.eyebrow': 'Daily Source', 'dotd.original': 'The Original', 'dotd.dupe': 'Best Dupe', 'dotd.vs': 'VS', 'dotd.btn': 'Find more dupes',
      'calc.eyebrow': 'Savings Calculator', 'calc.title': 'How much could you save?', 'calc.sub': 'See what happens when you swap luxury for smart dupes.', 'calc.budget': 'Monthly fashion budget', 'calc.perMonth': 'Per month', 'calc.perYear': 'Per year', 'calc.fiveYears': 'In 5 years', 'calc.note': 'Based on an average 68% saving when buying dupes over luxury originals.',
      'proof.dupes': 'dupes found today', 'proof.shoppers': 'happy shoppers', 'proof.saved': 'saved this week', 'press.label': 'As seen in',
      'celeb.eyebrow': 'Style Inspiration', 'celeb.title': 'Get the celebrity look', 'celeb.sub': 'Tap into the most searched aesthetics and find dupes instantly.', 'celeb.btn': 'Find dupes',
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
      'about.step2Title': 'Cross-store matching', 'about.step2Desc': 'We scan inventories from Zara, H&M, Mango, ASOS, COS and & Other Stories in real time, scoring each product against the original on over 40 style dimensions.',
      'about.step3Title': 'Smart ranking', 'about.step3Desc': 'Results are ranked by match accuracy, price savings and availability \u2014 so the best dupe always rises to the top.',
      'about.teamEyebrow': 'Who We Are', 'about.teamTitle': 'Founded by fashion lovers,<br>powered by AI',
      'about.teamDesc': 'We\u2019re a small team of designers, engineers and fashion obsessives on a mission to democratise style. Every feature we build starts with the same question: does this help someone look incredible without overspending?',
      'about.cta': 'Start discovering dupes',
      'faq.eyebrow': 'Support', 'faq.title': 'Frequently asked questions',
      'faq.q1': 'How does the AI find dupes?', 'faq.a1': 'Our AI vision model analyses any fashion item \u2014 from a photo, link or text description \u2014 breaking it down into core attributes like fabric, cut, colour, silhouette and construction. It then scores thousands of products from Zara, H&M, Mango, ASOS, COS and & Other Stories against those attributes in real time, surfacing the closest matches ranked by accuracy.',
      'faq.q2': 'Are the links affiliate links?', 'faq.a2': 'Some links may be affiliate links, which means we earn a small commission when you make a purchase \u2014 at no extra cost to you. This helps us keep ALTERE free and continue improving the AI. We never let commissions influence which dupes are shown; results are always ranked purely by match quality.',
      'faq.q3': 'Is ALTERE free to use?', 'faq.a3': 'Yes, ALTERE is completely free to use. You can search for unlimited dupes, save your favourites and share them \u2014 all without creating an account or paying anything. We plan to keep the core experience free forever.',
      'faq.q4': 'How accurate are the match percentages?', 'faq.a4': 'Match percentages reflect how closely a dupe resembles the original across over 40 style dimensions including material, shape, colour and proportions. A score above 90% means the dupe is visually very close; 80\u201390% indicates a strong resemblance with minor differences. We continuously refine our model to improve accuracy.',
      'faq.q5': 'Can I suggest a store to add?', 'faq.a5': 'Absolutely! We\u2019re always looking to expand our store network. Drop us a message with the store name and we\u2019ll evaluate adding it. Popular requests include Uniqlo, Arket and Massimo Dutti \u2014 all on our roadmap.',
      'reviews.eyebrow': 'Reviews', 'reviews.title': 'Loved by fashion lovers',
      'reviews.r1.quote': '\u201cFound a perfect Bottega dupe for my birthday \u2014 no one could tell the difference. Saved over \u20ac2,000!\u201d', 'reviews.r1.name': 'Sophie M.', 'reviews.r1.location': 'Amsterdam, NL',
      'reviews.r2.quote': '\u201cI use ALTERE every time I spot something on Instagram. The AI match is honestly scary good.\u201d', 'reviews.r2.name': 'James T.', 'reviews.r2.location': 'London, UK',
      'reviews.r3.quote': '\u201cAs a stylist, this is my secret weapon. My clients get the look they want without the luxury markup.\u201d', 'reviews.r3.name': 'Amara K.', 'reviews.r3.location': 'Paris, FR',
      'reviews.r4.quote': '\u201cUploaded a photo of a \u20ac900 Max Mara coat and found a near-identical one at H&M for \u20ac89. Unreal.\u201d', 'reviews.r4.name': 'Luca R.', 'reviews.r4.location': 'Milan, IT',
      'reviews.r5.quote': '\u201cFinally a dupe finder that actually works. The photo upload feature is a game changer for browsing Pinterest inspo.\u201d', 'reviews.r5.name': 'Elena V.', 'reviews.r5.location': 'Barcelona, ES',
      'reviews.r6.quote': '\u201cShowed my friends and now our whole group chat is obsessed. We share dupes every single day.\u201d', 'reviews.r6.name': 'Noah B.', 'reviews.r6.location': 'Berlin, DE',
      'results.eyebrow': 'Trending Dupes',
      'results.title': 'Luxury looks, high\u2011street prices',
      'results.subtitle': 'Our AI scans thousands of products daily to surface the best alternatives.',
      'filter.category': 'Category', 'filter.bags': 'Bags', 'filter.shoes': 'Shoes', 'filter.clothing': 'Clothing', 'filter.jewellery': 'Jewellery', 'filter.accessories': 'Accessories',
      'filter.material': 'Material', 'filter.natural': 'Natural fibres', 'filter.nopolyester': 'No polyester', 'filter.vegan': 'Vegan',
      'filter.price': 'Price', 'filter.all': 'All', 'filter.store': 'Store', 'filter.allStores': 'All Stores', 'filter.sortBy': 'Sort by',
      'sort.match': 'Best match', 'sort.priceAsc': 'Price: Low to High', 'sort.priceDesc': 'Price: High to Low', 'sort.saving': 'Biggest saving',
      'how.eyebrow': 'How it works', 'how.title': 'Three steps to your perfect dupe',
      'how.step1.title': 'Upload or paste', 'how.step1.desc': 'Share a photo, product link or description of the luxury piece you love.',
      'how.step2.title': 'AI analysis', 'how.step2.desc': 'Our vision model deconstructs fabric, cut, colour and silhouette in seconds.',
      'how.step3.title': 'Shop the dupes', 'how.step3.desc': 'Browse ranked alternatives with match scores, prices and direct store links.',
      'waitlist.eyebrow': 'Early Access', 'waitlist.title': 'Be the first to know<br>when we launch',
      'waitlist.sub': 'Join thousands of fashion lovers already on the list.',
      'waitlist.placeholder': 'Enter your email address', 'waitlist.btn': 'Join the waitlist',
      'waitlist.hint': 'No spam, ever. Unsubscribe anytime.',
      'waitlist.success.title': 'You\u2019re on the list', 'waitlist.success.desc': 'We\u2019ll let you know as soon as ALTERE is live.',
      'saved.back': 'Back', 'saved.eyebrow': 'Your Collection', 'saved.title': 'Saved Items', 'saved.clearAll': 'Clear all',
      'saved.empty': 'No saved items yet', 'saved.emptyHint': 'Tap the heart on any dupe to save it here',
      'footer.tagline': 'AI-powered fashion dupe finder. Luxury aesthetics, accessible prices.',
      'footer.explore': 'Explore', 'footer.trending': 'Trending', 'footer.newArrivals': 'New arrivals', 'footer.collections': 'Collections',
      'footer.company': 'Company', 'footer.about': 'About', 'footer.careers': 'Careers', 'footer.privacy': 'Privacy', 'footer.terms': 'Terms',
      'toast.saved': 'Saved to your collection', 'toast.removed': 'Removed from saved', 'toast.cleared': 'All saved items cleared',
      'search.searching': 'Searching...', 'search.joining': 'Joining...',
      'results.ai.eyebrow': 'AI Results', 'results.ai.title': 'Your dupes are ready', 'results.demo.eyebrow': 'Demo Results', 'results.demo.hint': 'Add your API key in settings for real AI results', 'results.bestDupe': 'Best Dupe', 'results.moreAlts': 'Spotted Alternatives',
      'free.remaining': 'free AI searches left today', 'free.totalRemaining': 'free AI searches remaining', 'free.exhausted': 'Free searches used \u2014 showing demo results', 'free.unregExhausted': 'Free searches used \u2014 sign in for 3 daily searches', 'free.pro': 'Unlimited AI searches (Pro)',
      'auth.title': 'Sign in to ALTERE', 'auth.subtitle': 'Create a free account to save dupes and share finds.', 'auth.email': 'Email', 'auth.name': 'Name', 'auth.create': 'Create free account', 'auth.tiers': 'Free: 3 AI searches/day. Add your API key for unlimited.', 'auth.signout': 'Sign out', 'auth.freeTier': 'Free', 'auth.freeDesc': '3 AI searches per day + unlimited demo', 'auth.proDesc': 'Unlimited AI searches with your API key', 'auth.welcome': 'Welcome!', 'auth.signedOut': 'Signed out', 'auth.invalidEmail': 'Please enter a valid email.', 'auth.invalidName': 'Please enter your name.',
      'search.tab.reverse': 'Source it', 'search.placeholder.reverse': 'Describe your high-street item, e.g. "Zara quilted chain bag"...', 'search.btnReverse': 'Source This',
      'reverse.loading': 'Identifying the luxury original\u2026', 'reverse.loadingSub': 'Matching your item to designer collections', 'reverse.eyebrow': 'Sourced Original', 'reverse.title': 'We found the original', 'reverse.for': 'Original identified for', 'reverse.originalLabel': 'The Original', 'reverse.identifiedAs': 'Identified as', 'reverse.dupeBelow': 'Spotted Alternatives',
      'results.loading.title': 'Our AI is analysing your item\u2026', 'results.loading.sub': 'Finding the best alternatives across 6 stores',
      'share.whatsapp': 'WhatsApp', 'share.copy': 'Copy link', 'share.copied': 'Copied!',
      'share.text': 'Check out this dupe: {name} from {store} for just {price} \u2014 found on ALTERE',
      'share.results': 'Share results', 'share.story': 'Download for Stories', 'share.story.footer': 'Found with ALTERE', 'share.story.downloaded': 'Story image downloaded',
      'invite.eyebrow': 'Spread the Word', 'invite.title': 'Share ALTERE with friends', 'invite.sub': 'Know someone who loves fashion but hates overpaying? Send them our way.', 'invite.copyLink': 'Copy link',
      'invite.message': 'Check out ALTERE \u2014 an AI-powered fashion dupe finder that finds luxury look-alikes at high-street prices!'
    },
    nl: {
      'nav.discover': 'Ontdek', 'nav.brands': 'Merken', 'nav.saved': 'Opgeslagen', 'nav.signin': 'Inloggen',
      'hero.eyebrow': 'AI-Gestuurde Mode Ontdekking',
      'hero.headline': 'Spot het.<br>Wij vinden het.',
      'hero.sub': 'Beschrijf een winkelstraat-item en onze AI identificeert het luxe origineel \u2014 plus betaalbare alternatieven.',
      'search.tab.link': 'Link plakken', 'search.tab.upload': 'Foto uploaden', 'search.tab.text': 'Spot & Vind',
      'search.placeholder.link': 'Plak een product-URL van een modesite...',
      'search.placeholder.text': 'Beschrijf het item, bijv. "cr\u00e8me satijnen midi rok"...',
      'search.btn': 'Vind alternatieven',
      'search.tab.reverse': 'Vind origineel', 'search.btnReverse': 'Vind origineel', 'search.placeholder.reverse': 'Beschrijf je winkelstraat-item, bijv. "Zara gewatteerde ketting tas"...',
      'search.upload.hint': 'Sleep of <strong>blader</strong>',
      'search.upload.formats': 'JPG, PNG of WEBP tot 10 MB',
      'search.upload.ready': 'Klaar om te zoeken',
      'search.status': 'AI zoekt je dupes',
      'search.tab.camera': 'Maak foto', 'camera.start': 'Tik om camera te openen', 'camera.hint': 'Richt op een mode-item om dupes te vinden', 'camera.retake': 'Opnieuw', 'camera.use': 'Spot Alternatives', 'camera.error': 'Kan camera niet openen. Controleer de machtigingen.',
      'recent.label': 'Recent', 'recent.clear': 'Wissen',
      'trending.label': 'Trending nu',
      'hero.searching': 'Zoeken bij', 'hero.scroll': 'Scroll om te ontdekken',
      'dotd.eyebrow': 'Daily Source', 'dotd.original': 'Het Origineel', 'dotd.dupe': 'Beste Dupe', 'dotd.vs': 'VS', 'dotd.btn': 'Meer dupes vinden',
      'calc.eyebrow': 'Besparingscalculator', 'calc.title': 'Hoeveel kun je besparen?', 'calc.sub': 'Ontdek wat er gebeurt als je luxe inruilt voor slimme dupes.', 'calc.budget': 'Maandelijks modebudget', 'calc.perMonth': 'Per maand', 'calc.perYear': 'Per jaar', 'calc.fiveYears': 'In 5 jaar', 'calc.note': 'Gebaseerd op een gemiddelde besparing van 68% bij het kopen van dupes in plaats van luxe.',
      'proof.dupes': 'dupes gevonden vandaag', 'proof.shoppers': 'blije shoppers', 'proof.saved': 'bespaard deze week', 'press.label': 'Bekend van',
      'celeb.eyebrow': 'Stijlinspiratie', 'celeb.title': 'Krijg de celebrity look', 'celeb.sub': 'Ontdek de meest gezochte esthetieken en vind direct dupes.', 'celeb.btn': 'Vind dupes',
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
      'about.step2Title': 'Cross-store matching', 'about.step2Desc': 'We scannen voorraden van Zara, H&M, Mango, ASOS, COS en & Other Stories in realtime, en scoren elk product op meer dan 40 stijldimensies.',
      'about.step3Title': 'Slimme rangschikking', 'about.step3Desc': 'Resultaten worden gerangschikt op match-nauwkeurigheid, prijsbesparing en beschikbaarheid \u2014 zodat de beste dupe altijd bovenaan staat.',
      'about.teamEyebrow': 'Wie Wij Zijn', 'about.teamTitle': 'Opgericht door modeliefhebbers,<br>aangedreven door AI',
      'about.teamDesc': 'We zijn een klein team van ontwerpers, engineers en mode-obsessieven met \u00e9\u00e9n missie: stijl democratiseren. Elke functie begint met dezelfde vraag: helpt dit iemand er fantastisch uit te zien zonder te veel uit te geven?',
      'about.cta': 'Begin met dupes ontdekken',
      'faq.eyebrow': 'Ondersteuning', 'faq.title': 'Veelgestelde vragen',
      'faq.q1': 'Hoe vindt de AI dupes?', 'faq.a1': 'Ons AI-model analyseert elk mode-item \u2014 via foto, link of tekstbeschrijving \u2014 en ontleedt het in kernattributen zoals stof, snit, kleur, silhouet en constructie. Vervolgens scoort het duizenden producten van Zara, H&M, Mango, ASOS, COS en & Other Stories op die attributen in realtime.',
      'faq.q2': 'Zijn de links affiliate links?', 'faq.a2': 'Sommige links kunnen affiliate links zijn, wat betekent dat we een kleine commissie verdienen bij een aankoop \u2014 zonder extra kosten voor jou. Dit helpt ons ALTERE gratis te houden. Commissies be\u00efnvloeden nooit welke dupes worden getoond.',
      'faq.q3': 'Is ALTERE gratis?', 'faq.a3': 'Ja, ALTERE is volledig gratis. Je kunt onbeperkt dupes zoeken, favorieten opslaan en delen \u2014 zonder account of betaling. We zijn van plan de kernervaring altijd gratis te houden.',
      'faq.q4': 'Hoe nauwkeurig zijn de matchpercentages?', 'faq.a4': 'Matchpercentages geven aan hoe nauw een dupe het origineel benadert op meer dan 40 stijldimensies. Een score boven 90% betekent visueel zeer dichtbij; 80\u201390% duidt op sterke gelijkenis met kleine verschillen.',
      'faq.q5': 'Kan ik een winkel voorstellen?', 'faq.a5': 'Absoluut! We zijn altijd op zoek naar uitbreiding. Stuur ons de winkelnaam en we evalueren het. Populaire verzoeken zijn Uniqlo, Arket en Massimo Dutti \u2014 allemaal op onze roadmap.',
      'reviews.eyebrow': 'Beoordelingen', 'reviews.title': 'Geliefd bij modeliefhebbers',
      'reviews.r1.quote': '\u201cEen perfecte Bottega-dupe gevonden voor mijn verjaardag \u2014 niemand zag het verschil. Meer dan \u20ac2.000 bespaard!\u201d', 'reviews.r1.name': 'Sophie M.', 'reviews.r1.location': 'Amsterdam, NL',
      'reviews.r2.quote': '\u201cIk gebruik ALTERE elke keer als ik iets op Instagram spot. De AI-match is echt eng goed.\u201d', 'reviews.r2.name': 'James T.', 'reviews.r2.location': 'Londen, UK',
      'reviews.r3.quote': '\u201cAls styliste is dit mijn geheime wapen. Mijn klanten krijgen de look die ze willen zonder de luxe toeslag.\u201d', 'reviews.r3.name': 'Amara K.', 'reviews.r3.location': 'Parijs, FR',
      'reviews.r4.quote': '\u201cEen foto ge\u00fcpload van een Max Mara jas van \u20ac900 en een bijna identieke gevonden bij H&M voor \u20ac89. Onwerkelijk.\u201d', 'reviews.r4.name': 'Luca R.', 'reviews.r4.location': 'Milaan, IT',
      'reviews.r5.quote': '\u201cEindelijk een dupe-finder die echt werkt. De foto-upload is een gamechanger voor Pinterest-inspiratie.\u201d', 'reviews.r5.name': 'Elena V.', 'reviews.r5.location': 'Barcelona, ES',
      'reviews.r6.quote': '\u201cAan vrienden laten zien en nu is onze hele groepschat geobsedeerd. We delen elke dag dupes.\u201d', 'reviews.r6.name': 'Noah B.', 'reviews.r6.location': 'Berlijn, DE',
      'results.eyebrow': 'Trending Dupes',
      'results.title': 'Luxe looks, betaalbare prijzen',
      'results.subtitle': 'Onze AI scant dagelijks duizenden producten voor de beste alternatieven.',
      'filter.category': 'Categorie', 'filter.bags': 'Tassen', 'filter.shoes': 'Schoenen', 'filter.clothing': 'Kleding', 'filter.jewellery': 'Sieraden', 'filter.accessories': 'Accessoires',
      'filter.price': 'Prijs', 'filter.all': 'Alles', 'filter.store': 'Winkel', 'filter.allStores': 'Alle Winkels', 'filter.sortBy': 'Sorteer op',
      'sort.match': 'Beste match', 'sort.priceAsc': 'Prijs: Laag naar Hoog', 'sort.priceDesc': 'Prijs: Hoog naar Laag', 'sort.saving': 'Grootste besparing',
      'how.eyebrow': 'Hoe het werkt', 'how.title': 'Drie stappen naar je perfecte dupe',
      'how.step1.title': 'Upload of plak', 'how.step1.desc': 'Deel een foto, productlink of beschrijving van het luxe stuk dat je mooi vindt.',
      'how.step2.title': 'AI-analyse', 'how.step2.desc': 'Ons model ontleedt stof, snit, kleur en silhouet in seconden.',
      'how.step3.title': 'Shop de dupes', 'how.step3.desc': 'Bekijk gerangschikte alternatieven met matchscores, prijzen en directe winkellinks.',
      'waitlist.eyebrow': 'Vroege Toegang', 'waitlist.title': 'Wees de eerste<br>die het weet bij lancering',
      'waitlist.sub': 'Sluit je aan bij duizenden modeliefhebbers op de lijst.',
      'waitlist.placeholder': 'Vul je e-mailadres in', 'waitlist.btn': 'Schrijf je in',
      'waitlist.hint': 'Geen spam, ooit. Schrijf je op elk moment uit.',
      'waitlist.success.title': 'Je staat op de lijst', 'waitlist.success.desc': 'We laten je weten zodra ALTERE live is.',
      'saved.back': 'Terug', 'saved.eyebrow': 'Jouw Collectie', 'saved.title': 'Opgeslagen Items', 'saved.clearAll': 'Alles wissen',
      'saved.empty': 'Nog geen opgeslagen items', 'saved.emptyHint': 'Tik op het hartje om een dupe hier op te slaan',
      'footer.tagline': 'AI-gestuurde mode dupe finder. Luxe esthetiek, betaalbare prijzen.',
      'footer.explore': 'Ontdek', 'footer.trending': 'Trending', 'footer.newArrivals': 'Nieuw binnen', 'footer.collections': 'Collecties',
      'footer.company': 'Bedrijf', 'footer.about': 'Over ons', 'footer.careers': 'Vacatures', 'footer.privacy': 'Privacy', 'footer.terms': 'Voorwaarden',
      'toast.saved': 'Opgeslagen in je collectie', 'toast.removed': 'Verwijderd uit opgeslagen', 'toast.cleared': 'Alle opgeslagen items gewist',
      'search.searching': 'Zoeken...', 'search.joining': 'Aanmelden...',
      'results.ai.eyebrow': 'AI Resultaten', 'results.ai.title': 'Je dupes zijn klaar', 'results.demo.eyebrow': 'Demoresultaten', 'results.demo.hint': 'Voeg je API-sleutel toe in instellingen voor echte AI-resultaten', 'results.bestDupe': 'Beste Dupe', 'results.moreAlts': 'Spotted Alternatives',
      'results.loading.title': 'Onze AI analyseert je item\u2026', 'results.loading.sub': 'De beste alternatieven zoeken bij 6 winkels',
      'share.whatsapp': 'WhatsApp', 'share.copy': 'Link kopi\u00ebren', 'share.copied': 'Gekopieerd!',
      'share.text': 'Bekijk deze dupe: {name} van {store} voor slechts {price} \u2014 gevonden op ALTERE',
      'share.results': 'Resultaten delen', 'share.story': 'Download voor Stories', 'share.story.footer': 'Gevonden met ALTERE', 'share.story.downloaded': 'Story-afbeelding gedownload',
      'invite.eyebrow': 'Vertel het Verder', 'invite.title': 'Deel ALTERE met vrienden', 'invite.sub': 'Ken je iemand die van mode houdt maar niet te veel wil betalen? Stuur ze onze kant op.', 'invite.copyLink': 'Link kopi\u00ebren',
      'invite.message': 'Bekijk ALTERE \u2014 een AI-gestuurde mode dupe finder die luxe look-alikes vindt voor lage prijzen!'
    },
    fr: {
      'nav.discover': 'D\u00e9couvrir', 'nav.brands': 'Marques', 'nav.saved': 'Sauv\u00e9s', 'nav.signin': 'Connexion',
      'hero.eyebrow': 'D\u00e9couverte Mode par IA',
      'hero.headline': 'Rep\u00e9rez-le.<br>On le trouve.',
      'hero.sub': 'D\u00e9crivez un article de fast-fashion et notre IA identifie l\u2019original de luxe \u2014 plus des alternatives abordables.',
      'search.tab.link': 'Coller un lien', 'search.tab.upload': 'Uploader une photo', 'search.tab.text': 'Rep\u00e9rer & Trouver',
      'search.placeholder.link': 'Collez l\u2019URL d\u2019un produit de mode...',
      'search.placeholder.text': 'D\u00e9crivez l\u2019article, ex. "jupe midi en satin cr\u00e8me"...',
      'search.btn': 'Trouver des alternatives',
      'search.tab.reverse': 'Trouver l\u2019original', 'search.btnReverse': 'Trouver l\u2019original', 'search.placeholder.reverse': 'D\u00e9crivez votre article, ex. "sac matelass\u00e9 Zara"...',
      'search.upload.hint': 'Glisser-d\u00e9poser ou <strong>parcourir</strong>',
      'search.upload.formats': 'JPG, PNG ou WEBP jusqu\u2019\u00e0 10 Mo',
      'search.upload.ready': 'Pr\u00eat \u00e0 rechercher',
      'search.status': 'L\u2019IA recherche vos dupes',
      'search.tab.camera': 'Prendre photo', 'camera.start': 'Appuyez pour ouvrir la cam\u00e9ra', 'camera.hint': 'Pointez vers un article de mode pour trouver des dupes', 'camera.retake': 'Reprendre', 'camera.use': 'Spot Alternatives', 'camera.error': 'Impossible d\u2019acc\u00e9der \u00e0 la cam\u00e9ra. V\u00e9rifiez les permissions.',
      'recent.label': 'R\u00e9cents', 'recent.clear': 'Effacer',
      'trending.label': 'Tendances',
      'hero.searching': 'Recherche sur', 'hero.scroll': 'D\u00e9filez pour explorer',
      'dotd.eyebrow': 'Daily Source', 'dotd.original': 'L\u2019Original', 'dotd.dupe': 'Meilleur Dupe', 'dotd.vs': 'VS', 'dotd.btn': 'Trouver plus de dupes',
      'calc.eyebrow': 'Calculateur d\u2019\u00e9conomies', 'calc.title': 'Combien pourriez-vous \u00e9conomiser ?', 'calc.sub': 'D\u00e9couvrez ce qui se passe quand vous troquz le luxe pour des dupes malins.', 'calc.budget': 'Budget mode mensuel', 'calc.perMonth': 'Par mois', 'calc.perYear': 'Par an', 'calc.fiveYears': 'En 5 ans', 'calc.note': 'Bas\u00e9 sur une \u00e9conomie moyenne de 68% en achetant des dupes plut\u00f4t que du luxe.',
      'proof.dupes': 'dupes trouv\u00e9s aujourd\u2019hui', 'proof.shoppers': 'acheteurs satisfaits', 'proof.saved': '\u00e9conomis\u00e9s cette semaine', 'press.label': 'Vu dans',
      'celeb.eyebrow': 'Inspiration Style', 'celeb.title': 'Adoptez le look c\u00e9l\u00e9brit\u00e9', 'celeb.sub': 'Explorez les esth\u00e9tiques les plus recherch\u00e9es et trouvez des dupes instantan\u00e9ment.', 'celeb.btn': 'Trouver des dupes',
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
      'about.step2Title': 'Matching multi-enseignes', 'about.step2Desc': 'Nous analysons les inventaires de Zara, H&M, Mango, ASOS, COS et & Other Stories en temps r\u00e9el, \u00e9valuant chaque produit sur plus de 40 dimensions de style.',
      'about.step3Title': 'Classement intelligent', 'about.step3Desc': 'Les r\u00e9sultats sont class\u00e9s par pr\u00e9cision, \u00e9conomies et disponibilit\u00e9 \u2014 le meilleur dupe est toujours en t\u00eate.',
      'about.teamEyebrow': 'Qui Nous Sommes', 'about.teamTitle': 'Fond\u00e9 par des passionn\u00e9s de mode,<br>propuls\u00e9 par l\u2019IA',
      'about.teamDesc': 'Nous sommes une petite \u00e9quipe de designers, ing\u00e9nieurs et obsess\u00e9s de la mode avec une mission : d\u00e9mocratiser le style. Chaque fonctionnalit\u00e9 commence par la m\u00eame question : cela aide-t-il quelqu\u2019un \u00e0 \u00eatre \u00e9l\u00e9gant sans trop d\u00e9penser ?',
      'about.cta': 'Commencer \u00e0 d\u00e9couvrir des dupes',
      'faq.eyebrow': 'Aide', 'faq.title': 'Questions fr\u00e9quentes',
      'faq.q1': 'Comment l\u2019IA trouve-t-elle des dupes ?', 'faq.a1': 'Notre mod\u00e8le IA analyse tout article de mode \u2014 photo, lien ou description \u2014 en le d\u00e9composant en attributs cl\u00e9s comme le tissu, la coupe, la couleur et la silhouette. Il \u00e9value ensuite des milliers de produits de Zara, H&M, Mango, ASOS, COS et & Other Stories en temps r\u00e9el.',
      'faq.q2': 'Les liens sont-ils des liens d\u2019affiliation ?', 'faq.a2': 'Certains liens peuvent \u00eatre des liens d\u2019affiliation, ce qui signifie que nous touchons une petite commission lors d\u2019un achat \u2014 sans co\u00fbt suppl\u00e9mentaire pour vous. Les commissions n\u2019influencent jamais les r\u00e9sultats.',
      'faq.q3': 'ALTERE est-il gratuit ?', 'faq.a3': 'Oui, ALTERE est enti\u00e8rement gratuit. Vous pouvez rechercher des dupes de mani\u00e8re illimit\u00e9e, sauvegarder vos favoris et les partager \u2014 sans compte ni paiement.',
      'faq.q4': 'Les pourcentages de correspondance sont-ils fiables ?', 'faq.a4': 'Les pourcentages refl\u00e8tent la ressemblance sur plus de 40 dimensions de style. Un score sup\u00e9rieur \u00e0 90% signifie une tr\u00e8s forte ressemblance ; 80\u201390% indique une bonne ressemblance avec des diff\u00e9rences mineures.',
      'faq.q5': 'Puis-je sugg\u00e9rer un magasin \u00e0 ajouter ?', 'faq.a5': 'Bien s\u00fbr ! Nous cherchons toujours \u00e0 \u00e9tendre notre r\u00e9seau. Envoyez-nous le nom du magasin. Les demandes populaires incluent Uniqlo, Arket et Massimo Dutti.',
      'reviews.eyebrow': 'Avis', 'reviews.title': 'Ador\u00e9 par les passionn\u00e9s de mode',
      'reviews.r1.quote': '\u201cTrouv\u00e9 un dupe Bottega parfait pour mon anniversaire \u2014 personne n\u2019a vu la diff\u00e9rence. Plus de 2 000\u20ac \u00e9conomis\u00e9s !\u201d', 'reviews.r1.name': 'Sophie M.', 'reviews.r1.location': 'Amsterdam, NL',
      'reviews.r2.quote': '\u201cJ\u2019utilise ALTERE chaque fois que je rep\u00e8re quelque chose sur Instagram. La correspondance IA est vraiment bluffante.\u201d', 'reviews.r2.name': 'James T.', 'reviews.r2.location': 'Londres, UK',
      'reviews.r3.quote': '\u201cEn tant que styliste, c\u2019est mon arme secr\u00e8te. Mes clients obtiennent le look qu\u2019ils veulent sans la majoration luxe.\u201d', 'reviews.r3.name': 'Amara K.', 'reviews.r3.location': 'Paris, FR',
      'reviews.r4.quote': '\u201cJ\u2019ai t\u00e9l\u00e9charg\u00e9 une photo d\u2019un manteau Max Mara \u00e0 900\u20ac et trouv\u00e9 un quasi-identique chez H&M \u00e0 89\u20ac. Incroyable.\u201d', 'reviews.r4.name': 'Luca R.', 'reviews.r4.location': 'Milan, IT',
      'reviews.r5.quote': '\u201cEnfin un trouveur de dupes qui marche vraiment. L\u2019upload photo est r\u00e9volutionnaire pour l\u2019inspiration Pinterest.\u201d', 'reviews.r5.name': 'Elena V.', 'reviews.r5.location': 'Barcelone, ES',
      'reviews.r6.quote': '\u201cMontr\u00e9 \u00e0 mes amis et maintenant tout le groupe est obsess\u00e9. On partage des dupes chaque jour.\u201d', 'reviews.r6.name': 'Noah B.', 'reviews.r6.location': 'Berlin, DE',
      'results.eyebrow': 'Dupes Tendance',
      'results.title': 'Looks luxe, prix abordables',
      'results.subtitle': 'Notre IA scanne des milliers de produits chaque jour pour les meilleures alternatives.',
      'filter.category': 'Cat\u00e9gorie', 'filter.bags': 'Sacs', 'filter.shoes': 'Chaussures', 'filter.clothing': 'V\u00eatements', 'filter.jewellery': 'Bijoux', 'filter.accessories': 'Accessoires',
      'filter.price': 'Prix', 'filter.all': 'Tout', 'filter.store': 'Magasin', 'filter.allStores': 'Tous les Magasins', 'filter.sortBy': 'Trier par',
      'sort.match': 'Meilleure correspondance', 'sort.priceAsc': 'Prix : Croissant', 'sort.priceDesc': 'Prix : D\u00e9croissant', 'sort.saving': 'Plus grande \u00e9conomie',
      'how.eyebrow': 'Comment \u00e7a marche', 'how.title': 'Trois \u00e9tapes vers votre dupe parfait',
      'how.step1.title': 'Uploadez ou collez', 'how.step1.desc': 'Partagez une photo, un lien ou une description de la pi\u00e8ce de luxe que vous aimez.',
      'how.step2.title': 'Analyse IA', 'how.step2.desc': 'Notre mod\u00e8le de vision d\u00e9construit tissu, coupe, couleur et silhouette en secondes.',
      'how.step3.title': 'Achetez les dupes', 'how.step3.desc': 'Parcourez des alternatives class\u00e9es avec scores, prix et liens directs.',
      'waitlist.eyebrow': 'Acc\u00e8s Anticip\u00e9', 'waitlist.title': 'Soyez les premiers inform\u00e9s<br>du lancement',
      'waitlist.sub': 'Rejoignez des milliers de passionn\u00e9s de mode d\u00e9j\u00e0 inscrits.',
      'waitlist.placeholder': 'Entrez votre adresse e-mail', 'waitlist.btn': 'Rejoindre la liste',
      'waitlist.hint': 'Pas de spam, jamais. D\u00e9sinscription \u00e0 tout moment.',
      'waitlist.success.title': 'Vous \u00eates sur la liste', 'waitlist.success.desc': 'Nous vous pr\u00e9viendrons d\u00e8s qu\u2019ALTERE sera en ligne.',
      'saved.back': 'Retour', 'saved.eyebrow': 'Votre Collection', 'saved.title': 'Articles Sauv\u00e9s', 'saved.clearAll': 'Tout effacer',
      'saved.empty': 'Aucun article sauv\u00e9', 'saved.emptyHint': 'Appuyez sur le c\u0153ur pour sauvegarder un dupe ici',
      'footer.tagline': 'Trouveur de dupes mode par IA. Esth\u00e9tique luxe, prix accessibles.',
      'footer.explore': 'Explorer', 'footer.trending': 'Tendances', 'footer.newArrivals': 'Nouveaut\u00e9s', 'footer.collections': 'Collections',
      'footer.company': 'Entreprise', 'footer.about': '\u00c0 propos', 'footer.careers': 'Carri\u00e8res', 'footer.privacy': 'Confidentialit\u00e9', 'footer.terms': 'Conditions',
      'toast.saved': 'Sauv\u00e9 dans votre collection', 'toast.removed': 'Retir\u00e9 des sauvegardes', 'toast.cleared': 'Tous les articles sauv\u00e9s effac\u00e9s',
      'search.searching': 'Recherche...', 'search.joining': 'Inscription...',
      'results.ai.eyebrow': 'R\u00e9sultats IA', 'results.ai.title': 'Vos dupes sont pr\u00eats', 'results.demo.eyebrow': 'R\u00e9sultats d\u00e9mo', 'results.demo.hint': 'Ajoutez votre cl\u00e9 API dans les param\u00e8tres pour de vrais r\u00e9sultats IA', 'results.bestDupe': 'Meilleur Dupe', 'results.moreAlts': 'Spotted Alternatives',
      'results.loading.title': 'Notre IA analyse votre article\u2026', 'results.loading.sub': 'Recherche des meilleures alternatives dans 6 magasins',
      'share.whatsapp': 'WhatsApp', 'share.copy': 'Copier le lien', 'share.copied': 'Copi\u00e9 !',
      'share.text': 'D\u00e9couvrez ce dupe : {name} de {store} pour seulement {price} \u2014 trouv\u00e9 sur ALTERE',
      'share.results': 'Partager les r\u00e9sultats', 'share.story': 'T\u00e9l\u00e9charger pour Stories', 'share.story.footer': 'Trouv\u00e9 avec ALTERE', 'share.story.downloaded': 'Image story t\u00e9l\u00e9charg\u00e9e',
      'invite.eyebrow': 'Faites Passer le Mot', 'invite.title': 'Partagez ALTERE avec vos amis', 'invite.sub': 'Vous connaissez quelqu\u2019un qui aime la mode mais d\u00e9teste surpayer ? Envoyez-le chez nous.', 'invite.copyLink': 'Copier le lien',
      'invite.message': 'D\u00e9couvrez ALTERE \u2014 un trouveur de dupes mode par IA qui d\u00e9niche des alternatives luxe \u00e0 petits prix !'
    },
    de: {
      'nav.discover': 'Entdecken', 'nav.brands': 'Marken', 'nav.saved': 'Gespeichert', 'nav.signin': 'Anmelden',
      'hero.eyebrow': 'KI-gest\u00fctzte Mode-Entdeckung',
      'hero.headline': 'Entdeckt.<br>Wir finden es.',
      'hero.sub': 'Beschreibe ein High-Street-Item und unsere KI identifiziert das Luxus-Original \u2014 plus bezahlbare Alternativen.',
      'search.tab.link': 'Link einf\u00fcgen', 'search.tab.upload': 'Foto hochladen', 'search.tab.text': 'Entdecken & Finden',
      'search.placeholder.link': 'Produkt-URL von einer Modeseite einf\u00fcgen...',
      'search.placeholder.text': 'Artikel beschreiben, z.B. "cremefarbener Satin-Midirock"...',
      'search.btn': 'Alternativen finden',
      'search.tab.reverse': 'Original finden', 'search.btnReverse': 'Original finden', 'search.placeholder.reverse': 'Beschreibe dein Item, z.B. "Zara gesteppte Kettentasche"...',
      'search.upload.hint': 'Ziehen & ablegen oder <strong>durchsuchen</strong>',
      'search.upload.formats': 'JPG, PNG oder WEBP bis 10 MB',
      'search.upload.ready': 'Bereit zum Suchen',
      'search.status': 'KI sucht deine Dupes',
      'search.tab.camera': 'Foto machen', 'camera.start': 'Tippen um Kamera zu \u00f6ffnen', 'camera.hint': 'Auf ein Mode-Item richten, um Dupes zu finden', 'camera.retake': 'Nochmal', 'camera.use': 'Spot Alternatives', 'camera.error': 'Kamera konnte nicht ge\u00f6ffnet werden. Bitte Berechtigungen pr\u00fcfen.',
      'recent.label': 'K\u00fcrzlich', 'recent.clear': 'L\u00f6schen',
      'trending.label': 'Jetzt im Trend',
      'hero.searching': 'Suche bei', 'hero.scroll': 'Scrollen zum Entdecken',
      'dotd.eyebrow': 'Daily Source', 'dotd.original': 'Das Original', 'dotd.dupe': 'Bester Dupe', 'dotd.vs': 'VS', 'dotd.btn': 'Mehr Dupes finden',
      'calc.eyebrow': 'Sparrechner', 'calc.title': 'Wie viel k\u00f6nntest du sparen?', 'calc.sub': 'Entdecke, was passiert, wenn du Luxus gegen smarte Dupes tauschst.', 'calc.budget': 'Monatliches Modebudget', 'calc.perMonth': 'Pro Monat', 'calc.perYear': 'Pro Jahr', 'calc.fiveYears': 'In 5 Jahren', 'calc.note': 'Basierend auf einer durchschnittlichen Ersparnis von 68% beim Kauf von Dupes statt Luxus.',
      'proof.dupes': 'Dupes heute gefunden', 'proof.shoppers': 'zufriedene K\u00e4ufer', 'proof.saved': 'diese Woche gespart', 'press.label': 'Bekannt aus',
      'celeb.eyebrow': 'Stil-Inspiration', 'celeb.title': 'Hol dir den Promi-Look', 'celeb.sub': 'Entdecke die meistgesuchten \u00c4sthetiken und finde sofort Dupes.', 'celeb.btn': 'Dupes finden',
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
      'about.step2Title': 'Cross-Store-Matching', 'about.step2Desc': 'Wir scannen Best\u00e4nde von Zara, H&M, Mango, ASOS, COS und & Other Stories in Echtzeit und bewerten jedes Produkt auf \u00fcber 40 Stildimensionen.',
      'about.step3Title': 'Intelligentes Ranking', 'about.step3Desc': 'Ergebnisse werden nach Match-Genauigkeit, Preisersparnis und Verf\u00fcgbarkeit sortiert \u2014 der beste Dupe steht immer oben.',
      'about.teamEyebrow': 'Wer Wir Sind', 'about.teamTitle': 'Gegr\u00fcndet von Modeliebhabern,<br>angetrieben von KI',
      'about.teamDesc': 'Wir sind ein kleines Team aus Designern, Ingenieuren und Mode-Besessenen mit einer Mission: Stil zu demokratisieren. Jede Funktion beginnt mit derselben Frage: Hilft das jemandem, unglaublich auszusehen, ohne zu viel auszugeben?',
      'about.cta': 'Jetzt Dupes entdecken',
      'faq.eyebrow': 'Hilfe', 'faq.title': 'H\u00e4ufig gestellte Fragen',
      'faq.q1': 'Wie findet die KI Dupes?', 'faq.a1': 'Unser KI-Modell analysiert jedes Mode-Item \u2014 per Foto, Link oder Beschreibung \u2014 und zerlegt es in Kernattribute wie Stoff, Schnitt, Farbe und Silhouette. Anschlie\u00dfend bewertet es tausende Produkte von Zara, H&M, Mango, ASOS, COS und & Other Stories in Echtzeit.',
      'faq.q2': 'Sind die Links Affiliate-Links?', 'faq.a2': 'Einige Links k\u00f6nnen Affiliate-Links sein, was bedeutet, dass wir eine kleine Provision bei einem Kauf erhalten \u2014 ohne Mehrkosten f\u00fcr Sie. Provisionen beeinflussen niemals die angezeigten Ergebnisse.',
      'faq.q3': 'Ist ALTERE kostenlos?', 'faq.a3': 'Ja, ALTERE ist v\u00f6llig kostenlos. Sie k\u00f6nnen unbegrenzt Dupes suchen, Favoriten speichern und teilen \u2014 ohne Konto oder Zahlung.',
      'faq.q4': 'Wie genau sind die Match-Prozents\u00e4tze?', 'faq.a4': 'Die Prozents\u00e4tze spiegeln die \u00c4hnlichkeit auf \u00fcber 40 Stildimensionen wider. \u00dcber 90% bedeutet sehr hohe \u00c4hnlichkeit; 80\u201390% zeigt starke \u00c4hnlichkeit mit kleinen Unterschieden.',
      'faq.q5': 'Kann ich ein Gesch\u00e4ft vorschlagen?', 'faq.a5': 'Nat\u00fcrlich! Wir suchen immer nach Erweiterungen. Senden Sie uns den Gesch\u00e4ftsnamen. Beliebte Anfragen sind Uniqlo, Arket und Massimo Dutti.',
      'reviews.eyebrow': 'Bewertungen', 'reviews.title': 'Geliebt von Modefans',
      'reviews.r1.quote': '\u201cEinen perfekten Bottega-Dupe f\u00fcr meinen Geburtstag gefunden \u2014 niemand konnte den Unterschied erkennen. \u00dcber 2.000\u20ac gespart!\u201d', 'reviews.r1.name': 'Sophie M.', 'reviews.r1.location': 'Amsterdam, NL',
      'reviews.r2.quote': '\u201cIch benutze ALTERE jedes Mal, wenn ich etwas auf Instagram entdecke. Die KI-\u00dcbereinstimmung ist ehrlich gesagt unheimlich gut.\u201d', 'reviews.r2.name': 'James T.', 'reviews.r2.location': 'London, UK',
      'reviews.r3.quote': '\u201cAls Stylistin ist das meine Geheimwaffe. Meine Kunden bekommen den Look ohne den Luxus-Aufpreis.\u201d', 'reviews.r3.name': 'Amara K.', 'reviews.r3.location': 'Paris, FR',
      'reviews.r4.quote': '\u201cEin Foto eines 900\u20ac Max Mara Mantels hochgeladen und einen fast identischen bei H&M f\u00fcr 89\u20ac gefunden. Unglaublich.\u201d', 'reviews.r4.name': 'Luca R.', 'reviews.r4.location': 'Mailand, IT',
      'reviews.r5.quote': '\u201cEndlich ein Dupe-Finder, der wirklich funktioniert. Der Foto-Upload ist ein Gamechanger f\u00fcr Pinterest-Inspiration.\u201d', 'reviews.r5.name': 'Elena V.', 'reviews.r5.location': 'Barcelona, ES',
      'reviews.r6.quote': '\u201cFreunden gezeigt und jetzt ist der ganze Gruppenchat besessen. Wir teilen jeden Tag Dupes.\u201d', 'reviews.r6.name': 'Noah B.', 'reviews.r6.location': 'Berlin, DE',
      'results.eyebrow': 'Trend-Dupes',
      'results.title': 'Luxus-Looks, erschwingliche Preise',
      'results.subtitle': 'Unsere KI durchsucht t\u00e4glich tausende Produkte nach den besten Alternativen.',
      'filter.category': 'Kategorie', 'filter.bags': 'Taschen', 'filter.shoes': 'Schuhe', 'filter.clothing': 'Kleidung', 'filter.jewellery': 'Schmuck', 'filter.accessories': 'Accessoires',
      'filter.price': 'Preis', 'filter.all': 'Alle', 'filter.store': 'Gesch\u00e4ft', 'filter.allStores': 'Alle Gesch\u00e4fte', 'filter.sortBy': 'Sortieren nach',
      'sort.match': 'Beste \u00dcbereinstimmung', 'sort.priceAsc': 'Preis: Aufsteigend', 'sort.priceDesc': 'Preis: Absteigend', 'sort.saving': 'Gr\u00f6\u00dfte Ersparnis',
      'how.eyebrow': 'So funktioniert es', 'how.title': 'Drei Schritte zu deinem perfekten Dupe',
      'how.step1.title': 'Hochladen oder einf\u00fcgen', 'how.step1.desc': 'Teile ein Foto, einen Produktlink oder eine Beschreibung des Luxusst\u00fccks.',
      'how.step2.title': 'KI-Analyse', 'how.step2.desc': 'Unser Modell analysiert Stoff, Schnitt, Farbe und Silhouette in Sekunden.',
      'how.step3.title': 'Dupes shoppen', 'how.step3.desc': 'Durchst\u00f6bere bewertete Alternativen mit Match-Scores, Preisen und direkten Shop-Links.',
      'waitlist.eyebrow': 'Fr\u00fcher Zugang', 'waitlist.title': 'Erfahre als Erste/r<br>vom Launch',
      'waitlist.sub': 'Schlie\u00dfe dich tausenden Modebegeisterten auf der Liste an.',
      'waitlist.placeholder': 'E-Mail-Adresse eingeben', 'waitlist.btn': 'Auf die Warteliste',
      'waitlist.hint': 'Kein Spam, niemals. Jederzeit abmeldbar.',
      'waitlist.success.title': 'Du bist auf der Liste', 'waitlist.success.desc': 'Wir benachrichtigen dich, sobald ALTERE live ist.',
      'saved.back': 'Zur\u00fcck', 'saved.eyebrow': 'Deine Kollektion', 'saved.title': 'Gespeicherte Artikel', 'saved.clearAll': 'Alle l\u00f6schen',
      'saved.empty': 'Noch keine gespeicherten Artikel', 'saved.emptyHint': 'Tippe auf das Herz, um einen Dupe hier zu speichern',
      'footer.tagline': 'KI-gest\u00fctzter Mode-Dupe-Finder. Luxus-\u00c4sthetik, bezahlbare Preise.',
      'footer.explore': 'Entdecken', 'footer.trending': 'Trends', 'footer.newArrivals': 'Neuheiten', 'footer.collections': 'Kollektionen',
      'footer.company': 'Unternehmen', 'footer.about': '\u00dcber uns', 'footer.careers': 'Karriere', 'footer.privacy': 'Datenschutz', 'footer.terms': 'AGB',
      'toast.saved': 'In deiner Kollektion gespeichert', 'toast.removed': 'Aus Gespeicherten entfernt', 'toast.cleared': 'Alle gespeicherten Artikel gel\u00f6scht',
      'search.searching': 'Suche...', 'search.joining': 'Anmelden...',
      'results.ai.eyebrow': 'KI-Ergebnisse', 'results.ai.title': 'Deine Dupes sind bereit', 'results.demo.eyebrow': 'Demo-Ergebnisse', 'results.demo.hint': 'F\u00fcge deinen API-Schl\u00fcssel in den Einstellungen hinzu f\u00fcr echte KI-Ergebnisse', 'results.bestDupe': 'Bester Dupe', 'results.moreAlts': 'Spotted Alternatives',
      'results.loading.title': 'Unsere KI analysiert deinen Artikel\u2026', 'results.loading.sub': 'Suche nach den besten Alternativen in 6 Gesch\u00e4ften',
      'share.whatsapp': 'WhatsApp', 'share.copy': 'Link kopieren', 'share.copied': 'Kopiert!',
      'share.text': 'Schau dir diesen Dupe an: {name} von {store} f\u00fcr nur {price} \u2014 gefunden auf ALTERE',
      'share.results': 'Ergebnisse teilen', 'share.story': 'F\u00fcr Stories herunterladen', 'share.story.footer': 'Gefunden mit ALTERE', 'share.story.downloaded': 'Story-Bild heruntergeladen',
      'invite.eyebrow': 'Weitersagen', 'invite.title': 'Teile ALTERE mit Freunden', 'invite.sub': 'Kennst du jemanden, der Mode liebt, aber nicht zu viel ausgeben will? Schick sie zu uns.', 'invite.copyLink': 'Link kopieren',
      'invite.message': 'Schau dir ALTERE an \u2014 ein KI-gest\u00fctzter Mode-Dupe-Finder, der Luxus-Lookalikes zu g\u00fcnstigen Preisen findet!'
    },
    es: {
      'nav.discover': 'Descubrir', 'nav.brands': 'Marcas', 'nav.saved': 'Guardados', 'nav.signin': 'Iniciar sesi\u00f3n',
      'hero.eyebrow': 'Descubrimiento de Moda con IA',
      'hero.headline': 'Lo viste.<br>Nosotros lo encontramos.',
      'hero.sub': 'Describe cualquier art\u00edculo de moda accesible y nuestra IA identifica el original de lujo \u2014 m\u00e1s alternativas asequibles.',
      'search.tab.link': 'Pegar enlace', 'search.tab.upload': 'Subir foto', 'search.tab.text': 'Descubrir & Buscar',
      'search.placeholder.link': 'Pega la URL de un producto de cualquier tienda de moda...',
      'search.placeholder.text': 'Describe el art\u00edculo, ej. "falda midi de sat\u00e9n crema"...',
      'search.btn': 'Buscar alternativas',
      'search.tab.reverse': 'Buscar original', 'search.btnReverse': 'Buscar original', 'search.placeholder.reverse': 'Describe tu art\u00edculo, ej. "bolso acolchado Zara"...',
      'search.upload.hint': 'Arrastra o <strong>explora</strong>',
      'search.upload.formats': 'JPG, PNG o WEBP hasta 10 MB',
      'search.upload.ready': 'Listo para buscar',
      'search.status': 'La IA busca tus dupes',
      'search.tab.camera': 'Tomar foto', 'camera.start': 'Toca para abrir la c\u00e1mara', 'camera.hint': 'Apunta a cualquier art\u00edculo de moda para encontrar dupes', 'camera.retake': 'Repetir', 'camera.use': 'Spot Alternatives', 'camera.error': 'No se pudo acceder a la c\u00e1mara. Verifica los permisos.',
      'recent.label': 'Recientes', 'recent.clear': 'Borrar',
      'trending.label': 'Tendencia ahora',
      'hero.searching': 'Buscando en', 'hero.scroll': 'Despl\u00e1zate para explorar',
      'dotd.eyebrow': 'Daily Source', 'dotd.original': 'El Original', 'dotd.dupe': 'Mejor Dupe', 'dotd.vs': 'VS', 'dotd.btn': 'Encontrar m\u00e1s dupes',
      'calc.eyebrow': 'Calculadora de Ahorros', 'calc.title': '\u00bfCu\u00e1nto podr\u00edas ahorrar?', 'calc.sub': 'Mira qu\u00e9 pasa cuando cambias lujo por dupes inteligentes.', 'calc.budget': 'Presupuesto mensual de moda', 'calc.perMonth': 'Al mes', 'calc.perYear': 'Al a\u00f1o', 'calc.fiveYears': 'En 5 a\u00f1os', 'calc.note': 'Basado en un ahorro promedio del 68% al comprar dupes en lugar de lujo.',
      'proof.dupes': 'dupes encontrados hoy', 'proof.shoppers': 'compradores felices', 'proof.saved': 'ahorrados esta semana', 'press.label': 'Visto en',
      'celeb.eyebrow': 'Inspiraci\u00f3n de Estilo', 'celeb.title': 'Consigue el look de celebridad', 'celeb.sub': 'Explora las est\u00e9ticas m\u00e1s buscadas y encuentra dupes al instante.', 'celeb.btn': 'Buscar dupes',
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
      'about.step2Title': 'B\u00fasqueda multi-tienda', 'about.step2Desc': 'Escaneamos inventarios de Zara, H&M, Mango, ASOS, COS y & Other Stories en tiempo real, evaluando cada producto en m\u00e1s de 40 dimensiones de estilo.',
      'about.step3Title': 'Ranking inteligente', 'about.step3Desc': 'Los resultados se clasifican por precisi\u00f3n, ahorro y disponibilidad \u2014 el mejor dupe siempre sube al tope.',
      'about.teamEyebrow': 'Qui\u00e9nes Somos', 'about.teamTitle': 'Fundado por amantes de la moda,<br>impulsado por IA',
      'about.teamDesc': 'Somos un peque\u00f1o equipo de dise\u00f1adores, ingenieros y obsesivos de la moda con una misi\u00f3n: democratizar el estilo. Cada funci\u00f3n comienza con la misma pregunta: \u00bfesto ayuda a alguien a verse incre\u00edble sin gastar de m\u00e1s?',
      'about.cta': 'Empieza a descubrir dupes',
      'faq.eyebrow': 'Ayuda', 'faq.title': 'Preguntas frecuentes',
      'faq.q1': '\u00bfC\u00f3mo encuentra la IA los dupes?', 'faq.a1': 'Nuestro modelo de IA analiza cualquier art\u00edculo de moda \u2014 foto, enlace o descripci\u00f3n \u2014 descomponi\u00e9ndolo en atributos clave como tela, corte, color y silueta. Luego eval\u00faa miles de productos de Zara, H&M, Mango, ASOS, COS y & Other Stories en tiempo real.',
      'faq.q2': '\u00bfSon enlaces de afiliados?', 'faq.a2': 'Algunos enlaces pueden ser de afiliados, lo que significa que ganamos una peque\u00f1a comisi\u00f3n con tu compra \u2014 sin costo extra para ti. Las comisiones nunca influyen en los resultados.',
      'faq.q3': '\u00bfEs ALTERE gratis?', 'faq.a3': 'S\u00ed, ALTERE es completamente gratis. Puedes buscar dupes sin l\u00edmite, guardar favoritos y compartirlos \u2014 sin cuenta ni pago.',
      'faq.q4': '\u00bfQu\u00e9 tan precisos son los porcentajes?', 'faq.a4': 'Los porcentajes reflejan la similitud en m\u00e1s de 40 dimensiones de estilo. M\u00e1s del 90% significa muy alta similitud; 80\u201390% indica fuerte parecido con diferencias menores.',
      'faq.q5': '\u00bfPuedo sugerir una tienda?', 'faq.a5': '\u00a1Por supuesto! Siempre buscamos expandirnos. Env\u00edanos el nombre de la tienda. Las solicitudes populares incluyen Uniqlo, Arket y Massimo Dutti.',
      'reviews.eyebrow': 'Rese\u00f1as', 'reviews.title': 'Amado por los amantes de la moda',
      'reviews.r1.quote': '\u201cEncontr\u00e9 un dupe perfecto de Bottega para mi cumplea\u00f1os \u2014 nadie not\u00f3 la diferencia. \u00a1Ahorr\u00e9 m\u00e1s de 2.000\u20ac!\u201d', 'reviews.r1.name': 'Sophie M.', 'reviews.r1.location': '\u00c1msterdam, NL',
      'reviews.r2.quote': '\u201cUso ALTERE cada vez que veo algo en Instagram. La coincidencia de IA es incre\u00edblemente buena.\u201d', 'reviews.r2.name': 'James T.', 'reviews.r2.location': 'Londres, UK',
      'reviews.r3.quote': '\u201cComo estilista, esta es mi arma secreta. Mis clientes consiguen el look que quieren sin el sobreprecio de lujo.\u201d', 'reviews.r3.name': 'Amara K.', 'reviews.r3.location': 'Par\u00eds, FR',
      'reviews.r4.quote': '\u201cSub\u00ed una foto de un abrigo Max Mara de 900\u20ac y encontr\u00e9 uno casi id\u00e9ntico en H&M por 89\u20ac. Irreal.\u201d', 'reviews.r4.name': 'Luca R.', 'reviews.r4.location': 'Mil\u00e1n, IT',
      'reviews.r5.quote': '\u201cPor fin un buscador de dupes que funciona de verdad. La subida de fotos cambia todo para la inspiraci\u00f3n de Pinterest.\u201d', 'reviews.r5.name': 'Elena V.', 'reviews.r5.location': 'Barcelona, ES',
      'reviews.r6.quote': '\u201cSe lo ense\u00f1\u00e9 a mis amigos y ahora todo el grupo est\u00e1 obsesionado. Compartimos dupes cada d\u00eda.\u201d', 'reviews.r6.name': 'Noah B.', 'reviews.r6.location': 'Berl\u00edn, DE',
      'results.eyebrow': 'Dupes en Tendencia',
      'results.title': 'Looks de lujo, precios accesibles',
      'results.subtitle': 'Nuestra IA escanea miles de productos diariamente para encontrar las mejores alternativas.',
      'filter.category': 'Categor\u00eda', 'filter.bags': 'Bolsos', 'filter.shoes': 'Zapatos', 'filter.clothing': 'Ropa', 'filter.jewellery': 'Joyer\u00eda', 'filter.accessories': 'Accesorios',
      'filter.price': 'Precio', 'filter.all': 'Todo', 'filter.store': 'Tienda', 'filter.allStores': 'Todas las Tiendas', 'filter.sortBy': 'Ordenar por',
      'sort.match': 'Mejor coincidencia', 'sort.priceAsc': 'Precio: Menor a Mayor', 'sort.priceDesc': 'Precio: Mayor a Menor', 'sort.saving': 'Mayor ahorro',
      'how.eyebrow': 'C\u00f3mo funciona', 'how.title': 'Tres pasos hacia tu dupe perfecto',
      'how.step1.title': 'Sube o pega', 'how.step1.desc': 'Comparte una foto, enlace o descripci\u00f3n de la prenda de lujo que te encanta.',
      'how.step2.title': 'An\u00e1lisis IA', 'how.step2.desc': 'Nuestro modelo analiza tela, corte, color y silueta en segundos.',
      'how.step3.title': 'Compra los dupes', 'how.step3.desc': 'Explora alternativas clasificadas con puntuaciones, precios y enlaces directos.',
      'waitlist.eyebrow': 'Acceso Anticipado', 'waitlist.title': 'S\u00e9 el primero en saber<br>cu\u00e1ndo lanzamos',
      'waitlist.sub': '\u00danete a miles de amantes de la moda ya en la lista.',
      'waitlist.placeholder': 'Introduce tu correo electr\u00f3nico', 'waitlist.btn': '\u00danete a la lista',
      'waitlist.hint': 'Sin spam, nunca. Canc\u00e9late en cualquier momento.',
      'waitlist.success.title': 'Est\u00e1s en la lista', 'waitlist.success.desc': 'Te avisaremos cuando ALTERE est\u00e9 en l\u00ednea.',
      'saved.back': 'Volver', 'saved.eyebrow': 'Tu Colecci\u00f3n', 'saved.title': 'Art\u00edculos Guardados', 'saved.clearAll': 'Borrar todo',
      'saved.empty': 'A\u00fan no hay art\u00edculos guardados', 'saved.emptyHint': 'Toca el coraz\u00f3n en cualquier dupe para guardarlo aqu\u00ed',
      'footer.tagline': 'Buscador de dupes de moda con IA. Est\u00e9tica de lujo, precios accesibles.',
      'footer.explore': 'Explorar', 'footer.trending': 'Tendencias', 'footer.newArrivals': 'Novedades', 'footer.collections': 'Colecciones',
      'footer.company': 'Empresa', 'footer.about': 'Acerca de', 'footer.careers': 'Empleo', 'footer.privacy': 'Privacidad', 'footer.terms': 'T\u00e9rminos',
      'toast.saved': 'Guardado en tu colecci\u00f3n', 'toast.removed': 'Eliminado de guardados', 'toast.cleared': 'Todos los art\u00edculos guardados eliminados',
      'search.searching': 'Buscando...', 'search.joining': 'Uni\u00e9ndose...',
      'results.ai.eyebrow': 'Resultados IA', 'results.ai.title': 'Tus dupes est\u00e1n listos', 'results.demo.eyebrow': 'Resultados demo', 'results.demo.hint': 'A\u00f1ade tu clave API en ajustes para resultados reales de IA', 'results.bestDupe': 'Mejor Dupe', 'results.moreAlts': 'Spotted Alternatives',
      'results.loading.title': 'Nuestra IA analiza tu art\u00edculo\u2026', 'results.loading.sub': 'Buscando las mejores alternativas en 6 tiendas',
      'share.whatsapp': 'WhatsApp', 'share.copy': 'Copiar enlace', 'share.copied': '\u00a1Copiado!',
      'share.text': 'Mira este dupe: {name} de {store} por solo {price} \u2014 encontrado en ALTERE',
      'share.results': 'Compartir resultados', 'share.story': 'Descargar para Stories', 'share.story.footer': 'Encontrado con ALTERE', 'share.story.downloaded': 'Imagen de story descargada',
      'invite.eyebrow': 'Corre la Voz', 'invite.title': 'Comparte ALTERE con amigos', 'invite.sub': '\u00bfConoces a alguien que ama la moda pero odia pagar de m\u00e1s? Env\u00edalos hacia nosotros.', 'invite.copyLink': 'Copiar enlace',
      'invite.message': '\u00a1Mira ALTERE \u2014 un buscador de dupes de moda con IA que encuentra imitaciones de lujo a precios accesibles!'
    },
    it: {
      'nav.discover': 'Scopri', 'nav.brands': 'Marchi', 'nav.saved': 'Salvati', 'nav.signin': 'Accedi',
      'hero.eyebrow': 'Scoperta Moda con IA',
      'hero.headline': 'L\u2019hai visto.<br>Noi lo troviamo.',
      'hero.sub': 'Descrivi un capo high-street e la nostra IA identifica l\u2019originale di lusso \u2014 pi\u00f9 alternative accessibili.',
      'search.tab.link': 'Incolla link', 'search.tab.upload': 'Carica foto', 'search.tab.text': 'Scopri & Trova',
      'search.placeholder.link': 'Incolla l\u2019URL di un prodotto da un sito di moda...',
      'search.placeholder.text': 'Descrivi l\u2019articolo, es. "gonna midi in raso panna"...',
      'search.btn': 'Trova alternative',
      'search.tab.reverse': 'Trova originale', 'search.btnReverse': 'Trova originale', 'search.placeholder.reverse': 'Descrivi il tuo articolo, es. "borsa trapuntata Zara"...',
      'search.upload.hint': 'Trascina o <strong>sfoglia</strong>',
      'search.upload.formats': 'JPG, PNG o WEBP fino a 10 MB',
      'search.upload.ready': 'Pronto per cercare',
      'search.status': 'L\u2019IA sta cercando i tuoi dupes',
      'search.tab.camera': 'Scatta foto', 'camera.start': 'Tocca per aprire la fotocamera', 'camera.hint': 'Inquadra un articolo di moda per trovare dupes', 'camera.retake': 'Riprova', 'camera.use': 'Spot Alternatives', 'camera.error': 'Impossibile accedere alla fotocamera. Controlla i permessi.',
      'recent.label': 'Recenti', 'recent.clear': 'Cancella',
      'trending.label': 'Di tendenza',
      'hero.searching': 'Ricerca su', 'hero.scroll': 'Scorri per esplorare',
      'dotd.eyebrow': 'Daily Source', 'dotd.original': 'L\u2019Originale', 'dotd.dupe': 'Miglior Dupe', 'dotd.vs': 'VS', 'dotd.btn': 'Trova pi\u00f9 dupes',
      'calc.eyebrow': 'Calcolatore Risparmi', 'calc.title': 'Quanto potresti risparmiare?', 'calc.sub': 'Scopri cosa succede quando scambi il lusso con dupes intelligenti.', 'calc.budget': 'Budget moda mensile', 'calc.perMonth': 'Al mese', 'calc.perYear': 'All\u2019anno', 'calc.fiveYears': 'In 5 anni', 'calc.note': 'Basato su un risparmio medio del 68% acquistando dupes invece di lusso.',
      'proof.dupes': 'dupes trovati oggi', 'proof.shoppers': 'acquirenti soddisfatti', 'proof.saved': 'risparmiati questa settimana', 'press.label': 'Visto su',
      'celeb.eyebrow': 'Ispirazione Stile', 'celeb.title': 'Ottieni il look delle star', 'celeb.sub': 'Scopri le estetiche pi\u00f9 cercate e trova dupes all\u2019istante.', 'celeb.btn': 'Trova dupes',
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
      'about.step2Title': 'Matching multi-negozio', 'about.step2Desc': 'Analizziamo gli inventari di Zara, H&M, Mango, ASOS, COS e & Other Stories in tempo reale, valutando ogni prodotto su oltre 40 dimensioni di stile.',
      'about.step3Title': 'Classificazione intelligente', 'about.step3Desc': 'I risultati sono classificati per accuratezza, risparmio e disponibilit\u00e0 \u2014 il miglior dupe \u00e8 sempre in cima.',
      'about.teamEyebrow': 'Chi Siamo', 'about.teamTitle': 'Fondato da amanti della moda,<br>alimentato dall\u2019IA',
      'about.teamDesc': 'Siamo un piccolo team di designer, ingegneri e appassionati di moda con una missione: democratizzare lo stile. Ogni funzione inizia con la stessa domanda: questo aiuta qualcuno ad apparire incredibile senza spendere troppo?',
      'about.cta': 'Inizia a scoprire i dupes',
      'faq.eyebrow': 'Supporto', 'faq.title': 'Domande frequenti',
      'faq.q1': 'Come fa l\u2019IA a trovare i dupes?', 'faq.a1': 'Il nostro modello IA analizza qualsiasi articolo di moda \u2014 foto, link o descrizione \u2014 scomponendolo in attributi chiave come tessuto, taglio, colore e silhouette. Poi valuta migliaia di prodotti di Zara, H&M, Mango, ASOS, COS e & Other Stories in tempo reale.',
      'faq.q2': 'I link sono link di affiliazione?', 'faq.a2': 'Alcuni link possono essere di affiliazione, il che significa che guadagniamo una piccola commissione con il tuo acquisto \u2014 senza costi aggiuntivi per te. Le commissioni non influenzano mai i risultati.',
      'faq.q3': 'ALTERE \u00e8 gratuito?', 'faq.a3': 'S\u00ec, ALTERE \u00e8 completamente gratuito. Puoi cercare dupes senza limiti, salvare i preferiti e condividerli \u2014 senza account o pagamento.',
      'faq.q4': 'Quanto sono precise le percentuali?', 'faq.a4': 'Le percentuali riflettono la somiglianza su oltre 40 dimensioni di stile. Sopra il 90% significa somiglianza molto alta; 80\u201390% indica forte somiglianza con differenze minori.',
      'faq.q5': 'Posso suggerire un negozio?', 'faq.a5': 'Certamente! Cerchiamo sempre di espanderci. Inviaci il nome del negozio. Le richieste popolari includono Uniqlo, Arket e Massimo Dutti.',
      'reviews.eyebrow': 'Recensioni', 'reviews.title': 'Amato dagli appassionati di moda',
      'reviews.r1.quote': '\u201cTrovato un dupe Bottega perfetto per il mio compleanno \u2014 nessuno ha visto la differenza. Risparmiati oltre 2.000\u20ac!\u201d', 'reviews.r1.name': 'Sophie M.', 'reviews.r1.location': 'Amsterdam, NL',
      'reviews.r2.quote': '\u201cUso ALTERE ogni volta che vedo qualcosa su Instagram. La corrispondenza IA \u00e8 incredibilmente precisa.\u201d', 'reviews.r2.name': 'James T.', 'reviews.r2.location': 'Londra, UK',
      'reviews.r3.quote': '\u201cCome stilista, \u00e8 la mia arma segreta. I miei clienti ottengono il look che vogliono senza il sovrapprezzo del lusso.\u201d', 'reviews.r3.name': 'Amara K.', 'reviews.r3.location': 'Parigi, FR',
      'reviews.r4.quote': '\u201cCaricata una foto di un cappotto Max Mara da 900\u20ac e trovato uno quasi identico da H&M a 89\u20ac. Assurdo.\u201d', 'reviews.r4.name': 'Luca R.', 'reviews.r4.location': 'Milano, IT',
      'reviews.r5.quote': '\u201cFinalmente un trova-dupes che funziona davvero. L\u2019upload foto \u00e8 rivoluzionario per l\u2019ispirazione Pinterest.\u201d', 'reviews.r5.name': 'Elena V.', 'reviews.r5.location': 'Barcellona, ES',
      'reviews.r6.quote': '\u201cMostrato agli amici e ora tutta la chat di gruppo \u00e8 ossessionata. Condividiamo dupes ogni giorno.\u201d', 'reviews.r6.name': 'Noah B.', 'reviews.r6.location': 'Berlino, DE',
      'results.eyebrow': 'Dupes di Tendenza',
      'results.title': 'Look di lusso, prezzi accessibili',
      'results.subtitle': 'La nostra IA analizza migliaia di prodotti ogni giorno per le migliori alternative.',
      'filter.category': 'Categoria', 'filter.bags': 'Borse', 'filter.shoes': 'Scarpe', 'filter.clothing': 'Abbigliamento', 'filter.jewellery': 'Gioielli', 'filter.accessories': 'Accessori',
      'filter.price': 'Prezzo', 'filter.all': 'Tutti', 'filter.store': 'Negozio', 'filter.allStores': 'Tutti i Negozi', 'filter.sortBy': 'Ordina per',
      'sort.match': 'Migliore corrispondenza', 'sort.priceAsc': 'Prezzo: Crescente', 'sort.priceDesc': 'Prezzo: Decrescente', 'sort.saving': 'Maggiore risparmio',
      'how.eyebrow': 'Come funziona', 'how.title': 'Tre passi verso il tuo dupe perfetto',
      'how.step1.title': 'Carica o incolla', 'how.step1.desc': 'Condividi una foto, un link o una descrizione del capo di lusso che ami.',
      'how.step2.title': 'Analisi IA', 'how.step2.desc': 'Il nostro modello analizza tessuto, taglio, colore e silhouette in pochi secondi.',
      'how.step3.title': 'Acquista i dupes', 'how.step3.desc': 'Sfoglia alternative classificate con punteggi, prezzi e link diretti ai negozi.',
      'waitlist.eyebrow': 'Accesso Anticipato', 'waitlist.title': 'Sii il primo a sapere<br>del lancio',
      'waitlist.sub': 'Unisciti a migliaia di appassionati di moda gi\u00e0 in lista.',
      'waitlist.placeholder': 'Inserisci il tuo indirizzo email', 'waitlist.btn': 'Unisciti alla lista',
      'waitlist.hint': 'Niente spam, mai. Cancellati in qualsiasi momento.',
      'waitlist.success.title': 'Sei nella lista', 'waitlist.success.desc': 'Ti avviseremo appena ALTERE sar\u00e0 online.',
      'saved.back': 'Indietro', 'saved.eyebrow': 'La Tua Collezione', 'saved.title': 'Articoli Salvati', 'saved.clearAll': 'Cancella tutto',
      'saved.empty': 'Nessun articolo salvato', 'saved.emptyHint': 'Tocca il cuore su un dupe per salvarlo qui',
      'footer.tagline': 'Trova dupes di moda con IA. Estetica di lusso, prezzi accessibili.',
      'footer.explore': 'Esplora', 'footer.trending': 'Tendenze', 'footer.newArrivals': 'Novit\u00e0', 'footer.collections': 'Collezioni',
      'footer.company': 'Azienda', 'footer.about': 'Chi siamo', 'footer.careers': 'Lavora con noi', 'footer.privacy': 'Privacy', 'footer.terms': 'Termini',
      'toast.saved': 'Salvato nella tua collezione', 'toast.removed': 'Rimosso dai salvati', 'toast.cleared': 'Tutti gli articoli salvati cancellati',
      'search.searching': 'Ricerca...', 'search.joining': 'Iscrizione...',
      'results.ai.eyebrow': 'Risultati IA', 'results.ai.title': 'I tuoi dupes sono pronti', 'results.demo.eyebrow': 'Risultati demo', 'results.demo.hint': 'Aggiungi la tua chiave API nelle impostazioni per risultati IA reali', 'results.bestDupe': 'Miglior Dupe', 'results.moreAlts': 'Spotted Alternatives',
      'results.loading.title': 'La nostra IA analizza il tuo articolo\u2026', 'results.loading.sub': 'Ricerca delle migliori alternative in 6 negozi',
      'share.whatsapp': 'WhatsApp', 'share.copy': 'Copia link', 'share.copied': 'Copiato!',
      'share.text': 'Guarda questo dupe: {name} di {store} a solo {price} \u2014 trovato su ALTERE',
      'share.results': 'Condividi risultati', 'share.story': 'Scarica per Stories', 'share.story.footer': 'Trovato con ALTERE', 'share.story.downloaded': 'Immagine story scaricata',
      'invite.eyebrow': 'Passa Parola', 'invite.title': 'Condividi ALTERE con gli amici', 'invite.sub': 'Conosci qualcuno che ama la moda ma odia spendere troppo? Mandalo da noi.', 'invite.copyLink': 'Copia link',
      'invite.message': 'Scopri ALTERE \u2014 un trova-dupes di moda con IA che scova alternative di lusso a prezzi accessibili!'
    },
    ar: {
      'nav.discover': '\u0627\u0643\u062a\u0634\u0641', 'nav.brands': '\u0627\u0644\u0639\u0644\u0627\u0645\u0627\u062a', 'nav.saved': '\u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0627\u062a', 'nav.signin': '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644',
      'hero.eyebrow': '\u0627\u0643\u062a\u0634\u0627\u0641 \u0627\u0644\u0645\u0648\u0636\u0629 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a',
      'hero.headline': '\u0634\u0641\u062a\u0647.<br>\u0646\u062d\u0646 \u0646\u062c\u062f\u0647.',
      'hero.sub': '\u0635\u0641 \u0623\u064a \u0642\u0637\u0639\u0629 \u0645\u0646 \u0627\u0644\u0634\u0627\u0631\u0639 \u0648\u0633\u064a\u062d\u062f\u062f \u0630\u0643\u0627\u0624\u0646\u0627 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u0627\u0644\u0623\u0635\u0644 \u0627\u0644\u0641\u0627\u062e\u0631 \u2014 \u0645\u0639 \u0628\u062f\u0627\u0626\u0644 \u0645\u0639\u0642\u0648\u0644\u0629.',
      'search.tab.link': '\u0644\u0635\u0642 \u0631\u0627\u0628\u0637', 'search.tab.upload': '\u0631\u0641\u0639 \u0635\u0648\u0631\u0629', 'search.tab.text': '\u0627\u0643\u062a\u0634\u0641 & \u0627\u0639\u062b\u0631', 'search.tab.camera': '\u0627\u0644\u062a\u0642\u0637 \u0635\u0648\u0631\u0629',
      'search.placeholder.link': '\u0627\u0644\u0635\u0642 \u0631\u0627\u0628\u0637 \u0645\u0646\u062a\u062c \u0645\u0646 \u0623\u064a \u0645\u0648\u0642\u0639 \u0623\u0632\u064a\u0627\u0621...',
      'search.placeholder.text': '\u0635\u0641 \u0627\u0644\u0642\u0637\u0639\u0629\u060c \u0645\u062b\u0644 "\u062a\u0646\u0648\u0631\u0629 \u0633\u0627\u062a\u0627\u0646 \u0643\u0631\u064a\u0645\u064a"...',
      'search.btn': '\u0627\u0639\u062b\u0631 \u0639\u0644\u0649 \u0628\u062f\u0627\u0626\u0644',
      'search.tab.reverse': '\u0627\u0639\u062b\u0631 \u0639\u0644\u0649 \u0627\u0644\u0623\u0635\u0644\u064a', 'search.btnReverse': '\u0627\u0639\u062b\u0631 \u0639\u0644\u0649 \u0627\u0644\u0623\u0635\u0644\u064a', 'search.placeholder.reverse': '\u0635\u0641 \u0642\u0637\u0639\u062a\u0643\u060c \u0645\u062b\u0644 "\u062d\u0642\u064a\u0628\u0629 \u0632\u0627\u0631\u0627 \u0627\u0644\u0645\u0628\u0637\u0646\u0629"...',
      'search.upload.hint': '\u0627\u0633\u062d\u0628 \u0623\u0648 <strong>\u062a\u0635\u0641\u0651\u062d</strong>',
      'search.upload.formats': 'JPG \u0623\u0648 PNG \u0623\u0648 WEBP \u062d\u062a\u0649 10 \u0645\u064a\u063a\u0627',
      'search.upload.ready': '\u062c\u0627\u0647\u0632 \u0644\u0644\u0628\u062d\u062b',
      'search.status': '\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u064a\u0628\u062d\u062b \u0639\u0646 \u0628\u062f\u0627\u0626\u0644\u0643',
      'search.tab.camera': '\u0627\u0644\u062a\u0642\u0637 \u0635\u0648\u0631\u0629', 'camera.start': '\u0627\u0646\u0642\u0631 \u0644\u0641\u062a\u062d \u0627\u0644\u0643\u0627\u0645\u064a\u0631\u0627', 'camera.hint': '\u0648\u062c\u0651\u0647 \u0627\u0644\u0643\u0627\u0645\u064a\u0631\u0627 \u0646\u062d\u0648 \u0623\u064a \u0642\u0637\u0639\u0629 \u0623\u0632\u064a\u0627\u0621', 'camera.retake': '\u0625\u0639\u0627\u062f\u0629', 'camera.use': 'Spot Alternatives', 'camera.error': '\u062a\u0639\u0630\u0651\u0631 \u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0644\u0643\u0627\u0645\u064a\u0631\u0627. \u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0623\u0630\u0648\u0646\u0627\u062a.',
      'recent.label': '\u0627\u0644\u0623\u062e\u064a\u0631\u0629', 'recent.clear': '\u0645\u0633\u062d',
      'trending.label': '\u0631\u0627\u0626\u062c \u0627\u0644\u0622\u0646',
      'hero.searching': '\u0628\u062d\u062b \u0641\u064a', 'hero.scroll': '\u0645\u0631\u0631 \u0644\u0644\u0623\u0633\u0641\u0644 \u0644\u0644\u0627\u0633\u062a\u0643\u0634\u0627\u0641',
      'proof.dupes': '\u0628\u062f\u064a\u0644 \u062a\u0645 \u0625\u064a\u062c\u0627\u062f\u0647 \u0627\u0644\u064a\u0648\u0645', 'proof.shoppers': '\u0645\u062a\u0633\u0648\u0642 \u0633\u0639\u064a\u062f', 'proof.saved': '\u062a\u0645 \u062a\u0648\u0641\u064a\u0631\u0647 \u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639', 'press.label': '\u0643\u0645\u0627 \u0634\u0648\u0647\u062f \u0641\u064a',
      'celeb.eyebrow': '\u0625\u0644\u0647\u0627\u0645 \u0627\u0644\u0623\u0633\u0644\u0648\u0628', 'celeb.title': '\u0627\u062d\u0635\u0644 \u0639\u0644\u0649 \u0625\u0637\u0644\u0627\u0644\u0629 \u0627\u0644\u0645\u0634\u0627\u0647\u064a\u0631', 'celeb.sub': '\u0627\u0643\u062a\u0634\u0641 \u0623\u0643\u062b\u0631 \u0627\u0644\u0623\u0646\u0645\u0627\u0637 \u0628\u062d\u062b\u064b\u0627 \u0648\u0627\u0639\u062b\u0631 \u0639\u0644\u0649 \u0628\u062f\u0627\u0626\u0644 \u0641\u0648\u0631\u064b\u0627.', 'celeb.btn': '\u0627\u0628\u062d\u062b \u0639\u0646 \u0628\u062f\u0627\u0626\u0644',
      'celeb.c1.name': '\u0627\u0644\u0641\u062e\u0627\u0645\u0629 \u0627\u0644\u0647\u0627\u062f\u0626\u0629', 'celeb.c1.desc': '\u0623\u0646\u0627\u0642\u0629 \u0631\u0627\u0642\u064a\u0629. \u0623\u0644\u0648\u0627\u0646 \u0645\u062d\u0627\u064a\u062f\u0629\u060c \u0643\u0634\u0645\u064a\u0631 \u0648\u062e\u0637\u0648\u0637 \u0646\u0638\u064a\u0641\u0629 \u0645\u0633\u062a\u0648\u062d\u0627\u0629 \u0645\u0646 \u0627\u0644\u0628\u0633\u0627\u0637\u0629 \u0627\u0644\u0641\u0627\u062e\u0631\u0629.',
      'celeb.c2.name': '\u0623\u0646\u0627\u0642\u0629 \u0627\u0644\u0634\u0627\u0631\u0639', 'celeb.c2.desc': '\u062c\u0631\u064a\u0621 \u0648\u0648\u0627\u062b\u0642. \u0628\u0644\u064a\u0632\u0631\u0627\u062a \u0643\u0628\u064a\u0631\u0629\u060c \u0633\u0631\u0627\u0648\u064a\u0644 \u062c\u0644\u062f\u064a\u0629 \u0648\u0623\u062d\u0630\u064a\u0629 \u0645\u0645\u064a\u0632\u0629 \u0645\u0646 \u0623\u0633\u0627\u0628\u064a\u0639 \u0627\u0644\u0645\u0648\u0636\u0629.',
      'celeb.c3.name': '\u0627\u0644\u062b\u0631\u0627\u0621 \u0627\u0644\u0642\u062f\u064a\u0645', 'celeb.c3.desc': '\u0623\u0646\u0627\u0642\u0629 \u0643\u0644\u0627\u0633\u064a\u0643\u064a\u0629. \u0645\u0639\u0627\u0637\u0641 \u0645\u0641\u0635\u0644\u0629\u060c \u0644\u0645\u0633\u0627\u062a \u0644\u0624\u0644\u0624\u060c \u0623\u062d\u0630\u064a\u0629 \u0644\u0648\u0641\u0631 \u0648\u062d\u0642\u0627\u0626\u0628 \u0645\u0647\u064a\u0643\u0644\u0629.',
      'celeb.c4.name': '\u0627\u0644\u0641\u062a\u0627\u0629 \u0627\u0644\u0641\u0631\u0646\u0633\u064a\u0629', 'celeb.c4.desc': '\u0623\u0646\u0627\u0642\u0629 \u0628\u0644\u0627 \u062c\u0647\u062f. \u062e\u0637\u0648\u0637 \u0628\u0631\u064a\u062a\u0648\u0646\u064a\u0629\u060c \u062a\u0646\u0627\u0646\u064a\u0631 \u0645\u064a\u062f\u064a\u060c \u0628\u0627\u0644\u064a\u0631\u064a\u0646\u0627 \u0648\u0630\u0644\u0643 \u0627\u0644\u0633\u062d\u0631 \u0627\u0644\u0628\u0627\u0631\u064a\u0633\u064a.',
      'dotd.eyebrow': 'Daily Source', 'dotd.original': '\u0627\u0644\u0623\u0635\u0644\u064a', 'dotd.dupe': '\u0623\u0641\u0636\u0644 \u0628\u062f\u064a\u0644', 'dotd.vs': 'VS', 'dotd.btn': '\u0627\u0639\u062b\u0631 \u0639\u0644\u0649 \u0627\u0644\u0645\u0632\u064a\u062f',
      'calc.eyebrow': '\u062d\u0627\u0633\u0628\u0629 \u0627\u0644\u062a\u0648\u0641\u064a\u0631', 'calc.title': '\u0643\u0645 \u064a\u0645\u0643\u0646\u0643 \u062a\u0648\u0641\u064a\u0631\u0647\u061f', 'calc.sub': '\u0634\u0627\u0647\u062f \u0645\u0627\u0630\u0627 \u064a\u062d\u062f\u062b \u0639\u0646\u062f\u0645\u0627 \u062a\u0633\u062a\u0628\u062f\u0644 \u0627\u0644\u0641\u062e\u0627\u0645\u0629 \u0628\u0628\u062f\u0627\u0626\u0644 \u0630\u0643\u064a\u0629.', 'calc.budget': '\u0645\u064a\u0632\u0627\u0646\u064a\u0629 \u0627\u0644\u0623\u0632\u064a\u0627\u0621 \u0627\u0644\u0634\u0647\u0631\u064a\u0629', 'calc.perMonth': '\u0634\u0647\u0631\u064a\u064b\u0627', 'calc.perYear': '\u0633\u0646\u0648\u064a\u064b\u0627', 'calc.fiveYears': '\u0641\u064a 5 \u0633\u0646\u0648\u0627\u062a', 'calc.note': '\u0628\u0646\u0627\u0621\u064b \u0639\u0644\u0649 \u0645\u062a\u0648\u0633\u0637 \u062a\u0648\u0641\u064a\u0631 68% \u0639\u0646\u062f \u0634\u0631\u0627\u0621 \u0627\u0644\u0628\u062f\u0627\u0626\u0644.',
      'filter.category': '\u0627\u0644\u0641\u0626\u0629', 'filter.bags': '\u062d\u0642\u0627\u0626\u0628', 'filter.shoes': '\u0623\u062d\u0630\u064a\u0629', 'filter.clothing': '\u0645\u0644\u0627\u0628\u0633', 'filter.jewellery': '\u0645\u062c\u0648\u0647\u0631\u0627\u062a', 'filter.accessories': '\u0625\u0643\u0633\u0633\u0648\u0627\u0631\u0627\u062a',
      'results.eyebrow': '\u0627\u0644\u0628\u062f\u0627\u0626\u0644 \u0627\u0644\u0631\u0627\u0626\u062c\u0629',
      'results.title': '\u0625\u0637\u0644\u0627\u0644\u0627\u062a \u0641\u0627\u062e\u0631\u0629\u060c \u0623\u0633\u0639\u0627\u0631 \u0645\u0639\u0642\u0648\u0644\u0629',
      'results.subtitle': '\u0630\u0643\u0627\u0624\u0646\u0627 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u064a\u0641\u062d\u0635 \u0622\u0644\u0627\u0641 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u064a\u0648\u0645\u064a\u064b\u0627 \u0644\u0625\u064a\u062c\u0627\u062f \u0623\u0641\u0636\u0644 \u0627\u0644\u0628\u062f\u0627\u0626\u0644.',
      'filter.price': '\u0627\u0644\u0633\u0639\u0631', 'filter.all': '\u0627\u0644\u0643\u0644', 'filter.store': '\u0627\u0644\u0645\u062a\u062c\u0631', 'filter.allStores': '\u0643\u0644 \u0627\u0644\u0645\u062a\u0627\u062c\u0631', 'filter.sortBy': '\u062a\u0631\u062a\u064a\u0628 \u062d\u0633\u0628',
      'sort.match': '\u0623\u0641\u0636\u0644 \u062a\u0637\u0627\u0628\u0642', 'sort.priceAsc': '\u0627\u0644\u0633\u0639\u0631: \u0645\u0646 \u0627\u0644\u0623\u0642\u0644', 'sort.priceDesc': '\u0627\u0644\u0633\u0639\u0631: \u0645\u0646 \u0627\u0644\u0623\u0639\u0644\u0649', 'sort.saving': '\u0623\u0643\u0628\u0631 \u062a\u0648\u0641\u064a\u0631',
      'how.eyebrow': '\u0643\u064a\u0641 \u064a\u0639\u0645\u0644', 'how.title': '\u062b\u0644\u0627\u062b \u062e\u0637\u0648\u0627\u062a \u0644\u0644\u0628\u062f\u064a\u0644 \u0627\u0644\u0645\u062b\u0627\u0644\u064a',
      'how.step1.title': '\u0627\u0631\u0641\u0639 \u0623\u0648 \u0627\u0644\u0635\u0642', 'how.step1.desc': '\u0634\u0627\u0631\u0643 \u0635\u0648\u0631\u0629 \u0623\u0648 \u0631\u0627\u0628\u0637 \u0623\u0648 \u0648\u0635\u0641 \u0644\u0644\u0642\u0637\u0639\u0629 \u0627\u0644\u0641\u0627\u062e\u0631\u0629 \u0627\u0644\u062a\u064a \u062a\u062d\u0628\u0647\u0627.',
      'how.step2.title': '\u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a', 'how.step2.desc': '\u064a\u062d\u0644\u0644 \u0646\u0645\u0648\u0630\u062c\u0646\u0627 \u0627\u0644\u0642\u0645\u0627\u0634 \u0648\u0627\u0644\u0642\u0635 \u0648\u0627\u0644\u0644\u0648\u0646 \u0648\u0627\u0644\u0634\u0643\u0644 \u0641\u064a \u062b\u0648\u0627\u0646\u064d.',
      'how.step3.title': '\u062a\u0633\u0648\u0642 \u0627\u0644\u0628\u062f\u0627\u0626\u0644', 'how.step3.desc': '\u062a\u0635\u0641\u062d \u0628\u062f\u0627\u0626\u0644 \u0645\u0631\u062a\u0628\u0629 \u0645\u0639 \u0646\u0633\u0628 \u0627\u0644\u062a\u0637\u0627\u0628\u0642 \u0648\u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0648\u0631\u0648\u0627\u0628\u0637 \u0645\u0628\u0627\u0634\u0631\u0629.',
      'faq.eyebrow': '\u0627\u0644\u062f\u0639\u0645', 'faq.title': '\u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629',
      'faq.q1': '\u0643\u064a\u0641 \u064a\u062c\u062f \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u0627\u0644\u0628\u062f\u0627\u0626\u0644\u061f', 'faq.a1': '\u064a\u062d\u0644\u0644 \u0646\u0645\u0648\u0630\u062c \u0627\u0644\u0631\u0624\u064a\u0629 \u0627\u0644\u0630\u0643\u064a\u0629 \u0623\u064a \u0642\u0637\u0639\u0629 \u0623\u0632\u064a\u0627\u0621 \u0648\u064a\u0642\u064a\u0645 \u0622\u0644\u0627\u0641 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0641\u064a \u0627\u0644\u0648\u0642\u062a \u0627\u0644\u0641\u0639\u0644\u064a.',
      'faq.q2': '\u0647\u0644 \u0627\u0644\u0631\u0648\u0627\u0628\u0637 \u0631\u0648\u0627\u0628\u0637 \u062a\u0633\u0648\u064a\u0642\u064a\u0629\u061f', 'faq.a2': '\u0628\u0639\u0636 \u0627\u0644\u0631\u0648\u0627\u0628\u0637 \u0642\u062f \u062a\u0643\u0648\u0646 \u062a\u0633\u0648\u064a\u0642\u064a\u0629\u060c \u0645\u0645\u0627 \u064a\u0639\u0646\u064a \u0623\u0646\u0646\u0627 \u0646\u062d\u0635\u0644 \u0639\u0644\u0649 \u0639\u0645\u0648\u0644\u0629 \u0635\u063a\u064a\u0631\u0629 \u2014 \u062f\u0648\u0646 \u062a\u0643\u0644\u0641\u0629 \u0625\u0636\u0627\u0641\u064a\u0629 \u0639\u0644\u064a\u0643. \u0627\u0644\u0646\u062a\u0627\u0626\u062c \u0645\u0631\u062a\u0628\u0629 \u062d\u0633\u0628 \u0627\u0644\u062c\u0648\u062f\u0629 \u0641\u0642\u0637.',
      'faq.q3': '\u0647\u0644 ALTERE \u0645\u062c\u0627\u0646\u064a\u061f', 'faq.a3': '\u0646\u0639\u0645\u060c ALTERE \u0645\u062c\u0627\u0646\u064a \u062a\u0645\u0627\u0645\u064b\u0627. \u064a\u0645\u0643\u0646\u0643 \u0627\u0644\u0628\u062d\u062b \u0639\u0646 \u0628\u062f\u0627\u0626\u0644 \u063a\u064a\u0631 \u0645\u062d\u062f\u0648\u062f\u0629 \u0648\u062d\u0641\u0638\u0647\u0627 \u0648\u0645\u0634\u0627\u0631\u0643\u062a\u0647\u0627 \u2014 \u062f\u0648\u0646 \u062d\u0633\u0627\u0628 \u0623\u0648 \u062f\u0641\u0639.',
      'faq.q4': '\u0645\u0627 \u0645\u062f\u0649 \u062f\u0642\u0629 \u0646\u0633\u0628 \u0627\u0644\u062a\u0637\u0627\u0628\u0642\u061f', 'faq.a4': '\u062a\u0639\u0643\u0633 \u0627\u0644\u0646\u0633\u0628 \u0645\u062f\u0649 \u062a\u0634\u0627\u0628\u0647 \u0627\u0644\u0628\u062f\u064a\u0644 \u0639\u0628\u0631 \u0623\u0643\u062b\u0631 \u0645\u0646 40 \u0628\u064f\u0639\u062f \u0623\u0633\u0644\u0648\u0628\u064a. \u0623\u0643\u062b\u0631 \u0645\u0646 90% \u064a\u0639\u0646\u064a \u062a\u0634\u0627\u0628\u0647 \u0643\u0628\u064a\u0631 \u062c\u062f\u064b\u0627.',
      'faq.q5': '\u0647\u0644 \u064a\u0645\u0643\u0646\u0646\u064a \u0627\u0642\u062a\u0631\u0627\u062d \u0645\u062a\u062c\u0631\u061f', 'faq.a5': '\u0628\u0627\u0644\u062a\u0623\u0643\u064a\u062f! \u0646\u062d\u0646 \u062f\u0627\u0626\u0645\u064b\u0627 \u0646\u0628\u062d\u062b \u0639\u0646 \u0627\u0644\u062a\u0648\u0633\u0639. \u0623\u0631\u0633\u0644 \u0644\u0646\u0627 \u0627\u0633\u0645 \u0627\u0644\u0645\u062a\u062c\u0631 \u0648\u0633\u0646\u0642\u064a\u0645\u0647.',
      'reviews.eyebrow': '\u0627\u0644\u062a\u0642\u064a\u064a\u0645\u0627\u062a', 'reviews.title': '\u0645\u062d\u0628\u0648\u0628 \u0645\u0646 \u0639\u0634\u0627\u0642 \u0627\u0644\u0645\u0648\u0636\u0629',
      'reviews.r1.quote': '\u201c\u0648\u062c\u062f\u062a \u0628\u062f\u064a\u0644 \u0645\u062b\u0627\u0644\u064a \u0644\u062d\u0642\u064a\u0628\u0629 \u0628\u0648\u062a\u064a\u063a\u0627 \u0644\u0639\u064a\u062f \u0645\u064a\u0644\u0627\u062f\u064a \u2014 \u0644\u0645 \u064a\u0644\u0627\u062d\u0638 \u0623\u062d\u062f \u0627\u0644\u0641\u0631\u0642!\u201d', 'reviews.r1.name': 'Sophie M.', 'reviews.r1.location': '\u0623\u0645\u0633\u062a\u0631\u062f\u0627\u0645',
      'reviews.r2.quote': '\u201c\u0623\u0633\u062a\u062e\u062f\u0645 ALTERE \u0643\u0644\u0645\u0627 \u0631\u0623\u064a\u062a \u0634\u064a\u0626\u064b\u0627 \u0639\u0644\u0649 \u0625\u0646\u0633\u062a\u063a\u0631\u0627\u0645. \u062a\u0637\u0627\u0628\u0642 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u0645\u0630\u0647\u0644.\u201d', 'reviews.r2.name': 'James T.', 'reviews.r2.location': '\u0644\u0646\u062f\u0646',
      'reviews.r3.quote': '\u201c\u0643\u0645\u0635\u0645\u0645\u0629 \u0623\u0632\u064a\u0627\u0621\u060c \u0647\u0630\u0627 \u0633\u0644\u0627\u062d\u064a \u0627\u0644\u0633\u0631\u064a.\u201d', 'reviews.r3.name': 'Amara K.', 'reviews.r3.location': '\u0628\u0627\u0631\u064a\u0633',
      'reviews.r4.quote': '\u201c\u0631\u0641\u0639\u062a \u0635\u0648\u0631\u0629 \u0645\u0639\u0637\u0641 Max Mara \u0628\u0640900\u20ac \u0648\u0648\u062c\u062f\u062a \u0645\u062b\u064a\u0644\u0647 \u0641\u064a H&M \u0628\u064089\u20ac!\u201d', 'reviews.r4.name': 'Luca R.', 'reviews.r4.location': '\u0645\u064a\u0644\u0627\u0646\u0648',
      'reviews.r5.quote': '\u201c\u0623\u062e\u064a\u0631\u064b\u0627 \u0628\u0627\u062d\u062b \u0628\u062f\u0627\u0626\u0644 \u064a\u0639\u0645\u0644 \u0641\u0639\u0644\u0627\u064b! \u0645\u064a\u0632\u0629 \u0631\u0641\u0639 \u0627\u0644\u0635\u0648\u0631 \u063a\u064a\u0631\u062a \u0643\u0644 \u0634\u064a\u0621.\u201d', 'reviews.r5.name': 'Elena V.', 'reviews.r5.location': '\u0628\u0631\u0634\u0644\u0648\u0646\u0629',
      'reviews.r6.quote': '\u201c\u0623\u0631\u064a\u062a \u0623\u0635\u062f\u0642\u0627\u0626\u064a \u0648\u0627\u0644\u0622\u0646 \u0643\u0644 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629 \u0645\u0647\u0648\u0648\u0633\u0629!\u201d', 'reviews.r6.name': 'Noah B.', 'reviews.r6.location': '\u0628\u0631\u0644\u064a\u0646',
      'cookie.text': '\u0646\u0633\u062a\u062e\u062f\u0645 \u0645\u0644\u0641\u0627\u062a \u062a\u0639\u0631\u064a\u0641 \u0627\u0644\u0627\u0631\u062a\u0628\u0627\u0637 \u0644\u062a\u062d\u0633\u064a\u0646 \u062a\u062c\u0631\u0628\u062a\u0643.', 'cookie.accept': '\u0642\u0628\u0648\u0644 \u0627\u0644\u0643\u0644', 'cookie.manage': '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u062a\u0641\u0636\u064a\u0644\u0627\u062a',
      'about.mission': '\u062c\u0645\u0627\u0644\u064a\u0627\u062a \u0641\u0627\u062e\u0631\u0629\u060c \u0623\u0633\u0639\u0627\u0631 \u0645\u062a\u0627\u062d\u0629.', 'about.storyEyebrow': '\u0642\u0635\u062a\u0646\u0627', 'about.storyTitle': '\u0627\u0644\u0645\u0648\u0636\u0629 \u064a\u062c\u0628 \u0623\u0646 \u062a\u0643\u0648\u0646 \u0644\u0644\u062c\u0645\u064a\u0639',
      'about.storyP1': '\u0648\u0644\u062f ALTERE \u0645\u0646 \u0625\u062d\u0628\u0627\u0637 \u0628\u0633\u064a\u0637: \u0627\u0644\u0648\u0642\u0648\u0639 \u0641\u064a \u062d\u0628 \u0642\u0637\u0639\u0629 \u0645\u0646 \u0639\u0631\u0636 \u0627\u0644\u0623\u0632\u064a\u0627\u0621 \u062b\u0645 \u0631\u0624\u064a\u0629 \u0627\u0644\u0633\u0639\u0631.',
      'about.storyP2': '\u0644\u0630\u0644\u0643 \u0628\u0646\u064a\u0646\u0627 \u0630\u0643\u0627\u0621\u064b \u0627\u0635\u0637\u0646\u0627\u0639\u064a\u064b\u0627 \u064a\u0631\u0649 \u0627\u0644\u0645\u0648\u0636\u0629 \u0643\u0645\u0635\u0645\u0645 \u2014 \u064a\u062d\u0644\u0644 \u0627\u0644\u0642\u0645\u0627\u0634 \u0648\u0627\u0644\u0642\u0635 \u0648\u0627\u0644\u0644\u0648\u0646 \u2014 \u062b\u0645 \u064a\u0628\u062d\u062b \u0641\u064a \u0622\u0644\u0627\u0641 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a.',
      'about.howEyebrow': '\u0627\u0644\u062a\u0643\u0646\u0648\u0644\u0648\u062c\u064a\u0627', 'about.howTitle': '\u0643\u064a\u0641 \u064a\u0639\u0645\u0644 \u0630\u0643\u0627\u0624\u0646\u0627 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a',
      'about.step1Title': '\u062a\u0641\u0643\u064a\u0643 \u0628\u0635\u0631\u064a', 'about.step1Desc': '\u064a\u062d\u0644\u0644 \u0646\u0645\u0648\u0630\u062c\u0646\u0627 \u0643\u0644 \u0642\u0637\u0639\u0629 \u0625\u0644\u0649 \u0633\u0645\u0627\u062a\u0647\u0627 \u0627\u0644\u0623\u0633\u0627\u0633\u064a\u0629.',
      'about.step2Title': '\u0645\u0637\u0627\u0628\u0642\u0629 \u0639\u0628\u0631 \u0627\u0644\u0645\u062a\u0627\u062c\u0631', 'about.step2Desc': '\u0646\u0641\u062d\u0635 \u0645\u062e\u0632\u0648\u0646\u0627\u062a Zara \u0648H&M \u0648Mango \u0648ASOS \u0648COS \u0648& Other Stories \u0641\u064a \u0627\u0644\u0648\u0642\u062a \u0627\u0644\u0641\u0639\u0644\u064a.',
      'about.step3Title': '\u062a\u0631\u062a\u064a\u0628 \u0630\u0643\u064a', 'about.step3Desc': '\u0627\u0644\u0646\u062a\u0627\u0626\u062c \u0645\u0631\u062a\u0628\u0629 \u062d\u0633\u0628 \u0627\u0644\u062f\u0642\u0629 \u0648\u0627\u0644\u062a\u0648\u0641\u064a\u0631 \u0648\u0627\u0644\u062a\u0648\u0641\u0631.',
      'about.teamEyebrow': '\u0645\u0646 \u0646\u062d\u0646', 'about.teamTitle': '\u0623\u0633\u0633\u0647\u0627 \u0639\u0634\u0627\u0642 \u0627\u0644\u0645\u0648\u0636\u0629\u060c<br>\u064a\u062f\u0639\u0645\u0647\u0627 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a',
      'about.teamDesc': '\u0646\u062d\u0646 \u0641\u0631\u064a\u0642 \u0635\u063a\u064a\u0631 \u0645\u0646 \u0627\u0644\u0645\u0635\u0645\u0645\u064a\u0646 \u0648\u0627\u0644\u0645\u0647\u0646\u062f\u0633\u064a\u0646 \u0648\u0639\u0634\u0627\u0642 \u0627\u0644\u0645\u0648\u0636\u0629 \u0628\u0645\u0647\u0645\u0629 \u0648\u0627\u062d\u062f\u0629: \u062c\u0639\u0644 \u0627\u0644\u0623\u0646\u0627\u0642\u0629 \u0644\u0644\u062c\u0645\u064a\u0639.',
      'about.cta': '\u0627\u0628\u062f\u0623 \u0628\u0627\u0643\u062a\u0634\u0627\u0641 \u0627\u0644\u0628\u062f\u0627\u0626\u0644',
      'waitlist.eyebrow': '\u0648\u0635\u0648\u0644 \u0645\u0628\u0643\u0631', 'waitlist.title': '\u0643\u0646 \u0623\u0648\u0644 \u0645\u0646 \u064a\u0639\u0631\u0641<br>\u0639\u0646\u062f \u0627\u0644\u0625\u0637\u0644\u0627\u0642',
      'waitlist.sub': '\u0627\u0646\u0636\u0645 \u0625\u0644\u0649 \u0622\u0644\u0627\u0641 \u0645\u062d\u0628\u064a \u0627\u0644\u0645\u0648\u0636\u0629 \u0627\u0644\u0645\u0648\u062c\u0648\u062f\u064a\u0646 \u0628\u0627\u0644\u0641\u0639\u0644 \u0641\u064a \u0627\u0644\u0642\u0627\u0626\u0645\u0629.',
      'waitlist.placeholder': '\u0623\u062f\u062e\u0644 \u0628\u0631\u064a\u062f\u0643 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a', 'waitlist.btn': '\u0627\u0646\u0636\u0645 \u0644\u0644\u0642\u0627\u0626\u0645\u0629',
      'waitlist.hint': '\u0644\u0627 \u0631\u0633\u0627\u0626\u0644 \u0645\u0632\u0639\u062c\u0629 \u0623\u0628\u062f\u064b\u0627. \u064a\u0645\u0643\u0646\u0643 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0641\u064a \u0623\u064a \u0648\u0642\u062a.',
      'waitlist.success.title': '\u0623\u0646\u062a \u0641\u064a \u0627\u0644\u0642\u0627\u0626\u0645\u0629', 'waitlist.success.desc': '\u0633\u0646\u062e\u0628\u0631\u0643 \u0641\u0648\u0631 \u0625\u0637\u0644\u0627\u0642 ALTERE.',
      'saved.back': '\u0631\u062c\u0648\u0639', 'saved.eyebrow': '\u0645\u062c\u0645\u0648\u0639\u062a\u0643', 'saved.title': '\u0627\u0644\u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0629', 'saved.clearAll': '\u0645\u0633\u062d \u0627\u0644\u0643\u0644',
      'saved.empty': '\u0644\u0627 \u062a\u0648\u062c\u062f \u0639\u0646\u0627\u0635\u0631 \u0645\u062d\u0641\u0648\u0638\u0629', 'saved.emptyHint': '\u0627\u0646\u0642\u0631 \u0639\u0644\u0649 \u0627\u0644\u0642\u0644\u0628 \u0644\u062d\u0641\u0638 \u0623\u064a \u0628\u062f\u064a\u0644 \u0647\u0646\u0627',
      'footer.tagline': '\u0628\u0627\u062d\u062b \u0628\u062f\u0627\u0626\u0644 \u0627\u0644\u0645\u0648\u0636\u0629 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a. \u062c\u0645\u0627\u0644\u064a\u0627\u062a \u0641\u0627\u062e\u0631\u0629\u060c \u0623\u0633\u0639\u0627\u0631 \u0645\u062a\u0627\u062d\u0629.',
      'footer.explore': '\u0627\u0633\u062a\u0643\u0634\u0641', 'footer.trending': '\u0631\u0627\u0626\u062c', 'footer.newArrivals': '\u0648\u0635\u0644 \u062d\u062f\u064a\u062b\u064b\u0627', 'footer.collections': '\u0645\u062c\u0645\u0648\u0639\u0627\u062a',
      'footer.company': '\u0627\u0644\u0634\u0631\u0643\u0629', 'footer.about': '\u0639\u0646\u0651\u0627', 'footer.careers': '\u0648\u0638\u0627\u0626\u0641', 'footer.privacy': '\u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629', 'footer.terms': '\u0627\u0644\u0634\u0631\u0648\u0637',
      'toast.saved': '\u062a\u0645 \u0627\u0644\u062d\u0641\u0638 \u0641\u064a \u0645\u062c\u0645\u0648\u0639\u062a\u0643', 'toast.removed': '\u062a\u0645 \u0627\u0644\u0625\u0632\u0627\u0644\u0629 \u0645\u0646 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0627\u062a', 'toast.cleared': '\u062a\u0645 \u0645\u0633\u062d \u0643\u0644 \u0627\u0644\u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0629',
      'search.searching': '\u062c\u0627\u0631\u064a \u0627\u0644\u0628\u062d\u062b...', 'search.joining': '\u062c\u0627\u0631\u064a \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645...',
      'results.ai.eyebrow': '\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a', 'results.ai.title': '\u0628\u062f\u0627\u0626\u0644\u0643 \u062c\u0627\u0647\u0632\u0629', 'results.demo.eyebrow': '\u0646\u062a\u0627\u0626\u062c \u062a\u062c\u0631\u064a\u0628\u064a\u0629', 'results.demo.hint': '\u0623\u0636\u0641 \u0645\u0641\u062a\u0627\u062d API \u0641\u064a \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0644\u0646\u062a\u0627\u0626\u062c \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064a \u062d\u0642\u064a\u0642\u064a\u0629',
      'results.loading.title': '\u0630\u0643\u0627\u0624\u0646\u0627 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u064a\u062d\u0644\u0644 \u0642\u0637\u0639\u062a\u0643\u2026', 'results.loading.sub': '\u0627\u0644\u0628\u062d\u062b \u0639\u0646 \u0623\u0641\u0636\u0644 \u0627\u0644\u0628\u062f\u0627\u0626\u0644 \u0641\u064a 6 \u0645\u062a\u0627\u062c\u0631',
      'share.whatsapp': 'WhatsApp', 'share.copy': '\u0646\u0633\u062e \u0627\u0644\u0631\u0627\u0628\u0637', 'share.copied': '\u062a\u0645 \u0627\u0644\u0646\u0633\u062e!',
      'share.text': '\u0634\u0627\u0647\u062f \u0647\u0630\u0627 \u0627\u0644\u0628\u062f\u064a\u0644: {name} \u0645\u0646 {store} \u0628\u0633\u0639\u0631 {price} \u0641\u0642\u0637 \u2014 \u0639\u0628\u0631 ALTERE',
      'share.results': '\u0645\u0634\u0627\u0631\u0643\u0629 \u0627\u0644\u0646\u062a\u0627\u0626\u062c', 'share.story': '\u062a\u062d\u0645\u064a\u0644 \u0644\u0644\u0633\u062a\u0648\u0631\u064a\u0632', 'share.story.footer': '\u0648\u064f\u062c\u062f \u0639\u0628\u0631 ALTERE', 'share.story.downloaded': '\u062a\u0645 \u062a\u062d\u0645\u064a\u0644 \u0635\u0648\u0631\u0629 \u0627\u0644\u0633\u062a\u0648\u0631\u064a',
      'invite.eyebrow': '\u0627\u0646\u0634\u0631 \u0627\u0644\u0643\u0644\u0645\u0629', 'invite.title': '\u0634\u0627\u0631\u0643 ALTERE \u0645\u0639 \u0623\u0635\u062f\u0642\u0627\u0626\u0643', 'invite.sub': '\u062a\u0639\u0631\u0641 \u0634\u062e\u0635\u064b\u0627 \u064a\u062d\u0628 \u0627\u0644\u0645\u0648\u0636\u0629 \u0644\u0643\u0646 \u064a\u0643\u0631\u0647 \u0627\u0644\u062f\u0641\u0639 \u0627\u0644\u0632\u0627\u0626\u062f\u061f \u0623\u0631\u0633\u0644\u0647 \u0625\u0644\u064a\u0646\u0627.', 'invite.copyLink': '\u0646\u0633\u062e \u0627\u0644\u0631\u0627\u0628\u0637',
      'invite.message': '\u0627\u0643\u062a\u0634\u0641 ALTERE \u2014 \u0628\u0627\u062d\u062b \u0628\u062f\u0627\u0626\u0644 \u0627\u0644\u0645\u0648\u0636\u0629 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u064a\u062c\u062f \u0628\u062f\u0627\u0626\u0644 \u0641\u0627\u062e\u0631\u0629 \u0628\u0623\u0633\u0639\u0627\u0631 \u0645\u0639\u0642\u0648\u0644\u0629!'
    },
    zh: {
      'nav.discover': '\u53d1\u73b0', 'nav.brands': '\u54c1\u724c', 'nav.saved': '\u6536\u85cf', 'nav.signin': '\u767b\u5f55',
      'hero.eyebrow': 'AI\u65f6\u5c1a\u53d1\u73b0',
      'hero.headline': '\u770b\u5230\u559c\u6b22\u7684\u3002<br>\u6211\u4eec\u5e2e\u4f60\u627e\u3002',
      'hero.sub': '\u63cf\u8ff0\u4efb\u4f55\u5feb\u65f6\u5c1a\u5355\u54c1\uff0c\u6211\u4eec\u7684AI\u4f1a\u8bc6\u522b\u5b83\u7684\u5962\u4f88\u54c1\u539f\u578b \u2014 \u8fd8\u6709\u66f4\u591a\u5e73\u4ef7\u66ff\u4ee3\u3002',
      'search.tab.link': '\u7c98\u8d34\u94fe\u63a5', 'search.tab.upload': '\u4e0a\u4f20\u7167\u7247', 'search.tab.text': 'Spot & Source', 'search.tab.camera': '\u62cd\u7167',
      'search.tab.reverse': '\u627e\u539f\u578b', 'search.btnReverse': '\u627e\u539f\u578b', 'search.placeholder.reverse': '\u63cf\u8ff0\u4f60\u7684\u5355\u54c1\uff0c\u4f8b\u5982\u201cZara\u7ed7\u7f1d\u94fe\u6761\u5305\u201d...',
      'search.placeholder.link': '\u7c98\u8d34\u4efb\u4f55\u65f6\u5c1a\u7f51\u7ad9\u7684\u4ea7\u54c1\u94fe\u63a5...',
      'search.placeholder.text': '\u63cf\u8ff0\u5355\u54c1\uff0c\u4f8b\u5982\u201c\u5976\u6cb9\u8272\u7f0e\u9762\u4e2d\u88d9\u201d...',
      'search.btn': 'Spot Alternatives',
      'search.upload.hint': '\u62d6\u653e\u6216<strong>\u6d4f\u89c8</strong>',
      'search.upload.formats': 'JPG\u3001PNG\u6216WEBP\uff0c\u6700\u592710MB',
      'search.upload.ready': '\u51c6\u5907\u641c\u7d22',
      'search.status': 'AI\u6b63\u5728\u5bfb\u627e\u66ff\u4ee3\u54c1',
      'search.tab.camera': '\u62cd\u7167', 'camera.start': '\u70b9\u51fb\u6253\u5f00\u76f8\u673a', 'camera.hint': '\u5bf9\u51c6\u4efb\u4f55\u65f6\u5c1a\u5355\u54c1', 'camera.retake': '\u91cd\u62cd', 'camera.use': 'Spot Alternatives', 'camera.error': '\u65e0\u6cd5\u8bbf\u95ee\u76f8\u673a\uff0c\u8bf7\u68c0\u67e5\u6743\u9650\u3002',
      'recent.label': '\u6700\u8fd1', 'recent.clear': '\u6e05\u9664',
      'trending.label': '\u70ed\u95e8\u641c\u7d22',
      'hero.searching': '\u641c\u7d22\u8303\u56f4', 'hero.scroll': '\u5411\u4e0b\u6ed1\u52a8\u63a2\u7d22',
      'proof.dupes': '\u4eca\u65e5\u627e\u5230\u7684\u66ff\u4ee3\u54c1', 'proof.shoppers': '\u6ee1\u610f\u7684\u8d2d\u7269\u8005', 'proof.saved': '\u672c\u5468\u8282\u7701', 'press.label': '\u5a92\u4f53\u62a5\u9053',
      'celeb.eyebrow': '\u98ce\u683c\u7075\u611f', 'celeb.title': '\u660e\u661f\u540c\u6b3e', 'celeb.sub': '\u63a2\u7d22\u6700\u70ed\u95e8\u7684\u7f8e\u5b66\u98ce\u683c\uff0c\u7acb\u5373\u627e\u5230\u66ff\u4ee3\u54c1\u3002', 'celeb.btn': 'Spot Alternatives',
      'celeb.c1.name': '\u9759\u5962', 'celeb.c1.desc': '\u4f4e\u8c03\u7684\u4f18\u96c5\u3002\u4e2d\u6027\u8272\u8c03\u3001\u7f8a\u7ed2\u886b\u548c\u5229\u843d\u7684\u5267\u5f71\uff0c\u7075\u611f\u6765\u81ea\u8001\u94b1\u7b80\u7ea6\u4e3b\u4e49\u3002',
      'celeb.c2.name': '\u8857\u5934\u65f6\u5c1a', 'celeb.c2.desc': '\u5927\u80c6\u3001\u81ea\u4fe1\u3001\u6f47\u6d12\u3002\u5bbd\u677e\u897f\u88c5\u3001\u76ae\u88e4\u548c\u6f6e\u978b\uff0c\u76f4\u63a5\u6765\u81ea\u65f6\u88c5\u5468\u3002',
      'celeb.c3.name': '\u8001\u94b1\u98ce', 'celeb.c3.desc': '\u7ecf\u5178\u4f18\u96c5\u3002\u5b9a\u5236\u5927\u8863\u3001\u73cd\u73e0\u70b9\u7f00\u3001\u4e50\u798f\u978b\u548c\u7ed3\u6784\u5316\u624b\u888b\u3002',
      'celeb.c4.name': '\u6cd5\u5f0f\u5973\u5b69', 'celeb.c4.desc': '\u6bc5\u4e0d\u8d39\u529b\u7684\u65f6\u5c1a\u3002\u6d77\u9b42\u886b\u3001\u4e2d\u88d9\u3001\u82ad\u857e\u821e\u978b\u548c\u5b8c\u7f8e\u7684\u5df4\u9ece\u98ce\u60c5\u3002',
      'dotd.eyebrow': 'Daily Source', 'dotd.original': '\u539f\u578b', 'dotd.dupe': '\u6700\u4f73\u66ff\u4ee3', 'dotd.vs': 'VS', 'dotd.btn': '\u627e\u66f4\u591a\u66ff\u4ee3',
      'calc.eyebrow': '\u8282\u7701\u8ba1\u7b97\u5668', 'calc.title': '\u4f60\u80fd\u8282\u7701\u591a\u5c11\uff1f', 'calc.sub': '\u770b\u770b\u7528\u667a\u80fd\u66ff\u4ee3\u54c1\u4ee3\u66ff\u5962\u4f88\u54c1\u4f1a\u600e\u6837\u3002', 'calc.budget': '\u6bcf\u6708\u65f6\u5c1a\u9884\u7b97', 'calc.perMonth': '\u6bcf\u6708', 'calc.perYear': '\u6bcf\u5e74', 'calc.fiveYears': '5\u5e74\u5185', 'calc.note': '\u57fa\u4e8e\u8d2d\u4e70\u66ff\u4ee3\u54c1\u5e73\u574768%\u7684\u8282\u7701\u3002',
      'filter.category': '\u5206\u7c7b', 'filter.bags': '\u5305\u888b', 'filter.shoes': '\u978b\u5b50', 'filter.clothing': '\u670d\u88c5', 'filter.jewellery': '\u73e0\u5b9d', 'filter.accessories': '\u914d\u9970',
      'filter.material': '\u6750\u8d28', 'filter.natural': '\u5929\u7136\u7ea4\u7ef4', 'filter.nopolyester': '\u65e0\u805a\u916f', 'filter.vegan': '\u7d20\u98df',
      'filter.price': '\u4ef7\u683c', 'filter.all': '\u5168\u90e8', 'filter.store': '\u5e97\u94fa', 'filter.allStores': '\u6240\u6709\u5e97\u94fa', 'filter.sortBy': '\u6392\u5e8f',
      'sort.match': '\u6700\u4f73\u5339\u914d', 'sort.priceAsc': '\u4ef7\u683c\uff1a\u4ece\u4f4e\u5230\u9ad8', 'sort.priceDesc': '\u4ef7\u683c\uff1a\u4ece\u9ad8\u5230\u4f4e', 'sort.saving': '\u6700\u5927\u8282\u7701',
      'results.eyebrow': '\u70ed\u95e8\u66ff\u4ee3\u54c1', 'results.title': '\u5962\u534e\u5916\u89c2\uff0c\u4eb2\u6c11\u4ef7\u683c', 'results.subtitle': '\u6211\u4eec\u7684AI\u6bcf\u5929\u626b\u63cf\u6570\u5343\u4ea7\u54c1\uff0c\u627e\u5230\u6700\u4f73\u66ff\u4ee3\u3002',
      'results.ai.eyebrow': 'AI\u7ed3\u679c', 'results.ai.title': '\u66ff\u4ee3\u54c1\u5df2\u5c31\u7eea', 'results.demo.eyebrow': '\u6f14\u793a\u7ed3\u679c', 'results.demo.hint': '\u5728\u8bbe\u7f6e\u4e2d\u6dfb\u52a0API\u5bc6\u94a5\u4ee5\u83b7\u53d6\u771f\u5b9eAI\u7ed3\u679c', 'results.bestDupe': '\u6700\u4f73\u66ff\u4ee3', 'results.moreAlts': 'Spotted Alternatives',
      'results.loading.title': 'AI\u6b63\u5728\u5206\u6790\u60a8\u7684\u5355\u54c1\u2026', 'results.loading.sub': '\u5728\u516d\u5bb6\u5e97\u94fa\u4e2d\u5bfb\u627e\u6700\u4f73\u66ff\u4ee3',
      'reverse.loading': '\u6b63\u5728\u8bc6\u522b\u5962\u4f88\u54c1\u539f\u578b\u2026', 'reverse.loadingSub': '\u5c06\u60a8\u7684\u5355\u54c1\u4e0e\u8bbe\u8ba1\u5e08\u7cfb\u5217\u5339\u914d', 'reverse.eyebrow': 'Sourced Original', 'reverse.title': '\u627e\u5230\u539f\u578b\u4e86', 'reverse.for': '\u5df2\u8bc6\u522b\u539f\u578b', 'reverse.originalLabel': '\u539f\u578b', 'reverse.identifiedAs': '\u8bc6\u522b\u4e3a', 'reverse.dupeBelow': 'Spotted Alternatives',
      'how.eyebrow': '\u5982\u4f55\u8fd0\u4f5c', 'how.title': '\u4e09\u6b65\u627e\u5230\u5b8c\u7f8e\u66ff\u4ee3',
      'how.step1.title': '\u4e0a\u4f20\u6216\u7c98\u8d34', 'how.step1.desc': '\u5206\u4eab\u4f60\u559c\u6b22\u7684\u5962\u4f88\u54c1\u7684\u7167\u7247\u3001\u94fe\u63a5\u6216\u63cf\u8ff0\u3002',
      'how.step2.title': 'AI\u5206\u6790', 'how.step2.desc': '\u6211\u4eec\u7684\u6a21\u578b\u5728\u51e0\u79d2\u5185\u5206\u6790\u9762\u6599\u3001\u526a\u88c1\u3001\u989c\u8272\u548c\u5251\u5f71\u3002',
      'how.step3.title': '\u8d2d\u4e70\u66ff\u4ee3\u54c1', 'how.step3.desc': '\u6d4f\u89c8\u5e26\u6709\u5339\u914d\u5ea6\u3001\u4ef7\u683c\u548c\u76f4\u63a5\u94fe\u63a5\u7684\u6392\u540d\u66ff\u4ee3\u54c1\u3002',
      'faq.eyebrow': '\u5e2e\u52a9', 'faq.title': '\u5e38\u89c1\u95ee\u9898',
      'faq.q1': 'AI\u5982\u4f55\u627e\u5230\u66ff\u4ee3\u54c1\uff1f', 'faq.a1': '\u6211\u4eec\u7684AI\u89c6\u89c9\u6a21\u578b\u5206\u6790\u4efb\u4f55\u65f6\u5c1a\u5355\u54c1\uff0c\u5e76\u5b9e\u65f6\u8bc4\u4f30\u6570\u5343\u4ea7\u54c1\u3002',
      'faq.q2': '\u94fe\u63a5\u662f\u8054\u76df\u94fe\u63a5\u5417\uff1f', 'faq.a2': '\u90e8\u5206\u94fe\u63a5\u53ef\u80fd\u662f\u8054\u76df\u94fe\u63a5\uff0c\u4f46\u4e0d\u4f1a\u5f71\u54cd\u7ed3\u679c\u6392\u5e8f\u3002',
      'faq.q3': 'ALTERE\u514d\u8d39\u5417\uff1f', 'faq.a3': '\u662f\u7684\uff0cALTERE\u5b8c\u5168\u514d\u8d39\u3002',
      'faq.q4': '\u5339\u914d\u767e\u5206\u6bd4\u51c6\u786e\u5417\uff1f', 'faq.a4': '\u5339\u914d\u767e\u5206\u6bd4\u53cd\u6620\u4e8640\u591a\u4e2a\u98ce\u683c\u7ef4\u5ea6\u7684\u76f8\u4f3c\u5ea6\u300290%\u4ee5\u4e0a\u8868\u793a\u975e\u5e38\u76f8\u4f3c\u3002',
      'faq.q5': '\u53ef\u4ee5\u5efa\u8bae\u6dfb\u52a0\u5e97\u94fa\u5417\uff1f', 'faq.a5': '\u5f53\u7136\uff01\u8bf7\u53d1\u9001\u5e97\u94fa\u540d\u79f0\u7ed9\u6211\u4eec\u3002',
      'reviews.eyebrow': '\u8bc4\u4ef7', 'reviews.title': '\u65f6\u5c1a\u7231\u597d\u8005\u7684\u6700\u7231',
      'reviews.r1.quote': '\u201c\u627e\u5230\u4e86\u5b8c\u7f8e\u7684Bottega\u66ff\u4ee3\u54c1\uff0c\u6ca1\u4eba\u80fd\u770b\u51fa\u533a\u522b\uff01\u201d', 'reviews.r1.name': 'Sophie M.', 'reviews.r1.location': '\u963f\u59c6\u65af\u7279\u4e39',
      'reviews.r2.quote': '\u201c\u6bcf\u6b21\u5728Instagram\u4e0a\u770b\u5230\u559c\u6b22\u7684\u90fd\u7528ALTERE\u3002AI\u5339\u914d\u592a\u51c6\u4e86\u3002\u201d', 'reviews.r2.name': 'James T.', 'reviews.r2.location': '\u4f26\u6566',
      'reviews.r3.quote': '\u201c\u4f5c\u4e3a\u9020\u578b\u5e08\uff0c\u8fd9\u662f\u6211\u7684\u79d8\u5bc6\u6b66\u5668\u3002\u201d', 'reviews.r3.name': 'Amara K.', 'reviews.r3.location': '\u5df4\u9ece',
      'reviews.r4.quote': '\u201c\u4e0a\u4f20\u4e86\u4e00\u5f20900\u20acMax Mara\u5927\u8863\u7684\u7167\u7247\uff0c\u5728H&M\u627e\u5230\u4e8689\u20ac\u7684\u540c\u6b3e\uff01\u201d', 'reviews.r4.name': 'Luca R.', 'reviews.r4.location': '\u7c73\u5170',
      'reviews.r5.quote': '\u201c\u7ec8\u4e8e\u6709\u4e86\u4e00\u4e2a\u771f\u6b63\u6709\u7528\u7684\u66ff\u4ee3\u54c1\u67e5\u627e\u5668\u3002\u201d', 'reviews.r5.name': 'Elena V.', 'reviews.r5.location': '\u5df4\u585e\u7f57\u90a3',
      'reviews.r6.quote': '\u201c\u7ed9\u670b\u53cb\u4eec\u770b\u4e86\uff0c\u73b0\u5728\u6574\u4e2a\u7fa4\u90fd\u7740\u8ff7\u4e86\u3002\u201d', 'reviews.r6.name': 'Noah B.', 'reviews.r6.location': '\u67cf\u6797',
      'cookie.text': '\u6211\u4eec\u4f7f\u7528Cookie\u6765\u63d0\u5347\u60a8\u7684\u4f53\u9a8c\u3002', 'cookie.accept': '\u5168\u90e8\u63a5\u53d7', 'cookie.manage': '\u7ba1\u7406\u504f\u597d',
      'about.mission': '\u5962\u534e\u7f8e\u5b66\uff0c\u4eb2\u6c11\u4ef7\u683c\u3002', 'about.storyEyebrow': '\u6211\u4eec\u7684\u6545\u4e8b', 'about.storyTitle': '\u65f6\u5c1a\u5e94\u8be5\u5c5e\u4e8e\u6bcf\u4e2a\u4eba',
      'about.storyP1': 'ALTERE\u8bde\u751f\u4e8e\u4e00\u4e2a\u7b80\u5355\u7684\u6cae\u4e27\uff1a\u7231\u4e0a\u4e00\u4ef6T\u53f0\u5355\u54c1\uff0c\u7136\u540e\u770b\u5230\u4ef7\u683c\u3002',
      'about.storyP2': '\u6240\u4ee5\u6211\u4eec\u6784\u5efa\u4e86\u4e00\u4e2aAI\uff0c\u50cf\u9020\u578b\u5e08\u4e00\u6837\u770b\u65f6\u5c1a \u2014 \u7136\u540e\u641c\u7d22\u6570\u5343\u4ea7\u54c1\u627e\u5230\u6700\u4f73\u5339\u914d\u3002',
      'about.howEyebrow': '\u6280\u672f', 'about.howTitle': '\u6211\u4eec\u7684AI\u5982\u4f55\u5de5\u4f5c',
      'about.step1Title': '\u89c6\u89c9\u89e3\u6784', 'about.step1Desc': '\u6211\u4eec\u7684\u6a21\u578b\u5c06\u6bcf\u4ef6\u5355\u54c1\u5206\u89e3\u4e3a\u6838\u5fc3\u5c5e\u6027\u3002',
      'about.step2Title': '\u8de8\u5e97\u5339\u914d', 'about.step2Desc': '\u5b9e\u65f6\u626b\u63cfZara\u3001H&M\u3001Mango\u3001ASOS\u3001COS\u548c& Other Stories\u7684\u5e93\u5b58\u3002',
      'about.step3Title': '\u667a\u80fd\u6392\u540d', 'about.step3Desc': '\u7ed3\u679c\u6309\u51c6\u786e\u5ea6\u3001\u8282\u7701\u548c\u53ef\u7528\u6027\u6392\u5e8f\u3002',
      'about.teamEyebrow': '\u6211\u4eec\u662f\u8c01', 'about.teamTitle': '\u65f6\u5c1a\u7231\u597d\u8005\u521b\u7acb\uff0c<br>AI\u9a71\u52a8',
      'about.teamDesc': '\u6211\u4eec\u662f\u4e00\u4e2a\u5c0f\u56e2\u961f\uff0c\u7531\u8bbe\u8ba1\u5e08\u3001\u5de5\u7a0b\u5e08\u548c\u65f6\u5c1a\u8fbe\u4eba\u7ec4\u6210\uff0c\u4f7f\u547d\u662f\u8ba9\u65f6\u5c1a\u6c11\u4e3b\u5316\u3002',
      'about.cta': '\u5f00\u59cb\u53d1\u73b0\u66ff\u4ee3\u54c1',
      'waitlist.eyebrow': '\u65e9\u671f\u8bbf\u95ee', 'waitlist.title': '\u6210\u4e3a\u7b2c\u4e00\u4e2a\u77e5\u9053\u7684\u4eba<br>\u5f53\u6211\u4eec\u4e0a\u7ebf\u65f6',
      'waitlist.sub': '\u52a0\u5165\u6570\u5343\u540d\u5df2\u5728\u5217\u8868\u4e2d\u7684\u65f6\u5c1a\u7231\u597d\u8005\u3002',
      'waitlist.placeholder': '\u8f93\u5165\u60a8\u7684\u7535\u5b50\u90ae\u4ef6', 'waitlist.btn': '\u52a0\u5165\u7b49\u5f85\u540d\u5355',
      'waitlist.hint': '\u6c38\u8fdc\u4e0d\u4f1a\u53d1\u9001\u5783\u573e\u90ae\u4ef6\u3002\u968f\u65f6\u53ef\u4ee5\u9000\u8ba2\u3002',
      'waitlist.success.title': '\u60a8\u5df2\u52a0\u5165\u540d\u5355', 'waitlist.success.desc': 'ALTERE\u4e0a\u7ebf\u65f6\u6211\u4eec\u4f1a\u901a\u77e5\u60a8\u3002',
      'saved.back': '\u8fd4\u56de', 'saved.eyebrow': '\u60a8\u7684\u6536\u85cf', 'saved.title': '\u5df2\u4fdd\u5b58\u5355\u54c1', 'saved.clearAll': '\u6e05\u9664\u5168\u90e8',
      'saved.empty': '\u8fd8\u6ca1\u6709\u4fdd\u5b58\u7684\u5355\u54c1', 'saved.emptyHint': '\u70b9\u51fb\u5fc3\u5f62\u4fdd\u5b58\u4efb\u4f55\u66ff\u4ee3\u54c1',
      'footer.tagline': 'AI\u65f6\u5c1a\u66ff\u4ee3\u54c1\u67e5\u627e\u5668\u3002\u5962\u534e\u7f8e\u5b66\uff0c\u4eb2\u6c11\u4ef7\u683c\u3002',
      'footer.explore': '\u63a2\u7d22', 'footer.trending': '\u70ed\u95e8', 'footer.newArrivals': '\u65b0\u54c1', 'footer.collections': '\u7cfb\u5217',
      'footer.company': '\u516c\u53f8', 'footer.about': '\u5173\u4e8e', 'footer.careers': '\u62db\u8058', 'footer.privacy': '\u9690\u79c1', 'footer.terms': '\u6761\u6b3e',
      'toast.saved': '\u5df2\u4fdd\u5b58\u5230\u6536\u85cf', 'toast.removed': '\u5df2\u4ece\u6536\u85cf\u4e2d\u79fb\u9664', 'toast.cleared': '\u5df2\u6e05\u9664\u6240\u6709\u4fdd\u5b58\u7684\u5355\u54c1',
      'search.searching': '\u641c\u7d22\u4e2d...', 'search.joining': '\u52a0\u5165\u4e2d...',
      'share.whatsapp': 'WhatsApp', 'share.copy': '\u590d\u5236\u94fe\u63a5', 'share.copied': '\u5df2\u590d\u5236\uff01',
      'share.text': '\u770b\u770b\u8fd9\u4e2a\u66ff\u4ee3\u54c1\uff1a{name}\u6765\u81ea{store}\uff0c\u4ec5{price} \u2014 \u901a\u8fc7ALTERE\u627e\u5230',
      'share.results': '\u5206\u4eab\u7ed3\u679c', 'share.story': '\u4e0b\u8f7d\u7528\u4e8e\u6545\u4e8b', 'share.story.footer': '\u901a\u8fc7ALTERE\u627e\u5230', 'share.story.downloaded': '\u6545\u4e8b\u56fe\u7247\u5df2\u4e0b\u8f7d',
      'invite.eyebrow': '\u5206\u4eab\u7ed9\u670b\u53cb', 'invite.title': '\u4e0e\u670b\u53cb\u5206\u4eabALTERE', 'invite.sub': '\u8ba4\u8bc6\u559c\u6b22\u65f6\u5c1a\u4f46\u4e0d\u60f3\u591a\u82b1\u94b1\u7684\u4eba\uff1f\u628a\u4ed6\u4eec\u5e26\u6765\u3002', 'invite.copyLink': '\u590d\u5236\u94fe\u63a5',
      'invite.message': '\u770b\u770bALTERE \u2014 AI\u65f6\u5c1a\u66ff\u4ee3\u54c1\u67e5\u627e\u5668\uff0c\u627e\u5230\u5962\u4f88\u54c1\u7684\u5e73\u4ef7\u66ff\u4ee3\uff01'
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
     Search box tabs
     ============================================================ */

  const tabs   = document.querySelectorAll('.search-box__tab');
  const panels = document.querySelectorAll('.search-box__panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.querySelector(`.search-box__panel[data-panel="${target}"]`).classList.add('active');
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

  const linkInput        = document.getElementById('linkInput');
  const linkPreview      = document.getElementById('linkPreview');
  const linkPreviewCard  = document.getElementById('linkPreviewCard');
  const linkPreviewImg   = document.getElementById('linkPreviewImg');
  const linkPreviewDomain = document.getElementById('linkPreviewDomain');
  const linkPreviewTitle = document.getElementById('linkPreviewTitle');
  const linkPreviewDesc  = document.getElementById('linkPreviewDesc');
  const linkPreviewClear = document.getElementById('linkPreviewClear');
  let linkPreviewTimeout = null;
  let currentPreviewUrl  = '';

  function isValidUrl(str) {
    try { const u = new URL(str); return u.protocol === 'http:' || u.protocol === 'https:'; }
    catch { return false; }
  }

  async function fetchLinkPreview(url) {
    if (url === currentPreviewUrl) return;
    currentPreviewUrl = url;

    linkPreview.className = 'link-preview loading';

    try {
      const res = await fetch(`/api/preview?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();

      // Only show if this is still the current URL
      if (url !== currentPreviewUrl) return;

      linkPreviewDomain.textContent = data.domain || '';
      linkPreviewTitle.textContent  = data.title || url;
      linkPreviewDesc.textContent   = data.description || '';

      if (data.image) {
        linkPreviewImg.src = data.image;
        linkPreviewImg.style.display = '';
      } else {
        linkPreviewImg.style.display = 'none';
      }

      linkPreview.className = 'link-preview loaded';
    } catch {
      // Show minimal preview with just domain
      if (url !== currentPreviewUrl) return;
      try {
        const domain = new URL(url).hostname.replace('www.', '');
        linkPreviewDomain.textContent = domain;
        linkPreviewTitle.textContent  = url;
        linkPreviewDesc.textContent   = '';
        linkPreviewImg.style.display  = 'none';
        linkPreview.className = 'link-preview loaded';
      } catch {
        clearLinkPreview();
      }
    }
  }

  function clearLinkPreview() {
    currentPreviewUrl = '';
    linkPreview.className = 'link-preview';
    linkPreviewImg.src = '';
    linkPreviewDomain.textContent = '';
    linkPreviewTitle.textContent = '';
    linkPreviewDesc.textContent = '';
  }

  // Detect paste or typing of a URL
  linkInput.addEventListener('input', () => {
    clearTimeout(linkPreviewTimeout);
    const val = linkInput.value.trim();
    if (isValidUrl(val)) {
      linkPreviewTimeout = setTimeout(() => fetchLinkPreview(val), 400);
    } else {
      clearLinkPreview();
    }
  });

  // Also detect paste event for instant response
  linkInput.addEventListener('paste', () => {
    clearTimeout(linkPreviewTimeout);
    setTimeout(() => {
      const val = linkInput.value.trim();
      if (isValidUrl(val)) fetchLinkPreview(val);
    }, 50);
  });

  // Clear button
  linkPreviewClear.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    linkInput.value = '';
    clearLinkPreview();
  });

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
      cameraUse.textContent = t('camera.use') || 'Spot Alternatives';
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
        empty.innerHTML = '<p>No dupes match those filters</p><small>Try adjusting your price or store selection</small>';
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
        imageContent = `<div class="dupe-card__color-placeholder" style="background:${CARD_COLORS[i % CARD_COLORS.length]}">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </div>`;
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
     API key management
     ============================================================ */

  function getApiKey()      { return localStorage.getItem(LS_KEY) || ''; }
  function getUnsplashKey() { return localStorage.getItem(UNSPLASH_KEY) || ''; }

  function setApiKey(key) {
    key ? localStorage.setItem(LS_KEY, key) : localStorage.removeItem(LS_KEY);
    updateSettingsIndicator();
  }

  function setUnsplashKey(key) {
    key ? localStorage.setItem(UNSPLASH_KEY, key) : localStorage.removeItem(UNSPLASH_KEY);
  }

  function updateSettingsIndicator() {
    settingsBtn.classList.toggle('has-key', !!getApiKey());
  }

  updateSettingsIndicator();

  // Modal open/close
  settingsBtn.addEventListener('click', () => {
    apiKeyInput.value    = getApiKey();
    unsplashInput.value  = getUnsplashKey();
    apiStatus.textContent = '';
    apiStatus.className   = 'modal__status';
    settingsModal.classList.add('open');
  });

  function closeModal() { settingsModal.classList.remove('open'); }

  modalClose.addEventListener('click', closeModal);
  settingsModal.addEventListener('click', e => {
    if (e.target === settingsModal) closeModal();
  });

  saveApiKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
      apiStatus.textContent = 'Please enter an Anthropic API key.';
      apiStatus.className = 'modal__status error';
      return;
    }
    setApiKey(key);
    setUnsplashKey(unsplashInput.value.trim());
    apiStatus.textContent = 'Settings saved.';
    apiStatus.className = 'modal__status success';
    setTimeout(closeModal, 800);
  });

  /* ============================================================
     Auth / Tier System
     ============================================================ */

  const AUTH_KEY      = 'altere_user';
  const authBtn       = document.getElementById('authBtn');
  const authModal     = document.getElementById('authModal');
  const authModalClose = document.getElementById('authModalClose');
  const authFormView  = document.getElementById('authFormView');
  const authProfileView = document.getElementById('authProfileView');
  const authEmail     = document.getElementById('authEmail');
  const authName      = document.getElementById('authName');
  const authStatus    = document.getElementById('authStatus');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authSignOut   = document.getElementById('authSignOut');

  function getUser() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY)); }
    catch { return null; }
  }

  function setUser(user) {
    if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    else localStorage.removeItem(AUTH_KEY);
    updateAuthUI();
  }

  function getUserTier() {
    if (getApiKey()) return 'pro';
    if (getUser()) return 'registered';
    return 'unregistered';
  }

  function updateAuthUI() {
    const user = getUser();
    const tier = getUserTier();

    if (user) {
      authBtn.textContent = user.name.split(' ')[0];
      authBtn.classList.add('signed-in');
      // Preserve the data-i18n so language switcher doesn't overwrite
      authBtn.removeAttribute('data-i18n');
    } else {
      authBtn.textContent = t('nav.signin');
      authBtn.setAttribute('data-i18n', 'nav.signin');
      authBtn.classList.remove('signed-in');
    }

    // Update free counter text based on tier
    const el = document.getElementById('freeCounter');
    if (el && tier === 'pro') {
      el.textContent = t('free.pro') || 'Unlimited AI searches (Pro)';
      el.style.display = '';
    }
  }

  // Open modal
  authBtn.addEventListener('click', e => {
    e.preventDefault();
    hamburger.classList.remove('active');
    navLinks.classList.remove('open');

    const user = getUser();
    if (user) {
      // Show profile view
      authFormView.style.display = 'none';
      authProfileView.style.display = '';
      document.getElementById('authAvatar').textContent = user.name.charAt(0).toUpperCase();
      document.getElementById('authProfileName').textContent = user.name;
      document.getElementById('authProfileEmail').textContent = user.email;

      const tier = getUserTier();
      const tierLabel = document.getElementById('authTierLabel');
      const tierDesc  = document.getElementById('authTierDesc');
      if (tier === 'pro') {
        tierLabel.textContent = 'Pro';
        tierDesc.textContent  = t('auth.proDesc') || 'Unlimited AI searches with your API key';
      } else {
        tierLabel.textContent = t('auth.freeTier') || 'Free';
        tierDesc.textContent  = t('auth.freeDesc') || '3 AI searches per day + unlimited demo';
      }
    } else {
      // Show sign in form
      authFormView.style.display = '';
      authProfileView.style.display = 'none';
      authStatus.textContent = '';
    }

    authModal.classList.add('open');
  });

  // Close
  authModalClose.addEventListener('click', () => authModal.classList.remove('open'));
  authModal.addEventListener('click', e => { if (e.target === authModal) authModal.classList.remove('open'); });

  // Submit
  authSubmitBtn.addEventListener('click', () => {
    const email = authEmail.value.trim();
    const name  = authName.value.trim();

    if (!email || !email.includes('@')) {
      authStatus.textContent = t('auth.invalidEmail') || 'Please enter a valid email.';
      authStatus.className = 'modal__status error';
      return;
    }
    if (!name) {
      authStatus.textContent = t('auth.invalidName') || 'Please enter your name.';
      authStatus.className = 'modal__status error';
      return;
    }

    setUser({ email, name, created: Date.now() });
    authStatus.textContent = '';
    authModal.classList.remove('open');
    showToast(t('auth.welcome') || `Welcome, ${name}!`);
  });

  // Sign out
  authSignOut.addEventListener('click', () => {
    setUser(null);
    authModal.classList.remove('open');
    showToast(t('auth.signedOut') || 'Signed out');
  });

  // Init
  updateAuthUI();

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

  /* ============================================================
     Render real result cards
     ============================================================ */

  function renderResults(dupes, query, isDemo) {
    resultsGrid.innerHTML = '';
    resetFilters();

    const bestDupeEl = document.getElementById('bestDupe');
    const moreAltsEl = document.getElementById('moreAlts');

    // Update header
    const eyebrow = resultsHeader.querySelector('.results__eyebrow');
    const title   = resultsHeader.querySelector('.results__title');
    const sub     = resultsHeader.querySelector('.results__subtitle');
    eyebrow.textContent = isDemo ? (t('results.demo.eyebrow') || 'Demo Results') : t('results.ai.eyebrow');
    title.textContent   = t('results.ai.title');
    const demoHint = isDemo ? (' \u2014 ' + (t('results.demo.hint') || 'Add your API key in settings for real AI results')) : '';
    sub.textContent     = `${dupes.length} alternatives for \u201c${query}\u201d${demoHint}`;

    const hasUnsplash = !!getUnsplashKey();

    // --- Best Dupe hero card (first result) ---
    if (dupes.length > 0) {
      const best = dupes[0];
      const bestSavings = Math.round(((best.original_price - best.dupe_price) / best.original_price) * 100);
      const bestHasImg = best.image_url;
      let bestImgHTML;
      if (bestHasImg) {
        bestImgHTML = `<img src="${escapeAttr(best.image_url)}" alt="${escapeAttr(best.product_name)}" loading="lazy">`;
      } else {
        bestImgHTML = `<div class="dupe-card__color-placeholder" style="background:${CARD_COLORS[0]}"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;
      }

      bestDupeEl.innerHTML = `
        <article class="best-dupe__card" data-price="${best.dupe_price.toFixed(2)}" data-store="${escapeAttr(best.store)}" data-category="${best.category || 'clothing'}">
          <div class="best-dupe__image">
            ${bestImgHTML}
            <span class="best-dupe__ribbon" data-i18n="results.bestDupe">${t('results.bestDupe') || 'Best Dupe'}</span>
            <div class="best-dupe__actions">
              <span class="dupe-card__save" aria-label="Save">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </span>
              <span class="dupe-card__share" aria-label="Share">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                <div class="share-dropdown">
                  <button class="share-dropdown__item share-dropdown__whatsapp" type="button"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>WhatsApp</button>
                  <button class="share-dropdown__item share-dropdown__copy" type="button"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Copy link</button>
                </div>
              </span>
            </div>
          </div>
          <div class="best-dupe__body">
            <span class="best-dupe__store">${escapeHtml(best.store)}</span>
            <h3 class="best-dupe__name">${escapeHtml(best.product_name)}</h3>
            <div class="best-dupe__prices">
              <span class="best-dupe__price">$${best.dupe_price.toFixed(2)}</span>
              <span class="best-dupe__original">$${best.original_price.toFixed(2)}</span>
              <span class="best-dupe__savings">&minus;${bestSavings}%</span>
            </div>
            <div class="best-dupe__match">
              <div class="best-dupe__match-bar"><div class="best-dupe__match-fill" style="width:0%"></div></div>
              <span>${best.match_percentage}% match</span>
            </div>
            <span class="best-dupe__category">${escapeHtml(best.category || 'clothing')}</span>
          </div>
        </article>`;

      bestDupeEl.classList.add('visible');

      // Animate match bar
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const fill = bestDupeEl.querySelector('.best-dupe__match-fill');
        if (fill) fill.style.width = `${best.match_percentage}%`;
      }));

      // Unsplash for best dupe if needed
      if (!bestHasImg && hasUnsplash) {
        loadCardImage(bestDupeEl.querySelector('.best-dupe__card'), best, 0);
      }

      // Bind save/share on best dupe
      bindSaveButtons(bestDupeEl);
      bindShareButtons(bestDupeEl);
      syncSaveStates(bestDupeEl);

      // Show "More alternatives" label
      if (dupes.length > 1) {
        moreAltsEl.classList.add('visible');
      }
    } else {
      bestDupeEl.innerHTML = '';
      bestDupeEl.classList.remove('visible');
      moreAltsEl.classList.remove('visible');
    }

    // --- Remaining dupes in the grid (skip first) ---
    const remainingDupes = dupes.slice(1);

    remainingDupes.forEach((dupe, i) => {
      const savings = Math.round(((dupe.original_price - dupe.dupe_price) / dupe.original_price) * 100);
      const card = document.createElement('article');
      card.className = 'dupe-card reveal';
      card.dataset.price = dupe.dupe_price.toFixed(2);
      card.dataset.store = dupe.store;
      card.dataset.category = dupe.category || 'clothing';
      card.dataset.material = dupe.material || 'natural';
      card.style.transitionDelay = `${i * 0.08}s`;

      // Image area: use embedded URL if available, else Unsplash API, else colour placeholder
      let imageInner;
      const hasDirectImage = dupe.image_url;
      if (hasDirectImage) {
        imageInner = `<img src="${escapeAttr(dupe.image_url)}" alt="${escapeAttr(dupe.product_name)}" loading="lazy">`;
      } else if (hasUnsplash) {
        imageInner = `
          <div class="dupe-card__img-shimmer"></div>
          <img class="loading" src="" alt="${escapeAttr(dupe.product_name)}" loading="lazy">`;
      } else {
        imageInner = `
          <div class="dupe-card__color-placeholder" style="background:${CARD_COLORS[i % CARD_COLORS.length]}">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>`;
      }

      card.innerHTML = `
        <div class="dupe-card__image">
          ${imageInner}
          <span class="dupe-card__save" aria-label="Save">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </span>
          <span class="dupe-card__share" aria-label="Share">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            <div class="share-dropdown">
              <button class="share-dropdown__item share-dropdown__whatsapp" type="button"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>WhatsApp</button>
              <button class="share-dropdown__item share-dropdown__copy" type="button"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Copy link</button>
            </div>
          </span>
          <span class="dupe-card__badge">&minus;${savings}%</span>
        </div>
        <div class="dupe-card__info">
          <span class="dupe-card__store">${escapeHtml(dupe.store)}</span>
          <h3 class="dupe-card__name">${escapeHtml(dupe.product_name)}</h3>
          <div class="dupe-card__price-row">
            <span class="dupe-card__price">$${dupe.dupe_price.toFixed(2)}</span>
            <span class="dupe-card__original">$${dupe.original_price.toFixed(2)}</span>
          </div>
          <div class="dupe-card__match">
            <div class="dupe-card__match-bar"><div class="dupe-card__match-fill" style="width:0%"></div></div>
            <span>${dupe.match_percentage}% match</span>
          </div>
        </div>`;

      resultsGrid.appendChild(card);

      // Animate reveal
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          card.classList.add('visible');
          const fill = card.querySelector('.dupe-card__match-fill');
          if (fill) fill.style.width = `${dupe.match_percentage}%`;
        });
      });

      // Fetch Unsplash image for this card (non-blocking) — skip if already has image
      if (!hasDirectImage && hasUnsplash) {
        loadCardImage(card, dupe, i);
      }
    });

    // Bind save + share buttons and sync states
    bindSaveButtons(resultsGrid);
    bindShareButtons(resultsGrid);
    syncSaveStates(resultsGrid);
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
    // Insert colour placeholder
    const placeholder = document.createElement('div');
    placeholder.className = 'dupe-card__color-placeholder';
    placeholder.style.background = CARD_COLORS[index % CARD_COLORS.length];
    placeholder.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
    imageDiv.insertBefore(placeholder, imageDiv.firstChild);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ============================================================
     Claude API call
     ============================================================ */

  const SYSTEM_PROMPT = `You are ALTERE, an AI fashion dupe finder. The user will describe a fashion item, paste a product URL, or provide an image. Your job is to suggest 6 realistic cheaper alternatives ("dupes") from high-street brands.

For each dupe, respond with ONLY a JSON array of 6 objects. No markdown, no explanation, no code fences — just the raw JSON array.

Each object must have these fields:
- "store": one of "ZARA", "H&M", "MANGO", "ASOS", "COS", "& OTHER STORIES" (use each store exactly once)
- "product_name": a realistic product name that this store would actually use (max 6 words)
- "category": one of "bags", "shoes", "clothing", "jewellery", "accessories" (pick the single best fit for the item type)
- "material": one of "natural", "nopolyester", "vegan" (pick the best fit: "natural" for cotton/wool/silk/linen, "nopolyester" for items without polyester, "vegan" for no animal products)
- "original_price": the estimated original luxury item price in USD (number)
- "dupe_price": a realistic dupe price in USD for that store (number, must be lower than original_price)
- "match_percentage": how closely it matches the original, 78-96 range (integer)

Rules:
- Make product names feel authentic to each brand's naming style
- Prices should be realistic for each store's actual price range
- The first result should have the highest match percentage, descending from there
- original_price should be the same across all 6 (the price of the luxury item)
- Vary the dupe_price realistically per store`;

  const REVERSE_PROMPT = `You are ALTERE, a reverse fashion dupe finder. The user describes a high-street/affordable fashion item. Your job is to identify which luxury designer original it's a dupe of, then also suggest 5 more affordable alternatives.

Respond with ONLY a JSON object. No markdown, no explanation, no code fences — just the raw JSON object.

The object must have:
- "original": an object with fields: "brand" (luxury brand name), "product_name" (the original item name), "price" (estimated USD price, number), "description" (1-2 sentence description of the original), "category" (one of "bags", "shoes", "clothing", "jewellery", "accessories")
- "dupes": an array of 5 objects, each with: "store", "product_name", "category", "original_price" (same as original.price), "dupe_price", "match_percentage"

Rules:
- The original should be a real, recognizable luxury item that the described item is clearly inspired by
- "store" must be one of: "ZARA", "H&M", "MANGO", "ASOS", "COS" (use each once)
- Prices should be realistic
- match_percentage range: 78-96`;

  /* ---- Demo reverse results ---- */

  const DEMO_REVERSE = {
    bags: {
      original: { brand: 'BOTTEGA VENETA', product_name: 'Cassette Padded Leather Bag', price: 3200, description: 'The iconic intrecciato-woven padded cassette bag. A modern classic with oversized weaving and a chunky chain strap.', category: 'bags' },
      dupes: [
        { store: 'ZARA', product_name: 'Quilted Chain Crossbody', category: 'bags', original_price: 3200, dupe_price: 45.99, match_percentage: 94 },
        { store: 'H&M', product_name: 'Padded Shoulder Bag', category: 'bags', original_price: 3200, dupe_price: 34.99, match_percentage: 91 },
        { store: 'MANGO', product_name: 'Woven Effect Bag', category: 'bags', original_price: 3200, dupe_price: 55.99, match_percentage: 88 },
        { store: 'ASOS', product_name: 'Chunky Chain Bag', category: 'bags', original_price: 3200, dupe_price: 42.00, match_percentage: 85 },
        { store: 'COS', product_name: 'Leather Crossbody Bag', category: 'bags', original_price: 3200, dupe_price: 89.00, match_percentage: 82 }
      ]
    },
    clothing: {
      original: { brand: 'MAX MARA', product_name: 'Madame Double-Breasted Wool Coat', price: 2590, description: 'The signature camel coat. Timeless double-breasted silhouette in luxurious wool-cashmere with a belted waist.', category: 'clothing' },
      dupes: [
        { store: 'ZARA', product_name: 'Wool Blend Belted Coat', category: 'clothing', original_price: 2590, dupe_price: 89.99, match_percentage: 93 },
        { store: 'H&M', product_name: 'Double-Breasted Coat', category: 'clothing', original_price: 2590, dupe_price: 79.99, match_percentage: 90 },
        { store: 'MANGO', product_name: 'Tailored Wool Coat', category: 'clothing', original_price: 2590, dupe_price: 119.99, match_percentage: 88 },
        { store: 'ASOS', product_name: 'Oversized Camel Coat', category: 'clothing', original_price: 2590, dupe_price: 95.00, match_percentage: 85 },
        { store: 'COS', product_name: 'Belted Wool Coat', category: 'clothing', original_price: 2590, dupe_price: 135.00, match_percentage: 83 }
      ]
    },
    shoes: {
      original: { brand: 'JIMMY CHOO', product_name: 'Bing 100 Crystal Mules', price: 1195, description: 'Show-stopping crystal-embellished pointed-toe mules. The ultimate evening shoe with all-over crystal mesh.', category: 'shoes' },
      dupes: [
        { store: 'ZARA', product_name: 'Crystal Strap Heeled Mules', category: 'shoes', original_price: 1195, dupe_price: 59.90, match_percentage: 92 },
        { store: 'H&M', product_name: 'Rhinestone Mules', category: 'shoes', original_price: 1195, dupe_price: 34.99, match_percentage: 89 },
        { store: 'MANGO', product_name: 'Crystal Embellished Heels', category: 'shoes', original_price: 1195, dupe_price: 69.99, match_percentage: 86 },
        { store: 'ASOS', product_name: 'Gem Detail Pointed Mules', category: 'shoes', original_price: 1195, dupe_price: 48.00, match_percentage: 84 },
        { store: 'COS', product_name: 'Pointed Heeled Mules', category: 'shoes', original_price: 1195, dupe_price: 89.00, match_percentage: 80 }
      ]
    },
    jewellery: {
      original: { brand: 'TIFFANY & CO.', product_name: 'T Wire Bracelet in 18k Gold', price: 1350, description: 'The modern icon. Clean lines in 18k gold with the signature T motif at each end. Effortless everyday luxury.', category: 'jewellery' },
      dupes: [
        { store: 'ZARA', product_name: 'Gold Wire Cuff Bracelet', category: 'jewellery', original_price: 1350, dupe_price: 19.90, match_percentage: 93 },
        { store: 'H&M', product_name: 'Open Gold Bangle', category: 'jewellery', original_price: 1350, dupe_price: 12.99, match_percentage: 90 },
        { store: 'MANGO', product_name: 'Minimalist Cuff Bracelet', category: 'jewellery', original_price: 1350, dupe_price: 25.99, match_percentage: 87 },
        { store: 'ASOS', product_name: 'Wire T-Bar Bracelet', category: 'jewellery', original_price: 1350, dupe_price: 15.00, match_percentage: 84 },
        { store: 'COS', product_name: 'Sculptural Wire Bangle', category: 'jewellery', original_price: 1350, dupe_price: 35.00, match_percentage: 81 }
      ]
    },
    accessories: {
      original: { brand: 'HERMÈS', product_name: 'Carré 90 Silk Scarf', price: 480, description: 'The ultimate silk scarf. Hand-rolled edges, vibrant prints and the iconic 90cm square format worn a hundred ways.', category: 'accessories' },
      dupes: [
        { store: 'ZARA', product_name: 'Printed Silk Square Scarf', category: 'accessories', original_price: 480, dupe_price: 29.90, match_percentage: 91 },
        { store: 'H&M', product_name: 'Patterned Satin Scarf', category: 'accessories', original_price: 480, dupe_price: 17.99, match_percentage: 88 },
        { store: 'MANGO', product_name: 'Printed Twill Scarf', category: 'accessories', original_price: 480, dupe_price: 25.99, match_percentage: 85 },
        { store: 'ASOS', product_name: 'Square Print Scarf', category: 'accessories', original_price: 480, dupe_price: 18.00, match_percentage: 83 },
        { store: 'COS', product_name: 'Silk Blend Square Scarf', category: 'accessories', original_price: 480, dupe_price: 45.00, match_percentage: 80 }
      ]
    }
  };

  function generateDemoReverse(query) {
    const cat = detectCategory(query);
    const key = cat === 'mixed' ? 'bags' : cat;
    return JSON.parse(JSON.stringify(DEMO_REVERSE[key]));
  }

  /* ---- Demo results generator ---- */

  const U = (id) => `https://images.unsplash.com/${id}?w=600&h=800&fit=crop&crop=center&q=80`;

  const DEMO_PRODUCTS = {
    bags: [
      { store: 'ZARA', product_name: 'Quilted Chain Crossbody Bag', category: 'bags', dupe_price: 45.99, original_price: 2200, match_percentage: 94, image_url: U('photo-1584917865442-de89df76afd3') },
      { store: 'H&M', product_name: 'Padded Shoulder Bag', category: 'bags', dupe_price: 34.99, original_price: 2200, match_percentage: 91, image_url: U('photo-1566150905458-1bf1fc113f0d') },
      { store: 'MANGO', product_name: 'Leather Effect Flap Bag', category: 'bags', dupe_price: 55.99, original_price: 2200, match_percentage: 89, image_url: U('photo-1590874103328-eac38a683ce7') },
      { store: 'ASOS', product_name: 'Structured Mini Tote', category: 'bags', dupe_price: 42.00, original_price: 2200, match_percentage: 87, image_url: U('photo-1594223274512-ad4803739b7c') },
      { store: 'COS', product_name: 'Minimalist Leather Bag', category: 'bags', dupe_price: 89.00, original_price: 2200, match_percentage: 85, image_url: U('photo-1598532163257-ae3c6b2524b6') },
      { store: '& OTHER STORIES', product_name: 'Woven Chain Strap Bag', category: 'bags', dupe_price: 79.00, original_price: 2200, match_percentage: 82, image_url: U('photo-1591561954557-26941169b49e') }
    ],
    clothing: [
      { store: 'ZARA', product_name: 'Satin Midi Skirt with Slit', category: 'clothing', dupe_price: 49.90, original_price: 890, match_percentage: 95, image_url: U('photo-1682397125309-56077754235d') },
      { store: 'H&M', product_name: 'Oversized Wool-Blend Blazer', category: 'clothing', dupe_price: 79.99, original_price: 890, match_percentage: 92, image_url: U('photo-1653660666869-2345adc51155') },
      { store: 'MANGO', product_name: 'Flowing Printed Midi Dress', category: 'clothing', dupe_price: 59.99, original_price: 890, match_percentage: 90, image_url: U('photo-1618597724686-aee8bba9cf99') },
      { store: 'ASOS', product_name: 'Tailored Wide Leg Trousers', category: 'clothing', dupe_price: 65.00, original_price: 890, match_percentage: 88, image_url: U('photo-1509631179647-0177331693ae') },
      { store: 'COS', product_name: 'Draped Jersey Top', category: 'clothing', dupe_price: 45.00, original_price: 890, match_percentage: 85, image_url: U('photo-1515886657613-9f3515b0c78f') },
      { store: '& OTHER STORIES', product_name: 'Belted Wrap Coat', category: 'clothing', dupe_price: 129.00, original_price: 890, match_percentage: 83, image_url: U('photo-1606776627650-454d6d7bd7bf') }
    ],
    shoes: [
      { store: 'ZARA', product_name: 'Leather Slingback Heels', category: 'shoes', dupe_price: 59.90, original_price: 750, match_percentage: 93, image_url: U('photo-1543163521-1bf539c55dd2') },
      { store: 'H&M', product_name: 'Pointed Ballet Flats', category: 'shoes', dupe_price: 29.99, original_price: 750, match_percentage: 90, image_url: U('photo-1460353581641-37baddab0fa2') },
      { store: 'MANGO', product_name: 'Leather Ankle Boots', category: 'shoes', dupe_price: 79.99, original_price: 750, match_percentage: 88, image_url: U('photo-1603808033192-082d6919d3e1') },
      { store: 'ASOS', product_name: 'Chunky Platform Loafers', category: 'shoes', dupe_price: 55.00, original_price: 750, match_percentage: 86, image_url: U('photo-1606107557195-0e29a4b5b4aa') },
      { store: 'COS', product_name: 'Leather Mule Sandals', category: 'shoes', dupe_price: 89.00, original_price: 750, match_percentage: 84, image_url: U('photo-1611652022419-a9419f74343d') },
      { store: '& OTHER STORIES', product_name: 'Suede Knee-High Boots', category: 'shoes', dupe_price: 119.00, original_price: 750, match_percentage: 81, image_url: U('photo-1548036328-c9fa89d128fa') }
    ],
    jewellery: [
      { store: 'ZARA', product_name: 'Layered Gold Chain Necklace', category: 'jewellery', dupe_price: 25.90, original_price: 480, match_percentage: 94, image_url: U('photo-1599643478518-a784e5dc4c8f') },
      { store: 'H&M', product_name: 'Chunky Hoop Earrings', category: 'jewellery', dupe_price: 14.99, original_price: 480, match_percentage: 91, image_url: U('photo-1573408301185-9146fe634ad0') },
      { store: 'MANGO', product_name: 'Crystal Pendant Necklace', category: 'jewellery', dupe_price: 29.99, original_price: 480, match_percentage: 89, image_url: U('photo-1611085583191-a3b181a88401') },
      { store: 'ASOS', product_name: 'Pearl Drop Earrings Set', category: 'jewellery', dupe_price: 18.00, original_price: 480, match_percentage: 86, image_url: U('photo-1612817159949-195b6eb9e31a') },
      { store: 'COS', product_name: 'Sculptural Cuff Bracelet', category: 'jewellery', dupe_price: 35.00, original_price: 480, match_percentage: 84, image_url: U('photo-1611591437281-460bfbe1220a') },
      { store: '& OTHER STORIES', product_name: 'Twisted Ring Set', category: 'jewellery', dupe_price: 29.00, original_price: 480, match_percentage: 82, image_url: U('photo-1622434641406-a158123450f9') }
    ],
    accessories: [
      { store: 'ZARA', product_name: 'Silk Square Scarf', category: 'accessories', dupe_price: 29.90, original_price: 450, match_percentage: 93, image_url: U('photo-1576566588028-4147f3842f27') },
      { store: 'H&M', product_name: 'Wide Leather Belt', category: 'accessories', dupe_price: 24.99, original_price: 450, match_percentage: 90, image_url: U('photo-1617038220319-276d3cfab638') },
      { store: 'MANGO', product_name: 'Oversized Sunglasses', category: 'accessories', dupe_price: 25.99, original_price: 450, match_percentage: 88, image_url: U('photo-1509319117193-57bab727e09d') },
      { store: 'ASOS', product_name: 'Logo Bucket Hat', category: 'accessories', dupe_price: 22.00, original_price: 450, match_percentage: 86, image_url: U('photo-1521223890158-f9f7c3d5d504') },
      { store: 'COS', product_name: 'Cashmere Wool Scarf', category: 'accessories', dupe_price: 69.00, original_price: 450, match_percentage: 84, image_url: U('photo-1576566588028-4147f3842f27') },
      { store: '& OTHER STORIES', product_name: 'Leather Gloves', category: 'accessories', dupe_price: 49.00, original_price: 450, match_percentage: 81, image_url: U('photo-1509631179647-0177331693ae') }
    ]
  };

  function detectCategory(query) {
    const q = (typeof query === 'string' ? query : '').toLowerCase();
    if (/\b(bag|bags|tote|clutch|purse|handbag|pochette|backpack|satchel|crossbody|shoulder bag|bucket bag|hobo)\b/.test(q)) return 'bags';
    if (/\b(shoe|shoes|boot|boots|heel|heels|sneaker|sneakers|loafer|loafers|sandal|sandals|flats|ballet|mule|mules|pump|pumps|trainer|trainers|espadrille)\b/.test(q)) return 'shoes';
    if (/\b(jewel|jewelry|jewellery|necklace|earring|earrings|ring|rings|bracelet|pendant|chain|pearl|pearls|brooch|cuff|bangle|choker)\b/.test(q)) return 'jewellery';
    if (/\b(scarf|scarves|belt|belts|hat|hats|cap|glove|gloves|sunglasses|watch|watches|wallet|headband|hairclip|tie|bow tie|beanie)\b/.test(q)) return 'accessories';
    if (/\b(dress|skirt|coat|blazer|jacket|trouser|trousers|pants|top|blouse|shirt|sweater|knit|cardigan|hoodie|jeans|denim|jumpsuit|romper|kimono|cape|vest|corset)\b/.test(q)) return 'clothing';
    return 'mixed';
  }

  function generateDemoResults(query) {
    const cat = detectCategory(query);

    let items;
    if (cat === 'mixed') {
      // Pick one product from each category for variety
      const cats = Object.keys(DEMO_PRODUCTS);
      const pool = [];
      cats.forEach(c => pool.push(...DEMO_PRODUCTS[c]));
      // Shuffle and take 6
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      items = pool.slice(0, 6);
      // Ensure unique stores
      const seen = new Set();
      items = items.filter(item => {
        if (seen.has(item.store)) return false;
        seen.add(item.store);
        return true;
      });
      // Fill if needed
      while (items.length < 6) {
        const fill = pool.find(p => !seen.has(p.store));
        if (fill) { items.push(fill); seen.add(fill.store); }
        else break;
      }
    } else {
      items = DEMO_PRODUCTS[cat];
    }

    // Deep clone and add slight randomness
    return items.map(item => ({
      ...item,
      match_percentage: item.match_percentage + Math.floor(Math.random() * 3) - 1
    }));
  }

  /* ---- Free searches remaining tracker ---- */

  let freeRemaining = FREE_LIMIT;
  let lastResultWasDemo = false;

  function updateFreeCounter(remaining) {
    freeRemaining = remaining;
    const el = document.getElementById('freeCounter');
    if (!el) return;

    const tier = getUserTier();
    if (tier === 'pro') {
      el.textContent = t('free.pro') || 'Unlimited AI searches (Pro)';
      el.style.display = '';
      return;
    }

    if (remaining > 0) {
      const total = tier === 'unregistered' ? UNREG_LIMIT : FREE_LIMIT;
      const suffix = tier === 'unregistered'
        ? (t('free.totalRemaining') || 'free AI searches remaining')
        : (t('free.remaining') || 'free AI searches left today');
      el.textContent = `${remaining}/${total} ${suffix}`;
      el.style.display = '';
    } else {
      const msg = tier === 'unregistered'
        ? (t('free.unregExhausted') || 'Free searches used \u2014 sign in for 3 daily searches')
        : (t('free.exhausted') || 'Free searches used \u2014 showing demo results');
      el.textContent = msg;
      el.style.display = '';
    }
  }

  /* ---- Parse Claude response JSON ---- */

  function parseClaudeResponse(data) {
    const text = data.content?.[0]?.text || '';
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }
    const dupes = JSON.parse(cleaned);
    if (!Array.isArray(dupes) || dupes.length === 0) {
      throw new Error('Unexpected AI response format.');
    }
    return dupes;
  }

  /* ---- API call with freemium model ---- */

  /* ---- Unregistered lifetime search tracker ---- */

  const UNREG_COUNT_KEY = 'altere_unreg_searches';
  const UNREG_LIMIT     = 3;

  function getUnregCount() {
    return parseInt(localStorage.getItem(UNREG_COUNT_KEY) || '0', 10);
  }

  function incrementUnregCount() {
    const c = getUnregCount() + 1;
    localStorage.setItem(UNREG_COUNT_KEY, String(c));
    return c;
  }

  async function callClaude(userContent, rawQuery) {
    const apiKey = getApiKey();
    const tier   = getUserTier();

    // --- Pro: own API key → unlimited, direct to Anthropic ---
    if (tier === 'pro') {
      const messages = [{ role: 'user', content: userContent }];
      const body = { model: MODEL, max_tokens: 1024, system: SYSTEM_PROMPT, messages };

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 401) throw new Error('Invalid API key. Check your key in settings.');
        throw new Error(err.error?.message || `API error ${res.status}`);
      }

      lastResultWasDemo = false;
      return parseClaudeResponse(await res.json());
    }

    // --- Unregistered: 3 total (lifetime), then demo only ---
    if (tier === 'unregistered') {
      const used = getUnregCount();
      if (used >= UNREG_LIMIT) {
        updateFreeCounter(0);
        await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
        lastResultWasDemo = true;
        return generateDemoResults(rawQuery || 'fashion item');
      }

      // Try proxy
      try {
        const messages = [{ role: 'user', content: userContent }];
        const body = { model: MODEL, max_tokens: 1024, system: SYSTEM_PROMPT, messages };

        const res = await fetch(PROXY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (res.status === 429 || !res.ok) {
          await new Promise(r => setTimeout(r, 800));
          lastResultWasDemo = true;
          return generateDemoResults(rawQuery || 'fashion item');
        }

        const data = await res.json();
        const newCount = incrementUnregCount();
        updateFreeCounter(UNREG_LIMIT - newCount);

        lastResultWasDemo = false;
        return parseClaudeResponse(data);
      } catch {
        await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
        lastResultWasDemo = true;
        return generateDemoResults(rawQuery || 'fashion item');
      }
    }

    // --- Registered: 3/day via proxy, then demo ---
    try {
      const messages = [{ role: 'user', content: userContent }];
      const body = { model: MODEL, max_tokens: 1024, system: SYSTEM_PROMPT, messages };

      const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      // Rate limited → fall back to demo
      if (res.status === 429) {
        updateFreeCounter(0);
        await new Promise(r => setTimeout(r, 800));
        lastResultWasDemo = true;
        return generateDemoResults(rawQuery || 'fashion item');
      }

      // Proxy not configured → demo
      if (!res.ok) {
        await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
        lastResultWasDemo = true;
        return generateDemoResults(rawQuery || 'fashion item');
      }

      // Success — update counter
      if (data._rateLimit) {
        updateFreeCounter(data._rateLimit.remaining);
      }

      lastResultWasDemo = false;
      return parseClaudeResponse(data);

    } catch {
      // Network error / proxy unavailable → demo fallback
      await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
      lastResultWasDemo = true;
      return generateDemoResults(rawQuery || 'fashion item');
    }
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

  const reverseInput = document.getElementById('reverseInput');
  const reverseBtn   = document.getElementById('reverseBtn');

  reverseBtn.addEventListener('click', () => {
    const value = reverseInput.value.trim();
    if (!value) {
      reverseInput.style.borderColor = '#C9A96E';
      setTimeout(() => { reverseInput.style.borderColor = ''; }, 2000);
      return;
    }
    reverseBtn.textContent = t('search.searching');
    reverseBtn.disabled = true;
    performReverseSearch(value);
  });

  reverseInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') reverseBtn.click();
  });

  async function performReverseSearch(query) {
    if (isSearching) return;
    isSearching = true;

    showSearchStatus();
    renderSkeletons();
    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });

    const eyebrow = resultsHeader.querySelector('.results__eyebrow');
    const title   = resultsHeader.querySelector('.results__title');
    const sub     = resultsHeader.querySelector('.results__subtitle');
    eyebrow.textContent = t('search.searching').replace('...', '');
    title.textContent   = t('reverse.loading') || 'Identifying the luxury original\u2026';
    sub.textContent     = t('reverse.loadingSub') || 'Matching your item to designer collections';

    try {
      let result;
      const apiKey = getApiKey();
      const tier   = getUserTier();

      if (tier === 'pro') {
        // Direct API
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
          body: JSON.stringify({ model: MODEL, max_tokens: 1024, system: REVERSE_PROMPT, messages: [{ role: 'user', content: `The user has this affordable item: ${query}. Identify the luxury original and suggest 5 similar affordable alternatives.` }] })
        });
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        let text = data.content?.[0]?.text || '';
        if (text.startsWith('```')) text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        result = JSON.parse(text.trim());
      } else {
        // Demo fallback
        await new Promise(r => setTimeout(r, 1500 + Math.random() * 800));
        result = generateDemoReverse(query);
      }

      renderReverseResults(result, query, tier !== 'pro');
      saveRecentSearch(query, 'reverse');
    } catch (err) {
      showToast(err.message || 'Search failed', true);
      eyebrow.textContent = t('results.eyebrow');
      title.textContent   = t('results.title');
      sub.textContent     = t('results.subtitle');
      restoreDefaultCards();
    } finally {
      isSearching = false;
      hideSearchStatus();
      reverseBtn.textContent = t('search.btnReverse') || 'Source This';
      reverseBtn.disabled = false;
    }
  }

  function renderReverseResults(result, query, isDemo) {
    resultsGrid.innerHTML = '';
    resetFilters();

    const originalFoundEl = document.getElementById('originalFound');
    const bestDupeEl = document.getElementById('bestDupe');
    const moreAltsEl = document.getElementById('moreAlts');

    // Hide normal best dupe
    bestDupeEl.innerHTML = '';
    bestDupeEl.classList.remove('visible');

    // Update header
    const eyebrow = resultsHeader.querySelector('.results__eyebrow');
    const title   = resultsHeader.querySelector('.results__title');
    const sub     = resultsHeader.querySelector('.results__subtitle');
    eyebrow.textContent = isDemo ? (t('results.demo.eyebrow') || 'Demo Results') : (t('reverse.eyebrow') || 'Original Found');
    title.textContent   = t('reverse.title') || 'We found the original';
    const demoHint = isDemo ? (' \u2014 ' + (t('results.demo.hint') || 'Add your API key for real AI results')) : '';
    sub.textContent = `${t('reverse.for') || 'Original identified for'} \u201c${query}\u201d${demoHint}`;

    // Render original card
    const orig = result.original;
    originalFoundEl.innerHTML = `
      <article class="original-found__card">
        <div class="original-found__image">
          <div class="dupe-card__color-placeholder" style="background:#D5C6B0">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
          <span class="original-found__ribbon">${t('reverse.originalLabel') || 'The Original'}</span>
        </div>
        <div class="original-found__body">
          <span class="original-found__label">${t('reverse.identifiedAs') || 'Identified as'}</span>
          <span class="original-found__brand">${escapeHtml(orig.brand)}</span>
          <h3 class="original-found__name">${escapeHtml(orig.product_name)}</h3>
          <span class="original-found__price">$${orig.price.toLocaleString()}</span>
          <p class="original-found__desc">${escapeHtml(orig.description)}</p>
          <span class="original-found__arrow">
            ${t('reverse.dupeBelow') || 'Affordable alternatives below'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </span>
        </div>
      </article>`;
    originalFoundEl.classList.add('visible');

    // Show more alts label
    moreAltsEl.classList.add('visible');

    // Render dupes in grid
    const dupes = result.dupes || [];
    const hasUnsplash = !!getUnsplashKey();

    dupes.forEach((dupe, i) => {
      const savings = Math.round(((dupe.original_price - dupe.dupe_price) / dupe.original_price) * 100);
      const card = document.createElement('article');
      card.className = 'dupe-card reveal';
      card.dataset.price = dupe.dupe_price.toFixed(2);
      card.dataset.store = dupe.store;
      card.dataset.category = dupe.category || 'clothing';
      card.dataset.material = dupe.material || 'natural';
      card.style.transitionDelay = `${i * 0.08}s`;

      const imgHTML = `<div class="dupe-card__color-placeholder" style="background:${CARD_COLORS[i % CARD_COLORS.length]}"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;

      card.innerHTML = `
        <div class="dupe-card__image">
          ${imgHTML}
          <span class="dupe-card__save" aria-label="Save"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span>
          <span class="dupe-card__share" aria-label="Share"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg><div class="share-dropdown"><button class="share-dropdown__item share-dropdown__whatsapp" type="button"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>WhatsApp</button><button class="share-dropdown__item share-dropdown__copy" type="button"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Copy link</button></div></span>
          <span class="dupe-card__badge">&minus;${savings}%</span>
        </div>
        <div class="dupe-card__info">
          <span class="dupe-card__store">${escapeHtml(dupe.store)}</span>
          <h3 class="dupe-card__name">${escapeHtml(dupe.product_name)}</h3>
          <div class="dupe-card__price-row">
            <span class="dupe-card__price">$${dupe.dupe_price.toFixed(2)}</span>
            <span class="dupe-card__original">$${dupe.original_price.toFixed(2)}</span>
          </div>
          <div class="dupe-card__match">
            <div class="dupe-card__match-bar"><div class="dupe-card__match-fill" style="width:0%"></div></div>
            <span>${dupe.match_percentage}% match</span>
          </div>
        </div>`;

      resultsGrid.appendChild(card);

      requestAnimationFrame(() => requestAnimationFrame(() => {
        card.classList.add('visible');
        const fill = card.querySelector('.dupe-card__match-fill');
        if (fill) fill.style.width = `${dupe.match_percentage}%`;
      }));
    });

    bindSaveButtons(resultsGrid);
    bindShareButtons(resultsGrid);
    syncSaveStates(resultsGrid);
  }

  /* ============================================================
     Social Proof Counter Animation
     ============================================================ */

  function animateCounter(el, target, duration) {
    const start = performance.now();
    const format = (n) => Math.round(n).toLocaleString();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic for a smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = format(target * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  const proofBar = document.getElementById('proofBar');
  let proofAnimated = false;

  const proofObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !proofAnimated) {
        proofAnimated = true;
        document.querySelectorAll('.proof__num').forEach(el => {
          const target = parseInt(el.dataset.target, 10);
          animateCounter(el, target, 2000);
        });
        proofObserver.unobserve(proofBar);
      }
    });
  }, { threshold: 0.3 });

  proofObserver.observe(proofBar);

  /* ============================================================
     Dupe of the Day
     ============================================================ */

  const DOTD_ITEMS = [
    {
      origBrand: 'BOTTEGA VENETA', origName: 'Cassette Padded Leather Bag', origPrice: 3200,
      origImg: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&h=625&fit=crop&crop=center&q=80',
      dupeBrand: 'MANGO', dupeName: 'Quilted Chain Shoulder Bag', dupePrice: 59.99,
      dupeImg: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=500&h=625&fit=crop&crop=center&q=80',
      query: 'Bottega Veneta Cassette bag'
    },
    {
      origBrand: 'MAX MARA', origName: 'Madame Wool Double-Breasted Coat', origPrice: 2590,
      origImg: 'https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?w=500&h=625&fit=crop&crop=center&q=80',
      dupeBrand: 'H&M', dupeName: 'Oversized Wool-Blend Coat', dupePrice: 89.99,
      dupeImg: 'https://images.unsplash.com/photo-1653660666869-2345adc51155?w=500&h=625&fit=crop&crop=center&q=80',
      query: 'Max Mara double breasted wool coat'
    },
    {
      origBrand: 'THE ROW', origName: 'Margaux Leather Tote', origPrice: 5500,
      origImg: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=500&h=625&fit=crop&crop=center&q=80',
      dupeBrand: 'COS', dupeName: 'Structured Leather Tote', dupePrice: 120,
      dupeImg: 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=500&h=625&fit=crop&crop=center&q=80',
      query: 'The Row Margaux leather tote'
    },
    {
      origBrand: 'CELINE', origName: 'Triomphe Shoulder Bag', origPrice: 2850,
      origImg: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=500&h=625&fit=crop&crop=center&q=80',
      dupeBrand: 'ZARA', dupeName: 'Chain Detail Shoulder Bag', dupePrice: 45.99,
      dupeImg: 'https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?w=500&h=625&fit=crop&crop=center&q=80',
      query: 'Celine Triomphe shoulder bag'
    },
    {
      origBrand: 'ACNE STUDIOS', origName: 'Musubi Mini Leather Bag', origPrice: 1150,
      origImg: 'https://images.unsplash.com/photo-1614179689702-355944cd0918?w=500&h=625&fit=crop&crop=center&q=80',
      dupeBrand: 'ASOS', dupeName: 'Knotted Leather Crossbody', dupePrice: 48,
      dupeImg: 'https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?w=500&h=625&fit=crop&crop=center&q=80',
      query: 'Acne Studios Musubi mini bag'
    },
    {
      origBrand: 'JACQUEMUS', origName: 'Le Chiquito Long Bag', origPrice: 680,
      origImg: 'https://images.unsplash.com/photo-1524672353063-4f66ee1f385e?w=500&h=625&fit=crop&crop=center&q=80',
      dupeBrand: '& OTHER STORIES', dupeName: 'Mini Structured Handbag', dupePrice: 69,
      dupeImg: 'https://images.unsplash.com/photo-1544511196-1646449a253b?w=500&h=625&fit=crop&crop=center&q=80',
      query: 'Jacquemus Le Chiquito long bag'
    },
    {
      origBrand: 'SAINT LAURENT', origName: 'Le 5 à 7 Leather Shoulder Bag', origPrice: 2150,
      origImg: 'https://images.unsplash.com/photo-1575032617751-6ddec2089882?w=500&h=625&fit=crop&crop=center&q=80',
      dupeBrand: 'MANGO', dupeName: 'Leather Effect Shoulder Bag', dupePrice: 55.99,
      dupeImg: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=500&h=625&fit=crop&crop=center&q=80',
      query: 'Saint Laurent Le 5 a 7 bag'
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
    document.getElementById('dotdOrigPrice').textContent = `$${item.origPrice.toLocaleString()}`;

    document.getElementById('dotdDupeImg').style.backgroundImage = `url('${item.dupeImg}')`;
    document.getElementById('dotdDupeBrand').textContent = item.dupeBrand;
    document.getElementById('dotdDupeName').textContent = item.dupeName;
    document.getElementById('dotdDupePrice').textContent = `$${item.dupePrice.toFixed(2)}`;

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

  async function performSearch(query, type, imageFile) {
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
      let userContent;
      let displayQuery = query;

      if (type === 'image' && imageFile) {
        const base64 = await fileToBase64(imageFile);
        displayQuery = imageFile.name;
        userContent = [
          {
            type: 'image',
            source: { type: 'base64', media_type: getMediaType(imageFile), data: base64 }
          },
          { type: 'text', text: 'Identify this fashion item and find 6 high-street dupes for it.' }
        ];
      } else if (type === 'link') {
        userContent = `The user pasted this product link: ${query}\n\nIdentify what fashion item this is (infer from the URL structure, brand, and path) and find 6 high-street dupes for it.`;
      } else {
        userContent = `Find 6 high-street dupes for this fashion item: ${query}`;
      }

      const dupes = await callClaude(userContent, query);
      if (dupes) {
        renderResults(dupes, displayQuery, lastResultWasDemo);
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
      document.querySelectorAll('.search-box__btn').forEach(b => {
        b.textContent = t('search.btn');
        b.style.background = '';
        b.disabled = false;
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
     "Find dupes" button handlers (link + text panels)
     ============================================================ */

  document.querySelectorAll('.search-box__panel[data-panel="link"] .search-box__btn, .search-box__panel[data-panel="text"] .search-box__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.closest('.search-box__panel');
      const input = panel.querySelector('.search-box__input');
      const value = input.value.trim();

      if (!value) {
        input.style.borderColor = '#C9A96E';
        input.setAttribute('placeholder', 'Please enter something first...');
        setTimeout(() => {
          input.style.borderColor = '';
          input.setAttribute('placeholder',
            panel.dataset.panel === 'link'
              ? 'Paste a product URL from any fashion site...'
              : 'Describe the item, e.g. "cream satin midi skirt"...'
          );
        }, 2000);
        return;
      }

      btn.textContent = t('search.searching');
      btn.style.background = '#C9A96E';
      btn.disabled = true;

      const type = panel.dataset.panel === 'link' ? 'link' : 'text';
      performSearch(value, type, null);
    });
  });

  document.querySelectorAll('.search-box__input').forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const btn = input.closest('.search-box__panel').querySelector('.search-box__btn');
        if (btn) btn.click();
      }
    });
  });

  /* ============================================================
     Upload panel search button
     ============================================================ */

  uploadSearchBtn.addEventListener('click', () => {
    if (!currentFile) return;
    uploadSearchBtn.textContent = t('search.searching');
    uploadSearchBtn.style.background = '#C9A96E';
    uploadSearchBtn.disabled = true;
    performSearch(currentFile.name, 'image', currentFile);
  });

  /* ============================================================
     Save / heart toggle (initial cards)
     ============================================================ */

  bindSaveButtons(resultsGrid);
  bindShareButtons(resultsGrid);
  syncSaveStates(resultsGrid);

  /* ============================================================
     Waitlist form
     ============================================================ */

  const waitlistForm    = document.getElementById('waitlistForm');
  const waitlistEmail   = document.getElementById('waitlistEmail');
  const waitlistBtn     = document.getElementById('waitlistBtn');
  const waitlistSuccess = document.getElementById('waitlistSuccess');

  waitlistForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = waitlistEmail.value.trim();
    if (!email) return;

    waitlistBtn.disabled = true;
    waitlistBtn.textContent = t('search.joining');

    // Simulate a short network delay
    setTimeout(() => {
      waitlistForm.style.display = 'none';
      waitlistSuccess.classList.add('visible');
    }, 600);
  });

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
     Scroll-reveal animation
     ============================================================ */

  const revealEls = document.querySelectorAll(
    '.dupe-card, .how__step, .results__header, .how__inner'
  );

  revealEls.forEach(el => el.classList.add('reveal'));

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  revealEls.forEach(el => observer.observe(el));

  /* ============================================================
     Stagger initial card reveal + match bars
     ============================================================ */

  document.querySelectorAll('.dupe-card').forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.08}s`;
  });

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
