import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { colors } from '../theme/colors';
import { UserProfile } from '../services/authService';
import { BACKEND_URL } from '../config/api';

interface ProfileScreenProps {
  currentUser: UserProfile | null;
  currentRoomCode: string;
  currentRoomName: string;
  myRooms: Array<{ id: string; name: string; inviteCode: string; role?: string }>;
  onlineMemberCount: number;
  networkStatus: string;
  isSimulatedOffline: boolean;
  totalTasksCount: number;
  completedTasksCount: number;
  onBack: () => void;
  onOpenRoomModal: () => void;
  onOpenCreateRoom: () => void;
  onOpenJoinRoom: () => void;
  onOpenBenchmarks: () => void;
  onToggleOffline: () => void;
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  currentUser,
  currentRoomCode,
  currentRoomName,
  myRooms,
  onlineMemberCount,
  networkStatus,
  isSimulatedOffline,
  totalTasksCount,
  completedTasksCount,
  onBack,
  onOpenRoomModal,
  onOpenCreateRoom,
  onOpenJoinRoom,
  onOpenBenchmarks,
  onToggleOffline,
  onLogout,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = async () => {
    if (currentRoomCode) {
      await Clipboard.setStringAsync(currentRoomCode);
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const isGoogle =
    currentUser?.email.includes('@gmail.com') || (currentUser as any)?.googleId;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#2A246B" />

      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.circleBackBtn}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Text style={styles.circleBackArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Profile & Workspace</Text>
          <View style={{ width: 38 }} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Hero Card */}
        <View style={styles.userHeroCard}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri:
                  currentUser?.avatarUrl ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
              }}
              style={styles.avatarImage}
            />
            {isGoogle && (
              <View style={styles.googleBadge}>
                <Text style={styles.googleBadgeText}>G</Text>
              </View>
            )}
          </View>

          <Text style={styles.userName}>{currentUser?.displayName || 'TaskFlow User'}</Text>
          <Text style={styles.userEmail}>{currentUser?.email || 'user@taskflow.dev'}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.verifiedPill}>
              <Text style={styles.verifiedPillText}>✓ Verified Account</Text>
            </View>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>
                {isGoogle ? 'Google OAuth2' : 'Email Account'}
              </Text>
            </View>
          </View>
        </View>

        {/* Current Active Workspace Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardSectionLabel}>ACTIVE WORKSPACE</Text>
              <Text style={styles.cardMainTitle}>{currentRoomName || 'My Workspace'}</Text>
            </View>
            <View style={styles.onlinePill}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlinePillText}>{onlineMemberCount} Online</Text>
            </View>
          </View>

          {/* Room Code Card with Copy */}
          {currentRoomCode ? (
            <View style={styles.roomCodeBox}>
              <View style={styles.roomCodeInfo}>
                <Text style={styles.roomCodeLabel}>UNIQUE INVITE CODE</Text>
                <Text style={styles.roomCodeValue}>{currentRoomCode}</Text>
              </View>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={handleCopyCode}
                activeOpacity={0.75}
              >
                <Text style={styles.copyBtnText}>
                  {copiedCode ? '✓ Copied' : '📋 Copy'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.roomCodeBox}>
              <Text style={styles.noRoomText}>No room currently active.</Text>
            </View>
          )}

          <Text style={styles.privacyNote}>
            🔒 Private Room: Share this unique code with teammates so they can join and collaborate on tasks in real-time.
          </Text>

          {/* Quick Room Actions */}
          <View style={styles.roomActionsRow}>
            <TouchableOpacity
              style={styles.roomActionBtn}
              onPress={onOpenRoomModal}
              activeOpacity={0.8}
            >
              <Text style={styles.roomActionBtnText}>📁 My Rooms ({myRooms.length})</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roomActionBtn, styles.roomActionBtnPrimary]}
              onPress={onOpenJoinRoom}
              activeOpacity={0.8}
            >
              <Text style={[styles.roomActionBtnText, styles.roomActionBtnPrimaryText]}>
                🔑 Enter Code
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.roomActionBtn}
              onPress={onOpenCreateRoom}
              activeOpacity={0.8}
            >
              <Text style={styles.roomActionBtnText}>＋ Create</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Real-Time Sync & Engine Stats */}
        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>COLLABORATION & SYNC ENGINE</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{totalTasksCount}</Text>
              <Text style={styles.statLabel}>Total Tasks</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: '#10B981' }]}>
                {completedTasksCount}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: '#6366F1' }]}>
                {myRooms.length}
              </Text>
              <Text style={styles.statLabel}>Rooms</Text>
            </View>
          </View>

          <View style={styles.syncRow}>
            <View style={styles.syncStatusLeft}>
              <View
                style={[
                  styles.syncIndicator,
                  { backgroundColor: isSimulatedOffline ? '#EF4444' : '#10B981' },
                ]}
              />
              <View>
                <Text style={styles.syncStatusTitle}>
                  {isSimulatedOffline ? 'Simulated Offline Mode' : 'Live Cloud Connected'}
                </Text>
                <Text style={styles.syncStatusSub}>
                  {isSimulatedOffline
                    ? 'Mutations safely queue locally'
                    : 'Real-time WebSockets & Delta Protocol active'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.toggleOfflineBtn,
                isSimulatedOffline && styles.toggleOfflineBtnActive,
              ]}
              onPress={onToggleOffline}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.toggleOfflineText,
                  isSimulatedOffline && styles.toggleOfflineTextActive,
                ]}
              >
                {isSimulatedOffline ? 'Go Online' : 'Simulate Offline'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.benchmarksNavBtn}
            onPress={onOpenBenchmarks}
            activeOpacity={0.8}
          >
            <Text style={styles.benchmarksNavText}>⚡ Open Engine Benchmarks & Latency</Text>
          </TouchableOpacity>
        </View>

        {/* Mobile Testing & Environment Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>DEVICE & TESTING INFO</Text>

          <View style={styles.envInfoRow}>
            <Text style={styles.envKey}>Current Platform:</Text>
            <Text style={styles.envValue}>
              {Platform.OS === 'web' ? '🌐 Web Browser' : `📱 ${Platform.OS.toUpperCase()}`}
            </Text>
          </View>

          <View style={styles.envInfoRow}>
            <Text style={styles.envKey}>Backend Server:</Text>
            <Text style={[styles.envValue, { fontSize: 11 }]}>{BACKEND_URL}</Text>
          </View>

          <View style={styles.envInfoRow}>
            <Text style={styles.envKey}>Mobile Testing:</Text>
            <Text style={[styles.envValue, { color: '#10B981' }]}>
              ✓ Expo Go Ready (Scan QR)
            </Text>
          </View>

          <View style={styles.envInfoRow}>
            <Text style={styles.envKey}>App Version:</Text>
            <Text style={styles.envValue}>TaskFlow v1.0.0 Clean Slate</Text>
          </View>
        </View>

        {/* Log Out Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={onLogout}
          activeOpacity={0.85}
        >
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Log Out of TaskFlow</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2A246B',
  },
  header: {
    backgroundColor: '#2A246B',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  circleBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBackArrow: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F2F5FC',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 36,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  userHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.85)',
    shadowColor: '#5B4FC4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 14,
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: '#5B4FC4',
  },
  googleBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  googleBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  verifiedPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  verifiedPillText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  rolePill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  rolePillText: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.85)',
    shadowColor: '#5B4FC4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  cardMainTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  onlinePillText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  roomCodeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  roomCodeInfo: {
    flex: 1,
  },
  roomCodeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  roomCodeValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4F46E5',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  noRoomText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  copyBtn: {
    backgroundColor: '#5B4FC4',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  privacyNote: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 14,
  },
  roomActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roomActionBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roomActionBtnPrimary: {
    backgroundColor: '#5B4FC4',
    borderColor: '#5B4FC4',
  },
  roomActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  roomActionBtnPrimaryText: {
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  syncStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  syncIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  syncStatusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  syncStatusSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  toggleOfflineBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  toggleOfflineBtnActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  toggleOfflineText: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '700',
  },
  toggleOfflineTextActive: {
    color: '#DC2626',
  },
  benchmarksNavBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  benchmarksNavText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  envInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  envKey: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  envValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 4,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  logoutIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '800',
  },
});
