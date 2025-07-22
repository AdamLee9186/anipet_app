// Enhanced Web Worker for data loading, filtering, and pagination
let allProducts = [];
let fuseIndex = null;

// Load required libraries at the start
try {
  importScripts('https://cdn.jsdelivr.net/npm/fuse.js@7.1.0/dist/fuse.min.js');
  importScripts('https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js');
  // console.log('[Worker] Successfully loaded Fuse.js and pako libraries');
} catch (error) {
      // console.warn('[Worker] Failed to load libraries:', error);
}

// Fuse.js configuration for search - optimized for autocomplete
const fuseConfig = {
  keys: [
    'productName',
    'brand',
    'originalWeight',
    'animalType',
    'internalCategory',
    'mainIngredient',
    'sku',
    'barcode'
  ],
  threshold: 0.4, // More lenient threshold for better Hebrew text matching
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 2,
  ignoreLocation: true, // Better for autocomplete
  useExtendedSearch: true // ← זה חובה לחיפוש לפי מילים נפרדות
};

// Progress reporting function
function reportProgress(stage, current, total) {
  self.postMessage({
    type: 'progress',
    data: {
      stage,
      current,
      total,
      percentage: Math.round((current / total) * 100)
    }
  });
}

// Optimized weight parsing with caching
const weightCache = new Map();
function parseWeight(weightText, productName = '') {
  const cacheKey = `${weightText}|${productName}`;
  if (weightCache.has(cacheKey)) {
    return weightCache.get(cacheKey);
  }

  let weight = 0;
  let weightUnit = '';
  
  if (weightText) {
    // Try to extract weight and unit from various formats
    const kgMatch = weightText.match(/(\d+(?:\.\d+)?)\s*ק"?ג/);
    const gramMatch = weightText.match(/(\d+(?:\.\d+)?)\s*גרם/);
    const literMatch = weightText.match(/(\d+(?:\.\d+)?)\s*ליטר/);
    const mgMatch = weightText.match(/(\d+(?:\.\d+)?)\s*מ"?ג/);
    
    if (kgMatch) {
      weight = parseFloat(kgMatch[1]);
      weightUnit = 'ק"ג';
    } else if (gramMatch) {
      weight = parseFloat(gramMatch[1]);
      weightUnit = 'גרם';
    } else if (literMatch) {
      weight = parseFloat(literMatch[1]);
      weightUnit = 'ליטר';
    } else if (mgMatch) {
      weight = parseFloat(mgMatch[1]);
      weightUnit = 'מ"ג';
    } else {
      // Try to parse as pure number (assume grams if small, kg if large)
      const numWeight = parseFloat(weightText);
      if (!isNaN(numWeight)) {
        weight = numWeight;
        weightUnit = numWeight < 10 ? 'ק"ג' : 'גרם';
      }
    }
  }
  
  // Fallback: extract weight from product name if not found in weight column
  if (!weight && productName) {
    // Match various units in product name
    let matchKg = productName.match(/(\d+(?:\.\d+)?)\s*(?:ק"?ג|קילו)/);
    let matchGram = productName.match(/(\d+(?:\.\d+)?)\s*גרם/);
    let matchLiter = productName.match(/(\d+(?:\.\d+)?)\s*ליטר/);
    let matchMg = productName.match(/(\d+(?:\.\d+)?)\s*מ"?ג/);
    let matchMl = productName.match(/(\d+(?:\.\d+)?)\s*מ"?ל/);
    
    if (matchKg) {
      weight = parseFloat(matchKg[1]);
      weightUnit = 'ק"ג';
    } else if (matchGram) {
      weight = parseFloat(matchGram[1]);
      weightUnit = 'גרם';
    } else if (matchLiter) {
      weight = parseFloat(matchLiter[1]);
      weightUnit = 'ליטר';
    } else if (matchMg) {
      weight = parseFloat(matchMg[1]);
      weightUnit = 'מ"ג';
    } else if (matchMl) {
      weight = parseFloat(matchMl[1]);
      weightUnit = 'ml';
    }
  }

  const result = { weight, weightUnit };
  weightCache.set(cacheKey, result);
  return result;
}

// Filter products based on criteria
function filterProducts(products, filters, searchQuery, selectedProduct) {
  let filtered = [...products];
  
  // Apply search query if provided
  if (searchQuery && searchQuery.trim()) {
            // console.log('[Worker][DEBUG] Original searchQuery:', searchQuery);
    
    if (fuseIndex) {
      const query = searchQuery.toLowerCase().trim();
              // console.log('[Worker][DEBUG] Processed query:', query);
      
      // כאן הפיצול הנכון
      const queryWords = query.split(/\s+/).filter(Boolean);
              // console.log('[Worker][DEBUG] queryWords:', queryWords);

      const fuseQuery =
        queryWords.length === 1
          ? {
              $or: [
                { productName: queryWords[0] },
                { brand: queryWords[0] }
              ]
            }
          : {
              $and: queryWords.map(word => ({
                $or: [
                  { productName: word },
                  { brand: word }
                ]
              }))
            };

              // console.log('[Worker][DEBUG] fuseQuery:', JSON.stringify(fuseQuery));

      const searchResults = fuseIndex.search(fuseQuery);

              // console.log('[Worker][DEBUG] Number of results:', searchResults.length);
        // if (searchResults.length > 0) {
        //   console.log('[Worker][DEBUG] Top result:', searchResults[0].item.productName);
        // }

      filtered = searchResults.map(result => result.item);
    } else {
      // Fallback to simple text search if Fuse.js is not available
              // console.log('[Worker][DEBUG] Using fallback search (no Fuse.js)');
      const query = searchQuery.toLowerCase();
      const queryWords = query.split(/\s+/).filter(Boolean);
              // console.log('[Worker][DEBUG] Fallback queryWords:', queryWords);
      
      filtered = filtered.filter(product => 
        queryWords.every(word =>
          product.productName?.toLowerCase().includes(word) ||
          product.brand?.toLowerCase().includes(word) ||
          product.originalWeight?.toLowerCase().includes(word) ||
          product.sku?.toLowerCase().includes(word) ||
          product.barcode?.toLowerCase().includes(word)
        )
      );
              // console.log('[Worker][DEBUG] Fallback results count:', filtered.length);
    }
  }
  
  // Apply filters
  if (filters.brand && filters.brand.length > 0) {
    filtered = filtered.filter(product => filters.brand.includes(product.brand));
  }
  
  if (filters.animalType && filters.animalType.length > 0) {
    filtered = filtered.filter(product => filters.animalType.includes(product.animalType));
  }
  
  if (filters.lifeStage && filters.lifeStage.length > 0) {
    filtered = filtered.filter(product => filters.lifeStage.includes(product.lifeStage));
  }
  
  if (filters.internalCategory && filters.internalCategory.length > 0) {
    filtered = filtered.filter(product => filters.internalCategory.includes(product.internalCategory));
  }
  
  if (filters.mainIngredient && filters.mainIngredient.length > 0) {
    filtered = filtered.filter(product => filters.mainIngredient.includes(product.mainIngredient));
  }
  
  if (filters.medicalIssue && filters.medicalIssue.length > 0) {
    filtered = filtered.filter(product => filters.medicalIssue.includes(product.medicalIssue));
  }
  
  if (filters.qualityLevel && filters.qualityLevel.length > 0) {
    filtered = filtered.filter(product => filters.qualityLevel.includes(product.qualityLevel));
  }
  
  if (filters.supplierName && filters.supplierName.length > 0) {
    filtered = filtered.filter(product => filters.supplierName.includes(product.supplierName));
  }
  
  // Apply price range filter
  if (filters.priceRange && filters.priceRange.length === 2) {
    const [minPrice, maxPrice] = filters.priceRange;
    filtered = filtered.filter(product => 
      product.salePrice >= minPrice && product.salePrice <= maxPrice
    );
  }
  
  // Apply weight range filter
  if (filters.weightRange && filters.weightRange.length === 2) {
    const [minWeight, maxWeight] = filters.weightRange;
    filtered = filtered.filter(product => 
      product.weight >= minWeight && product.weight <= maxWeight
    );
  }
  
  // Calculate similarity scores if a product is selected
  if (selectedProduct) {
    filtered = filtered.map(product => ({
      ...product,
      similarityScore: calculateSimilarity(product, selectedProduct)
    }));
  }
  
      // console.log('[Worker][DEBUG] Final filtered results count:', filtered.length);
  return filtered;
}

// Calculate similarity between two products (legacy function - now handled in main app)
function calculateSimilarity(product1, product2) {
  // This function is kept for compatibility but similarity is now calculated in the main app
  return 0;
}

// Sort products
function sortProducts(products, sortBy, selectedProduct = null) {
  const sorted = [...products];
  
  switch (sortBy) {
    case 'similarity':
      sorted.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));
      break;
    case 'price-low-high':
      sorted.sort((a, b) => (a.salePrice || 0) - (b.salePrice || 0));
      break;
    case 'price-high-low':
      sorted.sort((a, b) => (b.salePrice || 0) - (a.salePrice || 0));
      break;
    case 'name-a-z':
      sorted.sort((a, b) => (a.productName || '').toLowerCase().localeCompare((b.productName || '').toLowerCase(), 'he'));
      break;
    case 'name-z-a':
      sorted.sort((a, b) => (b.productName || '').toLowerCase().localeCompare((a.productName || '').toLowerCase(), 'he'));
      break;
    default:
      // Default to similarity sorting
      sorted.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));
  }
  
  // Always move the source product (מוצר מקור) to the first position
  if (selectedProduct && sorted.length > 0) {
    const sourceProductIndex = sorted.findIndex(product => 
      (product.sku && selectedProduct.sku && String(product.sku).trim() === String(selectedProduct.sku).trim()) ||
      (product.barcode && selectedProduct.barcode && String(product.barcode).trim() === String(selectedProduct.barcode).trim())
    );
    
    if (sourceProductIndex > 0) {
      // Remove the source product from its current position and add it to the beginning
      const sourceProduct = sorted.splice(sourceProductIndex, 1)[0];
      sorted.unshift(sourceProduct);
    }
  }
  
  return sorted;
}

// Get unique values for filter options
function getUniqueValues(products, field) {
  const values = products
    .map(product => product[field])
    .filter(value => value && value.trim() !== '');
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'he'));
}

// Get range values for numeric fields
function getRangeValues(products, field) {
  const values = products
    .map(product => product[field])
    .filter(value => typeof value === 'number' && !isNaN(value));
  
  if (values.length === 0) return { min: 0, max: 100 };
  
  return {
    min: Math.floor(Math.min(...values)),
    max: Math.ceil(Math.max(...values))
  };
}

// Transform raw data to product objects with progress reporting
function transformProducts(jsonData) {
  const batchSize = 1000; // Process in batches to avoid blocking
  const totalItems = jsonData.length;
  const products = [];
  
  for (let i = 0; i < totalItems; i += batchSize) {
    const batch = jsonData.slice(i, i + batchSize);
    
    batch.forEach((row, batchIndex) => {
      const index = i + batchIndex;
      const { weight, weightUnit } = parseWeight(row['משקל'], row['תאור פריט']);
      
      products.push({
        id: index,
        sku: row['מק"ט'] || row['מק""ט'] || row['קוד פריט'] || '',
        barcode: row['ברקוד'] || '',
        productName: row['תאור פריט'] || '',
        weight: weight,
        weightUnit: weightUnit,
        originalWeight: row['משקל'],
        salePrice: parseFloat(row['מחיר מכירה'] || row['מחיר']) || 0,
        brand: row['שם מותג'] || row['מותג'] || '',
        animalType: row['קבוצת על'] || row['קבוצה'] || '',
        lifeStage: row['גיל (גור בוגר וכו\')'] || row['גיל'] || '',
        internalCategory: row['קטגוריה פנימית'] || row['קטגוריה'] || '',
        mainIngredient: row['ממרכיב עיקרי'] || row['מרכיב'] || '',
        medicalIssue: row['בעיה רפואית'] || '',
        qualityLevel: row['רמה / איכות'] || row['איכות'] || '',
        supplierName: row['שם ספק ראשי'] || row['ספק'] || '',
        participatesInVariety: row['משתתף במגוון'] || '',
        imageUrl: row['Image URL'] || '',
        productUrl: row['Product URL'] || ''
      });
      
      // Debug log for פרופלאן products (commented out to reduce console spam)
      // if (row['תאור פריט'] && row['תאור פריט'].includes('פרופלאן STERILISED פחית לחתול מוס דגים 85 גרם')) {
      //   console.log('[Worker] פרופלאן product transformed:', {
      //     barcode: row['ברקוד'],
      //     internalCategory: row['קטגוריה פנימית'] || row['קטגוריה'],
      //     mainIngredient: row['ממרכיב עיקרי'] || row['מרכיב'],
      //     originalInternalCategory: row['קטגוריה פנימית'],
      //     originalCategory: row['קטגוריה']
      //   });
      // }
    });
    
    // Report progress every batch
    if (i % (batchSize * 5) === 0) {
      reportProgress('Processing data', i + batch.length, totalItems);
    }
  }
  
  return products;
}

// Message handler
self.onmessage = function(e) {
  const { type, data } = e.data;
  console.log('[Worker] Received message:', type);
  console.log('[Worker] Message data:', data);
  console.log('[Worker] cachedIndex in data:', data?.cachedIndex ? 'YES' : 'NO');
  
  switch (type) {
    case 'loadData':
      reportProgress('Loading data file', 0, 100);
      
      // Check if we have a cached index
      if (data && data.cachedIndex) {
        console.log('🔍 Using cached index from IndexedDB');
        // We'll set the cached index after loading the data
      }
      
      // Load data in priority order: .min.json.gz -> .json.br -> .json.gz -> .min.json (fallback)
      // console.log('[Worker] Starting data loading with priority order...');
      
      // Helper function to process loaded data
      async function processLoadedData(jsonData, source) {
        reportProgress('Transforming data', 50, 100);
        console.log(`[Worker] Loading from ${source}`);
        console.log(`[Worker] JSON data length:`, jsonData.length);
        allProducts = transformProducts(jsonData);
        console.log(`[Worker] Transformed products:`, allProducts.length);
        
        // Check for duplicate barcodes
        const barcodeCounts = {};
        allProducts.forEach(product => {
          if (product.barcode) {
            barcodeCounts[product.barcode] = (barcodeCounts[product.barcode] || 0) + 1;
          }
        });
        
        // Check for duplicates (silently, without logging)
        Object.entries(barcodeCounts).forEach(([barcode, count]) => {
          if (count > 1) {
            // Duplicates found but not logging to avoid console spam
          }
        });
        
        reportProgress('Creating search index', 75, 100);
        
        // Create Fuse index and send it back to main thread for caching
        const createIndex = async () => {
          try {
            // Check if we should use cached index
            console.log('🔍 Checking for cached index, data:', data);
            console.log('🔍 useCachedIndex flag:', data?.useCachedIndex ? 'YES' : 'NO');
            
            if (data && data.useCachedIndex) {
              // Load cached index directly from IndexedDB
              try {
                console.log('🔍 Loading cached index directly from IndexedDB...');
                // Note: Workers can't access IndexedDB directly, so we'll need a different approach
                // For now, let's just indicate that we should use cached index
                console.log('✅ Should use cached index, but need to load it from main thread');
                // We'll handle this in the main thread
              } catch (error) {
                console.warn('Failed to load cached index, will build new one:', error);
              }
            }
            
            if (data && data.cachedIndex) {
              try {
                console.log('🔍 Attempting to use cached index...');
                console.log('🔍 Cached index structure:', Object.keys(data.cachedIndex));
                
                // Check if the cached index has the right structure
                if (data.cachedIndex.records && data.cachedIndex.keys) {
                  // Use Fuse.parseIndex to properly reconstruct the index
                  fuseIndex = new Fuse(allProducts, fuseConfig, Fuse.parseIndex(data.cachedIndex));
                  console.log('✅ Successfully using cached Fuse index from IndexedDB');
                  console.log('✅ No need to build new index - using existing one');
                  
                  // Send the cached index back to main thread for re-caching
                  self.postMessage({
                    type: 'indexReady',
                    payload: data.cachedIndex,
                    skipSave: true
                  });
                  
                  // Skip the rest of the index creation process
                  return;
                } else {
                  console.warn('Cached index has invalid structure, will build new one');
                }
              } catch (error) {
                console.warn('Failed to parse cached index, creating new one:', error);
                console.warn('Error details:', error.message);
              }
            
            // Check if we should skip index rebuild
            if (data && data.skipIndexRebuild) {
              console.log('✅ Skipping index rebuild - using existing cached index');
              // Don't create a new index, just send the products data
              self.postMessage({
                type: 'dataLoaded',
                data: allProducts
              });
              return;
            }
            
            // Always create a new index since we have the products data
            console.log('🚀 No cached index available, building new Fuse index from products data');
              fuseIndex = new Fuse(allProducts, fuseConfig);
              
              // Get the index data and extract only serializable parts
              const indexData = fuseIndex.getIndex();
              const serializableIndex = {
                records: indexData.records,
                keys: indexData.keys,
                docs: indexData.docs
              };
              
              console.log('📤 Sending new index to main thread');
              console.log('📊 Index data size:', JSON.stringify(serializableIndex).length, 'bytes');
              console.log('📊 Index data type:', typeof serializableIndex);
              console.log('📊 Index data keys:', Object.keys(serializableIndex || {}));
              
              console.log('📤 Sending serializable index to main thread');
              console.log('📊 Serializable index size:', JSON.stringify(serializableIndex).length, 'bytes');
              
              try {
                self.postMessage({
                  type: 'indexReady',
                  payload: serializableIndex,
                  skipSave: false
                });
                console.log('✅ New index message sent to main thread');
              } catch (error) {
                console.error('❌ Failed to send index via postMessage:', error);
                // Try with even more minimal data
                const minimalIndex = {
                  records: indexData.records,
                  keys: indexData.keys
                };
                self.postMessage({
                  type: 'indexReady',
                  payload: minimalIndex,
                  skipSave: false
                });
                console.log('✅ Minimal index message sent to main thread');
              }
            }
          } catch (error) {
            console.warn('Fuse.js failed to create index:', error);
            console.warn('Error details:', error.message, error.stack);
            fuseIndex = null;
          }
        };
        
        // Wait for index creation to complete before continuing
        await createIndex();
        
        reportProgress('Calculating filter options', 90, 100);
        // Calculate filter options
        const filterOptions = {
          brands: getUniqueValues(allProducts, 'brand'),
          animalTypes: getUniqueValues(allProducts, 'animalType'),
          lifeStages: getUniqueValues(allProducts, 'lifeStage'),
          internalCategories: getUniqueValues(allProducts, 'internalCategory'),
          mainIngredients: getUniqueValues(allProducts, 'mainIngredient'),
          medicalIssues: getUniqueValues(allProducts, 'medicalIssue'),
          qualityLevels: getUniqueValues(allProducts, 'qualityLevel'),
          supplierNames: getUniqueValues(allProducts, 'supplierName')
        };
        
        const priceRange = getRangeValues(allProducts, 'salePrice');
        const weightRange = getRangeValues(allProducts, 'weight');
        
        reportProgress('Loading complete', 100, 100);
        console.log('[Worker] Sending dataLoaded message with', allProducts.length, 'products');
        self.postMessage({
          type: 'dataLoaded',
          data: {
            products: allProducts,
            filterOptions,
            priceRange,
            weightRange,
            totalCount: allProducts.length
          }
        });
      }
      
      // Try 1: .min.json.gz (highest priority)
      console.log('[Worker] Attempting to load .min.json.gz file...');
      fetch('/data/anipet_products_optimized.min.json.gz')
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          // console.log('[Worker] Successfully fetched .min.json.gz file, decompressing...');
          reportProgress('Decompressing data', 25, 100);
          return response.arrayBuffer();
        })
        .then(arrayBuffer => {
          if (typeof pako !== 'undefined') {
            // console.log('[Worker] Decompressing .min.json.gz with pako...');
            const decompressed = pako.inflate(arrayBuffer, { to: 'string' });
            return JSON.parse(decompressed);
          } else {
            throw new Error('pako library not available for decompression');
          }
        })
        .then(jsonData => processLoadedData(jsonData, '.min.json.gz file'))
        .catch(error => {
          console.warn('Failed to load .min.json.gz, trying .json.br:', error);
          
          // Try 2: .json.br
          // console.log('[Worker] Attempting to load .json.br file...');
          return fetch('/data/anipet_products_optimized.json.br')
            .then(response => {
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              // console.log('[Worker] Successfully fetched .json.br file, decompressing...');
              reportProgress('Decompressing data', 25, 100);
              return response.arrayBuffer();
            })
            .then(arrayBuffer => {
              if (typeof pako !== 'undefined') {
                // console.log('[Worker] Decompressing .json.br with pako...');
                const decompressed = pako.inflate(arrayBuffer, { to: 'string' });
                return JSON.parse(decompressed);
              } else {
                throw new Error('pako library not available for brotli decompression');
              }
            })
            .then(jsonData => processLoadedData(jsonData, '.json.br file'));
        })
        .catch(error => {
          console.warn('Failed to load .json.br, trying .json.gz:', error);
          
          // Try 3: .json.gz
          // console.log('[Worker] Attempting to load .json.gz file...');
          return fetch('/data/anipet_products_optimized.json.gz')
            .then(response => {
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              // console.log('[Worker] Successfully fetched .json.gz file, decompressing...');
              reportProgress('Decompressing data', 25, 100);
              return response.arrayBuffer();
            })
            .then(arrayBuffer => {
              if (typeof pako !== 'undefined') {
                // console.log('[Worker] Decompressing .json.gz with pako...');
                const decompressed = pako.inflate(arrayBuffer, { to: 'string' });
                return JSON.parse(decompressed);
              } else {
                throw new Error('pako library not available for gzip decompression');
              }
            })
            .then(jsonData => processLoadedData(jsonData, '.json.gz file'));
        })
        .catch(error => {
          console.warn('Failed to load compressed files, trying fallback .min.json:', error);
          
          // Try 4: .min.json (fallback)
          // console.log('[Worker] Attempting to load fallback .min.json file...');
          return fetch('/data/anipet_products_optimized.min.json')
            .then(response => {
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              reportProgress('Parsing JSON data', 25, 100);
              return response.json();
            })
            .then(jsonData => processLoadedData(jsonData, 'fallback .min.json file'));
        })
        .catch(error => {
          console.error('All data loading attempts failed:', error);
          console.error('Error details:', error);
          self.postMessage({
            type: 'error',
            error: error.message
          });
        });
      break;
      
    case 'filterProducts':
      const { filters, searchQuery, selectedProduct, sortBy, page = 1, pageSize = 50 } = data;
      
      // Filter products
      let filtered = filterProducts(allProducts, filters, searchQuery, selectedProduct);
      
      // Sort products
      filtered = sortProducts(filtered, sortBy, selectedProduct);
      
      // Calculate pagination
      const totalCount = filtered.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedProducts = filtered.slice(startIndex, endIndex);
      
      self.postMessage({
        type: 'filteredProducts',
        data: {
          products: paginatedProducts,
          totalCount,
          currentPage: page,
          totalPages: Math.ceil(totalCount / pageSize),
          hasMore: endIndex < totalCount
        }
      });
      break;
      
    case 'getFilterOptions':
      if (allProducts.length === 0) {
        self.postMessage({
          type: 'error',
          error: 'No data loaded'
        });
        return;
      }
      
      const options = {
        brands: getUniqueValues(allProducts, 'brand'),
        animalTypes: getUniqueValues(allProducts, 'animalType'),
        lifeStages: getUniqueValues(allProducts, 'lifeStage'),
        internalCategories: getUniqueValues(allProducts, 'internalCategory'),
        mainIngredients: getUniqueValues(allProducts, 'mainIngredient'),
        medicalIssues: getUniqueValues(allProducts, 'medicalIssue'),
        qualityLevels: getUniqueValues(allProducts, 'qualityLevel'),
        supplierNames: getUniqueValues(allProducts, 'supplierName')
      };
      
      self.postMessage({
        type: 'filterOptions',
        data: options
      });
      break;
      
    case 'setCachedIndex':
      // Set cached index from main thread
      if (data.indexData) {
        try {
          // Use Fuse.parseIndex to properly reconstruct the index
          fuseIndex = new Fuse(allProducts, fuseConfig, Fuse.parseIndex(data.indexData));
          console.log('🔍 Using cached Fuse index from IndexedDB');
        } catch (error) {
          console.warn('Failed to use cached index, creating new one:', error);
          fuseIndex = new Fuse(allProducts, fuseConfig);
        }
      }
      break;
  }
}; 