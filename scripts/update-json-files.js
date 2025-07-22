const fs = require('fs');
const path = require('path');

console.log('🔄 עדכון קבצי JSON מקובץ CSV מעודכן...\n');

// פונקציה להמרת CSV ל-JSON ללא ספריות חיצוניות
function csvToJson(csvText) {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(header => 
    header.replace(/"/g, '').trim()
  );
  
  const jsonData = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    
    // פיצול שורות עם תמיכה בפסיקים בתוך מרכאות
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // הוסף את הערך האחרון
    
    const row = {};
    headers.forEach((header, index) => {
      if (values[index]) {
        row[header] = values[index].replace(/"/g, '');
      } else {
        row[header] = '';
      }
    });
    
    jsonData.push(row);
  }
  
  return jsonData;
}

// Helper function to parse weight (copied from data-worker.js)
function parseWeight(weightText, productName = '') {
  let weight = 0;
  let weightUnit = '';
  
  if (weightText) {
    // Try to extract weight and unit from various formats
    const kgMatch = weightText.match(/(\d+(?:\.\d+)?)\s*ק"?ג/);
    const gramMatch = weightText.match(/(\d+(?:\.\d+)?)\s*גרם/);
    const literMatch = weightText.match(/(\d+(?:\.\d+)?)\s*ליטר/);
    const mgMatch = weightText.match(/(\d+(?:\.\d+)?)\s*מ"?ג/);
    
    if (kgMatch) {
      weight = parseFloat(kgMatch[1]);
      weightUnit = 'ק"ג';
    } else if (gramMatch) {
      weight = parseFloat(gramMatch[1]);
      weightUnit = 'גרם';
    } else if (literMatch) {
      weight = parseFloat(literMatch[1]);
      weightUnit = 'ליטר';
    } else if (mgMatch) {
      weight = parseFloat(mgMatch[1]);
      weightUnit = 'מ"ג';
    } else {
      // Try to parse as pure number (assume grams if small, kg if large)
      const numWeight = parseFloat(weightText);
      if (!isNaN(numWeight)) {
        weight = numWeight;
        weightUnit = numWeight < 10 ? 'ק"ג' : 'גרם';
      }
    }
  }
  
  // Fallback: extract weight from product name if not found in weight column
  if (!weight && productName) {
    // Match various units in product name
    let matchKg = productName.match(/(\d+(?:\.\d+)?)\s*(?:ק"?ג|קילו)/);
    let matchGram = productName.match(/(\d+(?:\.\d+)?)\s*גרם/);
    let matchLiter = productName.match(/(\d+(?:\.\d+)?)\s*ליטר/);
    let matchMg = productName.match(/(\d+(?:\.\d+)?)\s*מ"?ג/);
    let matchMl = productName.match(/(\d+(?:\.\d+)?)\s*מ"?ל/);
    
    if (matchKg) {
      weight = parseFloat(matchKg[1]);
      weightUnit = 'ק"ג';
    } else if (matchGram) {
      weight = parseFloat(matchGram[1]);
      weightUnit = 'גרם';
    } else if (matchLiter) {
      weight = parseFloat(matchLiter[1]);
      weightUnit = 'ליטר';
    } else if (matchMg) {
      weight = parseFloat(matchMg[1]);
      weightUnit = 'מ"ג';
    } else if (matchMl) {
      weight = parseFloat(matchMl[1]);
      weightUnit = 'ml';
    }
  }

  return { weight, weightUnit };
}

try {
  // קרא את קובץ ה-CSV המעודכן
  console.log('📖 קורא את קובץ ה-CSV המעודכן...');
  const csvPath = path.join(__dirname, 'anipet_catalog_final_updated_20250718_184942.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf8');

  // המר ל-JSON
  console.log('🔄 ממיר CSV ל-JSON...');
  const jsonData = csvToJson(csvContent);
  console.log(`📊 מספר מוצרים בקובץ CSV: ${jsonData.length}`);

  // צור תיקיית data אם לא קיימת
  const dataDir = path.join(__dirname, 'public/data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // שמור את קובץ ה-JSON המעודכן
  const optimizedJsonPath = path.join(dataDir, 'anipet_products_optimized.json');
  fs.writeFileSync(optimizedJsonPath, JSON.stringify(jsonData, null, 2));
  console.log(`✅ קובץ JSON מעודכן נשמר ב: ${optimizedJsonPath}`);

  // צור אינדקס חיפוש מעודכן
  console.log('🔍 יוצר אינדקס חיפוש מעודכן...');
  
  // Transform products to match the expected format
  const products = jsonData.map((row, index) => {
    const { weight, weightUnit } = parseWeight(row['משקל'], row['תאור פריט']);
    
    return {
      id: index,
      sku: row['מק"ט'] || row['מק""ט'] || '',
      barcode: row['ברקוד'] || '',
      productName: row['תאור פריט'] || '',
      weight: weight,
      weightUnit: weightUnit,
      originalWeight: row['משקל'],
      salePrice: parseFloat(row['מחיר מכירה']) || 0,
      brand: row['שם מותג'] || '',
      animalType: row['קבוצת על'] || '',
      lifeStage: row['גיל (גור בוגר וכו\')'] || '',
      internalCategory: row['קטגוריה פנימית'] || '',
      mainIngredient: row['ממרכיב עיקרי'] || '',
      medicalIssue: row['בעיה רפואית'] || '',
      qualityLevel: row['רמה / איכות'] || '',
      supplierName: row['שם ספק ראשי'] || ''
    };
  });

  console.log('✅ מוצרים עובדו בהצלחה');

  // בדוק אם Fuse.js זמין
  try {
    const Fuse = require('fuse.js');
    
    const fuseConfig = {
      keys: [
        { name: 'productName', weight: 0.6 },
        { name: 'brand', weight: 0.25 },
        { name: 'originalWeight', weight: 0.1 },
        { name: 'sku', weight: 0.05 },
      ],
      threshold: 0.4,
      includeMatches: true,
      ignoreLocation: true,
      useExtendedSearch: false,
      minMatchCharLength: 2,
      shouldSort: true,
      findAllMatches: true,
      getFn: (obj, path) => {
        const value = Fuse.config.getFn(obj, path);
        if (typeof value === 'string') {
          return value
            .normalize('NFD')
            .replace(/[\u0591-\u05C7]/g, '')
            .toLowerCase();
        }
        return value;
      }
    };

    console.log('🔧 יוצר אינדקס Fuse.js...');
    const fuse = new Fuse(products, fuseConfig);
    const index = fuse.getIndex();

    // שמור את אינדקס החיפוש
    const searchIndexPath = path.join(dataDir, 'search-index.json');
    fs.writeFileSync(searchIndexPath, JSON.stringify(index, null, 2));

    console.log('✅ אינדקס חיפוש נוצר בהצלחה!');
    console.log(`📁 נשמר ב: ${searchIndexPath}`);
    console.log(`📊 גודל האינדקס: ${(JSON.stringify(index).length / 1024 / 1024).toFixed(2)} MB`);

    // בדוק את האינדקס החדש
    console.log('\n🧪 בודק את האינדקס החדש...');
    const testQuery = 'פריסקיז 10 קילו';
    const results = fuse.search(testQuery);

    console.log(`🔍 שאילתת בדיקה: "${testQuery}"`);
    console.log(`📋 נמצאו ${results.length} תוצאות`);

    if (results.length > 0) {
      console.log('📝 תוצאות מובילות:');
      results.slice(0, 3).forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.item.productName} (ציון: ${result.score?.toFixed(3)})`);
      });
    }

  } catch (fuseError) {
    console.log('⚠️  Fuse.js לא זמין, מדלג על יצירת אינדקס חיפוש');
    console.log('💡 כדי ליצור אינדקס חיפוש, הרץ: npm install fuse.js');
  }

  console.log('\n🎉 עדכון הקבצים הושלם בהצלחה!');
  console.log(`📊 מספר מוצרים מעודכן: ${jsonData.length}`);

} catch (error) {
  console.error('❌ שגיאה בעדכון הקבצים:', error.message);
  console.log('\nודא שהקבצים הבאים קיימים:');
  console.log('   - anipet_catalog_final_updated_20250718_184942.csv');
  console.log('   - תיקיית public/data');
} 