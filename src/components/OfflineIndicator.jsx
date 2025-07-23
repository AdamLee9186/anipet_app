import React from 'react';
import {
  Box,
  Text,
  HStack,
  Icon,
  SlideFade,
  useColorModeValue
} from '@chakra-ui/react';
import { FiWifi, FiWifiOff } from 'react-icons/fi';
import { usePWA } from '../hooks/usePWA';

const OfflineIndicator = () => {
  const { isOnline } = usePWA();
  
  const bgColor = useColorModeValue('red.50', 'red.900');
  const borderColor = useColorModeValue('red.200', 'red.700');
  const textColor = useColorModeValue('red.800', 'red.100');
  const iconColor = useColorModeValue('red.500', 'red.300');

  // Don't show when online
  if (isOnline) {
    return null;
  }

  return (
    <SlideFade in={!isOnline} offsetY="-20px">
      <Box
        position="fixed"
        top="0"
        left="0"
        right="0"
        zIndex={9998}
        bg={bgColor}
        borderBottom="1px solid"
        borderColor={borderColor}
        p="8px"
        dir="rtl"
      >
        <HStack justify="center" spacing="8px">
          <Icon as={FiWifiOff} color={iconColor} boxSize="16px" />
          <Text
            fontSize="14px"
            fontWeight="500"
            color={textColor}
            textAlign="center"
          >
            אין חיבור לאינטרנט - האפליקציה פועלת במצב לא מקוון
          </Text>
        </HStack>
      </Box>
    </SlideFade>
  );
};

export default OfflineIndicator; 