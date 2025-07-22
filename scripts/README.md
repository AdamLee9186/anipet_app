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