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
import { fetchReservationById, cancelReservation } from '../../../src/api/reservations';
import { colors } from '../../../src/theme/colors';
import { AppHeader } from '../../../src/components/AppHeader';
import { AppCard } from '../../../src/components/AppCard';
import { AppButton } from '../../../src/components/AppButton';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { RoomStatusBadge } from '../../../src/components/RoomStatusBadge';
import { MoneyDisplay } from '../../../src/components/MoneyDisplay';
import { DateDisplay } from '../../../src/components/DateDisplay';
import { LoadingState } from '../../../src/components/LoadingState';
import { ErrorState } from '../../../src/components/ErrorState';
import { ConfirmDialog } from '../../../src/components/ConfirmDialog';
import { PermissionGate } from '../../../src/components/PermissionGate';

export default function ReservationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: reservation,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['reservation-detail', id],
    queryFn: () => fetchReservationById(id),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelReservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['reservation-detail', id] });
      setCancelModalVisible(false);
      Alert.alert('Reservation Cancelled', 'The reservation has been cancelled and room blocks released.');
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to cancel reservation.');
    },
  });

  if (isLoading) {
    return <LoadingState message="Loading reservation details..." />;
  }

  if (isError || !reservation) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Reservation Details" showBack />
        <ErrorState
          title="Reservation Not Found"
          message={(error as Error)?.message || 'Unable to find booking record.'}
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  const getStatusVariant = (st: string) => {
    switch (st) {
      case 'Confirmed':
        return 'info';
      case 'CheckedIn':
        return 'success';
      case 'CheckedOut':
        return 'default';
      case 'Cancelled':
        return 'danger';
      default:
        return 'warning';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={`Booking #${reservation.bookingRef}`}
        subtitle={reservation.guestName}
        showBack
      />

      <ScrollView contentContainerStyle={styles.container}>
        {actionError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {actionError}</Text>
          </View>
        )}

        {/* Top Status Card */}
        <AppCard style={styles.summaryCard}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.guestName}>{reservation.guestName}</Text>
              <Text style={styles.phoneText}>📞 {reservation.guestPhone}</Text>
              {reservation.guestEmail && (
                <Text style={styles.emailText}>✉️ {reservation.guestEmail}</Text>
              )}
            </View>
            <StatusBadge
              label={reservation.status}
              variant={getStatusVariant(reservation.status)}
            />
          </View>
        </AppCard>

        {/* Room & Stay Details */}
        <Text style={styles.sectionTitle}>Stay & Room Information</Text>
        <AppCard style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Assigned Room:</Text>
            {reservation.room ? (
              <View style={styles.roomTag}>
                <Text style={styles.roomNumber}>Room {reservation.room.number}</Text>
                <RoomStatusBadge status={reservation.room.status} />
              </View>
            ) : (
              <Text style={styles.unassigned}>Unassigned</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Check-In Date:</Text>
            <DateDisplay dateString={reservation.checkIn} style={styles.infoValue} />
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Check-Out Date:</Text>
            <DateDisplay dateString={reservation.checkOut} style={styles.infoValue} />
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Occupancy:</Text>
            <Text style={styles.infoValue}>
              {reservation.adults} Adults, {reservation.children} Children
            </Text>
          </View>

          {reservation.ratePlan && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Rate Plan:</Text>
              <Text style={styles.infoValue}>{reservation.ratePlan}</Text>
            </View>
          )}

          {reservation.specialRequests && (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Special Requests:</Text>
              <Text style={styles.notesText}>{reservation.specialRequests}</Text>
            </View>
          )}
        </AppCard>

        {/* Authoritative Financial Overview */}
        <Text style={styles.sectionTitle}>Authoritative Financial Summary</Text>
        <AppCard style={styles.card}>
          <View style={styles.financialRow}>
            <Text style={styles.finLabel}>Total Booking Tariff:</Text>
            <MoneyDisplay amount={reservation.totalAmount} style={styles.finValue} />
          </View>

          <View style={styles.financialRow}>
            <Text style={styles.finLabel}>Advance Deposit Collected:</Text>
            <MoneyDisplay
              amount={reservation.advanceDeposit}
              variant="positive"
              style={styles.finValue}
            />
          </View>

          <View style={[styles.financialRow, styles.balanceRow]}>
            <Text style={styles.balanceLabel}>Outstanding Balance Due:</Text>
            <MoneyDisplay
              amount={reservation.balanceDue}
              variant={Number(reservation.balanceDue) > 0 ? 'negative' : 'positive'}
              style={styles.balanceValue}
            />
          </View>
        </AppCard>

        {/* Operational Actions */}
        <View style={styles.actionContainer}>
          {/* Confirmed -> Check-in / Cancel */}
          {reservation.status === 'Confirmed' && (
            <>
              <PermissionGate permission="RESERVATION_CHECKIN">
                <AppButton
                  title="🛎️ Proceed to Guest Check-In"
                  variant="primary"
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/reservations/check-in',
                      params: { id: reservation.id },
                    })
                  }
                />
              </PermissionGate>

              <PermissionGate permission="RESERVATION_CANCEL">
                <AppButton
                  title="Cancel Booking"
                  variant="outline"
                  onPress={() => setCancelModalVisible(true)}
                />
              </PermissionGate>
            </>
          )}

          {/* CheckedIn -> Room Move / Folio */}
          {reservation.status === 'CheckedIn' && (
            <>
              <PermissionGate permission="FOLIO_VIEW">
                <AppButton
                  title="💳 View & Manage Guest Folio"
                  variant="primary"
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/folio',
                      params: { reservationId: reservation.id },
                    })
                  }
                />
              </PermissionGate>

              <PermissionGate permission="RESERVATION_UPDATE">
                <AppButton
                  title="🔄 Mid-Stay Room Move"
                  variant="secondary"
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/reservations/room-move',
                      params: { id: reservation.id },
                    })
                  }
                />
              </PermissionGate>
            </>
          )}

          {/* CheckedOut -> View Folio */}
          {(reservation.status === 'CheckedOut' || reservation.status === 'Cancelled') && (
            <PermissionGate permission="FOLIO_VIEW">
              <AppButton
                title="📄 View Historical Folio & Invoices"
                variant="secondary"
                onPress={() =>
                  router.push({
                    pathname: '/(app)/folio',
                    params: { reservationId: reservation.id },
                  })
                }
              />
            </PermissionGate>
          )}
        </View>
      </ScrollView>

      {/* Cancellation Confirmation Dialog */}
      <ConfirmDialog
        visible={cancelModalVisible}
        title="Cancel Reservation?"
        message={`Are you sure you want to cancel booking #${reservation.bookingRef} for ${reservation.guestName}? All allocated room blocks will be immediately released.`}
        confirmText="Yes, Cancel Booking"
        variant="danger"
        loading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => setCancelModalVisible(false)}
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
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  guestName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  phoneText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  emailText: {
    color: colors.textDim,
    fontSize: 13,
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  card: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  infoValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  roomTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomNumber: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  unassigned: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '600',
  },
  notesBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  notesLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  notesText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  finLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  finValue: {
    fontSize: 15,
  },
  balanceRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  balanceLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  balanceValue: {
    fontSize: 17,
  },
  actionContainer: {
    gap: 12,
    marginTop: 10,
    marginBottom: 24,
  },
});
