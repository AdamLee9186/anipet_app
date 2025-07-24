// ==UserScript==
// @name         Lionwheel - Anipet Toolbox
// @namespace    anipet-toolbox-merged
// @version      13.4.2
// @description  AIO Script: Image Finder, Barcode Replacer, Previews, Responsive Views & more, all controlled from the Tampermonkey menu.
// @match        *://*.lionwheel.com/*
// @updateURL    https://anipetapp.netlify.app/toolbox.js
// @downloadURL  https://anipetapp.netlify.app/toolbox.js
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @grant        window.close
// @connect      raw.githubusercontent.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js
// @run-at       document-end
// ==/UserScript==

/* global jQuery */
/* global Papa */ // ENSURING PAPA IS GLOBAL

(function() {
    'use strict';

    // ---< WhatsApp Tab Closer >---
    if (window.location.hostname.includes('api.whatsapp.com')) {
        setTimeout(() => {
            window.close();
        }, 1000);
        return;
    }
    // ---< Main Anipet Toolbox Script >---
    const SCRIPT_NAME = "Lionwheel - Anipet Toolbox";
    const SCRIPT_VERSION = "13.4.2"; // Fixed to match @version
    console.log(`✅ ${SCRIPT_NAME} v${SCRIPT_VERSION} loaded.`);

    // ---< Constants >---
    const IMAGE_FINDER_CSV_URL = "https://raw.githubusercontent.com/AdamLee9186/anipet/main/anipet_master_catalog_v1.csv";
    const BARCODE_REPLACER_CSV_URL = 'https://raw.githubusercontent.com/AdamLee9186/anipet/main/backoffice_catalog.csv';
    const PLACEHOLDER_IMG_URL = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="70" viewBox="0 0 80 70"><rect width="80" height="70" fill="#fafafa"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14px" fill="#d4d4d4">X</text></svg>');

    const SETTINGS_KEY = 'anipet_toolbox_settings';
    const PRODUCT_DATA_CACHE_KEY = 'anipet_product_data_cache';
    const IMAGE_CACHE_TIMESTAMP_KEY = 'anipet_image_cache_timestamp';
    const BARCODE_DATA_CACHE_KEY = 'anipet_barcode_data_cache';
    const BARCODE_CACHE_TIMESTAMP_KEY = 'anipet_barcode_cache_timestamp';
    const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

    // ---< Global State >---
    let settings = {
        showImages: true,
        replaceBarcodes: true,
        enablePreview: true,
        hideColumns: true,
        enableResponsive: true,
        addWhatsApp: true,
        highlightMerlog: true,
    };
    let productDataCache = null; // For Image Finder
    let itemCodeToBarcodeMap = null; // For Barcode Replacer
    let descriptionToBarcodeMap = null; // For Barcode Replacer

    // ---< Utility Functions >---
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function safeExecute(func, fallback = null) {
        try {
            return func();
        } catch (error) {
            console.error(`[${SCRIPT_NAME}] Error in ${func.name || 'anonymous'}:`, error);
            return fallback;
        }
    }

    // ---< Cache Compression Functions >---
    function compressCache(data) {
        try {
            // Use a more robust encoding method
            const jsonString = JSON.stringify(data);
            // Use encodeURIComponent to handle special characters
            return encodeURIComponent(jsonString);
        } catch (error) {
            console.error(`[${SCRIPT_NAME}] Error compressing cache:`, error);
            return null;
        }
    }

    function decompressCache(compressed) {
        try {
            if (!compressed) return null;
            // Decode the URI component first
            const decoded = decodeURIComponent(compressed);
            return JSON.parse(decoded);
        } catch (error) {
            console.error(`[${SCRIPT_NAME}] Error decompressing cache:`, error);
            return null;
        }
    }

    // ---< Settings Module >---
    const defaultSettings = {
        showImages: true,
        replaceBarcodes: true,
        enablePreview: true,
        hideColumns: true,
        enableResponsive: true,
        addWhatsApp: true,
        highlightMerlog: true,
    };

    async function loadSettings() {
        try {
            const savedSettings = await GM_getValue(SETTINGS_KEY, {});
            settings = { ...defaultSettings, ...savedSettings };
            updateBodyClasses();
        } catch (error) {
            console.error(`[${SCRIPT_NAME}] Error loading settings:`, error);
            // Keep default settings if loading fails
            settings = { ...defaultSettings };
        }
    }

    function updateBodyClasses() {
        if(settings && settings.enableResponsive) document.body.classList.add('tampermonkey-responsive-enabled');
        if(settings && settings.hideColumns) document.body.classList.add('tampermonkey-hide-columns-enabled');
    }

    function registerMenuCommands() {
        try {
            const options = {
                showImages: '🖼️ הצג תמונות וקישורים',
                replaceBarcodes: '📊 החלף מק"ט בברקוד',
                enablePreview: '👁️ אפשר תצוגה מקדימה מהירה',
                hideColumns: '🙈 הסתר עמודות מיותרות',
                enableResponsive: '📱 אפשר תצוגה רספונסיבית למובייל',
                addWhatsApp: '💬 הוסף כפתורי WhatsApp',
                highlightMerlog: '🔴 הדגש שורות מרלוג'
            };

            function createMenuCommandFunc(k) {
                return async () => {
                    try {
                        const newSettings = { ...settings, [k]: !settings[k] };
                        await GM_setValue(SETTINGS_KEY, newSettings);
                        location.reload();
                    } catch (error) {
                        console.error(`[${SCRIPT_NAME}] Error updating setting ${k}:`, error);
                    }
                };
            }

            for (const [key, label] of Object.entries(options)) {
                const statusIcon = (settings && settings[key]) ? '✅' : '❌';
                GM_registerMenuCommand(`${statusIcon} ${label}`, createMenuCommandFunc(key));
            }

            GM_registerMenuCommand('🔄 רענן קטלוגים', () => {
                try {
                    GM_deleteValue(PRODUCT_DATA_CACHE_KEY);
                    GM_deleteValue(IMAGE_CACHE_TIMESTAMP_KEY);
                    GM_deleteValue(BARCODE_DATA_CACHE_KEY);
                    GM_deleteValue(BARCODE_CACHE_TIMESTAMP_KEY);
                    alert('קטלוגים נמחקו מהזיכרון. רענן את הדף כדי לטעון מחדש.');
                } catch (error) {
                    console.error(`[${SCRIPT_NAME}] Error clearing cache:`, error);
                }
            });
        } catch (error) {
            console.error(`[${SCRIPT_NAME}] Error registering menu commands:`, error);
        }
    }


    // ---< Data Loading Module >---

    async function getProductData(callback) {
        // Prevent multiple simultaneous calls
        if (window.productDataLoading) return;
        window.productDataLoading = true;

        try {
            const cachedData = await GM_getValue(PRODUCT_DATA_CACHE_KEY, null);
            const cachedTimestamp = await GM_getValue(IMAGE_CACHE_TIMESTAMP_KEY, 0);
            if (cachedData && (Date.now() - cachedTimestamp < CACHE_DURATION_MS)) {
                // Try to decompress cached data
                const decompressed = decompressCache(cachedData);
                if (decompressed) {
                    productDataCache = decompressed;
                    if (callback) callback();
                    return;
                }
            }

            updateStatus('טוען קטלוג מאסטר...', 'orange');
            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({ method: "GET", url: IMAGE_FINDER_CSV_URL, onload: resolve, onerror: reject });
            });
            productDataCache = processImageCsvText(response.responseText);

            // Compress data before saving
            const compressed = compressCache(productDataCache);
            if (compressed) {
                await GM_setValue(PRODUCT_DATA_CACHE_KEY, compressed);
            } else {
                // Fallback to uncompressed if compression fails
                await GM_setValue(PRODUCT_DATA_CACHE_KEY, productDataCache);
            }
            await GM_setValue(IMAGE_CACHE_TIMESTAMP_KEY, Date.now());
            updateStatus(`קטלוג מאסטר נטען: ${productDataCache.length} פריטים.`, 'green', true);
        } catch (error) {
            console.error(`[${SCRIPT_NAME}] Error loading image CSV:`, error);
            productDataCache = [];
            updateStatus('שגיאה בטעינת קטלוג מאסטר.', 'red');
        } finally {
            window.productDataLoading = false;
            if (callback) callback();
        }
    }

    function processImageCsvText(text) {
        try {
            if (!text) return [];

            const lines = text.trim().split("\n"); if (lines.length <= 1) return [];
            const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
            const csvSkuIndex = headers.indexOf("skus");
            const csvImageIndex = headers.indexOf("image url");
            const csvUrlIndex = headers.indexOf("product url");
            const csvProductNameIndex = headers.indexOf("product name");
            if (csvSkuIndex === -1 || csvImageIndex === -1) return [];
            return lines.slice(1).map(line => {
                const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                const skusString = (parts[csvSkuIndex] || "").trim().replace(/^"|"$/g, '');
                return {
                    skus: skusString ? skusString.split(',').map(s => normalizeSku(s.trim())).filter(Boolean) : [],
                    image: (parts[csvImageIndex] || "").trim().replace(/^"|"$/g, ''),
                    link: csvUrlIndex !== -1 ? (parts[csvUrlIndex] || "").trim().replace(/^"|"$/g, '') : '',
                    productName: csvProductNameIndex !== -1 ? (parts[csvProductNameIndex] || "").trim().replace(/^"|"$/g, '') : ''
                };
            }).filter(p => p.skus.length > 0 && p.image);
        } catch (error) {
            console.error(`[${SCRIPT_NAME}] Error processing image CSV text:`, error);
            return [];
        }
    }

    async function loadBarcodeCsv(callback) {
        // Prevent multiple simultaneous calls
        if (window.barcodeDataLoading) return;
        window.barcodeDataLoading = true;

        try {
            const cachedData = await GM_getValue(BARCODE_DATA_CACHE_KEY, null);
            const cachedTimestamp = await GM_getValue(BARCODE_CACHE_TIMESTAMP_KEY, 0);
            if (cachedData && (Date.now() - cachedTimestamp < CACHE_DURATION_MS)) {
                // Try to decompress cached data
                const decompressed = decompressCache(cachedData);
                if (decompressed) {
                    processBarcodeData(decompressed);
                    if(callback) callback();
                    return;
                }
            }

            updateStatus('טוען קטלוג ברקודים...', 'orange');
            GM_xmlhttpRequest({
                method: "GET", url: BARCODE_REPLACER_CSV_URL,
                onload: async (response) => {
                    try {
                        if (response.status >= 200 && response.status < 300) {
                            const data = parseBarcodeCsv(response.responseText);
                            if (data) {
                                // Compress data before saving
                                const compressed = compressCache(data);
                                if (compressed) {
                                    await GM_setValue(BARCODE_DATA_CACHE_KEY, compressed);
                                } else {
                                    // Fallback to uncompressed if compression fails
                                    await GM_setValue(BARCODE_DATA_CACHE_KEY, data);
                                }
                                await GM_setValue(BARCODE_CACHE_TIMESTAMP_KEY, Date.now());
                                processBarcodeData(data);
                            }
                        } else {
                            updateStatus(`שגיאה בטעינת CSV ברקודים: ${response.statusText}`, 'red');
                        }
                    } catch (error) {
                        console.error(`[${SCRIPT_NAME}] Error processing barcode CSV:`, error);
                        updateStatus('שגיאה בעיבוד קובץ הברקודים.', 'red');
                    } finally {
                        window.barcodeDataLoading = false;
                        if (callback) callback();
                    }
                },
                onerror: () => {
                    window.barcodeDataLoading = false;
                    updateStatus('שגיאת רשת בטעינת CSV ברקודים.', 'red');
                    if (callback) callback();
                }
            });
        } catch (error) {
            console.error(`[${SCRIPT_NAME}] Error loading barcode CSV:`, error);
            window.barcodeDataLoading = false;
            updateStatus('שגיאה בטעינת קובץ הברקודים.', 'red');
            if (callback) callback();
        }
    }

    function processBarcodeData(data) {
        try {
            if (!data) return;
            itemCodeToBarcodeMap = new Map(data.itemCodeToBarcodeMap);
            descriptionToBarcodeMap = new Map(data.descriptionToBarcodeMap);
            updateStatus(`קטלוג ברקודים נטען: ${descriptionToBarcodeMap.size} פריטים.`, 'green', true);
        } catch (error) {
            console.error(`[${SCRIPT_NAME}] Error processing barcode data:`, error);
        }
    }

    function parseBarcodeCsv(csvString) {
        try {
            if (!csvString) return null;

            let localItemCodeToBarcodeMap = new Map();
            let localDescriptionToBarcodeMap = new Map();
            let success = false;
            Papa.parse(csvString, {
                header: true, skipEmptyLines: true, trimHeaders: true,
                complete: (results) => {
                    try {
                        const headers = results.meta.fields || Object.keys(results.data[0]);
                        const itemCodeKey = headers.find(h => h.trim() === 'קוד פריט');
                        const descKey = headers.find(h => h.trim() === 'תאור פריט');
                        const barcodeKey = headers.find(h => h.trim() === 'ברקוד');
                        if (!descKey || !barcodeKey || !itemCodeKey) {
                            updateStatus(`שגיאה: עמודות חסרות בקובץ הברקודים.`, 'red'); return;
                        }
                        results.data.forEach(row => {
                            const itemCode = row[itemCodeKey]?.trim();
                            const desc = row[descKey]?.trim();
                            const barcode = row[barcodeKey]?.trim();
                            if (itemCode) localItemCodeToBarcodeMap.set(itemCode, barcode || null);
                            if (desc) localDescriptionToBarcodeMap.set(desc, barcode || null);
                        });
                        success = true;
                    } catch (error) {
                        console.error(`[${SCRIPT_NAME}] Error in Papa.parse complete callback:`, error);
                    }
                },
                error: (error) => updateStatus(`שגיאה בפענוח קובץ הברקודים: ${error.message}`, 'red')
            });
            return success ? { itemCodeToBarcodeMap: Array.from(localItemCodeToBarcodeMap.entries()), descriptionToBarcodeMap: Array.from(localDescriptionToBarcodeMap.entries()) } : null;
        } catch (error) {
            console.error(`[${SCRIPT_NAME}] Error parsing barcode CSV:`, error);
            return null;
        }
    }

    // ---< Helper Functions >---
    function normalizeSku(sku) {
        try {
            if (typeof sku !== 'string') return '';
            return sku.replace(/\D/g, '');
        } catch (error) {
            console.error(`[${SCRIPT_NAME}] Error normalizing SKU:`, error);
            return '';
        }
    }

    function findImageMatch(sku, productName) {
        try {
            if (!productDataCache) return null;
            if (sku && !String(sku).trim().startsWith('0')) {
                const normalizedSku = normalizeSku(sku);
                if (normalizedSku) {
                    const skuMatch = productDataCache.find(p => p.skus.includes(normalizedSku));
                    if (skuMatch) return skuMatch;
                }
            }
            if (productName) {
                const pageProductNameNormalized = productName.toLowerCase().trim();
                const nameMatch = productDataCache.find(p => p.productName && p.productName.toLowerCase().trim() === pageProductNameNormalized);
                if (nameMatch) return nameMatch;
            }
            return null;
        } catch (error) {
            console.error(`[${SCRIPT_NAME}] Error finding image match:`, error);
            return null;
        }
    }

    function findBarcode(sku, name) {
        try {
            if (!itemCodeToBarcodeMap || !descriptionToBarcodeMap) return null;
            if (sku && itemCodeToBarcodeMap.has(sku)) {
                const barcode = itemCodeToBarcodeMap.get(sku);
                if (barcode) return barcode;
            }
            if (name && descriptionToBarcodeMap.has(name)) {
                const barcode = descriptionToBarcodeMap.get(name);
                if (barcode) return barcode;
            }
            return null;
        } catch (error) {
            console.error(`[${SCRIPT_NAME}] Error finding barcode:`, error);
            return null;
        }
    }

    function getFullSizeImageUrl(thumbnailUrl) {
        try {
            if (!thumbnailUrl || typeof thumbnailUrl !== 'string') return '';

            if (thumbnailUrl.includes('cdn.modulus.co.il')) { return thumbnailUrl.split('?')[0]; }
            if (thumbnailUrl.includes('www.gag-lachayot.co.il')) { return thumbnailUrl.replace(/-\d+x\d+(\.[a-zA-Z0-9]+(?:[?#].*)?)$/, '$1').replace(/-\d+x\d+$/, ''); }
            if (thumbnailUrl.includes('www.all4pet.co.il')) { return thumbnailUrl.replace(/_small(\.[a-zA-Z0-9]+(?:[?#].*)?)$/, '$1').replace(/_small$/, ''); }
            if (thumbnailUrl.includes('d3m9l0v76dty0.cloudfront.net')) { return thumbnailUrl.replace('/show/', '/extra_large/').replace('/index/', '/extra_large/').replace('/large/', '/extra_large/'); }
            if (thumbnailUrl.includes('just4pet.co.il')) {
                const parts = thumbnailUrl.split('/'); const filenameWithQuery = parts.pop(); const filenameParts = filenameWithQuery.split('?');
                const filename = filenameParts[0]; const query = filenameParts.length > 1 ? `?${filenameParts[1]}` : '';
                if (filename.startsWith('tn_')) { const newFilename = filename.substring(3); return parts.join('/') + '/' + newFilename + query; }
            }
            return thumbnailUrl;
        } catch (e) {
            console.warn(`[${SCRIPT_NAME}] ⚠️ Error processing thumbnail URL, returning original:`, thumbnailUrl, e);
            return thumbnailUrl;
        }
    }

    function findProductTableInScope(scope) {
        try {
            if (!scope) return null;

            const allTables = scope.querySelectorAll('table');
            for (const table of allTables) {
                const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
                if (headers.includes('מק״ט') && headers.includes('שם')) return table;
            }
            return null;
        } catch (error) {
            console.error(`[${SCRIPT_NAME}] Error finding product table:`, error);
            return null;
        }
    }

    // ---< UI & DOM Manipulation >---

    let scriptStatusElement = null;
    function createStatusNotifier() {
        try {
            if (document.getElementById('scriptStatusNotifier')) return;
            scriptStatusElement = document.createElement('div');
            scriptStatusElement.id = 'scriptStatusNotifier';
            document.body.appendChild(scriptStatusElement);
            // Ensure it's hidden initially unless a message is set
            scriptStatusElement.style.opacity = '0';
            scriptStatusElement.style.transition = 'opacity 0.5s ease-in-out';
        } catch (error) {
            console.error(`[${SCRIPT_NAME}] Error creating status notifier:`, error);
        }
    }
  function updateStatus(message, color = '#333', temporary = false) {
  try {
    // רק הודעות אדומות (שגיאה) יעברו
    if (color !== 'red') return;

    // שאר הקוד שלך נשאר כמו שהוא:
    if (!scriptStatusElement) createStatusNotifier();
    if (!scriptStatusElement) return; // Double check

    scriptStatusElement.textContent = message;
    scriptStatusElement.style.color = color;
    scriptStatusElement.style.borderColor = color;
    scriptStatusElement.style.opacity = '0.9';
    if (temporary) setTimeout(() => { scriptStatusElement.style.opacity = '0' }, 4000);
    console.log(`[${SCRIPT_NAME}] ${message}`);
  } catch (error) {
    console.error(`[${SCRIPT_NAME}] Error updating status:`, error);
  }
}

function showGalleryOverlay(galleryItems, startIndex) {
    try {
        function handleSwipe() {
            const diff = startX - endX;
            const threshold = 50; // swipe sensitivity in px

            if (Math.abs(diff) > threshold) {
                if (diff > 0) {
                    navigate(-1); // swipe left → next
                } else {
                    navigate(1); // swipe right → prev
                }
            }
        }

        if (!galleryItems || galleryItems.length === 0) return;
        if (document.getElementById('tampermonkey-gallery-overlay')) document.getElementById('tampermonkey-gallery-overlay').remove();

    let currentIndex = startIndex;
    let startX = 0;
    let endX = 0;
    const overlay = document.createElement('div');
    overlay.id = 'tampermonkey-gallery-overlay';

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'gallery-content-wrapper'; // This wrapper will hold both image and caption

    const imgElement = document.createElement('img');
    const imgContainer = document.createElement('div');
    imgContainer.className = 'gallery-image-container'; // This will contain just the image
    imgContainer.appendChild(imgElement);

    const captionElement = document.createElement('div');
    captionElement.className = 'gallery-caption'; // This will contain all text
    const productNameElement = document.createElement('p');
    productNameElement.className = 'gallery-product-name';
    const skuElement = document.createElement('p');
    skuElement.className = 'gallery-sku';
    const counterElement = document.createElement('div');
    counterElement.className = 'gallery-counter';
    const dotContainer = document.createElement('div');
    dotContainer.className = 'gallery-dots';

    const prevButton = document.createElement('button');
    prevButton.className = 'gallery-nav prev';
    prevButton.innerHTML = '&#10094;';
    const nextButton = document.createElement('button');
    nextButton.className = 'gallery-nav next';
    nextButton.innerHTML = '&#10095;';
    const closeButton = document.createElement('button');
    closeButton.className = 'gallery-close';
    closeButton.innerHTML = '&times;';

    // *** START MODIFICATION BLOCK for showGalleryOverlay function ***

    // 1. Append all text elements directly to the captionElement
    captionElement.append(productNameElement, skuElement, counterElement);

    // 2. Append the image container AND the caption element to the contentWrapper.
    // The contentWrapper needs to be the flex parent that stacks them.
    contentWrapper.append(imgContainer, captionElement);

    // 3. Append the contentWrapper (which now contains both image and caption),
    // along with navigation buttons and dots, to the main overlay.
    // The dots should be a direct child of the overlay, as they are fixed to the viewport bottom.
    overlay.append(contentWrapper, prevButton, nextButton, closeButton, dotContainer);

    // *** END MODIFICATION BLOCK ***

    function navigate(delta) {
        currentIndex = (currentIndex + delta + galleryItems.length) % galleryItems.length;
        updateGalleryView();
    }

    const updateGalleryView = () => {
        const item = galleryItems[currentIndex];
        imgElement.src = '';
        imgElement.src = item.fullSizeUrl;

        productNameElement.textContent = item.productName;
        const originalSku = item.sku;
        const barcode = settings.replaceBarcodes ? findBarcode(originalSku, item.productName) : null;

        if (barcode) {
            skuElement.innerHTML = `מק"ט: <strong class="barcode-highlight-gallery" title="מקורי: ${originalSku}">${barcode}</strong>`;
        } else {
            skuElement.textContent = `מק"ט: ${originalSku}`;
        }

        const quantity = item.quantity ? item.quantity.trim() : '';
        counterElement.textContent = ''; // clear existing content

        if (quantity && quantity.includes('/')) {
            const [pickedStr, totalStr] = quantity.split('/').map(s => parseInt(s.trim(), 10));
            const span = document.createElement('span');
            span.textContent = `לוקט ${quantity}`;

            if (pickedStr === totalStr) {
                span.className = 'tampermonkey-picked-full';
            } else if (pickedStr === 0 && totalStr > 1) {
                span.className = 'tampermonkey-picked-none';
            } else {
                span.className = 'tampermonkey-picked-partial';
            }

            counterElement.appendChild(span);
        }

        dotContainer.innerHTML = galleryItems.map((_, i) => `
            <span class="dot${i === currentIndex ? ' active' : ''}"></span>
        `).join('');

        // Enable dot click navigation
        dotContainer.querySelectorAll('.dot').forEach((dot, i) => {
            dot.addEventListener('click', () => {
                currentIndex = i;
                updateGalleryView();
            });
        });
    };

    const closeOverlay = () => {
        overlay.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleKeyDown);
        }, 300);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') closeOverlay();
        if (e.key === 'ArrowRight') navigate(-1);
        if (e.key === 'ArrowLeft') navigate(1); // RTL friendly
    };

    imgElement.onerror = () => {
        const item = galleryItems[currentIndex];
        if (imgElement.src !== item.thumbnailUrl) {
            imgElement.src = item.thumbnailUrl;
        } else {
            imgElement.src = PLACEHOLDER_IMG_URL;
        }
    };
    prevButton.onclick = () => navigate(-1);
    nextButton.onclick = () => navigate(1);
    closeButton.onclick = closeOverlay;
    overlay.onclick = (e) => {
        if (e.target === overlay) closeOverlay();
    };
    document.body.appendChild(overlay);
    overlay.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    });

    overlay.addEventListener('touchend', (e) => {
        endX = e.changedTouches[0].clientX;
        handleSwipe();
    });

    document.addEventListener('keydown', handleKeyDown);
    updateGalleryView();
    setTimeout(() => {
        overlay.style.opacity = '1';
    }, 10);
    } catch (error) {
        console.error(`[${SCRIPT_NAME}] Error showing gallery overlay:`, error);
    }
}

    // ---< Injection & Cleanup Logic >---

    function createImageElement(match, nameText, skuText, styleObject) {
        try {
            if (!match || !match.image) return null;

            const img = document.createElement('img');
            img.src = match.image; img.alt = `תמונה עבור ${nameText || 'מוצר'}`; img.className = 'tampermonkey-sku-image'; img.title = 'לחץ לפתיחת הגלריה';
            Object.assign(img.style, { width: 'auto', objectFit: 'contain', borderRadius: '4px', cursor: 'pointer', ...styleObject });
            img.onerror = function() { this.src = PLACEHOLDER_IMG_URL; this.onclick = null; };
            img.onclick = (e) => {
                e.stopPropagation();
                const searchScope = e.target.closest('.modal, body');
                const galleryItems = extractDataForGallery(searchScope);
                const clickedIndex = galleryItems.findIndex(item => normalizeSku(item.sku) === normalizeSku(skuText));
                showGalleryOverlay(galleryItems, Math.max(0, clickedIndex));
            };
            return img;
        } catch (error) {
            console.error(`[${SCRIPT_NAME}] Error creating image element:`, error);
            return null;
        }
    }

    function extractDataForGallery(searchScope) {
        try {
            if (!searchScope) return [];

            const items = []; const uniqueSkus = new Set();
            searchScope.querySelectorAll('.table-responsive > .table tr, .modal-body .table tr, .nested-fields.order-item-row, td.pick-order-item-row').forEach(row => {
            let name, sku;

            // Find cells by header content instead of hardcoded positions
            const table = row.closest('table');
            let nameEl = null;

            if (table) {
                const thead = table.querySelector('thead tr');
                if (thead) {
                    const headers = Array.from(thead.querySelectorAll('th')).map(th => th.textContent.trim());
                    const nameIndex = headers.findIndex(header => header === 'שם');
                    if (nameIndex !== -1) {
                        nameEl = row.cells[nameIndex];
                    }
                }
            }

            // Fallback to original selectors if header method didn't work
            if (!nameEl) {
                nameEl = row.querySelector('td:nth-child(4), input.order-item-name, span.text-dark-75');
            }

            const skuEl = row.querySelector('td.text-nowrap, input.order-item-sku, span.text-muted');
            if (!nameEl || !skuEl) return;
            name = (nameEl.value || nameEl.textContent).trim();
            sku = (skuEl.dataset.originalSku || skuEl.value || skuEl.textContent || '').trim();
            if (sku.startsWith('0')) return;
            const normalizedSku = normalizeSku(sku);
            if (!normalizedSku || uniqueSkus.has(normalizedSku)) return;
            const match = findImageMatch(sku, name);
            if (match && match.image) {

                items.push({
  fullSizeUrl: getFullSizeImageUrl(match.image),
  thumbnailUrl: match.image,
  productName: name,
  sku: sku,
  quantity: row.querySelector('td:nth-child(5)')?.textContent.trim() || '' // Updated to 5th column for quantity
});

                uniqueSkus.add(normalizedSku);
            }
        });
        return items;
        } catch (error) {
            console.error(`[${SCRIPT_NAME}] Error extracting gallery data:`, error);
            return [];
        }
    }

    // MODIFICATION START: Updated injectImagesAndLinks to accept a scope parameter
    function injectImagesAndLinks(scope = document) {
    // MODIFICATION END
        try {
            if (!settings || !settings.showImages) return;
        const productTable = findProductTableInScope(scope);
        if (productTable) {
            productTable.querySelectorAll('tbody tr:not([data-image-processed])').forEach(row => {
                // Find cells by header content instead of hardcoded positions
                const thead = productTable.querySelector('thead tr');
                let nameCell = null;
                let skuCell = null;

                if (thead) {
                    const headers = Array.from(thead.querySelectorAll('th')).map(th => th.textContent.trim());
                    const nameIndex = headers.findIndex(header => header === 'שם');
                    const skuIndex = headers.findIndex(header => header === 'מק״ט');

                    if (nameIndex !== -1) nameCell = row.cells[nameIndex];
                    if (skuIndex !== -1) skuCell = row.cells[skuIndex];
                }

                // Fallback to hardcoded positions if header method didn't work
                if (!nameCell) nameCell = row.querySelector('td:nth-child(4)');
                if (!skuCell) skuCell = row.querySelector('td:nth-child(2)');

                if(!nameCell || !skuCell) return;
                const targetCell = row.cells[0]; // Image always goes into the first TD
                const name = nameCell.textContent.trim(), sku = (skuCell.dataset.originalSku || skuCell.textContent || '').trim();
                const match = findImageMatch(sku, name);
                if (match) {
                    if (match.image && !targetCell.querySelector('.tampermonkey-sku-image')) {
                        targetCell.innerHTML = '';
                        targetCell.append(createImageElement(match, name, sku, { maxHeight: '80px', maxWidth: '80px' }));
                    }
                    if (match.link && !nameCell.querySelector('a')) {
                        // Check if there's an Anipet button in this cell or nearby
                        const hasAnipetButton = nameCell.querySelector('.anipet-alternatives-btn') ||
                                               nameCell.closest('tr').querySelector('.anipet-alternatives-btn');

                        // Only create link if there's no Anipet button
                        if (!hasAnipetButton) {
                            const link = document.createElement('a');
                            link.href = match.link;
                            link.target = '_blank';
                            link.rel = 'noopener noreferrer';
                            link.innerHTML = nameCell.innerHTML;
                            nameCell.innerHTML = '';
                            nameCell.appendChild(link);
                        }
                    }
                }
                row.setAttribute('data-image-processed', 'true');
            });
        }
        // This part is for the modal rows
        scope.querySelectorAll('td.pick-order-item-row:not([data-image-processed])').forEach(cell => {
            const imageContainer = cell.querySelector('.col-sm-6 > .d-flex.align-items-center'); if (!imageContainer) return;
            const name = cell.querySelector('span.text-dark-75')?.textContent.trim() || '';
            const sku = cell.querySelector('span.text-muted')?.textContent.trim() || '';
            const match = findImageMatch(sku, name);
            if (match && match.image) {
                const wrapper = document.createElement('div'); wrapper.style.marginRight = '10px';
                wrapper.append(createImageElement(match, name, sku, { maxHeight: '50px', maxWidth: '50px', padding: '5px' }));
                imageContainer.prepend(wrapper);
            }
            cell.setAttribute('data-image-processed', 'true');
        });
        // This part is for the modal form items
        const modalForm = scope.querySelector('form[id^="edit_task_"]');
        if (modalForm) {
            const headerContainer = modalForm.querySelector('.order-item-header > span.d-flex');
            if (headerContainer && !headerContainer.querySelector('.tampermonkey-image-header')) {
                const newHeader = document.createElement('div'); newHeader.textContent = 'תמונה'; newHeader.className = 'tampermonkey-image-header'; newHeader.style.cssText = 'width: 88px; flex: 0 0 88px;'; headerContainer.prepend(newHeader);
            }
            modalForm.querySelectorAll('.nested-fields.order-item-row:not([data-image-processed])').forEach(row => {
                const flexContainer = row.querySelector('div.d-flex.align-items-center');
                if (flexContainer && !flexContainer.querySelector('.tampermonkey-image-placeholder')) {
                    const placeholder = document.createElement('div'); placeholder.className = 'tampermonkey-image-placeholder';
                    placeholder.style.cssText = 'width: 88px; flex: 0 0 88px; display: flex; align-items: center; justify-content: center; margin-right: 8px;';
                    flexContainer.prepend(placeholder);
                    const name = row.querySelector('input.order-item-name')?.value.trim();
                    const sku = row.querySelector('input.order-item-sku')?.value.trim();
                    const match = findImageMatch(sku, name);
                    if (match && match.image) placeholder.append(createImageElement(match, name, sku, { maxHeight: '70px', maxWidth: '80px' }));
                }
                row.setAttribute('data-image-processed', 'true');
            });
        }
        } catch (error) {
            console.error(`[${SCRIPT_NAME}] Error injecting images and links:`, error);
        }
    }

    // MODIFICATION START: Updated replaceBarcodesInViews to accept a scope parameter
    function replaceBarcodesInViews(scope = document) {
    // MODIFICATION END
        try {
            if (!settings || !settings.replaceBarcodes || !itemCodeToBarcodeMap) return;
        const contexts = [ '#taskOverview table', '#kt_content table', 'form[id^="edit_task_"]', '.modal-body:has(.pick-order-item-table)' ];
        // MODIFICATION: Changed document.querySelectorAll to scope.querySelectorAll
        scope.querySelectorAll(contexts.join(', ')).forEach(context => {
        // MODIFICATION END
            const skuElements = context.querySelectorAll('td.text-nowrap, span.text-muted.font-weight-bold, input.order-item-sku');
            skuElements.forEach(el => {
                if(!el.hasAttribute('data-original-sku')) return;
                const nameContainer = el.closest('tr, .nested-fields, .pick-order-item-row');

                let nameEl;
                if (context.id === 'operator-store-visits-table' || context.matches('#taskOverview table, #kt_content table')) {
                    // Main table: Name is at td:nth-child(10)
                    nameEl = nameContainer?.querySelector('.order-item-name, .text-dark-75, td:nth-child(10)');
                } else {
                    // Modals: Name is at td:nth-child(3)
                    nameEl = nameContainer?.querySelector('.order-item-name, .text-dark-75, td:nth-child(3)');
                }

                const name = nameEl?.value || nameEl?.textContent.trim() || '';
                const sku = el.getAttribute('data-original-sku');
                const barcode = findBarcode(sku, name);
                if (barcode) {
                    if(el.tagName === 'INPUT') el.value = barcode; else el.textContent = barcode;
                    el.classList.add(el.tagName === 'INPUT' ? 'barcode-input-highlight' : 'barcode-highlight');
                    el.title = `הוחלף. מקורי: ${sku}`;
                }
            });
        });
        } catch (error) {
            console.error(`[${SCRIPT_NAME}] Error replacing barcodes in views:`, error);
        }
    }

    // This is the correct and ONLY definition for injectPreviewFunctionality
    function injectPreviewFunctionality(mainTableBody) {
        try {
            if (!settings || !settings.enablePreview || mainTableBody.hasAttribute('data-preview-injected')) return;
        const headerRow = mainTableBody.closest('table').querySelector('thead tr');
        let previewHeaderCell = null;

        // MODIFICATION START: Hide the original empty TH (th.noVis.pt-2) from the header
        // This TH is structurally present at data-column-index="1" but visually empty.
        // We hide it to collapse its space in the header row.
        const emptyHeaderToHide = headerRow.querySelector('th.noVis.pt-2.sorting_disabled[data-column-index="1"]');
        if (emptyHeaderToHide) {
            emptyHeaderToHide.classList.add('tm-hideable-column'); // Use our utility class to hide it
        }
        // MODIFICATION END

        // MODIFICATION START: Insert our "Toggle All" Preview Button TH at the correct position
        // Check if already added by us
        previewHeaderCell = headerRow.querySelector('th.preview-header');

        if (!previewHeaderCell) {
            // Find the original Checkbox header (th:nth-child(1) / data-column-index="0")
            const checkboxHeader = headerRow.querySelector('th[data-column-index="0"]');
            // Insert our new preview header immediately after the checkbox header.
            // This will make our new TH `th:nth-child(2)`.
            // The original `th.noVis.pt-2` (empty) will then be `th:nth-child(3)` (and is hidden by CSS).
            if (checkboxHeader) {
                previewHeaderCell = document.createElement('th');
                previewHeaderCell.classList.add('preview-header');
                headerRow.insertBefore(previewHeaderCell, checkboxHeader.nextSibling); // Insert AFTER checkbox header
            } else {
                // Fallback: If checkbox header not found, insert at the beginning (less ideal for precise alignment)
                previewHeaderCell = document.createElement('th');
                previewHeaderCell.classList.add('preview-header');
                headerRow.insertBefore(previewHeaderCell, headerRow.children[0]); // Fallback to start
            }
        }

if (previewHeaderCell && !previewHeaderCell.querySelector('.preview-toggle-all-button')) {
            const button = document.createElement('button');
            button.className = 'btn btn-sm btn-icon btn-light-primary preview-toggle-all-button';
            button.innerHTML = '<i class="fa-light fa-list-tree" title="פתח/סגור את כל הפריטים"></i>';

            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // קובע אם צריך לפתוח או לסגור לפי המצב הנוכחי
                const isAnyOpen = mainTableBody.querySelector('.preview-cell button i.fa-chevron-up');
                const targetIconClass = isAnyOpen ? 'fa-chevron-up' : 'fa-chevron-down';

                // מוצא את כל האייקונים הפוטנציאליים
                const iconsToConsider = mainTableBody.querySelectorAll(`.preview-cell button i.${targetIconClass}`);

                // עובר על כל האייקונים ולוחץ רק אם השורה שלהם מוצגת
                iconsToConsider.forEach(icon => {
                    const parentRow = icon.closest('tr[data-task-id]');
                    // התנאי שבודק אם השורה אכן נראית על המסך
                    if (parentRow && parentRow.offsetParent !== null) {
                        const targetButton = icon.closest('button');
                        if (targetButton) {
                            targetButton.click();
                        }
                    }
                });
            });

            previewHeaderCell.innerHTML = '';
            previewHeaderCell.appendChild(button);

            previewHeaderCell.style.padding = '0.75rem 0.5rem';
            previewHeaderCell.style.textAlign = 'center';
        }

        // MODIFICATION END (for TH insertion)


        // CORRECTED FOR EACH LOOP (TD insertion logic):
        mainTableBody.querySelectorAll('tr[data-task-id]:not([data-preview-processed])').forEach(row => {
            // MODIFICATION START: DO NOT remove/move content from td.noVis.pt-2.
            // That TD (the ✅ icon) is an important visible column and should stay in its original position.
            // We are NOT hiding it here. Its width is controlled by new CSS for '.noVis.pt-2'.
            // MODIFICATION END

            const cell = document.createElement('td'); // This is the cell for the individual preview button
            cell.className = 'preview-cell';
            const button = document.createElement('button');
            button.className = 'btn btn-sm btn-icon btn-light-primary';
            button.innerHTML = '<i class="fa-light fa-chevron-down"></i>'; // Only the chevron icon initially

            button.dataset.taskId = row.dataset.taskId;
            button.title = 'הצג פריטים'; // Base title

            cell.append(button);
            // Insert the button cell at index 1 (the second position after the original checkbox).
            // This is crucial: [Checkbox (0)], [OUR BUTTON (1)], [✅ Icon (2)], [Order ID (3)]
            row.insertBefore(cell, row.children[1]);
            // MODIFICATION END (for TD insertion)

            button.addEventListener('click', async (e) => {
                e.preventDefault(); e.stopPropagation();
                const currentButton = e.currentTarget, icon = currentButton.querySelector('i'), taskId = currentButton.dataset.taskId, parentRow = currentButton.closest('tr'), existingPreview = document.getElementById(`preview-for-${taskId}`);
                if (existingPreview) { existingPreview.remove(); icon.classList.replace('fa-chevron-up', 'fa-chevron-down'); return; }
                icon.classList.replace('fa-chevron-down', 'fa-refresh'); icon.classList.add('fa-spin'); currentButton.disabled = true;
                try {
                    const response = await fetch(`/tasks/${taskId}`); if (!response.ok) throw new Error(`Fetch error: ${response.status}`);
                    const doc = new DOMParser().parseFromString(await response.text(), 'text/html'); const allItems = [];

                    // Extract notes from the fetched task page
                    let notesText = '';
                    const notesEl = doc.querySelector('.bg-yellow .hover-copy'); // Assuming this is the selector for notes
                    if (notesEl && notesEl.textContent.includes('מוכן')) { // Check for "מוכן" as per the new script's logic
                        notesText = notesEl.textContent.trim();
                    }

                    const productTable = findProductTableInScope(doc);
                    if (productTable) {
                        const headers = Array.from(productTable.querySelectorAll('thead th')).map(th => th.textContent.trim());
                        const skuIndex = headers.indexOf('מק״ט'), nameIndex = headers.indexOf('שם'), quantityIndex = headers.indexOf('כמות / לוקט');
                        if (skuIndex !== -1 && nameIndex !== -1 && quantityIndex !== -1) {
                            productTable.querySelectorAll('tbody tr').forEach(itemRow => {
                                const cells = itemRow.cells;
                                const name = cells[nameIndex].textContent.trim(), sku = cells[skuIndex].textContent.trim(), quantity = cells[quantityIndex].textContent.trim();
                                const imageMatch = findImageMatch(sku, name); const barcodeMatch = findBarcode(sku, name);
                                allItems.push({ name, sku, quantity, image: imageMatch ? imageMatch.image : PLACEHOLDER_IMG_URL, barcode: barcodeMatch });
                            });
                        }
                    }
                    const newRow = document.createElement('tr'); newRow.id = `preview-for-${taskId}`;
                    const newCell = document.createElement('td'); newCell.colSpan = parentRow.cells.length; newCell.style.cssText = 'padding: 15px; background-color: #f9f9f9;';
                    newCell.innerHTML = `<a href="/tasks/${taskId}" target="_blank" class="btn btn-primary btn-sm mb-3"><i class="fa-light fa-arrow-up-right-from-square" style="margin-left: 5px;"></i> פתח הזמנה</a>`;

                    // Add notes to the preview if found
                    if (notesText) {
                        newCell.innerHTML += `<div class="preview-notes">${notesText}</div>`;
                    }

                    if (allItems.length > 0) {
                        const container = document.createElement('div'); container.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px;';
                        allItems.forEach((item, itemIndex) => {
                            const itemDiv = document.createElement('div'); itemDiv.className = 'd-flex align-items-center border rounded p-2 m-1 bg-white';
                            const img = document.createElement('img'); img.src = item.image;
                            img.style.cssText = 'width: 50px; height: 50px; object-fit: contain; margin-left: 10px; cursor: pointer;';
                            img.onerror = function() { this.src = PLACEHOLDER_IMG_URL; this.style.cursor = 'default'; };
                            img.onclick = () => { const galleryData = allItems.map(i => ({
    fullSizeUrl: getFullSizeImageUrl(i.image),
    thumbnailUrl: i.image,
    productName: i.name,
    sku: i.sku,
    quantity: i.quantity // ✅ Add this
}));

                                                 showGalleryOverlay(galleryData, itemIndex); };
                            itemDiv.appendChild(img);
                            const textDiv = document.createElement('div');
                            let skuDisplay = `מק"ט: ${item.sku}`;
                            if (settings.replaceBarcodes && item.barcode) {
                                skuDisplay = `מק"ט: <strong class="barcode-highlight" title="מקורי: ${item.sku}">${item.barcode}</strong>`;
                            }
                            textDiv.innerHTML = `<div class="font-weight-bold" style="font-size:0.9rem;">${item.name}</div><div class="text-muted" style="font-size:0.8rem;">${skuDisplay} | כמות: ${item.quantity}</div>`;
                            itemDiv.appendChild(textDiv); container.appendChild(itemDiv);
                        });
                        newCell.appendChild(container);
                    } else { newCell.innerHTML += '<div class="text-center text-muted p-2">לא נמצאו פריטים.</div>'; }
                    newRow.appendChild(newCell); icon.classList.replace('fa-refresh', 'fa-chevron-up');
                    parentRow.after(newRow);
                } catch (err) { console.error("Failed to fetch task preview:", err); icon.classList.replace('fa-refresh', 'fa-exclamation-triangle');
                } finally { icon.classList.remove('fa-spin'); currentButton.disabled = false; }
            });
            row.setAttribute('data-preview-processed', 'true');
        });
        mainTableBody.setAttribute('data-preview-injected', 'true');
        } catch (error) {
            console.error(`[${SCRIPT_NAME}] Error injecting preview functionality:`, error);
        }
    }
    // MODIFICATION END: This is where the correct injectPreviewFunctionality function ends.

    function addResponsiveDataAttributes(table) {
        try {
            if (!settings || !settings.enableResponsive || !table) return;

            // Clear old labels
            table.querySelectorAll('tbody td[data-label]').forEach(td => td.removeAttribute('data-label'));

            // קח את כל הכותרות כולל preview, ריקים ומוסתרים
            const allHeaders = Array.from(table.querySelectorAll('thead th'));

            table.querySelectorAll('tbody tr').forEach((row) => {
                const allCells = Array.from(row.querySelectorAll('td'));
                allCells.forEach((cell, i) => {
                    const header = allHeaders[i];
                    if (header) {
                        const label = header.textContent.trim();
                        if (label) {
                            cell.setAttribute('data-label', label);
                        }
                    }
                });
            });

            table.setAttribute('data-responsive-labels-added', 'true');
        } catch (error) {
            console.error(`[${SCRIPT_NAME}] Error adding responsive data attributes:`, error);
        }
    }

    // MODIFICATION START: Updated tagColumnsForHiding to accept an optional scope
    function tagColumnsForHiding(scope = document) { // Default scope is document
    // MODIFICATION END
        try {
            // Process main tables if the scope is the whole document or contains them
            if (scope === document) { // Only process main tables if the overall document is the target
            scope.querySelectorAll('#taskOverview table, #kt_content table').forEach(table => {
                // MODIFICATION START: Ensure empty TH (th.noVis.pt-2) is handled
                // We are NOT hiding it using tm-hideable-column anymore.
                // We are just making it small via its direct class in CSS.
                // This block is no longer needed here, as the CSS targets directly.
                /*
                const emptyHeaderTh = table.querySelector('th.noVis.pt-2.sorting_disabled[data-column-index="1"]');
                if (emptyHeaderTh) {
                    emptyHeaderTh.classList.add('tm-icon-column-header'); // This used to hide it.
                }
                */
                // MODIFICATION END

                if (table.hasAttribute('data-columns-tagged')) return; // Skip if main table already processed

                const headersToHide = ['סוג', 'משקל', 'נפח', 'הערות'];
                Array.from(table.querySelectorAll('thead th')).forEach((th, index) => {
                    if (headersToHide.includes(th.textContent.trim())) {
                        th.classList.add('tm-hideable-column');
                        table.querySelectorAll(`tbody tr td:nth-child(${index + 1})`).forEach(td => td.classList.add('tm-hideable-column'));
                    }
                });
                const historyHeader = table.querySelector('thead th:has(i.fa-history), thead th.w-50px');
                if(historyHeader) historyHeader.classList.add('tm-hideable-column');
                table.querySelectorAll('tbody td:has(i.order-item-history-json)').forEach(cell => cell.classList.add('tm-hideable-column'));
                table.setAttribute('data-columns-tagged', 'true'); // Mark main tables as tagged
            });
        }

        // Process the modal form specifically (or any form within the given scope)
        const modalForm = scope.querySelector('form[id^="edit_task_"]');
        if (modalForm) { // Always process the modal form when called, to catch new rows
            const headersToHide = ['סוג', 'משקל', 'נפח', 'הערות'];
            const headerTitles = Array.from(modalForm.querySelectorAll('.order-item-header .order-item-header-title'));
            headerTitles.forEach((title) => {
                if (headersToHide.includes(title.textContent.trim())) {
                    title.classList.add('tm-hideable-column');
                }
            });
            // This is the crucial part for newly added rows:
            modalForm.querySelectorAll('.nested-fields.order-item-row').forEach(row => {
                // Ensure each row's inputs also get the hiding class
                headersToHide.forEach(headerText => {
                    // Find the corresponding input parent container
                    const targetInputParent = Array.from(row.querySelectorAll('.order-item-input')).find(inputDiv => {
                        const mobileHeader = inputDiv.querySelector('.mobile-size-header');
                        // Use the placeholder attribute to identify the input, as mobile-size-header might not always be there
                        const inputElement = inputDiv.querySelector('input');
                        return (mobileHeader && mobileHeader.textContent.trim() === headerText) ||
                               (inputElement && inputElement.getAttribute('placeholder') === headerText);
                    });
                    if (targetInputParent) {
                        targetInputParent.classList.add('tm-hideable-column');
                    }
                });
            });
            // Do NOT set data-columns-tagged on the modal form itself, as we want this to re-run for new rows.
        }
        } catch (error) {
            console.error(`[${SCRIPT_NAME}] Error tagging columns for hiding:`, error);
        }
    }
    // MODIFICATION END

function injectWhatsAppButtons() {
    try {
        if (!settings || !settings.addWhatsApp) return;
    const createWhatsAppLink = (phone, firstName) => {
        const numberForLink = `972${phone.replace(/\D/g, '').substring(1)}`;
        let href = `https://wa.me/${numberForLink}`;
        if (firstName) {
            const text = `שלום ${firstName}, זה מאניפט חוצות.`;
            href += `?text=${encodeURIComponent(text)}`;
        }
        const whatsappLink = document.createElement('a');
        whatsappLink.href = href;
        whatsappLink.target = 'whatsapp_window';
        whatsappLink.className = 'whatsapp-button';
        whatsappLink.title = 'שלח הודעה ב-WhatsApp';
        whatsappLink.innerHTML = '<i class="fa-brands fa-whatsapp"></i>'; // This icon is from FontAwesome, make sure it's loaded if needed
        whatsappLink.onclick = e => e.stopPropagation();
        return whatsappLink;
    };
    const findFirstName = (container) => {
        if (!container) return null;
        const nameEl = container.querySelector('[data-name="destination_recipient_name"] .hover-copy, a[href*="/crm/"], td[data-label="שם"]');
        if (nameEl && nameEl.textContent.trim()) {
            const fullName = nameEl.textContent.trim();
            const validNameRegex = /^[a-zA-Z\u0590-\u05FF\s]+$/;
            if (!validNameRegex.test(fullName) || fullName.startsWith('PA_') || fullName.startsWith('CU_')) {
                return null;
            }
            return fullName.split(' ')[0];
        }
        return null;
    };
    const prefixes = ['050', '051', '052', '053', '054', '055', '056', '058', '059'];
    const phoneRegex = new RegExp(`(^|[^\\d])(${prefixes.join('|')})[\\s-]?\\d{3}[\\s-]?\\d{4}\\b`, 'g');
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: node => (node.parentElement.closest('a, button, script, style, .whatsapp-injected') || node.nodeValue.trim().length < 9) ? NodeFilter.REJECT : (phoneRegex.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.REJECT) });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(textNode => {
        const parent = textNode.parentNode;
        if (parent.closest('.whatsapp-injected')) return;
        const scope = parent.closest('.card, tr, .panel_view, .px-3');
        const firstName = findFirstName(scope);
        let lastIndex = 0;
        const fragment = document.createDocumentFragment();
        textNode.nodeValue.replace(phoneRegex, (match, p1, p2, offset) => {
            const phoneText = match.substring(p1.length);
            if(offset > lastIndex) fragment.appendChild(document.createTextNode(textNode.nodeValue.substring(lastIndex, offset + p1.length)));
            const phoneSpan = document.createElement('span');
            phoneSpan.className = 'whatsapp-injected';
            phoneSpan.appendChild(createWhatsAppLink(phoneText, firstName));
            phoneSpan.appendChild(document.createTextNode(" " + phoneText));
            fragment.appendChild(phoneSpan);
            lastIndex = offset + match.length;
        });
        if (lastIndex > 0) {
            if (lastIndex < textNode.nodeValue.length) fragment.appendChild(document.createTextNode(textNode.nodeValue.substring(lastIndex)));
            parent.replaceChild(fragment, textNode);
        }
    });
        } catch (error) {
            console.error(`[${SCRIPT_NAME}] Error injecting WhatsApp buttons:`, error);
        }
}


// ---< Global Styles >---

   function injectGlobalStyles() {
    try {
        if (document.getElementById('tampermonkey-styles')) return;
    const css = `

    .whatsapp-injected, a.whatsapp-injected { display: inline-flex !important; align-items: center; white-space: nowrap; vertical-align: middle; }
.whatsapp-button i { font-size: 1.6em; height: 30px; line-height: 30px; color: #3699ff !important; transition: color 0.2s ease-in-out; margin-left: 5px; }
.whatsapp-button:hover i { color: #0073e9 !important; }

    .lwh-whatsapp-button {
    display: inline-block;
    margin-left: 6px;
    background-color: #25D366;
    color: white;
    border-radius: 4px;
    padding: 2px 5px;
    font-size: 12px;
    text-decoration: none;
}
.lwh-whatsapp-button:hover {
    background-color: #1ebe5d;
}

tr[id^="preview-for-"] td div.font-weight-bold.copy-enabled {
    color: #505050;
}


.gallery-sku {
    font-size: 1em;
    color: #ccc;
    margin: 0; /* Remove existing margins */
}



.gallery-counter {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 0.95em;
    text-align: center;
    color: inherit;
    margin: 0;
}


.gallery-caption {
    position: fixed; /* Changed to fixed */
    bottom: 45px; /* MODIFIED: Position above the dots (e.g., dots at 15px, 10px high dots + 20px gap = 45px) */
    left: 0; /* Align to left edge */
    right: 0; /* Align to right edge */
    width: 100%; /* Make it full width */
    display: flex; /* Keep flex for content centering */
    flex-direction: column;
    align-items: center;
    gap: 6px;
    text-align: center;
    color: #fff;
    background: rgba(0, 0, 0, 0.7); /* Slightly darker background for better visibility */
    padding: 8px 15px;
    border-radius: 0; /* Remove border-radius for edge-to-edge look */
    box-sizing: border-box; /* Ensures padding is included in width */
    z-index: 10; /* Ensure it's above the image but below the dots in z-index */
}


.gallery-dots {
    position: fixed;
    bottom: 15px; /* Keep this to be at the very bottom */
    left: 50%;
    transform: translateX(-50%);
    z-index: 15; /* Ensure it's on top of the caption */
    text-align: center;
    pointer-events: auto;
}

.gallery-dots .dot {
    height: 10px;
    width: 10px;
    margin: 0 4px;
    background-color: #bbb;
    border-radius: 50%;
    display: inline-block;
    transition: background-color 0.3s;
    cursor: pointer;
}

.gallery-dots .dot.active {
    background-color: #3699ff;
}



.tampermonkey-picked-none {
    color: #ff0000 !important;
    font-weight: bold;
}

.tampermonkey-picked-partial {
    color: #FFA500 !important;
    font-weight: bold;
}

.tampermonkey-picked-full {
    color: #008000 !important;
    font-weight: bold;
}



                /* Stronger selector for hover */
            td.copy-enabled:hover,
            div.copy-enabled:hover,
            span.copy-enabled:hover,
            strong.copy-enabled:hover {
            background-color: #F5FAFF !important;
}


table td.sorting_1.copy-enabled.cell-copied {
    background-color: #CDE5FF !important;

}


    td.copy-enabled.cell-copied {
    background-color: #CDE5FF !important;
}

td.copy-enabled {
    cursor: copy;
    transition: background-color 0.3s ease;
}

td.copy-enabled:hover {
    background-color: #F5FAFF !important;
}

td.copy-enabled.cell-copied {
    background-color: #CDE5FF !important;
}


        .copy-enabled {
            cursor: copy;
            transition: background-color 0.3s ease;
        }
            tr[id^="visit-row-"] td.copy-enabled:hover {
            background-color: rgba(225, 240, 255, 0.5) !important;
            transition: background-color 0.2s ease;
}

        /* MODIFICATION START: Explicitly set width/padding for th.noVis.pt-2 and td.noVis.pt-2 */
        th.noVis.pt-2.sorting_disabled[data-column-index="1"],
        td.noVis.pt-2 {
            width: 25px !important;
            min-width: 25px !important;
            max-width: 25px !important;
            padding: 0 !important;
            text-align: center !important;
            box-sizing: border-box !important;
            overflow: visible !important;
        }
        th.noVis.pt-2.sorting_disabled[data-column-index="1"] {
            display: table-cell !important;
        }

        #scriptStatusNotifier {
            position: fixed; top: 10px; right: 10px; z-index: 10000;
            background-color: #fff; padding: 8px 12px; border: 1px solid #ccc;
            border-radius: 5px; font-size: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            opacity: 0; transition: opacity 0.5s ease-in-out;
        }

        .barcode-highlight { color: #006400 !important; font-weight: bold; cursor: help; }
        .barcode-highlight-gallery { color: #90ee90 !important; font-weight: bold; cursor: help; }
        td.barcode-highlight, tr[id^="preview-for-"] .barcode-highlight {
            background-color: #e6ffed; padding: 2px 4px; border-radius: 3px;
        }
        .pick-order-item-row .barcode-highlight { background-color: transparent !important; }
        .barcode-input-highlight {
            background-color: #e6ffed !important;
            color: #006400 !important;
            font-weight: bold;
        }

        #tampermonkey-gallery-overlay {
            position:fixed;top:0;left:0;width:100%;height:100%;
            background:rgba(0,0,0,.88);display:flex;justify-content:center;align-items:center;
            z-index:20000;opacity:0;transition:opacity .3s ease
        }
.gallery-content-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    max-width: 90vw;
    max-height: calc(100vh - 145px); /* Max height for the wrapper too, matching image */
    padding-bottom: 0;
    text-align: center;
    position: relative; /* Keep this if anything else needs relative positioning inside */
}


#tampermonkey-gallery-overlay img {
    display: block;
    margin: 0 auto;
    max-width: 100%;
    /* MODIFIED: Calculate max-height to leave space for BOTH fixed caption and dots */
    /* Estimate caption height (padding + text height) + its own bottom margin, e.g., 70px + 10px = 80px */
    /* Estimate dots height + its own bottom margin, e.g., 10px + 15px = 25px */
    /* Total space needed below image: 80px (caption) + 25px (dots) = 105px */
    /* Add some general top/bottom padding for the entire overlay content, say 40px (20px top, 20px bottom) */
    /* So, total deduction: 105px + 40px = 145px (adjust 40px based on actual overall padding) */
    max-height: calc(100vh - 145px); /* This will make the image smaller but non-overlapping */
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}




.gallery-product-name {
    font-size: 1.2em;
    font-weight: normal;
    margin: 0; /* Remove existing margins */
    color: LightGray;
}

        .gallery-close, .gallery-nav {
            position:absolute;background:rgba(0,0,0,.3);color:#fff;border:none;
            cursor:pointer;font-weight:700;transition:background .2s ease;
            user-select:none;border-radius:8px;z-index:5
        }
        .gallery-close:hover, .gallery-nav:hover { background:rgba(0,0,0,.6) }
        .gallery-close {
            top:10px;right:15px;font-size:48px;padding:0 15px;line-height:1;z-index:10
        }
        .gallery-nav {
            top:50%;transform:translateY(-50%);font-size:40px;padding:5px 20px
        }
        .gallery-nav.prev { right:15px }
        .gallery-nav.next { left:15px }


        .preview-cell {
            background-color: inherit !important;
            text-align: center !important;
        }
        .preview-cell button i { transition:transform .2s ease-in-out }
        .preview-cell i.fa-chevron-up { transform:rotate(180deg) }

        .preview-toggle-all-button {
            transition: background-color 0.15s ease, color 0.15s ease;
        }
        .preview-toggle-all-button:hover {
            background-color: #3699ff !important;
            color: #ffffff !important;
        }
        .preview-toggle-all-button i { margin: 0 !important; }

        .preview-notes {
            background-color: #ffc !important; color: #333;
            padding: 10px; margin-bottom: 10px; border-radius: 4px;
            border: 1px solid #ffeb3b;
        }

        .btn-group.btn-group-sm.m-1:has(#expand-all-btn),
        a#expand-all-btn {
            display: none !important;
        }

        body.tampermonkey-hide-columns-enabled .tm-hideable-column {
            display: none !important;
        }

        @media (min-width:768px){
            body.tampermonkey-hide-columns-enabled #order-items-edit-modal .modal-dialog {
                max-width: 850px !important;
            }
            body.tampermonkey-hide-columns-enabled #order-items-edit-modal .order-item-input.order-item-big,
            body.tampermonkey-hide-columns-enabled #order-items-edit-modal .order-item-header-title.order-item-big {
                width: calc(55% - 1rem) !important;
            }
            body.tampermonkey-hide-columns-enabled #order-items-edit-modal .order-item-input:has(input.order-item-sku),
            body.tampermonkey-hide-columns-enabled #order-items-edit-modal .order-item-header-title:not(.order-item-big):not(.order-item-small):not(.tampermonkey-image-header) {
                width: calc(25% - 1rem) !important;
            }
            body.tampermonkey-hide-columns-enabled #order-items-edit-modal .order-item-input.order-item-small,
            body.tampermonkey-hide-columns-enabled #order-items-edit-modal .order-item-header-title.order-item-small {
                width: calc(10% - 1rem) !important;
            }
        }

@media (max-width: 767px) {
  body.tampermonkey-responsive-enabled .table-responsive { overflow-x:hidden!important; }
  body.tampermonkey-responsive-enabled .table-responsive>.table { border:0 }
  body.tampermonkey-responsive-enabled .table-responsive thead { display:none }
  body.tampermonkey-responsive-enabled .table-responsive tr {
      display:block; border:1px solid #dee2e6;
      border-radius:.35rem; margin-bottom:1rem; background-color:#fff
  }
  body.tampermonkey-responsive-enabled .table-responsive td {
      display:block; text-align:right; padding:.75rem 1rem!important;
      border-bottom:1px solid #eee
  }
  body.tampermonkey-responsive-enabled .table-responsive td:last-child {
    border-bottom: 0;
  }
  body.tampermonkey-responsive-enabled .table-responsive td[data-label]::before {
      content: attr(data-label);
      display: block;
      font-weight: 700;
      color: #5e6278;
      font-size: .9em;
      margin-bottom: .3rem;
  }
  body.tampermonkey-responsive-enabled .table-responsive td[data-label="סוג"],
  body.tampermonkey-responsive-enabled .table-responsive td[data-label="משקל"],
  body.tampermonkey-responsive-enabled .table-responsive td[data-label="נפח"],
  body.tampermonkey-responsive-enabled .table-responsive td[data-label="הערות"] {
      display: none !important;
  }
} /* ← פה סוגרים את ה־@media */

/* עכשיו מחוץ ל־@media הקוד להצר את העמודה */
#operator-store-visits-table {
  table-layout: fixed !important;
}

/* תופסים את התא ה־2 להבטיח רוחב של 25px */
#operator-store-visits-table thead tr th:nth-child(2),
#operator-store-visits-table tbody tr td:nth-child(2) {
  width: 25px !important;
  min-width: 25px !important;
  max-width: 25px !important;
  overflow: hidden !important;
  white-space: nowrap !important;
}

/* במידה ויש <colgroup> */
#operator-store-visits-table col:nth-child(2) {
  width: 25px !important;
  max-width: 25px !important;
}

#operator-store-visits-table {
  width: 100% !important;        /* תמיד למלא את רוחב הקונטיינר */
  table-layout: auto !important; /* תפרוס לפי תוכן, לא לפי עמודות קבועות */
}

/* שמור על העמודה השנייה (כפתור PREVIEW) צרה */
#operator-store-visits-table thead tr th:nth-child(2),
#operator-store-visits-table tbody tr td:nth-child(2) {
  width: 25px !important;
  min-width: 25px !important;
  max-width: 25px !important;
  overflow: hidden !important;
  white-space: nowrap !important;
}

/* אם תרצה לדאוג שתא ה-PREVIEW יתפרס לגמרי – אך לרוב לא צריך */
#operator-store-visits-table tr[id^="preview-for-"] > td {
  width: 100% !important;
}

/* Merlog Row Highlighting */
.merlog-highlight {
    background-color: rgba(255, 0, 0, 0.1) !important;
    transition: background-color 0.3s ease;
}

.merlog-highlight:hover {
    background-color:  rgb(255, 230, 230) !important;
}

/* Override for table cells specifically */
td.merlog-highlight {
    background-color: rgb(255, 200, 200) !important;
    border-radius: 4px;
    padding: 4px 8px;
    margin: 2px 0;
}

td.merlog-highlight:hover {
    background-color: rgb(255, 180, 180) !important;
}

/* Exclude preview cells from merlog highlighting */
td.preview-cell.merlog-highlight,
.preview-cell.merlog-highlight {
    background-color: inherit !important;
    border-radius: inherit !important;
    padding: inherit !important;
    margin: inherit !important;
}

td.preview-cell.merlog-highlight:hover,
.preview-cell.merlog-highlight:hover {
    background-color: inherit !important;
}

/* Force preview cells to keep their original styling */
.preview-cell {
    background-color: inherit !important;
    text-align: center !important;
}

/* Override any merlog highlighting on preview cells */
tr.merlog-highlight .preview-cell,
tr.merlog-highlight td.preview-cell,
.preview-cell.merlog-highlight,
td.preview-cell.merlog-highlight {
    background-color: inherit !important;
    border-radius: inherit !important;
    padding: inherit !important;
    margin: inherit !important;
    box-shadow: none !important;
}

/* Force preview cells to always keep their original styling */
.preview-cell,
td.preview-cell {
    background-color: transparent !important;
    background: transparent !important;
    text-align: center !important;
}

/* Override any hover effects on preview cells */
.preview-cell:hover,
td.preview-cell:hover {
    background-color: transparent !important;
    background: transparent !important;
}

/* Force preview cell buttons to keep their original styling */
.preview-cell button,
td.preview-cell button {
    background-color: #f3f6f9 !important;
    border-color: #e1e3ea !important;
}

.preview-cell button:hover,
td.preview-cell button:hover {
    background-color: #e1e3ea !important;
    border-color: #b5b5c3 !important;
}

/* Merlog Table Cell Highlighting - Darker red for specific cells */
#operator-store-visits-table td.merlog-highlight:not(.preview-cell),
#tasks-table td.merlog-highlight:not(.preview-cell),
table td.merlog-highlight:not(.preview-cell) {
    background-color: rgb(255, 200, 200) !important;
    border-radius: 4px;
    padding: 4px 8px;
    margin: 2px 0;
}

#operator-store-visits-table td.merlog-highlight:hover:not(.preview-cell),
#tasks-table td.merlog-highlight:hover:not(.preview-cell),
table td.merlog-highlight:hover:not(.preview-cell) {
    background-color: rgb(255, 180, 180) !important;
}

/* Merlog Panel View Highlighting - Solid background */
.offcanvas.merlog-highlight {
    background-color: rgb(255, 230, 230) !important;
    backdrop-filter: blur(0px) !important;
}

.offcanvas.merlog-highlight:hover {
    background-color:  rgb(255, 230, 230)  !important;
}

/* Merlog Panel View Row Highlighting - Darker red for specific rows */
.offcanvas .select2-selection--single.merlog-highlight,
.offcanvas .col-xxl-5.col-6.merlog-highlight,
.offcanvas .col-xxl-7.col-6.merlog-highlight {
    background-color: rgb(255, 200, 200) !important;
    border-radius: 4px;
    padding: 4px 8px;
    margin: 2px 0;
}

.offcanvas .select2-selection--single.merlog-highlight:hover,
.offcanvas .col-xxl-5.col-6.merlog-highlight:hover,
.offcanvas .col-xxl-7.col-6.merlog-highlight:hover {
    background-color: rgb(255, 180, 180) !important;
}
  `;

  GM_addStyle(css);
        } catch (error) {
            console.error(`[${SCRIPT_NAME}] Error injecting global styles:`, error);
        }
}
// ✅ OUTSIDE the previous function block — correctly placed
function enableCopyStyling(el) {
    if (!el || !el.classList || !el.hasAttribute) return;

    if (!el.classList.contains('copy-enabled')) {
        el.classList.add('copy-enabled');
    }
    if (!el.hasAttribute('title')) {
        el.setAttribute('title', 'לחץ להעתקה');
    }
}

function prepareCopyElements() {
    try {
        document.querySelectorAll(`
            tr[id^="visit-row-"] td.text-nowrap,
            tr[id^="visit-row-"] td,
            strong.barcode-highlight,
            strong.barcode-highlight-gallery,
            .font-weight-bold,
            .gallery-product-name
        `).forEach(enableCopyStyling);
    } catch (error) {
        console.error(`[${SCRIPT_NAME}] Error preparing copy elements:`, error);
    }
}




    // ---< Merlog Row Highlighting >---
    function highlightMerlogRows() {
        try {
            // Check if settings exists and highlightMerlog is enabled
            if (!settings || !settings.highlightMerlog) return;

            // Try to find the correct table
            let table = document.querySelector('#operator-store-visits-table');
            if (!table) {
                table = document.querySelector('#tasks-table');
            }
            if (!table) {
                // Try to find any table that might contain the data
                table = document.querySelector('table');
            }
            if (!table) return;



            const thead = table.querySelector('thead tr');
            if (!thead) return;

            let highlightedCount = 0;
            let totalRows = 0;

            // Process each row
            table.querySelectorAll('tbody tr').forEach((row, rowIndex) => {
                totalRows++;
                let shouldHighlight = false;

                

                // Check driver column - look for "שיגור למרלוג"
                Array.from(row.cells).forEach(cell => {
                    // Skip preview cells
                    if (cell.classList.contains('preview-cell')) return;
                    
                    const dataLabel = cell.getAttribute('data-label');
                    if (dataLabel === 'נהג') {
                        // Look for the actual displayed text in the select2 element
                        const select2Rendered = cell.querySelector('.select2-selection__rendered');
                        if (select2Rendered) {
                                                const driverText = select2Rendered.textContent.trim();
                    // Look for specific patterns that indicate Merlog delivery
                            if (driverText.includes('שיגור למרלוג')) {
                                shouldHighlight = true;
                                cell.classList.add('merlog-highlight');
                                cell.style.backgroundColor = 'rgb(255, 200, 200)';
                                cell.style.borderRadius = '4px';
                                cell.style.padding = '4px 8px';
                            } else {
                                cell.classList.remove('merlog-highlight');
                                cell.style.backgroundColor = '';
                                cell.style.borderRadius = '';
                                cell.style.padding = '';
                            }
                        }
                    }
                });

                // Check area column - look for specific Merlog area patterns
                Array.from(row.cells).forEach(cell => {
                    // Skip preview cells
                    if (cell.classList.contains('preview-cell')) return;
                    
                    const dataLabel = cell.getAttribute('data-label');
                    if (dataLabel === 'איזור חלוקה') {
                        const cellText = cell.textContent.trim();
                        // Look for specific Merlog area patterns
                        if (cellText.includes('מרלוג') &&
                            (cellText.includes('צור יגאל') ||
                             cellText.includes('צ\'יטה'))) {
                            shouldHighlight = true;
                            cell.classList.add('merlog-highlight');
                            cell.style.backgroundColor = 'rgb(255, 200, 200)';
                            cell.style.borderRadius = '4px';
                            cell.style.padding = '4px 8px';
                        } else {
                            cell.classList.remove('merlog-highlight');
                            cell.style.backgroundColor = '';
                            cell.style.borderRadius = '';
                            cell.style.padding = '';
                        }
                    }
                });

                // Check client column - look for "אניפט מרלוג"
                Array.from(row.cells).forEach(cell => {
                    // Skip preview cells
                    if (cell.classList.contains('preview-cell')) return;
                    
                    const dataLabel = cell.getAttribute('data-label');
                    const cellText = cell.textContent.trim();

                    // Look for "אניפט מרלוג" in client column
                    if (dataLabel === 'לקוח' && cellText.includes('אניפט מרלוג')) {
                        shouldHighlight = true;
                        cell.classList.add('merlog-highlight');
                    } else {
                        cell.classList.remove('merlog-highlight');
                    }
                });

                // Apply highlighting
                if (shouldHighlight) {
                    row.classList.add('merlog-highlight');
                    highlightedCount++;
                } else {
                    row.classList.remove('merlog-highlight');
                }
                
                // Remove merlog-highlight from preview cells in this row
                row.querySelectorAll('.preview-cell').forEach(previewCell => {
                    // Force preview cell to have transparent background
                    previewCell.style.setProperty('background-color', 'transparent', 'important');
                    previewCell.style.setProperty('background', 'transparent', 'important');
                    previewCell.classList.remove('merlog-highlight');
                    previewCell.style.borderRadius = '';
                    previewCell.style.padding = '';
                });
            });


        } catch (error) {
            console.error(`[${SCRIPT_NAME}] Error highlighting Merlog rows:`, error);
        }
    }

    // ---< Merlog Panel View Highlighting >---
    function highlightMerlogPanelView() {
        try {
            // Check if settings exists and highlightMerlog is enabled
            if (!settings || !settings.highlightMerlog) return;

            // Find the panel view
            const panelView = document.querySelector('.offcanvas.offcanvas-custom-right');
            if (!panelView) return;

            let shouldHighlight = false;

            // Check for "שיגור למרלוג" in driver section
            const driverSelect = panelView.querySelector('.select2-selection--single');
            if (driverSelect) {
                const driverText = driverSelect.textContent.trim();
                if (driverText.includes('שיגור למרלוג')) {
                    shouldHighlight = true;
                    driverSelect.classList.add('merlog-highlight');
                } else {
                    driverSelect.classList.remove('merlog-highlight');
                }
            }

            // Check for "מרלוג" in area section
            const areaSections = panelView.querySelectorAll('.col-xxl-5.col-6');
            areaSections.forEach(section => {
                const labelSpan = section.querySelector('span');
                if (labelSpan && labelSpan.textContent.trim() === 'איזור חלוקה') {
                    const valueSection = section.nextElementSibling;
                    if (valueSection) {
                        const valueText = valueSection.textContent.trim();
                        if (valueText.includes('מרלוג') &&
                            (valueText.includes('צור יגאל') ||
                             valueText.includes('צ\'יטה'))) {
                            shouldHighlight = true;
                            // Highlight the entire row (label + value)
                            section.classList.add('merlog-highlight');
                            valueSection.classList.add('merlog-highlight');
                        } else {
                            section.classList.remove('merlog-highlight');
                            valueSection.classList.remove('merlog-highlight');
                        }
                    }
                }
            });

            // Check for "אניפט מרלוג" in client section
            const clientSections = panelView.querySelectorAll('.col-xxl-5.col-6');
            clientSections.forEach(section => {
                const labelSpan = section.querySelector('span');
                if (labelSpan && labelSpan.textContent.trim() === 'לקוח') {
                    const valueSection = section.nextElementSibling;
                    if (valueSection) {
                        const valueText = valueSection.textContent.trim();
                        if (valueText.includes('אניפט מרלוג')) {
                            shouldHighlight = true;
                            // Highlight the entire row (label + value)
                            section.classList.add('merlog-highlight');
                            valueSection.classList.add('merlog-highlight');
                        } else {
                            section.classList.remove('merlog-highlight');
                            valueSection.classList.remove('merlog-highlight');
                        }
                    }
                }
            });

            // Apply highlighting to the entire panel
            if (shouldHighlight) {
                panelView.classList.add('merlog-highlight');
            } else {
                panelView.classList.remove('merlog-highlight');
            }

        } catch (error) {
            console.error(`[${SCRIPT_NAME}] Error highlighting Merlog panel view:`, error);
        }
    }

    // ---< Main Execution & Control Flow >---
    function runMainLogic() {
        // Prevent multiple simultaneous executions
        if (window.runMainLogicExecuting) return;
        window.runMainLogicExecuting = true;

        safeExecute(() => {
            // MODIFICATION: Call tagColumnsForHiding initially with default scope (document)
            tagColumnsForHiding();
            document.querySelectorAll('.table-responsive > .table, #operator-store-visits-table').forEach(addResponsiveDataAttributes);
            document.querySelectorAll('td.text-nowrap, span.text-muted.font-weight-bold, input.order-item-sku').forEach(el => {
                if (!el.hasAttribute('data-original-sku')) el.setAttribute('data-original-sku', el.tagName === 'INPUT' ? el.value.trim() : el.textContent.trim());
            });
            // MODIFICATION: Call these with default scope (document)
            replaceBarcodesInViews();
            injectImagesAndLinks(document);
            injectWhatsAppButtons();
            highlightMerlogRows(); // Add Merlog row highlighting
            highlightMerlogPanelView(); // Add Merlog panel view highlighting

            // MODIFICATION START: Add MutationObserver for the "עריכת פריטים" modal
            let editTaskModal = null;
            // Iterate through all modal-content elements to find the correct one
            document.querySelectorAll('.modal-content').forEach(modal => {
                const modalTitle = modal.querySelector('h4.modal-title');
                if (modalTitle && modalTitle.textContent.trim() === 'עריכת פריטים') {
                    editTaskModal = modal;
                }
            });

            if (editTaskModal && !editTaskModal.hasAttribute('data-columns-hidden-observer-active')) {
                const observerConfig = { childList: true, subtree: true };
                const modalObserver = new MutationObserver((mutationsList, observer) => {
                    clearTimeout(modalObserver.debounceTimer);
                    modalObserver.debounceTimer = setTimeout(() => {
                        const modalForm = editTaskModal.querySelector('form[id^="edit_task_"]');
                        if (modalForm) {
                            // Pass the specific modalForm as scope to the functions
                            safeExecute(() => tagColumnsForHiding(modalForm)); // Re-apply column hiding
                            safeExecute(() => injectImagesAndLinks(modalForm)); // Re-process images/links
                            safeExecute(() => replaceBarcodesInViews(modalForm)); // Re-process barcodes
                        }
                    }, 50); // Small debounce delay
                });
                modalObserver.observe(editTaskModal, observerConfig);
                editTaskModal.setAttribute('data-columns-hidden-observer-active', 'true'); // Mark observer as active
            }
            // MODIFICATION END

            const firstOrderRow = document.querySelector('tr[id^="visit-row-"]');
            if (firstOrderRow) {
                const mainTableBody = firstOrderRow.closest('tbody');
                if (mainTableBody) safeExecute(() => injectPreviewFunctionality(mainTableBody));
            }

            // Add MutationObserver for panel view highlighting
            const panelView = document.querySelector('.offcanvas.offcanvas-custom-right');
            if (panelView && !panelView.hasAttribute('data-merlog-observer-active')) {
                const panelObserver = new MutationObserver((mutations) => {
                    clearTimeout(panelObserver.debounceTimer);
                    panelObserver.debounceTimer = setTimeout(() => {
                        highlightMerlogPanelView();
                    }, 100);
                });
                panelObserver.observe(panelView, { childList: true, subtree: true });
                panelView.setAttribute('data-merlog-observer-active', 'true');
            }
        }, () => {
            // Fallback function
            console.error(`[${SCRIPT_NAME}] Error in runMainLogic`);
        });

        // Reset the execution flag
        window.runMainLogicExecuting = false;
    }

    // Create debounced version of runMainLogic
    const debouncedRunMainLogic = debounce(() => {
        if (!window.runMainLogicExecuting) {
            runMainLogic();
        }
    }, 100);

function highlightPickQuantities() {
    try {
        const elements = document.querySelectorAll('td[data-label="כמות / לוקט"], div.text-muted');

        elements.forEach(el => {
            if (!el || !el.innerHTML) return;

            let html = el.innerHTML;
            const match = html.match(/(\d+)\s*\/\s*(\d+)/);
            if (!match) return;

            const picked = parseInt(match[1]);
            const total = parseInt(match[2]);

            // Skip 0 / 1
            if (picked === 0 && total === 1) return;

            const replacementClass =
                picked === total ? 'tampermonkey-picked-full' :
                picked === 0 && total > 1 ? 'tampermonkey-picked-none' :
                'tampermonkey-picked-partial';

            // Replace the number portion only
            html = html.replace(/(\d+\s*\/\s*\d+)/, `<span class="${replacementClass}">$1</span>`);
            el.innerHTML = html;
        });
    } catch (error) {
        console.error(`[${SCRIPT_NAME}] Error highlighting pick quantities:`, error);
    }
}




async function initialize() {
  try {
    // Prevent multiple initializations
    if (window.anipetToolboxInitialized) return;
    window.anipetToolboxInitialized = true;

    createStatusNotifier();
    await loadSettings();
    registerMenuCommands();
    injectGlobalStyles();
    await Promise.all([ getProductData(), loadBarcodeCsv() ]);

    runMainLogic(); // ← הרצת ההזרקות הראשוניות

  // ◂ MutationObserver על כל הטבלה כדי לזרוק Preview בכל page-change / filter
const table = document.querySelector('#operator-store-visits-table');
if (table) {
  const tableObserver = new MutationObserver((mutations) => {
    // בכל שינוי בתת-עץ של הטבלה, ננסה להזריק Preview מחדש
    const tb = table.querySelector('tbody');
    if (!tb) return;
    tb.removeAttribute('data-preview-injected');
    if (settings && settings.enablePreview) {
      injectPreviewFunctionality(tb);
    }
  });
  tableObserver.observe(table, {
    childList: true,
    subtree: true
  });
}



  prepareCopyElements();
  highlightPickQuantities();

  // ◂ המשך הקוד שלך – MutationObserver וכו׳
  const observer = new MutationObserver((mutationsList) => {
    clearTimeout(observer.debounceTimer);
    observer.debounceTimer = setTimeout(() => {
      if (!window.runMainLogicExecuting) {
        runMainLogic();
      }
      prepareCopyElements();
      highlightPickQuantities();
      highlightMerlogPanelView(); // Add panel view highlighting
    }, 100);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  } catch (error) {
    console.error(`[${SCRIPT_NAME}] Error in initialize:`, error);
  }
}

document.body.addEventListener('click', function (e) {
    // Ignore clicks on buttons, links, inputs, or media
    if (e.target.closest('button, a, input, textarea, svg, img')) return;

    let target = e.target;

    // --- Handle barcode in preview or gallery ---
    if (target.matches('strong.barcode-highlight, strong.barcode-highlight-gallery')) {
        enableCopyStyling(target)
        copyWithFeedback(target, target.textContent.trim());
        return;
    }

    // --- Handle preview name ---
    if (target.classList.contains('font-weight-bold')) {
        enableCopyStyling(target)
        copyWithFeedback(target, target.textContent.trim());
        return;
    }

    // --- Handle gallery product name ---
    if (target.classList.contains('gallery-product-name')) {
        enableCopyStyling(target)
        copyWithFeedback(target, target.textContent.trim());
        return;
    }

    // --- Handle gallery barcode (clicking anywhere in .gallery-sku) ---
    if (target.closest('.gallery-sku')) {
        const strong = target.closest('.gallery-sku').querySelector('strong');
        if (strong) {
            enableCopyStyling(strong); // ✅ apply to correct element
            copyWithFeedback(strong, strong.textContent.trim());
            return;
        }
    }

    // --- Fallback: handle <td> with text ---
    if (target.tagName === 'TD' && target.textContent.trim()) {
        enableCopyStyling(target)
        copyWithFeedback(target, target.textContent.trim());
    }
});

function copyWithFeedback(element, text) {
    try {
        if (!element || !text) return;

        navigator.clipboard.writeText(text).then(() => {
            element.classList.add('cell-copied');

            // ✅ Force background color in case CSS doesn't win
            element.style.setProperty('background-color', '#CDE5FF', 'important');

            setTimeout(() => {
                element.classList.remove('cell-copied');
                // ✅ Clean up inline style to avoid interference
                element.style.removeProperty('background-color');
            }, 400);
        }).catch(err => {
            console.warn('Copy failed:', err);
        });
    } catch (error) {
        console.error(`[${SCRIPT_NAME}] Error in copyWithFeedback:`, error);
    }
}






  if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }



})(); //
