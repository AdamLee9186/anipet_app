const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// File paths
const csvFilePath = path.join(__dirname, '../public/data/anipet_master_catalog_v1.csv');
const jsonFiles = [
  'public/data/anipet_products_optimized.json',
  'public/data/anipet_products_optimized.min.json'
];

// Compression libraries
const zlib = require('zlib');
const brotli = require('brotli');

async function readCSVData() {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        console.log(`📊 Loaded ${results.length} records from CSV`);
        resolve(results);
      })
      .on('error', reject);
  });
}

function createUrlMapping(csvData) {
  const urlMapping = new Map();
  
  csvData.forEach(row => {
    // Get SKUs from CSV - split by comma and trim each value
    const skuValue = row['SKUs'] || '';
    if (skuValue && (row['Image URL'] || row['Product URL'])) {
      // Split by comma and create a mapping for each individual SKU
      const skuList = skuValue.split(',').map(sku => sku.trim()).filter(sku => sku);
      
      skuList.forEach(sku => {
        urlMapping.set(sku, {
          imageUrl: row['Image URL'] || '',
          productUrl: row['Product URL'] || ''
        });
      });
    }
  });
  
  console.log(`🔗 Created URL mapping for ${urlMapping.size} individual SKUs`);
  
  // Show some sample mappings for debugging
  let sampleCount = 0;
  for (const [key, value] of urlMapping.entries()) {
    if (sampleCount < 5) {
      console.log(`  Sample mapping: SKU "${key}" -> Image: "${value.imageUrl.substring(0, 50)}...", Product: "${value.productUrl.substring(0, 50)}..."`);
      sampleCount++;
    }
  }
  
  return urlMapping;
}

function updateJsonFile(filePath, urlMapping) {
  console.log(`\n📝 Processing: ${filePath}`);
  
  try {
    // Read the JSON file
    const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let updatedCount = 0;
    let totalCount = 0;
    let matchedCount = 0;
    
    // Update each product
    jsonData.forEach(product => {
      totalCount++;
      
      // Try to match using קוד פריט (Product Code) or ברקוד (Barcode)
      const productCode = product['קוד פריט'] ? product['קוד פריט'].toString().trim() : '';
      const barcode = product['ברקוד'] ? product['ברקוד'].toString().trim() : '';
      
      let mapping = null;
      if (productCode && urlMapping.has(productCode)) {
        mapping = urlMapping.get(productCode);
        matchedCount++;
      } else if (barcode && urlMapping.has(barcode)) {
        mapping = urlMapping.get(barcode);
        matchedCount++;
      }
      
      if (mapping) {
        const oldImageUrl = product['Image URL'] || '';
        const oldProductUrl = product['Product URL'] || '';
        
        if (mapping.imageUrl && mapping.imageUrl !== oldImageUrl) {
          product['Image URL'] = mapping.imageUrl;
          updatedCount++;
        }
        
        if (mapping.productUrl && mapping.productUrl !== oldProductUrl) {
          product['Product URL'] = mapping.productUrl;
          updatedCount++;
        }
      }
    });
    
    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
    console.log(`✅ Updated ${updatedCount} URL fields out of ${totalCount} products (${matchedCount} matched)`);
    
    return jsonData;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return null;
  }
}

function compressFile(filePath, compressionType) {
  const outputPath = filePath + (compressionType === 'gzip' ? '.gz' : '.br');
  const data = fs.readFileSync(filePath);
  
  try {
    let compressedData;
    if (compressionType === 'gzip') {
      compressedData = zlib.gzipSync(data);
    } else if (compressionType === 'brotli') {
      compressedData = brotli.compress(data);
    }
    
    fs.writeFileSync(outputPath, compressedData);
    console.log(`✅ Created ${outputPath}`);
  } catch (error) {
    console.error(`❌ Error creating ${outputPath}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Starting URL update process...');
  
  try {
    // Read CSV data
    console.log('📖 Reading CSV file...');
    const csvData = await readCSVData();
    
    // Create URL mapping
    console.log('🔗 Creating URL mapping...');
    const urlMapping = createUrlMapping(csvData);
    
    // Update JSON files
    for (const filePath of jsonFiles) {
      const updatedData = updateJsonFile(filePath, urlMapping);
      
      if (updatedData) {
        // Create compressed versions
        console.log('🗜️ Creating compressed versions...');
        compressFile(filePath, 'gzip');
        
        // Only create brotli for the main file (not minified)
        if (!filePath.includes('.min.')) {
          compressFile(filePath, 'brotli');
        }
      }
    }
    
    console.log('\n🎉 URL update process completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in main process:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main, updateJsonFile, createUrlMapping }; 