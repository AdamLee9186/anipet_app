import React, { useState, useEffect } from 'react';
import { Box, Image, Text, VStack, HStack } from '@chakra-ui/react';

const SplashScreen = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Show splash screen for minimum 2 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      
      // Wait for fade out animation to complete
      setTimeout(() => {
        onComplete();
      }, 300);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <Box
      className={`splash-screen ${!isVisible ? 'fade-out' : ''}`}
      position="fixed"
      top="0"
      left="0"
      right="0"
      bottom="0"
      bg="#ffffcc"
      display="flex"
      flexDirection={{ base: 'column', landscape: 'row' }}
      alignItems="center"
      justifyContent="center"
      zIndex={9999}
      opacity={isVisible ? 1 : 0}
      transition="opacity 0.3s ease-out"
      dir="rtl"
    >
      <VStack
        spacing={{ base: '24px', landscape: '16px' }}
        align="center"
        direction={{ base: 'column', landscape: 'row' }}
      >
        <Image
          src="/icon-192.png"
          alt="אניפט לוגו"
          className="splash-logo"
          width={{ base: '100px', md: '120px', lg: '140px', landscape: '80px' }}
          height={{ base: '100px', md: '120px', lg: '140px', landscape: '80px' }}
          marginBottom={{ base: '24px', landscape: '0' }}
          animation="pulse 2s infinite"
        />
        
        <VStack
          spacing={{ base: '8px', landscape: '4px' }}
          align="center"
          textAlign="center"
        >
          <Text
            className="splash-title"
            color="gray.800"
            fontSize={{
              base: '24px',
              md: '28px',
              lg: '32px',
              landscape: '20px'
            }}
            fontWeight="700"
            marginBottom={{ base: '8px', landscape: '4px' }}
            lineHeight="1.2"
          >
            אניפט
          </Text>
          
          <Text
            className="splash-subtitle"
            color="gray.600"
            fontSize={{
              base: '14px',
              md: '16px',
              lg: '18px',
              landscape: '14px'
            }}
            textAlign="center"
            lineHeight="1.4"
          >
            אניפט - חיפוש תחליפים למוצרי חיות מחמד
          </Text>
        </VStack>
      </VStack>
    </Box>
  );
};

export default SplashScreen; 