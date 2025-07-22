import React, { useState } from 'react';
import { Box, Image, Skeleton, Text } from '@chakra-ui/react';

const OptimizedImage = ({ src, alt, onOpen, product, ...props }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleClick = () => {
    if (onOpen && src) {
      onOpen(src, alt, product);
    }
  };

  // Default dimensions for product cards
  const defaultWidth = "100px";
  const defaultHeight = "100px";

  // Check if src is valid
  const hasValidSrc = src && src.trim() !== '' && src !== 'null' && src !== 'undefined';

  return (
    <Box 
      position="relative" 
      cursor={onOpen ? 'pointer' : 'default'}
      width={props.width || defaultWidth}
      height={props.height || defaultHeight}
      display="flex"
      alignItems="center"
      justifyContent="center"
      borderRadius="md"
    >
      {/* Show skeleton only if we have a valid src and image is still loading */}
      {hasValidSrc && !loaded && !error && (
        <Skeleton 
          height={props.height || defaultHeight}
          width={props.width || defaultWidth}
          borderRadius="md"
        />
      )}
      
      {/* Show image only if we have a valid src */}
      {hasValidSrc && (
        <Image
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          opacity={loaded ? 1 : 0}
          transition="opacity 0.3s"
          onClick={handleClick}
          loading="lazy"
          objectFit="contain"
          objectPosition="center"
          maxWidth="100%"
          maxHeight="100%"
          width="auto"
          height="auto"
          {...props}
        />
      )}
      
      {/* Show placeholder if no valid src or if image failed to load */}
      {(!hasValidSrc || error) && (
        <Box
          height={props.height || defaultHeight}
          width={props.width || defaultWidth}
          bg="gray.200"
          display="flex"
          alignItems="center"
          justifyContent="center"
          borderRadius="md"
          fontSize="xs"
          color="gray.500"
        >
          <Text fontSize="xs" color="gray.500">אין תמונה</Text>
        </Box>
      )}
    </Box>
  );
};

export default OptimizedImage; 