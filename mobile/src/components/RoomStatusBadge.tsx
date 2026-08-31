import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface RoomStatusBadgeProps {
  status: 'Vacant' | 'Occupied' | 'Dirty' | 'Cleaning' | 'Inspected' | 'Maintenance' | string;
}

export const RoomStatusBadge: React.FC<RoomStatusBadgeProps> = ({ status }) => {
  const getStatusStyle = () => {
    switch (status) {
      case 'Inspected':
      case 'Vacant':
      case 'Available':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: colors.status.clean };
      case 'Dirty':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: colors.status.dirty };
      case 'Cleaning':
      case 'InProgress':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: colors.status.cleaning };
      case 'Occupied':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: colors.status.occupied };
      case 'Maintenance':
      case 'OutOfOrder':
        return { bg: 'rgba(139, 92, 246, 0.15)', text: colors.status.maintenance };
      default:
        return { bg: colors.surfaceLight, text: colors.textMuted };
    }
  };

  const style = getStatusStyle();

  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.text, { color: style.text }]}>{status}</Text>
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
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
