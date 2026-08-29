// bookmarklet.js - Skrypt zakładek "1-Kliknij i Gotowe" do pobierania towarów ze stron hurtowni (Monolith, Kraft Group, Vicreate, Comarch B2B, etc.)
(function() {
    console.log("=== AKTYWACJA 1-KLIKOWEGO EKSTRAKTORA TOWARÓW DO PORÓWNYWARKI CEN ===");
    
    function resolveUrl(url) {
        if (!url) return '';
        try {
            return new URL(url, window.location.href).href;
        } catch(e) { return url; }
    }

    const items = [];
    const doc = document;

    // Szukamy kontenerów produktów na dowolnej stronie B2B
    const selectors = [
        '.product-item-ui', '.teneso-product-item', '.cart-product-container-js', '.product-box-ui', '.list-view-ui', '.product-box-js',
        '.product-box', '.product--box', '.product-info', '.product-item', '.product-card',
        'tr', 'article', '.product', 'li.product', '[data-product-number]', '.product-wrapper'
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
            const text = (node.innerText || node.textContent || '').trim();
            if (text.length < 5) return;

            // Nazwa towaru
            let name = '';
            const titleElem = node.querySelector('.product-name-ui a, .product-name-ui, .product-name-js, .product-title, .product-name, .product--title, h1, h2, h3, h4, a.title, .name, [title]');
            if (titleElem) {
                name = (titleElem.getAttribute('title') || titleElem.textContent || '').trim();
            }
            if (!name && text.length < 300) {
                const firstLine = text.split('\n').map(l => l.trim()).find(l => l.length > 4 && !l.match(/^\d+[\.,]\d{2}/));
                if (firstLine) name = firstLine;
            }

            // Pakowanie (np. 12 szt., 7 kg, 7kg, 24 szt / karton)
            let packSize = 1;
            let unitLabel = 'szt.';
            const packMatch = text.match(/(?:W kartonie|Szt\. w kartonie|W opakowaniu|Ilość w opakowaniu|Zgrzewka|Karton)[\s:]*(\d+)\s*(kg|szt)?/i)
                           || text.match(/(\d+)\s*(kg|kilogram|szt|zgrz|op|opak)\b/i);
            if (packMatch) {
                packSize = parseInt(packMatch[1], 10) || 1;
                if (packMatch[2] && packMatch[2].toLowerCase().includes('kg')) unitLabel = 'kg';
            }

            // Cena netto - PRIORYTET DLA CENY ZA SZTUKĘ (unitPrice)
            let price = 0;
            let unitPrice = 0;
            const unitPriceElem = node.querySelector('.unit-ratio-info-ui, .price-unit, [data-unit-price]');
            const explicitUnitMatch = (unitPriceElem ? unitPriceElem.textContent : text).match(/(?:Cena\s+za\s+szt\.|Cena\s+szt\.|Cena\s+jednostkowa|Cena\s+netto\s+za\s+sztukę)[\s:]*([\d,\.]+)/i)
                                   || node.getAttribute('title')?.match(/Cena za szt\.\s*:\s*([\d,\.]+)/i);

            if (explicitUnitMatch) {
                unitPrice = parseFloat(explicitUnitMatch[1].replace(/\s/g, '').replace(',', '.'));
            } else {
                const priceElem = node.querySelector('.price-ui, .product-price, .price, .amount, .product--price, [class*="price"]');
                const priceText = (priceElem ? priceElem.textContent : text) || '';
                const priceMatch = priceText.match(/(\d+[\s\.]*[\d]*[\.,]\d{2})/);
                if (priceMatch) {
                    price = parseFloat(priceMatch[1].replace(/\s/g, '').replace(',', '.'));
                }
                if (packSize > 1 && price > 0) {
                    unitPrice = parseFloat((price / packSize).toFixed(2));
                } else {
                    unitPrice = price;
                }
            }

            // Zdjęcie URL
            let imgUrl = '';
            const imgElem = node.querySelector('.main-image-ui, img');
            if (imgElem) {
                const rawSrc = imgElem.getAttribute('data-src') || imgElem.getAttribute('src') || imgElem.getAttribute('data-lazy-src') || imgElem.src;
                if (rawSrc) imgUrl = resolveUrl(rawSrc);
            }

            // Kod EAN
            let ean = '';
            const eanMatch = text.match(/\b(59\d{11}|48\d{11}|40\d{11}|80\d{11}|\d{13}|\d{12}|\d{8})\b/);
            if (eanMatch) ean = eanMatch[1];

            // Data ważności
            let expDate = '';
            const expMatch = text.match(/(?:data\s*ważności|termin\s*ważności|exp|bbd|best\s*before)[\s:]*([\d\.\-]+)/i);
            if (expMatch) expDate = expMatch[1];

            if (name && unitPrice > 0) {
                items.push({
                    name: name.replace(/<[^>]*>/g, '').trim(),
                    price: unitPrice, // ZAWSZE CENA ZA 1 SZTUKĘ!
                    ean: ean,
                    image: imgUrl,
                    packSize: packSize,
                    unit: unitLabel,
                    expirationDate: expDate,
                    supplierUrl: window.location.hostname
                });
            }
        });
    }

    if (items.length === 0) {
        alert("Nie znaleziono produktów na tej stronie. Upewnij się, że jesteś na stronie z katalogiem towarów hurtowni.");
        return;
    }

    // Zapis do localStorage i przekazanie do Porównywarki Cen
    const payload = {
        supplierName: document.title || window.location.hostname,
        sourceUrl: window.location.href,
        timestamp: new Date().toISOString(),
        items: items
    };

    localStorage.setItem('porownywarka_bookmarklet_payload', JSON.stringify(payload));
    alert(`⚡ Pomyślnie pobrano ${items.length} towarów z tej strony!\n\nPrzejdź do karty Porównywarki Cen Zakupowych - towary pojawią się automatycznie!`);
})();
