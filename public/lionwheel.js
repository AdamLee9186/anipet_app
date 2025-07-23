// ==UserScript==
// @name         LionWheel to Anipet Alternatives
// @namespace    http://tampermonkey.net/
// @version      2.4
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
    const ICON_URL = 'https://anipetapp.netlify.app/public/pixel.svg';
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

    function createAlternativesButton(productName, barcode) {
        try {
            if (!barcode || barcode.trim() === '') {
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
            
            button.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (!barcode) return;
                
                try {
                    const searchUrl = `${ANIPET_APP_URL}?barcode=${encodeURIComponent(barcode)}`;
                    window.open(searchUrl, '_blank');
                    
                    // Visual feedback
                    button.disabled = true;
                    button.style.transform = 'scale(0.95)';
                    const svg = button.querySelector('svg');
                    if (svg) {
                        svg.style.filter = 'grayscale(1) brightness(1.5)';
                    }
                    
                    setTimeout(() => {
                        button.disabled = false;
                        button.style.transform = 'scale(1)';
                        if (svg) {
                            svg.style.filter = '';
                        }
                    }, 1200);
                } catch (error) {
                    console.error('Error opening Anipet search:', error);
                    button.disabled = false;
                }
            };
            
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
                            
                            const nameCell = row.querySelector('td:nth-child(3)');
                            const barcodeCell = row.querySelector('td:nth-child(2)');
                            
                            if (!nameCell || !barcodeCell) {
                                return;
                            }
                            
                            const productName = nameCell.textContent.trim();
                            const barcode = barcodeCell.textContent.trim();
                            
                            if (!barcode) {
                                return;
                            }
                            
                            const button = createAlternativesButton(productName, barcode);
                            
                            if (!button) {
                                return;
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
                                anipetCell.appendChild(button);
                                
                                // Insert after barcode cell (second column)
                                barcodeCell.parentNode.insertBefore(anipetCell, barcodeCell.nextSibling);
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();