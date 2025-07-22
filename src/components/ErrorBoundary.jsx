import React from 'react';
import { Box, Text, Button, VStack } from '@chakra-ui/react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          p={6}
          textAlign="center"
          bg="red.50"
          border="1px solid"
          borderColor="red.200"
          borderRadius="lg"
          m={4}
        >
          <VStack spacing={4}>
            <Text fontSize="lg" fontWeight="bold" color="red.600">
              משהו השתבש
            </Text>
            <Text fontSize="sm" color="red.500">
              {this.state.error?.message || 'אירעה שגיאה לא צפויה'}
            </Text>
            <Button
              colorScheme="red"
              size="sm"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              נסה שוב
            </Button>
          </VStack>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 