import React from 'react';
import { Box, Spinner, Text } from '@chakra-ui/react';

const LoadingFallback = ({ message = "טוען...", size = "sm" }) => {
  return (
    <Box 
      p={4} 
      textAlign="center"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minH="100px"
    >
      <Spinner 
        size={size} 
        color="brand.500" 
        thickness="2px"
        speed="0.65s"
      />
      <Text 
        fontSize="sm" 
        color="gray.600" 
        mt={2}
        fontWeight="medium"
      >
        {message}
      </Text>
    </Box>
  );
};

export default LoadingFallback; 