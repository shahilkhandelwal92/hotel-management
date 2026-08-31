import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface MoneyDisplayProps {
  amount: number | string | null | undefined;
  style?: TextStyle;
  variant?: 'default' | 'positive' | 'negative' | 'highlight';
  prefix?: string;
}

export const MoneyDisplay: React.FC<MoneyDisplayProps> = ({
  amount,
  style,
  variant = 'default',
  prefix = '₹',
}) => {
  const formatAmount = (val: number | string | null | undefined): string => {
    if (val === null || val === undefined) return '0.00';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getVariantStyle = () => {
    switch (variant) {
      case 'positive':
        return styles.positive;
      case 'negative':
        return styles.negative;
      case 'highlight':
        return styles.highlight;
      default:
        return styles.default;
    }
  };

  return (
    <Text style={[styles.base, getVariantStyle(), style]}>
      {prefix}
      {formatAmount(amount)}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  default: {
    color: colors.text,
  },
  positive: {
    color: colors.success,
  },
  negative: {
    color: colors.danger,
  },
  highlight: {
    color: colors.primary,
  },
});
