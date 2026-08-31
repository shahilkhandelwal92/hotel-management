import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../src/api/client';
import { HousekeepingTask, HousekeepingChecklistItem } from '../../../src/api/types';
import { colors } from '../../../src/theme/colors';
import { AppHeader } from '../../../src/components/AppHeader';
import { AppCard } from '../../../src/components/AppCard';
import { AppButton } from '../../../src/components/AppButton';
import { RoomStatusBadge } from '../../../src/components/RoomStatusBadge';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { LoadingState } from '../../../src/components/LoadingState';
import { ErrorState } from '../../../src/components/ErrorState';
import { ConfirmDialog } from '../../../src/components/ConfirmDialog';

export default function RoomDetailScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [confirmCompleteVisible, setConfirmCompleteVisible] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<{ tasks: HousekeepingTask[] }>({
    queryKey: ['housekeeping-tasks'],
    queryFn: async () => {
      return await apiClient<{ tasks: HousekeepingTask[] }>('/api/housekeeping');
    },
  });

  const task = data?.tasks?.find((t) => t.id === taskId);

  // Mutation to update task status or checklist
  const updateTaskMutation = useMutation({
    mutationFn: async (payload: { id: string; status?: string; checklist?: HousekeepingChecklistItem[]; notes?: string }) => {
      return await apiClient<{ task: HousekeepingTask }>('/api/housekeeping', {
        method: 'PUT',
        body: payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping-tasks'] });
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to update housekeeping task.');
    },
  });

  if (isLoading) {
    return <LoadingState message="Loading room details..." />;
  }

  if (isError || !task) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Room Details" showBack />
        <ErrorState
          title="Task Not Found"
          message={(error as Error)?.message || 'Housekeeping task could not be located.'}
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  const roomNumber = task.room?.number || task.roomNumber;
  const roomType = task.room?.type || 'Standard';
  const floor = task.room?.floor !== undefined ? `Floor ${task.room.floor}` : '';
  const roomStatus = task.room?.status || (task.status === 'Completed' ? 'Vacant' : 'Dirty');
  const checklist = task.checklist || [];

  const handleToggleChecklist = (index: number) => {
    const updated = checklist.map((item, idx) =>
      idx === index ? { ...item, done: !item.done } : item
    );
    updateTaskMutation.mutate({
      id: task.id,
      checklist: updated,
    });
  };

  const handleStartCleaning = () => {
    updateTaskMutation.mutate({
      id: task.id,
      status: 'InProgress',
    });
  };

  const handleCompleteCleaning = () => {
    updateTaskMutation.mutate(
      {
        id: task.id,
        status: 'Completed',
      },
      {
        onSuccess: () => {
          setConfirmCompleteVisible(false);
          Alert.alert('Turnover Complete', `Room ${roomNumber} has been marked Clean & turnover completed.`, [
            { text: 'OK', onPress: () => router.back() },
          ]);
        },
      }
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={`Room ${roomNumber}`}
        subtitle={`${roomType} • ${floor}`}
        showBack
      />

      <ScrollView contentContainerStyle={styles.container}>
        {actionError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {actionError}</Text>
          </View>
        )}

        {/* Room State Overview */}
        <AppCard style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.label}>Room Status</Text>
              <View style={styles.badgeWrapper}>
                <RoomStatusBadge status={roomStatus} />
              </View>
            </View>
            <View>
              <Text style={styles.label}>Cleaning Task</Text>
              <View style={styles.badgeWrapper}>
                <StatusBadge
                  label={task.status}
                  variant={task.status === 'Completed' ? 'success' : task.status === 'InProgress' ? 'warning' : 'default'}
                />
              </View>
            </View>
            <View>
              <Text style={styles.label}>Priority</Text>
              <View style={styles.badgeWrapper}>
                <StatusBadge
                  label={task.priority}
                  variant={task.priority === 'High' ? 'danger' : 'default'}
                />
              </View>
            </View>
          </View>

          {task.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Notes / Guest Special Requests:</Text>
              <Text style={styles.notesText}>{task.notes}</Text>
            </View>
          )}
        </AppCard>

        {/* Interactive Turnover Checklist */}
        <Text style={styles.sectionTitle}>Turnover Checklist</Text>
        <AppCard style={styles.checklistCard}>
          {checklist.length === 0 ? (
            <Text style={styles.emptyChecklist}>No checklist items defined for this task.</Text>
          ) : (
            checklist.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.checklistItem,
                  index < checklist.length - 1 && styles.checklistItemBorder,
                ]}
                onPress={() => handleToggleChecklist(index)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    item.done && styles.checkboxChecked,
                  ]}
                >
                  {item.done && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text
                  style={[
                    styles.checklistLabel,
                    item.done && styles.checklistLabelChecked,
                  ]}
                >
                  {item.item}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </AppCard>

        {/* Operational Actions */}
        <View style={styles.actionContainer}>
          {task.status === 'Pending' && (
            <AppButton
              title="▶ Start Cleaning"
              variant="primary"
              loading={updateTaskMutation.isPending}
              onPress={handleStartCleaning}
            />
          )}

          {task.status !== 'Completed' && (
            <AppButton
              title="✓ Complete Turnover & Mark Clean"
              variant="success"
              loading={updateTaskMutation.isPending}
              onPress={() => setConfirmCompleteVisible(true)}
              style={styles.completeButton}
            />
          )}

          {task.status === 'Completed' && (
            <View style={styles.completedNotice}>
              <Text style={styles.completedIcon}>🎉</Text>
              <Text style={styles.completedTitle}>Room Turnover Complete</Text>
              <Text style={styles.completedDescription}>
                Room is verified clean and updated in the central PMS.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Completion Confirmation Dialog */}
      <ConfirmDialog
        visible={confirmCompleteVisible}
        title="Complete Room Turnover?"
        message={`Are you sure you have completed all cleaning and minibar checks for Room ${roomNumber}? This will mark the room Clean in the PMS.`}
        confirmText="Yes, Complete"
        variant="primary"
        loading={updateTaskMutation.isPending}
        onConfirm={handleCompleteCleaning}
        onCancel={() => setConfirmCompleteVisible(false)}
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  badgeWrapper: {
    alignItems: 'flex-start',
  },
  notesContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  notesLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  notesText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
  },
  checklistCard: {
    padding: 0,
    marginBottom: 20,
    overflow: 'hidden',
  },
  emptyChecklist: {
    padding: 16,
    color: colors.textDim,
    fontSize: 14,
    textAlign: 'center',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  checklistItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checklistLabel: {
    color: colors.text,
    fontSize: 15,
    flex: 1,
  },
  checklistLabelChecked: {
    color: colors.textDim,
    textDecorationLine: 'line-through',
  },
  actionContainer: {
    marginTop: 10,
    gap: 12,
  },
  completeButton: {
    backgroundColor: colors.accent,
  },
  completedNotice: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  completedIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  completedTitle: {
    color: colors.success,
    fontSize: 18,
    fontWeight: '700',
  },
  completedDescription: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
});
