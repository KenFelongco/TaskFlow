import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
} from 'react-native';
import { UserProfile } from '../services/authService';

interface UserProfileModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  currentRoomCode: string;
  currentRoomName?: string;
  myRooms?: Array<{ id: string; name: string; inviteCode: string; role?: string }>;
  onLogout: () => void;
  onOpenAuth?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  visible,
  onClose,
  currentUser,
  currentRoomCode,
  currentRoomName = 'Private Sprint',
  myRooms = [],
  onLogout,
  onOpenAuth,
}) => {
  if (!currentUser) return null;

  const isGoogle = currentUser.email.includes('@gmail.com') || (currentUser as any).googleId;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Account Profile</Text>
              <Text style={styles.headerSub}>Manage your session & workspaces</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* User Profile Card */}
            <View style={styles.profileCard}>
              <View style={styles.avatarWrap}>
                <Image
                  source={{
                    uri:
                      currentUser.avatarUrl ||
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

              <Text style={styles.displayName}>{currentUser.displayName}</Text>
              <Text style={styles.emailText}>{currentUser.email}</Text>

              <View style={styles.tagRow}>
                <View style={styles.verifiedTag}>
                  <Text style={styles.verifiedTagText}>✓ Verified Account</Text>
                </View>
                <View style={styles.roleTag}>
                  <Text style={styles.roleTagText}>{isGoogle ? 'Google Account' : 'TaskFlow Member'}</Text>
                </View>
              </View>
            </View>

            {/* Active Workspace Info */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>CURRENT ACTIVE ROOM</Text>
              <View style={styles.roomBox}>
                <View style={styles.roomLeft}>
                  <Text style={styles.lockIcon}>🔒</Text>
                  <View>
                    <Text style={styles.roomName}>{currentRoomName}</Text>
                    <Text style={styles.roomCode}>{currentRoomCode}</Text>
                  </View>
                </View>
                <View style={styles.roomPill}>
                  <Text style={styles.roomPillText}>Active</Text>
                </View>
              </View>
            </View>

            {/* Rooms Count */}
            {myRooms && myRooms.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>MY PRIVATE ROOMS ({myRooms.length})</Text>
                {myRooms.map((r) => (
                  <View key={r.id || r.inviteCode} style={styles.roomItem}>
                    <Text style={styles.roomItemName}>{r.name}</Text>
                    <Text style={styles.roomItemCode}>{r.inviteCode}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Actions: Switch Account & Log Out */}
            <View style={styles.actionSection}>
              {onOpenAuth && (
                <TouchableOpacity
                  style={styles.switchBtn}
                  onPress={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.switchBtnText}>Switch / Add Account</Text>
                </TouchableOpacity>
              )}

              {/* Real Log Out Button */}
              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={() => {
                  onClose();
                  onLogout();
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.logoutIcon}>🚪</Text>
                <Text style={styles.logoutBtnText}>Log Out of TaskFlow</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '700',
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  googleBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  googleBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  displayName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  emailText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 10,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
  },
  verifiedTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedTagText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  roleTag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleTagText: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '700',
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  roomBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  roomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 14,
    marginRight: 10,
  },
  roomName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  roomCode: {
    fontSize: 11,
    color: '#4F46E5',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  roomPill: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roomPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  roomItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    marginBottom: 6,
  },
  roomItemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  roomItemCode: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#64748B',
  },
  actionSection: {
    marginTop: 10,
    gap: 10,
    marginBottom: 10,
  },
  switchBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  switchBtnText: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutIcon: {
    marginRight: 8,
    fontSize: 15,
  },
  logoutBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '800',
  },
});
