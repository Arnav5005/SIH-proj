import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ImageStyle,
  ViewStyle,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getTheme, typography, rounded, spacing } from '../theme/theme';
import { ScreeningRecord } from '../types';

interface VerificationResultScreenProps {
  onBack: () => void;
  onAccept: (record: ScreeningRecord) => void;
  onDeny: (record: ScreeningRecord) => void;
  onNewVerification: () => void;
  record?: ScreeningRecord | null;
  isDark?: boolean;
}

export const VerificationResultScreen: React.FC<VerificationResultScreenProps> = ({
  onBack,
  onAccept,
  onDeny,
  onNewVerification,
  record,
  isDark = false,
}) => {
  const theme = getTheme(isDark);

  const fallbackRecord: ScreeningRecord = {
    id: 'VF-20481',
    name: 'Pending Subject',
    docType: 'Passport',
    docNumber: 'P8742031',
    status: 'NEEDS_REVIEW',
    timestamp: 'Just now',
    checkpointId: 'CHK-00184',
    officerId: 'OFF-1042',
    gender: 'M',
    dob: '12 Mar 1992',
    address: 'Transit Checkpoint',
    nationality: 'Unverified',
    matchScore: 0.0,
    ocrConfidence: 95.0,
    securityChecks: {
      hologramDetected: true,
      tamperingDetected: false,
      watchlistMatch: false,
      biometricMatch: false,
    },
    notes: 'Awaiting biometric verification results.',
  };

  const resultRecord = record || fallbackRecord;
  const isVerified = resultRecord.status === 'VERIFIED';
  const isHighRisk = resultRecord.status === 'HIGH_RISK';
  const isMismatch = resultRecord.status === 'MISMATCH';

  // Avatar Initials
  const initials = resultRecord.name
    ? resultRecord.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'AM';

  const handleAccept = () => {
    onAccept(resultRecord);
    Alert.alert(
      'Verification Accepted',
      `${resultRecord.name} (${resultRecord.id}) has been verified and approved for transit.`
    );
  };

  const handleDeny = () => {
    const deniedRecord: ScreeningRecord = {
      ...resultRecord,
      status: 'MISMATCH',
      notes: 'Verification denied by checkpoint officer.',
    };
    onDeny(deniedRecord);
    Alert.alert(
      'Verification Denied',
      `${resultRecord.name} (${resultRecord.id}) transit clearance has been denied.`
    );
  };

  const handleDownload = () => {
    Alert.alert(
      'Download Report',
      `Screening Audit Report (${resultRecord.id}.pdf) downloaded to device.`
    );
  };

  return (
    <View style={[styles.outerContainer, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.headerBorder }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Image
            source={{
              uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB62V0fU7VgX8Xcz8VzEmzn79m5m7udDvklvcajtLtgCQTQ9ErYO24i4jo_lDulzw5AIhLEHh0j7cJSLEEPYTo_A2w10QudGPstrhZqr3-L0i6H8fIVqCSdBpuxz5t446iEAVHCUN8NEWJfNBJF0mif69R9V7iA0_T-I0Zp56tWGDWZaCgnxHDXZDCyKIx6cb24lpne_8uKFKR9okGrTzzDp4V3e8jGSZTUGMtlO5M3oXgC7kCXQkYmPzaq5k2kpZp6qQ',
            }}
            style={styles.emblem as ImageStyle}
            resizeMode="contain"
          />
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
            Ministry of Home Affairs | SSB
          </Text>
        </View>

        <View style={[styles.idBadge, { backgroundColor: theme.surfaceCard, borderColor: theme.border }]}>
          <Text style={[styles.idBadgeText, { color: theme.textPrimary }]}>{resultRecord.id}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stepper Navigation */}
        <View style={[styles.stepperContainer, { backgroundColor: theme.surfaceCard, borderColor: theme.border }]}>
          {/* Step 1 */}
          <View style={styles.stepItem}>
            <View style={[styles.stepCircleDone, { backgroundColor: theme.isDark ? '#143820' : '#e6f4ea', borderColor: theme.badgeOperational }]}>
              <MaterialIcons name="check" size={14} color={theme.badgeOperational} />
            </View>
            <Text style={[styles.stepLabel, { color: theme.textPrimary }]} numberOfLines={1}>
              Live Capture
            </Text>
          </View>

          <View style={[styles.stepperLine, { backgroundColor: theme.border }]} />

          {/* Step 2 */}
          <View style={styles.stepItem}>
            <View style={[styles.stepCircleDone, { backgroundColor: theme.isDark ? '#143820' : '#e6f4ea', borderColor: theme.badgeOperational }]}>
              <MaterialIcons name="check" size={14} color={theme.badgeOperational} />
            </View>
            <Text style={[styles.stepLabel, { color: theme.textPrimary }]} numberOfLines={1}>
              Upload
            </Text>
          </View>

          <View style={[styles.stepperLine, { backgroundColor: theme.border }]} />

          {/* Step 3 (Active) */}
          <View style={styles.stepItem}>
            <View style={[styles.stepCircleActive, { backgroundColor: theme.isDark ? '#ffffff' : '#0f172a' }]}>
              <Text style={[styles.stepNumActive, { color: theme.isDark ? '#000000' : '#ffffff' }]}>3</Text>
            </View>
            <Text style={[styles.stepLabelActive, { color: theme.textPrimary }]} numberOfLines={1}>
              Result
            </Text>
          </View>
        </View>

        {/* Identity Verified Card */}
        <View style={[styles.identityCard, { backgroundColor: theme.surfaceCard, borderColor: theme.border }]}>
          <View style={styles.verifiedBadgeContainer}>
            {isVerified ? (
              <View style={[styles.verifiedBadge, { backgroundColor: theme.isDark ? '#183a24' : '#e6f4ea', borderColor: theme.isDark ? '#2d5f3f' : '#bbf7d0' }]}>
                <MaterialIcons name="verified-user" size={13} color={theme.badgeOperational} />
                <Text style={[styles.verifiedBadgeText, { color: theme.isDark ? '#4cd964' : '#137333' }]}>MATCH VERIFIED</Text>
              </View>
            ) : isHighRisk ? (
              <View style={[styles.verifiedBadge, { backgroundColor: theme.isDark ? '#4a0e17' : '#fee2e2', borderColor: '#ef4444' }]}>
                <MaterialIcons name="warning" size={13} color="#ef4444" />
                <Text style={[styles.verifiedBadgeText, { color: '#ef4444' }]}>HIGH RISK ALERT</Text>
              </View>
            ) : (
              <View style={[styles.verifiedBadge, { backgroundColor: theme.isDark ? '#3d1818' : '#fef2f2', borderColor: theme.errorBorder }]}>
                <MaterialIcons name="error-outline" size={13} color={theme.errorText} />
                <Text style={[styles.verifiedBadgeText, { color: theme.errorText }]}>
                  {resultRecord.status.replace('_', ' ')}
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
            {isVerified ? 'Identity Verified' : isHighRisk ? 'Security Alert: High Risk' : 'Discrepancy Detected'}
          </Text>
          <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
            {resultRecord.notes || 'Screening evaluated through AI neural biometric & forensic pipeline.'}
          </Text>

          {/* Applicant Info Box */}
          <View style={[styles.applicantBox, { backgroundColor: theme.isDark ? theme.surfaceContainerLow : '#f8fafc', borderColor: theme.border }]}>
            <View style={[styles.avatarInitials, { backgroundColor: theme.isDark ? theme.surfaceContainerHighest : '#e2e8f0' }]}>
              <Text style={[styles.initialsText, { color: theme.textPrimary }]}>{initials}</Text>
            </View>

            <View style={styles.applicantDetails}>
              <Text style={[styles.applicantName, { color: theme.textPrimary }]}>{resultRecord.name}</Text>
              <Text style={[styles.applicantSub, { color: theme.textMuted }]}>
                {resultRecord.nationality} · DOB: {resultRecord.dob}
              </Text>
              <Text style={[styles.applicantPid, { color: theme.textMuted }]}>DOC: {resultRecord.docNumber}</Text>
            </View>

            <View style={styles.confidenceBox}>
              <Text style={[styles.confidenceLabel, { color: theme.textMuted }]}>CONFIDENCE</Text>
              <Text
                style={[
                  styles.confidenceValue,
                  { color: isVerified ? theme.badgeOperational : isHighRisk ? '#ef4444' : theme.warningText },
                ]}
              >
                {resultRecord.matchScore}%
              </Text>
            </View>
          </View>

          {/* Sub-results Grid */}
          <View style={styles.subResultsGrid}>
            <View style={[styles.subResultItem, { backgroundColor: theme.isDark ? theme.surfaceContainerLow : '#f8fafc', borderColor: theme.border }]}>
              <Text style={[styles.subResultLabel, { color: theme.textSecondary }]}>Face match</Text>
              <View style={styles.subResultStatus}>
                <MaterialIcons
                  name={resultRecord.securityChecks.biometricMatch ? 'check-circle' : 'cancel'}
                  size={15}
                  color={resultRecord.securityChecks.biometricMatch ? theme.badgeOperational : theme.errorText}
                />
                <Text
                  style={[
                    styles.subResultStatusText,
                    { color: resultRecord.securityChecks.biometricMatch ? theme.badgeOperational : theme.errorText },
                  ]}
                >
                  {resultRecord.securityChecks.biometricMatch ? 'PASSED' : 'FAILED'}
                </Text>
              </View>
            </View>

            <View style={[styles.subResultItem, { backgroundColor: theme.isDark ? theme.surfaceContainerLow : '#f8fafc', borderColor: theme.border }]}>
              <Text style={[styles.subResultLabel, { color: theme.textSecondary }]}>Liveness / ELA</Text>
              <View style={styles.subResultStatus}>
                <MaterialIcons
                  name={!resultRecord.securityChecks.tamperingDetected ? 'check-circle' : 'warning'}
                  size={15}
                  color={!resultRecord.securityChecks.tamperingDetected ? theme.badgeOperational : theme.errorText}
                />
                <Text
                  style={[
                    styles.subResultStatusText,
                    { color: !resultRecord.securityChecks.tamperingDetected ? theme.badgeOperational : theme.errorText },
                  ]}
                >
                  {!resultRecord.securityChecks.tamperingDetected ? 'PASSED' : 'ANOMALY'}
                </Text>
              </View>
            </View>

            <View style={[styles.subResultItem, { backgroundColor: theme.isDark ? theme.surfaceContainerLow : '#f8fafc', borderColor: theme.border }]}>
              <Text style={[styles.subResultLabel, { color: theme.textSecondary }]}>Watchlist</Text>
              <View style={styles.subResultStatus}>
                <MaterialIcons
                  name={!resultRecord.securityChecks.watchlistMatch ? 'check-circle' : 'warning'}
                  size={15}
                  color={!resultRecord.securityChecks.watchlistMatch ? theme.badgeOperational : '#ef4444'}
                />
                <Text
                  style={[
                    styles.subResultStatusText,
                    { color: !resultRecord.securityChecks.watchlistMatch ? theme.badgeOperational : '#ef4444' },
                  ]}
                >
                  {!resultRecord.securityChecks.watchlistMatch ? 'CLEAR' : 'HIT!'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* AI Biometric Facial Verification Comparison Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, borderBottomColor: theme.borderLight }]}>
            AI Biometric Facial Verification
          </Text>

          <View style={[styles.docItemCard, { backgroundColor: theme.surfaceCard, borderColor: theme.border, flexDirection: 'column', alignItems: 'stretch', gap: 12, padding: 14 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="face" size={20} color="#0284c7" />
                <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: 14 }}>
                  Initial Live Photo vs. Passport Face Photo (Officer Entry)
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: resultRecord.securityChecks.biometricMatch ? (theme.isDark ? '#143820' : '#e6f4ea') : (theme.isDark ? '#3d1818' : '#fef2f2'), borderColor: resultRecord.securityChecks.biometricMatch ? theme.badgeOperational : theme.errorText, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 }}>
                <MaterialIcons name={resultRecord.securityChecks.biometricMatch ? 'verified' : 'error'} size={14} color={resultRecord.securityChecks.biometricMatch ? theme.badgeOperational : theme.errorText} />
                <Text style={{ color: resultRecord.securityChecks.biometricMatch ? theme.badgeOperational : theme.errorText, fontWeight: '700', fontSize: 12 }}>
                  {resultRecord.matchScore}% Match
                </Text>
              </View>
            </View>

            {/* Side-by-Side Face Images */}
            <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'space-around', marginVertical: 4 }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                {resultRecord.livePhotoUri ? (
                  <Image source={{ uri: resultRecord.livePhotoUri }} style={{ width: 100, height: 100, borderRadius: 8, borderWidth: 2, borderColor: theme.border }} resizeMode="cover" />
                ) : (
                  <View style={{ width: 100, height: 100, borderRadius: 8, backgroundColor: theme.isDark ? theme.surfaceContainerHigh : '#f1f5f9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border }}>
                    <MaterialIcons name="person" size={40} color={theme.textMuted} />
                  </View>
                )}
                <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '600', marginTop: 4 }}>1. Initial Live Photo</Text>
              </View>

              <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                <MaterialIcons name="compare-arrows" size={26} color="#0284c7" />
                <Text style={{ color: '#0284c7', fontSize: 11, fontWeight: '700' }}>AI MATCH</Text>
              </View>

              <View style={{ flex: 1, alignItems: 'center' }}>
                {resultRecord.photoUrl ? (
                  <Image source={{ uri: resultRecord.photoUrl }} style={{ width: 100, height: 100, borderRadius: 8, borderWidth: 2, borderColor: theme.border }} resizeMode="cover" />
                ) : (
                  <View style={{ width: 100, height: 100, borderRadius: 8, backgroundColor: theme.isDark ? theme.surfaceContainerHigh : '#f1f5f9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border }}>
                    <MaterialIcons name="menu-book" size={40} color={theme.textMuted} />
                  </View>
                )}
                <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '600', marginTop: 4 }}>2. Passport Face Photo (Officer Entry)</Text>
              </View>
            </View>

            {/* AI Verification Analysis Note */}
            <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 18, backgroundColor: theme.isDark ? theme.surfaceContainerLow : '#f8fafc', padding: 10, borderRadius: rounded.md }}>
              <Text style={{ fontWeight: '700', color: theme.textPrimary }}>AI Biometric Result: </Text>
              {resultRecord.securityChecks.biometricMatch
                ? `High confidence biometric facial match (${resultRecord.matchScore}% similarity). ArcFace biometric embeddings from the Passport Face Photo (Officer Entry) match the Initial Live Photo subject.`
                : `Biometric facial mismatch detected (${resultRecord.matchScore}% similarity below threshold). Initial Live Photo subject does not match the Passport Face Photo (Officer Entry).`}
            </Text>
          </View>
        </View>

        {/* Document Checks Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, borderBottomColor: theme.borderLight }]}>
            Document checks
          </Text>

          <View style={[styles.docItemCard, { backgroundColor: theme.surfaceCard, borderColor: theme.border }]}>
            <View style={[styles.docIconBox, { backgroundColor: theme.isDark ? theme.surfaceContainerHigh : '#f1f5f9' }]}>
              <MaterialIcons name="menu-book" size={20} color={theme.textPrimary} />
            </View>
            <View style={styles.docItemDetails}>
              <Text style={[styles.docItemTitle, { color: theme.textPrimary }]}>{resultRecord.docType}</Text>
              <Text style={[styles.docItemSub, { color: theme.textMuted }]}>
                {resultRecord.docNumber} · {resultRecord.nationality}
              </Text>
            </View>
            <Text
              style={[
                styles.docVerifiedTag,
                { color: isVerified ? theme.badgeOperational : isHighRisk ? '#ef4444' : theme.warningText },
              ]}
            >
              {isVerified ? 'VERIFIED' : isHighRisk ? 'HIGH RISK' : 'REVIEW'}
            </Text>
          </View>

          <View style={[styles.docItemCard, { backgroundColor: theme.surfaceCard, borderColor: theme.border }]}>
            <View style={[styles.docIconBox, { backgroundColor: theme.isDark ? theme.surfaceContainerHigh : '#f1f5f9' }]}>
              <MaterialIcons name="security" size={20} color={theme.textPrimary} />
            </View>
            <View style={styles.docItemDetails}>
              <Text style={[styles.docItemTitle, { color: theme.textPrimary }]}>Hologram & Optical Security</Text>
              <Text style={[styles.docItemSub, { color: theme.textMuted }]}>
                Spectral reflection & UV watermark analysis
              </Text>
            </View>
            <Text
              style={[
                styles.docVerifiedTag,
                { color: resultRecord.securityChecks.hologramDetected ? theme.badgeOperational : theme.errorText },
              ]}
            >
              {resultRecord.securityChecks.hologramDetected ? 'DETECTED' : 'FAIL'}
            </Text>
          </View>
        </View>

        {/* Audit Trail Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, borderBottomColor: theme.borderLight }]}>
            Audit trail
          </Text>

          <View style={[styles.timeline, { borderLeftColor: theme.border }]}>
            <View style={styles.timelineItem}>
              <View
                style={[
                  styles.timelineDot,
                  { backgroundColor: isVerified ? theme.badgeOperational : theme.errorText },
                ]}
              />
              <View style={styles.timelineContent}>
                <View style={styles.timelineRow}>
                  <Text style={[styles.timelineEventTitle, { color: theme.textPrimary }]}>Verification completed</Text>
                  <Text style={[styles.timelineTime, { color: theme.textMuted }]}>{resultRecord.timestamp}</Text>
                </View>
                <Text style={[styles.timelineEventDesc, { color: theme.textMuted }]}>
                  {resultRecord.notes || 'Result generated and securely recorded.'}
                </Text>
              </View>
            </View>

            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: theme.textMuted }]} />
              <View style={styles.timelineContent}>
                <View style={styles.timelineRow}>
                  <Text style={[styles.timelineEventTitle, { color: theme.textPrimary }]}>Documents evaluated</Text>
                  <Text style={[styles.timelineTime, { color: theme.textMuted }]}>
                    OCR: {resultRecord.ocrConfidence}%
                  </Text>
                </View>
                <Text style={[styles.timelineEventDesc, { color: theme.textMuted }]}>
                  Passport OCR and forensic security analysis completed.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={[styles.decisionSection, { borderTopColor: theme.borderLight }]}>
          <TouchableOpacity
            style={[styles.acceptBtn, { backgroundColor: theme.badgeOperational }]}
            onPress={handleAccept}
          >
            <MaterialIcons name="check-circle" size={18} color="#ffffff" />
            <Text style={styles.acceptBtnText}>Accept Verification</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.denyBtn, { backgroundColor: theme.surfaceCard, borderColor: theme.border }]}
            onPress={handleDeny}
          >
            <MaterialIcons name="cancel" size={18} color={theme.errorText} />
            <Text style={[styles.denyBtnText, { color: theme.errorText }]}>Deny Verification</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={[styles.stickyBottomBar as ViewStyle, { backgroundColor: theme.navBg, borderTopColor: theme.navBorder }]}>
        <View style={styles.secureIndicator}>
          <MaterialIcons name="lock" size={14} color={theme.textMuted} />
          <Text style={[styles.secureIndicatorText, { color: theme.textMuted }]}>SECURE SESSION</Text>
        </View>

        <View style={styles.stickyButtonsRow}>
          <TouchableOpacity
            style={[styles.secondaryActionBtn, { backgroundColor: theme.surfaceCard, borderColor: theme.border }]}
            onPress={handleDownload}
          >
            <MaterialIcons name="download" size={15} color={theme.textPrimary} />
            <Text style={[styles.secondaryActionBtnText, { color: theme.textPrimary }]}>Report</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryActionBtn, { backgroundColor: theme.surfaceCard, borderColor: theme.border }]}
            onPress={onNewVerification}
          >
            <MaterialIcons name="add" size={15} color={theme.textPrimary} />
            <Text style={[styles.secondaryActionBtnText, { color: theme.textPrimary }]}>New</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.marginMobile,
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    zIndex: 50,
  },
  backBtn: {
    padding: 6,
    marginRight: 6,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 6,
    overflow: 'hidden',
  },
  emblem: {
    width: 26,
    height: 26,
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: typography.fontFamily.mono,
    flexShrink: 1,
  },
  idBadge: {
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: rounded.default,
    flexShrink: 0,
  },
  idBadgeText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.mono,
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: 14,
    paddingBottom: 40,
    maxWidth: spacing.containerMaxWidth,
    alignSelf: 'center',
    width: '100%',
    gap: 14,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: rounded.lg,
    padding: 10,
    gap: 4,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  stepCircleDone: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepCircleActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepNumActive: {
    fontSize: 11,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 11,
    fontFamily: typography.fontFamily.mono,
  },
  stepLabelActive: {
    fontSize: 11,
    fontFamily: typography.fontFamily.mono,
    fontWeight: '700',
  },
  stepperLine: {
    flex: 1,
    height: 1,
    minWidth: 10,
    marginHorizontal: 4,
  },
  identityCard: {
    borderRadius: rounded.xl,
    borderWidth: 1,
    padding: 16,
    position: 'relative',
    gap: 12,
  },
  verifiedBadgeContainer: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: rounded.default,
    borderWidth: 1,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.mono,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    maxWidth: '70%',
  },
  applicantBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: rounded.lg,
    borderWidth: 1,
    gap: 10,
  },
  avatarInitials: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 16,
    fontWeight: '700',
  },
  applicantDetails: {
    flex: 1,
  },
  applicantName: {
    fontSize: 16,
    fontWeight: '600',
  },
  applicantSub: {
    fontSize: 11,
    marginTop: 1,
  },
  applicantPid: {
    fontSize: 10,
    fontFamily: typography.fontFamily.mono,
    marginTop: 2,
  },
  confidenceBox: {
    alignItems: 'flex-end',
  },
  confidenceLabel: {
    fontSize: 9,
    fontFamily: typography.fontFamily.mono,
  },
  confidenceValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  subResultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subResultItem: {
    flex: 1,
    minWidth: 100,
    padding: 10,
    borderRadius: rounded.default,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subResultLabel: {
    fontSize: 11,
  },
  subResultStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  subResultStatusText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.mono,
    fontWeight: '700',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    borderBottomWidth: 1,
    paddingBottom: 6,
  },
  docItemCard: {
    borderRadius: rounded.lg,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  docIconBox: {
    padding: 6,
    borderRadius: rounded.default,
  },
  docItemDetails: {
    flex: 1,
  },
  docItemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  docItemSub: {
    fontSize: 11,
  },
  docVerifiedTag: {
    fontSize: 10,
    fontFamily: typography.fontFamily.mono,
    fontWeight: '700',
  },
  timeline: {
    paddingLeft: 14,
    borderLeftWidth: 1,
    marginLeft: 10,
    gap: 14,
  },
  timelineItem: {
    position: 'relative',
  },
  timelineDot: {
    position: 'absolute',
    left: -19,
    top: 4,
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  timelineContent: {
    gap: 2,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineEventTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  timelineTime: {
    fontSize: 11,
    fontFamily: typography.fontFamily.mono,
  },
  timelineEventDesc: {
    fontSize: 11,
  },
  decisionSection: {
    gap: 10,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  acceptBtn: {
    paddingVertical: 12,
    borderRadius: rounded.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  acceptBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  denyBtn: {
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: rounded.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  denyBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stickyBottomBar: {
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: spacing.marginMobile,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
      },
    }),
  },
  secureIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  secureIndicatorText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.mono,
  },
  stickyButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: rounded.default,
    borderWidth: 1,
  },
  secondaryActionBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
