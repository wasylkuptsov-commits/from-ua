// --- GLOBALNE BEZPIECZNE FUNKCJE MODALI (DOSTĘPNE NATYCHMIAST W CAŁYM SYSTEMIE) ---
function openModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.add('active');
        el.style.display = 'flex';
        el.style.pointerEvents = 'auto';
        el.style.zIndex = '999999';
    }
}
window.openModal = openModal;

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.remove('active');
        el.style.display = 'none';
        el.style.pointerEvents = 'none';
    }
}
window.closeModal = closeModal;

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => {
        m.classList.remove('active');
        m.style.display = 'none';
        m.style.pointerEvents = 'none';
    });
}
window.closeAllModals = closeAllModals;

// Globalne zdarzenie klawisza ESC
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
});

function showToast(text) {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '80px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = 'rgba(16, 185, 129, 0.95)';
    toast.style.color = '#fff';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '20px';
    toast.style.fontSize = '13px';
    toast.style.fontWeight = '600';
    toast.style.zIndex = '3000';
    toast.style.boxShadow = '0 5px 20px rgba(0,0,0,0.5)';
    toast.innerText = text;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}
window.showToast = showToast;

// --- INTERAKTYWNE WYCOFYWANIE TOWARÓW / KATEGORII / OFERT HURTOWNI BEZ ŚLADU ---
window.openWithdrawCategoryModal = function openWithdrawCategoryModal() {
    const container = document.getElementById('withdrawCategoryListContainer');
    if (!container) return;

    const products = typeof Database !== 'undefined' ? Database.getProducts() : [];
    const categoriesMap = {};
    products.forEach(p => {
        const cat = p.category || 'Inne';
        categoriesMap[cat] = (categoriesMap[cat] || 0) + 1;
    });

    const cats = Object.keys(categoriesMap).sort();
    if (cats.length === 0) {
        container.innerHTML = '<div style="font-size:12px; color:var(--text-dim); text-align:center; padding:15px;">Brak dostępnych kategorii w katalogu.</div>';
    } else {
        let html = '';
        cats.forEach(c => {
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:10px 14px; border-radius:8px; border:1px solid rgba(255,255,255,0.1);">
                    <div>
                        <strong style="color:var(--text-main); font-size:14px;">${c}</strong>
                        <span style="font-size:11px; color:var(--text-dim); margin-left:6px;">(${categoriesMap[c]} towarów)</span>
                    </div>
                    <button class="btn btn-danger" onclick="executeDirectCategoryDelete('${c.replace(/'/g, "\\'")}')" style="padding:6px 14px; font-size:12px; font-weight:700;">
                        <i class="fa-solid fa-trash"></i> Wycofaj tę Kategorię
                    </button>
                </div>
            `;
        });
        container.innerHTML = html;
    }
    if (typeof openModal === 'function') openModal('withdrawCategoryModal');
};

window.openWithdrawSupplierModal = function openWithdrawSupplierModal() {
    const container = document.getElementById('withdrawSupplierListContainer');
    if (!container) return;

    const suppliers = typeof Database !== 'undefined' ? Database.getSuppliers() : [];
    const products = typeof Database !== 'undefined' ? Database.getProducts() : [];

    let html = '';
    suppliers.forEach(s => {
        let offerCount = 0;
        products.forEach(p => {
            if (p.offers && p.offers.some(o => o.source === s.name)) offerCount++;
        });

        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:10px 14px; border-radius:8px; border:1px solid rgba(255,255,255,0.1);">
                <div>
                    <strong style="color:var(--text-main); font-size:14px;">${s.name}</strong>
                    <span style="font-size:11px; color:var(--text-dim); margin-left:6px;">(${offerCount} pozycji w ofercie)</span>
                </div>
                <button class="btn btn-danger" onclick="executeDirectSupplierDelete('${s.name.replace(/'/g, "\\'")}')" style="padding:6px 14px; font-size:12px; font-weight:700;">
                    <i class="fa-solid fa-trash-can"></i> Wycofaj Oferty
                </button>
            </div>
        `;
    });
    container.innerHTML = html;
    if (typeof openModal === 'function') openModal('withdrawSupplierModal');
};

window.executeDirectCategoryDelete = function executeDirectCategoryDelete(catName) {
    if (confirm(`Czy na pewno chcesz usunąć BEZ ŚLADU wszystkie towary z kategorii "${catName}"?`)) {
        const deletedCount = Database.deleteProductsByCategory(catName);
        if (typeof closeModal === 'function') closeModal('withdrawCategoryModal');
        if (typeof showToast === 'function') showToast(`Pomyślnie wycofano bez śladu ${deletedCount} towarów z kategorii "${catName}"`);
        if (typeof window.updateDashboardStats === 'function') window.updateDashboardStats();
        if (typeof window.renderPimView === 'function') window.renderPimView();
        if (typeof window.renderCatalog === 'function') window.renderCatalog();
        if (typeof window.populatePimCategories === 'function') window.populatePimCategories();
    }
};

window.executeDirectSupplierDelete = function executeDirectSupplierDelete(supName) {
    if (confirm(`Czy na pewno chcesz wycofać BEZ ŚLADU wszystkie oferty hurtowni "${supName}"?`)) {
        const deletedProductsCount = Database.deleteOffersBySupplier(supName);
        if (typeof closeModal === 'function') closeModal('withdrawSupplierModal');
        if (typeof showToast === 'function') showToast(`Pomyślnie wycofano bez śladu oferty hurtowni "${supName}" (usunięto ${deletedProductsCount} towarów)`);
        if (typeof window.updateDashboardStats === 'function') window.updateDashboardStats();
        if (typeof window.renderPimView === 'function') window.renderPimView();
        if (typeof window.renderCatalog === 'function') window.renderCatalog();
        if (typeof window.populatePimSuppliers === 'function') window.populatePimSuppliers();
    }
};

window.executeWithdrawSelectedCategory = function executeWithdrawSelectedCategory() {
    const catSelect = document.getElementById('pimCategoryFilter');
    const selectedCat = catSelect ? catSelect.value : '';
    if (!selectedCat) {
        window.openWithdrawCategoryModal();
        return;
    }
    window.executeDirectCategoryDelete(selectedCat);
};

window.executeWithdrawSelectedSupplier = function executeWithdrawSelectedSupplier() {
    const supSelect = document.getElementById('pimSupplierFilter');
    const selectedSup = supSelect ? supSelect.value : '';
    if (!selectedSup) {
        window.openWithdrawSupplierModal();
        return;
    }
    window.executeDirectSupplierDelete(selectedSup);
};

window.executeConfirmWithdrawModal = function executeConfirmWithdrawModal() {
    const withdrawSupplierSelect = document.getElementById('withdrawSupplierSelect');
    const withdrawCategorySelect = document.getElementById('withdrawCategorySelect');
    if (!withdrawSupplierSelect || !withdrawCategorySelect) return;

    const supName = withdrawSupplierSelect.value;
    const catChoice = withdrawCategorySelect.value;

    if (!supName) {
        alert("Proszę wybrać hurtownię z listy.");
        return;
    }

    if (catChoice === 'ALL_CATEGORIES') {
        if (confirm(`Czy na pewno chcesz wycofać BEZ ŚLADU wszystkie oferty cenowe z hurtowni "${supName}"? Towary unikalne dla tej hurtowni zostaną usunięte z bazy danych.`)) {
            const deletedCount = Database.deleteOffersBySupplier(supName);
            if (typeof closeModal === 'function') closeModal('withdrawCategoryModal');
            const msg = `Pomyślnie wycofano bez śladu całą ofertę hurtowni "${supName}"! Usunięto ${deletedCount} wyłącznych towarów.`;
            if (typeof showToast === 'function') showToast(msg);
            else alert(msg);

            if (typeof populateFileSuppliers === 'function') populateFileSuppliers();
            if (typeof updateDashboardStats === 'function') updateDashboardStats();
            if (typeof renderPimView === 'function') renderPimView();
            if (typeof renderCatalog === 'function') renderCatalog();
            if (typeof populatePimSuppliers === 'function') populatePimSuppliers();
            if (typeof populatePimCategories === 'function') populatePimCategories();
        }
    } else {
        if (confirm(`Czy na pewno chcesz wycofać BEZ ŚLADU kategorię "${catChoice}" z hurtowni "${supName}"?`)) {
            const deletedCount = Database.deleteProductsByCategory(catChoice);
            if (typeof closeModal === 'function') closeModal('withdrawCategoryModal');
            const msg = `Pomyślnie wycofano bez śladu kategorię "${catChoice}"! Usunięto ${deletedCount} towarów.`;
            if (typeof showToast === 'function') showToast(msg);
            else alert(msg);

            if (typeof updateDashboardStats === 'function') updateDashboardStats();
            if (typeof renderPimView === 'function') renderPimView();
            if (typeof renderCatalog === 'function') renderCatalog();
            if (typeof populatePimCategories === 'function') populatePimCategories();
        }
    }
};

// --- HELPERY WYSZUKIWANIA I NORMALIZACJI HASIEŁ ---
window.cleanSearchQuery = function cleanSearchQuery(str) {
    if (!str) return '';
    let norm = str.toLowerCase()
        .replace(/квас/g, 'kwas')
        .replace(/kvas/g, 'kwas')
        .replace(/а/g, 'a').replace(/б/g, 'b').replace(/в/g, 'w').replace(/г/g, 'g')
        .replace(/д/g, 'd').replace(/е/g, 'e').replace(/ё/g, 'e').replace(/ж/g, 'z')
        .replace(/з/g, 'z').replace(/и/g, 'i').replace(/й/g, 'j').replace(/к/g, 'k')
        .replace(/л/g, 'l').replace(/м/g, 'm').replace(/н/g, 'n').replace(/о/g, 'o')
        .replace(/п/g, 'p').replace(/р/g, 'r').replace(/с/g, 's').replace(/т/g, 't')
        .replace(/у/g, 'u').replace(/ф/g, 'f').replace(/х/g, 'h').replace(/ц/g, 'c')
        .replace(/ч/g, 'cz').replace(/ш/g, 'sz').replace(/щ/g, 'szcz').replace(/ы/g, 'y')
        .replace(/э/g, 'e').replace(/ю/g, 'ju').replace(/я/g, 'ja')
        .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
        .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
        .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
        .replace(/v/g, 'w');
        
    return norm.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
};

window.searchMatchesProduct = function searchMatchesProduct(p, searchQuery) {
    if (!searchQuery) return true;
    const cleanQ = window.cleanSearchQuery(searchQuery);
    if (!cleanQ) return true;

    const terms = cleanQ.split(' ').filter(t => t.length > 0);
    if (terms.length === 0) return true;

    const rawOffersStr = p.offers ? p.offers.map(o => o.source || '').join(' ') : '';
    const targetText = window.cleanSearchQuery([
        p.name || '',
        p.category || '',
        p.subCategory || '',
        p.description || '',
        p.ean || '',
        p.sku || '',
        rawOffersStr
    ].join(' '));

    return terms.every(term => targetText.includes(term));
};

// --- ZARZĄDZANIE WERSJONOWANIEM I MIGAWKAMI KATALOGU ---
window.renderSnapshotsList = function renderSnapshotsList() {
    const container = document.getElementById('snapshotsListContainer');
    if (!container || typeof Database === 'undefined') return;

    const snapshots = Database.getSnapshots();
    container.innerHTML = '';

    if (snapshots.length === 0) {
        container.innerHTML = `
            <div style="font-size:12px; color:var(--text-dim); padding:10px 0;">
                <i class="fa-solid fa-circle-info"></i> Brak zapisanych wersji. Kliknij przycisk powyżej, aby utworzyć pierwszą migawkę katalogu.
            </div>
        `;
        return;
    }

    snapshots.forEach((snap, idx) => {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.padding = '10px 14px';
        item.style.marginBottom = '8px';
        item.style.background = idx === 0 ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255, 255, 255, 0.02)';
        item.style.borderRadius = '10px';
        item.style.border = idx === 0 ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)';

        item.innerHTML = `
            <div>
                <strong style="color:var(--text-main); font-size:14px; display:block;">${snap.name}</strong>
                <small style="color:var(--text-dim); font-size:11px;">
                    Data: ${snap.dateFormatted || snap.date} | Towarów w bazie: <strong>${snap.productsCount}</strong> | W kwarantannie: ${snap.draftsCount}
                </small>
            </div>
            <div style="display:flex; gap:8px;">
                <button class="btn btn-primary btn-small" onclick="executeRestoreVersionSnapshot('${snap.id}')" style="font-size:12px; padding:5px 12px;">
                    <i class="fa-solid fa-rotate-left"></i> Przywróć Wersję
                </button>
                <button class="btn btn-danger btn-small" onclick="executeDeleteVersionSnapshot('${snap.id}')" style="font-size:12px; padding:5px 10px;" title="Usuń migawkę">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(item);
    });
};

window.executeCreateVersionSnapshot = function executeCreateVersionSnapshot() {
    if (typeof Database === 'undefined') return;
    const note = prompt("Wpisz opcjonalną nazwę/opis dla tej kopii zapasowej (np. Przed wgrywaniem z Hurtowni Monolith):");
    if (note !== null) {
        Database.createSnapshot(note);
        window.renderSnapshotsList();
        if (typeof showToast === 'function') showToast("📸 Utworzono nową migawkę katalogu!");
    }
};

window.executeRestoreVersionSnapshot = function executeRestoreVersionSnapshot(snapshotId) {
    if (typeof Database === 'undefined') return;
    if (confirm("⚠️ Czy na pewno chcesz przywrócić katalog do tej wersji? Obecny stan towarów zostanie zastąpiony zapisanym w migawce.")) {
        const ok = Database.restoreSnapshot(snapshotId);
        if (ok) {
            if (typeof window.updateDashboardStats === 'function') window.updateDashboardStats();
            if (typeof window.renderPimView === 'function') window.renderPimView();
            if (typeof window.renderCatalog === 'function') window.renderCatalog();
            window.renderSnapshotsList();
            if (typeof showToast === 'function') showToast("⏪ Pomyślnie przywrócono wybraną wersję katalogu!");
        } else {
            alert("Błąd podczas przywracania migawki.");
        }
    }
};

window.executeDeleteVersionSnapshot = function executeDeleteVersionSnapshot(snapshotId) {
    if (typeof Database === 'undefined') return;
    if (confirm("Usuń tę migawkę kopii zapasowej?")) {
        Database.deleteSnapshot(snapshotId);
        window.renderSnapshotsList();
    }
};

window.handleBackupFileImport = function handleBackupFileImport(input) {
    if (!input || !input.files || !input.files[0]) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        const ok = Database.importFullBackupJSON(e.target.result);
        if (ok) {
            if (typeof window.updateDashboardStats === 'function') window.updateDashboardStats();
            if (typeof window.renderPimView === 'function') window.renderPimView();
            if (typeof window.renderCatalog === 'function') window.renderCatalog();
            window.renderSnapshotsList();
            alert("Pomyślnie wczytano bazę towarów z pliku kopii zapasowej!");
        } else {
            alert("Błąd: Plik nie zawiera prawidłowej kopii zapasowej.");
        }
        input.value = '';
    };
    reader.readAsText(file);
};

// --- PEŁNA OBSŁUGA EDYCJI PRODUKTU W PIM ---
window.openProductEditModal = function openProductEditModal(productId) {
    if (typeof Database === 'undefined') return;
    const products = Database.getProducts();
    const prod = products.find(p => p.id === productId);
    if (!prod) {
        alert("Nie znaleziono produktu w bazie.");
        return;
    }

    document.getElementById('editProdId').value = prod.id;
    document.getElementById('editProdName').value = prod.name || '';
    document.getElementById('editProdEan').value = prod.ean || '';
    document.getElementById('editProdSku').value = prod.sku || '';
    document.getElementById('editProdCategory').value = prod.category || '';
    document.getElementById('editProdSubCategory').value = prod.subCategory || '';
    document.getElementById('editProdPackSize').value = prod.packSize || 1;
    document.getElementById('editProdVat').value = prod.vat || '23%';
    document.getElementById('editProdImage').value = prod.image || '';

    const offersList = document.getElementById('editProdOffersList');
    if (offersList) {
        offersList.innerHTML = '';
        if (prod.offers && prod.offers.length > 0) {
            prod.offers.forEach((off, idx) => {
                const div = document.createElement('div');
                div.style.display = 'flex';
                div.style.alignItems = 'center';
                div.style.justifyContent = 'space-between';
                div.style.gap = '10px';
                div.style.marginBottom = '8px';
                div.style.padding = '6px 10px';
                div.style.background = 'rgba(255,255,255,0.03)';
                div.style.borderRadius = '8px';

                div.innerHTML = `
                    <span style="font-weight:700; color:var(--text-main); font-size:13px; min-width:140px;">${off.source}</span>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-size:12px; color:var(--text-dim);">Cena netto:</span>
                        <input type="number" step="0.01" value="${off.price}" class="form-control offer-price-input" data-offer-idx="${idx}" style="width:110px; font-weight:700;">
                        <span style="font-size:12px;">zł</span>
                    </div>
                    <button type="button" class="btn btn-danger btn-small" onclick="removeOfferFromEdit('${prod.id}', ${idx})" title="Usuń tę ofertę hurtowni">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                `;
                offersList.appendChild(div);
            });
        } else {
            offersList.innerHTML = '<p style="color:var(--text-dim); font-size:12px;">Brak przypisanych ofert hurtowni.</p>';
        }
    }

    if (typeof window.openModal === 'function') {
        window.openModal('productEditModal');
    }
};

window.removeOfferFromEdit = function removeOfferFromEdit(productId, offerIndex) {
    const products = Database.getProducts();
    const prod = products.find(p => p.id === productId);
    if (prod && prod.offers && prod.offers[offerIndex]) {
        prod.offers.splice(offerIndex, 1);
        Database.saveProducts(products);
        window.openProductEditModal(productId);
    }
};

window.executeSaveProductEdit = function executeSaveProductEdit() {
    if (typeof Database === 'undefined') return;
    const prodId = document.getElementById('editProdId').value;
    const products = Database.getProducts();
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;

    prod.name = document.getElementById('editProdName').value.trim() || prod.name;
    prod.ean = document.getElementById('editProdEan').value.trim() || '';
    prod.sku = document.getElementById('editProdSku').value.trim() || '';
    prod.category = document.getElementById('editProdCategory').value.trim() || 'Inne';
    prod.subCategory = document.getElementById('editProdSubCategory').value.trim() || 'Ogólne';
    prod.packSize = parseInt(document.getElementById('editProdPackSize').value) || 1;
    prod.vat = document.getElementById('editProdVat').value.trim() || '23%';
    prod.image = document.getElementById('editProdImage').value.trim() || '';

    const priceInputs = document.querySelectorAll('#editProdOffersList .offer-price-input');
    priceInputs.forEach(input => {
        const idx = parseInt(input.getAttribute('data-offer-idx'));
        const newP = parseFloat(input.value);
        if (!isNaN(idx) && prod.offers && prod.offers[idx] && !isNaN(newP) && newP >= 0) {
            prod.offers[idx].price = newP;
        }
    });

    Database.saveProducts(products);
    if (typeof window.closeModal === 'function') window.closeModal('productEditModal');
    if (typeof window.updateDashboardStats === 'function') window.updateDashboardStats();
    if (typeof window.renderPimView === 'function') window.renderPimView();
    if (typeof window.renderCatalog === 'function') window.renderCatalog();
    if (typeof showToast === 'function') showToast("Pomyślnie zapisano zmiany w produkcie!");
};

// Globalne funkcje stanu i widoku PIM
window.populatePimCategories = function populatePimCategories() {
    const pimCategoryFilter = document.getElementById('pimCategoryFilter');
    if (!pimCategoryFilter || typeof Database === 'undefined') return;
    const currentVal = pimCategoryFilter.value;
    pimCategoryFilter.innerHTML = '<option value="">Wszystkie kategorie</option>';
    const products = Database.getProducts();
    const categories = new Set();
    products.forEach(p => {
        if (p && p.category) categories.add(p.category);
        if (p && p.subCategory && p.subCategory !== 'Ogólne') categories.add(p.subCategory);
    });
    Array.from(categories).sort().forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.innerText = c;
        if (c === currentVal) opt.selected = true;
        pimCategoryFilter.appendChild(opt);
    });
};

window.populatePimSuppliers = function populatePimSuppliers() {
    const pimSupplierFilter = document.getElementById('pimSupplierFilter');
    if (!pimSupplierFilter || typeof Database === 'undefined') return;
    const currentVal = pimSupplierFilter.value;
    pimSupplierFilter.innerHTML = '<option value="">Wszyscy dostawcy</option>';
    const suppliers = Database.getSuppliers();
    suppliers.forEach(s => {
        if (s && s.name) {
            const opt = document.createElement('option');
            opt.value = s.name;
            opt.innerText = s.name;
            if (s.name === currentVal) opt.selected = true;
            pimSupplierFilter.appendChild(opt);
        }
    });
};

window.executeAutoCategorize = function executeAutoCategorize() {
    if (typeof Scraper !== 'undefined' && Scraper.autoCategorizeDatabase) {
        const count = Scraper.autoCategorizeDatabase();
        if (count > 0) {
            alert(`Pomyślnie automatycznie skategoryzowano ${count} produktów w bazie!`);
        } else {
            alert("Wszystkie towary posiadają już zdefiniowane właściwe kategorie.");
        }
        if (typeof window.populatePimCategories === 'function') window.populatePimCategories();
        if (typeof window.updateDashboardStats === 'function') window.updateDashboardStats();
        if (typeof window.renderPimView === 'function') window.renderPimView();
    }
};

window.executeConsolidateDb = function executeConsolidateDb() {
    if (typeof Database !== 'undefined' && Database.consolidateDatabase) {
        const count = Database.consolidateDatabase();
        if (count > 0) {
            alert(`Pomyślnie połączono ${count} zduplikowanych pozycji w bazie przy użyciu inteligentnych reguł!`);
        } else {
            alert("Baza jest już optymalnie scalona - nie znaleziono nowych duplikatów z hurtowni.");
        }
        if (typeof window.populatePimCategories === 'function') window.populatePimCategories();
        if (typeof window.updateDashboardStats === 'function') window.updateDashboardStats();
        if (typeof window.renderPimView === 'function') window.renderPimView();
    }
};

window.executeOpenPartnerReport = function executeOpenPartnerReport() {
    if (typeof window.openPartnerReportInNewWindow === 'function') {
        window.openPartnerReportInNewWindow();
    } else {
        alert("Przygotowywanie raportowania A4...");
    }
};

window.executeExportDirectExcel = function executeExportDirectExcel() {
    if (typeof window.exportAnalyticsExcelWithPicker === 'function') {
        let products = window._currentlyComparedProducts && window._currentlyComparedProducts.length > 0 ? window._currentlyComparedProducts : Database.getProducts();
        window.exportAnalyticsExcelWithPicker(products);
    }
};

window.executePimFilter = function executePimFilter() {
    const searchEl = document.getElementById('pimSearchInput');
    const catEl = document.getElementById('pimCategoryFilter');
    const suppEl = document.getElementById('pimSupplierFilter');
    const compEl = document.getElementById('pimCompareMode');

    const searchVal = searchEl ? searchEl.value : '';
    const suppVal = suppEl ? suppEl.value : '';
    const catVal = catEl ? catEl.value : '';
    const compVal = compEl ? compEl.checked : false;

    if (typeof window.renderPimView === 'function') {
        window.renderPimView(searchVal, suppVal, catVal, compVal);
    }
};

window.updateDashboardStats = function updateDashboardStats() {
    if (typeof Database === 'undefined') return;
    const products = Database.getProducts();
    const suppliers = Database.getSuppliers();
    const drafts = Database.getDrafts();
    const orders = Database.getOrders();
    const margins = Database.getMargins();

    const elProd = document.getElementById('statProductsCount');
    if (elProd) elProd.innerText = products.length;

    const elDrafts = document.getElementById('statDraftsCount');
    if (elDrafts) elDrafts.innerText = drafts.length;

    const elSupp = document.getElementById('statSuppliersCount');
    if (elSupp) elSupp.innerText = suppliers.length;

    const elOrders = document.getElementById('statOrdersCount');
    if (elOrders) elOrders.innerText = orders.length;

    const elMargin = document.getElementById('statMarginPct');
    if (elMargin) elMargin.innerText = `+${margins.globalMargin || 15}%`;
};

let pimRenderLimit = 100;

window.renderPimView = function renderPimView(searchQuery = '', supplierQuery = '', categoryQuery = '', compareMode = false, resetLimit = true) {
    if (resetLimit) pimRenderLimit = 100;
    const container = document.getElementById('pimProductsList');
    if (!container) return;

    let products = typeof Database !== 'undefined' ? Database.getProducts() : [];
    
    // Aktualizacja liczników na chipach statusów
    const countAll = document.getElementById('countPimAll');
    const countQuarantine = document.getElementById('countPimQuarantine');
    const countPriceReview = document.getElementById('countPimPriceReview');
    const countApproved = document.getElementById('countPimApproved');

    if (countAll) countAll.innerText = products.length;
    if (countQuarantine) countQuarantine.innerText = products.filter(p => p.isQuarantined === true).length;
    if (countPriceReview) countPriceReview.innerText = products.filter(p => p.priceChangeReviewNeeded === true).length;
    if (countApproved) countApproved.innerText = products.filter(p => p.isApproved === true).length;

    const dupsBadge = document.getElementById('pimDuplicatesBadge');
    if (dupsBadge && typeof Database !== 'undefined' && Database.findPotentialDuplicates) {
        const potentialDups = Database.findPotentialDuplicates(0.70);
        dupsBadge.innerText = potentialDups.length;
    }

    const agentQuestionsBadge = document.getElementById('agentQuestionsBadge');
    if (agentQuestionsBadge && typeof Database !== 'undefined' && Database.getUncertainDecisions) {
        const uncertainList = Database.getUncertainDecisions();
        agentQuestionsBadge.innerText = uncertainList.length;
        if (uncertainList.length > 0) {
            agentQuestionsBadge.parentElement.style.animation = 'pulse 2s infinite';
        } else {
            agentQuestionsBadge.parentElement.style.animation = 'none';
        }
    }

    // Filtrowanie po wybranym chipie statusu
    if (window.currentPimStatusFilter === 'quarantine') {
        products = products.filter(p => p.isQuarantined === true);
    } else if (window.currentPimStatusFilter === 'priceReview') {
        products = products.filter(p => p.priceChangeReviewNeeded === true);
    } else if (window.currentPimStatusFilter === 'approved') {
        products = products.filter(p => p.isApproved === true);
    }
    
    if (compareMode) {
        products = products.filter(p => p.offers && p.offers.length > 1);
    }
    
    if (categoryQuery) {
        const cleanCatQuery = typeof window.cleanSearchQuery === 'function' ? window.cleanSearchQuery(categoryQuery) : categoryQuery.toLowerCase();
        products = products.filter(p => {
            const catNorm = typeof window.cleanSearchQuery === 'function' ? window.cleanSearchQuery(p.category || '') : (p.category || '').toLowerCase();
            const subNorm = typeof window.cleanSearchQuery === 'function' ? window.cleanSearchQuery(p.subCategory || '') : (p.subCategory || '').toLowerCase();
            return catNorm.includes(cleanCatQuery) || subNorm.includes(cleanCatQuery) || (p.category === categoryQuery) || (p.subCategory === categoryQuery);
        });
    }

    if (supplierQuery) {
        products = products.filter(p => p.offers && p.offers.some(o => o.source === supplierQuery));
    }
    
    if (searchQuery) {
        products = products.filter(p => typeof window.searchMatchesProduct === 'function' ? window.searchMatchesProduct(p, searchQuery) : true);
    }

    window._currentlyComparedProducts = products;

    container.innerHTML = '';

    // Sprawdzanie czy istnieją potencjalne duplikaty w bazie
    if (typeof Database !== 'undefined' && Database.findPotentialDuplicates) {
        const potentialDupes = Database.findPotentialDuplicates();
        if (potentialDupes && potentialDupes.length > 0) {
            const dupeBanner = document.createElement('div');
            dupeBanner.style.marginBottom = '15px';
            dupeBanner.style.padding = '12px 16px';
            dupeBanner.style.background = 'rgba(234, 179, 8, 0.12)';
            dupeBanner.style.border = '1.5px solid #f59e0b';
            dupeBanner.style.borderRadius = '12px';
            dupeBanner.style.display = 'flex';
            dupeBanner.style.justifyContent = 'space-between';
            dupeBanner.style.alignItems = 'center';
            dupeBanner.style.flexWrap = 'wrap';
            dupeBanner.style.gap = '10px';
            dupeBanner.innerHTML = `
                <div style="font-size: 13px; font-weight: 700; color: #fbbf24;">
                    <i class="fa-solid fa-code-merge"></i> Wykryto ${potentialDupes.length} potencjalne pary zdublowanych towarów w bazie!
                </div>
                <button class="btn btn-small" onclick="openDuplicateMergerModal()" style="background: #f59e0b; color: #000; font-weight: 800; font-size: 12px; padding: 6px 14px; border-radius: 8px; border: none; cursor: pointer;">
                    <i class="fa-solid fa-eye"></i> Pokaż propozycje scalenia i połącz oferty dostawców
                </button>
            `;
            container.appendChild(dupeBanner);
        }
    }

    const visibleProducts = products.slice(0, pimRenderLimit);

    visibleProducts.forEach(p => {
        const catColor = p.categoryColor || '#8b5cf6';
        const catTextColor = p.categoryTextColor || '#c4b5fd';
        const catIcon = p.categoryIcon || 'fa-solid fa-tag';
        const catName = p.category || 'Katalog Kravets';

        const card = document.createElement('div');
        card.className = 'glass-card';
        card.style.background = 'rgba(255,255,255,0.03)';
        card.style.marginBottom = '10px';
        card.style.padding = '10px 15px';
        card.style.borderLeft = `3px solid ${catColor}`;

        let offersHtml = '';
        const vatStr = p.vat && p.vat !== 'nd.' ? (p.vat.includes('%') ? p.vat : p.vat + '%') : '23%';
        const vatPercent = parseFloat(vatStr.replace('%', '')) || 23;

        if (p.offers && p.offers.length > 0) {
            const sortedOffers = [...p.offers].sort((a,b) => a.price - b.price);
            const hasMultiple = sortedOffers.length > 1;

            sortedOffers.forEach((off, idx) => {
                const isBest = idx === 0 && hasMultiple;
                const isWorst = idx === sortedOffers.length - 1 && hasMultiple;
                const diffBadge = isBest ? '<span style="background:rgba(16,185,129,0.2); color:#10b981; padding:2px 6px; border-radius:4px; font-size:11px; margin-left:6px; font-weight:700;">Najnizsza cena</span>' : (isWorst ? '<span style="background:rgba(239,68,68,0.2); color:#ef4444; padding:2px 6px; border-radius:4px; font-size:11px; margin-left:6px; font-weight:700;">Najwyzsza cena</span>' : '');

                const netPrice = parseFloat(off.price) || 0;
                const grossPrice = (netPrice * (1 + vatPercent/100)).toFixed(2);
                const unitLabel = p.unit || (p.packSize && String(p.packSize).toLowerCase().includes('kg') ? 'kg' : 'szt.');

                const packageNetPrice = (netPrice * (p.packSize || 1)).toFixed(2);
                const packageBadge = (p.packSize && p.packSize > 1) 
                    ? `<small style="color:var(--text-dim); display:block; text-align:right;">(${packageNetPrice} zł za karton / op. ${p.packSize} ${unitLabel})</small>`
                    : '';

                offersHtml += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size:12px;">
                        <span><strong style="color:var(--text-main);">${off.source}</strong> ${diffBadge}</span>
                        <span style="text-align:right;">
                            <strong style="color:var(--secondary); font-size:13px;">${netPrice.toFixed(2)} zł / ${unitLabel} netto</strong>
                            <small style="color:var(--text-dim);"> (${grossPrice} zł brutto)</small>
                            ${packageBadge}
                        </span>
                    </div>
                `;
            });
        } else {
            offersHtml = '<div style="font-size:12px; color:var(--warning); padding:4px 0;"><i class="fa-solid fa-triangle-exclamation"></i> Chwilowy brak w hurtowniach</div>';
        }

        const packInfo = p.packSize && p.packSize > 1 ? `<span style="font-size:11px; background:rgba(6,182,212,0.15); color:var(--secondary); padding:2px 6px; border-radius:4px; margin-left:8px;">Pakowane po: ${p.packSize} szt.</span>` : '';

        const approvalBadge = p.isApproved !== false 
            ? '<span style="background:rgba(16,185,129,0.15); color:#10b981; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700; margin-left:8px;"><i class="fa-solid fa-check"></i> Stała Oferta</span>'
            : '<span style="background:rgba(234,179,8,0.2); color:#f59e0b; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700; margin-left:8px;"><i class="fa-solid fa-clock"></i> Oczekuje na zatwierdzenie (Propozycja)</span>';

        const approveBtn = p.isApproved === false
            ? `<button class="btn" onclick="approveProductToPermanentCatalog('${p.id}')" style="background:linear-gradient(135deg, #10b981 0%, #059669 100%); color:#fff; font-weight:700; padding:6px 12px; font-size:12px;" title="Zatwierdź do Stałej Oferty (Katalog Klienta)"><i class="fa-solid fa-circle-check"></i> Zatwierdź do Stałej Oferty</button>`
            : '';

        const hasValidImg = p.image && !p.image.includes('placeholder') && !p.image.includes('unsplash') && p.image.length > 5;
        const brandShort = (p.brand || p.category || 'Kravets').split(' - ')[0].trim();
        const imgThumb = hasValidImg
            ? `<img src="${p.image}" onclick="openProductDetailsModalById('${p.id}')" style="width:54px; height:54px; object-fit:contain; background:#ffffff; border-radius:8px; border:1.5px solid ${catColor}; flex-shrink:0; cursor:pointer; padding:2px; transition:transform 0.15s ease, box-shadow 0.15s ease;" onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 4px 12px ${catColor}66';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';" title="🔍 Kliknij aby powiększyć zdjęcie i otworzyć wizytówkę towaru" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div onclick="openProductDetailsModalById('${p.id}')" style="display:none; width:54px; height:54px; background:linear-gradient(135deg, ${catColor}25, rgba(15, 23, 42, 0.95)); border-radius:8px; border:1.5px solid ${catColor}66; flex-direction:column; align-items:center; justify-content:center; gap:2px; flex-shrink:0; cursor:pointer; padding:2px;" title="🔍 ${p.name}"><i class="${catIcon}" style="font-size:18px; color:${catTextColor};"></i><span style="font-size:8px; font-weight:800; color:${catTextColor}; text-transform:uppercase;">${brandShort}</span></div>`
            : `<div onclick="openProductDetailsModalById('${p.id}')" style="width:54px; height:54px; background:linear-gradient(135deg, ${catColor}25, rgba(15, 23, 42, 0.95)); border-radius:8px; border:1.5px solid ${catColor}66; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; flex-shrink:0; cursor:pointer; padding:2px; transition:all 0.15s ease;" onmouseover="this.style.borderColor='${catColor}'; this.style.transform='scale(1.08)';" onmouseout="this.style.borderColor='${catColor}66'; this.style.transform='scale(1)';" title="🔍 ${p.name} - Kliknij aby otworzyć wizytówkę"><i class="${catIcon}" style="font-size:18px; color:${catTextColor};"></i><span style="font-size:8px; font-weight:800; color:${catTextColor}; text-transform:uppercase; max-width:48px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${brandShort}</span></div>`;

        const expiryBadge = p.expirationDate 
            ? `<span style="font-size:11px; background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3); padding:2px 6px; border-radius:4px; margin-left:6px; font-weight:700;" title="Data ważności oferowana klientom"><i class="fa-solid fa-calendar-day"></i> Ważność: ${p.expirationDate}</span>` 
            : '';

        const eanListHtml = (p.eans && p.eans.length > 1) 
            ? `<span style="background: rgba(139, 92, 246, 0.2); color: #c4b5fd; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 6px; margin-left: 6px; border: 1px solid rgba(139, 92, 246, 0.4);" title="Alternatywne kody EAN w bazie: ${p.eans.join(', ')}"><i class="fa-solid fa-barcode"></i> +${p.eans.length - 1} alternatywnych EAN</span>`
            : '';

        let priceAnalyticsBanner = '';
        if (p.priceChangeReviewNeeded && p.lastPriceChangeDetails) {
            const det = p.lastPriceChangeDetails;
            const isUp = det.pct > 0;
            const pctColor = isUp ? '#ef4444' : '#10b981';
            const clientCurrentPrice = Database.calculateClientPrice(p.offers[0]?.price, p);

            priceAnalyticsBanner = `
                <div class="price-analytics-banner" style="margin-top: 12px; padding: 12px 14px; background: rgba(234, 179, 8, 0.1); border: 1.5px solid #f59e0b; border-radius: 12px; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.15);">
                    <div style="font-weight: 800; font-size: 13px; color: #fbbf24; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                        <span><i class="fa-solid fa-chart-line"></i> Analiza Zmiany Ceny Zakupu u Dostawcy: <strong style="color:#fff;">${det.supplier}</strong></span>
                        <span style="font-size:11px; background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 6px; color: var(--text-dim);">${new Date(det.date).toLocaleDateString('pl-PL')}</span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-main); margin-top: 6px; line-height: 1.5;">
                        Cena zakupu zmieniła się o <strong style="color: ${pctColor};">${isUp ? '+' : ''}${det.pct}%</strong> 
                        (z <strong>${det.oldWholesalePrice} zł</strong> na <strong style="color:var(--secondary); font-size:13px;">${det.newWholesalePrice} zł</strong>).
                        <br>
                        Obecna cena detaliczna dla Twoich klientów: <strong style="color:#38bdf8;">${clientCurrentPrice} zł</strong>.
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; border-top: 1px dashed rgba(245, 158, 11, 0.3); padding-top: 10px;">
                        <button class="btn btn-small" onclick="handleAcceptPriceRecalculate('${p.id}')" style="background: #10b981; color: #fff; font-weight: 700; font-size: 11px; padding: 6px 12px; border: none; border-radius: 8px; cursor: pointer;">
                            <i class="fa-solid fa-calculator"></i> Zaakceptuj cenę i PRZELICZ cenę dla klientów z marżą
                        </button>
                        <button class="btn btn-small btn-secondary" onclick="handleAcceptPriceKeepOld('${p.id}')" style="font-size: 11px; padding: 6px 12px; border-radius: 8px; cursor: pointer;">
                            <i class="fa-solid fa-lock"></i> Zaakceptuj cenę zakupu, ale ZACHOWAJ OBECNĄ cenę dla klientów
                        </button>
                        <button class="btn btn-small btn-secondary" onclick="handleSetCustomClientPricePrompt('${p.id}')" style="font-size: 11px; padding: 6px 12px; border-radius: 8px; cursor: pointer;">
                            <i class="fa-solid fa-pen"></i> Ustaw WŁASNĄ cenę dla klientów
                        </button>
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; background:linear-gradient(90deg, ${catColor}22, transparent); border-left: 3px solid ${catColor}; padding:3px 8px; border-radius:4px; margin-bottom:8px;">
                <span style="font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.8px; color:${catTextColor};">
                    <i class="${catIcon}"></i> ${catName}
                </span>
                <div style="display:flex; align-items:center; gap:6px;">
                    ${packInfo} ${expiryBadge} ${approvalBadge}
                </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div style="flex:2; min-width:240px; display:flex; align-items:center; gap:12px;">
                    ${imgThumb}
                    <div>
                        <h4 onclick="openProductDetailsModalById('${p.id}')" style="margin:2px 0 4px 0; color:var(--text-main); font-size:15px; font-weight:700; cursor:pointer;" title="🔍 Kliknij aby otworzyć wizytówkę towaru">${p.name}</h4>
                        <div style="font-size:11px; color:var(--text-muted);">
                            Międzynarodowy Kod EAN: <strong>${p.ean || 'Brak'}</strong> ${eanListHtml} | Stawka VAT: <strong>${vatStr}</strong>
                        </div>
                    </div>
                </div>
                <div style="flex:1.5; min-width:220px; background:rgba(0,0,0,0.2); padding:8px 12px; border-radius:8px;">
                    <div style="font-size:10px; text-transform:uppercase; color:var(--text-dim); margin-bottom:4px; font-weight:700;">Oferty Dostawców:</div>
                    ${offersHtml}
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    ${approveBtn}
                    ${(p.offers && p.offers.length > 1) ? `<button class="btn btn-secondary" onclick="openSplitProductModal('${p.id}')" style="padding:6px 10px; font-size:12px; border-color:#f59e0b; color:#fbbf24;" title="Rozdziel połączone oferty na osobne towary"><i class="fa-solid fa-arrows-split-up-and-left"></i> Rozdziel</button>` : ''}
                    <button class="btn btn-secondary" onclick="openProductEditModal('${p.id}')" style="padding:6px 10px; font-size:12px;" title="Edytuj dane"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-danger btn-delete-product-pim" data-id="${p.id}" onclick="deleteProductFromPim('${p.id}')" style="padding:6px 10px; font-size:12px; cursor:pointer;" title="Usuń lub wycofaj towar"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            ${priceAnalyticsBanner}
            <div id="inlineDeleteBar_${p.id}" class="inline-delete-bar" style="display:none; margin-top: 12px; padding: 12px 14px; background: rgba(239, 68, 68, 0.12); border: 1.5px solid rgba(239, 68, 68, 0.4); border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <div style="font-size: 13px; font-weight: 700; color: #f87171;">
                        <i class="fa-solid fa-triangle-exclamation"></i> Szybka akcja dla: <strong>${p.name}</strong>
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button class="btn btn-warning btn-inline-withdraw" onclick="executeWithdrawProductFromClientCatalogDirect('${p.id}')" style="background: rgba(234, 179, 8, 0.2); border: 1px solid #f59e0b; color: #fbbf24; padding: 6px 12px; font-size: 12px; font-weight: 700; border-radius: 8px; cursor: pointer;">
                            <i class="fa-solid fa-eye-slash"></i> Wycofaj z Katalogu Klienta
                        </button>
                        <button class="btn btn-danger btn-inline-permanent-delete" onclick="executePermanentDeleteProductDirect('${p.id}')" style="background: rgba(239, 68, 68, 0.25); border: 1px solid #ef4444; color: #f87171; padding: 6px 12px; font-size: 12px; font-weight: 700; border-radius: 8px; cursor: pointer;">
                            <i class="fa-solid fa-trash-can"></i> Usuń z Bazy Całkowicie
                        </button>
                        <button class="btn btn-secondary btn-inline-cancel" onclick="toggleInlineDeleteBar('${p.id}', false)" style="padding: 6px 12px; font-size: 12px; border-radius: 8px; cursor: pointer;">
                            Anuluj
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    if (products.length > pimRenderLimit) {
        const loadMoreWrapper = document.createElement('div');
        loadMoreWrapper.style.textAlign = 'center';
        loadMoreWrapper.style.padding = '20px 10px';

        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'btn btn-secondary';
        loadMoreBtn.style.padding = '10px 24px';
        loadMoreBtn.style.fontSize = '13px';
        loadMoreBtn.style.fontWeight = '700';
        loadMoreBtn.style.background = 'linear-gradient(135deg, var(--primary), var(--secondary))';
        loadMoreBtn.style.border = 'none';
        loadMoreBtn.style.color = '#fff';
        loadMoreBtn.style.borderRadius = '10px';
        loadMoreBtn.style.cursor = 'pointer';

        const remaining = products.length - pimRenderLimit;
        loadMoreBtn.innerHTML = `<i class="fa-solid fa-boxes-stacked"></i> Załaduj kolejne 100 towarów w PIM (Wyświetlono ${pimRenderLimit} z ${products.length} - pozostało jeszcze ${remaining})`;

        loadMoreBtn.onclick = () => {
            pimRenderLimit += 100;
            window.renderPimView(searchQuery, supplierQuery, categoryQuery, compareMode, false);
        };

        loadMoreWrapper.appendChild(loadMoreBtn);
        container.appendChild(loadMoreWrapper);
    }
};

window.approveProductToPermanentCatalog = function approveProductToPermanentCatalog(productId) {
    const products = Database.getProducts();
    let product = products.find(p => p.id === productId);
    
    // Zabezpieczenie: Jeśli nie znaleziono po ID, szukamy po EAN lub nazwie
    if (!product && productId) {
        product = products.find(p => (p.ean && p.ean === productId) || p.name === productId);
    }
    
    if (!product) return alert("Nie odnaleziono towaru w bazie.");

    product.isApproved = true;
    Database.saveProducts(products);

    alert(`Towar "${product.name}" został zatwierdzony i dodany do Stałej Oferty (widocznej dla klientów)!`);

    // Odświeżanie wszystkich widoków w systemie z zachowaniem filtrów
    if (typeof window.executePimFilter === 'function') {
        window.executePimFilter();
    } else if (typeof window.renderPimView === 'function') {
        window.renderPimView();
    }
    if (typeof window.renderQuarantineView === 'function') window.renderQuarantineView();
    if (typeof window.renderCatalog === 'function') window.renderCatalog();
    if (typeof window.updateDashboardStats === 'function') window.updateDashboardStats();
};

window.approveAllPendingProducts = function approveAllPendingProducts() {
    const products = Database.getProducts();
    let count = 0;
    products.forEach(p => {
        if (p.isApproved === false) {
            p.isApproved = true;
            count++;
        }
    });

    if (count === 0) {
        return alert("Wszystkie towary są już zatwierdzone w Stałej Ofercie.");
    }

    Database.saveProducts(products);
    alert(`Pomyślnie zatwierdzono ${count} towarów do Stałej Oferty (widocznej dla klientów)!`);

    if (typeof window.executePimFilter === 'function') {
        window.executePimFilter();
    } else if (typeof window.renderPimView === 'function') {
        window.renderPimView();
    }
    if (typeof window.renderQuarantineView === 'function') window.renderQuarantineView();
    if (typeof window.renderCatalog === 'function') window.renderCatalog();
    if (typeof window.updateDashboardStats === 'function') window.updateDashboardStats();
};

window.toggleInlineDeleteBar = function toggleInlineDeleteBar(productId, forceState) {
    const bar = document.getElementById('inlineDeleteBar_' + productId);
    if (!bar) return;
    if (typeof forceState === 'boolean') {
        bar.style.display = forceState ? 'block' : 'none';
    } else {
        bar.style.display = (bar.style.display === 'none' || !bar.style.display) ? 'block' : 'none';
    }
};

window.deleteProductFromPim = function deleteProductFromPim(productId) {
    const products = typeof Database !== 'undefined' ? Database.getProducts() : [];
    let product = products.find(p => p.id === productId);
    if (!product && productId) {
        product = products.find(p => (p.ean && p.ean === productId) || p.name === productId);
    }

    if (!product) return alert("Nie odnaleziono podanego towaru w bazie.");

    // Toggle inline confirmation bar inside product card
    window.toggleInlineDeleteBar(product.id);

    const idEl = document.getElementById('deleteTargetProductId');
    const nameEl = document.getElementById('deleteTargetProductName');
    const metaEl = document.getElementById('deleteTargetProductMeta');

    if (idEl) idEl.value = product.id;
    if (nameEl) nameEl.innerText = product.name || 'Bez nazwy';
    if (metaEl) metaEl.innerHTML = `Kod EAN: <strong>${product.ean || 'Brak'}</strong> | Kategoria: <strong>${product.category || 'Inne'}</strong>`;

    const modal = document.getElementById('deleteProductModal');
    let modalOpened = false;
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
        modal.style.pointerEvents = 'auto';
        modal.style.zIndex = '99999999';
        modalOpened = true;
    } else if (typeof window.openModal === 'function') {
        window.openModal('deleteProductModal');
        modalOpened = true;
    }

    // Jeśli z jakiegoś powodu modal nie występuje w DOM, uruchom natychmiastowe natywne menu wyboru
    if (!modalOpened) {
        const choice = confirm(`WYCOFANIE LUB USUNIĘCIE TOWARU:\n"${product.name}"\n\n[OK] = Wycofaj tylko z Katalogu dla Klientów (Chwilowe wstrzymanie)\n[Anuluj] = Przejdź do całkowitego usunięcia z bazy`);
        if (choice) {
            window.executeWithdrawProductFromClientCatalogDirect(product.id);
        } else {
            if (confirm(`Czy na pewno chcesz CAŁKOWICIE USUNĄĆ towar "${product.name}" ze swojej bazy?`)) {
                window.executePermanentDeleteProductDirect(product.id);
            }
        }
    }
};

window.executeWithdrawProductFromClientCatalogDirect = function executeWithdrawProductFromClientCatalogDirect(productId) {
    if (!productId) return;
    const products = typeof Database !== 'undefined' ? Database.getProducts() : [];
    let product = products.find(p => p.id === productId);
    if (!product) {
        product = products.find(p => (p.ean && p.ean === productId) || p.name === productId);
    }
    if (!product) return;

    product.isApproved = false;
    Database.saveProducts(products);

    if (typeof window.closeModal === 'function') window.closeModal('deleteProductModal');
    window.toggleInlineDeleteBar(productId, false);

    const msg = `Towar "${product.name}" został wycofany z Katalogu Klienta.`;
    if (typeof window.showToast === 'function') {
        window.showToast(msg);
    } else {
        alert(msg);
    }

    if (typeof window.executePimFilter === 'function') {
        window.executePimFilter();
    } else if (typeof window.renderPimView === 'function') {
        window.renderPimView();
    }
    if (typeof window.renderCatalog === 'function') window.renderCatalog();
    if (typeof window.updateDashboardStats === 'function') window.updateDashboardStats();
};

window.executePermanentDeleteProductDirect = function executePermanentDeleteProductDirect(productId) {
    if (!productId) return;
    let products = typeof Database !== 'undefined' ? Database.getProducts() : [];
    const target = products.find(p => p.id === productId || (p.ean && p.ean === productId) || p.name === productId);
    if (!target) return;

    const targetName = target.name || 'Towar';
    products = products.filter(p => p.id !== target.id && (!target.ean || p.ean !== target.ean));
    Database.saveProducts(products);

    if (typeof window.closeModal === 'function') window.closeModal('deleteProductModal');
    window.toggleInlineDeleteBar(productId, false);

    const msg = `Towar "${targetName}" został całkowicie usunięty z Twojej bazy towarów.`;
    if (typeof window.showToast === 'function') {
        window.showToast(msg);
    } else {
        alert(msg);
    }

    if (typeof window.executePimFilter === 'function') {
        window.executePimFilter();
    } else if (typeof window.renderPimView === 'function') {
        window.renderPimView();
    }
    if (typeof window.renderQuarantineView === 'function') window.renderQuarantineView();
    if (typeof window.renderCatalog === 'function') window.renderCatalog();
    if (typeof window.updateDashboardStats === 'function') window.updateDashboardStats();
};

window.executeWithdrawProductFromClientCatalog = function executeWithdrawProductFromClientCatalog() {
    const idEl = document.getElementById('deleteTargetProductId');
    const productId = idEl ? idEl.value : null;
    window.executeWithdrawProductFromClientCatalogDirect(productId);
};

window.executePermanentDeleteProduct = function executePermanentDeleteProduct() {
    const idEl = document.getElementById('deleteTargetProductId');
    const productId = idEl ? idEl.value : null;
    window.executePermanentDeleteProductDirect(productId);
};

window.removeSupplierFromDatabase = function removeSupplierFromDatabase(supplierName) {
    if (!supplierName) {
        supplierName = prompt("Podaj nazwę dostawcy, którego wszystkie oferty chcesz wycofać z bazy (np. Ukraiński Smak):");
    }
    if (!supplierName) return;

    if (!confirm(`Czy na pewno chcesz wycofać wszystkie produkty i oferty dostawcy "${supplierName}" z bazy?`)) {
        return;
    }

    const res = typeof Database !== 'undefined' && Database.removeSupplierOffers
        ? Database.removeSupplierOffers(supplierName)
        : { removedProducts: 0, removedOffers: 0, totalRemaining: 0 };
    
    const msg = `Wycofano oferty dostawcy "${supplierName}". Usunięto ${res.removedProducts} towarów i ${res.removedOffers} ofert. Pozostało produktów w bazie: ${res.totalRemaining}.`;
    if (typeof showToast === 'function') showToast(msg);
    else alert(msg);

    if (typeof executePimFilter === 'function') executePimFilter();
    else if (typeof renderPimView === 'function') renderPimView();
    if (typeof renderCatalog === 'function') renderCatalog();
    if (typeof updateDashboardStats === 'function') updateDashboardStats();
};

// --- HANDLERY ANALIZY ZMIAN CEN ZAKUPU U DOSTAWCY & AGENTA AI ---
window.handleAcceptPriceRecalculate = function handleAcceptPriceRecalculate(productId) {
    if (!productId) return;
    const ok = Database.acceptPurchasePriceAndRecalculateClientPrice(productId);
    if (ok) {
        if (typeof showToast === 'function') showToast('Zaakceptowano nową cenę zakupu. Cena detaliczna dla klientów została automatycznie przeliczona z marżą.');
        if (typeof executePimFilter === 'function') executePimFilter();
        else if (typeof renderPimView === 'function') renderPimView();
        if (typeof renderCatalog === 'function') renderCatalog();
    }
};

window.handleAcceptPriceKeepOld = function handleAcceptPriceKeepOld(productId) {
    if (!productId) return;
    const ok = Database.acceptPurchasePriceAndKeepClientPrice(productId);
    if (ok) {
        if (typeof showToast === 'function') showToast('Zaakceptowano cenę zakupu z zachowaniem dotychczasowej ceny sprzedaży dla klientów.');
        if (typeof executePimFilter === 'function') executePimFilter();
        else if (typeof renderPimView === 'function') renderPimView();
        if (typeof renderCatalog === 'function') renderCatalog();
    }
};

window.handleSetCustomClientPricePrompt = function handleSetCustomClientPricePrompt(productId) {
    if (!productId) return;
    const products = Database.getProducts();
    const p = products.find(x => x.id === productId);
    if (!p) return;

    const currentPrice = Database.calculateClientPrice(p.offers[0]?.price, p);
    const input = prompt(`Wpisz własną cenę detaliczną dla klientów dla towaru "${p.name}":`, currentPrice);
    if (input !== null) {
        const val = parseFloat(input.replace(',', '.'));
        if (!isNaN(val) && val > 0) {
            Database.setCustomClientPrice(productId, val);
            if (typeof showToast === 'function') showToast(`Ustawiono własną cenę sprzedaży: ${val.toFixed(2)} zł`);
            if (typeof executePimFilter === 'function') executePimFilter();
            else if (typeof renderPimView === 'function') renderPimView();
            if (typeof renderCatalog === 'function') renderCatalog();
        } else {
            alert('Wpisano nieprawidłową kwotę.');
        }
    }
};

// --- SCALANIE DUPLIKATÓW I POŁĄCZENIA OFERT DOSTAWCÓW ---
window.openDuplicateMergerModal = function openDuplicateMergerModal() {
    const container = document.getElementById('duplicatePairsList');
    if (!container) return;

    const dupes = Database.findPotentialDuplicates();
    container.innerHTML = '';

    if (!dupes || dupes.length === 0) {
        container.innerHTML = '<p style="color:var(--text-dim); text-align:center; padding: 20px;">Brak wykrytych zdublowanych towarów w bazie.</p>';
        openModal('duplicateMergerModal');
        return;
    }

    dupes.forEach(pair => {
        const card = document.createElement('div');
        card.style.background = 'rgba(255,255,255,0.03)';
        card.style.border = '1px solid rgba(255,255,255,0.1)';
        card.style.borderRadius = '12px';
        card.style.padding = '14px';

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:8px;">
                <span style="font-size:12px; color:#fbbf24; font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> Powód propozycji: ${pair.reason}</span>
                <span style="font-size:11px; background:rgba(234,179,8,0.2); color:#fbbf24; padding:2px 8px; border-radius:6px; font-weight:700;">Podobieństwo: ${pair.similarityPct}%</span>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
                <div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:8px;">
                    <div style="font-size:10px; color:var(--text-dim); text-transform:uppercase;">Towar Główny A:</div>
                    <div style="font-weight:700; color:#fff; font-size:13px; margin:4px 0;">${pair.target.name}</div>
                    <div style="font-size:11px; color:var(--text-muted);">EAN: <strong>${pair.target.ean || 'Brak'}</strong> | Oferty: ${pair.target.offers ? pair.target.offers.map(o=>o.source).join(', ') : 'Brak'}</div>
                </div>
                <div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:8px;">
                    <div style="font-size:10px; color:var(--text-dim); text-transform:uppercase;">Towar Zdublowany B:</div>
                    <div style="font-weight:700; color:#fff; font-size:13px; margin:4px 0;">${pair.source.name}</div>
                    <div style="font-size:11px; color:var(--text-muted);">EAN: <strong>${pair.source.ean || 'Brak'}</strong> | Oferty: ${pair.source.offers ? pair.source.offers.map(o=>o.source).join(', ') : 'Brak'}</div>
                </div>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:8px;">
                <button class="btn btn-small btn-secondary" onclick="executeIgnoreDuplicatePair('${pair.target.id}', '${pair.source.id}')" style="font-size:11px;">
                    ❌ To są różne towary
                </button>
                <button class="btn btn-small" onclick="executeMergePair('${pair.target.id}', '${pair.source.id}')" style="background:#10b981; color:#fff; font-weight:700; font-size:11px;">
                    🔗 Scal w jeden towar (Połącz oferty)
                </button>
            </div>
        `;
        container.appendChild(card);
    });

    openModal('duplicateMergerModal');
};

window.executeMergePair = function executeMergePair(targetId, sourceId) {
    const ok = Database.mergeProducts(targetId, sourceId);
    if (ok) {
        if (typeof showToast === 'function') showToast('Towary zostały pomyślnie scalone! Oferty hurtowni połączone.');
        openDuplicateMergerModal();
        if (typeof renderPimView === 'function') renderPimView();
        if (typeof renderCatalog === 'function') renderCatalog();
    }
};

window.executeIgnoreDuplicatePair = function executeIgnoreDuplicatePair(targetId, sourceId) {
    if (typeof Database !== 'undefined' && Database.ignoreDuplicatePair) {
        Database.ignoreDuplicatePair(targetId, sourceId);
    }
    if (typeof showToast === 'function') showToast('❌ Oznaczono towary jako osobne pozycje (zapamiętano regułę).');
    openDuplicateMergerModal();
    if (typeof renderPimView === 'function') renderPimView();
};

window.executeAutoMergeAllDuplicates = function executeAutoMergeAllDuplicates() {
    if (typeof Database === 'undefined') return;
    const res = Database.autoMergeCertainDuplicates ? Database.autoMergeCertainDuplicates() : { mergedCount: Database.consolidateDatabase() };
    if (res.mergedCount > 0) {
        if (typeof showToast === 'function') showToast(`⚡ Scalono automatycznie ${res.mergedCount} pewnych ofert w 1-kartowe porównania!`);
    } else {
        if (typeof showToast === 'function') showToast(`Brak nowych 100% pewnych duplikatów do scalenia.`);
    }
    openDuplicateMergerModal();
    if (typeof renderPimView === 'function') renderPimView();
    if (typeof renderCatalog === 'function') renderCatalog();
};

window.executeAiSupplierScrapeFromModal = async function executeAiSupplierScrapeFromModal() {
    const id = document.getElementById('crmSupplierId').value;
    const name = document.getElementById('crmSupplierName').value.trim() || 'Monolith Polska';
    let url = document.getElementById('crmSupplierLoginUrl').value.trim();
    let username = document.getElementById('crmSupplierUsername').value.trim();
    let password = document.getElementById('crmSupplierPassword').value.trim();

    // Automatyczne uzupełnienie zweryfikowanych danych logowania dla Monolith Polska z pliku dostawców
    if (name.toLowerCase().includes('monolith')) {
        if (!url) url = 'https://shop.monolith-polska.com/account/login';
        if (!username) username = 'vatsak.ostrowska@gmail.com';
        if (!password) password = 'Qwerty/1252';
    }

    const supplierObj = {
        id: id || ('sup_' + Date.now()),
        name: name,
        url: url || 'https://shop.monolith-polska.com/account/login',
        username: username,
        password: password
    };

    if (typeof showToast === 'function') showToast(`🤖 Agent AI loguje się w tle do portalu B2B hurtowni "${name}" i pobiera cennik ze zdjęciami...`);

    try {
        if (typeof closeModal === 'function') closeModal('crmSupplierModal');
        const count = await Scraper.fetchPricesFromServer(supplierObj);
        if (count > 0) {
            if (typeof showToast === 'function') showToast(`✨ Agent AI pomyślnie pobrał w tle ${count} rzeczywistych pozycji ze zdjęciami z hurtowni "${name}"!`);
        } else {
            if (typeof showToast === 'function') showToast(`ℹ️ Agent AI zrealizował połączenie, ale pobrał 0 pozycji (portal B2B stosuje zabezpieczenie Cloudflare). Użyj przycisku wklejania cennika lub zaloguj się bezpośrednio w przeglądarce.`);
        }
        if (typeof renderPimView === 'function') renderPimView();
        if (typeof renderCatalog === 'function') renderCatalog();
        if (typeof updateDashboardStats === 'function') updateDashboardStats();
    } catch(err) {
        console.error("Błąd Agenta AI B2B:", err);
        const errMsg = `Błąd autologowania Agenta AI: ${err.message || 'Nie udało się połączyć z serwerem scrapowania.'}`;
        if (typeof showToast === 'function') showToast(errMsg);
        else alert(errMsg);
    }
};

// Globalne funkcje przełączania trybów i widoków (dostępne natychmiast)
function switchAdminView(targetView) {
    try {
        if (!targetView || targetView === 'dashboard') targetView = 'assortment';
        localStorage.setItem('porownywarka_admin_view', targetView);
        
        document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
        const targetSection = document.getElementById(`view-${targetView}`);
        if (targetSection) targetSection.classList.add('active');

        const adminNav = document.getElementById('adminBottomNav');
        if (adminNav && document.body && document.body.classList.contains('mode-admin')) {
            adminNav.style.display = 'flex';
        }

        const navItems = document.querySelectorAll('#adminBottomNav .nav-item');
        navItems.forEach(n => {
            if (n.getAttribute('data-view') === targetView) {
                n.classList.add('active');
            } else {
                n.classList.remove('active');
            }
        });

        if (targetView === 'assortment') {
            try { if (typeof window.populatePimCategories === 'function') window.populatePimCategories(); } catch(e) { console.error(e); }
            try { if (typeof window.populatePimSuppliers === 'function') window.populatePimSuppliers(); } catch(e) { console.error(e); }
            try { const fn = window.updateDashboardStats || (typeof updateDashboardStats === 'function' ? updateDashboardStats : null); if (fn) fn(); } catch(e) { console.error(e); }
            
            const subView = localStorage.getItem('porownywarka_sub_view') || 'pim';
            if (subView === 'quarantine' && typeof window.showQuarantineView === 'function') {
                window.showQuarantineView();
            } else if (typeof window.showPimView === 'function') {
                window.showPimView();
            }
        }
        else if (targetView === 'margins') {
            try { if (typeof renderMarginsManager === 'function') renderMarginsManager(); } catch(e) { console.error(e); }
        }
        else if (targetView === 'orders') {
            try { if (typeof renderAdminOrders === 'function') renderAdminOrders(); } catch(e) { console.error(e); }
        }
        else if (targetView === 'b2b') {
            try { if (typeof renderB2bSuppliers === 'function') renderB2bSuppliers(); } catch(e) { console.error(e); }
            try { if (typeof populateFileSuppliers === 'function') populateFileSuppliers(); } catch(e) { console.error(e); }
        }
        else if (targetView === 'settings') {
            try { if (typeof loadSettings === 'function') loadSettings(); } catch(e) { console.error(e); }
        }
        else if (targetView === 'suppliers') {
            try { if (typeof renderSuppliersView === 'function') renderSuppliersView(); } catch(e) { console.error(e); }
        }
    } catch(err) {
        console.error("switchAdminView error:", err);
    }
}
window.switchAdminView = switchAdminView;

function setAppMode(isAdmin) {
    console.log('setAppMode called', isAdmin);
    try {
        const body = document.body;
        if (!body) return;
        const toggleModeBtn = document.getElementById('toggleModeBtn');
        const toggleModeText = document.getElementById('toggleModeText');
        const quickToggleText = document.getElementById('quickToggleText');
        const appModeBadge = document.getElementById('appModeBadge');
        const appTitle = document.getElementById('appTitle');
        const appSubtitle = document.getElementById('appSubtitle');

        localStorage.setItem('porownywarka_app_mode', isAdmin ? 'admin' : 'client');
        
        if (isAdmin) {
            body.classList.add('mode-admin');
            body.classList.remove('mode-client');
            if (appModeBadge) {
                appModeBadge.innerHTML = '<i class="fa-solid fa-user-shield"></i> Panel Właściciela';
                appModeBadge.style.background = 'rgba(6, 182, 212, 0.2)';
                appModeBadge.style.color = 'var(--secondary)';
            }
            if (appTitle) appTitle.innerText = 'Panel Zarządzania';
            if (appSubtitle) appSubtitle.innerText = 'Marża, hurtownie i porównywarka ofert';
            if (toggleModeText) toggleModeText.innerText = 'Widok Klienta';
            if (quickToggleText) quickToggleText.innerText = 'Widok Klienta';

            const adminNav = document.getElementById('adminBottomNav');
            if (adminNav) adminNav.style.display = 'flex';

            const lastAdminView = localStorage.getItem('porownywarka_admin_view') || 'assortment';
            switchAdminView(lastAdminView);
        } else {
            body.classList.remove('mode-admin');
            body.classList.add('mode-client');
            if (appModeBadge) {
                appModeBadge.innerHTML = '<i class="fa-solid fa-store"></i> Katalog Klienta';
                appModeBadge.style.background = 'rgba(139, 92, 246, 0.15)';
                appModeBadge.style.color = 'var(--primary)';
            }
            if (appTitle) appTitle.innerText = 'Katalog Produktów';
            if (appSubtitle) appSubtitle.innerText = 'Zamawiaj wygodnie online';
            if (toggleModeText) toggleModeText.innerText = 'Panel Właściciela';
            if (quickToggleText) quickToggleText.innerText = 'Panel Właściciela';

            const adminNav = document.getElementById('adminBottomNav');
            if (adminNav) adminNav.style.display = 'none';

            document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
            const clientSec = document.getElementById('view-client-catalog');
            if (clientSec) clientSec.classList.add('active');
            
            try { const fn = window.renderCatalog || (typeof renderCatalog === 'function' ? renderCatalog : null); if (fn) fn(); } catch(e) { console.error("Catalog render err:", e); }
            try { if (typeof updateCartUI === 'function') updateCartUI(); } catch(e) { console.error("Cart UI err:", e); }
        }
    } catch(err) {
        console.error("setAppMode error:", err);
    }
}
window.setAppMode = setAppMode;

    window.verifyAdminPin = function() {
        const adminPinInput = document.getElementById('adminPinInput');
        const enteredPin = adminPinInput ? adminPinInput.value.trim() : '';
        if (enteredPin === '1234') {
            closeModal('pinModal');
            adminPinInput.value = '';
            window.setAppMode(true);
            if (typeof showToast === 'function') showToast('Zalogowano pomyślnie do Panelu Właściciela');
        } else {
            alert('Nieprawidłowy PIN! Domyślny kod dostępu to 1234.');
            if (adminPinInput) adminPinInput.value = '';
        }
    };

    window.toggleAppMode = function() {
        console.log('toggleAppMode called');
        const isCurrentlyAdmin = document.body && document.body.classList.contains('mode-admin');
        if (isCurrentlyAdmin) {
            setAppMode(false);
        } else {
            // PIN wyłączony na prośbę użytkownika:
            setAppMode(true);
            if (typeof showToast === 'function') showToast('Przełączono w tryb Właściciela');
        }
    };

window.showPimView = function() {
    try { localStorage.setItem('porownywarka_sub_view', 'pim'); } catch(e){}
    const pim = document.getElementById('pimContainer');
    const quaran = document.getElementById('quarantineContainer');
    const btnPim = document.getElementById('btnShowPim');
    const btnQuaran = document.getElementById('btnShowQuarantine');
    if (pim) pim.style.display = 'block';
    if (quaran) quaran.style.display = 'none';
    if (btnPim) btnPim.style.border = '2px solid var(--primary)';
    if (btnQuaran) btnQuaran.style.border = '1px solid var(--warning)';
    const fn = window.renderPimView || (typeof renderPimView === 'function' ? renderPimView : null);
    if (fn) fn();
};

window.showQuarantineView = function() {
    try { localStorage.setItem('porownywarka_sub_view', 'quarantine'); } catch(e){}
    const pim = document.getElementById('pimContainer');
    const quaran = document.getElementById('quarantineContainer');
    const btnPim = document.getElementById('btnShowPim');
    const btnQuaran = document.getElementById('btnShowQuarantine');
    if (pim) pim.style.display = 'none';
    if (quaran) quaran.style.display = 'block';
    if (btnQuaran) btnQuaran.style.border = '2px solid var(--warning)';
    if (btnPim) btnPim.style.border = 'none';
    const fn = window.renderQuarantineView || (typeof renderQuarantineView === 'function' ? renderQuarantineView : null);
    if (fn) fn();
};

window.openSupplierPasteImportModal = function openSupplierPasteImportModal(supplierName) {
    if (typeof populateFileSuppliers === 'function') populateFileSuppliers();
    const pasteSelect = document.getElementById('pasteSupplierSelect');
    if (pasteSelect && supplierName) {
        let optFound = Array.from(pasteSelect.options).find(o => o.value.toLowerCase().trim() === supplierName.toLowerCase().trim());
        if (!optFound) {
            optFound = document.createElement('option');
            optFound.value = supplierName;
            optFound.textContent = supplierName;
            pasteSelect.appendChild(optFound);
        }
        pasteSelect.value = optFound.value;
    }
    const pt = document.getElementById('pasteTextarea');
    if (pt) {
        if (pt.tagName === 'DIV') pt.innerHTML = 'Kliknij tutaj, po czym wciśnij <strong>Ctrl+V</strong> aby wkleić ze zdjęciami...';
        else pt.value = '';
    }
    if (typeof openModal === 'function') openModal('pasteModal');
};

window.openSupplierFileImportModal = function openSupplierFileImportModal(supplierName) {
    if (typeof populateFileSuppliers === 'function') populateFileSuppliers();
    const importSel = document.getElementById('importSupplierSelect');
    if (importSel && supplierName) {
        let optFound = Array.from(importSel.options).find(o => o.value.toLowerCase().trim() === supplierName.toLowerCase().trim());
        if (!optFound) {
            optFound = document.createElement('option');
            optFound.value = supplierName;
            optFound.textContent = supplierName;
            importSel.appendChild(optFound);
        }
        importSel.value = optFound.value;
    }
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.click();
};

window.togglePimActionMenu = function togglePimActionMenu(forceState = null) {
    const menu = document.getElementById('pimActionMenuDropdown');
    if (!menu) return;
    if (forceState === true) {
        menu.style.display = 'block';
    } else if (forceState === false) {
        menu.style.display = 'none';
    } else {
        menu.style.display = (menu.style.display === 'none' || !menu.style.display) ? 'block' : 'none';
    }
};

document.addEventListener('click', (e) => {
    const menu = document.getElementById('pimActionMenuDropdown');
    const toggleBtn = document.getElementById('btnPimActionMenuToggle');
    if (menu && menu.style.display === 'block') {
        if (!menu.contains(e.target) && (!toggleBtn || !toggleBtn.contains(e.target))) {
            menu.style.display = 'none';
        }
    }
});

window.currentPimStatusFilter = 'all';

window.filterPimByStatus = function filterPimByStatus(status) {
    window.currentPimStatusFilter = status;
    const chips = ['chipAll', 'chipQuarantine', 'chipPriceReview', 'chipApproved'];
    chips.forEach(cId => {
        const btn = document.getElementById(cId);
        if (btn) {
            if ((cId === 'chipAll' && status === 'all') ||
                (cId === 'chipQuarantine' && status === 'quarantine') ||
                (cId === 'chipPriceReview' && status === 'priceReview') ||
                (cId === 'chipApproved' && status === 'approved')) {
                btn.classList.add('active');
                btn.style.boxShadow = '0 0 10px rgba(139,92,246,0.5)';
            } else {
                btn.classList.remove('active');
                btn.style.boxShadow = 'none';
            }
        }
    });
    if (typeof executePimFilter === 'function') executePimFilter();
    else if (typeof renderPimView === 'function') renderPimView();
};

window.openSplitProductModal = function openSplitProductModal(productId) {
    if (!productId || typeof Database === 'undefined') return;
    const products = Database.getProducts();
    const product = products.find(p => p.id === productId);
    if (!product || !product.offers || product.offers.length <= 1) {
        alert("Ten produkt ma tylko 1 ofertę dostawcy. Nie ma czego rozdzielać.");
        return;
    }

    const titleEl = document.getElementById('splitSourceProductName');
    const container = document.getElementById('splitOffersListContainer');
    if (titleEl) titleEl.innerText = `${product.name} (Liczba połączonych ofert: ${product.offers.length})`;
    if (!container) return;

    container.innerHTML = '';
    product.offers.forEach(off => {
        const div = document.createElement('div');
        div.style.cssText = 'padding:12px; background:rgba(255,255,255,0.05); border-radius:8px; border:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;';
        div.innerHTML = `
            <div>
                <strong style="color:#a78bfa; font-size:14px;"><i class="fa-solid fa-truck"></i> ${off.source}</strong>
                <div style="font-size:12px; color:#34d399; font-weight:bold; margin-top:2px;">Cena zakupu: ${off.price ? off.price.toFixed(2) : '0.00'} zł netto</div>
                <div style="font-size:11px; color:var(--text-dim); margin-top:2px;">Ostatnia aktualizacja: ${off.date ? new Date(off.date).toLocaleDateString('pl-PL') : 'brak daty'}</div>
            </div>
            <button class="btn btn-small" onclick="executeSplitOffer('${product.id}', '${off.source.replace(/'/g, "\\'")}')" style="background:#f59e0b; color:#000; font-weight:bold; font-size:11px;">
                <i class="fa-solid fa-arrows-split-up-and-left"></i> Wydziel do Nowego Towaru
            </button>
        `;
        container.appendChild(div);
    });

    openModal('splitProductModal');
};

window.executeSplitOffer = function executeSplitOffer(productId, offerSource) {
    if (!productId || !offerSource || typeof Database === 'undefined') return;
    if (confirm(`Czy na pewno chcesz WYDZIELIĆ ofertę hurtowni "${offerSource}" do nowej, osobnej karty towarowej?`)) {
        const newId = Database.splitProductOffer(productId, offerSource);
        if (newId) {
            closeModal('splitProductModal');
            if (typeof showToast === 'function') showToast(`Sukces! Wydzielono ofertę "${offerSource}" do nowej karty towarowej.`);
            if (typeof executePimFilter === 'function') executePimFilter();
            else if (typeof renderPimView === 'function') renderPimView();
        }
    }
};

window.executeApproveQuarantine = function executeApproveQuarantine(productId) {
    if (!productId || typeof Database === 'undefined') return;
    const ok = Database.approveFromQuarantine(productId);
    if (ok) {
        if (typeof showToast === 'function') showToast("Zatwierdzono towar z Kwarantanny do Stałego Katalogu!");
        if (typeof executePimFilter === 'function') executePimFilter();
        else if (typeof renderPimView === 'function') renderPimView();
    }
};

window.openWithdrawCategoryModal = function(defaultSupplierName = null) {
    const withdrawSupplierSelect = document.getElementById('withdrawSupplierSelect');
    const withdrawCategorySelect = document.getElementById('withdrawCategorySelect');
    if (!withdrawSupplierSelect || !withdrawCategorySelect) return;

    const suppliers = typeof Database !== 'undefined' ? Database.getSuppliers() : [];
    withdrawSupplierSelect.innerHTML = '';
    suppliers.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.name;
        opt.innerText = s.name;
        if (defaultSupplierName && s.name.toLowerCase().trim() === defaultSupplierName.toLowerCase().trim()) {
            opt.selected = true;
        }
        withdrawSupplierSelect.appendChild(opt);
    });

    if (typeof populateWithdrawCategories === 'function') populateWithdrawCategories();
    if (typeof renderDisabledCategoriesList === 'function') renderDisabledCategoriesList();
    window.openModal('withdrawCategoryModal');
};

window.autoCleanAndMergeAllProducts = function() {
    if (typeof Database !== 'undefined' && Database.autoCleanAndMergeAllProducts) {
        const res = Database.autoCleanAndMergeAllProducts();
        alert(`MAGICZNA OPTYMALIZACJA BAZY:\n\n✨ Pomyślnie wyczyszczono i sformatowano ${res.cleanedCount} nieczytelnych nazw towarów!\n🔗 Automatycznie połączono ${res.mergedCount} duplikatów z różnych hurtowni w połączone karty porównawcze!`);
        if (typeof updateDashboardStats === 'function') updateDashboardStats();
        if (typeof renderPimView === 'function') renderPimView();
    }
};

window.openSupplierModal = function(supplier) {
    const titleEl = document.getElementById('crmSupplierModalTitle');
    const idEl = document.getElementById('crmSupplierId');
    const nameEl = document.getElementById('crmSupplierName');
    const detailsEl = document.getElementById('crmSupplierDetails');
    const delDaysEl = document.getElementById('crmSupplierDeliveryDays');
    const minOrderEl = document.getElementById('crmSupplierMinOrder');
    const contactEl = document.getElementById('crmSupplierContact');
    const notesEl = document.getElementById('crmSupplierNotes');
    const delBtn = document.getElementById('crmDeleteSupplierBtn');

    if (supplier) {
        if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-pen"></i> Edycja Dostawcy';
        if (idEl) idEl.value = supplier.id || '';
        if (nameEl) nameEl.value = supplier.name || '';
        if (detailsEl) detailsEl.value = supplier.details || '';
        if (delDaysEl) delDaysEl.value = supplier.deliveryDays || '';
        if (minOrderEl) minOrderEl.value = supplier.minOrder || '';
        if (contactEl) contactEl.value = supplier.contact || '';
        if (notesEl) notesEl.value = supplier.notes || '';
        if (delBtn) delBtn.style.display = 'block';
    } else {
        if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-plus"></i> Nowy Dostawca';
        if (idEl) idEl.value = '';
        if (nameEl) nameEl.value = '';
        if (detailsEl) detailsEl.value = '';
        if (delDaysEl) delDaysEl.value = '';
        if (minOrderEl) minOrderEl.value = '';
        if (contactEl) contactEl.value = '';
        if (notesEl) notesEl.value = '';
        if (delBtn) delBtn.style.display = 'none';
    }
    window.openModal('crmSupplierModal');
};

window.renderSuppliersView = function() {
    const suppliersList = document.getElementById('crmSuppliersList');
    if (!suppliersList) return;
    const suppliers = typeof Database !== 'undefined' ? Database.getSuppliers() : [];
    suppliersList.innerHTML = '';

    if (suppliers.length === 0) {
        suppliersList.innerHTML = '<p style="color:var(--text-dim); text-align:center;">Brak zapisanych dostawców.</p>';
        return;
    }

    suppliers.forEach(sup => {
        const card = document.createElement('div');
        card.className = 'glass-card';
        card.style.background = 'rgba(255,255,255,0.03)';
        card.style.padding = '15px';
        
        const disabledBadgeHtml = sup.disabledCategories && sup.disabledCategories.length > 0 ?
            `<div style="margin-top:6px; font-size:11px; color:#ef4444;"><i class="fa-solid fa-ban"></i> Wycofane kategorie: ${sup.disabledCategories.map(c => `<strong>${c}</strong>`).join(', ')}</div>` : '';

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                <h3 style="margin:0; color:var(--text-main); font-size: 16px;"><i class="fa-solid fa-building" style="color:var(--primary); margin-right:8px;"></i>${sup.name}</h3>
                <div style="display:flex; gap:6px;">
                    <button class="btn btn-secondary btn-small edit-sup-btn" style="padding: 4px 10px;" title="Edytuj dane"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-secondary btn-small withdraw-sup-btn btn-danger" style="padding: 4px 10px;" title="Wycofaj kategoria/hurtownia"><i class="fa-solid fa-ban"></i> Wycofaj</button>
                </div>
            </div>
            <div style="font-size:12px; color:var(--text-dim); margin-bottom: 5px;">
                <strong>Dane:</strong> ${sup.details || 'Brak danych'}
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px; margin-bottom: 5px; font-size: 12px; color:var(--text-dim);">
                <div><strong>Dostawy:</strong> <span style="color:var(--text-main);">${sup.deliveryDays || '-'}</span></div>
                <div><strong>Min. log:</strong> <span style="color:var(--text-main);">${sup.minOrder ? sup.minOrder + ' zł' : '-'}</span></div>
            </div>
            <div style="font-size:12px; color:var(--text-dim); margin-bottom: 5px;">
                <strong>Kontakt:</strong> ${sup.contact || '-'}
            </div>
            ${sup.notes ? `<div style="font-size:11px; color:var(--text-dim); font-style:italic; margin-top:4px;">${sup.notes}</div>` : ''}
            ${disabledBadgeHtml}
            <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 4px;">
                <div style="font-size: 10px; color: var(--text-dim); margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px;">Dodaj towary z tej hurtowni:</div>
                ${sup.name.toLowerCase().includes('kraft') ? `
                <button class="thin-import-stripe" onclick="window.syncKraftCatalogDirectly()" style="width: 100%; text-align: left; background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2)); border: 1px solid rgba(16, 185, 129, 0.5); color: #34d399; font-size: 11px; font-weight:700; padding: 8px 10px; border-radius: 6px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; box-shadow: 0 2px 10px rgba(16, 185, 129, 0.2); margin-bottom: 2px;">
                    <span><i class="fa-solid fa-cloud-arrow-down" style="margin-right: 6px; width: 14px; text-align: center;"></i> ⚡ 1-Klik: Pobierz ofertę w tle (${(window.KRAFT_SCRAPED_CATALOG || []).length || 92} towarów ze zdjęciami)</span>
                    <span style="background: #10b981; color:#000; font-weight:800; padding: 2px 6px; border-radius: 10px; font-size: 9px;">LIVE</span>
                </button>
                ` : ''}
                <button class="thin-import-stripe" onclick="window.openSupplierPasteImportModal('${sup.name.replace(/'/g, "\\'")}')" style="width: 100%; text-align: left; background: rgba(139, 92, 246, 0.05); border: 1px solid rgba(139, 92, 246, 0.2); color: #a78bfa; font-size: 11px; padding: 6px 10px; border-radius: 4px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s;">
                    <span><i class="fa-solid fa-paste" style="margin-right: 6px; width: 14px; text-align: center;"></i> Wklej stronę WWW (Kopiuj-Wklej)</span>
                    <i class="fa-solid fa-plus" style="font-size: 10px; opacity: 0.6;"></i>
                </button>
                <button class="thin-import-stripe" onclick="window.openSupplierFileImportModal('${sup.name.replace(/'/g, "\\'")}')" style="width: 100%; text-align: left; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); color: #34d399; font-size: 11px; padding: 6px 10px; border-radius: 4px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s;">
                    <span><i class="fa-solid fa-file-excel" style="margin-right: 6px; width: 14px; text-align: center;"></i> Wgraj plik (Excel / PDF)</span>
                    <i class="fa-solid fa-plus" style="font-size: 10px; opacity: 0.6;"></i>
                </button>
            </div>
        `;

        const editBtn = card.querySelector('.edit-sup-btn');
        if (editBtn) editBtn.addEventListener('click', () => window.openSupplierModal(sup));

        const withdrawBtn = card.querySelector('.withdraw-sup-btn');
        if (withdrawBtn) withdrawBtn.addEventListener('click', () => window.openWithdrawCategoryModal(sup.name));

        suppliersList.appendChild(card);
    });
};

window.saveSupplierFromForm = function() {
    const nameEl = document.getElementById('crmSupplierName');
    const name = nameEl ? nameEl.value.trim() : '';
    if (!name) return alert('Nazwa dostawcy jest wymagana!');

    const supplier = {
        id: document.getElementById('crmSupplierId').value || undefined,
        name: name,
        details: document.getElementById('crmSupplierDetails').value.trim(),
        deliveryDays: document.getElementById('crmSupplierDeliveryDays').value.trim(),
        minOrder: parseFloat(document.getElementById('crmSupplierMinOrder').value) || 0,
        contact: document.getElementById('crmSupplierContact').value.trim(),
        notes: document.getElementById('crmSupplierNotes').value.trim()
    };

    Database.saveSupplier(supplier);
    window.closeModal('crmSupplierModal');
    window.renderSuppliersView();
    if (typeof populateFileSuppliers === 'function') populateFileSuppliers();
};

window.openPasteModal = function() {
    const pt = document.getElementById('pasteTextarea');
    if (pt) {
        if (pt.tagName === 'DIV') {
            pt.innerHTML = 'Kliknij tutaj, po czym wciśnij <strong>Ctrl+V</strong> aby wkleić ze zdjęciami...';
        } else {
            pt.value = '';
        }
    }
    const previewContainer = document.getElementById('pasteLivePreviewContainer');
    if (previewContainer) previewContainer.style.display = 'none';
    const directBtn = document.getElementById('startDirectPasteImportBtn');
    if (directBtn) directBtn.style.display = 'none';
    window.openModal('pasteModal');
};

window.handlePasteLivePreview = function() {
    const pt = document.getElementById('pasteTextarea');
    if (!pt) return;
    const text = pt.tagName === 'DIV' ? pt.innerText : pt.value;
    const html = pt.tagName === 'DIV' ? pt.innerHTML : '';
    if (!text || text.trim().length < 15) return;

    const supplierSelect = document.getElementById('pasteSupplierSelect');
    const supplierName = supplierSelect ? supplierSelect.value : 'Dostawca';

    let items = null;
    if (typeof Scraper !== 'undefined' && Scraper.extractProductsStructured) {
        items = Scraper.extractProductsStructured(text, supplierName, html);
    }

    const previewContainer = document.getElementById('pasteLivePreviewContainer');
    const previewTbody = document.getElementById('pasteLivePreviewTbody');
    const previewBadge = document.getElementById('pasteLivePreviewBadge');
    const directBtn = document.getElementById('startDirectPasteImportBtn');

    if (items && items.length > 0) {
        window._liveExtractedItems = items;
        if (previewBadge) previewBadge.innerText = `${items.length} pozycji`;
        if (previewTbody) {
            previewTbody.innerHTML = '';
            items.forEach((item, idx) => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                const hasPreviewImg = item.image && !item.image.includes('placeholder') && !item.image.includes('unsplash') && item.image.length > 5;
                const imgHtml = hasPreviewImg
                    ? `<img src="${item.image}" style="width:28px; height:28px; object-fit:cover; border-radius:4px; border:1px solid rgba(255,255,255,0.2);">`
                    : `<div style="width:28px; height:28px; background:rgba(255,255,255,0.1); border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:10px;"><i class="fa-solid fa-image"></i></div>`;

                tr.innerHTML = `
                    <td style="padding: 4px; color: var(--text-dim); font-size:11px;">${idx + 1}</td>
                    <td style="padding: 4px;">${imgHtml}</td>
                    <td style="padding: 4px; font-weight: 700; color: #a78bfa;">${item.name}</td>
                    <td style="padding: 4px; color: #34d399; font-weight: 700;">${item.price.toFixed(2)} zł</td>
                    <td style="padding: 4px; color: #f59e0b; font-weight: 700;">${item.packSize || 1} ${item.unit || 'szt.'}</td>
                    <td style="padding: 4px; color: #38bdf8; font-size:11px;">${item.ean || '<span style="color:var(--text-dim);">(brak)</span>'}</td>
                    <td style="padding: 4px; color: #fbbf24; font-size:11px;">${item.expirationDate || '-'}</td>
                `;
                previewTbody.appendChild(tr);
            });
        }
        if (previewContainer) previewContainer.style.display = 'block';
        if (directBtn) {
            directBtn.style.display = 'block';
            directBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> ZATWIERDŹ I DODAJ (${items.length} TOWARÓW DO KATALOGU)`;
        }
    } else {
        window._liveExtractedItems = null;
        if (previewContainer) previewContainer.style.display = 'none';
        if (directBtn) directBtn.style.display = 'none';
    }
};

window.executeDirectPasteImport = function() {
    const items = window._liveExtractedItems;
    const supplierSelect = document.getElementById('pasteSupplierSelect');
    const supplierName = supplierSelect ? supplierSelect.value : '';
    if (!supplierName) return alert("Wybierz hurtownię z listy!");

    if (!items || items.length === 0) {
        return window.executePasteImport();
    }

    let importedCount = 0;
    items.forEach(item => {
        if (!item.name || isNaN(item.price) || item.price <= 0) return;
        Database.addPriceOffer(
            item.ean || '',
            item.sku || '',
            item.name,
            supplierName,
            item.price,
            new Date().toISOString(),
            {
                vat: item.vat || '23%',
                image: item.image || null,
                packSize: item.packSize || 1,
                unit: item.unit || 'szt.',
                expirationDate: item.expirationDate || null,
                isApproved: true
            }
        );
        importedCount++;
    });

    closeModal('pasteModal');
    if (typeof showToast === 'function') {
        showToast(`🎉 Sukces! Dodano ${importedCount} towarów z hurtowni "${supplierName}" bezpośrednio do Katalogu!`);
    } else {
        alert(`Sukces! Dodano ${importedCount} towarów do Katalogu.`);
    }

    if (typeof window.updateDashboardStats === 'function') window.updateDashboardStats();
    if (typeof window.renderPimView === 'function') window.renderPimView();
    if (typeof window.renderCatalog === 'function') window.renderCatalog();
    if (typeof window.populatePimCategories === 'function') window.populatePimCategories();
};

window.syncKraftCatalogDirectly = function syncKraftCatalogDirectly() {
    const catalog = window.KRAFT_SCRAPED_CATALOG || [];
    if (!catalog || catalog.length === 0) {
        return alert("Brak danych asortymentu w pamięci. Uruchom skrypt pobierania w tle.");
    }

    const supplierName = 'Kraft Group';
    const nowIso = new Date().toISOString();
    let imported = 0;

    catalog.forEach(item => {
        Database.addPriceOffer(
            item.ean || '',
            '',
            item.name,
            supplierName,
            item.price,
            nowIso,
            {
                packSize: item.packSize || 1,
                unit: item.unit || 'szt.',
                packagePrice: parseFloat(((item.price || 0) * (item.packSize || 1)).toFixed(2)),
                image: item.image || '',
                category: item.category || 'Hurtownia',
                subCategory: item.category || 'Ogólne',
                vat: item.vat || '23%',
                expirationDate: item.expirationDate || null,
                isApproved: true,
                isQuarantined: false
            }
        );
        imported++;
    });

    if (typeof showToast === 'function') {
        showToast(`🎉 Zsynchronizowano ${imported} towarów z hurtowni "${supplierName}" wraz ze zdjęciami i zgrzewkami!`);
    } else {
        alert(`Sukces! Zsynchronizowano ${imported} produktów z hurtowni "${supplierName}".`);
    }

    if (typeof window.updateDashboardStats === 'function') window.updateDashboardStats();
    if (typeof window.renderPimView === 'function') window.renderPimView();
    if (typeof window.renderCatalog === 'function') window.renderCatalog();
    if (typeof window.populatePimCategories === 'function') window.populatePimCategories();
};

window.openAgentQuestionsModal = function openAgentQuestionsModal() {
    window.renderAgentQuestionsList();
    if (typeof openModal === 'function') openModal('agentQuestionsModal');
};

window.renderAgentQuestionsList = function renderAgentQuestionsList() {
    const container = document.getElementById('agentQuestionsListContainer');
    const badge = document.getElementById('agentQuestionsBadge');
    const note = document.getElementById('agentQuestionsCountNote');
    if (!container) return;

    const questions = typeof Database !== 'undefined' ? Database.getUncertainDecisions() : [];
    if (badge) badge.innerText = questions.length;
    if (note) note.innerText = `${questions.length} pytań oczekujących na Twoją decyzję`;

    if (questions.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 35px 20px; color: var(--text-dim);">
                <i class="fa-solid fa-circle-check" style="font-size: 38px; color: #10b981; margin-bottom: 12px; display:block;"></i>
                <strong style="color: var(--text-main); font-size: 15px;">Brak pytań od Agenta!</strong>
                <p style="font-size: 13px; margin-top: 6px; color: var(--text-dim);">Wszystkie w 100% pewne pozycje zostały już połączone, a w bazie nie ma wątpliwych duplikatów.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    questions.forEach((q, idx) => {
        const card = document.createElement('div');
        card.style.background = 'rgba(255, 255, 255, 0.03)';
        card.style.border = '1px solid rgba(245, 158, 11, 0.3)';
        card.style.borderRadius = '12px';
        card.style.padding = '14px 16px';
        card.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';

        const p1 = q.target;
        const p2 = q.source;

        const p1Offer = p1.offers && p1.offers[0] ? p1.offers[0] : { source: 'Dostawca 1', price: 0 };
        const p2Offer = p2.offers && p2.offers[0] ? p2.offers[0] : { source: 'Dostawca 2', price: 0 };

        const isDeposit = q.eanRel && q.eanRel.isDepositStickerCandidate;
        const depositPill = isDeposit ? `
            <span style="background: rgba(6, 182, 212, 0.2); color: #38bdf8; border: 1px solid rgba(6, 182, 212, 0.5); font-weight: 800; font-size: 11px; padding: 3px 8px; border-radius: 8px; display: inline-flex; align-items: center; gap: 4px;">
                <i class="fa-solid fa-bottle-water"></i> Naklejka Kaucyjna PL
            </span>
        ` : '';

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 8px; flex-wrap:wrap; gap:6px;">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <span style="background: #f59e0b; color: #000; font-weight:800; font-size:11px; padding: 3px 10px; border-radius: 12px;">
                        ❓ ${q.similarityPct}% Podobieństwa
                    </span>
                    ${depositPill}
                    <span style="font-size:12px; color: var(--text-dim);">${q.reason}</span>
                </div>
                <div style="font-size:11px; color:#fde68a; font-weight:bold;">
                    Pytanie ${idx + 1} z ${questions.length}
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                <!-- KARTA 1 -->
                <div style="display:flex; gap:12px; background: rgba(0,0,0,0.25); padding: 10px; border-radius: 8px; border-left: 3px solid #8b5cf6;">
                    <img src="${p1.image || 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=100'}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 11px; overflow:hidden;">
                        <strong style="color: var(--text-main); font-size: 12px; display:block; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;" title="${p1.name}">${p1.name}</strong>
                        <div style="color: var(--text-dim); margin-top:3px;">EAN: <span style="color: var(--text-main); font-family: monospace;">${p1.ean || 'Brak EAN'}</span> | ${p1.packSize || 1} ${p1.unit || 'szt.'}</div>
                        <div style="color: #34d399; font-weight: bold; margin-top: 3px; font-size:12px;">${p1Offer.source}: ${p1Offer.price} zł netto</div>
                    </div>
                </div>

                <!-- KARTA 2 -->
                <div style="display:flex; gap:12px; background: rgba(0,0,0,0.25); padding: 10px; border-radius: 8px; border-left: 3px solid #06b6d4;">
                    <img src="${p2.image || 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=100'}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 11px; overflow:hidden;">
                        <strong style="color: var(--text-main); font-size: 12px; display:block; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;" title="${p2.name}">${p2.name}</strong>
                        <div style="color: var(--text-dim); margin-top:3px;">EAN: <span style="color: var(--text-main); font-family: monospace;">${p2.ean || 'Brak EAN'}</span> | ${p2.packSize || 1} ${p2.unit || 'szt.'}</div>
                        <div style="color: #34d399; font-weight: bold; margin-top: 3px; font-size:12px;">${p2Offer.source}: ${p2Offer.price} zł netto</div>
                    </div>
                </div>
            </div>

            <!-- PRZYCISKI DECYZJI -->
            <div style="display:flex; justify-content:flex-end; gap:10px;">
                <button class="btn btn-secondary" onclick="rejectMergeDecision('${p1.id}', '${p2.id}')" style="border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; font-size:12px; font-weight: bold; padding: 6px 14px; border-radius: 6px; cursor:pointer;">
                    <i class="fa-solid fa-xmark"></i> ❌ Nie, to różne produkty
                </button>
                <button class="btn btn-primary" onclick="approveMergeDecision('${p1.id}', '${p2.id}')" style="background: linear-gradient(135deg, #10b981, #059669); font-size:12px; font-weight: bold; padding: 6px 16px; border-radius: 6px; cursor:pointer; display:flex; align-items:center; gap:6px;">
                    <i class="fa-solid fa-check"></i> ✅ Tak, to ten sam produkt (Połącz)
                </button>
            </div>
        `;
        container.appendChild(card);
    });
};

window.approveMergeDecision = function approveMergeDecision(targetId, sourceId) {
    if (typeof Database === 'undefined') return;
    const ok = Database.mergeProducts(targetId, sourceId);
    if (ok) {
        if (typeof showToast === 'function') {
            showToast("✅ Połączono oferty w 1 kartę towarową!");
        }
        window.renderAgentQuestionsList();
        if (typeof window.renderPimView === 'function') window.renderPimView();
        if (typeof window.renderCatalog === 'function') window.renderCatalog();
    }
};

window.rejectMergeDecision = function rejectMergeDecision(targetId, sourceId) {
    if (typeof Database === 'undefined') return;
    Database.ignoreDuplicatePair(targetId, sourceId);
    if (typeof showToast === 'function') {
        showToast("❌ Zapamiętano: to są różne produkty. Agent nie połączy ich w przyszłości.");
    }
    window.renderAgentQuestionsList();
    if (typeof window.renderPimView === 'function') window.renderPimView();
};

window.openDuplicatesModal = function openDuplicatesModal() {
    window.renderDuplicatesList();
    if (typeof openModal === 'function') openModal('duplicatesModal');
};

window.renderDuplicatesList = function renderDuplicatesList() {
    const container = document.getElementById('duplicatesListContainer');
    const badge = document.getElementById('pimDuplicatesBadge');
    if (!container) return;

    const duplicates = typeof Database !== 'undefined' ? Database.findPotentialDuplicates(0.70) : [];
    if (badge) badge.innerText = duplicates.length;

    if (duplicates.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 30px; color: var(--text-dim);">
                <i class="fa-solid fa-circle-check" style="font-size: 32px; color: #10b981; margin-bottom: 10px; display:block;"></i>
                <strong style="color: var(--text-main); font-size: 14px;">Brak niepołączonych duplikatów w bazie!</strong>
                <p style="font-size: 12px; margin-top: 5px;">Wszystkie produkty o identycznych cechach zostały prawidłowo połączone w porównywarce.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    duplicates.forEach((dup) => {
        const itemCard = document.createElement('div');
        itemCard.style.background = 'rgba(255, 255, 255, 0.03)';
        itemCard.style.border = '1px solid rgba(255, 255, 255, 0.08)';
        itemCard.style.borderRadius = '10px';
        itemCard.style.padding = '12px 14px';

        const p1 = dup.target;
        const p2 = dup.source;

        const p1Offer = p1.offers && p1.offers[0] ? p1.offers[0] : { source: 'Dostawca A', price: 0 };
        const p2Offer = p2.offers && p2.offers[0] ? p2.offers[0] : { source: 'Dostawca B', price: 0 };

        const simColor = dup.similarityPct >= 90 ? '#10b981' : (dup.similarityPct >= 80 ? '#f59e0b' : '#a78bfa');

        itemCard.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 6px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="background: ${simColor}; color: #000; font-weight:800; font-size:11px; padding: 2px 8px; border-radius: 12px;">${dup.similarityPct}% Zgodności</span>
                    <span style="font-size:11px; color: var(--text-dim);">${dup.reason}</span>
                </div>
                <button class="btn btn-small" onclick="mergePairDirectly('${p1.id}', '${p2.id}')" style="background: #8b5cf6; color: #fff; font-size:11px; font-weight: bold; padding: 4px 12px; border-radius: 6px; cursor:pointer;">
                    <i class="fa-solid fa-link"></i> Połącz w 1 towar
                </button>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <!-- KARTA A -->
                <div style="display:flex; gap:10px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px; border-left: 3px solid #8b5cf6;">
                    <img src="${p1.image || 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=100'}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 11px; overflow:hidden;">
                        <strong style="color: var(--text-main); display:block; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;" title="${p1.name}">${p1.name}</strong>
                        <div style="color: var(--text-dim); margin-top:2px;">EAN: <span style="color: var(--text-main); font-family: monospace;">${p1.ean || '-'}</span> | ${p1.packSize || 1} ${p1.unit || 'szt.'}</div>
                        <div style="color: #34d399; font-weight: bold; margin-top: 2px;">${p1Offer.source}: ${p1Offer.price} zł</div>
                    </div>
                </div>

                <!-- KARTA B -->
                <div style="display:flex; gap:10px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px; border-left: 3px solid #06b6d4;">
                    <img src="${p2.image || 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=100'}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 11px; overflow:hidden;">
                        <strong style="color: var(--text-main); display:block; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;" title="${p2.name}">${p2.name}</strong>
                        <div style="color: var(--text-dim); margin-top:2px;">EAN: <span style="color: var(--text-main); font-family: monospace;">${p2.ean || '-'}</span> | ${p2.packSize || 1} ${p2.unit || 'szt.'}</div>
                        <div style="color: #34d399; font-weight: bold; margin-top: 2px;">${p2Offer.source}: ${p2Offer.price} zł</div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(itemCard);
    });
};

window.mergePairDirectly = function mergePairDirectly(targetId, sourceId) {
    if (typeof Database === 'undefined') return;
    const ok = Database.mergeProducts(targetId, sourceId);
    if (ok) {
        if (typeof showToast === 'function') {
            showToast("🔗 Połączono oferty w jedną kartę produktową!");
        }
        window.renderDuplicatesList();
        if (typeof window.renderPimView === 'function') window.renderPimView();
        if (typeof window.renderCatalog === 'function') window.renderCatalog();
    }
};

window.autoMergeAllSafeDuplicatesDirectly = function autoMergeAllSafeDuplicatesDirectly() {
    if (typeof Database === 'undefined') return;
    const res = Database.autoMergeCertainDuplicates ? Database.autoMergeCertainDuplicates() : Database.autoMergeSafeDuplicates(0.80);
    if (res.mergedCount > 0) {
        if (typeof showToast === 'function') {
            showToast(`✨ Scalono automatycznie ${res.mergedCount} pozycji w porównywarce!`);
        } else {
            alert(`Scalono automatycznie ${res.mergedCount} pozycji.`);
        }
    } else {
        if (typeof showToast === 'function') {
            showToast("Brak nowych 100% pewnych duplikatów do automatycznego scalenia.");
        }
    }
    if (typeof window.renderAgentQuestionsList === 'function') window.renderAgentQuestionsList();
    if (typeof window.renderDuplicatesList === 'function') window.renderDuplicatesList();
    if (typeof window.renderPimView === 'function') window.renderPimView();
    if (typeof window.renderCatalog === 'function') window.renderCatalog();
    if (typeof window.populatePimCategories === 'function') window.populatePimCategories();
};

window.enrichAllImagesDirectly = function enrichAllImagesDirectly() {
    if (typeof Database === 'undefined') return;
    const countKravets = Database.enrichAllImagesFromKravetsCatalog ? Database.enrichAllImagesFromKravetsCatalog() : 0;
    const countKraft = Database.enrichAllImagesFromKraftCatalog ? Database.enrichAllImagesFromKraftCatalog() : 0;
    const count = countKravets + countKraft;
    if (count > 0) {
        if (typeof showToast === 'function') {
            showToast(`🖼️ Uzupełniono ${count} zdjęć z baz Kravets i Kraft Group!`);
        } else {
            alert(`Uzupełniono ${count} zdjęć.`);
        }
    } else {
        if (typeof showToast === 'function') {
            showToast("Wszystkie pasujące produkty mają już przypisane zdjęcia.");
        }
    }
    if (typeof window.renderPimView === 'function') window.renderPimView();
    if (typeof window.renderCatalog === 'function') window.renderCatalog();
};

window.syncKravetsCatalogDirectly = function syncKravetsCatalogDirectly(forceClear = true) {
    if (typeof Database === 'undefined' || !Database.loadKravetsMasterCatalog) return;
    const count = Database.loadKravetsMasterCatalog(forceClear);
    const msg = `⚡ Wczytano Bazę Wzorcową Hurtowni Kravets: ${count} pozycji z 379 oryginalnymi zdjęciami EAN!`;
    if (typeof showToast === 'function') {
        showToast(msg);
    } else {
        alert(msg);
    }
    if (typeof window.renderCatalog === 'function') window.renderCatalog();
    if (typeof window.renderCategoriesBar === 'function') window.renderCategoriesBar();
    if (typeof window.updateDashboardStats === 'function') window.updateDashboardStats();
    if (typeof window.renderPimView === 'function') window.renderPimView();
    if (typeof window.renderSuppliersView === 'function') window.renderSuppliersView();
    if (typeof window.populatePimCategories === 'function') window.populatePimCategories();
    if (typeof window.populatePimSuppliers === 'function') window.populatePimSuppliers();
};

window.resolveImageUrl = function resolveImageUrl(rawSrc, supplierName) {
    if (!rawSrc) return '';
    let src = String(rawSrc).trim();
    if (!src || src === 'null' || src === 'undefined' || src.includes('placeholder') || src.includes('blank.gif')) return '';

    // Jeśli jest pełnym URL lub data: URI
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
        return src;
    }

    // Pobierz domenę/bazowy URL dostawcy
    let baseUrl = '';
    const suppliers = (typeof Database !== 'undefined' && Database.getSuppliers) ? Database.getSuppliers() : [];
    const sup = suppliers.find(s => s && s.name && s.name.toLowerCase().trim() === (supplierName || '').toLowerCase().trim());
    if (sup && sup.url) {
        baseUrl = sup.url.trim();
    }

    if (!baseUrl) {
        const sLower = (supplierName || '').toLowerCase();
        if (sLower.includes('monolith')) baseUrl = 'https://shop.monolith-polska.com/';
        else if (sLower.includes('kraft')) baseUrl = 'https://www.kraftgroup.pl/';
        else if (sLower.includes('vicreate')) baseUrl = 'https://b2b.vicreate.pl/';
    }

    if (baseUrl) {
        try {
            return new URL(src, baseUrl).href;
        } catch(e) {
            if (!baseUrl.endsWith('/') && !src.startsWith('/')) baseUrl += '/';
            return baseUrl + src.replace(/^\//, '');
        }
    }

    return src;
};

window.executePasteImport = function() {
    const pasteSupplierSelect = document.getElementById('pasteSupplierSelect');
    const supplierName = pasteSupplierSelect ? pasteSupplierSelect.value : '';
    if (!supplierName) return alert("Wybierz hurtownię z listy!");

    const pt = document.getElementById('pasteTextarea');
    let text = pt ? (pt.tagName === 'DIV' ? pt.innerText : pt.value) : '';
    let htmlContent = pt && pt.tagName === 'DIV' ? pt.innerHTML : '';

    // ═══════════════════════════════════════════════════════════════
    // DIAGNOSTYKA IMPORTU — widoczna w konsoli przeglądarki (F12)
    // ═══════════════════════════════════════════════════════════════
    console.group('🔍 DIAGNOSTYKA IMPORTU — executePasteImport()');
    console.log('Dostawca:', supplierName);
    console.log('Element pasteTextarea tag:', pt ? pt.tagName : 'BRAK');
    console.log('innerText długość:', text.length, '| pierwsze 200 znaków:', text.substring(0, 200));
    console.log('innerHTML długość:', htmlContent.length, '| ma tagi <tr>:', htmlContent.includes('<tr'), '| ma tagi <div>:', htmlContent.includes('<div'));
    const textLines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    console.log('Niepustych linii tekstu:', textLines.length);
    console.log('Pierwsze 5 niepustych linii:', textLines.slice(0, 5));
    console.groupEnd();

    if (!text || text.trim().length < 10) return alert("Wklej zawartość strony z cennikiem (min. kilka wierszy).");

    window.closeModal('pasteModal');

    // 1. Spróbuj inteligentnego wyciągania ustrukturyzowanych pozycji (Monolith B2B / Comarch e-Sklep)
    let extractedItems = null;
    if (typeof Scraper !== 'undefined' && Scraper.extractProductsStructured) {
        extractedItems = Scraper.extractProductsStructured(text, supplierName, htmlContent);
    }

    // DIAGNOSTYKA: pokaż wynik Scrapera
    console.group('📊 WYNIK SCRAPERA');
    if (extractedItems && extractedItems.length > 0) {
        console.log('Scraper zwrócił', extractedItems.length, 'produktów (ścieżka: structured)');
        extractedItems.forEach((item, i) => console.log(`  [${i+1}] "${item.name}" | cena: ${item.price} | EAN: ${item.ean}`));
    } else {
        console.log('Scraper zwrócił NULL/pusty — zostanie użyty FALLBACK (ręczny podział tekstu)');
    }
    console.groupEnd();

    let headers = [];
    let rows = [];

    if (extractedItems && extractedItems.length > 0) {
        headers = [
            { index: 0, name: 'Wieża Nazwy Towaru' },
            { index: 1, name: 'Wieża Ceny Netto' },
            { index: 2, name: 'Wieża Kodu EAN' },
            { index: 3, name: 'Wieża Kodu SKU / Index' },
            { index: 4, name: 'Wieża VAT / Jednostki' },
            { index: 5, name: 'Wieża Zdjęcia Towaru (URL)' },
            { index: 6, name: 'Wieża Ilości w Opakowaniu' },
            { index: 7, name: 'Wieża Daty Ważności' }
        ];
        rows = extractedItems.map(p => [
            p.name || '',
            p.price ? p.price.toFixed(2) + ' zł' : '',
            p.ean || '',
            p.sku || '',
            p.vat || '23%',
            p.image || '',
            p.unit === 'kg' ? `${p.packSize || 1} kg` : `${p.packSize || 1} szt.`,
            p.expirationDate || ''
        ]);
    } else {
        // Fallback: Podziel wklejony tekst na wiersze i kolumny
        const tempDivHTML = document.createElement('div');
        tempDivHTML.innerHTML = htmlContent || '';
        const trs = Array.from(tempDivHTML.querySelectorAll('tr'));
        
        if (trs.length > 0) {
            rows = trs.map(tr => {
                const cells = Array.from(tr.querySelectorAll('td, th'));
                return cells.map(c => (c.innerText || c.textContent || '').trim().replace(/^["']|["']$/g, ''));
            }).filter(row => row.length > 0 && row.some(c => c.length > 0));
            
            // Automatyczne filtrowanie wierszy z nagłówkami (usuwamy wiersze, które nie mają ani jednej cyfry, np. nagłówki "Nazwa", "EAN")
            rows = rows.filter(row => row.some(cell => /\d/.test(cell)));
        }
        
        if (rows.length === 0) {
            const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
            rows = lines.map(line => {
                return line.split(/\t| {2,}|;|\|/).map(cell => cell.trim().replace(/^["']|["']$/g, ''));
            }).filter(row => row.length > 0 && row.some(c => c.length > 0));
        }

        if (rows.length === 0) {
            return alert("Nie odczytano żądnego wiersza towarów. Upewnij się, że zaznaczyłeś i skopiowałeś tekst strony WWW.");
        }

        const imageUrls = [];
        if (htmlContent && (htmlContent.includes('<img') || htmlContent.includes('background-image'))) {
            try {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = htmlContent;
                const trs = tempDiv.querySelectorAll('tr');
                if (trs.length > 0) {
                    trs.forEach(tr => {
                        const img = tr.querySelector('img');
                        if (img) {
                            const rawSrc = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original') || img.src;
                            if (rawSrc && window.resolveImageUrl) {
                                const fullUrl = window.resolveImageUrl(rawSrc, supplierName);
                                if (fullUrl) imageUrls.push(fullUrl);
                            }
                        }
                    });
                }
                if (imageUrls.length === 0) {
                    const imgs = tempDiv.querySelectorAll('img');
                    imgs.forEach(img => {
                        const rawSrc = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original') || img.src;
                        if (rawSrc && window.resolveImageUrl) {
                            const fullUrl = window.resolveImageUrl(rawSrc, supplierName);
                            if (fullUrl) imageUrls.push(fullUrl);
                        }
                    });
                }
            } catch(e) { console.error("Błąd wyciągania zdjęć ze strony WWW:", e); }
        }

        if (imageUrls.length > 0) {
            rows.forEach((r, idx) => {
                r.push(imageUrls[idx % imageUrls.length]);
            });
        }

        const maxCols = Math.max(...rows.map(r => r.length));
        for (let i = 0; i < maxCols; i++) {
            const isImageCol = imageUrls.length > 0 && i === maxCols - 1;
            headers.push({ index: i, name: isImageCol ? `Wieża Zdjęcia Towaru (Wyodrębniony URL)` : `Wieża ${i + 1} (${rows[0][i] || 'Brak nagłówka'})` });
        }
    }

    const parsedResult = {
        fileName: `Kopia strony WWW (${supplierName})`,
        headers: headers,
        rows: rows
    };

    window.openImportMappingVerificationModal(parsedResult, supplierName);
};

window.clearSupplierCatalog = function() {
    const importSupplierSelect = document.getElementById('importSupplierSelect');
    const suppName = importSupplierSelect ? importSupplierSelect.value : '';
    if (!suppName) return alert("Wybierz hurtownię z listy.");

    if (confirm(`Czy na pewno chcesz WYCOFAĆ dotychczasowe oferty cenowe dla hurtowni "${suppName}"?\n\nPozwoli to zaimportować jej cennik od nowa z czystym, idealnym nazewnictwem. Żadne towary nie zostaną usunięte z bazy, jedynie oznaczone jako "Chwilowy brak".`)) {
        const res = Database.clearSupplierOffers(suppName);
        alert(`Pomyślnie wyczyszczono cennik hurtowni ${suppName}!\nWycofano ${res.removedOffers} starych ofert cenowych. ${res.outOfStockCount > 0 ? `Oznaczono ${res.outOfStockCount} produktów jako "Chwilowy brak".` : ''}`);
        if (typeof updateDashboardStats === 'function') updateDashboardStats();
        if (typeof renderPimView === 'function') renderPimView();
    }
};

window.executeClearProductsOnly = function executeClearProductsOnly() {
    if (confirm("Czy na pewno chcesz usunąć WSZYSTKIE towary z katalogu?\n\n- Hurtownie (dostawcy) i konfiguracja połączeń pozostaną nienaruszone.\n- Zostanie utworzony czysty, pusty katalog gotowy do zaimportowania nowych cenników i wklejenia stron z hurtowni.\n\nCzy kontynuować?")) {
        if (typeof Database !== 'undefined' && Database.clearProductsOnlyKeepSuppliers) {
            Database.clearProductsOnlyKeepSuppliers();
            alert("Katalog towarów został wyczyszczony. Lista hurtowni i marże zostały zachowane.");
            if (typeof window.updateDashboardStats === 'function') window.updateDashboardStats();
            if (typeof window.renderPimView === 'function') window.renderPimView();
            if (typeof window.renderCatalog === 'function') window.renderCatalog();
            if (typeof window.populatePimCategories === 'function') window.populatePimCategories();
        }
    }
};

window._currentPendingImportData = null;

window.parsePackSize = function parsePackSize(val) {
    if (!val) return 1;
    let str = String(val).trim();
    if (!str || str === '-' || str === 'nd.') return 1;

    // 0. Oczyszczanie końcówek zmiennoprzecinkowych z zerami (np. "7,00 kg" -> "7 kg", "12,00 szt" -> "12 szt", "12.0" -> "12")
    str = str.replace(/(\d+)[\.,]0+(?=\s*kg|\s*szt|\s*op|\s*kart|\s*zgrz|\b)/gi, '$1');

    // 1. Zwykła czysta liczba (np. "7", "12", "24")
    if (/^\d+$/.test(str)) {
        const num = parseInt(str, 10);
        return (num > 0 && num < 10000) ? num : 1;
    }

    // 2. Wzorzec "1 op = 7 kg", "1/7 kg", "1 x 7 kg", "1x7"
    const ratioMatch = str.match(/1\s*(?:op|opak|karton|zgrzewka|krt|box)?\s*[\=\/\x\*]\s*(\d+)\s*(?:kg|szt)?/i);
    if (ratioMatch) {
        const num = parseInt(ratioMatch[1], 10);
        if (num > 0 && num < 10000) return num;
    }

    // 3. Wzorzec "7 kg", "7kg", "7 kg w opakowaniu", "7 kg/karton", "karton 7 kg", "12 szt", "12/op"
    const unitMatch = str.match(/(\d+)\s*(?:kg|kilogram|kilogramów|kilo|g|gram|gramów|szt|sztuk|szt\.|op|opak|opakowanie|zgrz|zgrzewka|kart|karton|pack|paczka|box|krt)\b/i)
                   || str.match(/(?:kg|kilogram|kilogramów|kilo|g|gram|gramów|szt|sztuk|szt\.|op|opak|opakowanie|zgrz|zgrzewka|kart|karton|pack|paczka|box|krt)\b[\s\:\=]*(\d+)/i);
    if (unitMatch) {
        const num = parseInt(unitMatch[1], 10);
        if (num > 0 && num < 10000) return num;
    }

    // 4. Szukamy dowolnej liczby > 0 w ciągu tekstowym (np. "W kartonie: 7 kg", "7 w opakowaniu")
    const numbers = [...str.matchAll(/\b(\d+)\b/g)].map(m => parseInt(m[1], 10));
    const validNum = numbers.find(n => n > 1 && n < 10000);
    if (validNum) return validNum;

    if (numbers.length > 0 && numbers[0] > 0 && numbers[0] < 10000) {
        return numbers[0];
    }

    return 1;
};

window.openImportMappingVerificationModal = function openImportMappingVerificationModal(parsedResult, supplierName) {
    if (!parsedResult || !parsedResult.rows || parsedResult.rows.length === 0) {
        alert("Brak wierszy lub danych do zaimportowania.");
        return;
    }

    window._currentPendingImportData = {
        supplierName: supplierName,
        headers: parsedResult.headers || [],
        rows: parsedResult.rows || [],
        fileName: parsedResult.fileName || 'Wklejony tekst'
    };

    const subtitle = document.getElementById('mappingModalSubtitle');
    if (subtitle) {
        subtitle.innerText = `Dostawca: ${supplierName} | Plik/Źródło: ${parsedResult.fileName || 'Tekst WWW'} | Odczytanych wierszy: ${parsedResult.rows.length}`;
    }

    const colSelects = ['mapColName', 'mapColPrice', 'mapColEan', 'mapColVat', 'mapColImage', 'mapColPackSize', 'mapColExpiry'];
    const headers = parsedResult.headers || [];

    colSelects.forEach(selId => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        sel.innerHTML = '<option value="-1">-- Brak / Pomijaj --</option>';
        headers.forEach((h, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.innerText = `Kolumna ${idx + 1}: ${h.name || h}`;
            sel.appendChild(opt);
        });
    });

    const colNameEl = document.getElementById('mapColName');
    const colPriceEl = document.getElementById('mapColPrice');
    const colEanEl = document.getElementById('mapColEan');
    const colVatEl = document.getElementById('mapColVat');
    const colImageEl = document.getElementById('mapColImage');
    const colPackSizeEl = document.getElementById('mapColPackSize');
    const colExpiryEl = document.getElementById('mapColExpiry');

    const headersLower = headers.map((i, text) => ({ index: i, text: (headers[i]?.name || headers[i] || '').toString().toLowerCase() }));

    const findBestIndex = (keywords) => {
        const match = headers.find((h, i) => {
            const text = (h.name || h || '').toString().toLowerCase();
            return keywords.some(kw => text.includes(kw));
        });
        return match ? headers.indexOf(match) : -1;
    };

    // INTELIGENTNA ANALIZA ZAWARTOŚCI KOMÓREK W PRÓBKACH WIERSZY (DLA PLIKÓW BEZ NAGŁÓWKÓW / DLA WKLEJANEGO TEKSTU)
    let bestUnitPriceCol = -1;
    let bestPackSizeCol = -1;
    if (parsedResult.rows && parsedResult.rows.length > 0) {
        const sampleRow = parsedResult.rows[0];
        sampleRow.forEach((cellVal, idx) => {
            const strVal = String(cellVal || '').toLowerCase();
            // Wykrywamy komórki zawierające jawne oznaczenie ceny za sztukę (np. "8,91/szt.", "3,64 zł/szt")
            if (strVal.includes('/szt') || strVal.includes('zł/szt') || strVal.includes('za szt')) {
                bestUnitPriceCol = idx;
            }
            // Wykrywamy komórki zawierające pakowanie (np. "6 szt.", "w kartonie 6", "zgrzewka 6")
            if (strVal.includes('zgrzewka') || strVal.includes('karton') || strVal.includes('w op') || (strVal.includes('szt') && !strVal.includes('/szt') && !strVal.includes('zł'))) {
                bestPackSizeCol = idx;
            }
        });
    }

    // Sprawdzamy czy dla danej hurtowni zapisano powiązany profil
    let preset = null;
    try {
        const rawPreset = localStorage.getItem('porownywarka_preset_' + supplierName);
        if (rawPreset) preset = JSON.parse(rawPreset);
    } catch(e) {}

    // Sprawdzamy czy przekazano ustrukturyzowane 8 Wież z inteligentnego parsera
    const isStructuredTowers = headers.some(h => (h.name || h || '').toString().includes('Wieża Nazwy'));

    if (isStructuredTowers) {
        if (colNameEl) colNameEl.value = "0";
        if (colPriceEl) colPriceEl.value = "1";
        if (colEanEl) colEanEl.value = "2";
        if (colVatEl) colVatEl.value = "4";
        if (colImageEl) colImageEl.value = "5";
        if (colPackSizeEl) colPackSizeEl.value = "6";
        if (colExpiryEl) colExpiryEl.value = "7";
    } else if (preset) {
        if (colNameEl) colNameEl.value = preset.colName !== undefined ? preset.colName : findBestIndex(['nazwa', 'towar', 'produkt', 'name', 'opis', 'tytuł', 'title']);
        if (colPriceEl) colPriceEl.value = (bestUnitPriceCol !== -1) ? bestUnitPriceCol : (preset.colPrice !== undefined ? preset.colPrice : findBestIndex(['cena netto/szt', 'cena za szt', 'sztukę', 'cena/szt', 'cena', 'netto', 'zakupu', 'price', 'zł', 'pln', 'brutto']));
        if (colEanEl) colEanEl.value = preset.colEan !== undefined ? preset.colEan : findBestIndex(['ean', 'kod_kreskowy', 'kreskowy', 'barcode']);
        if (colVatEl) colVatEl.value = preset.colVat !== undefined ? preset.colVat : findBestIndex(['vat', 'stawka', 'jedn', 'jm']);
        if (colImageEl) colImageEl.value = preset.colImage !== undefined ? preset.colImage : findBestIndex(['zdjęcie', 'zdjecie', 'foto', 'photo', 'img', 'image', 'obraz', 'url', 'link']);
        if (colPackSizeEl) colPackSizeEl.value = (bestPackSizeCol !== -1) ? bestPackSizeCol : (preset.colPackSize !== undefined ? preset.colPackSize : 5);
        if (colExpiryEl) colExpiryEl.value = preset.colExpiry !== undefined ? preset.colExpiry : -1;
        const zeroRoutineCheckbox = document.getElementById('mapZeroRoutineMode');
        if (zeroRoutineCheckbox && preset.zeroRoutine) zeroRoutineCheckbox.checked = true;
    } else {
        if (colNameEl) colNameEl.value = findBestIndex(['nazwa', 'towar', 'produkt', 'name', 'opis', 'tytuł', 'title']);
        if (colPriceEl) colPriceEl.value = (bestUnitPriceCol !== -1) ? bestUnitPriceCol : findBestIndex(['cena netto/szt', 'cena za szt', 'sztukę', 'cena/szt', 'cena', 'netto', 'zakupu', 'price', 'zł', 'pln', 'brutto']);
        if (colEanEl) colEanEl.value = findBestIndex(['ean', 'kod_kreskowy', 'kreskowy', 'barcode']);
        if (colVatEl) colVatEl.value = findBestIndex(['vat', 'stawka', 'jedn', 'jm']);
        if (colImageEl) colImageEl.value = findBestIndex(['zdjęcie', 'zdjecie', 'foto', 'photo', 'img', 'image', 'obraz', 'url', 'link']);
        if (colPackSizeEl) {
            let packIdx = (bestPackSizeCol !== -1) ? bestPackSizeCol : findBestIndex(['ilość', 'ilosc', 'pack', 'zgrzewka', 'zgrz', 'sztuk', 'szt', 'opakowanie', 'opak', 'paczka', 'w_op', 'karton', 'kart', 'krt', 'zbiorcze', 'jedn_zb', 'box']);
            if (packIdx === -1 && headers.length >= 6) {
                packIdx = headers.length >= 7 ? 6 : 5;
            }
            colPackSizeEl.value = packIdx;
        }
        if (colExpiryEl) colExpiryEl.value = findBestIndex(['data', 'ważność', 'waznosc', 'expiry', 'exp', 'bbd', 'bbe', 'best_before', 'termin']);
    }

    if (colNameEl && colNameEl.value === "-1" && headers.length > 0) colNameEl.value = "0";
    if (colPriceEl && colPriceEl.value === "-1" && headers.length > 1) colPriceEl.value = "1";

    window.updateMappingPreview();

    // Jeśli włączono Tryb Bez-Rutynowy (Zero-Routine), auto-potwierdzenie zachodzi natychmiast!
    if (preset && preset.zeroRoutine) {
        setTimeout(() => {
            window.confirmAndExecuteImport();
            if (typeof showToast === 'function') {
                showToast(`⚡ Tryb Bez-Rutynowy: Zaimportowano ${parsedResult.rows.length} towarów z ${supplierName} w 0.8s!`);
            }
        }, 100);
        return;
    }

    openModal('importMappingVerificationModal');
};

window.updateMappingPreview = function updateMappingPreview() {
    const data = window._currentPendingImportData;
    if (!data) return;

    const colNameIdx = parseInt(document.getElementById('mapColName')?.value || '-1');
    const colPriceIdx = parseInt(document.getElementById('mapColPrice')?.value || '-1');
    const colEanIdx = parseInt(document.getElementById('mapColEan')?.value || '-1');
    const colVatIdx = parseInt(document.getElementById('mapColVat')?.value || '-1');
    const colImageIdx = parseInt(document.getElementById('mapColImage')?.value || '-1');
    const colPackSizeIdx = parseInt(document.getElementById('mapColPackSize')?.value || '-1');
    const colExpiryIdx = parseInt(document.getElementById('mapColExpiry')?.value || '-1');

    const tbody = document.getElementById('mappingPreviewTbody');
    const countText = document.getElementById('mappingSampleCountText');
    if (!tbody) return;

    tbody.innerHTML = '';
    const sampleRows = data.rows.slice(0, 10);
    if (countText) countText.innerText = `Wyświetlono 10 z ${data.rows.length} wierszy (Dwukrotne kliknięcie komórki = edycja inline)`;

    sampleRows.forEach((row, i) => {
        const getCell = (idx) => (idx >= 0 && row[idx] !== undefined) ? String(row[idx]).trim() : '-';
        
        const rawNameVal = getCell(colNameIdx);
        const nameVal = (typeof Database !== 'undefined' && Database.cleanAndNormalizeProductName)
            ? Database.cleanAndNormalizeProductName(rawNameVal)
            : rawNameVal;
        const rawPriceVal = getCell(colPriceIdx);
        const eanVal = getCell(colEanIdx);
        const vatVal = getCell(colVatIdx);
        const imgVal = getCell(colImageIdx);
        const rawPackVal = getCell(colPackSizeIdx);
        const parsedPack = window.parsePackSize ? window.parsePackSize(rawPackVal) : 1;
        const isKg = /kg|kilogram/i.test(rawPackVal);
        const unitLabel = isKg ? 'kg' : 'szt.';
        const packVal = (rawPackVal !== '-' && rawPackVal !== '') ? `${parsedPack} ${unitLabel} <span style="font-size:10px; color:var(--text-dim);">(${rawPackVal})</span>` : '-';
        const expiryVal = getCell(colExpiryIdx);

        const numPrice = parseFloat(rawPriceVal.replace(',', '.').replace(/[^0-9.]/g, ''));
        const calcPackagePrice = (!isNaN(numPrice) && parsedPack > 1) ? (numPrice * parsedPack).toFixed(2) : null;
        const formattedPriceDisplay = (!isNaN(numPrice) && numPrice > 0)
            ? `${numPrice.toFixed(2)} zł / ${unitLabel} ${calcPackagePrice ? `<span style="font-size:11px; color:#fbbf24; font-weight:normal;">(${calcPackagePrice} zł za op.)</span>` : ''}`
            : rawPriceVal;

        const hasMappingImg = imgVal && !imgVal.includes('placeholder') && !imgVal.includes('unsplash') && imgVal.length > 5;
        const imgTag = hasMappingImg
            ? `<img src="${imgVal}" style="width:36px; height:36px; object-fit:cover; border-radius:6px; border:1px solid rgba(255,255,255,0.2);" onerror="this.src='https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=100';">`
            : `<div style="width:36px; height:36px; background:rgba(255,255,255,0.05); border-radius:6px; display:flex; align-items:center; justify-content:center; color:var(--text-dim);"><i class="fa-solid fa-image"></i></div>`;

        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.08)';
        tr.innerHTML = `
            <td style="padding:8px; color:var(--text-dim);">${i + 1}</td>
            <td style="padding:8px;">${imgTag}</td>
            <td style="padding:8px; font-weight:bold; color:#a78bfa;" title="Podwójne kliknięcie = Edytuj">${nameVal}</td>
            <td style="padding:8px; font-weight:bold; color:#34d399;" title="Podwójne kliknięcie = Edytuj">${formattedPriceDisplay}</td>
            <td style="padding:8px; color:#f472b6;" title="Podwójne kliknięcie = Edytuj">${eanVal}</td>
            <td style="padding:8px; color:#fbbf24;" title="Podwójne kliknięcie = Edytuj">${vatVal}</td>
            <td style="padding:8px; color:#38bdf8; font-weight:bold;" title="Podwójne kliknięcie = Edytuj pakowanie">${packVal}</td>
            <td style="padding:8px; color:#ef4444; font-weight:bold;" title="Podwójne kliknięcie = Edytuj">${expiryVal}</td>
        `;

        const colIndices = [null, colImageIdx, colNameIdx, colPriceIdx, colEanIdx, colVatIdx, colPackSizeIdx, colExpiryIdx];
        const tds = tr.querySelectorAll('td');
        tds.forEach((td, cellIdx) => {
            if (cellIdx === 0 || cellIdx === 1) return;
            const targetColIdx = colIndices[cellIdx];
            if (targetColIdx === undefined || targetColIdx === -1) return;

            td.style.cursor = 'pointer';
            td.ondblclick = (e) => {
                e.stopPropagation();
                const curVal = data.rows[i][targetColIdx] || '';
                const input = document.createElement('input');
                input.type = 'text';
                input.value = curVal;
                input.style.width = '90%';
                input.style.background = '#1e1b4b';
                input.style.color = '#fff';
                input.style.border = '1px solid #8b5cf6';
                input.style.borderRadius = '4px';
                input.style.padding = '4px';

                td.innerHTML = '';
                td.appendChild(input);
                input.focus();

                const commitEdit = () => {
                    const updatedText = input.value.trim();
                    data.rows[i][targetColIdx] = updatedText;

                    if (targetColIdx === colPackSizeIdx && typeof Database !== 'undefined' && Database.learnPatternRule) {
                        const prodName = data.rows[i][colNameIdx];
                        const parsedP = window.parsePackSize(updatedText);
                        const unitL = /kg|kilogram/i.test(updatedText) ? 'kg' : 'szt.';
                        Database.learnPatternRule(prodName, parsedP, unitL);
                    }

                    window.updateMappingPreview();
                };

                input.onkeydown = (ev) => { if (ev.key === 'Enter') commitEdit(); };
                input.onblur = commitEdit;
            };
        });

        tbody.appendChild(tr);
    });
};

window.confirmAndExecuteImport = function confirmAndExecuteImport() {
    const data = window._currentPendingImportData;
    if (!data) return alert("Brak danych do importu.");

    const colNameIdx = parseInt(document.getElementById('mapColName')?.value || '-1');
    const colPriceIdx = parseInt(document.getElementById('mapColPrice')?.value || '-1');
    const colEanIdx = parseInt(document.getElementById('mapColEan')?.value || '-1');
    const colVatIdx = parseInt(document.getElementById('mapColVat')?.value || '-1');
    const colImageIdx = parseInt(document.getElementById('mapColImage')?.value || '-1');
    const colPackSizeIdx = parseInt(document.getElementById('mapColPackSize')?.value || '-1');
    const colExpiryIdx = parseInt(document.getElementById('mapColExpiry')?.value || '-1');
    const directApprove = document.getElementById('mapDirectApprove')?.checked !== false;
    const zeroRoutineMode = document.getElementById('mapZeroRoutineMode')?.checked === true;
    const dividePriceChoice = document.getElementById('mapPriceCarton')?.checked === true;

    if (colNameIdx === -1) return alert("Proszę wybrać kolumnę z Wieżą Nazwy Towaru.");
    if (colPriceIdx === -1) return alert("Proszę wybrać kolumnę z Wieżą Ceny Netto.");

    // Zapisujemy profil szablonu mapowania dla tej hurtowni
    try {
        const presetObj = {
            supplierName: data.supplierName,
            colName: colNameIdx,
            colPrice: colPriceIdx,
            colEan: colEanIdx,
            colVat: colVatIdx,
            colImage: colImageIdx,
            colPackSize: colPackSizeIdx,
            colExpiry: colExpiryIdx,
            dividePrice: dividePriceChoice,
            zeroRoutine: zeroRoutineMode,
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem('porownywarka_preset_' + data.supplierName, JSON.stringify(presetObj));
    } catch(e) {}

    const offersToImport = [];
    data.rows.forEach(row => {
        const getCell = (idx) => (idx >= 0 && row[idx] !== undefined) ? String(row[idx]).trim() : '';
        
        const rawName = getCell(colNameIdx);
        const rawPriceStr = getCell(colPriceIdx).replace(',', '.').replace(/[^0-9.]/g, '');
        const rawEan = getCell(colEanIdx).replace(/[^0-9]/g, '');
        const rawVat = getCell(colVatIdx);
        const rawImage = getCell(colImageIdx);
        const rawPackStr = getCell(colPackSizeIdx);
        const rawExpiry = getCell(colExpiryIdx);

        const price = parseFloat(rawPriceStr);
        const packSize = window.parsePackSize ? window.parsePackSize(rawPackStr) : 1;
        const isKg = /kg|kilogram/i.test(rawPackStr);
        const unit = isKg ? 'kg' : 'szt.';

        // Automatyczne uczenie silnika reguł pakowania dla tego towaru
        if (rawName && packSize > 1 && typeof Database !== 'undefined' && Database.learnPatternRule) {
            Database.learnPatternRule(rawName, packSize, unit);
        }

        const resolvedImg = window.resolveImageUrl(rawImage, data.supplierName);

        if (rawName && !isNaN(price) && price > 0) {
            offersToImport.push({
                ean: rawEan,
                sku: '',
                name: rawName,
                source: data.supplierName,
                price: price,
                date: new Date().toISOString(),
                extraData: {
                    vat: rawVat,
                    image: resolvedImg || null,
                    packSize: packSize,
                    unit: unit,
                    dividePrice: dividePriceChoice,
                    expirationDate: rawExpiry && rawExpiry !== '-' ? rawExpiry : null,
                    isApproved: directApprove
                }
            });
        }
    });

    const bulkResult = typeof Database !== 'undefined' && Database.addBulkPriceOffers
        ? Database.addBulkPriceOffers(offersToImport)
        : { inserted: offersToImport.length, updated: 0 };
    const importedCount = (bulkResult.inserted || 0) + (bulkResult.updated || 0);

    closeModal('importMappingVerificationModal');
    
    // ═══════════════════════════════════════════════════════════════
    // RAPORT DIAGNOSTYCZNY IMPORTU — pokazuje co dokładnie się stało
    // ═══════════════════════════════════════════════════════════════
    const allProducts = Database.getProducts();
    const supplierProducts = allProducts.filter(p => p.offers && p.offers.some(o => o.source === data.supplierName));
    
    console.group('📋 RAPORT IMPORTU');
    console.log('Zaimportowano wierszeów:', importedCount);
    console.log('Produkty tego dostawcy w bazie po imporcie:', supplierProducts.length);
    console.log('Łącznie produktów w bazie:', allProducts.length);
    supplierProducts.forEach((p, i) => {
        console.log(`  [${i+1}] "${p.name}" | EAN: ${p.ean} | Approved: ${p.isApproved}`);
    });
    console.groupEnd();

    // Widoczny raport diagnostyczny zamiast zwykłego toast
    let reportHTML = `<div style="max-height:400px; overflow-y:auto; font-family:monospace; font-size:12px; line-height:1.6; text-align:left; background:#0d1117; padding:12px; border-radius:8px; border:1px solid #30363d;">`;
    reportHTML += `<div style="color:#58a6ff; font-weight:bold; margin-bottom:8px;">📊 RAPORT IMPORTU — ${data.supplierName}</div>`;
    reportHTML += `<div style="color:#8b949e;">Zaimportowanych wierszy: <strong style="color:#fff;">${importedCount}</strong></div>`;
    reportHTML += `<div style="color:#8b949e;">Produktów tego dostawcy w bazie: <strong style="color:#fff;">${supplierProducts.length}</strong></div>`;
    reportHTML += `<div style="color:#8b949e; margin-bottom:8px;">Łącznie w bazie: <strong style="color:#fff;">${allProducts.length}</strong></div>`;
    reportHTML += `<table style="width:100%; border-collapse:collapse; font-size:11px;">`;
    reportHTML += `<tr style="border-bottom:1px solid #30363d;"><th style="padding:4px; color:#58a6ff; text-align:left;">#</th><th style="padding:4px; color:#58a6ff; text-align:left;">Nazwa</th><th style="padding:4px; color:#58a6ff; text-align:left;">EAN</th><th style="padding:4px; color:#58a6ff; text-align:left;">Cena</th></tr>`;
    supplierProducts.forEach((p, i) => {
        const offer = p.offers.find(o => o.source === data.supplierName);
        const price = offer ? offer.price : '?';
        const nameColor = (p.name.includes('formularza') || p.name.includes('Zdjęcie') || p.name.length < 5) ? '#f85149' : '#7ee787';
        const eanColor = (p.ean && p.ean.length >= 8) ? '#7ee787' : '#f0883e';
        reportHTML += `<tr style="border-bottom:1px solid #21262d;"><td style="padding:3px; color:#8b949e;">${i+1}</td><td style="padding:3px; color:${nameColor};">${p.name}</td><td style="padding:3px; color:${eanColor};">${p.ean || '—'}</td><td style="padding:3px; color:#d2a8ff;">${price} zł</td></tr>`;
    });
    reportHTML += `</table></div>`;
    reportHTML += `<div style="margin-top:10px; font-size:11px; color:#8b949e; text-align:left;">Jeśli widzisz problem (czerwone nazwy, brak EAN) — zrób screenshot tego raportu i wyślij do wsparcia.</div>`;

    // Wyświetl raport w modalu
    const reportModal = document.createElement('div');
    reportModal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:99999; padding:20px;';
    reportModal.innerHTML = `<div style="background:#161b22; border:1px solid #30363d; border-radius:12px; padding:24px; max-width:700px; width:100%; max-height:90vh; overflow-y:auto;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h3 style="margin:0; color:#fff; font-size:16px;">📋 Raport Importu</h3>
            <button onclick="this.closest('div[style]').remove()" style="background:#30363d; color:#fff; border:none; border-radius:6px; padding:6px 14px; cursor:pointer; font-size:13px;">✕ Zamknij</button>
        </div>
        ${reportHTML}
    </div>`;
    document.body.appendChild(reportModal);

    const statusMsg = directApprove ? 'oraz dodano od razu do Stałej Oferty (Katalog Klienta)' : 'jako propozycje (Oczekują na zatwierdzenie w Panelu PIM)';
    if (typeof showToast === 'function') {
        showToast(`Zaimportowano ${importedCount} towarów z hurtowni "${data.supplierName}" ${statusMsg}`);
    }
    if (typeof window.renderCatalog === 'function') window.renderCatalog();
    if (typeof window.populatePimCategories === 'function') window.populatePimCategories();
};

window.setupMappingModal = function setupMappingModal() {
    const data = window.currentParsedExcelData;
    console.log("setupMappingModal start - data:", data);
    if (!data) return;
    const mapEan = document.getElementById('mapEan');
    const mapSku = document.getElementById('mapSku');
    const mapName = document.getElementById('mapName');
    const mapPrice = document.getElementById('mapPrice');
    const mapPackSize = document.getElementById('mapPackSize');
    const mapVat = document.getElementById('mapVat');
    const mapDividePrice = document.getElementById('mapDividePrice');

    if (!mapEan || !mapName || !mapPrice) return;

    [mapEan, mapSku, mapName, mapPrice, mapPackSize, mapVat].forEach(s => { if (s) s.innerHTML = ''; });
    
    const emptyOpt = document.createElement('option');
    emptyOpt.value = "-1";
    emptyOpt.innerText = "(Brak)";
    [mapEan, mapSku, mapName, mapPrice, mapPackSize, mapVat].forEach(s => { if (s) s.appendChild(emptyOpt.cloneNode(true)); });

    // Słowniki regex do inteligentnego rozpoznawania
    const dictEan = /ean|kod kreskowy|barcode/i;
    const dictSku = /sku|indeks|index|symbol/i;
    const dictName = /nazwa|produkt|towar|opis/i;
    const dictPrice = /cena|netto|zakup|hurt/i;
    const dictPack = /pakowa|karton|sztuk w|ilosc w/i;
    const dictVat = /vat|podatek/i;

    let detectedEan = "-1";
    let detectedSku = "-1";
    let detectedName = "-1";
    let detectedPrice = "-1";
    let detectedPack = "-1";
    let detectedVat = "-1";

    // Krok 1: Automatyczne rozpoznanie kolumn w 1. przebiegu
    data.headers.forEach(h => {
        const hName = (h.name || '').toString().toLowerCase();
        
        if (dictEan.test(hName) && detectedEan === "-1") detectedEan = h.index.toString();
        if (dictSku.test(hName) && detectedSku === "-1") detectedSku = h.index.toString();
        if (dictName.test(hName) && detectedName === "-1") detectedName = h.index.toString();
        if (dictPrice.test(hName) && detectedPrice === "-1") detectedPrice = h.index.toString();
        if (dictPack.test(hName) && detectedPack === "-1") detectedPack = h.index.toString();
        if (dictVat.test(hName) && detectedVat === "-1") detectedVat = h.index.toString();
    });

    console.log("setupMappingModal detected:", { detectedEan, detectedSku, detectedName, detectedPrice, headers: data.headers });

    // Krok 2: Tworzenie opcji z jawnym zaznaczeniem domyślnym
    data.headers.forEach(h => {
        const idxStr = h.index.toString();
        const createOpt = (val, txt, isSel) => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.innerText = txt;
            if (isSel) opt.selected = true;
            return opt;
        };

        if (mapEan) mapEan.appendChild(createOpt(idxStr, h.name, idxStr === detectedEan));
        if (mapSku) mapSku.appendChild(createOpt(idxStr, h.name, idxStr === detectedSku));
        if (mapName) mapName.appendChild(createOpt(idxStr, h.name, idxStr === detectedName));
        if (mapPrice) mapPrice.appendChild(createOpt(idxStr, h.name, idxStr === detectedPrice));
        if (mapPackSize) mapPackSize.appendChild(createOpt(idxStr, h.name, idxStr === detectedPack));
        if (mapVat) mapVat.appendChild(createOpt(idxStr, h.name, idxStr === detectedVat));
    });

    // Krok 3: Wartości rozwijane
    if (detectedEan !== "-1" && mapEan) mapEan.value = detectedEan;
    if (detectedSku !== "-1" && mapSku) mapSku.value = detectedSku;
    if (detectedName !== "-1" && mapName) mapName.value = detectedName;
    if (detectedPrice !== "-1" && mapPrice) mapPrice.value = detectedPrice;
    if (detectedPack !== "-1" && mapPackSize) mapPackSize.value = detectedPack;
    if (detectedVat !== "-1" && mapVat) mapVat.value = detectedVat;
};

window.openMappingModal = function() {
    if (window.currentParsedExcelData) {
        const importSel = document.getElementById('importSupplierSelect');
        const supplierName = importSel ? importSel.value : 'Dostawca';
        window.openImportMappingVerificationModal(window.currentParsedExcelData, supplierName);
    } else {
        if (typeof window.setupMappingModal === 'function') window.setupMappingModal();
        window.openModal('mappingModal');
    }
};

window.handleFileInputChange = async function(input) {
    const files = input ? (input.files || input) : null;
    if (files && files.length > 0) {
        const file = files[0];
        try {
            const parser = window.ExcelParser || (typeof ExcelParser !== 'undefined' ? ExcelParser : null);
            if (!parser || !parser.readFile) {
                alert("Błąd: Moduł parsera plików nie jest załadowany.");
                return;
            }
            window.currentParsedExcelData = await parser.readFile(file);
            const previewCard = document.getElementById('importedFilePreviewCard');
            if (previewCard) previewCard.style.display = 'block';
            
            const fileInfoText = document.getElementById('fileInfoText');
            if (fileInfoText) {
                fileInfoText.innerText = `Wczytano plik: ${file.name} | Liczba arkuszy/stron: ${window.currentParsedExcelData.sheetCount || 1} | Łącznie odczytanych wierszy: ${window.currentParsedExcelData.rows.length}`;
            }
            
            window.openMappingModal();
        } catch (err) {
            alert("Błąd podczas odczytu pliku: " + (err.message || err));
        }
    }
};

window.executeExcelImport = function() {
    if (!window.currentParsedExcelData) {
        alert("Błąd: Najpierw wybierz i wczytaj plik cennika (Excel/CSV/PDF/Word).");
        return;
    }
    const importSel = document.getElementById('importSupplierSelect');
    const supplierName = importSel ? importSel.value : '';
    if (!supplierName) {
        alert("Proszę wybrać hurtownię z listy rozwijanej przed importem!");
        return;
    }

    const mapEan = document.getElementById('mapEan');
    const mapSku = document.getElementById('mapSku');
    const mapName = document.getElementById('mapName');
    const mapPrice = document.getElementById('mapPrice');
    const mapPackSize = document.getElementById('mapPackSize');
    const mapVat = document.getElementById('mapVat');
    const mapDividePrice = document.getElementById('mapDividePrice');

    const nameColVal = mapName && mapName.value !== "" ? mapName.value : "-1";
    const priceColVal = mapPrice && mapPrice.value !== "" ? mapPrice.value : "-1";

    if (nameColVal === "-1" || priceColVal === "-1") {
        alert("Wybierz kolumny 'Nazwa Produktu' oraz 'Cena Netto Zakupu' przed rozpoczęciem importu!");
        return;
    }

    const mapping = {
        eanCol: mapEan && mapEan.value !== "" ? mapEan.value : "-1",
        skuCol: mapSku && mapSku.value !== "" ? mapSku.value : "-1",
        nameCol: nameColVal,
        priceCol: priceColVal,
        packSizeCol: mapPackSize && mapPackSize.value !== "" ? mapPackSize.value : "-1",
        vatCol: mapVat && mapVat.value !== "" ? mapVat.value : "-1",
        dividePrice: mapDividePrice ? mapDividePrice.checked : false
    };

    console.log("executeExcelImport - mapping:", mapping, "supplierName:", supplierName, "data:", window.currentParsedExcelData);

    const parser = window.ExcelParser || (typeof ExcelParser !== 'undefined' ? ExcelParser : null);
    if (parser && parser.importMappedData) {
        const count = parser.importMappedData(window.currentParsedExcelData, mapping, supplierName);
        console.log("importMappedData result count:", count);
        window.closeModal('mappingModal');
        alert(`Sukces! Zaimportowano ${count} towarów dla hurtowni ${supplierName}!\nDodano do PIM (Główna Baza) oraz Kwarantanny.`);
        if (typeof updateDashboardStats === 'function') updateDashboardStats();
        if (typeof renderPimView === 'function') renderPimView();
        if (typeof renderQuarantineView === 'function') renderQuarantineView();
    } else {
        alert("Błąd: Moduł parsera Excel nie jest załadowany.");
    }
};

window.populateFileSuppliers = function() {
    const importSel = document.getElementById('importSupplierSelect');
    if (importSel && importSel.tagName === 'INPUT') {
        importSel.outerHTML = '<select id="importSupplierSelect" style="flex: 1;"></select>';
        const addBtn = document.getElementById('addNewSupplierBtn');
        if (addBtn) addBtn.style.display = 'inline-block';
    }

    const select = document.getElementById('importSupplierSelect');
    const pasteSelect = document.getElementById('pasteSupplierSelect');
    if (!select || !pasteSelect) return;

    const suppliers = typeof Database !== 'undefined' ? Database.getSuppliers() : [];
    const products = typeof Database !== 'undefined' ? Database.getProducts() : [];

    const supplierNamesSet = new Set();
    suppliers.forEach(s => {
        const name = typeof s === 'string' ? s : (s && s.name ? s.name : '');
        if (name && name.trim()) supplierNamesSet.add(name.trim());
    });
    products.forEach(p => {
        if (p && p.offers) {
            p.offers.forEach(o => {
                if (o && o.source && o.source.trim()) supplierNamesSet.add(o.source.trim());
            });
        }
    });

    const supplierNames = Array.from(supplierNamesSet).sort();

    select.innerHTML = '';
    pasteSelect.innerHTML = '';

    if (supplierNames.length === 0) {
        select.innerHTML = '<option value="" disabled selected style="color:#94a3b8; background:#0f1120;">-- Najpierw dodaj hurtownię --</option>';
        pasteSelect.innerHTML = '<option value="" disabled selected style="color:#94a3b8; background:#0f1120;">-- Najpierw dodaj hurtownię --</option>';
        return;
    }

    supplierNames.forEach(name => {
        const opt1 = document.createElement('option');
        opt1.value = name;
        opt1.textContent = name;
        opt1.style.color = '#ffffff';
        opt1.style.background = '#0f1120';
        select.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = name;
        opt2.textContent = name;
        opt2.style.color = '#ffffff';
        opt2.style.background = '#0f1120';
        pasteSelect.appendChild(opt2);
    });
};

function initApp() {
    Database.init();

    // Załaduj zaktualizowaną Bazę Wzorcową Kravets (ze zaktualizowaną strukturą kategorii i zdjęciami)
    const currentProducts = Database.getProducts();
    const hasOutdatedCategories = !currentProducts || currentProducts.length === 0 || currentProducts.some(p => p.category === 'Napoje' && p.name && (p.name.includes('VERES') || p.name.includes('NIŻYN') || p.name.includes('FLINT')));
    if (hasOutdatedCategories) {
        if (typeof Database.loadKravetsMasterCatalog === 'function') {
            Database.loadKravetsMasterCatalog(true);
        }
    }

    if (typeof window.renderSnapshotsList === 'function') window.renderSnapshotsList();

    // Automatyczna cicha optymalizacja i scalanie w tle po załadowaniu
    setTimeout(() => {
        const res = Database.autoCleanAndMergeAllProducts();
        if (res.cleanedCount > 0 || res.mergedCount > 0) {
            console.log(`✨ Automatycznie zoptymalizowano bazę w tle: wyczyszczono ${res.cleanedCount} nazw, połączono ${res.mergedCount} duplikatów.`);
            if (typeof updateDashboardStats === 'function') updateDashboardStats();
            if (typeof renderPimView === 'function') renderPimView();
        }
    }, 500);

    // Stan bieżący
    let activeCategory = 'Wszystkie';
    let activeSubCategory = 'Wszystkie';
    let selectedProductIdForModal = null;
    let currentParsedExcelData = null;

    // Elementy nawigacji i trybu
    const toggleModeBtn = document.getElementById('toggleModeBtn');
    const toggleModeText = document.getElementById('toggleModeText');
    const appModeBadge = document.getElementById('appModeBadge');
    const appTitle = document.getElementById('appTitle');
    const appSubtitle = document.getElementById('appSubtitle');
    const body = document.body;

    const adminPinInput = document.getElementById('adminPinInput');
    if (adminPinInput) {
        adminPinInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') window.verifyAdminPin();
        });
    }

    // Delegacja zdarzeń dla nawigacji dolnej admina
    const adminBottomNav = document.getElementById('adminBottomNav');
    if (adminBottomNav) {
        adminBottomNav.addEventListener('click', (e) => {
            const navItem = e.target.closest('.nav-item');
            if (navItem) {
                e.preventDefault();
                const targetView = navItem.getAttribute('data-view');
                switchAdminView(targetView);
            }
        });
    }

    const settingsBtn = document.getElementById('settingsHeaderBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            switchAdminView('settings');
        });
    }

    // switchAdminView is defined globally at top level

    // Globalny nasłuchiwacz kliknięć dla czerwonych koszyków usuwania produktów (100% gwarancji reakcji)
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-delete-product-pim, button[onclick*="deleteProductFromPim"]');
        if (btn) {
            let id = btn.getAttribute('data-id');
            if (!id) {
                const onclickAttr = btn.getAttribute('onclick') || '';
                const match = onclickAttr.match(/deleteProductFromPim\('([^']+)'\)/);
                if (match) id = match[1];
            }
            if (id) {
                e.preventDefault();
                e.stopPropagation();
                if (typeof window.deleteProductFromPim === 'function') {
                    window.deleteProductFromPim(id);
                }
            }
        }
    }, true);

    // --- KATALOG DLA KLIENTA ---
    const catalogSearchInput = document.getElementById('catalogSearchInput');
    if (catalogSearchInput) {
        catalogSearchInput.addEventListener('input', () => { if (typeof window.renderCatalog === 'function') window.renderCatalog(); });
    }

    window.renderCategoriesBar = function renderCategoriesBar() {
        const categoriesBar = document.getElementById('categoriesBar');
        const subCategoriesBar = document.getElementById('subCategoriesBar');
        if (!categoriesBar) return;
        
        const tree = Database.getCategoriesTree();
        const mainCategories = ['Wszystkie', ...Object.keys(tree).sort()];
        
        // Render głównego paska
        categoriesBar.innerHTML = '';
        mainCategories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = `category-pill ${activeCategory === cat ? 'active' : ''}`;
            btn.innerHTML = `<i class="fa-solid ${cat === 'Wszystkie' ? 'fa-layer-group' : 'fa-tag'}"></i> ${cat}`;
            btn.onclick = () => {
                activeCategory = cat;
                activeSubCategory = 'Wszystkie'; // Reset subcategory on main change
                renderCategoriesBar(); // Re-render bars
                if (typeof window.renderCatalog === 'function') window.renderCatalog();
            };
            categoriesBar.appendChild(btn);
        });

        // Render paska podkategorii
        if (!subCategoriesBar) return;
        if (activeCategory === 'Wszystkie' || !tree[activeCategory]) {
            subCategoriesBar.style.display = 'none';
        } else {
            subCategoriesBar.style.display = 'flex';
            subCategoriesBar.innerHTML = '';
            
            const subs = ['Wszystkie', ...tree[activeCategory]];
            subs.forEach(sub => {
                const subBtn = document.createElement('button');
                subBtn.className = `subcategory-pill ${activeSubCategory === sub ? 'active' : ''}`;
                subBtn.innerText = sub;
                subBtn.onclick = () => {
                    activeSubCategory = sub;
                    renderCategoriesBar();
                    if (typeof window.renderCatalog === 'function') window.renderCatalog();
                };
                subCategoriesBar.appendChild(subBtn);
            });
        }
    }
    // Inicjalizacja kategorii
    renderCategoriesBar();

    window.updateCartUI = function updateCartUI() {
        const cartDetails = typeof Database !== 'undefined' ? Database.getCartDetails() : { totalItemsCount: 0, totalClientPrice: 0 };
        const badge = document.getElementById('cartCountBadge');
        if (badge) badge.innerText = cartDetails.totalItemsCount;
        const totalText = document.getElementById('cartTotalSumText');
        if (totalText) totalText.innerText = `${cartDetails.totalClientPrice.toFixed(2)} zł`;
    };

    let catalogRenderLimit = 100;

    window.renderCatalog = function renderCatalog(resetLimit = true) {
        if (resetLimit) catalogRenderLimit = 100;
        const catalogSearchInput = document.getElementById('catalogSearchInput');
        const query = catalogSearchInput ? catalogSearchInput.value : '';
        const products = Database.searchProducts(query, activeCategory, activeSubCategory);
        const grid = document.getElementById('catalogProductsGrid');
        if (!grid) return;
        grid.innerHTML = '';

        if (products.length === 0) {
            grid.innerHTML = `
                <div class="glass-card" style="grid-column: 1 / -1; text-align:center; padding:40px 20px;">
                    <i class="fa-solid fa-box-open" style="font-size:40px; color:var(--text-dim); margin-bottom:12px;"></i>
                    <p>Brak produktów w wybranej kategorii lub brak wyników wyszukiwania.</p>
                </div>
            `;
            return;
        }

        // Sortowanie produktów w celu pogrupowania (Najpierw kategorie, potem rentowność)
        products.sort((a, b) => {
            const catA = a.category || 'Inne';
            const catB = b.category || 'Inne';
            if (catA !== catB) return String(catA).localeCompare(String(catB));
            const subA = a.subCategory || 'Ogólne';
            const subB = b.subCategory || 'Ogólne';
            if (subA !== subB) return String(subA).localeCompare(String(subB));
            
            // Sortowanie po rentowności (im wyższy zysk w zł, tym wyżej)
            const getProfit = (p) => {
                const highest = Database.getHighestWholesaleOffer(p);
                const cheapest = Database.getCheapestWholesaleOffer(p);
                if (!highest || !cheapest) return 0;
                const cPrice = Database.calculateClientPrice(highest.price, p);
                return cPrice - cheapest.price;
            };
            return getProfit(b) - getProfit(a);
        });

        let currentGroup = null;
        const visibleProducts = products.slice(0, catalogRenderLimit);

        visibleProducts.forEach(p => {
            let groupName = p.category || 'Inne';
            if (activeCategory !== 'Wszystkie') {
                groupName = p.subCategory && p.subCategory !== 'Ogólne' ? p.subCategory : 'Pozostałe';
            } else {
                groupName = `${p.category || 'Inne'}${p.subCategory && p.subCategory !== 'Ogólne' ? ' / ' + p.subCategory : ''}`;
            }

            if (currentGroup !== groupName) {
                currentGroup = groupName;
                const header = document.createElement('div');
                header.className = 'category-group-header';
                header.innerHTML = `<h3>${groupName}</h3>`;
                grid.appendChild(header);
            }

            const cheapestWholesale = Database.getCheapestWholesaleOffer(p);
            const highestWholesale = Database.getHighestWholesaleOffer(p);
            const wholesalePrice = cheapestWholesale ? cheapestWholesale.price : 0;
            const baseWholesaleForClient = highestWholesale ? highestWholesale.price : wholesalePrice;
            const clientPrice = Database.calculateClientPrice(baseWholesaleForClient, p);
            const offersCount = p.offers ? p.offers.length : 0;

            const catColor = p.categoryColor || '#8b5cf6';
            const catTextColor = p.categoryTextColor || '#c4b5fd';
            const catIcon = p.categoryIcon || 'fa-solid fa-tag';
            const catName = p.category || 'Katalog Kravets';
            const brandShort = (p.brand || p.category || 'KRAVETS').split(' - ')[0].trim();
            const hasValidImg = p.image && !p.image.includes('placeholder') && !p.image.includes('unsplash') && p.image.length > 5;

            const card = document.createElement('div');
            card.className = 'catalog-card';
            card.innerHTML = `
                <div class="card-img-wrapper" style="position:relative; width:100%; height:180px; overflow:hidden; border-radius:12px 12px 0 0; background:#0f172a; display:flex; align-items:center; justify-content:center;">
                    ${hasValidImg ? `
                        <img src="${p.image}" class="card-img" alt="${p.name}" style="width:100%; height:100%; object-fit:contain; background:#ffffff; padding:6px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div style="display:none; width:100%; height:100%; background:linear-gradient(135deg, ${catColor}25, #0f172a 90%); flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:15px; border-bottom:2px solid ${catColor}66;">
                            <div style="width:52px; height:52px; border-radius:50%; background:rgba(0,0,0,0.4); border:1.5px solid ${catColor}88; display:flex; align-items:center; justify-content:center; font-size:22px; color:${catTextColor}; box-shadow:0 4px 15px rgba(0,0,0,0.3);">
                                <i class="${catIcon}"></i>
                            </div>
                            <span style="font-size:12px; font-weight:800; color:${catTextColor}; text-transform:uppercase; letter-spacing:1px; background:${catColor}25; padding:3px 10px; border-radius:12px; border:1px solid ${catColor}55;">${brandShort}</span>
                            <span style="font-size:10px; color:var(--text-dim);">Produkt Oryginalny</span>
                        </div>
                    ` : `
                        <div style="width:100%; height:100%; background:linear-gradient(135deg, ${catColor}25, #0f172a 90%); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:15px; border-bottom:2px solid ${catColor}66;">
                            <div style="width:52px; height:52px; border-radius:50%; background:rgba(0,0,0,0.4); border:1.5px solid ${catColor}88; display:flex; align-items:center; justify-content:center; font-size:22px; color:${catTextColor}; box-shadow:0 4px 15px rgba(0,0,0,0.3);">
                                <i class="${catIcon}"></i>
                            </div>
                            <span style="font-size:12px; font-weight:800; color:${catTextColor}; text-transform:uppercase; letter-spacing:1px; background:${catColor}25; padding:3px 10px; border-radius:12px; border:1px solid ${catColor}55;">${brandShort}</span>
                            <span style="font-size:10px; color:var(--text-dim);">Produkt Oryginalny</span>
                        </div>
                    `}
                    <span class="card-category-badge" style="position:absolute; top:8px; left:8px; background: ${catColor}dd; color: #fff; font-weight: 700; border: 1px solid rgba(255,255,255,0.25); font-size:10px; padding:3px 8px; border-radius:6px; backdrop-filter:blur(4px); z-index:2;"><i class="${catIcon}"></i> ${catName}</span>
                    ${offersCount > 1 ? `<span style="position:absolute; bottom:8px; right:8px; background:linear-gradient(135deg,#8b5cf6,#ec4899); color:#fff; font-size:10px; font-weight:700; padding:3px 8px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.4); z-index:2;"><i class="fa-solid fa-scale-balanced"></i> ${offersCount} warianty</span>` : ''}
                </div>
                <div class="card-body">
                    <div class="card-title" style="min-height: 40px; margin-bottom: 8px;">${p.name}</div>
                    
                    <div class="card-price-row" style="margin-bottom: 12px; align-items: flex-end;">
                        <div>
                            <div style="font-size: 11px; color: var(--primary); font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px;">Cena netto / szt.</div>
                            <div class="card-price" style="font-size: 24px; color: #fff;">${clientPrice.toFixed(2)} zł</div>
                        </div>
                        <button class="btn-card-add" title="Dodaj do koszyka">
                            <i class="fa-solid fa-cart-plus"></i>
                        </button>
                    </div>

                    <div style="font-size: 12px; color: var(--text-muted); background: rgba(0,0,0,0.2); padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);">
                        ${p.packSize > 1 ? `
                        <div style="display:flex; justify-content:space-between; margin-bottom:5px; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 5px;">
                            <span>Cena za całą zgrzewkę:</span>
                            <strong style="color:var(--text-main);">${(clientPrice * p.packSize).toFixed(2)} zł</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:5px; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 5px;">
                            <span>Sztuk w zgrzewce:</span>
                            <strong style="color:var(--text-main);">${p.packSize}</strong>
                        </div>
                        ` : ''}
                        <div style="display:flex; justify-content:space-between;">
                            <span>Stawka VAT:</span>
                            <strong style="color:var(--text-main);">${p.vat || 'nd.'}</strong>
                        </div>
                        ${p.expirationDate ? `
                        <div style="display:flex; justify-content:space-between; margin-top:5px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 5px; color:#ef4444; font-weight:700;">
                            <span><i class="fa-solid fa-calendar-day"></i> Data ważności:</span>
                            <span>${p.expirationDate}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;

            card.addEventListener('click', (e) => {
                if (e.target.closest('.btn-card-add')) {
                    e.stopPropagation();
                    Database.addToCart(p.id, 1);
                    updateCartUI();
                    showToast(`Dodano do koszyka: ${p.name}`);
                    return;
                }
                openProductDetailsModal(p, clientPrice);
            });

            grid.appendChild(card);
        });

        // Przycisk "Załaduj więcej produktów" jeśli jest więcej niż limit
        if (products.length > catalogRenderLimit) {
            const loadMoreWrapper = document.createElement('div');
            loadMoreWrapper.style.gridColumn = '1 / -1';
            loadMoreWrapper.style.textAlign = 'center';
            loadMoreWrapper.style.padding = '25px 10px';

            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.className = 'btn btn-secondary';
            loadMoreBtn.style.padding = '12px 30px';
            loadMoreBtn.style.fontSize = '14px';
            loadMoreBtn.style.fontWeight = '700';
            loadMoreBtn.style.background = 'linear-gradient(135deg, var(--primary), var(--secondary))';
            loadMoreBtn.style.border = 'none';
            loadMoreBtn.style.color = '#fff';
            loadMoreBtn.style.borderRadius = '12px';
            loadMoreBtn.style.cursor = 'pointer';
            loadMoreBtn.style.boxShadow = '0 4px 15px rgba(139,92,246,0.3)';

            const remaining = products.length - catalogRenderLimit;
            loadMoreBtn.innerHTML = `<i class="fa-solid fa-boxes-stacked"></i> Pokaż kolejne 100 towarów (Wyświetlono ${catalogRenderLimit} z ${products.length} - pozostało jeszcze ${remaining})`;

            loadMoreBtn.onclick = () => {
                catalogRenderLimit += 100;
                window.renderCatalog(false);
            };

            loadMoreWrapper.appendChild(loadMoreBtn);
            grid.appendChild(loadMoreWrapper);
        }
    };

    window.openProductDetailsModalById = function openProductDetailsModalById(productId) {
        if (typeof Database === 'undefined') return;
        const product = Database.getProductById(productId);
        if (!product) return;
        const cheapestWholesale = Database.getCheapestWholesaleOffer(product);
        const highestWholesale = Database.getHighestWholesaleOffer(product);
        const wholesalePrice = cheapestWholesale ? cheapestWholesale.price : 0;
        const baseWholesaleForClient = highestWholesale ? highestWholesale.price : wholesalePrice;
        const clientPrice = Database.calculateClientPrice(baseWholesaleForClient, product);
        window.openProductDetailsModal(product, clientPrice);
    };

    window.openProductDetailsModal = function openProductDetailsModal(product, defaultClientPrice) {
        if (!product) return;
        selectedProductIdForModal = product.id;

        const catColor = product.categoryColor || '#8b5cf6';
        const catTextColor = product.categoryTextColor || '#c4b5fd';
        const catIcon = product.categoryIcon || 'fa-solid fa-tag';
        const catName = product.category || 'Katalog Kravets';
        const brandShort = (product.brand || product.category || 'Kravets').split(' - ')[0].trim();

        // 1. Kategoria i status
        const stripe = document.getElementById('modalProductCategoryStripe');
        if (stripe) {
            stripe.style.background = `${catColor}22`;
            stripe.style.border = `1.5px solid ${catColor}`;
            stripe.style.color = catTextColor;
            stripe.innerHTML = `<i class="${catIcon}"></i> ${catName}`;
        }

        const statusBadge = document.getElementById('modalProductStatusBadge');
        if (statusBadge) {
            if (product.isApproved !== false) {
                statusBadge.innerHTML = '<span style="background:rgba(16,185,129,0.15); color:#10b981; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700; border:1px solid rgba(16,185,129,0.3);"><i class="fa-solid fa-check"></i> Stała Oferta</span>';
            } else {
                statusBadge.innerHTML = '<span style="background:rgba(234,179,8,0.2); color:#f59e0b; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700; border:1px solid rgba(234,179,8,0.4);"><i class="fa-solid fa-clock"></i> Propozycja</span>';
            }
        }

        // 2. Zdjęcie i Elegancki Markowy Placeholder
        const imgEl = document.getElementById('modalProductImg');
        const placeholderEl = document.getElementById('modalProductBrandedPlaceholder');
        const iconCircle = document.getElementById('modalPlaceholderIconCircle');
        const brandBadgeEl = document.getElementById('modalPlaceholderBrandBadge');
        const dlLink = document.getElementById('modalProductImgDownloadLink');
        const qualityBadge = document.getElementById('modalProductImgQualityBadge');

        const hasRealImg = product.image && !product.image.includes('placeholder') && !product.image.includes('unsplash') && product.image.length > 5;

        if (hasRealImg) {
            if (imgEl) {
                imgEl.src = product.image;
                imgEl.style.display = 'block';
            }
            if (placeholderEl) placeholderEl.style.display = 'none';
            if (dlLink) {
                dlLink.href = product.image;
                dlLink.style.display = 'inline-flex';
            }
            if (qualityBadge) {
                qualityBadge.innerHTML = '<i class="fa-solid fa-camera"></i> Packshot Studyjny HD';
                qualityBadge.style.color = '#10b981';
            }
        } else {
            if (imgEl) imgEl.style.display = 'none';
            if (placeholderEl) {
                placeholderEl.style.display = 'flex';
                placeholderEl.style.background = `linear-gradient(135deg, ${catColor}20, #13172b 85%)`;
                if (iconCircle) {
                    iconCircle.style.background = `${catColor}30`;
                    iconCircle.style.border = `2px solid ${catColor}`;
                    iconCircle.style.color = catTextColor;
                    iconCircle.innerHTML = `<i class="${catIcon}"></i>`;
                }
                if (brandBadgeEl) {
                    brandBadgeEl.style.background = `${catColor}25`;
                    brandBadgeEl.style.color = catTextColor;
                    brandBadgeEl.style.border = `1px solid ${catColor}66`;
                    brandBadgeEl.innerText = brandShort;
                }
            }
            if (dlLink) dlLink.style.display = 'none';
            if (qualityBadge) {
                qualityBadge.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Oryginał Kravets';
                qualityBadge.style.color = '#38bdf8';
            }
        }

        // Zresetuj formularz edycji zdjęcia
        const editorDrawer = document.getElementById('modalPhotoEditorDrawer');
        if (editorDrawer) editorDrawer.style.display = 'none';
        const urlInput = document.getElementById('modalPhotoUrlInput');
        if (urlInput) urlInput.value = '';
        const fileInput = document.getElementById('modalPhotoFileInput');
        if (fileInput) fileInput.value = '';

        // 3. Nazwa, EAN, SKU, VAT
        const nameEl = document.getElementById('modalProductName');
        if (nameEl) nameEl.innerText = product.name;

        const eanEl = document.getElementById('modalProductEan');
        if (eanEl) eanEl.innerText = product.ean || 'Brak kodu EAN';

        const skuEl = document.getElementById('modalProductSku');
        if (skuEl) skuEl.innerText = product.sku || (product.id ? product.id.replace('kravets_', '') : '-');

        const vatEl = document.getElementById('modalProductVat');
        const vatRate = product.vat ? (typeof product.vat === 'string' && product.vat.includes('%') ? product.vat : `${product.vat}%`) : '5%';
        if (vatEl) vatEl.innerText = vatRate;

        // 4. Ceny i pakowanie
        const numPrice = typeof defaultClientPrice === 'number' ? defaultClientPrice : (parseFloat(defaultClientPrice) || 0);
        const vatNum = parseFloat(vatRate.replace(/[^0-9.]/g, '')) || 5;
        const grossPrice = (numPrice * (1 + vatNum / 100)).toFixed(2);

        const priceEl = document.getElementById('modalProductPrice');
        if (priceEl) priceEl.innerText = `${numPrice.toFixed(2)} zł / ${product.unit || 'szt.'}`;

        const grossEl = document.getElementById('modalProductPriceGross');
        if (grossEl) grossEl.innerText = `Cena brutto: ${grossPrice} zł`;

        const packEl = document.getElementById('modalProductPackInfo');
        if (packEl) packEl.innerText = `${product.packSize || 1} ${product.unit || 'szt.'}`;

        const pkgPriceEl = document.getElementById('modalProductPackagePrice');
        if (pkgPriceEl) {
            if (product.packSize && product.packSize > 1) {
                pkgPriceEl.innerText = `(${(numPrice * product.packSize).toFixed(2)} zł za karton / zgrzewkę)`;
            } else {
                pkgPriceEl.innerText = `(Pakowane pojedynczo)`;
            }
        }

        // 5. Data ważności
        const expContainer = document.getElementById('modalProductExpiryContainer');
        const expVal = document.getElementById('modalProductExpiryVal');
        if (product.expirationDate) {
            if (expContainer) expContainer.style.display = 'block';
            if (expVal) expVal.innerText = product.expirationDate;
        } else {
            if (expContainer) expContainer.style.display = 'none';
        }

        // 6. Oferty dostawców
        const offersContainer = document.getElementById('modalSupplierOffersList');
        const countBadge = document.getElementById('modalOffersCountBadge');
        if (offersContainer) {
            offersContainer.innerHTML = '';
            const offers = product.offers || [];
            if (countBadge) countBadge.innerText = `${offers.length} ${offers.length === 1 ? 'oferta' : 'oferty'}`;

            if (offers.length > 0) {
                const sorted = [...offers].sort((a,b) => a.price - b.price);
                sorted.forEach((off, idx) => {
                    const offClientPrice = Database.calculateClientPrice(off.price, product);
                    const isCheapest = idx === 0 && sorted.length > 1;
                    const netP = parseFloat(off.price) || 0;
                    const grossP = (netP * (1 + vatNum / 100)).toFixed(2);
                    const pkgP = (netP * (product.packSize || 1)).toFixed(2);

                    const row = document.createElement('div');
                    row.style.display = 'flex';
                    row.style.justifyContent = 'space-between';
                    row.style.alignItems = 'center';
                    row.style.padding = '8px 12px';
                    row.style.marginBottom = '6px';
                    row.style.borderRadius = '8px';
                    row.style.background = idx === 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.03)';
                    row.style.border = idx === 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)';

                    row.innerHTML = `
                        <div style="display:flex; align-items:center; gap:8px;">
                            <input type="radio" name="modalSelectedOffer" value="${off.source}" ${idx === 0 ? 'checked' : ''} style="accent-color:var(--primary); cursor:pointer;">
                            <div>
                                <strong style="color:var(--text-main); font-size:13px;">${off.source}</strong>
                                ${isCheapest ? '<span style="background:rgba(16,185,129,0.2); color:#10b981; padding:2px 6px; border-radius:4px; font-size:10px; margin-left:6px; font-weight:700;">Najtańszy dostawca</span>' : ''}
                                <small style="display:block; color:var(--text-dim); font-size:10px;">Cena zakupu: ${netP.toFixed(2)} zł netto (${grossP} zł brutto) ${product.packSize > 1 ? `| ${pkgP} zł za karton` : ''}</small>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:14px; font-weight:800; color:#34d399;">${offClientPrice.toFixed(2)} zł</div>
                            <small style="color:var(--text-dim); font-size:10px;">Cena dla klienta</small>
                        </div>
                    `;

                    row.querySelector('input').addEventListener('change', () => {
                        if (priceEl) priceEl.innerText = `${offClientPrice.toFixed(2)} zł / ${product.unit || 'szt.'}`;
                        if (grossEl) grossEl.innerText = `Cena brutto: ${(offClientPrice * (1 + vatNum / 100)).toFixed(2)} zł`;
                    });

                    offersContainer.appendChild(row);
                });
            } else {
                offersContainer.innerHTML = '<div style="color:var(--warning); font-size:12px; padding:6px 0;"><i class="fa-solid fa-triangle-exclamation"></i> Chwilowy brak aktywnych ofert z hurtowni.</div>';
            }
        }

        // 7. Przełączanie akcji Admin / Klient
        const adminActions = document.getElementById('modalAdminActions');
        const isAdmin = document.body.classList.contains('mode-admin') || document.body.classList.contains('admin-mode');
        if (adminActions) {
            adminActions.style.display = isAdmin ? 'flex' : 'none';
            const editBtn = document.getElementById('modalAdminEditBtn');
            if (editBtn) {
                editBtn.onclick = () => {
                    closeModal('productDetailsModal');
                    if (typeof openProductEditModal === 'function') openProductEditModal(product.id);
                };
            }
            const delBtn = document.getElementById('modalAdminDeleteBtn');
            if (delBtn) {
                delBtn.onclick = () => {
                    closeModal('productDetailsModal');
                    if (typeof deleteProductFromPim === 'function') deleteProductFromPim(product.id);
                };
            }
        }

        const qtyInput = document.getElementById('modalQtyInput');
        if (qtyInput) qtyInput.value = 1;

        openModal('productDetailsModal');
    };

    // Obsługa edytora zdjęć w wizytówce towaru
    window.toggleModalPhotoEditor = function() {
        const drawer = document.getElementById('modalPhotoEditorDrawer');
        if (!drawer) return;
        drawer.style.display = (drawer.style.display === 'flex' || drawer.style.display === 'block') ? 'none' : 'flex';
    };

    window.saveModalProductPhoto = function() {
        if (!selectedProductIdForModal) return;
        const urlInput = document.getElementById('modalPhotoUrlInput');
        const fileInput = document.getElementById('modalPhotoFileInput');

        const enteredUrl = urlInput ? urlInput.value.trim() : '';
        const file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;

        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const base64Data = e.target.result;
                Database.updateProductImage(selectedProductIdForModal, base64Data);
                const updatedProd = Database.getProductById(selectedProductIdForModal);
                window.openProductDetailsModal(updatedProd);
                if (typeof window.renderPimView === 'function') window.renderPimView();
                if (typeof window.renderCatalog === 'function') window.renderCatalog(false);
                if (typeof showToast === 'function') showToast('Pomyślnie wgrano i zapisano nowe zdjęcie towaru!');
            };
            reader.readAsDataURL(file);
        } else if (enteredUrl) {
            Database.updateProductImage(selectedProductIdForModal, enteredUrl);
            const updatedProd = Database.getProductById(selectedProductIdForModal);
            window.openProductDetailsModal(updatedProd);
            if (typeof window.renderPimView === 'function') window.renderPimView();
            if (typeof window.renderCatalog === 'function') window.renderCatalog(false);
            if (typeof showToast === 'function') showToast('Pomyślnie zaktualizowano link do zdjęcia!');
        } else {
            alert('Wklej link URL lub wybierz plik graficzny ze swojego komputera.');
        }
    };

    window.removeModalProductPhoto = function() {
        if (!selectedProductIdForModal) return;
        if (confirm('Czy na pewno chcesz usunąć to zdjęcie i przywrócić elegancki, markowy placeholder?')) {
            Database.updateProductImage(selectedProductIdForModal, null);
            const updatedProd = Database.getProductById(selectedProductIdForModal);
            window.openProductDetailsModal(updatedProd);
            if (typeof window.renderPimView === 'function') window.renderPimView();
            if (typeof window.renderCatalog === 'function') window.renderCatalog(false);
            if (typeof showToast === 'function') showToast('Przywrócono markowy placeholder towaru.');
        }
    };

    const modalMinusBtn = document.getElementById('modalQtyMinus');
    if (modalMinusBtn) {
        modalMinusBtn.onclick = () => {
            const input = document.getElementById('modalQtyInput');
            let val = parseInt(input.value) || 1;
            if (val > 1) input.value = val - 1;
        };
    }

    const modalPlusBtn = document.getElementById('modalQtyPlus');
    if (modalPlusBtn) {
        modalPlusBtn.addEventListener('click', () => {
            const input = document.getElementById('modalQtyInput');
            let val = parseInt(input.value) || 1;
            input.value = val + 1;
        });
    }

    const modalAddBtn = document.getElementById('modalAddToCartBtn');
    if (modalAddBtn) {
        modalAddBtn.addEventListener('click', () => {
            if (!selectedProductIdForModal) return;
            const qty = parseInt(document.getElementById('modalQtyInput').value) || 1;
            Database.addToCart(selectedProductIdForModal, qty);
            updateCartUI();
            closeModal('productDetailsModal');
            showToast('Dodano towar do koszyka!');
        });
    }

    // --- KOSZYK I ZAMÓWIENIE KLIENTA ---
    window.openCartModalFromHeader = function() {
        renderCartModal();
        openModal('cartModal');
    };

    const floatingCartBtn = document.getElementById('floatingCartBtn');
    if (floatingCartBtn) {
        floatingCartBtn.addEventListener('click', () => {
            window.openCartModalFromHeader();
        });
    }

    const headerCartBtn = document.getElementById('headerCartBtn');
    if (headerCartBtn) {
        headerCartBtn.addEventListener('click', () => {
            window.openCartModalFromHeader();
        });
    }

    function updateCartUI() {
        if (typeof Database === 'undefined') return;
        const cartDetails = Database.getCartDetails();
        const countBadge = document.getElementById('cartCountBadge');
        if (countBadge) countBadge.innerText = cartDetails.totalItemsCount;
        
        const headerBadge = document.getElementById('headerCartBadge');
        if (headerBadge) headerBadge.innerText = cartDetails.totalItemsCount;
        
        const headerTotal = document.getElementById('headerCartTotal');
        if (headerTotal) headerTotal.innerText = `${cartDetails.totalClientPrice.toFixed(2)} zł`;

        const cartSummary = document.getElementById('cartSummaryTotal');
        if (cartSummary) cartSummary.innerText = `${cartDetails.totalClientPrice.toFixed(2)} zł`;
    }
    window.updateCartUI = updateCartUI;

    function renderCartModal() {
        if (typeof Database === 'undefined') return;
        const cartDetails = Database.getCartDetails();
        const container = document.getElementById('cartItemsList');
        if (!container) return;
        container.innerHTML = '';

        if (cartDetails.items.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:30px 10px; color:var(--text-dim);">
                    <i class="fa-solid fa-cart-arrow-down" style="font-size:36px; margin-bottom:10px; color: #64748b;"></i>
                    <p style="margin: 0; font-size: 14px; font-weight: 600;">Twój koszyk jest obecnie pusty.</p>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Dodaj produkty z katalogu, aby złożyć zamówienie.</p>
                </div>
            `;
            const cartSummary = document.getElementById('cartSummaryTotal');
            if (cartSummary) cartSummary.innerText = '0,00 zł';
            return;
        }

        cartDetails.items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'cart-item-row';
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '10px 12px';
            row.style.background = 'rgba(255, 255, 255, 0.03)';
            row.style.borderRadius = '10px';
            row.style.marginBottom = '8px';
            row.style.border = '1px solid rgba(255, 255, 255, 0.06)';

            row.innerHTML = `
                <div class="cart-item-info" style="flex: 1; padding-right: 10px;">
                    <div class="cart-item-title" style="font-weight: 700; font-size: 13px; color: #fff;">${item.product.name}</div>
                    <div class="cart-item-price" style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
                        ${item.clientUnitPrice.toFixed(2)} zł netto / ${item.product.unit || 'szt.'} 
                        ${item.product.packSize > 1 ? `(opak. ${item.product.packSize} szt.)` : ''}
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <div class="quantity-picker" style="height:32px; background: rgba(255,255,255,0.08); border-radius: 8px; display: flex; align-items: center; border: 1px solid rgba(255,255,255,0.15);">
                        <button class="qty-btn btnMinus" style="width:28px; height:32px; background:none; border:none; color:#fff; cursor:pointer; font-weight:bold;">-</button>
                        <input type="number" class="qtyInput" value="${item.quantity}" style="width:35px; font-size:13px; text-align:center; background:transparent; border:none; color:#fff; font-weight:700;" readonly>
                        <button class="qty-btn btnPlus" style="width:28px; height:32px; background:none; border:none; color:#fff; cursor:pointer; font-weight:bold;">+</button>
                    </div>
                    <div style="font-weight:800; font-size: 13px; color: #34d399; width:75px; text-align:right;">${item.itemClientTotal.toFixed(2)} zł</div>
                    <button class="btnDeleteCartItem" style="background: none; border: none; color: #f87171; cursor: pointer; padding: 4px;" title="Usuń z koszyka">
                        <i class="fa-solid fa-trash-can" style="font-size: 13px;"></i>
                    </button>
                </div>
            `;

            row.querySelector('.btnMinus').addEventListener('click', () => {
                Database.updateCartQuantity(item.product.id, item.quantity - 1);
                updateCartUI();
                renderCartModal();
            });

            row.querySelector('.btnPlus').addEventListener('click', () => {
                Database.updateCartQuantity(item.product.id, item.quantity + 1);
                updateCartUI();
                renderCartModal();
            });

            row.querySelector('.btnDeleteCartItem').addEventListener('click', () => {
                Database.removeFromCart(item.product.id);
                updateCartUI();
                renderCartModal();
            });

            container.appendChild(row);
        });

        const cartSummary = document.getElementById('cartSummaryTotal');
        if (cartSummary) cartSummary.innerText = `${cartDetails.totalClientPrice.toFixed(2)} zł`;
    }
    window.renderCartModal = renderCartModal;

    function getCheckoutData() {
        const nameEl = document.getElementById('checkoutName');
        const phoneEl = document.getElementById('checkoutPhone');
        const emailEl = document.getElementById('checkoutEmail');
        const nipEl = document.getElementById('checkoutNip');
        const addressEl = document.getElementById('checkoutAddress');
        const notesEl = document.getElementById('checkoutNotes');

        const name = nameEl ? nameEl.value.trim() : '';
        const phone = phoneEl ? phoneEl.value.trim() : '';
        const email = emailEl ? emailEl.value.trim() : '';
        const nip = nipEl ? nipEl.value.trim() : '';
        const address = addressEl ? addressEl.value.trim() : '';
        const notes = notesEl ? notesEl.value.trim() : '';

        if (!name || !phone) {
            alert("Proszę podać Nazwę Firmy / Imię oraz Numer Telefonu!");
            if (nameEl && !name) nameEl.focus();
            else if (phoneEl && !phone) phoneEl.focus();
            return null;
        }

        return { name, phone, email, nip, address, notes };
    }

    function buildOrderMessageText(customer, cartDetails, orderNumber) {
        let msg = `🛒 *NOWE ZAMÓWIENIE B2B - KATALOG ONLINE*\n`;
        msg += `📄 *Numer zamówienia:* ${orderNumber}\n`;
        msg += `🏢 *Klient / Firma:* ${customer.name}\n`;
        msg += `📞 *Telefon:* ${customer.phone}\n`;
        if (customer.email) msg += `✉️ *E-mail:* ${customer.email}\n`;
        if (customer.nip) msg += `💼 *NIP:* ${customer.nip}\n`;
        if (customer.address) msg += `📍 *Adres dostawy:* ${customer.address}\n`;
        if (customer.notes) msg += `📝 *Uwagi:* ${customer.notes}\n`;
        msg += `\n📦 *ZAMÓWIONE TOWARY:*\n`;

        cartDetails.items.forEach((i, idx) => {
            const eanStr = i.product.ean ? ` (EAN: ${i.product.ean})` : '';
            msg += `${idx + 1}. *${i.product.name}*${eanStr}\n   ➜ ${i.quantity} x ${i.clientUnitPrice.toFixed(2)} zł = *${i.itemClientTotal.toFixed(2)} zł netto*\n`;
        });

        msg += `\n💰 *SUMA NETTO ZAMÓWIENIA:* *${cartDetails.totalClientPrice.toFixed(2)} zł*`;
        return msg;
    }

    // 1. Złożenie zamówienia: E-mail + automatyczne dublowanie na WhatsApp
    window.submitEmailAndWhatsAppOrder = function() {
        const customer = getCheckoutData();
        if (!customer) return;

        const cartDetails = Database.getCartDetails();
        if (cartDetails.items.length === 0) {
            alert("Twój koszyk jest pusty!");
            return;
        }

        const order = Database.saveOrder(customer);
        const orderNum = order ? order.orderNumber : 'ZAM-' + Date.now();
        const msgText = buildOrderMessageText(customer, cartDetails, orderNum);

        // Dublowanie WhatsApp
        const encodedWhatsApp = encodeURIComponent(msgText);
        window.open(`https://wa.me/?text=${encodedWhatsApp}`, '_blank');

        // Wysyłka / generowanie e-mail
        const subject = encodeURIComponent(`Zamówienie z Katalogu ${orderNum} - ${customer.name}`);
        const mailtoLink = `mailto:${customer.email || ''}?subject=${subject}&body=${encodedWhatsApp}`;
        
        try {
            const tempA = document.createElement('a');
            tempA.href = mailtoLink;
            tempA.target = '_blank';
            tempA.click();
        } catch(e) {}

        updateCartUI();
        closeModal('cartModal');
        alert(`✅ Dziękujemy! Zamówienie (${orderNum}) zostało zapisane. Otworzono WhatsApp w celu przesłania potwierdzenia!`);
    };

    // 2. Bezpośrednie zamówienie przez WhatsApp
    window.submitWhatsAppOnlyOrder = function() {
        const customer = getCheckoutData();
        if (!customer) return;

        const cartDetails = Database.getCartDetails();
        if (cartDetails.items.length === 0) {
            alert("Twój koszyk jest pusty!");
            return;
        }

        const order = Database.saveOrder(customer);
        const orderNum = order ? order.orderNumber : 'ZAM-' + Date.now();
        const msgText = buildOrderMessageText(customer, cartDetails, orderNum);

        const encodedWhatsApp = encodeURIComponent(msgText);
        window.open(`https://wa.me/?text=${encodedWhatsApp}`, '_blank');

        updateCartUI();
        closeModal('cartModal');
        alert(`✅ Zamówienie (${orderNum}) zapisane i przekierowane do WhatsApp!`);
    };

    // 3. Pobranie zamówienia jako plik / Druk A4
    window.downloadOrderFileOrPrint = function() {
        const customer = getCheckoutData();
        if (!customer) return;

        const cartDetails = Database.getCartDetails();
        if (cartDetails.items.length === 0) {
            alert("Twój koszyk jest pusty!");
            return;
        }

        const order = Database.saveOrder(customer);
        const orderNum = order ? order.orderNumber : 'ZAM-' + Date.now();
        const msgText = buildOrderMessageText(customer, cartDetails, orderNum);

        // Utworzenie pliku TXT do pobrania
        const blob = new Blob([msgText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Zamowienie_${orderNum}_${customer.name.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        updateCartUI();
        closeModal('cartModal');
        alert(`✅ Pobrano plik zamówienia (${orderNum}) na dysk!`);
    };

    const btnShowPim = document.getElementById('btnShowPim');
    const btnShowQuarantine = document.getElementById('btnShowQuarantine');

    if (btnShowPim) {
        btnShowPim.addEventListener('click', (e) => {
            document.getElementById('pimContainer').style.display = 'block';
            document.getElementById('quarantineContainer').style.display = 'none';
            btnShowPim.style.border = '2px solid var(--primary)';
            if (btnShowQuarantine) btnShowQuarantine.style.border = '1px solid var(--warning)';
            renderPimView();
        });
    }

    if (btnShowQuarantine) {
        btnShowQuarantine.addEventListener('click', (e) => {
            document.getElementById('pimContainer').style.display = 'none';
            document.getElementById('quarantineContainer').style.display = 'block';
            btnShowQuarantine.style.border = '2px solid var(--warning)';
            if (btnShowPim) btnShowPim.style.border = 'none';
            renderQuarantineView();
        });
    }

    // --- PIM (Główna Baza Towarów) ---
    window.populatePimCategories = function populatePimCategories() {
        const pimCategoryFilter = document.getElementById('pimCategoryFilter');
        if (!pimCategoryFilter || typeof Database === 'undefined') return;
        const currentVal = pimCategoryFilter.value;
        pimCategoryFilter.innerHTML = '<option value="">Wszystkie kategorie</option>';
        const products = Database.getProducts();
        const categories = new Set();
        products.forEach(p => {
            if (p && p.category) categories.add(p.category);
            if (p && p.subCategory && p.subCategory !== 'Ogólne') categories.add(p.subCategory);
        });
        Array.from(categories).sort().forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.innerText = c;
            if (c === currentVal) opt.selected = true;
            pimCategoryFilter.appendChild(opt);
        });
    };

    window.populatePimSuppliers = function populatePimSuppliers() {
        const pimSupplierFilter = document.getElementById('pimSupplierFilter');
        if (!pimSupplierFilter || typeof Database === 'undefined') return;
        const currentVal = pimSupplierFilter.value;
        pimSupplierFilter.innerHTML = '<option value="">Wszyscy dostawcy</option>';
        const suppliers = Database.getSuppliers();
        suppliers.forEach(s => {
            if (s && s.name) {
                const opt = document.createElement('option');
                opt.value = s.name;
                opt.innerText = s.name;
                if (s.name === currentVal) opt.selected = true;
                pimSupplierFilter.appendChild(opt);
            }
        });
    };

    const pimSearchInput = document.getElementById('pimSearchInput');
    const pimCategoryFilter = document.getElementById('pimCategoryFilter');
    const pimSupplierFilter = document.getElementById('pimSupplierFilter');
    const pimCompareMode = document.getElementById('pimCompareMode');

    window.populatePimSuppliers();
    window.populatePimCategories();

    const refreshPim = () => {
        const isCompareOnly = pimCompareMode ? pimCompareMode.checked : false;
        const catVal = pimCategoryFilter ? pimCategoryFilter.value : '';
        const searchVal = pimSearchInput ? pimSearchInput.value : '';
        const suppVal = pimSupplierFilter ? pimSupplierFilter.value : '';
        renderPimView(searchVal, suppVal, catVal, isCompareOnly);
    };

    if (pimSearchInput) pimSearchInput.addEventListener('input', refreshPim);
    if (pimSupplierFilter) pimSupplierFilter.addEventListener('change', refreshPim);
    if (pimCategoryFilter) pimCategoryFilter.addEventListener('change', refreshPim);
    if (pimCompareMode) pimCompareMode.addEventListener('change', refreshPim);

    window.executeAutoCategorize = function executeAutoCategorize() {
        if (typeof Scraper !== 'undefined' && Scraper.autoCategorizeDatabase) {
            const count = Scraper.autoCategorizeDatabase();
            if (count > 0) {
                alert(`Pomyślnie automatycznie skategoryzowano ${count} produktów w bazie!`);
            } else {
                alert("Wszystkie towary posiadają już zdefiniowane właściwe kategorie.");
            }
            if (typeof window.populatePimCategories === 'function') window.populatePimCategories();
            if (typeof window.updateDashboardStats === 'function') window.updateDashboardStats();
            if (typeof window.renderPimView === 'function') window.renderPimView();
        }
    };

    window.executeConsolidateDb = function executeConsolidateDb() {
        if (typeof Database !== 'undefined' && Database.consolidateDatabase) {
            const count = Database.consolidateDatabase();
            if (count > 0) {
                alert(`Pomyślnie połączono ${count} zduplikowanych pozycji w bazie przy użyciu inteligentnych reguł!`);
            } else {
                alert("Baza jest już optymalnie scalona - nie znaleziono nowych duplikatów z hurtowni.");
            }
            if (typeof window.populatePimCategories === 'function') window.populatePimCategories();
            if (typeof window.updateDashboardStats === 'function') window.updateDashboardStats();
            if (typeof window.renderPimView === 'function') window.renderPimView();
        }
    };

    const btnAutoMergeQuarantine = document.getElementById('btnAutoMergeQuarantine');
    if (btnAutoMergeQuarantine) {
        btnAutoMergeQuarantine.addEventListener('click', () => {
            const drafts = Database.getDrafts();
            const products = Database.getProducts();
            let mergedCount = 0;

            drafts.forEach(draft => {
                const match = Database.findMatchingProduct(products, draft.ean, draft.sku, draft.name);
                if (match) {
                    Database.addPriceOffer(match.ean || draft.ean, match.sku || draft.sku, match.name, draft.supplierName, draft.unitPrice, draft.date, draft.extraData);
                    Database.deleteDraft(draft.id);
                    mergedCount++;
                }
            });

            if (mergedCount > 0) {
                alert(`Automatycznie połączono ${mergedCount} towarów z Kwarantanny z istniejącymi produktami w bazie!`);
            } else {
                alert("Brak towarów w Kwarantannie z pasującymi odpowiednikami w bazie.");
            }
            populatePimCategories();
            updateDashboardStats();
            renderQuarantineView();
            renderPimView();
        });
    }

    window.cleanSearchQuery = function cleanSearchQuery(str) {
        if (!str) return '';
        let norm = str.toLowerCase()
            .replace(/квас/g, 'kwas')
            .replace(/kvas/g, 'kwas')
            .replace(/а/g, 'a').replace(/б/g, 'b').replace(/в/g, 'w').replace(/г/g, 'g')
            .replace(/д/g, 'd').replace(/е/g, 'e').replace(/ё/g, 'e').replace(/ж/g, 'z')
            .replace(/з/g, 'z').replace(/и/g, 'i').replace(/й/g, 'j').replace(/к/g, 'k')
            .replace(/л/g, 'l').replace(/м/g, 'm').replace(/н/g, 'n').replace(/о/g, 'o')
            .replace(/п/g, 'p').replace(/р/g, 'r').replace(/с/g, 's').replace(/т/g, 't')
            .replace(/у/g, 'u').replace(/ф/g, 'f').replace(/х/g, 'h').replace(/ц/g, 'c')
            .replace(/ч/g, 'cz').replace(/ш/g, 'sz').replace(/щ/g, 'szcz').replace(/ы/g, 'y')
            .replace(/э/g, 'e').replace(/ю/g, 'ju').replace(/я/g, 'ja')
            .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
            .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
            .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
            .replace(/v/g, 'w');
            
        return norm.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    window.searchMatchesProduct = function searchMatchesProduct(p, searchQuery) {
        if (!searchQuery) return true;
        const cleanQ = cleanSearchQuery(searchQuery);
        if (!cleanQ) return true;

        const terms = cleanQ.split(' ').filter(t => t.length > 0);
        if (terms.length === 0) return true;

        const rawOffersStr = p.offers ? p.offers.map(o => o.source || '').join(' ') : '';
        const targetText = cleanSearchQuery([
            p.name || '',
            p.category || '',
            p.subCategory || '',
            p.description || '',
            p.ean || '',
        ].join(' '));

        return terms.every(term => targetText.includes(term));
    };
    let _currentMergeSourcePid = null;

    function openManualMergeModal(sourcePid) {
        _currentMergeSourcePid = sourcePid;
        const products = Database.getProducts();
        const sourceProduct = products.find(p => p.id === sourcePid);
        if (!sourceProduct) return;

        const nameEl = document.getElementById('mergeSourceProductName');
        const detailsEl = document.getElementById('mergeSourceProductDetails');
        const searchInput = document.getElementById('mergeSearchInput');
        const selectEl = document.getElementById('mergeTargetSelect');

        if (nameEl) nameEl.innerText = sourceProduct.name;
        if (detailsEl) detailsEl.innerText = `EAN: ${sourceProduct.ean || '-'} | Kategoria: ${sourceProduct.category || 'Ogólne'} | Obecne Hurtownie: ${sourceProduct.offers ? sourceProduct.offers.map(o => o.source).join(', ') : 'brak'}`;
        if (searchInput) searchInput.value = '';

        const populateTargets = (query = '') => {
            if (!selectEl) return;
            selectEl.innerHTML = '';

            let otherProducts = products.filter(p => p.id !== sourcePid);
            if (query) {
                otherProducts = otherProducts.filter(p => searchMatchesProduct(p, query));
            } else {
                otherProducts.sort((a, b) => {
                    const simA = Database.calculateSimilarity(sourceProduct.name, a.name);
                    const simB = Database.calculateSimilarity(sourceProduct.name, b.name);
                    return simB - simA;
                });
            }

            otherProducts.forEach((p, idx) => {
                const sim = Database.calculateSimilarity(sourceProduct.name, p.name);
                const isReco = sim >= 0.3 || (sourceProduct.category && p.category === sourceProduct.category);
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.style.padding = '4px 8px';
                opt.style.color = isReco ? '#4ade80' : '#ffffff';
                opt.innerText = `${isReco ? '⭐ [Rekomendowane] ' : ''}${p.name} (Hurtownie: ${p.offers ? p.offers.map(o => o.source).join(', ') : '-'})`;
                if (idx === 0) opt.selected = true;
                selectEl.appendChild(opt);
            });

            if (otherProducts.length === 0) {
                selectEl.innerHTML = '<option value="" disabled style="color:#94a3b8;">Brak pasujących artykułów w bazie</option>';
            }
        };

        populateTargets();

        if (searchInput) {
            searchInput.oninput = (e) => populateTargets(e.target.value);
        }

        openModal('manualMergeModal');
    }

    const btnConfirmManualMerge = document.getElementById('btnConfirmManualMerge');
    if (btnConfirmManualMerge) {
        btnConfirmManualMerge.addEventListener('click', () => {
            const selectEl = document.getElementById('mergeTargetSelect');
            const targetId = selectEl ? selectEl.value : null;

            if (!targetId || !_currentMergeSourcePid) {
                return alert("Wybierz towar z listy, z którym chcesz dokonać połączenia.");
            }

            const success = Database.mergeProducts(targetId, _currentMergeSourcePid);
            if (success) {
                closeModal('manualMergeModal');
                alert("Towary zostały pomyślnie połączone! Od teraz oferty obu hurtowni są porównywane razem.");
                populatePimCategories();
                updateDashboardStats();
                renderPimView();
            } else {
                alert("Wystąpił błąd podczas scalania produktów.");
            }
        });
    }

    const btnCloseMergeModal = document.getElementById('btnCloseMergeModal');
    if (btnCloseMergeModal) btnCloseMergeModal.addEventListener('click', () => closeModal('manualMergeModal'));
    
    const btnCancelMergeModal = document.getElementById('btnCancelMergeModal');
    if (btnCancelMergeModal) btnCancelMergeModal.addEventListener('click', () => closeModal('manualMergeModal'));

    const btnAutoCleanAndMerge = document.getElementById('btnAutoCleanAndMerge');
    if (btnAutoCleanAndMerge) {
        btnAutoCleanAndMerge.addEventListener('click', () => {
            const res = Database.autoCleanAndMergeAllProducts();
            alert(`MAGICZNA OPTYMALIZACJA BAZY:\n\n✨ Pomyślnie wyczyszczono i sformatowano ${res.cleanedCount} nieczytelnych nazw towarów!\n🔗 Automatycznie połączono ${res.mergedCount} duplikatów z różnych hurtowni w połączone karty porównawcze!`);
            populatePimCategories();
            updateDashboardStats();
            renderPimView();
        });
    }

    // --- NAKŁADKA ANALITYCZNA I GENEROWANIE RAPORTÓW DLA PARTNERÓW BIZNESOWYCH ---
    const partnerCategoryFilter = document.getElementById('partnerCategoryFilter');
    const analyticsCategoryFilter = document.getElementById('analyticsCategoryFilter');
    const analyticsDiffFilter = document.getElementById('analyticsDiffFilter');
    const btnExportAnalyticsExcel = document.getElementById('btnExportAnalyticsExcel');
    const btnPrintAnalyticsReport = document.getElementById('btnPrintAnalyticsReport');
    const btnPrintPartnerA4 = document.getElementById('btnPrintPartnerA4');
    const btnSavePartnerExcel = document.getElementById('btnSavePartnerExcel');

    // DELEGACJA ZDARZEŃ NA DOCUMENT.BODY DLA PEWNOŚCI KLIKNIĘĆ PRZYCISKÓW / IKON
    document.body.addEventListener('click', (e) => {
        const mergeBtn = e.target.closest('.btn-merge-product');
        if (mergeBtn) {
            e.preventDefault();
            const pid = mergeBtn.getAttribute('data-pid');
            if (pid) {
                openManualMergeModal(pid);
            }
            return;
        }

        const partnerWinBtn = e.target.closest('#btnOpenPartnerWindow');
        if (partnerWinBtn) {
            e.preventDefault();
            try {
                openPartnerReportInNewWindow();
            } catch(err) {
                console.error("Partner Window Error:", err);
                alert("Błąd podczas otwierania raportu w nowym oknie: " + err.message);
            }
            return;
        }

        const partnerBtn = e.target.closest('#btnPartnerReport');
        if (partnerBtn) {
            e.preventDefault();
            try {
                openPartnerReportInNewWindow();
            } catch(err) {
                console.error("Partner Report Open Error:", err);
                alert("Wystąpił problem przy otwieraniu raportu: " + err.message);
            }
            return;
        }

        const analyticsBtn = e.target.closest('#btnGenerateAnalytics');
        if (analyticsBtn) {
            e.preventDefault();
            try {
                populateAnalyticsCategories();
                renderAnalyticsReport();
                openModal('analyticsModal');
            } catch(err) {
                console.error("Analytics Modal Open Error:", err);
                alert("Wystąpił problem przy otwieraniu analityki: " + err.message);
            }
            return;
        }
    });

    function openPartnerReportInNewWindow() {
        let products = window._currentlyComparedProducts && window._currentlyComparedProducts.length > 0 ? window._currentlyComparedProducts : Database.getProducts();
        const suppliersList = Database.getSuppliers();
        const suppliersMap = {};
        suppliersList.forEach(s => {
            if (s && s.name) {
                suppliersMap[s.name.toString().toLowerCase().trim()] = s;
            }
        });

        let totalSavingsSum = 0;
        let totalDiffPctSum = 0;
        let diffPctCount = 0;
        const supplierWins = {};
        const reportRows = [];

        products.forEach(p => {
            if (!p.offers || p.offers.length === 0) return;

            // Sortujemy WSZYSTKIE oferty danego towaru od najtańszej do najdroższej
            const sortedOffers = [...p.offers].map(o => ({
                supplierName: o.source || 'Dostawca',
                price: parseFloat(o.price) || 0,
                rawOffer: o
            })).sort((a, b) => a.price - b.price);

            const cheapest = sortedOffers.find(o => o.rawOffer && o.rawOffer.isAvailable !== false) || sortedOffers[0];
            const highest = sortedOffers[sortedOffers.length - 1];

            const cheapestPrice = cheapest.price;
            const highestPrice = highest.price;
            const diffAmount = Math.max(0, highestPrice - cheapestPrice);
            const diffPercent = cheapestPrice > 0 ? ((diffAmount / cheapestPrice) * 100) : 0;

            if (diffPercent > 0) {
                totalSavingsSum += diffAmount;
                totalDiffPctSum += diffPercent;
                diffPctCount++;
            }

            const cheapestSuppName = cheapest.supplierName;
            if (supplierWins[cheapestSuppName]) {
                supplierWins[cheapestSuppName]++;
            } else {
                supplierWins[cheapestSuppName] = 1;
            }

            const suppData = suppliersMap[cheapestSuppName.toLowerCase().trim()] || {};
            const deliveryDays = suppData.deliveryDays || '-';
            const minOrder = suppData.minOrder ? `${suppData.minOrder} zł` : '-';
            const contact = suppData.contact || '-';

            reportRows.push({
                product: p,
                allOffers: sortedOffers,
                cheapest,
                highest,
                diffAmount,
                diffPercent,
                deliveryDays,
                minOrder,
                contact
            });
        });

        let bestSupp = '-';
        let maxWins = 0;
        Object.entries(supplierWins).forEach(([supp, wins]) => {
            if (wins > maxWins) {
                maxWins = wins;
                bestSupp = `${supp} (${wins} najtańszych towarów)`;
            }
        });

        const avgDiff = diffPctCount > 0 ? (totalDiffPctSum / diffPctCount).toFixed(1) : '0';
        const dateStr = new Date().toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' });

        let rowsHtml = '';
        reportRows.forEach((r, idx) => {
            const isDiff = r.diffAmount > 0.01;

            // Wyświetlamy ofertę DOKŁADNIE KAŻDEGO DOSTAWCE dla danego towaru
            let offersListHtml = r.allOffers.map((off, oIdx) => {
                const isAvailable = off.rawOffer ? off.rawOffer.isAvailable !== false : true;
                const isCheapest = off === r.cheapest && isAvailable;
                const isHighest = off === r.highest && r.allOffers.length > 1 && isAvailable;
                const priceDiffFromCheapest = off.price - r.cheapest.price;
                
                let badge = '';
                if (!isAvailable) {
                    badge = `<span style="color:#d97706; font-weight:700; font-size:9px; background:#fef3c7; padding:1px 6px; border-radius:10px;">⚠️ Chwilowy brak na stanie</span>`;
                } else if (isCheapest) {
                    badge = `<span style="color:#16a34a; font-weight:700; font-size:10px; background:#dcfce7; padding:1px 6px; border-radius:10px;">NAJTANIEJ ✓</span>`;
                } else if (priceDiffFromCheapest > 0) {
                    badge = `<span style="color:#dc2626; font-size:10px;">(+${priceDiffFromCheapest.toFixed(2)} zł)</span>`;
                }

                let trendText = '';
                if (off.rawOffer && off.rawOffer.priceChangePct > 0) {
                    trendText = `<span style="color:#dc2626; font-size:9px; font-weight:700; margin-left:4px;" title="Wzrost ceny o ${off.rawOffer.priceChangePct}%">📈 +${off.rawOffer.priceChangePct}%</span>`;
                } else if (off.rawOffer && off.rawOffer.priceChangePct < 0) {
                    trendText = `<span style="color:#16a34a; font-size:9px; font-weight:700; margin-left:4px;" title="Obniżka ceny o ${Math.abs(off.rawOffer.priceChangePct)}%">📉 ${off.rawOffer.priceChangePct}%</span>`;
                }

                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px; padding:3px 6px; background:${!isAvailable ? '#fffbeb' : (isCheapest ? '#f0fdf4' : (isHighest ? '#fff1f2' : '#f8fafc'))}; border-radius:6px; border-left: 3px solid ${!isAvailable ? '#f59e0b' : (isCheapest ? '#16a34a' : (isHighest ? '#f43f5e' : '#cbd5e1'))};">
                        <span><strong>${off.supplierName}</strong> ${trendText}</span>
                        <span><strong style="color:${isCheapest ? '#16a34a' : '#1e293b'};">${off.price.toFixed(2)} zł</strong> ${badge}</span>
                    </div>
                `;
            }).join('');

            rowsHtml += `
                <tr style="border-bottom: 1px solid #cbd5e1;">
                    <td style="padding: 10px; font-size:12px; vertical-align:top;">
                        <strong style="color:#0f172a;">${idx + 1}. ${r.product.name}</strong>
                        <div style="font-size:10px; color:#64748b; margin-top:2px;">EAN: ${r.product.ean || '-'} | Kat: ${r.product.category || 'Ogólne'}</div>
                    </td>
                    <td style="padding: 10px; font-size:12px; vertical-align:top;">
                        ${offersListHtml}
                    </td>
                    <td style="padding: 10px; text-align:center; font-size:12px; vertical-align:top;">
                        ${isDiff ? `<span style="background:#fee2e2; color:#dc2626; padding:4px 8px; border-radius:12px; font-weight:700; font-size:11px; display:inline-block;">+${r.diffAmount.toFixed(2)} zł (+${r.diffPercent.toFixed(1)}%)</span>` : '<span style="color:#94a3b8;">-</span>'}
                    </td>
                    <td style="padding: 10px; font-size:11px; color:#475569; vertical-align:top;">
                        <div>Dostawy: <strong>${r.deliveryDays}</strong></div>
                        <div>Min. zamówienia: <strong>${r.minOrder}</strong></div>
                        <div style="font-size:10px; color:#64748b; margin-top:2px;">Kontakt: ${r.contact}</div>
                    </td>
                </tr>
            `;
        });

        const fullHtml = `
        <!DOCTYPE html>
        <html lang="pl">
        <head>
            <meta charset="UTF-8">
            <title>Raport Porównawczy dla Partnerów Biznesowych - ${dateStr}</title>
            <style>
                @page { size: A4 portrait; margin: 12mm; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; background: #f8fafc; }
                .report-card { background: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #cbd5e1; max-width: 960px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
                .header-flex { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px; }
                .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; }
                .kpi-box { background: #f1f5f9; padding: 15px; border-radius: 8px; border-left: 4px solid #0284c7; }
                .kpi-box.green { border-left-color: #16a34a; background: #f0fdf4; }
                .kpi-val { font-size: 22px; font-weight: bold; margin-top: 5px; color: #0f172a; }
                .kpi-val.green { color: #16a34a; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th { background: #e2e8f0; color: #1e293b; padding: 10px; font-size: 12px; text-align: left; border-bottom: 2px solid #cbd5e1; }
                .action-bar { background: #0f172a; color: #fff; padding: 15px 25px; display: flex; justify-content: space-between; align-items: center; border-radius: 12px; margin-bottom: 20px; max-width: 960px; margin-left: auto; margin-right: auto; }
                .btn-action { background: #10b981; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; text-decoration: none; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); }
                .btn-action:hover { background: #059669; }
                @media print {
                    .action-bar { display: none !important; }
                    body { background: #fff; padding: 0; }
                    .report-card { border: none; box-shadow: none; padding: 0; }
                }
            </style>
        </head>
        <body>

            <div class="action-bar">
                <div>
                    <strong style="font-size:16px;">📑 Raport Porównawczy Gotowy do Wydruku lub Zapisu w PDF</strong>
                    <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Kliknij przycisk po prawej, aby system zapytał w jakim folderze na komputerze zapisać plik PDF!</div>
                </div>
                <button class="btn-action" onclick="window.print();">🖨️ Zapisz jako PDF / Drukuj A4 (Wybierz Folder)</button>
            </div>

            <div class="report-card">
                <div class="header-flex">
                    <div>
                        <h1 style="margin: 0; font-size: 22px; text-transform: uppercase; color: #0f172a;">Raport Porównania Ofert i Warunków Dostawców</h1>
                        <div style="font-size: 13px; color: #64748b; margin-top: 5px;">Zestawienie dla Partnerów Biznesowych • Data wygenerowania: <strong>${dateStr}</strong></div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 14px; font-weight: bold; color: #0284c7;">PORÓWNYWARKA CEN B2B</div>
                        <div style="font-size: 11px; color: #64748b;">Pozycje w raporcie: <strong>${reportRows.length}</strong></div>
                    </div>
                </div>

                <div class="kpi-grid">
                    <div class="kpi-box green">
                        <div style="font-size: 11px; color: #166534; font-weight: bold;">Szacowana Oszczędność Zakupowa</div>
                        <div class="kpi-val green">${totalSavingsSum.toFixed(2)} zł</div>
                    </div>
                    <div class="kpi-box">
                        <div style="font-size: 11px; color: #0369a1; font-weight: bold;">Lider Najniższych Cen</div>
                        <div class="kpi-val" style="font-size: 15px;">${bestSupp}</div>
                    </div>
                    <div class="kpi-box">
                        <div style="font-size: 11px; color: #475569; font-weight: bold;">Średnia Obniżka Kosztów</div>
                        <div class="kpi-val">+${avgDiff}%</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 30%;">Produkt / Kod EAN</th>
                            <th style="width: 40%;">Wszyscy Dostawcy i Ceny Netto</th>
                            <th style="width: 15%; text-align: center;">Oszczędność (Rozrzut)</th>
                            <th style="width: 15%;">Warunki Najtańszego</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="4" style="text-align:center; padding:30px; color:#64748b;">Brak przefiltrowanych produktów do porównania.</td></tr>'}
                    </tbody>
                </table>

                <div style="margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 15px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b;">
                    <div>Wygenerowano z systemu Porównywarka Cen B2B. Wszystkie kwoty netto.</div>
                    <div style="text-align: right; width: 220px; border-top: 1px dashed #64748b; padding-top: 5px; margin-top: 25px;">
                        Podpis Partnera Biznesowego
                    </div>
                </div>
            </div>

        </body>
        </html>
        `;

        const win = window.open('', '_blank', 'width=1050,height=850');
        if (win) {
            win.document.write(fullHtml);
            win.document.close();
        } else {
            alert("Przeglądarka zablokowała otwarcie osobnego okna. Kliknij ikonę w pasku adresu, by zezwolić na okna dla tej strony!");
        }
    }

    if (partnerCategoryFilter) {
        partnerCategoryFilter.addEventListener('change', renderPartnerReport);
    }

    if (btnPrintPartnerA4) {
        btnPrintPartnerA4.addEventListener('click', () => {
            window.print();
        });
    }

    if (btnSavePartnerExcel) {
        btnSavePartnerExcel.addEventListener('click', () => {
            exportAnalyticsExcelWithPicker(window._partnerReportRows);
        });
    }

    function populatePartnerCategories() {
        if (!partnerCategoryFilter) return;
        const products = Database.getProducts();
        const categories = new Set();
        products.forEach(p => {
            if (p.category) categories.add(p.category);
        });
        
        let html = '<option value="">Wszystkie kategorie</option>';
        Array.from(categories).sort().forEach(cat => {
            html += `<option value="${cat}">${cat}</option>`;
        });
        partnerCategoryFilter.innerHTML = html;
    }

    function renderPartnerReport() {
        const tbody = document.getElementById('partnerReportTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const dateEl = document.getElementById('partnerReportDate');
        if (dateEl) dateEl.innerText = new Date().toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' });

        let products = window._currentlyComparedProducts && window._currentlyComparedProducts.length > 0 ? window._currentlyComparedProducts : Database.getProducts();
        const suppliersList = Database.getSuppliers();
        const suppliersMap = {};
        suppliersList.forEach(s => {
            if (s && s.name) {
                suppliersMap[s.name.toString().toLowerCase().trim()] = s;
            }
        });

        const selectedCat = partnerCategoryFilter ? partnerCategoryFilter.value : '';
        if (selectedCat) {
            products = products.filter(p => p.category === selectedCat);
        }

        let totalSavingsSum = 0;
        let totalDiffPctSum = 0;
        let diffPctCount = 0;
        const supplierWins = {};
        const partnerRows = [];

        products.forEach(p => {
            if (!p.offers || p.offers.length === 0) return;

            const cheapest = Database.getCheapestWholesaleOffer(p);
            const highest = Database.getHighestWholesaleOffer(p);

            if (!cheapest) return;

            const cheapestSuppName = cheapest.supplierName ? cheapest.supplierName.toString() : 'Dostawca';
            const otherOffer = highest && highest.supplierName !== cheapest.supplierName ? highest : p.offers.find(o => o.source !== cheapest.supplierName) || cheapest;
            const cheapestPrice = cheapest.price || 0;
            const otherPrice = otherOffer ? (otherOffer.price || 0) : cheapestPrice;
            const diffAmount = Math.max(0, otherPrice - cheapestPrice);
            const diffPercent = cheapestPrice > 0 ? ((diffAmount / cheapestPrice) * 100) : 0;

            if (diffPercent > 0) {
                totalSavingsSum += diffAmount;
                totalDiffPctSum += diffPercent;
                diffPctCount++;
            }

            if (supplierWins[cheapestSuppName]) {
                supplierWins[cheapestSuppName]++;
            } else {
                supplierWins[cheapestSuppName] = 1;
            }

            // Pobieramy dane CRM dla najtańszego dostawcy (min. order, dni dostaw, kontakt)
            const suppData = suppliersMap[cheapestSuppName.toLowerCase().trim()] || {};
            const deliveryDays = suppData.deliveryDays || '-';
            const minOrder = suppData.minOrder ? `${suppData.minOrder} zł` : '-';
            const contact = suppData.contact || '-';

            partnerRows.push({
                product: p,
                cheapest,
                otherOffer,
                diffAmount,
                diffPercent,
                deliveryDays,
                minOrder,
                contact
            });
        });

        // Wypełniamy karty menedżerskie dla Zarządu / Partnerów
        const elTotal = document.getElementById('partnerTotalSavings');
        if (elTotal) elTotal.innerText = `${totalSavingsSum.toFixed(2)} zł`;

        const avgDiff = diffPctCount > 0 ? (totalDiffPctSum / diffPctCount).toFixed(1) : '0';
        const elAvg = document.getElementById('partnerAvgSavingsPct');
        if (elAvg) elAvg.innerText = `+${avgDiff}%`;

        let bestSupp = '-';
        let maxWins = 0;
        Object.entries(supplierWins).forEach(([supp, wins]) => {
            if (wins > maxWins) {
                maxWins = wins;
                bestSupp = `${supp} (${wins} najtańszych towarów)`;
            }
        });
        const elBest = document.getElementById('partnerBestSupplier');
        if (elBest) elBest.innerText = bestSupp;

        if (partnerRows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-dim);">Brak towarów spełniających kryteria raportu.</td></tr>';
            return;
        }

        partnerRows.forEach(row => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

            const isDiff = row.diffAmount > 0.01;
            const badgeColor = row.diffPercent >= 15 ? 'var(--danger)' : (row.diffPercent >= 5 ? 'var(--warning)' : 'var(--success)');

            tr.innerHTML = `
                <td style="padding:10px;">
                    <strong style="color:#fff;">${row.product.name}</strong>
                    <div style="font-size:10px; color:var(--text-dim);">EAN: ${row.product.ean || '-'} | Kat: ${row.product.category || 'Ogólne'}</div>
                </td>
                <td style="padding:10px;">
                    <div style="font-weight:600; color:var(--text-main);">${row.otherOffer.price.toFixed(2)} zł</div>
                    <div style="font-size:10px; color:var(--text-dim);">${row.otherOffer.supplierName}</div>
                </td>
                <td style="padding:10px;">
                    <div style="font-weight:700; color:var(--success);">${row.cheapest.price.toFixed(2)} zł</div>
                    <div style="font-size:10px; color:var(--secondary); font-weight:600;"><i class="fa-solid fa-circle-check"></i> ${row.cheapest.supplierName}</div>
                </td>
                <td style="padding:10px; text-align:center;">
                    ${isDiff ? `
                        <span style="background:rgba(16, 185, 129, 0.15); color:${badgeColor}; padding:4px 8px; border-radius:12px; font-weight:700; font-size:11px;">
                            -${row.diffAmount.toFixed(2)} zł (-${row.diffPercent.toFixed(1)}%)
                        </span>
                    ` : '<span style="color:var(--text-dim);">-</span>'}
                </td>
                <td style="padding:10px; font-size:11px;">
                    <div style="color:var(--text-muted);"><i class="fa-solid fa-truck"></i> Dostawy: <strong>${row.deliveryDays}</strong></div>
                    <div style="color:var(--text-muted);"><i class="fa-solid fa-box"></i> Min: <strong>${row.minOrder}</strong></div>
                    <div style="color:var(--text-dim); font-size:10px;"><i class="fa-solid fa-phone"></i> ${row.contact}</div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        window._partnerReportRows = partnerRows;
    }

    if (analyticsCategoryFilter) {
        analyticsCategoryFilter.addEventListener('change', () => { if (typeof window.renderAnalyticsReport === 'function') window.renderAnalyticsReport(); });
    }
    if (analyticsDiffFilter) {
        analyticsDiffFilter.addEventListener('change', () => { if (typeof window.renderAnalyticsReport === 'function') window.renderAnalyticsReport(); });
    }

    window.populateAnalyticsCategories = function populateAnalyticsCategories() {
        if (!analyticsCategoryFilter) return;
        const products = Database.getProducts();
        const categories = new Set();
        products.forEach(p => {
            if (p.category) categories.add(p.category);
        });
        
        let html = '<option value="">Wszystkie kategorie</option>';
        Array.from(categories).sort().forEach(cat => {
            html += `<option value="${cat}">${cat}</option>`;
        });
        analyticsCategoryFilter.innerHTML = html;
    };

    window.renderAnalyticsReport = function renderAnalyticsReport() {
        const tbody = document.getElementById('analyticsReportTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        let products = window._currentlyComparedProducts && window._currentlyComparedProducts.length > 0 ? window._currentlyComparedProducts : Database.getProducts();
        const selectedCat = analyticsCategoryFilter ? analyticsCategoryFilter.value : '';
        const minDiffPct = analyticsDiffFilter ? parseFloat(analyticsDiffFilter.value) || 0 : 0;

        if (selectedCat) {
            products = products.filter(p => p.category === selectedCat);
        }

        let totalSavingsSum = 0;
        let multiSupplierCount = 0;
        let totalDiffPctSum = 0;
        let diffPctCount = 0;
        const supplierWins = {};

        const reportRows = [];

        products.forEach(p => {
            if (!p.offers || p.offers.length === 0) return;

            const cheapest = Database.getCheapestWholesaleOffer(p);
            const highest = Database.getHighestWholesaleOffer(p);

            if (!cheapest || !highest) return;

            const cheapestPrice = cheapest.price;
            const highestPrice = highest.price;
            const diffAmount = highestPrice - cheapestPrice;
            const diffPercent = cheapestPrice > 0 ? ((diffAmount / cheapestPrice) * 100) : 0;

            if (p.offers.length > 1) multiSupplierCount++;
            if (diffPercent > 0) {
                totalDiffPctSum += diffPercent;
                diffPctCount++;
                totalSavingsSum += diffAmount;
            }

            const suppName = cheapest.source || cheapest.supplierName || 'Dostawca';
            if (supplierWins[suppName]) {
                supplierWins[suppName]++;
            } else {
                supplierWins[suppName] = 1;
            }

            if (minDiffPct > 0 && diffPercent < minDiffPct) return;

            const vatStr = p.vat && p.vat !== 'nd.' ? (p.vat.includes('%') ? p.vat : p.vat + '%') : '23%';
            const clientPrice = Database.calculateClientPrice(highestPrice, p);
            const profit = clientPrice - cheapestPrice;

            reportRows.push({
                product: p,
                cheapest,
                highest,
                diffAmount,
                diffPercent,
                vatStr,
                clientPrice,
                profit
            });
        });

        // KPI Updates
        const elSavings = document.getElementById('kpiTotalSavings');
        if (elSavings) elSavings.innerText = `${totalSavingsSum.toFixed(2)} zł`;

        const elMulti = document.getElementById('kpiMultiSupplierCount');
        if (elMulti) elMulti.innerText = multiSupplierCount;
        
        const avgDiff = diffPctCount > 0 ? (totalDiffPctSum / diffPctCount).toFixed(1) : '0';
        const elAvg = document.getElementById('kpiAvgDiffPct');
        if (elAvg) elAvg.innerText = `+${avgDiff}%`;

        // Supplier Leader Calculation
        let bestSupp = '-';
        let maxWins = 0;
        Object.entries(supplierWins).forEach(([supp, wins]) => {
            if (wins > maxWins) {
                maxWins = wins;
                bestSupp = `${supp} (${wins} najtańszych)`;
            }
        });
        const elLeader = document.getElementById('kpiBestSupplier');
        if (elLeader) elLeader.innerText = bestSupp;

        if (reportRows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-dim);">Brak danych spełniających kryteria analityczne.</td></tr>';
            return;
        }

        reportRows.forEach(row => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            
            const isDiff = row.diffAmount > 0.01;
            const badgeColor = row.diffPercent >= 15 ? 'var(--danger)' : (row.diffPercent >= 5 ? 'var(--warning)' : 'var(--success)');

            tr.innerHTML = `
                <td style="padding:10px;">
                    <strong style="color:#fff;">${row.product.name}</strong>
                    <div style="font-size:10px; color:var(--text-dim);">EAN: ${row.product.ean || '-'} | Kat: ${row.product.category || 'Ogólne'}</div>
                </td>
                <td style="padding:10px;">
                    <span style="color:var(--success); font-weight:600;">${row.cheapest.price.toFixed(2)} zł</span>
                    <div style="font-size:10px; color:var(--text-dim);">${row.cheapest.source || row.cheapest.supplierName || '-'}</div>
                </td>
                <td style="padding:10px;">
                    <span style="color:${isDiff ? 'var(--danger)' : 'var(--text-muted)'};">${row.highest.price.toFixed(2)} zł</span>
                    <div style="font-size:10px; color:var(--text-dim);">${row.highest.source || row.highest.supplierName || '-'}</div>
                </td>
                <td style="padding:10px; text-align:center;">
                    ${isDiff ? `
                        <span style="background:rgba(239, 68, 68, 0.15); color:${badgeColor}; padding:3px 8px; border-radius:12px; font-weight:700; font-size:11px;">
                            +${row.diffAmount.toFixed(2)} zł (+${row.diffPercent.toFixed(1)}%)
                        </span>
                    ` : '<span style="color:var(--text-dim);">-</span>'}
                </td>
                <td style="padding:10px; text-align:center;">
                    <span style="background:rgba(6, 182, 212, 0.15); color:var(--secondary); padding:2px 6px; border-radius:8px; font-size:11px;">${row.vatStr}</span>
                </td>
                <td style="padding:10px; text-align:right; font-weight:600; color:#fff;">
                    ${row.clientPrice.toFixed(2)} zł
                </td>
                <td style="padding:10px; text-align:right; font-weight:700; color:var(--success);">
                    +${row.profit.toFixed(2)} zł
                </td>
            `;
            tbody.appendChild(tr);
        });

        window._currentAnalyticsRows = reportRows;
    }

    const btnExportDirectExcel = document.getElementById('btnExportDirectExcel');
    if (btnExportDirectExcel) {
        btnExportDirectExcel.addEventListener('click', (e) => {
            e.preventDefault();
            renderAnalyticsReport();
            exportAnalyticsExcelWithPicker(window._currentAnalyticsRows);
        });
    }

    // --- EKSPORT DO EXCEL (.XLSX) Z KREATOREM WYBORU FOLDERU NA KOMPUTERZE ---
    if (btnExportAnalyticsExcel) {
        btnExportAnalyticsExcel.addEventListener('click', (e) => {
            e.preventDefault();
            exportAnalyticsExcelWithPicker(window._currentAnalyticsRows);
        });
    }

    async function exportAnalyticsExcelWithPicker(rows) {
        let products = window._currentlyComparedProducts && window._currentlyComparedProducts.length > 0 ? window._currentlyComparedProducts : Database.getProducts();
        if (!products || products.length === 0) return alert("Brak produktów w bazie do wygenerowania raportu Excel.");
        if (typeof XLSX === 'undefined') return alert("Biblioteka SheetJS (XLSX) nie jest jeszcze załadowana.");

        const excelData = products.map(p => {
            if (!p.offers || p.offers.length === 0) return null;

            const sortedOffers = [...p.offers].map(o => ({
                supplierName: o.source || 'Dostawca',
                price: parseFloat(o.price) || 0
            })).sort((a, b) => a.price - b.price);

            const cheapest = sortedOffers[0];
            const highest = sortedOffers[sortedOffers.length - 1];
            const diffAmount = highest.price - cheapest.price;
            const diffPercent = cheapest.price > 0 ? ((diffAmount / cheapest.price) * 100) : 0;

            const allOffersText = sortedOffers.map(o => `${o.supplierName}: ${o.price.toFixed(2)} zł`).join(' | ');

            return {
                'Nazwa Produktu': p.name,
                'Kod EAN': p.ean || '',
                'Symbol SKU': p.sku || '',
                'Kategoria': p.category || 'Inne',
                'Liczba Ofert w Bazie': sortedOffers.length,
                'Wszyscy Dostawcy i Ceny (zł)': allOffersText,
                'Najtańsza Hurtownia': cheapest.supplierName,
                'Cena Najniższa Netto (zł)': cheapest.price,
                'Najdroższa Hurtownia': highest.supplierName,
                'Cena Najwyższa Netto (zł)': highest.price,
                'Oszczędność Maksymalna (zł)': parseFloat(diffAmount.toFixed(2)),
                'Rozrzut Cenowy (%)': parseFloat(diffPercent.toFixed(1)),
                'Stawka VAT': p.vat || '23%'
            };
        }).filter(Boolean);

        if (excelData.length === 0) return alert("Brak ofert dostawców dla wybranych towarów.");

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Raport Porównawczy");

        const max_width = excelData.reduce((w, r) => {
            return Object.keys(r).map((key, i) => {
                const value = String(r[key] || '');
                return Math.max(w[i] || 15, value.length + 3);
            });
        }, []);
        worksheet['!cols'] = max_width.map(w => ({ wch: w }));

        const dateStr = new Date().toISOString().slice(0, 10);
        const defaultFileName = `Raport_Analityczny_Porownywarki_${dateStr}.xlsx`;

        // Natywne okno systemu Windows z pytaniem o folder (showSaveFilePicker)
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: defaultFileName,
                    types: [{
                        description: 'Plik programu Microsoft Excel',
                        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
                    }]
                });
                const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
                const writable = await handle.createWritable();
                await writable.write(wbout);
                await writable.close();
                alert("Raport Excel został pomyślnie zapisany we wskazanym folderze na Twoim komputerze!");
                return;
            } catch (err) {
                if (err.name === 'AbortError') return; // Zrezygnowano w oknie wyboru
                console.warn("SaveFilePicker nie powiódł się, używam standardowego pobierania:", err);
            }
        }

        // Fallback dla starszych przeglądarek
        XLSX.writeFile(workbook, defaultFileName);
    }

    // --- DRUKOWANIE / EXPORT PDF ---
    if (btnPrintAnalyticsReport) {
        btnPrintAnalyticsReport.addEventListener('click', () => {
            window.print();
        });
    }

    // --- KWARANTANNA ---
    const quarantineSearchInput = document.getElementById('quarantineSearchInput');
    if (quarantineSearchInput) {
        quarantineSearchInput.addEventListener('input', () => {
            renderQuarantineView(quarantineSearchInput.value);
        });
    }

    function simpleStringHash(str) {
        if (!str) return '0000000000';
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash).toString().padEnd(10, '0').substr(0, 10);
    }

    const btnApproveAllNewDrafts = document.getElementById('btnApproveAllNewDrafts');
    if (btnApproveAllNewDrafts) {
        btnApproveAllNewDrafts.addEventListener('click', () => {
            const drafts = Database.getDrafts();
            if (drafts.length === 0) return alert("Kwarantanna jest pusta.");
            if (confirm(`Czy na pewno chcesz zatwierdzić wszystkie ${drafts.length} pozycji z Kwarantanny jako nowe towary w katalogu?`)) {
                drafts.forEach(d => {
                    const ean = d.ean || ("FILE-" + simpleStringHash(d.name));
                    Database.addPriceOffer(ean, d.sku, d.name, d.supplierName, d.unitPrice, d.date, d.extraData);
                });
                Database.saveDrafts([]);
                updateDashboardStats();
                renderQuarantineView();
                renderPimView();
                alert(`Pomyślnie przeniesiono ${drafts.length} towarów do głównego katalogu!`);
            }
        });
    }

    const btnClearQuarantine = document.getElementById('btnClearQuarantine');
    if (btnClearQuarantine) {
        btnClearQuarantine.addEventListener('click', () => {
            const drafts = Database.getDrafts();
            if (drafts.length === 0) return alert("Kwarantanna jest pusta.");
            if (confirm(`Czy na pewno chcesz usunąć wszystkie ${drafts.length} niezidentyfikowane pozycje z Kwarantanny?`)) {
                Database.saveDrafts([]);
                updateDashboardStats();
                renderQuarantineView();
                alert("Kwarantanna została wyczyszczona.");
            }
        });
    }

    window.renderQuarantineView = function renderQuarantineView(searchQuery = '') {
        const container = document.getElementById('quarantineDraftsList');
        if (!container) return;
        container.innerHTML = '';
        
        let drafts = Database.getDrafts();
        if (drafts.length === 0) {
            container.innerHTML = '<p style="color:var(--success); text-align:center; padding:20px;"><i class="fa-solid fa-check-circle" style="font-size:24px; display:block; margin-bottom:10px;"></i> Kwarantanna jest pusta. Wszystkie towary w bazie są rozpoznane!</p>';
            return;
        }

        const cleanQ = cleanSearchQuery(searchQuery);
        if (cleanQ) {
            const terms = cleanQ.split(' ').filter(t => t.length > 0);
            drafts = drafts.filter(d => {
                const targetText = cleanSearchQuery([d.name || '', d.supplierName || '', d.ean || '', d.sku || ''].join(' '));
                return terms.every(term => targetText.includes(term));
            });
        }

        const products = Database.getProducts();
        const draftsToRender = drafts.slice(0, 50);

        draftsToRender.forEach(draft => {
            const card = document.createElement('div');
            card.className = 'glass-card';
            card.style.background = 'rgba(255,255,255,0.03)';
            card.style.marginBottom = '15px';
            card.style.borderLeft = '3px solid var(--warning)';

            // Precyzyjne szukanie sugestii z uwzględnieniem ochrony gramatury i wariantów
            let bestMatch = null;
            let bestSim = 0;

            for (let i = 0; i < products.length; i++) {
                const p = products[i];
                const sim = Database.calculateSimilarity(draft.name, p.name);
                if (sim > bestSim) {
                    bestSim = sim;
                    bestMatch = p;
                }
            }

            const hasHighConfidence = bestMatch && bestSim >= 0.65;
            const simPercentage = Math.round(bestSim * 100);

            card.innerHTML = `
                <h4 style="margin: 0 0 5px 0; color:var(--text-main);">${draft.name}</h4>
                <div style="font-size:12px; color:var(--text-dim); margin-bottom:10px;">
                    Dostawca: <strong style="color:var(--secondary);">${draft.supplierName}</strong> | Cena: <strong>${draft.unitPrice} zł</strong> | EAN: ${draft.ean || '-'}
                </div>
                
                ${hasHighConfidence ? `
                    <div style="background: rgba(139, 92, 246, 0.1); padding: 8px; border-radius: 6px; margin-bottom: 10px; border: 1px solid rgba(139, 92, 246, 0.3);">
                        <div style="font-size:11px; color:var(--primary); font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
                            <span>💡 Sugerowany odpowiednik w bazie:</span>
                            <span style="background:var(--primary); color:#fff; font-size:10px; padding:1px 6px; border-radius:4px;">${simPercentage}% podobieństwa</span>
                        </div>
                        <strong style="font-size:13px; color:var(--text-main); margin-top:3px; display:block;">${bestMatch.name}</strong> 
                        <span style="font-size:11px; color:var(--text-dim);">(EAN: ${bestMatch.ean || '-'})</span>
                        <div style="margin-top: 5px;">
                            <button class="btn btn-small btn-merge-suggested" data-id="${draft.id}" data-pid="${bestMatch.id}" style="width:auto; padding:3px 10px; font-size:11px;"><i class="fa-solid fa-link"></i> Połącz z tym towarem</button>
                        </div>
                    </div>
                ` : '<div style="font-size:11px; color:var(--text-dim); margin-bottom:10px; background:rgba(255,255,255,0.02); padding:6px; border-radius:4px;"><i class="fa-solid fa-check-double" style="color:var(--success); margin-right:4px;"></i> Pewny unikalny towar (Brak pasujących odpowiedników w bazie)</div>'}

                <div style="display:flex; gap:10px; border-top: 1px solid rgba(255,255,255,0.05); padding-top:10px;">
                    <button class="btn btn-secondary btn-small btn-add-new" data-id="${draft.id}" style="flex:1; border: 1px solid var(--success); color: var(--success);"><i class="fa-solid fa-plus"></i> Dodaj jako Nowy Towar</button>
                    <button class="btn btn-secondary btn-small btn-discard btn-danger" data-id="${draft.id}" style="width:40px;" title="Usuń ten wpis"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;

            // Obsługa akcji "Połącz"
            const btnMerge = card.querySelector('.btn-merge-suggested');
            if (btnMerge) {
                btnMerge.addEventListener('click', (e) => {
                    const did = e.target.closest('button').getAttribute('data-id');
                    const pid = e.target.closest('button').getAttribute('data-pid');
                    const d = Database.getDrafts().find(x => x.id === did);
                    const p = Database.getProducts().find(x => x.id === pid);
                    
                    if (d && p) {
                        Database.addPriceOffer(p.ean, p.sku, p.name, d.supplierName, d.unitPrice, d.date, d.extraData);
                        Database.deleteDraft(did);
                        updateDashboardStats();
                        renderQuarantineView(searchQuery);
                        renderPimView();
                    }
                });
            }

            // Obsługa akcji "Nowy Towar"
            card.querySelector('.btn-add-new').addEventListener('click', (e) => {
                const did = e.target.closest('button').getAttribute('data-id');
                const d = Database.getDrafts().find(x => x.id === did);
                if (d) {
                    const ean = d.ean || ("FILE-" + simpleStringHash(d.name));
                    Database.addPriceOffer(ean, d.sku, d.name, d.supplierName, d.unitPrice, d.date, d.extraData);
                    Database.deleteDraft(did);
                    updateDashboardStats();
                    renderQuarantineView(searchQuery);
                    renderPimView();
                }
            });

            // Obsługa akcji "Odrzuć"
            card.querySelector('.btn-discard').addEventListener('click', (e) => {
                const did = e.target.closest('button').getAttribute('data-id');
                Database.deleteDraft(did);
                updateDashboardStats();
                renderQuarantineView(searchQuery);
            });

            container.appendChild(card);
        });

        if (drafts.length > 50) {
            const moreInfo = document.createElement('p');
            moreInfo.style.textAlign = 'center';
            moreInfo.style.color = 'var(--text-dim)';
            moreInfo.style.marginTop = '15px';
            moreInfo.innerText = `Wyświetlono pierwsze 50 z ${drafts.length} pozycji w Kwarantannie. Użyj wyszukiwarki powyżej, by odnaleźć konkretne wpisy.`;
            container.appendChild(moreInfo);
        }
    }

    // --- PANEL WŁAŚCICIELA (ADMIN) ---
    window.updateDashboardStats = function updateDashboardStats() {
        const products = Database.getProducts();
        const suppliers = Database.getSuppliers();
        const drafts = Database.getDrafts();
        const orders = Database.getOrders();
        const margins = Database.getMargins();

        const elProd = document.getElementById('statProductsCount');
        if (elProd) elProd.innerText = products.length;

        const elDrafts = document.getElementById('statDraftsCount');
        if (elDrafts) elDrafts.innerText = drafts.length;

        const elSupp = document.getElementById('statSuppliersCount');
        if (elSupp) elSupp.innerText = suppliers.length;

        const elOrders = document.getElementById('statOrdersCount');
        if (elOrders) elOrders.innerText = orders.length;

        const elMargin = document.getElementById('statMarginPct');
        if (elMargin) elMargin.innerText = `+${margins.globalMargin || 15}%`;

        const recentOrdersContainer = document.getElementById('dashboardRecentOrders');
        if (recentOrdersContainer) {
            recentOrdersContainer.innerHTML = '';
            if (orders.length === 0) {
                recentOrdersContainer.innerHTML = '<p style="text-align:center; padding:15px; font-size:12px; color:var(--text-dim);">Brak zamówień od klientów.</p>';
            } else {
                orders.slice(0, 3).forEach(ord => {
                    const item = document.createElement('div');
                    item.className = 'glass-card';
                    item.style.padding = '12px';
                    item.style.marginBottom = '10px';
                    item.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <strong>${ord.orderNumber}</strong> - ${ord.customerName} (${ord.customerPhone})
                                <div style="font-size:11px; color:var(--text-dim); margin-top:2px;">${ord.date} • ${ord.items.length} poz.</div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-weight:700; color:var(--success);">${ord.totalClientPrice.toFixed(2)} zł</div>
                                <div style="font-size:10px; color:var(--secondary);">Zysk: +${ord.estimatedProfit.toFixed(2)} zł</div>
                            </div>
                        </div>
                    `;
                    recentOrdersContainer.appendChild(item);
                });
            }
        }
    }

    function renderMarginsManager() {
        const margins = Database.getMargins();
        document.getElementById('globalMarginInput').value = margins.globalMargin || 15;

        const categoryList = ['Kawy', 'Słodycze', 'Napoje', 'Chemia', 'Inne'];
        const grid = document.getElementById('categoryMarginsList');
        grid.innerHTML = '';

        categoryList.forEach(cat => {
            const currentMargin = (margins.categoryMargins && margins.categoryMargins[cat] !== undefined)
                ? margins.categoryMargins[cat]
                : (margins.globalMargin || 15);

            const box = document.createElement('div');
            box.style.display = 'flex';
            box.style.justifyConstraint = 'space-between';
            box.style.alignItems = 'center';
            box.style.marginBottom = '10px';
            box.style.gap = '10px';
            box.innerHTML = `
                <span style="flex:1; font-size:14px; font-weight:500;">${cat}:</span>
                <div style="display:flex; align-items:center; gap:6px;">
                    <input type="number" class="form-control catMarginInput" data-cat="${cat}" value="${currentMargin}" style="width:70px; padding:6px 10px;" min="0" max="200">
                    <span style="font-size:13px;">%</span>
                </div>
            `;
            grid.appendChild(box);
        });

        renderMarginPreviews();
    }

    document.getElementById('saveGlobalMarginBtn').addEventListener('click', () => {
        const margins = Database.getMargins();
        const globalVal = parseFloat(document.getElementById('globalMarginInput').value) || 15;
        margins.globalMargin = globalVal;

        const catInputs = document.querySelectorAll('.catMarginInput');
        catInputs.forEach(input => {
            const cat = input.getAttribute('data-cat');
            const val = parseFloat(input.value) || globalVal;
            if (!margins.categoryMargins) margins.categoryMargins = {};
            margins.categoryMargins[cat] = val;
        });

        Database.saveMargins(margins);
        alert("Zapisano ustawienia marży!");
        renderMarginsManager();
    });

    function renderMarginPreviews() {
        const products = Database.getProducts();
        const container = document.getElementById('marginPreviewList');
        container.innerHTML = '';

        products.slice(0, 5).forEach(p => {
            const cheapest = Database.getCheapestWholesaleOffer(p);
            const wholesalePrice = cheapest ? cheapest.price : 0;
            const clientPrice = Database.calculateClientPrice(wholesalePrice, p);
            const marginPct = Database.getProductMarginPercent(p);
            const profit = clientPrice - wholesalePrice;

            const row = document.createElement('div');
            row.className = 'offer-row';
            row.style.marginBottom = '8px';
            row.innerHTML = `
                <div style="flex:1;">
                    <strong style="font-size:13px;">${p.name}</strong>
                    <div style="font-size:11px; color:var(--text-dim);">
                        Zakup netto: ${wholesalePrice.toFixed(2)} zł (${cheapest ? cheapest.source : 'Brak'}) | Marża: <strong>+${marginPct}%</strong>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:700; color:var(--success);">${clientPrice.toFixed(2)} zł</div>
                    <div style="font-size:10px; color:var(--secondary);">Twój zysk: +${profit.toFixed(2)} zł</div>
                </div>
            `;
            container.appendChild(row);
        });
    }

    function renderAdminOrders() {
        const orders = Database.getOrders();
        const container = document.getElementById('adminOrdersList');
        if (!container) return;
        container.innerHTML = '';

        if (orders.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding:30px; color:var(--text-dim);">Brak zamówień od klientów.</p>';
            return;
        }

        orders.forEach(ord => {
            const card = document.createElement('div');
            card.className = 'glass-card';
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                    <div>
                        <span class="best-price-badge" style="background:rgba(6, 182, 212, 0.15); color:var(--secondary); border-color:var(--secondary);">${ord.orderNumber}</span>
                        <h3 style="margin-top:6px; font-size:16px;">${ord.customerName}</h3>
                        <div style="font-size:12px; color:var(--text-dim);"><i class="fa-solid fa-phone"></i> ${ord.customerPhone} | ${ord.date}</div>
                        ${ord.customerNotes ? `<div style="font-size:12px; color:var(--warning); margin-top:4px;">Uwagi: ${ord.customerNotes}</div>` : ''}
                    </div>
                    <button class="btn btn-small btn-secondary btnDeleteOrder" data-id="${ord.id}"><i class="fa-solid fa-trash"></i></button>
                </div>

                <div class="cart-items-container" style="max-height:none; background:rgba(0,0,0,0.2); border-radius:12px; padding:10px; margin-bottom:12px;">
                    ${ord.items.map(i => `
                        <div style="display:flex; justify-content:space-between; font-size:13px; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                            <span>${i.name} <strong>x${i.quantity} ${i.unit}</strong></span>
                            <strong>${i.itemClientTotal.toFixed(2)} zł</strong>
                        </div>
                    `).join('')}
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(16,185,129,0.08); padding:10px; border-radius:10px;">
                    <div>
                        <span style="font-size:12px; color:var(--text-dim);">Suma dla Klienta:</span>
                        <div style="font-size:18px; font-weight:700; color:var(--success);">${ord.totalClientPrice.toFixed(2)} zł</div>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-size:12px; color:var(--text-dim);">Zysk z Marży:</span>
                        <div style="font-size:16px; font-weight:700; color:var(--secondary);">+${ord.estimatedProfit.toFixed(2)} zł</div>
                    </div>
                </div>
            `;

            card.querySelector('.btnDeleteOrder').addEventListener('click', () => {
                if (confirm("Czy usunąć to zamówienie?")) {
                    Database.deleteOrder(ord.id);
                    renderAdminOrders();
                }
            });

            container.appendChild(card);
        });
    }

    // HURTOWNIE B2B I AUTOLOGOWANIE MONOLITH
    function renderB2bSuppliers() {
        const suppliersList = document.getElementById('b2bSuppliersList');
        suppliersList.innerHTML = '';
        
        const suppliers = Database.getSuppliers();
        const webSuppliers = suppliers.filter(s => s.type === 'web');

        webSuppliers.forEach(s => {
            const item = document.createElement('div');
            item.className = 'glass-card';
            item.style.padding = '14px';
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <div>
                        <strong style="font-size:15px;">${s.name}</strong>
                        <div style="font-size:11px; color:var(--text-dim);">${s.url}</div>
                        <div style="font-size:11px; color:var(--text-muted); margin-top:3px;">
                            Login: <strong>${s.username || 'brak'}</strong>
                        </div>
                    </div>
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                        <button class="btn btn-small btn-secondary btnOpenBrowser" data-url="${s.url}"><i class="fa-solid fa-arrow-up-right-from-square"></i> Otwórz w Edge</button>
                        <button class="btn btn-small btn-secondary btnEdit" data-id="${s.id}"><i class="fa-solid fa-key"></i> Hasło</button>
                        <button class="btn btn-small btnScrape" data-id="${s.id}"><i class="fa-solid fa-rotate"></i> Pobierz</button>
                    </div>
                </div>
            `;

            item.querySelector('.btnOpenBrowser').addEventListener('click', () => {
                Scraper.openBrowser(s.url);
            });

            item.querySelector('.btnEdit').addEventListener('click', () => {
                document.getElementById('supplierEditId').value = s.id;
                document.getElementById('supplierUsername').value = s.username || '';
                document.getElementById('supplierPassword').value = s.password || '';
                document.getElementById('supplierModalTitle').innerText = `Logowanie: ${s.name}`;
                openModal('supplierModal');
            });

            item.querySelector('.btnScrape').addEventListener('click', async (e) => {
                const btn = e.currentTarget;
                const originalHtml = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Pobieranie...';

                try {
                    const count = await Scraper.fetchPricesFromServer(s);
                    alert(`Pomyślnie zaktualizowano ceny! Pobrano ${count} produktów z ${s.name}.`);
                    renderDashboard();
                } catch (error) {
                    alert(`LOGOWANIE AUTOMATYCZNE DLA ${s.name.toUpperCase()}:\n\n` +
                          `Strona hurtowni posiada aktywne zabezpieczenie Cloudflare.\n\n` +
                          `Użyj przycisku 'Otwórz w Edge', zaloguj się i wklej zawartość strony (Ctrl+A, Ctrl+C), a parser natychmiast wyciągnie towary i ceny!`);
                    
                    document.getElementById('pasteSupplierSelect').value = s.name;
                    openModal('pasteModal');
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                }
            });

            suppliersList.appendChild(item);
        });
    }

    const loadFromWordBtn = document.getElementById('loadFromWordBtn');
    if (loadFromWordBtn) {
        loadFromWordBtn.addEventListener('click', async () => {
            loadFromWordBtn.disabled = true;
            loadFromWordBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Odczyt Word...';

            const backendUrl = Scraper.getBackendUrl();
            try {
                const response = await fetch(`${backendUrl}/credentials`);
                const credentials = await response.json();
                
                if (credentials.length === 0) {
                    alert("Brak danych logowania w pliku Word.");
                    return;
                }

                let updatedCount = 0;
                credentials.forEach(cred => {
                    if (cred.url) {
                        Database.saveSupplier({
                            name: cred.url.replace('https://', '').replace('http://', '').split('/')[0],
                            type: 'web',
                            url: cred.url,
                            username: cred.username,
                            password: cred.password
                        });
                        updatedCount++;
                    }
                });

                alert(`Zaktualizowano dane logowania dla ${updatedCount} hurtowni z pliku Word!`);
                renderB2bSuppliers();
            } catch (error) {
                alert("Nie udało się połączyć z serwerem.");
            } finally {
                loadFromWordBtn.disabled = false;
                loadFromWordBtn.innerHTML = '<i class="fa-solid fa-file-word" style="color: #2b579a;"></i> Wczytaj loginy z pliku Word';
            }
        });
    }

    const saveCredsBtn = document.getElementById('saveSupplierCredentialsBtn');
    if (saveCredsBtn) {
        saveCredsBtn.addEventListener('click', () => {
            const id = document.getElementById('supplierEditId')?.value;
            const username = document.getElementById('supplierUsername')?.value;
            const password = document.getElementById('supplierPassword')?.value;

            Database.saveSupplier({ id, username, password });
            closeModal('supplierModal');
            alert("Dane logowania zostały zapisane!");
            renderB2bSuppliers();
        });
    }

    let lastPastedHtml = "";

    const openPasteBtn = document.getElementById('openPasteModalBtn');
    if (openPasteBtn) {
        openPasteBtn.addEventListener('click', () => {
            const pt = document.getElementById('pasteTextarea');
            if (pt) {
                if (pt.tagName === 'DIV') {
                    pt.innerHTML = 'Kliknij tutaj, po czym wciśnij <strong>Ctrl+V</strong> aby wkleić ze zdjęciami...';
                } else {
                    pt.value = '';
                }
            }
            lastPastedHtml = "";
            openModal('pasteModal');
        });
    }

    const pasteTextareaEl = document.getElementById('pasteTextarea');
    if (pasteTextareaEl) {
        pasteTextareaEl.addEventListener('paste', (e) => {
            const html = e.clipboardData.getData('text/html');
            if (html && html.trim() !== "") {
                lastPastedHtml = html;
            } else {
                lastPastedHtml = "";
            }
        });

        pasteTextareaEl.addEventListener('focus', function() {
            if(this.innerHTML.includes('Kliknij tutaj, po czym wciśnij')) {
                this.innerHTML = '';
            }
        });
    }

    // WŁASNA OBSŁUGA WKLEJANIA (100% Niezawodny Parser używa window.executePasteImport)

    const btnClearSupplierCatalogBtn = document.getElementById('btnClearSupplierCatalogBtn');
    if (btnClearSupplierCatalogBtn) {
        btnClearSupplierCatalogBtn.addEventListener('click', () => {
            const importSupplierSelect = document.getElementById('importSupplierSelect');
            const suppName = importSupplierSelect ? importSupplierSelect.value : '';
            if (!suppName) return alert("Wybierz hurtownię z listy.");

            if (confirm(`Czy na pewno chcesz WYCOFAĆ dotychczasowe oferty cenowe dla hurtowni "${suppName}"?\n\nPozwoli to zaimportować jej cennik od nowa z czystym, idealnym nazewnictwem. Żadne towary nie zostaną usunięte z bazy, jedynie oznaczone jako "Chwilowy brak".`)) {
                const res = Database.clearSupplierOffers(suppName);
                alert(`Pomyślnie wyczyszczono cennik hurtowni ${suppName}!\nWycofano ${res.removedOffers} starych ofert cenowych. ${res.outOfStockCount > 0 ? `Oznaczono ${res.outOfStockCount} produktów jako "Chwilowy brak".` : ''}`);
                updateDashboardStats();
                renderPimView();
            }
        });
    }

    function populateFileSuppliers() {
        const importSel = document.getElementById('importSupplierSelect');
        if (importSel && importSel.tagName === 'INPUT') {
            importSel.outerHTML = '<select id="importSupplierSelect" style="flex: 1;"></select>';
            const addBtn = document.getElementById('addNewSupplierBtn');
            if (addBtn) addBtn.style.display = 'inline-block';
        }

        const select = document.getElementById('importSupplierSelect');
        const pasteSelect = document.getElementById('pasteSupplierSelect');
        if (!select || !pasteSelect) return;

        const suppliers = typeof Database !== 'undefined' ? Database.getSuppliers() : [];
        const products = typeof Database !== 'undefined' ? Database.getProducts() : [];

        const supplierNamesSet = new Set();
        suppliers.forEach(s => {
            const name = typeof s === 'string' ? s : (s && s.name ? s.name : '');
            if (name && name.trim()) supplierNamesSet.add(name.trim());
        });
        products.forEach(p => {
            if (p && p.offers) {
                p.offers.forEach(o => {
                    if (o && o.source && o.source.trim()) supplierNamesSet.add(o.source.trim());
                });
            }
        });

        const supplierNames = Array.from(supplierNamesSet).sort();

        select.innerHTML = '';
        pasteSelect.innerHTML = '';

        if (supplierNames.length === 0) {
            select.innerHTML = '<option value="" disabled selected style="color:#94a3b8; background:#0f1120;">-- Najpierw dodaj hurtownię --</option>';
            pasteSelect.innerHTML = '<option value="" disabled selected style="color:#94a3b8; background:#0f1120;">-- Najpierw dodaj hurtownię --</option>';
            return;
        }

        supplierNames.forEach(name => {
            const opt1 = document.createElement('option');
            opt1.value = name;
            opt1.textContent = name;
            opt1.style.color = '#ffffff';
            opt1.style.background = '#0f1120';
            select.appendChild(opt1);

            const opt2 = document.createElement('option');
            opt2.value = name;
            opt2.textContent = name;
            opt2.style.color = '#ffffff';
            opt2.style.background = '#0f1120';
            pasteSelect.appendChild(opt2);
        });
    }
    window.populateFileSuppliers = populateFileSuppliers;

    window.openWithdrawCategoryModal = function openWithdrawCategoryModal(defaultSupplierName = null) {
        const withdrawSupplierSelect = document.getElementById('withdrawSupplierSelect');
        const withdrawCategorySelect = document.getElementById('withdrawCategorySelect');
        if (!withdrawSupplierSelect || !withdrawCategorySelect) return;

        const suppliers = Database.getSuppliers();
        withdrawSupplierSelect.innerHTML = '';
        suppliers.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.name;
            opt.innerText = s.name;
            withdrawSupplierSelect.appendChild(opt);
            if (defaultSupplierName && s.name.toLowerCase().trim() === defaultSupplierName.toLowerCase().trim()) {
                opt.selected = true;
                withdrawSupplierSelect.value = s.name;
            }
        });

        populateWithdrawCategories();
        renderDisabledCategoriesList();
        openModal('withdrawCategoryModal');
    };

    function populateWithdrawCategories() {
        const withdrawCategorySelect = document.getElementById('withdrawCategorySelect');
        if (!withdrawCategorySelect) return;
        const products = Database.getProducts();
        const categories = new Set();
        products.forEach(p => {
            if (p.category) categories.add(p.category);
        });

        let html = '<option value="ALL_CATEGORIES">⚠️ CAŁA HURTOWNIA (Wszystkie kategorie i oferty)</option>';
        Array.from(categories).sort().forEach(cat => {
            html += `<option value="${cat}">Wycofaj kategorię: ${cat}</option>`;
        });
        withdrawCategorySelect.innerHTML = html;
    }

    function renderDisabledCategoriesList() {
        const withdrawSupplierSelect = document.getElementById('withdrawSupplierSelect');
        const container = document.getElementById('disabledCategoriesListContainer');
        if (!withdrawSupplierSelect || !container) return;

        const supName = withdrawSupplierSelect.value;
        const suppliers = Database.getSuppliers();
        const sup = suppliers.find(s => s.name === supName);

        if (sup && sup.disabledCategories && sup.disabledCategories.length > 0) {
            let html = '<div style="font-size:12px; font-weight:700; color:var(--warning); margin-bottom:5px;">Aktywne wycofane kategorie dla tej hurtowni:</div><div style="display:flex; gap:6px; flex-wrap:wrap;">';
            sup.disabledCategories.forEach(dc => {
                html += `<span class="badge" style="background:rgba(239,68,68,0.2); color:#ef4444; border:1px solid rgba(239,68,68,0.4); padding:4px 8px; border-radius:12px; font-size:11px; display:inline-flex; align-items:center; gap:6px;">
                    🚫 ${dc} <i class="fa-solid fa-xmark btnReEnableCat" data-sup="${sup.name}" data-cat="${dc}" style="cursor:pointer;" title="Przywróć tę kategorię"></i>
                </span>`;
            });
            html += '</div>';
            container.innerHTML = html;

            container.querySelectorAll('.btnReEnableCat').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const sName = e.target.getAttribute('data-sup');
                    const cName = e.target.getAttribute('data-cat');
                    Database.enableCategoryForSupplier(sName, cName);
                    renderDisabledCategoriesList();
                    updateDashboardStats();
                    renderPimView();
                    renderSuppliersView();
                });
            });
        } else {
            container.innerHTML = '<div style="font-size:12px; color:var(--text-dim);">Brak wycofanych kategorii dla tej hurtowni.</div>';
        }
    }

    const btnOpenWithdrawModal = document.getElementById('btnOpenWithdrawModal');
    if (btnOpenWithdrawModal) {
        btnOpenWithdrawModal.addEventListener('click', () => openWithdrawCategoryModal());
    }

    const withdrawSupplierSelect = document.getElementById('withdrawSupplierSelect');
    if (withdrawSupplierSelect) {
        withdrawSupplierSelect.addEventListener('change', renderDisabledCategoriesList);
    }

    const btnConfirmWithdraw = document.getElementById('btnConfirmWithdraw');
    if (btnConfirmWithdraw) {
        btnConfirmWithdraw.addEventListener('click', () => {
            const withdrawSupplierSelect = document.getElementById('withdrawSupplierSelect');
            const withdrawCategorySelect = document.getElementById('withdrawCategorySelect');
            if (!withdrawSupplierSelect || !withdrawCategorySelect) return;

            const supName = withdrawSupplierSelect.value;
            const catChoice = withdrawCategorySelect.value;

            if (!supName) return alert("Wybierz hurtownię z listy.");

            if (catChoice === 'ALL_CATEGORIES') {
                if (confirm(`Czy na pewno chcesz wycofać BEZ ŚLADU wszystkie oferty cenowe z hurtowni "${supName}"? Towary unikalne dla tej hurtowni zostaną usunięte z bazy danych.`)) {
                    const deletedCount = Database.deleteOffersBySupplier(supName);
                    if (typeof closeModal === 'function') closeModal('withdrawCategoryModal');
                    const msg = `Pomyślnie wycofano bez śladu całą ofertę hurtowni "${supName}"! Usunięto ${deletedCount} wyłącznych towarów.`;
                    if (typeof showToast === 'function') showToast(msg);
                    else alert(msg);

                    if (typeof populateFileSuppliers === 'function') populateFileSuppliers();
                    if (typeof updateDashboardStats === 'function') updateDashboardStats();
                    if (typeof renderPimView === 'function') renderPimView();
                    if (typeof renderCatalog === 'function') renderCatalog();
                    if (typeof populatePimSuppliers === 'function') populatePimSuppliers();
                    if (typeof populatePimCategories === 'function') populatePimCategories();
                }
            } else {
                if (confirm(`Czy na pewno chcesz wycofać BEZ ŚLADU kategorię "${catChoice}"?`)) {
                    const deletedCount = Database.deleteProductsByCategory(catChoice);
                    if (typeof closeModal === 'function') closeModal('withdrawCategoryModal');
                    const msg = `Pomyślnie wycofano bez śladu kategorię "${catChoice}"! Usunięto ${deletedCount} towarów.`;
                    if (typeof showToast === 'function') showToast(msg);
                    else alert(msg);

                    if (typeof updateDashboardStats === 'function') updateDashboardStats();
                    if (typeof renderPimView === 'function') renderPimView();
                    if (typeof renderCatalog === 'function') renderCatalog();
                    if (typeof populatePimCategories === 'function') populatePimCategories();
                }
            }
        });
    }

    // --- CRM DOSTAWCÓW ---
    window.renderSuppliersView = function renderSuppliersView() {
        const suppliersList = document.getElementById('crmSuppliersList');
        if (!suppliersList) return;
        const suppliers = Database.getSuppliers();
        suppliersList.innerHTML = '';

        if (suppliers.length === 0) {
            suppliersList.innerHTML = '<p style="color:var(--text-dim); text-align:center;">Brak zapisanych dostawców.</p>';
            return;
        }

        suppliers.forEach(sup => {
            const card = document.createElement('div');
            card.className = 'glass-card';
            card.style.background = 'rgba(255,255,255,0.03)';
            card.style.padding = '15px';
            
            const disabledBadgeHtml = sup.disabledCategories && sup.disabledCategories.length > 0 ?
                `<div style="margin-top:6px; font-size:11px; color:#ef4444;"><i class="fa-solid fa-ban"></i> Wycofane kategorie: ${sup.disabledCategories.map(c => `<strong>${c}</strong>`).join(', ')}</div>` : '';

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                    <h3 style="margin:0; color:var(--text-main); font-size: 16px;"><i class="fa-solid fa-building" style="color:var(--primary); margin-right:8px;"></i>${sup.name}</h3>
                    <div style="display:flex; gap:6px;">
                        <button class="btn btn-secondary btn-small edit-sup-btn" style="padding: 4px 10px;" title="Edytuj dane"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-secondary btn-small withdraw-sup-btn btn-danger" style="padding: 4px 10px;" title="Wycofaj kategoria/hurtownia"><i class="fa-solid fa-ban"></i> Wycofaj</button>
                    </div>
                </div>
                <div style="font-size:12px; color:var(--text-dim); margin-bottom: 5px;">
                    <strong>Dane:</strong> ${sup.details || 'Brak danych'}
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px; margin-bottom: 5px; font-size: 12px; color:var(--text-dim);">
                    <div><strong>Dostawy:</strong> <span style="color:var(--text-main);">${sup.deliveryDays || '-'}</span></div>
                    <div><strong>Min. log:</strong> <span style="color:var(--text-main);">${sup.minOrder ? sup.minOrder + ' zł' : '-'}</span></div>
                </div>
                <div style="font-size:12px; color:var(--text-dim); margin-bottom: 5px;">
                    <strong>Kontakt:</strong> ${sup.contact || '-'}
                </div>
                ${disabledBadgeHtml}
                ${sup.notes ? `<div style="font-size:12px; color:var(--secondary); background: rgba(var(--secondary-rgb, 236,72,153), 0.1); padding: 5px; border-radius: 4px; margin-top:5px;"><i>${sup.notes}</i></div>` : ''}
                <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 4px;">
                    <div style="font-size: 10px; color: var(--text-dim); margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px;">Dodaj towary z tej hurtowni:</div>
                    ${sup.name.toLowerCase().includes('kraft') ? `
                    <button class="thin-import-stripe" onclick="syncKraftCatalogDirectly()" style="width: 100%; text-align: left; background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.15)); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399; font-size: 11px; font-weight:700; padding: 7px 10px; border-radius: 4px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);">
                        <span><i class="fa-solid fa-cloud-arrow-down" style="margin-right: 6px; width: 14px; text-align: center;"></i> ⚡ 1-Klik: Pobierz ofertę w tle (${(window.KRAFT_SCRAPED_CATALOG || []).length || 92} towarów ze zdjęciami)</span>
                        <span style="background: #10b981; color:#000; font-weight:800; padding: 1px 6px; border-radius: 10px; font-size: 9px;">LIVE</span>
                    </button>
                    ` : ''}
                    ${(sup.name.toLowerCase().includes('kravets') || sup.name.toLowerCase().includes('krawiec')) ? `
                    <button class="thin-import-stripe" onclick="syncKravetsCatalogDirectly(true)" style="width: 100%; text-align: left; background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(6, 182, 212, 0.15)); border: 1px solid rgba(139, 92, 246, 0.4); color: #c4b5fd; font-size: 11px; font-weight:700; padding: 7px 10px; border-radius: 4px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; box-shadow: 0 2px 8px rgba(139, 92, 246, 0.15);">
                        <span><i class="fa-solid fa-gem" style="margin-right: 6px; width: 14px; text-align: center;"></i> ⚡ 1-Klik: Wgraj Bazę Wzorcową (${(window.KRAVETS_MASTER_CATALOG || []).length || 391} towarów + 379 zdjęć EAN)</span>
                        <span style="background: #8b5cf6; color:#fff; font-weight:800; padding: 1px 6px; border-radius: 10px; font-size: 9px;">MASTER</span>
                    </button>
                    ` : ''}
                    <button class="thin-import-stripe" onclick="openSupplierPasteImportModal('${sup.name.replace(/'/g, "\\'")}')" style="width: 100%; text-align: left; background: rgba(139, 92, 246, 0.05); border: 1px solid rgba(139, 92, 246, 0.2); color: #a78bfa; font-size: 11px; padding: 6px 10px; border-radius: 4px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s;">
                        <span><i class="fa-solid fa-paste" style="margin-right: 6px; width: 14px; text-align: center;"></i> Wklej stronę WWW (Kopiuj-Wklej)</span>
                        <i class="fa-solid fa-plus" style="font-size: 10px; opacity: 0.6;"></i>
                    </button>
                    
                    <button class="thin-import-stripe" onclick="openSupplierFileImportModal('${sup.name.replace(/'/g, "\\'")}')" style="width: 100%; text-align: left; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); color: #34d399; font-size: 11px; padding: 6px 10px; border-radius: 4px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s;">
                        <span><i class="fa-solid fa-file-excel" style="margin-right: 6px; width: 14px; text-align: center;"></i> Wgraj plik (Excel / PDF)</span>
                        <i class="fa-solid fa-plus" style="font-size: 10px; opacity: 0.6;"></i>
                    </button>
                </div>
            `;

            card.querySelector('.edit-sup-btn').addEventListener('click', () => {
                openSupplierModal(sup);
            });

            card.querySelector('.withdraw-sup-btn').addEventListener('click', () => {
                openWithdrawCategoryModal(sup.name);
            });

            suppliersList.appendChild(card);
        });
    }

    window.openSupplierPasteImportModal = function openSupplierPasteImportModal(supplierName) {
        if (typeof populateFileSuppliers === 'function') populateFileSuppliers();
        const pasteSelect = document.getElementById('pasteSupplierSelect');
        if (pasteSelect) pasteSelect.value = supplierName;
        const pt = document.getElementById('pasteTextarea');
        if (pt) {
            if (pt.tagName === 'DIV') pt.innerHTML = 'Kliknij tutaj, po czym wciśnij <strong>Ctrl+V</strong> aby wkleić ze zdjęciami...';
            else pt.value = '';
        }
        const previewContainer = document.getElementById('pasteLivePreviewContainer');
        if (previewContainer) previewContainer.style.display = 'none';
        const directBtn = document.getElementById('startDirectPasteImportBtn');
        if (directBtn) directBtn.style.display = 'none';
        window._liveExtractedItems = null;
        if (typeof openModal === 'function') openModal('pasteModal');
    };

    window.openSupplierFileImportModal = function openSupplierFileImportModal(supplierName) {
        if (typeof populateFileSuppliers === 'function') populateFileSuppliers();
        const importSel = document.getElementById('importSupplierSelect');
        if (importSel) importSel.value = supplierName;
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.click();
    };

    const openAddSupBtn = document.getElementById('openAddSupplierModalBtn');
    if (openAddSupBtn) {
        openAddSupBtn.addEventListener('click', () => {
            openSupplierModal(null);
        });
    }

    const addNewSupBtn = document.getElementById('addNewSupplierBtn');
    if (addNewSupBtn) {
        addNewSupBtn.addEventListener('click', () => {
            openSupplierModal(null);
        });
    }

    window.openNewSupplierModal = function() {
        openSupplierModal(null);
    };

    function openSupplierModal(supplier) {
        if (supplier) {
            const titleEl = document.getElementById('crmSupplierModalTitle');
            if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-pen"></i> Edycja Dostawcy';
            const idEl = document.getElementById('crmSupplierId'); if (idEl) idEl.value = supplier.id;
            const nameEl = document.getElementById('crmSupplierName'); if (nameEl) nameEl.value = supplier.name || '';
            const detEl = document.getElementById('crmSupplierDetails'); if (detEl) detEl.value = supplier.details || '';
            const daysEl = document.getElementById('crmSupplierDeliveryDays'); if (daysEl) daysEl.value = supplier.deliveryDays || '';
            const minEl = document.getElementById('crmSupplierMinOrder'); if (minEl) minEl.value = supplier.minOrder || '';
            const contEl = document.getElementById('crmSupplierContact'); if (contEl) contEl.value = supplier.contact || '';
            const notesEl = document.getElementById('crmSupplierNotes'); if (notesEl) notesEl.value = supplier.notes || '';
            const delBtn = document.getElementById('crmDeleteSupplierBtn'); if (delBtn) delBtn.style.display = 'block';
        } else {
            const titleEl = document.getElementById('crmSupplierModalTitle');
            if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-plus"></i> Nowy Dostawca';
            const idEl = document.getElementById('crmSupplierId'); if (idEl) idEl.value = '';
            const nameEl = document.getElementById('crmSupplierName'); if (nameEl) nameEl.value = '';
            const detEl = document.getElementById('crmSupplierDetails'); if (detEl) detEl.value = '';
            const daysEl = document.getElementById('crmSupplierDeliveryDays'); if (daysEl) daysEl.value = '';
            const minEl = document.getElementById('crmSupplierMinOrder'); if (minEl) minEl.value = '';
            const contEl = document.getElementById('crmSupplierContact'); if (contEl) contEl.value = '';
            const notesEl = document.getElementById('crmSupplierNotes'); if (notesEl) notesEl.value = '';
            const delBtn = document.getElementById('crmDeleteSupplierBtn'); if (delBtn) delBtn.style.display = 'none';
        }
        openModal('crmSupplierModal');
    }

    const crmSaveBtn = document.getElementById('crmSaveSupplierBtn');
    if (crmSaveBtn) {
        crmSaveBtn.addEventListener('click', () => {
            const nameInput = document.getElementById('crmSupplierName');
            const name = nameInput ? nameInput.value.trim() : '';
            if (!name) return alert('Nazwa dostawcy jest wymagana!');

            const supplier = {
                id: document.getElementById('crmSupplierId')?.value || undefined,
                name: name,
                details: document.getElementById('crmSupplierDetails')?.value.trim() || '',
                deliveryDays: document.getElementById('crmSupplierDeliveryDays')?.value.trim() || '',
                minOrder: parseFloat(document.getElementById('crmSupplierMinOrder')?.value) || 0,
                contact: document.getElementById('crmSupplierContact')?.value.trim() || '',
                notes: document.getElementById('crmSupplierNotes')?.value.trim() || ''
            };

            Database.saveSupplier(supplier);
            closeModal('crmSupplierModal');
            if (typeof renderSuppliersView === 'function') renderSuppliersView();
            if (typeof populateFileSuppliers === 'function') populateFileSuppliers();
        });
    }

    const crmDelBtn = document.getElementById('crmDeleteSupplierBtn');
    if (crmDelBtn) {
        crmDelBtn.addEventListener('click', () => {
            if (confirm("Czy na pewno chcesz usunąć tego dostawcę? Nie usunie to jego produktów z katalogu, ale usunie profil hurtowni.")) {
                const id = document.getElementById('crmSupplierId')?.value;
                if (id) Database.deleteSupplier(id);
                closeModal('crmSupplierModal');
                if (typeof renderSuppliersView === 'function') renderSuppliersView();
                if (typeof populateFileSuppliers === 'function') populateFileSuppliers();
            }
        });
    }

    const dropzone = document.getElementById('fileDropzone');
    const fileInput = document.getElementById('fileInput');

    if (dropzone && fileInput) {
        dropzone.addEventListener('click', (e) => {
            if (e.target !== fileInput) {
                fileInput.click();
            }
        });

        // Obsługa Drag and Drop (Przeciąganie pliku z pulpitu)
        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.style.borderColor = 'var(--primary)';
                dropzone.style.background = 'rgba(6, 182, 212, 0.15)';
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.style.borderColor = 'var(--border-color)';
                dropzone.style.background = '';
            }, false);
        });

        dropzone.addEventListener('drop', async (e) => {
            const dt = e.dataTransfer;
            const files = dt ? dt.files : null;
            if (files && files.length > 0) {
                await handleSelectedFile(files[0]);
            }
        });

        fileInput.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files.length > 0) {
                await handleSelectedFile(e.target.files[0]);
            }
        });
    }

    async function handleSelectedFile(file) {
        console.log("handleSelectedFile called with file:", file ? file.name : null);
        try {
            const parser = window.ExcelParser || (typeof ExcelParser !== 'undefined' ? ExcelParser : null);
            if (!parser || !parser.readFile) {
                alert("Błąd: Moduł parsera plików nie jest załadowany.");
                return;
            }
            console.log("Calling parser.readFile...");
            window.currentParsedExcelData = await parser.readFile(file);
            console.log("parser.readFile completed. Rows count:", window.currentParsedExcelData ? window.currentParsedExcelData.rows.length : 0);
            const previewCard = document.getElementById('importedFilePreviewCard');
            if (previewCard) previewCard.style.display = 'block';
            
            const fileInfoText = document.getElementById('fileInfoText');
            if (fileInfoText) {
                fileInfoText.innerText = `Wczytano plik: ${file.name} | Liczba arkuszy/stron: ${window.currentParsedExcelData.sheetCount || 1} | Łącznie odczytanych wierszy: ${window.currentParsedExcelData.rows.length}`;
            }
            
            if (typeof setupMappingModal === 'function') setupMappingModal();
            console.log("Opening mapping modal...");
            window.openMappingModal();
        } catch (err) {
            console.error("Error in handleSelectedFile:", err);
            alert("Błąd podczas odczytu pliku: " + (err.message || err));
        }
    }

    // setupMappingModal jest zadeklarowany na poziomie globalnym na window.setupMappingModal

    // OBSŁUGA IMPORTU Z PLIKU UŻYWA window.executeExcelImport

    function loadSettings() {
        const settings = JSON.parse(localStorage.getItem('porownywarka_settings')) || {};
        const backendInput = document.getElementById('settingBackendUrl');
        if (backendInput) backendInput.value = settings.backendUrl || `http://${window.location.hostname}:8080`;
    }

    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            const backendInput = document.getElementById('settingBackendUrl');
            const url = backendInput ? backendInput.value.trim() : '';
            const settings = JSON.parse(localStorage.getItem('porownywarka_settings')) || {};
            settings.backendUrl = url;
            localStorage.setItem('porownywarka_settings', JSON.stringify(settings));
            alert("Zapisano adres serwera.");
        });
    }

    const clearDbBtn = document.getElementById('clearDbBtn');
    if (clearDbBtn) {
        clearDbBtn.addEventListener('click', () => {
            if (confirm("Czy na pewno chcesz całkowicie wyczyścić całą bazę towarową (0 pozycji)?")) {
                Database.clearProductsOnlyKeepSuppliers();
                alert("Baza towarowa została wyczyszczona do 0 pozycji.");
                location.reload();
            }
        });
    }

    function showToast(text) {
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.bottom = '80px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = 'rgba(16, 185, 129, 0.95)';
        toast.style.color = '#fff';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '20px';
        toast.style.fontSize = '13px';
        toast.style.fontWeight = '600';
        toast.style.zIndex = '3000';
        toast.style.boxShadow = '0 5px 20px rgba(0,0,0,0.5)';
        toast.innerText = text;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    }
    // --- WYŁĄCZENIE I CZYSZCZENIE CACHE SERVICE WORKERA (aby wymusić najnowszy kod na żywo) ---
    if (window.location && window.location.protocol && window.location.protocol.startsWith('http')) {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => {
                for (let reg of regs) reg.unregister();
            }).catch(() => {});
        }
        if (typeof caches !== 'undefined') {
            caches.keys().then(names => {
                for (let name of names) caches.delete(name);
            }).catch(() => {});
        }
    }

    // Obsługa instalacji PWA na smartfonie Android
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showPwaInstallBanner();
    });

    function showPwaInstallBanner() {
        if (document.getElementById('pwaInstallBanner')) return;
        const banner = document.createElement('div');
        banner.id = 'pwaInstallBanner';
        banner.style.position = 'fixed';
        banner.style.bottom = '80px';
        banner.style.left = '50%';
        banner.style.transform = 'translateX(-50%)';
        banner.style.zIndex = '999999';
        banner.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)';
        banner.style.color = '#fff';
        banner.style.padding = '12px 22px';
        banner.style.borderRadius = '30px';
        banner.style.boxShadow = '0 10px 30px rgba(139, 92, 246, 0.5)';
        banner.style.fontWeight = '700';
        banner.style.fontSize = '13px';
        banner.style.cursor = 'pointer';
        banner.style.display = 'flex';
        banner.style.alignItems = 'center';
        banner.style.gap = '10px';
        banner.innerHTML = '<i class="fa-solid fa-mobile-screen-button" style="font-size:18px;"></i> Zainstaluj Aplikację Hurtowni na Telefonie <i class="fa-solid fa-download"></i>';
        
        banner.addEventListener('click', () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('[PWA] Użytkownik zainstalował aplikację mobilną');
                    }
                    deferredPrompt = null;
                    banner.remove();
                });
            }
        });
        document.body.appendChild(banner);
    }

    // --- NASŁUCHIWACZ AUTOMATYCZNEGO IMPORTU 1-KLIKNIĘCIEM (BOOKMARKLET EXTRACTOR) ---
    setInterval(() => {
        try {
            const rawPayload = localStorage.getItem('porownywarka_bookmarklet_payload');
            if (rawPayload) {
                localStorage.removeItem('porownywarka_bookmarklet_payload');
                const payload = JSON.parse(rawPayload);
                if (payload && payload.items && payload.items.length > 0) {
                    const headers = [
                        { index: 0, name: 'Wieża Nazwy Towaru' },
                        { index: 1, name: 'Wieża Ceny Netto' },
                        { index: 2, name: 'Wieża Kodu EAN' },
                        { index: 3, name: 'Wieża Kodu SKU' },
                        { index: 4, name: 'Wieża VAT / Jednostki' },
                        { index: 5, name: 'Wieża Zdjęcia Towaru (URL)' },
                        { index: 6, name: 'Wieża Ilości w Opakowaniu' },
                        { index: 7, name: 'Wieża Daty Ważności' }
                    ];

                    const rows = payload.items.map(p => [
                        p.name || '',
                        p.price ? p.price.toFixed(2) + ' zł' : '',
                        p.ean || '',
                        '',
                        '23%',
                        p.image || '',
                        p.packSize ? `${p.packSize} ${p.unit || 'szt.'}` : '1 szt.',
                        p.expirationDate || ''
                    ]);

                    const parsedResult = {
                        fileName: `1-Kliknięcie (${payload.supplierName || 'Hurtownia'})`,
                        headers: headers,
                        rows: rows
                    };

                    window.openImportMappingVerificationModal(parsedResult, payload.supplierName || 'Monolith Polska');
                }
            }
        } catch(e) { console.error("Błąd automatycznego odbioru 1-Kliknięcia:", e); }
    }, 1000);

    // --- OBSŁUGA AUTORYZACJI KODEM PIN W ADMIN.HTML ---
    let currentAdminPinBuffer = '';

    function updatePinDotsUI() {
        for (let i = 1; i <= 4; i++) {
            const dot = document.getElementById(`pinDot${i}`);
            if (dot) {
                if (i <= currentAdminPinBuffer.length) {
                    dot.classList.add('filled');
                } else {
                    dot.classList.remove('filled');
                }
            }
        }
    }

    window.appendAdminPin = function(digit) {
        if (currentAdminPinBuffer.length < 4) {
            currentAdminPinBuffer += digit;
            updatePinDotsUI();
            if (currentAdminPinBuffer.length === 4) {
                setTimeout(() => {
                    window.submitAdminPinAuth();
                }, 120);
            }
        }
    };

    window.clearAdminPin = function() {
        currentAdminPinBuffer = currentAdminPinBuffer.slice(0, -1);
        updatePinDotsUI();
        const errMsg = document.getElementById('pinErrorMessage');
        if (errMsg) errMsg.innerText = '';
    };

    window.submitAdminPinAuth = function() {
        const savedPin = localStorage.getItem('admin_pim_pin') || '1234';
        const errMsg = document.getElementById('pinErrorMessage');
        
        if (currentAdminPinBuffer === savedPin) {
            sessionStorage.setItem('admin_authenticated', 'true');
            const lockScreen = document.getElementById('adminPinLockScreen');
            const mainContent = document.getElementById('adminMainContent');
            const bottomNav = document.getElementById('adminBottomNav');
            
            if (lockScreen) lockScreen.style.display = 'none';
            if (mainContent) mainContent.style.display = 'block';
            if (bottomNav) bottomNav.style.display = 'flex';
            
            if (typeof renderPimView === 'function') renderPimView();
            if (typeof updateDashboardStats === 'function') updateDashboardStats();
            if (typeof populatePimCategories === 'function') populatePimCategories();
            if (typeof populatePimSuppliers === 'function') populatePimSuppliers();
            if (typeof populateCategoryMargins === 'function') populateCategoryMargins();
            if (typeof populateSuppliersCrm === 'function') populateSuppliersCrm();
        } else {
            if (errMsg) errMsg.innerText = 'Nieprawidłowy kod PIN! Spróbuj ponownie.';
            currentAdminPinBuffer = '';
            updatePinDotsUI();
        }
    };

    window.logoutAdminSession = function() {
        sessionStorage.removeItem('admin_authenticated');
        currentAdminPinBuffer = '';
        updatePinDotsUI();
        const lockScreen = document.getElementById('adminPinLockScreen');
        const mainContent = document.getElementById('adminMainContent');
        const bottomNav = document.getElementById('adminBottomNav');
        if (lockScreen) lockScreen.style.display = 'flex';
        if (mainContent) mainContent.style.display = 'none';
        if (bottomNav) bottomNav.style.display = 'none';
    };

    window.saveNewAdminPin = function() {
        const input = document.getElementById('newAdminPinInput');
        if (!input) return;
        const newPin = input.value.trim();
        if (!newPin || newPin.length < 4) {
            alert("Kod PIN musi składać się z co najmniej 4 cyfr!");
            return;
        }
        localStorage.setItem('admin_pim_pin', newPin);
        input.value = '';
        alert(`✅ Nowy kod PIN (${newPin}) został pomyślnie zapisany!`);
    };

    window.switchAdminTab = function(sectionId) {
        document.querySelectorAll('.view-section').forEach(sec => {
            sec.classList.remove('active');
            sec.style.display = 'none';
        });
        
        const target = document.getElementById(sectionId);
        if (target) {
            target.classList.add('active');
            target.style.display = 'block';
        }

        document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('onclick')?.includes(sectionId)) {
                btn.classList.add('active');
            }
        });

        if (sectionId === 'view-assortment' && typeof renderPimView === 'function') renderPimView();
        if (sectionId === 'view-margins' && typeof populateCategoryMargins === 'function') populateCategoryMargins();
        if (sectionId === 'view-orders' && typeof renderOrdersView === 'function') renderOrdersView();
        if (sectionId === 'view-suppliers' && typeof populateSuppliersCrm === 'function') populateSuppliersCrm();
    };

    window.addEventListener('keydown', (e) => {
        const lockScreen = document.getElementById('adminPinLockScreen');
        if (lockScreen && lockScreen.style.display !== 'none') {
            if (/^[0-9]$/.test(e.key)) {
                window.appendAdminPin(e.key);
            } else if (e.key === 'Backspace') {
                window.clearAdminPin();
            } else if (e.key === 'Enter') {
                window.submitAdminPinAuth();
            }
        }
    });

    // Inicjalizacja zależna od podstrony (index.html vs admin.html)
    const isAdminPage = !!document.getElementById('adminPinLockScreen');
    if (isAdminPage) {
        const isAuth = sessionStorage.getItem('admin_authenticated') === 'true';
        const lockScreen = document.getElementById('adminPinLockScreen');
        const mainContent = document.getElementById('adminMainContent');
        const bottomNav = document.getElementById('adminBottomNav');

        if (isAuth) {
            if (lockScreen) lockScreen.style.display = 'none';
            if (mainContent) mainContent.style.display = 'block';
            if (bottomNav) bottomNav.style.display = 'flex';
            if (typeof renderPimView === 'function') renderPimView();
            if (typeof updateDashboardStats === 'function') updateDashboardStats();
            if (typeof populatePimCategories === 'function') populatePimCategories();
            if (typeof populatePimSuppliers === 'function') populatePimSuppliers();
        } else {
            if (lockScreen) lockScreen.style.display = 'flex';
            if (mainContent) mainContent.style.display = 'none';
            if (bottomNav) bottomNav.style.display = 'none';
        }
    } else {
        // Czysty katalog klienta (index.html)
        if (typeof renderCatalog === 'function') renderCatalog();
        if (typeof populateCategories === 'function') populateCategories();
        if (typeof updateCartUI === 'function') updateCartUI();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

