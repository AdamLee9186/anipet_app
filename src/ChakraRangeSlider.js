import React, { useState, useEffect } from 'react';
import {
  Box,
  RangeSlider,
  RangeSliderTrack,
  RangeSliderFilledTrack,
  RangeSliderThumb,
  Text,
  HStack,
  VStack,
  Flex,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Tooltip,
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';

const ChakraRangeSlider = ({
  min,
  max,
  minValue,
  maxValue,
  step = 1,
  unit = '',
  label = '',
  onChange,
  disabled = false,
  weightUnit,
  onWeightUnitChange,
  isWeightSlider = false,
}) => {
  const [range, setRange] = useState([minValue, maxValue]);

  useEffect(() => {
    setRange([minValue, maxValue]);
  }, [minValue, maxValue]);

  const handleSliderChange = (val) => {
    setRange(val);
    onChange(val[0], val[1]);
  };

  const handleMinInputChange = (value) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const newRange = [Math.max(min, Math.min(numValue, range[1] - step)), range[1]];
      setRange(newRange);
      onChange(newRange[0], newRange[1]);
    }
  };

  const handleMaxInputChange = (value) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const newRange = [range[0], Math.min(max, Math.max(numValue, range[0] + step))];
      setRange(newRange);
      onChange(newRange[0], newRange[1]);
    }
  };

  const displayValue = (val) => {
    // Show up to 1 decimal for price, 2 decimals for others, but no trailing zeros
    if (typeof val === 'number') {
      if (unit === '₪') {
        // For price, show only 1 decimal place
        return Number(val.toFixed(1)).toString();
      } else {
        // For other units, show up to 2 decimals
        return Number(val.toFixed(2)).toString();
      }
    }
    return val;
  };

  return (
    <VStack spacing={4} align="stretch" w="full">
      {/* Label and Checkbox */}
      <Flex justify="space-between" align="center">
        <Text fontSize="sm" fontWeight="medium" color="brand.800">
          {label}
        </Text>
        {isWeightSlider && weightUnit && onWeightUnitChange && (
          <Select
            size="xs"
            w="auto"
            value={weightUnit}
            onChange={(e) => onWeightUnitChange(e.target.value)}
            variant="filled"
            bg="white"
            border="1px solid"
            borderColor="gray.300"
            borderRadius="md"
            dir="rtl"
            style={{ direction: 'rtl', textAlign: 'right', paddingRight: '2.5em', position: 'relative' }}
            icon={<ChevronDownIcon style={{ position: 'absolute', left: 8, right: 'unset' }} />}
          >
            <option value={'ק&quot;ג'}>ק&quot;ג</option>
            <option value="גרם">גרם</option>
            <option value="ליטר">ליטר</option>
            <option value="ml">מ&quot;ל</option>
            <option value={'מ&quot;ג'}>מ&quot;ג</option>
          </Select>
        )}
      </Flex>

      {/* Range Slider */}
      <Box px={2}>
        <RangeSlider
          min={min}
          max={max}
          step={step}
          value={range}
          onChange={handleSliderChange}
          isDisabled={disabled}
          colorScheme="brand"
          size="lg"
        >
          <RangeSliderTrack>
            <RangeSliderFilledTrack />
          </RangeSliderTrack>
          <Tooltip
            label={
              <div className="rtl-text">
                <Box
                  dir="rtl"
                  textAlign="right"
                  style={{
                    direction: 'rtl',
                    textAlign: 'right',
                    unicodeBidi: 'embed'
                  }}
                >
                  {`${displayValue(range[0])}${unit}`}
                </Box>
              </div>
            }
            placement="top"
            hasArrow={false}
            bg="brand.500"
            color="white"
            gutter={8}

            closeOnClick={false}
            closeOnPointerDown={false}
          >
            <RangeSliderThumb index={0} />
          </Tooltip>
          <Tooltip
            label={
              <div className="rtl-text">
                <Box
                  dir="rtl"
                  textAlign="right"
                  style={{
                    direction: 'rtl',
                    textAlign: 'right',
                    unicodeBidi: 'embed'
                  }}
                >
                  {`${displayValue(range[1])}${unit}`}
                </Box>
              </div>
            }
            placement="top"
            hasArrow={false}
            bg="brand.500"
            color="white"
            gutter={8}

            closeOnClick={false}
            closeOnPointerDown={false}
          >
            <RangeSliderThumb index={1} />
          </Tooltip>
        </RangeSlider>
      </Box>

      {/* Number Inputs */}
      <HStack spacing={4} justify="space-between">
        <VStack spacing={1} align="start" flex={1}>
          <Text fontSize="xs" color="gray.600" fontWeight="medium">
            מינימום
          </Text>
          <NumberInput
            value={displayValue(range[0])}
            onChange={handleMinInputChange}
            min={min}
            max={range[1] - step}
            step={step}
            size="sm"
            isDisabled={disabled}
            variant="filled"
            bg="white"
            border="1px solid"
            borderColor="gray.300"
            borderRadius="md"
            textAlign="right"
            dir="rtl"
            inputMode="numeric"
            style={{ direction: 'rtl', textAlign: 'right' }}
          >
            <NumberInputField textAlign="right" dir="rtl" style={{ textAlign: 'right', direction: 'rtl' }} />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </VStack>

        <VStack spacing={1} align="start" flex={1}>
          <Text fontSize="xs" color="gray.600" fontWeight="medium">
            מקסימום
          </Text>
          <NumberInput
            value={displayValue(range[1])}
            onChange={handleMaxInputChange}
            min={range[0] + step}
            max={max}
            step={step}
            size="sm"
            isDisabled={disabled}
            variant="filled"
            bg="white"
            border="1px solid"
            borderColor="gray.300"
            borderRadius="md"
            textAlign="right"
            dir="rtl"
            inputMode="numeric"
            style={{ direction: 'rtl', textAlign: 'right' }}
          >
            <NumberInputField textAlign="right" dir="rtl" style={{ textAlign: 'right', direction: 'rtl' }} />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </VStack>

        <VStack spacing={1} align="center" justify="end" pb={2}>
          <Text fontSize="xs" color="gray.600" fontWeight="medium">
            {unit}
          </Text>
        </VStack>
      </HStack>
    </VStack>
  );
};

export default ChakraRangeSlider; 