import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  LogBox,
} from 'react-native';

LogBox.ignoreLogs(['SafeAreaView has been deprecated']);
import { TopAppBar } from './src/components/TopAppBar';
import { BottomNavBar, TabType } from './src/components/BottomNavBar';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { FaceCaptureScreen } from './src/screens/FaceCaptureScreen';
import { DocumentUploadScreen } from './src/screens/DocumentUploadScreen';
import { VerificationResultScreen } from './src/screens/VerificationResultScreen';
import { RecordsScreen } from './src/screens/RecordsScreen';
import { RecordDetailModal } from './src/screens/RecordDetailModal';
import { mockOfficer, initialRecords } from './src/mockData';
import { ScreeningRecord, OfficerProfile } from './src/types';
import { getTheme } from './src/theme/theme';
import { api } from './src/services/api';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [officer, setOfficer] = useState<OfficerProfile>(mockOfficer);
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [scanStep, setScanStep] = useState<1 | 2 | 3>(1);
  const [records, setRecords] = useState<ScreeningRecord[]>(initialRecords);
  const [selectedRecord, setSelectedRecord] = useState<ScreeningRecord | null>(null);
  const [capturedFaceUri, setCapturedFaceUri] = useState<string | null>(null);
  const [activeScreeningResult, setActiveScreeningResult] = useState<ScreeningRecord | null>(null);

  const theme = getTheme(isDarkMode);

  // Load real records from backend database on mount
  useEffect(() => {
    api.getScreeningRecords().then((fetched) => {
      if (fetched && fetched.length > 0) {
        setRecords(fetched);
      }
    });
  }, []);

  // Authentication
  const handleLoginSuccess = (officerData: any) => {
    setOfficer((prev) => ({
      ...prev,
      id: officerData.id || prev.id,
      name: officerData.name || 'Officer Verma',
      role: officerData.role || 'checkpoint',
      checkpoint: officerData.checkpoint || prev.checkpoint,
      rank: officerData.rank || prev.rank,
    }));
    setIsAuthenticated(true);
    setCurrentTab('dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  // Verification Step Flow
  const handleStartNewVerification = () => {
    setScanStep(1);
    setCapturedFaceUri(null);
    setActiveScreeningResult(null);
    setCurrentTab('scan');
  };

  const handleAcceptVerification = (newRecord: ScreeningRecord) => {
    api.updateRecordStatus(newRecord.id, 'VERIFIED');
    setRecords((prev) => {
      const exists = prev.some((r) => r.id === newRecord.id);
      return exists ? prev.map((r) => (r.id === newRecord.id ? newRecord : r)) : [newRecord, ...prev];
    });
    setScanStep(1);
    setCurrentTab('records');
  };

  const handleDenyVerification = (newRecord: ScreeningRecord) => {
    api.updateRecordStatus(newRecord.id, 'MISMATCH');
    setRecords((prev) => {
      const exists = prev.some((r) => r.id === newRecord.id);
      return exists ? prev.map((r) => (r.id === newRecord.id ? newRecord : r)) : [newRecord, ...prev];
    });
    setScanStep(1);
    setCurrentTab('records');
  };

  const handleUpdateRecordStatus = (recordId: string, newStatus: any) => {
    api.updateRecordStatus(recordId, newStatus);
    setRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, status: newStatus } : r))
    );
    if (selectedRecord && selectedRecord.id === recordId) {
      setSelectedRecord((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.containerDark}>
        <StatusBar barStyle="light-content" backgroundColor="#121317" />
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.headerBg}
      />

      {/* Top App Bar with Emblem and Security Indicator */}
      {!(currentTab === 'scan' && scanStep === 3) && (
        <TopAppBar
          onPressSecurity={() => setCurrentTab('settings')}
          isDark={isDarkMode}
        />
      )}

      {/* Active Screen Tab View */}
      <View style={[styles.screenContainer, { backgroundColor: theme.background }]}>
        {/* Tab 1: Dashboard */}
        {currentTab === 'dashboard' && (
          <DashboardScreen
            officer={officer}
            records={records}
            onStartVerification={handleStartNewVerification}
            onSelectRecord={(rec) => setSelectedRecord(rec)}
            onNavigateToRecords={() => setCurrentTab('records')}
            isDark={isDarkMode}
          />
        )}

        {/* Tab 2: Verification Flow (Step 1, 2, 3) */}
        {currentTab === 'scan' && (
          <>
            {scanStep === 1 && (
              <FaceCaptureScreen
                onBack={() => setCurrentTab('dashboard')}
                onNext={(photoUri) => {
                  if (photoUri) setCapturedFaceUri(photoUri);
                  setScanStep(2);
                }}
                isDark={isDarkMode}
              />
            )}
            {scanStep === 2 && (
              <DocumentUploadScreen
                onBack={() => setScanStep(1)}
                capturedPhotoUri={capturedFaceUri}
                onNext={(result) => {
                  if (result) setActiveScreeningResult(result);
                  setScanStep(3);
                }}
                isDark={isDarkMode}
              />
            )}
            {scanStep === 3 && (
              <VerificationResultScreen
                onBack={() => setScanStep(2)}
                record={activeScreeningResult}
                onAccept={handleAcceptVerification}
                onDeny={handleDenyVerification}
                onNewVerification={handleStartNewVerification}
                isDark={isDarkMode}
              />
            )}
          </>
        )}

        {/* Tab 3: Records Screen */}
        {currentTab === 'records' && (
          <RecordsScreen
            records={records}
            onSelectRecord={(rec) => setSelectedRecord(rec)}
            isDark={isDarkMode}
          />
        )}

        {/* Tab 4: Settings Screen */}
        {currentTab === 'settings' && (
          <SettingsScreen
            officer={officer}
            onLogout={handleLogout}
            isDark={isDarkMode}
            onToggleDarkMode={(val) => setIsDarkMode(val)}
          />
        )}
      </View>

      {/* Persistent Bottom Navigation Bar */}
      {!(currentTab === 'scan' && scanStep === 3) && (
        <BottomNavBar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab === 'scan') {
              setScanStep(1);
            }
            setCurrentTab(tab);
          }}
          isDark={isDarkMode}
        />
      )}

      {/* Record Inspection Modal */}
      <RecordDetailModal
        visible={!!selectedRecord}
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onUpdateStatus={handleUpdateRecordStatus}
        isDark={isDarkMode}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerDark: {
    flex: 1,
    backgroundColor: '#121317',
  },
  screenContainer: {
    flex: 1,
  },
});
