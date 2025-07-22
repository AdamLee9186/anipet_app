// App.js - Pet Store App with Hebrew Interface
// Connected to GitHub and Netlify for automatic deployments
// Updated for deployment with fixed data-worker.js
import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense, lazy } from 'react';
// import debounce from 'lodash.debounce'; // Removed unused import
import { Tag, Dog, Baby, Folder, Utensils, HeartCrack, Star, Filter, Package, DollarSign, Scale, X, Check, Link, Search, ArrowDownUp, LayoutGrid, StretchHorizontal } from 'lucide-react';
import {
  Box,
  Flex,
  Text,
  Button,
  Checkbox,
  VStack,

  Badge,
  Icon,
  Container,
  Heading,
  Image,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Select,
  Input,
  Tooltip,
  useToast,
  IconButton,
  Spinner,
  Switch,
  useBreakpointValue,
} from '@chakra-ui/react';
import SimilarityBreakdownBar from './components/SimilarityBreakdownBar';
import { TAG_META } from './components/SimilarityBreakdownBar';
import LoadingFallback from './components/LoadingFallback';
import copy from 'copy-to-clipboard';
import Masonry from 'react-masonry-css';
import { getFullSizeImageUrl } from './utils/getFullSizeImageUrl';
import { saveIndex, loadIndex, clearIndex } from './utils/indexedDb';
import { getUniqueValues } from './dataLoader';

// Import pako for decompression
const pako = window.pako;

// Lazy load heavy components
const Autocomplete = lazy(() => import('./components/Autocomplete'));
const DropdownRangeSlider = lazy(() => import('./components/DropdownRangeSlider'));
const OptimizedImage = lazy(() => import('./components/ImageWithPreview'));

// Helper function to normalize supplier names (trim and remove all spaces)
const normalizeSupplier = str => (str || '').trim().replace(/\s+/g, '');

// Helper function to parse weight from text
const parseWeight = (weightText, productName = '') => {
  if (!weightText) return { weight: 0, weightUnit: 'ק"ג' };
  
  // Remove common prefixes and clean up the text
  let cleaned = weightText.toString().replace(/^[^0-9]*/, '').trim();
  
  // Extract number and unit
  const match = cleaned.match(/^([0-9]+\.?[0-9]*)\s*([ק"גגרםmlק"לליטר])/);
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2];
    
    // Convert to kg for consistency
    if (unit === 'גרם' || unit === 'g') {
      return { weight: value / 1000, weightUnit: 'ק"ג' };
    } else if (unit === 'ml' || unit === 'ק"ל' || unit === 'ליטר') {
      return { weight: value, weightUnit: 'ליטר' };
    } else {
      return { weight: value, weightUnit: 'ק"ג' };
    }
  }
  
  // Try to extract just a number
  const numberMatch = cleaned.match(/^([0-9]+\.?[0-9]*)/);
  if (numberMatch) {
    const value = parseFloat(numberMatch[1]);
    // Assume grams if it's a small number, kg if it's larger
    if (value < 100) {
      return { weight: value / 1000, weightUnit: 'ק"ג' };
    } else {
      return { weight: value, weightUnit: 'ק"ג' };
    }
  }
  
  return { weight: 0, weightUnit: 'ק"ג' };
};

// Transform raw data to product objects
const transformProducts = (jsonData) => {
  const products = [];
  
  jsonData.forEach((row, index) => {
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
  });
  
  return products;
};

// Dog loading animation component
const DogLoadingAnimation = ({ title, subtitle }) => {
  return (
    <Flex direction="column" align="center" justify="center" minH="400px">
      <Box mb={4}>
        <Image
          src="/load.gif"
          alt="Loading animation"
          width="200px"
          height="200px"
          objectFit="contain"
        />
      </Box>
      <Heading as="h3" size="lg" color="gray.900" mb={2}>{title}</Heading>
      <Text color="gray.500">{subtitle}</Text>
    </Flex>
  );
};

// Loading state component
const LoadingSpinner = () => (
  <DogLoadingAnimation title="טוען מוצרים" subtitle="אנא המתן..." />
);

// AccordionFilter: a filter category that expands to show options
const AccordionFilter = ({ 
  label, 
  icon: Icon, 
  value, 
  options, 
  onChange, 
  multi = false, 
  enabled = true, 
  onToggleEnabled, 
  colorScheme = 'brand',
  customColor,
  children,
  customContent
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Support for custom hex colors
  const isCustomColor = customColor && customColor.startsWith('#');
  
  // Helper function to darken hex color
  const darkenColor = (hex, percent) => {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = ((num >> 16) & 0xFF) - amt;
    const G = ((num >> 8) & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  };
  
  // Reverse: default is strong, hover/expanded is lighter
  const bgColor = enabled 
    ? (isCustomColor ? darkenColor(customColor, 25) + '30' : `${colorScheme}.100`) 
    : '#F5F5F5';
  const textColor = enabled 
    ? (isCustomColor ? darkenColor(customColor, 45) : `${colorScheme}.800`) 
    : 'gray.600';
  const borderColor = enabled 
    ? (isCustomColor ? darkenColor(customColor, 35) : `${colorScheme}.200`) 
    : '#DBDBDB';

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim() || !options) return options;
    return options.filter(option => 
      option.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const handleSelect = (option) => {
    if (!enabled && onToggleEnabled) {
      onToggleEnabled();
      setTimeout(() => {
        if (multi) {
          const newValue = value.includes(option)
            ? value.filter(v => v !== option)
            : [...value, option];
          onChange(newValue);
        } else {
          onChange([option]);
        }
      }, 0);
      return;
    }
    
    if (multi) {
      const newValue = value.includes(option)
        ? value.filter(v => v !== option)
        : [...value, option];
      onChange(newValue);
    } else {
      onChange([option]);
    }
  };

  const getDisplayValue = () => {
    if (value && value.length > 0) {
      if (value.length === 1) {
        return (
          <Flex align="center">
            <Text fontWeight="700" fontSize="sm" color={textColor} mr={1}>
              {label}:
            </Text>
            <Text fontWeight="400" fontSize="sm" color={textColor}>
              {value[0]}
            </Text>
          </Flex>
        );
      }
      if (value.length <= 3) {
        return (
          <Flex align="center">
            <Text fontWeight="700" fontSize="sm" color={textColor} mr={1}>
              {label}:
            </Text>
            <Text fontWeight="400" fontSize="sm" color={textColor}>
              {value.join(', ')}
            </Text>
          </Flex>
        );
      }
      return (
        <Flex align="center">
          <Text fontWeight="700" fontSize="sm" color={textColor} mr={1}>
            {label}:
          </Text>
          <Text fontWeight="400" fontSize="sm" color={textColor}>
            {value.length} נבחרו
          </Text>
        </Flex>
      );
    }
    return <Text fontWeight="700" fontSize="sm" color={textColor}>{label}</Text>;
  };

  return (
    <AccordionItem border="none" mb={2}>
      <AccordionButton
        bg={bgColor}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="md"
        p={3}
        _hover={{ bg: enabled ? (isCustomColor ? darkenColor(customColor, 10) + '10' : `${colorScheme}.50`) : bgColor }}
        _expanded={{ bg: enabled ? (isCustomColor ? darkenColor(customColor, 10) + '10' : `${colorScheme}.50`) : bgColor }}
        opacity={!enabled ? 0.6 : 1}
        onClick={() => {
          if (!enabled && onToggleEnabled) {
            onToggleEnabled();
          }
        }}
      >
        <Flex align="center" flex="1" justify="space-between">
          <Flex align="center" flex="1">
            <Box
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleEnabled) {
                  onToggleEnabled();
                }
              }}
              mr={3}
              cursor="pointer"
              display="flex"
              alignItems="center"
              justifyContent="center"
              w="16px"
              h="16px"
              borderRadius="sm"
              border="2px solid"
              borderColor={enabled ? (isCustomColor ? darkenColor(customColor, 30) : `${colorScheme}.500`) : 'gray.300'}
              bg={enabled ? (isCustomColor ? darkenColor(customColor, 30) : `${colorScheme}.500`) : 'transparent'}
              _hover={{
                borderColor: enabled ? (isCustomColor ? darkenColor(customColor, 40) : `${colorScheme}.600`) : 'gray.400',
                bg: enabled ? (isCustomColor ? darkenColor(customColor, 20) : `${colorScheme}.400`) : 'gray.50' // stronger on hover
              }}
              transition="all 0.2s"
            >
              {enabled && (
                <Box
                  as="svg"
                  w="8px"
                  h="8px"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20,6 9,17 4,12" />
                </Box>
              )}
            </Box>
            {Icon && <Icon size={16} style={{ marginLeft: '8px' }} />}
            <Box flex="1" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
              {getDisplayValue()}
            </Box>
          </Flex>
          <AccordionIcon />
        </Flex>
      </AccordionButton>
      
      <AccordionPanel bg="white" border="1px solid" borderColor={borderColor} borderTop="none" borderRadius="0 0 md md">
        {customContent ? (
          <Box p={3}>
            {customContent}
          </Box>
        ) : (
          <Box p={3} maxH="200px" overflowY="auto">
            {/* Search input for filters with more than 5 options */}
            {options && options.length > 5 && (
              <Box mb={3}>
                <input
                  type="text"
                  placeholder="חיפוש..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    direction: 'rtl',
                    textAlign: 'right'
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </Box>
            )}
            
            <VStack spacing={2} align="stretch">
              {filteredOptions && filteredOptions.map((option) => (
                <Flex
                  key={option}
                  align="center"
                  p={2}
                  _hover={{ bg: isCustomColor ? darkenColor(customColor, 5) + '10' : `${colorScheme}.50` }} // lighter on hover
                  borderRadius="md"
                  cursor="pointer"
                  onClick={(e) => {
                    if (!e.target.closest('.chakra-checkbox')) {
                      handleSelect(option);
                    }
                  }}
                >
                  {multi && (
                    <Checkbox
                      isChecked={value.includes(option)}
                      onChange={() => handleSelect(option)}
                      mr={3}
                      colorScheme={colorScheme}
                      onClick={e => e.stopPropagation()}
                    />
                  )}
                  <Text fontSize="sm" color={isCustomColor ? darkenColor(customColor, 40) : `${colorScheme}.700`}>{option}</Text>
                </Flex>
              ))}
            </VStack>
          </Box>
        )}
      </AccordionPanel>
    </AccordionItem>
  );
};

// Helper function to format weight with proper decimal places and always show ק"ג with quote
const formatWeight = (weight, unit) => {
  if (!Number.isFinite(weight)) return '0';
  // Always normalize kilogram unit to ק"ג
  let displayUnit = unit;
  if (unit && (unit.replace(/["'׳״]/g, '').replace(/\s/g, '') === 'קג' || unit === 'קג')) {
    displayUnit = 'ק"ג';
  }
  if (displayUnit === 'ק"ג' || displayUnit === 'ליטר') {
    return `${weight.toFixed(1)} ${displayUnit}`;
  }
  return `${Math.round(weight)} ${displayUnit}`;
};

// Color mapping and icon mapping for tags (matching filter colors and Lucide icons)
const tagMeta = {
  internalCategory: { color: '#FEEBC8', textColor: '#744210', icon: Folder, label: 'קטגוריה' },
  animalType: { color: '#C6F6D5', textColor: '#22543D', icon: Dog, label: 'קבוצה' },
  brand: { color: '#BEE3F8', textColor: '#2A4365', icon: Tag, label: 'מותג' },
  lifeStage: { color: '#E9D8FD', textColor: '#553C9A', icon: Baby, label: 'גיל' },
  supplierName: { color: '#B2F5EA', textColor: '#234E52', icon: Package, label: 'ספק' },
  mainIngredient: { color: '#FED7D7', textColor: '#742A2A', icon: Utensils, label: 'טעם' },
  medicalIssue: { color: '#D6BCFA', textColor: '#322659', icon: HeartCrack, label: 'בעיה רפואית' },
  qualityLevel: { color: '#FEFCBF', textColor: '#744210', icon: Star, label: 'איכות' },
  price: { color: '#B2F5EA', textColor: '#234E52', icon: DollarSign, label: 'מחיר' },
  participatesInVariety: { color: '#E2E8F0', textColor: '#4A5568', icon: Check, label: 'במגוון' },
};

// Helper: get list of active similarity fields (not just all active filters)
const SIMILARITY_FIELDS = [
  'animalType',
  'internalCategory',
  'brand',
  'lifeStage',
  'mainIngredient',
  'price',
  'weight',
  'supplier',
  'supplierName',
  'healthIssue',
  'medicalIssue',
  'quality',
  'qualityLevel',
];

const getActiveSimilarityFields = (activeFilters) => {
  if (!activeFilters) return [];
  return Object.keys(activeFilters).filter(
    (key) => activeFilters[key] && SIMILARITY_FIELDS.includes(key)
  );
};

// Updated similarity calculation to use only active similarity fields
const calculateSimilarity = (product1, product2, activeFields) => {
  if (!product1 || !product2) return 0;
  
  // Normalize SKU and barcode for comparison
  const normalizeId = (val) => {
    if (!val) return '';
    return val.toString().replace(/\.0$/, '').trim();
  };
  
  const sku1 = normalizeId(product1.sku);
  const sku2 = normalizeId(product2.sku);
  const barcode1 = normalizeId(product1.barcode);
  const barcode2 = normalizeId(product2.barcode);
  
  const isSameProduct = (sku1 && sku2 && sku1 === sku2) || (barcode1 && barcode2 && barcode1 === barcode2);
  
  let score = 0;
  let maxScore = 0;
  const fieldPoints = {
    animalType: 30,
    internalCategory: 25,
    brand: 20,
    lifeStage: 15,
    mainIngredient: 10,
    price: 20,
    weight: 25, // Add weight similarity
    supplier: 10,
    healthIssue: 10,
    quality: 10,
  };
  
  (activeFields || []).forEach(field => {
    switch (field) {
      case 'animalType':
        maxScore += fieldPoints.animalType;
        if (product1.animalType && product2.animalType && product1.animalType === product2.animalType) {
          score += fieldPoints.animalType;
        }
        break;
      case 'internalCategory':
        maxScore += fieldPoints.internalCategory;
        if (product1.internalCategory && product2.internalCategory && product1.internalCategory === product2.internalCategory) {
          score += fieldPoints.internalCategory;
        }
        break;
      case 'brand':
        maxScore += fieldPoints.brand;
        if (product1.brand && product2.brand && product1.brand === product2.brand) {
          score += fieldPoints.brand;
        }
        break;
      case 'lifeStage':
        maxScore += fieldPoints.lifeStage;
        if (product1.lifeStage && product2.lifeStage && product1.lifeStage === product2.lifeStage) {
          score += fieldPoints.lifeStage;
        }
        break;
      case 'mainIngredient':
        maxScore += fieldPoints.mainIngredient;
        if (product1.mainIngredient && product2.mainIngredient && product1.mainIngredient === product2.mainIngredient) {
          score += fieldPoints.mainIngredient;
        }
        break;
      case 'price':
        maxScore += fieldPoints.price;
        if (Number.isFinite(product1.salePrice) && Number.isFinite(product2.salePrice)) {
          const priceDiff = Math.abs(product1.salePrice - product2.salePrice);
          const priceRatio = priceDiff / product1.salePrice;
          if (priceDiff === 0) score += 20;
          else if (priceRatio <= 0.05) score += 15;
          else if (priceRatio <= 0.10) score += 10;
          else if (priceRatio <= 0.20) score += 5;
        }
        break;
      case 'weight':
        maxScore += fieldPoints.weight;
        if (Number.isFinite(product1.weight) && Number.isFinite(product2.weight)) {
          const weightDiff = Math.abs(product1.weight - product2.weight);
          const weightRatio = weightDiff / product1.weight;
          if (weightDiff === 0) score += 25; // Exact match
          else if (weightRatio <= 0.05) score += 20; // Very close (within 5%)
          else if (weightRatio <= 0.10) score += 15; // Close (within 10%)
          else if (weightRatio <= 0.20) score += 10; // Somewhat close (within 20%)
          else if (weightRatio <= 0.50) score += 5; // Moderately close (within 50%)
        }
        break;
      case 'supplier':
      case 'supplierName':
        maxScore += fieldPoints.supplier;
        if (product1.supplierName && product2.supplierName && product1.supplierName === product2.supplierName) {
          score += fieldPoints.supplier;
        }
        break;
      case 'healthIssue':
      case 'medicalIssue':
        maxScore += fieldPoints.healthIssue;
        if (product1.medicalIssue && product2.medicalIssue && product1.medicalIssue === product2.medicalIssue) {
          score += fieldPoints.healthIssue;
        }
        break;
      case 'quality':
      case 'qualityLevel':
        maxScore += fieldPoints.quality;
        if (
          product1.qualityLevel && product2.qualityLevel &&
          product1.qualityLevel.toString().trim().toLowerCase() === product2.qualityLevel.toString().trim().toLowerCase()
        ) {
          score += fieldPoints.quality;
        }
        break;
      default:
        break;
    }
  });
  
  if (maxScore === 0) return 0;
  const percent = Math.floor((score / maxScore) * 100);
  if (isSameProduct) return 100;
  return Math.min(percent, 100);
};

// Helper to normalize SKU/barcode for comparison
function normalizeId(val) {
  if (val == null) return '';
  return String(val).trim().replace(/\.0$/, '');
}

const ProductCard = React.memo(function ProductCard({ product, index, selectedProduct, activeFilters, onOpenPreview, onSearchAlternatives, viewMode = 'grid' }) {
  console.time(`ProductCard-render-${product.sku || product.barcode || index}`);
  
  const toast = useToast();

  // Function to copy text to clipboard
  const handleCopy = useCallback((text, fieldName) => {
    const success = copy(text);
    if (success) {
      toast({
        title: 'הועתק בהצלחה',
        description: `${fieldName} הועתק ללוח`,
        status: 'success',
        duration: 2000,
        isClosable: true,
        position: 'top',
      });
    } else {
      toast({
        title: 'שגיאה בהעתקה',
        description: 'לא ניתן להעתיק ללוח',
        status: 'error',
        duration: 2000,
        isClosable: true,
        position: 'top',
      });
    }
  }, [toast]);

  // Color mapping for similarity score based on the new specifications
  const getMatchScoreColor = (score) => {
    if (score >= 66) return '#78B935'; // 66% to 99% - green
    if (score >= 33) return '#F3CF26'; // 33% to 66% - yellow
    return '#D32401'; // 33% or less - red
  };

  const activeSimilarityFields = getActiveSimilarityFields(activeFilters);

  // Updated tooltip content to only show active similarity fields
  const getSimilarityTooltipContent = (product1, product2, score, activeFields) => {
    if (!product1 || !product2) return 'לא ניתן לחשב התאמה';
    
    // Normalize SKU and barcode for comparison
    const normalizeId = (val) => {
      if (!val) return '';
      return val.toString().replace(/\.0$/, '').trim();
    };
    
    const sku1 = normalizeId(product1.sku);
    const sku2 = normalizeId(product2.sku);
    const barcode1 = normalizeId(product1.barcode);
    const barcode2 = normalizeId(product2.barcode);
    
    const isSameProduct = (sku1 && sku2 && sku1 === sku2) || (barcode1 && barcode2 && barcode1 === barcode2);
    const fieldPoints = {
      animalType: 30,
      internalCategory: 25,
      brand: 20,
      lifeStage: 15,
      mainIngredient: 10,
      price: 20,
      weight: 25,
      supplier: 10,
      healthIssue: 10,
      quality: 10,
    };
    const breakdownObj = {};
    let maxScore = 0;
    (activeFields || []).forEach(field => {
      switch (field) {
        case 'animalType':
          maxScore += fieldPoints.animalType;
          breakdownObj.animalType = (product1.animalType && product2.animalType && product1.animalType === product2.animalType) ? fieldPoints.animalType : 0;
          break;
        case 'internalCategory':
          maxScore += fieldPoints.internalCategory;
          breakdownObj.internalCategory = (product1.internalCategory && product2.internalCategory && product1.internalCategory === product2.internalCategory) ? fieldPoints.internalCategory : 0;
          break;
        case 'brand':
          maxScore += fieldPoints.brand;
          breakdownObj.brand = (product1.brand && product2.brand && product1.brand === product2.brand) ? fieldPoints.brand : 0;
          break;
        case 'lifeStage':
          maxScore += fieldPoints.lifeStage;
          breakdownObj.lifeStage = (product1.lifeStage && product2.lifeStage && product1.lifeStage === product2.lifeStage) ? fieldPoints.lifeStage : 0;
          break;
        case 'mainIngredient':
          maxScore += fieldPoints.mainIngredient;
          breakdownObj.mainIngredient = (product1.mainIngredient && product2.mainIngredient && product1.mainIngredient === product2.mainIngredient) ? fieldPoints.mainIngredient : 0;
          break;
        case 'price':
          maxScore += fieldPoints.price;
          if (Number.isFinite(product1.salePrice) && Number.isFinite(product2.salePrice)) {
            const priceDiff = Math.abs(product1.salePrice - product2.salePrice);
            const priceRatio = priceDiff / product1.salePrice;
            if (priceDiff === 0) breakdownObj.price = 20;
            else if (priceRatio <= 0.05) breakdownObj.price = 15;
            else if (priceRatio <= 0.10) breakdownObj.price = 10;
            else if (priceRatio <= 0.20) breakdownObj.price = 5;
            else breakdownObj.price = 0;
          } else {
            breakdownObj.price = 0;
          }
          break;
        case 'weight':
          maxScore += fieldPoints.weight;
          if (Number.isFinite(product1.weight) && Number.isFinite(product2.weight)) {
            const weightDiff = Math.abs(product1.weight - product2.weight);
            const weightRatio = weightDiff / product1.weight;
            if (weightDiff === 0) breakdownObj.weight = 25; // Exact match
            else if (weightRatio <= 0.05) breakdownObj.weight = 20; // Very close (within 5%)
            else if (weightRatio <= 0.10) breakdownObj.weight = 15; // Close (within 10%)
            else if (weightRatio <= 0.20) breakdownObj.weight = 10; // Somewhat close (within 20%)
            else if (weightRatio <= 0.50) breakdownObj.weight = 5; // Moderately close (within 50%)
            else breakdownObj.weight = 0;
          } else {
            breakdownObj.weight = 0;
          }
          break;
        case 'supplier':
        case 'supplierName':
          maxScore += fieldPoints.supplier;
          breakdownObj.supplierName = (
            product1.supplierName && product2.supplierName &&
            normalizeSupplier(product1.supplierName) === normalizeSupplier(product2.supplierName)
          ) ? fieldPoints.supplier : 0;
          break;
        case 'healthIssue':
        case 'medicalIssue':
          maxScore += fieldPoints.healthIssue;
          breakdownObj.medicalIssue = (product1.medicalIssue && product2.medicalIssue && product1.medicalIssue === product2.medicalIssue) ? fieldPoints.healthIssue : 0;
          break;
        case 'quality':
        case 'qualityLevel':
          maxScore += fieldPoints.quality;
          breakdownObj.qualityLevel = (
            product1.qualityLevel && product2.qualityLevel &&
            product1.qualityLevel.toString().trim().toLowerCase() === product2.qualityLevel.toString().trim().toLowerCase()
          ) ? fieldPoints.quality : 0;
          break;
        default:
          break;
      }
    });
    const totalPoints = Object.values(breakdownObj).reduce((a, b) => a + b, 0);
    
    // Calculate percentages based on contribution to total score
    const breakdownPercent = Object.fromEntries(
      Object.entries(breakdownObj).map(([field, points]) => {
        // Calculate what percentage this field contributes to the total score
        const percentContribution = totalPoints > 0 ? Math.floor((points / totalPoints) * 100) : 0;
        return [field, percentContribution];
      })
    );
    
    const totalPercent = maxScore ? Math.min(100, Math.floor((totalPoints / maxScore) * 100)) : 0;
    return (
      <>
        <SimilarityBreakdownBar breakdown={breakdownObj} totalPoints={totalPoints} maxPoints={maxScore} activeFields={activeFields} />
        <VStack 
          align="flex-end" 
          spacing={3} 
          dir="rtl" 
          textAlign="right"
          style={{
            direction: 'rtl',
            textAlign: 'right',
            unicodeBidi: 'plaintext',
            display: 'block',
          }}
        >
          <Text 
            fontWeight="bold" 
            mb={2} 
            dir="rtl" 
            textAlign="right"
            style={{ direction: 'rtl', textAlign: 'right', unicodeBidi: 'plaintext' }}
          >
            פירוט חישוב ההתאמה:
          </Text>
          {activeFields.map(field => {
            // Handle field name mapping for medicalIssue -> healthIssue and qualityLevel -> quality
            let mappedField = field;
            if (field === 'medicalIssue') {
              mappedField = 'healthIssue';
            } else if (field === 'qualityLevel') {
              mappedField = 'quality';
            } else if (field === 'supplierName') {
              mappedField = 'supplier';
            }
            
            const meta = TAG_META[mappedField] || TAG_META[field] || TAG_META[field.replace('Name', '')] || TAG_META[field.replace('Level', '')];
            if (!meta) return null;
            
            // Get the correct field name for breakdownObj
            let breakdownField = field;
            if (field === 'quality' || field === 'qualityLevel') {
              breakdownField = 'qualityLevel';
            } else if (field === 'supplier' || field === 'supplierName') {
              breakdownField = 'supplierName';
            } else if (field === 'healthIssue' || field === 'medicalIssue') {
              breakdownField = 'medicalIssue';
            }
            
            const percent = breakdownPercent[breakdownField] ?? 0;
            const points = breakdownObj[breakdownField] ?? 0;
            return (
              <Text
                key={field}
                fontWeight="semibold"
                color={percent > 0 ? meta.textColor : "gray.700"}
                dir="rtl"
                textAlign="right"
                my={1}
                style={{ direction: 'rtl', textAlign: 'right', unicodeBidi: 'plaintext' }}
              >
                <Badge
                  bg={meta.color}
                  color={meta.textColor}
                  fontSize="xs"
                  px={2}
                  py={1}
                  borderRadius="full"
                  mr={2}
                  ml={1}
                  dir="rtl"
                  textAlign="right"
                  style={{ direction: 'rtl', flexDirection: 'row-reverse' }}
                >
                  {meta.label}
                </Badge>
                {percent}% {points > 0 ? '— זהה' : '— שונה'}
              </Text>
            );
          })}
          <Text 
            fontWeight="bold" 
            color="yellow.400" 
            mt={2} 
            dir="rtl" 
            textAlign="right"
            style={{ direction: 'rtl', textAlign: 'right', unicodeBidi: 'plaintext' }}
          >
            סה&quot;כ: {totalPercent}%
          </Text>
          {isSameProduct && (
            <Text 
              color="blue.400" 
              fontWeight="semibold" 
              dir="rtl" 
              textAlign="right"
              style={{ direction: 'rtl', textAlign: 'right', unicodeBidi: 'plaintext' }}
            >
              זהו המוצר המקורי - התאמה של 100%
            </Text>
          )}
        </VStack>
      </>
    );
  };

  // Calculate similarity score using the updated function
  const similarityScore = selectedProduct ? calculateSimilarity(selectedProduct, product, activeSimilarityFields) : 0;

  // Check if this is the same product as the selected product
  const isSameProduct = selectedProduct && (
    (normalizeId(product.sku) && normalizeId(selectedProduct.sku) && normalizeId(product.sku) === normalizeId(selectedProduct.sku)) ||
    (normalizeId(product.barcode) && normalizeId(selectedProduct.barcode) && normalizeId(product.barcode) === normalizeId(selectedProduct.barcode))
  );
  
  // Debug: Log isSameProduct comparison for פרופלאן products (commented out to reduce console spam)
  // if (selectedProduct && product.productName && product.productName.includes('פרופלאן')) {
  //   console.log('Debug: ProductCard isSameProduct comparison:', {
  //     productName: product.productName,
  //     productSKU: product.sku,
  //     productBarcode: product.barcode,
  //     selectedProductName: selectedProduct.productName,
  //     selectedSKU: selectedProduct.sku,
  //     selectedBarcode: selectedProduct.barcode,
  //     normalizedProductSKU: normalizeId(product.sku),
  //     normalizedSelectedSKU: normalizeId(selectedProduct.sku),
  //     normalizedProductBarcode: normalizeId(product.barcode),
  //     normalizedSelectedBarcode: normalizeId(selectedProduct.barcode),
  //     skuMatch: normalizeId(product.sku) && normalizeId(selectedProduct.sku) && normalizeId(product.sku) === normalizeId(selectedProduct.sku),
  //     barcodeMatch: normalizeId(product.barcode) && normalizeId(selectedProduct.barcode) && normalizeId(product.barcode) === normalizeId(selectedProduct.barcode),
  //     isSameProduct
  //   });
  // }

  // Debug: Print lifeStage values for both products if isSameProduct is true (commented out to reduce console spam)
  // if (isSameProduct) {
  //   console.log('isSameProduct DEBUG:', {
  //     productName: product.productName,
  //     selectedProductName: selectedProduct.productName,
  //     productLifeStage: product.lifeStage,
  //     selectedProductLifeStage: selectedProduct.lifeStage
  //   });
  // }

  // Debug: Log SKU/barcode matching for troubleshooting (commented out to reduce console spam)
  // if (selectedProduct && (product.productName.includes('פרופלאן') || product.productName.includes('STERILISED'))) {
  //   console.log('Debug SKU/Barcode matching for פרופלאן:', {
  //     productName: product.productName,
  //     productSKU: product.sku,
  //     productBarcode: product.barcode,
  //     selectedSKU: selectedProduct?.sku,
  //     selectedBarcode: selectedProduct?.barcode,
  //     skuMatch: normalizeId(product.sku) && normalizeId(selectedProduct?.sku) && normalizeId(product.sku) === normalizeId(selectedProduct.sku),
  //     barcodeMatch: normalizeId(product.barcode) && normalizeId(selectedProduct?.barcode) && normalizeId(product.barcode) === normalizeId(selectedProduct.barcode),
  //     isSameProduct,
  //     productSKUType: typeof product.sku,
  //     selectedSKUType: typeof selectedProduct?.sku,
  //     productBarcodeType: typeof product.barcode,
  //     selectedBarcodeType: typeof selectedProduct?.barcode
  //   });
    
  //   // Additional debug: Check if this is the specific product we're looking for
  //   if (product.productName === 'פרופלאן STERILISED פחית לחתול מוס דגים 85 גרם') {
  //     console.log('Debug: Found the specific product in SKU/Barcode matching:', {
  //       productName: product.productName,
  //       productSKU: product.sku,
  //       productBarcode: product.barcode,
  //       selectedProductName: selectedProduct.productName,
  //       selectedSKU: selectedProduct.sku,
  //       selectedBarcode: selectedProduct.barcode,
  //     isSameProduct
  //   });
  //   }
  // }
  
  // More specific debug for the problematic product (commented out to reduce console spam)
  // if (selectedProduct && product.productName === 'אדוונס לכלב סלמון 3 קילו') {
  //   console.log('SPECIFIC DEBUG - אדוונס לכלב סלמון 3 קילו:', {
  //     productName: product.productName,
  //     productSKU: product.sku,
  //     productBarcode: product.barcode,
  //     selectedProductName: selectedProduct?.productName,
  //     selectedSKU: selectedProduct?.sku,
  //     selectedBarcode: selectedProduct?.barcode,
  //     skuMatch: product.sku && selectedProduct?.sku && product.sku === selectedProduct.sku,
  //     barcodeMatch: product.barcode && selectedProduct?.barcode && product.barcode === selectedProduct.barcode,
  //     isSameProduct,
  //     productSKUType: typeof product.sku,
  //     selectedSKUType: typeof selectedProduct?.sku,
  //     productBarcodeType: typeof product.barcode,
  //     selectedBarcodeType: typeof selectedProduct?.barcode
  //   });
  // }
  
  // More specific debug for the פרופלאן STERILISED product (commented out to reduce console spam)
  // if (selectedProduct && product.productName === 'פרופלאן STERILISED פחית לחתול מוס דגים 85 גרם') {
  //   console.log('SPECIFIC DEBUG - פרופלאן STERILISED:', {
  //     productName: product.productName,
  //     productSKU: product.sku,
  //     productBarcode: product.barcode,
  //     selectedProductName: selectedProduct?.productName,
  //     selectedSKU: selectedProduct?.sku,
  //     selectedBarcode: selectedProduct?.barcode,
  //     skuMatch: product.sku && selectedProduct?.sku && product.sku === selectedProduct.sku,
  //     barcodeMatch: product.barcode && selectedProduct?.barcode && product.barcode === selectedProduct.barcode,
  //     isSameProduct,
  //     productSKUType: typeof product.sku,
  //     selectedSKUType: typeof selectedProduct?.sku,
  //     productBarcodeType: typeof product.barcode,
  //     selectedBarcodeType: typeof selectedProduct?.barcode
  //   });
  // }

  // Create a unique key combining multiple identifiers
  const uniqueKey = `${product.sku || 'no-sku'}-${product.barcode || 'no-barcode'}-${index}`;

  const result = (
    <Box
      key={uniqueKey}
      bg={isSameProduct ? "#eef2ff" : "white"}
      borderRadius="lg"
      boxShadow="md"
      overflow="hidden"
      p={3}
      transition="all 0.2s"
      _hover={{ boxShadow: 'lg', transform: 'translateY(-2px)' }}
      dir="rtl"
      h="auto"
      maxW={viewMode === 'list' ? "100%" : "280px"}
      w="100%"
      display="flex"
      flexDirection={viewMode === 'list' ? "row" : "column"}
      textAlign="right"
      style={{ direction: 'rtl' }}
      position="relative"
      pt={viewMode === 'list' ? (isSameProduct ? 8 : 4) : 2}
    >
      {/* Source Product Label */}
      {isSameProduct && (
        <Box
          position="absolute"
          top={0}
          right={0}
          left={0}
          bg="#cdd5fd"
          color="#8b86c6"
          py={1}
          px={2}
          textAlign="center"
          fontSize="xs"
          fontWeight="normal"
          zIndex={1}
        >
          מוצר מקור
        </Box>
      )}
      {/* Product Image */}
      <Box 
        mb={viewMode === 'list' ? 0 : 1}
        mt={isSameProduct ? (viewMode === 'list' ? 8 : 6) : 0}
        h={viewMode === 'list' ? "120px" : "80px"}
        w={viewMode === 'list' ? "120px" : "auto"}
        flexShrink={0}
        display="flex"
        justifyContent="center"
        alignItems="center"
        mr={viewMode === 'list' ? 4 : 0}
      >
        <OptimizedImage
          src={product.imageUrl}
          alt={product.productName}
          width={viewMode === 'list' ? "120px" : "80px"}
          height={viewMode === 'list' ? "120px" : "80px"}
          objectFit="contain"
          onOpen={onOpenPreview}
          product={product}
        />
      </Box>

      {/* Content Wrapper for List View */}
      <Box flex={viewMode === 'list' ? 1 : 'none'} display="flex" flexDirection="column">
        {/* Product Name */}
        <Text 
          fontWeight="bold" 
          fontSize={viewMode === 'list' ? "md" : "sm"}
          color="gray.800" 
          noOfLines={viewMode === 'list' ? 1 : 2} 
          mb={1} 
          dir="rtl" 
          textAlign="right"
          style={{ direction: 'rtl', textAlign: 'right' }}
          cursor="pointer"
          onClick={() => handleCopy(product.productName, 'שם המוצר')}
          _hover={{ color: 'brand.600' }}
          transition="color 0.2s"
        >
          {product.productName}
        </Text>

      {/* Barcode and SKU */}
      {product.barcode && (
        <Text 
          fontSize="xs" 
          color="gray.600" 
          dir="rtl" 
          textAlign="right"
          style={{ direction: 'rtl', textAlign: 'right' }}
          mb={0.5}
          cursor="pointer"
          onClick={() => handleCopy(product.barcode, 'ברקוד')}
          _hover={{ color: 'brand.600' }}
          transition="color 0.2s"
        >
          <Text as="span" fontWeight="semibold">ברקוד:</Text> {product.barcode}
        </Text>
      )}
      {product.sku && product.sku !== product.barcode && (
        <Text 
          fontSize="xs" 
          color="gray.600" 
          dir="rtl" 
          textAlign="right"
          style={{ direction: 'rtl', textAlign: 'right' }}
          mb={0.5}
          cursor="pointer"
          onClick={() => handleCopy(product.sku, 'מק"ט')}
          _hover={{ color: 'brand.600' }}
          transition="color 0.2s"
        >
          <Text as="span" fontWeight="semibold">מק&quot;ט:</Text> {product.sku}
        </Text>
      )}

      {/* Price */}
      <Text 
        fontSize="sm" 
        fontWeight="bold" 
        color="brand.600" 
        dir="rtl" 
        mb={0.5} 
        textAlign="right"
        style={{ direction: 'rtl', textAlign: 'right' }}
      >
        ₪{product.salePrice?.toFixed(1) || '0.0'}
      </Text>

      {/* Weight */}
      {product.weight > 0 && (
        <Text 
          fontSize="xs" 
          color="gray.600" 
          dir="rtl" 
          mb={0.5} 
          textAlign="right"
          style={{ direction: 'rtl', textAlign: 'right' }}
        >
          <Text as="span" fontWeight="semibold">משקל:</Text> {formatWeight(product.weight, product.weightUnit)}
        </Text>
      )}

      {/* Info tags in requested order, with Lucide icons on the right inside the tag */}
      <Box 
        mt={0.5} 
        mb={1} 
        display="flex" 
        flexWrap="wrap" 
        gap={1} 
        width="100%"
        alignSelf="flex-start"
        justifyContent="flex-start"
        dir="rtl"
        style={{ direction: 'rtl', marginRight: 0, marginLeft: 'auto' }}
      >
        {Object.entries(tagMeta).map(([field, meta]) => {
          // Special handling for participatesInVariety - only show if it's 'כן'
          if (field === 'participatesInVariety') {
            return product[field] === 'כן' ? (
              <Badge
                key={field}
                bg={meta.color}
                color={meta.textColor}
                fontSize="xs"
                px={1.5}
                py={0.5}
                borderRadius="md"
                display="flex"
                alignItems="center"
                gap={1}
                dir="rtl"
                textAlign="right"
                style={{ 
                  direction: 'rtl', 
                  textAlign: 'right',
                  flexDirection: 'row-reverse'
                }}
              >
                <Icon as={meta.icon} boxSize={2.5} />
                <span>{meta.label}</span>
              </Badge>
            ) : null;
          }
          
          // Regular handling for other fields
          return product[field] ? (
            <Badge
              key={field}
              bg={meta.color}
              color={meta.textColor}
              fontSize="xs"
              px={1.5}
              py={0.5}
              borderRadius="md"
              display="flex"
              alignItems="center"
              gap={1}
              dir="rtl"
              textAlign="right"
              style={{ 
                direction: 'rtl', 
                textAlign: 'right',
                flexDirection: 'row-reverse'
              }}
            >
              <Icon as={meta.icon} boxSize={2.5} />
              <span>{product[field]}</span>
            </Badge>
          ) : null;
        })}
      </Box>



      {/* Similarity Score - Only show when there's a selected product */}
      {selectedProduct && (
        <Tooltip
          placement="top"
          hasArrow={false}
          bg="rgb(251, 253, 255)"
          color="black"
          boxShadow="lg"
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="md"
          openDelay={400}
          gutter={8}
          closeOnClick={false}
          closeOnPointerDown={false}
          sx={{
            '.chakra-tooltip__popper': {
              direction: 'rtl',
              textAlign: 'right',
            },
            '.chakra-tooltip__content': {
              direction: 'rtl',
              textAlign: 'right',
            },
          }}
          label={
            <div className="rtl-text">
              <Box
                p={3}
                fontFamily="system-ui, -apple-system, sans-serif"
                fontSize="sm"
                maxW="300px"
                whiteSpace="pre-line"
                dir="rtl"
                textAlign="right"
                style={{
                  direction: 'rtl',
                  textAlign: 'right',
                  unicodeBidi: 'plaintext',
                  display: 'block',
                }}
              >
                {getSimilarityTooltipContent(selectedProduct, product, similarityScore, activeSimilarityFields)}
              </Box>
            </div>
          }
        >
          <Badge
            fontSize="xs"
            alignSelf="flex-start"
            borderRadius="md"
            px={2}
            py={1}
            mt={1}
            dir="rtl"
            textAlign="right"
            cursor="help"
            userSelect="none"
            style={{
              direction: 'rtl',
              textAlign: 'right',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 0,
              marginLeft: 'auto',
              backgroundColor: getMatchScoreColor(similarityScore),
              color: '#fff',
              unicodeBidi: 'plaintext',
            }}
          >
            {`${similarityScore}% התאמה`}
          </Badge>
        </Tooltip>
      )}

      {/* Action Buttons - All buttons at the bottom */}
      <Box 
        mt={1} 
        display="flex" 
        gap={1}
        justifyContent="flex-start"
        dir="rtl"
        style={{ direction: 'rtl', marginRight: 0, marginLeft: 'auto' }}
      >
        <ProductUrlButton 
          productUrl={product.productUrl} 
          productName={product.productName} 
        />
        <SearchAlternativesButton 
          product={product}
          onSearchAlternatives={onSearchAlternatives}
        />
        <GoogleSearchButton 
          productName={product.productName}
        />
      </Box>
      </Box>
    </Box>
  );
  
  console.timeEnd(`ProductCard-render-${product.sku || product.barcode || index}`);
  return result;
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.product.sku === nextProps.product.sku &&
    prevProps.product.barcode === nextProps.product.barcode &&
    prevProps.index === nextProps.index &&
    prevProps.selectedProduct?.sku === nextProps.selectedProduct?.sku &&
    prevProps.selectedProduct?.barcode === nextProps.selectedProduct?.barcode &&
    JSON.stringify(prevProps.activeFilters) === JSON.stringify(nextProps.activeFilters)
  );
});

const ProductUrlButton = ({ productUrl, productName }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    if (!productUrl) return;
    
    setIsLoading(true);
    try {
      window.open(productUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening URL:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!productUrl) return null;

  return (
    <Box
      as="button"
      onClick={handleClick}
      disabled={isLoading}
      display="flex"
      alignItems="center"
      justifyContent="center"
      w="28px"
      h="28px"
      borderRadius="md"
      bg="gray.100"
      _hover={{ bg: 'gray.200' }}
      _active={{ bg: 'gray.300' }}
      transition="all 0.2s"
      cursor="pointer"
      position="relative"
      title={`פתח באתר: ${productName}`}
      dir="rtl"
      style={{ direction: 'rtl' }}
    >
              {isLoading ? (
          <Box
            w="12px"
            h="12px"
            border="2px solid"
            borderColor="gray.300"
            borderTopColor="brand.500"
            borderRadius="full"
            animation="spin 1s linear infinite"
          />
        ) : (
          <Icon as={Link} boxSize={3} color="gray.500" />
        )}
    </Box>
  );
};

const GoogleSearchButton = ({ productName }) => {
  const handleClick = () => {
    const searchQuery = encodeURIComponent(productName);
    const googleSearchUrl = `https://www.google.com/search?q=${searchQuery}`;
    window.open(googleSearchUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Box
      as="button"
      onClick={handleClick}
      display="flex"
      alignItems="center"
      justifyContent="center"
      w="28px"
      h="28px"
      borderRadius="md"
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      _hover={{ bg: 'gray.50', borderColor: 'gray.300' }}
      _active={{ bg: 'gray.100' }}
      transition="all 0.2s"
      cursor="pointer"
      position="relative"
      title={`חיפוש בגוגל: ${productName}`}
      dir="rtl"
      style={{ direction: 'rtl' }}
    >
      <Image
        src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Google_Favicon_2025.svg/120px-Google_Favicon_2025.svg.png"
        alt="Google"
        w="16px"
        h="16px"
        objectFit="contain"
      />
    </Box>
  );
};

const SearchAlternativesButton = ({ product, onSearchAlternatives }) => {
  const handleClick = () => {
    if (onSearchAlternatives) {
      onSearchAlternatives(product);
    }
  };

  return (
    <Box
      as="button"
      onClick={handleClick}
      display="flex"
      alignItems="center"
      justifyContent="center"
      w="28px"
      h="28px"
      borderRadius="md"
      bg="blue.100"
      _hover={{ bg: 'blue.200' }}
      _active={{ bg: 'blue.300' }}
      transition="all 0.2s"
      cursor="pointer"
      position="relative"
      title={`חיפוש תחליפים ל: ${product.productName}`}
      dir="rtl"
      style={{ direction: 'rtl' }}
    >
      <Icon as={Search} boxSize={3} color="blue.600" />
    </Box>
  );
};

function App() {
  // Initialize MightyMeld
  // useEffect(() => {
  //   if (process.env.NODE_ENV === 'development') {
  //     MightyMeld.init();
  //   }
  // }, []);

  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [preview, setPreview] = useState({ isOpen: false, url: '', alt: '', loading: false });

  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [showFiltering, setShowFiltering] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilters, setActiveFilters] = useState({
    price: false, // No filters active by default
    brand: false,
    animalType: false,
    lifeStage: false,
    internalCategory: false, // No filters active by default
    mainIngredient: false,
    medicalIssue: false,
    qualityLevel: false,
    supplierName: false,
    weight: false // No filters active by default
  });
  const [varietyOnly, setVarietyOnly] = useState(true); // Toggle for variety only - default ON
  const [filters, setFilters] = useState({
    brand: [],
    animalType: [],
    lifeStage: [],
    internalCategory: [],
    mainIngredient: [],
    medicalIssue: [],
    qualityLevel: [],
    supplierName: []
  });
  const [weightUnit, setWeightUnit] = useState('ק"ג');
  const [priceRange, setPriceRange] = useState([0, 100]);
  const [weightRange, setWeightRange] = useState([0, 1]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInputValue, setSearchInputValue] = useState('');
  const [sortBy, setSortBy] = useState('similarity'); // Default sort by similarity
  const [displayLimit, setDisplayLimit] = useState(30); // Number of products to display
  const [resultsFilter, setResultsFilter] = useState(''); // Filter for results when 30+ products
  // defaultViewMode is no longer needed since we handle auto mode manually
  
  // Load saved view mode from localStorage or use default based on screen size
  const getInitialViewMode = () => {
    const savedViewMode = localStorage.getItem('petStoreViewMode');
    console.log('🎯 getInitialViewMode:', { savedViewMode, windowWidth: window.innerWidth });
    
    // Always use screen size for initial view mode
    const isMobile = window.innerWidth < 768;
    const autoMode = isMobile ? 'list' : 'grid';
    console.log('📱 Using auto mode for initial load:', autoMode, 'for screen width:', window.innerWidth);
    return autoMode;
  };
  
  const [viewMode, setViewMode] = useState(getInitialViewMode); // 'grid' or 'list' view mode
  const [debouncedResultsFilter, setDebouncedResultsFilter] = useState(''); // Debounced version for actual filtering
  
  // Don't auto-save view mode changes - only save when user manually clicks buttons
  // useEffect(() => {
  //   console.log('💾 Auto-saving view mode to localStorage:', viewMode);
  //   localStorage.setItem('petStoreViewMode', viewMode);
  // }, [viewMode]);
  
  // This useEffect is no longer needed since we handle auto mode in the resize handler

  // Auto-switch view mode based on screen size
  useEffect(() => {
    const handleResize = () => {
      const savedViewMode = localStorage.getItem('petStoreViewMode');
      console.log('🔄 Resize handler:', { 
        windowWidth: window.innerWidth, 
        savedViewMode, 
        currentViewMode: viewMode 
      });
      
      // Always auto-switch based on screen size, regardless of saved preference
      const isMobile = window.innerWidth < 768; // md breakpoint
      const newViewMode = isMobile ? 'list' : 'grid';
      
      // Only change if the new mode is different from current
      if (viewMode !== newViewMode) {
        console.log('📱 Auto-switching view mode:', { isMobile, newViewMode, reason: 'screen size change' });
        setViewMode(newViewMode);
      } else {
        console.log('📱 View mode already correct for screen size:', newViewMode);
      }
    };

    // Set initial view mode based on current screen size
    console.log('🚀 Initial resize handler call');
    handleResize();

    // Add resize listener with debouncing
    let resizeTimeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimeout);
    };
  }, []); // Remove viewMode dependency to prevent infinite loop

  // Function to handle view mode toggle
  const handleViewModeToggle = (newMode) => {
    console.log('🔘 View mode toggle clicked:', { newMode, currentViewMode: viewMode });
    setViewMode(newMode);
    // Save preference only when user manually clicks a button
    localStorage.setItem('petStoreViewMode', newMode);
    console.log('💾 Saved manual preference to localStorage');
  };




  const [isResultsFiltering, setIsResultsFiltering] = useState(false); // Loading state for results filter
  const searchInputRef = useRef(null);
  const filteringStartRef = useRef(null);
  const resultsFilterTimeoutRef = useRef(null);

  // Calculate active similarity fields based on active filters
  const activeSimilarityFields = getActiveSimilarityFields(activeFilters);

  // פונקציה לבחירת מוצר רנדומלי מתוך המוצרים במגוון
  const handleRandomProduct = useCallback(() => {
    // סינון מוצרים שיש להם participatesInVariety === 'כן'
    const varietyProducts = products.filter(product => product.participatesInVariety === 'כן');
    
    if (varietyProducts.length === 0) {
      toast({
        title: "אין מוצרים במגוון",
        description: "לא נמצאו מוצרים שמשתתפים במגוון",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    // בחירת מוצר רנדומלי
    const randomIndex = Math.floor(Math.random() * varietyProducts.length);
    const randomProduct = varietyProducts[randomIndex];
    
    // הצגת הודעה על המוצר שנבחר
    toast({
      title: "מוצר רנדומלי נבחר",
      description: randomProduct.productName,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
    
    // בחירת המוצר - העתקת הלוגיקה מ-handleSuggestionClick
    setSearchInputValue(randomProduct.productName);
    setSearchQuery('');
    
    // Show loading state immediately when product is selected
    setFiltering(true);
    setShowFiltering(true);
    filteringStartRef.current = Date.now();
    
    setSelectedProduct(randomProduct);

    // Set all filter values to the selected product's values (like in search)
    setFilters(prev => ({
      ...prev,
      brand: randomProduct.brand ? [randomProduct.brand] : [],
      animalType: randomProduct.animalType ? [randomProduct.animalType] : [],
      lifeStage: randomProduct.lifeStage ? [randomProduct.lifeStage] : [],
      internalCategory: randomProduct.internalCategory ? [randomProduct.internalCategory] : [],
      mainIngredient: randomProduct.mainIngredient ? [randomProduct.mainIngredient] : [],
      medicalIssue: randomProduct.medicalIssue ? [randomProduct.medicalIssue] : [],
      qualityLevel: randomProduct.qualityLevel ? [randomProduct.qualityLevel] : [],
      supplierName: randomProduct.supplierName ? [randomProduct.supplierName] : [],
    }));

    // Set price and weight range to product's value and value+range
    if (typeof randomProduct.salePrice === 'number') {
      let minPrice, maxPrice;
      // New tiered pricing logic based on product price
      if (randomProduct.salePrice < 25) {
        // < 25₪: ±1.5₪ range
        minPrice = Math.max(0, randomProduct.salePrice - 1.5);
        maxPrice = randomProduct.salePrice + 1.5;
      } else if (randomProduct.salePrice < 100) {
        // 25–99₪: 5₪ פחות, 10₪ יותר
        minPrice = Math.max(0, randomProduct.salePrice - 5);
        maxPrice = randomProduct.salePrice + 10;
      } else {
        // 100₪ and above: 10₪ פחות, 30₪ יותר
        minPrice = Math.max(0, randomProduct.salePrice - 10);
        maxPrice = randomProduct.salePrice + 30;
      }
      setPriceRange([minPrice, maxPrice]);
    }

    // Set weight range
    if (typeof randomProduct.weight === 'number') {
      let minWeight, maxWeight;
      if (randomProduct.weightUnit === 'גרם') {
        const grams = randomProduct.weight;
        
        if (grams <= 99) {
          minWeight = Math.max(0, grams - 10);
          maxWeight = grams + 10;
        } else if (grams <= 499) {
          minWeight = Math.max(0, grams - 50);
          maxWeight = grams + 50;
        } else if (grams <= 999) {
          minWeight = Math.max(0, grams - 100);
          maxWeight = grams + 100;
        } else {
          minWeight = Math.max(0, grams - 200);
          maxWeight = grams + 200;
        }
        
        setWeightRange([minWeight, maxWeight]);
        setWeightUnit('גרם');
      } else if (randomProduct.weightUnit === 'מ"ל' || randomProduct.weightUnit === 'ml') {
        const ml = randomProduct.weight;
        if (ml <= 99) {
          minWeight = Math.max(0, ml - 10);
          maxWeight = ml + 10;
        } else if (ml <= 499) {
          minWeight = Math.max(0, ml - 50);
          maxWeight = ml + 50;
        } else if (ml <= 999) {
          minWeight = Math.max(0, ml - 100);
          maxWeight = ml + 100;
        } else {
          minWeight = Math.max(0, ml - 200);
          maxWeight = ml + 200;
        }
        setWeightRange([minWeight, maxWeight]);
        setWeightUnit('מ"ל');
      } else if (randomProduct.weightUnit === 'מ"ג' || randomProduct.weightUnit === 'mg') {
        const mg = randomProduct.weight;
        if (mg <= 999) {
          minWeight = Math.max(0, mg - 50);
          maxWeight = mg + 50;
        } else if (mg <= 4999) {
          minWeight = Math.max(0, mg - 200);
          maxWeight = mg + 200;
        } else {
          minWeight = Math.max(0, mg - 500);
          maxWeight = mg + 500;
        }
        setWeightRange([minWeight, maxWeight]);
        setWeightUnit('מ"ג');
      } else {
        // For kg and other units
        const kg = randomProduct.weight;
        if (kg <= 0.5) {
          minWeight = Math.max(0, kg - 0.1);
          maxWeight = kg + 0.1;
        } else if (kg <= 2) {
          minWeight = Math.max(0, kg - 0.3);
          maxWeight = kg + 0.3;
        } else {
          minWeight = Math.max(0, kg - 0.5);
          maxWeight = kg + 0.5;
        }
        setWeightRange([minWeight, maxWeight]);
        setWeightUnit('ק"ג');
      }
    }

    // Set active filters - only price, weight, internalCategory, animalType, and varietyOnly
    setActiveFilters({
      price: true,
      weight: true,
      internalCategory: !!randomProduct.internalCategory,
      animalType: !!randomProduct.animalType,
      // Keep other filters inactive
      brand: false,
      lifeStage: false,
      mainIngredient: false,
      medicalIssue: false,
      qualityLevel: false,
      supplierName: false
    });
  }, [products, toast]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && (event.key === 'b' || event.key === 'נ')) {
        event.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
      
      // Clear search index shortcut (Ctrl+Shift+X)
      if (event.ctrlKey && event.shiftKey && event.key === 'X') {
        event.preventDefault();
        clearIndex().then(() => {
          toastRef.current({
            title: "אינדקס החיפוש נוקה",
            description: "בפעם הבאה ייבנה אינדקס חדש",
            status: "info",
            duration: 3000,
            isClosable: true,
          });
        });
      }
      
      // Check index status shortcut (Ctrl+Shift+S)
      if (event.ctrlKey && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        loadIndex().then((cachedIndex) => {
          if (cachedIndex) {
            const sizeInMB = (JSON.stringify(cachedIndex).length / 1024 / 1024).toFixed(2);
            toastRef.current({
              title: "אינדקס שמור נמצא",
              description: `גודל: ${sizeInMB} MB`,
              status: "success",
              duration: 3000,
              isClosable: true,
            });
          } else {
            toastRef.current({
              title: "אין אינדקס שמור",
              description: "האינדקס ייבנה בפעם הבאה",
              status: "warning",
              duration: 3000,
              isClosable: true,
            });
          }
        });
      }
      
      // Random product shortcut (Ctrl+Shift+R)
      if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        handleRandomProduct();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleRandomProduct]);

  // Load data using Web Worker for better performance
  useEffect(() => {
    console.log('🚀 useEffect loadData triggered');
    loadOrBuildIndex();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadOrBuildIndex = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try to load cached index first
        const cachedIndex = await loadIndex();
        console.log('🔍 loadIndex() returned:', cachedIndex);
        console.log('🔍 cachedIndex type:', typeof cachedIndex);
        console.log('🔍 cachedIndex is null:', cachedIndex === null);
        console.log('🔍 cachedIndex is undefined:', cachedIndex === undefined);
        if (cachedIndex) {
          console.log('🔍 cachedIndex keys:', Object.keys(cachedIndex));
          console.log('🔍 cachedIndex size:', JSON.stringify(cachedIndex).length, 'bytes');
        }
        
        // Create Web Worker for data loading
        const worker = new Worker('/data-worker.js');
        
        worker.onmessage = function(e) {
          console.log('📨 Worker message received:', e.data.type);
          console.log('📨 Full worker message:', e.data);
          if (e.data.type === 'dataLoaded') {
            const responseData = e.data.data;
            // Handle both old format (with products property) and new format (direct array)
            const products = responseData.products || responseData || [];
            if (products.length === 0) {
              setError('לא נמצאו מוצרים בקובץ הנתונים');
            } else {
              setProducts(products);
              setError(null);
              
              // Build Fuse.js index here instead of in worker
              console.log('🚀 Building Fuse.js index in main thread...');
              try {
                const Fuse = require('fuse.js');
                const fuseConfig = {
                  keys: [
                    { name: 'productName', weight: 0.7 },
                    { name: 'brand', weight: 0.5 },
                    { name: 'animalType', weight: 0.3 },
                    { name: 'mainIngredient', weight: 0.3 },
                    { name: 'sku', weight: 0.2 },
                    { name: 'barcode', weight: 0.2 }
                  ],
                  threshold: 0.3,
                  includeScore: true,
                  includeMatches: true
                };
                
                const fuseIndex = new Fuse(products, fuseConfig);
                const indexData = fuseIndex.getIndex();
                const serializableIndex = {
                  records: indexData.records,
                  keys: indexData.keys,
                  docs: indexData.docs
                };
                
                console.log('💾 Saving Fuse.js index to IndexedDB...');
                saveIndex(serializableIndex).then(() => {
                  console.log('🚀 Index saved to IndexedDB successfully');
                  toastRef.current({
                    title: "אינדקס נשמר",
                    description: "אינדקס החיפוש נשמר בדפדפן",
                    status: "success",
                    duration: 2000,
                    isClosable: true,
                  });
                }).catch(error => {
                  console.error('❌ Failed to save index:', error);
                });
              } catch (error) {
                console.error('❌ Failed to build Fuse.js index:', error);
              }
            }
            setLoading(false);
            worker.terminate();
          } else if (e.data.type === 'indexReady') {
            console.log('📥 Received indexReady message from worker');
            // Save the index to IndexedDB only if we're not skipping rebuild
            const indexData = e.data.payload;
            console.log('📥 Received index from worker, size:', JSON.stringify(indexData).length);
            console.log('📥 Index data type:', typeof indexData);
            console.log('📥 Index data keys:', Object.keys(indexData || {}));
            
            // Only save if we're not using cached index
            console.log('🔍 skipSave flag:', e.data.skipSave);
            if (!e.data.skipSave) {
              console.log('💾 Saving new index to IndexedDB...');
              saveIndex(indexData).then(() => {
                console.log('🚀 Index saved to IndexedDB');
                toastRef.current({
                  title: "אינדקס נשמר",
                  description: "אינדקס החיפוש נשמר בדפדפן",
                  status: "success",
                  duration: 2000,
                  isClosable: true,
                });
              }).catch(error => {
                console.error('❌ Failed to save index:', error);
              });
            } else {
              console.log('✅ Skipping index save - using existing cached index');
            }
          } else if (e.data.type === 'error') {
            setError('שגיאה בטעינת הנתונים');
            setLoading(false);
            worker.terminate();
          }
        };
        
        worker.onerror = function(error) {
          console.error('Worker error:', error);
          console.error('Worker error details:', error.message, error.filename, error.lineno);
          setError('שגיאה בטעינת הנתונים');
          setLoading(false);
          worker.terminate();
        };
        
        // Start loading data
        if (cachedIndex) {
          console.log('🔍 Using cached index from IndexedDB');
          console.log('🔍 Cached index size:', (JSON.stringify(cachedIndex).length / 1024 / 1024).toFixed(2), 'MB');
          toastRef.current({
            title: "טוען אינדקס שמור",
            description: "משתמש באינדקס החיפוש השמור בדפדפן",
            status: "success",
            duration: 2000,
            isClosable: true,
          });
          // Check if the cachedIndex is too large for postMessage
          const indexSize = JSON.stringify(cachedIndex).length;
          const maxSize = 10 * 1024 * 1024; // 10MB limit (reduced from 50MB)
          
          if (indexSize > maxSize) {
            console.warn('⚠️ Cached index is very large:', (indexSize / 1024 / 1024).toFixed(2), 'MB');
          }
          
          try {
            // Since we have a cached index, we can skip the worker entirely
            // and just load the products data directly
            console.log('✅ Using existing cached index, loading products directly');
            
            // Load products data directly without using worker
            const response = await fetch('/data/anipet_products_optimized.min.json.gz');
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Decompress the data directly in the main thread
            const arrayBuffer = await response.arrayBuffer();
            if (typeof pako !== 'undefined') {
              const decompressed = pako.inflate(arrayBuffer, { to: 'string' });
              const jsonData = JSON.parse(decompressed);
              
              // Transform the products data
              const allProducts = transformProducts(jsonData);
              setProducts(allProducts);
              setError(null);
              
              // Use the existing cached index
              console.log('✅ Using existing cached index, no need to rebuild');
              
              // Filter options will be automatically calculated by useMemo when products are set
              setPriceRange(getRangeValues(allProducts, 'salePrice'));
              setWeightRange(getRangeValues(allProducts, 'weight'));
              
              setLoading(false);
              worker.terminate();
            } else {
              throw new Error('pako library not available for decompression');
            }
            
          } catch (error) {
            console.error('❌ Failed to load products directly:', error);
            // Fall back to worker approach
            worker.postMessage({ type: 'loadData' });
          }
        } else {
          console.log('🚀 No cached index found, building new one');
          toastRef.current({
            title: "בונה אינדקס חדש",
            description: "זה ייקח כמה שניות בפעם הראשונה",
            status: "info",
            duration: 3000,
            isClosable: true,
          });
          worker.postMessage({ type: 'loadData' });
        }
        
      } catch (err) {
        console.error('Error setting up worker:', err);
        setError('שגיאה בטעינת הנתונים');
        setLoading(false);
      }
    };

  // Helper function to check if any filters are active - must be defined before filteredProducts
  const hasActiveFilters = useCallback(() => {
    // Check if any filters are active
    if (activeFilters.price && priceRange.length === 2 && 
        Number.isFinite(priceRange[0]) && Number.isFinite(priceRange[1])) {
      return true;
    }
    
    if (activeFilters.weight && weightRange.length === 2 && 
        Number.isFinite(weightRange[0]) && Number.isFinite(weightRange[1])) {
      return true;
    }
    
    if (activeFilters.brand && filters.brand.length > 0) {
      return true;
    }
    
    if (activeFilters.animalType && filters.animalType.length > 0) {
      return true;
    }
    
    if (activeFilters.lifeStage && filters.lifeStage.length > 0) {
      return true;
    }
    
    if (activeFilters.internalCategory && filters.internalCategory.length > 0) {
      return true;
    }
    
    if (activeFilters.mainIngredient && filters.mainIngredient.length > 0) {
      return true;
    }
    
    if (activeFilters.medicalIssue && filters.medicalIssue.length > 0) {
      return true;
    }
    
    if (activeFilters.qualityLevel && filters.qualityLevel.length > 0) {
      return true;
    }
    
    if (activeFilters.supplierName && filters.supplierName.length > 0) {
      return true;
    }
    
    return false;
  }, [activeFilters, priceRange, weightRange, filters]);

  // Helper function to check if we should show the initial message
  const shouldShowInitialMessage = useCallback(() => {
    return !selectedProduct && !hasActiveFilters();
  }, [selectedProduct, hasActiveFilters]);

  // Optimized filtered products with debouncing
  const [debouncedFilters, setDebouncedFilters] = useState({
    activeFilters: {},
    priceRange: [0, 100],
    weightRange: [0, 1],
    weightUnit: 'ק"ג',
    filters: {},
    selectedProduct: null,
    varietyOnly: true
  });

  // Optimized debounce filter changes
  const debouncedFilterUpdate = useCallback(
    (filters) => {
      setDebouncedFilters(filters);
    },
    []
  );

  useEffect(() => {
    // 🚨 אם אין מוצר נבחר וגם אין פילטרים — אין צורך לחשב
    if (!selectedProduct && !hasActiveFilters()) {
      return;
    }
    
    // מציגים טעינה רק אם יש פילטרים פעילים או מוצר נבחר
    const shouldShowFiltering = hasActiveFilters() || selectedProduct || varietyOnly;
    if (shouldShowFiltering) {
      setFiltering(true);
      filteringStartRef.current = Date.now();
      setShowFiltering(true);
    }
    debouncedFilterUpdate({
      activeFilters,
      priceRange,
      weightRange,
      weightUnit,
      filters,
      selectedProduct,
      varietyOnly
    });
  }, [activeFilters, priceRange, weightRange, weightUnit, filters, selectedProduct, varietyOnly, debouncedFilterUpdate, hasActiveFilters]);

  // Debounce results filter separately for better performance
  useEffect(() => {
    if (resultsFilterTimeoutRef.current) {
      clearTimeout(resultsFilterTimeoutRef.current);
    }
    
    // Show loading state when user is typing
    if (resultsFilter !== debouncedResultsFilter) {
      setIsResultsFiltering(true);
    }
    
    resultsFilterTimeoutRef.current = setTimeout(() => {
      setDebouncedResultsFilter(resultsFilter);
      setIsResultsFiltering(false);
    }, 50); // MUCH FASTER - reduced from 200ms to 50ms

    return () => {
      if (resultsFilterTimeoutRef.current) {
        clearTimeout(resultsFilterTimeoutRef.current);
      }
    };
  }, [resultsFilter, debouncedResultsFilter, isResultsFiltering]);

  // Memoize search results for typing (lightweight, no heavy calculations)
  const searchResults = useMemo(() => {
    if (!products.length || searchQuery.length < 3) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 searchResults: early return', { productsLength: products.length, searchQueryLength: searchQuery.length });
      }
      return [];
    }
    const searchTerm = searchQuery.toLowerCase();
    let results = products.filter(product => 
      product.productName.toLowerCase().includes(searchTerm) ||
      product.brand.toLowerCase().includes(searchTerm) ||
      product.originalWeight?.toLowerCase().includes(searchTerm) ||
      product.animalType.toLowerCase().includes(searchTerm) ||
      product.internalCategory.toLowerCase().includes(searchTerm)
    );
    
    // Apply variety filter to search results as well (since varietyOnly is the default behavior)
    if (varietyOnly) {
      results = results.filter(product => product.participatesInVariety === 'כן');
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 searchResults computed:', { searchTerm, resultsLength: results.length, varietyOnly, firstResult: results[0]?.productName });
    }
    return results;
  }, [products, searchQuery, varietyOnly]);

  // Check if we should compute filtered products
  const shouldComputeFilteredProducts = !!selectedProduct || hasActiveFilters();
  
  // Debug log to verify optimization is working
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 shouldComputeFilteredProducts:', shouldComputeFilteredProducts, {
      selectedProduct: !!selectedProduct,
      hasActiveFilters: hasActiveFilters(),
      searchQuery: searchQuery,
      searchQueryLength: searchQuery.length,
      searchResultsLength: searchResults.length
    });
  }

  // Memoize filtered products to avoid recalculating on every render
  const filteredProducts = useMemo(() => {
    // Early return if no need to compute
    if (!shouldComputeFilteredProducts) {
      return [];
    }
    if (!products.length) return [];
    if (process.env.NODE_ENV === 'development') {
      console.time('filteredProducts-calculation');
    }
    let filtered = products;
    
    // Apply active filters with safety checks (only when filters are active)
    if (debouncedFilters.activeFilters.price && debouncedFilters.priceRange.length === 2 && 
        Number.isFinite(debouncedFilters.priceRange[0]) && Number.isFinite(debouncedFilters.priceRange[1])) {
      console.time('price-filter');
      filtered = filtered.filter(product => {
        return product.salePrice >= debouncedFilters.priceRange[0] && product.salePrice <= debouncedFilters.priceRange[1];
      });
      console.timeEnd('price-filter');
    }
    
    if (debouncedFilters.activeFilters.weight && debouncedFilters.weightRange.length === 2 && 
        Number.isFinite(debouncedFilters.weightRange[0]) && Number.isFinite(debouncedFilters.weightRange[1])) {
      console.time('weight-filter');
      filtered = filtered.filter(product => {
        // Safety check for product weight
        if (!Number.isFinite(product.weight)) {
          return false;
        }
        
        // Simplified weight filtering - only filter if units match or if weight is in kg
        let passes = false;
        if (debouncedFilters.weightUnit === 'גרם') {
          // Product weight is already in grams, no conversion needed
          passes = product.weight >= debouncedFilters.weightRange[0] && product.weight <= debouncedFilters.weightRange[1];
        } else if (debouncedFilters.weightUnit === 'ml') {
          // Product weight is already in ml, no conversion needed
          passes = product.weight >= debouncedFilters.weightRange[0] && product.weight <= debouncedFilters.weightRange[1];
        } else {
          // For kg and other units, use the stored weight directly
          passes = product.weight >= debouncedFilters.weightRange[0] && product.weight <= debouncedFilters.weightRange[1];
        }
        
        return passes;
      });
      console.timeEnd('weight-filter');
    }
    
    if (debouncedFilters.activeFilters.brand && debouncedFilters.filters.brand.length > 0) {
      console.time('brand-filter');
      filtered = filtered.filter(product => {
        return debouncedFilters.filters.brand.includes(product.brand);
      });
      console.timeEnd('brand-filter');
    }
    
    if (debouncedFilters.activeFilters.animalType && debouncedFilters.filters.animalType.length > 0) {
      console.time('animalType-filter');
      filtered = filtered.filter(product => {
        return debouncedFilters.filters.animalType.includes(product.animalType);
      });
      console.timeEnd('animalType-filter');
    }
    
    if (debouncedFilters.activeFilters.lifeStage && debouncedFilters.filters.lifeStage.length > 0) {
      console.time('lifeStage-filter');
      filtered = filtered.filter(product => {
        return debouncedFilters.filters.lifeStage.includes(product.lifeStage);
      });
      console.timeEnd('lifeStage-filter');
    }
    
    if (debouncedFilters.activeFilters.internalCategory && debouncedFilters.filters.internalCategory.length > 0) {
      console.time('internalCategory-filter');
      filtered = filtered.filter(product => {
        return debouncedFilters.filters.internalCategory.includes(product.internalCategory);
      });
      console.timeEnd('internalCategory-filter');
    }
    
    if (debouncedFilters.activeFilters.mainIngredient && debouncedFilters.filters.mainIngredient.length > 0) {
      console.time('mainIngredient-filter');
      filtered = filtered.filter(product => debouncedFilters.filters.mainIngredient.includes(product.mainIngredient));
      console.timeEnd('mainIngredient-filter');
    }
    
    if (debouncedFilters.activeFilters.medicalIssue && debouncedFilters.filters.medicalIssue.length > 0) {
      console.time('medicalIssue-filter');
      filtered = filtered.filter(product => debouncedFilters.filters.medicalIssue.includes(product.medicalIssue));
      console.timeEnd('medicalIssue-filter');
    }
    
    if (debouncedFilters.activeFilters.supplierName && debouncedFilters.filters.supplierName.length > 0) {
      console.time('supplierName-filter');
      filtered = filtered.filter(product => {
        return debouncedFilters.filters.supplierName.includes(product.supplierName);
      });
      console.timeEnd('supplierName-filter');
    }
    
    if (debouncedFilters.activeFilters.qualityLevel && debouncedFilters.filters.qualityLevel.length > 0) {
      console.time('qualityLevel-filter');
      filtered = filtered.filter(product => debouncedFilters.filters.qualityLevel.includes(product.qualityLevel));
      console.timeEnd('qualityLevel-filter');
    }
    
    // Apply variety filter - if varietyOnly is true, show only products that participate in variety
    if (debouncedFilters.varietyOnly) {
      if (process.env.NODE_ENV === 'development') {
        console.time('variety-filter');
      }
      filtered = filtered.filter(product => product.participatesInVariety === 'כן');
      if (process.env.NODE_ENV === 'development') {
        console.timeEnd('variety-filter');
      }
    }
    
    // Apply results filter if filter is active (works for any number of products)
    if (debouncedResultsFilter.trim()) {
      console.time('results-filter');
      const filterTerm = debouncedResultsFilter.toLowerCase();
      filtered = filtered.filter(product => 
        product.productName.toLowerCase().includes(filterTerm) ||
        product.brand.toLowerCase().includes(filterTerm) ||
        product.animalType.toLowerCase().includes(filterTerm) ||
        product.internalCategory.toLowerCase().includes(filterTerm) ||
        product.mainIngredient?.toLowerCase().includes(filterTerm) ||
        product.medicalIssue?.toLowerCase().includes(filterTerm) ||
        product.qualityLevel?.toLowerCase().includes(filterTerm) ||
        product.supplierName?.toLowerCase().includes(filterTerm)
      );
      console.timeEnd('results-filter');
    }
    
    // Show products when filters are active OR when a product is selected
    if (hasActiveFilters()) {
      // If filters are active, show filtered products (with or without selected product)
      
      if (debouncedFilters.selectedProduct) {
        console.time('similarity-calculation');
        // If a product is also selected, apply similarity filtering
        // CRITICAL FIX: Always ensure the selected product is included BEFORE applying similarity filtering
        // Check if the selected product is already in the filtered results
        const selectedProductInResults = filtered.find(product => 
          (normalizeId(product.sku) && normalizeId(debouncedFilters.selectedProduct?.sku) && normalizeId(product.sku) === normalizeId(debouncedFilters.selectedProduct.sku)) ||
          (normalizeId(product.barcode) && normalizeId(debouncedFilters.selectedProduct?.barcode) && normalizeId(product.barcode) === normalizeId(debouncedFilters.selectedProduct.barcode))
        );
        
        // If selected product is not in filtered results, add it at the beginning
        if (!selectedProductInResults) {
          filtered.unshift(debouncedFilters.selectedProduct);
        }
        
        // Calculate similarity scores for all products
        filtered.forEach(product => {
          if (product === debouncedFilters.selectedProduct) {
            product.similarityScore = 100;
          } else {
            product.similarityScore = calculateSimilarity(product, debouncedFilters.selectedProduct, activeSimilarityFields);
          }
        });
        
        // Sort by similarity score (highest first)
        filtered.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));
        
        // Ensure the selected product is always included, but don't limit the total results here
        // The limiting will be done in the render phase using displayLimit
        const selectedProductInSorted = filtered.find(product => 
          (normalizeId(product.sku) && normalizeId(debouncedFilters.selectedProduct?.sku) && normalizeId(product.sku) === normalizeId(debouncedFilters.selectedProduct.sku)) ||
          (normalizeId(product.barcode) && normalizeId(debouncedFilters.selectedProduct?.barcode) && normalizeId(product.barcode) === normalizeId(debouncedFilters.selectedProduct.barcode))
        );
        
        if (selectedProductInSorted) {
          // Remove the selected product temporarily
          const selectedProductIndex = filtered.findIndex(product => 
            (normalizeId(product.sku) && normalizeId(debouncedFilters.selectedProduct?.sku) && normalizeId(product.sku) === normalizeId(debouncedFilters.selectedProduct.sku)) ||
            (normalizeId(product.barcode) && normalizeId(debouncedFilters.selectedProduct?.barcode) && normalizeId(product.barcode) === normalizeId(debouncedFilters.selectedProduct.barcode))
          );
          const selectedProduct = filtered.splice(selectedProductIndex, 1)[0];
          
          // Add selected product back at the beginning without limiting
          filtered = [selectedProduct, ...filtered];
        }
        console.timeEnd('similarity-calculation');
        // Don't limit filtered results here - let the render phase handle displayLimit
      }
      // If no product is selected but filters are active, just show the filtered products
      // (no similarity calculation needed)
    } else if (debouncedFilters.selectedProduct && !hasActiveFilters()) {
      // If a product is selected but no filters are active, show only the selected product
      // This ensures the source product always appears
      filtered = [debouncedFilters.selectedProduct];
      
      // Set similarity score for the source product
      filtered.forEach(product => {
        if (product === debouncedFilters.selectedProduct) {
          product.similarityScore = 100;
        }
      });
    } else {
      // If no product is selected and no filters are active, don't show any products
      // Show initial message instead
      filtered = [];
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.timeEnd('filteredProducts-calculation');
    }
    return filtered;
  }, [
    shouldComputeFilteredProducts,
    products, 
    hasActiveFilters,
    debouncedFilters.activeFilters,
    debouncedFilters.priceRange,
    debouncedFilters.weightRange,
    debouncedFilters.weightUnit,
    debouncedFilters.filters,
    debouncedFilters.selectedProduct,
    debouncedFilters.varietyOnly,
    debouncedResultsFilter,
    activeSimilarityFields
  ]);

  // Use filteredProducts when filters are active or product is selected
  // Search results are only shown in the Autocomplete dropdown, not in the main grid
  const displayProducts = useMemo(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Using filteredProducts:', filteredProducts.length, 'results');
    }
    return filteredProducts;
  }, [filteredProducts]);

  // Sort filtered products based on selected sort option
  // For RTL layout: highest/best values should appear on the right side
  const sortedProducts = useMemo(() => {
    if (!displayProducts.length) return [];
    
    // Separate source product from other products for sorting
    let sourceProduct = null;
    const otherProducts = [...displayProducts];
    
    if (selectedProduct) {
      const sourceProductIndex = otherProducts.findIndex(product => 
        (normalizeId(product.sku) && normalizeId(selectedProduct.sku) && normalizeId(product.sku) === normalizeId(selectedProduct.sku)) ||
        (normalizeId(product.barcode) && normalizeId(selectedProduct.barcode) && normalizeId(product.barcode) === normalizeId(selectedProduct.barcode))
      );
      
      if (sourceProductIndex >= 0) {
        sourceProduct = otherProducts.splice(sourceProductIndex, 1)[0];
      }
    }
    
    // Sort only the other products (not the source product)
    try {
      let sortedOtherProducts;
      switch (sortBy) {
        case 'similarity':
          sortedOtherProducts = otherProducts.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));
          break;
        case 'price-low-high':
          // Sort by price (lowest first)
          sortedOtherProducts = otherProducts.sort((a, b) => (a.salePrice || 0) - (b.salePrice || 0));
          break;
        case 'price-high-low':
          // Sort by price (highest first)
          sortedOtherProducts = otherProducts.sort((a, b) => (b.salePrice || 0) - (a.salePrice || 0));
          break;
        case 'name-a-z':
          // Sort by product name (A to Z)
          sortedOtherProducts = otherProducts.sort((a, b) => {
            const nameA = (a.productName || '').toLowerCase();
            const nameB = (b.productName || '').toLowerCase();
            return nameA.localeCompare(nameB, 'he');
          });
          break;
        case 'name-z-a':
          // Sort by product name (Z to A)
          sortedOtherProducts = otherProducts.sort((a, b) => {
            const nameA = (a.productName || '').toLowerCase();
            const nameB = (b.productName || '').toLowerCase();
            return nameB.localeCompare(nameA, 'he');
          });
          break;
        default:
          sortedOtherProducts = otherProducts.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));
      }
      
      // Put source product first, then sorted other products
      let result = sourceProduct ? [sourceProduct, ...sortedOtherProducts] : sortedOtherProducts;
      
      // Sort by variety participation and inactive products
      // This applies to both autocomplete and product cards
      result = result.sort((a, b) => {
        // First priority: variety participation - products with "כן" first
        const aInVariety = a.participatesInVariety === 'כן';
        const bInVariety = b.participatesInVariety === 'כן';
        
        if (aInVariety && !bInVariety) return -1; // a comes first
        if (!aInVariety && bInVariety) return 1;  // b comes first
        
        // Second priority: "לא פעיל" products should be last
        const aIsInactive = a.productName && a.productName.includes('לא פעיל');
        const bIsInactive = b.productName && b.productName.includes('לא פעיל');
        
        if (aIsInactive && !bIsInactive) return 1;  // a (inactive) comes last
        if (!aIsInactive && bIsInactive) return -1; // b (inactive) comes last
        return 0; // keep original order if same priority
      });
      
      return result;
    } catch (error) {
      console.error('Sorting error:', error);
      return displayProducts; // Return unsorted if there's an error
    }
  }, [displayProducts, sortBy, selectedProduct]);

  // Clear filtering state when filtering is complete, but ensure minimum display time
  useEffect(() => {
    // מסיים טעינה כאשר יש תוצאות או אין פילטרים פעילים
    if (sortedProducts.length > 0 || (!selectedProduct && !hasActiveFilters())) {
      const elapsed = Date.now() - (filteringStartRef.current || 0);
      const minDisplay = 400;
      const remaining = Math.max(0, minDisplay - elapsed);
      const timer = setTimeout(() => {
        setFiltering(false);
        setShowFiltering(false);
      }, remaining);
      return () => clearTimeout(timer);
    }
  }, [sortedProducts, selectedProduct, hasActiveFilters]);

  // Function to load more products
  const loadMoreProducts = useCallback(() => {
    setDisplayLimit(prev => prev + 30);
  }, []);

  // Reset display limit when filters change (but not on search query changes)
  useEffect(() => {
    setDisplayLimit(30);
  }, [
    debouncedFilters.activeFilters,
    debouncedFilters.priceRange,
    debouncedFilters.weightRange,
    debouncedFilters.weightUnit,
    debouncedFilters.filters,
    debouncedFilters.selectedProduct,
    debouncedFilters.varietyOnly,
    debouncedResultsFilter
  ]);

  // Memoize similar products calculation (commented out for now)
  // const similarProducts = useMemo(() => {
  //   return getSimilarProducts(selectedProduct);
  // }, [selectedProduct, getSimilarProducts]);



  // When a product is selected, set the weight unit and range appropriately
  // This useEffect is now handled in handleSuggestionClick to avoid conflicts

  // When switching units, convert the range accordingly
  // This useEffect is now handled in handleSuggestionClick to avoid conflicts

  // For the slider min/max, use the product or all products depending on context
  let minWeight, maxWeight;
  if (selectedProduct && typeof selectedProduct.weight === 'number') {
    if (weightUnit === 'גרם' && selectedProduct.weightUnit === 'גרם') {
      const grams = selectedProduct.weight; // Weight is already in grams
      minWeight = grams - 100;
      maxWeight = grams + 100;
    } else {
      minWeight = Math.max(0, selectedProduct.weight - 0.2);
      maxWeight = selectedProduct.weight + 0.2;
    }
  } else if (products.length > 0) {
    if (weightUnit === 'גרם') {
      const gramsArr = products.map(p => p.weight).filter(Number.isFinite);
      minWeight = gramsArr.length ? Math.max(0, Math.min(...gramsArr) - 100) : 0;
      maxWeight = gramsArr.length ? Math.max(...gramsArr) + 100 : 1000;
    } else {
      const weights = products.map(p => p.weight).filter(Number.isFinite);
      minWeight = weights.length ? Math.max(0, Math.min(...weights) - 0.2) : 0;
      maxWeight = weights.length ? Math.max(...weights) + 0.2 : 1;
    }
  } else {
            minWeight = 0;
        if (weightUnit === 'גרם') {
          maxWeight = 1000;
        } else if (weightUnit === 'ליטר' || weightUnit === 'ml') {
          maxWeight = 1000;
        } else if (weightUnit === 'מ"ג') {
          maxWeight = 1000;
        } else {
          maxWeight = 100; // ק"ג
        }
  }
  minWeight = Number.isFinite(minWeight) ? minWeight : 0;
  maxWeight = Number.isFinite(maxWeight) ? maxWeight : (weightUnit === 'גרם' ? 1000 : 1);



  const getRangeValues = (data, field) => {
    // Safety check for data
    if (!Array.isArray(data) || data.length === 0) {
      return { min: 0, max: 100 };
    }
    
    let min = Infinity;
    let max = -Infinity;
    
    for (let i = 0; i < data.length; i++) {
      const value = data[i][field];
      if (Number.isFinite(value)) {
        if (value < min) min = value;
        if (value > max) max = value;
      }
    }
    
    return {
      min: min === Infinity ? 0 : min,
      max: max === -Infinity ? 100 : max
    };
  };

  // Calculate min/max price for slider bounds
  let minPrice, maxPrice;
  if (selectedProduct && typeof selectedProduct.salePrice === 'number') {
    const priceBuffer = Math.max(1, selectedProduct.salePrice * 0.2);
    minPrice = Math.max(0, selectedProduct.salePrice - priceBuffer);
    maxPrice = selectedProduct.salePrice + priceBuffer;
  } else if (products.length > 0) {
    const priceRangeObj = getRangeValues(products, 'salePrice');
    minPrice = Math.max(0, priceRangeObj.min - 5);
    maxPrice = Math.min(priceRangeObj.max + 10, 1000);
  } else {
    minPrice = 0;
    maxPrice = 100;
  }
  minPrice = Number.isFinite(minPrice) ? minPrice : 0;
  maxPrice = Number.isFinite(maxPrice) ? maxPrice : 100;

  // Add final fallback for all min/max values before passing to slider/input
  const safeMinWeight = Number.isFinite(minWeight) ? minWeight : 0;
      const safeMaxWeight = Number.isFinite(maxWeight) ? maxWeight : (
      weightUnit === 'גרם' || weightUnit === 'ליטר' || weightUnit === 'ml' || weightUnit === 'מ"ג' ? 1000 : 100
    );
  const safeMinPrice = Number.isFinite(minPrice) ? minPrice : 0;
  const safeMaxPrice = Number.isFinite(maxPrice) ? maxPrice : 100;

  // Add guards for minValue and maxValue for both price and weight sliders
  const safeMinPriceValue = Number.isFinite(priceRange[0]) ? priceRange[0] : safeMinPrice;
  const safeMaxPriceValue = Number.isFinite(priceRange[1]) ? priceRange[1] : safeMaxPrice;
  const safeMinWeightValue = Number.isFinite(weightRange[0]) ? weightRange[0] : safeMinWeight;
  const safeMaxWeightValue = Number.isFinite(weightRange[1]) ? weightRange[1] : safeMaxWeight;

  // Memoize unique values for filters (commented out for now)
  // const uniqueValues = useMemo(() => ({
  //   brands: getUniqueValues(products, 'brand'),
  //   animalTypes: getUniqueValues(products, 'animalType'),
  //   lifeStages: getUniqueValues(products, 'lifeStage'),
  //   internalCategories: getUniqueValues(products, 'internalCategory'),
  //   mainIngredients: getUniqueValues(products, 'mainIngredient'),
  //   medicalIssues: getUniqueValues(products, 'medicalIssue')
  // }), [products]);

  // Memoize unique options for dropdowns with better performance
  const filterOptions = useMemo(() => {
    if (!products.length) {
      return {
        brands: [],
        animalTypes: [],
        lifeStages: [],
        internalCategories: [],
        mainIngredients: [],
        medicalIssues: [],
        qualityLevels: [],
        supplierNames: []
      };
    }
    
    // Use a single pass through the data to collect all unique values
    const brands = new Set();
    const animalTypes = new Set();
    const lifeStages = new Set();
    const internalCategories = new Set();
    const mainIngredients = new Set();
    const medicalIssues = new Set();
    const qualityLevels = new Set();
    const supplierNames = new Set();
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      if (product.brand) brands.add(product.brand);
      if (product.animalType) animalTypes.add(product.animalType);
      if (product.lifeStage) lifeStages.add(product.lifeStage);
      if (product.internalCategory) internalCategories.add(product.internalCategory);
      if (product.mainIngredient) mainIngredients.add(product.mainIngredient);
      if (product.medicalIssue) medicalIssues.add(product.medicalIssue);
      if (product.qualityLevel) qualityLevels.add(product.qualityLevel);
      if (product.supplierName) supplierNames.add(product.supplierName);
    }
    
    return {
      brands: Array.from(brands).sort(),
      animalTypes: Array.from(animalTypes).sort(),
      lifeStages: Array.from(lifeStages).sort(),
      internalCategories: Array.from(internalCategories).sort(),
      mainIngredients: Array.from(mainIngredients).sort(),
      medicalIssues: Array.from(medicalIssues).sort(),
      qualityLevels: Array.from(qualityLevels).sort(),
      supplierNames: Array.from(supplierNames).sort()
    };
  }, [products]);

  // Debounced search function using Fuse.js with precomputed index (commented out for now)
  // const debouncedSearch = useRef(null);
  
  // const handleSearch = useCallback((query) => {
  //   setSearchQuery(query);
    
  //   // Clear previous timeout
  //   if (debouncedSearch.current) {
  //     clearTimeout(debouncedSearch.current);
  //   }
    
  //   // Set new timeout for debounced search
  //   debouncedSearch.current = setTimeout(() => {
  //     if (!query.trim() || !products.length) {
  //       setSuggestions([]);
  //       return;
  //     }
      
  //     // Use precomputed index for faster search
  //     const fuse = new Fuse(products, {
  //       keys: ['productName', 'brand', 'animalType', 'internalCategory'],
  //       threshold: 0.3,
  //       includeScore: true,
  //       minMatchCharLength: 2
  //     }, searchIndex || undefined);
      
  //     const results = fuse.search(query);
  //     const suggestions = results
  //       .slice(0, 10)
  //       .map(result => ({
  //         ...result.item,
  //         matchScore: Math.round((1 - result.score) * 100)
  //       }));
      
  //     setSuggestions(suggestions);
  //   }, 300); // 300ms delay
  // }, [products, searchIndex]);

  // Cleanup timeout on unmount (commented out since debouncedSearch is not used)
  // useEffect(() => {
  //   return () => {
  //     if (debouncedSearch.current) {
  //       clearTimeout(debouncedSearch.current);
  //     }
  //   };
  // }, []);

  const handleSearchInputChange = useCallback((value) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 handleSearchInputChange called:', { value, length: value.length });
    }
    setSearchInputValue(value);
    setSearchQuery(value); // עדכן גם את searchQuery לחיפוש בזמן הקלדה
    
    // 🚨 אם המשתמש מקליד — מבטל את המוצר שנבחר
    if (value.length >= 1) {
      setSelectedProduct(null);
    }
  }, [setSelectedProduct]);

  const handleSuggestionClick = useCallback((product) => {
    // Update search input value with product name
    setSearchInputValue(product.productName);
    
    // Clear search query when product is selected
    setSearchQuery('');
    
    // Show loading state immediately when product is selected
    setFiltering(true);
    setShowFiltering(true);
    filteringStartRef.current = Date.now();
    
    setSelectedProduct(product);

    // Set all filter values to the selected product's values
    setFilters(prev => ({
      ...prev,
      brand: product.brand ? [product.brand] : [],
      animalType: product.animalType ? [product.animalType] : [],
      lifeStage: product.lifeStage ? [product.lifeStage] : [],
      internalCategory: product.internalCategory ? [product.internalCategory] : [],
      mainIngredient: product.mainIngredient ? [product.mainIngredient] : [],
      medicalIssue: product.medicalIssue ? [product.medicalIssue] : [],
      qualityLevel: product.qualityLevel ? [product.qualityLevel] : [],
      supplierName: product.supplierName ? [product.supplierName] : [],
    }));

    // Set price and weight range to product's value and value+range
    if (typeof product.salePrice === 'number') {
      let minPrice, maxPrice;
      // New tiered pricing logic based on product price
      if (product.salePrice < 25) {
        // < 25₪: ±1.5₪ range
        minPrice = Math.max(0, product.salePrice - 1.5);
        maxPrice = product.salePrice + 1.5;
      } else if (product.salePrice < 100) {
        // 25–99₪: 5₪ פחות, 10₪ יותר
        minPrice = Math.max(0, product.salePrice - 5);
        maxPrice = product.salePrice + 10;
      } else {
        // 100₪ and above: 10₪ פחות, 30₪ יותר
        minPrice = Math.max(0, product.salePrice - 10);
        maxPrice = product.salePrice + 30;
      }
      setPriceRange([minPrice, maxPrice]);
    }

    // --- NEW LOGIC FOR WEIGHT RANGE ---
    if (typeof product.weight === 'number') {
      let minWeight, maxWeight;
      if (product.weightUnit === 'גרם') {
        const grams = product.weight; // Weight is already in grams
        
        if (grams <= 99) {
          minWeight = Math.max(0, grams - 10);
          maxWeight = grams + 10;
        } else if (grams <= 499) {
          minWeight = Math.max(0, grams - 50);
          maxWeight = grams + 50;
        } else if (grams <= 999) {
          minWeight = Math.max(0, grams - 100);
          maxWeight = grams + 100;
        } else {
          // For 1000g and above, use larger buffer
          minWeight = Math.max(0, grams - 200);
          maxWeight = grams + 200;
        }
        
        setWeightRange([minWeight, maxWeight]);
        setWeightUnit('גרם');
      } else if (
        product.weightUnit === 'מ"ל' ||
        product.weightUnit === 'ml'
      ) {
        // For milliliters, treat similar to grams
        const ml = product.weight; // Weight is already in ml
        if (ml <= 99) {
          minWeight = Math.max(0, ml - 10);
          maxWeight = ml + 10;
        } else if (ml <= 499) {
          minWeight = Math.max(0, ml - 50);
          maxWeight = ml + 50;
        } else if (ml <= 999) {
          minWeight = Math.max(0, ml - 100);
          maxWeight = ml + 100;
        } else {
          // For 1000ml and above, use larger buffer
          minWeight = Math.max(0, ml - 200);
          maxWeight = ml + 200;
        }
        setWeightRange([minWeight, maxWeight]);
        setWeightUnit('מ"ל');
      } else if (
        product.weightUnit === 'מ"ג' ||
        product.weightUnit === 'mg'
      ) {
        // For milligrams, treat similar to grams but with smaller buffer
        const mg = product.weight; // Weight is already in mg
        if (mg <= 999) {
          minWeight = Math.max(0, mg - 100);
          maxWeight = mg + 100;
        } else if (mg <= 9999) {
          minWeight = Math.max(0, mg - 500);
          maxWeight = mg + 500;
        } else {
          minWeight = Math.max(0, mg - 1000);
          maxWeight = mg + 1000;
        }
        setWeightRange([minWeight, maxWeight]);
        setWeightUnit('מ"ג');
      } else if (product.weightUnit === 'ק"ג' || product.weightUnit === 'ק"ג' || product.weightUnit === 'kg') {
        const kg = product.weight;
        if (kg <= 10) {
          minWeight = Math.max(0, kg - 2.5);
          maxWeight = kg + 2.5;
        } else if (kg <= 20) {
          minWeight = Math.max(0, kg - 4);
          maxWeight = kg + 4;
        } else if (kg <= 50) {
          minWeight = Math.max(0, kg - 6);
          maxWeight = kg + 6;
        } else if (kg <= 100) {
          minWeight = Math.max(0, kg - 11);
          maxWeight = kg + 11;
        } else {
          minWeight = Math.max(0, kg - 16);
          maxWeight = kg + 16;
        }
        setWeightRange([minWeight, maxWeight]);
        setWeightUnit('ק"ג');
      } else {
        // fallback: ±10% of weight
        minWeight = Math.max(0, product.weight * 0.9);
        maxWeight = product.weight * 1.1;
        setWeightRange([minWeight, maxWeight]);
      }
    } else {
      setWeightRange([0, 1000]);
      setWeightUnit('גרם');
    }

    // Only activate the default filters
    const newActiveFilters = {
      price: true,
      weight: true,
      animalType: true,
      internalCategory: true,
      brand: false,
      lifeStage: false,
      mainIngredient: false,
      medicalIssue: false,
      supplierName: false,
      qualityLevel: false
    };
    setActiveFilters(newActiveFilters);
  }, []);

  // Image preview functions
  const handleOpenPreview = useCallback((url, alt, product) => {
    const fullSizeUrl = getFullSizeImageUrl(url);
    console.log('🖼️ Opening image preview:', { 
      original: url, 
      fullSize: fullSizeUrl,
      isDifferent: url !== fullSizeUrl,
      product: product?.productName
    });
    setPreview({ isOpen: true, url: fullSizeUrl, alt, product, loading: true });
    setTimeout(() => {
      setPreview(prev => ({ ...prev, loading: false }));
    }, 100);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreview({ isOpen: false, url: '', alt: '', product: null, loading: false });
  }, []);



  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && preview.isOpen) {
        handleClosePreview();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [preview.isOpen, handleClosePreview]);

  // Clean up any existing modals on mount
  useEffect(() => {
    // Remove any existing Chakra modals that might be stuck
    const existingModals = document.querySelectorAll('.chakra-modal__overlay, .chakra-modal__content');
    existingModals.forEach(modal => modal.remove());
  }, []);

  // Ensure single image display when preview opens
  useEffect(() => {
    if (preview.isOpen) {
      // Remove any duplicate images with the same src
      const images = document.querySelectorAll('img[src="' + preview.url + '"]');
      if (images.length > 1) {
        // Keep only the first one
        for (let i = 1; i < images.length; i++) {
          images[i].remove();
        }
      }
    }
  }, [preview.isOpen, preview.url]);

  // Force Masonry layout update when products change
  useEffect(() => {
    if (sortedProducts.length > 0) {
      // Force Masonry to recalculate layout
      setTimeout(() => {
        const masonryGrid = document.querySelector('.my-masonry-grid');
        if (masonryGrid) {
          console.log('Forcing Masonry layout update');
          // Trigger a resize event to force Masonry to recalculate
          window.dispatchEvent(new Event('resize'));
          
          // Also try to force a reflow
          masonryGrid.style.display = 'none';
          void masonryGrid.offsetHeight; // Force reflow
          masonryGrid.style.display = 'flex';
        }
      }, 100);
    }
  }, [sortedProducts.length]);

  // Additional Masonry layout update when window resizes
  useEffect(() => {
    const handleResize = () => {
      if (sortedProducts.length > 0) {
        const masonryGrid = document.querySelector('.my-masonry-grid');
        if (masonryGrid) {
          console.log('Window resize - updating Masonry layout');
          // Force Masonry to recalculate layout
          setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
          }, 50);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sortedProducts.length]);

  // Force Masonry layout update when component mounts
  useEffect(() => {
    if (sortedProducts.length > 0) {
      // Force Masonry to recalculate layout after component mounts
      setTimeout(() => {
        const masonryGrid = document.querySelector('.my-masonry-grid');
        if (masonryGrid) {
          console.log('Component mount - updating Masonry layout');
          // Force Masonry to recalculate layout
          window.dispatchEvent(new Event('resize'));
        }
      }, 200);
    }
  }, [sortedProducts.length]);





  const handleFilterChange = useCallback((filterName, value) => {
    setFilters(prev => {
      const newFilters = {
        ...prev,
        [filterName]: value
      };
      return newFilters;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    // Clear search query
    setSearchQuery('');
    
    // Clear results filter
    setResultsFilter('');
    setDebouncedResultsFilter('');
    setIsResultsFiltering(false);
    
    // Clear Autocomplete component
    if (searchInputRef.current && searchInputRef.current.clear) {
      searchInputRef.current.clear();
    }
    
    // Clear all filter selections
    setFilters({
      brand: [],
      animalType: [],
      lifeStage: [],
      internalCategory: [],
      mainIngredient: [],
      medicalIssue: [],
      qualityLevel: [],
      supplierName: []
    });
    
    // Reset to safe default ranges based on actual data
    if (products.length > 0) {
      const priceRangeObj = getRangeValues(products, 'salePrice');
      const weightRangeObj = getRangeValues(products, 'weight');
      
      // Set price range to actual data range with small buffer
      setPriceRange([
        Math.max(0, priceRangeObj.min - 5),
        Math.min(priceRangeObj.max + 10, 1000)
      ]);
      
      // Set weight range based on current unit
      if (weightUnit === 'גרם' || weightUnit === 'ml' || weightUnit === 'מ"ג') {
        // Convert kg to grams/ml/mg
        setWeightRange([
          Math.max(0, weightRangeObj.min * 1000 - 100),
          weightRangeObj.max * 1000 + 100
        ]);
      } else {
        // Keep in kg
        setWeightRange([
          Math.max(0, weightRangeObj.min - 0.2),
          weightRangeObj.max + 0.2
        ]);
      }
    } else {
      // Fallback to safe defaults if no data
      setPriceRange([0, 100]);
      setWeightRange(weightUnit === 'גרם' || weightUnit === 'ml' || weightUnit === 'מ"ג' ? [0, 1000] : [0, 1]);
    }
    
    // Clear selected product
    setSelectedProduct(null);
    
    // Reset active filters to ALL FALSE - no filters should be active after clearing
    setActiveFilters({
      price: false,
      brand: false,
      animalType: false,
      lifeStage: false,
      internalCategory: false,
      mainIngredient: false,
      medicalIssue: false,
      qualityLevel: false,
      supplierName: false,
      weight: false
    });

    // Reset sort to similarity only when clearing all filters
    setSortBy('similarity');
  }, [products, weightUnit]);

  const handleFilterShortcutSelect = useCallback(({ type, value }) => {
    // Clear all filters except the one being set
    setFilters(prev => {
      const cleared = Object.fromEntries(Object.keys(prev).map(k => [k, []]));
      return { ...cleared, [type]: [value] };
    });
    setActiveFilters(prev => {
      const cleared = Object.fromEntries(Object.keys(prev).map(k => [k, false]));
      return { ...cleared, [type]: true };
    });
    setSelectedProduct(null); // Don't select a product
    setSearchQuery(''); // Clear search query
    setResultsFilter(''); // Clear results filter
    setDebouncedResultsFilter(''); // Clear debounced results filter
    setIsResultsFiltering(false); // Clear loading state
    // Optionally scroll to product list
    setTimeout(() => {
      const mainContent = document.querySelector('#main-product-list, .main-product-list');
      if (mainContent) mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  }, []);



  return (
    <Box minH="100vh" bg="gray.50" dir="rtl">
      {/* Header */}
      <Box as="header" bg="white" boxShadow="sm" borderBottom="1px solid" borderColor="gray.200">
        <Container maxW="7xl" px={4} py={3}>
          <Flex align="center" justify="space-between">
            <Flex direction="column" align="flex-start" gap={0}>
              <Flex align="center" gap={3} cursor="pointer" onClick={() => window.location.reload()} _hover={{ opacity: 0.8 }}>
                <Image 
                  src="/icon-96.png" 
                  alt="אניפט לוגו" 
                  width="80px" 
                  height="80px" 
                  objectFit="contain"
                />
                <Flex direction="column" align="center" gap={1} transform="translateY(-7px)">
                  <Flex align="flex-end" gap={2}>
                    <Heading 
                      as="h1" 
                      size="2xl" 
                      bgGradient="linear(to-b,rgb(203, 219, 159),rgb(164, 179, 132))"
                      bgClip="text"
                      fontWeight="900" 
                    >
                      אניפט
                    </Heading>
                    <Badge 
                      colorScheme="orange" 
                      variant="solid" 
                      fontSize="xs" 
                      px={2} 
                      py={1} 
                      borderRadius="full"
                      transform="translateY(-8px)"
                      fontWeight="bold"
                    >
                      בטא
                    </Badge>
                  </Flex>
                  <Text fontSize="28.5px" fontWeight="600" color="#14662C" lineHeight="0.8">
                    חיפוש תחליפים
                  </Text>
                </Flex>
              </Flex>
            </Flex>
            <Flex align="center" spacing={4}>
              {selectedProduct ? (
                <Flex align="center" spacing={2}>
                  <Text fontSize="sm" color="brand.600" fontWeight="medium">
                    מוצרים דומים ל: {selectedProduct.productName}
                  </Text>
                  <Button
                    onClick={() => {
                      setSelectedProduct(null);
                      // Clear search query
                      setSearchQuery('');
                      // Clear results filter
                      setResultsFilter('');
                      setDebouncedResultsFilter('');
                      setIsResultsFiltering(false);
                      // Clear Autocomplete component
                      if (searchInputRef.current && searchInputRef.current.clear) {
                        searchInputRef.current.clear();
                      }
                      // Also clear all filters to show initial state
                      setFilters({
                        brand: [],
                        animalType: [],
                        lifeStage: [],
                        internalCategory: [],
                        mainIngredient: [],
                        medicalIssue: [],
                        qualityLevel: [],
                        supplierName: []
                      });
                      setActiveFilters({
                        price: false,
                        brand: false,
                        animalType: false,
                        lifeStage: false,
                        internalCategory: false,
                        mainIngredient: false,
                        medicalIssue: false,
                        qualityLevel: false,
                        supplierName: false,
                        weight: false
                      });
                    }}
                    size="xs"
                    variant="ghost"
                    color="gray.500"
                    _hover={{ color: 'gray.700' }}
                  >
                    ✕ נקה
                  </Button>
                </Flex>
              ) : (
                <Text fontSize="sm" color="gray.600">
                  {loading ? 'טוען...' : 
                   hasActiveFilters() && selectedProduct ? 
                   `נמצאו ${sortedProducts.length} מוצרים דומים` : 
                   hasActiveFilters() ? 
                   `נמצאו ${sortedProducts.length} מוצרים` : 
                   selectedProduct ? 
                   `נמצאו ${sortedProducts.length} מוצרים דומים` :
                   'חפש מוצר להתחיל או הפעל פילטרים'}
                </Text>
              )}
            </Flex>
          </Flex>
        </Container>
      </Box>

      <Container maxW="7xl" px={4} py={4}>
        <Flex direction={{ base: 'column', lg: 'row' }} gap={6}>
          {/* Sidebar Filters */}
          <Box w={{ base: 'full', lg: '380px' }} flexShrink={0}>
            <Box
              bg="white"
              borderRadius="lg"
              boxShadow="sm"
              p={4}
              position="sticky"
              top={4}
              opacity={loading ? 0.5 : 1}
              pointerEvents={loading ? 'none' : 'auto'}
            >
              <Flex align="center" justify="space-between" mb={4}>
                <Heading as="h2" size="md" color="gray.900" display="flex" alignItems="center">
                  <Icon as={Filter} boxSize={5} ml={2} />
                  פילטרים
                </Heading>
                <Flex gap={2}>
                  <Button
                    onClick={clearAllFilters}
                    size="sm"
                    variant="ghost"
                    color="brand.600"
                    _hover={{ color: 'brand.800' }}
                  >
                    נקה הכל
                  </Button>
                  <Tooltip label="נקה אינדקס החיפוש השמור (Ctrl+Shift+X)" placement="top">
                    <Button
                      onClick={async () => {
                        await clearIndex();
                        toast({
                          title: "אינדקס החיפוש נוקה",
                          description: "בפעם הבאה ייבנה אינדקס חדש",
                          status: "info",
                          duration: 3000,
                          isClosable: true,
                        });
                      }}
                      size="sm"
                      variant="ghost"
                      color="orange.600"
                      _hover={{ color: 'orange.800' }}
                      onKeyDown={(e) => {
                        if (e.ctrlKey && e.shiftKey && e.key === 'X') {
                          e.preventDefault();
                          e.target.click();
                        }
                      }}
                    >
                      🗑️
                    </Button>
                  </Tooltip>
                  <Tooltip label="בדוק מצב האינדקס (Ctrl+Shift+S)" placement="top">
                    <Button
                      onClick={async () => {
                        const cachedIndex = await loadIndex();
                        if (cachedIndex) {
                          const sizeInMB = (JSON.stringify(cachedIndex).length / 1024 / 1024).toFixed(2);
                          toast({
                            title: "אינדקס שמור נמצא",
                            description: `גודל: ${sizeInMB} MB`,
                            status: "success",
                            duration: 3000,
                            isClosable: true,
                          });
                        } else {
                          toast({
                            title: "אין אינדקס שמור",
                            description: "האינדקס ייבנה בפעם הבאה",
                            status: "warning",
                            duration: 3000,
                            isClosable: true,
                          });
                        }
                      }}
                      size="sm"
                      variant="ghost"
                      color="blue.600"
                      _hover={{ color: 'blue.800' }}
                      onKeyDown={(e) => {
                        if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                          e.preventDefault();
                          e.target.click();
                        }
                      }}
                    >
                      🔍
                    </Button>
                  </Tooltip>
                  <Tooltip label="בחר מוצר רנדומלי במגוון (Ctrl+Shift+R)" placement="top">
                    <Button
                      onClick={handleRandomProduct}
                      size="sm"
                      variant="ghost"
                      color="purple.600"
                      _hover={{ color: 'purple.800' }}
                      onKeyDown={(e) => {
                        if (e.ctrlKey && e.shiftKey && e.key === 'R') {
                          e.preventDefault();
                          e.target.click();
                        }
                      }}
                    >
                      🎲
                    </Button>
                  </Tooltip>
                </Flex>
              </Flex>

              {/* חיפוש */}
              <Box mb={4}>
                <Suspense fallback={<LoadingFallback message="טוען חיפוש..." />}>
                  <Autocomplete
                    ref={searchInputRef}
                    products={products}
                    onProductSelect={handleSuggestionClick}
                    onFilterShortcutSelect={handleFilterShortcutSelect}
                    placeholder="חיפוש"
                    disabled={loading}
                    value={searchInputValue}
                    onChange={handleSearchInputChange}
                  />
                </Suspense>
              </Box>

              {/* All filters in accordion */}
              <Accordion allowMultiple defaultIndex={[]}>
                <AccordionFilter
                  label="מחיר"
                  icon={DollarSign}
                  value={priceRange[0] !== priceRange[1] ? [`₪${Number(priceRange[0]).toFixed(1)} - ₪${Number(priceRange[1]).toFixed(1)}`] : []}
                  options={[]}
                  onChange={() => {}}
                  enabled={activeFilters.price}
                  onToggleEnabled={() => setActiveFilters(f => ({ ...f, price: !f.price }))}
                  colorScheme="cyan"
                  customContent={
                    <DropdownRangeSlider
                      min={safeMinPrice}
                      max={safeMaxPrice}
                      value={[safeMinPriceValue, safeMaxPriceValue]}
                      onChange={([min, max]) => setPriceRange([min, max])}
                      step={1}
                      unit="₪"
                      label="טווח מחירים"
                      disabled={!activeFilters.price}
                      colorScheme="cyan"
                    />
                  }
                />
                <AccordionFilter
                  label="משקל"
                  icon={Scale}
                  value={weightRange[0] !== weightRange[1] ? [(() => {
                    // Show the weight range directly without conversion
                    return `${weightRange[0]} - ${weightRange[1]} ${weightUnit}`;
                  })()] : []}
                  options={[]}
                  onChange={() => {}}
                  enabled={activeFilters.weight}
                  onToggleEnabled={() => setActiveFilters(f => ({ ...f, weight: !f.weight }))}
                  colorScheme="teal"
                  customContent={
                    <DropdownRangeSlider
                      min={safeMinWeight}
                      max={safeMaxWeight}
                      value={[safeMinWeightValue, safeMaxWeightValue]}
                      onChange={([min, max]) => {
                        setWeightRange([min, max]);
                      }}
                      step={weightUnit === 'גרם' || weightUnit === 'ליטר' || weightUnit === 'ml' || weightUnit === 'מ"ג' ? 1 : 0.01}
                      unit={weightUnit}
                      label="טווח משקל"
                      disabled={!activeFilters.weight}
                      weightUnit={weightUnit}
                      onWeightUnitChange={setWeightUnit}
                      isWeightSlider={true}
                      colorScheme="teal"
                    />
                  }
                />
                <AccordionFilter
                  label="קטגוריה"
                  icon={Folder}
                  value={filters.internalCategory}
                  options={filterOptions.internalCategories}
                  onChange={value => handleFilterChange('internalCategory', value)}
                  multi
                  enabled={activeFilters.internalCategory}
                  onToggleEnabled={() => setActiveFilters(f => ({ ...f, internalCategory: !f.internalCategory }))}
                  colorScheme="orange"
                />
                <AccordionFilter
                  label="קבוצה"
                  icon={Dog}
                  value={filters.animalType}
                  options={filterOptions.animalTypes}
                  onChange={value => handleFilterChange('animalType', value)}
                  multi
                  enabled={activeFilters.animalType}
                  onToggleEnabled={() => setActiveFilters(f => ({ ...f, animalType: !f.animalType }))}
                  colorScheme="green"
                />
                <AccordionFilter
                  label="מותג"
                  icon={Tag}
                  value={filters.brand}
                  options={filterOptions.brands}
                  onChange={value => handleFilterChange('brand', value)}
                  multi
                  enabled={activeFilters.brand}
                  onToggleEnabled={() => setActiveFilters(f => ({ ...f, brand: !f.brand }))}
                  colorScheme="blue"
                />
                <AccordionFilter
                  label="גיל"
                  icon={Baby}
                  value={filters.lifeStage}
                  options={filterOptions.lifeStages}
                  onChange={value => handleFilterChange('lifeStage', value)}
                  multi
                  enabled={activeFilters.lifeStage}
                  onToggleEnabled={() => setActiveFilters(f => ({ ...f, lifeStage: !f.lifeStage }))}
                  colorScheme="purple"
                />
                <AccordionFilter
                  label="ספק"
                  icon={Package}
                  value={filters.supplierName}
                  options={filterOptions.supplierNames}
                  onChange={value => handleFilterChange('supplierName', value)}
                  multi
                  enabled={activeFilters.supplierName}
                  onToggleEnabled={() => setActiveFilters(f => ({ ...f, supplierName: !f.supplierName }))}
                  colorScheme="teal"
                />
                <AccordionFilter
                  label="מרכיב עיקרי"
                  icon={Utensils}
                  value={filters.mainIngredient}
                  options={filterOptions.mainIngredients}
                  onChange={value => handleFilterChange('mainIngredient', value)}
                  multi
                  enabled={activeFilters.mainIngredient}
                  onToggleEnabled={() => setActiveFilters(f => ({ ...f, mainIngredient: !f.mainIngredient }))}
                  colorScheme="red"
                />
                <AccordionFilter
                  label="בעיה רפואית"
                  icon={HeartCrack}
                  value={filters.medicalIssue}
                  options={filterOptions.medicalIssues}
                  onChange={value => handleFilterChange('medicalIssue', value)}
                  multi
                  enabled={activeFilters.medicalIssue}
                  onToggleEnabled={() => setActiveFilters(f => ({ ...f, medicalIssue: !f.medicalIssue }))}
                  colorScheme="purple"
                  customColor="#D6BCFA"
                />
                <AccordionFilter
                  label="איכות"
                  icon={Star}
                  value={filters.qualityLevel}
                  options={filterOptions.qualityLevels}
                  onChange={value => handleFilterChange('qualityLevel', value)}
                  multi
                  enabled={activeFilters.qualityLevel}
                  onToggleEnabled={() => setActiveFilters(f => ({ ...f, qualityLevel: !f.qualityLevel }))}
                  colorScheme="yellow"
                />
              </Accordion>
              
              {/* Variety Toggle Switch */}
              <Box mt={4} p={3} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
                <Flex align="center" justify="space-between">
                  <Text fontSize="sm" fontWeight="medium" color="gray.700">במגוון</Text>
                  <Switch
                    isChecked={varietyOnly}
                    onChange={(e) => setVarietyOnly(e.target.checked)}
                    colorScheme="green"
                    size="md"
                  />
                </Flex>
              </Box>
            </Box>
          </Box>

          {/* Main Content */}
          <Box flex={1}>
            {/* Loading State */}
            {loading && <LoadingSpinner />}
            
            {/* Error State */}
            {error && (
              <Flex direction="column" align="center" py={12}>
                <Text fontSize="6xl" color="red.400" mb={4}>⚠️</Text>
                <Heading as="h3" size="lg" color="gray.900" mb={2}>שגיאה בטעינת הנתונים</Heading>
                <Text color="gray.500" mb={4}>{error}</Text>
                <Button 
                  onClick={() => window.location.reload()} 
                  colorScheme="brand"
                  size="md"
                >
                  נסה שוב
                </Button>
              </Flex>
            )}
            
            {/* Products Grid */}
            {!loading && !error && (
              <>
                {/* Show initial message when no product is selected and no filters are active */}
                {shouldShowInitialMessage() && (
                  <Flex direction="column" align="center" justify="center" minH="400px">
                    <Box 
                      mb={4}
                      cursor="pointer"
                      onClick={() => {
                        // console.log('GIF clicked!');
                        // console.log('searchInputRef.current:', searchInputRef.current);
                        if (searchInputRef.current && searchInputRef.current.focus) {
                          // console.log('Calling focus...');
                          searchInputRef.current.focus();
                        } else {
                          // console.log('Focus method not available');
                        }
                      }}
                      _hover={{ transform: 'scale(1.05)' }}
                      transition="transform 0.2s"
                      display="inline-block"
                    >
                      <Image
                        src="/default.gif"
                        alt="Choose a product to start"
                        width="160px"
                        height="160px"
                        objectFit="contain"
                        pointerEvents="none"
                      />
                    </Box>
                    <Heading as="h3" size="lg" color="gray.900" mb={2}>בחר מוצר בכדי להתחיל</Heading>
                    <Text color="gray.500">חפש מוצר כדי לראות מוצרים דומים</Text>
                  </Flex>
                )}
                
                {/* Show products when filters are active OR when a product is selected */}
                {(hasActiveFilters() || selectedProduct) && (
                  <>
                    {/* Filtering loading state - show when filtering or when product was just selected */}
                    {(showFiltering || filtering) && (
                      <DogLoadingAnimation title="מסנן מוצרים" subtitle="אנא המתן..." />
                    )}
                    
                    {/* Show products when not filtering */}
                    {!filtering && !showFiltering && (
                      <>
                        {sortedProducts.length > 0 ? (
                          <Box dir="rtl" style={{ direction: 'rtl' }}>
                            {/* Debug: Print final rendered list (commented out to reduce console spam) */}
                            {/* {(() => {
                              console.log('Final products to render:', sortedProducts.map(p => ({
                                name: p.productName,
                                barcode: p.barcode,
                                similarity: p.similarityScore,
                                isSelected: selectedProduct && ((normalizeId(p.sku) && normalizeId(selectedProduct.sku) && normalizeId(p.sku) === normalizeId(selectedProduct.sku)) ||
                                           (normalizeId(p.barcode) && normalizeId(selectedProduct.barcode) && normalizeId(p.barcode) === normalizeId(selectedProduct.barcode)))
                              })));
                              return null;
                            })()} */}
                            {/* Sorting Dropdown and Results Filter */}
                            <Flex 
                              direction={{ base: 'column', sm: 'row' }} 
                              justify="flex-end" 
                              align={{ base: 'stretch', sm: 'center' }} 
                              gap={4}
                              mb={4} 
                              px={2}
                            >
                              {/* Results Filter - always show */}
                              <Flex align="center" gap={2}>
                                <Icon as={Search} boxSize={4} color="gray.500" />
                                <Text fontSize="sm" color="gray.600" fontWeight="medium">סנן לפי:</Text>
                                <Input
                                  placeholder={isResultsFiltering ? "מסנן..." : "סנן תוצאות..."}
                                  value={resultsFilter}
                                  onChange={(e) => {
                                    // console.log('🔍 [DEBUG] Input onChange triggered:', {
                                    //   value: e.target.value,
                                    //   timestamp: Date.now()
                                    // });
                                    setResultsFilter(e.target.value);
                                  }}
                                  size="sm"
                                  flex="0 0 auto"
                                  width={{ base: "100%", sm: "200px" }}
                                  bg="white"
                                  borderColor={isResultsFiltering ? "brand.400" : "gray.300"}
                                  _hover={{ borderColor: isResultsFiltering ? "brand.500" : "gray.400" }}
                                  _focus={{ borderColor: 'brand.500', boxShadow: 'outline' }}
                                  dir="rtl"
                                  style={{ direction: 'rtl', paddingRight: '1em' }}
                                  key={`results-filter-${sortedProducts.length}`} // Force re-render when product count changes
                                />
                              </Flex>
                              
                              <Flex align="center" gap={2}>
                                <Icon as={ArrowDownUp} boxSize={4} color="gray.500" />
                                <Text fontSize="sm" color="gray.600" fontWeight="medium">מיין לפי:</Text>
                                <Select
                                  value={sortBy}
                                  onChange={(e) => setSortBy(e.target.value)}
                                  size="sm"
                                  width={{ base: "100%", sm: "auto" }}
                                  minWidth={{ base: "100%", sm: "200px" }}
                                  bg="white"
                                  borderColor="gray.300"
                                  _hover={{ borderColor: 'gray.400' }}
                                  dir="rtl"
                                  style={{ direction: 'rtl', paddingRight: '2em' }} // Added paddingRight for text indent
                                >
                                  <option value="similarity">התאמה</option>
                                  <option value="price-low-high">מחיר נמוך לגבוה</option>
                                  <option value="price-high-low">מחיר גבוה לנמוך</option>
                                  <option value="name-a-z">שם: א-ת</option>
                                  <option value="name-z-a">שם: ת-א</option>
                                </Select>
                              </Flex>
                              
                                                              {/* View Mode Toggle */}
                              <Flex align="center" gap={1} direction="column">
                                <Flex align="center" gap={1}>
                                  <Tooltip label="תצוגת רשת" placement="top" maxW="100px" offset={[0, 8]}>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      color={viewMode === 'grid' ? 'brand.600' : 'gray.500'}
                                      bg={viewMode === 'grid' ? 'brand.50' : 'transparent'}
                                      onClick={() => handleViewModeToggle('grid')}
                                      _hover={{ bg: viewMode === 'grid' ? 'brand.100' : 'gray.100' }}
                                      px={2.5}
                                      py={1.5}
                                      minW="auto"
                                      h="auto"
                                      border="1px solid"
                                      borderColor="gray.200"
                                    >
                                      <LayoutGrid size={17} />
                                    </Button>
                                  </Tooltip>
                                  <Tooltip label="תצוגת רשימה" placement="top" maxW="100px" offset={[0, 8]}>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      color={viewMode === 'list' ? 'brand.600' : 'gray.500'}
                                      bg={viewMode === 'list' ? 'brand.50' : 'transparent'}
                                      onClick={() => handleViewModeToggle('list')}
                                      _hover={{ bg: viewMode === 'list' ? 'brand.100' : 'gray.100' }}
                                      px={2.5}
                                      py={1.5}
                                      minW="auto"
                                      h="auto"
                                      border="1px solid"
                                      borderColor="gray.200"
                                    >
                                      <StretchHorizontal size={17} />
                                    </Button>
                                  </Tooltip>
                                </Flex>

                              </Flex>
                            </Flex>
                            {/* כאן לא יוצג SimilarityBreakdownBar */}
                            <Suspense fallback={<LoadingFallback message="טוען מוצרים..." size="md" />}>
                              <Box dir="rtl" style={{ direction: 'rtl' }}>
                                {(() => {
                                console.time('products-render');
                                const productsToRender = sortedProducts.slice(0, displayLimit);
                                console.log(`Rendering ${productsToRender.length} products`);
                                
                                                                                                // Use Masonry with proper RTL layout
                                console.log(`Using Masonry for ${productsToRender.length} products`);
                                
                                const breakpointColumns = {
                                  default: 3,
                                  1100: 2,
                                  700: 1
                                };
                                
                                const result = viewMode === 'grid' ? (
                                  <Box>
                                    <Masonry
                                      breakpointCols={breakpointColumns}
                                      className="my-masonry-grid"
                                      columnClassName="my-masonry-grid_column"
                                      style={{
                                        direction: 'rtl',
                                        textAlign: 'right'
                                      }}
                                    >
                                      {productsToRender.map((product, index) => (
                                        <Box 
                                          key={`${product.sku || 'no-sku'}-${product.barcode || 'no-barcode'}-${index}`}
                                          style={{
                                            direction: 'rtl',
                                            textAlign: 'right'
                                          }}
                                        >
                                          <ProductCard
                                            product={product}
                                            index={index}
                                            selectedProduct={selectedProduct}
                                            activeFilters={debouncedFilters.activeFilters}
                                            onOpenPreview={handleOpenPreview}
                                            onSearchAlternatives={handleSuggestionClick}
                                            viewMode={viewMode}
                                          />
                                        </Box>
                                      ))}
                                    </Masonry>
                                  </Box>
                                ) : (
                                  <VStack spacing={3} align="stretch">
                                    {productsToRender.map((product, index) => (
                                      <Box 
                                        key={`${product.sku || 'no-sku'}-${product.barcode || 'no-barcode'}-${index}`}
                                        style={{
                                          direction: 'rtl',
                                          textAlign: 'right'
                                        }}
                                      >
                                        <ProductCard
                                          product={product}
                                          index={index}
                                          selectedProduct={selectedProduct}
                                          activeFilters={debouncedFilters.activeFilters}
                                          onOpenPreview={handleOpenPreview}
                                          onSearchAlternatives={handleSuggestionClick}
                                          viewMode={viewMode}
                                        />
                                      </Box>
                                    ))}
                                  </VStack>
                                );
                                  
                                  console.timeEnd('products-render');
                                  return result;
                              })()}
                            </Box>
                            </Suspense>
                            
                            {/* Load More Button */}
                            {sortedProducts.length > displayLimit && (
                              <Flex direction="column" align="center" mt={6} mb={4} spacing={3}>
                                <Text color="gray.600" fontSize="sm" mb={2}>
                                  מוצגים {Math.min(displayLimit, sortedProducts.length)} מתוך {sortedProducts.length} מוצרים
                                  {displayLimit < sortedProducts.length && (
                                    <Text as="span" color="brand.500" fontWeight="medium">
                                      {' '}(+{Math.min(30, sortedProducts.length - displayLimit)} נוספים זמינים)
                                    </Text>
                                  )}
                                </Text>
                                <Button
                                  onClick={loadMoreProducts}
                                  colorScheme="brand"
                                  size="lg"
                                  px={8}
                                  py={3}
                                  borderRadius="lg"
                                  boxShadow="md"
                                  _hover={{
                                    transform: 'translateY(-2px)',
                                    boxShadow: 'lg'
                                  }}
                                  _active={{
                                    transform: 'translateY(0px)',
                                    boxShadow: 'md'
                                  }}
                                  transition="all 0.2s"
                                  dir="rtl"
                                  style={{ direction: 'rtl' }}

                                >
                                  טען עוד מוצרים
                                </Button>
                              </Flex>
                            )}
                          </Box>
                        ) : (
                          <Flex direction="column" align="center" py={12}>
                            <Text fontSize="6xl" color="gray.400" mb={4}>🔍</Text>
                            <Heading as="h3" size="lg" color="gray.900" mb={2}>
                              {selectedProduct && !hasActiveFilters() ? 'לא נמצאו מוצרים דומים' : 'לא נמצאו מוצרים'}
                            </Heading>
                            <Text color="gray.500">נסה לשנות את הפילטרים או החיפוש</Text>
                          </Flex>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </Box>
        </Flex>
      </Container>

      {/* Image Preview Modal */}
      {preview.isOpen && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(0, 0, 0, 0.7)"
          zIndex={1400}
          display="flex"
          justifyContent="center"
          alignItems="center"
          onClick={handleClosePreview}
        >
          <Box
            position="relative"
            bg="white"
            borderRadius="lg"
            maxW="90vw"
            maxH="90vh"
            overflow="visible"
            display="inline-flex"
            justifyContent="center"
            alignItems="center"
            alignSelf="center"
            onClick={(e) => e.stopPropagation()}
            className="custom-modal-container"
          >
            {preview.loading ? (
              <Box textAlign="center" color="gray.500" p={8}>
                <Spinner size="lg" color="brand.500" mb={4} />
                <Text fontSize="lg" mb={2}>טוען תמונה...</Text>
                <Text fontSize="sm" color="blue.500" fontFamily="monospace">{preview.url}</Text>
              </Box>
            ) : (
              <Image
                key={`preview-${preview.url}`}
                src={preview.url}
                alt={preview.alt}
                objectFit="contain"
                maxW="90vw"
                maxH="90vh"
                borderRadius="lg"
                onError={(e) => {
                  console.error('❌ Image failed to load:', preview.url);
                  // Show fallback text
                  const fallback = document.createElement('div');
                  fallback.innerHTML = `
                    <div style="
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      justify-content: center;
                      height: 200px;
                      color: #666;
                      text-align: center;
                      font-family: Arial, sans-serif;
                    ">
                      <div style="font-size: 48px; margin-bottom: 16px;">🖼️</div>
                      <div style="font-size: 16px; margin-bottom: 8px;">לא ניתן לטעון את התמונה</div>
                      <div style="font-size: 12px; color: #999;">${preview.url}</div>
                    </div>
                  `;
                  e.target.parentNode.appendChild(fallback);
                  e.target.style.display = 'none';
                }}
                onLoad={(e) => {
                  console.log('✅ Image loaded successfully:', preview.url);
                }}
              />
            )}
            {/* Product Info */}
            {preview.product && (
              <Box
                position="absolute"
                bottom="4px"
                left="4px"
                right="4px"
                bg="blackAlpha.700"
                color="white"
                p={3}
                borderRadius="md"
                fontSize="sm"
                textAlign="center"
                maxW="90vw"
                overflow="hidden"
                dir="rtl"
                style={{ direction: 'rtl', textAlign: 'right' }}
              >
                <Text fontWeight="bold" mb={1} noOfLines={1}>
                  {preview.product.productName}
                </Text>
                <Flex justify="space-between" align="center" fontSize="xs">
                  <Text>₪{preview.product.salePrice?.toFixed(2) || '0.00'}</Text>
                  <Text>
                    {preview.product.barcode && `ברקוד: ${preview.product.barcode}`}
                    {preview.product.sku && preview.product.sku !== preview.product.barcode && 
                      ` | מק"ט: ${preview.product.sku}`}
                  </Text>
                </Flex>
              </Box>
            )}
            <IconButton
              icon={<X />}
              onClick={handleClosePreview}
              position="absolute"
              top="4px"
              right="4px"
              zIndex={1}
              colorScheme="blackAlpha"
              size="sm"
              borderRadius="full"
              aria-label="סגור"
            />
          </Box>
        </Box>
      )}

    </Box>
  );
}

export default App;