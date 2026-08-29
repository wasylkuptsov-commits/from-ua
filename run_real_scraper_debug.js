const fs = require('fs');

// Mock Database object needed by scraper_debug.js
global.Database = {
    cleanEan: function(ean) { return String(ean).replace(/[^0-9]/g, ''); },
    addPriceOffer: function() {},
    autoCleanAndMergeAllProducts: function() {},
    addHistoryLog: function() {}
};

// Mock window object
global.window = {};

let fileContent = fs.readFileSync('scraper_debug.js', 'utf8');
// Remove the problematic bottom lines
fileContent = fileContent.replace('window.Scraper = Scraper;', '');
fileContent = fileContent.replace('window.MonolithParser = Scraper;', '');

eval(fileContent);

const input = fs.readFileSync('kraft_test.txt', 'utf8');
const res = window.Scraper.extractProductsStructured(input, 'Kraft Group', null);
console.log(JSON.stringify(res, null, 2));
