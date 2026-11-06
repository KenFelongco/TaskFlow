import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { TeamMember } from '../types';
import { UserProfile } from '../services/authService';

interface RoomItem {
  id: string;
  name: string;
  inviteCode: string;
  role?: string;
  memberCount?: number;
}

interface RoomModalProps {
  visible: boolean;
  onClose: () => void;
  currentRoomCode: string;
  currentRoomName?: string;
  myRooms?: RoomItem[];
  onlineMembers: TeamMember[];
  onSelectRoom: (code: string, roomName?: string) => void;
  onOpenCreateRoom: () => void;
  onOpenJoinRoom: () => void;
  onOpenAuth: () => void;
  onLogout?: () => void;
  currentUser?: UserProfile | null;
}

export const RoomModal: React.FC<RoomModalProps> = ({
  visible,
  onClose,
  currentRoomCode,
  currentRoomName = 'Mobile Core Sprint',
  myRooms = [],
  onlineMembers,
  onSelectRoom,
  onOpenCreateRoom,
  onOpenJoinRoom,
  onOpenAuth,
  onLogout,
  currentUser,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (currentRoomCode) {
      await Clipboard.setStringAsync(currentRoomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Private Collaboration Room</Text>
              <Text style={styles.headerSub}>Strict invite-only workspace with real-time sync</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Active Room Card */}
            <View style={styles.roomCodeCard}>
              <View style={styles.cardTopRow}>
                <View style={styles.lockBadge}>
                  <Text style={styles.lockBadgeText}>🔒 PRIVATE ROOM</Text>
                </View>
                <Text style={styles.roomNameText}>{currentRoomName}</Text>
              </View>

              <View style={styles.codeRow}>
                <View>
                  <Text style={styles.codeSub}>UNIQUE INVITE CODE</Text>
                  <Text style={styles.codeText}>{currentRoomCode}</Text>
                </View>
                <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.8}>
                  <Text style={styles.copyBtnText}>{copied ? '✓ Copied!' : 'Copy Code'}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.shareHint}>
                Share this unique code with teammates. Only users with this code can enter and view tasks.
              </Text>
            </View>

            {/* Quick Actions: Create & Join */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => {
                  onClose();
                  onOpenCreateRoom();
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.actionBtnPrimaryText}>＋ Create Room</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnSecondary}
                onPress={() => {
                  onClose();
                  onOpenJoinRoom();
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.actionBtnSecondaryText}>🔑 Enter Code</Text>
              </TouchableOpacity>
            </View>

            {/* My Joined Private Rooms */}
            {myRooms && myRooms.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>MY PRIVATE ROOMS</Text>
                {myRooms.map((r) => {
                  const isActive = r.inviteCode === currentRoomCode;
                  return (
                    <TouchableOpacity
                      key={r.id || r.inviteCode}
                      style={[styles.roomCardItem, isActive && styles.roomCardItemActive]}
                      onPress={() => {
                        if (!isActive) {
                          onSelectRoom(r.inviteCode, r.name);
                          onClose();
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.roomCardItemLeft}>
                        <View style={[styles.roomDot, isActive && styles.roomDotActive]} />
                        <View>
                          <Text style={[styles.roomItemName, isActive && styles.roomItemNameActive]}>
                            {r.name}
                          </Text>
                          <Text style={styles.roomItemCode}>{r.inviteCode}</Text>
                        </View>
                      </View>
                      {isActive ? (
                        <View style={styles.activePill}>
                          <Text style={styles.activePillText}>Active</Text>
                        </View>
                      ) : (
                        <Text style={styles.switchText}>Switch →</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Online Members in Active Room */}
            <View style={styles.section}>
              <View style={styles.membersHeader}>
                <Text style={styles.sectionTitle}>MEMBERS IN THIS ROOM</Text>
                <View style={styles.onlineBadge}>
                  <View style={styles.greenPulse} />
                  <Text style={styles.onlineBadgeText}>{onlineMembers.length} Active</Text>
                </View>
              </View>

              <View style={styles.membersList}>
                {onlineMembers.map((member) => (
                  <View key={member.id} style={styles.memberRow}>
                    <View style={styles.avatarWrap}>
                      <Image source={{ uri: member.avatarUrl }} style={styles.memberAvatar} />
                      <View style={styles.onlineDot} />
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={styles.memberRole}>{member.role}</Text>
                    </View>
                    <View style={styles.connectedPill}>
                      <Text style={styles.connectedText}>Connected</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Current Account Card */}
            {currentUser && (
              <View style={styles.userSection}>
                <View style={styles.userCard}>
                  <Image source={{ uri: currentUser.avatarUrl }} style={styles.userAvatar} />
                  <View style={styles.userInfo}>
                    <Text style={styles.userDisplayName}>{currentUser.displayName}</Text>
                    <Text style={styles.userEmail}>{currentUser.email}</Text>
                  </View>
                  <View style={styles.userActionBtns}>
                    <TouchableOpacity
                      style={styles.switchAccountBtn}
                      onPress={() => {
                        onClose();
                        onOpenAuth();
                      }}
                    >
                      <Text style={styles.switchAccountText}>Switch</Text>
                    </TouchableOpacity>

                    {onLogout && (
                      <TouchableOpacity
                        style={styles.roomLogoutBtn}
                        onPress={() => {
                          onClose();
                          onLogout();
                        }}
                      >
                        <Text style={styles.roomLogoutText}>Log Out</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
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
  roomCodeCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  lockBadge: {
    backgroundColor: '#4338CA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  lockBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  roomNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E1B4B',
    flex: 1,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeSub: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 0.5,
  },
  codeText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#312E81',
    letterSpacing: 1.5,
    fontFamily: 'monospace',
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
  shareHint: {
    fontSize: 12,
    color: '#4338CA',
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  actionBtnSecondary: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionBtnSecondaryText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  roomCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roomCardItemActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  roomCardItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94A3B8',
    marginRight: 10,
  },
  roomDotActive: {
    backgroundColor: '#4F46E5',
  },
  roomItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  roomItemNameActive: {
    color: '#312E81',
  },
  roomItemCode: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  activePill: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  switchText: {
    color: '#6366F1',
    fontSize: 12,
    fontWeight: '700',
  },
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  greenPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  onlineBadgeText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  membersList: {
    gap: 6,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 10,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  memberRole: {
    fontSize: 11,
    color: '#64748B',
  },
  connectedPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  connectedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  userSection: {
    marginBottom: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 10,
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
  },
  userInfo: {
    flex: 1,
  },
  userDisplayName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  userEmail: {
    fontSize: 11,
    color: '#64748B',
  },
  userActionBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  switchAccountBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  switchAccountText: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '700',
  },
  roomLogoutBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  roomLogoutText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '800',
  },
  doneBtn: {
    backgroundColor: '#5B4FC4',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
