function testParser() {
    var rawInput = Kawa Ziarnista Lavazza Crema e Aroma 1kg\nSymbol: MNL-LAV-01\nKod EAN: 5900141011032\nDostêpnoœæ: du¿a iloœæ\nCena netto: 54,50 z³\n\nMilka Czekolada\n12,99 z³ / szt.;
    var lines = rawInput.split('\n');
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].replace(/^\s+|\s+$/g, '');
        if (line.length === 0) continue;
        
        var priceMatches = line.match(/(\d+[\s\.]*[\d]*[\.,]\d{2})\s*(?:z³|PLN|EUR|€)?/i);
        if (priceMatches) {
            var rawP = priceMatches[1].replace(/\s/g, '').replace(',', '.');
            var price = parseFloat(rawP);
            if (!isNaN(price) && price > 0) {
                var name = line;
                name = name.replace(priceMatches[0], '');
                var eanMatch = line.match(/\b\d{8,13}\b/);
                if (eanMatch) name = name.replace(eanMatch[0], '');
                
                name = name.replace(/[\/\-\|\:\;\,\t]/g, ' ')
                           .replace(/\b(z³|pln|eur|netto|brutto|szt|kg|opak|op|koszyk|dodaj|cena|dostawa|kup teraz|w magazynie)\b/gi, '')
                           .replace(/\s+/g, ' ')
                           .replace(/^\s+|\s+$/g, '');
                
                if (name.length < 4 && i > 0) {
                    for (var k = i - 1; k >= Math.max(0, i - 6); k--) {
                        var prevLine = lines[k].replace(/[\/\-\|\:\;\,\t]/g, ' ').replace(/^\s+|\s+$/g, '');
                        var plLow = prevLine.toLowerCase();
                        var isKeyword = plLow.indexOf('symbol') > -1 || plLow.indexOf('dostêpnoœæ') > -1 || plLow.indexOf('cena') > -1 || plLow.indexOf('kod') > -1 || plLow.indexOf('ean') > -1 || plLow.indexOf('producent') > -1 || plLow.indexOf('waga') > -1 || plLow.indexOf('stan') > -1;
                        
                        if (prevLine.length >= 4 && !prevLine.match(/^\d+[\.,]\d{2}/) && !isKeyword) {
                            name = prevLine;
                            break;
                        }
                    }
                }
                WScript.Echo('FOUND: ' + name + ' | ' + price);
            }
        }
    }
}
testParser();
