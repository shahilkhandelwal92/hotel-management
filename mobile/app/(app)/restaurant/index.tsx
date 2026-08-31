import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchPosOrders } from '../../../src/api/pos';
import { PosOrder } from '../../../src/api/types';
import { colors } from '../../../src/theme/colors';
import { AppHeader } from '../../../src/components/AppHeader';
import { AppCard } from '../../../src/components/AppCard';
import { AppButton } from '../../../src/components/AppButton';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { MoneyDisplay } from '../../../src/components/MoneyDisplay';
import { DateDisplay } from '../../../src/components/DateDisplay';
import { LoadingState } from '../../../src/components/LoadingState';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';
import { PermissionGate } from '../../../src/components/PermissionGate';

export default function RestaurantPosDashboardScreen() {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const {
    data: orders = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<PosOrder[]>({
    queryKey: ['pos-orders', selectedStatus],
    queryFn: () => fetchPosOrders({ status: selectedStatus || undefined }),
    refetchInterval: 15000, // Poll active orders every 15s
  });

  const tables = Array.from({ length: 12 }, (_, i) => {
    const tableNum = String(i + 1);
    const activeOrder = orders.find(
      (o) => o.tableNumber === tableNum && ['Pending', 'Preparing', 'Ready'].includes(o.status)
    );
    return {
      tableNumber: tableNum,
      isOccupied: !!activeOrder,
      activeOrder,
    };
  });

  const renderOrderItem = ({ item }: { item: PosOrder }) => {
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
        default:
          return 'default';
      }
    };

    const itemCount = item.items?.reduce((sum, it) => sum + it.quantity, 0) || 0;

    return (
      <AppCard
        style={styles.orderCard}
        onPress={() =>
          router.push({
            pathname: '/(app)/restaurant/order-details',
            params: { orderId: item.id },
          })
        }
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderTitle}>
              {item.tableNumber ? `Table ${item.tableNumber}` : item.orderSource || 'Takeaway'}
            </Text>
            <Text style={styles.orderRef}>
              Order #{item.id.slice(0, 8).toUpperCase()} • {itemCount} items
            </Text>
          </View>
          <StatusBadge label={item.status} variant={getStatusVariant(item.status)} />
        </View>

        <View style={styles.orderBody}>
          <View style={styles.itemsSummary}>
            {item.items?.slice(0, 2).map((it, idx) => (
              <Text key={idx} style={styles.itemText} numberOfLines={1}>
                {it.quantity}x {it.menuItem?.name || 'Item'}
              </Text>
            ))}
            {item.items && item.items.length > 2 && (
              <Text style={styles.moreItemsText}>+{item.items.length - 2} more items</Text>
            )}
          </View>

          <View style={styles.orderBottom}>
            <DateDisplay dateString={item.createdAt} showTime style={styles.timeText} />
            <MoneyDisplay amount={item.grandTotal} style={styles.orderTotal} />
          </View>
        </View>
      </AppCard>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Restaurant POS"
        subtitle="Table Orders, KOT Queue & Dining Folio Charges"
        showBack
        rightAction={
          <TouchableOpacity
            style={styles.kdsButton}
            onPress={() => router.push('/(app)/kitchen')}
            activeOpacity={0.7}
          >
            <Text style={styles.kdsButtonText}>🍳 Kitchen KDS</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Quick New Order Button */}
        <PermissionGate permission="POS_ORDER_CREATE">
          <AppButton
            title="🍽️ + Create New Table / Room Order"
            variant="primary"
            onPress={() => router.push('/(app)/restaurant/order')}
            style={styles.newOrderBtn}
          />
        </PermissionGate>

        {/* Floor Table Map (1-12) */}
        <Text style={styles.sectionTitle}>Dining Floor Tables (1–12)</Text>
        <View style={styles.tableGrid}>
          {tables.map((t) => (
            <TouchableOpacity
              key={t.tableNumber}
              style={[styles.tableCell, t.isOccupied ? styles.tableOccupied : styles.tableVacant]}
              onPress={() => {
                if (t.activeOrder) {
                  router.push({
                    pathname: '/(app)/restaurant/order-details',
                    params: { orderId: t.activeOrder.id },
                  });
                } else {
                  router.push({
                    pathname: '/(app)/restaurant/order',
                    params: { tableNumber: t.tableNumber },
                  });
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.tableNum, t.isOccupied ? styles.tableNumOccupied : styles.tableNumVacant]}>
                T{t.tableNumber}
              </Text>
              <Text style={styles.tableStatusText}>{t.isOccupied ? 'Occupied' : 'Vacant'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Live Orders Section */}
        <View style={styles.ordersHeaderRow}>
          <Text style={styles.sectionTitle}>Live Restaurant Orders</Text>
          <View style={styles.filterRow}>
            {(['All', 'Pending', 'Preparing', 'Ready'] as const).map((filter) => {
              const val = filter === 'All' ? null : filter;
              const isActive = selectedStatus === val;
              return (
                <TouchableOpacity
                  key={filter}
                  style={[styles.miniChip, isActive && styles.miniChipActive]}
                  onPress={() => setSelectedStatus(val)}
                >
                  <Text style={[styles.miniChipText, isActive && styles.miniChipTextActive]}>
                    {filter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {isLoading ? (
          <LoadingState message="Loading restaurant orders..." />
        ) : isError ? (
          <ErrorState
            title="Failed to Load Orders"
            message={(error as Error)?.message || 'Unable to connect to server.'}
            onRetry={refetch}
          />
        ) : orders.length === 0 ? (
          <EmptyState
            title="No Active Orders"
            description="There are no restaurant orders matching your filter."
          />
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id}
            renderItem={renderOrderItem}
            scrollEnabled={false}
          />
        )}
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
  kdsButton: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  kdsButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  newOrderBtn: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginVertical: 10,
  },
  tableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  tableCell: {
    flexBasis: '23%',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  tableVacant: {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceBorder,
  },
  tableOccupied: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: colors.danger,
  },
  tableNum: {
    fontSize: 16,
    fontWeight: '800',
  },
  tableNumVacant: {
    color: colors.text,
  },
  tableNumOccupied: {
    color: colors.danger,
  },
  tableStatusText: {
    color: colors.textDim,
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  ordersHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  miniChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  miniChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  miniChipText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  miniChipTextActive: {
    color: '#fff',
  },
  orderCard: {
    marginBottom: 10,
    padding: 14,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  orderTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  orderRef: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  orderBody: {
    marginTop: 8,
  },
  itemsSummary: {
    gap: 3,
  },
  itemText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  moreItemsText: {
    color: colors.textDim,
    fontSize: 11,
    fontStyle: 'italic',
  },
  orderBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  timeText: {
    fontSize: 11,
  },
  orderTotal: {
    fontSize: 16,
  },
});
