import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface StatusBadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'default',
}) => {
  const getBadgeColors = () => {
    switch (variant) {
      case 'success':
        return { bg: colors.successBg, text: colors.success };
      case 'warning':
        return { bg: colors.warningBg, text: colors.warning };
      case 'danger':
        return { bg: colors.dangerBg, text: colors.danger };
      case 'info':
        return { bg: 'rgba(59, 130, 246, 0.1)', text: colors.primary };
      default:
        return { bg: colors.surfaceLight, text: colors.textMuted };
    }
  };

  const badgeColor = getBadgeColors();

  return (
    <View style={[styles.badge, { backgroundColor: badgeColor.bg }]}>
      <Text style={[styles.text, { color: badgeColor.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
