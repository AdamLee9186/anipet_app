const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

console.log('🔄 החלפת anipet_products_optimized.json בקובץ הממוזג החדש...\n');

// Check if brotli is available
let brotli;
try {
  brotli = require('brotli');
} catch (e) {
  console.warn('⚠️  brotli לא מותקן, מדלג על יצירת קבצי .br');
  brotli = null;
}

const dataDir = path.join(__dirname, '../public/data');
const mergedFile = path.join(dataDir, 'anipet_products_optimized_merged.json');
const targetFile = path.join(dataDir, 'anipet_products_optimized.json');
const minifiedFile = path.join(dataDir, 'anipet_products_optimized.min.json');
const backupDir = path.join(dataDir, 'backup');

// Check if merged file exists
if (!fs.existsSync(mergedFile)) {
  console.error('❌ לא נמצא קובץ anipet_products_optimized_merged.json:', mergedFile);
  process.exit(1);
}

// Create backup directory if it doesn't exist
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Backup existing files (optional, but recommended)
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
if (fs.existsSync(targetFile)) {
  const backupFile = path.join(backupDir, `anipet_products_optimized_${timestamp}.json`);
  console.log('💾 יוצר גיבוי של הקובץ הישן...');
  fs.copyFileSync(targetFile, backupFile);
  console.log(`✅ גיבוי נשמר: ${backupFile}`);
}

if (fs.existsSync(minifiedFile)) {
  const backupMinFile = path.join(backupDir, `anipet_products_optimized.min_${timestamp}.json`);
  fs.copyFileSync(minifiedFile, backupMinFile);
  console.log(`✅ גיבוי minified נשמר: ${backupMinFile}`);
}

// Read the merged file
console.log('\n📖 קורא את הקובץ הממוזג...');
const mergedData = fs.readFileSync(mergedFile, 'utf8');
const mergedSize = Buffer.byteLength(mergedData, 'utf8');
console.log(`📊 גודל הקובץ הממוזג: ${(mergedSize / 1024 / 1024).toFixed(2)} MB`);

// Replace the main file
console.log('\n📝 מחליף את anipet_products_optimized.json...');
fs.writeFileSync(targetFile, mergedData, 'utf8');
console.log('✅ הקובץ הוחלף בהצלחה');

// Create minified version (same file, just different name)
console.log('\n📝 יוצר גרסה minified...');
fs.writeFileSync(minifiedFile, mergedData, 'utf8');
console.log('✅ גרסה minified נוצרה');

// Create compressed versions
console.log('\n🗜️  יוצר גרסאות דחוסות...');

// Gzip for minified file
const gzipFile = path.join(dataDir, 'anipet_products_optimized.min.json.gz');
console.log('   דוחס gzip עבור .min.json...');
const gzipData = zlib.gzipSync(mergedData, { level: 9 });
fs.writeFileSync(gzipFile, gzipData);
const gzipSize = gzipData.length;
const gzipRatio = ((mergedSize - gzipSize) / mergedSize * 100).toFixed(1);
console.log(`   ✅ נוצר: ${path.basename(gzipFile)} (${(gzipSize / 1024 / 1024).toFixed(2)} MB, דחיסה: ${gzipRatio}%)`);

// Brotli for regular file (if available)
if (brotli) {
  const brotliFile = path.join(dataDir, 'anipet_products_optimized.json.br');
  console.log('   דוחס brotli עבור .json...');
  const brotliData = brotli.compress(Buffer.from(mergedData, 'utf8'));
  if (brotliData) {
    fs.writeFileSync(brotliFile, brotliData);
    const brotliSize = brotliData.length;
    const brotliRatio = ((mergedSize - brotliSize) / mergedSize * 100).toFixed(1);
    console.log(`   ✅ נוצר: ${path.basename(brotliFile)} (${(brotliSize / 1024 / 1024).toFixed(2)} MB, דחיסה: ${brotliRatio}%)`);
  } else {
    console.warn('   ⚠️  דחיסת brotli נכשלה');
  }
} else {
  console.log('   ⚠️  מדלג על דחיסת brotli (לא מותקן)');
}

// Verify files
console.log('\n🔍 בודק את הקבצים שנוצרו...');
const filesToCheck = [
  { path: targetFile, name: 'anipet_products_optimized.json' },
  { path: minifiedFile, name: 'anipet_products_optimized.min.json' },
  { path: gzipFile, name: 'anipet_products_optimized.min.json.gz' }
];

if (brotli) {
  const brotliFile = path.join(dataDir, 'anipet_products_optimized.json.br');
  if (fs.existsSync(brotliFile)) {
    filesToCheck.push({ path: brotliFile, name: 'anipet_products_optimized.json.br' });
  }
}

let allFilesOk = true;
filesToCheck.forEach(({ path: filePath, name }) => {
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`   ✅ ${name} קיים (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  } else {
    console.error(`   ❌ ${name} לא נמצא!`);
    allFilesOk = false;
  }
});

if (!allFilesOk) {
  console.error('\n❌ חלק מהקבצים לא נוצרו!');
  process.exit(1);
}

console.log('\n📈 סיכום:');
console.log(`   ✅ הקובץ הוחלף: ${path.basename(targetFile)}`);
console.log(`   ✅ גרסה minified נוצרה: ${path.basename(minifiedFile)}`);
console.log(`   ✅ גרסה דחוסה (gzip) נוצרה: ${path.basename(gzipFile)}`);
if (brotli && fs.existsSync(path.join(dataDir, 'anipet_products_optimized.json.br'))) {
  console.log(`   ✅ גרסה דחוסה (brotli) נוצרה: anipet_products_optimized.json.br`);
}
console.log('\n🎉 ההחלפה הושלמה בהצלחה!');
console.log('💡 השלב הבא: הרץ "npm run build" לבדיקה, ואז commit ו-push ל-GitHub');

