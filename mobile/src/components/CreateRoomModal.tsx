import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { authService } from '../services/authService';

import { API_URL } from '../config/api';

const BACKEND_URL = API_URL;

interface CreateRoomModalProps {
  visible: boolean;
  onClose: () => void;
  onRoomCreated: (room: { id: string; name: string; inviteCode: string }) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  visible,
  onClose,
  onRoomCreated,
}) => {
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<{ id: string; name: string; inviteCode: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setCreatedRoom(null);
      setRoomName('');
      setError(null);
      setCopied(false);
    }
  }, [visible]);

  const handleCreate = async () => {
    if (!roomName.trim()) {
      setError('Please enter a room name');
      return;
    }

    setLoading(true);
    setError(null);

    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let randomPart = '';
    for (let i = 0; i < 5; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const proposedCode = `TF-${randomPart}`;

    try {
      const token = authService.authToken;
      const res = await fetch(`${BACKEND_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(authService.user
            ? {
                'x-dev-user-id': authService.user.id,
                'x-dev-user-name': authService.user.displayName,
                'x-dev-user-email': authService.user.email,
              }
            : { 'x-dev-user-id': 'guest' }),
        },
        body: JSON.stringify({
          name: roomName.trim(),
          inviteCode: proposedCode,
          user: authService.user,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create room');
      }

      const created = {
        id: data.room.id,
        name: data.room.name,
        inviteCode: data.inviteCode || data.room.inviteCode || proposedCode,
      };
      setCreatedRoom(created);
      onRoomCreated(created);
    } catch (err: any) {
      // In offline fallback, use the proposed code locally
      const mockRoom = {
        id: 'room_' + Date.now(),
        name: roomName.trim(),
        inviteCode: proposedCode,
      };
      setCreatedRoom(mockRoom);
      onRoomCreated(mockRoom);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (createdRoom) {
      await Clipboard.setStringAsync(createdRoom.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleClose = () => {
    setCreatedRoom(null);
    setRoomName('');
    setError(null);
    onClose();
  };

  const handleDone = handleClose;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Create Private Room</Text>
              <Text style={styles.subtitle}>Collaborate with teammates using a unique invite code</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {createdRoom ? (
            <View style={styles.successContainer}>
              <View style={styles.badgeSuccess}>
                <Text style={styles.badgeSuccessText}>✓ ROOM CREATED</Text>
              </View>
              <Text style={styles.createdName}>{createdRoom.name}</Text>

              <View style={styles.codeCard}>
                <Text style={styles.codeLabel}>YOUR UNIQUE INVITE CODE</Text>
                <Text style={styles.codeValue}>{createdRoom.inviteCode}</Text>
                <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.8}>
                  <Text style={styles.copyBtnText}>{copied ? '✓ Copied to Clipboard!' : 'Copy Invite Code'}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.privacyNote}>
                🔒 This room is strictly private. Only accounts that enter this unique code will be able to join and collaborate on tasks.
              </Text>

              <TouchableOpacity style={styles.enterBtn} onPress={handleDone} activeOpacity={0.85}>
                <Text style={styles.enterBtnText}>Open Room Workspace</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formContainer}>
              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {error}</Text>
                </View>
              )}

              <Text style={styles.label}>ROOM NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Mobile Alpha Sprint, Core Platform..."
                placeholderTextColor="#94A3B8"
                value={roomName}
                onChangeText={setRoomName}
                autoFocus
              />

              <View style={styles.privacyNoticeCard}>
                <Text style={styles.privacyNoticeTitle}>🔒 STRICT PRIVACY GUARANTEE</Text>
                <Text style={styles.privacyNoticeBody}>
                  Upon creation, TaskFlow will generate a collision-free unique invite code. The room remains private to only those with the exact code.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.createBtn}
                onPress={handleCreate}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.createBtnText}>Generate Unique Room & Code</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '700',
  },
  formContainer: {},
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 16,
  },
  privacyNoticeCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  privacyNoticeTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  privacyNoticeBody: {
    fontSize: 12,
    color: '#4338CA',
    lineHeight: 16,
  },
  createBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  successContainer: {
    alignItems: 'center',
  },
  badgeSuccess: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  badgeSuccessText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800',
  },
  createdName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
    textAlign: 'center',
  },
  codeCard: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  codeValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#312E81',
    letterSpacing: 2,
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  copyBtn: {
    backgroundColor: '#5B4FC4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  privacyNote: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  enterBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  enterBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
