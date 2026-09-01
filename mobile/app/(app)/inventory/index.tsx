import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchStoresAndTransfers,
  createInventoryStoreApi,
  CreateStorePayload,
} from '../../../src/api/inventory';
import { InventoryStore, StockTransfer } from '../../../src/api/types';
import { colors } from '../../../src/theme/colors';
import { AppHeader } from '../../../src/components/AppHeader';
import { AppCard } from '../../../src/components/AppCard';
import { AppButton } from '../../../src/components/AppButton';
import { AppInput } from '../../../src/components/AppInput';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { DateDisplay } from '../../../src/components/DateDisplay';
import { LoadingState } from '../../../src/components/LoadingState';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';
import { PermissionGate } from '../../../src/components/PermissionGate';

export default function InventoryDashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storeCode, setStoreCode] = useState('');
  const [location, setLocation] = useState('Ground Floor Warehouse');
  const [modalError, setModalError] = useState<string | null>(null);

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
    refetchInterval: 15000,
  });

  const transfers = data.transfers || [];
  const stores = data.stores || [];

  const requestedTransfers = transfers.filter((t) => t.status === 'REQUESTED');
  const inTransitTransfers = transfers.filter((t) => t.status === 'IN_TRANSIT');

  const createStoreMutation = useMutation({
    mutationFn: (payload: CreateStorePayload) => createInventoryStoreApi(payload),
    onSuccess: (newStore) => {
      queryClient.invalidateQueries({ queryKey: ['stores-transfers'] });
      setModalVisible(false);
      setStoreName('');
      setStoreCode('');
      setModalError(null);
      Alert.alert('Store Created', `Inventory store ${newStore.name} registered.`);
    },
    onError: (err: any) => {
      setModalError(err.message || 'Failed to create store.');
    },
  });

  const handleCreateStore = () => {
    if (!storeName.trim()) {
      setModalError('Store name is required.');
      return;
    }
    if (!storeCode.trim()) {
      setModalError('Store code is required.');
      return;
    }

    createStoreMutation.mutate({
      name: storeName.trim(),
      code: storeCode.trim(),
      location: location.trim() || undefined,
    });
  };

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

  const renderTransferItem = ({ item }: { item: StockTransfer }) => (
    <AppCard
      style={styles.transferCard}
      onPress={() => router.push('/(app)/inventory/transfers')}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.transferNum}>{item.transferNumber}</Text>
          <Text style={styles.itemName}>{item.quantity} {item.unit} • {item.itemName}</Text>
        </View>
        <StatusBadge label={item.status} variant={getStatusVariant(item.status)} />
      </View>

      <View style={styles.routeBox}>
        <Text style={styles.routeText}>
          📦 {item.sourceStore?.name || 'Source Store'} ➔ 📍 {item.destStore?.name || 'Dest Store'}
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <DateDisplay dateString={item.createdAt} showTime style={styles.dateText} />
      </View>
    </AppCard>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Stores & Inventory"
        subtitle="Multi-Store Requisitions, Transfers & Conservation"
        showBack
        rightAction={
          <TouchableOpacity
            style={styles.transfersBtn}
            onPress={() => router.push('/(app)/inventory/transfers')}
            activeOpacity={0.7}
          >
            <Text style={styles.transfersBtnText}>📋 Transfers ({transfers.length})</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Metric Cards Row */}
        <View style={styles.metricRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Stores</Text>
            <Text style={styles.metricValue}>{stores.length}</Text>
          </View>
          <View style={[styles.metricCard, requestedTransfers.length > 0 && styles.alertCard]}>
            <Text style={[styles.metricLabel, requestedTransfers.length > 0 && styles.alertText]}>Requested</Text>
            <Text style={[styles.metricValue, requestedTransfers.length > 0 && styles.alertText]}>{requestedTransfers.length}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>In Transit</Text>
            <Text style={styles.metricValue}>{inTransitTransfers.length}</Text>
          </View>
        </View>

        {/* Action Button */}
        <PermissionGate permission="STORE_MANAGE">
          <AppButton
            title="📦 + Create Stock Transfer Requisition"
            variant="primary"
            onPress={() => router.push('/(app)/inventory/create-transfer')}
            style={styles.actionBtn}
          />
        </PermissionGate>

        {/* Registered Property Stores */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Property Stores ({stores.length})</Text>
          <PermissionGate permission="STORE_MANAGE">
            <TouchableOpacity
              style={styles.addStoreBtn}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.addStoreBtnText}>+ Add Store</Text>
            </TouchableOpacity>
          </PermissionGate>
        </View>

        <View style={styles.storesGrid}>
          {stores.map((s) => (
            <AppCard key={s.id} style={styles.storeCard}>
              <Text style={styles.storeName}>{s.name}</Text>
              <Text style={styles.storeMeta}>{s.code} • {s.location || 'Warehouse'}</Text>
            </AppCard>
          ))}
        </View>

        {/* Recent Transfer Activity */}
        <Text style={styles.sectionTitle}>Recent Stock Transfers</Text>
        {isLoading ? (
          <LoadingState message="Loading inventory transfers..." />
        ) : isError ? (
          <ErrorState
            title="Failed to Load Inventory"
            message={(error as Error)?.message || 'Unable to connect to server.'}
            onRetry={refetch}
          />
        ) : transfers.length === 0 ? (
          <EmptyState
            title="No Transfers"
            description="No inter-store stock transfers requested yet."
          />
        ) : (
          <FlatList
            data={transfers.slice(0, 5)}
            keyExtractor={(item) => item.id}
            renderItem={renderTransferItem}
            scrollEnabled={false}
          />
        )}
      </ScrollView>

      {/* Add Store Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register Inventory Store</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} activeOpacity={0.7}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll}>
              {modalError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>⚠️ {modalError}</Text>
                </View>
              )}

              <AppInput
                label="Store Name *"
                placeholder="e.g. Linen Store, Housekeeping Floor Store"
                value={storeName}
                onChangeText={setStoreName}
              />

              <AppInput
                label="Store Code *"
                placeholder="e.g. LINEN-01, HK-FL3"
                value={storeCode}
                onChangeText={setStoreCode}
              />

              <AppInput
                label="Location / Floor"
                placeholder="e.g. 2nd Floor Linen Room"
                value={location}
                onChangeText={setLocation}
              />

              <View style={styles.modalActions}>
                <AppButton
                  title="Cancel"
                  variant="outline"
                  onPress={() => setModalVisible(false)}
                  style={styles.modalBtn}
                />
                <AppButton
                  title="Save Store"
                  variant="primary"
                  loading={createStoreMutation.isPending}
                  onPress={handleCreateStore}
                  style={styles.modalBtn}
                />
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
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
  transfersBtn: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  transfersBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
  },
  alertCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: colors.warning,
  },
  metricLabel: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metricValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  alertText: {
    color: colors.warning,
  },
  actionBtn: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  addStoreBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addStoreBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  storesGrid: {
    gap: 8,
    marginBottom: 16,
  },
  storeCard: {
    padding: 12,
  },
  storeName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  storeMeta: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  transferCard: {
    marginBottom: 10,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    color: colors.textMuted,
    fontSize: 20,
    fontWeight: '700',
    padding: 4,
  },
  formScroll: {
    padding: 20,
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
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 10,
  },
  modalBtn: {
    flex: 1,
  },
});
