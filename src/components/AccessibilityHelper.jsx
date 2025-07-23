import React, { useEffect } from 'react';

const AccessibilityHelper = () => {

  useEffect(() => {
    // Add ARIA labels and roles to improve accessibility
    const addAccessibilityAttributes = () => {
      // Add skip link for keyboard navigation
      if (!document.getElementById('skip-link')) {
        const skipLink = document.createElement('a');
        skipLink.id = 'skip-link';
        skipLink.href = '#main-content';
        skipLink.textContent = 'דלג לתוכן הראשי';
        skipLink.style.cssText = `
          position: absolute;
          top: -40px;
          left: 6px;
          background: #1d4ed8;
          color: white;
          padding: 8px;
          text-decoration: none;
          border-radius: 4px;
          z-index: 10000;
          font-family: 'Rubik', sans-serif;
        `;
        skipLink.addEventListener('focus', () => {
          skipLink.style.top = '6px';
        });
        skipLink.addEventListener('blur', () => {
          skipLink.style.top = '-40px';
        });
        document.body.insertBefore(skipLink, document.body.firstChild);
      }

      // Add main content landmark
      const mainContent = document.querySelector('#root');
      if (mainContent && !mainContent.getAttribute('role')) {
        mainContent.setAttribute('role', 'main');
        mainContent.id = 'main-content';
      }

      // Add ARIA labels to images
      const images = document.querySelectorAll('img:not([alt])');
      images.forEach((img, index) => {
        if (!img.alt) {
          img.alt = `תמונה ${index + 1}`;
        }
      });

      // Add ARIA labels to buttons
      const buttons = document.querySelectorAll('button:not([aria-label])');
      buttons.forEach((button) => {
        if (!button.ariaLabel && button.textContent.trim()) {
          button.setAttribute('aria-label', button.textContent.trim());
        }
      });

      // Add ARIA labels to links
      const links = document.querySelectorAll('a:not([aria-label])');
      links.forEach((link) => {
        if (!link.ariaLabel && link.textContent.trim()) {
          link.setAttribute('aria-label', link.textContent.trim());
        }
      });
    };

    // Add keyboard navigation support
    const addKeyboardNavigation = () => {
      document.addEventListener('keydown', (event) => {
        // Escape key to close modals
        if (event.key === 'Escape') {
          const modals = document.querySelectorAll('[role="dialog"]');
          modals.forEach((modal) => {
            const closeButton = modal.querySelector('[aria-label*="סגור"], [aria-label*="close"]');
            if (closeButton) {
              closeButton.click();
            }
          });
        }

        // Enter key for buttons and links
        if (event.key === 'Enter') {
          const target = event.target;
          if (target.tagName === 'BUTTON' || target.tagName === 'A') {
            target.click();
          }
        }
      });
    };

    // Add focus management
    const addFocusManagement = () => {
      // Trap focus in modals
      const modals = document.querySelectorAll('[role="dialog"]');
      modals.forEach((modal) => {
        const focusableElements = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          modal.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') {
              if (event.shiftKey) {
                if (document.activeElement === firstElement) {
                  event.preventDefault();
                  lastElement.focus();
                }
              } else {
                if (document.activeElement === lastElement) {
                  event.preventDefault();
                  firstElement.focus();
                }
              }
            }
          });
        }
      });
    };

    // Add high contrast mode support
    const addHighContrastSupport = () => {
      const style = document.createElement('style');
      style.id = 'high-contrast-style';
      style.textContent = `
        @media (prefers-contrast: high) {
          * {
            border: 1px solid !important;
          }
          
          button, a {
            background: black !important;
            color: white !important;
            border: 2px solid white !important;
          }
          
          input, select, textarea {
            border: 2px solid black !important;
            background: white !important;
            color: black !important;
          }
        }
        
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `;
      
      if (!document.getElementById('high-contrast-style')) {
        document.head.appendChild(style);
      }
    };

    // Initialize accessibility features
    addAccessibilityAttributes();
    addKeyboardNavigation();
    addFocusManagement();
    addHighContrastSupport();

  }, []);

  return null; // This component doesn't render anything
};

export default AccessibilityHelper; 