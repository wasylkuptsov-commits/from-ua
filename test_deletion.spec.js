const { test, expect } = require('@playwright/test');
const path = require('path');

const appUrl = `file:///${path.resolve(__dirname, 'index.html').replace(/\\/g, '/')}`;

test.describe('Multi-browser Product Deletion & Inline Action Bar Suite', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(appUrl);
        // Switch to Admin mode
        await page.evaluate(() => {
            if (typeof window.setAppMode === 'function') {
                window.setAppMode(true);
            }
        });
        await page.waitForSelector('#view-assortment.active', { state: 'visible' });
    });

    test('1. Toggles inline card action bar and centers viewport modal', async ({ page }) => {
        const testId = 'TEST_INLINE_TOGGLE_' + Date.now();
        await page.evaluate((id) => {
            const prods = Database.getProducts();
            prods.unshift({
                id: id,
                name: 'Testowy Towar Inline Action Bar',
                category: 'Testowa',
                isApproved: true,
                offers: [{ source: 'Hurtownia Test', price: 10.00 }]
            });
            Database.saveProducts(prods);
            window.renderPimView();
        }, testId);

        // Find product trash button and click
        const trashBtn = page.locator(`.btn-delete-product-pim[data-id="${testId}"]`);
        await expect(trashBtn).toBeVisible();
        await trashBtn.click();

        // Check inline bar visibility inside card
        const inlineBar = page.locator(`#inlineDeleteBar_${testId}`);
        await expect(inlineBar).toBeVisible();

        // Check Buttons A, B, C inside inline bar
        await expect(inlineBar.locator('.btn-inline-withdraw')).toBeVisible();
        await expect(inlineBar.locator('.btn-inline-permanent-delete')).toBeVisible();
        await expect(inlineBar.locator('.btn-inline-cancel')).toBeVisible();

        // Check #deleteProductModal fixed centering
        const modal = page.locator('#deleteProductModal');
        await expect(modal).toHaveClass(/active/);
        const modalContent = page.locator('#deleteProductModal .modal-content');
        await expect(modalContent).toBeVisible();

        // Test cancel button on inline bar
        await inlineBar.locator('.btn-inline-cancel').click();
        await expect(inlineBar).toBeHidden();

        // Cleanup test product from DB
        await page.evaluate((id) => {
            let prods = Database.getProducts();
            prods = prods.filter(p => p.id !== id);
            Database.saveProducts(prods);
            window.renderPimView();
        }, testId);
    });

    test('2. Button A: Wycofaj z Katalogu Klienta (sets isApproved=false)', async ({ page }) => {
        const testId = 'TEST_WITHDRAW_' + Date.now();
        const testName = 'Test Towar do Wycofania';

        await page.evaluate(({ id, name }) => {
            const prods = Database.getProducts();
            prods.unshift({
                id: id,
                name: name,
                category: 'Testowa',
                isApproved: true,
                offers: [{ source: 'Hurtownia Test', price: 25.00 }]
            });
            Database.saveProducts(prods);
            window.renderPimView();
        }, { id: testId, name: testName });

        // Click trash button
        await page.locator(`.btn-delete-product-pim[data-id="${testId}"]`).click();

        // Click Button A: Wycofaj z Katalogu Klienta
        const withdrawBtn = page.locator(`#inlineDeleteBar_${testId} .btn-inline-withdraw`);
        await expect(withdrawBtn).toBeVisible();
        await withdrawBtn.click();

        // Verify DB state persistence: isApproved should be false
        const isApprovedState = await page.evaluate((id) => {
            const p = Database.getProducts().find(prod => prod.id === id);
            return p ? p.isApproved : null;
        }, testId);

        expect(isApprovedState).toBe(false);

        // Switch to Client mode and verify product is not visible
        await page.evaluate(() => window.setAppMode(false));
        const clientCardCount = await page.locator(`.catalog-card:has-text("${testName}")`).count();
        expect(clientCardCount).toBe(0);

        // Cleanup
        await page.evaluate((id) => {
            let prods = Database.getProducts();
            prods = prods.filter(p => p.id !== id);
            Database.saveProducts(prods);
        }, testId);
    });

    test('3. Button B: Usuń z Bazy Całkowicie (removes from Database)', async ({ page }) => {
        const testId = 'TEST_PERM_DELETE_' + Date.now();
        const testName = 'Test Towar do Trwałego Usunięcia';

        await page.evaluate(({ id, name }) => {
            const prods = Database.getProducts();
            prods.unshift({
                id: id,
                name: name,
                category: 'Testowa',
                isApproved: true,
                offers: [{ source: 'Hurtownia Test', price: 50.00 }]
            });
            Database.saveProducts(prods);
            window.renderPimView();
        }, { id: testId, name: testName });

        // Click trash button
        await page.locator(`.btn-delete-product-pim[data-id="${testId}"]`).click();

        // Click Button B: Usuń z Bazy Całkowicie
        const permDeleteBtn = page.locator(`#inlineDeleteBar_${testId} .btn-inline-permanent-delete`);
        await expect(permDeleteBtn).toBeVisible();
        await permDeleteBtn.click();

        // Verify DB state persistence: product should no longer exist in Database
        const existsInDb = await page.evaluate((id) => {
            return Database.getProducts().some(prod => prod.id === id);
        }, testId);

        expect(existsInDb).toBe(false);

        // Verify card is removed from DOM in PIM
        const pimCardCount = await page.locator(`#inlineDeleteBar_${testId}`).count();
        expect(pimCardCount).toBe(0);
    });
});
