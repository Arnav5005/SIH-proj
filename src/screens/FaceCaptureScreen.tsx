import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { getTheme, typography, rounded, spacing } from '../theme/theme';
import { api, FaceQualityCheckResult } from '../services/api';

interface FaceCaptureScreenProps {
  onBack: () => void;
  onNext: (photoUri?: string) => void;
  isDark?: boolean;
}

export const FaceCaptureScreen: React.FC<FaceCaptureScreenProps> = ({
  onBack,
  onNext,
  isDark = false,
}) => {
  const theme = getTheme(isDark);
  const [nativePermission, requestNativePermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [webStreamActive, setWebStreamActive] = useState<boolean>(false);
  const [qualityResult, setQualityResult] = useState<FaceQualityCheckResult | null>(null);
  
  const cameraRef = useRef<any>(null);
  const webVideoRef = useRef<any>(null);
  const webStreamRef = useRef<any>(null);

  // Analyze Face Quality whenever photo is captured/changed
  useEffect(() => {
    if (capturedPhotoUri) {
      setIsProcessing(true);
      api.checkFaceQuality(capturedPhotoUri)
        .then((res) => {
          setQualityResult(res);
        })
        .catch(() => {
          setQualityResult(null);
        })
        .finally(() => setIsProcessing(false));
    } else {
      setQualityResult(null);
    }
  }, [capturedPhotoUri]);

  // Web Webcam Initialization
  useEffect(() => {
    if (Platform.OS === 'web' && !capturedPhotoUri) {
      startWebCamera();
    }
    return () => {
      stopWebCamera();
    };
  }, [facing, capturedPhotoUri]);

  const startWebCamera = async () => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.mediaDevices) return;
    try {
      stopWebCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing === 'front' ? 'user' : 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      webStreamRef.current = stream;
      setWebStreamActive(true);
      if (webVideoRef.current) {
        webVideoRef.current.srcObject = stream;
        webVideoRef.current.play().catch(() => {});
      }
    } catch (e) {
      setWebStreamActive(false);
    }
  };

  const stopWebCamera = () => {
    if (webStreamRef.current) {
      webStreamRef.current.getTracks().forEach((track: any) => track.stop());
      webStreamRef.current = null;
      setWebStreamActive(false);
    }
  };

  const captureWebFrame = (): string | null => {
    if (Platform.OS !== 'web' || !webVideoRef.current) return null;
    try {
      const video = webVideoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85);
      }
    } catch (e) {
      console.warn('Web capture error:', e);
    }
    return null;
  };

  const handleCapturePhoto = async () => {
    setIsProcessing(true);
    try {
      if (Platform.OS === 'web') {
        if (webStreamActive && webVideoRef.current) {
          const photoDataUrl = captureWebFrame();
          if (photoDataUrl) {
            setCapturedPhotoUri(photoDataUrl);
            stopWebCamera();
            setIsProcessing(false);
            return;
          }
        }
        pickImageWeb(true);
      } else {
        if (cameraRef.current && nativePermission?.granted) {
          const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: true });
          if (photo) {
            const dataUri = photo.base64 ? `data:image/jpeg;base64,${photo.base64}` : photo.uri;
            setCapturedPhotoUri(dataUri);
          }
        } else {
          const res = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            base64: true,
          });
          if (!res.canceled && res.assets && res.assets[0]) {
            const asset = res.assets[0];
            const dataUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
            setCapturedPhotoUri(dataUri);
          }
        }
      }
    } catch (err) {
      Alert.alert('Camera Error', 'Could not capture photo. Please check device permissions.');
    } finally {
      setIsProcessing(false);
    }
  };

  const pickImageWeb = (isCameraMode = false) => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (isCameraMode) {
      input.setAttribute('capture', 'user');
    }
    input.onchange = (event: any) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setCapturedPhotoUri(e.target.result as string);
            stopWebCamera();
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handlePickFromGallery = async () => {
    if (Platform.OS === 'web') {
      pickImageWeb(false);
    } else {
      try {
        setIsProcessing(true);
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          base64: true,
        });
        if (!res.canceled && res.assets && res.assets[0]) {
          const asset = res.assets[0];
          const dataUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
          setCapturedPhotoUri(dataUri);
        }
      } catch (e) {
        Alert.alert('Gallery Error', 'Could not access photo library.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleToggleFacing = () => {
    setFacing((prev) => (prev === 'front' ? 'back' : 'front'));
  };

  const handleRetake = () => {
    setCapturedPhotoUri(null);
    setQualityResult(null);
    if (Platform.OS === 'web') {
      setTimeout(startWebCamera, 100);
    }
  };

  const handleProceed = () => {
    if (!capturedPhotoUri) {
      Alert.alert(
        'Photo Required',
        'Please capture or upload a subject photo before proceeding to document upload.'
      );
      return;
    }

    if (qualityResult && !qualityResult.overall_valid) {
      Alert.alert(
        'Capture Checklist Failed',
        `Facial capture requirements not met:\n\n${qualityResult.error_message || 'Please position face straight into camera and remove glasses/mask.'}\n\nPlease adjust pose or recapture photo.`,
        [
          { text: 'Recapture Photo', onPress: handleRetake },
        ]
      );
      return;
    }

    onNext(capturedPhotoUri);
  };

  // Helper renderer for dynamic checklist items
  const renderCheckItem = (
    label: string,
    checkObj?: { passed: boolean; message: string; metrics?: any }
  ) => {
    let iconName: any = 'radio-button-unchecked';
    let iconColor = theme.isDark ? '#9ca3af' : '#6b7280';
    let displayMessage = label;
    let isFailed = false;

    // Requirement 1: If no face detected or no photo, leave unchecked/grayed out
    if (!capturedPhotoUri || (qualityResult && !qualityResult.face_detected)) {
      iconName = 'radio-button-unchecked';
      iconColor = theme.isDark ? '#9ca3af' : '#6b7280';
    } else if (checkObj) {
      if (checkObj.passed) {
        iconName = 'check-circle';
        iconColor = theme.badgeOperational; // #10b981 / green
      } else {
        iconName = 'cancel';
        iconColor = '#ef4444'; // red warning cross
        displayMessage = checkObj.message;
        isFailed = true;
      }
    }

    return (
      <View
        style={[
          styles.checkItem,
          {
            backgroundColor: theme.surfaceCard,
            borderColor: isFailed ? '#ef4444' : theme.border,
          },
        ]}
      >
        <MaterialIcons name={iconName} size={16} color={iconColor} />
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.checkItemText,
              {
                color: isFailed ? '#ef4444' : checkObj?.passed ? theme.textPrimary : theme.textSecondary,
                fontWeight: isFailed ? '600' : '400',
              },
            ]}
          >
            {displayMessage}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Link */}
        <TouchableOpacity style={styles.backLink} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={18} color={theme.textSecondary} />
          <Text style={[styles.backLinkText, { color: theme.textSecondary }]}>Back to Dashboard</Text>
        </TouchableOpacity>

        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerTitleCol}>
            <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>New Verification</Text>
            <Text style={[styles.pageSubtitle, { color: theme.textMuted }]} numberOfLines={1}>
              Complete each step to verify the identity.
            </Text>
          </View>

          <View style={[styles.idBadge, { backgroundColor: theme.surfaceCard, borderColor: theme.border }]}>
            <Text style={[styles.idBadgeLabel, { color: theme.textMuted }]}>ID:</Text>
            <Text style={[styles.idBadgeValue, { color: theme.textPrimary }]}>VF-20481</Text>
          </View>
        </View>

        {/* Stepper Navigation */}
        <View style={[styles.stepperContainer, { backgroundColor: theme.surfaceCard, borderColor: theme.border }]}>
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, styles.stepCircleActive]}>
              <Text style={styles.stepNumActive}>1</Text>
            </View>
            <Text style={[styles.stepLabel, { color: theme.textPrimary, fontWeight: '700' }]} numberOfLines={1}>
              Live Capture
            </Text>
          </View>

          <View style={[styles.stepLine, { backgroundColor: theme.border }]} />

          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, { backgroundColor: theme.isDark ? theme.surfaceContainerHigh : '#f3f4f6', borderColor: theme.border }]}>
              <Text style={[styles.stepNum, { color: theme.textMuted }]}>2</Text>
            </View>
            <Text style={[styles.stepLabel, { color: theme.textMuted }]} numberOfLines={1}>
              Upload
            </Text>
          </View>

          <View style={[styles.stepLine, { backgroundColor: theme.border }]} />

          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, { backgroundColor: theme.isDark ? theme.surfaceContainerHigh : '#f3f4f6', borderColor: theme.border }]}>
              <Text style={[styles.stepNum, { color: theme.textMuted }]}>3</Text>
            </View>
            <Text style={[styles.stepLabel, { color: theme.textMuted }]} numberOfLines={1}>
              Result
            </Text>
          </View>
        </View>

        {/* Camera Live Viewport Card */}
        <View style={[styles.cameraCard, { backgroundColor: theme.surfaceCard, borderColor: theme.border }]}>
          <View style={styles.cameraHeader}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Text style={[styles.cameraTitle, { color: theme.textPrimary }]}>Live Face Capture</Text>
              <Text style={[styles.cameraSubtitle, { color: theme.textMuted }]}>
                Position subject face inside the biometric oval guide.
              </Text>
            </View>

            <View style={[styles.cameraReadyBadge, { backgroundColor: theme.isDark ? '#183a24' : '#e6f4ea', borderColor: theme.isDark ? '#2d5f3f' : '#bbf7d0' }]}>
              <View style={[styles.readyDot, { backgroundColor: theme.badgeOperational }]} />
              <Text style={[styles.cameraReadyText, { color: theme.isDark ? '#4cd964' : '#137333' }]}>
                {capturedPhotoUri ? 'ACQUIRED' : (Platform.OS === 'web' && webStreamActive) || nativePermission?.granted ? 'LIVE CAMERA' : 'READY'}
              </Text>
            </View>
          </View>

          {/* Viewport Box */}
          <View style={[styles.viewport, { backgroundColor: theme.isDark ? '#0a0b0d' : '#e2e8f0' }]}>
            {capturedPhotoUri ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: capturedPhotoUri }} style={styles.capturedImage} resizeMode="contain" />
                <View style={[styles.guidePill, { position: 'absolute', bottom: 12, backgroundColor: 'rgba(0,0,0,0.75)' }]}>
                  <MaterialIcons name="check-circle" size={14} color={theme.badgeOperational} />
                  <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700', marginLeft: 4 }}>
                    PHOTO ACQUIRED
                  </Text>
                </View>
              </View>
            ) : Platform.OS === 'web' ? (
              <View style={styles.cameraOverlay}>
                {/* @ts-ignore */}
                <video
                  ref={(el: any) => {
                    webVideoRef.current = el;
                    if (el && webStreamRef.current && el.srcObject !== webStreamRef.current) {
                      el.srcObject = webStreamRef.current;
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: facing === 'front' ? 'scaleX(-1)' : 'none',
                  }}
                />
                <View style={[styles.faceGuideOval, { position: 'absolute', borderColor: theme.badgeOperational }]}>
                  <View style={[styles.guidePill, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                    <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '700' }}>FACE GUIDE</Text>
                  </View>
                </View>

                {webStreamActive && (
                  <TouchableOpacity style={styles.flipBtn} onPress={handleToggleFacing}>
                    <MaterialIcons name="flip-camera-ios" size={20} color="#ffffff" />
                  </TouchableOpacity>
                )}

                {!webStreamActive && (
                  <TouchableOpacity
                    style={[styles.permissionBtn, { position: 'absolute', backgroundColor: theme.badgeOperational }]}
                    onPress={startWebCamera}
                  >
                    <MaterialIcons name="videocam" size={14} color="#ffffff" />
                    <Text style={styles.permissionBtnText}>Enable Webcam</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : nativePermission?.granted ? (
              <View style={StyleSheet.absoluteFillObject}>
                <CameraView
                  ref={cameraRef}
                  style={StyleSheet.absoluteFillObject}
                  facing={facing}
                />
                <View style={styles.cameraOverlay}>
                  <View style={[styles.faceGuideOval, { borderColor: theme.badgeOperational }]}>
                    <View style={[styles.guidePill, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                      <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '700' }}>FACE GUIDE</Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.flipBtn} onPress={handleToggleFacing}>
                    <MaterialIcons name="flip-camera-ios" size={20} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.placeholderCenter}>
                <View style={[styles.faceGuideOval, { borderColor: theme.isDark ? '#6b7280' : '#4b5563' }]}>
                  <MaterialIcons
                    name="account-circle"
                    size={68}
                    color={theme.isDark ? '#4b5563' : '#9ca3af'}
                  />
                  <View style={[styles.guidePill, { backgroundColor: theme.isDark ? 'rgba(30,31,35,0.85)' : 'rgba(255,255,255,0.85)' }]}>
                    <Text style={[styles.guidePillText, { color: theme.textPrimary }]}>FACE GUIDE</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.permissionBtn, { backgroundColor: theme.badgeOperational }]}
                  onPress={requestNativePermission}
                >
                  <MaterialIcons name="videocam" size={14} color="#ffffff" />
                  <Text style={styles.permissionBtnText}>Enable Live Camera</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.captureButton,
                { backgroundColor: theme.isDark ? '#ffffff' : '#0f172a' },
                isProcessing && { opacity: 0.7 },
              ]}
              onPress={handleCapturePhoto}
              disabled={isProcessing}
              activeOpacity={0.85}
            >
              {isProcessing ? (
                <ActivityIndicator color={theme.isDark ? '#000000' : '#ffffff'} size="small" />
              ) : (
                <>
                  <MaterialIcons
                    name="camera-alt"
                    size={18}
                    color={theme.isDark ? '#000000' : '#ffffff'}
                  />
                  <Text style={[styles.captureButtonText, { color: theme.isDark ? '#000000' : '#ffffff' }]}>
                    {capturedPhotoUri ? 'Recapture Photo' : 'Capture Photo'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.galleryButton, { borderColor: theme.border, backgroundColor: theme.surfaceCard }]}
              onPress={handlePickFromGallery}
              activeOpacity={0.8}
            >
              <MaterialIcons name="photo-library" size={18} color={theme.textPrimary} />
              <Text style={[styles.galleryButtonText, { color: theme.textPrimary }]}>Gallery</Text>
            </TouchableOpacity>

            {capturedPhotoUri && (
              <TouchableOpacity
                style={[styles.retakeButton, { borderColor: theme.border, backgroundColor: theme.surfaceCard }]}
                onPress={handleRetake}
                activeOpacity={0.8}
              >
                <MaterialIcons name="refresh" size={18} color={theme.textPrimary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Capture Guidelines Checklist (Dynamic MediaPipe AI Verification) */}
        <View style={styles.checklistSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.checklistHeader, { color: theme.textPrimary }]}>
              Capture checklist (AI Verification)
            </Text>
            {isProcessing && <ActivityIndicator size="small" color={theme.textPrimary} />}
          </View>

          {/* Explicit Error State Banner if No Face Detected */}
          {qualityResult && !qualityResult.face_detected && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: theme.isDark ? '#4a0e17' : '#fee2e2',
                borderColor: '#ef4444',
                borderWidth: 1,
                padding: 10,
                borderRadius: rounded.lg,
                marginBottom: 6,
              }}
            >
              <MaterialIcons name="warning" size={18} color="#ef4444" />
              <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '700', flex: 1 }}>
                {qualityResult.error_message || 'No face detected — please position yourself in frame'}
              </Text>
            </View>
          )}

          <View style={styles.checklistGrid}>
            {renderCheckItem(
              'Ensure face is centered',
              qualityResult?.face_detected ? qualityResult?.checks.face_centered : undefined
            )}
            {renderCheckItem(
              'Good lighting on subject',
              qualityResult?.face_detected ? qualityResult?.checks.good_lighting : undefined
            )}
          </View>

          {/* Computed Metrics Log Banner for Verification */}
          {qualityResult && qualityResult.face_detected && (
            <View
              style={{
                marginTop: 6,
                padding: 8,
                borderRadius: rounded.default,
                backgroundColor: theme.isDark ? '#1a1d24' : '#f1f5f9',
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 10, fontFamily: typography.fontFamily.mono, color: theme.textMuted }}>
                [MediaPipe AI Computed Metrics] X-Offset: {qualityResult.checks.face_centered.metrics?.offset_x_pct}%, Y-Offset: {qualityResult.checks.face_centered.metrics?.offset_y_pct}% | Brightness: {qualityResult.checks.good_lighting.metrics?.brightness}/255
              </Text>
            </View>
          )}
        </View>

        {/* Footer Card */}
        <View style={[styles.footerCard, { backgroundColor: theme.surfaceCard, borderColor: theme.border }]}>
          <View style={styles.metaRow}>
            <Text style={[styles.footerMetaText, { color: theme.textMuted }]}>
              Checkpoint: <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>CHK-00184</Text>
            </Text>
            <Text style={[styles.footerMetaText, { color: theme.textMuted }]}>
              Officer: <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>OFF-1042</Text>
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.nextButton,
              { backgroundColor: theme.isDark ? '#ffffff' : '#0f172a' },
              !capturedPhotoUri && { opacity: 0.6 },
            ]}
            onPress={handleProceed}
            activeOpacity={0.85}
          >
            <Text style={[styles.nextButtonText, { color: theme.isDark ? '#000000' : '#ffffff' }]}>
              Next: Document Upload
            </Text>
            <MaterialIcons name="arrow-forward" size={18} color={theme.isDark ? '#000000' : '#ffffff'} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
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
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleCol: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  pageSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  idBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: rounded.default,
    borderWidth: 1,
  },
  idBadgeLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamily.mono,
  },
  idBadgeValue: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.fontFamily.mono,
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
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepCircleActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  stepNumActive: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  stepNum: {
    fontSize: 11,
  },
  stepLabel: {
    fontSize: 11,
    fontFamily: typography.fontFamily.mono,
  },
  stepLine: {
    flex: 1,
    height: 1,
    minWidth: 10,
    marginHorizontal: 4,
  },
  cameraCard: {
    borderRadius: rounded.xl,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cameraTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cameraSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  cameraReadyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: rounded.default,
    borderWidth: 1,
  },
  readyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cameraReadyText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: typography.fontFamily.mono,
  },
  viewport: {
    height: 260,
    borderRadius: rounded.lg,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  previewContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capturedImage: {
    width: '100%',
    height: '100%',
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceGuideOval: {
    width: 150,
    height: 190,
    borderRadius: 95,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 10,
  },
  guidePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.default,
  },
  guidePillText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: typography.fontFamily.mono,
  },
  flipBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 20,
  },
  placeholderCenter: {
    alignItems: 'center',
    gap: 14,
  },
  permissionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: rounded.lg,
  },
  permissionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  captureButton: {
    flex: 1,
    height: 44,
    borderRadius: rounded.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  captureButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  galleryButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: rounded.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  galleryButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  retakeButton: {
    width: 44,
    height: 44,
    borderRadius: rounded.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checklistSection: {
    gap: 8,
  },
  checklistHeader: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.fontFamily.mono,
  },
  checklistGrid: {
    gap: 6,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: rounded.lg,
    borderWidth: 1,
  },
  checkItemText: {
    fontSize: 12,
  },
  footerCard: {
    borderRadius: rounded.xl,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerMetaText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.mono,
  },
  nextButton: {
    height: 46,
    borderRadius: rounded.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
