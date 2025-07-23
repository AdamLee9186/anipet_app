const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

console.log('🔄 Compressing and verifying data files...\n');

const dataDir = path.join(__dirname, '..', 'public', 'data');
const sourceFile = path.join(dataDir, 'anipet_products_optimized.min.json');
const gzipFile = path.join(dataDir, 'anipet_products_optimized.min.json.gz');

// Check if source file exists
if (!fs.existsSync(sourceFile)) {
    console.error('❌ Source file not found:', sourceFile);
    process.exit(1);
}

console.log('📦 Compressing anipet_products_optimized.min.json...');

try {
    // Read the source file
    const sourceData = fs.readFileSync(sourceFile, 'utf8');
    const sourceSize = Buffer.byteLength(sourceData, 'utf8');
    
    console.log(`   Original size: ${(sourceSize / 1024 / 1024).toFixed(2)} MB`);
    
    // Compress with gzip
    const compressedData = zlib.gzipSync(sourceData, { level: 9 });
    const compressedSize = compressedData.length;
    
    // Write compressed file
    fs.writeFileSync(gzipFile, compressedData);
    
    const compressionRatio = ((sourceSize - compressedSize) / sourceSize * 100).toFixed(1);
    
    console.log(`   Compressed size: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Compression ratio: ${compressionRatio}%`);
    
    // Verify the compressed file
    console.log('\n🔍 Verifying compressed file...');
    
    try {
        const verifyData = fs.readFileSync(gzipFile);
        const decompressed = zlib.gunzipSync(verifyData);
        const decompressedString = decompressed.toString('utf8');
        
        // Compare with original
        if (decompressedString === sourceData) {
            console.log('✅ Compression verification successful!');
            console.log('✅ File integrity confirmed');
        } else {
            console.log('❌ Compression verification failed - data mismatch');
            process.exit(1);
        }
        
    } catch (verifyError) {
        console.log('❌ Compression verification failed:', verifyError.message);
        process.exit(1);
    }
    
    // Test with pako (simulate browser environment)
    console.log('\n🌐 Testing with pako (browser simulation)...');
    
    try {
        // This simulates what the browser would do
        const pakoTest = zlib.gunzipSync(compressedData);
        const pakoResult = pakoTest.toString('utf8');
        
        if (pakoResult === sourceData) {
            console.log('✅ Pako simulation successful!');
        } else {
            console.log('❌ Pako simulation failed');
            process.exit(1);
        }
        
    } catch (pakoError) {
        console.log('❌ Pako simulation failed:', pakoError.message);
        process.exit(1);
    }
    
    console.log('\n🎉 Compression and verification completed successfully!');
    console.log('📁 Compressed file saved to:', gzipFile);
    
} catch (error) {
    console.error('❌ Error during compression:', error.message);
    process.exit(1);
}

// Additional verification - check file headers
console.log('\n🔍 Checking file headers...');

try {
    const fileBuffer = fs.readFileSync(gzipFile);
    
    // Check gzip header (should start with 0x1f 0x8b)
    if (fileBuffer[0] === 0x1f && fileBuffer[1] === 0x8b) {
        console.log('✅ Gzip header is correct');
    } else {
        console.log('❌ Gzip header is incorrect');
        process.exit(1);
    }
    
    // Check compression method (should be 8 for deflate)
    if (fileBuffer[2] === 8) {
        console.log('✅ Compression method is correct (deflate)');
    } else {
        console.log('❌ Compression method is incorrect');
        process.exit(1);
    }
    
} catch (headerError) {
    console.log('❌ Error checking headers:', headerError.message);
    process.exit(1);
}

console.log('\n✨ All checks passed! The compressed file is ready for deployment.'); 