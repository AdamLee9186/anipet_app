const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

console.log('🔍 Verifying compressed data file...\n');

const dataDir = path.join(__dirname, '..', 'public', 'data');
const gzipFile = path.join(dataDir, 'anipet_products_optimized.min.json.gz');

// Check if compressed file exists
if (!fs.existsSync(gzipFile)) {
    console.error('❌ Compressed file not found:', gzipFile);
    process.exit(1);
}

try {
    // Read the compressed file
    const compressedData = fs.readFileSync(gzipFile);
    console.log(`📊 Compressed file size: ${(compressedData.length / 1024 / 1024).toFixed(2)} MB`);
    
    // Check gzip header
    if (compressedData[0] === 0x1f && compressedData[1] === 0x8b) {
        console.log('✅ Gzip header is correct');
    } else {
        console.log('❌ Gzip header is incorrect');
        console.log(`   Expected: 0x1f 0x8b, Got: 0x${compressedData[0].toString(16)} 0x${compressedData[1].toString(16)}`);
        process.exit(1);
    }
    
    // Check compression method
    if (compressedData[2] === 8) {
        console.log('✅ Compression method is correct (deflate)');
    } else {
        console.log('❌ Compression method is incorrect');
        console.log(`   Expected: 8, Got: ${compressedData[2]}`);
        process.exit(1);
    }
    
    // Try to decompress
    console.log('\n🔄 Attempting to decompress...');
    const decompressed = zlib.gunzipSync(compressedData);
    const decompressedString = decompressed.toString('utf8');
    
    console.log(`📊 Decompressed size: ${(decompressed.length / 1024 / 1024).toFixed(2)} MB`);
    
    // Try to parse as JSON
    console.log('\n📋 Attempting to parse as JSON...');
    const jsonData = JSON.parse(decompressedString);
    
    if (Array.isArray(jsonData)) {
        console.log(`✅ JSON parsing successful! Found ${jsonData.length} products`);
        
        // Check first product structure
        if (jsonData.length > 0) {
            const firstProduct = jsonData[0];
            const requiredFields = ['תאור פריט', 'מחיר', 'מותג'];
            const missingFields = requiredFields.filter(field => !(field in firstProduct));
            
            if (missingFields.length === 0) {
                console.log('✅ Product structure looks correct');
                console.log('   Sample product:', firstProduct['תאור פריט']);
            } else {
                console.log('⚠️  Missing required fields:', missingFields);
            }
        }
    } else {
        console.log('❌ JSON data is not an array');
        process.exit(1);
    }
    
    console.log('\n🎉 All verification checks passed!');
    console.log('✅ The compressed file is valid and ready to use');
    
} catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
} 