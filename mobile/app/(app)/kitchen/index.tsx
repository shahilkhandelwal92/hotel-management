import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchActiveKdsOrders } from '../../../src/api/kitchen';
import { updatePosOrderStatusApi } from '../../../src/api/pos';
import { PosOrder } from '../../../src/api/types';
import { colors } from '../../../src/theme/colors';
import { AppHeader } from '../../../src/components/AppHeader';
import { AppCard } from '../../../src/components/AppCard';
import { AppButton } from '../../../src/components/AppButton';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { LoadingState } from '../../../src/components/LoadingState';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';

const calculateOrderAgeMinutes = (createdAt: string) => {
  const elapsedMs = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(elapsedMs / 60000));
};

export default function KitchenKdsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: orders = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<PosOrder[]>({
    queryKey: ['kitchen-orders'],
    queryFn: fetchActiveKdsOrders,
    refetchInterval: 10000, // KDS polls active orders every 10s
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'Preparing' | 'Ready' }) =>
      updatePosOrderStatusApi({ id, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      queryClient.invalidateQueries({ queryKey: ['pos-orders'] });
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to advance kitchen order status.');
    },
  });

  const renderKdsCard = (order: PosOrder) => {
    const ageMins = calculateOrderAgeMinutes(order.createdAt);
    const isOverdue = ageMins >= 15;

    return (
      <AppCard key={order.id} style={[styles.kdsCard, isOverdue && styles.overdueCard]}>
        {/* Top Destination & Timer */}
        <View style={styles.kdsCardHeader}>
          <View>
            <Text style={styles.kdsTableText}>
              {order.tableNumber ? `TABLE ${order.tableNumber}` : order.orderSource.toUpperCase()}
            </Text>
            <Text style={styles.kdsOrderNum}>KOT #{order.id.slice(0, 8).toUpperCase()}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.timerText, isOverdue && styles.overdueTimer]}>
              ⏱️ {ageMins} min ago
            </Text>
            <StatusBadge
              label={order.status}
              variant={order.status === 'Pending' ? 'warning' : order.status === 'Preparing' ? 'info' : 'success'}
            />
          </View>
        </View>

        {/* Ordered Dishes List */}
        <View style={styles.itemsList}>
          {order.items?.map((it, idx) => (
            <View key={idx} style={styles.dishRow}>
              <View style={styles.qtyBadge}>
                <Text style={styles.qtyBadgeText}>{it.quantity}x</Text>
              </View>
              <View style={styles.dishDetails}>
                <Text style={styles.dishName}>{it.menuItem?.name || 'Dish'}</Text>
                {it.notes && <Text style={styles.dishNotes}>⚠️ {it.notes}</Text>}
              </View>
            </View>
          ))}
        </View>

        {/* Kitchen Action Progress Button */}
        <View style={styles.kdsActions}>
          {order.status === 'Pending' && (
            <AppButton
              title="▶ Accept & Start Preparing"
              variant="primary"
              loading={updateStatusMutation.isPending}
              onPress={() => updateStatusMutation.mutate({ id: order.id, status: 'Preparing' })}
              style={styles.kdsActionBtn}
            />
          )}

          {order.status === 'Preparing' && (
            <AppButton
              title="✓ Mark Ready for Pickup"
              variant="success"
              loading={updateStatusMutation.isPending}
              onPress={() => updateStatusMutation.mutate({ id: order.id, status: 'Ready' })}
              style={styles.kdsActionBtn}
            />
          )}

          {order.status === 'Ready' && (
            <View style={styles.readyBanner}>
              <Text style={styles.readyText}>🔔 Ready on Pass Counter</Text>
            </View>
          )}
        </View>
      </AppCard>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Kitchen Display System (KDS)"
        subtitle="Live KOT Preparation Queue"
        showBack
        rightAction={
          <TouchableOpacity
            style={styles.stockBtn}
            onPress={() => router.push('/(app)/kitchen/stock')}
            activeOpacity={0.7}
          >
            <Text style={styles.stockBtnText}>📦 Stock</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {actionError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {actionError}</Text>
          </View>
        )}

        {isLoading ? (
          <LoadingState message="Connecting to live Kitchen KOT stream..." />
        ) : isError ? (
          <ErrorState
            title="KDS Connection Error"
            message={(error as Error)?.message || 'Failed to load kitchen queue.'}
            onRetry={refetch}
          />
        ) : orders.length === 0 ? (
          <EmptyState
            title="Kitchen Queue Clear"
            description="All kitchen order tickets (KOTs) are prepared and served."
          />
        ) : (
          <View style={styles.kdsGrid}>{orders.map(renderKdsCard)}</View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050811', // High contrast deep dark background
  },
  stockBtn: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  stockBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  container: {
    padding: 16,
  },
  errorBanner: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '500',
  },
  kdsGrid: {
    gap: 14,
  },
  kdsCard: {
    backgroundColor: '#111827',
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    borderRadius: 16,
    padding: 16,
  },
  overdueCard: {
    borderColor: colors.danger,
  },
  kdsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  kdsTableText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  kdsOrderNum: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timerText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  overdueTimer: {
    color: colors.danger,
    fontWeight: '800',
  },
  itemsList: {
    marginVertical: 12,
    gap: 10,
  },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 38,
    alignItems: 'center',
  },
  qtyBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  dishDetails: {
    flex: 1,
  },
  dishName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  dishNotes: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  kdsActions: {
    marginTop: 6,
  },
  kdsActionBtn: {
    height: 48,
    marginVertical: 0,
  },
  readyBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: colors.success,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  readyText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '700',
  },
});
