import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchMaintenanceData } from '../../../src/api/maintenance';
import { WorkOrder } from '../../../src/api/types';
import { colors } from '../../../src/theme/colors';
import { AppHeader } from '../../../src/components/AppHeader';
import { AppCard } from '../../../src/components/AppCard';
import { AppButton } from '../../../src/components/AppButton';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { DateDisplay } from '../../../src/components/DateDisplay';
import { LoadingState } from '../../../src/components/LoadingState';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';
import { PermissionGate } from '../../../src/components/PermissionGate';

export default function MaintenanceDashboardScreen() {
  const router = useRouter();
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const {
    data = { assets: [], workOrders: [] },
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['maintenance-data'],
    queryFn: fetchMaintenanceData,
    refetchInterval: 15000,
  });

  const workOrders = data.workOrders || [];
  const assets = data.assets || [];

  const openOrders = workOrders.filter((w) => w.status !== 'COMPLETED');
  const emergencyOrders = workOrders.filter(
    (w) => ['HIGH', 'EMERGENCY'].includes(w.priority) && w.status !== 'COMPLETED'
  );
  const oooRoomsCount = workOrders.filter(
    (w) => w.lockRoomOutOfOrder && w.status !== 'COMPLETED'
  ).length;

  const filteredOrders = workOrders.filter((w) => {
    if (selectedPriority && w.priority !== selectedPriority) return false;
    if (selectedStatus && w.status !== selectedStatus) return false;
    return true;
  });

  const getPriorityVariant = (p: string) => {
    switch (p) {
      case 'EMERGENCY':
        return 'danger';
      case 'HIGH':
        return 'warning';
      case 'MEDIUM':
        return 'info';
      case 'LOW':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusVariant = (s: string) => {
    switch (s) {
      case 'REPORTED':
        return 'warning';
      case 'IN_PROGRESS':
        return 'info';
      case 'COMPLETED':
        return 'success';
      default:
        return 'default';
    }
  };

  const renderWorkOrderItem = ({ item }: { item: WorkOrder }) => (
    <AppCard
      style={styles.orderCard}
      onPress={() =>
        router.push({
          pathname: '/(app)/maintenance/work-order',
          params: { workOrderId: item.id },
        })
      }
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.orderNumber}>{item.workOrderNumber}</Text>
          <Text style={styles.orderTitle} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        <View style={styles.badgeCol}>
          <StatusBadge label={item.priority} variant={getPriorityVariant(item.priority)} />
          <StatusBadge label={item.status} variant={getStatusVariant(item.status)} />
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.metaRow}>
          {item.asset && (
            <Text style={styles.assetTag}>⚙️ {item.asset.name}</Text>
          )}
          {item.roomId && (
            <Text style={styles.oooTag}>
              🚪 Room {item.roomId} {item.lockRoomOutOfOrder ? '(OOO Locked)' : ''}
            </Text>
          )}
        </View>
        <DateDisplay dateString={item.createdAt} showTime style={styles.dateText} />
      </View>
    </AppCard>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Engineering & Maintenance"
        subtitle="Work Orders, Plant Assets & Out-of-Order Isolation"
        showBack
        rightAction={
          <TouchableOpacity
            style={styles.assetsBtn}
            onPress={() => router.push('/(app)/maintenance/assets')}
            activeOpacity={0.7}
          >
            <Text style={styles.assetsBtnText}>⚙️ Assets</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Metric Cards Row */}
        <View style={styles.metricRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Open Orders</Text>
            <Text style={styles.metricValue}>{openOrders.length}</Text>
          </View>
          <View style={[styles.metricCard, styles.urgentCard]}>
            <Text style={[styles.metricLabel, styles.urgentText]}>Urgent / High</Text>
            <Text style={[styles.metricValue, styles.urgentText]}>{emergencyOrders.length}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Plant Assets</Text>
            <Text style={styles.metricValue}>{assets.length}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>OOO Rooms</Text>
            <Text style={styles.metricValue}>{oooRoomsCount}</Text>
          </View>
        </View>

        {/* Action Button */}
        <PermissionGate permission="MAINTENANCE_MANAGE">
          <AppButton
            title="🔧 + Create Work Order"
            variant="primary"
            onPress={() => router.push('/(app)/maintenance/create-work-order')}
            style={styles.createBtn}
          />
        </PermissionGate>

        {/* Filter Controls */}
        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>Work Orders ({filteredOrders.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {(['All', 'EMERGENCY', 'HIGH', 'MEDIUM', 'LOW'] as const).map((p) => {
              const val = p === 'All' ? null : p;
              const isActive = selectedPriority === val;
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => setSelectedPriority(val)}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {isLoading ? (
          <LoadingState message="Loading work orders and asset status..." />
        ) : isError ? (
          <ErrorState
            title="Failed to Load Maintenance Data"
            message={(error as Error)?.message || 'Unable to connect to server.'}
            onRetry={refetch}
          />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            title="No Work Orders"
            description="There are no work orders matching the selected filter."
          />
        ) : (
          <FlatList
            data={filteredOrders}
            keyExtractor={(item) => item.id}
            renderItem={renderWorkOrderItem}
            scrollEnabled={false}
          />
        )}
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
  assetsBtn: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  assetsBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
  },
  urgentCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: colors.danger,
  },
  metricLabel: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metricValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  urgentText: {
    color: colors.danger,
  },
  createBtn: {
    marginBottom: 16,
  },
  filterSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  chip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  orderCard: {
    marginBottom: 10,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flex: 1,
    paddingRight: 8,
  },
  orderNumber: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  orderTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  badgeCol: {
    flexDirection: 'row',
    gap: 6,
  },
  description: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  assetTag: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '600',
  },
  oooTag: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 11,
  },
});
