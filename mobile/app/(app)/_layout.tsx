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
      <Stack.Screen name="reservations/index" />
      <Stack.Screen name="reservations/details" />
      <Stack.Screen name="reservations/check-in" />
      <Stack.Screen name="reservations/room-move" />
      <Stack.Screen name="folio/index" />
      <Stack.Screen name="cashier/index" />
      <Stack.Screen name="cashier/close-shift" />
      <Stack.Screen name="restaurant/index" />
      <Stack.Screen name="restaurant/order" />
      <Stack.Screen name="restaurant/order-details" />
      <Stack.Screen name="kitchen/index" />
      <Stack.Screen name="kitchen/stock" />
    </Stack>
  );
}
