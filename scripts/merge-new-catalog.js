const fs = require('fs');
const path = require('path');

console.log('🔄 מיזוג קטלוג חדש אל anipet_products_optimized.json...\n');

// ---------- Helper: safe JSON read ----------
function readJsonFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`❌ שגיאה בקריאת JSON מ-${filePath}:`, err.message);
    process.exit(1);
  }
}

// ---------- Helper: simple CSV -> rows (objects) ----------
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length === 0) return [];

  const headerLine = lines[0];
  const headers = splitCsvLine(headerLine).map(h =>
    h.replace(/"/g, '').trim()
  );

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim()) continue;
    const values = splitCsvLine(line);
    const row = {};
    headers.forEach((header, idx) => {
      const rawVal = values[idx] !== undefined ? values[idx] : '';
      row[header] = String(rawVal).replace(/^"|"$/g, '').trim();
    });
    rows.push(row);
  }
  return rows;
}

// Split single CSV line with support for quotes and commas inside quotes
function splitCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // toggle quote mode, but support escaped quotes ("")
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i++; // skip second quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ---------- Helper: normalize strings for comparison ----------
function normalizeStr(val) {
  return (val || '')
    .toString()
    .trim()
    .toLowerCase();
}

// ---------- Build SKU -> { imageUrl, productUrl } map from master CSV ----------
function buildSkuUrlMap(masterCsvPath) {
  console.log('📖 קורא את קובץ master catalog CSV:', masterCsvPath);
  const csvText = fs.readFileSync(masterCsvPath, 'utf8');
  const rows = parseCsv(csvText);
  console.log(`📊 מספר שורות ב-master catalog: ${rows.length}`);

  const skuMap = new Map();

  rows.forEach(row => {
    const imageUrl = row['Image URL'] || '';
    const productUrl = row['Product URL'] || '';
    const skusField = row['SKUs'] || row['Skus'] || row['skus'] || '';

    if (!skusField) return;

    const skuList = skusField
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (skuList.length === 0) return;

    skuList.forEach(sku => {
      if (!skuMap.has(sku)) {
        skuMap.set(sku, { imageUrl, productUrl });
      }
    });
  });

  console.log(`🔗 נוצר מיפוי ל-${skuMap.size} SKUs שונים מה-master catalog`);
  return skuMap;
}

// ---------- Find product in existing JSON ----------
function buildExistingIndexes(existingProducts) {
  const byBarcode = new Map();
  const byCode = new Map();
  const byName = new Map();

  existingProducts.forEach((prod, index) => {
    const code = (prod['קוד פריט'] || '').toString().trim();
    const barcode = (prod['ברקוד'] || '').toString().trim();
    const name = normalizeStr(prod['תאור פריט']);

    if (barcode) {
      if (!byBarcode.has(barcode)) byBarcode.set(barcode, index);
    }
    if (code) {
      if (!byCode.has(code)) byCode.set(code, index);
    }
    if (name) {
      if (!byName.has(name)) byName.set(name, index);
    }
  });

  return { byBarcode, byCode, byName };
}

function findExistingProductIndex(row, indexes) {
  const rawBarcode = (row['ברקוד'] || '').toString().trim();
  const rawCode = (row['קוד פריט'] || '').toString().trim();
  const rawName = normalizeStr(row['תאור פריט']);

  if (rawBarcode && indexes.byBarcode.has(rawBarcode)) {
    return indexes.byBarcode.get(rawBarcode);
  }
  if (rawCode && indexes.byCode.has(rawCode)) {
    return indexes.byCode.get(rawCode);
  }
  if (rawName && indexes.byName.has(rawName)) {
    return indexes.byName.get(rawName);
  }
  return -1;
}

// ---------- Weight formatting ----------
function buildWeightString(weightValueRaw, unitRaw) {
  const unit = (unitRaw || '').toString().trim();
  if (!unit || unit === 'יחידה') {
    // אין צורך לציין משקל ליחידות
    return null;
  }

  const wStr = (weightValueRaw || '').toString().trim();
  if (!wStr) return null;

  const num = Number(wStr.replace(',', '.'));
  if (!isFinite(num) || num === 0) return null;

  // המרת "קילו" ל-"קג" - העדפה לכתוב "קג"
  const normalizedUnit = (unit === 'קילו' || unit === 'ק"ג' || unit === 'קילוגרם') ? 'קג' : unit;
  
  // נשמור את הטקסט המקורי + יחידה מנורמלת
  return `${wStr} ${normalizedUnit}`;
}

// ---------- Compare weights (normalize "קילו" to "קג") ----------
function compareWeights(weight1, weight2) {
  if (!weight1 && !weight2) return true;
  if (!weight1 || !weight2) return false;
  
  const w1 = String(weight1).trim();
  const w2 = String(weight2).trim();
  
  // המרת "קילו" ל-"קג" בשניהם להשוואה
  const normalized1 = w1.replace(/קילו/g, 'קג').replace(/קילוגרם/g, 'קג');
  const normalized2 = w2.replace(/קילו/g, 'קג').replace(/קילוגרם/g, 'קג');
  
  return normalized1 === normalized2;
}

// ---------- Main merge logic ----------
function main() {
  const dataDir = path.join(__dirname, '../public/data');
  const existingJsonPath = path.join(dataDir, 'anipet_products_optimized.json');
  const newCatalogPath = path.join(dataDir, 'קטלוגחדש.csv');
  const masterCsvPath = path.join(dataDir, 'anipet_master_catalog_v1.csv');
  const outputJsonPath = path.join(dataDir, 'anipet_products_optimized_merged.json');
  const reportPath = path.join(dataDir, 'anipet_products_optimized_merged_report.json');

  if (!fs.existsSync(existingJsonPath)) {
    console.error('❌ לא נמצא קובץ anipet_products_optimized.json:', existingJsonPath);
    process.exit(1);
  }
  if (!fs.existsSync(newCatalogPath)) {
    console.error('❌ לא נמצא קובץ קטלוגחדש.csv:', newCatalogPath);
    process.exit(1);
  }
  if (!fs.existsSync(masterCsvPath)) {
    console.error('❌ לא נמצא קובץ anipet_master_catalog_v1.csv:', masterCsvPath);
    process.exit(1);
  }

  console.log('📖 קורא JSON קיים:', existingJsonPath);
  const existingProducts = readJsonFile(existingJsonPath);
  console.log(`📊 מספר מוצרים בקובץ JSON הקיים: ${existingProducts.length}`);

  console.log('📖 קורא קטלוג חדש (CSV):', newCatalogPath);
  const newCatalogText = fs.readFileSync(newCatalogPath, 'utf8');
  const newRows = parseCsv(newCatalogText);
  console.log(`📊 מספר שורות בקטלוג החדש: ${newRows.length}`);

  const skuMap = buildSkuUrlMap(masterCsvPath);
  const indexes = buildExistingIndexes(existingProducts);

  // נתחיל מהמוצרים הקיימים ונוסיף אליהם מוצרים חדשים
  const mergedProducts = existingProducts.slice();

  const changesReport = {
    summary: {
      existingCount: existingProducts.length,
      newCatalogRows: newRows.length,
      addedProducts: 0,
      updatedProducts: 0,
      unchangedProducts: 0,
      productsWithUrlsFromMaster: 0
    },
    added: [],
    updated: []
  };

  const updatedIndices = new Set();
  const productsWithUrls = new Set();

  // Helper for recording field changes
  function recordFieldChange(changesArr, field, oldVal, newVal) {
    const oldValNorm = oldVal === undefined ? '' : String(oldVal);
    const newValNorm = newVal === undefined ? '' : String(newVal);
    if (oldValNorm === newValNorm) return;
    changesArr.push({
      field,
      oldValue: oldVal,
      newValue: newVal
    });
  }

  // Helper for finding URLs from master CSV according to barcode/code
  function findUrlsForRow(row) {
    const barcode = (row['ברקוד'] || '').toString().trim();
    const code = (row['קוד פריט'] || '').toString().trim();

    if (barcode && skuMap.has(barcode)) {
      return skuMap.get(barcode);
    }
    if (code && skuMap.has(code)) {
      return skuMap.get(code);
    }
    return null;
  }

  console.log('🔧 מתחיל מיזוג נתונים מהמקטלוג החדש...');

  newRows.forEach((row, idx) => {
    const code = (row['קוד פריט'] || '').toString().trim();
    const barcode = (row['ברקוד'] || '').toString().trim();
    const name = row['תאור פריט'] || '';
    const weightValRaw = row['משקל'];
    const unitRaw = row['יחידת משקל'];
    const group = row['קבוצה'];
    const age = row['גיל'];
    const category = row['קטגוריה'];
    const ingredient = row['מרכיב'];
    const quality = row['איכות'];
    const price = row['מחיר'];
    const supplier = row['ספק'];

    const indexInExisting = findExistingProductIndex(row, indexes);

    const urls = findUrlsForRow(row);
    const imageUrlFromMaster = urls && urls.imageUrl ? urls.imageUrl : '';
    const productUrlFromMaster = urls && urls.productUrl ? urls.productUrl : '';

    if (indexInExisting >= 0) {
      // Update existing product
      const prod = mergedProducts[indexInExisting];
      const changes = [];

      // מחיר - רק אם המחיר שונה (השוואה מספרית, 139.0 = 139)
      if (price && String(price).trim() !== '') {
        const newPriceStr = String(price).trim();
        const oldPriceNum = parseFloat(prod['מחיר'] || '0') || 0;
        const newPriceNum = parseFloat(newPriceStr) || 0;
        
        // אם המחירים שונים מספרית, אז נעדכן
        if (oldPriceNum !== newPriceNum) {
          recordFieldChange(changes, 'מחיר', prod['מחיר'], newPriceStr);
          prod['מחיר'] = newPriceStr;
        }
      }

      // קבוצה / גיל / קטגוריה / מרכיב / איכות / ספק
      if (group && String(group).trim() !== '') {
        const val = String(group).trim();
        recordFieldChange(changes, 'קבוצה', prod['קבוצה'], val);
        prod['קבוצה'] = val;
      }
      if (age && String(age).trim() !== '') {
        const val = String(age).trim();
        recordFieldChange(changes, 'גיל', prod['גיל'], val);
        prod['גיל'] = val;
      }
      if (category && String(category).trim() !== '') {
        const val = String(category).trim();
        recordFieldChange(changes, 'קטגוריה', prod['קטגוריה'], val);
        prod['קטגוריה'] = val;
      }
      // מרכיב - רק להוסיף אם לא קיים (לא לדרוס ערך קיים)
      if (ingredient && String(ingredient).trim() !== '') {
        const existingIngredient = (prod['מרכיב'] || '').toString().trim();
        const newIngredient = String(ingredient).trim();
        
        // רק אם הערך הקיים ריק, אז נוסיף את החדש
        if (!existingIngredient) {
          recordFieldChange(changes, 'מרכיב', prod['מרכיב'], newIngredient);
          prod['מרכיב'] = newIngredient;
        }
      }
      if (quality && String(quality).trim() !== '') {
        const val = String(quality).trim();
        recordFieldChange(changes, 'איכות', prod['איכות'], val);
        prod['איכות'] = val;
      }
      if (supplier && String(supplier).trim() !== '') {
        const val = String(supplier).trim();
        recordFieldChange(changes, 'ספק', prod['ספק'], val);
        prod['ספק'] = val;
      }

      // משקל - רק אם המשקל שונה (תוך המרת "קילו" ל-"קג")
      const weightStr = buildWeightString(weightValRaw, unitRaw);
      if (weightStr !== null) {
        const existingWeight = prod['משקל'] || '';
        // השוואה מנורמלת (7 קילו = 7 קג)
        if (!compareWeights(existingWeight, weightStr)) {
          recordFieldChange(changes, 'משקל', prod['משקל'], weightStr);
          prod['משקל'] = weightStr;
        }
      }

      // Image URL / Product URL (מה-master catalog)
      if (imageUrlFromMaster && imageUrlFromMaster.trim() !== '') {
        recordFieldChange(changes, 'Image URL', prod['Image URL'], imageUrlFromMaster);
        prod['Image URL'] = imageUrlFromMaster;
      }
      if (productUrlFromMaster && productUrlFromMaster.trim() !== '') {
        recordFieldChange(changes, 'Product URL', prod['Product URL'], productUrlFromMaster);
        prod['Product URL'] = productUrlFromMaster;
      }
      if ((imageUrlFromMaster && imageUrlFromMaster.trim() !== '') ||
          (productUrlFromMaster && productUrlFromMaster.trim() !== '')) {
        productsWithUrls.add(indexInExisting);
      }

      if (changes.length > 0) {
        updatedIndices.add(indexInExisting);
        changesReport.updated.push({
          type: 'updated',
          index: indexInExisting,
          code: prod['קוד פריט'] || code,
          barcode: prod['ברקוד'] || barcode,
          name: prod['תאור פריט'] || name,
          changes
        });
      }
    } else {
      // Add new product
      const newProd = {
        'קוד פריט': code,
        'ברקוד': barcode,
        'תאור פריט': name,
        'משקל': undefined,
        'מחיר': price ? String(price).trim() : '',
        'מותג': '', // אין בעמודות אקסל לפי התיאור שלך
        'קבוצה': group || '',
        'גיל': age || '',
        'קטגוריה': category || '',
        'מרכיב': ingredient || '',
        'בעיה רפואית': '',
        'איכות': quality || '',
        'ספק': supplier || '',
        'גודל': '',
        'משתתף במגוון': '',
        'Image URL': '',
        'Product URL': ''
      };

      const weightStr = buildWeightString(weightValRaw, unitRaw);
      if (weightStr !== null) {
        newProd['משקל'] = weightStr;
      } else {
        delete newProd['משקל'];
      }

      if (imageUrlFromMaster && imageUrlFromMaster.trim() !== '') {
        newProd['Image URL'] = imageUrlFromMaster;
      }
      if (productUrlFromMaster && productUrlFromMaster.trim() !== '') {
        newProd['Product URL'] = productUrlFromMaster;
      }

      const newIndex = mergedProducts.length;
      mergedProducts.push(newProd);

      const changes = [];
      Object.keys(newProd).forEach(field => {
        const val = newProd[field];
        if (val !== undefined && val !== '') {
          // עבור מוצר חדש, oldValue = null
          changes.push({
            field,
            oldValue: null,
            newValue: val
          });
        }
      });

      changesReport.added.push({
        type: 'added',
        index: newIndex,
        code,
        barcode,
        name,
        changes
      });

      if ((imageUrlFromMaster && imageUrlFromMaster.trim() !== '') ||
          (productUrlFromMaster && productUrlFromMaster.trim() !== '')) {
        productsWithUrls.add(newIndex);
      }
    }
  });

  changesReport.summary.addedProducts = changesReport.added.length;
  changesReport.summary.updatedProducts = updatedIndices.size;
  changesReport.summary.productsWithUrlsFromMaster = productsWithUrls.size;
  changesReport.summary.finalCount = mergedProducts.length;
  changesReport.summary.unchangedProducts =
    mergedProducts.length - changesReport.added.length - updatedIndices.size;

  console.log('\n💾 שומר קובץ JSON ממוזג חדש...');
  fs.writeFileSync(outputJsonPath, JSON.stringify(mergedProducts, null, 2), 'utf8');
  console.log('✅ נשמר:', outputJsonPath);

  console.log('💾 שומר דוח שינויים מפורט...');
  fs.writeFileSync(reportPath, JSON.stringify(changesReport, null, 2), 'utf8');
  console.log('✅ נשמר:', reportPath);

  console.log('\n📈 סיכום:');
  console.log(`   מוצרים קיימים בתחילת התהליך: ${changesReport.summary.existingCount}`);
  console.log(`   שורות בקטלוג החדש:          ${changesReport.summary.newCatalogRows}`);
  console.log(`   מוצרים חדשים שנוספו:        ${changesReport.summary.addedProducts}`);
  console.log(`   מוצרים שעודכנו:              ${changesReport.summary.updatedProducts}`);
  console.log(`   מוצרים ללא שינוי:            ${changesReport.summary.unchangedProducts}`);
  console.log(`   מוצרים עם URLים חדשים:       ${changesReport.summary.productsWithUrlsFromMaster}`);
  console.log('\n🎉 המיזוג הושלם בהצלחה!');
}

if (require.main === module) {
  main();
}

module.exports = { main };


