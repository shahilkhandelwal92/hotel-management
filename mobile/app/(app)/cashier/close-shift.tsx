import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCashierShifts, closeCashierShiftApi, CloseShiftPayload } from '../../../src/api/cashier';
import { colors } from '../../../src/theme/colors';
import { AppHeader } from '../../../src/components/AppHeader';
import { AppCard } from '../../../src/components/AppCard';
import { AppButton } from '../../../src/components/AppButton';
import { AppInput } from '../../../src/components/AppInput';
import { MoneyDisplay } from '../../../src/components/MoneyDisplay';
import { LoadingState } from '../../../src/components/LoadingState';
import { ErrorState } from '../../../src/components/ErrorState';
import { ConfirmDialog } from '../../../src/components/ConfirmDialog';

export default function CloseShiftScreen() {
  const { shiftId } = useLocalSearchParams<{ shiftId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [actualCash, setActualCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('End of shift cash drawer reconciliation');
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: shifts = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['cashier-shifts'],
    queryFn: fetchCashierShifts,
  });

  const shift = shifts.find((s) => s.id === shiftId);

  const closeShiftMutation = useMutation({
    mutationFn: (payload: CloseShiftPayload) => closeCashierShiftApi(payload),
    onSuccess: (closedShift) => {
      queryClient.invalidateQueries({ queryKey: ['cashier-shifts'] });
      setConfirmModalVisible(false);

      const varianceNum = Number(closedShift.variance || 0);
      const msg = varianceNum === 0
        ? 'Cash drawer balanced perfectly at ₹0.00 variance. Shift closed.'
        : `Shift closed with variance of ₹${varianceNum.toFixed(2)}. Variance approval has been forwarded to Management.`;

      Alert.alert('Shift Closed', msg, [
        { text: 'OK', onPress: () => router.replace('/(app)/cashier') },
      ]);
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to close cashier shift on server.');
      setConfirmModalVisible(false);
    },
  });

  if (isLoading) {
    return <LoadingState message="Loading shift details..." />;
  }

  if (isError || !shift) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Close Shift" showBack />
        <ErrorState
          title="Shift Not Found"
          message={(error as Error)?.message || 'Active cashier shift could not be found.'}
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  const handleCloseSubmit = () => {
    const cashNum = parseFloat(actualCash);
    if (isNaN(cashNum) || cashNum < 0) {
      setActionError('Please enter a valid actual counted cash amount.');
      return;
    }
    setActionError(null);
    setConfirmModalVisible(true);
  };

  const executeClose = () => {
    closeShiftMutation.mutate({
      shiftId: shift.id,
      actualClosingCash: parseFloat(actualCash),
      closingNotes: closingNotes.trim() || undefined,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Reconcile & Close Shift"
        subtitle={`Terminal: ${shift.terminalName || 'Main Register'}`}
        showBack
      />

      <ScrollView contentContainerStyle={styles.container}>
        {actionError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {actionError}</Text>
          </View>
        )}

        {/* Expected Cash Invariant */}
        <AppCard style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Authoritative Expected Cash</Text>
          <MoneyDisplay amount={shift.expectedCash} style={styles.expectedBigText} />
          <Text style={styles.expectedSub}>
            Expected = Float (₹{Number(shift.openingFloat).toFixed(2)}) + Payments (₹{Number(shift.cashPayments).toFixed(2)}) + Sales (₹{Number(shift.cashSales).toFixed(2)}) - Drops/Paid-Outs (₹{(Number(shift.cashDrops) + Number(shift.paidOuts)).toFixed(2)})
          </Text>
        </AppCard>

        {/* Physical Drawer Blind Count */}
        <AppCard style={styles.formCard}>
          <Text style={styles.cardTitle}>Physical Cash Drawer Blind Count</Text>
          <AppInput
            label="Actual Counted Cash (₹) *"
            placeholder="0.00"
            value={actualCash}
            onChangeText={setActualCash}
            keyboardType="numeric"
          />

          <AppInput
            label="Closing / Handover Notes"
            placeholder="e.g. Handed over to Evening Cashier"
            value={closingNotes}
            onChangeText={setClosingNotes}
            multiline
            numberOfLines={3}
          />
        </AppCard>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <AppButton
            title="🔒 Finalize Drawer Count & Close Shift"
            variant="primary"
            loading={closeShiftMutation.isPending}
            disabled={closeShiftMutation.isPending || !actualCash}
            onPress={handleCloseSubmit}
          />
        </View>
      </ScrollView>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        visible={confirmModalVisible}
        title="Confirm Shift Close"
        message={`Are you sure you want to close this shift with ₹${actualCash} actual cash in drawer? This will lock the shift and log audit records.`}
        confirmText="Yes, Close Shift"
        variant="primary"
        loading={closeShiftMutation.isPending}
        onConfirm={executeClose}
        onCancel={() => setConfirmModalVisible(false)}
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
  summaryCard: {
    marginBottom: 16,
    padding: 20,
    alignItems: 'center',
  },
  cardTitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  expectedBigText: {
    fontSize: 32,
    fontWeight: '900',
  },
  expectedSub: {
    color: colors.textDim,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  formCard: {
    marginBottom: 20,
  },
  actionContainer: {
    marginTop: 8,
    marginBottom: 36,
  },
});
