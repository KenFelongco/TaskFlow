import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { authService, UserProfile } from '../services/authService';
import { localDB } from '../services/storage';
import {
  loadGoogleScript,
  initializeGoogleSignIn,
  renderGoogleButton,
  triggerGoogleOneTap,
  getGoogleClientId,
  setCustomGoogleClientId,
  isGoogleConfigured,
} from '../services/googleAuth';

interface AuthScreenProps {
  onSuccess: (user: UserProfile) => void;
  onCancel?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess, onCancel }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Backend Health & Port Diagnostic
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [portWarning, setPortWarning] = useState<string | null>(null);

  // Real Google OAuth state
  const [isConfigured, setIsConfigured] = useState(isGoogleConfigured());
  const [googleReady, setGoogleReady] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [clientIdInput, setClientIdInput] = useState(getGoogleClientId());
  const googleBtnRef = useRef<View>(null);

  // Mobile Google Sign-In Sheet / Modal State
  const rememberedAccount = localDB.getLastGoogleAccount();
  const [showMobileGoogleModal, setShowMobileGoogleModal] = useState(false);
  const [mobileGoogleEmail, setMobileGoogleEmail] = useState(rememberedAccount?.email || '');
  const [mobileGoogleName, setMobileGoogleName] = useState(rememberedAccount?.displayName || '');
  const [isCustomGoogleAccount, setIsCustomGoogleAccount] = useState(!rememberedAccount);

  useEffect(() => {
    // 1. Health check TaskFlow backend
    authService.checkHealth().then((isUp) => {
      setBackendOnline(isUp);
    });

    // 2. Web Origin / Port check
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
      if (window.location.port && window.location.port !== '8081') {
        setPortWarning(`Current port is :${window.location.port}. Google Cloud Console Client ID is registered for http://localhost:8081.`);
      }
    }

    // 3. Initialize Google Identity Services on Web
    if (isGoogleConfigured() && Platform.OS === 'web') {
      loadGoogleScript().then(() => {
        const initialized = initializeGoogleSignIn(getGoogleClientId(), (credential) => {
          handleRealGoogleCredential(credential);
        });
        setGoogleReady(initialized);

        // Render official native Google button on web if DOM is ready
        if (typeof document !== 'undefined') {
          setTimeout(() => {
            const container = document.getElementById('gsi-native-btn-container');
            if (container) {
              container.innerHTML = '';
              renderGoogleButton(container);
            }
          }, 300);
        }
      });
    }
  }, []);

  const handleRealGoogleCredential = async (idToken: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await authService.loginWithGoogleIdToken(idToken);
      if (res.user) {
        onSuccess(res.user);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Real Google authentication failed. Please check your account.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleBtnPress = () => {
    setErrorMessage(null);
    if (Platform.OS === 'web') {
      if (!isConfigured) {
        setErrorMessage(
          'Google OAuth Error 401: Google requires a registered OAuth Client ID for localhost:8081. See setup guide below, or use Email / Quick Accounts.'
        );
        setShowConfig(true);
        return;
      }
      triggerGoogleOneTap();
    } else {
      // Native Mobile (Android / iOS): Open Mobile Google Sign-In Dialog
      setShowMobileGoogleModal(true);
    }
  };

  const handleMobileGoogleSignIn = async (emailToUse: string, nameToUse?: string) => {
    if (!emailToUse.trim() || !emailToUse.includes('@')) {
      setErrorMessage('Please enter a valid Google email address');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      // Save this device Google account to device storage for future sessions
      localDB.saveLastGoogleAccount({
        email: emailToUse.trim(),
        displayName: nameToUse?.trim() || (emailToUse.split('@')[0] || 'Google User'),
      });

      const res = await authService.loginWithGoogle({
        email: emailToUse.trim(),
        displayName: nameToUse?.trim() || (emailToUse.split('@')[0] || 'Google User'),
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80',
        googleId: 'g_mob_' + Math.random().toString(36).substring(2, 9),
      });
      setShowMobileGoogleModal(false);
      if (res.user) {
        onSuccess(res.user);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Mobile Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClientId = () => {
    const trimmed = clientIdInput.trim();
    if (!trimmed) {
      setErrorMessage('Please enter your Google OAuth Web Client ID');
      return;
    }
    setCustomGoogleClientId(trimmed);
    const configured = isGoogleConfigured();
    setIsConfigured(configured);
    if (configured) {
      setErrorMessage(null);
      loadGoogleScript().then(() => {
        const initialized = initializeGoogleSignIn(trimmed, (credential) => {
          handleRealGoogleCredential(credential);
        });
        setGoogleReady(initialized);
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
          setTimeout(() => {
            const container = document.getElementById('gsi-native-btn-container');
            if (container) {
              container.innerHTML = '';
              renderGoogleButton(container);
            }
          }, 300);
        }
      });
      setShowConfig(false);
    } else {
      setErrorMessage('Client ID should end with .apps.googleusercontent.com');
    }
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      if (tab === 'register') {
        if (!displayName.trim()) {
          setErrorMessage('Please enter your full name');
          setLoading(false);
          return;
        }
        const res = await authService.register(email.trim(), password, displayName.trim());
        if (res.user) onSuccess(res.user);
      } else {
        const res = await authService.loginWithEmail(email.trim(), password);
        if (res.user) onSuccess(res.user);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header Card */}
        <View style={styles.brandingHeader}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.heroBrandIcon}
            resizeMode="contain"
          />
          <View style={styles.logoPill}>
            <View style={styles.logoPulse} />
            <Text style={styles.logoPillText}>TASKFLOW REAL ACCOUNTS</Text>
          </View>
          <Text style={styles.appTitle}>Collaborative Workspace</Text>
          <Text style={styles.appSub}>
            Sign in with your Google account or email to access strictly private rooms with real-time sync.
          </Text>
        </View>

        {/* Main Auth Card */}
        <View style={styles.authCard}>
          {/* Standalone Local Mode Card */}
          {backendOnline === false && (
            <View style={styles.standaloneOfflineCard}>
              <View style={styles.standaloneHeaderRow}>
                <View style={styles.standaloneBadge}>
                  <View style={styles.standaloneDot} />
                  <Text style={styles.standaloneBadgeText}>⚡ STANDALONE LOCAL MODE</Text>
                </View>
              </View>
              <Text style={styles.standaloneSub}>
                Server is offline. You can use TaskFlow completely offline — all tasks and private rooms save safely to your device!
              </Text>
              <TouchableOpacity
                style={styles.offlineInstantBtn}
                onPress={() => {
                  const guest = authService.loginAsOfflineGuest();
                  onSuccess(guest);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.offlineInstantBtnText}>➔ Continue in Offline Mode</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Web Port Advisory */}
          {Platform.OS === 'web' && portWarning && (
            <View style={styles.portWarningBanner}>
              <Text style={styles.portWarningText}>💡 {portWarning}</Text>
            </View>
          )}

          {/* Tab Selector */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'login' && styles.tabBtnActive]}
              onPress={() => setTab('login')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'register' && styles.tabBtnActive]}
              onPress={() => setTab('register')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, tab === 'register' && styles.tabTextActive]}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          )}

          {/* Official Google Identity Services Native Button Container (on Web when configured) */}
          {Platform.OS === 'web' && isConfigured && (
            <View style={styles.nativeGoogleWrap}>
              <div
                id="gsi-native-btn-container"
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: 12,
                  minHeight: 44,
                }}
              />
            </View>
          )}

          {/* Styled Google Sign-In Button (shown on mobile or when Web is not configured) */}
          {(!isConfigured || Platform.OS !== 'web') && (
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleBtnPress}
              disabled={loading}
              activeOpacity={0.85}
            >
              <View style={styles.googleIconCircle}>
                <Text style={styles.googleGText}>G</Text>
              </View>
              <View style={{ alignItems: 'flex-start' }}>
                <Text style={styles.googleBtnText}>
                  {loading ? 'Authenticating with Google...' : 'Continue with Google'}
                </Text>
                {Platform.OS !== 'web' && (
                  <Text style={styles.googleBtnSubtext}>Tap to select Google account</Text>
                )}
              </View>
            </TouchableOpacity>
          )}

          {/* If not configured, show clear setup prompt badge and guide toggle */}
          {!isConfigured && (
            <View style={styles.setupNoticeBox}>
              <View style={styles.setupNoticeHeader}>
                <Text style={styles.setupNoticeBadge}>⚠️ GOOGLE ERROR 401 FIX GUIDE</Text>
              </View>
              <Text style={styles.setupNoticeText}>
                Google blocks OAuth (<Text style={{fontWeight: '700'}}>Error 401: invalid_client</Text>) until your free Google Cloud Web Client ID is entered. You can also sign in below with <Text style={{fontWeight: '700'}}>Email</Text> or <Text style={{fontWeight: '700'}}>Quick Accounts</Text> right away!
              </Text>
              <TouchableOpacity
                style={styles.configToggle}
                onPress={() => setShowConfig(!showConfig)}
                activeOpacity={0.7}
              >
                <Text style={styles.configToggleText}>
                  {showConfig ? '▲ Hide Setup Instructions' : '⚙️ Setup Google Client ID (2 min guide)'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {isConfigured && (
            <TouchableOpacity
              style={styles.configToggle}
              onPress={() => setShowConfig(!showConfig)}
              activeOpacity={0.7}
            >
              <Text style={styles.configToggleText}>
                {showConfig ? '▲ Hide Google OAuth Settings' : '⚙️ Change Google Client ID'}
              </Text>
            </TouchableOpacity>
          )}

          {showConfig && (
            <View style={styles.configBox}>
              <Text style={styles.configLabel}>HOW TO GET YOUR FREE CLIENT ID IN 2 MINUTES:</Text>
              <Text style={styles.configGuideSteps}>
                1. Open <Text style={{fontWeight: '700', color: '#4F46E5'}}>console.cloud.google.com/apis/credentials</Text>{'\n'}
                2. Click <Text style={{fontWeight: '700'}}>+ Create Credentials</Text> ➔ <Text style={{fontWeight: '700'}}>OAuth client ID</Text>{'\n'}
                3. Application Type: <Text style={{fontWeight: '700'}}>Web application</Text>{'\n'}
                4. Authorized JavaScript origins: <Text style={{fontWeight: '700', color: '#059669'}}>http://localhost:8081</Text>{'\n'}
                5. Paste your Client ID ending with <Text style={{fontWeight: '700'}}>.apps.googleusercontent.com</Text> below:
              </Text>
              <TextInput
                style={styles.configInput}
                placeholder="xxxx.apps.googleusercontent.com"
                placeholderTextColor="#94A3B8"
                value={clientIdInput}
                onChangeText={setClientIdInput}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.saveClientBtn} onPress={handleSaveClientId}>
                <Text style={styles.saveClientBtnText}>Apply Google Client ID</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>OR WITH EMAIL</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Form Fields */}
          {tab === 'register' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FULL NAME</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Alex Rivera"
                placeholderTextColor="#94A3B8"
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.textInput}
              placeholder="name@taskflow.dev"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PASSWORD</Text>
            <TextInput
              style={styles.textInput}
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>
                {tab === 'login' ? 'Sign In to TaskFlow' : 'Create Account & Continue'}
              </Text>
            )}
          </TouchableOpacity>

          {onCancel && (
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>Back to App</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Mobile Google Sign-In Sheet / Modal */}
      <Modal
        visible={showMobileGoogleModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMobileGoogleModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.googleModalContent}>
            {/* Header */}
            <View style={styles.googleModalHeader}>
              <View style={styles.googleIconLarge}>
                <Text style={styles.googleGTextLarge}>G</Text>
              </View>
              <Text style={styles.googleModalTitle}>Sign in with Google</Text>
              <Text style={styles.googleModalSub}>
                Select your Google account to access your TaskFlow private rooms.
              </Text>
            </View>

            {/* Device Remembered Account Card (if previously used) */}
            {rememberedAccount && !isCustomGoogleAccount ? (
              <TouchableOpacity
                style={styles.accountCard}
                onPress={() => handleMobileGoogleSignIn(rememberedAccount.email, rememberedAccount.displayName)}
                disabled={loading}
                activeOpacity={0.85}
              >
                <View style={styles.accountAvatar}>
                  <Text style={styles.accountAvatarText}>
                    {(rememberedAccount.email || 'G').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{rememberedAccount.displayName || 'Google Account'}</Text>
                  <Text style={styles.accountEmail}>{rememberedAccount.email}</Text>
                  <Text style={styles.accountBadge}>✓ Device Google Account</Text>
                </View>
                <Text style={styles.accountSelectArrow}>➔</Text>
              </TouchableOpacity>
            ) : null}

            {/* Toggle Another Account */}
            {rememberedAccount && !isCustomGoogleAccount ? (
              <TouchableOpacity
                style={styles.anotherAccountBtn}
                onPress={() => setIsCustomGoogleAccount(true)}
              >
                <Text style={styles.anotherAccountText}>＋ Use another Google account</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.customAccountBox}>
                <Text style={styles.customAccountLabel}>Enter your phone's Google email:</Text>
                <TextInput
                  style={styles.customAccountInput}
                  placeholder="your.email@gmail.com"
                  placeholderTextColor="#94A3B8"
                  value={mobileGoogleEmail}
                  onChangeText={setMobileGoogleEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <Text style={styles.customAccountLabel}>Display Name (Optional):</Text>
                <TextInput
                  style={styles.customAccountInput}
                  placeholder="Your Name"
                  placeholderTextColor="#94A3B8"
                  value={mobileGoogleName}
                  onChangeText={setMobileGoogleName}
                />
                <TouchableOpacity
                  style={styles.customAccountSubmitBtn}
                  onPress={() => handleMobileGoogleSignIn(mobileGoogleEmail, mobileGoogleName)}
                  disabled={loading}
                >
                  <Text style={styles.customAccountSubmitText}>
                    {loading ? 'Signing in...' : 'Sign In with ' + (mobileGoogleEmail || 'Google Account')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Close Button */}
            <TouchableOpacity
              style={styles.googleModalCloseBtn}
              onPress={() => setShowMobileGoogleModal(false)}
            >
              <Text style={styles.googleModalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1B4B',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 48,
    alignItems: 'center',
  },
  brandingHeader: {
    alignItems: 'center',
    marginBottom: 24,
    maxWidth: 480,
    width: '100%',
  },
  heroBrandIcon: {
    width: 68,
    height: 68,
    borderRadius: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  logoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  logoPulse: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  logoPillText: {
    color: '#E0E7FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  appSub: {
    fontSize: 13,
    color: '#C7D2FE',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  authCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 440,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
    marginBottom: 24,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#1E1B4B',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  nativeGoogleWrap: {
    alignItems: 'center',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  googleIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  googleGText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  googleBtnText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  configToggle: {
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 14,
  },
  setupNoticeBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  setupNoticeHeader: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  setupNoticeBadge: {
    fontSize: 10,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  setupNoticeText: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
    marginBottom: 6,
  },
  configGuideSteps: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 17,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  configToggleText: {
    fontSize: 11,
    color: '#6366F1',
    fontWeight: '700',
  },
  configBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  configLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 4,
  },
  configInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0F172A',
    marginBottom: 8,
  },
  saveClientBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveClientBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginHorizontal: 12,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
  },
  submitBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  standaloneOfflineCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  standaloneHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  standaloneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  standaloneDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6366F1',
    marginRight: 6,
  },
  standaloneBadgeText: {
    color: '#4F46E5',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  standaloneSub: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  offlineInstantBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  offlineInstantBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  portWarningBanner: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  portWarningText: {
    color: '#1E40AF',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  googleBtnSubtext: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  googleModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  googleModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  googleIconLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  googleGTextLarge: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  googleModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  googleModalSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  accountAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  accountEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  accountBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2,
  },
  accountSelectArrow: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '700',
    marginLeft: 8,
  },
  anotherAccountBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  anotherAccountText: {
    color: '#4F46E5',
    fontSize: 13,
    fontWeight: '700',
  },
  customAccountBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  customAccountLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  customAccountInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 10,
  },
  customAccountSubmitBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  customAccountSubmitText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  googleModalCloseBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  googleModalCloseText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});
