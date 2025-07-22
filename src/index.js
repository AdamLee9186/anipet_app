// index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import rtl from 'stylis-plugin-rtl';
import './index.css'; // Import the main CSS file
import App from './App';
// import reportWebVitals from './reportWebVitals'; // Removed this line

// Create RTL cache
const cacheRtl = createCache({
  key: 'css',
  stylisPlugins: [rtl],
});

// Extend theme with RTL support and custom colors
const theme = extendTheme({
  direction: "rtl",
  colors: {
    brand: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#1d4ed8", // Primary blue color
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a",
    },
  },
  fonts: {
    heading: '"Rubik", sans-serif',
    body: '"Rubik", sans-serif',
  },
  components: {
    Slider: {
      defaultProps: {
        colorScheme: 'brand',
      },
    },
    Button: {
      defaultProps: {
        colorScheme: 'brand',
      },
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <CacheProvider value={cacheRtl}>
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  </CacheProvider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals(); // Removed this line