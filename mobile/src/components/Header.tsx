import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { NetworkStatus } from '../types';
import { UserProfile } from '../services/authService';

interface HeaderProps {
  networkStatus: NetworkStatus;
  isSimulatedOffline: boolean;
  pendingMutationCount: number;
  currentRoomCode: string;
  currentRoomName?: string;
  currentUser?: UserProfile | null;
  onlineMemberCount: number;
  onOpenRoomModal: () => void;
  onToggleOffline: () => void;
  onSyncPress: () => void;
  onOpenQueue: () => void;
  onAddTaskPress: () => void;
  onOpenProfileModal: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  networkStatus,
  isSimulatedOffline,
  pendingMutationCount,
  currentRoomCode,
  currentRoomName = 'Private Sprint',
  currentUser,
  onlineMemberCount,
  onOpenRoomModal,
  onOpenQueue,
  onAddTaskPress,
  onOpenProfileModal,
}) => {
  const isOffline = networkStatus === 'offline' || isSimulatedOffline;
  const isSyncing = networkStatus === 'syncing';

  return (
    <View style={styles.container}>
      {/* Brand Header Row */}
      <View style={styles.brandRow}>
        <View style={styles.brandLeft}>
          <View style={styles.logoBadge}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text style={styles.brandTitle}>TaskFlow</Text>
            <Text style={styles.brandSubtitle}>
              {currentUser ? `Hello, ${currentUser.displayName.split(' ')[0]}` : 'Offline-First Engine'}
            </Text>
          </View>
        </View>

        {/* User Profile Avatar */}
        <TouchableOpacity style={styles.avatarWrap} onPress={onOpenProfileModal} activeOpacity={0.8}>
          <Image
            source={{
              uri:
                currentUser?.avatarUrl ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
            }}
            style={styles.avatarImage}
          />
          <View style={styles.avatarOnlineDot} />
        </TouchableOpacity>
      </View>

      {/* Live Online Private Room Pill Bar */}
      <TouchableOpacity
        style={styles.roomPillBar}
        onPress={onOpenRoomModal}
        activeOpacity={0.85}
      >
        <View style={styles.roomLeft}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.roomNameText} numberOfLines={1}>
            {currentRoomName}
          </Text>
          <View style={styles.codeTag}>
            <Text style={styles.roomCodeText}>{currentRoomCode}</Text>
          </View>
          <Text style={styles.roomMembersText}>• {onlineMemberCount} Online</Text>
        </View>
        <Text style={styles.roomChangeAction}>Invite / Rooms ›</Text>
      </TouchableOpacity>

      {/* Glassy Sync Banner matching mockup */}
      <TouchableOpacity
        style={styles.syncBanner}
        onPress={onOpenQueue}
        activeOpacity={0.85}
      >
        <View style={styles.syncLeft}>
          <View style={styles.cloudIconBox}>
            <Text style={styles.cloudIcon}>☁️</Text>
          </View>
          <View>
            <Text style={styles.syncTitle}>
              {isSyncing ? 'Syncing...' : isOffline ? 'Offline Mode' : 'Cloud Connected'}
            </Text>
            <Text style={styles.syncSubtitle}>
              {isOffline && pendingMutationCount > 0
                ? `${pendingMutationCount} changes will sync when online`
                : 'Offline changes will sync when online'}
            </Text>
          </View>
        </View>

        <View style={styles.syncRight}>
          <Text style={styles.syncChevron}>›</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2A246B',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  brandSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
    fontWeight: '500',
  },
  avatarWrap: {
    position: 'relative',
    padding: 2,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#3D358E',
  },
  avatarOnlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#2A246B',
  },
  roomPillBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  roomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  lockIcon: {
    fontSize: 11,
    marginRight: 5,
  },
  roomNameText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 110,
    marginRight: 6,
  },
  codeTag: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
  },
  roomCodeText: {
    color: '#E0E7FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
  roomMembersText: {
    color: '#A5B4FC',
    fontSize: 11,
    fontWeight: '600',
  },
  roomChangeAction: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  syncLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cloudIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cloudIcon: {
    fontSize: 18,
  },
  syncTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  syncSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
  },
  syncRight: {
    paddingLeft: 8,
  },
  syncChevron: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '800',
  },
});
