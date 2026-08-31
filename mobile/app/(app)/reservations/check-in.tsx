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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchReservationById, checkInReservation, updateReservationRoom } from '../../../src/api/reservations';
import { fetchRooms } from '../../../src/api/rooms';
import { colors } from '../../../src/theme/colors';
import { AppHeader } from '../../../src/components/AppHeader';
import { AppCard } from '../../../src/components/AppCard';
import { AppButton } from '../../../src/components/AppButton';
import { RoomStatusBadge } from '../../../src/components/RoomStatusBadge';
import { MoneyDisplay } from '../../../src/components/MoneyDisplay';
import { DateDisplay } from '../../../src/components/DateDisplay';
import { LoadingState } from '../../../src/components/LoadingState';
import { ErrorState } from '../../../src/components/ErrorState';

export default function CheckInScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: reservation,
    isLoading: isResLoading,
    isError: isResError,
    error: resError,
    refetch: refetchRes,
  } = useQuery({
    queryKey: ['reservation-detail', id],
    queryFn: () => fetchReservationById(id),
  });

  const { data: rooms = [], isLoading: isRoomsLoading } = useQuery({
    queryKey: ['rooms-available'],
    queryFn: fetchRooms,
  });

  // Assign or update room mutation
  const assignRoomMutation = useMutation({
    mutationFn: (roomId: string) => updateReservationRoom(id, roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservation-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['rooms-available'] });
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to assign room.');
    },
  });

  // Check-in execution mutation
  const checkInMutation = useMutation({
    mutationFn: () => checkInReservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['reservation-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['rooms-available'] });
      queryClient.invalidateQueries({ queryKey: ['housekeeping-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['folios'] });

      Alert.alert(
        'Check-In Successful',
        `Guest ${reservation?.guestName} is now checked in to Room ${reservation?.room?.number || ''}. Room marked Occupied.`,
        [
          {
            text: 'Open Folio',
            onPress: () =>
              router.replace({
                pathname: '/(app)/folio',
                params: { reservationId: id },
              }),
          },
          {
            text: 'View Booking',
            onPress: () => router.back(),
          },
        ]
      );
    },
    onError: (err: any) => {
      setActionError(err.message || 'Check-in failed on server.');
      setIsSubmitting(false);
    },
  });

  if (isResLoading || isRoomsLoading) {
    return <LoadingState message="Verifying check-in eligibility..." />;
  }

  if (isResError || !reservation) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Check-In" showBack />
        <ErrorState
          title="Reservation Error"
          message={(resError as Error)?.message || 'Could not fetch reservation.'}
          onRetry={refetchRes}
        />
      </SafeAreaView>
    );
  }

  const assignedRoom = reservation.room;
  const availableVacantRooms = rooms.filter(
    (r) => (r.status === 'Vacant' || r.status === 'Clean') && r.id !== assignedRoom?.id
  );

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    assignRoomMutation.mutate(roomId);
  };

  const handleCheckInSubmit = () => {
    if (!reservation.roomId && !selectedRoomId) {
      setActionError('A physical room must be assigned before check-in.');
      return;
    }
    setActionError(null);
    setIsSubmitting(true);
    checkInMutation.mutate();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Guest Check-In"
        subtitle={`Booking #${reservation.bookingRef}`}
        showBack
      />

      <ScrollView contentContainerStyle={styles.container}>
        {actionError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {actionError}</Text>
          </View>
        )}

        {/* 1. Guest & Identification Verification */}
        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>1. Guest Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.val}>{reservation.guestName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Contact Phone:</Text>
            <Text style={styles.val}>{reservation.guestPhone}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Stay Duration:</Text>
            <View style={styles.dateRow}>
              <DateDisplay dateString={reservation.checkIn} style={styles.dateVal} />
              <Text style={styles.dateSep}>to</Text>
              <DateDisplay dateString={reservation.checkOut} style={styles.dateVal} />
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Occupancy:</Text>
            <Text style={styles.val}>
              {reservation.adults} Adults, {reservation.children} Children
            </Text>
          </View>
        </AppCard>

        {/* 2. Room Assignment Verification */}
        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>2. Room Assignment</Text>
          {assignedRoom ? (
            <View style={styles.assignedBox}>
              <View>
                <Text style={styles.assignedRoomNum}>Room {assignedRoom.number}</Text>
                <Text style={styles.assignedRoomType}>
                  {assignedRoom.type} • Floor {assignedRoom.floor}
                </Text>
              </View>
              <RoomStatusBadge status={assignedRoom.status} />
            </View>
          ) : (
            <View style={styles.unassignedWarning}>
              <Text style={styles.unassignedText}>⚠️ No room currently assigned.</Text>
            </View>
          )}

          <Text style={styles.changeRoomLabel}>
            {assignedRoom ? 'Change Assigned Room:' : 'Select Room to Assign:'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roomListScroll}>
            {availableVacantRooms.map((room) => (
              <TouchableOpacity
                key={room.id}
                style={[
                  styles.roomOption,
                  (selectedRoomId === room.id || assignedRoom?.id === room.id) && styles.roomOptionActive,
                ]}
                onPress={() => handleRoomSelect(room.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.roomOptionText,
                    (selectedRoomId === room.id || assignedRoom?.id === room.id) && styles.roomOptionTextActive,
                  ]}
                >
                  Room {room.number}
                </Text>
                <Text style={styles.roomOptionSub}>{room.type}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </AppCard>

        {/* 3. Deposit & Balance Summary */}
        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>3. Financial Status</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Total Booking Amount:</Text>
            <MoneyDisplay amount={reservation.totalAmount} style={styles.val} />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Advance Deposit Collected:</Text>
            <MoneyDisplay
              amount={reservation.advanceDeposit}
              variant="positive"
              style={styles.val}
            />
          </View>
          <View style={[styles.row, styles.balanceRow]}>
            <Text style={styles.balanceLabel}>Balance Due at Check-In:</Text>
            <MoneyDisplay
              amount={reservation.balanceDue}
              variant={Number(reservation.balanceDue) > 0 ? 'negative' : 'positive'}
              style={styles.balanceVal}
            />
          </View>
        </AppCard>

        {/* Submit Action */}
        <View style={styles.actionSection}>
          <AppButton
            title="✓ Confirm Check-In & Issue Key"
            variant="primary"
            loading={isSubmitting || checkInMutation.isPending}
            disabled={isSubmitting || checkInMutation.isPending || (!reservation.roomId && !selectedRoomId)}
            onPress={handleCheckInSubmit}
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
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
  },
  val: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateVal: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  dateSep: {
    color: colors.textDim,
    fontSize: 12,
  },
  assignedBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  assignedRoomNum: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  assignedRoomType: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  unassignedWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  unassignedText: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '600',
  },
  changeRoomLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  roomListScroll: {
    flexDirection: 'row',
  },
  roomOption: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
    alignItems: 'center',
  },
  roomOptionActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  roomOptionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  roomOptionTextActive: {
    color: colors.primary,
  },
  roomOptionSub: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 2,
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
  balanceVal: {
    fontSize: 16,
  },
  actionSection: {
    marginTop: 8,
    marginBottom: 32,
  },
});
