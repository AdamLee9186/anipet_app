// ==UserScript==
// @name         LionWheel to AniPet Alternatives
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Add search alternatives button to LionWheel products
// @author       You
// @match        https://members.lionwheel.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Configuration
    const ANIPET_APP_URL = 'https://anipetapp.netlify.app';
    
    // Function to create the alternatives button
    function createAlternativesButton(productName, barcode) {
        const button = document.createElement('button');
        button.innerHTML = `
            <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggMTZDNi42MTQyNSAxNiA1LjI2MDgzIDE1LjY4NzUgNC4wMDAwMyAxNS4wNzVMMi4yMjUgMTYuODVMMCAxNC42MjVMMS43NzUgMTIuODVDMS4yNjI1IDExLjYxOTIgMSAxMC4zMjUgMSA5QzEgNC4wMzUgNC4wMzUgMSA5IDFDMTMuOTY1IDEgMTcgNC4wMzUgMTcgOUMxNyAxMy45NjUgMTMuOTY1IDE3IDkgMTdaTTkgMkM0LjU4IDIgMSA1LjU4IDEgMTBDMSAxNC40MiA0LjU4IDE4IDkgMThDMTMuNDIgMTggMTcgMTQuNDIgMTcgMTBDMTcgNS41OCAxMy40MiAyIDkgMloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik05IDExQzEwLjEwNDYgMTEgMTEgMTAuMTA0NiAxMSA5QzExIDcuODk1NDMgMTAuMTA0NiA3IDkgN0M3Ljg5NTQzIDcgNyA3Ljg5NTQzIDcgOUM3IDEwLjEwNDYgNy44OTU0MyAxMSA5IDExWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+" 
                 alt="🔍" 
                 style="width: 12px; height: 12px; vertical-align: middle; margin-right: 2px;">
            תחליפים
        `;
        
        button.style.cssText = `
            background: linear-gradient(135deg, #3182ce, #2c5aa0);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 11px;
            cursor: pointer;
            margin-left: 4px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            transition: all 0.2s ease;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        `;
        
        button.onmouseover = function() {
            this.style.background = 'linear-gradient(135deg, #2c5aa0, #1e3a8a)';
            this.style.transform = 'translateY(-1px)';
            this.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        };
        
        button.onmouseout = function() {
            this.style.background = 'linear-gradient(135deg, #3182ce, #2c5aa0)';
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
        };
        
        button.onclick = function() {
            // Prefer product name over barcode for better search results
            const searchTerm = productName || barcode;
            const searchUrl = `${ANIPET_APP_URL}?search=${encodeURIComponent(searchTerm)}`;
            
            // Open in new tab
            window.open(searchUrl, '_blank');
            
            // Show feedback
            const originalText = this.innerHTML;
            this.innerHTML = '✓ נשלח!';
            this.style.background = 'linear-gradient(135deg, #38a169, #2f855a)';
            
            setTimeout(() => {
                this.innerHTML = originalText;
                this.style.background = 'linear-gradient(135deg, #3182ce, #2c5aa0)';
            }, 1500);
        };
        
        return button;
    }
    
    // Function to add buttons to existing products
    function addButtonsToProducts() {
        // Find all product rows in the table
        const productRows = document.querySelectorAll('table tbody tr');
        
        productRows.forEach((row, index) => {
            // Skip if button already exists
            if (row.querySelector('.anipet-alternatives-btn')) {
                return;
            }
            
            // Get product name (3rd column)
            const nameCell = row.querySelector('td:nth-child(3)');
            // Get barcode (2nd column)
            const barcodeCell = row.querySelector('td:nth-child(2)');
            
            if (nameCell && barcodeCell) {
                const productName = nameCell.textContent.trim();
                const barcode = barcodeCell.textContent.trim();
                
                // Only add button if we have a product name
                if (productName && productName.length > 0) {
                    const button = createAlternativesButton(productName, barcode);
                    button.className = 'anipet-alternatives-btn';
                    
                    // Add button to the last cell (or create a new one)
                    const lastCell = row.querySelector('td:last-child');
                    if (lastCell) {
                        lastCell.appendChild(button);
                    } else {
                        // Create new cell if needed
                        const newCell = document.createElement('td');
                        newCell.appendChild(button);
                        row.appendChild(newCell);
                    }
                }
            }
        });
    }
    
    // Function to observe DOM changes and add buttons to new products
    function observeAndAddButtons() {
        const observer = new MutationObserver(function(mutations) {
            let shouldAddButtons = false;
            
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if new table rows were added
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) { // Element node
                            if (node.tagName === 'TR' || node.querySelector('tr')) {
                                shouldAddButtons = true;
                            }
                        }
                    });
                }
            });
            
            if (shouldAddButtons) {
                setTimeout(addButtonsToProducts, 100);
            }
        });
        
        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Initialize
    function init() {
        console.log('🔍 LionWheel to AniPet Alternatives script loaded');
        
        // Add buttons to existing products
        setTimeout(addButtonsToProducts, 1000);
        
        // Observe for new products
        observeAndAddButtons();
        
        // Re-add buttons periodically (in case of dynamic content)
        setInterval(addButtonsToProducts, 5000);
    }
    
    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();