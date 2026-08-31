import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import { colors } from '../../src/theme/colors';
import { AppCard } from '../../src/components/AppCard';
import { StatusBadge } from '../../src/components/StatusBadge';
import { ConfirmDialog } from '../../src/components/ConfirmDialog';
import { PermissionGate } from '../../src/components/PermissionGate';

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.replace('/(auth)/login');
    } finally {
      setLoggingOut(false);
      setLogoutModalVisible(false);
    }
  };

  const primaryRole = user?.roles?.[0]?.role?.name || 'STAFF';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* User & Property Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.hotelName}>{user?.hotel?.name || 'StayOS Property'}</Text>
            <Text style={styles.userName}>{user?.name || 'Staff Member'}</Text>
            <View style={styles.badgeRow}>
              <StatusBadge label={primaryRole} variant="info" />
              {user?.hotel?.location && (
                <Text style={styles.locationText}>📍 {user.hotel.location}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => setLogoutModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Operational Modules */}
        <Text style={styles.sectionTitle}>Operations Modules</Text>

        {/* 1. Housekeeping Module */}
        <PermissionGate permission="HOUSEKEEPING_VIEW">
          <AppCard
            style={styles.moduleCard}
            onPress={() => router.push('/(app)/housekeeping')}
          >
            <View style={styles.moduleHeader}>
              <View style={[styles.moduleIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Text style={styles.moduleIcon}>🧹</Text>
              </View>
              <View style={styles.moduleInfo}>
                <View style={styles.moduleTitleRow}>
                  <Text style={styles.moduleTitle}>Housekeeping Board</Text>
                  <StatusBadge label="Ready" variant="success" />
                </View>
                <Text style={styles.moduleDescription}>
                  Live room cleaning list, turn-over checklists, minibar, and room status updates.
                </Text>
              </View>
            </View>
          </AppCard>
        </PermissionGate>

        {/* 2. Lost & Found Module */}
        <PermissionGate permission="LOST_FOUND_VIEW">
          <AppCard
            style={styles.moduleCard}
            onPress={() => router.push('/(app)/housekeeping/lost-found')}
          >
            <View style={styles.moduleHeader}>
              <View style={[styles.moduleIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Text style={styles.moduleIcon}>📦</Text>
              </View>
              <View style={styles.moduleInfo}>
                <View style={styles.moduleTitleRow}>
                  <Text style={styles.moduleTitle}>Lost & Found</Text>
                  <StatusBadge label="Ready" variant="success" />
                </View>
                <Text style={styles.moduleDescription}>
                  Record and track guest property left in rooms or public hotel areas.
                </Text>
              </View>
            </View>
          </AppCard>
        </PermissionGate>

        {/* 3. Front Desk / Reservations (Preview) */}
        <AppCard style={[styles.moduleCard, styles.disabledModule]}>
          <View style={styles.moduleHeader}>
            <View style={[styles.moduleIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Text style={styles.moduleIcon}>🛎️</Text>
            </View>
            <View style={styles.moduleInfo}>
              <View style={styles.moduleTitleRow}>
                <Text style={styles.moduleTitle}>Front Desk & Folios</Text>
                <StatusBadge label="Phase 3" variant="default" />
              </View>
              <Text style={styles.moduleDescription}>
                Arrivals, departures, check-in, deposit collection, room moves, and guest billing.
              </Text>
            </View>
          </View>
        </AppCard>

        {/* 4. Maintenance / Engineering (Preview) */}
        <AppCard style={[styles.moduleCard, styles.disabledModule]}>
          <View style={styles.moduleHeader}>
            <View style={[styles.moduleIconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
              <Text style={styles.moduleIcon}>🔧</Text>
            </View>
            <View style={styles.moduleInfo}>
              <View style={styles.moduleTitleRow}>
                <Text style={styles.moduleTitle}>Engineering & Work Orders</Text>
                <StatusBadge label="Phase 4" variant="default" />
              </View>
              <Text style={styles.moduleDescription}>
                Corrective tasks, equipment inspection, and Out-of-Order room isolation.
              </Text>
            </View>
          </View>
        </AppCard>

        {/* 5. F&B POS / Kitchen (Preview) */}
        <AppCard style={[styles.moduleCard, styles.disabledModule]}>
          <View style={styles.moduleHeader}>
            <View style={[styles.moduleIconContainer, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
              <Text style={styles.moduleIcon}>🍽️</Text>
            </View>
            <View style={styles.moduleInfo}>
              <View style={styles.moduleTitleRow}>
                <Text style={styles.moduleTitle}>F&B POS & Kitchen Display</Text>
                <StatusBadge label="Phase 5" variant="default" />
              </View>
              <Text style={styles.moduleDescription}>
                Table orders, KOT kitchen queue, and direct room folio charging.
              </Text>
            </View>
          </View>
        </AppCard>

        {/* 6. Cashiering (Preview) */}
        <AppCard style={[styles.moduleCard, styles.disabledModule]}>
          <View style={styles.moduleHeader}>
            <View style={[styles.moduleIconContainer, { backgroundColor: 'rgba(20, 184, 166, 0.15)' }]}>
              <Text style={styles.moduleIcon}>💵</Text>
            </View>
            <View style={styles.moduleInfo}>
              <View style={styles.moduleTitleRow}>
                <Text style={styles.moduleTitle}>Cashier Shift & Reconciliation</Text>
                <StatusBadge label="Phase 6" variant="default" />
              </View>
              <Text style={styles.moduleDescription}>
                Shift drawer float, cash drops, payments, and blind end-of-shift closing.
              </Text>
            </View>
          </View>
        </AppCard>
      </ScrollView>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        visible={logoutModalVisible}
        title="Sign Out"
        message="Are you sure you want to sign out from this property?"
        confirmText="Sign Out"
        variant="danger"
        loading={loggingOut}
        onConfirm={handleLogout}
        onCancel={() => setLogoutModalVisible(false)}
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
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    marginBottom: 24,
  },
  hotelName: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  userName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  locationText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  logoutIcon: {
    fontSize: 16,
  },
  logoutText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  moduleCard: {
    marginBottom: 12,
  },
  disabledModule: {
    opacity: 0.6,
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moduleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  moduleIcon: {
    fontSize: 24,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moduleTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  moduleDescription: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
});
