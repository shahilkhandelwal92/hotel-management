import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface DateDisplayProps {
  dateString: string | null | undefined;
  style?: TextStyle;
  showTime?: boolean;
}

export const DateDisplay: React.FC<DateDisplayProps> = ({
  dateString,
  style,
  showTime = false,
}) => {
  const formatDate = (str: string | null | undefined): string => {
    if (!str) return '—';
    try {
      const date = new Date(str);
      if (isNaN(date.getTime())) return str;
      const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      };
      if (showTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
      }
      return date.toLocaleDateString('en-IN', options);
    } catch {
      return str;
    }
  };

  return <Text style={[styles.date, style]}>{formatDate(dateString)}</Text>;
};

const styles = StyleSheet.create({
  date: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
