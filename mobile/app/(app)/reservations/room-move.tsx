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
import { fetchReservationById, executeRoomMoveApi } from '../../../src/api/reservations';
import { fetchRooms } from '../../../src/api/rooms';
import { colors } from '../../../src/theme/colors';
import { AppHeader } from '../../../src/components/AppHeader';
import { AppCard } from '../../../src/components/AppCard';
import { AppButton } from '../../../src/components/AppButton';
import { AppInput } from '../../../src/components/AppInput';
import { RoomStatusBadge } from '../../../src/components/RoomStatusBadge';
import { LoadingState } from '../../../src/components/LoadingState';
import { ErrorState } from '../../../src/components/ErrorState';

export default function RoomMoveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedTargetRoomId, setSelectedTargetRoomId] = useState<string | null>(null);
  const [reason, setReason] = useState('Guest requested quiet room / room upgrade');
  const [actionError, setActionError] = useState<string | null>(null);

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

  const { data: rooms = [], isLoading: isRoomsLoading, refetch: refetchRooms } = useQuery({
    queryKey: ['rooms-available'],
    queryFn: fetchRooms,
  });

  const roomMoveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTargetRoomId) {
        throw new Error('Please select a target room.');
      }
      return await executeRoomMoveApi(id, selectedTargetRoomId, reason);
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['reservation-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['rooms-available'] });
      queryClient.invalidateQueries({ queryKey: ['housekeeping-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['folios'] });

      Alert.alert(
        'Room Move Completed',
        `Guest ${reservation?.guestName} moved to Room ${result.newRoom?.number || ''}. Previous room marked Dirty for turnover.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError: (err: any) => {
      if (err.status === 409) {
        setActionError('Target room changed availability while booking. Refreshing room list...');
        refetchRooms();
      } else {
        setActionError(err.message || 'Room move operation failed on server.');
      }
    },
  });

  if (isResLoading || isRoomsLoading) {
    return <LoadingState message="Loading room move parameters..." />;
  }

  if (isResError || !reservation) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Room Move" showBack />
        <ErrorState
          title="Reservation Error"
          message={(resError as Error)?.message || 'Could not fetch reservation.'}
          onRetry={refetchRes}
        />
      </SafeAreaView>
    );
  }

  const currentRoom = reservation.room;
  const eligibleTargetRooms = rooms.filter(
    (r) => (r.status === 'Vacant' || r.status === 'Clean') && r.id !== currentRoom?.id
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Mid-Stay Room Move"
        subtitle={`Booking #${reservation.bookingRef} — ${reservation.guestName}`}
        showBack
      />

      <ScrollView contentContainerStyle={styles.container}>
        {actionError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {actionError}</Text>
          </View>
        )}

        {/* Current Room Information */}
        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>Current Occupied Room</Text>
          <View style={styles.currentRoomBox}>
            <View>
              <Text style={styles.roomBigText}>
                {currentRoom ? `Room ${currentRoom.number}` : 'Unassigned'}
              </Text>
              <Text style={styles.roomSubText}>
                {currentRoom ? `${currentRoom.type} • Floor ${currentRoom.floor}` : ''}
              </Text>
            </View>
            {currentRoom && <RoomStatusBadge status={currentRoom.status} />}
          </View>
        </AppCard>

        {/* Target Room Selection */}
        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>Select New Target Room (Vacant / Clean)</Text>
          {eligibleTargetRooms.length === 0 ? (
            <Text style={styles.noRoomsText}>
              No vacant or clean rooms currently available for room move.
            </Text>
          ) : (
            <View style={styles.roomGrid}>
              {eligibleTargetRooms.map((room) => {
                const isSelected = selectedTargetRoomId === room.id;
                return (
                  <TouchableOpacity
                    key={room.id}
                    style={[styles.roomGridItem, isSelected && styles.roomGridItemSelected]}
                    onPress={() => setSelectedTargetRoomId(room.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.roomNum, isSelected && styles.roomNumSelected]}>
                      Room {room.number}
                    </Text>
                    <Text style={styles.roomType}>{room.type}</Text>
                    <Text style={styles.roomFloor}>Floor {room.floor}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </AppCard>

        {/* Reason for Room Move */}
        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>Reason for Move (Audit Logged)</Text>
          <AppInput
            placeholder="e.g. Plumbing maintenance, guest request, complimentary upgrade"
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
          />
        </AppCard>

        {/* Move Submission */}
        <View style={styles.actionSection}>
          <AppButton
            title="🔄 Execute Atomic Room Move"
            variant="primary"
            loading={roomMoveMutation.isPending}
            disabled={roomMoveMutation.isPending || !selectedTargetRoomId}
            onPress={() => roomMoveMutation.mutate()}
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
  currentRoomBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    padding: 14,
    borderRadius: 12,
  },
  roomBigText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  roomSubText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  noRoomsText: {
    color: colors.textDim,
    fontSize: 14,
    paddingVertical: 12,
  },
  roomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  roomGridItem: {
    flexBasis: '48%',
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  roomGridItemSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  roomNum: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  roomNumSelected: {
    color: colors.primary,
  },
  roomType: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  roomFloor: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 2,
  },
  actionSection: {
    marginTop: 8,
    marginBottom: 32,
  },
});
