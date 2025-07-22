// errorHandling.js - Utility functions to prevent common JavaScript errors

/**
 * Safely calls a function if it exists and is actually a function
 * @param {Function} func - The function to call
 * @param {...any} args - Arguments to pass to the function
 * @returns {any} - The result of the function call, or null if it fails
 */
export const safeCall = (func, ...args) => {
  if (typeof func === 'function') {
    try {
      return func(...args);
    } catch (error) {
      console.error('Function call error:', error);
      return null;
    }
  }
  console.warn('Attempted to call non-function:', func);
  return null;
};

/**
 * Safely accesses an array element
 * @param {Array} array - The array to access
 * @param {number} index - The index to access
 * @returns {any} - The element at the index, or null if invalid
 */
export const safeArrayAccess = (array, index) => {
  if (Array.isArray(array) && typeof index === 'number' && index >= 0 && index < array.length) {
    return array[index];
  }
  console.warn('Invalid array access:', { array, index });
  return null;
};

/**
 * Safely maps over an array with validation
 * @param {Array} array - The array to map over
 * @param {Function} mapper - The mapping function
 * @returns {Array} - The mapped array, or empty array if invalid
 */
export const safeMap = (array, mapper) => {
  if (!Array.isArray(array)) {
    console.warn('safeMap: array is not an array:', array);
    return [];
  }
  if (typeof mapper !== 'function') {
    console.warn('safeMap: mapper is not a function:', mapper);
    return [];
  }
  
  try {
    return array.map((item, index) => {
      try {
        return mapper(item, index, array);
      } catch (error) {
        console.error(`safeMap: error mapping item at index ${index}:`, error);
        return null;
      }
    }).filter(item => item !== null);
  } catch (error) {
    console.error('safeMap: error during mapping:', error);
    return [];
  }
};

/**
 * Safely filters an array with validation
 * @param {Array} array - The array to filter
 * @param {Function} filterFn - The filter function
 * @returns {Array} - The filtered array, or empty array if invalid
 */
export const safeFilter = (array, filterFn) => {
  if (!Array.isArray(array)) {
    console.warn('safeFilter: array is not an array:', array);
    return [];
  }
  if (typeof filterFn !== 'function') {
    console.warn('safeFilter: filterFn is not a function:', filterFn);
    return [];
  }
  
  try {
    return array.filter((item, index) => {
      try {
        return filterFn(item, index, array);
      } catch (error) {
        console.error(`safeFilter: error filtering item at index ${index}:`, error);
        return false;
      }
    });
  } catch (error) {
    console.error('safeFilter: error during filtering:', error);
    return [];
  }
};

/**
 * Safely reduces an array with validation
 * @param {Array} array - The array to reduce
 * @param {Function} reducer - The reduce function
 * @param {any} initialValue - The initial value
 * @returns {any} - The reduced value, or initialValue if invalid
 */
export const safeReduce = (array, reducer, initialValue) => {
  if (!Array.isArray(array)) {
    console.warn('safeReduce: array is not an array:', array);
    return initialValue;
  }
  if (typeof reducer !== 'function') {
    console.warn('safeReduce: reducer is not a function:', reducer);
    return initialValue;
  }
  
  try {
    return array.reduce((accumulator, item, index) => {
      try {
        return reducer(accumulator, item, index, array);
      } catch (error) {
        console.error(`safeReduce: error reducing item at index ${index}:`, error);
        return accumulator;
      }
    }, initialValue);
  } catch (error) {
    console.error('safeReduce: error during reduction:', error);
    return initialValue;
  }
};

/**
 * Validates that an object has the expected properties
 * @param {Object} obj - The object to validate
 * @param {Array} requiredProps - Array of required property names
 * @returns {boolean} - True if object is valid, false otherwise
 */
export const validateObject = (obj, requiredProps = []) => {
  if (!obj || typeof obj !== 'object') {
    console.warn('validateObject: obj is not a valid object:', obj);
    return false;
  }
  
  for (const prop of requiredProps) {
    if (!(prop in obj)) {
      console.warn(`validateObject: missing required property '${prop}' in object:`, obj);
      return false;
    }
  }
  
  return true;
};

/**
 * Safely accesses nested object properties
 * @param {Object} obj - The object to access
 * @param {string|Array} path - The path to the property (string or array of keys)
 * @param {any} defaultValue - Default value if path doesn't exist
 * @returns {any} - The value at the path, or defaultValue
 */
export const safeGet = (obj, path, defaultValue = null) => {
  if (!obj || typeof obj !== 'object') {
    return defaultValue;
  }
  
  const keys = Array.isArray(path) ? path : path.split('.');
  
  try {
    let current = obj;
    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return defaultValue;
      }
      current = current[key];
    }
    return current !== undefined ? current : defaultValue;
  } catch (error) {
    console.error('safeGet: error accessing path:', { obj, path, error });
    return defaultValue;
  }
};

/**
 * Debounces a function with error handling
 * @param {Function} func - The function to debounce
 * @param {number} delay - The delay in milliseconds
 * @returns {Function} - The debounced function
 */
export const safeDebounce = (func, delay) => {
  if (typeof func !== 'function') {
    console.warn('safeDebounce: func is not a function:', func);
    return () => {};
  }
  
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      try {
        func(...args);
      } catch (error) {
        console.error('safeDebounce: error in debounced function:', error);
      }
    }, delay);
  };
};

/**
 * Throttles a function with error handling
 * @param {Function} func - The function to throttle
 * @param {number} limit - The time limit in milliseconds
 * @returns {Function} - The throttled function
 */
export const safeThrottle = (func, limit) => {
  if (typeof func !== 'function') {
    console.warn('safeThrottle: func is not a function:', func);
    return () => {};
  }
  
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      try {
        func(...args);
      } catch (error) {
        console.error('safeThrottle: error in throttled function:', error);
      }
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Creates a safe version of any function that catches errors
 * @param {Function} func - The function to make safe
 * @param {any} fallbackValue - Value to return if function fails
 * @returns {Function} - The safe version of the function
 */
export const makeSafe = (func, fallbackValue = null) => {
  if (typeof func !== 'function') {
    console.warn('makeSafe: func is not a function:', func);
    return () => fallbackValue;
  }
  
  return (...args) => {
    try {
      return func(...args);
    } catch (error) {
      console.error('makeSafe: error in function:', error);
      return fallbackValue;
    }
  };
}; 