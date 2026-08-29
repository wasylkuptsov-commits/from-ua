const { chromium } = require('C:/Users/games/AppData/Local/ms-playwright-go/1.57.0/package');
const path = require('path');
const fs = require('fs');

const LOGIN_URL = 'https://kraftgroup.pl/moje-konto/';
const ROOT_HURTOWNIA_URL = 'https://kraftgroup.pl/kategoria-produktu/hurtownia/';
const USERNAME = 'vatsak.ostrowska@gmail.com';
const PASSWORD = 'AhwGE8qTu6uM!4L';

async function runAutonomousKraftScraper() {
    console.log('================================================================');
    console.log('  KRAFT GROUP: PEŁNY AUTONOMICZNY SILNIK POBIERANIA KATALOGU    ');
    console.log('================================================================');

    const executablePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    const browser = await chromium.launch({ 
        executablePath, 
        headless: true,
        args: ['--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0'
    });

    const cookiesPath = path.resolve('scratch', 'kraft_session_cookies.json');
    if (fs.existsSync(cookiesPath)) {
        try {
            const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
            await context.addCookies(cookies);
            console.log('[*] Załadowano zapisane ciasteczka sesji.');
        } catch(e) {}
    }

    const page = await context.newPage();

    // 1. Sprawdź czy jesteśmy zalogowani
    console.log('[1] Weryfikacja sesji logowania...');
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const hasLoginForm = await page.$('input#username, input[name="username"]');
    if (hasLoginForm) {
        console.log('[!] Brak aktywnej sesji. Logowanie do Kraft Group...');
        await page.fill('input#username, input[name="username"]', USERNAME);
        await page.fill('input#password, input[name="password"]', PASSWORD);
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
            page.click('button[name="login"], input[name="login"], button[type="submit"]')
        ]);
        await page.waitForTimeout(2000);
        const newCookies = await context.cookies();
        fs.writeFileSync(cookiesPath, JSON.stringify(newCookies, null, 2));
        console.log('[✓] Zalogowano pomyślnie. Nowa sesja zapisana.');
    } else {
        console.log('[✓] Sesja aktywna (użytkownik już zalogowany).');
    }

    // 2. Pobierz wszystkie kategorie i podkategorie
    console.log('\n[2] Pobieranie spisu kategorii hurtowych...');
    await page.goto(ROOT_HURTOWNIA_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const visitedUrls = new Set();
    const urlsToScrape = [];

    const rootCategories = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.category-grid-item a, .product-category a, .wd-cat a')).map(a => ({
            name: a.innerText.trim() || a.querySelector('h2, h3, span, .wd-entities-title')?.innerText?.trim() || 'Kategoria',
            url: a.href
        })).filter(c => c.url && c.url.includes('/kategoria-produktu/'));
    });

    rootCategories.forEach(c => {
        if (!visitedUrls.has(c.url)) {
            visitedUrls.add(c.url);
            urlsToScrape.push(c);
        }
    });

    console.log(`Znaleziono ${urlsToScrape.length} głównych działów do przeszukania.`);

    const allProductsMap = new Map();

    // 3. Przejdź przez każdy dział
    for (let i = 0; i < urlsToScrape.length; i++) {
        const cat = urlsToScrape[i];
        console.log(`\n[${i+1}/${urlsToScrape.length}] Skanowanie działu: "${cat.name}" (${cat.url})...`);

        try {
            await page.goto(cat.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(2000);

            // Sprawdź czy dział zawiera podkategorie i dodaj je do kolejki
            const subCategories = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('.category-grid-item a, .product-category a, .wd-cat a')).map(a => ({
                    name: a.innerText.trim() || a.querySelector('h2, h3, span, .wd-entities-title')?.innerText?.trim() || 'Podkategoria',
                    url: a.href
                })).filter(c => c.url && c.url.includes('/kategoria-produktu/'));
            });

            subCategories.forEach(sub => {
                if (!visitedUrls.has(sub.url)) {
                    visitedUrls.add(sub.url);
                    urlsToScrape.push(sub);
                    console.log(`    + Dodano podkategorię: "${sub.name}" (${sub.url})`);
                }
            });

            // Wyciągnij prawdziwą nazwę kategorii z nagłówka strony lub URL
            const realCatName = await page.evaluate((fallbackUrl) => {
                const h1 = document.querySelector('h1.page-title, h1.woocommerce-products-header__title, h1');
                if (h1 && h1.innerText.trim().length > 2 && !h1.innerText.includes('Hurtownia')) {
                    return h1.innerText.trim();
                }
                const breadcrumb = document.querySelector('.woocommerce-breadcrumb');
                if (breadcrumb) {
                    const parts = breadcrumb.innerText.split('/');
                    if (parts.length > 2) return parts[parts.length - 1].trim();
                }
                // Fallback z URL
                const u = fallbackUrl.replace(/\/$/, '');
                const slug = u.substring(u.lastIndexOf('/') + 1);
                if (slug.includes('kawa')) return 'Kawy';
                if (slug.includes('herbata')) return 'Herbaty';
                if (slug.includes('napoje') || slug.includes('kwas')) return 'Napoje';
                if (slug.includes('slodycze')) return 'Słodycze';
                if (slug.includes('przekaski')) return 'Przekąski';
                if (slug.includes('kulinaria')) return 'Kulinaria';
                if (slug.includes('czystosci')) return 'Środki czystości';
                return 'Hurtownia';
            }, cat.url);

            // Ekstrakcja produktów z tabeli na obecnej stronie
            const extractedItems = await page.evaluate((currentCatName) => {
                const results = [];
                const rows = Array.from(document.querySelectorAll('table tbody tr, .woocommerce-table tbody tr, tr.product, .shop_table tbody tr'));

                rows.forEach(tr => {
                    if (tr.querySelector('th') || tr.closest('thead')) return;
                    if (tr.classList.contains('cart-subtotal') || tr.classList.contains('order-total') || tr.classList.contains('shipping')) return;

                    const textContent = tr.innerText.trim();
                    if (textContent.length < 5) return;

                    // 1. Zdjęcie (pełna rozdzielczość)
                    let imgUrl = '';
                    const img = tr.querySelector('img');
                    if (img) {
                        imgUrl = img.getAttribute('data-wood-src') ||
                                 img.getAttribute('data-src') || 
                                 img.getAttribute('data-lazy-src') || 
                                 img.getAttribute('src') || 
                                 img.src || '';

                        if (img.getAttribute('srcset')) {
                            const srcSetParts = img.getAttribute('srcset').split(',');
                            const lastOrBest = srcSetParts[srcSetParts.length - 1].trim().split(' ')[0];
                            if (lastOrBest && lastOrBest.startsWith('http')) imgUrl = lastOrBest;
                        }
                    }

                    // 2. Nazwa towaru
                    let name = '';
                    const nameLink = tr.querySelector('.product-name a, td:nth-child(2) a, a');
                    if (nameLink) {
                        name = nameLink.innerText.trim();
                    }
                    if (!name) {
                        const tds = Array.from(tr.querySelectorAll('td'));
                        for (const td of tds) {
                            const t = td.innerText.trim();
                            if (t.length > 5 && !t.match(/^\d+[\.,]\d{2}/) && !t.match(/^\d{8,14}$/) && !t.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
                                name = t;
                                break;
                            }
                        }
                    }

                    // 3. Kod EAN
                    let ean = '';
                    const eanMatch = textContent.match(/\b(\d{8,14})\b/);
                    if (eanMatch) {
                        const candidate = eanMatch[1];
                        if (!candidate.startsWith('2025') && !candidate.startsWith('2026') && !candidate.startsWith('2027')) {
                            ean = candidate;
                        }
                    }

                    // 4. Data ważności
                    let expDate = '';
                    const dateMatch = textContent.match(/\b(\d{2}[\.\-\/]\d{2}[\.\-\/]\d{4})\b/);
                    if (dateMatch) expDate = dateMatch[1];

                    // 5. Cena netto
                    let price = 0;
                    const priceElem = tr.querySelector('.product-price .amount, .price, .amount');
                    let priceText = priceElem ? priceElem.innerText : textContent;
                    if (ean) priceText = priceText.replace(new RegExp('\\b' + ean + '\\b', 'g'), ' ');
                    if (expDate) priceText = priceText.replace(new RegExp('\\b' + expDate.replace(/\./g, '\\.') + '\\b', 'g'), ' ');

                    const priceMatches = [...priceText.matchAll(/(\d{1,5}[\.,]\d{2})/g)];
                    if (priceMatches.length > 0) {
                        price = parseFloat(priceMatches[priceMatches.length - 1][1].replace(',', '.'));
                    }

                    // 6. Pakowanie
                    let packSize = 1;
                    let unit = 'szt.';
                    const nLow = (name || '').toLowerCase();

                    // Sprawdź czy w nazwie jest np. /22 szt lub /180szt lub 16szt/
                    const titlePackMatch = name.match(/[\/\s](\d+)\s*szt\b/i);
                    if (titlePackMatch) {
                        packSize = parseInt(titlePackMatch[1], 10);
                    } else if (nLow.includes('30.0 l') || nLow.includes('30 l') || nLow.includes('lany') || nLow.includes('keg') || nLow.includes('regał') || nLow.includes('stojak')) {
                        packSize = 1;
                    } else if (nLow.includes('1.5 l') || nLow.includes('2.0 l') || nLow.includes('1.0 l')) {
                        packSize = 6;
                    } else if (nLow.includes('0.5 l') || nLow.includes('0.33 l') || nLow.includes('500 ml') || nLow.includes('330 ml')) {
                        packSize = 12;
                    } else if (nLow.includes('cukierk') || nLow.includes('żelk') || nLow.includes('waga')) {
                        packSize = 5;
                        unit = 'kg';
                    }

                    if (name && price > 0) {
                        results.push({
                            name,
                            ean,
                            price,
                            packSize,
                            unit,
                            expirationDate: expDate,
                            image: imgUrl,
                            category: currentCatName || 'Hurtownia',
                            vat: '23%'
                        });
                    }
                });

                return results;
            }, realCatName);

            console.log(`    -> Pobrano ${extractedItems.length} towarów z tego widoku.`);
            extractedItems.forEach(item => {
                const key = item.ean ? item.ean : item.name;
                allProductsMap.set(key, item);
            });

        } catch(err) {
            console.log(`    [!] Błąd podczas skanowania ${cat.url}: ${err.message}`);
        }
    }

    const finalProductsList = Array.from(allProductsMap.values());
    console.log('\n================================================================');
    console.log(`  ZAKOŃCZONO SKANOWANIE KRAFT GROUP: ${finalProductsList.length} UNIKALNYCH PRODUKTÓW`);
    console.log('================================================================');

    finalProductsList.forEach((p, idx) => {
        console.log(`[${idx+1}] "${p.name}" | Cena: ${p.price} zł | Pakowanie: ${p.packSize} ${p.unit} | EAN: "${p.ean}" | Ważność: "${p.expirationDate}" | Foto: ${p.image ? 'TAK' : 'NIE'}`);
    });

    const outputPath = path.resolve('kraft_scraped_catalog.json');
    fs.writeFileSync(outputPath, JSON.stringify(finalProductsList, null, 2), 'utf8');
    console.log(`\n[✓] Zapisano kompletny katalog w pliku: ${outputPath}`);

    await browser.close();
    return finalProductsList;
}

if (require.main === module) {
    runAutonomousKraftScraper().catch(console.error);
}

module.exports = { runAutonomousKraftScraper };
