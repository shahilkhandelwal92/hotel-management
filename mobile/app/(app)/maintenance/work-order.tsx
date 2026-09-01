import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMaintenanceData,
  updateWorkOrderStatusApi,
  completeWorkOrderApi,
  addWorkOrderPartApi,
  AddPartPayload,
} from '../../../src/api/maintenance';
import { WorkOrderPart } from '../../../src/api/types';
import { colors } from '../../../src/theme/colors';
import { AppHeader } from '../../../src/components/AppHeader';
import { AppCard } from '../../../src/components/AppCard';
import { AppButton } from '../../../src/components/AppButton';
import { AppInput } from '../../../src/components/AppInput';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { MoneyDisplay } from '../../../src/components/MoneyDisplay';
import { DateDisplay } from '../../../src/components/DateDisplay';
import { LoadingState } from '../../../src/components/LoadingState';
import { ErrorState } from '../../../src/components/ErrorState';
import { PermissionGate } from '../../../src/components/PermissionGate';

export default function WorkOrderDetailScreen() {
  const { workOrderId } = useLocalSearchParams<{ workOrderId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [partModalVisible, setPartModalVisible] = useState(false);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);

  // Add Part State
  const [partName, setPartName] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [partUnitCost, setPartUnitCost] = useState('150.00');
  const [partError, setPartError] = useState<string | null>(null);

  // Complete Work Order State
  const [resolutionNotes, setResolutionNotes] = useState('Work completed and verified operational.');
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data = { assets: [], workOrders: [] },
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['maintenance-data'],
    queryFn: fetchMaintenanceData,
  });

  const order = data.workOrders?.find((w) => w.id === workOrderId);

  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: 'IN_PROGRESS' | 'COMPLETED') =>
      updateWorkOrderStatusApi({ workOrderId: workOrderId!, status: newStatus }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-data'] });
      Alert.alert('Status Updated', `Work order status changed to ${updated.status}.`);
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to update status.');
    },
  });

  const addPartMutation = useMutation({
    mutationFn: (payload: AddPartPayload) => addWorkOrderPartApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-data'] });
      setPartModalVisible(false);
      setPartName('');
      setPartError(null);
      Alert.alert('Part Recorded', 'Part consumption logged on work order.');
    },
    onError: (err: any) => {
      setPartError(err.message || 'Failed to record part.');
    },
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      completeWorkOrderApi({
        workOrderId: workOrderId!,
        resolutionNotes: resolutionNotes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-data'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['rooms-available'] });
      setCompleteModalVisible(false);
      Alert.alert(
        'Work Order Completed',
        order?.lockRoomOutOfOrder
          ? 'Work order completed. Room has been released to Housekeeping (Dirty) for cleaning.'
          : 'Work order marked COMPLETED.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to complete work order.');
    },
  });

  const handleAddPartSubmit = () => {
    if (!partName.trim()) {
      setPartError('Part name is required.');
      return;
    }
    const qtyNum = parseInt(partQty, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setPartError('Valid positive quantity required.');
      return;
    }
    const costNum = parseFloat(partUnitCost);
    if (isNaN(costNum) || costNum < 0) {
      setPartError('Valid unit cost required.');
      return;
    }

    addPartMutation.mutate({
      workOrderId: workOrderId!,
      partName: partName.trim(),
      quantity: qtyNum,
      unitCost: costNum,
    });
  };

  if (isLoading) {
    return <LoadingState message="Loading work order dossier..." />;
  }

  if (isError || !order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Work Order" showBack />
        <ErrorState
          title="Work Order Not Found"
          message={(error as Error)?.message || 'Record could not be retrieved.'}
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  const parts = order.partsUsed || [];
  const totalPartsCost = parts.reduce((sum, p) => sum + Number(p.totalCost), 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={order.workOrderNumber}
        subtitle={order.title}
        showBack
      />

      <ScrollView contentContainerStyle={styles.container}>
        {actionError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {actionError}</Text>
          </View>
        )}

        {/* Status & Priority Overview */}
        <AppCard style={styles.card}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.orderTitle}>{order.title}</Text>
              <DateDisplay dateString={order.createdAt} showTime style={styles.orderDate} />
            </View>
            <View style={styles.badgeCol}>
              <StatusBadge label={order.priority} variant={order.priority === 'EMERGENCY' ? 'danger' : 'warning'} />
              <StatusBadge label={order.status} variant={order.status === 'COMPLETED' ? 'success' : 'info'} />
            </View>
          </View>

          <Text style={styles.descriptionText}>{order.description}</Text>

          {/* Asset / Room Meta */}
          <View style={styles.metaBox}>
            {order.asset && (
              <View style={styles.metaLine}>
                <Text style={styles.metaLabel}>⚙️ Asset:</Text>
                <Text style={styles.metaVal}>{order.asset.name} ({order.asset.location})</Text>
              </View>
            )}
            {order.roomId && (
              <View style={styles.metaLine}>
                <Text style={styles.metaLabel}>🚪 Room:</Text>
                <Text style={[styles.metaVal, order.lockRoomOutOfOrder && styles.oooVal]}>
                  Room {order.roomId} {order.lockRoomOutOfOrder ? '• Out of Order Locked' : ''}
                </Text>
              </View>
            )}
          </View>
        </AppCard>

        {/* Parts Used / Material Consumption */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Parts & Materials Used ({parts.length})</Text>
          {order.status !== 'COMPLETED' && (
            <PermissionGate permission="MAINTENANCE_MANAGE">
              <TouchableOpacity
                style={styles.addPartBtn}
                onPress={() => setPartModalVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.addPartBtnText}>+ Add Part</Text>
              </TouchableOpacity>
            </PermissionGate>
          )}
        </View>

        <AppCard style={styles.card}>
          {parts.length === 0 ? (
            <Text style={styles.emptyPartsText}>No replacement parts recorded yet.</Text>
          ) : (
            parts.map((p, idx) => (
              <View key={idx} style={styles.partRow}>
                <View>
                  <Text style={styles.partName}>{p.quantity}x {p.partName}</Text>
                  <Text style={styles.partUnitCost}>@ ₹{Number(p.unitCost).toFixed(2)} each</Text>
                </View>
                <MoneyDisplay amount={p.totalCost} style={styles.partTotalCost} />
              </View>
            ))
          )}

          {parts.length > 0 && (
            <View style={styles.partsTotalRow}>
              <Text style={styles.partsTotalLabel}>Total Parts Cost</Text>
              <MoneyDisplay amount={totalPartsCost} style={styles.partsTotalVal} />
            </View>
          )}
        </AppCard>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {order.status === 'REPORTED' && (
            <PermissionGate permission="MAINTENANCE_MANAGE">
              <AppButton
                title="▶ Start Work (In Progress)"
                variant="primary"
                loading={updateStatusMutation.isPending}
                onPress={() => updateStatusMutation.mutate('IN_PROGRESS')}
              />
            </PermissionGate>
          )}

          {order.status === 'IN_PROGRESS' && (
            <PermissionGate permission="MAINTENANCE_MANAGE">
              <AppButton
                title="✓ Complete & Release Work Order"
                variant="success"
                onPress={() => setCompleteModalVisible(true)}
              />
            </PermissionGate>
          )}
        </View>
      </ScrollView>

      {/* Add Part Modal */}
      <Modal
        visible={partModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPartModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Part Consumption</Text>
              <TouchableOpacity onPress={() => setPartModalVisible(false)} activeOpacity={0.7}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formScroll}>
              {partError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>⚠️ {partError}</Text>
                </View>
              )}

              <AppInput
                label="Part / Material Name *"
                placeholder="e.g. AC Air Filter, 10A Circuit Breaker"
                value={partName}
                onChangeText={setPartName}
              />

              <AppInput
                label="Quantity *"
                placeholder="1"
                value={partQty}
                onChangeText={setPartQty}
                keyboardType="number-pad"
              />

              <AppInput
                label="Unit Cost (₹) *"
                placeholder="0.00"
                value={partUnitCost}
                onChangeText={setPartUnitCost}
                keyboardType="numeric"
              />

              <View style={styles.modalActions}>
                <AppButton
                  title="Cancel"
                  variant="outline"
                  onPress={() => setPartModalVisible(false)}
                  style={styles.modalBtn}
                />
                <AppButton
                  title="Record Part"
                  variant="primary"
                  loading={addPartMutation.isPending}
                  onPress={handleAddPartSubmit}
                  style={styles.modalBtn}
                />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Complete Work Order Modal */}
      <Modal
        visible={completeModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCompleteModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complete Work Order</Text>
              <TouchableOpacity onPress={() => setCompleteModalVisible(false)} activeOpacity={0.7}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formScroll}>
              <Text style={styles.completeNotice}>
                {order.lockRoomOutOfOrder
                  ? 'Completing this work order will automatically remove the Out-of-Order lock on Room ' + order.roomId + ' and transition it to Dirty for housekeeping cleaning.'
                  : 'Confirm completion of this maintenance work order.'}
              </Text>

              <AppInput
                label="Resolution Notes"
                placeholder="Describe resolution / repairs done"
                value={resolutionNotes}
                onChangeText={setResolutionNotes}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalActions}>
                <AppButton
                  title="Cancel"
                  variant="outline"
                  onPress={() => setCompleteModalVisible(false)}
                  style={styles.modalBtn}
                />
                <AppButton
                  title="Confirm Complete"
                  variant="success"
                  loading={completeMutation.isPending}
                  onPress={() => completeMutation.mutate()}
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
    marginBottom: 10,
  },
  orderTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  orderDate: {
    fontSize: 12,
    marginTop: 2,
  },
  badgeCol: {
    gap: 6,
    alignItems: 'flex-end',
  },
  descriptionText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginVertical: 8,
  },
  metaBox: {
    backgroundColor: colors.surfaceLight,
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    gap: 6,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLabel: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '600',
  },
  metaVal: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  oooVal: {
    color: colors.danger,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  addPartBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addPartBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyPartsText: {
    color: colors.textDim,
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  partRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  partName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  partUnitCost: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 2,
  },
  partTotalCost: {
    fontSize: 14,
    fontWeight: '700',
  },
  partsTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
  },
  partsTotalLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  partsTotalVal: {
    fontSize: 16,
  },
  actionsContainer: {
    gap: 10,
    marginTop: 8,
    marginBottom: 36,
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
  completeNotice: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
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
