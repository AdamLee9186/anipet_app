// dataLoader.js - Utility to load and parse CSV data
import Papa from 'papaparse';

// Function to load and parse CSV data
export const loadCSVData = async () => {
  try {
    const response = await fetch('/anipet_products.csv');
    const csvText = await response.text();
    
    // Parse CSV with Papa Parse
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      encoding: 'utf-8',
      transform: (value) => value ? value.trim() : '',
      transformHeader: (header) => header ? header.trim().replace(/^"|"$/g, '') : ''
    });

    if (result.errors.length > 0) {
      console.warn('CSV parsing warnings:', result.errors.slice(0, 5)); // Show only first 5 errors
    }
    
    // Debug: Log the headers to see what we're working with
    if (result.data.length > 0) {
      console.log('CSV Headers:', Object.keys(result.data[0]));
      console.log('Sample row:', result.data[0]);
      
      // Look for the specific problematic product
      const problematicProduct = result.data.find(row => 
        row['תאור פריט'] && row['תאור פריט'].includes('אדוונס לכלב סלמון 3 קילו')
      );
      if (problematicProduct) {
        console.log('Found problematic product in CSV:', problematicProduct);
        console.log('SKU value:', problematicProduct['מק"ט']);
        console.log('SKU value (quoted):', problematicProduct['"מק""ט"']);
        console.log('Barcode value:', problematicProduct['ברקוד']);
      }
    }

    // Transform the data to match our app's expected format
    const transformedData = result.data
      .filter(row => row && typeof row === 'object' && Object.keys(row).length > 0) // Remove empty rows
      .map((row, index) => {
        // Safety check to ensure row is a valid object
        if (!row || typeof row !== 'object') {
          console.warn('Invalid row in CSV data:', row);
          return null;
        }
        // Extract weight and unit from productName (תאור פריט)
        const name = row['תאור פריט'] || row['Product Name'] || row['productName'] || '';
        let weight, weightUnit = '';
        if (name) {
          // Match ק"ג or קילו
          const matchKg = name.match(/(\d+(?:\.\d+)?)\s*(?:ק"?ג|קילו)/);
          if (matchKg) {
            weight = parseFloat(matchKg[1]);
            weightUnit = 'ק"ג';
          } else {
            // Match גרם
            const matchGram = name.match(/(\d+(?:\.\d+)?)\s*גרם/);
            if (matchGram) {
              weight = parseFloat(matchGram[1]); // Keep in grams, don't divide by 1000
              weightUnit = 'גרם';
            }
          }
        }
        // Map CSV columns to our app's data structure using actual Hebrew column names
        return {
          sku: row['מק"ט'] || row['מק""ט'] || row['SKU'] || row['sku'] || `SKU_${index}`,
          barcode: row['ברקוד'] || row['Barcode'] || row['barcode'] || '',
          productName: name || 'מוצר ללא שם',
          salePrice: parseFloat(row['מחיר מכירה']) || parseFloat(row['Sale Price']) || parseFloat(row['salePrice']) || 0,
          brand: row['שם מותג'] || row['Brand'] || row['brand'] || '',
          animalType: row['קבוצת על'] || row['Animal Type'] || row['animalType'] || '',
          lifeStage: row['גיל (גור בוגר וכו\')'] || row['Life Stage'] || row['lifeStage'] || '',
          internalCategory: row['קטגוריה פנימית'] || row['Internal Category'] || row['internalCategory'] || '',
          mainIngredient: row['ממרכיב עיקרי'] || row['Main Ingredient'] || row['mainIngredient'] || '',
          medicalIssue: row['בעיה רפואית'] || row['Medical Issue'] || row['medicalIssue'] || '',
          qualityLevel: row['רמה / איכות'] || row['Quality Level'] || row['qualityLevel'] || '',
          supplierName: row['שם ספק ראשי'] || row['Supplier Name'] || row['supplierName'] || '',
          weight: typeof weight === 'number' ? weight : undefined,
          weightUnit: weightUnit
        };
      })
      .filter(product => 
        product && 
        typeof product === 'object' &&
        product.productName && 
        product.productName !== 'מוצר ללא שם' && 
        product.salePrice > 0 && 
        product.sku
      ); // Remove products without valid data

    console.log(`Loaded ${transformedData.length} products from CSV`);
    console.log('Sample product:', transformedData[0]);
    
    // Look for the specific problematic product in transformed data
    const transformedProblematicProduct = transformedData.find(product => 
      product.productName && product.productName.includes('אדוונס לכלב סלמון 3 קילו')
    );
    if (transformedProblematicProduct) {
      console.log('Found problematic product in transformed data:', transformedProblematicProduct);
      console.log('Transformed SKU:', transformedProblematicProduct.sku);
      console.log('Transformed Barcode:', transformedProblematicProduct.barcode);
    }
    

    
    return transformedData;
  } catch (error) {
    console.error('Error loading CSV data:', error);
    // Return empty array if loading fails
    return [];
  }
};

// Function to get unique values for filter options
export const getUniqueValues = (data, field) => {
  if (!Array.isArray(data)) {
    console.warn('getUniqueValues: data is not an array:', data);
    return [];
  }
  return [...new Set(data.map(item => {
    if (!item || typeof item !== 'object') {
      console.warn('getUniqueValues: invalid item:', item);
      return null;
    }
    return item[field];
  }).filter(Boolean))];
};

// Function to calculate min/max values for ranges
export const getRangeValues = (data, field) => {
  if (!Array.isArray(data)) {
    console.warn('getRangeValues: data is not an array:', data);
    return { min: 0, max: 100 };
  }
  const values = data.map(item => {
    if (!item || typeof item !== 'object') {
      console.warn('getRangeValues: invalid item:', item);
      return null;
    }
    return item[field];
  }).filter(val => typeof val === 'number' && !isNaN(val));
  if (values.length === 0) return { min: 0, max: 100 };
  
  return {
    min: Math.floor(Math.min(...values) * 0.9),
    max: Math.ceil(Math.max(...values) * 1.1)
  };
}; 