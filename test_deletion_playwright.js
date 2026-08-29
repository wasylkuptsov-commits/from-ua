const { chromium, firefox, webkit } = require('playwright');
const path = require('path');

async function runTestSuite() {
    console.log("=== PLAYWRIGHT MULTI-BROWSER PRODUCT DELETION TEST SUITE ===");
    const appUrl = `file:///${path.resolve(__dirname, 'index.html').replace(/\\/g, '/')}`;

    const browsersToTest = [
        { name: 'Chromium', launcher: chromium },
        { name: 'Firefox', launcher: firefox },
        { name: 'WebKit', launcher: webkit }
    ];

    const results = [];

    for (const b of browsersToTest) {
        console.log(`\nTesting browser engine: ${b.name}...`);
        let browser;
        try {
            browser = await b.launcher.launch({ headless: true });
            const context = await browser.newContext();
            const page = await context.newPage();
            await page.goto(appUrl);

            // 1. Switch to Admin mode
            await page.evaluate(() => window.setAppMode(true));

            // Inject test product
            const testId = `TEST_${b.name}_` + Date.now();
            await page.evaluate((id) => {
                const prods = Database.getProducts();
                prods.unshift({
                    id: id,
                    name: `Produkt Testowy ${id}`,
                    category: 'Test',
                    isApproved: true,
                    offers: [{ source: 'Hurtownia Test', price: 12.34 }]
                });
                Database.saveProducts(prods);
                window.renderPimView();
            }, testId);

            // 2. Click trash button & verify inline bar + modal
            await page.click(`.btn-delete-product-pim[data-id="${testId}"]`);
            const inlineVisible = await page.isVisible(`#inlineDeleteBar_${testId}`);
            const modalVisible = await page.isVisible('#deleteProductModal');

            // 3. Test withdrawal (Button A)
            await page.click(`#inlineDeleteBar_${testId} .btn-inline-withdraw`);
            const isApproved = await page.evaluate((id) => {
                const p = Database.getProducts().find(x => x.id === id);
                return p ? p.isApproved : null;
            }, testId);

            // 4. Test permanent delete (Button B)
            await page.evaluate(() => window.renderPimView());
            await page.click(`.btn-delete-product-pim[data-id="${testId}"]`);
            await page.click(`#inlineDeleteBar_${testId} .btn-inline-permanent-delete`);

            const existsAfterDelete = await page.evaluate((id) => {
                return Database.getProducts().some(x => x.id === id);
            }, testId);

            const passed = inlineVisible && modalVisible && (isApproved === false) && (!existsAfterDelete);
            results.push({
                Browser: b.name,
                InlineBar: inlineVisible ? 'PASS' : 'FAIL',
                ModalCentered: modalVisible ? 'PASS' : 'FAIL',
                Withdrawal: isApproved === false ? 'PASS' : 'FAIL',
                PermanentDelete: !existsAfterDelete ? 'PASS' : 'FAIL',
                Result: passed ? 'PASS (100%)' : 'FAIL'
            });

            await browser.close();
        } catch (err) {
            console.error(`Error testing ${b.name}:`, err.message);
            if (browser) await browser.close();
            results.push({
                Browser: b.name,
                InlineBar: 'FAIL',
                ModalCentered: 'FAIL',
                Withdrawal: 'FAIL',
                PermanentDelete: 'FAIL',
                Result: `FAIL (${err.message})`
            });
        }
    }

    console.log("\n=======================================================");
    console.log("             TEST RESULT SUMMARY MATRIX               ");
    console.log("=======================================================");
    console.table(results);
}

if (require.main === module) {
    runTestSuite();
}
