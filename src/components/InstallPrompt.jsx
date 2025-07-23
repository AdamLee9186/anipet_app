import React from 'react';
import {
  Box,
  Button,
  Text,
  VStack,
  HStack,
  Icon,
  useToast,
  SlideFade,
  useColorModeValue
} from '@chakra-ui/react';
import { FiDownload, FiX, FiSmartphone } from 'react-icons/fi';
import { usePWA } from '../hooks/usePWA';

const InstallPrompt = () => {
  const { showInstallPrompt, installApp, dismissInstallPrompt, isInstalled } = usePWA();
  const toast = useToast();
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const subtitleColor = useColorModeValue('gray.600', 'gray.300');

  const handleInstall = async () => {
    try {
      const success = await installApp();
      if (success) {
        toast({
          title: 'התקנה התחילה',
          description: 'האפליקציה מותקנת כעת...',
          status: 'success',
          duration: 3000,
          isClosable: true,
          position: 'top',
        });
      }
    } catch (error) {
      toast({
        title: 'שגיאה בהתקנה',
        description: 'לא ניתן להתקין את האפליקציה כרגע',
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top',
      });
    }
  };

  const handleDismiss = () => {
    dismissInstallPrompt();
    toast({
      title: 'התקנה נדחתה',
      description: 'תוכל להתקין את האפליקציה מאוחר יותר',
      status: 'info',
      duration: 3000,
      isClosable: true,
      position: 'top',
    });
  };

  // Don't show if already installed or no prompt available
  if (isInstalled || !showInstallPrompt) {
    return null;
  }

  return (
    <SlideFade in={showInstallPrompt} offsetY="20px">
      <Box
        position="fixed"
        bottom="20px"
        right="20px"
        left="20px"
        zIndex={9999}
        bg={bgColor}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="12px"
        boxShadow="0 4px 20px rgba(0, 0, 0, 0.15)"
        p="16px"
        maxW="400px"
        mx="auto"
        dir="rtl"
      >
        <VStack spacing="12px" align="stretch">
          <HStack justify="space-between" align="center">
            <HStack spacing="8px">
              <Icon as={FiSmartphone} color="brand.500" boxSize="20px" />
              <Text
                fontWeight="600"
                fontSize="16px"
                color={textColor}
                lineHeight="1.2"
              >
                התקן אפליקציה
              </Text>
            </HStack>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              p="4px"
              minW="auto"
              h="auto"
            >
              <Icon as={FiX} boxSize="16px" />
            </Button>
          </HStack>
          
          <Text
            fontSize="14px"
            color={subtitleColor}
            lineHeight="1.4"
          >
            התקן את אניפט על המכשיר שלך לגישה מהירה וחוויית משתמש משופרת
          </Text>
          
          <HStack spacing="8px" justify="flex-end">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDismiss}
              fontSize="14px"
              px="16px"
              py="8px"
            >
              לא עכשיו
            </Button>
            <Button
              size="sm"
              colorScheme="brand"
              onClick={handleInstall}
              fontSize="14px"
              px="16px"
              py="8px"
              leftIcon={<Icon as={FiDownload} boxSize="14px" />}
            >
              התקן
            </Button>
          </HStack>
        </VStack>
      </Box>
    </SlideFade>
  );
};

export default InstallPrompt; 