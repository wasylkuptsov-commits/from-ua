// scraper.js - Zaawansowana integracja ze skryptem serwera oraz inteligentny parser wklejanych stron i tekstu

window.Scraper = window.MonolithParser = {
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
        const products = Database.getProducts();
        let categorizedCount = 0;

        products.forEach(p => {
            const guessed = this.guessCategory(p.name, '');
            if (guessed && guessed.main !== 'Inne') {
                if (p.category !== guessed.main || p.subCategory !== guessed.sub) {
                    p.category = guessed.main;
                    p.subCategory = guessed.sub;
                    categorizedCount++;
                }
            }
        });

        if (categorizedCount > 0) {
            Database.saveProducts(products);
        }
        return categorizedCount;
    },

    // Oczyszczanie nazwy towaru z zniekształceń, etykiet EAN, śmieciowych znaków i surowych cyfr
    cleanProductName(name, ean = '') {
        if (!name) return '';
        let cleaned = String(name);
        if (ean) {
            cleaned = cleaned.replace(ean, '');
        }
        return cleaned
            .replace(/(?:EAN|GTIN|SKU|Kod|Symbol|Index|Indeks|Art\.\s*nr|Nr\s*art|Ref)[\s:\-#]*[0-9A-Za-z]{5,16}/gi, '')
            .replace(/\[\d+\]|\(\d+\)/g, '')
            .replace(/\b\d{7,14}\b/g, '')
            .replace(/[\/\-\|\:\;\,\t]/g, ' ')
            .replace(/\b(zł|pln|eur|netto|brutto|szt|kg|opak|op|koszyk|dodaj|cena|dostawa|kup teraz|w magazynie)\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
    },

    // Wyciąganie kodów kreskowych EAN/GTIN/SKU (8-14 cyfr oraz uniwersalnych symboli) z HTML i tekstu
    extractEanFromTextOrNode(text, node = null) {
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
                    const cleaned = Database.cleanEan(val);
                    if (cleaned.length >= 7) return cleaned;
                }
            }

            const codeElem = node.querySelector('.product-code-ui, .product-code, .ean, .barcode, .gtin, .sku, .symbol, .index, .art-nr, [itemprop="gtin13"], [itemprop="gtin8"], [itemprop="gtin14"], [itemprop="sku"], [itemprop="productID"]');
            if (codeElem) {
                const codeText = codeElem.textContent.trim();
                const cleaned = Database.cleanEan(codeText);
                if (cleaned.length >= 7) return cleaned;
            }
        }

        if (!text) return '';

        // STRATEGIA B: Wyraźne etykiety słowne w tekście ("EAN:", "Kod:", "Symbol:", "GTIN:", "SKU:", "Art. nr:", "Index:")
        const labeledMatch = text.match(/(?:EAN|GTIN|Kod\s+kreskowy|Kod\s+towaru|Kod\s+produktu|Kod|Symbol|Index|Indeks|SKU|Art\.\s*nr|Nr\s*art|Ref)[\s:\-#]*([0-9A-Za-z]{6,16})/i);
        if (labeledMatch) {
            const val = labeledMatch[1];
            const cleaned = Database.cleanEan(val);
            if (cleaned.length >= 7) return cleaned;
            if (val.length >= 5 && !val.match(/^(netto|brutto|szt|zł|pln|opak)$/i)) {
                return val.toUpperCase();
            }
        }

        // STRATEGIA C: Autonomiczne ciągi cyfr EAN-13, EAN-8, GTIN-14 (8-14 cyfr) w tekście
        const eanMatches = text.match(/\b\d{8,14}\b/g);
        if (eanMatches) {
            for (const match of eanMatches) {
                const cleaned = Database.cleanEan(match);
                if (cleaned.length >= 8 && cleaned.length <= 14 && !cleaned.startsWith('2026') && !cleaned.startsWith('2025')) {
                    return cleaned;
                }
            }
        }

        return '';
    },

    parseAndImportText(rawInput, supplierName, htmlContent) {
        return this.parsePastedText(htmlContent || rawInput, supplierName);
    },

    // INTELIGENTNY PARSER WKLEJANEGO TEKSTU I HTML (100% Niezawodny)
    // Parcontent: HTML, tekst z podziałem na wiersze, tabele z przeglądarki
    parsePastedText(rawInput, supplierName) {
        if (!rawInput || rawInput.trim() === "") {
            return 0;
        }

        let importedCount = 0;
        const dateStr = new Date().toISOString();
        const addedEans = new Set();

        // STRATEGIA 1: PARSER STRUKTURY HTML (gdy wklejono fragment strony HTML)
        if (rawInput.includes('<') && rawInput.includes('>')) {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(rawInput, 'text/html');
                
                // Szukamy elementów z produktami (Comarch e-Sklep, Shopware, WooCommerce, ogólne tabele tr)
                const selectors = [
                    '.product-item-ui', '.teneso-product-item', '.cart-product-container-js', '.product-box-ui', '.list-view-ui', '.product-box-js', // Comarch e-Sklep (Monolith)
                    '.product-box', '.product--box', '.product-info', '.product-item', '.product-card',
                    'article', '.product', 'li.product', '[data-product-number]', '.product-wrapper'
                ];

                let foundNodes = [];
                for (const sel of selectors) {
                    const nodes = doc.querySelectorAll(sel);
                    if (nodes.length > 0) {
                        foundNodes = Array.from(nodes);
                        console.log(`[Parser HTML] Wybrano selektor: ${sel}, znaleziono elementów: ${nodes.length}`);
                        break; // Znaleziono pasujące - przerywamy, bo selektory na górze są najbardziej dokładne!
                    }
                }

                if (foundNodes.length > 0) {
                    foundNodes.forEach(node => {
                        const textContent = (node.innerText || node.textContent || '').trim();
                        
                        // Wyciąganie nazwy
                        let name = '';
                        const titleElem = node.querySelector('.product-name-ui a, .product-name-ui, .product-name-js, .product-title, .product-name, .product--title, h1, h2, h3, h4, a.title, .name, [title]');
                        if (titleElem) {
                            name = (titleElem.getAttribute('title') || titleElem.textContent || '').trim();
                        }
                        if (!name && textContent.length < 300) {
                            const firstLine = textContent.split('\n').map(l => l.trim()).find(l => l.length > 4 && !l.match(/^\d+[\.,]\d{2}/));
                            if (firstLine) name = firstLine;
                        }

                        // 1. Wyciąganie pakowania i jednostki miary (szt. vs kg)
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
                            const packMatch = node.innerHTML.match(/(?:W kartonie|Szt\. w kartonie|W opakowaniu|Ilość w opakowaniu).*?<em[^>]*>\s*(\d+)/i) 
                                           || textContent.match(/(?:W kartonie|Szt\. w kartonie|W opakowaniu|Ilość w opakowaniu)[\s:]*(\d+)/i);
                            if (packMatch) packSize = parseInt(packMatch[1], 10) || 1;
                            
                            if (packSize === 1) {
                                const cartPackMatch = textContent.match(/1\s*(?:opak|zgrz|karton|opak\.)\s*=\s*(\d+)\s*(?:szt|butelek|puszek)/i);
                                if (cartPackMatch) packSize = parseInt(cartPackMatch[1], 10) || 1;
                            }
                        }

                        // 2. Wyciąganie GŁÓWNEJ CENY ZA 1 SZTUKĘ (Cena za sztukę)
                        let unitPrice = 0;
                        let rawPrice = 0;
                        const nodeTitle = node.getAttribute('title') || '';
                        const unitElem = node.querySelector('.unit-ratio-info-ui, .price-unit, [data-unit-price], [class*="unit"]');
                        const searchScopeText = (unitElem ? unitElem.textContent : '') + ' ' + nodeTitle + ' ' + textContent;

                        // A. Priorytet: Bezpośredni odczyt podanej na stronie 'Ceny za szt.' lub kwoty za kg (np. "28,50/kg", "8,91/szt.")
                        const explicitUnitMatch = searchScopeText.match(/(?:Cena\s+za\s+(?:szt|kg)\.|cena\s*\/\s*(?:szt|kg)|Cena\s+(?:szt|kg)\.|Cena\s+jednostkowa|Cena\s+netto\s+za\s+(?:sztukę|kilogram)|Cena\s+netto\s*\/\s*(?:szt|kg)|(?:szt|kg)\.:?)[\s:]*([\d,\.]+)|([\d,\.]+)\s*\/\s*(?:szt|kg)/i);

                        if (explicitUnitMatch) {
                            unitPrice = parseFloat(explicitUnitMatch[1].replace(/\s/g, '').replace(',', '.'));
                        } else {
                            // B. Odczyt ceny z dedykowanego elementu ceny na karcie towaru
                            const inputElem = node.querySelector('input[name="quantity"]');
                            if (node.classList.contains('cart-product-container-js') && inputElem) {
                                name = inputElem.getAttribute('data-name') || name;
                                const pStr = inputElem.getAttribute('data-price');
                                if (pStr) rawPrice = parseFloat(pStr.replace(/\s/g, '').replace(',', '.'));
                            } else {
                                const priceElem = node.querySelector('.price-ui, .product-price, .price, .amount, .product--price, [class*="price"]');
                                const priceText = (priceElem ? priceElem.textContent : textContent) || '';
                                const priceMatches = [...priceText.matchAll(/(\d+[\s\.]*[\d]*[\.,]\d{2})/g)];
                                if (priceMatches.length > 0) {
                                    rawPrice = parseFloat(priceMatches[0][0].replace(/\s/g, '').replace(',', '.'));
                                }
                            }
                            
                            // Na portalach B2B typu Monolith podana cena w 99% przypadków jest już ceną netto za 1 sztukę
                            unitPrice = rawPrice;
                        }

                        // Wyciąganie zdjęcia
                        let imgUrl = '';
                        const imgElem = node.querySelector('.main-image-ui, img');
                        if (imgElem) {
                            imgUrl = imgElem.getAttribute('data-src') || imgElem.getAttribute('src') || '';
                            if (imgUrl && !imgUrl.startsWith('http') && !imgUrl.startsWith('//')) {
                                imgUrl = 'https://shop.monolith-polska.com/' + (imgUrl.startsWith('/') ? imgUrl.substring(1) : imgUrl);
                            } else if (imgUrl.startsWith('//')) {
                                imgUrl = 'https:' + imgUrl;
                            }
                        }

                        // Zaawansowane Wyciąganie EAN po kodzie kreskowym
                        let ean = this.extractEanFromTextOrNode(textContent, node);

                        let vat = 'nd.';
                        const vatNode = node.querySelector('.vat-ui');
                        if (vatNode) {
                            const vMatch = vatNode.textContent.match(/([\d,\.]+)/);
                            if (vMatch) vat = vMatch[1] + '%';
                        }
                        if (vat === 'nd.') {
                            const vatMatch = textContent.match(/VAT[\s:]*([\d,\.]+)/i) || nodeTitle.match(/VAT:\s*([\d,\.]+)/i);
                            if (vatMatch) vat = vatMatch[1] + '%';
                        }

                        name = this.cleanProductName(name, ean);
                        if (name && unitPrice > 0) {
                            let cleanEan = ean || ("PASTE-" + Math.abs(name.hashCode()).toString().padEnd(10, '0').substr(0, 10));
                            if (!addedEans.has(cleanEan)) {
                                addedEans.add(cleanEan);
                                const guessedCat = Scraper.guessCategory(name, supplierName);
                                Database.addPriceOffer(cleanEan, ean, name, supplierName, unitPrice, dateStr, {
                                    image: imgUrl,
                                    category: guessedCat.main,
                                    subCategory: guessedCat.sub,
                                    packSize: packSize,
                                    packagePrice: parseFloat((unitPrice * packSize).toFixed(2)),
                                    vat: vat
                                });
                                importedCount++;
                            }
                        }
                    });
                }
            } catch (e) {
                console.warn("Błąd parsowania HTML:", e);
            }
        }

        // STRATEGIA 2: WIELOWIERSZOWY / TABELARYCZNY PARSER TEKSTOWY (gdy wklejono tabelę / zaznaczony tekst Ctrl+A)
        if (importedCount === 0) {
            const lines = rawInput.split('\n').map(l => l.trim()).filter(l => l.length > 0);

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                // Modyfikacja regexu: unikamy dopasowywania dat np. 27.11.2026 jako ceny
                const priceMatches = [...line.matchAll(/(\d+[\s\.]*[\d]*[\.,]\d{2})(?!\s*[\.\-]\s*\d+)(?:\s*(?:zł|PLN|EUR|€))?/gi)];
                
                // Dla pewności, jeśli to tylko kwota bez 'zł', upewnijmy się, że nie jest to część daty.
                let validPriceMatch = priceMatches.find(pm => {
                    const str = pm[0].toLowerCase();
                    return str.includes('zł') || str.includes('pln') || str.includes('eur') || str.includes('€') || !line.match(/(?:data\s*ważności|termin\s*ważności|exp|bbd|best\s*before)?[\s:]*([\d]{2}[\.\-][\d]{2}[\.\-][\d]{4})/i);
                });

                if (validPriceMatch) {
                    const rawP = validPriceMatch[1].replace(/\s/g, '').replace(',', '.');
                    const price = parseFloat(rawP);

                    if (!isNaN(price) && price > 0) {
                        let name = line;
                        
                        // Wyciąganie kodu EAN z wiersza oraz sąsiednich komórek tabeli
                        let ean = this.extractEanFromTextOrNode(line);
                        if (!ean) {
                            for (let k = Math.max(0, i - 3); k <= Math.min(lines.length - 1, i + 3); k++) {
                                const foundEan = this.extractEanFromTextOrNode(lines[k]);
                                if (foundEan) {
                                    ean = foundEan;
                                    break;
                                }
                            }
                        }
                        
                        // Oczyszczamy nazwę z ceny i kodu EAN
                        priceMatches.forEach(pm => { name = name.replace(pm[0], ''); });
                        if (ean) name = name.replace(ean, '');

                        name = name.replace(/[\/\-\|\:\;\,\t]/g, ' ')
                                   .replace(/\b(zł|pln|eur|netto|brutto|szt|kg|opak|op|koszyk|dodaj|cena|dostawa|kup teraz|w magazynie)\b/gi, '')
                                   .replace(/\s+/g, ' ')
                                   .trim();

                        // Jeśli wiersz z ceną nie miał nazwy (bo nazwa była w wierszu wyżej w tabeli), szukamy wyżej
                        if (name.length < 4 && i > 0) {
                            for (let k = i - 1; k >= Math.max(0, i - 6); k--) {
                                const prevLine = lines[k].replace(/[\/\-\|\:\;\,\t]/g, ' ').trim();
                                const plLow = prevLine.toLowerCase();
                                const isKeyword = ['symbol', 'dostępność', 'cena', 'kod', 'ean', 'waga', 'producent', 'kategoria', 'stan'].some(kw => plLow.includes(kw));
                                
                                if (!ean) ean = this.extractEanFromTextOrNode(prevLine);

                                const isEanOnly = prevLine.match(/^\d+$/);
                                if (prevLine.length >= 4 && !prevLine.match(/^\d+[\.,]\d{2}/) && !isKeyword && !isEanOnly) {
                                    name = prevLine;
                                    break;
                                }
                            }
                        }

                        name = this.cleanProductName(name, ean);
                        
                        // Wyklucz śmieciowe nazwy (np. same roczniki)
                        console.log(" Found item candidate:\, name, price, ean); if (name.length >= 3 && !name.match(/^202[5-9]$/)) {
                            let cleanEan = ean || ("PASTE-" + Math.abs(name.hashCode()).toString().padEnd(10, '0').substr(0, 10));
                            if (!addedEans.has(cleanEan)) {
                                addedEans.add(cleanEan);
                                const guessedCat = Scraper.guessCategory(name, supplierName);
                                Database.addPriceOffer(cleanEan, ean, name, supplierName, price, dateStr, {
                                    image: '',
                                    category: guessedCat.main,
                                    subCategory: guessedCat.sub
                                });
                                importedCount++;
                            }
                        }
                    }
                }
            }
        }

        if (importedCount > 0) {
            // Automatyczne czyszczenie nieczytelnych nazw i scalanie z istniejącymi towarami
            Database.autoCleanAndMergeAllProducts();

            Database.addHistoryLog(
                'Wklejanie', 
                supplierName, 
                importedCount, 
                'success', 
                `Wyodrębniono pomyślnie ${importedCount} towarów`
            );
        }

        return importedCount;
    },

    // Zwraca ustrukturyzowaną listę obiektów dla okna weryfikacji mapowania
    extractProductsStructured(rawInput, supplierName, htmlContent) {
        const input = htmlContent || rawInput || '';
        if (!input || input.trim() === "") return null;

        const items = [];

        // 1. Z DOMParser (Monolith / Comarch B2B / WooCommerce HTML)
        if (input.includes('<') && input.includes('>')) {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(input, 'text/html');
                
                const selectors = [
                    '.product-item-ui', '.teneso-product-item', '.cart-product-container-js', '.product-box-ui', '.list-view-ui', '.product-box-js',
                    '.product-box', '.product--box', '.product-info', '.product-item', '.product-card',
                    'article', '.product', 'li.product', '[data-product-number]', '.product-wrapper'
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
                        const textContent = (node.innerText || node.textContent || '').trim();
                        if (textContent.length < 5) return;

                        let name = '';
                        const titleElem = node.querySelector('.product-name-ui a, .product-name-ui, .product-name-js, .product-title, .product-name, .product--title, h1, h2, h3, h4, a.title, .name, [title]');
                        if (titleElem) {
                            const linkInTitle = titleElem.querySelector('a');
                            name = (linkInTitle ? linkInTitle.getAttribute('title') || linkInTitle.textContent : null) || titleElem.getAttribute('title') || titleElem.textContent || '';
                            name = name.trim();
                        }
                        if (!name && textContent.length < 300) {
                            const firstLine = textContent.split('\n').map(l => l.trim()).find(l => l.length > 4 && !l.match(/^\d+[\.,]\d{2}/));
                            if (firstLine) name = firstLine;
                        }

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
                            const packMatch = node.innerHTML.match(/(?:W kartonie|Szt\. w kartonie|W opakowaniu|Ilość w opakowaniu).*?<em[^>]*>\s*(\d+)/i) 
                                           || textContent.match(/(?:W kartonie|Szt\. w kartonie|W opakowaniu|Ilość w opakowaniu)[\s:]*(\d+)/i);
                            if (packMatch) packSize = parseInt(packMatch[1], 10) || 1;

                            if (packSize === 1) {
                                const cartPackMatch = textContent.match(/1\s*(?:opak|zgrz|karton|opak\.)\s*=\s*(\d+)\s*(?:szt|butelek|puszek)/i);
                                if (cartPackMatch) packSize = parseInt(cartPackMatch[1], 10) || 1;
                            }
                        }

                        // Wyciąganie CENY ZA SZTUKĘ (unitPrice)
                        let unitPrice = 0;
                        let rawPrice = 0;
                        const nodeTitle = node.getAttribute('title') || '';

                        const unitElem = node.querySelector('.unit-ratio-info-ui, .price-unit, [data-unit-price], [class*="unit"]');
                        const searchScopeText = (unitElem ? unitElem.textContent : '') + ' ' + nodeTitle + ' ' + textContent;

                        // A. Priorytet: Bezpośredni odczyt kwoty za sztukę lub za kg (np. "28,50/kg", "8,91/szt.", "Cena za szt.: 8,91 zł")
                        const explicitUnitMatch = searchScopeText.match(/(?:Cena\s+za\s+(?:szt|kg)\.|cena\s*\/\s*(?:szt|kg)|Cena\s+(?:szt|kg)\.|Cena\s+jednostkowa|Cena\s+netto\s+za\s+(?:sztukę|kilogram)|Cena\s+netto\s*\/\s*(?:szt|kg)|(?:szt|kg)\.:?)[\s:]*([\d,\.]+)|([\d,\.]+)\s*\/\s*(?:szt|kg)/i);

                        if (explicitUnitMatch) {
                            const matchedVal = explicitUnitMatch[1] || explicitUnitMatch[2];
                            if (matchedVal) unitPrice = parseFloat(matchedVal.replace(/\s/g, '').replace(',', '.'));
                        }

                        if (!unitPrice || unitPrice <= 0) {
                            const inputElem = node.querySelector('input[name="quantity"]');
                            if (node.classList.contains('cart-product-container-js') && inputElem) {
                                name = inputElem.getAttribute('data-name') || name;
                                const pStr = inputElem.getAttribute('data-price');
                                if (pStr) rawPrice = parseFloat(pStr.replace(/\s/g, '').replace(',', '.'));
                            } else {
                                const priceElem = node.querySelector('.price-ui, .product-price, .price, .amount, .product--price, [class*="price"]');
                                const priceText = (priceElem ? priceElem.textContent : textContent) || '';
                                const priceMatches = [...priceText.matchAll(/(\d+[\s\.]*[\d]*[\.,]\d{2})/g)];
                                if (priceMatches.length > 0) {
                                    rawPrice = parseFloat(priceMatches[0][0].replace(/\s/g, '').replace(',', '.'));
                                }
                            }

                            // Na portalach B2B typu Monolith podawana cena jednostkowa jest ceną netto za 1 sztukę
                            unitPrice = rawPrice;
                        }

                        let imgUrl = '';
                        const imgElem = node.querySelector('.main-image-ui, img');
                        if (imgElem) {
                            const rawSrc = imgElem.getAttribute('data-src') || imgElem.getAttribute('src') || imgElem.getAttribute('data-lazy-src') || imgElem.src;
                            if (rawSrc && typeof window.resolveImageUrl === 'function') {
                                imgUrl = window.resolveImageUrl(rawSrc, supplierName);
                            }
                        }

                        let ean = this.extractEanFromTextOrNode(textContent, node);

                        let vat = '23%';
                        const vatMatch = textContent.match(/VAT[\s:]*([\d,\.]+)/i) || nodeTitle.match(/VAT:\s*([\d,\.]+)/i);
                        if (vatMatch) vat = vatMatch[1] + '%';

                        let expDate = '';
                        const expMatch = textContent.match(/(?:data\s*ważności|termin\s*ważności|exp|bbd|best\s*before)[\s:]*([\d\.\-]+)/i);
                        if (expMatch) expDate = expMatch[1];

                        if (name && (unitPrice > 0 || ean.length >= 8)) {
                            items.push({
                                name: name,
                                price: unitPrice, // ZAWSZE CENA BEZPOŚREDNIA ZA 1 SZTUKĘ LUB 1 KG
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

        // STRATEGIA 2: PIONOWA LISTA TEKSTOWA (Skopiowana ze strony bez tabel np. Kraft Group)
        if (items.length === 0) {
            const lines = input.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // Modyfikacja regexu: unikamy dopasowywania dat np. 27.11.2026 jako ceny
                const priceMatches = [...line.matchAll(/(\d+[\s\.]*[\d]*[\.,]\d{2})(?!\s*[\.\-]\s*\d+)(?:\s*(?:zł|PLN|EUR|€))?/gi)];
                
                // Dla pewności, jeśli to tylko kwota bez 'zł', upewnijmy się, że nie jest to część daty.
                let validPriceMatch = priceMatches.find(pm => {
                    const str = pm[0].toLowerCase();
                    return str.includes('zł') || str.includes('pln') || str.includes('eur') || str.includes('€') || !line.match(/(?:data\s*ważności|termin\s*ważności|exp|bbd|best\s*before)?[\s:]*([\d]{2}[\.\-][\d]{2}[\.\-][\d]{4})/i);
                });

                if (validPriceMatch) {
                    const rawP = validPriceMatch[1].replace(/\s/g, '').replace(',', '.');
                    const price = parseFloat(rawP);
                    if (!isNaN(price) && price > 0) {
                        let name = line;
                        let ean = this.extractEanFromTextOrNode(line);
                        if (!ean) {
                            for (let k = Math.max(0, i - 3); k <= Math.min(lines.length - 1, i + 3); k++) {
                                const foundEan = this.extractEanFromTextOrNode(lines[k]);
                                if (foundEan) { ean = foundEan; break; }
                            }
                        }
                        
                        let expDate = '';
                        for (let k = Math.max(0, i - 3); k <= Math.min(lines.length - 1, i + 3); k++) {
                            const expMatch = lines[k].match(/(?:data\s*ważności|termin\s*ważności|exp|bbd|best\s*before)?[\s:]*([\d]{2}[\.\-][\d]{2}[\.\-][\d]{4})/i);
                            if (expMatch) { expDate = expMatch[1]; break; }
                        }

                        priceMatches.forEach(pm => { name = name.replace(pm[0], ''); });
                        if (ean) name = name.replace(ean, '');
                        if (expDate) name = name.replace(expDate, '');

                        name = name.replace(/[\/\-\|\:\;\,\t]/g, ' ')
                                   .replace(/\b(zł|pln|eur|netto|brutto|szt|kg|opak|op|koszyk|dodaj|cena|dostawa|kup teraz|w magazynie)\b/gi, '')
                                   .replace(/\s+/g, ' ').trim();

                        if (name.length < 4 && i > 0) {
                            for (let k = i - 1; k >= Math.max(0, i - 6); k--) {
                                const prevLine = lines[k].replace(/[\/\-\|\:\;\,\t]/g, ' ').trim();
                                const plLow = prevLine.toLowerCase();
                                const isKeyword = ['symbol', 'dostępność', 'cena', 'kod', 'ean', 'waga', 'producent', 'kategoria', 'stan'].some(kw => plLow.includes(kw));
                                const isEanOnly = prevLine.match(/^\d+$/); // pomiń linie będące samym EANem lub cyframi
                                if (prevLine.length >= 4 && !prevLine.match(/^\d+[\.,]\d{2}/) && !isKeyword && !isEanOnly) {
                                    name = prevLine; break;
                                }
                            }
                        }
                        
                        name = this.cleanProductName(name, ean);
                        
                        // Wyklucz śmieciowe nazwy (np. same roczniki)
                        console.log(" Found item candidate:\, name, price, ean); if (name.length >= 3 && !name.match(/^202[5-9]$/)) {
                            items.push({
                                name: name,
                                price: price,
                                packagePrice: price,
                                ean: ean,
                                sku: '',
                                vat: '23%',
                                image: '',
                                packSize: 1,
                                unit: 'szt.',
                                expirationDate: expDate
                            });
                        }
                    }
                }
            }
        }

        return items.length > 0 ? items : null;
    }
};

window.Scraper = Scraper;
window.MonolithParser = Scraper;
