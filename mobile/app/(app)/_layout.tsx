import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import { LoadingState } from '../../src/components/LoadingState';
import { colors } from '../../src/theme/colors';

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <LoadingState message="Restoring session..." />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="housekeeping/index" />
      <Stack.Screen name="housekeeping/room" />
      <Stack.Screen name="housekeeping/lost-found" />
    </Stack>
  );
}
