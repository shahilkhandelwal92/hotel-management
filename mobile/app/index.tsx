import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/auth/AuthContext';
import { colors } from '../src/theme/colors';

export default function IndexScreen() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/(app)/dashboard');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>STAYOS</Text>
      <Text style={styles.subtitle}>Operations Platform</Text>
      <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    color: colors.primary,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 4,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    marginTop: 6,
    letterSpacing: 1,
  },
  loader: {
    marginTop: 32,
  },
});
