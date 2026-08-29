// scraper.js - Zaawansowana integracja ze skryptem serwera oraz inteligentny parser wklejanych stron i tekstu

const Scraper = window.Scraper = window.MonolithParser = {
    getBackendUrl() {
        const settings = JSON.parse(localStorage.getItem('porownywarka_settings')) || {};
        if (settings.backendUrl && typeof settings.backendUrl === 'string' && settings.backendUrl.trim()) {
            let url = settings.backendUrl.trim().replace(/\/+$/, '');
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'http://' + url;
            }
            return url;
        }
        const host = (window.location && window.location.hostname && window.location.hostname.trim()) 
            ? window.location.hostname.trim() 
            : 'localhost';
        return `http://${host}:8080`;
    },

    // Otwieranie Edge do ręcznego logowania (omijanie Cloudflare)
    async openBrowser(url) {
        const backendUrl = this.getBackendUrl();
        try {
            const response = await fetch(`${backendUrl}/open-browser`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url || 'https://shop.monolith-polska.com/account/login' })
            });
            return await response.json();
        } catch (e) {
            window.open(url || 'https://shop.monolith-polska.com/account/login', '_blank');
        }
    },

    // Automatyczna aktualizacja cen ze zdjęciami z serwera
    async fetchPricesFromServer(supplier) {
        const backendUrl = this.getBackendUrl();
        const response = await fetch(`${backendUrl}/scrape`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: supplier.url,
                username: supplier.username,
                password: supplier.password
            })
        });

        const products = await response.json();
        
        if (!response.ok || products.error) {
            throw new Error(products.errorMessage || "Nie udało się automatycznie pobrać produktów ze względu na Cloudflare. Skorzystaj z przycisku 'Otwórz w Edge' i wklej zawartość strony.");
        }

        let importedCount = 0;
        products.forEach(p => {
            if (p.name && p.price > 0) {
                Database.addPriceOffer(p.ean, p.sku, p.name, supplier.name, p.price, p.date, {
                    image: p.image,
                    description: p.description,
                    category: p.category,
                    unit: p.unit
                });
                importedCount++;
            }
        });

        Database.addHistoryLog(
            'Strona B2B', 
            supplier.name, 
            importedCount, 
            'success', 
            `Pobrano towary z hurtowni B2B`
        );

        return importedCount;
    },

    guessCategory(name, supplierName) {
        if (!name) return { main: 'Inne', sub: 'Ogólne' };
        const lowerName = name.toLowerCase();
        
        // Transliteracja Cyrylicy na alfabet łaciński
        const norm = lowerName
            .replace(/квас/g, 'kwas')
            .replace(/а/g, 'a').replace(/б/g, 'b').replace(/в/g, 'v').replace(/г/g, 'g')
            .replace(/д/g, 'd').replace(/е/g, 'e').replace(/ё/g, 'e').replace(/ж/g, 'z')
            .replace(/з/g, 'z').replace(/и/g, 'i').replace(/й/g, 'j').replace(/к/g, 'k')
            .replace(/л/g, 'l').replace(/м/g, 'm').replace(/н/g, 'n').replace(/о/g, 'o')
            .replace(/п/g, 'p').replace(/р/g, 'r').replace(/с/g, 's').replace(/т/g, 't')
            .replace(/у/g, 'u').replace(/ф/g, 'f').replace(/х/g, 'h').replace(/ц/g, 'c')
            .replace(/ч/g, 'cz').replace(/ш/g, 'sz').replace(/щ/g, 'szcz').replace(/ы/g, 'y')
            .replace(/э/g, 'e').replace(/ю/g, 'ju').replace(/я/g, 'ja');
        
        const CATEGORY_MAP = [
            { main: 'Napoje', sub: 'Kwasy', regex: /kwas|kvas|квас/i },
            { main: 'Napoje', sub: 'Soki', regex: /sok|nektar|сок|juic/i },
            { main: 'Napoje', sub: 'Wody', regex: /woda|voda|вода|water|aqua/i },
            { main: 'Napoje', sub: 'Napoje gazowane', regex: /cola|fanta|sprite|pepsi|bajkal|baikal|oranżad|lemoniad|sitro|gazowan|напиток|газиров/i },
            { main: 'Napoje', sub: 'Inne', regex: /napo|napój|napoj|drink/i },
            
            { main: 'Kawy', sub: 'Ziarniste', regex: /ziarnist|зернов/i },
            { main: 'Kawy', sub: 'Mielone', regex: /mielon|молот/i },
            { main: 'Kawy', sub: 'Rozpuszczalne', regex: /rozpuszczaln|растворим|nescafe|instant/i },
            { main: 'Kawy', sub: 'Inne', regex: /kawa|kofe|кофе|coffee|espresso|lavazza|jacobs|tchibo/i },
            
            { main: 'Herbaty', sub: 'Owocowe', regex: /owocowa|фрукт/i },
            { main: 'Herbaty', sub: 'Czarne', regex: /czarna|черн/i },
            { main: 'Herbaty', sub: 'Zielone', regex: /zielona|зелен/i },
            { main: 'Herbaty', sub: 'Inne', regex: /herbata|tea|чай|liściasta|ekspresowa/i },
            
            { main: 'Sosy i Przyprawy', sub: 'Ketchupy', regex: /ketchup|кетчуп/i },
            { main: 'Sosy i Przyprawy', sub: 'Musztardy', regex: /musztard|горчиц/i },
            { main: 'Sosy i Przyprawy', sub: 'Majonezy', regex: /majonez|майонез/i },
            { main: 'Sosy i Przyprawy', sub: 'Inne', regex: /sos|przypraw|pieprz|sól|соус|приправ/i },
            
            { main: 'Słodycze', sub: 'Cukierki i Praliny', regex: /cukierk|pralin|trufl|конфет/i },
            { main: 'Słodycze', sub: 'Czekolady', regex: /czekolad|шоколад/i },
            { main: 'Słodycze', sub: 'Ciastka i Wafle', regex: /ciastk|wafel|herbatni|piernik|печень|вафл/i },
            { main: 'Słodycze', sub: 'Inne', regex: /cukier|baton|bombonierk|żelk|lizak|сладост/i },
            
            { main: 'Przekąski', sub: 'Chipsy', regex: /chips|чипс/i },
            { main: 'Przekąski', sub: 'Chrupki', regex: /chrupk/i },
            { main: 'Przekąski', sub: 'Orzeszki', regex: /orzeszk|pistacj|migdał|орех/i },
            { main: 'Przekąski', sub: 'Inne', regex: /paluszk|krakers|сухарик/i },
            
            { main: 'Nabiał', sub: 'Sery', regex: /ser\b|sery|сыр/i },
            { main: 'Nabiał', sub: 'Inne', regex: /mleko|jogurt|kefir|śmietan|masło|twar|молоко|smetana/i },
            
            { main: 'Alkohole', sub: 'Piwa', regex: /piwo|beer|пиво/i },
            { main: 'Alkohole', sub: 'Wódki', regex: /wódka|vodka|водка/i },
            { main: 'Alkohole', sub: 'Wina', regex: /wino|wine|вино/i },
            { main: 'Alkohole', sub: 'Inne', regex: /alkohol|spirit/i },
            
            { main: 'Przetwory i Konserwy', sub: 'Konserwy', regex: /konserw|puszk|pasztet|paprykarz|тушонк|консерв/i },
            { main: 'Produkty sypkie', sub: 'Inne', regex: /ryż|kasz|makaron|mąk/i },
            { main: 'Chemia', sub: 'Inne', regex: /proszek|szampon|mydło|żel|ariel|persil|vizir/i }
        ];

        for (const cat of CATEGORY_MAP) {
            if (lowerName.match(cat.regex) || norm.match(cat.regex)) {
                return { main: cat.main, sub: cat.sub };
            }
        }
        
        return { main: 'Inne', sub: 'Ogólne' };
    },

    autoCategorizeDatabase() {
        // Disabled: do not overwrite master catalog categories
        return 0;
    },

    // Oczyszczanie nazwy towaru z zniekształceń, etykiet EAN, śmieciowych znaków i surowych cyfr
    cleanProductName(name, ean = '') {
        if (!name) return '';
        let cleaned = String(name);
        if (ean) {
            cleaned = cleaned.replace(ean, '');
        }
        return cleaned
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;|&quot;|&#39;|&amp;/gi, ' ')
            .replace(/Pocz[aą\?]+tek\s*formularza.*$/gi, ' ')
            .replace(/D[oó\?]+[\s\l]*formularza.*$/gi, ' ')
            .replace(/ilo[śs\?]+.*$/gi, ' ')
            .replace(/^(?:Pocz[aą\?]+tek\s*formularza|D[oó\?]+[\s\l]*formularza|ilo[śs\?]+|\s)+/gi, '')
            .replace(/^(?:Zdj[eę\?]?cie\s*Nazwa\s*EAN\s*Termin\s*Cena|ZdjęcieNazwaEANTerminCena|Zdj\?cieNazwaEANTerminCena)\s*/gi, '')
            .replace(/\b\d{2}[\.\-\/]\d{2}[\.\-\/]\d{4}\b/g, ' ')
            .replace(/\b\d{4}[\.\-\/]\d{2}[\.\-\/]\d{2}\b/g, ' ')
            .replace(/(?:EAN|GTIN|SKU|Kod|Symbol|Index|Indeks|Art\.\s*nr|Nr\s*art|Ref)[\s:\-#]*[0-9A-Za-z]{5,16}/gi, '')
            .replace(/\[\d+\]|\(\d+\)/g, '')
            .replace(/\b\d{8,14}\b/g, '')
            .replace(/[\/\|\:\;\,\t]/g, ' ')
            .replace(/\b(zł|pln|eur|netto|brutto|szt|kg|opak|op|koszyk|dodaj|cena|dostawa|kup teraz|w magazynie)\b/gi, '')
            // Inteligentna rekonstrukcja uszkodzonych polskich znaków (np. po wklejeniu z błędnym kodowaniem)
            .replace(/Bia[\s\uFFFD\?]*y/gi, 'Biały')
            .replace(/g[\s\uFFFD\?]*owica/gi, 'głowica')
            .replace(/ma[\s\uFFFD\?]*y/gi, 'mały')
            .replace(/Rega[łl\s\uFFFD\?]*(?=drewnian)/gi, 'Regał ')
            .replace(/Prawdziw[y\s\uFFFD\?]*/gi, 'Prawdziwy')
            .replace(/^[\s\-–|:;,.]+/, '')
            .replace(/[\s\-–|:;,.]+$/, '')
            .replace(/\s+/g, ' ')
            .trim();
    },

    // Wyciąganie kodów kreskowych EAN/GTIN/SKU (8-14 cyfr oraz uniwersalnych symboli) z HTML i tekstu
    extractEanFromTextOrNode(text, node = null) {
        const db = typeof Database !== 'undefined' ? Database : (typeof window !== 'undefined' ? window.Database : null);
        const cleanFn = (v) => db && db.cleanEan ? db.cleanEan(v) : String(v).replace(/\D/g, '');

        // STRATEGIA A: Atrybuty HTML i mikrodane w elemencie
        if (node) {
            const attrList = [
                'data-ean', 'data-gtin', 'data-barcode', 'data-code', 'data-sku', 'data-id', 
                'data-product-ean', 'data-product-code', 'data-product-id', 'data-article', 
                'data-article-id', 'data-index', 'data-symbol', 'data-ref', 'data-reference',
                'data-part-number', 'data-item-code'
            ];
            for (const attr of attrList) {
                const val = node.getAttribute(attr);
                if (val && val.trim().length >= 6) {
                    const cleaned = cleanFn(val);
                    if (cleaned.length >= 7) return cleaned;
                }
            }

            const codeElem = node.querySelector('.product-code-ui, .product-code, .ean, .barcode, .gtin, .sku, .symbol, .index, .art-nr, [itemprop="gtin13"], [itemprop="gtin8"], [itemprop="gtin14"], [itemprop="sku"], [itemprop="productID"]');
            if (codeElem) {
                const codeText = codeElem.textContent.trim();
                const cleaned = cleanFn(codeText);
                if (cleaned.length >= 7) return cleaned;
            }
        }

        if (!text) return '';

        // STRATEGIA B: Wyraźne etykiety słowne w tekście ("EAN:", "Kod:", "Symbol:", "GTIN:", "SKU:", "Art. nr:", "Index:")
        const labeledMatch = text.match(/(?:EAN|GTIN|Kod\s+kreskowy|Kod\s+towaru|Kod\s+produktu|Kod|Symbol|Index|Indeks|SKU|Art\.\s*nr|Nr\s*art|Ref)[\s:\-#]*([0-9A-Za-z]{6,16})/i);
        if (labeledMatch) {
            const val = labeledMatch[1];
            const cleaned = cleanFn(val);
            if (cleaned.length >= 7) return cleaned;
            if (val.length >= 5 && !val.match(/^(netto|brutto|szt|zł|pln|opak)$/i)) {
                return val.toUpperCase();
            }
        }

        // STRATEGIA C: Autonomiczne ciągi cyfr EAN-13, EAN-8, GTIN-14 (8-14 cyfr) w tekście
        const eanMatches = text.match(/\b\d{8,14}\b/g);
        if (eanMatches) {
            for (const match of eanMatches) {
                const cleaned = cleanFn(match);
                if (cleaned.length >= 8 && cleaned.length <= 14 && !cleaned.startsWith('2026') && !cleaned.startsWith('2025') && !cleaned.startsWith('2027')) {
                    return cleaned;
                }
            }
        }

        return '';
    },

    parseAndImportText(rawInput, supplierName, htmlContent) {
        return this.parsePastedText(rawInput, supplierName, new Date().toISOString(), htmlContent);
    },

    // INTELIGENTNY PARSER WKLEJANEGO TEKSTU I HTML (100% Niezawodny)
    // Parcontent: HTML, tekst z podziałem na wiersze, tabele z przeglądarki
    parsePastedText(rawInput, supplierName, dateStr = new Date().toISOString(), htmlContent = null) {
        if (!rawInput || rawInput.trim() === "") {
            return 0;
        }

        const extracted = this.extractProductsStructured(rawInput, supplierName, htmlContent || rawInput);
        if (!extracted || extracted.length === 0) {
            return 0;
        }

        const db = typeof Database !== 'undefined' ? Database : (typeof window !== 'undefined' ? window.Database : null);
        if (!db) return 0;

        let importedCount = 0;
        extracted.forEach(item => {
            if (!item.name || !item.price || isNaN(item.price) || item.price <= 0) return;

            const guessedCat = this.guessCategory ? this.guessCategory(item.name, supplierName) : { main: 'Inne', sub: 'Ogólne' };
            db.addPriceOffer(
                item.ean || '',
                item.sku || '',
                item.name,
                supplierName,
                item.price,
                dateStr,
                {
                    vat: item.vat || '23%',
                    image: item.image || '',
                    packSize: item.packSize || 1,
                    unit: item.unit || 'szt.',
                    packagePrice: item.packagePrice || item.price,
                    expirationDate: item.expirationDate || null,
                    category: guessedCat.main,
                    subCategory: guessedCat.sub,
                    isApproved: true
                }
            );
            importedCount++;
        });

        if (importedCount > 0) {
            if (db.autoCleanAndMergeAllProducts) db.autoCleanAndMergeAllProducts();
            if (db.addHistoryLog) {
                db.addHistoryLog(
                    'Wklejanie', 
                    supplierName, 
                    importedCount, 
                    'success', 
                    `Wyodrębniono pomyślnie ${importedCount} towarów`
                );
            }
        }

        return importedCount;
    },

    // Zwraca ustrukturyzowaną listę obiektów dla okna weryfikacji mapowania
    extractProductsStructured(rawInput, supplierName, htmlContent) {
        let input = rawInput || htmlContent || '';
        if (!input || input.trim() === "") return null;

        // Normalizacja spacji unikodowych, znaków zastępczych UTF-8 i encji HTML
        input = input
            .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
            .replace(/\uFFFD/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&quot;/gi, '"')
            .replace(/&#39;/gi, "'");

        const items = [];

        // 1. Z DOMParser (Monolith / Comarch B2B / WooCommerce HTML / Tabele Produktowe)
        if (htmlContent && htmlContent.includes('<') && htmlContent.includes('>') && !htmlContent.startsWith('&lt;')) {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(input, 'text/html');
                
                const selectors = [
                    // Tabele produktowe (WooCommerce, PrestaShop, B2B, Kraft Group, Shoper, etc.)
                    'table.shop_table tbody tr', 'table.woocommerce-table tbody tr', 'table.products-table tbody tr', 'table.table-products tbody tr',
                    'table.shop_table tr.cart_item', 'table.shop_table tr.product', 'table tbody tr', 'table tr.cart_item', 'table tr.product', 'table tr',
                    // Karty produktowe i kontenery B2B (Monolith, Comarch, WoodMart, etc.)
                    '.product-item-ui', '.teneso-product-item', '.cart-product-container-js', '.product-box-ui', '.list-view-ui', '.product-box-js',
                    '.product-box', '.product--box', '.product-info', '.product-item', '.product-card', '.product-grid-item',
                    'article.product', 'article', 'li.product', '[data-product-number]', '[data-product-id]', '.product-wrapper', '.product'
                ];

                let foundNodes = [];
                for (const sel of selectors) {
                    const nodes = doc.querySelectorAll(sel);
                    if (nodes.length > 0) {
                        foundNodes = Array.from(nodes);
                        break;
                    }
                }

                if (foundNodes.length > 0) {
                    foundNodes.forEach(node => {
                        // Ignoruj wiersze nagłówkowe tabeli (th / thead) oraz wiersze podsumowań koszyka
                        if (node.tagName === 'TR') {
                            if (node.querySelector('th') || node.closest('thead')) return;
                            if (node.classList.contains('cart-subtotal') || node.classList.contains('order-total') || node.classList.contains('shipping')) return;
                        }

                        const textContent = (node.innerText || node.textContent || '').trim();
                        if (textContent.length < 4) return;

                        let expDate = '';
                        const dateElem = node.querySelector('.product-date, [class*="date"], [class*="termin"], [class*="wazn"]');
                        if (dateElem) {
                            const dMatch = dateElem.textContent.match(/\b(\d{2}[\.\-\/]\d{2}[\.\-\/]\d{4})\b/);
                            if (dMatch) expDate = dMatch[1];
                        }
                        if (!expDate) {
                            const expMatch = textContent.match(/\b(\d{2}[\.\-\/]\d{2}[\.\-\/]\d{4})\b/) || textContent.match(/\b(\d{4}[\.\-\/]\d{2}[\.\-\/]\d{2})\b/);
                            if (expMatch) expDate = expMatch[1];
                        }

                        let ean = '';
                        const eanElem = node.querySelector('.product-ean, [class*="ean"], [class*="sku"], [class*="barcode"], [data-ean], [data-sku]');
                        if (eanElem) {
                            ean = this.extractEanFromTextOrNode(eanElem.textContent.trim(), eanElem);
                        }
                        if (!ean) {
                            ean = this.extractEanFromTextOrNode(textContent, node);
                        }

                        let name = '';
                        const titleElem = node.querySelector('.product-name a, .product-title a, .product-name-ui a, a.product-title, td.product-name a, td.product-name, .product-name-ui, .product-name-js, .product-title, .product-name, .product--title, h1, h2, h3, h4, a.title, .name');
                        if (titleElem) {
                            const linkInTitle = titleElem.querySelector('a');
                            name = (linkInTitle ? linkInTitle.getAttribute('title') || linkInTitle.textContent : null) || titleElem.getAttribute('title') || titleElem.textContent || '';
                            name = name.trim();
                        }
                        if (!name && node.tagName === 'TR') {
                            const tds = Array.from(node.querySelectorAll('td'));
                            for (const td of tds) {
                                const tdText = td.textContent.trim();
                                if (tdText.length > 5 && !tdText.match(/^\d+[\.,]\d{2}/) && !tdText.match(/^\d{8,14}$/) && !tdText.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
                                    name = tdText;
                                    break;
                                }
                            }
                        }
                        if (!name && textContent.length < 300) {
                            const firstLine = textContent.split('\n').map(l => l.trim()).find(l => l.length > 4 && !l.match(/^\d+[\.,]\d{2}/));
                            if (firstLine) name = firstLine;
                        }

                        name = this.cleanProductName(name, ean);

                        // Wyciąganie pakowania i jednostki miary (szt. vs kg)
                        let packSize = 1;
                        let unit = 'szt.';

                        const isKg = /kg|kilogram/i.test(name) || /kg|kilogram/i.test(textContent);
                        if (isKg) {
                            unit = 'kg';
                            const kgMatch = (name + ' ' + textContent).match(/(\d+(?:[\.,]\d+)?)\s*(?:kg|kilogram)/i);
                            if (kgMatch) {
                                packSize = parseFloat(kgMatch[1].replace(',', '.')) || 1;
                            }
                        } else {
                            const packMatch = node.innerHTML.match(/(?:W kartonie|Szt\. w kartonie|W opakowaniu|Ilość w opakowaniu|Zgrzewka|W zgrzewce|Zgrzewki|Karton|Opakowanie|Opak\.|Paczka|Pakowane po|Ilość w zgrzewce).*?<em[^>]*>\s*(\d+)/i) 
                                           || textContent.match(/(?:W kartonie|Szt\. w kartonie|W opakowaniu|Ilość w opakowaniu|Zgrzewka|W zgrzewce|Zgrzewki|Karton|Opakowanie|Opak\.|Paczka|Pakowane po|Ilość w zgrzewce)[\s:]*(\d+)/i);
                            if (packMatch) packSize = parseInt(packMatch[1], 10) || 1;

                            if (packSize === 1) {
                                const cartPackMatch = textContent.match(/1\s*(?:opak|zgrz|karton|opak\.|kart\.)\s*=\s*(\d+)\s*(?:szt|butelek|puszek|op)/i);
                                if (cartPackMatch) packSize = parseInt(cartPackMatch[1], 10) || 1;
                            }

                            if (packSize === 1) {
                                const inOpakMatch = textContent.match(/(\d+)\s*(?:szt|butelek|puszek)\s*(?:w\s*(?:opakowaniu|kartonie|zgrzewce)|\/\s*opak|\.w\s*op|\s*w\s*op)/i);
                                if (inOpakMatch) packSize = parseInt(inOpakMatch[1], 10) || 1;
                            }

                            if (packSize === 1) {
                                const multMatch = textContent.match(/(\d+)\s*x\s*[\d\.,]+\s*(?:l|ml|kg|g)/i) || name.match(/(\d+)\s*x\s*[\d\.,]+\s*(?:l|ml|kg|g)/i);
                                if (multMatch) packSize = parseInt(multMatch[1], 10) || 1;
                            }

                            if (packSize === 1 && typeof Database !== 'undefined' && Database.inferPackaging) {
                                const inf = Database.inferPackaging(name);
                                if (inf && inf.packSize) {
                                    packSize = inf.packSize;
                                    unit = inf.unit || unit;
                                }
                            }
                        }

                        // Wyciąganie CENY ZA SZTUKĘ (unitPrice)
                        let unitPrice = 0;
                        let rawPrice = 0;
                        const priceElem = node.querySelector('.product-price .amount, .price-ui, .product-price, .price, .amount, .woocommerce-Price-amount, ins .amount, .product--price, [class*="price"]');

                        if (priceElem) {
                            let priceText = priceElem.textContent;
                            if (ean) priceText = priceText.replace(new RegExp('\\b' + ean + '\\b', 'g'), ' ');
                            if (expDate) priceText = priceText.replace(new RegExp('\\b' + expDate.replace(/\./g, '\\.') + '\\b', 'g'), ' ');
                            const priceMatches = [...priceText.matchAll(/(\d{1,5}[\.,]\d{2})(?:\s*(?:z[łl]|pln|eur|€|\S))?/gi)];
                            if (priceMatches.length > 0) {
                                let chosen = priceMatches[priceMatches.length - 1];
                                for (const pm of priceMatches) {
                                    if (pm[0].toLowerCase().includes('zł') || pm[0].toLowerCase().includes('pln') || pm[0].toLowerCase().includes('z')) {
                                        chosen = pm;
                                        break;
                                    }
                                }
                                rawPrice = parseFloat(chosen[1].replace(/\s/g, '').replace(',', '.'));
                            }
                        }

                        if (!rawPrice || rawPrice <= 0) {
                            const unitElem = node.querySelector('.unit-ratio-info-ui, .price-unit, [data-unit-price]');
                            if (unitElem) {
                                const m = unitElem.textContent.match(/(\d{1,5}[\.,]\d{2})/);
                                if (m) rawPrice = parseFloat(m[1].replace(',', '.'));
                            }
                        }

                        if (!rawPrice || rawPrice <= 0) {
                            const inputElem = node.querySelector('input[name="quantity"], input[data-price]');
                            if (inputElem && inputElem.getAttribute('data-price')) {
                                rawPrice = parseFloat(inputElem.getAttribute('data-price').replace(',', '.'));
                            }
                        }

                        if (!rawPrice || rawPrice <= 0) {
                            let priceSearchScope = textContent;
                            if (ean) priceSearchScope = priceSearchScope.replace(new RegExp('\\b' + ean + '\\b', 'g'), ' ');
                            if (expDate) priceSearchScope = priceSearchScope.replace(new RegExp('\\b' + expDate.replace(/\./g, '\\.') + '\\b', 'g'), ' ');

                            const priceMatches = [...priceSearchScope.matchAll(/(\d{1,5}[\.,]\d{2})(?:\s*(?:z[łl]|pln|eur|€|\S))?/gi)];
                            if (priceMatches.length > 0) {
                                let chosen = priceMatches[priceMatches.length - 1];
                                for (const pm of priceMatches) {
                                    if (pm[0].toLowerCase().includes('zł') || pm[0].toLowerCase().includes('pln') || pm[0].toLowerCase().includes('z')) {
                                        chosen = pm;
                                        break;
                                    }
                                }
                                rawPrice = parseFloat(chosen[1].replace(/\s/g, '').replace(',', '.'));
                            }
                        }

                        unitPrice = rawPrice;

                        let imgUrl = '';
                        const imgElem = node.querySelector('.main-image-ui, img.attachment-woocommerce_thumbnail, img.wp-post-image, .product-thumbnail img, td.product-thumbnail img, td img, img');
                        if (imgElem) {
                            let rawSrc = imgElem.getAttribute('data-wood-src') ||
                                         imgElem.getAttribute('data-src') || 
                                         imgElem.getAttribute('data-lazy-src') || 
                                         imgElem.getAttribute('data-original') || 
                                         imgElem.getAttribute('src') || 
                                         imgElem.src;

                            if (imgElem.getAttribute('srcset')) {
                                const srcSetFirst = imgElem.getAttribute('srcset').split(',')[0].trim().split(' ')[0];
                                if (srcSetFirst && srcSetFirst.startsWith('http')) rawSrc = srcSetFirst;
                            }

                            if (rawSrc && typeof window.resolveImageUrl === 'function') {
                                imgUrl = window.resolveImageUrl(rawSrc, supplierName);
                            }
                        }

                        if (!imgUrl && typeof Database !== 'undefined' && Database.resolveProductImage) {
                            imgUrl = Database.resolveProductImage(name);
                        }

                        let vat = '23%';
                        const nodeTitle = node.getAttribute('title') || '';
                        const vatMatch = textContent.match(/VAT[\s:]*([\d,\.]+)/i) || nodeTitle.match(/VAT:\s*([\d,\.]+)/i);
                        if (vatMatch) vat = vatMatch[1] + '%';

                        if (name && name.length >= 3 && (unitPrice > 0 || (ean && ean.length >= 8))) {
                            items.push({
                                name: name,
                                price: unitPrice,
                                packagePrice: parseFloat((unitPrice * packSize).toFixed(2)),
                                ean: ean,
                                sku: '',
                                vat: vat,
                                image: imgUrl,
                                packSize: packSize,
                                unit: unit,
                                expirationDate: expDate
                            });
                        }
                    });
                }
            } catch(e) { console.warn("Błąd parsowania HTML:", e); }
        }

        // STRATEGIA 2: INTELIGENTNY PARSER STRON WWW I CENNIKÓW (Pionowe wiersze, tabele z tabulatorami, tabele ze spacjami)
        if (items.length === 0) {
            const textToParse = input;
            const lines = textToParse.split(/\r?\n|\r/).map(l => l.trim()).filter(l => l.length > 0);

            const isFormOrActionBoilerplate = (str) => {
                if (!str) return true;
                const s = str.toLowerCase().trim();
                if (s.includes('formularz') || s.includes('ilość') || s.includes('koszyk') || s.includes('dodaj') || s.includes('zamów') || s.includes('kup teraz')) {
                    if (s.length < 60 || /^(?:pocz[aą\?]+tek|d[oó\?]+|ilo[śs\?]+|dodaj)/i.test(s)) return true;
                }
                return false;
            };

            const isHeaderOrServiceLine = (line) => {
                const l = line.toLowerCase().trim();
                if (l.length < 3) return true;
                const keywords = [
                    'darmowa dostawa', 'koszyk', 'zaloguj', 'wyloguj', 'rejestracja', 'kategorie', 'strona główna',
                    'szukaj', 'pokaż', 'wyświetlono', 'wszystkie prawa', 'regulamin', 'kontakt', 'tel:', 'email:',
                    'zdjęcie', 'nazwa produktu', 'cena hurtowa', 'kod ean', 'termin ważności', 'dodaj do koszyka'
                ];
                if (keywords.some(kw => l.includes(kw) && !l.includes('kwas') && !l.includes('taras') && !l.includes('0.') && !l.includes('1.') && !l.includes('2.') && !l.includes('30.'))) {
                    return true;
                }
                return false;
            };

            const extractDateFromStr = (str) => {
                if (!str) return '';
                const match = str.match(/\b(\d{2}[\.\-\/]\d{2}[\.\-\/]\d{4})\b/) || str.match(/\b(\d{4}[\.\-\/]\d{2}[\.\-\/]\d{2})\b/);
                return match ? match[1] : '';
            };

            // KROK 1: Sprawdź czy linie to kompletne wiersze tabeli (każda linia zawiera cenę lub cenę i nazwę)
            const cleanLines = lines.filter(l => !isHeaderOrServiceLine(l));

            for (let i = 0; i < cleanLines.length; i++) {
                const rawLine = cleanLines[i];
                let workingLine = rawLine;

                // 1. Wyciągnij datę ważności (DD.MM.YYYY lub YYYY-MM-DD) i zamień na spację w workingLine
                let expDate = '';
                const dateMatches = [...workingLine.matchAll(/\b(\d{2}[\.\-\/]\d{2}[\.\-\/]\d{4})\b/g)];
                if (dateMatches.length > 0) {
                    expDate = dateMatches[0][1];
                    dateMatches.forEach(m => { workingLine = workingLine.replace(m[0], ' '); });
                }

                // 2. Wyciągnij EAN (8-14 cyfr) i zamień na spację w workingLine
                let ean = '';
                const eanMatches = [...workingLine.matchAll(/\b(\d{8,14})\b/g)];
                if (eanMatches.length > 0) {
                    // Sprawdź czy to nie rocznik
                    const candidate = eanMatches.find(m => !m[1].startsWith('2025') && !m[1].startsWith('2026') && !m[1].startsWith('2027') && !m[1].startsWith('2028'));
                    if (candidate) {
                        ean = candidate[1];
                        eanMatches.forEach(m => { workingLine = workingLine.replace(m[0], ' '); });
                    }
                }

                // 3. Wyciągnij cenę (izolowana liczba zmiennoprzecinkowa z 2 miejscami po przecinku)
                let price = 0;
                const priceMatches = [...workingLine.matchAll(/(\d{1,5}[\.,]\d{2})(?:\s*(?:z[łl]|pln|eur|€|\S))?/gi)];
                if (priceMatches.length > 0) {
                    let chosen = priceMatches[priceMatches.length - 1];
                    for (const pm of priceMatches) {
                        if (pm[0].toLowerCase().includes('zł') || pm[0].toLowerCase().includes('pln') || pm[0].toLowerCase().includes('z')) {
                            chosen = pm;
                            break;
                        }
                    }
                    const parsed = parseFloat(chosen[1].replace(',', '.'));
                    if (!isNaN(parsed) && parsed > 0) {
                        price = parsed;
                        priceMatches.forEach(m => { workingLine = workingLine.replace(m[0], ' '); });
                    }
                }

                // Jeśli w bieżącej linii nie było ceny, sprawdź czy to może być blok wieloliniowy (pionowy)
                if (price === 0) continue;

                // 4. Wyciągnij i oczyść nazwę towaru
                let candidateName = workingLine;
                candidateName = this.cleanProductName(candidateName, ean);

                // Jeśli po oczyszczeniu nazwa jest za krótka (bo nazwa była w linii powyżej w bloku pionowym)
                if (candidateName.length < 4 && i > 0) {
                    for (let k = i - 1; k >= Math.max(0, i - 5); k--) {
                        const prev = cleanLines[k];
                        if (this.extractEanFromTextOrNode(prev) === prev || extractDateFromStr(prev) === prev) continue;
                        if (/^(?:Pocz[aą\?]+tek|D[oó\?]+|ilo[śs\?]+|Zdj[eę\?]?cie)/i.test(prev)) continue;
                        const cPrev = this.cleanProductName(prev, ean);
                        if (cPrev.length >= 4 && !isHeaderOrServiceLine(cPrev)) {
                            candidateName = cPrev;
                            // Jeśli w bieżącej linii nie było EAN ani daty, sprawdź pobliskie linie
                            if (!ean) {
                                for (let j = Math.max(0, i - 3); j < i; j++) {
                                    const foundEan = this.extractEanFromTextOrNode(cleanLines[j]);
                                    if (foundEan) { ean = foundEan; break; }
                                }
                            }
                            if (!expDate) {
                                for (let j = Math.max(0, i - 3); j <= Math.min(cleanLines.length - 1, i + 3); j++) {
                                    const foundDate = extractDateFromStr(cleanLines[j]);
                                    if (foundDate) { expDate = foundDate; break; }
                                }
                            }
                            break;
                        }
                    }
                }

                const finalName = this.cleanProductName(candidateName, ean);

                if (finalName.length >= 3 && !isHeaderOrServiceLine(finalName) && !finalName.match(/^202[5-9]$/)) {
                    const db = typeof Database !== 'undefined' ? Database : (typeof window !== 'undefined' ? window.Database : null);
                    const packInfo = (db && db.inferPackaging) ? db.inferPackaging(finalName) : { packSize: 1, unit: 'szt.' };
                    const autoImg = (db && db.resolveProductImage) ? db.resolveProductImage(finalName) : '';

                    items.push({
                        name: finalName,
                        price: price,
                        packagePrice: parseFloat((price * packInfo.packSize).toFixed(2)),
                        ean: ean,
                        sku: '',
                        vat: '23%',
                        image: autoImg,
                        packSize: packInfo.packSize,
                        unit: packInfo.unit,
                        expirationDate: expDate
                    });
                }
            }
        }

        return items.length > 0 ? items : null;
    }
};

window.Scraper = Scraper;
window.MonolithParser = Scraper;
