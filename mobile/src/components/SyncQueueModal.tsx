import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { colors } from '../theme/colors';
import { SyncMutation } from '../types';

interface SyncQueueModalProps {
  visible: boolean;
  onClose: () => void;
  mutations: SyncMutation[];
  onSyncNow: () => void;
  onClearQueue: () => void;
}

export const SyncQueueModal: React.FC<SyncQueueModalProps> = ({
  visible,
  onClose,
  mutations,
  onSyncNow,
  onClearQueue,
}) => {
  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return colors.success;
      case 'UPDATE':
        return colors.info;
      case 'DELETE':
        return colors.danger;
      default:
        return colors.primary;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Offline Sync Queue</Text>
              <Text style={styles.headerSub}>
                {mutations.length} pending mutations awaiting backend flush
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {mutations.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>✨</Text>
                <Text style={styles.emptyTitle}>Queue is Clean</Text>
                <Text style={styles.emptyDesc}>
                  All local modifications have been synchronized with Cloud PostgreSQL.
                </Text>
              </View>
            ) : (
              mutations.map((m, idx) => {
                const actionColor = getActionColor(m.action);
                return (
                  <View key={m.id + '_' + idx} style={styles.itemCard}>
                    <View style={styles.itemTop}>
                      <View style={[styles.actionTag, { backgroundColor: actionColor + '20', borderColor: actionColor }]}>
                        <Text style={[styles.actionTagText, { color: actionColor }]}>{m.action}</Text>
                      </View>
                      <Text style={styles.entityType}>{m.entityType}</Text>
                      <Text style={styles.versionTag}>v{m.version}</Text>
                    </View>

                    <Text style={styles.entityId} numberOfLines={1}>
                      ID: {m.id}
                    </Text>

                    <Text style={styles.timestamp}>
                      Enqueued: {new Date(m.clientTimestamp).toLocaleTimeString()}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.footer}>
            {mutations.length > 0 && (
              <TouchableOpacity style={styles.clearBtn} onPress={onClearQueue}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.syncBtn} onPress={onSyncNow}>
              <Text style={styles.syncText}>Flush & Sync Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  scroll: {
    maxHeight: 320,
  },
  scrollContent: {
    gap: 8,
    paddingBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  itemCard: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  actionTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  entityType: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  versionTag: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 'auto',
  },
  entityId: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  timestamp: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  syncBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  syncText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
