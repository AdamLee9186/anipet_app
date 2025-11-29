# Scripts Directory - תיקיית סקריפטים

## עדכון קבצי JSON - Update JSON Files

### `update-json-files.js`

סקריפט לעדכון קבצי JSON מקובץ CSV מעודכן.

#### שימוש:
```bash
node scripts/update-json-files.js
```

#### מה הסקריפט עושה:
1. קורא את קובץ ה-CSV המעודכן: `anipet_catalog_final_updated_20250718_184942.csv`
2. ממיר את הנתונים ל-JSON עם תמיכה מלאה בעברית
3. שומר את הקובץ המעודכן: `public/data/anipet_products_optimized.json`
4. יוצר אינדקס חיפוש מעודכן: `public/data/search-index.json`
5. בודק את האינדקס עם שאילתת בדיקה

#### דרישות:
- Node.js מותקן
- קובץ CSV קיים בתיקיית השורש
- תיקיית `public/data` קיימת (נוצרת אוטומטית אם לא קיימת)
- `fuse.js` מותקן (אופציונלי - לבדיקת האינדקס)

#### התקנת fuse.js (אופציונלי):
```bash
npm install fuse.js
```

#### פלט:
- `public/data/anipet_products_optimized.json` - קובץ JSON מעודכן
- `public/data/search-index.json` - אינדקס חיפוש מעודכן
- הודעות סטטוס בקונסול

#### הערות:
- הסקריפט תומך בקבצי CSV גדולים
- כולל נרמול תווים עבריים לאינדקס החיפוש
- מנתח משקל ומחירים אוטומטית
- בודק את האינדקס עם שאילתת בדיקה 

## מיזוג קטלוג חדש לקובץ JSON קיים

### `merge-new-catalog.js`

סקריפט למיזוג מוצרים מקובץ `קטלוגחדש.csv` אל `public/data/anipet_products_optimized.json` ויצירת קובץ JSON חדש + דוח שינויים מפורט.

#### שימוש:
```bash
node scripts/merge-new-catalog.js
# או דרך npm
npm run merge:new-catalog
```

#### קלט:
- `public/data/anipet_products_optimized.json` – קובץ המוצרים הקיים.
- `public/data/קטלוגחדש.csv` – קובץ הקטלוג החדש (UTF-8) עם העמודות:
  - `קוד פריט, ברקוד, תאור פריט, משקל, יחידת משקל, קבוצה, גיל, קטגוריה, מרכיב, איכות, מחיר, ספק`
- `public/data/anipet_master_catalog_v1.csv` – קובץ master הכולל:
  - `Product URL, Image URL, SKUs, Product Name`

#### מה הסקריפט עושה בקצרה:
1. קורא את הקטלוג החדש ואת קובץ ה-JSON הקיים.
2. מזהה מוצרים קיימים לפי ברקוד / קוד פריט / תאור פריט.
3. מעדכן שדות רלוונטיים (כולל מילוי שדות שהיו ריקים) ומוסיף מוצרים חדשים.
4. משייך `Image URL` ו־`Product URL` מהמיפוי ב-`anipet_master_catalog_v1.csv` לפי `SKUs`.
5. שומר קובץ JSON ממוזג חדש: `public/data/anipet_products_optimized_merged.json`.
6. שומר דוח שינויים מפורט: `public/data/anipet_products_optimized_merged_report.json` (כולל before/after לכל שדה ששונה).

#### פלט:
- `public/data/anipet_products_optimized_merged.json` – קובץ JSON ממוזג חדש.
- `public/data/anipet_products_optimized_merged_report.json` – דוח שינויים מפורט בפורמט JSON.
- סיכום סטטיסטיקות בקונסול (כמה מוצרים נוספו, עודכנו, נשארו ללא שינוי, וכמה קיבלו URLים). 