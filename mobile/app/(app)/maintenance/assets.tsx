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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMaintenanceData,
  createMaintenanceAssetApi,
  CreateAssetPayload,
} from '../../../src/api/maintenance';
import { MaintenanceAsset } from '../../../src/api/types';
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

export default function MaintenanceAssetsScreen() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // New Asset State
  const [name, setName] = useState('');
  const [assetTag, setAssetTag] = useState('');
  const [category, setCategory] = useState('HVAC');
  const [location, setLocation] = useState('Plant Room Basement');
  const [serialNumber, setSerialNumber] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  const {
    data = { assets: [], workOrders: [] },
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['maintenance-data'],
    queryFn: fetchMaintenanceData,
  });

  const assets = data.assets || [];

  const categories = Array.from(new Set(assets.map((a) => a.category))).sort();

  const filteredAssets = selectedCategory
    ? assets.filter((a) => a.category === selectedCategory)
    : assets;

  const createAssetMutation = useMutation({
    mutationFn: (payload: CreateAssetPayload) => createMaintenanceAssetApi(payload),
    onSuccess: (newAsset) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-data'] });
      setModalVisible(false);
      setName('');
      setAssetTag('');
      setModalError(null);
      Alert.alert('Asset Registered', `Asset ${newAsset.name} [${newAsset.code}] saved.`);
    },
    onError: (err: any) => {
      setModalError(err.message || 'Failed to register asset.');
    },
  });

  const handleCreateSubmit = () => {
    if (!name.trim()) {
      setModalError('Asset name is required.');
      return;
    }
    if (!assetTag.trim()) {
      setModalError('Asset code/tag is required.');
      return;
    }

    createAssetMutation.mutate({
      name: name.trim(),
      assetTag: assetTag.trim(),
      category,
      location: location.trim() || undefined,
      serialNumber: serialNumber.trim() || undefined,
    });
  };

  const renderAssetItem = ({ item }: { item: MaintenanceAsset }) => {
    const schedules = item.schedules || [];
    return (
      <AppCard style={styles.assetCard}>
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.assetName}>{item.name}</Text>
            <Text style={styles.assetCode}>
              {item.code} • {item.location}
            </Text>
          </View>
          <StatusBadge
            label={item.status}
            variant={item.status === 'OPERATIONAL' ? 'success' : 'warning'}
          />
        </View>

        {item.serialNumber && (
          <Text style={styles.serialText}>Serial: {item.serialNumber}</Text>
        )}

        {/* Linked Preventive Schedules */}
        {schedules.length > 0 && (
          <View style={styles.scheduleBox}>
            <Text style={styles.scheduleTitle}>📅 Preventive Schedule:</Text>
            {schedules.map((sch) => (
              <View key={sch.id} style={styles.scheduleRow}>
                <Text style={styles.schName}>{sch.title} ({sch.frequency})</Text>
                <View style={styles.schDateRow}>
                  <Text style={styles.schDueLabel}>Next Due: </Text>
                  <DateDisplay dateString={sch.nextRunDate} style={styles.schDate} />
                </View>
              </View>
            ))}
          </View>
        )}
      </AppCard>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Plant Assets & Equipment"
        subtitle="HVAC, Generators, Elevators & Preventive Schedules"
        showBack
        rightAction={
          <PermissionGate permission="MAINTENANCE_MANAGE">
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.addBtnText}>+ Register Asset</Text>
            </TouchableOpacity>
          </PermissionGate>
        }
      />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Category Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          <TouchableOpacity
            style={[styles.catChip, selectedCategory === null && styles.catChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.catChipText, selectedCategory === null && styles.catChipTextActive]}>
              All ({assets.length})
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.catChipText, selectedCategory === cat && styles.catChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isLoading ? (
          <LoadingState message="Loading plant assets registry..." />
        ) : isError ? (
          <ErrorState
            title="Failed to Load Assets"
            message={(error as Error)?.message || 'Unable to connect to server.'}
            onRetry={refetch}
          />
        ) : filteredAssets.length === 0 ? (
          <EmptyState
            title="No Assets Found"
            description="No plant machinery registered for this category."
          />
        ) : (
          <FlatList
            data={filteredAssets}
            keyExtractor={(item) => item.id}
            renderItem={renderAssetItem}
            scrollEnabled={false}
          />
        )}
      </ScrollView>

      {/* Register Asset Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register Plant Asset</Text>
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
                label="Asset Name *"
                placeholder="e.g. Chiller Unit 1, Generator 500kVA"
                value={name}
                onChangeText={setName}
              />

              <AppInput
                label="Asset Tag / Code *"
                placeholder="e.g. CHILLER-01"
                value={assetTag}
                onChangeText={setAssetTag}
              />

              <AppInput
                label="Category"
                placeholder="HVAC, ELECTRICAL, ELEVATOR, PLUMBING"
                value={category}
                onChangeText={setCategory}
              />

              <AppInput
                label="Plant Location"
                placeholder="Basement, Rooftop, Plant Room"
                value={location}
                onChangeText={setLocation}
              />

              <AppInput
                label="Serial Number"
                placeholder="Optional hardware serial"
                value={serialNumber}
                onChangeText={setSerialNumber}
              />

              <View style={styles.modalActions}>
                <AppButton
                  title="Cancel"
                  variant="outline"
                  onPress={() => setModalVisible(false)}
                  style={styles.modalBtn}
                />
                <AppButton
                  title="Register"
                  variant="primary"
                  loading={createAssetMutation.isPending}
                  onPress={handleCreateSubmit}
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
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  catScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  catChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  catChipTextActive: {
    color: '#fff',
  },
  assetCard: {
    marginBottom: 10,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  assetName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  assetCode: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  serialText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  scheduleBox: {
    backgroundColor: colors.surfaceLight,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    gap: 4,
  },
  scheduleTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  schName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  schDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  schDueLabel: {
    color: colors.textDim,
    fontSize: 11,
  },
  schDate: {
    fontSize: 11,
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
