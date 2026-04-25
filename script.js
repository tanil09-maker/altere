/* ============================================================
   ALTERE — Main Script (rewritten)
   - All AI calls go through /api/chat backend proxy
   - No demo mode, no tier system, no frontend API key
   - Find Original supports describe/photo/link sub-tabs
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ============================================================
     Constants & State
     ============================================================ */

  const PROXY_URL    = '/api/chat';
  const MODEL        = 'claude-sonnet-4-20250514';
  const UNSPLASH_KEY = 'altere_unsplash_key';
  const UNSPLASH_API = 'https://api.unsplash.com/search/photos';
  const SAVED_KEY    = 'altere_saved_items';

  let currentFile        = null;  // "Find dupes" upload panel
  let currentReverseFile = null;  // "Find original" photo sub-tab
  let isSearching = false;

  /* ============================================================
     DOM refs
     ============================================================ */

  const nav             = document.getElementById('nav');
  const hamburger       = document.getElementById('hamburger');
  const navLinks        = document.getElementById('navLinks');
  const settingsBtn     = document.getElementById('settingsBtn');
  const settingsModal   = document.getElementById('settingsModal');
  const modalClose      = document.getElementById('modalClose');
  const unsplashInput   = document.getElementById('unsplashKeyInput');
  const apiStatus       = document.getElementById('apiStatus');
  const saveApiKeyBtn   = document.getElementById('saveApiKey');
  const uploadArea      = document.getElementById('uploadArea');
  const fileInput       = document.getElementById('fileInput');
  const uploadSearchBtn = document.getElementById('uploadSearchBtn');
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
  let activeStores    = new Set();

  /* ============================================================
     Dark mode toggle
     ============================================================ */

  const THEME_KEY    = 'altere_theme';
  const themeToggle  = document.getElementById('themeToggle');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }

  const savedThemeVal = localStorage.getItem(THEME_KEY) || 'light';
  if (savedThemeVal === 'dark') applyTheme('dark');

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
      'search.tab.link': 'Paste link', 'search.tab.upload': 'Upload photo', 'search.tab.text': 'Find dupes',
      'search.placeholder.link': 'Paste a product URL from any fashion site...',
      'search.placeholder.text': 'Describe the item, e.g. "cream satin midi skirt"...',
      'search.btn': 'Find dupes',
      'search.upload.hint': 'Drag & drop or <strong>browse</strong>',
      'search.upload.formats': 'JPG, PNG or WEBP up to 10 MB',
      'search.upload.ready': 'Ready to search',
      'search.status': 'AI is finding your dupes',
      'search.tab.camera': 'Take photo', 'camera.start': 'Tap to open camera', 'camera.hint': 'Point at any fashion item to find dupes', 'camera.retake': 'Retake', 'camera.use': 'Find dupes', 'camera.error': 'Could not access camera. Please check permissions.',
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
      'results.ai.eyebrow': 'AI Results', 'results.ai.title': 'Your dupes are ready', 'results.bestDupe': 'Best Dupe', 'results.moreAlts': 'Spotted Alternatives',
      'auth.title': 'Sign in to ALTERE', 'auth.subtitle': 'Create a free account to save dupes and share finds.', 'auth.email': 'Email', 'auth.name': 'Name', 'auth.create': 'Create free account', 'auth.signout': 'Sign out', 'auth.welcome': 'Welcome!', 'auth.signedOut': 'Signed out', 'auth.invalidEmail': 'Please enter a valid email.', 'auth.invalidName': 'Please enter your name.',
      'search.tab.reverse': 'Find original', 'search.placeholder.reverse': 'Describe your high-street item, e.g. "Zara quilted chain bag"...', 'search.btnReverse': 'Find original',
      'reverse.placeholder.link': 'Paste a product URL from a high-street store...',
      'reverse.loading': 'Identifying the luxury original\u2026', 'reverse.loadingSub': 'Matching your item to designer collections', 'reverse.eyebrow': 'Sourced Original', 'reverse.title': 'We found the original', 'reverse.for': 'Original identified for', 'reverse.originalLabel': 'The Original', 'reverse.identifiedAs': 'Identified as', 'reverse.dupeBelow': 'Affordable alternatives below',
      'results.loading.title': 'Our AI is analysing your item\u2026', 'results.loading.sub': 'Finding the best alternatives across 6 stores',
      'share.whatsapp': 'WhatsApp', 'share.copy': 'Copy link', 'share.copied': 'Copied!',
      'share.text': 'Check out this dupe: {name} from {store} for just {price} \u2014 found on ALTERE',
      'share.results': 'Share results', 'share.story': 'Download for Stories', 'share.story.footer': 'Found with ALTERE', 'share.story.downloaded': 'Story image downloaded',
      'invite.eyebrow': 'Spread the Word', 'invite.title': 'Share ALTERE with friends', 'invite.sub': 'Know someone who loves fashion but hates overpaying? Send them our way.', 'invite.copyLink': 'Copy link',
      'invite.message': 'Check out ALTERE \u2014 an AI-powered fashion dupe finder that finds luxury look-alikes at high-street prices!',
      'error.daily': 'Daily limit reached \u2014 come back tomorrow',
      'error.network': 'Something went wrong. Please try again in a moment.',
      'free.remaining': 'free AI searches left today', 'free.exhausted': 'Daily limit reached \u2014 resets at midnight'
    },
    nl: {
      'nav.discover': 'Ontdek', 'nav.brands': 'Merken', 'nav.saved': 'Opgeslagen', 'nav.signin': 'Inloggen',
      'hero.eyebrow': 'AI-Gestuurde Mode Ontdekking',
      'hero.headline': 'Spot het.<br>Wij vinden het.',
      'hero.sub': 'Beschrijf een winkelstraat-item en onze AI identificeert het luxe origineel \u2014 plus betaalbare alternatieven.',
      'search.tab.link': 'Link plakken', 'search.tab.upload': 'Foto uploaden', 'search.tab.text': 'Vind dupes',
      'search.placeholder.link': 'Plak een product-URL van een modesite...',
      'search.placeholder.text': 'Beschrijf het item, bijv. "cr\u00e8me satijnen midi rok"...',
      'search.btn': 'Vind dupes',
      'search.tab.reverse': 'Vind origineel', 'search.btnReverse': 'Vind origineel', 'search.placeholder.reverse': 'Beschrijf je winkelstraat-item, bijv. "Zara gewatteerde ketting tas"...',
      'reverse.placeholder.link': 'Plak een product-URL van een winkelstraat-modesite...',
      'search.upload.hint': 'Sleep of <strong>blader</strong>',
      'search.upload.formats': 'JPG, PNG of WEBP tot 10 MB',
      'search.upload.ready': 'Klaar om te zoeken',
      'search.status': 'AI zoekt je dupes',
      'search.tab.camera': 'Maak foto', 'camera.start': 'Tik om camera te openen', 'camera.hint': 'Richt op een mode-item om dupes te vinden', 'camera.retake': 'Opnieuw', 'camera.use': 'Vind dupes', 'camera.error': 'Kan camera niet openen. Controleer de machtigingen.',
      'recent.label': 'Recent', 'recent.clear': 'Wissen',
      'trending.label': 'Trending nu',
      'hero.searching': 'Zoeken bij', 'hero.scroll': 'Scroll om te ontdekken',
      'dotd.eyebrow': 'Dagelijkse Vondst', 'dotd.original': 'Het Origineel', 'dotd.dupe': 'Beste Dupe', 'dotd.vs': 'VS', 'dotd.btn': 'Meer dupes vinden',
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
      'results.ai.eyebrow': 'AI Resultaten', 'results.ai.title': 'Je dupes zijn klaar', 'results.bestDupe': 'Beste Dupe', 'results.moreAlts': 'Spotted Alternatives',
      'results.loading.title': 'Onze AI analyseert je item\u2026', 'results.loading.sub': 'De beste alternatieven zoeken bij 6 winkels',
      'share.whatsapp': 'WhatsApp', 'share.copy': 'Link kopi\u00ebren', 'share.copied': 'Gekopieerd!',
      'share.text': 'Bekijk deze dupe: {name} van {store} voor slechts {price} \u2014 gevonden op ALTERE',
      'share.results': 'Resultaten delen', 'share.story': 'Download voor Stories', 'share.story.footer': 'Gevonden met ALTERE', 'share.story.downloaded': 'Story-afbeelding gedownload',
      'invite.eyebrow': 'Vertel het Verder', 'invite.title': 'Deel ALTERE met vrienden', 'invite.sub': 'Ken je iemand die van mode houdt maar niet te veel wil betalen? Stuur ze onze kant op.', 'invite.copyLink': 'Link kopi\u00ebren',
      'invite.message': 'Bekijk ALTERE \u2014 een AI-gestuurde mode dupe finder die luxe look-alikes vindt voor lage prijzen!',
      'error.daily': 'Dagelijkse limiet bereikt \u2014 kom morgen terug',
      'error.network': 'Er ging iets mis. Probeer het zo opnieuw.'
    },
    fr: {
      'nav.discover': 'D\u00e9couvrir', 'nav.brands': 'Marques', 'nav.saved': 'Sauvegard\u00e9s', 'nav.signin': 'Connexion',
      'hero.eyebrow': 'D\u00e9couverte Mode par IA',
      'hero.headline': 'Rep\u00e9rez-le.<br>Nous le trouverons.',
      'hero.sub': 'D\u00e9crivez n\u2019importe quel article et notre IA identifie l\u2019original luxe qui l\u2019a inspir\u00e9 \u2014 plus des alternatives abordables.',
      'search.tab.link': 'Coller un lien', 'search.tab.upload': 'T\u00e9l\u00e9charger photo', 'search.tab.text': 'Trouver dupes',
      'search.placeholder.link': 'Collez l\u2019URL d\u2019un produit...',
      'search.placeholder.text': 'D\u00e9crivez l\u2019article, ex. "jupe midi en satin cr\u00e8me"...',
      'search.btn': 'Trouver dupes',
      'search.tab.reverse': 'Trouver l\u2019original', 'search.btnReverse': 'Trouver l\u2019original', 'search.placeholder.reverse': 'D\u00e9crivez votre article, ex. "Sac matelass\u00e9 cha\u00eene Zara"...',
      'reverse.placeholder.link': 'Collez l\u2019URL d\u2019un produit...',
      'search.upload.hint': 'Glissez ou <strong>parcourez</strong>',
      'search.upload.formats': 'JPG, PNG ou WEBP jusqu\u2019\u00e0 10 Mo',
      'search.upload.ready': 'Pr\u00eat \u00e0 chercher',
      'search.status': 'L\u2019IA trouve vos dupes',
      'search.tab.camera': 'Prendre photo', 'camera.start': 'Touchez pour ouvrir la cam\u00e9ra', 'camera.hint': 'Pointez vers un article pour trouver des dupes', 'camera.retake': 'Reprendre', 'camera.use': 'Trouver dupes', 'camera.error': 'Impossible d\u2019acc\u00e9der \u00e0 la cam\u00e9ra. V\u00e9rifiez les autorisations.',
      'recent.label': 'R\u00e9cent', 'recent.clear': 'Effacer',
      'trending.label': 'Tendance maintenant',
      'hero.searching': 'Recherche dans', 'hero.scroll': 'Faites d\u00e9filer',
      'dotd.eyebrow': 'Source du Jour', 'dotd.original': 'L\u2019Original', 'dotd.dupe': 'Meilleur Dupe', 'dotd.vs': 'VS', 'dotd.btn': 'Plus de dupes',
      'calc.eyebrow': 'Calculateur', 'calc.title': 'Combien pourriez-vous \u00e9conomiser ?', 'calc.sub': 'D\u00e9couvrez ce qui se passe quand vous remplacez le luxe par des dupes intelligents.', 'calc.budget': 'Budget mode mensuel', 'calc.perMonth': 'Par mois', 'calc.perYear': 'Par an', 'calc.fiveYears': 'En 5 ans', 'calc.note': 'Bas\u00e9 sur 68% d\u2019\u00e9conomie moyenne en achetant des dupes plut\u00f4t que des originaux luxe.',
      'proof.dupes': 'dupes trouv\u00e9s aujourd\u2019hui', 'proof.shoppers': 'acheteurs heureux', 'proof.saved': '\u00e9conomis\u00e9s cette semaine', 'press.label': 'Vu dans',
      'celeb.eyebrow': 'Inspiration', 'celeb.title': 'Le look c\u00e9l\u00e9brit\u00e9', 'celeb.sub': 'Explorez les esth\u00e9tiques les plus recherch\u00e9es.', 'celeb.btn': 'Trouver dupes',
      'celeb.c1.name': 'Quiet Luxury', 'celeb.c1.desc': '\u00c9l\u00e9gance discr\u00e8te. Tons neutres, cachemire et silhouettes \u00e9pur\u00e9es.',
      'celeb.c2.name': 'Street Chic', 'celeb.c2.desc': 'Audacieux et sans effort. Blazers oversize, pantalons en cuir et sneakers statement.',
      'celeb.c3.name': 'Old Money', 'celeb.c3.desc': 'Pr\u00e9pa rencontre raffinement. Manteaux en laine, perles, mocassins et sacs structur\u00e9s.',
      'celeb.c4.name': 'French Girl', 'celeb.c4.desc': 'Chic sans effort. Rayures bretonnes, jupes midi, ballerines et ce je ne sais quoi parisien.',
      'cookie.text': 'Nous utilisons des cookies pour am\u00e9liorer votre exp\u00e9rience.', 'cookie.accept': 'Tout accepter', 'cookie.manage': 'G\u00e9rer les pr\u00e9f\u00e9rences',
      'about.mission': 'Esth\u00e9tique luxe, prix accessibles.', 'about.storyEyebrow': 'Notre Histoire', 'about.storyTitle': 'La mode pour tous',
      'about.storyP1': 'ALTERE est n\u00e9 d\u2019une frustration : tomber amoureux d\u2019une pi\u00e8ce de podium puis voir le prix.',
      'about.storyP2': 'Nous avons donc cr\u00e9\u00e9 une IA qui voit la mode comme un styliste \u2014 analysant tissu, coupe, couleur et silhouette.',
      'about.howEyebrow': 'La Technologie', 'about.howTitle': 'Comment notre IA fonctionne',
      'about.step1Title': 'D\u00e9construction visuelle', 'about.step1Desc': 'Notre mod\u00e8le d\u00e9compose chaque article en attributs : mati\u00e8re, texture, forme, proportions, palette.',
      'about.step2Title': 'Correspondance multi-magasins', 'about.step2Desc': 'Nous scannons Zara, H&M, Mango, ASOS, COS et & Other Stories en temps r\u00e9el sur 40+ dimensions.',
      'about.step3Title': 'Classement intelligent', 'about.step3Desc': 'R\u00e9sultats class\u00e9s par pr\u00e9cision, \u00e9conomies et disponibilit\u00e9.',
      'about.teamEyebrow': 'Qui Sommes-Nous', 'about.teamTitle': 'Fond\u00e9 par des passionn\u00e9s,<br>propuls\u00e9 par l\u2019IA',
      'about.teamDesc': 'Nous sommes une petite \u00e9quipe avec une mission : d\u00e9mocratiser le style.',
      'about.cta': 'Commencer \u00e0 d\u00e9couvrir',
      'faq.eyebrow': 'Support', 'faq.title': 'Questions fr\u00e9quentes',
      'faq.q1': 'Comment l\u2019IA trouve les dupes ?', 'faq.a1': 'Notre IA analyse chaque article \u2014 photo, lien ou description \u2014 en attributs comme tissu, coupe, couleur. Elle compare ensuite des milliers de produits en temps r\u00e9el.',
      'faq.q2': 'Les liens sont-ils affili\u00e9s ?', 'faq.a2': 'Certains liens peuvent \u00eatre affili\u00e9s, ce qui nous permet de garder ALTERE gratuit. Cela n\u2019influence jamais le classement.',
      'faq.q3': 'ALTERE est-il gratuit ?', 'faq.a3': 'Oui, ALTERE est totalement gratuit. Recherches illimit\u00e9es, sauvegardes, partages \u2014 sans compte ni paiement.',
      'faq.q4': 'Pr\u00e9cision des pourcentages ?', 'faq.a4': 'Les pourcentages refl\u00e8tent la proximit\u00e9 sur 40+ dimensions. Au-dessus de 90% = tr\u00e8s proche visuellement.',
      'faq.q5': 'Puis-je sugg\u00e9rer un magasin ?', 'faq.a5': 'Absolument ! Envoyez-nous le nom. Uniqlo, Arket et Massimo Dutti sont sur notre roadmap.',
      'reviews.eyebrow': 'Avis', 'reviews.title': 'Aim\u00e9 par les passionn\u00e9s de mode',
      'reviews.r1.quote': '\u00abDupe Bottega parfait trouv\u00e9 \u2014 personne n\u2019a vu la diff\u00e9rence. \u00c9conomis\u00e9 \u20ac2,000 !\u00bb', 'reviews.r1.name': 'Sophie M.', 'reviews.r1.location': 'Amsterdam, NL',
      'reviews.r2.quote': '\u00abJ\u2019utilise ALTERE chaque fois que je vois quelque chose sur Instagram.\u00bb', 'reviews.r2.name': 'James T.', 'reviews.r2.location': 'Londres, UK',
      'reviews.r3.quote': '\u00abEn tant que styliste, c\u2019est mon arme secr\u00e8te.\u00bb', 'reviews.r3.name': 'Amara K.', 'reviews.r3.location': 'Paris, FR',
      'reviews.r4.quote': '\u00abPhoto d\u2019un manteau Max Mara \u00e0 \u20ac900 et trouv\u00e9 quasi-identique \u00e0 H&M pour \u20ac89.\u00bb', 'reviews.r4.name': 'Luca R.', 'reviews.r4.location': 'Milan, IT',
      'reviews.r5.quote': '\u00abEnfin un dupe finder qui marche vraiment.\u00bb', 'reviews.r5.name': 'Elena V.', 'reviews.r5.location': 'Barcelone, ES',
      'reviews.r6.quote': '\u00abMes amis sont obs\u00e9d\u00e9s. On partage des dupes chaque jour.\u00bb', 'reviews.r6.name': 'Noah B.', 'reviews.r6.location': 'Berlin, DE',
      'results.eyebrow': 'Dupes Tendance',
      'results.title': 'Looks luxe, prix accessibles',
      'results.subtitle': 'Notre IA scanne des milliers de produits chaque jour.',
      'filter.category': 'Cat\u00e9gorie', 'filter.bags': 'Sacs', 'filter.shoes': 'Chaussures', 'filter.clothing': 'V\u00eatements', 'filter.jewellery': 'Bijoux', 'filter.accessories': 'Accessoires',
      'filter.price': 'Prix', 'filter.all': 'Tout', 'filter.store': 'Magasin', 'filter.allStores': 'Tous Magasins', 'filter.sortBy': 'Trier par',
      'sort.match': 'Meilleur match', 'sort.priceAsc': 'Prix : Croissant', 'sort.priceDesc': 'Prix : D\u00e9croissant', 'sort.saving': 'Plus grosse \u00e9conomie',
      'how.eyebrow': 'Comment \u00e7a marche', 'how.title': 'Trois \u00e9tapes vers le dupe parfait',
      'how.step1.title': 'Uploadez ou collez', 'how.step1.desc': 'Partagez photo, lien ou description.',
      'how.step2.title': 'Analyse IA', 'how.step2.desc': 'Notre mod\u00e8le d\u00e9compose tissu, coupe, couleur en secondes.',
      'how.step3.title': 'Achetez les dupes', 'how.step3.desc': 'Parcourez les alternatives class\u00e9es avec scores et liens.',
      'waitlist.eyebrow': 'Acc\u00e8s Anticip\u00e9', 'waitlist.title': 'Soyez le premier inform\u00e9<br>au lancement',
      'waitlist.sub': 'Rejoignez des milliers de passionn\u00e9s.',
      'waitlist.placeholder': 'Votre email', 'waitlist.btn': 'Rejoindre',
      'waitlist.hint': 'Pas de spam. D\u00e9sabonnement \u00e0 tout moment.',
      'waitlist.success.title': 'Vous \u00eates inscrit', 'waitlist.success.desc': 'Nous vous pr\u00e9viendrons au lancement.',
      'saved.back': 'Retour', 'saved.eyebrow': 'Votre Collection', 'saved.title': 'Articles Sauvegard\u00e9s', 'saved.clearAll': 'Tout effacer',
      'saved.empty': 'Aucun article sauvegard\u00e9', 'saved.emptyHint': 'Touchez le c\u0153ur pour sauvegarder',
      'footer.tagline': 'Dupe finder mode IA. Esth\u00e9tique luxe, prix accessibles.',
      'footer.explore': 'Explorer', 'footer.trending': 'Tendances', 'footer.newArrivals': 'Nouveaut\u00e9s', 'footer.collections': 'Collections',
      'footer.company': 'Entreprise', 'footer.about': '\u00c0 propos', 'footer.careers': 'Carri\u00e8res', 'footer.privacy': 'Confidentialit\u00e9', 'footer.terms': 'Conditions',
      'toast.saved': 'Sauvegard\u00e9', 'toast.removed': 'Retir\u00e9', 'toast.cleared': 'Tout effac\u00e9',
      'search.searching': 'Recherche...', 'search.joining': 'Inscription...',
      'results.ai.eyebrow': 'R\u00e9sultats IA', 'results.ai.title': 'Vos dupes sont pr\u00eats', 'results.bestDupe': 'Meilleur Dupe', 'results.moreAlts': 'Alternatives Spotted',
      'results.loading.title': 'Notre IA analyse votre article\u2026', 'results.loading.sub': 'Recherche dans 6 magasins',
      'reverse.loading': 'Identification de l\u2019original\u2026', 'reverse.loadingSub': 'Correspondance avec les collections', 'reverse.eyebrow': 'Original Identifi\u00e9', 'reverse.title': 'Original trouv\u00e9', 'reverse.for': 'Original identifi\u00e9 pour', 'reverse.originalLabel': 'L\u2019Original', 'reverse.identifiedAs': 'Identifi\u00e9 comme', 'reverse.dupeBelow': 'Alternatives abordables ci-dessous',
      'share.whatsapp': 'WhatsApp', 'share.copy': 'Copier le lien', 'share.copied': 'Copi\u00e9 !',
      'share.text': 'Regardez ce dupe : {name} de {store} pour {price} \u2014 trouv\u00e9 sur ALTERE',
      'share.results': 'Partager', 'share.story': 'T\u00e9l\u00e9charger pour Stories', 'share.story.footer': 'Trouv\u00e9 avec ALTERE', 'share.story.downloaded': 'Image t\u00e9l\u00e9charg\u00e9e',
      'invite.eyebrow': 'Faites Passer le Mot', 'invite.title': 'Partagez ALTERE', 'invite.sub': 'Quelqu\u2019un qui aime la mode mais d\u00e9teste payer trop ?', 'invite.copyLink': 'Copier le lien',
      'invite.message': 'D\u00e9couvrez ALTERE \u2014 le dupe finder mode par IA !',
      'auth.title': 'Connexion \u00e0 ALTERE', 'auth.subtitle': 'Cr\u00e9ez un compte gratuit.', 'auth.email': 'Email', 'auth.name': 'Nom', 'auth.create': 'Cr\u00e9er compte', 'auth.signout': 'D\u00e9connexion', 'auth.welcome': 'Bienvenue !', 'auth.signedOut': 'D\u00e9connect\u00e9', 'auth.invalidEmail': 'Email invalide.', 'auth.invalidName': 'Nom requis.',
      'error.daily': 'Limite quotidienne atteinte \u2014 revenez demain',
      'error.network': 'Erreur. R\u00e9essayez dans un moment.'
    },
    de: {
      'nav.discover': 'Entdecken', 'nav.brands': 'Marken', 'nav.saved': 'Gespeichert', 'nav.signin': 'Anmelden',
      'hero.eyebrow': 'KI-gest\u00fctzte Mode-Entdeckung',
      'hero.headline': 'Sieh es.<br>Wir finden es.',
      'hero.sub': 'Beschreibe ein Mode-Item und unsere KI identifiziert das Luxus-Original \u2014 plus erschwingliche Alternativen.',
      'search.tab.link': 'Link einf\u00fcgen', 'search.tab.upload': 'Foto hochladen', 'search.tab.text': 'Dupes finden',
      'search.placeholder.link': 'F\u00fcge eine Produkt-URL ein...',
      'search.placeholder.text': 'Beschreibe das Item, z.B. "cremefarbener Satin-Midirock"...',
      'search.btn': 'Dupes finden',
      'search.tab.reverse': 'Original finden', 'search.btnReverse': 'Original finden', 'search.placeholder.reverse': 'Beschreibe dein Item, z.B. "Zara gesteppte Kettentasche"...',
      'reverse.placeholder.link': 'F\u00fcge eine Produkt-URL ein...',
      'search.upload.hint': 'Ziehen oder <strong>durchsuchen</strong>',
      'search.upload.formats': 'JPG, PNG oder WEBP bis 10 MB',
      'search.upload.ready': 'Bereit zur Suche',
      'search.status': 'KI sucht deine Dupes',
      'search.tab.camera': 'Foto machen', 'camera.start': 'Tippen zum \u00d6ffnen', 'camera.hint': 'Auf Mode-Item richten', 'camera.retake': 'Erneut', 'camera.use': 'Dupes finden', 'camera.error': 'Kein Kamerazugriff. Bitte Berechtigungen pr\u00fcfen.',
      'recent.label': 'K\u00fcrzlich', 'recent.clear': 'L\u00f6schen',
      'trending.label': 'Jetzt im Trend',
      'hero.searching': 'Suche bei', 'hero.scroll': 'Scrollen zum Erkunden',
      'dotd.eyebrow': 'Tagesfund', 'dotd.original': 'Das Original', 'dotd.dupe': 'Bestes Dupe', 'dotd.vs': 'VS', 'dotd.btn': 'Mehr Dupes finden',
      'calc.eyebrow': 'Sparrechner', 'calc.title': 'Wie viel kannst du sparen?', 'calc.sub': 'Sieh, was passiert, wenn du Luxus durch smarte Dupes ersetzt.', 'calc.budget': 'Monatliches Modebudget', 'calc.perMonth': 'Pro Monat', 'calc.perYear': 'Pro Jahr', 'calc.fiveYears': 'In 5 Jahren', 'calc.note': 'Basierend auf 68% Durchschnittsersparnis.',
      'proof.dupes': 'Dupes heute gefunden', 'proof.shoppers': 'gl\u00fcckliche K\u00e4ufer', 'proof.saved': 'diese Woche gespart', 'press.label': 'Bekannt aus',
      'celeb.eyebrow': 'Stilinspiration', 'celeb.title': 'Hol dir den Promi-Look', 'celeb.sub': 'Entdecke die meistgesuchten \u00c4sthetiken.', 'celeb.btn': 'Dupes finden',
      'celeb.c1.name': 'Quiet Luxury', 'celeb.c1.desc': 'Dezente Eleganz. Neutrale T\u00f6ne, Kaschmir, klare Silhouetten.',
      'celeb.c2.name': 'Street Chic', 'celeb.c2.desc': 'Mutig und m\u00fchelos. Oversize-Blazer, Lederhosen, Statement-Sneaker.',
      'celeb.c3.name': 'Old Money', 'celeb.c3.desc': 'Preppy trifft Politur. Wollm\u00e4ntel, Perlen, Loafer, strukturierte Taschen.',
      'celeb.c4.name': 'French Girl', 'celeb.c4.desc': 'M\u00fchelos chic. Bretonische Streifen, Midir\u00f6cke, Ballerinas.',
      'cookie.text': 'Wir verwenden Cookies.', 'cookie.accept': 'Alle akzeptieren', 'cookie.manage': 'Einstellungen',
      'about.mission': 'Luxus-\u00c4sthetik, faire Preise.', 'about.storyEyebrow': 'Unsere Geschichte', 'about.storyTitle': 'Mode f\u00fcr alle',
      'about.storyP1': 'ALTERE entstand aus Frustration: Sich in ein Runway-St\u00fcck verlieben und dann das Preisschild sehen.',
      'about.storyP2': 'Also bauten wir eine KI, die Mode wie ein Stylist sieht \u2014 Stoff, Schnitt, Farbe und Silhouette analysiert.',
      'about.howEyebrow': 'Die Technologie', 'about.howTitle': 'Wie unsere KI funktioniert',
      'about.step1Title': 'Visuelle Dekonstruktion', 'about.step1Desc': 'Unser Modell zerlegt jedes Item in Kernattribute.',
      'about.step2Title': 'Cross-Store-Matching', 'about.step2Desc': 'Wir scannen Zara, H&M, Mango, ASOS, COS, & Other Stories in Echtzeit.',
      'about.step3Title': 'Smartes Ranking', 'about.step3Desc': 'Ergebnisse nach Genauigkeit, Ersparnis und Verf\u00fcgbarkeit sortiert.',
      'about.teamEyebrow': 'Wer Wir Sind', 'about.teamTitle': 'Von Modeliebhabern,<br>angetrieben durch KI',
      'about.teamDesc': 'Ein kleines Team mit einer Mission: Stil demokratisieren.',
      'about.cta': 'Dupes entdecken',
      'faq.eyebrow': 'Support', 'faq.title': 'H\u00e4ufige Fragen',
      'faq.q1': 'Wie findet die KI Dupes?', 'faq.a1': 'Unsere KI analysiert jedes Item \u2014 Foto, Link oder Beschreibung \u2014 und vergleicht in Echtzeit.',
      'faq.q2': 'Sind die Links Affiliate?', 'faq.a2': 'Einige sind Affiliate-Links, was uns hilft, ALTERE kostenlos zu halten.',
      'faq.q3': 'Ist ALTERE kostenlos?', 'faq.a3': 'Ja, ALTERE ist v\u00f6llig kostenlos. Unbegrenzte Suchen, Speichern und Teilen.',
      'faq.q4': 'Wie genau sind die Prozentwerte?', 'faq.a4': '\u00dcber 90% = visuell sehr nah; 80\u201390% = starke \u00c4hnlichkeit.',
      'faq.q5': 'Kann ich einen Shop vorschlagen?', 'faq.a5': 'Absolut! Schick uns den Namen. Uniqlo, Arket und Massimo Dutti sind geplant.',
      'reviews.eyebrow': 'Bewertungen', 'reviews.title': 'Geliebt von Modefans',
      'reviews.r1.quote': '\u201eEin perfektes Bottega-Dupe gefunden \u2014 niemand sah den Unterschied!\u201c', 'reviews.r1.name': 'Sophie M.', 'reviews.r1.location': 'Amsterdam, NL',
      'reviews.r2.quote': '\u201eIch nutze ALTERE bei jedem Instagram-Spot.\u201c', 'reviews.r2.name': 'James T.', 'reviews.r2.location': 'London, UK',
      'reviews.r3.quote': '\u201eAls Stylistin ist das meine Geheimwaffe.\u201c', 'reviews.r3.name': 'Amara K.', 'reviews.r3.location': 'Paris, FR',
      'reviews.r4.quote': '\u201eMax Mara Mantel f\u00fcr \u20ac900, fast identisch bei H&M f\u00fcr \u20ac89!\u201c', 'reviews.r4.name': 'Luca R.', 'reviews.r4.location': 'Mailand, IT',
      'reviews.r5.quote': '\u201eEndlich ein Dupe-Finder, der wirklich funktioniert.\u201c', 'reviews.r5.name': 'Elena V.', 'reviews.r5.location': 'Barcelona, ES',
      'reviews.r6.quote': '\u201eMeine Freunde sind besessen. Wir teilen t\u00e4glich Dupes.\u201c', 'reviews.r6.name': 'Noah B.', 'reviews.r6.location': 'Berlin, DE',
      'results.eyebrow': 'Trending Dupes',
      'results.title': 'Luxus-Looks, faire Preise',
      'results.subtitle': 'Unsere KI scannt t\u00e4glich tausende Produkte.',
      'filter.category': 'Kategorie', 'filter.bags': 'Taschen', 'filter.shoes': 'Schuhe', 'filter.clothing': 'Kleidung', 'filter.jewellery': 'Schmuck', 'filter.accessories': 'Accessoires',
      'filter.price': 'Preis', 'filter.all': 'Alle', 'filter.store': 'Shop', 'filter.allStores': 'Alle Shops', 'filter.sortBy': 'Sortieren',
      'sort.match': 'Beste \u00dcbereinstimmung', 'sort.priceAsc': 'Preis: aufsteigend', 'sort.priceDesc': 'Preis: absteigend', 'sort.saving': 'Gr\u00f6\u00dfte Ersparnis',
      'how.eyebrow': 'So funktioniert\u2019s', 'how.title': 'Drei Schritte zum Dupe',
      'how.step1.title': 'Hochladen oder einf\u00fcgen', 'how.step1.desc': 'Foto, Link oder Beschreibung teilen.',
      'how.step2.title': 'KI-Analyse', 'how.step2.desc': 'In Sekunden zerlegt.',
      'how.step3.title': 'Dupes shoppen', 'how.step3.desc': 'Sortierte Alternativen mit Match-Scores.',
      'waitlist.eyebrow': 'Fr\u00fcher Zugang', 'waitlist.title': 'Sei der Erste<br>beim Launch',
      'waitlist.sub': 'Tausende Modefans sind schon dabei.',
      'waitlist.placeholder': 'Deine E-Mail', 'waitlist.btn': 'Beitreten',
      'waitlist.hint': 'Kein Spam. Jederzeit abmelden.',
      'waitlist.success.title': 'Du bist dabei', 'waitlist.success.desc': 'Wir melden uns beim Launch.',
      'saved.back': 'Zur\u00fcck', 'saved.eyebrow': 'Deine Sammlung', 'saved.title': 'Gespeichert', 'saved.clearAll': 'Alle l\u00f6schen',
      'saved.empty': 'Noch nichts gespeichert', 'saved.emptyHint': 'Tippe auf das Herz',
      'footer.tagline': 'KI-Mode-Dupe-Finder. Luxus-\u00c4sthetik, faire Preise.',
      'footer.explore': 'Entdecken', 'footer.trending': 'Trending', 'footer.newArrivals': 'Neu', 'footer.collections': 'Kollektionen',
      'footer.company': 'Unternehmen', 'footer.about': '\u00dcber uns', 'footer.careers': 'Karriere', 'footer.privacy': 'Datenschutz', 'footer.terms': 'AGB',
      'toast.saved': 'Gespeichert', 'toast.removed': 'Entfernt', 'toast.cleared': 'Alles gel\u00f6scht',
      'search.searching': 'Suche...', 'search.joining': 'Anmelden...',
      'results.ai.eyebrow': 'KI-Ergebnisse', 'results.ai.title': 'Deine Dupes sind bereit', 'results.bestDupe': 'Bestes Dupe', 'results.moreAlts': 'Spotted Alternatives',
      'results.loading.title': 'Unsere KI analysiert\u2026', 'results.loading.sub': '6 Shops werden durchsucht',
      'reverse.loading': 'Identifiziere Original\u2026', 'reverse.loadingSub': 'Abgleich mit Designer-Kollektionen', 'reverse.eyebrow': 'Original Identifiziert', 'reverse.title': 'Original gefunden', 'reverse.for': 'Original f\u00fcr', 'reverse.originalLabel': 'Das Original', 'reverse.identifiedAs': 'Identifiziert als', 'reverse.dupeBelow': 'Erschwingliche Alternativen unten',
      'share.whatsapp': 'WhatsApp', 'share.copy': 'Link kopieren', 'share.copied': 'Kopiert!',
      'share.text': 'Schau dir dieses Dupe an: {name} von {store} f\u00fcr {price} \u2014 gefunden auf ALTERE',
      'share.results': 'Teilen', 'share.story': 'F\u00fcr Stories herunterladen', 'share.story.footer': 'Mit ALTERE gefunden', 'share.story.downloaded': 'Bild heruntergeladen',
      'invite.eyebrow': 'Sag\u2019s weiter', 'invite.title': 'ALTERE mit Freunden teilen', 'invite.sub': 'Jemand, der Mode liebt aber nicht zu viel zahlen will?', 'invite.copyLink': 'Link kopieren',
      'invite.message': 'Schau dir ALTERE an \u2014 KI-Dupe-Finder f\u00fcr Mode!',
      'auth.title': 'Bei ALTERE anmelden', 'auth.subtitle': 'Erstelle ein kostenloses Konto.', 'auth.email': 'E-Mail', 'auth.name': 'Name', 'auth.create': 'Konto erstellen', 'auth.signout': 'Abmelden', 'auth.welcome': 'Willkommen!', 'auth.signedOut': 'Abgemeldet', 'auth.invalidEmail': 'Ung\u00fcltige E-Mail.', 'auth.invalidName': 'Name erforderlich.',
      'error.daily': 'Tageslimit erreicht \u2014 komm morgen wieder',
      'error.network': 'Etwas ist schiefgelaufen. Versuche es gleich erneut.'
    },
    es: {
      'nav.discover': 'Descubre', 'nav.brands': 'Marcas', 'nav.saved': 'Guardados', 'nav.signin': 'Iniciar sesi\u00f3n',
      'hero.eyebrow': 'Descubrimiento de Moda con IA',
      'hero.headline': 'Detecta.<br>Lo encontramos.',
      'hero.sub': 'Describe cualquier prenda y nuestra IA identifica el original de lujo \u2014 m\u00e1s alternativas asequibles.',
      'search.tab.link': 'Pegar enlace', 'search.tab.upload': 'Subir foto', 'search.tab.text': 'Encontrar dupes',
      'search.placeholder.link': 'Pega la URL de un producto...',
      'search.placeholder.text': 'Describe el art\u00edculo, ej. "falda midi de sat\u00e9n crema"...',
      'search.btn': 'Encontrar dupes',
      'search.tab.reverse': 'Encontrar original', 'search.btnReverse': 'Encontrar original', 'search.placeholder.reverse': 'Describe tu art\u00edculo, ej. "Bolso acolchado con cadena de Zara"...',
      'reverse.placeholder.link': 'Pega la URL de un producto...',
      'search.upload.hint': 'Arrastra o <strong>explora</strong>',
      'search.upload.formats': 'JPG, PNG o WEBP hasta 10 MB',
      'search.upload.ready': 'Listo para buscar',
      'search.status': 'La IA est\u00e1 buscando',
      'search.tab.camera': 'Hacer foto', 'camera.start': 'Toca para abrir c\u00e1mara', 'camera.hint': 'Apunta a un art\u00edculo de moda', 'camera.retake': 'Repetir', 'camera.use': 'Encontrar dupes', 'camera.error': 'No se puede acceder a la c\u00e1mara.',
      'recent.label': 'Reciente', 'recent.clear': 'Limpiar',
      'trending.label': 'Trending ahora',
      'hero.searching': 'Buscando en', 'hero.scroll': 'Desliza para explorar',
      'dotd.eyebrow': 'Hallazgo del D\u00eda', 'dotd.original': 'El Original', 'dotd.dupe': 'Mejor Dupe', 'dotd.vs': 'VS', 'dotd.btn': 'M\u00e1s dupes',
      'calc.eyebrow': 'Calculadora', 'calc.title': '\u00bfCu\u00e1nto puedes ahorrar?', 'calc.sub': 'Ve qu\u00e9 pasa al cambiar lujo por dupes inteligentes.', 'calc.budget': 'Presupuesto mensual', 'calc.perMonth': 'Por mes', 'calc.perYear': 'Por a\u00f1o', 'calc.fiveYears': 'En 5 a\u00f1os', 'calc.note': 'Basado en 68% de ahorro promedio.',
      'proof.dupes': 'dupes encontrados hoy', 'proof.shoppers': 'compradores felices', 'proof.saved': 'ahorrados esta semana', 'press.label': 'Visto en',
      'celeb.eyebrow': 'Inspiraci\u00f3n', 'celeb.title': 'Consigue el look de celebridad', 'celeb.sub': 'Explora las est\u00e9ticas m\u00e1s buscadas.', 'celeb.btn': 'Encontrar dupes',
      'celeb.c1.name': 'Quiet Luxury', 'celeb.c1.desc': 'Elegancia discreta. Tonos neutros, cachemira y siluetas limpias.',
      'celeb.c2.name': 'Street Chic', 'celeb.c2.desc': 'Audaz y sin esfuerzo. Blazers oversize, cuero, sneakers.',
      'celeb.c3.name': 'Old Money', 'celeb.c3.desc': 'Preppy con clase. Abrigos de lana, perlas, mocasines.',
      'celeb.c4.name': 'French Girl', 'celeb.c4.desc': 'Chic sin esfuerzo. Rayas bretonas, faldas midi, ballerinas.',
      'cookie.text': 'Usamos cookies para mejorar tu experiencia.', 'cookie.accept': 'Aceptar todo', 'cookie.manage': 'Gestionar',
      'about.mission': 'Est\u00e9tica de lujo, precios accesibles.', 'about.storyEyebrow': 'Nuestra Historia', 'about.storyTitle': 'La moda debe ser para todos',
      'about.storyP1': 'ALTERE naci\u00f3 de la frustraci\u00f3n: enamorarte de una pieza de pasarela y ver el precio.',
      'about.storyP2': 'As\u00ed que creamos una IA que ve la moda como un estilista \u2014 analizando tela, corte, color y silueta.',
      'about.howEyebrow': 'La Tecnolog\u00eda', 'about.howTitle': 'C\u00f3mo funciona nuestra IA',
      'about.step1Title': 'Deconstrucci\u00f3n visual', 'about.step1Desc': 'Nuestro modelo descompone cada art\u00edculo en atributos clave.',
      'about.step2Title': 'Coincidencia entre tiendas', 'about.step2Desc': 'Escaneamos Zara, H&M, Mango, ASOS, COS y & Other Stories en tiempo real.',
      'about.step3Title': 'Clasificaci\u00f3n inteligente', 'about.step3Desc': 'Resultados ordenados por precisi\u00f3n, ahorro y disponibilidad.',
      'about.teamEyebrow': 'Qui\u00e9nes Somos', 'about.teamTitle': 'Fundado por amantes de la moda,<br>impulsado por IA',
      'about.teamDesc': 'Un peque\u00f1o equipo con una misi\u00f3n: democratizar el estilo.',
      'about.cta': 'Empezar a descubrir',
      'faq.eyebrow': 'Soporte', 'faq.title': 'Preguntas frecuentes',
      'faq.q1': '\u00bfC\u00f3mo encuentra dupes la IA?', 'faq.a1': 'Nuestra IA analiza cada art\u00edculo y compara miles de productos en tiempo real.',
      'faq.q2': '\u00bfSon enlaces de afiliado?', 'faq.a2': 'Algunos pueden ser de afiliado, lo que nos ayuda a mantener ALTERE gratuito.',
      'faq.q3': '\u00bfALTERE es gratis?', 'faq.a3': 'S\u00ed, ALTERE es totalmente gratuito. B\u00fasquedas ilimitadas, guardar y compartir.',
      'faq.q4': '\u00bfQu\u00e9 tan precisos son los porcentajes?', 'faq.a4': 'Sobre 90% = visualmente muy cerca; 80\u201390% = fuerte parecido.',
      'faq.q5': '\u00bfPuedo sugerir una tienda?', 'faq.a5': '\u00a1Por supuesto! Uniqlo, Arket y Massimo Dutti est\u00e1n en nuestra hoja de ruta.',
      'reviews.eyebrow': 'Rese\u00f1as', 'reviews.title': 'Amado por amantes de la moda',
      'reviews.r1.quote': '\u00abEncontr\u00e9 un dupe perfecto de Bottega \u2014 nadie not\u00f3 la diferencia. \u00a1\u20ac2,000 ahorrados!\u00bb', 'reviews.r1.name': 'Sophie M.', 'reviews.r1.location': '\u00c1msterdam, NL',
      'reviews.r2.quote': '\u00abUso ALTERE cada vez que veo algo en Instagram.\u00bb', 'reviews.r2.name': 'James T.', 'reviews.r2.location': 'Londres, UK',
      'reviews.r3.quote': '\u00abComo estilista, es mi arma secreta.\u00bb', 'reviews.r3.name': 'Amara K.', 'reviews.r3.location': 'Par\u00eds, FR',
      'reviews.r4.quote': '\u00abFoto de un Max Mara de \u20ac900 y encontr\u00e9 casi id\u00e9ntico en H&M por \u20ac89.\u00bb', 'reviews.r4.name': 'Luca R.', 'reviews.r4.location': 'Mil\u00e1n, IT',
      'reviews.r5.quote': '\u00abPor fin un dupe finder que funciona.\u00bb', 'reviews.r5.name': 'Elena V.', 'reviews.r5.location': 'Barcelona, ES',
      'reviews.r6.quote': '\u00abMis amigos est\u00e1n obsesionados. Compartimos dupes a diario.\u00bb', 'reviews.r6.name': 'Noah B.', 'reviews.r6.location': 'Berl\u00edn, DE',
      'results.eyebrow': 'Dupes Trending',
      'results.title': 'Looks de lujo, precios accesibles',
      'results.subtitle': 'Nuestra IA escanea miles de productos a diario.',
      'filter.category': 'Categor\u00eda', 'filter.bags': 'Bolsos', 'filter.shoes': 'Zapatos', 'filter.clothing': 'Ropa', 'filter.jewellery': 'Joyas', 'filter.accessories': 'Accesorios',
      'filter.price': 'Precio', 'filter.all': 'Todo', 'filter.store': 'Tienda', 'filter.allStores': 'Todas las Tiendas', 'filter.sortBy': 'Ordenar',
      'sort.match': 'Mejor coincidencia', 'sort.priceAsc': 'Precio: ascendente', 'sort.priceDesc': 'Precio: descendente', 'sort.saving': 'Mayor ahorro',
      'how.eyebrow': 'C\u00f3mo funciona', 'how.title': 'Tres pasos al dupe perfecto',
      'how.step1.title': 'Sube o pega', 'how.step1.desc': 'Comparte foto, enlace o descripci\u00f3n.',
      'how.step2.title': 'An\u00e1lisis IA', 'how.step2.desc': 'Tela, corte, color y silueta en segundos.',
      'how.step3.title': 'Compra los dupes', 'how.step3.desc': 'Alternativas con scores y enlaces directos.',
      'waitlist.eyebrow': 'Acceso Anticipado', 'waitlist.title': 'S\u00e9 el primero<br>en el lanzamiento',
      'waitlist.sub': '\u00danete a miles ya en la lista.',
      'waitlist.placeholder': 'Tu email', 'waitlist.btn': 'Unirme',
      'waitlist.hint': 'Sin spam. Cancela cuando quieras.',
      'waitlist.success.title': 'Est\u00e1s en la lista', 'waitlist.success.desc': 'Te avisaremos al lanzamiento.',
      'saved.back': 'Atr\u00e1s', 'saved.eyebrow': 'Tu Colecci\u00f3n', 'saved.title': 'Guardados', 'saved.clearAll': 'Limpiar todo',
      'saved.empty': 'A\u00fan nada guardado', 'saved.emptyHint': 'Toca el coraz\u00f3n para guardar',
      'footer.tagline': 'Dupe finder de moda con IA. Est\u00e9tica de lujo, precios accesibles.',
      'footer.explore': 'Explorar', 'footer.trending': 'Trending', 'footer.newArrivals': 'Novedades', 'footer.collections': 'Colecciones',
      'footer.company': 'Empresa', 'footer.about': 'Sobre nosotros', 'footer.careers': 'Empleo', 'footer.privacy': 'Privacidad', 'footer.terms': 'T\u00e9rminos',
      'toast.saved': 'Guardado', 'toast.removed': 'Eliminado', 'toast.cleared': 'Todo limpio',
      'search.searching': 'Buscando...', 'search.joining': 'Uni\u00e9ndote...',
      'results.ai.eyebrow': 'Resultados IA', 'results.ai.title': 'Tus dupes est\u00e1n listos', 'results.bestDupe': 'Mejor Dupe', 'results.moreAlts': 'Spotted Alternatives',
      'results.loading.title': 'Nuestra IA est\u00e1 analizando\u2026', 'results.loading.sub': 'Buscando en 6 tiendas',
      'reverse.loading': 'Identificando original\u2026', 'reverse.loadingSub': 'Comparando con colecciones', 'reverse.eyebrow': 'Original Identificado', 'reverse.title': 'Original encontrado', 'reverse.for': 'Original identificado para', 'reverse.originalLabel': 'El Original', 'reverse.identifiedAs': 'Identificado como', 'reverse.dupeBelow': 'Alternativas asequibles abajo',
      'share.whatsapp': 'WhatsApp', 'share.copy': 'Copiar enlace', 'share.copied': '\u00a1Copiado!',
      'share.text': 'Mira este dupe: {name} de {store} por {price} \u2014 encontrado en ALTERE',
      'share.results': 'Compartir', 'share.story': 'Descargar para Stories', 'share.story.footer': 'Encontrado con ALTERE', 'share.story.downloaded': 'Imagen descargada',
      'invite.eyebrow': 'Corre la Voz', 'invite.title': 'Comparte ALTERE', 'invite.sub': '\u00bfConoces a alguien que ame la moda pero no quiera pagar de m\u00e1s?', 'invite.copyLink': 'Copiar enlace',
      'invite.message': 'Mira ALTERE \u2014 \u00a1encuentra dupes de lujo a precios accesibles!',
      'auth.title': 'Iniciar sesi\u00f3n en ALTERE', 'auth.subtitle': 'Crea una cuenta gratuita.', 'auth.email': 'Email', 'auth.name': 'Nombre', 'auth.create': 'Crear cuenta', 'auth.signout': 'Cerrar sesi\u00f3n', 'auth.welcome': '\u00a1Bienvenido!', 'auth.signedOut': 'Sesi\u00f3n cerrada', 'auth.invalidEmail': 'Email inv\u00e1lido.', 'auth.invalidName': 'Nombre requerido.',
      'error.daily': 'L\u00edmite diario alcanzado \u2014 vuelve ma\u00f1ana',
      'error.network': 'Algo sali\u00f3 mal. Int\u00e9ntalo en un momento.'
    },
    it: {
      'nav.discover': 'Scopri', 'nav.brands': 'Marchi', 'nav.saved': 'Salvati', 'nav.signin': 'Accedi',
      'hero.eyebrow': 'Scoperta Moda con IA',
      'hero.headline': 'Individualo.<br>Lo troviamo.',
      'hero.sub': 'Descrivi qualsiasi capo e la nostra IA identifica l\u2019originale di lusso \u2014 pi\u00f9 alternative accessibili.',
      'search.tab.link': 'Incolla link', 'search.tab.upload': 'Carica foto', 'search.tab.text': 'Trova dupes',
      'search.placeholder.link': 'Incolla l\u2019URL del prodotto...',
      'search.placeholder.text': 'Descrivi l\u2019articolo, es. "gonna midi in raso crema"...',
      'search.btn': 'Trova dupes',
      'search.tab.reverse': 'Trova originale', 'search.btnReverse': 'Trova originale', 'search.placeholder.reverse': 'Descrivi il tuo articolo, es. "Borsa trapuntata con catena Zara"...',
      'reverse.placeholder.link': 'Incolla l\u2019URL del prodotto...',
      'search.upload.hint': 'Trascina o <strong>sfoglia</strong>',
      'search.upload.formats': 'JPG, PNG o WEBP fino a 10 MB',
      'search.upload.ready': 'Pronto per cercare',
      'search.status': 'L\u2019IA sta cercando',
      'search.tab.camera': 'Scatta foto', 'camera.start': 'Tocca per aprire la fotocamera', 'camera.hint': 'Punta su un capo', 'camera.retake': 'Ripeti', 'camera.use': 'Trova dupes', 'camera.error': 'Impossibile accedere alla fotocamera.',
      'recent.label': 'Recenti', 'recent.clear': 'Cancella',
      'trending.label': 'Di tendenza',
      'hero.searching': 'Ricerca in', 'hero.scroll': 'Scorri per esplorare',
      'dotd.eyebrow': 'Pezzo del Giorno', 'dotd.original': 'L\u2019Originale', 'dotd.dupe': 'Miglior Dupe', 'dotd.vs': 'VS', 'dotd.btn': 'Pi\u00f9 dupes',
      'calc.eyebrow': 'Calcolatore', 'calc.title': 'Quanto puoi risparmiare?', 'calc.sub': 'Vedi cosa succede sostituendo lusso con dupes intelligenti.', 'calc.budget': 'Budget moda mensile', 'calc.perMonth': 'Al mese', 'calc.perYear': 'All\u2019anno', 'calc.fiveYears': 'In 5 anni', 'calc.note': 'Basato su risparmio medio del 68%.',
      'proof.dupes': 'dupes trovati oggi', 'proof.shoppers': 'acquirenti felici', 'proof.saved': 'risparmiati questa settimana', 'press.label': 'Visto su',
      'celeb.eyebrow': 'Ispirazione', 'celeb.title': 'Ottieni il look celebrit\u00e0', 'celeb.sub': 'Esplora le estetiche pi\u00f9 cercate.', 'celeb.btn': 'Trova dupes',
      'celeb.c1.name': 'Quiet Luxury', 'celeb.c1.desc': 'Eleganza discreta. Toni neutri, cashmere, silhouette pulite.',
      'celeb.c2.name': 'Street Chic', 'celeb.c2.desc': 'Audace e disinvolto. Blazer oversize, pelle, sneakers.',
      'celeb.c3.name': 'Old Money', 'celeb.c3.desc': 'Preppy raffinato. Cappotti di lana, perle, mocassini.',
      'celeb.c4.name': 'French Girl', 'celeb.c4.desc': 'Chic senza sforzo. Righe bretoni, gonne midi, ballerine.',
      'cookie.text': 'Usiamo cookie per migliorare la tua esperienza.', 'cookie.accept': 'Accetta tutto', 'cookie.manage': 'Gestisci',
      'about.mission': 'Estetica di lusso, prezzi accessibili.', 'about.storyEyebrow': 'La Nostra Storia', 'about.storyTitle': 'La moda deve essere per tutti',
      'about.storyP1': 'ALTERE \u00e8 nato da una frustrazione: innamorarsi di un pezzo da passerella e vedere il prezzo.',
      'about.storyP2': 'Cos\u00ec abbiamo creato un\u2019IA che vede la moda come uno stilista \u2014 analizza tessuto, taglio, colore e silhouette.',
      'about.howEyebrow': 'La Tecnologia', 'about.howTitle': 'Come funziona la nostra IA',
      'about.step1Title': 'Decostruzione visiva', 'about.step1Desc': 'Il nostro modello scompone ogni articolo in attributi chiave.',
      'about.step2Title': 'Corrispondenza tra negozi', 'about.step2Desc': 'Scansioniamo Zara, H&M, Mango, ASOS, COS e & Other Stories in tempo reale.',
      'about.step3Title': 'Classifica intelligente', 'about.step3Desc': 'Risultati ordinati per precisione, risparmio e disponibilit\u00e0.',
      'about.teamEyebrow': 'Chi Siamo', 'about.teamTitle': 'Fondato da appassionati,<br>alimentato dall\u2019IA',
      'about.teamDesc': 'Un piccolo team con una missione: democratizzare lo stile.',
      'about.cta': 'Inizia a scoprire',
      'faq.eyebrow': 'Supporto', 'faq.title': 'Domande frequenti',
      'faq.q1': 'Come trova dupes l\u2019IA?', 'faq.a1': 'La nostra IA analizza ogni articolo e confronta migliaia di prodotti in tempo reale.',
      'faq.q2': 'Sono link di affiliazione?', 'faq.a2': 'Alcuni possono essere di affiliazione, ci aiuta a mantenere ALTERE gratuito.',
      'faq.q3': 'ALTERE \u00e8 gratis?', 'faq.a3': 'S\u00ec, ALTERE \u00e8 totalmente gratuito. Ricerche illimitate, salvataggi e condivisioni.',
      'faq.q4': 'Quanto sono precise le percentuali?', 'faq.a4': 'Oltre 90% = visivamente molto vicino; 80\u201390% = forte somiglianza.',
      'faq.q5': 'Posso suggerire un negozio?', 'faq.a5': 'Assolutamente! Uniqlo, Arket e Massimo Dutti sono nella roadmap.',
      'reviews.eyebrow': 'Recensioni', 'reviews.title': 'Amato dagli appassionati di moda',
      'reviews.r1.quote': '\u00abTrovato un dupe Bottega perfetto \u2014 nessuno ha visto la differenza. \u20ac2.000 risparmiati!\u00bb', 'reviews.r1.name': 'Sophie M.', 'reviews.r1.location': 'Amsterdam, NL',
      'reviews.r2.quote': '\u00abUso ALTERE ogni volta che vedo qualcosa su Instagram.\u00bb', 'reviews.r2.name': 'James T.', 'reviews.r2.location': 'Londra, UK',
      'reviews.r3.quote': '\u00abCome stilista \u00e8 la mia arma segreta.\u00bb', 'reviews.r3.name': 'Amara K.', 'reviews.r3.location': 'Parigi, FR',
      'reviews.r4.quote': '\u00abFoto di un Max Mara da \u20ac900 e trovato quasi identico da H&M per \u20ac89.\u00bb', 'reviews.r4.name': 'Luca R.', 'reviews.r4.location': 'Milano, IT',
      'reviews.r5.quote': '\u00abFinalmente un dupe finder che funziona.\u00bb', 'reviews.r5.name': 'Elena V.', 'reviews.r5.location': 'Barcellona, ES',
      'reviews.r6.quote': '\u00abI miei amici sono ossessionati. Condividiamo dupes ogni giorno.\u00bb', 'reviews.r6.name': 'Noah B.', 'reviews.r6.location': 'Berlino, DE',
      'results.eyebrow': 'Dupes di Tendenza',
      'results.title': 'Look di lusso, prezzi accessibili',
      'results.subtitle': 'La nostra IA scansiona migliaia di prodotti ogni giorno.',
      'filter.category': 'Categoria', 'filter.bags': 'Borse', 'filter.shoes': 'Scarpe', 'filter.clothing': 'Abbigliamento', 'filter.jewellery': 'Gioielli', 'filter.accessories': 'Accessori',
      'filter.price': 'Prezzo', 'filter.all': 'Tutto', 'filter.store': 'Negozio', 'filter.allStores': 'Tutti i Negozi', 'filter.sortBy': 'Ordina per',
      'sort.match': 'Miglior corrispondenza', 'sort.priceAsc': 'Prezzo: crescente', 'sort.priceDesc': 'Prezzo: decrescente', 'sort.saving': 'Maggior risparmio',
      'how.eyebrow': 'Come funziona', 'how.title': 'Tre passi al dupe perfetto',
      'how.step1.title': 'Carica o incolla', 'how.step1.desc': 'Condividi foto, link o descrizione.',
      'how.step2.title': 'Analisi IA', 'how.step2.desc': 'Tessuto, taglio, colore in secondi.',
      'how.step3.title': 'Acquista i dupes', 'how.step3.desc': 'Alternative con punteggi e link diretti.',
      'waitlist.eyebrow': 'Accesso Anticipato', 'waitlist.title': 'Sii il primo a saperlo<br>al lancio',
      'waitlist.sub': 'Unisciti a migliaia gi\u00e0 in lista.',
      'waitlist.placeholder': 'La tua email', 'waitlist.btn': 'Unisciti',
      'waitlist.hint': 'Niente spam. Cancellati quando vuoi.',
      'waitlist.success.title': 'Sei in lista', 'waitlist.success.desc': 'Ti avviseremo al lancio.',
      'saved.back': 'Indietro', 'saved.eyebrow': 'La Tua Collezione', 'saved.title': 'Salvati', 'saved.clearAll': 'Cancella tutto',
      'saved.empty': 'Nessun articolo salvato', 'saved.emptyHint': 'Tocca il cuore per salvare',
      'footer.tagline': 'Dupe finder moda con IA. Estetica di lusso, prezzi accessibili.',
      'footer.explore': 'Esplora', 'footer.trending': 'Tendenza', 'footer.newArrivals': 'Novit\u00e0', 'footer.collections': 'Collezioni',
      'footer.company': 'Azienda', 'footer.about': 'Chi siamo', 'footer.careers': 'Carriere', 'footer.privacy': 'Privacy', 'footer.terms': 'Termini',
      'toast.saved': 'Salvato', 'toast.removed': 'Rimosso', 'toast.cleared': 'Tutto cancellato',
      'search.searching': 'Ricerca...', 'search.joining': 'Iscrizione...',
      'results.ai.eyebrow': 'Risultati IA', 'results.ai.title': 'I tuoi dupes sono pronti', 'results.bestDupe': 'Miglior Dupe', 'results.moreAlts': 'Spotted Alternatives',
      'results.loading.title': 'La nostra IA sta analizzando\u2026', 'results.loading.sub': 'Cerco in 6 negozi',
      'reverse.loading': 'Identifico l\u2019originale\u2026', 'reverse.loadingSub': 'Confronto con collezioni', 'reverse.eyebrow': 'Originale Identificato', 'reverse.title': 'Originale trovato', 'reverse.for': 'Originale identificato per', 'reverse.originalLabel': 'L\u2019Originale', 'reverse.identifiedAs': 'Identificato come', 'reverse.dupeBelow': 'Alternative accessibili sotto',
      'share.whatsapp': 'WhatsApp', 'share.copy': 'Copia link', 'share.copied': 'Copiato!',
      'share.text': 'Guarda questo dupe: {name} da {store} per {price} \u2014 trovato su ALTERE',
      'share.results': 'Condividi', 'share.story': 'Scarica per Stories', 'share.story.footer': 'Trovato con ALTERE', 'share.story.downloaded': 'Immagine scaricata',
      'invite.eyebrow': 'Diffondi la Voce', 'invite.title': 'Condividi ALTERE', 'invite.sub': 'Conosci qualcuno che ama la moda ma odia pagare troppo?', 'invite.copyLink': 'Copia link',
      'invite.message': 'Guarda ALTERE \u2014 trova dupes di lusso a prezzi accessibili!',
      'auth.title': 'Accedi a ALTERE', 'auth.subtitle': 'Crea un account gratuito.', 'auth.email': 'Email', 'auth.name': 'Nome', 'auth.create': 'Crea account', 'auth.signout': 'Esci', 'auth.welcome': 'Benvenuto!', 'auth.signedOut': 'Disconnesso', 'auth.invalidEmail': 'Email non valida.', 'auth.invalidName': 'Nome richiesto.',
      'error.daily': 'Limite giornaliero raggiunto \u2014 torna domani',
      'error.network': 'Qualcosa \u00e8 andato storto. Riprova tra un momento.'
    },
    ar: {
      'nav.discover': '\u0627\u0643\u062a\u0634\u0641', 'nav.brands': '\u0627\u0644\u0639\u0644\u0627\u0645\u0627\u062a', 'nav.saved': '\u0645\u062d\u0641\u0648\u0638', 'nav.signin': '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644',
      'hero.eyebrow': '\u0627\u0643\u062a\u0634\u0627\u0641 \u0627\u0644\u0645\u0648\u0636\u0629 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a',
      'hero.headline': '\u0627\u0643\u062a\u0634\u0641\u0647.<br>\u0633\u0646\u062c\u062f\u0647 \u0644\u0643.',
      'hero.sub': '\u0635\u0641 \u0623\u064a \u0642\u0637\u0639\u0629 \u0648\u0627\u0644\u0630\u0643\u0627\u0621 \u0633\u064a\u062d\u062f\u062f \u0627\u0644\u0623\u0635\u0644 \u0627\u0644\u0641\u0627\u062e\u0631 \u2014 \u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u0628\u062f\u0627\u0626\u0644 \u0641\u064a \u0627\u0644\u0645\u062a\u0646\u0627\u0648\u0644.',
      'search.tab.link': '\u0644\u0635\u0642 \u0631\u0627\u0628\u0637', 'search.tab.upload': '\u0631\u0641\u0639 \u0635\u0648\u0631\u0629', 'search.tab.text': '\u0627\u0628\u062d\u062b \u0639\u0646 \u0628\u062f\u0627\u0626\u0644',
      'search.placeholder.link': '\u0627\u0644\u0635\u0642 \u0631\u0627\u0628\u0637 \u0645\u0646\u062a\u062c...',
      'search.placeholder.text': '\u0635\u0641 \u0627\u0644\u0642\u0637\u0639\u0629...',
      'search.btn': '\u0627\u0628\u062d\u062b \u0639\u0646 \u0628\u062f\u0627\u0626\u0644',
      'search.tab.reverse': '\u0627\u0628\u062d\u062b \u0639\u0646 \u0627\u0644\u0623\u0635\u0644', 'search.btnReverse': '\u0627\u0628\u062d\u062b \u0639\u0646 \u0627\u0644\u0623\u0635\u0644', 'search.placeholder.reverse': '\u0635\u0641 \u0642\u0637\u0639\u062a\u0643...',
      'reverse.placeholder.link': '\u0627\u0644\u0635\u0642 \u0631\u0627\u0628\u0637 \u0645\u0646\u062a\u062c...',
      'search.upload.hint': '\u0627\u0633\u062d\u0628 \u0623\u0648 <strong>\u062a\u0635\u0641\u062d</strong>',
      'search.upload.formats': 'JPG \u0623\u0648 PNG \u0623\u0648 WEBP \u062d\u062a\u0649 10 MB',
      'search.upload.ready': '\u062c\u0627\u0647\u0632 \u0644\u0644\u0628\u062d\u062b',
      'search.status': '\u0627\u0644\u0630\u0643\u0627\u0621 \u064a\u0628\u062d\u062b',
      'search.tab.camera': '\u0627\u0644\u062a\u0642\u0637 \u0635\u0648\u0631\u0629', 'camera.start': '\u0627\u0646\u0642\u0631 \u0644\u0641\u062a\u062d \u0627\u0644\u0643\u0627\u0645\u064a\u0631\u0627', 'camera.hint': '\u0648\u062c\u0647 \u0625\u0644\u0649 \u0623\u064a \u0642\u0637\u0639\u0629', 'camera.retake': '\u0623\u0639\u062f', 'camera.use': '\u0627\u0628\u062d\u062b', 'camera.error': '\u0644\u0627 \u064a\u0645\u0643\u0646 \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0627\u0644\u0643\u0627\u0645\u064a\u0631\u0627.',
      'recent.label': '\u0627\u0644\u0623\u062e\u064a\u0631', 'recent.clear': '\u0645\u0633\u062d',
      'trending.label': '\u0627\u0644\u0631\u0627\u0626\u062c \u0627\u0644\u0622\u0646',
      'hero.searching': '\u0627\u0644\u0628\u062d\u062b \u0641\u064a', 'hero.scroll': '\u0645\u0631\u0631 \u0644\u0644\u0627\u0633\u062a\u0643\u0634\u0627\u0641',
      'dotd.eyebrow': '\u0648\u062c\u0647 \u0627\u0644\u064a\u0648\u0645', 'dotd.original': '\u0627\u0644\u0623\u0635\u0644', 'dotd.dupe': '\u0623\u0641\u0636\u0644 \u0628\u062f\u064a\u0644', 'dotd.vs': '\u0636\u062f', 'dotd.btn': '\u0627\u0644\u0645\u0632\u064a\u062f',
      'calc.eyebrow': '\u062d\u0627\u0633\u0628\u0629', 'calc.title': '\u0643\u0645 \u062a\u0648\u0641\u0631?', 'calc.sub': '\u0634\u0627\u0647\u062f \u0627\u0644\u0641\u0631\u0642 \u0639\u0646\u062f \u0627\u0644\u0627\u0633\u062a\u0628\u062f\u0627\u0644.', 'calc.budget': '\u0627\u0644\u0645\u064a\u0632\u0627\u0646\u064a\u0629 \u0627\u0644\u0634\u0647\u0631\u064a\u0629', 'calc.perMonth': '\u0634\u0647\u0631\u064a\u0627\u064b', 'calc.perYear': '\u0633\u0646\u0648\u064a\u0627\u064b', 'calc.fiveYears': '\u0641\u064a 5 \u0633\u0646\u0648\u0627\u062a', 'calc.note': '\u0628\u0646\u0627\u0621\u064b \u0639\u0644\u0649 \u062a\u0648\u0641\u064a\u0631 68%.',
      'proof.dupes': '\u0628\u062f\u0627\u0626\u0644 \u0627\u0644\u064a\u0648\u0645', 'proof.shoppers': '\u0645\u062a\u0633\u0648\u0642\u064a\u0646 \u0633\u0639\u062f\u0627\u0621', 'proof.saved': '\u062a\u0648\u0641\u064a\u0631\u0627\u062a \u0627\u0644\u0623\u0633\u0628\u0648\u0639', 'press.label': '\u0631\u0623\u064a\u0646\u0627 \u0641\u064a',
      'celeb.eyebrow': '\u0625\u0644\u0647\u0627\u0645', 'celeb.title': '\u0625\u0637\u0644\u0627\u0644\u0629 \u0627\u0644\u0645\u0634\u0627\u0647\u064a\u0631', 'celeb.sub': '\u0627\u0633\u062a\u0643\u0634\u0641 \u0627\u0644\u0623\u062c\u0645\u0644.', 'celeb.btn': '\u0627\u0628\u062d\u062b',
      'celeb.c1.name': '\u0627\u0644\u0641\u062e\u0627\u0645\u0629 \u0627\u0644\u0647\u0627\u062f\u0626\u0629', 'celeb.c1.desc': '\u0623\u0646\u0627\u0642\u0629 \u0628\u0633\u064a\u0637\u0629. \u0623\u0644\u0648\u0627\u0646 \u0645\u062d\u0627\u064a\u062f\u0629.',
      'celeb.c2.name': '\u0623\u0646\u0627\u0642\u0629 \u0627\u0644\u0634\u0648\u0627\u0631\u0639', 'celeb.c2.desc': '\u062c\u0631\u064a\u0626\u0629 \u0648\u0648\u0627\u062b\u0642\u0629.',
      'celeb.c3.name': '\u0641\u062e\u0627\u0645\u0629 \u0639\u0631\u064a\u0642\u0629', 'celeb.c3.desc': '\u0623\u0646\u0627\u0642\u0629 \u0648\u0635\u0642\u0644.',
      'celeb.c4.name': '\u0627\u0644\u0641\u062a\u0627\u0629 \u0627\u0644\u0641\u0631\u0646\u0633\u064a\u0629', 'celeb.c4.desc': '\u0623\u0646\u0627\u0642\u0629 \u0628\u0644\u0627 \u062c\u0647\u062f.',
      'cookie.text': '\u0646\u0633\u062a\u062e\u062f\u0645 \u0645\u0644\u0641\u0627\u062a \u062a\u0639\u0631\u064a\u0641 \u0627\u0631\u062a\u0628\u0627\u0637.', 'cookie.accept': '\u0642\u0628\u0648\u0644 \u0627\u0644\u0643\u0644', 'cookie.manage': '\u0625\u062f\u0627\u0631\u0629',
      'about.mission': '\u062c\u0645\u0627\u0644\u064a\u0627\u062a \u0641\u0627\u062e\u0631\u0629 \u0628\u0623\u0633\u0639\u0627\u0631 \u0645\u0639\u0642\u0648\u0644\u0629.', 'about.storyEyebrow': '\u0642\u0635\u062a\u0646\u0627', 'about.storyTitle': '\u0627\u0644\u0645\u0648\u0636\u0629 \u0644\u0644\u062c\u0645\u064a\u0639',
      'about.storyP1': '\u0648\u0644\u062f\u062a ALTERE \u0645\u0646 \u0627\u0644\u0625\u062d\u0628\u0627\u0637.',
      'about.storyP2': '\u0644\u0630\u0644\u0643 \u0628\u0646\u064a\u0646\u0627 \u0630\u0643\u0627\u0621\u064b \u064a\u0631\u0649 \u0627\u0644\u0645\u0648\u0636\u0629 \u0643\u0645\u0635\u0645\u0645.',
      'about.howEyebrow': '\u0627\u0644\u062a\u0642\u0646\u064a\u0629', 'about.howTitle': '\u0643\u064a\u0641 \u064a\u0639\u0645\u0644 \u0627\u0644\u0630\u0643\u0627\u0621',
      'about.step1Title': '\u062a\u0641\u0643\u064a\u0643 \u0628\u0635\u0631\u064a', 'about.step1Desc': '\u064a\u062d\u0644\u0644 \u0627\u0644\u0646\u0645\u0648\u0630\u062c \u0643\u0644 \u0642\u0637\u0639\u0629.',
      'about.step2Title': '\u0645\u0637\u0627\u0628\u0642\u0629 \u0628\u064a\u0646 \u0627\u0644\u0645\u062a\u0627\u062c\u0631', 'about.step2Desc': '\u0646\u0641\u062d\u0635 \u0623\u0644\u0641 \u0645\u0646\u062a\u062c \u0641\u0648\u0631\u064a\u0627\u064b.',
      'about.step3Title': '\u062a\u0631\u062a\u064a\u0628 \u0630\u0643\u064a', 'about.step3Desc': '\u0627\u0644\u0646\u062a\u0627\u0626\u062c \u0645\u0631\u062a\u0628\u0629 \u062d\u0633\u0628 \u0627\u0644\u062f\u0642\u0629.',
      'about.teamEyebrow': '\u0645\u0646 \u0646\u062d\u0646', 'about.teamTitle': '\u0641\u0631\u064a\u0642 \u0635\u063a\u064a\u0631<br>\u0628\u0645\u0647\u0645\u0629 \u0643\u0628\u064a\u0631\u0629',
      'about.teamDesc': '\u0631\u0633\u0627\u0644\u062a\u0646\u0627: \u062a\u0639\u0645\u064a\u0645 \u0627\u0644\u0623\u0633\u0644\u0648\u0628.',
      'about.cta': '\u0627\u0628\u062f\u0623 \u0627\u0644\u0627\u0643\u062a\u0634\u0627\u0641',
      'faq.eyebrow': '\u0627\u0644\u062f\u0639\u0645', 'faq.title': '\u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629',
      'faq.q1': '\u0643\u064a\u0641 \u064a\u062c\u062f \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0628\u062f\u0627\u0626\u0644?', 'faq.a1': '\u0627\u0644\u0630\u0643\u0627\u0621 \u064a\u062d\u0644\u0644 \u0648\u064a\u0642\u0627\u0631\u0646.',
      'faq.q2': '\u0647\u0644 \u0627\u0644\u0631\u0648\u0627\u0628\u0637 \u062a\u0627\u0628\u0639\u0629?', 'faq.a2': '\u0628\u0639\u0636\u0647\u0627 \u0644\u0625\u0628\u0642\u0627\u0621 \u0627\u0644\u062e\u062f\u0645\u0629 \u0645\u062c\u0627\u0646\u064a\u0629.',
      'faq.q3': '\u0647\u0644 ALTERE \u0645\u062c\u0627\u0646\u064a?', 'faq.a3': '\u0646\u0639\u0645\u060c \u0645\u062c\u0627\u0646\u064a \u062a\u0645\u0627\u0645\u0627\u064b.',
      'faq.q4': '\u0645\u0627 \u062f\u0642\u0629 \u0627\u0644\u0646\u0633\u0628?', 'faq.a4': '\u0641\u0648\u0642 90% = \u0642\u0631\u064a\u0628 \u062c\u062f\u0627\u064b.',
      'faq.q5': '\u0647\u0644 \u064a\u0645\u0643\u0646\u0646\u064a \u0627\u0642\u062a\u0631\u0627\u062d \u0645\u062a\u062c\u0631?', 'faq.a5': '\u0628\u0627\u0644\u062a\u0623\u0643\u064a\u062f!',
      'reviews.eyebrow': '\u0622\u0631\u0627\u0621', 'reviews.title': '\u0645\u062d\u0628\u0648\u0628 \u0644\u062f\u0649 \u0639\u0634\u0627\u0642 \u0627\u0644\u0645\u0648\u0636\u0629',
      'reviews.r1.quote': '\u00ab\u0648\u062c\u062f\u062a \u0628\u062f\u064a\u0644\u0627\u064b \u0645\u062b\u0627\u0644\u064a\u0627\u064b\u00bb', 'reviews.r1.name': '\u0633\u0648\u0641\u064a M.', 'reviews.r1.location': '\u0623\u0645\u0633\u062a\u0631\u062f\u0627\u0645\u060c \u0647\u0648\u0644\u0646\u062f\u0627',
      'reviews.r2.quote': '\u00ab\u0623\u0633\u062a\u062e\u062f\u0645 ALTERE \u062f\u0627\u0626\u0645\u0627\u064b\u00bb', 'reviews.r2.name': '\u062c\u064a\u0645\u0633 T.', 'reviews.r2.location': '\u0644\u0646\u062f\u0646\u060c \u0628\u0631\u064a\u0637\u0627\u0646\u064a\u0627',
      'reviews.r3.quote': '\u00ab\u0633\u0644\u0627\u062d\u064a \u0627\u0644\u0633\u0631\u064a\u00bb', 'reviews.r3.name': '\u0623\u0645\u0627\u0631\u0627 K.', 'reviews.r3.location': '\u0628\u0627\u0631\u064a\u0633\u060c \u0641\u0631\u0646\u0633\u0627',
      'reviews.r4.quote': '\u00ab\u0648\u0641\u0631\u062a 800 \u064a\u0648\u0631\u0648\u00bb', 'reviews.r4.name': '\u0644\u0648\u0643\u0627 R.', 'reviews.r4.location': '\u0645\u064a\u0644\u0627\u0646\u0648\u060c \u0625\u064a\u0637\u0627\u0644\u064a\u0627',
      'reviews.r5.quote': '\u00ab\u0623\u062e\u064a\u0631\u0627\u064b \u062a\u0637\u0628\u064a\u0642 \u064a\u0639\u0645\u0644\u00bb', 'reviews.r5.name': '\u0625\u064a\u0644\u064a\u0646\u0627 V.', 'reviews.r5.location': '\u0628\u0631\u0634\u0644\u0648\u0646\u0629\u060c \u0625\u0633\u0628\u0627\u0646\u064a\u0627',
      'reviews.r6.quote': '\u00ab\u0623\u0635\u062f\u0642\u0627\u0626\u064a \u0645\u0647\u0648\u0648\u0633\u0648\u0646\u00bb', 'reviews.r6.name': '\u0646\u0648\u062d B.', 'reviews.r6.location': '\u0628\u0631\u0644\u064a\u0646\u060c \u0623\u0644\u0645\u0627\u0646\u064a\u0627',
      'results.eyebrow': '\u0628\u062f\u0627\u0626\u0644 \u0631\u0627\u0626\u062c\u0629',
      'results.title': '\u0625\u0637\u0644\u0627\u0644\u0627\u062a \u0641\u0627\u062e\u0631\u0629 \u0628\u0623\u0633\u0639\u0627\u0631 \u0645\u0639\u0642\u0648\u0644\u0629',
      'results.subtitle': '\u0627\u0644\u0630\u0643\u0627\u0621 \u064a\u0641\u062d\u0635 \u0623\u0644\u0641 \u0645\u0646\u062a\u062c \u064a\u0648\u0645\u064a\u0627\u064b.',
      'filter.category': '\u0627\u0644\u0641\u0626\u0629', 'filter.bags': '\u062d\u0642\u0627\u0626\u0628', 'filter.shoes': '\u0623\u062d\u0630\u064a\u0629', 'filter.clothing': '\u0645\u0644\u0627\u0628\u0633', 'filter.jewellery': '\u0645\u062c\u0648\u0647\u0631\u0627\u062a', 'filter.accessories': '\u0625\u0643\u0633\u0633\u0648\u0627\u0631\u0627\u062a',
      'filter.price': '\u0627\u0644\u0633\u0639\u0631', 'filter.all': '\u0627\u0644\u0643\u0644', 'filter.store': '\u0627\u0644\u0645\u062a\u062c\u0631', 'filter.allStores': '\u0643\u0644 \u0627\u0644\u0645\u062a\u0627\u062c\u0631', 'filter.sortBy': '\u062a\u0631\u062a\u064a\u0628',
      'sort.match': '\u0623\u0641\u0636\u0644 \u0645\u0637\u0627\u0628\u0642\u0629', 'sort.priceAsc': '\u0627\u0644\u0633\u0639\u0631: \u062a\u0635\u0627\u0639\u062f\u064a', 'sort.priceDesc': '\u0627\u0644\u0633\u0639\u0631: \u062a\u0646\u0627\u0632\u0644\u064a', 'sort.saving': '\u0623\u0643\u0628\u0631 \u062a\u0648\u0641\u064a\u0631',
      'how.eyebrow': '\u0643\u064a\u0641 \u064a\u0639\u0645\u0644', 'how.title': '\u062b\u0644\u0627\u062b \u062e\u0637\u0648\u0627\u062a',
      'how.step1.title': '\u0627\u0631\u0641\u0639 \u0623\u0648 \u0627\u0644\u0635\u0642', 'how.step1.desc': '\u0635\u0648\u0631\u0629\u060c \u0631\u0627\u0628\u0637\u060c \u0623\u0648 \u0648\u0635\u0641.',
      'how.step2.title': '\u062a\u062d\u0644\u064a\u0644 \u0628\u0627\u0644\u0630\u0643\u0627\u0621', 'how.step2.desc': '\u0641\u064a \u062b\u0648\u0627\u0646\u064a.',
      'how.step3.title': '\u062a\u0633\u0648\u0642 \u0627\u0644\u0628\u062f\u0627\u0626\u0644', 'how.step3.desc': '\u0631\u0648\u0627\u0628\u0637 \u0645\u0628\u0627\u0634\u0631\u0629.',
      'waitlist.eyebrow': '\u0648\u0635\u0648\u0644 \u0645\u0628\u0643\u0631', 'waitlist.title': '\u0643\u0646 \u0627\u0644\u0623\u0648\u0644<br>\u0639\u0646\u062f \u0627\u0644\u0625\u0637\u0644\u0627\u0642',
      'waitlist.sub': '\u0627\u0646\u0636\u0645 \u0644\u0644\u0622\u0644\u0627\u0641.',
      'waitlist.placeholder': '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a', 'waitlist.btn': '\u0627\u0646\u0636\u0645',
      'waitlist.hint': '\u0628\u062f\u0648\u0646 \u0631\u0633\u0627\u0626\u0644 \u0645\u0632\u0639\u062c\u0629.',
      'waitlist.success.title': '\u0623\u0646\u062a \u0641\u064a \u0627\u0644\u0642\u0627\u0626\u0645\u0629', 'waitlist.success.desc': '\u0633\u0646\u062e\u0628\u0631\u0643 \u0639\u0646\u062f \u0627\u0644\u0625\u0637\u0644\u0627\u0642.',
      'saved.back': '\u0631\u062c\u0648\u0639', 'saved.eyebrow': '\u0645\u062c\u0645\u0648\u0639\u062a\u0643', 'saved.title': '\u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0627\u062a', 'saved.clearAll': '\u0645\u0633\u062d \u0627\u0644\u0643\u0644',
      'saved.empty': '\u0644\u0627 \u062a\u0648\u062c\u062f \u0639\u0646\u0627\u0635\u0631 \u0645\u062d\u0641\u0648\u0638\u0629', 'saved.emptyHint': '\u0627\u0646\u0642\u0631 \u0627\u0644\u0642\u0644\u0628 \u0644\u0644\u062d\u0641\u0638',
      'footer.tagline': '\u0628\u0627\u062d\u062b \u0628\u062f\u0627\u0626\u0644 \u0627\u0644\u0645\u0648\u0636\u0629 \u0628\u0627\u0644\u0630\u0643\u0627\u0621.',
      'footer.explore': '\u0627\u0633\u062a\u0643\u0634\u0641', 'footer.trending': '\u0627\u0644\u0631\u0627\u0626\u062c', 'footer.newArrivals': '\u0627\u0644\u062c\u062f\u064a\u062f', 'footer.collections': '\u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0627\u062a',
      'footer.company': '\u0627\u0644\u0634\u0631\u0643\u0629', 'footer.about': '\u0639\u0646\u0627', 'footer.careers': '\u0627\u0644\u0648\u0638\u0627\u0626\u0641', 'footer.privacy': '\u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629', 'footer.terms': '\u0627\u0644\u0634\u0631\u0648\u0637',
      'toast.saved': '\u062a\u0645 \u0627\u0644\u062d\u0641\u0638', 'toast.removed': '\u062a\u0645\u062a \u0627\u0644\u0625\u0632\u0627\u0644\u0629', 'toast.cleared': '\u062a\u0645 \u0627\u0644\u0645\u0633\u062d',
      'search.searching': '\u0627\u0644\u0628\u062d\u062b...', 'search.joining': '\u062c\u0627\u0631\u064a \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645...',
      'results.ai.eyebrow': '\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0630\u0643\u0627\u0621', 'results.ai.title': '\u0628\u062f\u0627\u0626\u0644\u0643 \u062c\u0627\u0647\u0632\u0629', 'results.bestDupe': '\u0623\u0641\u0636\u0644 \u0628\u062f\u064a\u0644', 'results.moreAlts': '\u0628\u062f\u0627\u0626\u0644 \u0623\u062e\u0631\u0649',
      'results.loading.title': '\u0627\u0644\u0630\u0643\u0627\u0621 \u064a\u062d\u0644\u0644...', 'results.loading.sub': '\u0627\u0644\u0628\u062d\u062b \u0641\u064a 6 \u0645\u062a\u0627\u062c\u0631',
      'reverse.loading': '\u062c\u0627\u0631\u064a \u062a\u062d\u062f\u064a\u062f \u0627\u0644\u0623\u0635\u0644...', 'reverse.loadingSub': '\u0645\u0637\u0627\u0628\u0642\u0629 \u0645\u0639 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0627\u062a', 'reverse.eyebrow': '\u0627\u0644\u0623\u0635\u0644 \u0627\u0644\u0645\u062d\u062f\u062f', 'reverse.title': '\u0648\u062c\u062f\u0646\u0627 \u0627\u0644\u0623\u0635\u0644', 'reverse.for': '\u0627\u0644\u0623\u0635\u0644 \u0644\u0640', 'reverse.originalLabel': '\u0627\u0644\u0623\u0635\u0644', 'reverse.identifiedAs': '\u062a\u0645 \u062a\u062d\u062f\u064a\u062f\u0647 \u0643\u0640', 'reverse.dupeBelow': '\u0628\u062f\u0627\u0626\u0644 \u0623\u062f\u0646\u0627\u0647',
      'share.whatsapp': '\u0648\u0627\u062a\u0633\u0627\u0628', 'share.copy': '\u0646\u0633\u062e \u0627\u0644\u0631\u0627\u0628\u0637', 'share.copied': '\u062a\u0645 \u0627\u0644\u0646\u0633\u062e!',
      'share.text': '\u0634\u0627\u0647\u062f \u0647\u0630\u0627 \u0627\u0644\u0628\u062f\u064a\u0644: {name} \u0645\u0646 {store} \u0628\u0640 {price} \u2014 \u0648\u062c\u062f \u0639\u0644\u0649 ALTERE',
      'share.results': '\u0645\u0634\u0627\u0631\u0643\u0629', 'share.story': '\u062a\u062d\u0645\u064a\u0644 \u0644\u0644\u0642\u0635\u0635', 'share.story.footer': '\u0648\u062c\u062f \u0628\u0640 ALTERE', 'share.story.downloaded': '\u062a\u0645 \u0627\u0644\u062a\u062d\u0645\u064a\u0644',
      'invite.eyebrow': '\u0627\u0646\u0634\u0631 \u0627\u0644\u062e\u0628\u0631', 'invite.title': '\u0634\u0627\u0631\u0643 ALTERE', 'invite.sub': '\u062a\u0639\u0631\u0641 \u0623\u062d\u062f\u064b\u0627 \u064a\u062d\u0628 \u0627\u0644\u0645\u0648\u0636\u0629?', 'invite.copyLink': '\u0646\u0633\u062e \u0627\u0644\u0631\u0627\u0628\u0637',
      'invite.message': '\u062a\u062d\u0642\u0642 \u0645\u0646 ALTERE \u2014 \u064a\u062c\u062f \u0628\u062f\u0627\u0626\u0644 \u0641\u0627\u062e\u0631\u0629 \u0628\u0623\u0633\u0639\u0627\u0631 \u0645\u0639\u0642\u0648\u0644\u0629!',
      'auth.title': '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644', 'auth.subtitle': '\u0623\u0646\u0634\u0626 \u062d\u0633\u0627\u0628\u0627\u064b \u0645\u062c\u0627\u0646\u064a\u0627\u064b.', 'auth.email': '\u0627\u0644\u0628\u0631\u064a\u062f', 'auth.name': '\u0627\u0644\u0627\u0633\u0645', 'auth.create': '\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628', 'auth.signout': '\u062e\u0631\u0648\u062c', 'auth.welcome': '\u0623\u0647\u0644\u0627\u064b!', 'auth.signedOut': '\u062a\u0645 \u0627\u0644\u062e\u0631\u0648\u062c', 'auth.invalidEmail': '\u0628\u0631\u064a\u062f \u063a\u064a\u0631 \u0635\u062d\u064a\u062d.', 'auth.invalidName': '\u0627\u0644\u0627\u0633\u0645 \u0645\u0637\u0644\u0648\u0628.',
      'error.daily': '\u062a\u0645 \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0627\u0644\u062d\u062f \u0627\u0644\u064a\u0648\u0645\u064a \u2014 \u0639\u062f \u063a\u062f\u0627\u064b',
      'error.network': '\u062d\u062f\u062b \u062e\u0637\u0623. \u062d\u0627\u0648\u0644 \u0628\u0639\u062f \u0644\u062d\u0638\u0629.'
    },
    zh: {
      'nav.discover': '\u53d1\u73b0', 'nav.brands': '\u54c1\u724c', 'nav.saved': '\u5df2\u4fdd\u5b58', 'nav.signin': '\u767b\u5f55',
      'hero.eyebrow': 'AI\u9a71\u52a8\u7684\u65f6\u5c1a\u53d1\u73b0',
      'hero.headline': '\u53d1\u73b0\u5b83\u3002<br>\u6211\u4eec\u4e3a\u4f60\u627e\u5230\u3002',
      'hero.sub': '\u63cf\u8ff0\u4efb\u4f55\u670d\u9970\uff0c\u6211\u4eec\u7684 AI \u5c06\u8bc6\u522b\u5176\u5947\u667a\u4e88\u5947\u667a\u4e88\u519b\u519b\u519b\u519b\u519b\u3002\u8c6a\u534e\u539f\u578b \u2014 \u4ee5\u53ca\u66f4\u591a\u5e73\u4ef7\u9009\u62e9\u3002',
      'search.tab.link': '\u7c98\u8d34\u94fe\u63a5', 'search.tab.upload': '\u4e0a\u4f20\u7167\u7247', 'search.tab.text': '\u67e5\u627e\u5e73\u4ef7\u54c1',
      'search.placeholder.link': '\u7c98\u8d34\u4ea7\u54c1URL...',
      'search.placeholder.text': '\u63cf\u8ff0\u670d\u9970...',
      'search.btn': '\u67e5\u627e\u5e73\u4ef7\u54c1',
      'search.tab.reverse': '\u67e5\u627e\u539f\u578b', 'search.btnReverse': '\u67e5\u627e\u539f\u578b', 'search.placeholder.reverse': '\u63cf\u8ff0\u4f60\u7684\u670d\u9970...',
      'reverse.placeholder.link': '\u7c98\u8d34\u4ea7\u54c1URL...',
      'search.upload.hint': '\u62d6\u62fd\u6216 <strong>\u6d4f\u89c8</strong>',
      'search.upload.formats': 'JPG\u3001PNG \u6216 WEBP\uff0c\u6700\u5927 10 MB',
      'search.upload.ready': '\u51c6\u5907\u641c\u7d22',
      'search.status': 'AI \u6b63\u5728\u67e5\u627e',
      'search.tab.camera': '\u62cd\u7167', 'camera.start': '\u70b9\u51fb\u6253\u5f00\u76f8\u673a', 'camera.hint': '\u5bf9\u51c6\u670d\u9970', 'camera.retake': '\u91cd\u62cd', 'camera.use': '\u67e5\u627e', 'camera.error': '\u65e0\u6cd5\u8bbf\u95ee\u76f8\u673a\u3002',
      'recent.label': '\u6700\u8fd1', 'recent.clear': '\u6e05\u9664',
      'trending.label': '\u70ed\u95e8',
      'hero.searching': '\u641c\u7d22', 'hero.scroll': '\u6eda\u52a8\u63a2\u7d22',
      'dotd.eyebrow': '\u6bcf\u65e5\u63a8\u8350', 'dotd.original': '\u539f\u578b', 'dotd.dupe': '\u6700\u4f73\u5e73\u4ef7\u54c1', 'dotd.vs': 'VS', 'dotd.btn': '\u66f4\u591a',
      'calc.eyebrow': '\u8ba1\u7b97\u5668', 'calc.title': '\u4f60\u80fd\u8282\u7701\u591a\u5c11?', 'calc.sub': '\u67e5\u770b\u4f60\u53ef\u4ee5\u8282\u7701\u591a\u5c11.', 'calc.budget': '\u6708\u5ea6\u9884\u7b97', 'calc.perMonth': '\u6bcf\u6708', 'calc.perYear': '\u6bcf\u5e74', 'calc.fiveYears': '5\u5e74', 'calc.note': '\u57fa\u4e8e\u5e73\u574768%\u8282\u7701.',
      'proof.dupes': '\u4eca\u65e5\u53d1\u73b0', 'proof.shoppers': '\u6ee1\u610f\u987e\u5ba2', 'proof.saved': '\u672c\u5468\u8282\u7701', 'press.label': '\u91c7\u8bbf',
      'celeb.eyebrow': '\u7075\u611f', 'celeb.title': '\u540d\u4eba\u9020\u578b', 'celeb.sub': '\u63a2\u7d22\u70ed\u95e8\u9020\u578b.', 'celeb.btn': '\u67e5\u627e',
      'celeb.c1.name': '\u9759\u8c27\u5965\u4e3d', 'celeb.c1.desc': '\u4f4e\u8c03\u96c5\u81f4.',
      'celeb.c2.name': '\u8857\u5934\u65f6\u5c1a', 'celeb.c2.desc': '\u5927\u80c6\u81ea\u4fe1.',
      'celeb.c3.name': '\u7ecf\u5178\u8d35\u65cf', 'celeb.c3.desc': '\u9884\u79d1\u4e0e\u4f18\u96c5.',
      'celeb.c4.name': '\u6cd5\u5f0f\u5973\u5b69', 'celeb.c4.desc': '\u8f7b\u677e\u96c5\u81f4.',
      'cookie.text': '\u6211\u4eec\u4f7f\u7528 cookie.', 'cookie.accept': '\u5168\u90e8\u63a5\u53d7', 'cookie.manage': '\u7ba1\u7406',
      'about.mission': '\u8c6a\u534e\u7f8e\u5b66\uff0c\u5e73\u6c11\u4ef7\u683c.', 'about.storyEyebrow': '\u6211\u4eec\u7684\u6545\u4e8b', 'about.storyTitle': '\u65f6\u5c1a\u5c5e\u4e8e\u6bcf\u4e2a\u4eba',
      'about.storyP1': 'ALTERE \u8bde\u751f\u4e8e\u4e00\u4e2a\u7b80\u5355\u7684\u632b\u8d25\u611f.',
      'about.storyP2': '\u4e8e\u662f\u6211\u4eec\u6253\u9020\u4e86\u5982\u9020\u578b\u5e08\u822c\u770b\u5230\u65f6\u5c1a\u7684 AI.',
      'about.howEyebrow': '\u6280\u672f', 'about.howTitle': '\u6211\u4eec\u7684 AI \u5982\u4f55\u5de5\u4f5c',
      'about.step1Title': '\u89c6\u89c9\u89e3\u6784', 'about.step1Desc': '\u6211\u4eec\u7684\u6a21\u578b\u5c06\u6bcf\u4ef6\u670d\u9970\u5206\u89e3\u4e3a\u6838\u5fc3\u5c5e\u6027.',
      'about.step2Title': '\u8de8\u5546\u5e97\u5339\u914d', 'about.step2Desc': '\u6211\u4eec\u5b9e\u65f6\u626b\u63cfZara\u3001H&M\u3001Mango\u3001ASOS\u3001COS\u548c & Other Stories.',
      'about.step3Title': '\u667a\u80fd\u6392\u540d', 'about.step3Desc': '\u7ed3\u679c\u6309\u51c6\u786e\u6027\u3001\u8282\u7701\u548c\u53ef\u7528\u6027\u6392\u540d.',
      'about.teamEyebrow': '\u6211\u4eec\u662f\u8c01', 'about.teamTitle': '\u7531\u65f6\u5c1a\u7231\u597d\u8005\u521b\u7acb,<br>\u7531 AI \u9a71\u52a8',
      'about.teamDesc': '\u6211\u4eec\u4f7f\u547d\uff1a\u4f7f\u98ce\u683c\u6c11\u4e3b\u5316.',
      'about.cta': '\u5f00\u59cb\u53d1\u73b0',
      'faq.eyebrow': '\u652f\u6301', 'faq.title': '\u5e38\u89c1\u95ee\u9898',
      'faq.q1': 'AI \u5982\u4f55\u67e5\u627e\u5e73\u4ef7\u54c1?', 'faq.a1': '\u6211\u4eec\u7684 AI \u5206\u6790\u6bcf\u4ef6\u670d\u9970.',
      'faq.q2': '\u94fe\u63a5\u662f\u8054\u76df\u94fe\u63a5\u5417?', 'faq.a2': '\u67d0\u4e9b\u53ef\u80fd\u662f\u8054\u76df\u94fe\u63a5.',
      'faq.q3': 'ALTERE \u662f\u514d\u8d39\u7684\u5417?', 'faq.a3': '\u662f\u7684\uff0cALTERE \u5b8c\u5168\u514d\u8d39.',
      'faq.q4': '\u5339\u914d\u767e\u5206\u6bd4\u591a\u51c6\u786e?', 'faq.a4': '90% \u4ee5\u4e0a = \u89c6\u89c9\u4e0a\u975e\u5e38\u63a5\u8fd1.',
      'faq.q5': '\u6211\u53ef\u4ee5\u63a8\u8350\u5546\u5e97\u5417?', 'faq.a5': '\u5f53\u7136\u53ef\u4ee5!',
      'reviews.eyebrow': '\u8bc4\u4ef7', 'reviews.title': '\u65f6\u5c1a\u7231\u597d\u8005\u7684\u6700\u7231',
      'reviews.r1.quote': '\u300c\u627e\u5230\u4e86\u5b8c\u7f8e\u7684 Bottega \u5e73\u4ef7\u54c1\u300d', 'reviews.r1.name': '\u82cf\u83f2 M.', 'reviews.r1.location': '\u963f\u59c6\u65af\u7279\u4e39\uff0c\u8377\u5170',
      'reviews.r2.quote': '\u300c\u6211\u603b\u662f\u4f7f\u7528 ALTERE\u300d', 'reviews.r2.name': '\u8a79\u59c6\u65af T.', 'reviews.r2.location': '\u4f26\u6566\uff0c\u82f1\u56fd',
      'reviews.r3.quote': '\u300c\u6211\u7684\u79d8\u5bc6\u6b66\u5668\u300d', 'reviews.r3.name': '\u963f\u9a6c\u62c9 K.', 'reviews.r3.location': '\u5df4\u9ece\uff0c\u6cd5\u56fd',
      'reviews.r4.quote': '\u300c\u8282\u7701\u4e86 800 \u6b27\u5143\u300d', 'reviews.r4.name': '\u5362\u5361 R.', 'reviews.r4.location': '\u7c73\u5170\uff0c\u610f\u5927\u5229',
      'reviews.r5.quote': '\u300c\u7ec8\u4e8e\u6709\u4e2a\u80fd\u7528\u7684\u300d', 'reviews.r5.name': '\u57c3\u83b1\u5a1c V.', 'reviews.r5.location': '\u5df4\u585e\u7f57\u90a3\uff0c\u897f\u73ed\u7259',
      'reviews.r6.quote': '\u300c\u6211\u7684\u670b\u53cb\u4eec\u90fd\u4e0a\u763e\u4e86\u300d', 'reviews.r6.name': '\u8bfa\u4e9a B.', 'reviews.r6.location': '\u67cf\u6797\uff0c\u5fb7\u56fd',
      'results.eyebrow': '\u70ed\u95e8\u5e73\u4ef7\u54c1',
      'results.title': '\u8c6a\u534e\u9020\u578b\uff0c\u5e73\u6c11\u4ef7\u683c',
      'results.subtitle': '\u6211\u4eec\u7684 AI \u6bcf\u5929\u626b\u63cf\u6570\u5343\u4ef6\u4ea7\u54c1.',
      'filter.category': '\u7c7b\u522b', 'filter.bags': '\u5305', 'filter.shoes': '\u978b', 'filter.clothing': '\u670d\u88c5', 'filter.jewellery': '\u73e0\u5b9d', 'filter.accessories': '\u914d\u9970',
      'filter.price': '\u4ef7\u683c', 'filter.all': '\u5168\u90e8', 'filter.store': '\u5546\u5e97', 'filter.allStores': '\u6240\u6709\u5546\u5e97', 'filter.sortBy': '\u6392\u5e8f',
      'sort.match': '\u6700\u4f73\u5339\u914d', 'sort.priceAsc': '\u4ef7\u683c\uff1a\u4ece\u4f4e\u5230\u9ad8', 'sort.priceDesc': '\u4ef7\u683c\uff1a\u4ece\u9ad8\u5230\u4f4e', 'sort.saving': '\u6700\u5927\u8282\u7701',
      'how.eyebrow': '\u5982\u4f55\u8fd0\u4f5c', 'how.title': '\u4e09\u6b65\u627e\u5230\u5b8c\u7f8e\u5e73\u4ef7\u54c1',
      'how.step1.title': '\u4e0a\u4f20\u6216\u7c98\u8d34', 'how.step1.desc': '\u5206\u4eab\u7167\u7247\u3001\u94fe\u63a5\u6216\u63cf\u8ff0.',
      'how.step2.title': 'AI \u5206\u6790', 'how.step2.desc': '\u51e0\u79d2\u949f\u5206\u89e3.',
      'how.step3.title': '\u8d2d\u4e70\u5e73\u4ef7\u54c1', 'how.step3.desc': '\u6d4f\u89c8\u6392\u540d\u9009\u62e9.',
      'waitlist.eyebrow': '\u63d0\u524d\u8bbf\u95ee', 'waitlist.title': '\u6210\u4e3a\u9996\u6279<br>\u53d1\u5e03\u4f1a\u6210\u5458',
      'waitlist.sub': '\u52a0\u5165\u6570\u5343\u540d\u65f6\u5c1a\u7231\u597d\u8005.',
      'waitlist.placeholder': '\u4f60\u7684\u90ae\u7bb1', 'waitlist.btn': '\u52a0\u5165',
      'waitlist.hint': '\u4e0d\u53d1\u5783\u573e\u90ae\u4ef6.',
      'waitlist.success.title': '\u4f60\u5728\u540d\u5355\u4e0a', 'waitlist.success.desc': '\u53d1\u5e03\u540e\u6211\u4eec\u4f1a\u901a\u77e5\u4f60.',
      'saved.back': '\u8fd4\u56de', 'saved.eyebrow': '\u4f60\u7684\u6536\u85cf', 'saved.title': '\u5df2\u4fdd\u5b58', 'saved.clearAll': '\u5168\u90e8\u6e05\u9664',
      'saved.empty': '\u6682\u65e0\u4fdd\u5b58\u9879\u76ee', 'saved.emptyHint': '\u70b9\u51fb\u7231\u5fc3\u4fdd\u5b58',
      'footer.tagline': 'AI \u9a71\u52a8\u7684\u65f6\u5c1a\u5e73\u4ef7\u54c1\u67e5\u627e\u5668.',
      'footer.explore': '\u63a2\u7d22', 'footer.trending': '\u70ed\u95e8', 'footer.newArrivals': '\u65b0\u54c1', 'footer.collections': '\u7cfb\u5217',
      'footer.company': '\u516c\u53f8', 'footer.about': '\u5173\u4e8e', 'footer.careers': '\u804c\u4f4d', 'footer.privacy': '\u9690\u79c1', 'footer.terms': '\u6761\u6b3e',
      'toast.saved': '\u5df2\u4fdd\u5b58', 'toast.removed': '\u5df2\u79fb\u9664', 'toast.cleared': '\u5168\u90e8\u6e05\u9664',
      'search.searching': '\u641c\u7d22\u4e2d...', 'search.joining': '\u52a0\u5165\u4e2d...',
      'results.ai.eyebrow': 'AI \u7ed3\u679c', 'results.ai.title': '\u4f60\u7684\u5e73\u4ef7\u54c1\u5df2\u51c6\u5907\u597d', 'results.bestDupe': '\u6700\u4f73\u5e73\u4ef7\u54c1', 'results.moreAlts': '\u66f4\u591a\u9009\u62e9',
      'results.loading.title': 'AI \u6b63\u5728\u5206\u6790...', 'results.loading.sub': '\u5728 6 \u4e2a\u5546\u5e97\u4e2d\u67e5\u627e',
      'reverse.loading': '\u8bc6\u522b\u539f\u578b\u4e2d...', 'reverse.loadingSub': '\u4e0e\u8bbe\u8ba1\u5e08\u85cf\u54c1\u5339\u914d', 'reverse.eyebrow': '\u5df2\u8bc6\u522b\u539f\u578b', 'reverse.title': '\u6211\u4eec\u627e\u5230\u4e86\u539f\u578b', 'reverse.for': '\u539f\u578b\u8bc6\u522b\u4e3a', 'reverse.originalLabel': '\u539f\u578b', 'reverse.identifiedAs': '\u8bc6\u522b\u4e3a', 'reverse.dupeBelow': '\u4ee5\u4e0b\u662f\u5e73\u4ef7\u9009\u62e9',
      'share.whatsapp': 'WhatsApp', 'share.copy': '\u590d\u5236\u94fe\u63a5', 'share.copied': '\u5df2\u590d\u5236!',
      'share.text': '\u770b\u770b\u8fd9\u4e2a\u5e73\u4ef7\u54c1\uff1a\u6765\u81ea {store} \u7684 {name}\uff0c\u4ec5\u9700 {price} \u2014 \u5728 ALTERE \u4e0a\u53d1\u73b0',
      'share.results': '\u5206\u4eab', 'share.story': '\u4e0b\u8f7d\u5230\u52a8\u6001', 'share.story.footer': '\u901a\u8fc7 ALTERE \u53d1\u73b0', 'share.story.downloaded': '\u56fe\u7247\u5df2\u4e0b\u8f7d',
      'invite.eyebrow': '\u4f20\u64ad\u51fa\u53bb', 'invite.title': '\u4e0e\u670b\u53cb\u5206\u4eab ALTERE', 'invite.sub': '\u8ba4\u8bc6\u7231\u65f6\u5c1a\u4f46\u4e0d\u613f\u591a\u4ed8\u94b1\u7684\u4eba\u5417?', 'invite.copyLink': '\u590d\u5236\u94fe\u63a5',
      'invite.message': '\u67e5\u770b ALTERE \u2014 \u4ee5\u5e73\u6c11\u4ef7\u683c\u67e5\u627e\u8c6a\u534e\u4eff\u54c1!',
      'auth.title': '\u767b\u5f55 ALTERE', 'auth.subtitle': '\u521b\u5efa\u514d\u8d39\u8d26\u6237.', 'auth.email': '\u90ae\u7bb1', 'auth.name': '\u59d3\u540d', 'auth.create': '\u521b\u5efa\u8d26\u6237', 'auth.signout': '\u9000\u51fa', 'auth.welcome': '\u6b22\u8fce!', 'auth.signedOut': '\u5df2\u9000\u51fa', 'auth.invalidEmail': '\u90ae\u7bb1\u65e0\u6548.', 'auth.invalidName': '\u9700\u8981\u59d3\u540d.',
      'error.daily': '\u5df2\u8fbe\u5230\u6bcf\u65e5\u9650\u5236 \u2014 \u660e\u5929\u518d\u6765',
      'error.network': '\u51fa\u9519\u4e86\u3002\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002'
    }
  };

  const LANG_LABELS = { en: 'EN', nl: 'NL', fr: 'FR', de: 'DE', es: 'ES', it: 'IT', ar: 'AR', zh: '\u4e2d' };
  const RTL_LANGS = new Set(['ar']);

  function detectInitialLang() {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored && TRANSLATIONS[stored]) return stored;
    const browserLang = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return TRANSLATIONS[browserLang] ? browserLang : 'en';
  }

  let currentLang = detectInitialLang();

  function t(key) {
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
    return dict[key] || TRANSLATIONS.en[key] || key;
  }

  function applyLanguage(lang) {
    if (!TRANSLATIONS[lang]) lang = 'en';
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr';
    if (langCurrent) langCurrent.textContent = LANG_LABELS[lang];

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.innerHTML = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = t(key);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria');
      el.setAttribute('aria-label', t(key));
    });

    if (langMenu) {
      langMenu.querySelectorAll('button[data-lang]').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
      });
    }
  }

  if (langBtn && langMenu) {
    langBtn.addEventListener('click', e => {
      e.stopPropagation();
      langSwitcher.classList.toggle('open');
    });
    langMenu.querySelectorAll('button[data-lang]').forEach(btn => {
      btn.addEventListener('click', () => {
        applyLanguage(btn.getAttribute('data-lang'));
        langSwitcher.classList.remove('open');
      });
    });
  }

  applyLanguage(currentLang);

  /* ============================================================
     Toast helper
     ============================================================ */

  let toastTimer = null;
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('toast--show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('toast--show'), 2400);
  }

  /* ============================================================
     Settings modal (Unsplash key only)
     ============================================================ */

  function getUnsplashKey() {
    return localStorage.getItem(UNSPLASH_KEY) || '';
  }
  function setUnsplashKey(k) {
    if (k) localStorage.setItem(UNSPLASH_KEY, k);
    else   localStorage.removeItem(UNSPLASH_KEY);
  }

  if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener('click', () => {
      settingsModal.classList.add('modal--open');
      if (unsplashInput) unsplashInput.value = getUnsplashKey();
    });
  }
  if (modalClose) {
    modalClose.addEventListener('click', () => settingsModal.classList.remove('modal--open'));
  }
  if (settingsModal) {
    settingsModal.addEventListener('click', e => {
      if (e.target === settingsModal) settingsModal.classList.remove('modal--open');
    });
  }
  if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener('click', () => {
      if (unsplashInput) setUnsplashKey(unsplashInput.value.trim());
      if (apiStatus) {
        apiStatus.textContent = '\u2713 Saved';
        apiStatus.style.color = 'var(--color-accent)';
        setTimeout(() => {
          apiStatus.textContent = '';
          settingsModal.classList.remove('modal--open');
        }, 900);
      }
    });
  }

  /* ============================================================
     Hamburger / nav scroll behaviour
     ============================================================ */

  if (hamburger && navLinks) {
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
  }

  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (nav) {
      if (y > 40) nav.classList.add('nav--scrolled');
      else nav.classList.remove('nav--scrolled');
    }
    lastScroll = y;
  });

  /* ============================================================
     Top search-box tab switching (Find dupes / Find original)
     ============================================================ */

  const tabButtons = document.querySelectorAll('.search-box__tab');
  const tabPanels  = document.querySelectorAll('.search-box__panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      tabButtons.forEach(b => b.classList.toggle('active', b === btn));
      tabPanels.forEach(p => p.classList.toggle('active', p.getAttribute('data-panel') === target));
      stopCamera();  // stop any running camera when changing main tab
    });
  });

  /* ============================================================
     Find dupes panel: link / upload / text refs
     ============================================================ */

  const linkInput      = document.getElementById('linkInput');
  const linkSearchBtn  = document.getElementById('linkSearchBtn');
  const textInput      = document.getElementById('textInput');
  const textSearchBtn  = document.getElementById('textSearchBtn');
  const linkPreview    = document.getElementById('linkPreview');

  /* ============================================================
     Find original panel refs (sub-tabs)
     ============================================================ */

  const reverseInput          = document.getElementById('reverseInput');
  const reverseBtn            = document.getElementById('reverseBtn');
  const reverseSubtabs        = document.querySelectorAll('.reverse-subtab');
  const reverseSubpanels      = document.querySelectorAll('.reverse-subpanel');
  const reverseFileInput      = document.getElementById('reverseFileInput');
  const reverseUploadArea     = document.getElementById('reverseUploadArea');
  const reverseUploadThumb    = document.getElementById('reverseUploadThumb');
  const reverseUploadFilename = document.getElementById('reverseUploadFilename');
  const reverseUploadFilesize = document.getElementById('reverseUploadFilesize');
  const reverseUploadRemove   = document.getElementById('reverseUploadRemove');
  const reverseLinkInput      = document.getElementById('reverseLinkInput');

  function getActiveReverseSubtab() {
    const active = document.querySelector('.reverse-subpanel.active');
    return active ? active.getAttribute('data-subpanel') : 'describe';
  }

  reverseSubtabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-subtab');
      reverseSubtabs.forEach(b => b.classList.toggle('active', b === btn));
      reverseSubpanels.forEach(p => p.classList.toggle('active', p.getAttribute('data-subpanel') === target));
    });
  });

  /* ============================================================
     File upload: Find dupes panel
     ============================================================ */

  function bytesToReadable(b) {
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function handleFileSelect(file, target) {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('File too large (max 10 MB)');
      return;
    }
    if (target === 'main') {
      currentFile = file;
      const reader = new FileReader();
      reader.onload = e => {
        if (uploadThumb) {
          uploadThumb.style.backgroundImage = `url(${e.target.result})`;
          uploadThumb.classList.add('upload-zone__thumb--loaded');
        }
        if (uploadFilename) uploadFilename.textContent = file.name;
        if (uploadFilesize) uploadFilesize.textContent = bytesToReadable(file.size);
        if (uploadArea)     uploadArea.classList.add('upload-zone--has-file');
        if (uploadSearchBtn) uploadSearchBtn.disabled = false;
      };
      reader.readAsDataURL(file);
    } else {
      currentReverseFile = file;
      const reader = new FileReader();
      reader.onload = e => {
        if (reverseUploadThumb) {
          reverseUploadThumb.style.backgroundImage = `url(${e.target.result})`;
          reverseUploadThumb.classList.add('upload-zone__thumb--loaded');
        }
        if (reverseUploadFilename) reverseUploadFilename.textContent = file.name;
        if (reverseUploadFilesize) reverseUploadFilesize.textContent = bytesToReadable(file.size);
        if (reverseUploadArea)     reverseUploadArea.classList.add('upload-zone--has-file');
      };
      reader.readAsDataURL(file);
    }
  }

  // Find dupes upload
  if (uploadArea && fileInput) {
    uploadArea.addEventListener('click', e => {
      if (e.target === uploadRemove || (uploadRemove && uploadRemove.contains(e.target))) return;
      fileInput.click();
    });
    uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('upload-zone--dragover'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('upload-zone--dragover'));
    uploadArea.addEventListener('drop', e => {
      e.preventDefault();
      uploadArea.classList.remove('upload-zone--dragover');
      if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0], 'main');
    });
    fileInput.addEventListener('change', e => {
      if (e.target.files[0]) handleFileSelect(e.target.files[0], 'main');
    });
  }
  if (uploadRemove) {
    uploadRemove.addEventListener('click', e => {
      e.stopPropagation();
      currentFile = null;
      if (uploadThumb) {
        uploadThumb.style.backgroundImage = '';
        uploadThumb.classList.remove('upload-zone__thumb--loaded');
      }
      if (uploadArea) uploadArea.classList.remove('upload-zone--has-file');
      if (uploadSearchBtn) uploadSearchBtn.disabled = true;
      if (fileInput) fileInput.value = '';
    });
  }

  // Find original upload
  if (reverseUploadArea && reverseFileInput) {
    reverseUploadArea.addEventListener('click', e => {
      if (e.target === reverseUploadRemove || (reverseUploadRemove && reverseUploadRemove.contains(e.target))) return;
      reverseFileInput.click();
    });
    reverseUploadArea.addEventListener('dragover', e => { e.preventDefault(); reverseUploadArea.classList.add('upload-zone--dragover'); });
    reverseUploadArea.addEventListener('dragleave', () => reverseUploadArea.classList.remove('upload-zone--dragover'));
    reverseUploadArea.addEventListener('drop', e => {
      e.preventDefault();
      reverseUploadArea.classList.remove('upload-zone--dragover');
      if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0], 'reverse');
    });
    reverseFileInput.addEventListener('change', e => {
      if (e.target.files[0]) handleFileSelect(e.target.files[0], 'reverse');
    });
  }
  if (reverseUploadRemove) {
    reverseUploadRemove.addEventListener('click', e => {
      e.stopPropagation();
      currentReverseFile = null;
      if (reverseUploadThumb) {
        reverseUploadThumb.style.backgroundImage = '';
        reverseUploadThumb.classList.remove('upload-zone__thumb--loaded');
      }
      if (reverseUploadArea) reverseUploadArea.classList.remove('upload-zone--has-file');
      if (reverseFileInput) reverseFileInput.value = '';
    });
  }

  /* ============================================================
     Camera capture
     ============================================================ */

  const cameraStartBtn = document.getElementById('cameraStartBtn');
  const cameraVideo    = document.getElementById('cameraVideo');
  const cameraCanvas   = document.getElementById('cameraCanvas');
  const cameraCapture  = document.getElementById('cameraCapture');
  const cameraRetake   = document.getElementById('cameraRetake');
  const cameraUse      = document.getElementById('cameraUse');
  const cameraPreview  = document.getElementById('cameraPreview');
  let cameraStream     = null;
  let capturedDataUrl  = null;

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      cameraStream = null;
    }
    if (cameraVideo) cameraVideo.srcObject = null;
  }

  if (cameraStartBtn) {
    cameraStartBtn.addEventListener('click', async () => {
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cameraVideo) {
          cameraVideo.srcObject = cameraStream;
          cameraVideo.classList.add('camera__video--active');
        }
        cameraStartBtn.style.display = 'none';
        if (cameraCapture) cameraCapture.style.display = 'flex';
      } catch (err) {
        showToast(t('camera.error'));
      }
    });
  }
  if (cameraCapture) {
    cameraCapture.addEventListener('click', () => {
      if (!cameraVideo || !cameraCanvas) return;
      cameraCanvas.width  = cameraVideo.videoWidth;
      cameraCanvas.height = cameraVideo.videoHeight;
      cameraCanvas.getContext('2d').drawImage(cameraVideo, 0, 0);
      capturedDataUrl = cameraCanvas.toDataURL('image/jpeg', 0.9);
      if (cameraPreview) {
        cameraPreview.style.backgroundImage = `url(${capturedDataUrl})`;
        cameraPreview.classList.add('camera__preview--active');
      }
      stopCamera();
      if (cameraVideo) cameraVideo.classList.remove('camera__video--active');
      cameraCapture.style.display = 'none';
      if (cameraRetake) cameraRetake.style.display = 'inline-flex';
      if (cameraUse)    cameraUse.style.display    = 'inline-flex';
    });
  }
  if (cameraRetake) {
    cameraRetake.addEventListener('click', () => {
      capturedDataUrl = null;
      if (cameraPreview) {
        cameraPreview.style.backgroundImage = '';
        cameraPreview.classList.remove('camera__preview--active');
      }
      cameraRetake.style.display = 'none';
      if (cameraUse) cameraUse.style.display = 'none';
      if (cameraStartBtn) cameraStartBtn.style.display = 'inline-flex';
    });
  }
  if (cameraUse) {
    cameraUse.addEventListener('click', async () => {
      if (!capturedDataUrl) return;
      const blob = await (await fetch(capturedDataUrl)).blob();
      const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
      currentFile = file;
      // Switch to upload tab and show preview
      const uploadTab = document.querySelector('.search-box__tab[data-tab="upload"]');
      if (uploadTab) uploadTab.click();
      handleFileSelect(file, 'main');
    });
  }

  /* ============================================================
     Helpers: file -> base64, mime detection
     ============================================================ */

  function getMediaType(file) {
    if (!file) return 'image/jpeg';
    const t = file.type;
    if (t === 'image/png' || t === 'image/jpeg' || t === 'image/webp' || t === 'image/gif') return t;
    return 'image/jpeg';
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const comma  = result.indexOf(',');
        resolve(comma >= 0 ? result.substring(comma + 1) : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ============================================================
     Backend proxy call
     - All AI requests go through /api/chat (server holds the key)
     - Returns { content: [...], _rateLimit: { remaining, limit } }
     - Throws err.code='rate_limited' on 429
     ============================================================ */

  async function callClaude(userContent) {
    const body = {
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: userContent }]
    };

    let res;
    try {
      res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (networkErr) {
      const e = new Error('Network error');
      e.code = 'network';
      throw e;
    }

    if (res.status === 429) {
      let resetAt = null;
      try {
        const data = await res.json();
        resetAt = data.resetAt || null;
      } catch (_) { /* ignore */ }
      const e = new Error('Rate limit reached');
      e.code = 'rate_limited';
      e.resetAt = resetAt;
      throw e;
    }

    if (!res.ok) {
      const e = new Error('Server error: ' + res.status);
      e.code = 'server';
      throw e;
    }

    const data = await res.json();
    if (!data.content || !Array.isArray(data.content)) {
      const e = new Error('Malformed response');
      e.code = 'malformed';
      throw e;
    }
    return data;
  }

  /* ============================================================
     Prompts
     ============================================================ */

  const SYSTEM_PROMPT = `You are ALTERE's fashion AI. The user describes (or shows) a luxury or designer fashion item. Your job is to find affordable "dupes" \u2014 high-street alternatives that closely match the original in style, silhouette, colour and feel.

Return ONLY a single JSON object (no prose, no markdown fences) with this shape:
{
  "originalLabel": "<short label of the source item, e.g. 'Bottega Veneta Jodie Bag'>",
  "bestDupe": {
    "name": "<product name>",
    "store": "<Zara | H&M | Mango | ASOS | COS | & Other Stories>",
    "price": "<e.g. \u20ac49.95>",
    "originalPrice": "<luxury original price, e.g. \u20ac2,950>",
    "match": <integer 80-98>,
    "url": "<plausible product URL on the store domain>",
    "category": "<bags|shoes|clothing|jewellery|accessories>",
    "material": "<short material description, e.g. 'soft faux leather'>",
    "naturalFibres": <true|false>,
    "vegan": <true|false>,
    "imageQuery": "<2-4 word search phrase to find a representative photo>"
  },
  "alternatives": [
    { /* 5 more dupes with the SAME shape as bestDupe */ }
  ]
}

Rules:
- Always return EXACTLY 1 bestDupe + 5 alternatives (6 total).
- Spread results across at least 4 different stores.
- Prices must be in euros (\u20ac) and realistic for that store.
- Match scores: bestDupe 90-98, others 80-92.
- imageQuery should be specific (e.g. "cream satin midi skirt", "black quilted shoulder bag").
- Output ONLY the JSON object \u2014 no explanation, no markdown.`;

  const REVERSE_PROMPT = `You are ALTERE's fashion AI in REVERSE mode. The user describes (or shows) a high-street or affordable fashion item. Your job is to identify the LUXURY ORIGINAL it was inspired by, then surface 5 more affordable alternatives.

Return ONLY a single JSON object (no prose, no markdown fences) with this shape:
{
  "userItemLabel": "<short label of the user's item>",
  "original": {
    "name": "<luxury designer item name>",
    "brand": "<luxury brand, e.g. Bottega Veneta, Chlo\u00e9, The Row>",
    "price": "<luxury price, e.g. \u20ac2,950>",
    "year": "<season/year, e.g. SS24>",
    "imageQuery": "<2-4 words to find the luxury original photo>"
  },
  "alternatives": [
    { "name": "...", "store": "Zara|H&M|Mango|ASOS|COS|& Other Stories", "price": "\u20ac...", "originalPrice": "\u20ac...", "match": <80-98>, "url": "...", "category": "...", "material": "...", "naturalFibres": <bool>, "vegan": <bool>, "imageQuery": "..." }
  ]
}

Rules:
- Identify the most likely luxury inspiration based on silhouette, detailing, era and aesthetic.
- Return EXACTLY 5 alternatives.
- Output ONLY the JSON object.`;

  function parseClaudeResponse(data) {
    const textBlock = data.content.find(b => b.type === 'text');
    if (!textBlock) throw new Error('No text in response');
    let txt = textBlock.text.trim();
    // Strip markdown fences if present
    txt = txt.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    try {
      return JSON.parse(txt);
    } catch (err) {
      // Try to find JSON object in text
      const m = txt.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
      throw new Error('Could not parse JSON from AI');
    }
  }

  /* ============================================================
     Unsplash optional image enrichment
     ============================================================ */

  const FALLBACK_IMAGES = [
    'https://images.unsplash.com/photo-1591348278863-a8fb3887e2aa?w=600',
    'https://images.unsplash.com/photo-1551803091-e20673f15770?w=600',
    'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=600',
    'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=600',
    'https://images.unsplash.com/photo-1574180566232-aaad1b5b8450?w=600',
    'https://images.unsplash.com/photo-1582142306909-195724d33ffc?w=600'
  ];

  async function fetchUnsplashImage(query) {
    const key = getUnsplashKey();
    if (!key || !query) return null;
    try {
      const url = `${UNSPLASH_API}?query=${encodeURIComponent(query)}&per_page=1&orientation=portrait`;
      const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.results && data.results[0]) return data.results[0].urls.regular;
    } catch (_) { /* ignore */ }
    return null;
  }

  function fallbackImage(idx) {
    return FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length];
  }

  /* ============================================================
     Card rendering
     ============================================================ */

  function calcSavingPercent(price, originalPrice) {
    const p = parseFloat(String(price).replace(/[^\d.,]/g, '').replace(',', '.'));
    const o = parseFloat(String(originalPrice).replace(/[^\d.,]/g, '').replace(',', '.'));
    if (!p || !o || o <= p) return 0;
    return Math.round(((o - p) / o) * 100);
  }

  function renderDupeCard(item, index, isBest = false) {
    const img    = item._image || fallbackImage(index);
    const saving = calcSavingPercent(item.price, item.originalPrice);
    const cls    = isBest ? 'best-dupe__card' : 'dupe-card';
    const id     = `dupe-${Date.now()}-${index}`;
    return `
      <article class="${cls}" data-id="${id}" data-name="${escapeHtml(item.name)}" data-store="${escapeHtml(item.store)}" data-price="${escapeHtml(item.price)}" data-image="${escapeHtml(img)}" data-url="${escapeHtml(item.url || '#')}">
        <div class="${cls}__media">
          <img src="${img}" alt="${escapeHtml(item.name)}" loading="lazy">
          <button class="dupe-card__save" aria-label="Save"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>
          ${saving > 0 ? `<span class="dupe-card__saving">\u2212${saving}%</span>` : ''}
        </div>
        <div class="${cls}__body">
          <div class="${cls}__store">${escapeHtml(item.store || '')}</div>
          <h3 class="${cls}__name">${escapeHtml(item.name)}</h3>
          <div class="${cls}__pricing">
            <span class="${cls}__price">${escapeHtml(item.price)}</span>
            ${item.originalPrice ? `<span class="${cls}__price-original">${escapeHtml(item.originalPrice)}</span>` : ''}
          </div>
          <div class="${cls}__match">
            <div class="match-bar"><div class="match-bar__fill" style="width:${item.match || 0}%"></div></div>
            <span class="${cls}__match-value">${item.match || 0}%</span>
          </div>
          <div class="${cls}__actions">
            <a href="${escapeHtml(item.url || '#')}" target="_blank" rel="noopener" class="${cls}__shop-btn">Shop</a>
            <button class="${cls}__share-btn" aria-label="Share"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>
          </div>
        </div>
      </article>
    `;
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  /* ============================================================
     Render Find dupes results
     ============================================================ */

  async function renderResults(parsed) {
    if (!resultsGrid) return;

    // Update header
    if (resultsHeader) {
      const eyebrow = resultsHeader.querySelector('[data-i18n="results.eyebrow"]');
      const title   = resultsHeader.querySelector('[data-i18n="results.title"]');
      if (eyebrow) eyebrow.textContent = t('results.ai.eyebrow');
      if (title)   title.textContent   = t('results.ai.title');
    }

    const all = [parsed.bestDupe, ...(parsed.alternatives || [])].filter(Boolean);

    // Try to fetch Unsplash images in parallel (only if key set)
    await Promise.all(all.map(async (it, i) => {
      const img = await fetchUnsplashImage(it.imageQuery || it.name);
      if (img) it._image = img;
      else it._image = fallbackImage(i);
    }));

    let html = '';
    if (parsed.bestDupe) {
      html += `<div class="best-dupe-section"><h3 class="best-dupe__label">${t('results.bestDupe')}</h3>${renderDupeCard(parsed.bestDupe, 0, true)}</div>`;
    }
    if (parsed.alternatives && parsed.alternatives.length) {
      html += `<h3 class="alts-label">${t('results.moreAlts')}</h3><div class="alts-grid">`;
      parsed.alternatives.forEach((alt, i) => {
        html += renderDupeCard(alt, i + 1, false);
      });
      html += `</div>`;
    }

    resultsGrid.innerHTML = html;
    bindSaveButtons();
    bindShareButtons();
  }

  /* ============================================================
     Render Find original results
     ============================================================ */

  async function renderReverseResults(parsed) {
    if (!resultsGrid) return;
    if (resultsHeader) {
      const eyebrow = resultsHeader.querySelector('[data-i18n="results.eyebrow"]');
      const title   = resultsHeader.querySelector('[data-i18n="results.title"]');
      if (eyebrow) eyebrow.textContent = t('reverse.eyebrow');
      if (title)   title.textContent   = t('reverse.title');
    }

    const orig = parsed.original || {};
    const origImg = await fetchUnsplashImage(orig.imageQuery || orig.name) || fallbackImage(0);

    let html = `
      <div class="reverse-original">
        <div class="reverse-original__media">
          <img src="${origImg}" alt="${escapeHtml(orig.name || '')}" loading="lazy">
        </div>
        <div class="reverse-original__body">
          <div class="reverse-original__eyebrow">${t('reverse.originalLabel')}</div>
          <h3 class="reverse-original__name">${escapeHtml(orig.name || '')}</h3>
          <div class="reverse-original__brand">${escapeHtml(orig.brand || '')}</div>
          <div class="reverse-original__price">${escapeHtml(orig.price || '')}</div>
          ${orig.year ? `<div class="reverse-original__year">${escapeHtml(orig.year)}</div>` : ''}
        </div>
      </div>
    `;

    const alts = parsed.alternatives || [];
    if (alts.length) {
      await Promise.all(alts.map(async (it, i) => {
        const img = await fetchUnsplashImage(it.imageQuery || it.name);
        it._image = img || fallbackImage(i + 1);
      }));
      html += `<h3 class="alts-label">${t('reverse.dupeBelow')}</h3><div class="alts-grid">`;
      alts.forEach((alt, i) => { html += renderDupeCard(alt, i + 1, false); });
      html += `</div>`;
    }

    resultsGrid.innerHTML = html;
    bindSaveButtons();
    bindShareButtons();
  }

  /* ============================================================
     Search status / skeleton
     ============================================================ */

  const searchStatus = document.getElementById('searchStatus');

  function showSearchStatus(label, sub) {
    if (!searchStatus) return;
    searchStatus.innerHTML = `
      <div class="search-status__pulse"></div>
      <div class="search-status__text">
        <strong>${escapeHtml(label || t('results.loading.title'))}</strong>
        <span>${escapeHtml(sub || t('results.loading.sub'))}</span>
      </div>`;
    searchStatus.classList.add('search-status--show');
  }
  function hideSearchStatus() {
    if (searchStatus) searchStatus.classList.remove('search-status--show');
  }

  function renderSkeletons(count) {
    if (!resultsGrid) return;
    let h = '<div class="alts-grid">';
    for (let i = 0; i < count; i++) {
      h += `<div class="dupe-card dupe-card--skeleton">
        <div class="dupe-card__media skeleton-shimmer"></div>
        <div class="dupe-card__body">
          <div class="skeleton-line skeleton-shimmer"></div>
          <div class="skeleton-line skeleton-line--short skeleton-shimmer"></div>
          <div class="skeleton-line skeleton-shimmer"></div>
        </div>
      </div>`;
    }
    h += '</div>';
    resultsGrid.innerHTML = h;
  }

  /* ============================================================
     Error handler
     ============================================================ */

  function handleSearchError(err) {
    hideSearchStatus();
    if (err && err.code === 'rate_limited') {
      let msg = t('error.daily');
      if (err.resetAt) {
        const hours = Math.max(1, Math.ceil((err.resetAt - Date.now()) / 3600000));
        msg += ` (${hours}h)`;
      }
      showToast(msg);
    } else {
      showToast(t('error.network'));
    }
    restoreDefaultCards();
  }

  /* ============================================================
     performSearch (Find dupes)
     ============================================================ */

  async function performSearch(mode, value, file) {
    if (isSearching) return;
    isSearching = true;

    showSearchStatus(t('results.loading.title'), t('results.loading.sub'));
    renderSkeletons(6);

    // scroll to results section
    const resultsSection = document.getElementById('results');
    if (resultsSection) resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
      let userContent;
      if (mode === 'image' && file) {
        const b64 = await fileToBase64(file);
        userContent = [
          { type: 'image', source: { type: 'base64', media_type: getMediaType(file), data: b64 } },
          { type: 'text', text: SYSTEM_PROMPT + '\n\nFind dupes for the item shown in this image.' }
        ];
      } else if (mode === 'link') {
        userContent = SYSTEM_PROMPT + `\n\nThe user pasted this product URL: ${value}\nInfer the item from the URL (brand, slug, path) and find dupes.`;
      } else {
        userContent = SYSTEM_PROMPT + `\n\nUser description: "${value}"\n\nFind dupes for this item.`;
      }

      const data = await callClaude(userContent);
      const parsed = parseClaudeResponse(data);

      hideSearchStatus();
      await renderResults(parsed);
      addRecentSearch(mode === 'image' ? '\ud83d\udcf7 Photo search' : value);
    } catch (err) {
      handleSearchError(err);
    } finally {
      isSearching = false;
    }
  }

  /* ============================================================
     performReverseSearch (Find original)
     ============================================================ */

  async function performReverseSearch(value, mode, file) {
    if (isSearching) return;
    isSearching = true;

    showSearchStatus(t('reverse.loading'), t('reverse.loadingSub'));
    renderSkeletons(5);

    const resultsSection = document.getElementById('results');
    if (resultsSection) resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
      let userContent;
      if (mode === 'image' && file) {
        const b64 = await fileToBase64(file);
        userContent = [
          { type: 'image', source: { type: 'base64', media_type: getMediaType(file), data: b64 } },
          { type: 'text', text: REVERSE_PROMPT + '\n\nIdentify the luxury original this high-street item was inspired by.' }
        ];
      } else if (mode === 'link') {
        userContent = REVERSE_PROMPT + `\n\nThe user pasted this product URL: ${value}\nIdentify the luxury original this item was inspired by.`;
      } else {
        userContent = REVERSE_PROMPT + `\n\nUser description: "${value}"\n\nIdentify the luxury original this item was inspired by.`;
      }

      const data = await callClaude(userContent);
      const parsed = parseClaudeResponse(data);

      hideSearchStatus();
      await renderReverseResults(parsed);
      addRecentSearch(mode === 'image' ? '\ud83d\udcf7 ' + t('reverse.title') : value);
    } catch (err) {
      handleSearchError(err);
    } finally {
      isSearching = false;
    }
  }

  /* ============================================================
     Wire up search buttons
     ============================================================ */

  if (linkSearchBtn) {
    linkSearchBtn.addEventListener('click', () => {
      const v = (linkInput && linkInput.value || '').trim();
      if (!v) return;
      performSearch('link', v, null);
    });
  }
  if (linkInput) {
    linkInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); if (linkSearchBtn) linkSearchBtn.click(); }
    });
  }

  if (textSearchBtn) {
    textSearchBtn.addEventListener('click', () => {
      const v = (textInput && textInput.value || '').trim();
      if (!v) return;
      performSearch('text', v, null);
    });
  }
  if (textInput) {
    textInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); if (textSearchBtn) textSearchBtn.click(); }
    });
  }

  if (uploadSearchBtn) {
    uploadSearchBtn.addEventListener('click', () => {
      if (!currentFile) return;
      performSearch('image', currentFile.name, currentFile);
    });
  }

  // Find original main button — routes based on active sub-panel
  if (reverseBtn) {
    reverseBtn.addEventListener('click', () => {
      const subtab = getActiveReverseSubtab();
      if (subtab === 'photo') {
        if (!currentReverseFile) {
          showToast(t('search.upload.ready'));
          return;
        }
        performReverseSearch(currentReverseFile.name, 'image', currentReverseFile);
      } else if (subtab === 'link') {
        const v = (reverseLinkInput && reverseLinkInput.value || '').trim();
        if (!v) return;
        performReverseSearch(v, 'link', null);
      } else {
        const v = (reverseInput && reverseInput.value || '').trim();
        if (!v) return;
        performReverseSearch(v, 'text', null);
      }
    });
  }
  if (reverseInput) {
    reverseInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); if (reverseBtn) reverseBtn.click(); }
    });
  }
  if (reverseLinkInput) {
    reverseLinkInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); if (reverseBtn) reverseBtn.click(); }
    });
  }

  /* ============================================================
     Restore default cards (when search fails or on reset)
     ============================================================ */

  let DEFAULT_RESULTS_HTML = '';
  if (resultsGrid) DEFAULT_RESULTS_HTML = resultsGrid.innerHTML;

  function restoreDefaultCards() {
    if (!resultsGrid) return;
    resultsGrid.innerHTML = DEFAULT_RESULTS_HTML;
    if (resultsHeader) {
      const eyebrow = resultsHeader.querySelector('[data-i18n="results.eyebrow"]');
      const title   = resultsHeader.querySelector('[data-i18n="results.title"]');
      if (eyebrow) eyebrow.textContent = t('results.eyebrow');
      if (title)   title.textContent   = t('results.title');
    }
    bindSaveButtons();
    bindShareButtons();
  }

  /* ============================================================
     Recent searches
     ============================================================ */

  const RECENT_KEY  = 'altere_recent';
  const recentChips = document.getElementById('recentChips');
  const recentClear = document.getElementById('recentClear');

  function getRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
    catch { return []; }
  }
  function addRecentSearch(q) {
    if (!q) return;
    let list = getRecent().filter(x => x !== q);
    list.unshift(q);
    list = list.slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    renderRecent();
  }
  function renderRecent() {
    if (!recentChips) return;
    const list = getRecent();
    recentChips.innerHTML = list.map(q => `<button class="chip chip--recent" data-q="${escapeHtml(q)}">${escapeHtml(q)}</button>`).join('');
    recentChips.querySelectorAll('.chip--recent').forEach(chip => {
      chip.addEventListener('click', () => {
        const q = chip.getAttribute('data-q');
        if (textInput) textInput.value = q;
        const textTab = document.querySelector('.search-box__tab[data-tab="text"]');
        if (textTab) textTab.click();
        performSearch('text', q, null);
      });
    });
  }
  if (recentClear) {
    recentClear.addEventListener('click', () => {
      localStorage.removeItem(RECENT_KEY);
      renderRecent();
    });
  }
  renderRecent();

  /* ============================================================
     Trending chips
     ============================================================ */

  document.querySelectorAll('.chip--trending').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-q') || chip.textContent.trim();
      if (textInput) textInput.value = q;
      const textTab = document.querySelector('.search-box__tab[data-tab="text"]');
      if (textTab) textTab.click();
      performSearch('text', q, null);
    });
  });

  /* ============================================================
     Celebrity / aesthetic cards
     ============================================================ */

  document.querySelectorAll('[data-celeb-query]').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.getAttribute('data-celeb-query');
      if (textInput) textInput.value = q;
      const textTab = document.querySelector('.search-box__tab[data-tab="text"]');
      if (textTab) textTab.click();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => performSearch('text', q, null), 600);
    });
  });

  /* ============================================================
     Saved items
     ============================================================ */

  function getSaved() {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); }
    catch { return []; }
  }
  function setSavedList(list) {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list));
    updateSavedBadge();
  }
  function updateSavedBadge() {
    if (!savedBadge) return;
    const list = getSaved();
    savedBadge.textContent = list.length;
    savedBadge.style.display = list.length > 0 ? 'inline-flex' : 'none';
  }
  function isSavedById(id) {
    return getSaved().some(s => s.id === id);
  }
  function toggleSaved(card) {
    const id    = card.getAttribute('data-id');
    const name  = card.getAttribute('data-name');
    const store = card.getAttribute('data-store');
    const price = card.getAttribute('data-price');
    const image = card.getAttribute('data-image');
    const url   = card.getAttribute('data-url');
    let list = getSaved();
    const existing = list.findIndex(s => s.id === id);
    if (existing >= 0) {
      list.splice(existing, 1);
      setSavedList(list);
      card.querySelector('.dupe-card__save')?.classList.remove('saved');
      showToast(t('toast.removed'));
    } else {
      list.unshift({ id, name, store, price, image, url, savedAt: Date.now() });
      setSavedList(list);
      card.querySelector('.dupe-card__save')?.classList.add('saved');
      showToast(t('toast.saved'));
    }
  }
  function bindSaveButtons() {
    document.querySelectorAll('.dupe-card, .best-dupe__card').forEach(card => {
      const btn = card.querySelector('.dupe-card__save');
      if (!btn || btn._bound) return;
      btn._bound = true;
      const id = card.getAttribute('data-id');
      if (id && isSavedById(id)) btn.classList.add('saved');
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        toggleSaved(card);
      });
    });
  }
  function bindShareButtons() {
    document.querySelectorAll('.dupe-card__share-btn, .best-dupe__card__share-btn').forEach(btn => {
      if (btn._bound) return;
      btn._bound = true;
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const card  = btn.closest('.dupe-card, .best-dupe__card');
        if (!card) return;
        const name  = card.getAttribute('data-name');
        const store = card.getAttribute('data-store');
        const price = card.getAttribute('data-price');
        const text  = t('share.text').replace('{name}', name).replace('{store}', store).replace('{price}', price);
        if (navigator.share) {
          navigator.share({ title: 'ALTERE', text, url: location.href }).catch(() => {});
        } else {
          navigator.clipboard.writeText(text + ' ' + location.href);
          showToast(t('share.copied'));
        }
      });
    });
  }

  function renderSavedPage() {
    if (!savedGrid) return;
    const list = getSaved();
    if (list.length === 0) {
      savedGrid.innerHTML = '';
      if (savedEmpty) savedEmpty.style.display = 'block';
      return;
    }
    if (savedEmpty) savedEmpty.style.display = 'none';
    savedGrid.innerHTML = list.map((s, i) => `
      <article class="dupe-card" data-id="${escapeHtml(s.id)}" data-name="${escapeHtml(s.name)}" data-store="${escapeHtml(s.store)}" data-price="${escapeHtml(s.price)}" data-image="${escapeHtml(s.image)}" data-url="${escapeHtml(s.url)}">
        <div class="dupe-card__media">
          <img src="${escapeHtml(s.image)}" alt="${escapeHtml(s.name)}" loading="lazy">
          <button class="dupe-card__save saved" aria-label="Unsave"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>
        </div>
        <div class="dupe-card__body">
          <div class="dupe-card__store">${escapeHtml(s.store)}</div>
          <h3 class="dupe-card__name">${escapeHtml(s.name)}</h3>
          <div class="dupe-card__pricing"><span class="dupe-card__price">${escapeHtml(s.price)}</span></div>
          <div class="dupe-card__actions">
            <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener" class="dupe-card__shop-btn">Shop</a>
            <button class="dupe-card__share-btn" aria-label="Share"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>
          </div>
        </div>
      </article>
    `).join('');
    bindSaveButtons();
    bindShareButtons();
  }

  if (savedLink) {
    savedLink.addEventListener('click', e => {
      e.preventDefault();
      if (savedPage) {
        savedPage.classList.add('saved-page--open');
        renderSavedPage();
      }
    });
  }
  if (savedBack) {
    savedBack.addEventListener('click', () => {
      if (savedPage) savedPage.classList.remove('saved-page--open');
    });
  }
  if (savedClearAll) {
    savedClearAll.addEventListener('click', () => {
      setSavedList([]);
      renderSavedPage();
      showToast(t('toast.cleared'));
    });
  }

  updateSavedBadge();
  bindSaveButtons();
  bindShareButtons();

  /* ============================================================
     Filters (category, material, price, store)
     ============================================================ */

  function applyFilters() {
    document.querySelectorAll('.dupe-card, .best-dupe__card').forEach(card => {
      // Currently we don't have data attrs on default static cards for filtering;
      // this is a hook for future expansion. Show all by default.
      card.style.display = '';
    });
  }

  if (categoryFilters) {
    categoryFilters.querySelectorAll('button[data-category]').forEach(btn => {
      btn.addEventListener('click', () => {
        categoryFilters.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = btn.getAttribute('data-category');
        applyFilters();
      });
    });
  }
  if (materialFilters) {
    materialFilters.querySelectorAll('button[data-material]').forEach(btn => {
      btn.addEventListener('click', () => {
        materialFilters.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeMaterial = btn.getAttribute('data-material');
        applyFilters();
      });
    });
  }
  if (priceFilters) {
    priceFilters.querySelectorAll('button[data-price]').forEach(btn => {
      btn.addEventListener('click', () => {
        priceFilters.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const v = btn.getAttribute('data-price');
        if (v === 'all') { activeMinPrice = 0; activeMaxPrice = 0; }
        else {
          const parts = v.split('-');
          activeMinPrice = parseInt(parts[0]) || 0;
          activeMaxPrice = parseInt(parts[1]) || 0;
        }
        applyFilters();
      });
    });
  }
  if (storeFilters) {
    storeFilters.querySelectorAll('button[data-store]').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = btn.getAttribute('data-store');
        if (s === 'all') {
          activeStores.clear();
          storeFilters.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        } else {
          storeFilters.querySelector('button[data-store="all"]')?.classList.remove('active');
          if (activeStores.has(s)) {
            activeStores.delete(s);
            btn.classList.remove('active');
          } else {
            activeStores.add(s);
            btn.classList.add('active');
          }
        }
        applyFilters();
      });
    });
  }

  /* ============================================================
     Sort dropdown
     ============================================================ */

  const sortMenu   = document.getElementById('sortMenu');
  const sortLabel  = document.getElementById('sortLabel');
  const sortSelect = document.getElementById('sortSelect');

  if (sortSelect && sortMenu) {
    sortSelect.addEventListener('click', () => sortMenu.classList.toggle('open'));
    sortMenu.querySelectorAll('button[data-sort]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (sortLabel) sortLabel.textContent = btn.textContent;
        sortMenu.classList.remove('open');
      });
    });
  }

  /* ============================================================
     Auth (lightweight, no tier logic)
     ============================================================ */

  const authModal     = document.getElementById('authModal');
  const authClose     = document.getElementById('authClose');
  const authEmail     = document.getElementById('authEmail');
  const authName      = document.getElementById('authName');
  const authCreate    = document.getElementById('authCreate');
  const authSignout   = document.getElementById('authSignout');
  const signInLink    = document.getElementById('signInLink');
  const AUTH_KEY      = 'altere_user';

  function getUser() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); }
    catch { return null; }
  }
  function setUser(u) {
    if (u) localStorage.setItem(AUTH_KEY, JSON.stringify(u));
    else   localStorage.removeItem(AUTH_KEY);
    updateAuthUI();
  }
  function updateAuthUI() {
    const u = getUser();
    if (signInLink) signInLink.textContent = u ? (u.name || u.email) : t('nav.signin');
  }
  if (signInLink) {
    signInLink.addEventListener('click', e => {
      e.preventDefault();
      const u = getUser();
      if (u) {
        // already signed in — show signout option
        if (authModal) authModal.classList.add('modal--open');
      } else {
        if (authModal) authModal.classList.add('modal--open');
      }
    });
  }
  if (authClose && authModal) {
    authClose.addEventListener('click', () => authModal.classList.remove('modal--open'));
    authModal.addEventListener('click', e => { if (e.target === authModal) authModal.classList.remove('modal--open'); });
  }
  if (authCreate) {
    authCreate.addEventListener('click', () => {
      const email = (authEmail && authEmail.value || '').trim();
      const name  = (authName  && authName.value  || '').trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast(t('auth.invalidEmail'));
        return;
      }
      if (!name) { showToast(t('auth.invalidName')); return; }
      setUser({ email, name, createdAt: Date.now() });
      showToast(t('auth.welcome'));
      if (authModal) authModal.classList.remove('modal--open');
    });
  }
  if (authSignout) {
    authSignout.addEventListener('click', () => {
      setUser(null);
      showToast(t('auth.signedOut'));
      if (authModal) authModal.classList.remove('modal--open');
    });
  }
  updateAuthUI();

  /* ============================================================
     Social proof animated counters
     ============================================================ */

  function animateCounter(el, target) {
    const start = 0;
    const dur   = 1800;
    const t0    = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - t0) / dur);
      const eased    = 1 - Math.pow(1 - progress, 3);
      const value    = Math.floor(start + (target - start) * eased);
      el.textContent = value.toLocaleString();
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        if (el._counted) return;
        el._counted = true;
        const target = parseInt(el.getAttribute('data-counter')) || 0;
        animateCounter(el, target);
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.4 });

  document.querySelectorAll('[data-counter]').forEach(el => counterObserver.observe(el));

  /* ============================================================
     Dupe of the day
     ============================================================ */

  const DOTD_ITEMS = [
    {
      original: { name: 'Bottega Veneta Jodie', price: '\u20ac3,200', img: 'https://images.unsplash.com/photo-1591348278863-a8fb3887e2aa?w=500' },
      dupe:     { name: 'Knot Bag Soft Leather', store: 'COS', price: '\u20ac135', img: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500' }
    },
    {
      original: { name: 'The Row Margaux', price: '\u20ac4,890', img: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500' },
      dupe:     { name: 'Structured Tote', store: 'Mango', price: '\u20ac79', img: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=500' }
    },
    {
      original: { name: 'Toteme Cashmere Coat', price: '\u20ac1,890', img: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=500' },
      dupe:     { name: 'Wool-Blend Coat', store: 'COS', price: '\u20ac225', img: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=500' }
    }
  ];

  function renderDupeOfDay() {
    const today = Math.floor(Date.now() / 86400000);
    const item  = DOTD_ITEMS[today % DOTD_ITEMS.length];
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const setImg  = (id, src) => { const el = document.getElementById(id); if (el) el.src = src; };
    if (item) {
      setImg('dotd-original-img', item.original.img);
      setText('dotd-original-name', item.original.name);
      setText('dotd-original-price', item.original.price);
      setImg('dotd-dupe-img', item.dupe.img);
      setText('dotd-dupe-name', item.dupe.name);
      setText('dotd-dupe-price', item.dupe.price);
      setText('dotd-dupe-store', item.dupe.store);
    }
  }
  renderDupeOfDay();

  /* ============================================================
     Savings calculator
     ============================================================ */

  const calcSlider = document.getElementById('calcSlider');
  const calcBudget = document.getElementById('calcBudget');
  const calcMonth  = document.getElementById('calcMonth');
  const calcYear   = document.getElementById('calcYear');
  const calc5Years = document.getElementById('calc5Years');

  function updateCalc() {
    if (!calcSlider) return;
    const budget = parseInt(calcSlider.value) || 0;
    const saving = Math.round(budget * 0.68);
    if (calcBudget) calcBudget.textContent = '\u20ac' + budget.toLocaleString();
    if (calcMonth)  calcMonth.textContent  = '\u20ac' + saving.toLocaleString();
    if (calcYear)   calcYear.textContent   = '\u20ac' + (saving * 12).toLocaleString();
    if (calc5Years) calc5Years.textContent = '\u20ac' + (saving * 60).toLocaleString();
  }
  if (calcSlider) {
    calcSlider.addEventListener('input', updateCalc);
    updateCalc();
  }

  /* ============================================================
     Waitlist
     ============================================================ */

  const waitlistForm    = document.getElementById('waitlistForm');
  const waitlistEmail   = document.getElementById('waitlistEmail');
  const waitlistBtn     = document.getElementById('waitlistBtn');
  const waitlistSuccess = document.getElementById('waitlistSuccess');

  if (waitlistBtn) {
    waitlistBtn.addEventListener('click', e => {
      e.preventDefault();
      const email = (waitlistEmail && waitlistEmail.value || '').trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast(t('auth.invalidEmail'));
        return;
      }
      // Store locally
      const list = JSON.parse(localStorage.getItem('altere_waitlist') || '[]');
      if (!list.includes(email)) list.push(email);
      localStorage.setItem('altere_waitlist', JSON.stringify(list));
      if (waitlistForm) waitlistForm.style.display = 'none';
      if (waitlistSuccess) waitlistSuccess.classList.add('waitlist__success--show');
    });
  }

  /* ============================================================
     FAQ accordion
     ============================================================ */

  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-item__question');
    if (!q) return;
    q.addEventListener('click', () => {
      item.classList.toggle('faq-item--open');
    });
  });

  /* ============================================================
     About page
     ============================================================ */

  const aboutLink     = document.getElementById('aboutLink');
  const aboutPage     = document.getElementById('aboutPage');
  const aboutBack     = document.getElementById('aboutBack');
  const aboutCtaBtn   = document.getElementById('aboutCtaBtn');

  if (aboutLink && aboutPage) {
    aboutLink.addEventListener('click', e => {
      e.preventDefault();
      aboutPage.classList.add('about-page--open');
      window.scrollTo(0, 0);
    });
  }
  if (aboutBack && aboutPage) {
    aboutBack.addEventListener('click', () => aboutPage.classList.remove('about-page--open'));
  }
  if (aboutCtaBtn && aboutPage) {
    aboutCtaBtn.addEventListener('click', () => {
      aboutPage.classList.remove('about-page--open');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ============================================================
     Share Results (full page) + Story image generator
     ============================================================ */

  const shareResultsBtn = document.getElementById('shareResultsBtn');
  const shareStoryBtn   = document.getElementById('shareStoryBtn');

  if (shareResultsBtn) {
    shareResultsBtn.addEventListener('click', () => {
      const text = t('invite.message');
      if (navigator.share) {
        navigator.share({ title: 'ALTERE', text, url: location.href }).catch(() => {});
      } else {
        navigator.clipboard.writeText(text + ' ' + location.href);
        showToast(t('share.copied'));
      }
    });
  }

  function generateStoryImage() {
    const canvas = document.createElement('canvas');
    canvas.width  = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');

    // Dark luxury background
    const grad = ctx.createLinearGradient(0, 0, 0, 1920);
    grad.addColorStop(0, '#0f0d0a');
    grad.addColorStop(1, '#1a1612');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Logo / brand mark
    ctx.fillStyle = '#d4af7a';
    ctx.font = 'bold 72px serif';
    ctx.textAlign = 'center';
    ctx.fillText('ALTERE', 540, 200);

    // Tagline
    ctx.fillStyle = '#c5b8a3';
    ctx.font = '32px sans-serif';
    ctx.fillText(t('hero.eyebrow'), 540, 260);

    // Center quote
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 96px serif';
    const headline = 'Spot it.';
    ctx.fillText(headline, 540, 900);
    ctx.fillText("We'll source it.", 540, 1020);

    // Footer
    ctx.fillStyle = '#d4af7a';
    ctx.font = '36px sans-serif';
    ctx.fillText(t('share.story.footer'), 540, 1820);

    return canvas.toDataURL('image/png');
  }

  if (shareStoryBtn) {
    shareStoryBtn.addEventListener('click', () => {
      const dataUrl = generateStoryImage();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'altere-story.png';
      a.click();
      showToast(t('share.story.downloaded'));
    });
  }

  /* ============================================================
     Invite: copy link
     ============================================================ */

  const inviteCopyBtn = document.getElementById('inviteCopyBtn');
  if (inviteCopyBtn) {
    inviteCopyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(location.href);
      showToast(t('share.copied'));
    });
  }

  /* ============================================================
     Click outside dropdowns
     ============================================================ */

  document.addEventListener('click', e => {
    if (langSwitcher && !langSwitcher.contains(e.target)) {
      langSwitcher.classList.remove('open');
    }
    if (sortMenu && sortSelect && !sortSelect.contains(e.target) && !sortMenu.contains(e.target)) {
      sortMenu.classList.remove('open');
    }
  });

  /* ============================================================
     Cookie consent
     ============================================================ */

  const COOKIE_KEY    = 'altere_cookie_ok';
  const cookieConsent = document.getElementById('cookieConsent');
  const cookieAccept  = document.getElementById('cookieAccept');

  if (cookieConsent && !localStorage.getItem(COOKIE_KEY)) {
    setTimeout(() => cookieConsent.classList.add('cookie-consent--show'), 1200);
  }
  if (cookieAccept && cookieConsent) {
    cookieAccept.addEventListener('click', () => {
      localStorage.setItem(COOKIE_KEY, '1');
      cookieConsent.classList.remove('cookie-consent--show');
    });
  }

  /* ============================================================
     Scroll-reveal + match-bar fill
     ============================================================ */

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-on-scroll--visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal-on-scroll').forEach(el => revealObserver.observe(el));

  const matchBarObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const fill = entry.target;
        const w    = fill.style.width || '0%';
        fill.style.width = '0%';
        requestAnimationFrame(() => {
          fill.style.transition = 'width 1.2s cubic-bezier(.22,.9,.32,1)';
          fill.style.width = w;
        });
        matchBarObserver.unobserve(fill);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.match-bar__fill').forEach(el => matchBarObserver.observe(el));

});  // end DOMContentLoaded
