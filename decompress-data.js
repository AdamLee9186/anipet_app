const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

console.log('🔄 Decompressing data files...\n');

const dataDir = path.join(__dirname, 'public', 'data');

// Check if the compressed file exists
const compressedFile = path.join(dataDir, 'anipet_products_optimized.min.json.gz');
const outputFile = path.join(dataDir, 'anipet_products_optimized.min.json');

if (!fs.existsSync(compressedFile)) {
    console.error('❌ Compressed file not found:', compressedFile);
    process.exit(1);
}

if (fs.existsSync(outputFile)) {
    console.log('✅ Decompressed file already exists:', outputFile);
    console.log('   Skipping decompression...\n');
} else {
    try {
        console.log('📦 Decompressing anipet_products_optimized.min.json.gz...');
        
        const compressedData = fs.readFileSync(compressedFile);
        const decompressedData = zlib.gunzipSync(compressedData);
        
        fs.writeFileSync(outputFile, decompressedData);
        
        const originalSize = compressedData.length;
        const decompressedSize = decompressedData.length;
        const compressionRatio = ((originalSize - decompressedSize) / originalSize * 100).toFixed(1);
        
        console.log('✅ Decompression completed successfully!');
        console.log(`   Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Decompressed size: ${(decompressedSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Compression ratio: ${compressionRatio}%\n`);
        
    } catch (error) {
        console.error('❌ Error during decompression:', error.message);
        process.exit(1);
    }
}

console.log('🎉 Data files are ready! You can now run the startup script.');
console.log('   Run: .\\start-app.ps1\n'); 