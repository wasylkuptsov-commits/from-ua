// server/index.js - Produkcyjny serwer API do synchronizacji bazy towarowej i zamówień B2B w chmurze
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../')));

const DATA_FILE = path.join(__dirname, 'catalog_data.json');

// Domyślna struktura magazynu w chmurze
function loadCloudCatalog() {
    if (fs.existsSync(DATA_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        } catch (e) {
            console.error("Błąd odczytu bazy chmurowej:", e.message);
        }
    }
    return { products: [], suppliers: [], orders: [], lastUpdated: new Date().toISOString() };
}

function saveCloudCatalog(data) {
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// GET /api/catalog - Odczyt aktualnego katalogu produktów dla aplikacji WWW & Mobile
app.get('/api/catalog', (req, res) => {
    const catalog = loadCloudCatalog();
    res.json({
        success: true,
        lastUpdated: catalog.lastUpdated,
        productsCount: catalog.products.length,
        products: catalog.products
    });
});

// POST /api/sync - Synchronizacja bazy towarowej przez Właściciela
app.post('/api/sync', (req, res) => {
    const { products, suppliers, secretKey } = req.body;
    
    if (Array.isArray(products)) {
        const catalog = loadCloudCatalog();
        catalog.products = products;
        if (Array.isArray(suppliers)) catalog.suppliers = suppliers;
        saveCloudCatalog(catalog);

        console.log(`[CLOUD SYNC SUCCESS] Zaktualizowano ${products.length} pozycji w chmurze.`);
        return res.json({ success: true, count: products.length, lastUpdated: catalog.lastUpdated });
    }

    res.status(400).json({ success: false, message: "Nieprawidłowa struktura danych produktów." });
});

// POST /api/order - Rejestracja nowego zamówienia złożonego przez klienta z aplikacji mobilnej/WWW
app.post('/api/order', (req, res) => {
    const { clientName, clientPhone, items, totalPrice } = req.body;
    
    if (!items || items.length === 0) {
        return res.status(400).json({ success: false, message: "Koszyk jest pusty." });
    }

    const catalog = loadCloudCatalog();
    const newOrder = {
        id: 'ord_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        clientName: clientName || 'Klient B2B',
        clientPhone: clientPhone || 'Brak telefonu',
        items: items,
        totalPrice: totalPrice || 0,
        createdAt: new Date().toISOString(),
        status: 'NOWE'
    };

    catalog.orders.push(newOrder);
    saveCloudCatalog(catalog);

    console.log(`[NEXUS ORDER] Nowe zamówienie #${newOrder.id} od ${newOrder.clientName} (Wartość: ${totalPrice} zł)`);
    res.json({ success: true, orderId: newOrder.id, message: "Zamówienie zostało pomyślnie zarejestrowane!" });
});

app.listen(PORT, () => {
    console.log(`🚀 [E-COMMERCE CLOUD API] Serwer działa pod adresem http://localhost:${PORT}`);
});
