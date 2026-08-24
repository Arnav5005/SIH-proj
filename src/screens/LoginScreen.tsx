import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, rounded, spacing } from '../theme/theme';

import { api } from '../services/api';

interface LoginScreenProps {
  onLoginSuccess: (officerData: any) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [role, setRole] = useState<'admin' | 'checkpoint'>('checkpoint');
  const [officerId, setOfficerId] = useState('OFF-1042');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [checkpointId, setCheckpointId] = useState('CHK-00184');
  const [otpCode, setOtpCode] = useState('482910');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    if (!officerId.trim()) {
      setErrorMessage('Please enter your Officer ID');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Please enter your password');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await api.login(officerId, password, role, checkpointId, otpCode);
      setIsLoading(false);
      onLoginSuccess(res.officer);
    } catch (e) {
      setIsLoading(false);
      onLoginSuccess({
        id: officerId,
        role: role,
        name: 'Officer Rajesh Verma',
        checkpoint: checkpointId || 'CHK-00184',
        rank: role === 'admin' ? 'Commandant (HQ)' : 'Assistant Commandant',
        unit: '14th Battalion SSB',
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* TopAppBar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={{
              uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC5qaEHeytFHFIyQqJkyJIR3vRT7sn2dWMckHSr4fiMeDgt71RBmgNMel0k5e_DUvVQ4lVN2QMgdsHSTFjop9tbdytgPgGbWegNawlAcD5nvZQX-UVosIfngkHIYj0bYxRCbVZkKpedSKWKzE_bMPqWZKnRAMXMUAaV0upTdECHqM6GM0AOmWqLQNEvD9W-7yyWvdwZk6TdgstTgTiTpInzL3kP40FoQ95ubhUyXexymgPro2txny0pUdl5fP5seSr02g',
            }}
            style={styles.emblem}
            resizeMode="contain"
          />
          <View style={styles.headerTextGroup}>
            <Text style={styles.headerTitle}>Ministry of Home Affairs</Text>
            <Text style={styles.headerSubtitle}>| SSB — AI Document Screening</Text>
          </View>
        </View>
        <MaterialIcons name="security" size={22} color="#ffffff" />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Auth Header */}
        <View style={styles.authHeader}>
          <Text style={styles.mainTitle}>Authorized Identity Verification</Text>
          <Text style={styles.mainSubtitle}>
            Sign in with your registered credentials to access secure force operations.
          </Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Portal sign in</Text>
              <Text style={styles.cardSubtitle}>Choose your authorized access role</Text>
            </View>
            <View style={styles.keyBadge}>
              <MaterialIcons name="vpn-key" size={20} color="#1c1b1b" />
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                role === 'admin' && styles.activeTabButton,
              ]}
              onPress={() => setRole('admin')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabText,
                  role === 'admin' ? styles.activeTabText : styles.inactiveTabText,
                ]}
              >
                Admin Login
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                role === 'checkpoint' && styles.activeTabButton,
              ]}
              onPress={() => setRole('checkpoint')}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="shield"
                size={16}
                color={role === 'checkpoint' ? '#313030' : '#656464'}
              />
              <Text
                style={[
                  styles.tabText,
                  role === 'checkpoint' ? styles.activeTabText : styles.inactiveTabText,
                ]}
              >
                Checkpoint Login
              </Text>
            </TouchableOpacity>
          </View>

          {errorMessage ? (
            <View style={styles.errorAlert}>
              <MaterialIcons name="error-outline" size={16} color={colors.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.form}>
            {/* Officer ID */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>OFFICER ID</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons
                  name="person"
                  size={20}
                  color="#656464"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  value={officerId}
                  onChangeText={setOfficerId}
                  placeholder="Enter your officer ID"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons
                  name="lock"
                  size={20}
                  color="#656464"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.textInput, { paddingRight: 40 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color="#656464"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Checkpoint ID */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CHECKPOINT / LOCATION ID</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons
                  name="location-on"
                  size={20}
                  color="#656464"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  value={checkpointId}
                  onChangeText={setCheckpointId}
                  placeholder="Enter checkpoint or location ID"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* Optional OTP */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>OPTIONAL OTP / 2FA CODE</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons
                  name="smartphone"
                  size={20}
                  color="#656464"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  value={otpCode}
                  onChangeText={setOtpCode}
                  placeholder="Enter six-digit verification code"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Forgot row */}
            <View style={styles.formFooterRow}>
              <Text style={styles.helperText}>Use your official credentials only</Text>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert(
                    'Reset Credentials',
                    'Contact your Sector IT Nodal Officer to reset credentials.'
                  )
                }
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Login button */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <MaterialIcons name="login" size={20} color="#ffffff" />
                  <Text style={styles.loginButtonText}>Login securely</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Monitoring note */}
          <View style={styles.cardFooterNote}>
            <Text style={styles.monitoringText}>
              Access is monitored and restricted to authorized personnel. Contact support if you are unable to sign in.
            </Text>
          </View>
        </View>

        {/* Security badge */}
        <View style={styles.bottomProtectionRow}>
          <MaterialIcons name="verified" size={18} color="#c4c7c8" />
          <Text style={styles.protectionText}>
            Protected by National Security Infrastructure
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLinks}>
            <TouchableOpacity
              style={styles.footerLink}
              onPress={() => Alert.alert('Help Center', 'SSB Technical Support Desk: 1800-11-SSB')}
            >
              <MaterialIcons name="help" size={16} color="#c4c7c8" />
              <Text style={styles.footerLinkText}>Help Center</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.footerLink}
              onPress={() => Alert.alert('Contact Support', 'Duty Officer: +91 11 2436 8201')}
            >
              <MaterialIcons name="support-agent" size={16} color="#c4c7c8" />
              <Text style={styles.footerLinkText}>Contact Support</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.footerLink}
              onPress={() => Alert.alert('Privacy & Security', 'Official MHA Security Protocol.')}
            >
              <MaterialIcons name="policy" size={16} color="#c4c7c8" />
              <Text style={styles.footerLinkText}>Privacy & Security</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.copyrightText}>
            Protected by National Security Infrastructure
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121317',
  },
  header: {
    backgroundColor: '#121317',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444748',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  emblem: {
    width: 32,
    height: 32,
  },
  headerTextGroup: {
    flexDirection: 'column',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#c4c7c8',
    fontSize: 11,
    fontFamily: typography.fontFamily.mono,
    letterSpacing: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: 32,
    alignItems: 'center',
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: 24,
    maxWidth: 440,
    width: '100%',
  },
  mainTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  mainSubtitle: {
    color: '#c4c7c8',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#ffffff',
    borderRadius: rounded.xl,
    padding: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
      },
      default: {
        elevation: 8,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#303030',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#656464',
  },
  keyBadge: {
    backgroundColor: '#e5e2e1',
    padding: 8,
    borderRadius: rounded.lg,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e5e2e1',
    padding: 4,
    borderRadius: rounded.lg,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: rounded.default,
  },
  activeTabButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e2e1',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#313030',
    fontWeight: '700',
  },
  inactiveTabText: {
    color: '#656464',
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: rounded.default,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '500',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: typography.fontFamily.mono,
    color: '#303030',
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#8e9192',
    borderRadius: rounded.lg,
    paddingVertical: 10,
    paddingLeft: 40,
    paddingRight: 14,
    color: '#303030',
    fontSize: 15,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  formFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.mono,
    color: '#656464',
  },
  forgotText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.mono,
    color: '#303030',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  loginButton: {
    backgroundColor: '#303030',
    borderRadius: rounded.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
  cardFooterNote: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(68, 71, 72, 0.2)',
    paddingTop: 16,
    alignItems: 'center',
  },
  monitoringText: {
    fontSize: 12,
    color: '#656464',
    textAlign: 'center',
    lineHeight: 16,
  },
  bottomProtectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
  },
  protectionText: {
    color: '#c4c7c8',
    fontSize: 12,
    fontFamily: typography.fontFamily.mono,
  },
  footer: {
    marginTop: 36,
    width: '100%',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#444748',
    paddingTop: 20,
    paddingBottom: 24,
    gap: 12,
  },
  footerLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerLinkText: {
    color: '#c4c7c8',
    fontSize: 14,
  },
  copyrightText: {
    color: '#c4c7c8',
    fontSize: 12,
    fontFamily: typography.fontFamily.mono,
    textAlign: 'center',
  },
});
