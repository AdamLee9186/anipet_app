const { openDB } = require('idb');

const DB_NAME = 'pet-store-app';
const STORE_NAME = 'search-index';
const KEY = 'index';

async function clearIndex() {
  try {
    console.log('🗑️ Attempting to clear index from IndexedDB...');
    const db = await openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME);
      },
    });
    console.log('🗑️ Database opened successfully');
    await db.delete(STORE_NAME, KEY);
    console.log('🗑️ Fuse index cleared from IndexedDB successfully');
  } catch (error) {
    console.error('❌ Failed to clear Fuse index from IndexedDB:', error);
  }
}

console.log('🗑️ Clearing cached search index...');

clearIndex().then(() => {
  console.log('✅ Cached search index cleared successfully!');
  console.log('🔄 Next time the app loads, it will build a new, smaller index');
}).catch((error) => {
  console.error('❌ Failed to clear index:', error.message);
}); 