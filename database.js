// database.js - Zaawansowana obsługa bazy danych (localStorage)
// Obsługuje produkty z obrazami, opisy, kategorie, marżę właściciela, koszyk klienta oraz zamówienia.

const DB_KEYS = {
    PRODUCTS: 'porownywarka_products',
    SUPPLIERS: 'porownywarka_suppliers',
    DRAFTS: 'porownywarka_drafts',
    HISTORY: 'porownywarka_history',
    SETTINGS: 'porownywarka_settings',
    MARGINS: 'porownywarka_margins',
    CART: 'porownywarka_cart',
    ORDERS: 'porownywarka_orders',
    PACKAGING_MEMORY: 'porownywarka_packaging_memory',
    IGNORED_DUPLICATES: 'porownywarka_ignored_duplicate_pairs',
    SNAPSHOTS: 'porownywarka_snapshots'
};

const Database = {
    // Inicjalizacja bazy danych
    // Inicjalizacja bazy danych
    init() {
        if (!localStorage.getItem(DB_KEYS.MARGINS)) {
            this.saveMargins({
                globalMargin: 15, // Domyślnie +15% marży
                categoryMargins: {
                    'Kawy': 15,
                    'Słodycze': 20,
                    'Napoje': 18,
                    'Chemia': 22,
                    'Inne': 15
                },
                productMargins: {}
            });
        }

        // Jeśli klucz z produktami nie istnieje w localStorage, tworzymy pusty magazyn
        if (!localStorage.getItem(DB_KEYS.PRODUCTS)) {
            localStorage.setItem(DB_KEYS.PRODUCTS, JSON.stringify([]));
        }

        // Automatyczne WYCZYSZCZENIE uszkodzonych pozycji ze starych importów!
        let products = this.getProducts();
        if (products && products.length > 0) {
            const cleanProducts = products.filter(p => 
                !p.id.startsWith('prod_lavazza_') && 
                !p.id.startsWith('prod_milka_') && 
                !p.id.startsWith('prod_nutella_') && 
                !p.id.startsWith('prod_lipton_') && 
                !p.id.startsWith('prod_toffifee_') && 
                !p.id.startsWith('prod_redbull_') && 
                !p.id.startsWith('prod_kwas_') &&
                !p.id.startsWith('prod_cukierki_') &&
                !(p.name && (
                    p.name.includes('formularza') || 
                    p.name.includes('ZdjęcieNazwa') || 
                    p.name.includes('Zdj?cie') || 
                    p.name.includes('TerminCena') ||
                    p.name.includes('ilość') ||
                    p.name.includes('Początek') ||
                    p.name.includes('Dół')
                ))
            );
            if (cleanProducts.length !== products.length) {
                this.saveProducts(cleanProducts);
            }
        }

        // Automatyczne WYCZYSZCZENIE uszkodzonych presetów, starych reguł i pamięci powiązań
        try {
            localStorage.removeItem('porownywarka_supplier_memories');
            localStorage.removeItem('porownywarka_pattern_rules');
            localStorage.removeItem('porownywarka_packaging_memory');
            localStorage.removeItem('porownywarka_preset_Kraft Group');
            localStorage.removeItem('porownywarka_preset_Kraftgroup Hurtownia');
            localStorage.removeItem('porownywarka_preset_Monolith Polska');
            localStorage.removeItem('porownywarka_preset_Vicreate B2B');
        } catch(e) {}

        // Automatyczne wyczyszczenie nieczytelnych nazw i scalenie bazy danych przy każdym starcie!
        this.autoCleanAndMergeAllProducts();

        // Wymuszenie załadowania bazy ze zdjęciami Chipsy Złociste (v24 pure)
        const DB_VERSION_KEY = 'porownywarka_zlociste_chipsy_v24_pure';
        if (localStorage.getItem('porownywarka_db_version') !== DB_VERSION_KEY) {
            this.loadKravetsMasterCatalog(true);
            this.enrichAllImagesFromKravetsCatalog(true);
            localStorage.setItem('porownywarka_db_version', DB_VERSION_KEY);
        }

        // Automatyczne podpięcie zdjęć Kravets oraz Kraft Group, jeśli w bazie brakuje zdjęć
        this.enrichAllImagesFromKravetsCatalog();
        this.enrichAllImagesFromKraftCatalog();
    },

    // --- ZARZĄDZANIE MARŻĄ WŁAŚCICIELA ---
    getMargins() {
        return JSON.parse(localStorage.getItem(DB_KEYS.MARGINS)) || {
            globalMargin: 15,
            categoryMargins: {},
            productMargins: {}
        };
    },

    saveMargins(margins) {
        localStorage.setItem(DB_KEYS.MARGINS, JSON.stringify(margins));
    },

    // Wyliczanie marży (%) dla danego produktu
    getProductMarginPercent(product) {
        const margins = this.getMargins();
        if (!product) return margins.globalMargin || 15;
        
        // 1. Marża dedykowana dla konkretnego produktu (po ID lub EAN)
        if (margins.productMargins && product.ean && margins.productMargins[product.ean] !== undefined) {
            return parseFloat(margins.productMargins[product.ean]);
        }
        // 2. Marża dla kategorii
        if (product.category && margins.categoryMargins && margins.categoryMargins[product.category] !== undefined) {
            return parseFloat(margins.categoryMargins[product.category]);
        }
        // 3. Marża globalna
        return parseFloat(margins.globalMargin) || 15;
    },

    // Obliczanie ceny detalicznej dla klienta (Cena hurtowa + Marża lub Własna Ustala)
    calculateClientPrice(wholesalePrice, product) {
        if (product && product.customClientPrice && product.customClientPrice > 0) {
            return parseFloat(product.customClientPrice);
        }
        const cleanPrice = parseFloat(wholesalePrice);
        if (isNaN(cleanPrice) || cleanPrice <= 0) return 0;
        const marginPct = this.getProductMarginPercent(product);
        const clientPrice = cleanPrice * (1 + marginPct / 100);
        return Math.round(clientPrice * 100) / 100;
    },

    // --- DOSTAWCY (SUPPLIERS) ---
    getSuppliers() {
        return JSON.parse(localStorage.getItem(DB_KEYS.SUPPLIERS)) || [];
    },

    saveSupplier(supplier) {
        const suppliers = this.getSuppliers();
        const index = suppliers.findIndex(s => s.id === supplier.id);
        if (index > -1) {
            suppliers[index] = { ...suppliers[index], ...supplier };
        } else {
            supplier.id = 'sup_' + Date.now();
            suppliers.push(supplier);
        }
        localStorage.setItem(DB_KEYS.SUPPLIERS, JSON.stringify(suppliers));
        return supplier;
    },

    deleteSupplier(id) {
        let suppliers = this.getSuppliers();
        suppliers = suppliers.filter(s => s.id !== id);
        localStorage.setItem(DB_KEYS.SUPPLIERS, JSON.stringify(suppliers));
    },

    // --- PAMIĘĆ PAKOWANIA ---
    getPackagingMemory() {
        return JSON.parse(localStorage.getItem(DB_KEYS.PACKAGING_MEMORY)) || {};
    },

    savePackagingMemory(memory) {
        localStorage.setItem(DB_KEYS.PACKAGING_MEMORY, JSON.stringify(memory));
    },

    rememberPackSize(ean, packSize) {
        if (!ean) return;
        const mem = this.getPackagingMemory();
        mem[ean] = packSize;
        this.savePackagingMemory(mem);
    },

    getRememberedPackSize(ean) {
        if (!ean) return null;
        return this.getPackagingMemory()[ean];
    },

    // --- PRODUKTY (PRODUCTS) ---
    getProducts() {
        return JSON.parse(localStorage.getItem(DB_KEYS.PRODUCTS)) || [];
    },

    getProductById(id) {
        if (!id) return null;
        const products = this.getProducts();
        return products.find(p => p.id === id || (p.ean && p.ean === id) || p.name === id) || null;
    },

    updateProductImage(id, imageUrl) {
        if (!id) return false;
        const products = this.getProducts();
        const product = products.find(p => p.id === id || (p.ean && p.ean === id) || p.name === id);
        if (!product) return false;

        product.image = imageUrl ? imageUrl.trim() : null;
        this.saveProducts(products);

        // Zaktualizuj także kopię w pamięci
        if (window.KRAVETS_SCRAPED_CATALOG) {
            const kItem = window.KRAVETS_SCRAPED_CATALOG.find(k => k.id === id || (k.ean && k.ean === id) || k.name === id);
            if (kItem) kItem.image = product.image;
        }

        return true;
    },

    saveProducts(products) {
        localStorage.setItem(DB_KEYS.PRODUCTS, JSON.stringify(products));
    },

    // --- KWARANTANNA (DRAFTS) ---
    getDrafts() {
        return JSON.parse(localStorage.getItem(DB_KEYS.DRAFTS)) || [];
    },

    saveDraft(draft) {
        const drafts = this.getDrafts();
        draft.id = 'draft_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        drafts.push(draft);
        localStorage.setItem(DB_KEYS.DRAFTS, JSON.stringify(drafts));
        return draft.id;
    },

    saveDrafts(drafts) {
        localStorage.setItem(DB_KEYS.DRAFTS, JSON.stringify(drafts || []));
    },

    deleteDraft(id) {
        let drafts = this.getDrafts();
        drafts = drafts.filter(d => d.id !== id);
        localStorage.setItem(DB_KEYS.DRAFTS, JSON.stringify(drafts));
    },

    // --- WERSJONOWANIE I KOPIC ZAPASOWE KATALOGU (SNAPSHOTS) ---
    getSnapshots() {
        return JSON.parse(localStorage.getItem(DB_KEYS.SNAPSHOTS)) || [];
    },

    saveSnapshots(snapshots) {
        localStorage.setItem(DB_KEYS.SNAPSHOTS, JSON.stringify(snapshots));
    },

    createSnapshot(note = '') {
        const snapshots = this.getSnapshots();
        const products = this.getProducts();
        const drafts = this.getDrafts();
        const suppliers = this.getSuppliers();
        const margins = this.getMargins();

        const now = new Date();
        const dateStr = now.toLocaleDateString('pl-PL') + ' ' + now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        
        const snapshot = {
            id: 'snap_' + Date.now(),
            name: note ? note.trim() : `Wersja z dnia ${dateStr}`,
            date: now.toISOString(),
            dateFormatted: dateStr,
            productsCount: products.length,
            draftsCount: drafts.length,
            suppliersCount: suppliers.length,
            data: {
                products: products,
                drafts: drafts,
                suppliers: suppliers,
                margins: margins,
                packagingMemory: this.getPackagingMemory()
            }
        };

        snapshots.unshift(snapshot);
        this.saveSnapshots(snapshots);
        return snapshot;
    },

    restoreSnapshot(snapshotId) {
        const snapshots = this.getSnapshots();
        const snap = snapshots.find(s => s.id === snapshotId);
        if (!snap || !snap.data) return false;

        this.saveProducts(snap.data.products || []);
        localStorage.setItem(DB_KEYS.DRAFTS, JSON.stringify(snap.data.drafts || []));
        if (snap.data.suppliers) localStorage.setItem(DB_KEYS.SUPPLIERS, JSON.stringify(snap.data.suppliers));
        if (snap.data.margins) this.saveMargins(snap.data.margins);
        if (snap.data.packagingMemory) this.savePackagingMemory(snap.data.packagingMemory);

        return true;
    },

    deleteSnapshot(snapshotId) {
        let snapshots = this.getSnapshots();
        snapshots = snapshots.filter(s => s.id !== snapshotId);
        this.saveSnapshots(snapshots);
    },

    exportFullBackupJSON() {
        const backupData = {
            version: "1.0",
            exportDate: new Date().toISOString(),
            products: this.getProducts(),
            drafts: this.getDrafts(),
            suppliers: this.getSuppliers(),
            margins: this.getMargins(),
            packagingMemory: this.getPackagingMemory()
        };
        const jsonStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const now = new Date();
        const dateTag = now.toISOString().slice(0,10);
        a.download = `katalog_kopia_zapasowa_${dateTag}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    importFullBackupJSON(jsonData) {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            if (!data || (!data.products && !data.drafts)) {
                throw new Error("Plik nie zawiera prawidłowej struktury katalogu.");
            }
            if (data.products) this.saveProducts(data.products);
            if (data.drafts) localStorage.setItem(DB_KEYS.DRAFTS, JSON.stringify(data.drafts));
            if (data.suppliers) localStorage.setItem(DB_KEYS.SUPPLIERS, JSON.stringify(data.suppliers));
            if (data.margins) this.saveMargins(data.margins);
            if (data.packagingMemory) this.savePackagingMemory(data.packagingMemory);
            return true;
        } catch(err) {
            console.error("Backup import error:", err);
            return false;
        }
    },

    // --- Pomocnicze algorytmy czyszczenia i inteligentnego dopasowywania ---
    // --- SAMOUCZĄCY SIĘ SILNIK REGUŁ PAMIĘCIOWYCH (AI PATTERN MEMORY) ---
    getPatternRules() {
        try {
            const raw = localStorage.getItem('porownywarka_pattern_rules');
            return raw ? JSON.parse(raw) : {
                'cukierki': { packSize: 5, unit: 'kg' },
                'cukierków': { packSize: 5, unit: 'kg' },
                'żelki': { packSize: 5, unit: 'kg' },
                'kawa': { packSize: 6, unit: 'szt.' }
            };
        } catch(e) { return {}; }
    },

    inferPackaging(rawName, explicitPackSize = 1, explicitUnit = 'szt.') {
        if (explicitPackSize && explicitPackSize > 1) {
            return { packSize: explicitPackSize, unit: explicitUnit || 'szt.' };
        }
        const n = (rawName || '').toLowerCase();

        // 1. Sprzęt / Regały / Akcesoria / Keg / Lany 30l / Beczki
        if (n.includes('regał') || n.includes('stojak') || n.includes('głowica') || n.includes('lany') || n.includes('30.0 l') || n.includes('30 l') || n.includes('keg') || n.includes('beczka')) {
            return { packSize: 1, unit: 'szt.' };
        }

        // 2. Butelki 1.5l, 2.0l oraz 1.0l (zgrzewki po 6 sztuk)
        if (n.includes('1.5 l') || n.includes('1,5 l') || n.includes('2.0 l') || n.includes('2,0 l') || n.includes('2 l') || n.includes('1.0 l') || n.includes('1 l')) {
            return { packSize: 6, unit: 'szt.' };
        }

        // 3. Butelki i puszki 0.5l, 0.33l, 500ml (zgrzewki po 12 lub 20 sztuk)
        if (n.includes('0.5 l') || n.includes('0,5 l') || n.includes('500 ml') || n.includes('0.33 l') || n.includes('0,33 l') || n.includes('330 ml')) {
            return { packSize: 12, unit: 'szt.' };
        }

        // 4. Słodycze na wagę (kartony 3kg - 7kg)
        if (n.includes('cukierk') || n.includes('żelk') || n.includes('ciastka na wagę') || n.includes('waga')) {
            return { packSize: 5, unit: 'kg' };
        }

        const learned = this.getLearnedPackSize(rawName);
        if (learned && learned.packSize) return learned;

        return { packSize: 1, unit: 'szt.' };
    },

    resolveProductImage(rawName, rawImage = '') {
        if (rawImage && !rawImage.includes('placeholder') && !rawImage.includes('unsplash') && rawImage.length > 5) {
            return rawImage;
        }
        const n = (rawName || '').toLowerCase();

        if (n.includes('taras') || n.includes('kwas')) {
            if (n.includes('biały') || n.includes('bialy')) {
                return 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=80';
            }
            if (n.includes('czarny') && (n.includes('lany') || n.includes('30'))) {
                return 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=400&auto=format&fit=crop&q=80';
            }
            if (n.includes('czarny')) {
                return 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&auto=format&fit=crop&q=80';
            }
            if (n.includes('prawdziwy')) {
                return 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=400&auto=format&fit=crop&q=80';
            }
            if (n.includes('regał') || n.includes('stojak')) {
                return 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=400&auto=format&fit=crop&q=80';
            }
            return 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&auto=format&fit=crop&q=80';
        }

        if (n.includes('kawa') || n.includes('coffee') || n.includes('espresso')) {
            return 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&auto=format&fit=crop&q=80';
        }
        if (n.includes('herbata') || n.includes('tea')) {
            return 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop&q=80';
        }
        if (n.includes('cukierk') || n.includes('czekolad') || n.includes('słodycz') || n.includes('wafl')) {
            return 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=400&auto=format&fit=crop&q=80';
        }

        return 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&auto=format&fit=crop&q=80';
    },

    learnPatternRule(rawName, packSize, unit = 'szt.') {
        if (!rawName || !packSize || packSize <= 0) return;
        const norm = (this.cleanAndNormalizeProductName ? this.cleanAndNormalizeProductName(rawName) : rawName).toLowerCase();
        if (norm.length < 3) return;

        const rules = this.getPatternRules();
        const words = norm.split(/\s+/).filter(w => w.length >= 4 && !/\d/.test(w));
        words.forEach(word => {
            rules[word] = { packSize: packSize, unit: unit, updatedAt: new Date().toISOString() };
        });
        localStorage.setItem('porownywarka_pattern_rules', JSON.stringify(rules));
        console.log(`[PatternMemory] Nauczono reguły dla słów: ${words.join(', ')} -> ${packSize} ${unit}`);
    },

    getLearnedPackSize(rawName) {
        if (!rawName) return null;
        const norm = (this.cleanAndNormalizeProductName ? this.cleanAndNormalizeProductName(rawName) : rawName).toLowerCase();
        const rules = this.getPatternRules();
        const words = norm.split(/\s+/).filter(w => w.length >= 3);
        for (const w of words) {
            if (rules[w] && rules[w].packSize) {
                return rules[w];
            }
        }
        return null;
    },

    cleanEan(ean) {
        if (ean === undefined || ean === null) return '';
        let str = ean.toString().trim();
        if (str.toLowerCase().includes('e+')) {
            const num = Number(str);
            if (!isNaN(num)) str = num.toFixed(0);
        }
        if (str.includes('.')) {
            const parts = str.split('.');
            if (parts[1] === '0' || parts[1] === '00') str = parts[0];
        }
        str = str.replace(/[^\d]/g, '');
        return str;
    },

    // Czyszczenie brudnych nazw ze stron internetowych (usuwanie adresów WWW www.kraft..., śmieci webowych, promocji, formatowanie Title Case)
    cleanAndNormalizeProductName(rawName) {
        if (!rawName) return '';
        let cleaned = rawName.toString()
            .replace(/<[^>]*>/g, ' ') // Usuwanie tagów HTML
            .replace(/&nbsp;|&quot;|&#39;|&amp;/gi, ' ')
            .trim();

        // 0. Usuwanie adresów WWW, domen internetowych i ścieżek URL (np. www.kraftgroup.pl, shop.monolith-polska.com, https://...)
        cleaned = cleaned
            .replace(/(https?:\/\/|www\.)[^\s\/$?#]+\S*/gi, ' ')
            .replace(/\b[a-z0-9.-]+\.(pl|com|de|eu|net|org|shop)(\/[^\s]*)?/gi, ' ')
            .replace(/\b(strona główna|home|kategoria|sklep|b2b|hurtownia)\s*[>|\/\\-]\s*/gi, ' ');

        // 1. Usuwanie przycisków sklepów WWW i śmieci reklamowo-koszykowych oraz formularzy
        cleaned = cleaned
            .replace(/Pocz[aą\?]+tek\s*formularza.*$/gi, ' ')
            .replace(/D[oó\?]+[\s\l]*formularza.*$/gi, ' ')
            .replace(/ilo[śs\?]+.*$/gi, ' ')
            .replace(/^(?:Pocz[aą\?]+tek\s*formularza|D[oó\?]+[\s\l]*formularza|ilo[śs\?]+|\s)+/gi, ' ')
            .replace(/^(?:Zdj[eę\?]?cie\s*Nazwa\s*EAN\s*Termin\s*Cena|ZdjęcieNazwaEANTerminCena|Zdj\?cieNazwaEANTerminCena)\s*/gi, ' ')
            .replace(/\b\d{2}[\.\-\/]\d{2}[\.\-\/]\d{4}\b/g, ' ')
            .replace(/\b\d{4}[\.\-\/]\d{2}[\.\-\/]\d{2}\b/g, ' ')
            .replace(/(?:EAN|GTIN|SKU|Kod|Symbol|Index|Indeks|Art\.\s*nr|Nr\s*art|Ref)[\s:\-#]*[0-9A-Za-z]{5,16}/gi, ' ')
            .replace(/\b\d{8,14}\b/g, ' ')
            .replace(/\b(do koszyka|dodaj do koszyka|kup teraz|w koszyku|brak w magazynie|w magazynie|dostępność|sprawdź cenę|cena netto|zł netto|netto|brutto|pln)\b|\b\d+\s*zł\b|\s+zł\b/gi, ' ');
        cleaned = cleaned.replace(/promocja|promo|nowość|hit|bestseller|wyprzedaż|okazja|vat\s*\d+%|kod\s*:\s*\w+|ean\s*:\s*\w+|\[.*?\]|\(.*?zgrzewka.*?\)/gi, ' ');
        
        // 2. Rozwijanie powszechnych skrótów hurtowych i transliteracja
        cleaned = cleaned
            .replace(/\bmiel\.\b|\bmiel\b|\bmolot\.\b/gi, 'mielona')
            .replace(/\brozp\.\b|\brozp\b|\brozpuszcz\.\b/gi, 'rozpuszczalna')
            .replace(/\bziarn\.\b|\bziarn\b|\bzern\.\b/gi, 'ziarnista')
            .replace(/\bniegaz\.\b|\bniegaz\b/gi, 'niegazowana')
            .replace(/\bgaz\.\b|\bgaz\b/gi, 'gazowana')
            .replace(/\bczarn\.\b/gi, 'czarna')
            .replace(/\bziel\.\b/gi, 'zielona')
            .replace(/\bszt\.\b|\bszt\b/gi, 'sztuki')
            .replace(/\bop\.\b|\bopak\.\b/gi, 'opakowanie');

        // 3. Usuwanie znaków specjalnych z brzegów i wielokrotnych spacji oraz rekonstrukcja polskich liter
        cleaned = cleaned
            .replace(/Bia[\s\uFFFD\?]*y/gi, 'Biały')
            .replace(/g[\s\uFFFD\?]*owica/gi, 'głowica')
            .replace(/ma[\s\uFFFD\?]*y/gi, 'mały')
            .replace(/Rega[łl\s\uFFFD\?]*(?=drewnian)/gi, 'Regał ')
            .replace(/Prawdziw[y\s\uFFFD\?]*/gi, 'Prawdziwy')
            .replace(/^[\s\-–|:;,.]+/, '')
            .replace(/[\s\-–|:;,.]+$/, '')
            .replace(/\s+/g, ' ').trim();

        // 4. Formatowanie pisowni (ALL CAPS -> Czytelne Title Case)
        if (cleaned === cleaned.toUpperCase() && cleaned.length > 4) {
            cleaned = cleaned.toLowerCase().replace(/(?:^|\s|-)\S/g, function(a) { return a.toUpperCase(); });
        }

        return cleaned;
    },

    normalizeName(name) {
        if (!name) return '';
        const cleaned = this.cleanAndNormalizeProductName(name);
        return cleaned.toLowerCase()
            .replace(/,/g, '.')
            .replace(/[^a-z0-9\s\.]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    },

    // Ekstrakcja standaryzowanej gramatury/objętości (w przeliczeniu na gramy/ml/szt)
    extractMetric(name) {
        if (!name) return null;
        const norm = name.toLowerCase().replace(/,/g, '.');
        
        // Szukamy np. 250g, 1.5l, 500ml, 1kg, 20 szt
        const match = norm.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l|cl|szt|op)\b/);
        if (!match) return null;
        
        const val = parseFloat(match[1]);
        const unit = match[2];
        if (isNaN(val)) return null;

        if (unit === 'kg') return { value: Math.round(val * 1000), type: 'mass' };
        if (unit === 'g') return { value: Math.round(val), type: 'mass' };
        if (unit === 'l') return { value: Math.round(val * 1000), type: 'volume' };
        if (unit === 'ml') return { value: Math.round(val), type: 'volume' };
        if (unit === 'cl') return { value: Math.round(val * 10), type: 'volume' };
        if (unit === 'szt' || unit === 'op') return { value: Math.round(val * 100000), type: 'count' };
        
        return null;
    },

    // Ekstrakcja kluczowych wariantów (smak, rodzaj, odmiana, gazowana/niegazowana)
    extractVariants(name) {
        if (!name) return [];
        const norm = name.toLowerCase();
        const vars = [];
        
        if (norm.includes('niegazowan')) vars.push('niegazowana');
        else if (norm.includes('gazowan')) vars.push('gazowana');
        
        if (norm.includes('ziarnist')) vars.push('ziarnista');
        else if (norm.includes('mielon')) vars.push('mielona');
        else if (norm.includes('rozpuszczaln')) vars.push('rozpuszczalna');
        else if (norm.includes('kapsułk')) vars.push('kapsulki');

        if (norm.includes('bez cukru') || norm.includes('zero')) vars.push('zero');
        
        // Smaki napojów, kwasów, słodyczy, dań gotowych, przypraw i herbat
        const flavors = [
            'biały', 'bialy', 'chmielow', 'tradycyjn', 'klasyczn', 'ciemn', 'czarn', 'litewsk', 'podlask',
            'miodow', 'mied', 'śliwk', 'sliwk', 'gruszk', 'estragon', 'tarchun', 'berberys', 'saperawi',
            'truskawk', 'jabłk', 'jablk', 'cytryn', 'pomarańcz', 'pomarancz', 'malin', 'wiśn', 'wisn', 'czereśn',
            'brzoskwini', 'banan', 'wanili', 'czekolad', 'orzech', 'migdał', 'migdal', 'kokos',
            'awokado', 'oliwk', 'aloes', 'rumianek', 'lawend',
            '1001', 'alpine', 'blossom', 'bergamot', 'diamond', 'champagne', 'ceylon', 'dessert', 'berry',
            'curry', 'bigos', 'gyros', 'grzyb', 'kurczak', 'ser', 'pomidor', 'czosnek', 'pieprz'
        ];
        flavors.forEach(f => {
            if (norm.includes(f)) vars.push(f);
        });

        return vars;
    },

    levenshteinDistance(a, b) {
        if (!a || !b) return (a || b).length;
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    },

    fuzzyWordMatch(w1, w2) {
        if (!w1 || !w2) return false;
        if (w1 === w2) return true;
        if (Math.abs(w1.length - w2.length) > 3) return false;
        const maxLen = Math.max(w1.length, w2.length);
        if (maxLen <= 3) return w1 === w2;
        const dist = this.levenshteinDistance(w1, w2);
        return (dist / maxLen) <= 0.25; // 75%+ podobieństwo słowa
    },

    calculateSimilarity(name1, name2) {
        const n1 = this.normalizeName(name1);
        const n2 = this.normalizeName(name2);
        if (n1 === n2) return 1.0;

        // Pamięć połączonych aliasów
        const memory = JSON.parse(localStorage.getItem(DB_KEYS.PACKAGING_MEMORY)) || {};
        if (memory[n1] && this.normalizeName(memory[n1]) === n2) return 1.0;
        if (memory[n2] && this.normalizeName(memory[n2]) === n1) return 1.0;

        // 1. OCHRONA GRAMATURY I LITRAŻU: Jeśli nazwy zawierają różne pojemności (np. 0.5L vs 1.5L vs 2L) -> 0.0%
        const cap1 = this.extractCapacityOrWeight(name1);
        const cap2 = this.extractCapacityOrWeight(name2);
        if (cap1 && cap2 && cap1 !== cap2) {
            return 0.0; // BEZWZGLĘDNE BLOKOWANIE ŁĄCZENIA RÓŻNYCH POJEMNOŚCI (np. 0.5L vs 2L)
        }

        // 2. OCHRONA WARIANTÓW (np. gazowana vs niegazowana, ziarnista vs mielona)
        const v1 = this.extractVariants(name1);
        const v2 = this.extractVariants(name2);
        if (v1.length > 0 && v2.length > 0) {
            const hasConflict = v1.some(v => !v2.includes(v)) || v2.some(v => !v1.includes(v));
            if (hasConflict) {
                return 0.0; // BEZWZGLĘDNE BLOKOWANIE ŁĄCZENIA SPRZECZNYCH WARIANTÓW
            }
        }

        const words1 = n1.split(' ').filter(w => w.length > 1);
        const words2 = n2.split(' ').filter(w => w.length > 1);
        if (words1.length === 0 || words2.length === 0) return 0;

        let matchCount = 0;
        words1.forEach(w => {
            if (words2.some(w2 => this.fuzzyWordMatch(w, w2))) {
                matchCount++;
            }
        });

        // Dice / Sorensen overlap coefficient
        const overlapScore = (2.0 * matchCount) / (words1.length + words2.length);
        return parseFloat(overlapScore.toFixed(3));
    },

    findMatchingProduct(products, ean, sku, name) {
        const cleanedEan = this.cleanEan(ean);

        // 1. Dopasowanie po Międzynarodowym Kodzie EAN (zarówno głównym jak i alternatywnym w liście eans: [])
        if (cleanedEan.length >= 7 && !cleanedEan.startsWith('FILE-') && !cleanedEan.startsWith('PASTE-')) {
            const eanMatch = products.find(p => {
                const primaryClean = this.cleanEan(p.ean);
                if (primaryClean === cleanedEan) return true;
                if (p.eans && Array.isArray(p.eans)) {
                    return p.eans.some(alt => this.cleanEan(alt) === cleanedEan);
                }
                return false;
            });
            if (eanMatch) return eanMatch;
        }

        // 2. Dokładne dopasowanie znormalizowanej nazwy
        const normName = this.normalizeName(name);
        if (normName) {
            const exactNameMatch = products.find(p => this.normalizeName(p.name) === normName);
            if (exactNameMatch) return exactNameMatch;
        }

        // 3. Inteligentne scalanie po nazwie (tylko gdy brak sprzecznych kodów EAN i wysoka pewność >= 90%)
        if (normName && name.length >= 4) {
            let bestProd = null;
            let bestScore = 0;
            for (const p of products) {
                const prodEan = this.cleanEan(p.ean);
                // Jeśli oba produkty posiadają różne, ważne kody EAN, nie scalaj po cichu przy wstawianiu oferty - pozwól modułowi EAN na analizę
                const bothHaveDiffEans = cleanedEan && prodEan && cleanedEan.length >= 7 && prodEan.length >= 7 && cleanedEan !== prodEan && !cleanedEan.startsWith('FILE-') && !prodEan.startsWith('FILE-');
                if (bothHaveDiffEans) continue;

                const sim = this.calculateSmartSimilarity(name, p.name);
                if (sim > bestScore) {
                    bestScore = sim;
                    bestProd = p;
                }
            }
            if (bestScore >= 0.90) {
                return bestProd;
            }
        }

        return null;
    },

    // Uniwersalny automatyczny czyściciel i połączeniowiec bazy towarów z hurtowni (Szybkość O(1))
    autoCleanAndMergeAllProducts() {
        const products = this.getProducts();
        if (products.length === 0) return { cleanedCount: 0, mergedCount: 0 };

        let cleanedCount = 0;
        let mergedCount = 0;

        // 1. Czyścimy nieczytelne nazwy ze wszystkich produktów
        products.forEach(p => {
            const cleanName = this.cleanAndNormalizeProductName(p.name);
            if (cleanName && cleanName !== p.name) {
                p.name = cleanName;
                cleanedCount++;
            }
        });

        // 2. Błyskawiczne scalanie O(1) po identycznych kodach EAN
        const eanMap = new Map();
        const mergedList = [];

        products.forEach(p => {
            const cEan = this.cleanEan(p.ean);
            let existing = null;
            if (cEan && cEan.length >= 7 && !cEan.startsWith('FILE-') && !cEan.startsWith('PASTE-')) {
                existing = eanMap.get(cEan) || null;
            }

            if (existing && existing.id !== p.id) {
                if (!existing.offers) existing.offers = [];
                if (p.offers) {
                    p.offers.forEach(off => {
                        const existingOfferIdx = existing.offers.findIndex(o => o.source && o.source.toLowerCase().trim() === (off.source || '').toLowerCase().trim());
                        if (existingOfferIdx >= 0) {
                            if (off.price < existing.offers[existingOfferIdx].price) {
                                existing.offers[existingOfferIdx] = off;
                            }
                        } else {
                            existing.offers.push(off);
                        }
                    });
                }
                mergedCount++;
            } else {
                mergedList.push(p);
                if (cEan && cEan.length >= 7) eanMap.set(cEan, p);
            }
        });

        if (cleanedCount > 0 || mergedCount > 0) {
            this.saveProducts(mergedList);
            this._dupsCache = null;
            this._dupsCacheKey = '';
        }
        return { cleanedCount, mergedCount };
    },

    // Rozłączanie błędnie połączonej oferty (Unmerge)
    unmergeOffer(productId, offerSource) {
        const products = this.getProducts();
        const prodIdx = products.findIndex(p => p.id === productId);
        if (prodIdx < 0) return false;

        const product = products[prodIdx];
        if (!product.offers || product.offers.length <= 1) return false;

        const offerToUnmergeIdx = product.offers.findIndex(o => o.source === offerSource);
        if (offerToUnmergeIdx < 0) return false;

        const unmergedOffer = product.offers.splice(offerToUnmergeIdx, 1)[0];

        // Tworzymy nowy osobny produkt dla wydzielonej oferty
        const newProduct = {
            id: 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            ean: '',
            sku: '',
            name: `${product.name} (${unmergedOffer.source})`,
            image: product.image,
            description: product.description,
            category: product.category,
            subCategory: product.subCategory,
            unit: product.unit,
            packSize: product.packSize,
            packagePrice: unmergedOffer.price,
            vat: product.vat,
            offers: [unmergedOffer]
        };

        products.push(newProduct);
        this.saveProducts(products);
        this._dupsCache = null;
        this._dupsCacheKey = '';
        return true;
    },

    // Automatyczne scalanie istniejących duplikatów w bazie danych (Błyskawiczne O(1))
    consolidateDatabase() {
        return this.autoCleanAndMergeAllProducts().mergedCount;
    },

    extractCapacityOrWeight(name) {
        if (!name) return '';
        const n = String(name).toLowerCase();
        
        // 0. Mnożniki typu: 2g x 24tor, 2gr x 50piram, 100g x 12
        const multMatch = n.match(/(\d+(?:[\.,]\d+)?)\s*(?:g|gr|gram|gramów|ml|l)\s*[xX\*]\s*(\d+)\s*(?:szt|tor|piram|saszet|kaps|tabl|op)?/i);
        if (multMatch) {
            const single = parseFloat(multMatch[1].replace(',', '.'));
            const count = parseInt(multMatch[2], 10);
            const total = Math.round(single * count);
            return `${total}g`;
        }

        const countMultMatch = n.match(/(\d+)\s*[xX\*]\s*(\d+(?:[\.,]\d+)?)\s*(?:g|gr|gram|gramów|ml|l)/i);
        if (countMultMatch) {
            const count = parseInt(countMultMatch[1], 10);
            const single = parseFloat(countMultMatch[2].replace(',', '.'));
            const total = Math.round(single * count);
            return `${total}g`;
        }

        // 1. Litry / mililitry
        const lMatch = n.match(/\b(\d+(?:[\.,]\d+)?)\s*(?:l|litr|litra|litrów|lt)\b/i);
        if (lMatch) {
            const val = parseFloat(lMatch[1].replace(',', '.'));
            return `${val}l`;
        }
        const mlMatch = n.match(/\b(\d{2,4})\s*ml\b/i);
        if (mlMatch) {
            const val = parseInt(mlMatch[1], 10);
            return `${val / 1000}l`;
        }

        // 2. Kilogramy / gramy
        const kgMatch = n.match(/\b(\d+(?:[\.,]\d+)?)\s*(?:kg|kilo|kilogram|kilogramów)\b/i);
        if (kgMatch) {
            const val = parseFloat(kgMatch[1].replace(',', '.'));
            return `${val * 1000}g`;
        }
        const gMatch = n.match(/\b(\d+(?:[\.,]\d+)?)\s*(?:g|gr|gram|gramów)\b/i);
        if (gMatch) {
            const val = parseFloat(gMatch[1].replace(',', '.'));
            return `${Math.round(val)}g`;
        }

        return '';
    },

    cleanCompareName(name) {
        if (!name) return '';
        let s = String(name).toLowerCase();
        s = s.replace(/\b(new|pet|dtr|folia|nowość|oryginalny|pasteryzowany|sterylizowany|kaucja|kaucyjna|zwrotna|butelka|but|puszka|szkło|szklana|plastik|karton|tuba|zgrzewka|naklejka|importer|dystrybucja)\b/gi, ' ');
        s = s.replace(/\b\d+[\.,]?\d*\s*(?:l|ml|kg|g|szt|sztuk|op|opak)\b/gi, ' ');
        s = s.replace(/[\/\(\)\"\',:\-\.\+]/g, ' ');
        return s.replace(/\s+/g, ' ').trim();
    },

    calculateSmartSimilarity(name1, name2) {
        const cap1 = this.extractCapacityOrWeight(name1);
        const cap2 = this.extractCapacityOrWeight(name2);

        // BEZWZGLĘDNA BLOKADA: jeśli oba produkty mają wykrytą różną pojemność/wagę -> 0 podobieństwa
        if (cap1 && cap2 && cap1 !== cap2) {
            return 0;
        }

        const rawSim = this.calculateSimilarity(name1, name2);
        const clean1 = this.cleanCompareName(name1);
        const clean2 = this.cleanCompareName(name2);
        const cleanSim = this.calculateSimilarity(clean1, clean2);

        let baseSim = Math.max(rawSim, cleanSim);

        // Jeśli pojemność jest identyczna i zbieżność słów wynosi min. 40%, dodajemy bonus
        if (cap1 && cap2 && cap1 === cap2) {
            if (baseSim >= 0.70) {
                baseSim = Math.min(1.0, baseSim + 0.25); // Np. Taras Biały 0.5L vs Taras Biały 0.5L -> 1.0 / 0.95
            } else if (baseSim >= 0.40) {
                baseSim = Math.min(0.85, baseSim + 0.15); // Strefa 65%-85%: niepewne warianty -> pytaj w osobnym oknie!
            }
        }

        return parseFloat(baseSim.toFixed(3));
    },

    // SŁOWNIK PREFIKSÓW GS1 DLA IDENTYFIKACJI KRAJÓW I NAKLEJEK KAUCYJNYCH / DYSTRYBUCYJNYCH
    GS1_PREFIXES: {
        '590': { country: 'Polska (PL)', code: 'PL', isDepositRelabelCandidate: true },
        '482': { country: 'Ukraina (UA)', code: 'UA', isImportOrigin: true },
        '400': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '401': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '402': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '403': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '404': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '405': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '406': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '407': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '408': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '409': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '410': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '411': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '412': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '413': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '414': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '415': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '416': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '417': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '418': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '419': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '420': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '421': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '422': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '423': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '424': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '425': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '426': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '427': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '428': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '429': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '430': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '431': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '432': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '433': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '434': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '435': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '436': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '437': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '438': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '439': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '440': { country: 'Niemcy (DE)', code: 'DE', isImportOrigin: true },
        '477': { country: 'Litwa (LT)', code: 'LT', isImportOrigin: true },
        '475': { country: 'Łotwa (LV)', code: 'LV', isImportOrigin: true },
        '474': { country: 'Estonia (EE)', code: 'EE', isImportOrigin: true },
        '486': { country: 'Gruzja (GE)', code: 'GE', isImportOrigin: true },
        '484': { country: 'Mołdawia (MD)', code: 'MD', isImportOrigin: true },
        '481': { country: 'Białoruś (BY)', code: 'BY', isImportOrigin: true },
        '380': { country: 'Bułgaria (BG)', code: 'BG', isImportOrigin: true },
        '599': { country: 'Węgry (HU)', code: 'HU', isImportOrigin: true },
        '858': { country: 'Słowacja (SK)', code: 'SK', isImportOrigin: true },
        '859': { country: 'Czechy (CZ)', code: 'CZ', isImportOrigin: true },
        '520': { country: 'Grecja (GR)', code: 'GR', isImportOrigin: true },
        '521': { country: 'Grecja (GR)', code: 'GR', isImportOrigin: true },
        '385': { country: 'Chorwacja (HR)', code: 'HR', isImportOrigin: true }
    },

    getEanCountryInfo(ean) {
        const clean = this.cleanEan(ean);
        if (!clean || clean.length < 3) return { country: 'Brak / Nieznany', code: '??', isDepositCandidate: false, prefix: '' };
        
        const prefix3 = clean.substring(0, 3);
        if (this.GS1_PREFIXES[prefix3]) {
            return {
                country: this.GS1_PREFIXES[prefix3].country,
                code: this.GS1_PREFIXES[prefix3].code,
                isDepositCandidate: prefix3 === '590',
                isImportOrigin: !!this.GS1_PREFIXES[prefix3].isImportOrigin,
                prefix: prefix3
            };
        }
        
        const prefix2 = clean.substring(0, 2);
        if (prefix2 >= '00' && prefix2 <= '13') {
            return { country: 'USA / Kanada (US/CA)', code: 'US', isDepositCandidate: false, isImportOrigin: true, prefix: prefix2 };
        }
        if (prefix2 >= '30' && prefix2 <= '37') {
            return { country: 'Francja (FR)', code: 'FR', isDepositCandidate: false, isImportOrigin: true, prefix: prefix2 };
        }
        if (prefix2 >= '80' && prefix2 <= '83') {
            return { country: 'Włochy (IT)', code: 'IT', isDepositCandidate: false, isImportOrigin: true, prefix: prefix2 };
        }
        if (prefix2 >= '84' && prefix2 <= '84') {
            return { country: 'Hiszpania (ES)', code: 'ES', isDepositCandidate: false, isImportOrigin: true, prefix: prefix2 };
        }
        
        return { country: 'Międzynarodowy', code: 'INT', isDepositCandidate: false, isImportOrigin: false, prefix: prefix3 };
    },

    evaluateEanRelationship(ean1, ean2, name1, name2) {
        const clean1 = this.cleanEan(ean1);
        const clean2 = this.cleanEan(ean2);

        const hasEan1 = clean1 && clean1.length >= 7 && !clean1.startsWith('FILE-') && !clean1.startsWith('PASTE-');
        const hasEan2 = clean2 && clean2.length >= 7 && !clean2.startsWith('FILE-') && !clean2.startsWith('PASTE-');

        // 1. Brak obu lub jednego EAN
        if (!hasEan1 || !hasEan2) {
            return {
                type: 'NO_EAN_OR_SINGLE',
                isDifferentProducts: false,
                isDepositStickerCandidate: false,
                reason: 'Brak jednego lub obu kodów EAN'
            };
        }

        // 2. Identyczny kod EAN
        if (clean1 === clean2) {
            return {
                type: 'EXACT_EAN',
                isDifferentProducts: false,
                isDepositStickerCandidate: false,
                reason: 'Identyczny międzynarodowy kod EAN-13'
            };
        }

        // Oba produkty mają różne kody EAN:
        const info1 = this.getEanCountryInfo(clean1);
        const info2 = this.getEanCountryInfo(clean2);

        const isPl1 = info1.prefix === '590';
        const isPl2 = info2.prefix === '590';

        // 3. PRZYPADEK A: NAKLEJKA KAUCYJNA PL (Jeden kod z Polski 590, drugi z zagranicy np. UA 482, DE 400 itp.)
        if ((isPl1 && !isPl2 && info2.isImportOrigin) || (isPl2 && !isPl1 && info1.isImportOrigin)) {
            const foreignInfo = isPl1 ? info2 : info1;
            return {
                type: 'DEPOSIT_STICKER_CROSS_BORDER',
                isDifferentProducts: false,
                isDepositStickerCandidate: true,
                foreignCountry: foreignInfo.country,
                foreignCode: foreignInfo.code,
                foreignPrefix: foreignInfo.prefix,
                reason: `Naklejka kaucyjna / dystrybucyjna PL [590] vs Import [${foreignInfo.prefix}] (${foreignInfo.country})`
            };
        }

        // 4. PRZYPADEK B: RÓŻNE ZAREJESTROWANE KODY EAN Z TEGO SAMEGO KRAJU LUB RÓŻNYCH
        // Zgodnie z zasadą "EAN w pierwszej kolejności": różne kody EAN to z definicji różne produkty (inne smaki/linie/SKU)
        return {
            type: 'DIFFERENT_REGISTERED_EANS',
            isDifferentProducts: true,
            isDepositStickerCandidate: false,
            country: info1.country,
            reason: `Osobne kody EAN (${info1.country}) - różne pozycje asortymentowe`
        };
    },

    _dupsCache: null,
    _dupsCacheKey: '',

    findPotentialDuplicates(threshold = 0.70) {
        const products = this.getProducts();
        if (products.length <= 1) return [];

        // Szybki cache w pamięci RAM
        const cacheKey = `${products.length}_${threshold}_${products[0]?.id || ''}_${products[products.length - 1]?.id || ''}`;
        if (this._dupsCache && this._dupsCacheKey === cacheKey) {
            return this._dupsCache;
        }

        const potentialDuplicates = [];
        const checkedPairs = new Set();

        // 1. Wiaderka według pojemności
        const capBuckets = new Map();

        products.forEach(p => {
            const cap = this.extractCapacityOrWeight(p.name) || '_NO_CAP_';
            if (!capBuckets.has(cap)) capBuckets.set(cap, []);
            capBuckets.get(cap).push(p);
        });

        // 2. Analiza duplikatów z natychmiastowym O(1) odrzucaniem odrębnych EAN
        capBuckets.forEach((bucketProducts, capKey) => {
            if (bucketProducts.length <= 1) return;

            // Przygotuj zindeksowane dane raz dla każdego produktu w wiaderku
            const prepared = bucketProducts.map(p => {
                const cEan = this.cleanEan(p.ean);
                const hasValidEan = cEan && cEan.length >= 7 && !cEan.startsWith('FILE-') && !cEan.startsWith('PASTE-');
                const isPl = hasValidEan && cEan.startsWith('590');
                const isImport = hasValidEan && !isPl;
                const cleanName = this.cleanCompareName(p.name);
                const words = new Set(cleanName.split(' ').filter(w => w.length >= 3));
                const variants = this.extractVariants(p.name);
                return {
                    prod: p,
                    cEan,
                    hasValidEan,
                    isPl,
                    isImport,
                    cleanName,
                    words,
                    variants
                };
            });

            const len = prepared.length;
            for (let i = 0; i < len; i++) {
                const item1 = prepared[i];
                const words1 = item1.words;

                for (let j = i + 1; j < len; j++) {
                    const item2 = prepared[j];

                    // 1. Identyczny kod EAN -> Duplikat 100%
                    if (item1.hasValidEan && item2.hasValidEan) {
                        if (item1.cEan === item2.cEan) {
                            potentialDuplicates.push({
                                target: item1.prod,
                                source: item2.prod,
                                similarityPct: 100,
                                eanRel: { type: 'EXACT_EAN' },
                                reason: 'Identyczny międzynarodowy kod EAN-13'
                            });
                            continue;
                        }

                        // Jeśli kody są różne i nie jest to relacja (PL 590 vs Import) -> POMIŃ W 1 CPU CYCLE
                        const isDepositPair = (item1.isPl && item2.isImport) || (item2.isPl && item1.isImport);
                        if (!isDepositPair) {
                            continue;
                        }
                    }

                    // 2. Przecięcie słów kluczowych: jeśli nie dzielą ani 1 słowa >= 3 litery -> POMIŃ
                    const words2 = item2.words;
                    let hasShared = false;
                    if (words1.size <= words2.size) {
                        for (const w of words1) {
                            if (words2.has(w)) { hasShared = true; break; }
                        }
                    } else {
                        for (const w of words2) {
                            if (words1.has(w)) { hasShared = true; break; }
                        }
                    }
                    if (!hasShared && words1.size > 0 && words2.size > 0) continue;

                    // 3. Ochrona wariantów smakowych
                    if (item1.variants.length > 0 && item2.variants.length > 0) {
                        const hasConflict = item1.variants.some(v => !item2.variants.includes(v)) || item2.variants.some(v => !item1.variants.includes(v));
                        if (hasConflict) continue;
                    }

                    // Sytuacja B: Naklejka kaucyjna PL vs Import
                    if (item1.hasValidEan && item2.hasValidEan) {
                        const isDepositPair = (item1.isPl && item2.isImport) || (item2.isPl && item1.isImport);
                        if (isDepositPair) {
                            const eanRel = this.evaluateEanRelationship(item1.prod.ean, item2.prod.ean, item1.prod.name, item2.prod.name);
                            if (eanRel.type === 'DEPOSIT_STICKER_CROSS_BORDER') {
                                const sim = this.calculateSmartSimilarity(item1.prod.name, item2.prod.name);
                                if (sim >= 0.85) {
                                    const simPct = Math.round(sim * 100);
                                    potentialDuplicates.push({
                                        target: item1.prod,
                                        source: item2.prod,
                                        similarityPct: simPct,
                                        eanRel: eanRel,
                                        reason: `🏷️ Naklejka kaucyjna PL [590] vs [${eanRel.foreignPrefix}] ${eanRel.foreignCountry}` + (capKey !== '_NO_CAP_' ? ` [${capKey}]` : '')
                                    });
                                }
                            }
                            continue;
                        }
                    }

                    // Sytuacja C: Brak kodów EAN u jednego lub obu
                    const sim = this.calculateSmartSimilarity(item1.prod.name, item2.prod.name);
                    if (sim >= threshold) {
                        const simPct = Math.round(sim * 100);
                        potentialDuplicates.push({
                            target: item1.prod,
                            source: item2.prod,
                            similarityPct: simPct,
                            eanRel: { type: 'NO_EAN_OR_SINGLE' },
                            reason: `Podobieństwo cech i nazwy (${simPct}%)` + (capKey !== '_NO_CAP_' ? ` [${capKey}]` : '')
                        });
                    }
                }
            }
        });

        const sorted = potentialDuplicates.sort((a, b) => b.similarityPct - a.similarityPct);
        this._dupsCache = sorted;
        this._dupsCacheKey = cacheKey;
        return sorted;
    },

    // Wycofywanie i usuwanie wszystkich ofert i towarów danego dostawcy (np. Ukraiński Smak)
    removeSupplierOffers(supplierName) {
        if (!supplierName) return { removedProducts: 0, removedOffers: 0, totalRemaining: 0 };
        const normTarget = String(supplierName).toLowerCase().trim();
        const products = this.getProducts();
        let removedOffers = 0;
        let removedProducts = 0;
        const remaining = [];

        products.forEach(p => {
            if (p.offers && p.offers.length > 0) {
                const initLen = p.offers.length;
                p.offers = p.offers.filter(o => {
                    const s = (o.source || '').toLowerCase().trim();
                    return s !== normTarget && !s.includes(normTarget) && !normTarget.includes(s);
                });
                removedOffers += (initLen - p.offers.length);
                if (p.offers.length > 0) {
                    remaining.push(p);
                } else {
                    removedProducts++;
                }
            }
        });

        this.saveProducts(remaining);
        this._dupsCache = null;
        this._dupsCacheKey = '';
        return { removedProducts, removedOffers, totalRemaining: remaining.length };
    },

    // Błyskawiczny import masowy (obsługuje 1500+ produktów w ułamku sekundy bez zawieszania przeglądarki)
    addBulkPriceOffers(offersList) {
        if (!Array.isArray(offersList) || offersList.length === 0) return { inserted: 0, updated: 0, total: 0 };

        const products = this.getProducts();
        const now = new Date().toISOString();
        
        // Szybkie mapy indeksowe O(1)
        const eanMap = new Map();
        const normNameMap = new Map();

        products.forEach(p => {
            const cEan = this.cleanEan(p.ean);
            if (cEan && cEan.length >= 7 && !cEan.startsWith('FILE-') && !cEan.startsWith('PASTE-')) {
                eanMap.set(cEan, p);
            }
            if (p.eans && Array.isArray(p.eans)) {
                p.eans.forEach(alt => {
                    const cAlt = this.cleanEan(alt);
                    if (cAlt && cAlt.length >= 7) eanMap.set(cAlt, p);
                });
            }
            const nName = this.normalizeName(p.name);
            if (nName) normNameMap.set(nName, p);
        });

        let inserted = 0;
        let updated = 0;

        offersList.forEach(item => {
            const ean = item.ean || '';
            const sku = item.sku || '';
            const name = item.name || '';
            const source = item.source || item.supplier || 'Dostawca';
            const price = parseFloat(item.price);
            const date = item.date || now;
            const extraData = item.extraData || {};

            if (isNaN(price) || price <= 0) return;

            const cleanedEan = this.cleanEan(ean);
            const cleanName = this.cleanAndNormalizeProductName(name) || name || 'Bez nazwy';
            const normName = this.normalizeName(cleanName);

            // O(1) Szybkie dopasowanie
            let product = null;
            if (cleanedEan && cleanedEan.length >= 7 && !cleanedEan.startsWith('FILE-') && !cleanedEan.startsWith('PASTE-')) {
                product = eanMap.get(cleanedEan) || null;
            }
            if (!product && normName) {
                product = normNameMap.get(normName) || null;
            }

            const packagingInfo = this.inferPackaging(cleanName, extraData.packSize, extraData.unit);
            const finalPackSize = packagingInfo.packSize || 1;
            const finalUnit = packagingInfo.unit || extraData.unit || 'szt.';
            const finalUnitPrice = Math.max(0.01, parseFloat((price / finalPackSize).toFixed(2)));

            let autoCategory = extraData.category || 'Napoje';
            let autoSubCat = extraData.subCategory || 'Ogólne';
            const nLow = cleanName.toLowerCase();
            if (nLow.includes('kwas') || nLow.includes('taras')) {
                autoCategory = 'Napoje';
                autoSubCat = 'Kwasy chlebowe';
            }

            if (product) {
                if (!product.offers) product.offers = [];
                const existingOfferIdx = product.offers.findIndex(o => o.source.toLowerCase().trim() === source.toLowerCase().trim());
                if (existingOfferIdx >= 0) {
                    const oldOffer = product.offers[existingOfferIdx];
                    const oldPrice = oldOffer.price;
                    product.offers[existingOfferIdx] = {
                        source: source,
                        price: finalUnitPrice,
                        prevPrice: oldPrice !== finalUnitPrice ? oldPrice : oldOffer.prevPrice,
                        priceChangePct: oldPrice && oldPrice > 0 ? parseFloat((((finalUnitPrice - oldPrice) / oldPrice) * 100).toFixed(1)) : 0,
                        date: date,
                        isAvailable: true
                    };
                } else {
                    product.offers.push({
                        source: source,
                        price: finalUnitPrice,
                        prevPrice: null,
                        priceChangePct: 0,
                        date: date,
                        isAvailable: true
                    });
                }
                updated++;
            } else {
                const primaryEan = cleanedEan || ean || '';
                const eansList = primaryEan ? [primaryEan] : [];

                product = {
                    id: 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                    ean: primaryEan,
                    eans: eansList,
                    sku: sku || '',
                    name: cleanName,
                    image: extraData.image || null,
                    description: extraData.description || 'Wysokiej jakości produkt hurtowy dostępny w naszym katalogu.',
                    category: autoCategory,
                    subCategory: autoSubCat,
                    unit: finalUnit,
                    packSize: finalPackSize,
                    packagePrice: extraData.packagePrice || (finalUnitPrice * finalPackSize),
                    vat: extraData.vat || '23%',
                    expirationDate: extraData.expirationDate || null,
                    isApproved: extraData.isApproved !== undefined ? extraData.isApproved : false,
                    isQuarantined: false,
                    offers: [{
                        source: source,
                        price: finalUnitPrice,
                        prevPrice: null,
                        priceChangePct: 0,
                        date: date,
                        isAvailable: true
                    }]
                };
                products.push(product);
                if (cleanedEan && cleanedEan.length >= 7) eanMap.set(cleanedEan, product);
                if (normName) normNameMap.set(normName, product);
                inserted++;
            }
        });

        this.saveProducts(products);
        this._dupsCache = null;
        this._dupsCacheKey = '';
        return { inserted, updated, total: products.length };
    },

    // Załadowanie Bazy Wzorcowej Hurtowni Kravets (391 pozycji ze zdjęciami EAN)
    loadKravetsMasterCatalog(forceClear = true) {
        const catalog = window.KRAVETS_MASTER_CATALOG || (typeof KRAVETS_MASTER_CATALOG !== 'undefined' ? KRAVETS_MASTER_CATALOG : null);
        if (!catalog || !Array.isArray(catalog) || catalog.length === 0) {
            console.warn("Brak załadowanego pliku kravets_catalog_data.js");
            return 0;
        }

        // Dodanie/aktualizacja profilu dostawcy Kravets w CRM
        const suppliers = this.getSuppliers();
        let kravetsSup = suppliers.find(s => s && s.name && (s.name.toLowerCase().includes('kravets') || s.name.toLowerCase().includes('krawiec')));
        if (!kravetsSup) {
            kravetsSup = {
                id: 'sup_kravets',
                name: 'Hurtownia Kravets',
                details: 'Dystrybucja i Hurtownia Towarów Ukraińskich i Międzynarodowych',
                deliveryDays: 'Pon, Śr, Pt',
                minOrder: 500,
                contact: 'biuro@kravets.pl',
                notes: 'Główny dostawca bazy wzorcowej katalogu',
                disabledCategories: []
            };
            suppliers.push(kravetsSup);
            this.saveSupplier(kravetsSup);
        }

        if (forceClear) {
            this.saveProducts(catalog);
        } else {
            const current = this.getProducts();
            const eanMap = new Map();
            current.forEach(p => {
                const cEan = this.cleanEan(p.ean);
                if (cEan) eanMap.set(cEan, p);
            });
            catalog.forEach(item => {
                const cEan = this.cleanEan(item.ean);
                if (cEan && eanMap.has(cEan)) {
                    const existing = eanMap.get(cEan);
                    if (!existing.image && item.image) existing.image = item.image;
                    if (!existing.offers) existing.offers = [];
                    const hasOffer = existing.offers.some(o => o.source && o.source.toLowerCase().includes('kravets'));
                    if (!hasOffer && item.offers && item.offers[0]) {
                        existing.offers.push(item.offers[0]);
                    }
                } else {
                    current.push(item);
                }
            });
            this.saveProducts(current);
        }

        this._dupsCache = null;
        this._dupsCacheKey = '';
        return catalog.length;
    },

    getIgnoredDuplicatePairs() {
        return JSON.parse(localStorage.getItem(DB_KEYS.IGNORED_DUPLICATES)) || [];
    },

    ignoreDuplicatePair(idA, idB) {
        if (!idA || !idB) return;
        const ignored = this.getIgnoredDuplicatePairs();
        const key = [idA, idB].sort().join('___');
        if (!ignored.includes(key)) {
            ignored.push(key);
            localStorage.setItem(DB_KEYS.IGNORED_DUPLICATES, JSON.stringify(ignored));
        }
        return true;
    },

    categorizeDuplicates() {
        const potential = this.findPotentialDuplicates(0.65);
        const ignored = new Set(this.getIgnoredDuplicatePairs());

        const certain = [];
        const uncertain = [];

        potential.forEach(pair => {
            const pairKey = [pair.target.id, pair.source.id].sort().join('___');
            if (ignored.has(pairKey)) return;

            const isExactEan = pair.eanRel && pair.eanRel.type === 'EXACT_EAN';
            const isDepositCandidate = pair.eanRel && pair.eanRel.type === 'DEPOSIT_STICKER_CROSS_BORDER';
            const isHighSimNoConflict = (!pair.eanRel || pair.eanRel.type === 'NO_EAN_OR_SINGLE') && pair.similarityPct >= 95;

            // 100% pewne do automatycznego scalenia: TYLKO identyczny kod EAN lub identyczna nazwa (>=95%) bez sprzecznych kodów
            if (isExactEan || isHighSimNoConflict) {
                certain.push(pair);
            } else {
                // Niepewne (w tym NAKLEJKI KAUCYJNE PL 590 vs KOD ZAGRANICZNY) -> trafiają do dedykowanego okna pytań agenta
                uncertain.push(pair);
            }
        });

        return { certain, uncertain };
    },

    getUncertainDecisions() {
        const { uncertain } = this.categorizeDuplicates();
        return uncertain;
    },

    // Automatycznie scala TYLKO 100% pewne pozycje, a niepewne odkłada do pytania w osobnym oknie
    autoMergeCertainDuplicates() {
        const { certain, uncertain } = this.categorizeDuplicates();
        let mergedCount = 0;
        const mergedPairs = [];

        certain.forEach(dup => {
            const products = this.getProducts();
            const targetExists = products.some(p => p.id === dup.target.id);
            const sourceExists = products.some(p => p.id === dup.source.id);

            if (targetExists && sourceExists) {
                const success = this.mergeProducts(dup.target.id, dup.source.id);
                if (success) {
                    mergedCount++;
                    mergedPairs.push({
                        targetName: dup.target.name,
                        sourceName: dup.source.name,
                        similarity: dup.similarityPct
                    });
                }
            }
        });

        // Po scaleniu uzupełnij brakujące zdjęcia z katalogu Kraft Group
        this.enrichAllImagesFromKraftCatalog();

        return {
            mergedCount,
            mergedPairs,
            pendingDecisionsCount: uncertain.length,
            pendingDecisions: uncertain
        };
    },

    // Automatyczne, w 100% bezpieczne scalenie identycznych pozycji w katalogu
    autoMergeSafeDuplicates(minSimilarity = 0.85) {
        return this.autoMergeCertainDuplicates();
    },

    // Wzbogaca wszystkie towary w bazie o zdjęcia z katalogu Hurtowni Kravets
    enrichAllImagesFromKravetsCatalog(force = false) {
        const products = this.getProducts();
        let enriched = 0;

        const kravetsItems = (typeof window !== 'undefined' && window.KRAVETS_MASTER_CATALOG) ? window.KRAVETS_MASTER_CATALOG : [];
        if (!kravetsItems || kravetsItems.length === 0) return 0;

        const imgEanMap = new Map();
        const imgNameMap = new Map();
        const imgSkuMap = new Map();

        kravetsItems.forEach(k => {
            if (k.image) {
                const cEan = this.cleanEan(k.ean);
                if (cEan) imgEanMap.set(cEan, k.image);
                if (k.sku) imgSkuMap.set(String(k.sku).toLowerCase().trim(), k.image);
                const normName = this.normalizeName(k.name);
                if (normName) imgNameMap.set(normName, k.image);
            }
        });

        products.forEach(p => {
            const hasGoodImage = p.image && !p.image.includes('unsplash') && !p.image.includes('placeholder') && p.image.length > 5;
            if (hasGoodImage && !force) return;

            const cleanP = this.cleanEan(p.ean);
            let foundImg = null;

            if (cleanP && imgEanMap.has(cleanP)) {
                foundImg = imgEanMap.get(cleanP);
            } else if (p.sku && imgSkuMap.has(String(p.sku).toLowerCase().trim())) {
                foundImg = imgSkuMap.get(String(p.sku).toLowerCase().trim());
            } else {
                const normName = this.normalizeName(p.name);
                if (normName && imgNameMap.has(normName)) {
                    foundImg = imgNameMap.get(normName);
                } else {
                    const capP = this.extractCapacityOrWeight(p.name);
                    for (const k of kravetsItems) {
                        if (!k.image) continue;
                        const capK = this.extractCapacityOrWeight(k.name);
                        if (capP && capK && capP !== capK) continue;
                        const sim = this.calculateSmartSimilarity(p.name, k.name);
                        if (sim >= 0.75) {
                            foundImg = k.image;
                            break;
                        }
                    }
                }
            }

            if (foundImg && (p.image !== foundImg || !p.image)) {
                p.image = foundImg;
                enriched++;
            }
        });

        if (enriched > 0) {
            this.saveProducts(products);
        }
        return enriched;
    },

    // Wzbogaca wszystkie towary w bazie o zdjęcia wysokiej jakości z katalogu Kraft Group (WYŁĄCZNIE PO ŚCISŁYM KODZIE EAN)
    enrichAllImagesFromKraftCatalog() {
        const products = this.getProducts();
        let enriched = 0;

        const kraftItems = (typeof window !== 'undefined' && window.KRAFT_SCRAPED_CATALOG) ? window.KRAFT_SCRAPED_CATALOG : [];
        if (!kraftItems || kraftItems.length === 0) return 0;

        products.forEach(p => {
            // Jeśli produkt ma już oficjalne zdjęcie z folderu assets/images/kravets/ lub inne dobre zdjęcie studyjne, nie nadpisujemy go!
            if (p.image && (p.image.includes('assets/images/kravets') || p.image.includes('chumak.com') || p.image.includes('veresfood.com') || p.image.includes('nizhyn.ua'))) return;

            const cleanP = this.cleanEan(p.ean);
            let match = null;

            // TYLKO I WYŁĄCZNIE PO ŚCISŁYM KODZIE EAN
            if (cleanP && cleanP.length >= 8) {
                match = kraftItems.find(k => {
                    const cK = this.cleanEan(k.ean);
                    return cK && cK === cleanP;
                });
            }

            if (match && match.image) {
                p.image = match.image;
                enriched++;
            }
        });

        if (enriched > 0) {
            this.saveProducts(products);
        }
        return enriched;
    },

    // Ręczne scalanie dwóch konkretnych produktów wybranych przez użytkownika
    mergeProducts(targetProductId, sourceProductId) {
        if (!targetProductId || !sourceProductId || targetProductId === sourceProductId) return false;
        const products = this.getProducts();
        const target = products.find(p => p.id === targetProductId);
        const source = products.find(p => p.id === sourceProductId);
        if (!target || !source) return false;

        if (!target.offers) target.offers = [];
        if (source.offers && source.offers.length > 0) {
            source.offers.forEach(off => {
                const existingOfferIdx = target.offers.findIndex(o => o.source.toLowerCase().trim() === off.source.toLowerCase().trim());
                if (existingOfferIdx >= 0) {
                    if (off.price < target.offers[existingOfferIdx].price || !target.offers[existingOfferIdx].isAvailable) {
                        target.offers[existingOfferIdx] = off;
                    }
                } else {
                    target.offers.push(off);
                }
            });
        }

        // Zbieranie i synchronizacja kodów EAN
        if (!target.eans) target.eans = target.ean ? [target.ean] : [];
        if (source.ean && !target.eans.includes(source.ean)) target.eans.push(source.ean);
        if (source.eans && Array.isArray(source.eans)) {
            source.eans.forEach(e => {
                if (e && !target.eans.includes(e)) target.eans.push(e);
            });
        }
        if (!target.ean && source.ean) target.ean = source.ean;
        if (!target.sku && source.sku) target.sku = source.sku;

        // Wybór lepszego zdjęcia (preferuj oficjalne CDN hurtowni)
        const isTargetImageDefault = !target.image || target.image.includes('unsplash') || target.image.includes('placeholder');
        const isSourceImageGood = source.image && !source.image.includes('unsplash') && !source.image.includes('placeholder') && source.image.length > 5;
        if (isTargetImageDefault && isSourceImageGood) {
            target.image = source.image;
        }

        // Zapamiętywanie mapowania nazwy do aliasu
        const memory = JSON.parse(localStorage.getItem(DB_KEYS.PACKAGING_MEMORY)) || {};
        memory[this.normalizeName(source.name)] = target.name;
        localStorage.setItem(DB_KEYS.PACKAGING_MEMORY, JSON.stringify(memory));

        const remainingProducts = products.filter(p => p.id !== sourceProductId);
        this.saveProducts(remainingProducts);
        return true;
    },

    // Wydziela pojedynczą ofertę z połączonej karty produktowej do NOWEJ, OSOBNEJ karty towarowej!
    splitProductOffer(productId, offerSource) {
        if (!productId || !offerSource) return null;
        const products = this.getProducts();
        const product = products.find(p => p.id === productId);
        if (!product || !product.offers || product.offers.length <= 1) return null;

        const offerIdx = product.offers.findIndex(o => o.source.toLowerCase().trim() === offerSource.toLowerCase().trim());
        if (offerIdx === -1) return null;

        const [removedOffer] = product.offers.splice(offerIdx, 1);

        const newProductId = 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        const newProduct = {
            id: newProductId,
            ean: product.ean || '',
            eans: product.eans ? [...product.eans] : [],
            sku: product.sku || '',
            name: `${product.name} (${removedOffer.source})`,
            image: product.image,
            description: product.description,
            category: product.category,
            subCategory: product.subCategory,
            unit: product.unit || 'szt.',
            packSize: product.packSize || 1,
            packagePrice: product.packagePrice || removedOffer.price,
            vat: product.vat || '23%',
            expirationDate: product.expirationDate || null,
            isApproved: false,
            isQuarantined: false,
            offers: [removedOffer]
        };

        products.push(newProduct);
        this.saveProducts(products);
        return newProductId;
    },

    approveFromQuarantine(productId) {
        const products = this.getProducts();
        const product = products.find(p => p.id === productId);
        if (!product) return false;
        product.isQuarantined = false;
        product.quarantineReason = null;
        product.isApproved = true;
        this.saveProducts(products);
        return true;
    },

    getQuarantinedProductsCount() {
        const products = this.getProducts();
        return products.filter(p => p.isQuarantined === true).length;
    },

    clearPackagingMemory() {
        localStorage.removeItem(DB_KEYS.PACKAGING_MEMORY);
        return true;
    },

    // Tworzy lub aktualizuje cenę w głównym katalogu. Zwraca ID produktu.
    addPriceOffer(ean, sku, name, source, price, date = new Date().toISOString(), extraData = {}) {
        const products = this.getProducts();
        const cleanedEan = this.cleanEan(ean);
        const cleanName = this.cleanAndNormalizeProductName(name) || name || 'Bez nazwy';
        
        let product = this.findMatchingProduct(products, cleanedEan, sku, cleanName);

        const cleanPrice = parseFloat(price);
        if (isNaN(cleanPrice)) return;

        // Zabezpieczenie: Sprawdzamy czy kategoria towaru jest wycofana dla tej hurtowni
        const suppliers = this.getSuppliers();
        const sup = suppliers.find(s => s && typeof s.name === 'string' && s.name.toLowerCase().trim() === (source || '').toLowerCase().trim());
        const cat = extraData.category || (product ? product.category : '');
        if (sup && sup.disabledCategories && cat) {
            if (sup.disabledCategories.some(dc => dc.toLowerCase().trim() === cat.toLowerCase().trim())) {
                return;
            }
        }

        // --- Inteligentne Wyznaczanie Pakowania (AI Packaging & Unit Inference) ---
        const packagingInfo = this.inferPackaging(cleanName, extraData.packSize, extraData.unit);
        let finalPackSize = packagingInfo.packSize || 1;
        let finalUnit = packagingInfo.unit || extraData.unit || 'szt.';
        let finalImage = this.resolveProductImage(cleanName, extraData.image);

        // Automatyczne przypisanie właściwej kategorii i podkategorii
        let autoCategory = extraData.category || 'Napoje';
        let autoSubCat = extraData.subCategory || 'Ogólne';
        const nLow = cleanName.toLowerCase();
        if (nLow.includes('kwas') || nLow.includes('taras')) {
            autoCategory = 'Napoje';
            autoSubCat = 'Kwasy chlebowe';
        } else if (nLow.includes('kawa')) {
            autoCategory = 'Kawy';
            autoSubCat = 'Kawy ziarniste i mielone';
        } else if (nLow.includes('herbata')) {
            autoCategory = 'Herbaty';
            autoSubCat = 'Herbaty';
        } else if (nLow.includes('cukierk') || nLow.includes('żelk') || nLow.includes('czekolad') || nLow.includes('słodycz')) {
            autoCategory = 'Słodycze';
            autoSubCat = 'Cukierki i czekolady';
        } else if (nLow.includes('regał') || nLow.includes('stojak') || nLow.includes('głowica')) {
            autoCategory = 'Akcesoria i Wyposażenie';
            autoSubCat = 'Displaye i regały';
        }
        
        let finalUnitPrice = cleanPrice;
        if (extraData.dividePrice === true && finalPackSize > 1 && cleanPrice > 0) {
            finalUnitPrice = parseFloat((cleanPrice / finalPackSize).toFixed(2));
        }

        if (product) {
            if (!product.offers) product.offers = [];
            
            let prevPrice = null;
            let priceChangePct = 0;

            const existingOfferIdx = product.offers.findIndex(o => o.source === source);
            if (existingOfferIdx >= 0) {
                const oldOffer = product.offers[existingOfferIdx];
                prevPrice = oldOffer.price;
                if (prevPrice && prevPrice > 0 && Math.abs(finalUnitPrice - prevPrice) > 0.001) {
                    priceChangePct = parseFloat((((finalUnitPrice - prevPrice) / prevPrice) * 100).toFixed(1));
                } else if (oldOffer.priceChangePct) {
                    priceChangePct = oldOffer.priceChangePct;
                    prevPrice = oldOffer.prevPrice || prevPrice;
                }
                product.offers.splice(existingOfferIdx, 1);
            }

            if (!product.eans) product.eans = [];
            if (product.ean && !product.eans.includes(product.ean)) product.eans.push(product.ean);
            if (cleanedEan && cleanedEan.length >= 7 && !product.eans.includes(cleanedEan)) {
                product.eans.push(cleanedEan);
            }

            if (priceChangePct !== 0 && prevPrice && prevPrice > 0) {
                product.priceChangeReviewNeeded = true;
                product.lastPriceChangeDetails = {
                    supplier: source,
                    oldWholesalePrice: prevPrice,
                    newWholesalePrice: finalUnitPrice,
                    pct: priceChangePct,
                    date: date
                };
            }

            const newOffer = {
                source: source,
                price: finalUnitPrice,
                prevPrice: prevPrice,
                priceChangePct: priceChangePct,
                date: date,
                isAvailable: true
            };

            product.offers.push(newOffer);
            
            const isCorrupted = product.name && (
                product.name.includes('formularza') || 
                product.name.includes('Zdjęcie') || 
                product.name.includes('Zdj') ||
                product.name.includes('TerminCena') ||
                product.name.includes('zł')
            );
            if (cleanName && (!product.name || isCorrupted || product.offers.length <= 1)) {
                product.name = cleanName;
            }
            if (cleanedEan && cleanedEan.length >= 7) product.ean = cleanedEan;
            if (sku && !product.sku) product.sku = sku;
            if (finalImage && (!product.image || product.image.includes('placeholder'))) product.image = finalImage;
            if (extraData.description && !product.description) product.description = extraData.description;
            if (!product.category || product.category === 'Kawy') product.category = autoCategory;
            if (!product.subCategory) product.subCategory = autoSubCat;
            product.unit = finalUnit;
            if (extraData.expirationDate) product.expirationDate = extraData.expirationDate;
            if (extraData.packagePrice && (!product.packagePrice || product.packagePrice <= 0)) product.packagePrice = extraData.packagePrice;
            if (extraData.isApproved !== undefined) product.isApproved = extraData.isApproved;
            product.packSize = finalPackSize;
        } else {
            const newOffer = {
                source: source,
                price: finalUnitPrice,
                prevPrice: null,
                priceChangePct: 0,
                date: date,
                isAvailable: true
            };

            const primaryEan = cleanedEan || ean || '';
            const eansList = primaryEan ? [primaryEan] : [];

            product = {
                id: 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                ean: primaryEan,
                eans: eansList,
                sku: sku || '',
                name: cleanName,
                image: finalImage,
                description: extraData.description || 'Wysokiej jakości produkt hurtowy dostępny w naszym katalogu.',
                category: autoCategory,
                subCategory: autoSubCat,
                unit: finalUnit,
                packSize: finalPackSize,
                packagePrice: extraData.packagePrice || (finalUnitPrice * finalPackSize),
                vat: extraData.vat || '23%',
                expirationDate: extraData.expirationDate || null,
                isApproved: extraData.isApproved !== undefined ? extraData.isApproved : false,
                isQuarantined: extraData.isQuarantined !== undefined ? extraData.isQuarantined : false,
                quarantineReason: extraData.quarantineReason || null,
                offers: [newOffer]
            };
            products.push(product);
        }

        this.saveProducts(products);

        // Automatycznie szukaj brakujących zdjęć dla towarów z innych źródeł
        this.autoMatchMissingImages();
        return product.id;
    },

    // Automatyczny Dawca Zdjęć: przypisuje zdjęcia towarom bez fotki z identycznych produktów od innych hurtowni
    autoMatchMissingImages() {
        const products = this.getProducts();
        let updatedCount = 0;
        const defaultPlaceholder = 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop&q=80';

        const productsWithImages = products.filter(p => p.image && !p.image.includes('unsplash') && !p.image.includes('placeholder') && p.image.length > 5);

        if (productsWithImages.length === 0) return 0;

        products.forEach(p => {
            if (!p.image || p.image.includes('unsplash') || p.image.includes('placeholder') || p.image === defaultPlaceholder) {
                let match = null;
                const cleanP = this.cleanEan(p.ean);
                if (cleanP && cleanP.length >= 7 && !cleanP.startsWith('FILE-') && !cleanP.startsWith('PASTE-')) {
                    match = productsWithImages.find(other => {
                        if (other.id === p.id) return false;
                        const cleanOther = this.cleanEan(other.ean);
                        if (cleanOther === cleanP) return true;
                        if (other.eans && Array.isArray(other.eans)) {
                            return other.eans.some(alt => this.cleanEan(alt) === cleanP);
                        }
                        return false;
                    });
                }
                if (!match) {
                    let bestSim = 0;
                    for (const other of productsWithImages) {
                        if (other.id === p.id) continue;
                        const sim = this.calculateSimilarity(p.name, other.name);
                        if (sim > bestSim && sim >= 0.70) {
                            bestSim = sim;
                            match = other;
                        }
                    }
                }
                if (match && match.image) {
                    p.image = match.image;
                    updatedCount++;
                }
            }
        });

        if (updatedCount > 0) {
            this.saveProducts(products);
        }

        return updatedCount;
    },

    getSupplierImportMemory(supplierName) {
        if (!supplierName) return {};
        const memories = JSON.parse(localStorage.getItem('porownywarka_supplier_memories')) || {};
        return memories[supplierName.toLowerCase().trim()] || {};
    },

    saveSupplierImportMemory(supplierName, data) {
        if (!supplierName) return;
        const memories = JSON.parse(localStorage.getItem('porownywarka_supplier_memories')) || {};
        memories[supplierName.toLowerCase().trim()] = {
            ...(memories[supplierName.toLowerCase().trim()] || {}),
            ...data
        };
        localStorage.setItem('porownywarka_supplier_memories', JSON.stringify(memories));
    },

    // Oznacza oferty danej hurtowni jako niedostępne lub wycofane, zachowując produkt na stałe w katalogu!
    clearSupplierOffers(supplierName) {
        if (!supplierName) return { removedOffers: 0, outOfStockCount: 0 };

        const products = this.getProducts();
        let removedOffers = 0;
        let outOfStockCount = 0;

        products.forEach(p => {
            if (!p.offers || p.offers.length === 0) return;

            p.offers.forEach(o => {
                if (o.source.toLowerCase().trim() === supplierName.toLowerCase().trim()) {
                    if (o.isAvailable !== false) {
                        o.isAvailable = false;
                        o.outOfStockDate = new Date().toISOString();
                        removedOffers++;
                    }
                }
            });

            if (p.offers.every(o => o.isAvailable === false)) {
                outOfStockCount++;
            }
        });

        this.saveProducts(products);
        return { removedOffers, outOfStockCount };
    },

    // Wycofanie danej hurtowni - oznaczenie ofert jako niedostępne, bez usuwania karty towaru z katalogu!
    withdrawSupplier(supplierName) {
        if (!supplierName) return { removedOffers: 0, outOfStockCount: 0 };

        const products = this.getProducts();
        let removedOffers = 0;
        let outOfStockCount = 0;

        products.forEach(p => {
            if (!p.offers || p.offers.length === 0) return;

            p.offers.forEach(o => {
                if (o.source.toLowerCase().trim() === supplierName.toLowerCase().trim()) {
                    if (o.isAvailable !== false) {
                        o.isAvailable = false;
                        o.outOfStockDate = new Date().toISOString();
                        removedOffers++;
                    }
                }
            });

            if (p.offers.every(o => o.isAvailable === false)) {
                outOfStockCount++;
            }
        });

        this.saveProducts(products);

        // Usuwanie dostawcy z listy aktywnych hurtowni
        let suppliers = this.getSuppliers();
        suppliers = suppliers.filter(s => s && typeof s.name === 'string' && s.name.toLowerCase().trim() !== (supplierName || '').toLowerCase().trim());
        localStorage.setItem(DB_KEYS.SUPPLIERS, JSON.stringify(suppliers));

        return { removedOffers, outOfStockCount };
    },

    // --- ANALITYCZNA OBSŁUGA ZMIAN CEN ZAKUPU U DOSTAWCÓW ---
    acceptPurchasePriceAndRecalculateClientPrice(productId) {
        const products = this.getProducts();
        const p = products.find(x => x.id === productId);
        if (!p) return false;

        p.priceChangeReviewNeeded = false;
        if (p.lastPriceChangeDetails) {
            p.lastPriceChangeDetails.reviewedAt = new Date().toISOString();
            p.lastPriceChangeDetails.actionTaken = 'recalculated_with_margin';
        }
        this.saveProducts(products);
        return true;
    },

    acceptPurchasePriceAndKeepClientPrice(productId) {
        const products = this.getProducts();
        const p = products.find(x => x.id === productId);
        if (!p) return false;

        p.priceChangeReviewNeeded = false;
        if (p.lastPriceChangeDetails) {
            p.lastPriceChangeDetails.reviewedAt = new Date().toISOString();
            p.lastPriceChangeDetails.actionTaken = 'kept_old_client_price';
        }
        this.saveProducts(products);
        return true;
    },

    setCustomClientPrice(productId, customPrice) {
        const products = this.getProducts();
        const p = products.find(x => x.id === productId);
        if (!p) return false;

        const priceNum = parseFloat(customPrice);
        if (!isNaN(priceNum) && priceNum > 0) {
            p.customClientPrice = priceNum;
            p.priceChangeReviewNeeded = false;
            if (p.lastPriceChangeDetails) {
                p.lastPriceChangeDetails.reviewedAt = new Date().toISOString();
                p.lastPriceChangeDetails.actionTaken = 'custom_client_price';
            }
            this.saveProducts(products);
            return true;
        }
        return false;
    },

    // Wycofanie konkretnej kategorii z danej hurtowni (oznaczenie ofert jako niedostępnych)
    withdrawCategoryFromSupplier(supplierName, categoryName) {
        if (!supplierName || !categoryName) return { removedOffers: 0, outOfStockCount: 0 };

        const products = this.getProducts();
        let removedOffers = 0;
        let outOfStockCount = 0;

        products.forEach(p => {
            if (!p.offers || p.offers.length === 0) return;

            if (p.category && p.category.toLowerCase().trim() === categoryName.toLowerCase().trim()) {
                p.offers.forEach(o => {
                    if (o.source.toLowerCase().trim() === supplierName.toLowerCase().trim()) {
                        if (o.isAvailable !== false) {
                            o.isAvailable = false;
                            o.outOfStockDate = new Date().toISOString();
                            removedOffers++;
                        }
                    }
                });

                if (p.offers.every(o => o.isAvailable === false)) {
                    outOfStockCount++;
                }
            }
        });

        this.saveProducts(products);

        // Zapamiętywanie wycofanej kategorii w danych dostawcy
        const suppliers = this.getSuppliers();
        const sup = suppliers.find(s => s && typeof s.name === 'string' && s.name.toLowerCase().trim() === (supplierName || '').toLowerCase().trim());
        if (sup) {
            if (!sup.disabledCategories) sup.disabledCategories = [];
            if (!sup.disabledCategories.includes(categoryName)) {
                sup.disabledCategories.push(categoryName);
            }
            this.saveSupplier(sup);
        }

        return { removedOffers, outOfStockCount };
    },

    // Przywrócenie wycofanej kategorii dla danej hurtowni
    enableCategoryForSupplier(supplierName, categoryName) {
        const suppliers = this.getSuppliers();
        const sup = suppliers.find(s => s && typeof s.name === 'string' && s.name.toLowerCase().trim() === (supplierName || '').toLowerCase().trim());
        if (sup && sup.disabledCategories) {
            sup.disabledCategories = sup.disabledCategories.filter(c => c !== categoryName);
            this.saveSupplier(sup);
        }

        const products = this.getProducts();
        products.forEach(p => {
            if (p.offers && p.category && p.category.toLowerCase().trim() === categoryName.toLowerCase().trim()) {
                p.offers.forEach(o => {
                    if (o.source.toLowerCase().trim() === supplierName.toLowerCase().trim()) {
                        o.isAvailable = true;
                    }
                });
            }
        });
        this.saveProducts(products);
    },

    // Wycofanie całej kategorii ze WSZYSTKICH hurtowni jednocześnie
    withdrawCategoryGlobally(categoryName) {
        if (!categoryName) return 0;
        let products = this.getProducts();
        const initialCount = products.length;
        products = products.filter(p => !p.category || p.category.toLowerCase().trim() !== categoryName.toLowerCase().trim());
        this.saveProducts(products);
        return initialCount - products.length;
    },

    // Oznacza pozycje, których zabrakło w nowym imporcie z danej hurtowni jako "chwilowy brak na stanie"
    markMissingSupplierOffers(supplierName, importedProductIdsSet) {
        if (!supplierName || !importedProductIdsSet) return 0;
        const products = this.getProducts();
        let updatedCount = 0;

        products.forEach(p => {
            if (!p.offers || p.offers.length === 0) return;
            const offer = p.offers.find(o => o.source === supplierName);
            if (offer) {
                const isPresent = importedProductIdsSet.has(p.id) || 
                                  (p.ean && importedProductIdsSet.has(p.ean)) || 
                                  (p.sku && importedProductIdsSet.has(p.sku));
                if (!isPresent) {
                    if (offer.isAvailable !== false) {
                        offer.isAvailable = false;
                        offer.outOfStockDate = new Date().toISOString();
                        updatedCount++;
                    }
                } else {
                    offer.isAvailable = true;
                }
            }
        });

        if (updatedCount > 0) {
            this.saveProducts(products);
        }
        return updatedCount;
    },

    // Najniższa cena hurtowa dla produktu (tylko dostępne oferty)
    getCheapestWholesaleOffer(product) {
        if (!product || !product.offers || product.offers.length === 0) return null;
        const available = product.offers.filter(o => o.isAvailable !== false);
        if (available.length === 0) return null;
        const sorted = [...available].sort((a, b) => a.price - b.price);
        return sorted[0];
    },

    // Najwyższa cena hurtowa dla produktu (do kalkulacji dla klienta, tylko dostępne oferty)
    getHighestWholesaleOffer(product) {
        if (!product || !product.offers || product.offers.length === 0) return null;
        const available = product.offers.filter(o => o.isAvailable !== false);
        if (available.length === 0) return null;
        const sorted = [...available].sort((a, b) => b.price - a.price);
        return sorted[0];
    },

    // Wyszukiwanie i filtrowanie produktów
    searchProducts(query = '', category = '', subCategory = '', onlyAvailable = true) {
        const products = this.getProducts();
        const cleanQuery = query.toLowerCase().trim();
        const cleanCategory = category.trim();
        const cleanSubCategory = subCategory.trim();
        const terms = cleanQuery ? cleanQuery.split(/\s+/).filter(t => t.length > 0) : [];

        return products.filter(p => {
            let matchesQuery = true;
            if (terms.length > 0) {
                const targetText = [
                    p.name || '',
                    p.category || '',
                    p.subCategory || '',
                    p.description || '',
                    p.ean || '',
                    p.sku || '',
                    (p.offers ? p.offers.map(o => o.source || '').join(' ') : '')
                ].join(' ').toLowerCase();

                matchesQuery = terms.every(term => targetText.includes(term));
            }
            
            const matchesCategory = !cleanCategory || cleanCategory === 'Wszystkie' || 
                (p.category && p.category.toLowerCase() === cleanCategory.toLowerCase());
                
            const matchesSubCategory = !cleanSubCategory || cleanSubCategory === 'Wszystkie' ||
                (p.subCategory && p.subCategory.toLowerCase() === cleanSubCategory.toLowerCase());

            const isProductAvailable = p.offers && p.offers.some(o => o.isAvailable !== false);
            const matchesAvailability = !onlyAvailable || isProductAvailable;
            const isApproved = p.isApproved !== false;

            return matchesQuery && matchesCategory && matchesSubCategory && matchesAvailability && isApproved;
        });
    },

    getCategoriesTree() {
        const products = this.getProducts();
        const tree = {};
        
        products.forEach(p => {
            const main = p.category || 'Inne';
            const sub = p.subCategory || 'Ogólne';
            
            if (!tree[main]) {
                tree[main] = new Set();
            }
            tree[main].add(sub);
        });
        
        const result = {};
        for (const [main, subs] of Object.entries(tree)) {
            result[main] = Array.from(subs).sort();
        }
        return result;
    },

    // --- KOSZYK ZAMÓWIEŃ KLIENTA (CART) ---
    getCart() {
        return JSON.parse(localStorage.getItem(DB_KEYS.CART)) || [];
    },

    // --- KOSZYK ZAMÓWIEŃ KLIENTA (HURTOWE OPAKOWANIA ZBIORCZE) ---
    getCart() {
        return JSON.parse(localStorage.getItem(DB_KEYS.CART)) || [];
    },

    saveCart(cart) {
        localStorage.setItem(DB_KEYS.CART, JSON.stringify(cart));
    },

    // Dodanie do koszyka określonej liczby OPAKOWAŃ ZBIORCZYCH (zgrzewek / kartonów)
    addToCart(productId, packageQuantity = 1) {
        const cart = this.getCart();
        const cleanQty = Math.max(1, parseInt(packageQuantity) || 1);
        const index = cart.findIndex(item => item.productId === productId);
        if (index > -1) {
            cart[index].quantity += cleanQty;
        } else {
            cart.push({ productId, quantity: cleanQty });
        }
        this.saveCart(cart);
        return cart;
    },

    updateCartQuantity(productId, packageQuantity) {
        let cart = this.getCart();
        const cleanQty = parseInt(packageQuantity) || 0;
        if (cleanQty <= 0) {
            cart = cart.filter(item => item.productId !== productId);
        } else {
            const item = cart.find(i => i.productId === productId);
            if (item) item.quantity = cleanQty;
        }
        this.saveCart(cart);
        return cart;
    },

    clearCart() {
        localStorage.removeItem(DB_KEYS.CART);
    },

    // Wyliczenie szczegółów koszyka bazując na pełnych opakowaniach (zgrzewkach)
    getCartDetails() {
        const cart = this.getCart();
        const products = this.getProducts();
        let totalClient = 0;
        let totalWholesale = 0;
        let totalPacksCount = 0;
        let totalPiecesCount = 0;

        const items = cart.map(cartItem => {
            const product = products.find(p => p.id === cartItem.productId);
            if (!product) return null;

            const packSize = parseInt(product.packSize) > 0 ? parseInt(product.packSize) : 1;
            const packsQty = parseInt(cartItem.quantity) || 1;
            const totalPieces = packsQty * packSize;

            const cheapestWholesale = this.getCheapestWholesaleOffer(product);
            const highestWholesale = this.getHighestWholesaleOffer(product);
            
            // Cena hurtowa zakupu za 1 sztukę
            const unitWholesalePrice = cheapestWholesale ? cheapestWholesale.price : 0;
            
            // Cena sprzedaży dla klienta za 1 sztukę (z marżą)
            const baseWholesaleForClient = highestWholesale ? highestWholesale.price : unitWholesalePrice;
            const unitClientPrice = this.calculateClientPrice(baseWholesaleForClient, product);
            
            // Ceny za całe opakowanie zbiorcze (zgrzewkę)
            const packClientPrice = Math.round(unitClientPrice * packSize * 100) / 100;
            const packWholesalePrice = Math.round(unitWholesalePrice * packSize * 100) / 100;

            const itemClientTotal = Math.round(packsQty * packClientPrice * 100) / 100;
            const itemWholesaleTotal = Math.round(packsQty * packWholesalePrice * 100) / 100;

            totalClient += itemClientTotal;
            totalWholesale += itemWholesaleTotal;
            totalPacksCount += packsQty;
            totalPiecesCount += totalPieces;

            return {
                product: product,
                packageCount: packsQty,
                packSize: packSize,
                totalPieces: totalPieces,
                unitClientPrice: unitClientPrice,
                packageClientPrice: packClientPrice,
                unitWholesalePrice: unitWholesalePrice,
                packageWholesalePrice: packWholesalePrice,
                itemClientTotal: itemClientTotal,
                itemWholesaleTotal: itemWholesaleTotal,
                marginProfit: Math.round((itemClientTotal - itemWholesaleTotal) * 100) / 100
            };
        }).filter(Boolean);

        return {
            items: items,
            totalClientPrice: Math.round(totalClient * 100) / 100,
            totalWholesalePrice: Math.round(totalWholesale * 100) / 100,
            totalProfit: Math.round((totalClient - totalWholesale) * 100) / 100,
            totalPacksCount: totalPacksCount,
            totalPiecesCount: totalPiecesCount,
            totalItemsCount: totalPacksCount // kompatybilność wsteczna dla badge
        };
    },

    // --- BAZA KLIENTÓW B2B & AUTORYZACJA PO NIP ---
    getB2bClients() {
        let clients = JSON.parse(localStorage.getItem('porownywarka_b2b_clients'));
        if (!clients || !Array.isArray(clients) || clients.length === 0) {
            clients = [
                {
                    id: 'client_demo_1',
                    nip: '1234567890',
                    companyName: 'Sklep Spożywczy Demo Sp. z o.o.',
                    address: 'ul. Marszałkowska 10, Warszawa',
                    phone: '+48 500 600 700',
                    email: 'biuro@sklepdemo.pl',
                    notes: 'Klient demonstracyjny z pełnym dostępem',
                    status: 'approved',
                    registeredAt: '2026-08-30 10:00',
                    approvedAt: '2026-08-30 10:05'
                }
            ];
            localStorage.setItem('porownywarka_b2b_clients', JSON.stringify(clients));
        }
        return clients;
    },

    saveB2bClients(clients) {
        localStorage.setItem('porownywarka_b2b_clients', JSON.stringify(clients));
    },

    registerB2bClient({ nip, companyName, address, phone, email, notes }) {
        const cleanNip = String(nip || '').replace(/[^0-9]/g, '').trim();
        if (!cleanNip || cleanNip.length !== 10) {
            return { success: false, message: 'Nieprawidłowy numer NIP (musi zawierać dokładnie 10 cyfr)!' };
        }
        const clients = this.getB2bClients();
        const existing = clients.find(c => c.nip === cleanNip);
        if (existing) {
            if (existing.status === 'approved') {
                return { success: true, status: 'approved', client: existing, message: 'Twój NIP jest już zarejestrowany i aktywny! Możesz się od razu zalogować.' };
            } else {
                return { success: false, status: 'pending', message: 'Twoje zgłoszenie rejestracyjne oczekuje na zatwierdzenie przez hurtownię.' };
            }
        }

        const newClient = {
            id: 'client_' + Date.now(),
            nip: cleanNip,
            companyName: companyName || `Firma (NIP: ${cleanNip})`,
            address: address || '',
            phone: phone || '',
            email: email || '',
            notes: notes || '',
            status: 'pending', // 'pending' | 'approved' | 'blocked'
            registeredAt: new Date().toLocaleString('pl-PL')
        };
        clients.unshift(newClient);
        this.saveB2bClients(clients);
        return { success: true, status: 'pending', client: newClient, message: 'Zgłoszenie zostało wysłane! Hurtownia aktywuje Twoje konto w ciągu kilku minut.' };
    },

    approveB2bClient(nip) {
        const cleanNip = String(nip).replace(/[^0-9]/g, '').trim();
        const clients = this.getB2bClients();
        const client = clients.find(c => c.nip === cleanNip);
        if (client) {
            client.status = 'approved';
            client.approvedAt = new Date().toLocaleString('pl-PL');
            this.saveB2bClients(clients);
            return client;
        }
        return null;
    },

    rejectB2bClient(nip) {
        const cleanNip = String(nip).replace(/[^0-9]/g, '').trim();
        let clients = this.getB2bClients();
        clients = clients.filter(c => c.nip !== cleanNip);
        this.saveB2bClients(clients);
    },

    loginB2bClient(nip) {
        const cleanNip = String(nip || '').replace(/[^0-9]/g, '').trim();
        if (!cleanNip) return { success: false, message: 'Wpisz 10-cyfrowy NIP firmy!' };
        
        const clients = this.getB2bClients();
        const client = clients.find(c => c.nip === cleanNip);
        if (!client) {
            return { success: false, notRegistered: true, message: 'Ten NIP nie jest jeszcze zarejestrowany w naszej hurtowni. Wypełnij krótki formularz rejestracji.' };
        }
        if (client.status !== 'approved') {
            return { success: false, pending: true, message: 'Twoje konto czeka na zatwierdzenie przez hurtownię. Otrzymasz powiadomienie WhatsApp po aktywacji.' };
        }
        sessionStorage.setItem('porownywarka_b2b_session', JSON.stringify(client));
        return { success: true, client: client };
    },

    getB2bSession() {
        try {
            const s = sessionStorage.getItem('porownywarka_b2b_session');
            return s ? JSON.parse(s) : null;
        } catch(e) { return null; }
    },

    logoutB2bClient() {
        sessionStorage.removeItem('porownywarka_b2b_session');
    },

    isB2bLoggedIn() {
        return !!this.getB2bSession();
    },

    // --- ZAMÓWIENIA KLIENTÓW (ORDERS) ---
    getOrders() {
        return JSON.parse(localStorage.getItem(DB_KEYS.ORDERS)) || [];
    },

    saveOrder(customerInfo) {
        const cartDetails = this.getCartDetails();
        if (cartDetails.items.length === 0) return null;

        const orders = this.getOrders();
        const newOrder = {
            id: 'ord_' + Date.now(),
            orderNumber: 'ZAM-' + Math.floor(100000 + Math.random() * 900000),
            date: new Date().toLocaleString('pl-PL'),
            customerName: customerInfo.name || 'Klient B2B',
            customerNip: customerInfo.nip || '',
            customerPhone: customerInfo.phone || '',
            customerEmail: customerInfo.email || '',
            customerAddress: customerInfo.address || '',
            customerNotes: customerInfo.notes || '',
            totalPacksCount: cartDetails.totalPacksCount,
            totalPiecesCount: cartDetails.totalPiecesCount,
            items: cartDetails.items.map(i => ({
                productId: i.product.id,
                name: i.product.name,
                ean: i.product.ean,
                packageCount: i.packageCount,
                packSize: i.packSize,
                totalPieces: i.totalPieces,
                unit: i.product.unit || 'szt.',
                packageClientPrice: i.packageClientPrice,
                unitClientPrice: i.unitClientPrice,
                packageWholesalePrice: i.packageWholesalePrice,
                unitWholesalePrice: i.unitWholesalePrice,
                itemClientTotal: i.itemClientTotal
            })),
            totalClientPrice: cartDetails.totalClientPrice,
            totalWholesalePrice: cartDetails.totalWholesalePrice,
            estimatedProfit: cartDetails.totalProfit,
            status: 'Nowe'
        };

        orders.unshift(newOrder);
        localStorage.setItem(DB_KEYS.ORDERS, JSON.stringify(orders));
        this.clearCart();
        return newOrder;
    },

    deleteOrder(id) {
        let orders = this.getOrders();
        orders = orders.filter(o => o.id !== id);
        localStorage.setItem(DB_KEYS.ORDERS, JSON.stringify(orders));
    },

    // --- WYCOFYWANIE I USUWANIE TOWARÓW / KATEGORII / OFERT HURTOWNI BEZ ŚLADU ---
    deleteSingleProduct(productId) {
        let products = this.getProducts();
        products = products.filter(p => p.id !== productId);
        this.saveProducts(products);

        let drafts = JSON.parse(localStorage.getItem(DB_KEYS.DRAFTS)) || [];
        drafts = drafts.filter(d => d.id !== productId);
        localStorage.setItem(DB_KEYS.DRAFTS, JSON.stringify(drafts));
        return true;
    },

    deleteProductsByCategory(categoryName) {
        if (!categoryName) return 0;
        let products = this.getProducts();
        const initialCount = products.length;
        products = products.filter(p => (p.category || '').toLowerCase().trim() !== categoryName.toLowerCase().trim());
        const deletedCount = initialCount - products.length;
        this.saveProducts(products);
        return deletedCount;
    },

    deleteOffersBySupplier(supplierName) {
        if (!supplierName) return 0;
        let products = this.getProducts();
        let deletedProductsCount = 0;
        const targetSup = supplierName.toLowerCase().trim();

        const updatedProducts = [];
        products.forEach(p => {
            if (p.offers && p.offers.length > 0) {
                p.offers = p.offers.filter(o => {
                    const src = (o.source || '').toLowerCase().trim();
                    if (!src || !targetSup) return true;
                    return !(src === targetSup || src.includes(targetSup) || targetSup.includes(src));
                });
            }
            if (p.offers && p.offers.length > 0) {
                updatedProducts.push(p);
            } else {
                deletedProductsCount++;
            }
        });

        this.saveProducts(updatedProducts);
        return deletedProductsCount;
    },

    // --- HISTORIA IMPORTÓW ---
    getHistory() {
        return JSON.parse(localStorage.getItem(DB_KEYS.HISTORY)) || [];
    },

    addHistoryLog(type, source, count, status = 'success', details = '') {
        const history = this.getHistory();
        history.unshift({
            id: 'hist_' + Date.now(),
            date: new Date().toLocaleString('pl-PL'),
            type: type,
            source: source,
            count: count,
            status: status,
            details: details
        });
        if (history.length > 50) history.pop();
        localStorage.setItem(DB_KEYS.HISTORY, JSON.stringify(history));
    },

    // Resety bazy danych (ŚCIŚLE 0 DEMO TOWARÓW)
    clearAll() {
        localStorage.removeItem(DB_KEYS.PRODUCTS);
        localStorage.removeItem(DB_KEYS.SUPPLIERS);
        localStorage.removeItem(DB_KEYS.DRAFTS);
        localStorage.removeItem(DB_KEYS.HISTORY);
        localStorage.removeItem(DB_KEYS.CART);
        localStorage.removeItem(DB_KEYS.ORDERS);
        localStorage.removeItem(DB_KEYS.PACKAGING_MEMORY);
        localStorage.setItem(DB_KEYS.PRODUCTS, JSON.stringify([]));
        this.seedDemoSuppliersOnly();
    },

    seedDemoSuppliersOnly() {
        const suppliers = this.getSuppliers();
        if (suppliers.length === 0) {
            const demoSuppliers = [
                { id: 'sup_monolith', name: 'Monolith Polska', type: 'web', url: 'https://shop.monolith-polska.com/' },
                { id: 'sup_vicreate', name: 'Vicreate B2B', type: 'web', url: 'https://b2b.vicreate.pl/' },
                { id: 'sup_kraftgroup', name: 'Kraftgroup Hurtownia', type: 'web', url: 'https://www.kraftgroup.pl/' }
            ];
            localStorage.setItem(DB_KEYS.SUPPLIERS, JSON.stringify(demoSuppliers));
        }
    },

    clearProductsOnlyKeepSuppliers() {
        localStorage.removeItem(DB_KEYS.PRODUCTS);
        localStorage.removeItem(DB_KEYS.QUARANTINE);
        localStorage.removeItem(DB_KEYS.DRAFTS);
        localStorage.setItem(DB_KEYS.PRODUCTS, JSON.stringify([]));
        localStorage.setItem(DB_KEYS.QUARANTINE, JSON.stringify([]));
        this.seedDemoSuppliersOnly();
        this.addHistoryLog('System', 0, 'Sukces', 'Wyczyszczono wszystkie towary z katalogu (zachowano listy dostawców i marże)');
    },

    loadKravetsMasterCatalog(force = false) {
        const kravetsItems = window.KRAVETS_MASTER_CATALOG || window.KRAVETS_SCRAPED_CATALOG;
        if (!kravetsItems || kravetsItems.length === 0) return 0;
        const existing = this.getProducts();
        if (!force && existing && existing.length > 0) return existing.length;
        const formattedProducts = kravetsItems.map(k => ({
            id: k.id || `kravets_${k.sku}`,
            sku: k.sku,
            name: k.name,
            ean: k.ean,
            category: k.category || 'Inne',
            categoryColor: k.categoryColor || '#8b5cf6',
            categoryTextColor: k.categoryTextColor || '#c4b5fd',
            categoryIcon: k.categoryIcon || 'fa-solid fa-tag',
            originalGroup: k.originalGroup || k.category,
            brand: k.brand || 'Kravets',
            packSize: k.packSize || 1,
            packagePrice: k.packSize > 1 ? parseFloat((k.priceNetto * k.packSize).toFixed(2)) : null,
            vat: k.vat ? (typeof k.vat === 'string' && k.vat.includes('%') ? k.vat : `${k.vat}%`) : '5%',
            unit: k.unit || 'szt.',
            image: k.image || null,
            isApproved: true,
            offers: [{
                source: 'Kravets',
                price: parseFloat(k.priceNetto) || 0,
                packagePrice: k.packSize > 1 ? parseFloat((k.priceNetto * k.packSize).toFixed(2)) : null,
                packSize: k.packSize || 1,
                isAvailable: true,
                updatedAt: new Date().toISOString()
            }]
        }));

        this.saveProducts(formattedProducts);
        return formattedProducts.length;
    },

    // --- USTAWIENIA SYSTEMU & WHATSAPP WŁAŚCICIELA ---
    getSettings() {
        const raw = localStorage.getItem(DB_KEYS.SETTINGS);
        let settings = {
            ownerWhatsAppPhone: '48517040800',
            ownerEmail: 'zamowienia@twojahurtownia.pl',
            companyName: 'Hurtownia Spożywcza B2B'
        };
        if (raw) {
            try {
                settings = { ...settings, ...JSON.parse(raw) };
            } catch(e) {}
        }
        return settings;
    },

    saveSettings(settings) {
        localStorage.setItem(DB_KEYS.SETTINGS, JSON.stringify(settings));
    },

    getOwnerWhatsAppPhone() {
        const settings = this.getSettings();
        let phone = settings.ownerWhatsAppPhone || '48517040800';
        phone = String(phone).replace(/[^0-9]/g, '');
        if (phone.length === 9) phone = '48' + phone;
        return phone;
    },

    setOwnerWhatsAppPhone(phone) {
        const settings = this.getSettings();
        let clean = String(phone || '').replace(/[^0-9]/g, '');
        if (clean.length === 9) clean = '48' + clean;
        settings.ownerWhatsAppPhone = clean;
        this.saveSettings(settings);
        return clean;
    },

    getOwnerEmail() {
        const settings = this.getSettings();
        return settings.ownerEmail || 'zamowienia@twojahurtownia.pl';
    },

    setOwnerEmail(email) {
        const settings = this.getSettings();
        settings.ownerEmail = (email || '').trim();
        this.saveSettings(settings);
        return settings.ownerEmail;
    }
};

window.Database = Database;
