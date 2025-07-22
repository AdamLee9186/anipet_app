import { openDB } from 'idb';

/**
 * IndexedDB utilities for caching the Fuse.js search index
 * This significantly improves search performance by avoiding rebuilding the index on every page load
 */

const DB_NAME = 'pet-store-app';
const STORE_NAME = 'search-index';
const KEY = 'index';

/**
 * Save the Fuse.js search index to IndexedDB for future use
 * @param {Object} indexData - The Fuse.js index data to save
 */
export async function saveIndex(indexData) {
  try {
    console.log('💾 Attempting to save index to IndexedDB...');
    console.log('💾 Index data type:', typeof indexData);
    console.log('💾 Index data keys:', Object.keys(indexData || {}));
    console.log('💾 Index data size:', JSON.stringify(indexData).length, 'bytes');
    const db = await openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME);
      },
    });
    console.log('💾 Database opened successfully');
    await db.put(STORE_NAME, indexData, KEY);
    console.log('💾 Fuse index saved to IndexedDB successfully');
  } catch (error) {
    console.error('❌ Failed to save Fuse index to IndexedDB:', error);
  }
}

/**
 * Load the cached Fuse.js search index from IndexedDB
 * @returns {Object|null} The cached index data or null if not found
 */
export async function loadIndex() {
  try {
    console.log('🔍 Attempting to load index from IndexedDB...');
    const db = await openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME);
      },
    });
    console.log('🔍 Database opened successfully');
    const index = await db.get(STORE_NAME, KEY);
    console.log('🔍 Database get result:', index);
    if (index) {
      console.log('🔍 Fuse index loaded from IndexedDB successfully');
      console.log('🔍 Index type:', typeof index);
      console.log('🔍 Index keys:', Object.keys(index || {}));
    } else {
      console.log('🔍 No index found in IndexedDB');
    }
    return index;
  } catch (error) {
    console.error('❌ Failed to load Fuse index from IndexedDB:', error);
    return null;
  }
}

/**
 * Clear the cached Fuse.js search index from IndexedDB
 * Useful for forcing a fresh index rebuild
 */
export async function clearIndex() {
  try {
    const db = await openDB(DB_NAME, 1);
    await db.delete(STORE_NAME, KEY);
    console.log('🗑️ Fuse index cleared from IndexedDB');
  } catch (error) {
    console.error('❌ Failed to clear Fuse index from IndexedDB:', error);
  }
} 