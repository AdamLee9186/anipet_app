const fs = require('fs');
const path = require('path');

console.log('🔄 עדכון "משתתף במגוון" מקובץ products_optimized.json...\n');

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

// ---------- Main update logic ----------
function main() {
  const dataDir = path.join(__dirname, '../public/data');
  const productsOptimizedPath = path.join(dataDir, 'products_optimized.json');
  const mergedJsonPath = path.join(dataDir, 'anipet_products_optimized_merged.json');
  const reportPath = path.join(dataDir, 'diversified_products_update_report.json');

  if (!fs.existsSync(productsOptimizedPath)) {
    console.error('❌ לא נמצא קובץ products_optimized.json:', productsOptimizedPath);
    process.exit(1);
  }
  if (!fs.existsSync(mergedJsonPath)) {
    console.error('❌ לא נמצא קובץ anipet_products_optimized_merged.json:', mergedJsonPath);
    process.exit(1);
  }

  console.log('📖 קורא products_optimized.json:', productsOptimizedPath);
  const productsData = readJsonFile(productsOptimizedPath);
  const products = productsData.products || [];
  console.log(`📊 מספר מוצרים בקובץ products_optimized.json: ${products.length}`);

  console.log('📖 קורא anipet_products_optimized_merged.json:', mergedJsonPath);
  const mergedProducts = readJsonFile(mergedJsonPath);
  console.log(`📊 מספר מוצרים בקובץ merged: ${mergedProducts.length}`);

  // בנה מפה של מוצרים עם dv: 1 לפי ברקוד ו-SKU
  const dvProductsByBarcode = new Map();
  const dvProductsBySku = new Map();

  let dvCount = 0;
  products.forEach(prod => {
    if (prod.dv === 1) {
      dvCount++;
      const barcode = (prod.barcode || '').toString().trim();
      const sku = (prod.sku || '').toString().trim();
      
      if (barcode) {
        dvProductsByBarcode.set(barcode, true);
      }
      if (sku) {
        dvProductsBySku.set(sku, true);
      }
    }
  });

  console.log(`📊 מספר מוצרים עם dv: 1 בקובץ products_optimized.json: ${dvCount}`);

  // עדכן מוצרים בקובץ merged
  const updatedProducts = [];
  let updateCount = 0;

  mergedProducts.forEach((prod, index) => {
    const barcode = (prod['ברקוד'] || '').toString().trim();
    const code = (prod['קוד פריט'] || '').toString().trim();
    const currentDiversified = prod['משתתף במגוון'] || '';

    let shouldUpdate = false;

    // בדוק לפי ברקוד
    if (barcode && dvProductsByBarcode.has(barcode)) {
      shouldUpdate = true;
    }
    // בדוק לפי קוד פריט (SKU)
    else if (code && dvProductsBySku.has(code)) {
      shouldUpdate = true;
    }

    if (shouldUpdate && currentDiversified !== 'כן') {
      prod['משתתף במגוון'] = 'כן';
      updateCount++;
      updatedProducts.push({
        index,
        code: code || 'N/A',
        barcode: barcode || 'N/A',
        name: prod['תאור פריט'] || 'N/A',
        oldValue: currentDiversified || '(ריק)',
        newValue: 'כן'
      });
    }
  });

  // שמור את הקובץ המעודכן
  console.log('\n💾 שומר קובץ JSON מעודכן...');
  fs.writeFileSync(mergedJsonPath, JSON.stringify(mergedProducts, null, 2), 'utf8');
  console.log('✅ נשמר:', mergedJsonPath);

  // צור דוח
  const report = {
    summary: {
      totalProductsInSource: products.length,
      productsWithDv1: dvCount,
      totalProductsInMerged: mergedProducts.length,
      productsUpdated: updateCount,
      timestamp: new Date().toISOString()
    },
    updatedProducts: updatedProducts
  };

  console.log('💾 שומר דוח עדכון...');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log('✅ נשמר:', reportPath);

  console.log('\n📈 סיכום:');
  console.log(`   מוצרים עם dv: 1 בקובץ המקור: ${dvCount}`);
  console.log(`   מוצרים שעודכנו ל"משתתף במגוון": "כן": ${updateCount}`);
  console.log(`   מוצרים בקובץ merged: ${mergedProducts.length}`);
  console.log('\n🎉 העדכון הושלם בהצלחה!');
}

if (require.main === module) {
  main();
}

module.exports = { main };

