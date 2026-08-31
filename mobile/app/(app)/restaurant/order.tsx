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
import { fetchMenuItems, createPosOrderApi, CreatePosOrderPayload } from '../../../src/api/pos';
import { fetchReservations } from '../../../src/api/reservations';
import { MenuItem, Reservation } from '../../../src/api/types';
import { colors } from '../../../src/theme/colors';
import { AppHeader } from '../../../src/components/AppHeader';
import { AppCard } from '../../../src/components/AppCard';
import { AppButton } from '../../../src/components/AppButton';
import { AppInput } from '../../../src/components/AppInput';
import { MoneyDisplay } from '../../../src/components/MoneyDisplay';
import { LoadingState } from '../../../src/components/LoadingState';
import { ErrorState } from '../../../src/components/ErrorState';

interface SelectedItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

export default function CreatePosOrderScreen() {
  const { tableNumber: initialTable } = useLocalSearchParams<{ tableNumber?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [orderSource, setOrderSource] = useState<'DineIn' | 'RoomService' | 'Takeaway' | 'Walkin'>('DineIn');
  const [tableNumber, setTableNumber] = useState(initialTable || '1');
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, SelectedItem>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch Menu Items
  const {
    data: menuItems = [],
    isLoading: isMenuLoading,
    isError: isMenuError,
    error: menuError,
    refetch: refetchMenu,
  } = useQuery({
    queryKey: ['menu-items'],
    queryFn: fetchMenuItems,
  });

  // Fetch In-House Reservations for Room Charge
  const { data: inHouseReservations = [] } = useQuery<Reservation[]>({
    queryKey: ['reservations', 'CheckedIn'],
    queryFn: () => fetchReservations({ status: 'CheckedIn' }),
  });

  const categories = Array.from(new Set(menuItems.map((m) => m.category))).sort();

  const filteredMenuItems = selectedCategory
    ? menuItems.filter((m) => m.category === selectedCategory)
    : menuItems;

  const handleAddItem = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev[item.id];
      const nextQty = (existing?.quantity || 0) + 1;
      return {
        ...prev,
        [item.id]: {
          menuItem: item,
          quantity: nextQty,
          notes: existing?.notes,
        },
      };
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return {
        ...prev,
        [itemId]: {
          ...existing,
          quantity: existing.quantity - 1,
        },
      };
    });
  };

  // Derive preview amounts (Authoritative calculations are confirmed by server)
  const cartItemsList = Object.values(cart);
  const subtotalEst = cartItemsList.reduce(
    (sum, c) => sum + Number(c.menuItem.price) * c.quantity,
    0
  );
  const gstEst = subtotalEst * 0.05;
  const grandTotalEst = subtotalEst + gstEst;

  const createOrderMutation = useMutation({
    mutationFn: (payload: CreatePosOrderPayload) => createPosOrderApi(payload),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['pos-orders'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-stock'] });
      queryClient.invalidateQueries({ queryKey: ['folios'] });

      Alert.alert(
        'Order & KOT Dispatched',
        `Order #${order.id.slice(0, 8).toUpperCase()} sent to Kitchen Display System.`,
        [
          {
            text: 'View Order',
            onPress: () =>
              router.replace({
                pathname: '/(app)/restaurant/order-details',
                params: { orderId: order.id },
              }),
          },
          {
            text: 'Back to Floor',
            onPress: () => router.back(),
          },
        ]
      );
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to place POS order on server.');
    },
  });

  const handleOrderSubmit = () => {
    if (cartItemsList.length === 0) {
      setActionError('Please add at least one menu item to the order.');
      return;
    }
    if (orderSource === 'DineIn' && !tableNumber.trim()) {
      setActionError('Table number is required for Dine-In orders.');
      return;
    }
    if (orderSource === 'RoomService' && !selectedReservationId) {
      setActionError('Please select a checked-in guest room for Room Service charge.');
      return;
    }

    setActionError(null);
    createOrderMutation.mutate({
      tableNumber: orderSource === 'DineIn' ? tableNumber.trim() : undefined,
      orderSource,
      reservationId: selectedReservationId || undefined,
      guestName: guestName.trim() || undefined,
      kotPrinted: true,
      items: cartItemsList.map((c) => ({
        menuItemId: c.menuItem.id,
        quantity: c.quantity,
        notes: c.notes,
      })),
    });
  };

  if (isMenuLoading) {
    return <LoadingState message="Loading restaurant menu & pricing..." />;
  }

  if (isMenuError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="New Restaurant Order" showBack />
        <ErrorState
          title="Menu Error"
          message={(menuError as Error)?.message || 'Failed to fetch restaurant menu.'}
          onRetry={refetchMenu}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Create Restaurant Order"
        subtitle="Menu Selection & KOT Dispatch"
        showBack
      />

      <ScrollView contentContainerStyle={styles.container}>
        {actionError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {actionError}</Text>
          </View>
        )}

        {/* 1. Order Type & Source */}
        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>1. Order Destination</Text>
          <View style={styles.sourceRow}>
            {(['DineIn', 'RoomService', 'Takeaway', 'Walkin'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.sourceChip, orderSource === s && styles.sourceChipActive]}
                onPress={() => setOrderSource(s)}
              >
                <Text style={[styles.sourceChipText, orderSource === s && styles.sourceChipTextActive]}>
                  {s === 'DineIn'
                    ? '🍽️ Dine In'
                    : s === 'RoomService'
                    ? '🛎️ Room Service'
                    : s === 'Takeaway'
                    ? '🛍️ Takeaway'
                    : '🚶 Walk-In'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {orderSource === 'DineIn' && (
            <AppInput
              label="Table Number"
              placeholder="e.g. 4"
              value={tableNumber}
              onChangeText={setTableNumber}
              keyboardType="number-pad"
            />
          )}

          {orderSource === 'RoomService' && (
            <View style={styles.roomSelectSection}>
              <Text style={styles.fieldLabel}>Select Checked-In Guest Room (Folio Charge):</Text>
              {inHouseReservations.length === 0 ? (
                <Text style={styles.noInHouseText}>No checked-in guests currently in-house.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.resScroll}>
                  {inHouseReservations.map((res) => {
                    const isSelected = selectedReservationId === res.id;
                    return (
                      <TouchableOpacity
                        key={res.id}
                        style={[styles.resChip, isSelected && styles.resChipActive]}
                        onPress={() => {
                          setSelectedReservationId(res.id);
                          setGuestName(res.guestName);
                        }}
                      >
                        <Text style={[styles.resRoomText, isSelected && styles.resRoomTextActive]}>
                          Room {res.room?.number || 'Unassigned'}
                        </Text>
                        <Text style={styles.resGuestText} numberOfLines={1}>
                          {res.guestName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}
        </AppCard>

        {/* 2. Menu Item Categories */}
        <Text style={styles.sectionTitle}>2. Menu Selection</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          <TouchableOpacity
            style={[styles.catChip, selectedCategory === null && styles.catChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.catChipText, selectedCategory === null && styles.catChipTextActive]}>
              All ({menuItems.length})
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.catChipText, selectedCategory === cat && styles.catChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Menu Items List */}
        <View style={styles.menuGrid}>
          {filteredMenuItems.map((item) => {
            const currentQty = cart[item.id]?.quantity || 0;
            return (
              <AppCard key={item.id} style={styles.menuCard}>
                <View style={styles.menuCardTop}>
                  <View style={styles.nameBlock}>
                    <Text style={styles.itemName}>
                      {item.isVeg ? '🟢 ' : '🔴 '}
                      {item.name}
                    </Text>
                    <Text style={styles.itemCategory}>{item.category}</Text>
                  </View>
                  <MoneyDisplay amount={item.price} style={styles.itemPrice} />
                </View>

                <View style={styles.qtyControlRow}>
                  {currentQty > 0 ? (
                    <View style={styles.qtyControls}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => handleRemoveItem(item.id)}
                      >
                        <Text style={styles.qtyBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyNum}>{currentQty}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => handleAddItem(item)}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={() => handleAddItem(item)}
                    >
                      <Text style={styles.addBtnText}>+ Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </AppCard>
            );
          })}
        </View>

        {/* 3. Order Summary & Totals */}
        {cartItemsList.length > 0 && (
          <AppCard style={styles.summaryCard}>
            <Text style={styles.cardTitle}>3. Order Bill Summary</Text>
            {cartItemsList.map((c) => (
              <View key={c.menuItem.id} style={styles.summaryLine}>
                <Text style={styles.summaryLineName}>
                  {c.quantity}x {c.menuItem.name}
                </Text>
                <MoneyDisplay
                  amount={Number(c.menuItem.price) * c.quantity}
                  style={styles.summaryLineTotal}
                />
              </View>
            ))}

            <View style={styles.taxLine}>
              <Text style={styles.taxLabel}>Subtotal</Text>
              <MoneyDisplay amount={subtotalEst} style={styles.taxVal} />
            </View>
            <View style={styles.taxLine}>
              <Text style={styles.taxLabel}>GST (5% Restaurant)</Text>
              <MoneyDisplay amount={gstEst} style={styles.taxVal} />
            </View>
            <View style={[styles.taxLine, styles.grandTotalLine]}>
              <Text style={styles.grandTotalLabel}>Estimated Grand Total</Text>
              <MoneyDisplay amount={grandTotalEst} style={styles.grandTotalVal} />
            </View>
          </AppCard>
        )}

        {/* Action Button */}
        <View style={styles.actionSection}>
          <AppButton
            title="⚡ Send Order & Dispatch KOT"
            variant="primary"
            loading={createOrderMutation.isPending}
            disabled={createOrderMutation.isPending || cartItemsList.length === 0}
            onPress={handleOrderSubmit}
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
  sourceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  sourceChip: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  sourceChipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  sourceChipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  sourceChipTextActive: {
    color: colors.primary,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  roomSelectSection: {
    marginTop: 6,
  },
  noInHouseText: {
    color: colors.textDim,
    fontSize: 13,
    fontStyle: 'italic',
  },
  resScroll: {
    flexDirection: 'row',
  },
  resChip: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    width: 130,
  },
  resChipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  resRoomText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  resRoomTextActive: {
    color: colors.primary,
  },
  resGuestText: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 8,
  },
  catScroll: {
    marginBottom: 14,
  },
  catChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  catChipTextActive: {
    color: '#fff',
  },
  menuGrid: {
    gap: 8,
    marginBottom: 16,
  },
  menuCard: {
    padding: 12,
    marginVertical: 4,
  },
  menuCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameBlock: {
    flex: 1,
  },
  itemName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  itemCategory: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
  },
  qtyControlRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  qtyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  qtyBtnText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  qtyNum: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 8,
  },
  addBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  summaryCard: {
    marginBottom: 16,
    padding: 16,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLineName: {
    color: colors.text,
    fontSize: 13,
  },
  summaryLineTotal: {
    fontSize: 13,
  },
  taxLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  taxLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  taxVal: {
    fontSize: 12,
  },
  grandTotalLine: {
    marginTop: 6,
    paddingTop: 6,
  },
  grandTotalLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  grandTotalVal: {
    fontSize: 16,
  },
  actionSection: {
    marginTop: 8,
    marginBottom: 36,
  },
});
