import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../src/auth/AuthContext';
import { fetchReservations, createReservation, CreateReservationPayload } from '../../../src/api/reservations';
import { fetchRooms } from '../../../src/api/rooms';
import { Reservation } from '../../../src/api/types';
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

export default function ReservationsListScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [walkInModalVisible, setWalkInModalVisible] = useState(false);

  // Walk-in form state
  const [walkInGuestName, setWalkInGuestName] = useState('');
  const [walkInGuestPhone, setWalkInGuestPhone] = useState('');
  const [walkInGuestEmail, setWalkInGuestEmail] = useState('');
  const [walkInRoomId, setWalkInRoomId] = useState('');
  const [walkInCheckIn, setWalkInCheckIn] = useState(() => new Date().toISOString().split('T')[0]);
  const [walkInCheckOut, setWalkInCheckOut] = useState(
    () => new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [walkInAdults, setWalkInAdults] = useState('1');
  const [walkInDeposit, setWalkInDeposit] = useState('');
  const [walkInError, setWalkInError] = useState<string | null>(null);

  // Debounce search query
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const {
    data: reservations = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<Reservation[]>({
    queryKey: ['reservations', statusFilter, debouncedSearch],
    queryFn: () =>
      fetchReservations({
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
      }),
  });

  const { data: availableRooms = [] } = useQuery({
    queryKey: ['rooms-available'],
    queryFn: fetchRooms,
    enabled: walkInModalVisible,
  });

  const createWalkInMutation = useMutation({
    mutationFn: (payload: CreateReservationPayload) => createReservation(payload),
    onSuccess: (newRes) => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      setWalkInModalVisible(false);
      resetWalkInForm();
      router.push({
        pathname: '/(app)/reservations/details',
        params: { id: newRes.id },
      });
    },
    onError: (err: any) => {
      setWalkInError(err.message || 'Failed to create walk-in reservation.');
    },
  });

  const resetWalkInForm = () => {
    setWalkInGuestName('');
    setWalkInGuestPhone('');
    setWalkInGuestEmail('');
    setWalkInRoomId('');
    setWalkInAdults('1');
    setWalkInDeposit('');
    setWalkInError(null);
  };

  const handleWalkInSubmit = () => {
    if (!walkInGuestName.trim() || !walkInGuestPhone.trim()) {
      setWalkInError('Guest name and phone number are required.');
      return;
    }
    if (!user?.hotelId) {
      setWalkInError('No active hotel context selected.');
      return;
    }

    createWalkInMutation.mutate({
      hotelId: user.hotelId,
      guestName: walkInGuestName.trim(),
      guestPhone: walkInGuestPhone.trim(),
      guestEmail: walkInGuestEmail.trim() || undefined,
      roomId: walkInRoomId || undefined,
      checkIn: walkInCheckIn,
      checkOut: walkInCheckOut,
      adults: parseInt(walkInAdults, 10) || 1,
      children: 0,
      advanceDeposit: walkInDeposit ? parseFloat(walkInDeposit) : 0,
    });
  };

  const renderReservationItem = ({ item }: { item: Reservation }) => {
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
      <AppCard
        style={styles.resCard}
        onPress={() =>
          router.push({
            pathname: '/(app)/reservations/details',
            params: { id: item.id },
          })
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.guestInfo}>
            <Text style={styles.guestName}>{item.guestName}</Text>
            <Text style={styles.refText}>Ref: {item.bookingRef}</Text>
          </View>
          <StatusBadge label={item.status} variant={getStatusVariant(item.status)} />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Stay Dates:</Text>
            <View style={styles.dateRange}>
              <DateDisplay dateString={item.checkIn} style={styles.dateText} />
              <Text style={styles.dateSeparator}>→</Text>
              <DateDisplay dateString={item.checkOut} style={styles.dateText} />
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Room:</Text>
            <Text style={styles.roomValue}>
              {item.room ? `Room ${item.room.number} (${item.room.type})` : 'Unassigned'}
            </Text>
          </View>

          <View style={styles.financialRow}>
            <View>
              <Text style={styles.amountLabel}>Total Tariff</Text>
              <MoneyDisplay amount={item.totalAmount} style={styles.amountValue} />
            </View>
            <View style={styles.rightAlign}>
              <Text style={styles.amountLabel}>Balance Due</Text>
              <MoneyDisplay
                amount={item.balanceDue}
                variant={Number(item.balanceDue) > 0 ? 'negative' : 'positive'}
                style={styles.amountValue}
              />
            </View>
          </View>
        </View>
      </AppCard>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Front Desk & Bookings"
        subtitle="Arrivals, Departures & In-House Guests"
        showBack
        rightAction={
          <PermissionGate permission="RESERVATION_CREATE">
            <TouchableOpacity
              style={styles.walkInButton}
              onPress={() => setWalkInModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.walkInButtonText}>+ Walk-In</Text>
            </TouchableOpacity>
          </PermissionGate>
        }
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <AppInput
          placeholder="Search by Guest Name, Phone, or Booking Ref..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === null && styles.activeChip]}
            onPress={() => setStatusFilter(null)}
          >
            <Text style={[styles.filterChipText, statusFilter === null && styles.activeChipText]}>
              All ({reservations.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'Confirmed' && styles.activeChip]}
            onPress={() => setStatusFilter('Confirmed')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'Confirmed' && styles.activeChipText]}>
              📥 Arrivals / Confirmed
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'CheckedIn' && styles.activeChip]}
            onPress={() => setStatusFilter('CheckedIn')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'CheckedIn' && styles.activeChipText]}>
              🏠 In-House
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'CheckedOut' && styles.activeChip]}
            onPress={() => setStatusFilter('CheckedOut')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'CheckedOut' && styles.activeChipText]}>
              📤 Departed
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'Cancelled' && styles.activeChip]}
            onPress={() => setStatusFilter('Cancelled')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'Cancelled' && styles.activeChipText]}>
              Cancelled
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main List */}
      {isLoading ? (
        <LoadingState message="Fetching reservations..." />
      ) : isError ? (
        <ErrorState
          title="Failed to Load Reservations"
          message={(error as Error)?.message || 'Unable to connect to server.'}
          onRetry={refetch}
        />
      ) : reservations.length === 0 ? (
        <EmptyState
          title="No Reservations Found"
          description="No bookings match your current search query or status filter."
          action={
            <PermissionGate permission="RESERVATION_CREATE">
              <AppButton
                title="Create Walk-In Booking"
                variant="primary"
                onPress={() => setWalkInModalVisible(true)}
              />
            </PermissionGate>
          }
        />
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item) => item.id}
          renderItem={renderReservationItem}
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

      {/* Walk-in Booking Modal */}
      <Modal
        visible={walkInModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setWalkInModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Walk-In Reservation</Text>
              <TouchableOpacity onPress={() => setWalkInModalVisible(false)} activeOpacity={0.7}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll}>
              {walkInError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>⚠️ {walkInError}</Text>
                </View>
              )}

              <AppInput
                label="Guest Full Name *"
                placeholder="e.g. Vikramaditya Rathore"
                value={walkInGuestName}
                onChangeText={setWalkInGuestName}
              />

              <AppInput
                label="Contact Mobile Phone *"
                placeholder="e.g. +91 98765 43210"
                value={walkInGuestPhone}
                onChangeText={setWalkInGuestPhone}
                keyboardType="phone-pad"
              />

              <AppInput
                label="Email Address"
                placeholder="e.g. guest@example.com"
                value={walkInGuestEmail}
                onChangeText={setWalkInGuestEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.fieldLabel}>Assign Room</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roomSelectScroll}>
                <TouchableOpacity
                  style={[styles.roomChip, !walkInRoomId && styles.roomChipSelected]}
                  onPress={() => setWalkInRoomId('')}
                >
                  <Text style={[styles.roomChipText, !walkInRoomId && styles.roomChipTextSelected]}>
                    Auto / Unassigned
                  </Text>
                </TouchableOpacity>
                {availableRooms
                  .filter((r) => r.status === 'Vacant' || r.status === 'Clean')
                  .map((room) => (
                    <TouchableOpacity
                      key={room.id}
                      style={[styles.roomChip, walkInRoomId === room.id && styles.roomChipSelected]}
                      onPress={() => setWalkInRoomId(room.id)}
                    >
                      <Text style={[styles.roomChipText, walkInRoomId === room.id && styles.roomChipTextSelected]}>
                        Room {room.number} ({room.type})
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>

              <View style={styles.rowInputs}>
                <View style={styles.halfInput}>
                  <AppInput
                    label="Check-In Date"
                    placeholder="YYYY-MM-DD"
                    value={walkInCheckIn}
                    onChangeText={setWalkInCheckIn}
                  />
                </View>
                <View style={styles.halfInput}>
                  <AppInput
                    label="Check-Out Date"
                    placeholder="YYYY-MM-DD"
                    value={walkInCheckOut}
                    onChangeText={setWalkInCheckOut}
                  />
                </View>
              </View>

              <View style={styles.rowInputs}>
                <View style={styles.halfInput}>
                  <AppInput
                    label="Adults"
                    value={walkInAdults}
                    onChangeText={setWalkInAdults}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.halfInput}>
                  <AppInput
                    label="Advance Deposit (₹)"
                    placeholder="0.00"
                    value={walkInDeposit}
                    onChangeText={setWalkInDeposit}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.modalActions}>
                <AppButton
                  title="Cancel"
                  variant="outline"
                  onPress={() => setWalkInModalVisible(false)}
                  style={styles.modalButton}
                />
                <AppButton
                  title="Create & Confirm"
                  variant="primary"
                  loading={createWalkInMutation.isPending}
                  onPress={handleWalkInSubmit}
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
  walkInButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  walkInButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: colors.background,
  },
  searchInput: {
    height: 44,
  },
  filterContainer: {
    backgroundColor: colors.background,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  activeChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  activeChipText: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  resCard: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  guestInfo: {
    flex: 1,
  },
  guestName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  refText: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  cardBody: {
    marginTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  dateRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  dateSeparator: {
    color: colors.textDim,
    fontSize: 12,
  },
  roomValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  rightAlign: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    color: colors.textDim,
    fontSize: 11,
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 15,
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
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 8,
  },
  roomSelectScroll: {
    marginBottom: 14,
  },
  roomChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginRight: 8,
  },
  roomChipSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  roomChipText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  roomChipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
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
