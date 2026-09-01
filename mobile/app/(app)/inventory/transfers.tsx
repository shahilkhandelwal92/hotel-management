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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchStoresAndTransfers,
  issueStoreTransferApi,
  receiveStoreTransferApi,
} from '../../../src/api/inventory';
import { StockTransfer } from '../../../src/api/types';
import { colors } from '../../../src/theme/colors';
import { AppHeader } from '../../../src/components/AppHeader';
import { AppCard } from '../../../src/components/AppCard';
import { AppButton } from '../../../src/components/AppButton';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { DateDisplay } from '../../../src/components/DateDisplay';
import { LoadingState } from '../../../src/components/LoadingState';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';
import { PermissionGate } from '../../../src/components/PermissionGate';

export default function StoreTransfersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data = { transfers: [], stores: [] },
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['stores-transfers'],
    queryFn: fetchStoresAndTransfers,
  });

  const transfers = data.transfers || [];

  const filteredTransfers = selectedStatus
    ? transfers.filter((t) => t.status === selectedStatus)
    : transfers;

  const issueMutation = useMutation({
    mutationFn: (transferId: string) => issueStoreTransferApi(transferId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['stores-transfers'] });
      Alert.alert('Transfer Dispatched', `Transfer #${updated.transferNumber} marked IN_TRANSIT.`);
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to dispatch transfer.');
    },
  });

  const receiveMutation = useMutation({
    mutationFn: (transferId: string) => receiveStoreTransferApi(transferId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['stores-transfers'] });
      Alert.alert('Transfer Received', `Transfer #${updated.transferNumber} received at destination store.`);
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to receive transfer.');
    },
  });

  const getStatusVariant = (st: string) => {
    switch (st) {
      case 'REQUESTED':
        return 'warning';
      case 'IN_TRANSIT':
        return 'info';
      case 'RECEIVED':
        return 'success';
      case 'REJECTED':
        return 'danger';
      default:
        return 'default';
    }
  };

  const renderTransferCard = ({ item }: { item: StockTransfer }) => (
    <AppCard style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.transferNum}>{item.transferNumber}</Text>
          <Text style={styles.itemName}>{item.quantity} {item.unit} • {item.itemName}</Text>
        </View>
        <StatusBadge label={item.status} variant={getStatusVariant(item.status)} />
      </View>

      <View style={styles.routeBox}>
        <Text style={styles.routeText}>
          📦 {item.sourceStore?.name || 'Source Store'} ➔ 📍 {item.destStore?.name || 'Destination Store'}
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <DateDisplay dateString={item.createdAt} showTime style={styles.dateText} />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        {item.status === 'REQUESTED' && (
          <PermissionGate permission="STORE_MANAGE">
            <AppButton
              title="🚚 Dispatch / Issue (In Transit)"
              variant="primary"
              loading={issueMutation.isPending}
              onPress={() => issueMutation.mutate(item.id)}
              style={styles.cardBtn}
            />
          </PermissionGate>
        )}

        {item.status === 'IN_TRANSIT' && (
          <PermissionGate permission="STORE_MANAGE">
            <AppButton
              title="✓ Confirm Receipt at Store"
              variant="success"
              loading={receiveMutation.isPending}
              onPress={() => receiveMutation.mutate(item.id)}
              style={styles.cardBtn}
            />
          </PermissionGate>
        )}
      </View>
    </AppCard>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Stock Transfers & Requisitions"
        subtitle="Inter-Department Movement Queue"
        showBack
        rightAction={
          <PermissionGate permission="STORE_MANAGE">
            <TouchableOpacity
              style={styles.newBtn}
              onPress={() => router.push('/(app)/inventory/create-transfer')}
              activeOpacity={0.7}
            >
              <Text style={styles.newBtnText}>+ New Requisition</Text>
            </TouchableOpacity>
          </PermissionGate>
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

        {/* Status Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {(['All', 'REQUESTED', 'IN_TRANSIT', 'RECEIVED'] as const).map((st) => {
            const val = st === 'All' ? null : st;
            const isActive = selectedStatus === val;
            return (
              <TouchableOpacity
                key={st}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setSelectedStatus(val)}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {st}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {isLoading ? (
          <LoadingState message="Loading inter-store transfers..." />
        ) : isError ? (
          <ErrorState
            title="Failed to Load Transfers"
            message={(error as Error)?.message || 'Unable to connect to server.'}
            onRetry={refetch}
          />
        ) : filteredTransfers.length === 0 ? (
          <EmptyState
            title="No Transfers Found"
            description="There are no stock transfers matching the selected status."
          />
        ) : (
          <FlatList
            data={filteredTransfers}
            keyExtractor={(item) => item.id}
            renderItem={renderTransferCard}
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
  newBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
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
  filterScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  chip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  card: {
    marginBottom: 12,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  transferNum: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  itemName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  routeBox: {
    backgroundColor: colors.surfaceLight,
    padding: 8,
    borderRadius: 8,
    marginVertical: 4,
  },
  routeText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  dateText: {
    fontSize: 11,
  },
  actionRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  cardBtn: {
    height: 42,
  },
});
