import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchStoresAndTransfers,
  createStoreTransferApi,
  CreateTransferPayload,
} from '../../../src/api/inventory';
import { colors } from '../../../src/theme/colors';
import { AppHeader } from '../../../src/components/AppHeader';
import { AppCard } from '../../../src/components/AppCard';
import { AppButton } from '../../../src/components/AppButton';
import { AppInput } from '../../../src/components/AppInput';
import { LoadingState } from '../../../src/components/LoadingState';

export default function CreateStoreTransferScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [sourceStoreId, setSourceStoreId] = useState<string | null>(null);
  const [destStoreId, setDestStoreId] = useState<string | null>(null);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [unit, setUnit] = useState('PCS');
  const [actionError, setActionError] = useState<string | null>(null);

  const { data = { transfers: [], stores: [] }, isLoading } = useQuery({
    queryKey: ['stores-transfers'],
    queryFn: fetchStoresAndTransfers,
  });

  const stores = data.stores || [];

  const createMutation = useMutation({
    mutationFn: (payload: CreateTransferPayload) => createStoreTransferApi(payload),
    onSuccess: (trf) => {
      queryClient.invalidateQueries({ queryKey: ['stores-transfers'] });
      Alert.alert(
        'Requisition Created',
        `Stock transfer #${trf.transferNumber} has been logged in REQUESTED status.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to create store transfer.');
    },
  });

  const handleSubmit = () => {
    if (!sourceStoreId) {
      setActionError('Source store is required.');
      return;
    }
    if (!destStoreId) {
      setActionError('Destination store is required.');
      return;
    }
    if (sourceStoreId === destStoreId) {
      setActionError('Source and destination stores must be different.');
      return;
    }
    if (!itemName.trim()) {
      setActionError('Item name is required.');
      return;
    }
    const qtyNum = parseFloat(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setActionError('Please enter a valid positive quantity.');
      return;
    }

    setActionError(null);
    const transferNumber = `TRF-${Date.now().toString().slice(-6)}`;

    createMutation.mutate({
      transferNumber,
      sourceStoreId,
      destStoreId,
      itemName: itemName.trim(),
      quantity: qtyNum,
      unit: unit.trim() || 'PCS',
    });
  };

  if (isLoading) {
    return <LoadingState message="Loading inventory stores..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="New Stock Requisition"
        subtitle="Inter-Department Store Transfer"
        showBack
      />

      <ScrollView contentContainerStyle={styles.container}>
        {actionError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {actionError}</Text>
          </View>
        )}

        {/* Source Store Selector */}
        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>1. Source Store (Issuing Warehouse) *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storeScroll}>
            {stores.map((s) => {
              const isSelected = sourceStoreId === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.storeChip, isSelected && styles.storeChipActive]}
                  onPress={() => setSourceStoreId(s.id)}
                >
                  <Text style={[styles.storeChipName, isSelected && styles.storeChipNameActive]}>
                    📦 {s.name}
                  </Text>
                  <Text style={styles.storeChipCode}>{s.code}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </AppCard>

        {/* Destination Store Selector */}
        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>2. Destination Store (Receiving Department) *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storeScroll}>
            {stores.map((s) => {
              const isSelected = destStoreId === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.storeChip, isSelected && styles.storeChipActive]}
                  onPress={() => setDestStoreId(s.id)}
                >
                  <Text style={[styles.storeChipName, isSelected && styles.storeChipNameActive]}>
                    📍 {s.name}
                  </Text>
                  <Text style={styles.storeChipCode}>{s.code}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </AppCard>

        {/* Item & Quantity Details */}
        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>3. Material & Quantity Details</Text>
          <AppInput
            label="Item / Material Name *"
            placeholder="e.g. Bath Towel (White), Cooking Oil, Printer Paper"
            value={itemName}
            onChangeText={setItemName}
          />

          <View style={styles.qtyRow}>
            <View style={styles.qtyCol}>
              <AppInput
                label="Transfer Quantity *"
                placeholder="10"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.unitCol}>
              <Text style={styles.fieldLabel}>Unit</Text>
              <View style={styles.unitChipsRow}>
                {['PCS', 'KG', 'LTR', 'ROLLS', 'PACKS', 'BOXES'].map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitChip, unit === u && styles.unitChipActive]}
                    onPress={() => setUnit(u)}
                  >
                    <Text style={[styles.unitChipText, unit === u && styles.unitChipTextActive]}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </AppCard>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <AppButton
            title="Create Stock Requisition"
            variant="primary"
            loading={createMutation.isPending}
            disabled={createMutation.isPending}
            onPress={handleSubmit}
          />
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
  cardTitle: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  storeScroll: {
    flexDirection: 'row',
  },
  storeChip: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginRight: 8,
    width: 160,
  },
  storeChipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  storeChipName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  storeChipNameActive: {
    color: colors.primary,
  },
  storeChipCode: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 2,
  },
  qtyRow: {
    marginTop: 8,
  },
  qtyCol: {
    marginBottom: 8,
  },
  unitCol: {
    marginTop: 4,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  unitChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  unitChip: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  unitChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  unitChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  unitChipTextActive: {
    color: '#fff',
  },
  actionContainer: {
    marginTop: 8,
    marginBottom: 36,
  },
});
