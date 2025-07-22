import React from 'react';
import { Flex, Box } from '@chakra-ui/react';
import { Dog, Folder, Tag, Baby, Utensils, DollarSign, Package, HeartCrack, Star, Weight } from 'lucide-react';

// מיפוי קטגוריות לצבעים ואייקונים
const TAG_META = {
  animalType: { 
    label: 'קבוצה', 
    color: '#C6F6D5', 
    textColor: '#22543D', 
    icon: Dog, 
    max: 30 
  },
  internalCategory: { 
    label: 'קטגוריה', 
    color: '#FEEBC8', 
    textColor: '#744210', 
    icon: Folder, 
    max: 25 
  },
  brand: { 
    label: 'מותג', 
    color: '#BEE3F8', 
    textColor: '#2A4365', 
    icon: Tag, 
    max: 20 
  },
  lifeStage: { 
    label: 'גיל', 
    color: '#E9D8FD', 
    textColor: '#553C9A', 
    icon: Baby, 
    max: 15 
  },
  mainIngredient: { 
    label: 'מרכיב עיקרי', 
    color: '#FED7D7', 
    textColor: '#742A2A', 
    icon: Utensils, 
    max: 10 
  },
  price: { 
    label: 'מחיר', 
    color: '#C4F1F9', 
    textColor: '#234E52', 
    icon: DollarSign, 
    max: 20 
  },
  weight: { 
    label: 'משקל', 
    color: '#DBFFEE', 
    textColor: '#2D3748', 
    icon: Weight, 
    max: 25 
  },
  supplier: {
    label: 'ספק',
    color: '#B2F5EA',
    textColor: '#234E52',
    icon: Package, // from lucide-react
    max: 10
  },
  healthIssue: {
    label: 'בעיה רפואית',
    color: '#D6BCFA', // updated color
    textColor: '#7B2F4C',
    icon: HeartCrack, // from lucide-react
    max: 10
  },
  quality: {
    label: 'איכות',
    color: '#FEFCBF', // צהוב כמו ב-App.js
    textColor: '#744210',
    icon: Star, // from lucide-react
    max: 10
  },
};

export { TAG_META };

/**
 * props: breakdown = {
 *   animalType: 30,
 *   internalCategory: 25,
 *   brand: 0,
 *   lifeStage: 15,
 *   mainIngredient: 0,
 *   price: 10
 * }
 */
const SimilarityBreakdownBar = ({ breakdown, totalPoints, maxPoints, activeFields }) => {
  // The percent of the bar to fill (match percent)
  const matchPercent = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0;
  // Only show segments for activeFields if provided, otherwise all
  const fieldsToShow = activeFields && activeFields.length > 0 ? activeFields : Object.keys(TAG_META);
  return (
    <Flex w="100%" h="28px" borderRadius="md" overflow="hidden" boxShadow="sm" mb={2} dir="rtl" border="1px solid" borderColor="gray.200" bg="#f3f3f3">
      {/* Colored segments container, width = matchPercent% (right-aligned for RTL) */}
      <Flex
        direction="row"
        h="100%"
        w={`${matchPercent}%`}
        transition="width 0.3s"
      >
        {fieldsToShow.map((key) => {
          // Handle field name mapping for medicalIssue -> healthIssue and qualityLevel -> quality
          let mappedKey = key;
          if (key === 'medicalIssue') {
            mappedKey = 'healthIssue';
          } else if (key === 'qualityLevel') {
            mappedKey = 'quality';
          } else if (key === 'supplierName') {
            mappedKey = 'supplier';
          }
          
          const meta = TAG_META[mappedKey] || TAG_META[key] || TAG_META[key.replace('Name', '')] || TAG_META[key.replace('Level', '')];
          if (!meta) return null;
          
          // Get the correct field name for breakdown
          let breakdownKey = key;
          if (key === 'quality' || key === 'qualityLevel') {
            breakdownKey = 'qualityLevel';
          } else if (key === 'supplier' || key === 'supplierName') {
            breakdownKey = 'supplierName';
          } else if (key === 'healthIssue' || key === 'medicalIssue') {
            breakdownKey = 'medicalIssue';
          }
          
          const value = breakdown[breakdownKey] || 0;
          // Proportional width: (fieldPoints / totalPoints) * 100% of colored area
          const percentOfMatch = totalPoints > 0 ? (value / totalPoints) * 100 : 0;
          if (meta.max === 0) return null;
          return (
            <Box
              key={key}
              h="100%"
              bg={meta.color}
              minW={percentOfMatch > 0 ? '8px' : '0'}
              w={`${percentOfMatch}%`}
              transition="width 0.3s"
              borderRight={fieldsToShow[0] === key ? 'none' : '1px solid #e2e8f0'}
              display={percentOfMatch > 0 ? 'block' : 'none'}
              title={meta.label}
            />
          );
        })}
      </Flex>
      {/* Gray segment for the rest of the bar (left side) */}
      <Box
        h="100%"
        w={`${100 - matchPercent}%`}
        bg="#F0F3F5"
        transition="width 0.3s"
      />
    </Flex>
  );
};

export default SimilarityBreakdownBar; 