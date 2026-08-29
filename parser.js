window.ExcelParser = {
    readPlainTextCsv(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target.result || '';
                    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
                    const rawRows = lines.map(line => {
                        return line.split(/[,;\t]/).map(cell => cell.trim().replace(/^["']|["']$/g, ''));
                    });
                    
                    let headerRowIndex = 0;
                    const headers = (rawRows[headerRowIndex] || []).map((h, i) => {
                        return { index: i, name: h ? h.toString().trim() : `Kolumna ${i + 1}` };
                    });
                    const dataRows = rawRows.slice(headerRowIndex + 1);

                    resolve({
                        fileName: file.name,
                        sheetCount: 1,
                        headers: headers,
                        rows: dataRows
                    });
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (err) => reject(err);
            reader.readAsText(file);
        });
    },

    // Odczyt dowolnego pliku (Wielokrotne arkusze Excel, PDF, Word, CSV, TXT)
    readFile(file) {
        const fileName = file.name.toLowerCase();
        
        if (fileName.endsWith('.pdf')) {
            return this.readPdfFile(file);
        } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
            return this.readWordFile(file);
        } else if ((fileName.endsWith('.csv') || fileName.endsWith('.txt')) && typeof XLSX === 'undefined') {
            return this.readPlainTextCsv(file);
        } else {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    try {
                        if (typeof XLSX === 'undefined') {
                            // Offline CSV fallback if XLSX CDN didn't load
                            return window.ExcelParser.readPlainTextCsv(file).then(resolve).catch(reject);
                        }
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                    
                    let combinedRawRows = [];
                    const sheetCount = workbook.SheetNames.length;
                    
                    // Odczytujemy dane ze WSZYSTKICH ARKUSZY w pliku Excel
                    workbook.SheetNames.forEach(sheetName => {
                        const worksheet = workbook.Sheets[sheetName];
                        const sheetRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                        if (sheetRows && sheetRows.length > 0) {
                            combinedRawRows = combinedRawRows.concat(sheetRows);
                        }
                    });
                    
                    if (combinedRawRows.length === 0) {
                        reject(new Error("Plik jest pusty lub nie zawiera wierszy."));
                        return;
                    }
                    
                    // Szukamy wiersza nagłówkowego - analizujemy pierwsze 20 wierszy połączonych danych
                    let headerRowIndex = 0;
                    let bestScore = -1;
                    
                    const headerKeywords = ['ean', 'kod', 'nazwa', 'towar', 'produkt', 'cena', 'netto', 'brutto', 'vat', 'ilość', 'szt'];
                    
                    for (let i = 0; i < Math.min(combinedRawRows.length, 25); i++) {
                        const row = combinedRawRows[i];
                        if (!row) continue;
                        
                        let score = 0;
                        row.forEach(cell => {
                            if (cell && typeof cell === 'string') {
                                const lowerCell = cell.toString().toLowerCase().trim();
                                if (headerKeywords.some(kw => lowerCell.includes(kw))) {
                                    score++;
                                }
                            }
                        });
                        
                        if (score > bestScore && score > 0) {
                            bestScore = score;
                            headerRowIndex = i;
                        }
                    }
                    
                    if (bestScore === -1) {
                        let maxCols = 0;
                        for (let i = 0; i < Math.min(combinedRawRows.length, 25); i++) {
                            if (!combinedRawRows[i]) continue;
                            const nonEmptyCols = combinedRawRows[i].filter(c => c && c.toString().trim() !== "").length;
                            if (nonEmptyCols > maxCols) {
                                maxCols = nonEmptyCols;
                                headerRowIndex = i;
                            }
                        }
                    }
                    
                    const headers = combinedRawRows[headerRowIndex].map((h, index) => {
                        return {
                            index: index,
                            name: h ? h.toString().trim() : `Kolumna ${index + 1}`
                        };
                    });
                    
                    const dataRows = combinedRawRows.slice(headerRowIndex + 1).filter(row => {
                        return row && row.some(cell => cell !== undefined && cell !== null && cell.toString().trim() !== "");
                    });
                    
                    resolve({
                        fileName: file.name,
                        sheetCount: sheetCount,
                        headers: headers,
                        rows: dataRows,
                        rawRows: combinedRawRows
                    });
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = function() {
                reject(new Error("Błąd podczas odczytu pliku."));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }
},

    // Parser plików PDF przy użyciu pdf.js
    async readPdfFile(file) {
        if (typeof pdfjsLib === 'undefined') {
            throw new Error("Biblioteka pdf.js nie jest jeszcze załadowana w przeglądarce.");
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const rawRows = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            let currentLineY = null;
            let currentLineItems = [];

            textContent.items.forEach(item => {
                const y = Math.round(item.transform[5]);
                if (currentLineY === null || Math.abs(y - currentLineY) > 3) {
                    if (currentLineItems.length > 0) {
                        rawRows.push(currentLineItems);
                    }
                    currentLineY = y;
                    currentLineItems = [item.str.trim()];
                } else {
                    if (item.str.trim()) {
                        currentLineItems.push(item.str.trim());
                    }
                }
            });
            if (currentLineItems.length > 0) rawRows.push(currentLineItems);
        }

        return this.processExtractedRows(file.name, rawRows);
    },

    // Parser plików Word (.docx) przy użyciu Mammoth.js
    async readWordFile(file) {
        if (typeof mammoth === 'undefined') {
            throw new Error("Biblioteka Mammoth.js do odczytu Worda nie jest jeszcze załadowana.");
        }

        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
        const text = result.value || '';
        
        const lines = text.split('\n').filter(l => l.trim() !== '');
        const rawRows = lines.map(line => {
            return line.split(/\t|  +/).map(part => part.trim()).filter(p => p !== '');
        });

        return this.processExtractedRows(file.name, rawRows);
    },

    // Pomocnicza metoda przetwarzająca surowe wiersze wyciągnięte z PDF/Word
    processExtractedRows(fileName, rawRows) {
        if (rawRows.length === 0) {
            throw new Error("Nie udało się odczytać żadnej zawartości tekstowej z dokumentu.");
        }

        let headerRowIndex = 0;
        let maxCols = 0;

        rawRows.forEach((r, idx) => {
            if (r.length > maxCols) {
                maxCols = r.length;
                headerRowIndex = idx;
            }
        });

        const headers = (rawRows[headerRowIndex] || []).map((h, index) => {
            return { index: index, name: h || `Kolumna ${index + 1}` };
        });

        const dataRows = rawRows.slice(headerRowIndex + 1).filter(r => r.length > 0);

        return {
            fileName: fileName,
            sheetCount: 1,
            headers: headers,
            rows: dataRows,
            rawRows: rawRows
        };
    },

    // Import danych na podstawie wybranego mapowania kolumn
    importMappedData(parsedData, mapping, supplierName) {
        let importedCount = 0;
        const rows = parsedData.rows;
        const importedProductIds = new Set();
        
        // Zabezpieczenie: Wyszyszczenie starych ofert cenowych tej hurtowni przed wczytaniem pliku Excel jeśli zaznaczono
        const clearOffersCheckbox = document.getElementById('mapClearSupplierOffers');
        if (clearOffersCheckbox && clearOffersCheckbox.checked) {
            Database.clearSupplierOffers(supplierName);
        }
        
        // Indeksy kolumn z mapowania (mogą być indeksami numerycznymi)
        const eanIdx = parseInt(mapping.eanCol);
        const skuIdx = parseInt(mapping.skuCol);
        const nameIdx = parseInt(mapping.nameCol);
        const priceIdx = parseInt(mapping.priceCol);
        const packSizeIdx = parseInt(mapping.packSizeCol);
        const vatIdx = parseInt(mapping.vatCol);
        const dividePrice = mapping.dividePrice;
        
        rows.forEach(row => {
            // Kody EAN i SKU
            const ean = row[eanIdx] ? row[eanIdx].toString().trim() : '';
            const sku = row[skuIdx] ? row[skuIdx].toString().trim() : '';

            let rawName = row[nameIdx] ? row[nameIdx].toString().trim() : '';
            const name = typeof Scraper !== 'undefined' && Scraper.cleanProductName ? Scraper.cleanProductName(rawName, ean) : rawName;
            
            // Cena netto
            let rawPrice = row[priceIdx] !== undefined ? row[priceIdx].toString().trim() : '';
            rawPrice = rawPrice.replace(/[^0-9,\.\-]/g, '').replace(',', '.');
            let price = parseFloat(rawPrice);
            
            // Pack Size i VAT
            let packSize = 1;
            if (!isNaN(packSizeIdx) && packSizeIdx >= 0) {
                const ps = row[packSizeIdx] ? row[packSizeIdx].toString().trim() : '';
                packSize = parseInt(ps) || 1;
            }
            
            let vat = 'nd.';
            if (!isNaN(vatIdx) && vatIdx >= 0) {
                const v = row[vatIdx] ? row[vatIdx].toString().trim() : '';
                if (v) vat = v.includes('%') ? v : v + '%';
            }

            let unitPrice = price;
            let packagePrice = price;

            if (dividePrice && packSize > 1 && price > 0) {
                unitPrice = parseFloat((price / packSize).toFixed(2));
                packagePrice = price;
            } else if (packSize > 1 && price > 0) {
                // Skoro to cena sztuki, cena paczki to cena * sztuki
                packagePrice = parseFloat((price * packSize).toFixed(2));
            }
            
            // Nazwa i cena są krytyczne do importu
            if (name && !isNaN(price) && price > 0) {
                const guessedCat = typeof Scraper !== 'undefined' ? Scraper.guessCategory(name, supplierName) : { main: 'Inne', sub: 'Ogólne' };
                
                const extraData = {
                    category: guessedCat.main,
                    subCategory: guessedCat.sub,
                    packSize: packSize,
                    vat: vat,
                    packagePrice: packagePrice
                };

                // SPRAWDZANIE Z DOPASOWANIEM AI (EAN, SKU, FUZZY SIMILARITY)
                const products = Database.getProducts();
                const cleanedEan = Database.cleanEan(ean);
                const matchedProd = Database.findMatchingProduct(products, cleanedEan, sku, name);

                if (matchedProd || (cleanedEan && cleanedEan.length >= 7)) {
                    let finalEan = cleanedEan;
                    if (!finalEan) {
                        finalEan = matchedProd ? matchedProd.ean : ("FILE-" + Math.abs(name.hashCode()).toString().padEnd(10, '0').substr(0, 10));
                    }
                    const pid = Database.addPriceOffer(finalEan, sku, name, supplierName, unitPrice, new Date().toISOString(), extraData);
                    if (pid) importedProductIds.add(pid);
                    if (cleanedEan) importedProductIds.add(cleanedEan);
                    if (sku) importedProductIds.add(sku);
                } else {
                    // Brak EAN i brak wystarczającego podobieństwa -> KWARANTANNA
                    Database.saveDraft({
                        name: name,
                        ean: cleanedEan || ean || '',
                        sku: sku || '',
                        supplierName: supplierName,
                        unitPrice: unitPrice,
                        date: new Date().toISOString(),
                        extraData: extraData
                    });
                }
                
                importedCount++;
            }
        });

        // Oznaczenie pozycji niedostępnych w nowym cenniku danej hurtowni
        if (importedProductIds.size > 0) {
            Database.markMissingSupplierOffers(supplierName, importedProductIds);
        }
        
        // Zapis do historii importów
        Database.addHistoryLog(
            'Plik', 
            supplierName, 
            importedCount, 
            'success', 
            `Zaimportowano pomyślnie z pliku ${parsedData.fileName}`
        );
        
        return importedCount;
    }
};

// Pomocnicza metoda generowania hasha dla stringa (analogicznie do Java hashCode)
String.prototype.hashCode = function() {
    let hash = 0;
    if (this.length === 0) return hash;
    for (let i = 0; i < this.length; i++) {
        const chr = this.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Konwersja na 32bit integer
    }
    return hash;
};
