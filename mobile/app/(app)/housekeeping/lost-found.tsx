import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../src/api/client';
import { LostAndFoundItem } from '../../../src/api/types';
import { colors } from '../../../src/theme/colors';
import { AppHeader } from '../../../src/components/AppHeader';
import { AppCard } from '../../../src/components/AppCard';
import { AppButton } from '../../../src/components/AppButton';
import { AppInput } from '../../../src/components/AppInput';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { LoadingState } from '../../../src/components/LoadingState';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';

export default function LostFoundScreen() {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);

  // Form State
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [foundLocation, setFoundLocation] = useState('');
  const [foundByName, setFoundByName] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<{ items: LostAndFoundItem[] }>({
    queryKey: ['lost-and-found-items'],
    queryFn: async () => {
      return await apiClient<{ items: LostAndFoundItem[] }>('/api/housekeeping/lost-found');
    },
  });

  const items = data?.items ?? [];

  // Create mutation
  const createItemMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiClient('/api/housekeeping/lost-found', {
        method: 'POST',
        body: payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lost-and-found-items'] });
      setModalVisible(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to record lost and found item.');
    },
  });

  // Claim mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiClient('/api/housekeeping/lost-found', {
        method: 'PUT',
        body: { id, status },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lost-and-found-items'] });
    },
  });

  const resetForm = () => {
    setItemName('');
    setDescription('');
    setFoundLocation('');
    setFoundByName('');
    setGuestName('');
    setGuestContact('');
    setEstimatedValue('');
    setFormError(null);
  };

  const handleCreate = () => {
    if (!itemName.trim()) {
      setFormError('Item name is required.');
      return;
    }

    createItemMutation.mutate({
      itemName: itemName.trim(),
      description: description.trim() || undefined,
      foundLocation: foundLocation.trim() || undefined,
      foundByName: foundByName.trim() || undefined,
      guestName: guestName.trim() || undefined,
      guestContact: guestContact.trim() || undefined,
      estimatedValue: estimatedValue ? parseFloat(estimatedValue) : 0,
    });
  };

  const renderItem = ({ item }: { item: LostAndFoundItem }) => {
    return (
      <AppCard style={styles.itemCard}>
        <View style={styles.cardHeader}>
          <View style={styles.itemTitleContainer}>
            <Text style={styles.itemName}>{item.itemName}</Text>
            {item.foundLocation && (
              <Text style={styles.locationText}>📍 {item.foundLocation}</Text>
            )}
          </View>
          <StatusBadge
            label={item.status}
            variant={item.status === 'Claimed' ? 'success' : item.status === 'Found' ? 'warning' : 'default'}
          />
        </View>

        {item.description && (
          <Text style={styles.descriptionText}>{item.description}</Text>
        )}

        <View style={styles.metaRow}>
          {item.foundByName && (
            <Text style={styles.metaText}>Found By: {item.foundByName}</Text>
          )}
          {item.guestName && (
            <Text style={styles.metaText}>Guest: {item.guestName}</Text>
          )}
          {item.estimatedValue && Number(item.estimatedValue) > 0 && (
            <Text style={styles.metaText}>Est. Value: ₹{Number(item.estimatedValue).toFixed(2)}</Text>
          )}
        </View>

        {item.status === 'Found' && (
          <View style={styles.actionRow}>
            <AppButton
              title="Mark as Claimed"
              variant="outline"
              loading={updateStatusMutation.isPending}
              onPress={() => updateStatusMutation.mutate({ id: item.id, status: 'Claimed' })}
              style={styles.claimButton}
            />
          </View>
        )}
      </AppCard>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Lost & Found Register"
        subtitle="Guest Property Tracking"
        showBack
        rightAction={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.addButtonText}>+ Log Item</Text>
          </TouchableOpacity>
        }
      />

      {isLoading ? (
        <LoadingState message="Loading lost & found articles..." />
      ) : isError ? (
        <ErrorState
          title="Failed to Load Items"
          message={(error as Error)?.message || 'Could not connect to server.'}
          onRetry={refetch}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="No Lost & Found Items"
          description="There are currently no recorded lost or found articles."
          action={
            <AppButton
              title="Log New Item"
              variant="primary"
              onPress={() => setModalVisible(true)}
            />
          }
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* Log New Item Modal Form */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Lost & Found Article</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll}>
              {formError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>⚠️ {formError}</Text>
                </View>
              )}

              <AppInput
                label="Item Name *"
                placeholder="e.g. Black Leather Wallet"
                value={itemName}
                onChangeText={setItemName}
              />

              <AppInput
                label="Description"
                placeholder="e.g. Contains cards and currency"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />

              <AppInput
                label="Found Location"
                placeholder="e.g. Room 304 / Pool Area"
                value={foundLocation}
                onChangeText={setFoundLocation}
              />

              <AppInput
                label="Found By"
                placeholder="e.g. Housekeeper Sunita"
                value={foundByName}
                onChangeText={setFoundByName}
              />

              <AppInput
                label="Guest Name (if known)"
                placeholder="e.g. Rahul Sharma"
                value={guestName}
                onChangeText={setGuestName}
              />

              <AppInput
                label="Guest Contact Number"
                placeholder="e.g. +91 98765 43210"
                value={guestContact}
                onChangeText={setGuestContact}
                keyboardType="phone-pad"
              />

              <AppInput
                label="Estimated Value (₹)"
                placeholder="0.00"
                value={estimatedValue}
                onChangeText={setEstimatedValue}
                keyboardType="numeric"
              />

              <View style={styles.modalActions}>
                <AppButton
                  title="Cancel"
                  variant="outline"
                  onPress={() => setModalVisible(false)}
                  style={styles.modalButton}
                />
                <AppButton
                  title="Save Item"
                  variant="primary"
                  loading={createItemMutation.isPending}
                  onPress={handleCreate}
                  style={styles.modalButton}
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
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
  },
  itemCard: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitleContainer: {
    flex: 1,
    paddingRight: 10,
  },
  itemName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  locationText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  descriptionText: {
    color: colors.textDim,
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  actionRow: {
    marginTop: 12,
  },
  claimButton: {
    height: 40,
    marginVertical: 0,
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
    maxHeight: '90%',
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
  closeButton: {
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
  modalButton: {
    flex: 1,
  },
});
