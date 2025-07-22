
// קובץ לפיצוח קבצי JSON דחוסים
// Usage: import { decompressJson } from './json-decompressor.js';

export function decompressJson(compressedData, compressionType = 'gzip') {
  if (typeof window === 'undefined') {
    // Node.js environment
    const zlib = require('zlib');
    const buffer = Buffer.from(compressedData);
    
    switch (compressionType) {
      case 'gzip':
        return JSON.parse(zlib.gunzipSync(buffer).toString('utf8'));
      case 'brotli':
        return JSON.parse(zlib.brotliDecompressSync(buffer).toString('utf8'));
      default:
        return JSON.parse(buffer.toString('utf8'));
    }
  } else {
    // Browser environment
    return new Promise((resolve, reject) => {
      if (compressionType === 'gzip') {
        // Use pako for gzip in browser
        if (typeof pako !== 'undefined') {
          try {
            const decompressed = pako.inflate(compressedData, { to: 'string' });
            resolve(JSON.parse(decompressed));
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error('pako library required for gzip decompression in browser'));
        }
      } else if (compressionType === 'brotli') {
        // Use BrotliDecode for brotli in browser
        if (typeof BrotliDecode !== 'undefined') {
          try {
            const decompressed = BrotliDecode(compressedData);
            resolve(JSON.parse(decompressed));
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error('BrotliDecode library required for brotli decompression in browser'));
        }
      } else {
        // No compression
        resolve(JSON.parse(new TextDecoder().decode(compressedData)));
      }
    });
  }
}

// פונקציה לטעינת קובץ דחוס
export async function loadCompressedJson(url, compressionType = 'gzip') {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await decompressJson(arrayBuffer, compressionType);
  } catch (error) {
    console.error('שגיאה בטעינת קובץ דחוס:', error);
    throw error;
  }
}
