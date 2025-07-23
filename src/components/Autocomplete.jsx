import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { debounce } from 'lodash';
import { Search, Tag, Building2, Baby, Folder, FolderOpen, Utensils, HeartCrack, Star } from 'lucide-react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Spinner,
  Image,
  Skeleton,
  Button,
} from '@chakra-ui/react';

  // Optimized highlight function with single regex pass
  const highlightText = (text, searchTerm) => {
    if (!text || !searchTerm) return text;
    
    const searchWords = searchTerm.toLowerCase().split(/\s/).filter(word => word.length > 0);
    if (searchWords.length === 0) return text;
    
    // Simple highlighting without complex regex
    let highlightedText = text;
    searchWords.forEach(word => {
      const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark style="background-color: #fef08a;">$1</mark>');
    });
    
    return highlightedText;
  };

// Web Worker for search operations - OPTIMIZED
const createSearchWorker = () => {
  const workerCode = `
    let products = [];
    let searchIndex = new Map(); // Pre-built search index for faster lookups
    let filterIndex = new Map(); // Index for all filter shortcuts
    let searchCache = new Map(); // Cache for search results
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL
    
    // Build search index for faster lookups
    function buildSearchIndex() {
      console.time('build-search-index');
      searchIndex.clear();
      filterIndex.clear();
      
      // Only index if we have products
      if (!products || products.length === 0) {
        console.timeEnd('build-search-index');
        return;
      }
      
      // Process all products at once for now (simpler)
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const searchableText = [
          product.productName?.toLowerCase(),
          product.brand?.toLowerCase(),
          product.originalWeightText?.toLowerCase(),
          product.sku?.toLowerCase(),
          product.barcode?.toLowerCase()
        ].filter(Boolean).join(' ');
        
        // Index by words (only words with 3+ characters for better precision)
        const words = searchableText.split(/\\s/).filter(word => word.length >= 3);
        words.forEach(word => {
          // Index the full word
          if (!searchIndex.has(word)) {
            searchIndex.set(word, new Set());
          }
          searchIndex.get(word).add(i);
          
          // Only index prefixes for autocomplete (3-6 characters max)
          for (let j = 3; j <= Math.min(word.length, 6); j++) {
            const prefix = word.substring(0, j);
            if (!searchIndex.has(prefix)) {
              searchIndex.set(prefix, new Set());
            }
            searchIndex.get(prefix).add(i);
          }
        });
        
        // Index all filter values for shortcuts
        const filterFields = [
          { field: 'brand', type: 'brand', label: 'מותג' },
          { field: 'supplierName', type: 'supplierName', label: 'ספק' },
          { field: 'lifeStage', type: 'lifeStage', label: 'גיל' },
          { field: 'animalType', type: 'parentCategory', label: 'קבוצה' }, // שימוש ב-animalType במקום parentCategory
          { field: 'internalCategory', type: 'internalCategory', label: 'קטגוריה' },
          { field: 'mainIngredient', type: 'mainIngredient', label: 'מרכיב עיקרי' },
          { field: 'medicalIssue', type: 'medicalIssue', label: 'בעיה רפואית' },
          { field: 'qualityLevel', type: 'qualityLevel', label: 'איכות' }
        ];
        
        filterFields.forEach(({ field, type, label }) => {
          if (product[field]) {
            const valueLower = product[field].toLowerCase();
            const key = \`\${type}:\${valueLower}\`;
            
            if (!filterIndex.has(key)) {
              filterIndex.set(key, {
                type: type,
                value: product[field],
                label: label,
                count: 0
              });
            }
            filterIndex.get(key).count++;
          }
        });
      }
      
      console.timeEnd('build-search-index');
      console.log('Search index built successfully with', searchIndex.size, 'entries');
    }
    
    // Cache management functions
    function getCachedResult(query) {
      const cached = searchCache.get(query);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }
      return null;
    }
    
    function setCachedResult(query, data) {
      searchCache.set(query, {
        data: data,
        timestamp: Date.now()
      });
    }
    
    function clearExpiredCache() {
      const now = Date.now();
      for (const [key, value] of searchCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          searchCache.delete(key);
        }
      }
    }
    
    // Find matching filter shortcuts
    function findFilterShortcuts(query) {
      const shortcuts = [];
      const q = query.toLowerCase().trim();
      
      if (q.length < 2) return shortcuts;
      
      filterIndex.forEach((filterData, key) => {
        if (filterData.value.toLowerCase().includes(q) && filterData.count > 0) {
          shortcuts.push({
            type: filterData.type,
            value: filterData.value,
            count: filterData.count,
            displayText: \`\${filterData.value} (\${filterData.label})\`
          });
        }
      });
      
      // Sort by relevance (exact matches first, then by count)
      shortcuts.sort((a, b) => {
        const aExact = a.value.toLowerCase() === q;
        const bExact = b.value.toLowerCase() === q;
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        return b.count - a.count;
      });
      
      return shortcuts.slice(0, 5); // Limit to 5 shortcuts
    }
    
    // Fast brand pre-search using pre-built index
    function searchBrands(query) {
      const q = query.toLowerCase().trim();
      const brandMatches = [];
      
      // Use pre-built brand index from filterIndex
      filterIndex.forEach((filterData, key) => {
        if (key.startsWith('brand:') && filterData.value.toLowerCase().includes(q)) {
          // Find all products with this brand using the search index
          const brandKey = 'brand:' + filterData.value.toLowerCase();
          if (searchIndex.has(brandKey)) {
            searchIndex.get(brandKey).forEach(index => {
              const product = products[index];
              brandMatches.push({
                product: product,
                index: index,
                relevance: calculateRelevance(product, q)
              });
            });
          }
        }
      });
      
      return brandMatches.sort((a, b) => b.relevance - a.relevance);
    }
    
    // Optimized search function with caching
    function searchProducts(query) {
      const timerName = 'worker-search-' + Date.now();
      console.time(timerName);
      
      if (!query || query.length < 3) {
        console.timeEnd(timerName);
        return { results: [], shortcuts: [] };
      }
      
      // Preprocess query: trim, lowercase, remove extra spaces, normalize Hebrew
      const q = query
        .trim()
        .toLowerCase()
        .replace(/\\s/g, ' ') // Replace multiple spaces with single space
        .replace(/[\u0590-\u05FF]/g, (char) => {
          // Normalize Hebrew characters (remove nikud if present)
          return char.normalize('NFD').replace(/[\u0591-\u05C7]/g, '');
        });
      
      // Early return for very short queries
      if (q.length < 3) {
        console.timeEnd(timerName);
        return { results: [], shortcuts: [] };
      }
      
      // Check cache first
      const cachedResult = getCachedResult(q);
      if (cachedResult) {
        console.log('Cache hit for query:', q);
        console.timeEnd(timerName);
        return cachedResult;
      }
      
      // Clear expired cache entries periodically
      if (Math.random() < 0.05) { // 5% chance to clean cache (less frequent)
        clearExpiredCache();
      }
      
      // First, try fast brand search
      const brandMatches = searchBrands(q);
      if (brandMatches.length > 0) {
        console.timeEnd(timerName);
        const shortcuts = findFilterShortcuts(q);
        return {
          results: brandMatches.map(item => ({ item: item.product, score: item.relevance })),
          shortcuts: shortcuts
        };
      }
      
      // If no brand matches, use pre-built search index
      let matchingProducts = [];
      
      // Use the pre-built search index for faster lookups
      const matchingIndices = new Set();
      
      // Split query into words for multi-word search
      const queryWords = q.split(/\\s/).filter(word => word.length >= 2);
      
      // For each query word, find matching products
      queryWords.forEach(queryWord => {
        // Check if query word exists in search index
        if (searchIndex.has(queryWord)) {
          searchIndex.get(queryWord).forEach(index => {
            matchingIndices.add(index);
          });
        }
        
        // Also check for word boundary matches (more precise)
        searchIndex.forEach((indices, indexedWord) => {
          // Only match if:
          // 1. Exact word match
          // 2. Indexed word starts with the query word (for autocomplete)
          if (indexedWord === queryWord || indexedWord.startsWith(queryWord)) {
            indices.forEach(index => {
              matchingIndices.add(index);
            });
          }
        });
      });
      
      // If no results found with word-based search, try substring search as fallback
      if (matchingIndices.size === 0) {
        searchIndex.forEach((indices, indexedWord) => {
          if (indexedWord.includes(q) || q.includes(indexedWord)) {
            indices.forEach(index => {
              matchingIndices.add(index);
            });
          }
        });
      }
      
      // Convert indices to products with relevance scores
      matchingIndices.forEach(index => {
        const product = products[index];
        matchingProducts.push({
          product: product,
          index: index,
          relevance: calculateRelevance(product, q, queryWords)
        });
      });
      
      // Sort by relevance score
      matchingProducts.sort((a, b) => b.relevance - a.relevance);
      
      // Take all results
      const results = matchingProducts.map(item => ({ item: item.product, score: item.relevance }));
      
      console.timeEnd(timerName);
      
      const shortcuts = findFilterShortcuts(q);
      
      const searchData = {
        results: results,
        shortcuts: shortcuts
      };
      
      // Cache the result
      setCachedResult(q, searchData);
      
      return searchData;
    }
    
    // Calculate relevance score for better sorting
    function calculateRelevance(product, query, queryWords = []) {
      let score = 0;
      
      // Helper function to check if a word matches the query
      const wordMatches = (text, query) => {
        if (!text || !query || typeof text !== 'string') return false;
        const words = text.toLowerCase().split(/\\s/);
        return words.some(word => word === query || word.startsWith(query));
      };
      
      // Helper function to check how many query words match
      const countMatchingWords = (text) => {
        if (!text || queryWords.length === 0 || typeof text !== 'string') return 0;
        const productWords = text.toLowerCase().split(/\\s/);
        return queryWords.filter(queryWord => 
          productWords.some(productWord => 
            productWord === queryWord || productWord.startsWith(queryWord)
          )
        ).length;
      };
      
      // Check brand first (highest priority)
      if (wordMatches(product.brand, query)) {
        score += 1000;
        // Exact brand match gets bonus
        if (product.brand?.toLowerCase() === query) {
          score += 500;
        }
      }
      
      // Check product name
      if (wordMatches(product.productName, query)) {
        score += 100;
        // Exact product name match gets bonus
        if (product.productName?.toLowerCase() === query) {
          score += 200;
        }
      }
      
      // Check other fields with word boundary matching
      if (wordMatches(product.originalWeight, query)) {
        score += 50;
      }
      if (product.sku?.toLowerCase().includes(query)) {
        score += 30;
      }
      if (product.barcode?.toLowerCase().includes(query)) {
        score += 20;
      }
      
      // Bonus for products that contain multiple query words
      if (queryWords.length > 1) {
        const brandMatches = countMatchingWords(product.brand || '');
        const nameMatches = countMatchingWords(product.productName || '');
        const totalMatches = brandMatches + nameMatches;
        
        // Bonus for each matching word
        score += totalMatches * 200;
        
        // Extra bonus if all query words are found
        if (totalMatches >= queryWords.length) {
          score += 500;
        }
      }
      
      // Variety participation bonus
      if (product.participatesInVariety === 'כן') {
        score += 200;
      }
      
      // Category priority
      const getCategoryPriority = (category) => {
        if (category === 'מזון יבש') return 3;
        if (category === 'מזון רטוב') return 2;
        if (category === 'חטיפים') return 1;
        return 0;
      };
      
      score += getCategoryPriority(product.internalCategory);
      
      // Inactive products penalty
      if (product.productName && product.productName.includes('לא פעיל')) {
        score -= 1000;
      }
      
      return score;
    }
    
    self.onmessage = function(e) {
      const { type, data } = e.data;
      
      switch (type) {
        case 'init':
          products = data.products;
          console.log('Worker received products:', products.length);
          // Build search index for autocomplete
          buildSearchIndex();
          self.postMessage({ type: 'ready' });
          break;
          
        case 'search':
          console.log('Worker received search request:', data.query, 'Index size:', searchIndex.size);
          // Only search if we have a valid query and index is ready
          if (data.query && data.query.length >= 2 && searchIndex.size > 0) {
            const searchData = searchProducts(data.query);
            console.log('Search results:', searchData.results.length, 'shortcuts:', searchData.shortcuts.length);
            self.postMessage({ 
              type: 'searchResults', 
              results: searchData.results,
              shortcuts: searchData.shortcuts,
              query: data.query
            });
          } else {
            // If index is not ready, return empty results
            console.log('Index not ready or query too short');
            self.postMessage({ 
              type: 'searchResults', 
              results: [],
              shortcuts: [],
              query: data.query
            });
          }
          break;
        default:
          self.postMessage({ type: 'error', error: 'Unknown message type: ' + type });
          break;
      }
    };
  `;
  
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};

// Memoized Row component for better performance
const MemoizedRow = React.memo(function MemoizedRow({ item, isActive, isLast, onClick, onHover, query, borderColor, activeBg, hoverBg, handleMouseDown }) {
  console.time(`MemoizedRow-render-${item.sku || item.barcode}`);
  
  const result = (
    <Box
      minH="48px"
      dir="rtl"
      bg={isActive ? activeBg : 'transparent'}
      _hover={{ bg: hoverBg }}
      borderBottom={!isLast ? `1px solid ${borderColor}` : 'none'}
      transition="colors"
      textAlign="right"
      cursor="pointer"
      p={2}
      py={1}
      pl={item.imageUrl ? "50px" : "8px"}
      position="relative"
      onMouseDown={handleMouseDown}
      onClick={onClick}
      onMouseEnter={onHover}
      style={{ direction: 'rtl', textAlign: 'right' }}
    >
      {/* Product Name */}
      <Text
        fontWeight="bold"
        color="gray.900"
        mb={1}
        fontSize="sm"
        dangerouslySetInnerHTML={{
          __html: highlightText(item.productName, query)
        }}
      />
      {/* Meta info: Price, SKU, Barcode (no weight) */}
      {(item.salePrice !== undefined || item.sku || (item.barcode && item.barcode !== item.sku)) && (
        <HStack spacing={2} wrap="wrap" fontSize="xs" color="gray.700">
          {item.salePrice !== undefined && (
            <Text>מחיר: <Text as="span" fontWeight="bold">₪{item.salePrice?.toFixed(1)}</Text></Text>
          )}
          {item.sku && (
            <Text>
              <Text as="span" fontWeight="semibold">מק&quot;ט: </Text>
              <Text as="span" dangerouslySetInnerHTML={{ __html: highlightText(item.sku, query) }} />
            </Text>
          )}
          {item.barcode && item.barcode !== item.sku && (
            <Text>
              <Text as="span" fontWeight="semibold">ברקוד: </Text>
              <Text as="span" dangerouslySetInnerHTML={{ __html: highlightText(item.barcode, query) }} />
            </Text>
          )}
        </HStack>
      )}
      
      {/* Product Image (small preview) */}
      {item.imageUrl && (
        <Box
          position="absolute"
          left="8px"
          top="50%"
          transform="translateY(-50%)"
          width="36px"
          height="36px"
          borderRadius="md"
          overflow="hidden"
          bg="gray.100"
        >
          <Image
            src={item.imageUrl}
            alt={item.productName}
            width="100%"
            height="100%"
            objectFit="cover"
            fallback={
              <Box
                width="100%"
                height="100%"
                bg="gray.200"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize="xs" color="gray.500">תמונה</Text>
              </Box>
            }
          />
        </Box>
      )}
    </Box>
  );
  
  console.timeEnd(`MemoizedRow-render-${item.sku || item.barcode}`);
  return result;
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.item.sku === nextProps.item.sku &&
    prevProps.item.barcode === nextProps.item.barcode &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isLast === nextProps.isLast &&
    prevProps.query === nextProps.query
  );
});

// Shortcut Row component for filter shortcuts
const ShortcutRow = React.memo(function ShortcutRow({ shortcut, isActive, isLast, onClick, onHover, borderColor, activeBg, hoverBg, handleMouseDown }) {
  // Get icon and color based on filter type
  const getFilterIcon = (type) => {
    switch (type) {
      case 'brand':
        return { icon: Tag, color: 'blue.100', textColor: 'blue.700' };
      case 'supplierName':
        return { icon: Building2, color: 'purple.100', textColor: 'purple.700' };
      case 'lifeStage':
        return { icon: Baby, color: 'green.100', textColor: 'green.700' };
      case 'parentCategory':
        return { icon: Folder, color: 'orange.100', textColor: 'orange.700' };
      case 'internalCategory':
        return { icon: FolderOpen, color: 'teal.100', textColor: 'teal.700' };
      case 'mainIngredient':
        return { icon: Utensils, color: 'red.100', textColor: 'red.700' };
      case 'medicalIssue':
        return { icon: HeartCrack, color: 'pink.100', textColor: 'pink.700' };
      case 'qualityLevel':
        return { icon: Star, color: 'yellow.100', textColor: 'yellow.700' };
      default:
        return { icon: Search, color: 'brand.100', textColor: 'brand.700' };
    }
  };

  const filterStyle = getFilterIcon(shortcut.type);
  const IconComponent = filterStyle.icon;

  return (
    <Box
      minH="40px"
      dir="rtl"
      bg={isActive ? activeBg : 'transparent'}
      _hover={{ bg: hoverBg }}
      borderBottom={!isLast ? `1px solid ${borderColor}` : 'none'}
      transition="colors"
      textAlign="right"
      cursor="pointer"
      p={2}
      py={1}
      pl={8}
      position="relative"
      onMouseDown={handleMouseDown}
      onClick={onClick}
      onMouseEnter={onHover}
      style={{ direction: 'rtl', textAlign: 'right' }}
    >
      <HStack spacing={2} align="center">
        <Box
          bg={filterStyle.color}
          color={filterStyle.textColor}
          px={2}
          py={1}
          borderRadius="md"
          fontSize="xs"
          fontWeight="medium"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Icon as={IconComponent} boxSize={3} />
        </Box>
        <VStack spacing={0} align="start" flex={1}>
          <Text
            fontWeight="semibold"
            color="gray.900"
            fontSize="sm"
          >
            {shortcut.displayText}
          </Text>
          <Text
            fontSize="xs"
            color="gray.600"
          >
            {shortcut.count} מוצרים
          </Text>
        </VStack>
      </HStack>
    </Box>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.shortcut.value === nextProps.shortcut.value &&
    prevProps.shortcut.type === nextProps.shortcut.type &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isLast === nextProps.isLast
  );
});

const Autocomplete = React.forwardRef(function Autocomplete({ 
  products = [], 
  onProductSelect, 
  onFilterShortcutSelect,
  placeholder = "חיפוש מוצרים...",
  className = "",
  disabled = false,
  value = "",
  onChange = null
}, ref) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState([]);
  const [shortcuts, setShortcuts] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [displayedResults, setDisplayedResults] = useState([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const inputRef = useRef(null);
  const actualInputRef = useRef(null);
  const workerRef = useRef(null);
  const blurTimeoutRef = useRef(null);
  const containerRef = useRef(null);

  const bgColor = 'white';
  const borderColor = 'gray.200';
  const hoverBg = 'gray.50';
  const activeBg = 'blue.50';

  // Update query when value prop changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const handleProductSelect = useCallback((product) => {
    setQuery(product.productName);
    setResults([]);
    setShortcuts([]);
    setActiveIdx(-1);
    setIsOpen(false);
    inputRef.current?.blur();
    onProductSelect?.(product);
  }, [onProductSelect]);

  const handleShortcutSelect = useCallback((shortcut) => {
    setQuery('');
    setResults([]);
    setShortcuts([]);
    setActiveIdx(-1);
    setIsOpen(false);
    inputRef.current?.blur();
    onFilterShortcutSelect?.(shortcut);
  }, [onFilterShortcutSelect]);

  // Initialize worker when products change - OPTIMIZED
  useEffect(() => {
    if (products.length === 0) return;
    
    // Only create worker if it doesn't exist
    if (!workerRef.current) {
      workerRef.current = createSearchWorker();
    }
    
    const worker = workerRef.current;
    
    worker.onmessage = (e) => {
      const { type, results: searchResults, shortcuts, error } = e.data;
      console.log('Worker message received:', type, { resultsLength: searchResults?.length, shortcutsLength: shortcuts?.length });
      
      switch (type) {
        case 'ready':
          console.log('Worker is ready');
          setIsWorkerReady(true);
          break;
        case 'indexReady':
          // Index is ready, worker is fully prepared
          console.log('Search index is ready');
          break;
        case 'searchResults':
          console.log('Search results received:', searchResults?.length, 'shortcuts:', shortcuts?.length);
          setResults(searchResults);
          setShortcuts(shortcuts); // Update shortcuts state
          setActiveIdx(0);
          setIsOpen(true);
          setIsSearching(false);
          break;
        case 'error':
          console.error('Search worker error:', error);
          break;
        default:
          console.warn('Unknown worker message type:', type);
          break;
      }
    };
    
    // Send products to worker immediately when products are loaded
    console.log('Sending products to worker for indexing...', { productsLength: products.length, firstProduct: products[0] });
    worker.postMessage({ type: 'init', data: { products } });
    
    // Don't mark as ready immediately - wait for worker to be ready
    // setIsWorkerReady(true);
    
    return () => {
      // Don't terminate worker on every products change
      // Only terminate on component unmount
    };
  }, [products]);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // Optimized search with better debouncing and worker readiness check
  const search = useMemo(
    () =>
      debounce((q) => {
        console.time('autocomplete-search');
        
        // לא מבצעים חיפוש על פחות מ-3 תווים
        if (!q || q.length < 3 || !isWorkerReady || !workerRef.current) {
          console.log('Search skipped:', { query: q, isWorkerReady, hasWorker: !!workerRef.current });
          setResults([]);
          setShortcuts([]);
          setActiveIdx(-1);
          setIsOpen(false);
          setIsSearching(false);
          console.timeEnd('autocomplete-search');
          return;
        }
        
        // רק כאן מציגים טעינה
        setIsSearching(true);
        setIsOpen(true);
        
        console.time('worker-post-message');
        workerRef.current.postMessage({ 
          type: 'search', 
          data: { query: q } 
        });
        console.timeEnd('worker-post-message');
        
        console.timeEnd('autocomplete-search');
      }, 800),
    [isWorkerReady]
  );

  const handleChange = useCallback((e) => {
    const value = e.target.value;
    setQuery(value);
    if (onChange) onChange(value);

    // לא מפעילים חיפוש ולא מציגים טעינה על פחות מ-3 תווים
    if (value.length < 3) {
      setIsSearching(false);
      setResults([]);
      setShortcuts([]);
      setActiveIdx(-1);
      setIsOpen(false);
      return;
    }

    // לא מפעילים loading כאן, רק אחרי debounce
    setResults([]);
    setShortcuts([]);
    setActiveIdx(-1);
    setIsOpen(false);
    setIsSearching(false);
    search(value);
  }, [search, onChange]);

  const handleKeyDown = useCallback((e) => {
    const totalItems = shortcuts.length + results.length;
    if (totalItems === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((prev) => (prev + 1) % totalItems);
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((prev) => (prev - 1 + totalItems) % totalItems);
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0) {
        if (activeIdx < shortcuts.length) {
          // Handle shortcut selection
          handleShortcutSelect(shortcuts[activeIdx]);
        } else {
          // Handle product selection
          const productIdx = activeIdx - shortcuts.length;
          handleProductSelect(results[productIdx].item);
        }
      }
    }

    if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIdx(-1);
      inputRef.current?.blur();
    }
  }, [results, shortcuts, activeIdx, handleProductSelect, handleShortcutSelect]);

  // Expose clear and focus methods through ref
  React.useImperativeHandle(ref, () => ({
    clear: () => {
      setQuery('');
      setResults([]);
      setShortcuts([]); // Clear shortcuts on clear
      setActiveIdx(-1);
      setIsOpen(false);
    },
    focus: () => {
      if (actualInputRef.current && typeof actualInputRef.current.focus === 'function') {
        actualInputRef.current.focus();
      }
    }
  }));

  const handleFocus = useCallback(() => {
    if (query.length >= 3 && (results.length > 0 || shortcuts.length > 0)) {
      setIsOpen(true);
    }
  }, [query, results, shortcuts]);

  const handleBlur = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    
    blurTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      setActiveIdx(-1);
    }, 100);
  }, []);


  
  // Update displayed results when search results change
  useEffect(() => {
    if (results.length > 0) {
      // Show first 10 results immediately
      setDisplayedResults(results.slice(0, 10));
    } else {
      setDisplayedResults([]);
    }
  }, [results]);
  
  // Progressive loading function
  const loadMoreResults = useCallback(() => {
    if (results.length <= displayedResults.length) return;
    
    setIsLoadingMore(true);
    
    // Load more results progressively - show 20 more results at a time
    setTimeout(() => {
      const currentCount = displayedResults.length;
      const nextBatch = results.slice(currentCount, currentCount + 20);
      setDisplayedResults(prev => [...prev, ...nextBatch]);
      setIsLoadingMore(false);
    }, 100);
  }, [results, displayedResults.length]);

  
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    return () => {
      search.cancel();
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, [search]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setActiveIdx(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);





  return (
    <Box ref={containerRef} position="relative" dir="rtl" className={className} style={{ textAlign: 'right' }}>
      {/* Search Input */}
      <InputGroup dir="rtl" position="relative">
        {/* Shortcut hint on the left (start) for RTL */}
        <InputLeftElement
          height="100%"
          display={{ base: 'none', md: 'flex' }}
          alignItems="center"
          pointerEvents="none"
          left="293px"
          pl={2}
        >
          <Text
            fontSize="xs"
            color="gray.400"
            fontWeight="medium"
            whiteSpace="nowrap"
          >
            Ctrl+B
          </Text>
        </InputLeftElement>
        {/* The input */}
        <Input
          ref={(element) => {
            // Handle both the parent ref and our internal ref
            if (ref) {
              if (typeof ref === 'function') {
                ref(element);
              } else {
                ref.current = element;
              }
            }
            inputRef.current = element;
            actualInputRef.current = element;
          }}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="חיפוש"
          isDisabled={disabled}
          pl={12} // space for the shortcut box
          pr={8}  // space for the icon
          borderColor="gray.300"
          _focus={{
            borderColor: 'brand.500',
            boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
          }}
          bg={disabled ? 'gray.100' : bgColor}
          cursor={disabled ? 'not-allowed' : 'text'}
          dir="rtl"
          style={{ textAlign: 'right' }}
          fontSize="sm"
        />
        {/* Search icon or spinner on the right (end) for RTL */}
        <InputRightElement height="100%" display="flex" alignItems="center">
          {isSearching ? (
            <Spinner size="sm" color="brand.500" />
          ) : (
            <Icon as={Search} color="gray.400" boxSize={5} />
          )}
        </InputRightElement>
      </InputGroup>

      {/* Results Dropdown */}
      {isOpen && (
        <Box
          position="absolute"
          top="full"
          left={0}
          right={0}
          mt={1}
          bg={bgColor}
          border={`1px solid ${borderColor}`}
          borderRadius="lg"
          boxShadow="lg"
          zIndex={50}
          maxH="320px"
          overflow="auto"
          textAlign="right"
          dir="rtl"
          style={{ direction: 'rtl', textAlign: 'right' }}
        >
          {/* Loading State */}
          {isSearching && (
            <VStack spacing={0} align="stretch" w="full" p={3}>
              <HStack spacing={3} align="center" justify="center" py={3}>
                <Spinner size="sm" color="brand.500" />
                <Text fontSize="sm" color="gray.600" fontWeight="medium">מחפש מוצרים...</Text>
              </HStack>
              <Text fontSize="xs" color="gray.500" textAlign="center" mb={2}>
                המערכת מחכה שתסיים להקליד...
              </Text>
              {/* Skeleton loading items */}
              {[...Array(6)].map((_, idx) => (
                <Box key={idx} p={3} borderBottom={idx < 5 ? `1px solid ${borderColor}` : 'none'}>
                  <Skeleton height="18px" mb={2} width="80%" />
                  <HStack spacing={3}>
                    <Skeleton height="14px" width="60px" />
                    <Skeleton height="14px" width="80px" />
                  </HStack>
                </Box>
              ))}
            </VStack>
          )}
          
          {/* Results */}
          {!isSearching && (results.length > 0 || shortcuts.length > 0) && (
            <>
              <VStack spacing={0} align="stretch" w="full">
                {/* Shortcuts */}
                {shortcuts.map((shortcut, idx) => (
                  <ShortcutRow
                    key={`shortcut-${shortcut.type}-${shortcut.value}-${idx}`}
                    shortcut={shortcut}
                    isActive={idx === activeIdx}
                    isLast={idx === shortcuts.length - 1 && results.length === 0}
                    onClick={() => handleShortcutSelect(shortcut)}
                    onHover={() => setActiveIdx(idx)}
                    borderColor={borderColor}
                    activeBg={activeBg}
                    hoverBg={hoverBg}
                    handleMouseDown={handleMouseDown}
                  />
                ))}
                
                {/* Separator between shortcuts and products */}
                {shortcuts.length > 0 && results.length > 0 && (
                  <Box
                    px={3}
                    py={1}
                    bg="gray.50"
                    borderTop={`1px solid ${borderColor}`}
                    borderBottom={`1px solid ${borderColor}`}
                  >
                    <Text fontSize="xs" color="gray.500" fontWeight="medium">
                      תוצאות חיפוש
                    </Text>
                  </Box>
                )}
                
                {/* Product Results */}
                {Array.isArray(displayedResults) && displayedResults.map((res, idx) => {
                  const realIdx = shortcuts.length + idx;
                  if (!res || typeof res !== 'object' || !res.item || typeof res.item !== 'object') {
                    console.warn('Invalid result in search results:', res);
                    return null;
                  }
                  return (
                    <MemoizedRow
                      key={`product-${res.item.sku || res.item.barcode || idx}-${realIdx}`}
                      item={res.item}
                      isActive={realIdx === activeIdx}
                      isLast={realIdx === shortcuts.length + displayedResults.length - 1}
                      onClick={() => handleProductSelect(res.item)}
                      onHover={() => setActiveIdx(realIdx)}
                      query={query}
                      borderColor={borderColor}
                      activeBg={activeBg}
                      hoverBg={hoverBg}
                      handleMouseDown={handleMouseDown}
                    />
                  );
                })}
                
                {/* Load More Button */}
                {displayedResults.length < results.length && (
                  <Box p={3} textAlign="center" borderTop={`1px solid ${borderColor}`}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        loadMoreResults();
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      isLoading={isLoadingMore}
                      loadingText="טוען עוד..."
                    >
                      הצג עוד תוצאות ({results.length - displayedResults.length} נותרו)
                    </Button>
                  </Box>
                )}
              </VStack>
              {/* Results count */}
              <Box px={3} py={2} fontSize="xs" color="gray.500" borderTop={`1px solid ${borderColor}`} bg="gray.50" textAlign="right" dir="rtl">
                נמצאו {results.length} תוצאות{shortcuts.length > 0 ? ` ו-${shortcuts.length} קיצורי דרך` : ''}
                {displayedResults.length < results.length && (
                  <Text as="span" color="blue.500" fontWeight="medium">
                    {' '}(מוצגות {displayedResults.length} מתוך {results.length})
                  </Text>
                )}
              </Box>
            </>
          )}
        </Box>
      )}

      {/* No results message - only show when not searching and after first search */}
      {isOpen && query.length >= 3 && results.length === 0 && shortcuts.length === 0 && !isSearching && (
        <Box
          position="absolute"
          top="full"
          left={0}
          right={0}
          mt={1}
          bg={bgColor}
          border={`1px solid ${borderColor}`}
          borderRadius="lg"
          boxShadow="lg"
          zIndex={50}
          p={4}
          textAlign="center"
          dir="rtl"
        >
          <Text fontSize="2xl" mb={2}>🔍</Text>
          <Text color="gray.500">לא נמצאו תוצאות עבור &quot;{query}&quot;</Text>
        </Box>
      )}
    </Box>
  );
});

export default Autocomplete; 