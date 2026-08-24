import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, rounded, spacing } from '../theme/theme';
import { SecurityAlert } from '../types';

import { api } from '../services/api';

interface AlertsScreenProps {
  alerts: SecurityAlert[];
  onAcknowledgeAlert: (id: string) => void;
  onSelectDocRef?: (docId: string) => void;
}

export const AlertsScreen: React.FC<AlertsScreenProps> = ({
  alerts,
  onAcknowledgeAlert,
  onSelectDocRef,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'ALL') return true;
    return a.severity === filter;
  });

  const getSeverityTheme = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          icon: 'warning' as const,
          color: '#ff453a',
          bg: '#3d1818',
          border: '#6b2c2c',
        };
      case 'WARNING':
        return {
          icon: 'report-problem' as const,
          color: colors.warning,
          bg: colors.warningBg,
          border: colors.warningBorder,
        };
      case 'INFO':
      default:
        return {
          icon: 'info' as const,
          color: colors.primary,
          bg: colors.surfaceContainerHigh,
          border: colors.outlineVariant,
        };
    }
  };

  const handleTriggerAlarm = async () => {
    try {
      await api.broadcastAlert(
        'BROADCAST: Checkpoint Scrutiny Directive',
        'Sector Alarm broadcast sent to Raxaul Checkpoint North/South bays and Central Command.',
        'WARNING',
        'Checkpoint CHK-00184'
      );
    } catch (e) {}

    Alert.alert(
      'Broadcast Security Alert',
      'Sector Alarm broadcast sent to Raxaul Checkpoint North/South bays and Central Command.'
    );
  };

  const handleAck = (id: string) => {
    api.acknowledgeAlert(id);
    onAcknowledgeAlert(id);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.badgeRow}>
            <MaterialIcons name="notifications-active" size={14} color={colors.onSurfaceVariant} />
            <Text style={styles.badgeText}>FORCE THREAT INTELLIGENCE FEED</Text>
          </View>
          <Text style={styles.title}>Security & Watchlist Alerts</Text>
          <Text style={styles.subtitle}>
            Live security advisories and automated biometric threat detections.
          </Text>
        </View>

        {/* Action Header */}
        <TouchableOpacity
          style={styles.broadcastBanner}
          onPress={handleTriggerAlarm}
          activeOpacity={0.8}
        >
          <MaterialIcons name="campaign" size={24} color="#ff453a" />
          <View style={styles.broadcastText}>
            <Text style={styles.broadcastTitle}>BROADCAST CHECKPOINT ADVISORY</Text>
            <Text style={styles.broadcastSub}>
              Tap to issue instant lockdown or secondary scrutiny directive.
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>

        {/* Severity Filter */}
        <View style={styles.filterRow}>
          {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((sev) => {
            const isSelected = filter === sev;
            return (
              <TouchableOpacity
                key={sev}
                style={[
                  styles.filterBtn,
                  isSelected && styles.filterBtnActive,
                ]}
                onPress={() => setFilter(sev)}
              >
                <Text
                  style={[
                    styles.filterBtnText,
                    isSelected && styles.filterBtnTextActive,
                  ]}
                >
                  {sev}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Alerts List */}
        <View style={styles.alertsList}>
          {filteredAlerts.map((item) => {
            const theme = getSeverityTheme(item.severity);
            return (
              <View
                key={item.id}
                style={[
                  styles.alertCard,
                  { borderColor: item.acknowledged ? colors.outlineVariant : theme.border },
                ]}
              >
                <View style={styles.alertHeader}>
                  <View style={styles.alertHeaderLeft}>
                    <View
                      style={[
                        styles.severityBadge,
                        { backgroundColor: theme.bg, borderColor: theme.border },
                      ]}
                    >
                      <MaterialIcons name={theme.icon} size={14} color={theme.color} />
                      <Text style={[styles.severityText, { color: theme.color }]}>
                        {item.severity}
                      </Text>
                    </View>
                    <Text style={styles.alertTime}>{item.timestamp}</Text>
                  </View>

                  <Text style={styles.alertLoc}>{item.location}</Text>
                </View>

                <Text style={styles.alertTitle}>{item.title}</Text>
                <Text style={styles.alertDesc}>{item.description}</Text>

                <View style={styles.alertFooter}>
                  {item.docRef ? (
                    <TouchableOpacity
                      style={styles.docRefBtn}
                      onPress={() => onSelectDocRef && onSelectDocRef(item.docRef!)}
                    >
                      <MaterialIcons name="link" size={14} color={colors.primary} />
                      <Text style={styles.docRefText}>Audit Record {item.docRef}</Text>
                    </TouchableOpacity>
                  ) : <View />}

                  <TouchableOpacity
                    style={[
                      styles.ackBtn,
                      item.acknowledged && styles.ackBtnDone,
                    ]}
                    onPress={() => handleAck(item.id)}
                  >
                    <MaterialIcons
                      name={item.acknowledged ? 'check' : 'done-all'}
                      size={14}
                      color={item.acknowledged ? colors.onSurfaceVariant : colors.onPrimary}
                    />
                    <Text
                      style={[
                        styles.ackBtnText,
                        item.acknowledged && styles.ackBtnTextDone,
                      ]}
                    >
                      {item.acknowledged ? 'ACKNOWLEDGED' : 'ACKNOWLEDGE'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: spacing.stackMd,
    paddingBottom: 90,
    gap: 16,
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
  broadcastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#291417',
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: '#6b2c2c',
    padding: 16,
  },
  broadcastText: {
    flex: 1,
  },
  broadcastTitle: {
    color: '#ff453a',
    fontSize: 12,
    fontFamily: typography.fontFamily.mono,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  broadcastSub: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterBtnText: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontFamily: typography.fontFamily.mono,
    fontWeight: '600',
  },
  filterBtnTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  alertsList: {
    gap: 12,
  },
  alertCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: rounded.lg,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: rounded.default,
    borderWidth: 1,
  },
  severityText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.mono,
    fontWeight: '700',
  },
  alertTime: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontFamily: typography.fontFamily.mono,
  },
  alertLoc: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontFamily: typography.fontFamily.mono,
  },
  alertTitle: {
    color: colors.primary,
    fontSize: typography.sizes.bodyLg,
    fontWeight: '600',
  },
  alertDesc: {
    color: colors.onSurfaceVariant,
    fontSize: typography.sizes.bodySm,
    lineHeight: 18,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(68, 71, 72, 0.4)',
    paddingTop: 10,
    marginTop: 4,
  },
  docRefBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: rounded.default,
  },
  docRefText: {
    color: colors.primary,
    fontSize: 11,
    fontFamily: typography.fontFamily.mono,
  },
  ackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: rounded.default,
  },
  ackBtnDone: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  ackBtnText: {
    color: colors.onPrimary,
    fontSize: 10,
    fontFamily: typography.fontFamily.mono,
    fontWeight: '700',
  },
  ackBtnTextDone: {
    color: colors.onSurfaceVariant,
  },
});
