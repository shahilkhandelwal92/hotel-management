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
  FlatList,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCashierShifts,
  openCashierShiftApi,
  recordCashierTransactionApi,
  OpenShiftPayload,
  CashierTransactionPayload,
} from '../../../src/api/cashier';
import { CashierShift, CashDrawerTransaction } from '../../../src/api/types';
import { colors } from '../../../src/theme/colors';
import { AppHeader } from '../../../src/components/AppHeader';
import { AppCard } from '../../../src/components/AppCard';
import { AppButton } from '../../../src/components/AppButton';
import { AppInput } from '../../../src/components/AppInput';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { MoneyDisplay } from '../../../src/components/MoneyDisplay';
import { DateDisplay } from '../../../src/components/DateDisplay';
import { LoadingState } from '../../../src/components/LoadingState';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';
import { PermissionGate } from '../../../src/components/PermissionGate';

export default function CashierDashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [openShiftModalVisible, setOpenShiftModalVisible] = useState(false);
  const [txnModalVisible, setTxnModalVisible] = useState(false);

  // Open Shift State
  const [openingFloat, setOpeningFloat] = useState('1000.00');
  const [terminalName, setTerminalName] = useState('Front Desk Register 1');
  const [shiftNotes, setShiftNotes] = useState('');
  const [openShiftError, setOpenShiftError] = useState<string | null>(null);

  // Txn State (Drop / Paid-Out / Sale)
  const [txnType, setTxnType] = useState<'DROP' | 'PAID_OUT' | 'SALE' | 'PAYMENT' | 'REFUND'>('DROP');
  const [txnAmount, setTxnAmount] = useState('');
  const [txnDescription, setTxnDescription] = useState('Mid-day cash drop to hotel safe');
  const [txnError, setTxnError] = useState<string | null>(null);

  const {
    data: shifts = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<CashierShift[]>({
    queryKey: ['cashier-shifts'],
    queryFn: fetchCashierShifts,
  });

  const activeShift = shifts.find((s) => s.status === 'OPEN');

  const openShiftMutation = useMutation({
    mutationFn: (payload: OpenShiftPayload) => openCashierShiftApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashier-shifts'] });
      setOpenShiftModalVisible(false);
      setOpenShiftError(null);
    },
    onError: (err: any) => {
      setOpenShiftError(err.message || 'Failed to open cashier shift.');
    },
  });

  const recordTxnMutation = useMutation({
    mutationFn: (payload: CashierTransactionPayload) => recordCashierTransactionApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashier-shifts'] });
      setTxnModalVisible(false);
      setTxnAmount('');
      setTxnError(null);
    },
    onError: (err: any) => {
      setTxnError(err.message || 'Failed to record transaction.');
    },
  });

  const handleOpenShift = () => {
    const floatNum = parseFloat(openingFloat);
    if (isNaN(floatNum) || floatNum < 0) {
      setOpenShiftError('Please enter a valid non-negative opening float amount.');
      return;
    }
    openShiftMutation.mutate({
      openingFloat: floatNum,
      terminalName: terminalName.trim() || undefined,
      notes: shiftNotes.trim() || undefined,
    });
  };

  const handleRecordTxn = () => {
    const amt = parseFloat(txnAmount);
    if (isNaN(amt) || amt <= 0) {
      setTxnError('Please enter a valid positive amount.');
      return;
    }
    if (!txnDescription.trim()) {
      setTxnError('Description is required.');
      return;
    }
    if (!activeShift) {
      setTxnError('No open shift active.');
      return;
    }

    recordTxnMutation.mutate({
      shiftId: activeShift.id,
      type: txnType,
      amount: amt,
      description: txnDescription.trim(),
    });
  };

  if (isLoading) {
    return <LoadingState message="Loading cashier shifts & drawer state..." />;
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Cashier Operations" showBack />
        <ErrorState
          title="Cashier Error"
          message={(error as Error)?.message || 'Failed to load cashier data.'}
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  const transactions = activeShift?.transactions || [];

  const renderTransactionItem = ({ item }: { item: CashDrawerTransaction }) => {
    const isOutflow = ['CASH_DROP', 'DROP', 'PAID_OUT', 'REFUND'].includes(item.type);
    return (
      <View style={styles.txRow}>
        <View style={styles.txLeft}>
          <Text style={styles.txNotes}>{item.notes || 'Drawer Entry'}</Text>
          <View style={styles.txMeta}>
            <StatusBadge label={item.type} variant={isOutflow ? 'warning' : 'success'} />
            <DateDisplay dateString={item.createdAt} showTime style={styles.txDate} />
          </View>
        </View>
        <MoneyDisplay
          amount={item.amount}
          variant={isOutflow ? 'negative' : 'positive'}
          prefix={isOutflow ? '- ₹' : '+ ₹'}
          style={styles.txAmount}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Cashier Operations"
        subtitle="Shift Float, Cash Drops & Drawer Reconciliation"
        showBack
        rightAction={
          !activeShift && (
            <PermissionGate permission="CASHIER_MANAGE">
              <TouchableOpacity
                style={styles.openShiftBtn}
                onPress={() => setOpenShiftModalVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.openShiftBtnText}>+ Open Shift</Text>
              </TouchableOpacity>
            </PermissionGate>
          )
        }
      />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {activeShift ? (
          <>
            {/* Active Shift Overview */}
            <AppCard style={styles.activeShiftCard}>
              <View style={styles.shiftHeader}>
                <View>
                  <Text style={styles.shiftTitle}>Current Shift Active</Text>
                  <Text style={styles.shiftMeta}>
                    Terminal: {activeShift.terminalName || 'Main Register'}
                  </Text>
                </View>
                <StatusBadge label="OPEN" variant="success" />
              </View>

              <View style={styles.expectedCashBox}>
                <Text style={styles.expectedLabel}>Authoritative Expected Drawer Cash</Text>
                <MoneyDisplay amount={activeShift.expectedCash} style={styles.bigExpectedCash} />
              </View>

              <View style={styles.ledgerGrid}>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Opening Float</Text>
                  <MoneyDisplay amount={activeShift.openingFloat} style={styles.gridVal} />
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Folio Cash</Text>
                  <MoneyDisplay amount={activeShift.cashPayments} variant="positive" style={styles.gridVal} />
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Direct Sales</Text>
                  <MoneyDisplay amount={activeShift.cashSales} variant="positive" style={styles.gridVal} />
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Paid Outs</Text>
                  <MoneyDisplay amount={activeShift.paidOuts} variant="negative" style={styles.gridVal} />
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Cash Drops</Text>
                  <MoneyDisplay amount={activeShift.cashDrops} variant="negative" style={styles.gridVal} />
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Refunds</Text>
                  <MoneyDisplay amount={activeShift.refunds} variant="negative" style={styles.gridVal} />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.shiftActions}>
                <PermissionGate permission="CASHIER_MANAGE">
                  <AppButton
                    title="💰 Cash Drop / Paid-Out"
                    variant="secondary"
                    onPress={() => {
                      setTxnType('DROP');
                      setTxnDescription('Mid-day cash drop to hotel safe');
                      setTxnModalVisible(true);
                    }}
                    style={styles.actionBtn}
                  />
                </PermissionGate>

                <PermissionGate permission="CASHIER_MANAGE">
                  <AppButton
                    title="🔒 Close Shift & Count"
                    variant="primary"
                    onPress={() =>
                      router.push({
                        pathname: '/(app)/cashier/close-shift',
                        params: { shiftId: activeShift.id },
                      })
                    }
                    style={styles.actionBtn}
                  />
                </PermissionGate>
              </View>
            </AppCard>

            {/* Shift Transactions Ledger */}
            <Text style={styles.sectionTitle}>Shift Drawer Entries ({transactions.length})</Text>
            <AppCard style={styles.ledgerCard}>
              {transactions.length === 0 ? (
                <EmptyState
                  title="No Transactions"
                  description="No drawer movements logged on this shift yet."
                />
              ) : (
                <FlatList
                  data={transactions}
                  keyExtractor={(item) => item.id}
                  renderItem={renderTransactionItem}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={styles.txSeparator} />}
                />
              )}
            </AppCard>
          </>
        ) : (
          <EmptyState
            title="No Active Cashier Shift"
            description="Your cash drawer is currently closed. Open a shift with an initial float to start collecting payments."
            action={
              <PermissionGate permission="CASHIER_MANAGE">
                <AppButton
                  title="Open Cashier Shift"
                  variant="primary"
                  onPress={() => setOpenShiftModalVisible(true)}
                />
              </PermissionGate>
            }
          />
        )}

        {/* Shift History */}
        <Text style={styles.sectionTitle}>Recent Shift History</Text>
        {shifts.map((s) => (
          <AppCard key={s.id} style={styles.historyCard}>
            <View style={styles.historyTop}>
              <View>
                <Text style={styles.historyTerm}>{s.terminalName || 'Register Shift'}</Text>
                <DateDisplay dateString={s.openedAt} showTime style={styles.historyDate} />
              </View>
              <StatusBadge label={s.status} variant={s.status === 'OPEN' ? 'success' : 'default'} />
            </View>
            <View style={styles.historyRow}>
              <Text style={styles.historyLabel}>Expected:</Text>
              <MoneyDisplay amount={s.expectedCash} style={styles.historyVal} />
              {s.actualCash !== null && s.actualCash !== undefined && (
                <>
                  <Text style={styles.historyLabel}>Actual:</Text>
                  <MoneyDisplay amount={s.actualCash} style={styles.historyVal} />
                </>
              )}
              {s.variance !== null && s.variance !== undefined && (
                <>
                  <Text style={styles.historyLabel}>Variance:</Text>
                  <MoneyDisplay
                    amount={s.variance}
                    variant={Number(s.variance) === 0 ? 'positive' : 'negative'}
                    style={styles.historyVal}
                  />
                </>
              )}
            </View>
          </AppCard>
        ))}
      </ScrollView>

      {/* Open Shift Modal */}
      <Modal
        visible={openShiftModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setOpenShiftModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Open Cashier Shift</Text>
              <TouchableOpacity onPress={() => setOpenShiftModalVisible(false)} activeOpacity={0.7}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll}>
              {openShiftError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>⚠️ {openShiftError}</Text>
                </View>
              )}

              <AppInput
                label="Opening Cash Float (₹) *"
                placeholder="1000.00"
                value={openingFloat}
                onChangeText={setOpeningFloat}
                keyboardType="numeric"
              />

              <AppInput
                label="Terminal / Drawer Name"
                placeholder="e.g. Front Desk Register 1"
                value={terminalName}
                onChangeText={setTerminalName}
              />

              <AppInput
                label="Shift Notes"
                placeholder="e.g. Morning Shift"
                value={shiftNotes}
                onChangeText={setShiftNotes}
              />

              <View style={styles.modalActions}>
                <AppButton
                  title="Cancel"
                  variant="outline"
                  onPress={() => setOpenShiftModalVisible(false)}
                  style={styles.modalBtn}
                />
                <AppButton
                  title="Open Shift"
                  variant="primary"
                  loading={openShiftMutation.isPending}
                  onPress={handleOpenShift}
                  style={styles.modalBtn}
                />
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Cash Drop / Transaction Modal */}
      <Modal
        visible={txnModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setTxnModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Cash Drawer Movement</Text>
              <TouchableOpacity onPress={() => setTxnModalVisible(false)} activeOpacity={0.7}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll}>
              {txnError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>⚠️ {txnError}</Text>
                </View>
              )}

              <Text style={styles.modalLabel}>Movement Type</Text>
              <View style={styles.typeRow}>
                {(['DROP', 'PAID_OUT', 'SALE', 'REFUND'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, txnType === t && styles.typeChipActive]}
                    onPress={() => {
                      setTxnType(t);
                      if (t === 'DROP') setTxnDescription('Mid-day cash drop to hotel safe');
                      else if (t === 'PAID_OUT') setTxnDescription('Courier / petty cash disbursement');
                      else if (t === 'SALE') setTxnDescription('Counter merchandise cash sale');
                      else setTxnDescription('Cash refund to guest');
                    }}
                  >
                    <Text style={[styles.typeChipText, txnType === t && styles.typeChipTextActive]}>
                      {t === 'DROP' ? 'Cash Drop' : t === 'PAID_OUT' ? 'Paid Out' : t === 'SALE' ? 'Direct Sale' : 'Refund'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <AppInput
                label="Amount (₹) *"
                placeholder="0.00"
                value={txnAmount}
                onChangeText={setTxnAmount}
                keyboardType="numeric"
              />

              <AppInput
                label="Description / Reason *"
                value={txnDescription}
                onChangeText={setTxnDescription}
              />

              <View style={styles.modalActions}>
                <AppButton
                  title="Cancel"
                  variant="outline"
                  onPress={() => setTxnModalVisible(false)}
                  style={styles.modalBtn}
                />
                <AppButton
                  title="Record Entry"
                  variant="primary"
                  loading={recordTxnMutation.isPending}
                  onPress={handleRecordTxn}
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
  openShiftBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  openShiftBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
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
  activeShiftCard: {
    marginBottom: 16,
    padding: 18,
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  shiftTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  shiftMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  expectedCashBox: {
    backgroundColor: colors.surfaceLight,
    padding: 14,
    borderRadius: 12,
    marginVertical: 8,
    alignItems: 'center',
  },
  expectedLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  bigExpectedCash: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  ledgerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12,
  },
  gridItem: {
    flexBasis: '31%',
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
  },
  gridLabel: {
    color: colors.textDim,
    fontSize: 11,
    marginBottom: 2,
  },
  gridVal: {
    fontSize: 13,
  },
  shiftActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    height: 44,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 10,
  },
  ledgerCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: 16,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  txLeft: {
    flex: 1,
    paddingRight: 10,
  },
  txNotes: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  txMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  txDate: {
    fontSize: 11,
  },
  txAmount: {
    fontSize: 15,
  },
  txSeparator: {
    height: 1,
    backgroundColor: colors.surfaceBorder,
  },
  historyCard: {
    marginBottom: 10,
    padding: 14,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  historyTerm: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  historyDate: {
    fontSize: 11,
    marginTop: 2,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  historyLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  historyVal: {
    fontSize: 13,
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
  closeBtn: {
    color: colors.textMuted,
    fontSize: 20,
    fontWeight: '700',
    padding: 4,
  },
  formScroll: {
    padding: 20,
  },
  modalLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  typeChip: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: '#fff',
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
