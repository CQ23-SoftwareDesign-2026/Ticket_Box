import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { SurfaceCard } from '@/components/ui/surface-card';
import { StatusPill } from '@/components/ui/status-pill';
import { colors, radii, spacing } from '@/constants/theme';
import { routes } from '@/lib/routes';
import { scanSessionStorage } from '@/lib/storage';

type ConcertOption = {
  id: string;
  title: string;
  venue: string;
  schedule: string;
  capacity: string;
  zone: string;
  tag?: string;
};

type GateOption = {
  label: string;
  lane: string;
  status: string;
  tone: 'info' | 'warning' | 'neutral';
};

const CONCERTS: ConcertOption[] = [
  {
    id: 'midnight-tour',
    title: 'The Midnight Tour',
    venue: 'Main Arena',
    schedule: 'Tonight - 20:00',
    capacity: '12,000 guests',
    zone: 'City Center',
    tag: 'Featured',
  },
  {
    id: 'summer-fest',
    title: 'Summer Fest 2024',
    venue: 'North Grounds',
    schedule: 'July 14 - 14:00',
    capacity: '45,000 guests',
    zone: 'Outdoor Field',
  },
  {
    id: 'echoes-of-light',
    title: 'Echoes of Light',
    venue: 'Opera Hall',
    schedule: 'July 15 - 19:30',
    capacity: '2,500 guests',
    zone: 'Downtown District',
  },
];

const GATES: GateOption[] = [
  { label: 'Gate A', lane: 'North lane', status: 'Fast flow', tone: 'neutral' },
  { label: 'Gate B', lane: 'Main lane', status: 'Recommended', tone: 'info' },
  { label: 'Gate C', lane: 'South lane', status: 'Balanced', tone: 'neutral' },
  { label: 'Gate D', lane: 'Backup lane', status: 'Low traffic', tone: 'neutral' },
  { label: 'VIP Entry', lane: 'Premium access', status: 'Priority guests', tone: 'warning' },
];

export function SessionSetupScreen() {
  const router = useRouter();
  const [selectedConcertId, setSelectedConcertId] = useState(CONCERTS[0].id);
  const [selectedGate, setSelectedGate] = useState('Gate B');

  const selectedConcert = useMemo(
    () => CONCERTS.find((concert) => concert.id === selectedConcertId) ?? CONCERTS[0],
    [selectedConcertId],
  );

  const selectedGateOption = useMemo(
    () => GATES.find((gate) => gate.label === selectedGate) ?? GATES[1],
    [selectedGate],
  );

  const handleStartScanning = async () => {
    await scanSessionStorage.setCurrentSession({
      concertId: selectedConcert.id,
      concertTitle: selectedConcert.title,
      concertVenue: selectedConcert.venue,
      gateLabel: selectedGate,
      prefetchedAt: new Date().toISOString(),
    });

    router.push(routes.staffScanner);
  };

  return (
    <AppScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <AppText variant="eyebrow" tone="primary">
              Session setup
            </AppText>
            <AppText variant="hero">Prepare the scanner.</AppText>
            <AppText tone="muted">
              Configure one clear check-in session before the staff member enters live scan mode.
            </AppText>
          </View>
          <Button icon="arrow-left" label="Back" onPress={() => router.back()} variant="ghost" />
        </View>

        <View style={styles.progressRail}>
          <View style={styles.progressStep}>
            <View style={[styles.progressBadge, styles.progressBadgeActive]}>
              <AppText variant="eyebrow" style={styles.progressTextActive}>
                1
              </AppText>
            </View>
            <AppText variant="label">Concert</AppText>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressStep}>
            <View style={[styles.progressBadge, styles.progressBadgeActive]}>
              <AppText variant="eyebrow" style={styles.progressTextActive}>
                2
              </AppText>
            </View>
            <AppText variant="label">Gate</AppText>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressStep}>
            <View style={styles.progressBadge}>
              <AppText variant="eyebrow" tone="muted">
                3
              </AppText>
            </View>
            <AppText variant="label">Launch</AppText>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <AppText variant="eyebrow" tone="muted">
            Select concert
          </AppText>
          <AppText tone="primary">{CONCERTS.length} available</AppText>
        </View>

        <View style={styles.concertStack}>
          {CONCERTS.map((concert) => {
            const isSelected = concert.id === selectedConcertId;

            return (
              <Pressable
                key={concert.id}
                onPress={() => setSelectedConcertId(concert.id)}
                style={[styles.concertCard, isSelected ? styles.concertCardActive : null]}
              >
                <View style={styles.concertGlow} />
                <View style={[styles.concertAccent, isSelected ? styles.concertAccentActive : null]} />
                <View style={styles.concertContent}>
                  <View style={styles.concertMeta}>
                    <View style={styles.concertTopline}>
                      {concert.tag ? <StatusPill label={concert.tag} tone="info" /> : <View />}
                      <AppText tone="muted">{concert.schedule}</AppText>
                    </View>
                    <AppText variant="title">{concert.title}</AppText>
                    <AppText tone="muted">{concert.venue}</AppText>
                  </View>

                  <View style={styles.concertFoot}>
                    <View style={styles.concertFacts}>
                      <View style={styles.factColumn}>
                        <AppText variant="eyebrow" tone="muted">
                          Capacity
                        </AppText>
                        <AppText variant="label">{concert.capacity}</AppText>
                      </View>
                      <View style={styles.factColumn}>
                        <AppText variant="eyebrow" tone="muted">
                          Zone
                        </AppText>
                        <AppText variant="label">{concert.zone}</AppText>
                      </View>
                    </View>

                    <View style={[styles.selectBadge, isSelected ? styles.selectBadgeActive : null]}>
                      <MaterialCommunityIcons
                        color={isSelected ? colors.background : colors.textSoft}
                        name={isSelected ? 'check-circle' : 'arrow-right'}
                        size={18}
                      />
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <AppText variant="eyebrow" tone="muted">
            Select gate
          </AppText>
          <AppText tone="muted">Assigned lane</AppText>
        </View>

        <View style={styles.gateList}>
          {GATES.map((gate) => {
            const isSelected = gate.label === selectedGate;

            return (
              <Pressable
                key={gate.label}
                onPress={() => setSelectedGate(gate.label)}
                style={[styles.gateRow, isSelected ? styles.gateRowActive : null]}
              >
                <View style={styles.gateRowLeft}>
                  <View
                    style={[
                      styles.gateIconWrap,
                      gate.label === 'VIP Entry' ? styles.gateIconVip : null,
                      isSelected ? styles.gateIconWrapActive : null,
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={isSelected ? colors.background : gate.label === 'VIP Entry' ? colors.warning : colors.primary}
                      name={gate.label === 'VIP Entry' ? 'star-four-points' : 'gate'}
                      size={18}
                    />
                  </View>
                  <View style={styles.gateRowText}>
                    <AppText variant="subtitle">{gate.label}</AppText>
                    <AppText tone="muted">
                      {gate.lane} - {gate.status}
                    </AppText>
                  </View>
                </View>
                <StatusPill label={gate.status} tone={gate.tone} />
              </Pressable>
            );
          })}
        </View>

        <SurfaceCard variant="default" style={styles.syncCard}>
          <View style={styles.syncRow}>
            <View style={styles.syncIconWrap}>
              <MaterialCommunityIcons color={colors.success} name="cloud-check-outline" size={22} />
            </View>
            <View style={styles.syncText}>
              <AppText variant="subtitle">Offline data ready</AppText>
              <AppText tone="muted">
                Prefetch the valid ticket set for {selectedConcert.title} and {selectedGate} before entering a weak-signal area.
              </AppText>
            </View>
          </View>
          <View style={styles.syncMetaRow}>
            <StatusPill label="Data synced" tone="success" />
            <AppText tone="muted">v2.4.0 - updated 2m ago</AppText>
          </View>
        </SurfaceCard>

        <SurfaceCard variant="hero" style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCopy}>
              <AppText variant="eyebrow" tone="primary">
                Ready to launch
              </AppText>
              <AppText variant="subtitle">{selectedConcert.title}</AppText>
              <AppText tone="muted">
                {selectedGate} - {selectedConcert.venue}
              </AppText>
            </View>
            <View style={styles.summaryBadge}>
              <MaterialCommunityIcons color={colors.primary} name="qrcode-scan" size={24} />
            </View>
          </View>

          <View style={styles.summaryMeta}>
            <View style={styles.summaryMetaItem}>
              <AppText variant="eyebrow" tone="muted">
                Session
              </AppText>
              <AppText variant="label">Checker shift</AppText>
            </View>
            <View style={styles.summaryMetaDivider} />
            <View style={styles.summaryMetaItem}>
              <AppText variant="eyebrow" tone="muted">
                Strategy
              </AppText>
              <AppText variant="label">Offline-first</AppText>
            </View>
            <View style={styles.summaryMetaDivider} />
            <View style={styles.summaryMetaItem}>
              <AppText variant="eyebrow" tone="muted">
                Lane
              </AppText>
              <AppText variant="label">{selectedGateOption.lane}</AppText>
            </View>
          </View>

          <Button icon="qrcode-scan" label="Start scanning" onPress={handleStartScanning} />
        </SurfaceCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  progressRail: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  progressStep: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  progressBadge: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: colors.surfaceOverlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBadgeActive: {
    backgroundColor: colors.primary,
  },
  progressTextActive: {
    color: colors.background,
  },
  progressLine: {
    flex: 1,
    height: 1,
    marginHorizontal: spacing.sm,
    backgroundColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  concertStack: {
    gap: spacing.md,
  },
  concertCard: {
    minHeight: 204,
    borderRadius: radii.lg,
    backgroundColor: colors.backgroundPanel,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.24,
    shadowRadius: 26,
    elevation: 10,
  },
  concertCardActive: {
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
  },
  concertGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceOverlay,
  },
  concertAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.surfaceSoft,
  },
  concertAccentActive: {
    backgroundColor: colors.primary,
  },
  concertContent: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  concertMeta: {
    gap: spacing.sm,
  },
  concertTopline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  concertFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  concertFacts: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
  },
  factColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  selectBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectBadgeActive: {
    backgroundColor: colors.primary,
  },
  gateList: {
    gap: spacing.sm,
  },
  gateRow: {
    minHeight: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  gateRowActive: {
    backgroundColor: colors.surfaceElevated,
  },
  gateRowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  gateIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateIconWrapActive: {
    backgroundColor: colors.primary,
  },
  gateIconVip: {
    backgroundColor: colors.warningSoft,
  },
  gateRowText: {
    flex: 1,
    gap: spacing.xs,
  },
  syncCard: {
    gap: spacing.md,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  syncIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncText: {
    flex: 1,
    gap: spacing.xs,
  },
  syncMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryCard: {
    gap: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  summaryCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  summaryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  summaryMetaItem: {
    flex: 1,
    gap: spacing.xs,
  },
  summaryMetaDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
  summaryBadge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.surfaceOverlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
