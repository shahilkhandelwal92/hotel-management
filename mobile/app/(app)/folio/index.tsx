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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFoliosByReservation,
  postFolioTransaction,
  closeFolio,
  fetchSplitFolioSummary,
  transferSplitFolioCharge,
  PostTransactionPayload,
} from '../../../src/api/folio';
import { checkOutReservation } from '../../../src/api/reservations';
import { FolioItem, FolioTransactionItem, FolioWindowItem } from '../../../src/api/types';
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
import { ConfirmDialog } from '../../../src/components/ConfirmDialog';
import { PermissionGate } from '../../../src/components/PermissionGate';

export default function GuestFolioScreen() {
  const { reservationId } = useLocalSearchParams<{ reservationId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeWindowIndex, setActiveWindowIndex] = useState(1);
  const [postTxModalVisible, setPostTxModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [checkoutConfirmVisible, setCheckoutConfirmVisible] = useState(false);

  // Post Tx Form State
  const [txType, setTxType] = useState<'Charge' | 'Payment' | 'Refund' | 'Adjustment'>('Payment');
  const [txDescription, setTxDescription] = useState('Front Desk Cash/Card Settlement');
  const [txAmount, setTxAmount] = useState('');
  const [txError, setTxError] = useState<string | null>(null);

  // Split Transfer Form State
  const [transferSourceWin, setTransferSourceWin] = useState('');
  const [transferTargetWin, setTransferTargetWin] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferReason, setTransferReason] = useState('Routing to corporate window');
  const [transferError, setTransferError] = useState<string | null>(null);

  // Fetch Folios
  const {
    data: folios = [],
    isLoading: isFoliosLoading,
    isError: isFoliosError,
    error: foliosError,
    refetch: refetchFolios,
  } = useQuery<FolioItem[]>({
    queryKey: ['folios', reservationId],
    queryFn: () => fetchFoliosByReservation(reservationId),
  });

  const activeFolio = folios[0];
  const folioId = activeFolio?.id;

  // Fetch Split Folio Windows Summary
  const { data: splitSummary } = useQuery({
    queryKey: ['folio-split', folioId],
    queryFn: () => fetchSplitFolioSummary(folioId!),
    enabled: !!folioId,
  });

  const windows: FolioWindowItem[] = splitSummary?.windows || [
    { id: 'win_1', folioId: folioId || '', windowNumber: 1, name: 'Room & Tax', payerType: 'Guest', balance: activeFolio?.balance || 0 },
    { id: 'win_2', folioId: folioId || '', windowNumber: 2, name: 'Incidentals', payerType: 'Guest', balance: 0 },
    { id: 'win_3', folioId: folioId || '', windowNumber: 3, name: 'Corporate/Direct', payerType: 'Company', balance: 0 },
    { id: 'win_4', folioId: folioId || '', windowNumber: 4, name: 'Banquets/F&B', payerType: 'Guest', balance: 0 },
  ];

  // Post Transaction Mutation
  const postTxMutation = useMutation({
    mutationFn: (payload: PostTransactionPayload) => postFolioTransaction(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folios'] });
      queryClient.invalidateQueries({ queryKey: ['folio-split'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['reservation-detail', reservationId] });
      setPostTxModalVisible(false);
      setTxAmount('');
      setTxError(null);
    },
    onError: (err: any) => {
      setTxError(err.message || 'Failed to post transaction.');
    },
  });

  // Transfer Split Charge Mutation
  const transferChargeMutation = useMutation({
    mutationFn: (payload: any) => transferSplitFolioCharge(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folios'] });
      queryClient.invalidateQueries({ queryKey: ['folio-split'] });
      setTransferModalVisible(false);
      setTransferAmount('');
      setTransferError(null);
      Alert.alert('Transfer Successful', 'Charge transferred between folio windows.');
    },
    onError: (err: any) => {
      setTransferError(err.message || 'Failed to transfer charge between windows.');
    },
  });

  // Checkout Mutation
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      await checkOutReservation(reservationId);
      if (folioId && Math.abs(Number(activeFolio?.balance)) < 0.01) {
        await closeFolio(folioId).catch(() => {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['reservation-detail', reservationId] });
      queryClient.invalidateQueries({ queryKey: ['folios'] });
      queryClient.invalidateQueries({ queryKey: ['rooms-available'] });
      queryClient.invalidateQueries({ queryKey: ['housekeeping-tasks'] });
      setCheckoutConfirmVisible(false);

      Alert.alert('Checkout Complete', 'Guest has checked out successfully. Room is scheduled for cleaning.', [
        { text: 'Back to Front Desk', onPress: () => router.replace('/(app)/reservations') },
      ]);
    },
    onError: (err: any) => {
      Alert.alert('Checkout Failed', err.message || 'Unable to check out guest.');
    },
  });

  const handlePostTxSubmit = () => {
    if (!txAmount || isNaN(parseFloat(txAmount)) || parseFloat(txAmount) <= 0) {
      setTxError('Please enter a valid non-zero amount.');
      return;
    }
    if (!txDescription.trim()) {
      setTxError('Transaction description is required.');
      return;
    }
    if (!folioId) {
      setTxError('No active folio found.');
      return;
    }

    postTxMutation.mutate({
      folioId,
      type: txType,
      description: txDescription.trim(),
      amount: parseFloat(txAmount),
    });
  };

  const handleTransferSubmit = () => {
    if (!transferAmount || isNaN(parseFloat(transferAmount)) || parseFloat(transferAmount) <= 0) {
      setTransferError('Please enter a valid transfer amount.');
      return;
    }
    if (!transferSourceWin || !transferTargetWin) {
      setTransferError('Please select both source and target windows.');
      return;
    }
    if (transferSourceWin === transferTargetWin) {
      setTransferError('Source and target windows must be different.');
      return;
    }

    transferChargeMutation.mutate({
      folioId,
      sourceWindowId: transferSourceWin,
      targetWindowId: transferTargetWin,
      amount: parseFloat(transferAmount),
      reason: transferReason,
    });
  };

  if (isFoliosLoading) {
    return <LoadingState message="Loading guest folio & ledger..." />;
  }

  if (isFoliosError || !activeFolio) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Guest Folio" showBack />
        <ErrorState
          title="Folio Not Available"
          message={(foliosError as Error)?.message || 'Folio ledger could not be retrieved.'}
          onRetry={refetchFolios}
        />
      </SafeAreaView>
    );
  }

  const transactions = activeFolio.transactions || [];
  const currentBalance = Number(activeFolio.balance);
  const isZeroBalanced = Math.abs(currentBalance) < 0.01;

  const renderTransactionItem = ({ item }: { item: FolioTransactionItem }) => {
    const isPaymentOrCredit = item.type === 'Payment' || Number(item.amount) < 0;

    return (
      <View style={styles.txRow}>
        <View style={styles.txLeft}>
          <Text style={styles.txDesc}>{item.description}</Text>
          <View style={styles.txMeta}>
            <StatusBadge
              label={item.type}
              variant={item.type === 'Payment' ? 'success' : item.type === 'Charge' ? 'danger' : 'info'}
            />
            <DateDisplay dateString={item.postedAt} showTime style={styles.txDate} />
          </View>
        </View>
        <MoneyDisplay
          amount={Math.abs(Number(item.amount))}
          variant={isPaymentOrCredit ? 'positive' : 'negative'}
          prefix={isPaymentOrCredit ? '- ₹' : '+ ₹'}
          style={styles.txAmount}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Guest Folio & Billing"
        subtitle={`Booking #${activeFolio.reservation?.bookingRef || ''} — ${activeFolio.reservation?.guestName || 'Guest'}`}
        showBack
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Folio Balance Overview Card */}
        <AppCard style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <Text style={styles.balanceTitle}>Closing Folio Balance</Text>
            <StatusBadge
              label={activeFolio.status}
              variant={activeFolio.status === 'Open' ? 'warning' : 'success'}
            />
          </View>
          <MoneyDisplay
            amount={currentBalance}
            variant={isZeroBalanced ? 'positive' : 'negative'}
            style={styles.bigBalanceText}
          />
          <Text style={styles.balanceStatusSub}>
            {isZeroBalanced
              ? '✓ Fully Settled — Ready for Checkout'
              : `⚠️ Outstanding Balance: Collect ₹${Math.abs(currentBalance).toFixed(2)} to balance folio.`}
          </Text>
        </AppCard>

        {/* Split Folio Windows 1–4 */}
        <Text style={styles.sectionTitle}>Split Folio Windows (1–4)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.windowScroll}>
          {windows.map((win) => {
            const isSelected = activeWindowIndex === win.windowNumber;
            return (
              <TouchableOpacity
                key={win.id || win.windowNumber}
                style={[styles.windowTab, isSelected && styles.windowTabActive]}
                onPress={() => setActiveWindowIndex(win.windowNumber)}
                activeOpacity={0.7}
              >
                <Text style={[styles.windowTabNum, isSelected && styles.windowTabNumActive]}>
                  Window {win.windowNumber}
                </Text>
                <Text style={styles.windowTabName} numberOfLines={1}>
                  {win.name}
                </Text>
                <MoneyDisplay
                  amount={win.balance}
                  style={styles.windowTabBal}
                  variant={Number(win.balance) === 0 ? 'default' : 'highlight'}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Action Controls for Posting Charges / Payments / Splits */}
        <View style={styles.btnRow}>
          <PermissionGate permission="FOLIO_ADJUST">
            <AppButton
              title="+ Post Charge / Payment"
              variant="primary"
              onPress={() => setPostTxModalVisible(true)}
              style={styles.controlBtn}
            />
          </PermissionGate>

          <PermissionGate permission="FOLIO_UPDATE">
            <AppButton
              title="⇄ Transfer Window"
              variant="outline"
              onPress={() => {
                setTransferSourceWin(windows[0]?.id || '');
                setTransferTargetWin(windows[1]?.id || '');
                setTransferModalVisible(true);
              }}
              style={styles.controlBtn}
            />
          </PermissionGate>
        </View>

        {/* Transactions Ledger */}
        <Text style={styles.sectionTitle}>Posted Transactions ({transactions.length})</Text>
        <AppCard style={styles.ledgerCard}>
          {transactions.length === 0 ? (
            <EmptyState
              title="No Transactions"
              description="No charges or payments posted to this folio yet."
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

        {/* Final Checkout Button */}
        <View style={styles.checkoutSection}>
          <PermissionGate permission="RESERVATION_CHECKOUT">
            <AppButton
              title="✓ Finalize Checkout & Close Folio"
              variant={isZeroBalanced ? 'success' : 'secondary'}
              loading={checkoutMutation.isPending}
              disabled={checkoutMutation.isPending || activeFolio.status === 'Closed'}
              onPress={() => setCheckoutConfirmVisible(true)}
            />
          </PermissionGate>
        </View>
      </ScrollView>

      {/* Post Transaction Modal */}
      <Modal
        visible={postTxModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPostTxModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Post Transaction to Folio</Text>
              <TouchableOpacity onPress={() => setPostTxModalVisible(false)} activeOpacity={0.7}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll}>
              {txError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>⚠️ {txError}</Text>
                </View>
              )}

              <Text style={styles.modalLabel}>Transaction Type</Text>
              <View style={styles.typeRow}>
                {(['Payment', 'Charge', 'Adjustment', 'Refund'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, txType === t && styles.typeChipActive]}
                    onPress={() => {
                      setTxType(t);
                      if (t === 'Payment') setTxDescription('Cash / UPI Settlement');
                      else if (t === 'Charge') setTxDescription('Restaurant / Minibar Charge');
                      else if (t === 'Adjustment') setTxDescription('Billing Adjustment');
                      else setTxDescription('Deposit Refund');
                    }}
                  >
                    <Text style={[styles.typeChipText, txType === t && styles.typeChipTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <AppInput
                label="Description *"
                value={txDescription}
                onChangeText={setTxDescription}
              />

              <AppInput
                label="Amount (₹) *"
                placeholder="0.00"
                value={txAmount}
                onChangeText={setTxAmount}
                keyboardType="numeric"
              />

              <View style={styles.modalActions}>
                <AppButton
                  title="Cancel"
                  variant="outline"
                  onPress={() => setPostTxModalVisible(false)}
                  style={styles.modalButton}
                />
                <AppButton
                  title="Post Entry"
                  variant="primary"
                  loading={postTxMutation.isPending}
                  onPress={handlePostTxSubmit}
                  style={styles.modalButton}
                />
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Transfer Split Folio Charge Modal */}
      <Modal
        visible={transferModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setTransferModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transfer Between Folio Windows</Text>
              <TouchableOpacity onPress={() => setTransferModalVisible(false)} activeOpacity={0.7}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll}>
              {transferError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>⚠️ {transferError}</Text>
                </View>
              )}

              <Text style={styles.modalLabel}>Source Window</Text>
              <View style={styles.windowSelectRow}>
                {windows.map((w) => (
                  <TouchableOpacity
                    key={w.id || w.windowNumber}
                    style={[styles.winSelectChip, transferSourceWin === w.id && styles.winSelectChipActive]}
                    onPress={() => setTransferSourceWin(w.id)}
                  >
                    <Text style={[styles.winSelectText, transferSourceWin === w.id && styles.winSelectTextActive]}>
                      Win {w.windowNumber}: {w.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Target Window</Text>
              <View style={styles.windowSelectRow}>
                {windows.map((w) => (
                  <TouchableOpacity
                    key={w.id || w.windowNumber}
                    style={[styles.winSelectChip, transferTargetWin === w.id && styles.winSelectChipActive]}
                    onPress={() => setTransferTargetWin(w.id)}
                  >
                    <Text style={[styles.winSelectText, transferTargetWin === w.id && styles.winSelectTextActive]}>
                      Win {w.windowNumber}: {w.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <AppInput
                label="Transfer Amount (₹) *"
                placeholder="0.00"
                value={transferAmount}
                onChangeText={setTransferAmount}
                keyboardType="numeric"
              />

              <AppInput
                label="Reason / Reference"
                value={transferReason}
                onChangeText={setTransferReason}
              />

              <View style={styles.modalActions}>
                <AppButton
                  title="Cancel"
                  variant="outline"
                  onPress={() => setTransferModalVisible(false)}
                  style={styles.modalButton}
                />
                <AppButton
                  title="Transfer Charge"
                  variant="primary"
                  loading={transferChargeMutation.isPending}
                  onPress={handleTransferSubmit}
                  style={styles.modalButton}
                />
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Checkout Confirmation Dialog */}
      <ConfirmDialog
        visible={checkoutConfirmVisible}
        title="Check-Out Guest & Close Folio"
        message={
          isZeroBalanced
            ? `Guest folio is balanced at ₹0.00. Are you sure you want to finalize checkout for ${activeFolio.reservation?.guestName}? Room will be marked Dirty and dispatched for cleaning.`
            : `Warning: This folio has an unsettled balance of ₹${currentBalance.toFixed(2)}. Are you sure you want to proceed with departure checkout?`
        }
        confirmText="Confirm Check-Out"
        variant={isZeroBalanced ? 'primary' : 'danger'}
        loading={checkoutMutation.isPending}
        onConfirm={() => checkoutMutation.mutate()}
        onCancel={() => setCheckoutConfirmVisible(false)}
      />
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
  balanceCard: {
    marginBottom: 16,
    padding: 20,
  },
  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceTitle: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  bigBalanceText: {
    fontSize: 32,
    fontWeight: '900',
    marginVertical: 4,
  },
  balanceStatusSub: {
    color: colors.textDim,
    fontSize: 13,
    marginTop: 6,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 10,
  },
  windowScroll: {
    marginBottom: 16,
  },
  windowTab: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    padding: 12,
    width: 140,
    marginRight: 10,
  },
  windowTabActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  windowTabNum: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  windowTabNumActive: {
    color: colors.primary,
  },
  windowTabName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  windowTabBal: {
    fontSize: 14,
    marginTop: 6,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  controlBtn: {
    flex: 1,
    height: 44,
  },
  ledgerCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: 20,
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
  txDesc: {
    color: colors.text,
    fontSize: 15,
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
    fontSize: 16,
  },
  txSeparator: {
    height: 1,
    backgroundColor: colors.surfaceBorder,
  },
  checkoutSection: {
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
  windowSelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  winSelectChip: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  winSelectChipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  winSelectText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  winSelectTextActive: {
    color: colors.primary,
    fontWeight: '700',
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
