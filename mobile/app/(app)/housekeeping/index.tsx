import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../src/api/client';
import { HousekeepingTask } from '../../../src/api/types';
import { colors } from '../../../src/theme/colors';
import { AppHeader } from '../../../src/components/AppHeader';
import { AppCard } from '../../../src/components/AppCard';
import { RoomStatusBadge } from '../../../src/components/RoomStatusBadge';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { LoadingState } from '../../../src/components/LoadingState';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';

export default function HousekeepingBoardScreen() {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<{ tasks: HousekeepingTask[] }>({
    queryKey: ['housekeeping-tasks', selectedStatus, selectedPriority],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedPriority) params.append('priority', selectedPriority);
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      return await apiClient<{ tasks: HousekeepingTask[] }>(`/api/housekeeping${queryStr}`);
    },
  });

  const tasks = data?.tasks ?? [];

  const renderTaskItem = ({ item }: { item: HousekeepingTask }) => {
    const roomNumber = item.room?.number || item.roomNumber;
    const roomType = item.room?.type || 'Room';
    const floor = item.room?.floor !== undefined ? `Floor ${item.room.floor}` : '';
    const roomStatus = item.room?.status || (item.status === 'Completed' ? 'Vacant' : 'Dirty');

    const checklistTotal = item.checklist?.length ?? 0;
    const checklistDone = item.checklist?.filter((c) => c.done).length ?? 0;

    return (
      <AppCard
        style={styles.taskCard}
        onPress={() =>
          router.push({
            pathname: '/(app)/housekeeping/room',
            params: { taskId: item.id },
          })
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.roomBadgeContainer}>
            <Text style={styles.roomNumber}>Room {roomNumber}</Text>
            <Text style={styles.roomMeta}>
              {roomType} • {floor}
            </Text>
          </View>
          <RoomStatusBadge status={roomStatus} />
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.tagRow}>
            <StatusBadge
              label={item.taskType}
              variant={item.taskType === 'Clean' ? 'info' : 'warning'}
            />
            <StatusBadge
              label={`Priority: ${item.priority}`}
              variant={item.priority === 'High' ? 'danger' : 'default'}
            />
            <StatusBadge
              label={item.status}
              variant={item.status === 'Completed' ? 'success' : 'warning'}
            />
          </View>

          {checklistTotal > 0 && (
            <View style={styles.checklistSummary}>
              <Text style={styles.checklistText}>
                Checklist: {checklistDone}/{checklistTotal} completed
              </Text>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${(checklistDone / checklistTotal) * 100}%` },
                  ]}
                />
              </View>
            </View>
          )}

          {item.assignedTo && (
            <Text style={styles.assigneeText}>👤 Assigned: {item.assignedTo.name}</Text>
          )}
        </View>
      </AppCard>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Housekeeping Board"
        subtitle="Live Turnover & Room Cleaning Queue"
        showBack
        rightAction={
          <TouchableOpacity
            style={styles.lostFoundButton}
            onPress={() => router.push('/(app)/housekeeping/lost-found')}
            activeOpacity={0.7}
          >
            <Text style={styles.lostFoundText}>📦 L&F</Text>
          </TouchableOpacity>
        }
      />

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, selectedStatus === null && styles.activeChip]}
            onPress={() => setSelectedStatus(null)}
          >
            <Text style={[styles.filterChipText, selectedStatus === null && styles.activeChipText]}>
              All Tasks
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedStatus === 'Pending' && styles.activeChip]}
            onPress={() => setSelectedStatus('Pending')}
          >
            <Text style={[styles.filterChipText, selectedStatus === 'Pending' && styles.activeChipText]}>
              Pending
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedStatus === 'InProgress' && styles.activeChip]}
            onPress={() => setSelectedStatus('InProgress')}
          >
            <Text style={[styles.filterChipText, selectedStatus === 'InProgress' && styles.activeChipText]}>
              In Progress
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedStatus === 'Completed' && styles.activeChip]}
            onPress={() => setSelectedStatus('Completed')}
          >
            <Text style={[styles.filterChipText, selectedStatus === 'Completed' && styles.activeChipText]}>
              Completed
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedPriority === 'High' && styles.activeChip]}
            onPress={() => setSelectedPriority(selectedPriority === 'High' ? null : 'High')}
          >
            <Text style={[styles.filterChipText, selectedPriority === 'High' && styles.activeChipText]}>
              🔥 High Priority
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main Task List */}
      {isLoading ? (
        <LoadingState message="Fetching room tasks..." />
      ) : isError ? (
        <ErrorState
          title="Failed to Load Tasks"
          message={(error as Error)?.message || 'Could not connect to server.'}
          onRetry={refetch}
        />
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No Housekeeping Tasks Found"
          description="All rooms on this board are clean or no tasks match your filter criteria."
        />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTaskItem}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
  taskCard: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  roomBadgeContainer: {
    flex: 1,
  },
  roomNumber: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  roomMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  cardDetails: {
    marginTop: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  checklistSummary: {
    marginTop: 6,
  },
  checklistText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 3,
  },
  assigneeText: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 8,
  },
  lostFoundButton: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  lostFoundText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
});
