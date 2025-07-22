const express = require('express');
const fs = require('fs').promises; // Use promises for async file operations
const fsSync = require('fs'); // For synchronous operations like existsSync
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Load JSON data into memory
let products = [];

async function loadJSONData() {
  try {
    // Try to load compressed minified data first
    const compressedPath = path.join(__dirname, '../public/data/anipet_products_optimized.min.json.gz');
    const regularPath = path.join(__dirname, '../public/data/anipet_products_optimized.min.json');
    
    let rawProducts;
    
    if (fsSync.existsSync(compressedPath)) {
      try {
        const zlib = require('zlib');
        const compressedData = await fs.readFile(compressedPath);
        const decompressedData = zlib.gunzipSync(compressedData);
        rawProducts = JSON.parse(decompressedData.toString('utf8'));
        console.log('Loaded compressed JSON data');
      } catch (error) {
        console.warn('Failed to load compressed data, trying regular JSON:', error);
        const jsonData = await fs.readFile(regularPath, 'utf8');
        rawProducts = JSON.parse(jsonData);
      }
    } else {
      const jsonData = await fs.readFile(regularPath, 'utf8');
      rawProducts = JSON.parse(jsonData);
    }
    
    products = rawProducts.map(row => ({
      sku: row["מק\"ט"] || row["מק\"\"ט"] || row["קוד פריט"] || '',
      productName: row["תאור פריט"] || '',
      brand: row["שם מותג"] || row["מותג"] || '',
      animalType: row["קבוצת על"] || row["קבוצה"] || '',
      lifeStage: row["גיל (גור בוגר וכו')"] || row["גיל"] || '',
      internalCategory: row["קטגוריה פנימית"] || row["קטגוריה"] || '',
      mainIngredient: row["ממרכיב עיקרי"] || row["מרכיב"] || '',
      medicalIssue: row["בעיה רפואית"] || '',
      qualityLevel: row["רמה / איכות"] || row["איכות"] || '',
      supplierName: row["שם ספק ראשי"] || row["ספק"] || '',
      salePrice: parseFloat(row["מחיר מכירה"] || row["מחיר"]) || 0,
      weight: parseFloat(row["משקל"]) || 0,
      barcode: row["ברקוד"] || '',
      imageUrl: row["Image URL"] || '',
      productUrl: row["Product URL"] || ''
    }));
    
    console.log(`Loaded ${products.length} products from JSON`);
  } catch (error) {
    console.error('Error loading JSON:', error);
  }
}

// Load data on startup (async)
loadJSONData().catch(console.error);

// Search endpoint with pagination and optimization
app.get('/search', (req, res) => {
  const { q = '', filters = '', page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  try {
    let filteredProducts = [...products];
    
    // Apply search query with early termination
    if (q) {
      const searchTerm = q.toLowerCase();
      filteredProducts = filteredProducts.filter(product => 
        product.productName.toLowerCase().includes(searchTerm) ||
        product.brand.toLowerCase().includes(searchTerm) ||
        product.animalType.toLowerCase().includes(searchTerm) ||
        product.mainIngredient.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply filters (simple implementation)
    if (filters) {
      const filterPairs = filters.split('&&');
      filterPairs.forEach(filter => {
        const [field, value] = filter.split(':');
        if (field && value) {
          filteredProducts = filteredProducts.filter(product => 
            product[field] && product[field].toString().toLowerCase() === value.toLowerCase()
          );
        }
      });
    }
    
    // Sort by price
    filteredProducts.sort((a, b) => a.salePrice - b.salePrice);
    
    // Apply pagination
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
    
    res.json({
      products: paginatedProducts,
      total: filteredProducts.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(filteredProducts.length / limitNum)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Autocomplete endpoint with optimization
app.get('/autocomplete', (req, res) => {
  const { q = '' } = req.query;
  
  try {
    if (!q || q.length < 2) {
      return res.json([]);
    }
    
    const searchTerm = q.toLowerCase();
    const matches = [];
    
    // Use early termination to limit results
    for (const product of products) {
      if (matches.length >= 5) break; // Early termination
      
      if (product.productName.toLowerCase().includes(searchTerm) ||
          product.brand.toLowerCase().includes(searchTerm)) {
        matches.push(product);
      }
    }
    
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all products endpoint with pagination
app.get('/products', (req, res) => {
  const { page = 1, limit = 100 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  try {
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedProducts = products.slice(startIndex, endIndex);
    
    res.json({
      products: paginatedProducts,
      total: products.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(products.length / limitNum)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get unique values for filters with caching
let filterCache = null;
let filterCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

app.get('/filters', (req, res) => {
  try {
    const now = Date.now();
    
    // Return cached filters if still valid
    if (filterCache && (now - filterCacheTime) < CACHE_DURATION) {
      return res.json(filterCache);
    }
    
    const filters = {
      brand: [...new Set(products.map(p => p.brand).filter(Boolean))],
      animalType: [...new Set(products.map(p => p.animalType).filter(Boolean))],
      lifeStage: [...new Set(products.map(p => p.lifeStage).filter(Boolean))],
      internalCategory: [...new Set(products.map(p => p.internalCategory).filter(Boolean))],
      mainIngredient: [...new Set(products.map(p => p.mainIngredient).filter(Boolean))],
      medicalIssue: [...new Set(products.map(p => p.medicalIssue).filter(Boolean))],
      qualityLevel: [...new Set(products.map(p => p.qualityLevel).filter(Boolean))],
      supplierName: [...new Set(products.map(p => p.supplierName).filter(Boolean))],
    };
    
    // Cache the results
    filterCache = filters;
    filterCacheTime = now;
    
    res.json(filters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));