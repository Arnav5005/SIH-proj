import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, rounded, spacing } from '../theme/theme';
import { samplePresetDocuments } from '../mockData';
import { ScreeningRecord, StatusType } from '../types';

import { api } from '../services/api';

interface ScannerScreenProps {
  onScanComplete: (newRecord: ScreeningRecord) => void;
  checkpointId?: string;
  officerId?: string;
}

export const ScannerScreen: React.FC<ScannerScreenProps> = ({
  onScanComplete,
  checkpointId = 'CHK-00184',
  officerId = 'SSB-OFC-8821',
}) => {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<number>(0);
  const [scanResult, setScanResult] = useState<any | null>(null);

  // Animated laser line
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isScanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.linear,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 1200,
            easing: Easing.linear,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      ).start();
    } else {
      laserAnim.setValue(0);
    }
  }, [isScanning]);

  const currentPreset = samplePresetDocuments[selectedPresetIndex];

  const handleStartScan = async () => {
    setIsScanning(true);
    setScanResult(null);
    setScanStep(1);

    // Multi-stage scan simulation
    setTimeout(() => setScanStep(2), 700);
    setTimeout(() => setScanStep(3), 1400);
    setTimeout(() => setScanStep(4), 2100);

    const caseMap: Record<number, string> = {
      0: 'CASE_GENUINE',
      1: 'CASE_EXPIRED',
      2: 'CASE_TAMPERED',
      3: 'CASE_WATCHLIST',
    };
    const caseId = caseMap[selectedPresetIndex] || 'CASE_GENUINE';

    try {
      const res = await api.runDemoCase(caseId);
      setTimeout(() => {
        setIsScanning(false);
        setScanStep(5);
        setScanResult(res.ui_record);
      }, 2800);
    } catch (e) {
      setTimeout(() => {
        setIsScanning(false);
        setScanStep(5);
        setScanResult(currentPreset);
      }, 2800);
    }
  };

  const handleApprove = (overrideStatus?: StatusType) => {
    const finalStatus: StatusType = overrideStatus || (scanResult?.status as StatusType) || currentPreset.status;
    const recId = scanResult?.id || `VF-${Math.floor(28490 + Math.random() * 1000)}`;
    
    api.updateRecordStatus(recId, finalStatus);

    const newRecord: ScreeningRecord = {
      id: recId,
      name: scanResult?.name || currentPreset.name,
      docType: scanResult?.docType || currentPreset.type,
      docNumber: scanResult?.docNumber || currentPreset.docNumber,
      status: finalStatus,
      timestamp: scanResult?.timestamp || new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      checkpointId,
      officerId,
      gender: scanResult?.gender || currentPreset.gender,
      dob: scanResult?.dob || currentPreset.dob,
      address: scanResult?.address || currentPreset.address,
      nationality: scanResult?.nationality || currentPreset.nationality,
      matchScore: scanResult?.matchScore ?? currentPreset.matchScore,
      ocrConfidence: scanResult?.ocrConfidence ?? currentPreset.ocrConfidence,
      securityChecks: scanResult?.securityChecks || currentPreset.securityChecks,
      notes: scanResult?.notes || currentPreset.notes,
    };

    onScanComplete(newRecord);
    Alert.alert(
      'Verification Record Saved',
      `Record ID ${newRecord.id} for ${newRecord.name} (${finalStatus}) logged in central SSB border registry.`
    );
    setScanResult(null);
    setScanStep(0);
  };

  const laserTranslate = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 180],
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.badgeRow}>
            <MaterialIcons name="document-scanner" size={14} color={colors.onSurfaceVariant} />
            <Text style={styles.badgeText}>AI BIOMETRIC OPTICAL INSPECTION</Text>
          </View>
          <Text style={styles.title}>Document Screening Engine</Text>
          <Text style={styles.subtitle}>
            Point optical sensor at physical document or select test credential.
          </Text>
        </View>
      </View>

      {/* Preset / Test Document Selector */}
      <View style={styles.presetSection}>
        <Text style={styles.presetSectionLabel}>SELECT TARGET CREDENTIAL PRESET:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetScroll}
        >
          {samplePresetDocuments.map((preset, idx) => {
            const isSelected = selectedPresetIndex === idx;
            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.presetChip,
                  isSelected && styles.presetChipSelected,
                ]}
                onPress={() => {
                  setSelectedPresetIndex(idx);
                  setScanResult(null);
                  setScanStep(0);
                }}
                disabled={isScanning}
              >
                <MaterialIcons
                  name={
                    preset.type === 'Passport'
                      ? 'menu-book'
                      : preset.type === 'Aadhaar Card'
                      ? 'badge'
                      : 'credit-card'
                  }
                  size={16}
                  color={isSelected ? colors.primary : colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.presetChipText,
                    isSelected && styles.presetChipTextSelected,
                  ]}
                >
                  {preset.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Scanner Viewport / HUD */}
      <View style={styles.viewportCard}>
        <View style={styles.viewportHeader}>
          <View style={styles.viewportLiveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>SENSOR LIVE FEED</Text>
          </View>
          <Text style={styles.sensorResolution}>4K SPECTRAL UV/IR</Text>
        </View>

        <View style={styles.cameraBox}>
          {/* Document Frame Mock */}
          <View style={styles.docFrame}>
            {/* Corner brackets */}
            <View style={[styles.cornerBracket, styles.topLeft]} />
            <View style={[styles.cornerBracket, styles.topRight]} />
            <View style={[styles.cornerBracket, styles.bottomLeft]} />
            <View style={[styles.cornerBracket, styles.bottomRight]} />

            {/* Document preview card */}
            <View style={styles.docPreviewCard}>
              <View style={styles.docTopRow}>
                <MaterialIcons
                  name={
                    currentPreset.type === 'Passport'
                      ? 'menu-book'
                      : 'account-box'
                  }
                  size={28}
                  color={colors.onSurfaceVariant}
                />
                <View style={styles.docCardText}>
                  <Text style={styles.docCardName}>{currentPreset.name}</Text>
                  <Text style={styles.docCardType}>
                    {currentPreset.type} • {currentPreset.docNumber}
                  </Text>
                </View>
                <View style={styles.chipGraphic} />
              </View>

              <View style={styles.docBottomRow}>
                <Text style={styles.docDetailText}>DOB: {currentPreset.dob}</Text>
                <Text style={styles.docDetailText}>NAT: {currentPreset.nationality}</Text>
              </View>
            </View>

            {/* Scanning Laser */}
            {isScanning && (
              <Animated.View
                style={[
                  styles.laserLine,
                  {
                    transform: [{ translateY: laserTranslate }],
                  },
                ]}
              />
            )}
          </View>

          {/* Real-time scanning pipeline steps */}
          {isScanning && (
            <View style={styles.scanningOverlay}>
              <ActivityIndicator size="small" color={colors.scanLaser} />
              <Text style={styles.scanningStepText}>
                {scanStep === 1 && '1/4 Optical OCR Text Extraction...'}
                {scanStep === 2 && '2/4 Hologram & UV Thread Spectral Analysis...'}
                {scanStep === 3 && '3/4 Biometric Facial Comparison (99.2% match)...'}
                {scanStep === 4 && '4/4 Querying MHA & CIPA Watchlist Database...'}
              </Text>
            </View>
          )}
        </View>

        {/* Scan Trigger Button */}
        {!scanResult && (
          <TouchableOpacity
            style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
            onPress={handleStartScan}
            disabled={isScanning}
            activeOpacity={0.85}
          >
            {isScanning ? (
              <Text style={styles.scanButtonText}>PROCESSING BIOMETRICS...</Text>
            ) : (
              <>
                <MaterialIcons name="center-focus-strong" size={20} color={colors.onPrimary} />
                <Text style={styles.scanButtonText}>RUN AI DOCUMENT SCREENING</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* AI Screening Result Card */}
      {scanResult && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <View>
              <Text style={styles.resultPretitle}>SCREENING EVALUATION COMPLETE</Text>
              <Text style={styles.resultTitle}>{scanResult.name}</Text>
              <Text style={styles.resultDoc}>{scanResult.type} • {scanResult.docNumber}</Text>
            </View>
            <View
              style={[
                styles.resultStatusBadge,
                scanResult.status === 'VERIFIED'
                  ? styles.badgeVerified
                  : scanResult.status === 'HIGH_RISK'
                  ? styles.badgeHighRisk
                  : scanResult.status === 'MISMATCH'
                  ? styles.badgeMismatch
                  : styles.badgeReview,
              ]}
            >
              <Text
                style={[
                  styles.resultStatusBadgeText,
                  scanResult.status === 'VERIFIED'
                    ? { color: colors.success }
                    : scanResult.status === 'HIGH_RISK'
                    ? { color: '#ff453a' }
                    : scanResult.status === 'MISMATCH'
                    ? { color: colors.error }
                    : { color: colors.warning },
                ]}
              >
                {scanResult.status.replace('_', ' ')}
              </Text>
            </View>
          </View>

          {/* AI Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Facial Biometric Match</Text>
              <Text
                style={[
                  styles.metricValue,
                  { color: scanResult.matchScore > 85 ? colors.success : colors.error },
                ]}
              >
                {scanResult.matchScore}%
              </Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>OCR Fidelity</Text>
              <Text style={[styles.metricValue, { color: colors.primary }]}>
                {scanResult.ocrConfidence}%
              </Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Security Hologram</Text>
              <Text
                style={[
                  styles.metricValue,
                  {
                    color: scanResult.securityChecks.hologramDetected
                      ? colors.success
                      : colors.errorCritical,
                  },
                ]}
              >
                {scanResult.securityChecks.hologramDetected ? 'DETECTED' : 'FAIL'}
              </Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Watchlist Check</Text>
              <Text
                style={[
                  styles.metricValue,
                  {
                    color: !scanResult.securityChecks.watchlistMatch
                      ? colors.success
                      : '#ff453a',
                  },
                ]}
              >
                {!scanResult.securityChecks.watchlistMatch ? 'CLEAR' : 'HIT!'}
              </Text>
            </View>
          </View>

          {/* Security Summary Notes */}
          <View style={styles.notesBox}>
            <MaterialIcons name="info" size={16} color={colors.onSurfaceVariant} />
            <Text style={styles.notesBoxText}>{scanResult.notes}</Text>
          </View>

          {/* Action Decision Buttons */}
          <View style={styles.decisionActions}>
            {scanResult.status === 'VERIFIED' ? (
              <TouchableOpacity
                style={styles.btnApprove}
                onPress={() => handleApprove('VERIFIED')}
              >
                <MaterialIcons name="check-circle" size={18} color={colors.onPrimary} />
                <Text style={styles.btnApproveText}>Approve & Permit Transit</Text>
              </TouchableOpacity>
            ) : scanResult.status === 'HIGH_RISK' ? (
              <TouchableOpacity
                style={styles.btnCritical}
                onPress={() => handleApprove('HIGH_RISK')}
              >
                <MaterialIcons name="warning" size={18} color={colors.primary} />
                <Text style={styles.btnCriticalText}>Flag High Risk & Escalate</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.multiActions}>
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() => handleApprove('NEEDS_REVIEW')}
                >
                  <MaterialIcons name="rule" size={16} color={colors.warning} />
                  <Text style={styles.btnSecondaryText}>Secondary Review</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnReject}
                  onPress={() => handleApprove('MISMATCH')}
                >
                  <MaterialIcons name="cancel" size={16} color={colors.error} />
                  <Text style={styles.btnRejectText}>Flag Mismatch</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.btnRetake}
              onPress={() => {
                setScanResult(null);
                setScanStep(0);
              }}
            >
              <MaterialIcons name="refresh" size={18} color={colors.onSurfaceVariant} />
              <Text style={styles.btnRetakeText}>Rescan or Switch Credential</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: spacing.stackMd,
    paddingBottom: 90,
    gap: 20,
    maxWidth: spacing.containerMaxWidth,
    alignSelf: 'center',
    width: '100%',
  },
  header: {},
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  badgeText: {
    color: colors.onSurfaceVariant,
    fontSize: typography.sizes.labelCaps,
    fontFamily: typography.fontFamily.mono,
    letterSpacing: 1,
  },
  title: {
    color: colors.primary,
    fontSize: typography.sizes.headlineMd,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.onSurfaceVariant,
    fontSize: typography.sizes.bodySm,
    marginTop: 2,
  },
  presetSection: {
    gap: 8,
  },
  presetSectionLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontFamily: typography.fontFamily.mono,
    letterSpacing: 0.8,
  },
  presetScroll: {
    gap: 10,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  presetChipSelected: {
    backgroundColor: colors.surfaceContainerHigh,
    borderColor: colors.primary,
  },
  presetChipText: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '500',
  },
  presetChipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  viewportCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: rounded.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: 20,
    gap: 16,
  },
  viewportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewportLiveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.scanLaser,
  },
  liveText: {
    color: colors.scanLaser,
    fontSize: 11,
    fontFamily: typography.fontFamily.mono,
    letterSpacing: 1,
  },
  sensorResolution: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontFamily: typography.fontFamily.mono,
  },
  cameraBox: {
    height: 220,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  docFrame: {
    width: 280,
    height: 180,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: rounded.lg,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerBracket: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: colors.scanLaser,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  docPreviewCard: {
    width: 250,
    height: 140,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: rounded.default,
    padding: 12,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  docTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docCardText: {
    flex: 1,
  },
  docCardName: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  docCardType: {
    color: colors.onSurfaceVariant,
    fontSize: 10,
    fontFamily: typography.fontFamily.mono,
  },
  chipGraphic: {
    width: 20,
    height: 16,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 204, 0, 0.6)',
  },
  docBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  docDetailText: {
    color: colors.onSurfaceVariant,
    fontSize: 10,
    fontFamily: typography.fontFamily.mono,
  },
  laserLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    backgroundColor: colors.scanLaser,
    ...Platform.select({
      web: {
        boxShadow: '0 0 10px #00f2fe, 0 0 5px #00f2fe',
      },
    }),
  },
  scanningOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(18, 19, 23, 0.9)',
    padding: 10,
    borderRadius: rounded.default,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  scanningStepText: {
    color: colors.scanLaser,
    fontSize: 12,
    fontFamily: typography.fontFamily.mono,
  },
  scanButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: rounded.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  scanButtonDisabled: {
    opacity: 0.6,
  },
  scanButtonText: {
    color: colors.onPrimary,
    fontSize: typography.sizes.labelMd,
    fontWeight: '700',
    fontFamily: typography.fontFamily.mono,
    letterSpacing: 0.5,
  },
  resultCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: rounded.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: 20,
    gap: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  resultPretitle: {
    color: colors.onSurfaceVariant,
    fontSize: 10,
    fontFamily: typography.fontFamily.mono,
    letterSpacing: 1,
    marginBottom: 4,
  },
  resultTitle: {
    color: colors.primary,
    fontSize: typography.sizes.headlineMd,
    fontWeight: '700',
  },
  resultDoc: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    fontFamily: typography.fontFamily.mono,
    marginTop: 2,
  },
  resultStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rounded.default,
    borderWidth: 1,
  },
  badgeVerified: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
  },
  badgeHighRisk: {
    backgroundColor: '#4a0e17',
    borderColor: '#8b0000',
  },
  badgeMismatch: {
    backgroundColor: colors.errorBg,
    borderColor: colors.errorBorder,
  },
  badgeReview: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
  },
  resultStatusBadgeText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.mono,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricBox: {
    flex: 1,
    minWidth: 120,
    backgroundColor: colors.surfaceContainerLow,
    padding: 12,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
  },
  metricLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    marginBottom: 4,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontFamily: typography.fontFamily.mono,
    fontWeight: '700',
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.surfaceContainerHigh,
    padding: 12,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  notesBoxText: {
    color: colors.onSurface,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  decisionActions: {
    gap: 10,
    marginTop: 4,
  },
  btnApprove: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: rounded.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  btnApproveText: {
    color: colors.onPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  btnCritical: {
    backgroundColor: '#ff453a',
    paddingVertical: 14,
    borderRadius: rounded.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  btnCriticalText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  multiActions: {
    flexDirection: 'row',
    gap: 10,
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    paddingVertical: 12,
    borderRadius: rounded.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  btnSecondaryText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '700',
  },
  btnReject: {
    flex: 1,
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    paddingVertical: 12,
    borderRadius: rounded.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  btnRejectText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '700',
  },
  btnRetake: {
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  btnRetakeText: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '500',
  },
});
