import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchKitchenStock, updateKitchenStockApi } from '../../../src/api/kitchen';
import { GroceryStockItem } from '../../../src/api/types';
import { colors } from '../../../src/theme/colors';
import { AppHeader } from '../../../src/components/AppHeader';
import { AppCard } from '../../../src/components/AppCard';
import { AppButton } from '../../../src/components/AppButton';
import { AppInput } from '../../../src/components/AppInput';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { LoadingState } from '../../../src/components/LoadingState';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';

export default function KitchenStockScreen() {
  const queryClient = useQueryClient();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<GroceryStockItem | null>(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const {
    data: stock = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['kitchen-stock'],
    queryFn: fetchKitchenStock,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; quantity: number }) => updateKitchenStockApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-stock'] });
      setEditModalVisible(false);
      setSelectedStockItem(null);
      setNewQuantity('');
      setEditError(null);
    },
    onError: (err: any) => {
      setEditError(err.message || 'Failed to update stock quantity.');
    },
  });

  const handleOpenEdit = (item: GroceryStockItem) => {
    setSelectedStockItem(item);
    setNewQuantity(String(item.quantity));
    setEditModalVisible(true);
    setEditError(null);
  };

  const handleSaveStock = () => {
    const qtyNum = parseFloat(newQuantity);
    if (isNaN(qtyNum) || qtyNum < 0) {
      setEditError('Please enter a valid non-negative quantity.');
      return;
    }
    if (!selectedStockItem) return;

    updateMutation.mutate({
      id: selectedStockItem.id,
      quantity: qtyNum,
    });
  };

  if (isLoading) {
    return <LoadingState message="Loading kitchen grocery stock..." />;
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Kitchen Grocery Stock" showBack />
        <ErrorState
          title="Stock Error"
          message={(error as Error)?.message || 'Failed to fetch stock items.'}
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  const lowStockItems = stock.filter((s) => s.quantity <= s.minAlert);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Kitchen Inventory & Stock"
        subtitle="Grocery Levels & Recipe Ingredients"
        showBack
      />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Low Stock Warning Banner */}
        {lowStockItems.length > 0 && (
          <View style={styles.lowStockBanner}>
            <Text style={styles.lowStockTitle}>
              ⚠️ {lowStockItems.length} Ingredients Below Alert Threshold
            </Text>
            <Text style={styles.lowStockSub}>
              {lowStockItems.map((i) => `${i.itemName} (${i.quantity} ${i.unit})`).join(', ')}
            </Text>
          </View>
        )}

        {/* Stock Items List */}
        <Text style={styles.sectionTitle}>Current Grocery Stock ({stock.length})</Text>
        {stock.length === 0 ? (
          <EmptyState
            title="No Stock Items"
            description="No kitchen inventory stock items found."
          />
        ) : (
          stock.map((item) => {
            const isLow = item.quantity <= item.minAlert;
            return (
              <AppCard key={item.id} style={[styles.stockCard, isLow && styles.lowStockCard]}>
                <View style={styles.stockTop}>
                  <View>
                    <Text style={styles.stockName}>{item.itemName}</Text>
                    <Text style={styles.stockMeta}>Min Alert Level: {item.minAlert} {item.unit}</Text>
                  </View>
                  <StatusBadge
                    label={isLow ? 'LOW STOCK' : 'IN STOCK'}
                    variant={isLow ? 'danger' : 'success'}
                  />
                </View>

                <View style={styles.stockBottom}>
                  <Text style={styles.stockQty}>
                    {item.quantity} <Text style={styles.unitText}>{item.unit}</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.adjustBtn}
                    onPress={() => handleOpenEdit(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.adjustBtnText}>✏️ Adjust Level</Text>
                  </TouchableOpacity>
                </View>
              </AppCard>
            );
          })
        )}
      </ScrollView>

      {/* Adjust Stock Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adjust Stock Level</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} activeOpacity={0.7}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formContent}>
              {editError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>⚠️ {editError}</Text>
                </View>
              )}

              <Text style={styles.stockEditName}>{selectedStockItem?.itemName}</Text>
              <Text style={styles.stockEditUnit}>Unit: {selectedStockItem?.unit}</Text>

              <AppInput
                label="New Physical Count Quantity *"
                placeholder="0"
                value={newQuantity}
                onChangeText={setNewQuantity}
                keyboardType="numeric"
              />

              <View style={styles.modalActions}>
                <AppButton
                  title="Cancel"
                  variant="outline"
                  onPress={() => setEditModalVisible(false)}
                  style={styles.modalBtn}
                />
                <AppButton
                  title="Save Count"
                  variant="primary"
                  loading={updateMutation.isPending}
                  onPress={handleSaveStock}
                  style={styles.modalBtn}
                />
              </View>
            </View>
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
  lowStockBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  lowStockTitle: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  lowStockSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  stockCard: {
    marginBottom: 10,
    padding: 14,
  },
  lowStockCard: {
    borderColor: colors.danger,
  },
  stockTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stockName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  stockMeta: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  stockBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  stockQty: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  unitText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  adjustBtn: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  adjustBtnText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
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
  formContent: {
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
  stockEditName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  stockEditUnit: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 14,
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
