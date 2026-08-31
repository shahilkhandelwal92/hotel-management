import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPosOrders, updatePosOrderStatusApi, UpdatePosOrderPayload } from '../../../src/api/pos';
import { colors } from '../../../src/theme/colors';
import { AppHeader } from '../../../src/components/AppHeader';
import { AppCard } from '../../../src/components/AppCard';
import { AppButton } from '../../../src/components/AppButton';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { MoneyDisplay } from '../../../src/components/MoneyDisplay';
import { DateDisplay } from '../../../src/components/DateDisplay';
import { LoadingState } from '../../../src/components/LoadingState';
import { ErrorState } from '../../../src/components/ErrorState';

export default function OrderDetailsScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: orders = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['pos-orders'],
    queryFn: () => fetchPosOrders(),
  });

  const order = orders.find((o) => o.id === orderId);

  const updateStatusMutation = useMutation({
    mutationFn: (payload: UpdatePosOrderPayload) => updatePosOrderStatusApi(payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['pos-orders'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      Alert.alert('Status Updated', `Order #${orderId.slice(0, 8).toUpperCase()} updated to ${updated.status}.`);
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to update order status.');
    },
  });

  if (isLoading) {
    return <LoadingState message="Loading order details..." />;
  }

  if (isError || !order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Order Details" showBack />
        <ErrorState
          title="Order Not Found"
          message={(error as Error)?.message || 'Restaurant order record not found.'}
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  const getStatusVariant = (st: string) => {
    switch (st) {
      case 'Pending':
        return 'warning';
      case 'Preparing':
        return 'info';
      case 'Ready':
        return 'success';
      case 'Delivered':
      case 'Completed':
        return 'default';
      case 'Cancelled':
        return 'danger';
      default:
        return 'default';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={`Order #${order.id.slice(0, 8).toUpperCase()}`}
        subtitle={order.tableNumber ? `Table ${order.tableNumber}` : order.orderSource}
        showBack
      />

      <ScrollView contentContainerStyle={styles.container}>
        {actionError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {actionError}</Text>
          </View>
        )}

        {/* Order Header Summary */}
        <AppCard style={styles.card}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.destText}>
                {order.tableNumber ? `Table ${order.tableNumber}` : order.orderSource}
              </Text>
              {order.guestName && (
                <Text style={styles.guestText}>Guest: {order.guestName}</Text>
              )}
              <DateDisplay dateString={order.createdAt} showTime style={styles.dateText} />
            </View>
            <View style={styles.statusCol}>
              <StatusBadge label={order.status} variant={getStatusVariant(order.status)} />
              {order.kotPrinted && (
                <Text style={styles.kotPrintedBadge}>🖨️ KOT Printed</Text>
              )}
            </View>
          </View>
        </AppCard>

        {/* Line Items Breakdown */}
        <Text style={styles.sectionTitle}>Ordered Dishes & Quantities</Text>
        <AppCard style={styles.card}>
          {order.items?.map((it, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemName}>
                  {it.quantity}x {it.menuItem?.name || 'Item'}
                </Text>
                {it.notes && <Text style={styles.itemNotes}>Note: {it.notes}</Text>}
              </View>
              <MoneyDisplay amount={it.lineTotal} style={styles.itemPrice} />
            </View>
          ))}

          <View style={styles.taxLine}>
            <Text style={styles.taxLabel}>Subtotal</Text>
            <MoneyDisplay amount={order.subtotal} style={styles.taxVal} />
          </View>
          <View style={styles.taxLine}>
            <Text style={styles.taxLabel}>GST (5%)</Text>
            <MoneyDisplay amount={order.gstAmount} style={styles.taxVal} />
          </View>
          <View style={[styles.taxLine, styles.grandTotalLine]}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <MoneyDisplay amount={order.grandTotal} style={styles.grandTotalVal} />
          </View>
        </AppCard>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {order.status === 'Ready' && (
            <AppButton
              title="🍽️ Mark Delivered / Served"
              variant="success"
              loading={updateStatusMutation.isPending}
              onPress={() => updateStatusMutation.mutate({ id: order.id, status: 'Delivered' })}
            />
          )}

          {['Pending', 'Preparing', 'Ready', 'Delivered'].includes(order.status) && (
            <AppButton
              title="✓ Complete & Close Order"
              variant="primary"
              loading={updateStatusMutation.isPending}
              onPress={() => updateStatusMutation.mutate({ id: order.id, status: 'Completed', paymentStatus: 'Paid' })}
            />
          )}

          {order.status === 'Pending' && (
            <AppButton
              title="Cancel Order"
              variant="outline"
              loading={updateStatusMutation.isPending}
              onPress={() => updateStatusMutation.mutate({ id: order.id, status: 'Cancelled' })}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
  card: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  destText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  guestText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  dateText: {
    fontSize: 12,
    marginTop: 4,
  },
  statusCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  kotPrintedBadge: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '600',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  itemLeft: {
    flex: 1,
    paddingRight: 8,
  },
  itemName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  itemNotes: {
    color: colors.warning,
    fontSize: 12,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
  },
  taxLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  taxLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  taxVal: {
    fontSize: 12,
  },
  grandTotalLine: {
    marginTop: 6,
    paddingTop: 6,
  },
  grandTotalLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  grandTotalVal: {
    fontSize: 16,
  },
  actionContainer: {
    gap: 10,
    marginTop: 8,
    marginBottom: 36,
  },
});
