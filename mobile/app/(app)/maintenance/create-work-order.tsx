import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMaintenanceData, createWorkOrderApi, CreateWorkOrderPayload } from '../../../src/api/maintenance';
import { fetchRooms } from '../../../src/api/rooms';
import { colors } from '../../../src/theme/colors';
import { AppHeader } from '../../../src/components/AppHeader';
import { AppCard } from '../../../src/components/AppCard';
import { AppButton } from '../../../src/components/AppButton';
import { AppInput } from '../../../src/components/AppInput';
import { LoadingState } from '../../../src/components/LoadingState';

export default function CreateWorkOrderScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'>('MEDIUM');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [lockRoomOutOfOrder, setLockRoomOutOfOrder] = useState(false);
  const [assignedToId, setAssignedToId] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: maintData, isLoading: isMaintLoading } = useQuery({
    queryKey: ['maintenance-data'],
    queryFn: fetchMaintenanceData,
  });

  const { data: rooms = [], isLoading: isRoomsLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: fetchRooms,
  });

  const assets = maintData?.assets || [];

  const createMutation = useMutation({
    mutationFn: (payload: CreateWorkOrderPayload) => createWorkOrderApi(payload),
    onSuccess: (wo) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-data'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['rooms-available'] });

      Alert.alert(
        'Work Order Created',
        `Work Order #${wo.workOrderNumber} has been logged in the maintenance queue.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to create work order.');
    },
  });

  const handleSubmit = () => {
    if (!title.trim()) {
      setActionError('Work order title is required.');
      return;
    }
    if (!description.trim()) {
      setActionError('Description is required.');
      return;
    }

    setActionError(null);
    createMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      priority,
      assetId: selectedAssetId || undefined,
      roomId: selectedRoomId || selectedRoomNumber || undefined,
      assignedToId: assignedToId.trim() || undefined,
      lockRoomOutOfOrder: lockRoomOutOfOrder && (!!selectedRoomId || !!selectedRoomNumber),
    });
  };

  if (isMaintLoading || isRoomsLoading) {
    return <LoadingState message="Loading maintenance assets & property rooms..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Create Work Order"
        subtitle="Corrective Maintenance & OOO Room Isolation"
        showBack
      />

      <ScrollView contentContainerStyle={styles.container}>
        {actionError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {actionError}</Text>
          </View>
        )}

        <AppCard style={styles.card}>
          <AppInput
            label="Work Order Title *"
            placeholder="e.g. AC Cooling Breakdown, Bathroom Leakage"
            value={title}
            onChangeText={setTitle}
          />

          <AppInput
            label="Problem Description *"
            placeholder="Provide technical notes or guest complaint details"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          {/* Priority Selection */}
          <Text style={styles.fieldLabel}>Priority Level</Text>
          <View style={styles.priorityRow}>
            {(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.priorityChip,
                  priority === p && (p === 'EMERGENCY' ? styles.chipEmergency : styles.chipActive),
                ]}
                onPress={() => setPriority(p)}
              >
                <Text
                  style={[
                    styles.priorityChipText,
                    priority === p && styles.priorityChipTextActive,
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </AppCard>

        {/* Associated Plant Asset */}
        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>Associate Plant Asset (Optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <TouchableOpacity
              style={[styles.itemChip, selectedAssetId === null && styles.itemChipActive]}
              onPress={() => setSelectedAssetId(null)}
            >
              <Text style={[styles.itemChipText, selectedAssetId === null && styles.itemChipTextActive]}>
                None
              </Text>
            </TouchableOpacity>
            {assets.map((ast) => {
              const isSelected = selectedAssetId === ast.id;
              return (
                <TouchableOpacity
                  key={ast.id}
                  style={[styles.itemChip, isSelected && styles.itemChipActive]}
                  onPress={() => setSelectedAssetId(ast.id)}
                >
                  <Text style={[styles.itemChipText, isSelected && styles.itemChipTextActive]}>
                    ⚙️ {ast.name} ({ast.category})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </AppCard>

        {/* Associated Guest Room & OOO Lock */}
        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>Associate Room & Out-of-Order Lock</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <TouchableOpacity
              style={[styles.itemChip, selectedRoomId === null && styles.itemChipActive]}
              onPress={() => {
                setSelectedRoomId(null);
                setSelectedRoomNumber(null);
                setLockRoomOutOfOrder(false);
              }}
            >
              <Text style={[styles.itemChipText, selectedRoomId === null && styles.itemChipTextActive]}>
                No Room
              </Text>
            </TouchableOpacity>
            {rooms.map((rm) => {
              const isSelected = selectedRoomId === rm.id;
              return (
                <TouchableOpacity
                  key={rm.id}
                  style={[styles.itemChip, isSelected && styles.itemChipActive]}
                  onPress={() => {
                    setSelectedRoomId(rm.id);
                    setSelectedRoomNumber(rm.number);
                  }}
                >
                  <Text style={[styles.itemChipText, isSelected && styles.itemChipTextActive]}>
                    🚪 Room {rm.number}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {selectedRoomId && (
            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <Text style={styles.switchTitle}>Lock Room Out-of-Order (OOO)</Text>
                <Text style={styles.switchSub}>
                  Sets room to Maintenance state and blocks Front Desk assignment until repaired.
                </Text>
              </View>
              <Switch
                value={lockRoomOutOfOrder}
                onValueChange={setLockRoomOutOfOrder}
                trackColor={{ false: colors.surfaceBorder, true: colors.danger }}
                thumbColor="#fff"
              />
            </View>
          )}
        </AppCard>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <AppButton
            title="Create Work Order"
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
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  priorityChip: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipEmergency: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  priorityChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  priorityChipTextActive: {
    color: '#fff',
  },
  chipScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  itemChip: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginRight: 8,
  },
  itemChipActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: colors.primary,
  },
  itemChipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  itemChipTextActive: {
    color: colors.primary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  switchLeft: {
    flex: 1,
    paddingRight: 12,
  },
  switchTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  switchSub: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  actionContainer: {
    marginTop: 8,
    marginBottom: 36,
  },
});
