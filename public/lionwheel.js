// ==UserScript==
// @name         LionWheel to Anipet Alternatives
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  Add Anipet pixel icon button to LionWheel products (barcode search) - new column after barcode
// @author       Adam Lee
// @match        https://members.lionwheel.com/*
// @updateURL    https://anipetapp.netlify.app/lionwheel.js
// @downloadURL  https://anipetapp.netlify.app/lionwheel.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const ANIPET_APP_URL = 'https://anipetapp.netlify.app';
    const BUTTON_CLASS = 'anipet-alternatives-btn';
    const ICON_URL = 'https://anipetapp.netlify.app/pixel.svg';
    const DEBOUNCE_DELAY = 100;
    const RETRY_INTERVAL = 1000;
    const RECHECK_INTERVAL = 5000;

    // Performance tracking
    let isInitialized = false;
    let processedTables = new Set();
    let errorCount = 0;
    const MAX_ERRORS = 5;

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function createAlternativesButton(productName, searchTerm) {
        try {
            if (!searchTerm || searchTerm.trim() === '') {
                return null;
            }
            
        const button = document.createElement('button');
            button.className = BUTTON_CLASS;
            button.type = 'button';
            button.title = 'חפש תחליפים';
            button.setAttribute('aria-label', `חפש תחליפים ב-Anipet עבור ${productName}`);
            button.style.cssText = `
                background: none;
                border: none;
                padding: 0;
                margin: 0;
                cursor: pointer;
                vertical-align: middle;
                line-height: 1;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                transition: all 0.2s ease-in-out;
                transform: scale(1);
            `;
            
            // Use inline SVG instead of external image
            const svgIcon = `
                <svg width="28" height="28" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline; vertical-align: middle; transition: all 0.2s ease-in-out;">
                    <defs>
                        <style>.c{fill:#fbf0dc;}.d{fill:#f47b44;}.e{fill:#231f20;}.f{fill:#f79027;}</style>
                    </defs>
                    <polygon class="f" points="474 704.7 474 754.6 395.9 754.6 395.9 732 368.4 732 368.4 755.8 342.5 755.8 342.5 704.7 369.2 704.7 369.2 626.4 395.9 626.4 420.5 626.4 420.5 654.2 446.2 654.2 446.2 680 474 680 474 704.7"/>
                    <polygon class="f" points="683.1 704.7 683.1 755.8 657.2 755.8 657.2 732 631.1 732 631.1 809.3 630.9 809.3 630.9 754.6 552.6 754.6 552.6 704.7 552.6 680 578.8 680 578.8 654.2 604.4 654.2 604.4 626.4 629.7 626.4 656.4 626.4 656.4 704.7 683.1 704.7"/>
                    <polygon class="f" points="711.7 466.3 711.7 546.7 683.1 546.7 683.1 573.5 657.7 573.5 657.7 546.6 631.1 546.6 631.1 520.8 604.3 520.8 578.8 520.8 578.8 494 604.9 494 604.9 439.4 578.8 439.4 578.8 494 553.5 494 551.9 494 473.7 494 472.1 494 446.2 494 446.2 439.4 420.7 439.4 420.7 494 446.2 494 446.2 520.8 420.6 520.8 395.9 520.8 395.9 546.6 367.3 546.6 367.3 573.3 342.5 573.3 342.5 546.7 313.9 546.7 313.9 466.3 342.5 466.3 342.5 393 313.9 393 313.9 235.5 367.3 235.5 367.3 262.3 395.9 262.3 395.9 289 421.6 289 421.6 342.8 422.4 342.8 448.3 342.8 512.8 342.8 577.3 342.8 603.2 342.8 604 342.8 604 289 630.8 289 630.8 262.3 657.5 262.3 657.5 235.5 711.7 235.5 711.7 393 683.1 393 683.1 466.3 711.7 466.3"/>
                    <rect class="e" x="711.7" y="466.3" width="26.7" height="80.4"/>
                    <rect class="e" x="711.7" y="235.5" width="26.7" height="157.4"/>
                    <polygon class="e" points="711.7 677.1 711.7 782.6 683.8 782.6 683.8 809.3 657.2 809.3 656.4 809.3 631.4 809.3 631.1 809.3 631.1 732 657.2 732 657.2 755.8 683.1 755.8 683.1 704.7 656.4 704.7 656.4 626.4 629.7 626.4 629.7 600.4 657.7 600.4 657.7 573.5 683.1 573.5 683.1 677.1 711.7 677.1"/>
                    <rect class="e" x="683.1" y="546.7" width="28.6" height="26.7"/>
                    <rect class="e" x="683.1" y="393" width="28.6" height="73.3"/>
                    <polygon class="e" points="711.7 208.8 711.7 235.5 657.5 235.5 657.2 235.5 657.2 208.8 711.7 208.8"/>
                    <polygon class="c" points="657.7 573.5 657.7 600.4 629.7 600.4 629.7 626.4 604.4 626.4 604.4 654.2 578.8 654.2 578.8 680 552.6 680 552.6 704.7 525.4 704.7 525.2 704.7 525.2 782.4 498.5 782.4 498.5 704.7 474 704.7 474 680 446.2 680 446.2 654.2 420.5 654.2 420.5 626.4 395.9 626.4 395.9 600.4 367.3 600.4 367.3 573.3 367.3 546.6 395.9 546.6 395.9 520.8 420.6 520.8 446.2 520.8 446.2 494 472.1 494 472.1 520.7 473.7 520.7 498.5 520.7 498.5 546.7 447.5 546.7 447.5 573.5 472.4 573.5 472.4 600.4 473.7 600.4 498.5 600.4 498.5 626.4 525.2 626.4 525.2 600.4 551.9 600.4 553.2 600.4 553.2 573.5 578.1 573.5 578.1 546.7 526.5 546.7 526.5 520.7 551.9 520.7 553.5 520.7 553.5 494 578.8 494 578.8 520.8 604.3 520.8 631.1 520.8 631.1 546.6 657.7 546.6 657.7 573.5"/>
                    <polygon class="e" points="657.5 235.5 657.5 262.3 630.8 262.3 630.8 235.5 657.2 235.5 657.5 235.5"/>
                    <polygon class="e" points="631.4 809.3 631.4 835.6 552.6 835.6 552.6 809.3 630.9 809.3 631.1 809.3 631.4 809.3"/>
                    <rect class="c" x="552.6" y="754.6" width="78.4" height="54.6"/>
                    <rect class="e" x="604" y="262.3" width="26.7" height="26.7"/>
                    <rect class="e" x="578.8" y="439.4" width="26.1" height="54.6"/>
                    <polygon class="e" points="604 289 604 342.8 603.2 342.8 577.3 342.8 512.8 342.8 448.3 342.8 422.4 342.8 421.6 342.8 421.6 289 448.3 289 448.3 316.1 512.8 316.1 577.3 316.1 577.3 289 604 289"/>
                    <polygon class="e" points="578.1 546.7 578.1 573.5 553.2 573.5 553.2 600.4 551.9 600.4 525.2 600.4 525.2 573.5 525.2 573.2 498.5 573.2 498.5 573.5 498.5 600.4 473.7 600.4 472.4 600.4 472.4 573.5 447.5 573.5 447.5 546.7 498.5 546.7 498.5 520.7 473.7 520.7 472.1 520.7 472.1 494 473.7 494 551.9 494 553.5 494 553.5 520.7 551.9 520.7 526.5 520.7 526.5 546.7 578.1 546.7"/>
                    <polygon class="e" points="552.6 754.6 552.6 809.3 527.1 809.3 525.2 809.3 498.5 809.3 474 809.3 474 754.6 474 704.7 498.5 704.7 498.5 782.4 498.5 782.6 525.2 782.6 525.2 782.4 525.4 782.4 525.4 704.7 552.6 704.7 552.6 754.6"/>
                    <rect class="e" x="525.2" y="704.7" width=".2" height="77.7"/>
                    <rect class="e" x="498.5" y="600.4" width="26.7" height="26"/>
                    <rect class="d" x="498.5" y="573.5" width="26.7" height="26.9"/>
                    <rect class="e" x="498.5" y="573.2" width="26.7" height=".2"/>
                    <rect class="e" x="395.9" y="809.3" width="78.1" height="26.4"/>
                    <rect class="c" x="395.9" y="754.6" width="78.1" height="54.6"/>
                    <rect class="e" x="420.7" y="439.4" width="25.5" height="54.6"/>
                    <rect class="e" x="395.9" y="262.3" width="25.6" height="26.7"/>
                    <polygon class="e" points="395.9 754.6 395.9 809.3 369.2 809.3 368.4 809.3 341.8 809.3 341.8 782.6 313.9 782.6 313.9 677.1 342.5 677.1 342.5 573.5 342.5 573.3 367.3 573.3 367.3 600.4 395.9 600.4 395.9 626.4 369.2 626.4 369.2 704.7 342.5 704.7 342.5 755.8 368.4 755.8 368.4 732 395.9 732 395.9 754.6"/>
                    <rect class="e" x="367.3" y="235.5" width="28.6" height="26.7"/>
                    <rect class="e" x="313.9" y="208.8" width="53.4" height="26.7"/>
                    <polygon class="e" points="342.5 573.3 342.5 573.5 313.9 573.5 313.9 546.7 342.5 546.7 342.5 573.3"/>
                    <rect class="e" x="313.9" y="393" width="28.6" height="73.3"/>
                    <rect class="e" x="287.1" y="466.3" width="26.7" height="80.4"/>
                    <rect class="e" x="287.1" y="235.5" width="26.7" height="157.4"/>
                </svg>
            `;
            
            button.innerHTML = svgIcon;

            // Enhanced hover animations
        button.onmouseover = function() {
                button.style.transform = 'scale(1.1)';
                button.style.filter = 'drop-shadow(0 0 4px #3182ce) brightness(1.2)';
                const svg = button.querySelector('svg');
                if (svg) {
                    svg.style.filter = 'brightness(1.3)';
                }
        };
        
        button.onmouseout = function() {
                button.style.transform = 'scale(1)';
                button.style.filter = '';
                const svg = button.querySelector('svg');
                if (svg) {
                    svg.style.filter = '';
                }
            };
            
            // Create button with enhanced event handling
            button.addEventListener('mousedown', function(event) {
                // Stop all event propagation immediately
                event.stopImmediatePropagation();
                event.stopPropagation();
                event.preventDefault();
                
                // Use searchTerm for search (barcode or product name)
                const searchUrl = `${ANIPET_APP_URL}?barcode=${encodeURIComponent(searchTerm)}`;
                
                // Open in new tab
                window.open(searchUrl, '_blank', 'noopener,noreferrer');
                
                return false;
            }, true); // Use capture phase to intercept early
            
            // Also prevent click events
            button.addEventListener('click', function(event) {
                event.stopImmediatePropagation();
                event.stopPropagation();
                event.preventDefault();
                return false;
            }, true);
            
            // Prevent any default button behavior
            button.addEventListener('mouseup', function(event) {
                event.stopImmediatePropagation();
                event.stopPropagation();
                event.preventDefault();
                return false;
            }, true);
            
            return button;
        } catch (error) {
            console.error('Error creating button:', error);
            errorCount++;
            return null;
        }
    }

    function isProductTable(table) {
        // Check if this is a product table by looking for product-specific headers
        const thead = table.querySelector('thead tr');
        if (!thead) return false;
        
        const headers = Array.from(thead.querySelectorAll('th')).map(th => th.textContent.trim());
        
        // Product tables should have "מק״ט" (barcode) and "שם" (name) headers
        const hasBarcodeHeader = headers.includes('מק״ט');
        const hasNameHeader = headers.includes('שם');
        
        // Message tables have different headers like "תאריך", "תוכן", "טלפון"
        const hasMessageHeaders = headers.includes('תאריך') || headers.includes('תוכן') || headers.includes('טלפון');
        
        return hasBarcodeHeader && hasNameHeader && !hasMessageHeaders;
    }

    function findCellsByHeader(row) {
        try {
            const table = row.closest('table');
            const thead = table.querySelector('thead tr');
            
            if (!thead) {
                // Fallback to hardcoded positions if no header
                return {
                    nameCell: row.querySelector('td:nth-child(4)'),
                    barcodeCell: row.querySelector('td:nth-child(2)')
                };
            }
            
            const headers = Array.from(thead.querySelectorAll('th')).map(th => th.textContent.trim());
            
            // Find name and barcode columns by header content
            const nameIndex = headers.findIndex(header => header === 'שם');
            const barcodeIndex = headers.findIndex(header => header === 'מק״ט');
            
            const nameCell = nameIndex !== -1 ? row.cells[nameIndex] : null;
            const barcodeCell = barcodeIndex !== -1 ? row.cells[barcodeIndex] : null;
            
            // If we couldn't find by headers, try fallback selectors
            if (!nameCell) {
                const fallbackNameCell = row.querySelector('td:has(.order-item-name), td:has(.text-dark-75), td:has(a[href*="/products/"])');
                if (fallbackNameCell) {
                    return { nameCell: fallbackNameCell, barcodeCell };
                }
            }
            
            if (!barcodeCell) {
                const fallbackBarcodeCell = row.querySelector('td.text-nowrap, td:has(span.text-muted)');
                if (fallbackBarcodeCell) {
                    return { nameCell, barcodeCell: fallbackBarcodeCell };
                }
            }
            
            return { nameCell, barcodeCell };
        } catch (error) {
            console.error('Error finding cells by header:', error);
            // Ultimate fallback
            return {
                nameCell: row.querySelector('td:nth-child(4)'),
                barcodeCell: row.querySelector('td:nth-child(2)')
            };
        }
    }

    function addAniPetIconToRows() {
        try {
            // Check error limit
            if (errorCount >= MAX_ERRORS) {
                console.warn('Too many errors, stopping script execution');
                return;
            }
            
            // Find all tables and filter for product tables only
            const allTables = document.querySelectorAll('table.table-hover');
            if (!allTables || allTables.length === 0) {
                return;
            }
            
            const productTables = Array.from(allTables).filter(table => {
                // Skip already processed tables
                if (processedTables.has(table)) {
                    return false;
                }
                return isProductTable(table);
            });
            
            if (productTables.length === 0) {
                return;
            }

            productTables.forEach(table => {
                try {
                    const productRows = table.querySelectorAll('tbody tr');
                    
                    if (productRows.length === 0) return;

                    // Add header to the third column (after barcode column) if it doesn't exist
                    const thead = table.querySelector('thead tr');
                    if (thead) {
                        // Check if Anipet header already exists
                        const existingAnipetHeader = thead.querySelector('.anipet-header');
                        if (!existingAnipetHeader) {
                            // Find the barcode header (second column)
                            const barcodeHeader = thead.querySelector('th:nth-child(2)');
                            if (barcodeHeader) {
                                // Create new Anipet header (empty, no text)
                                const anipetHeader = document.createElement('th');
                                anipetHeader.className = 'anipet-header';
                                anipetHeader.style.cssText = `
                                    width: 30px;
                                    min-width: 30px;
                                    max-width: 30px;
                                    text-align: center;
                                    padding: 8px 4px;
                                    background-color: #ebedf3 !important;
                                `;
                                
                                // Insert after barcode header
                                barcodeHeader.parentNode.insertBefore(anipetHeader, barcodeHeader.nextSibling);
                            }
                        }
                    }

                    let added = 0;
                    productRows.forEach((row, index) => {
                        try {
                            // Skip if already processed
                            if (row.getAttribute('data-anipet-processed') === 'true') {
                                return;
                            }
                            
                                    const { nameCell, barcodeCell } = findCellsByHeader(row);
        
        // ננסה למצוא שם מוצר בעמודה עם header "שם"
        let productName = '';
        if (nameCell) {
            productName = nameCell.textContent.trim();
        }
        
        // אם לא מצאנו בעמודה עם header "שם", ננסה בעמודה השלישית
        if (!productName) {
            const thirdColumnCell = row.querySelector('td:nth-child(3)');
            if (thirdColumnCell) {
                productName = thirdColumnCell.textContent.trim();
            }
        }
        

                            
                            let barcode = '';
                            if (barcodeCell) {
                                barcode = barcodeCell.textContent.trim();
                            }
                            
                            // Check if Anipet cell already exists
                            const existingAnipetCell = row.querySelector('.anipet-cell');
                            if (!existingAnipetCell) {
                                // Create new Anipet cell
                                const anipetCell = document.createElement('td');
                                anipetCell.className = 'anipet-cell';
                                anipetCell.style.cssText = `
                                    width: 30px;
                                    min-width: 30px;
                                    max-width: 30px;
                                    text-align: center;
                                    vertical-align: middle;
                                    padding: 4px;
                                    border-top: 1px solid #dee2e6;
                                `;
                                            // אם יש ברקוד, צור כפתור עם ברקוד. אם אין ברקוד אבל יש שם מוצר, צור כפתור עם שם המוצר
            if (barcode) {
                const button = createAlternativesButton(productName, barcode);
                if (button) {
                    anipetCell.appendChild(button);
                }
            } else if (productName) {
                const button = createAlternativesButton(productName, productName);
                if (button) {
                    anipetCell.appendChild(button);
                }
            }
                                // Insert after barcode cell (second column)
                                if (barcodeCell && barcodeCell.parentNode) {
                                    barcodeCell.parentNode.insertBefore(anipetCell, barcodeCell.nextSibling);
                                } else {
                                    // fallback: הוסף לסוף השורה
                                    row.appendChild(anipetCell);
                                }
                            }
                            // Mark the row as processed
                            row.setAttribute('data-anipet-processed', 'true');
                            added++;
                        } catch (rowError) {
                            console.error('Error processing row:', rowError);
                            errorCount++;
                        }
                    });

                    // Mark table as processed
                    processedTables.add(table);
                    
                } catch (tableError) {
                    console.error('Error processing table:', tableError);
                    errorCount++;
                }
            });
            
        } catch (error) {
            console.error('Error in addAniPetIconToRows:', error);
            errorCount++;
        }
    }

    const debouncedAddButtons = debounce(addAniPetIconToRows, DEBOUNCE_DELAY);

    function observeAndAddButtons() {
        try {
            const observer = new MutationObserver(mutations => {
                let shouldAdd = false;
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === 1 && (node.tagName === 'TR' || node.querySelector && node.querySelector('tr'))) {
                                shouldAdd = true;
                            }
                        });
                    }
                });
                if (shouldAdd) debouncedAddButtons();
            });
            observer.observe(document.body, { childList: true, subtree: true });
        } catch (error) {
            console.error('Error setting up observer:', error);
            errorCount++;
        }
    }

    function isProductPage() {
        try {
            const hasTable = document.querySelector('table.table-hover') !== null;
            return hasTable;
        } catch (error) {
            console.error('Error checking if product page:', error);
            return false;
        }
    }

    function init() {
        try {
            
            if (isInitialized) {
                return;
            }
            
            if (!isProductPage()) {
                setTimeout(init, RETRY_INTERVAL);
                return;
            }
            
            isInitialized = true;
            
            // Inject styles to prevent conflicts with other userscripts
            injectGlobalStyles();
            
            setTimeout(addAniPetIconToRows, 100);
        observeAndAddButtons();
        
            // Reduced frequency of re-checks
            setInterval(() => {
                if (errorCount < MAX_ERRORS) {
                    addAniPetIconToRows();
                }
            }, RECHECK_INTERVAL);
            
        } catch (error) {
            console.error('Error in init:', error);
            errorCount++;
        }
    }

    function injectGlobalStyles() {
        if (document.getElementById('tampermonkey-styles')) return;
        const css = `
        /* Disable pointer events on parent anchor tags containing our button */
        a:has(.anipet-alternatives-btn) {
            pointer-events: none !important;
        }
        
        /* Re-enable pointer events specifically for our button */
        a:has(.anipet-alternatives-btn) .anipet-alternatives-btn {
            pointer-events: auto !important;
        }
        
        /* Alternative approach for browsers that don't support :has() */
        .anipet-alternatives-btn {
            position: relative;
            z-index: 1000;
        }
        
        /* Ensure our button is clickable even when wrapped in anchor */
        .anipet-alternatives-btn,
        .anipet-alternatives-btn * {
            pointer-events: auto !important;
        }
        
        /* Disable any parent anchor's click behavior around our button */
        .anipet-alternatives-btn {
            isolation: isolate;
        }
        `;
        
        const style = document.createElement('style');
        style.id = 'anipet-button-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();