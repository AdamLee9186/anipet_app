import React from 'react';
import {
  Text,
  VStack,
  HStack,
  RangeSlider,
  RangeSliderTrack,
  RangeSliderFilledTrack,
  RangeSliderThumb,
  Select,
  NumberInput,
  NumberInputField,
  InputGroup,
} from '@chakra-ui/react';

// const formatValue = (val, unit) => {
//   if (typeof val === 'number') {
//     if (unit === '₪') return `₪${val}`;
//     if (unit === 'מ"ל' || unit === 'ml') return `${val} מ"ל`;
//     if (unit === 'גרם' || unit === 'g') return `${val} גרם`;
//     if (unit === 'ק"ג' || unit === 'kg') return `${val} ק"ג`;
//     return `${val}${unit ? ' ' + unit : ''}`;
//   }
//   return val;
// };

const DropdownRangeSlider = ({
  min,
  max,
  value,
  onChange,
  step = 1,
  unit = '',
  label = '',
  disabled = false,
  weightUnit,
  onWeightUnitChange,
  isWeightSlider = false,
  colorScheme = 'orange',
}) => {
  const [internalValue, setInternalValue] = React.useState(value);
  const [customMin, setCustomMin] = React.useState(min);
  const [customMax, setCustomMax] = React.useState(max);
  const [minInput, setMinInput] = React.useState(value[0]);
  const [maxInput, setMaxInput] = React.useState(value[1]);

  React.useEffect(() => {
    setInternalValue(value);
    setMinInput(value[0]);
    setMaxInput(value[1]);
  }, [value]);
  React.useEffect(() => {
    setCustomMin(min);
  }, [min]);
  React.useEffect(() => {
    setCustomMax(max);
  }, [max]);

  const handleSliderChange = (val) => {
    setInternalValue(val);
  };
  const handleSliderChangeEnd = (val) => {
    onChange(val);
  };

  const handleMinInputChange = (val) => {
    setMinInput(val);
  };
  const handleMaxInputChange = (val) => {
    setMaxInput(val);
  };
  const commitMinInput = () => {
    const num = Number(minInput);
    if (!isNaN(num)) {
      setCustomMin(num);
      const newVal = [num, Math.max(num, internalValue[1])];
      setInternalValue(newVal);
      onChange(newVal);
    }
  };
  const commitMaxInput = () => {
    const num = Number(maxInput);
    if (!isNaN(num)) {
      setCustomMax(num);
      const newVal = [Math.min(num, internalValue[0]), num];
      setInternalValue(newVal);
      onChange(newVal);
    }
  };

  // For weight, allow unit selection
  const unitSelector = isWeightSlider && onWeightUnitChange ? (
    <Select
      size="sm"
      value={weightUnit}
      onChange={e => onWeightUnitChange(e.target.value)}
      width="110px"
      minWidth="110px"
      ml={2}
      style={{ paddingRight: '3em', direction: 'rtl' }}
    >
      <option value={"ק&quot;ג"}>ק&quot;ג</option>
      <option value={"גרם"}>גרם</option>
      <option value={"ליטר"}>ליטר</option>
      <option value={"מ&quot;ל"}>מ&quot;ל</option>
      <option value={"מ&quot;ג"}>מ&quot;ג</option>
    </Select>
  ) : null;

  return (
    <VStack align="stretch" spacing={3} w="100%" minW={0} maxW="100%">
      <Text fontSize="sm" fontWeight="medium" mb={1}>{label}</Text>
      <RangeSlider
        min={customMin}
        max={customMax}
        step={step}
        value={internalValue}
        onChange={handleSliderChange}
        onChangeEnd={handleSliderChangeEnd}
        isDisabled={disabled}
        colorScheme={colorScheme}
        w="100%"
      >
        <RangeSliderTrack>
          <RangeSliderFilledTrack />
        </RangeSliderTrack>
        <RangeSliderThumb index={0} />
        <RangeSliderThumb index={1} />
      </RangeSlider>
      <HStack justify="space-between" w="100%">
        <InputGroup size="xs" w="80px">
          <NumberInput
            value={minInput}
            min={-999999}
            max={internalValue[1]}
            step={step}
            onChange={handleMinInputChange}
            onBlur={commitMinInput}
            onKeyDown={e => { if (e.key === 'Enter') commitMinInput(); }}
            isDisabled={disabled}
            clampValueOnBlur={false}
            w="80px"
            inputMode="numeric"
            allowMouseWheel
          >
            <NumberInputField textAlign="center" />
          </NumberInput>
        </InputGroup>
        <InputGroup size="xs" w="80px">
          <NumberInput
            value={maxInput}
            min={internalValue[0]}
            max={999999}
            step={step}
            onChange={handleMaxInputChange}
            onBlur={commitMaxInput}
            onKeyDown={e => { if (e.key === 'Enter') commitMaxInput(); }}
            isDisabled={disabled}
            clampValueOnBlur={false}
            w="80px"
            inputMode="numeric"
            allowMouseWheel
          >
            <NumberInputField textAlign="center" />
          </NumberInput>
        </InputGroup>
      </HStack>
      {unitSelector}
    </VStack>
  );
};

export default DropdownRangeSlider; 