import { useState, useEffect, useCallback } from 'react';

export const usePWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // Check if app is installed
  useEffect(() => {
    const checkInstallation = () => {
      // Check if running in standalone mode (installed)
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
      }
      
      // Check if running in fullscreen mode
      if (window.navigator.standalone === true) {
        setIsInstalled(true);
      }
    };

    checkInstallation();
  }, []);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      
      // Show install prompt after user interaction
      setShowInstallPrompt(true);
      
      console.log('Install prompt ready');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Handle appinstalled event
  useEffect(() => {
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      
      console.log('App was installed');
      
      // Track installation
      if (window.gtag) {
        window.gtag('event', 'pwa_install', {
          event_category: 'engagement',
          event_label: 'pwa_installation'
        });
      }
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Install app function
  const installApp = useCallback(async () => {
    if (!deferredPrompt) {
      console.log('No install prompt available');
      return false;
    }

    try {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`User response to the install prompt: ${outcome}`);
      
      // Clear the deferredPrompt
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
      
      return outcome === 'accepted';
    } catch (error) {
      console.error('Error during installation:', error);
      return false;
    }
  }, [deferredPrompt]);

  // Dismiss install prompt
  const dismissInstallPrompt = useCallback(() => {
    setShowInstallPrompt(false);
    setDeferredPrompt(null);
  }, []);

  // Check if service worker is registered
  const [swRegistration, setSwRegistration] = useState(null);
  
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        setSwRegistration(registration);
      });
    }
  }, []);

  // Update app function
  const updateApp = useCallback(() => {
    if (swRegistration && swRegistration.waiting) {
      // Send message to service worker to skip waiting
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload the page when new service worker takes over
      window.location.reload();
    }
  }, [swRegistration]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }, []);

  // Send notification
  const sendNotification = useCallback((title, options = {}) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/icon-192.png',
        badge: '/icon-96.png',
        dir: 'rtl',
        lang: 'he',
        ...options
      });
      
      return notification;
    }
    return null;
  }, []);

  return {
    // State
    isInstalled,
    isOnline,
    showInstallPrompt,
    deferredPrompt: !!deferredPrompt,
    swRegistration,
    
    // Functions
    installApp,
    dismissInstallPrompt,
    updateApp,
    requestNotificationPermission,
    sendNotification
  };
}; 