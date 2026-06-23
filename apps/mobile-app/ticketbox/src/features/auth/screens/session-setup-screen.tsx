import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { SurfaceCard } from '@/components/ui/surface-card';
import { StatusPill } from '@/components/ui/status-pill';
import { colors, radii, spacing } from '@/constants/theme';
import { checkinApi } from '@/features/checkin/api/checkin-api';
import { useCurrentScanSession } from '@/features/checkin/hooks/use-current-scan-session';
import { concertApi } from '@/features/checkin/api/concert-api';
import type { ConcertDetail, ConcertListItem } from '@/features/checkin/types/checkin.types';
import { getErrorMessage } from '@/lib/errors';
import { routes } from '@/lib/routes';
import { prefetchStorage, scanSessionStorage } from '@/lib/storage';

type GateOption = {
  gateNumber: number;
  label: string;
  lane: string;
  status: string;
  tone: 'info' | 'warning' | 'neutral';
};

export function SessionSetupScreen() {
  const router = useRouter();
  const { session: currentSession } = useCurrentScanSession();
  const [concerts, setConcerts] = useState<ConcertListItem[]>([]);
  const [selectedConcertId, setSelectedConcertId] = useState<string | null>(null);
  const [selectedGateNumber, setSelectedGateNumber] = useState<number | null>(null);
  const [isGateConfirmationVisible, setIsGateConfirmationVisible] = useState(false);
  const [concertDetail, setConcertDetail] = useState<ConcertDetail | null>(null);
  const [concertsError, setConcertsError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isConcertsLoading, setIsConcertsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadConcerts() {
      setIsConcertsLoading(true);
      setConcertsError(null);

      try {
        const response = await concertApi.listPublishedConcerts();
        setConcerts(response.data);

        if (response.data.length > 0) {
          setSelectedConcertId((current) => current ?? response.data[0].id);
        }
      } catch (error) {
        setConcertsError(getErrorMessage(error, 'Unable to load concerts right now.'));
      } finally {
        setIsConcertsLoading(false);
      }
    }

    void loadConcerts();
  }, []);

  useEffect(() => {
    if (!selectedConcertId) {
      setConcertDetail(null);
      setSelectedGateNumber(null);
      setIsGateConfirmationVisible(false);
      return;
    }

    const concertId = selectedConcertId;

    async function loadConcertDetail() {
      setIsDetailLoading(true);
      setDetailError(null);

      try {
        const response = await concertApi.getConcert(concertId);
        setConcertDetail(response);
      } catch (error) {
        setConcertDetail(null);
        setDetailError(getErrorMessage(error, 'Unable to load gate configuration for this concert.'));
      } finally {
        setIsDetailLoading(false);
      }
    }

    void loadConcertDetail();
  }, [selectedConcertId]);

  const selectedConcert = useMemo(
    () => concerts.find((concert) => concert.id === selectedConcertId) ?? null,
    [concerts, selectedConcertId],
  );

  const gateOptions = useMemo<GateOption[]>(() => {
    if (!concertDetail) {
      return [];
    }

    const gateMap = new Map<number, string[]>();

    for (const tier of concertDetail.ticketTiers) {
      if (typeof tier.gate_number !== 'number') {
        continue;
      }

      const existing = gateMap.get(tier.gate_number) ?? [];
      existing.push(tier.name);
      gateMap.set(tier.gate_number, existing);
    }

    const gateNumbers = Array.from(gateMap.keys()).sort((a, b) => a - b);

    return gateNumbers.map((gateNumber, index) => {
      const tierNames = gateMap.get(gateNumber) ?? [];
      const tierCount = tierNames.length;

      return {
        gateNumber,
        label: `Gate ${gateNumber}`,
        lane: tierCount === 1 ? tierNames[0] : `${tierCount} ticket tiers`,
        status: index === 0 ? 'Recommended' : `${tierCount} tier${tierCount > 1 ? 's' : ''}`,
        tone: index === 0 ? 'info' : gateNumber >= 10 ? 'warning' : 'neutral',
      };
    });
  }, [concertDetail]);

  useEffect(() => {
    if (gateOptions.length === 0) {
      setSelectedGateNumber(null);
      setIsGateConfirmationVisible(false);
      return;
    }

    setSelectedGateNumber((current) => {
      if (current && gateOptions.some((gate) => gate.gateNumber === current)) {
        return current;
      }

      return gateOptions[0].gateNumber;
    });
    setIsGateConfirmationVisible(true);
  }, [gateOptions]);

  const selectedGateOption = useMemo(
    () => gateOptions.find((gate) => gate.gateNumber === selectedGateNumber) ?? null,
    [gateOptions, selectedGateNumber],
  );

  const handleRetryConcerts = async () => {
    setIsConcertsLoading(true);
    setConcertsError(null);

    try {
      const response = await concertApi.listPublishedConcerts();
      setConcerts(response.data);

      if (response.data.length > 0) {
        setSelectedConcertId(response.data[0].id);
      }
    } catch (error) {
      setConcertsError(getErrorMessage(error, 'Unable to load concerts right now.'));
    } finally {
      setIsConcertsLoading(false);
    }
  };

  const handleGatePress = (gateNumber: number) => {
    setSubmitError(null);

    if (selectedGateNumber === gateNumber) {
      setIsGateConfirmationVisible((current) => !current);
      return;
    }

    setSelectedGateNumber(gateNumber);
    setIsGateConfirmationVisible(true);
  };

  const handleStartScanning = async () => {
    if (!selectedConcert || !selectedGateOption) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const hashes = await checkinApi.prefetchTickets(selectedConcert.id, selectedGateOption.gateNumber);
      const prefetchedAt = new Date().toISOString();

      await prefetchStorage.setPrefetchedTicketSet({
        concertId: selectedConcert.id,
        gateNumber: selectedGateOption.gateNumber,
        hashes,
        prefetchedAt,
      });

      await scanSessionStorage.setCurrentSession({
        concertId: selectedConcert.id,
        concertTitle: selectedConcert.name,
        concertVenue: selectedConcert.location,
        gateNumber: selectedGateOption.gateNumber,
        gateLabel: selectedGateOption.label,
        prefetchedHashCount: hashes.length,
        prefetchedAt,
      });

      router.push(routes.staffScanner);
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Prefetch failed. Please try again before entering scan mode.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppScreen contentBottomPadding={20} scroll={false}>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <AppText variant="eyebrow" tone="primary">
              Session setup
            </AppText>
            <AppText variant="hero">Prepare the scanner.</AppText>
            <AppText tone="muted">
              Pick a concert and gate, then start scanning.
            </AppText>
          </View>
          <Button icon="arrow-left" label="Back" onPress={() => router.back()} variant="ghost" />
        </View>

        {currentSession ? (
          <SurfaceCard variant="elevated" style={styles.resumeCard}>
            <View style={styles.resumeHeader}>
              <View style={styles.resumeCopy}>
                <AppText variant="eyebrow" tone="primary">
                  Active session on this device
                </AppText>
                <AppText variant="subtitle">{currentSession.concertTitle}</AppText>
                <AppText tone="muted">
                  {currentSession.gateLabel} - {currentSession.concertVenue}
                </AppText>
              </View>
              <StatusPill label={`${currentSession.prefetchedHashCount} hashes`} tone="success" />
            </View>
            <View style={styles.resumeActions}>
              <Button icon="qrcode-scan" label="Open current scanner" onPress={() => router.push(routes.staffScanner)} />
            </View>
          </SurfaceCard>
        ) : null}

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
            <View style={[styles.progressBadge, selectedGateOption ? styles.progressBadgeActive : null]}>
              <AppText variant="eyebrow" style={selectedGateOption ? styles.progressTextActive : undefined} tone={selectedGateOption ? undefined : 'muted'}>
                2
              </AppText>
            </View>
            <AppText variant="label">Gate</AppText>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressStep}>
            <View style={[styles.progressBadge, selectedGateOption ? styles.progressBadgeActive : null]}>
              <AppText variant="eyebrow" style={selectedGateOption ? styles.progressTextActive : undefined} tone={selectedGateOption ? undefined : 'muted'}>
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
          <AppText tone="primary">{concerts.length} live</AppText>
        </View>

        {isConcertsLoading ? (
          <SurfaceCard variant="default" style={styles.centerStateCard}>
            <ActivityIndicator color={colors.primary} />
            <AppText tone="muted">Loading published concerts...</AppText>
          </SurfaceCard>
        ) : concertsError ? (
          <SurfaceCard variant="danger" style={styles.centerStateCard}>
            <MaterialCommunityIcons color={colors.danger} name="alert-circle-outline" size={24} />
            <AppText variant="subtitle">Concert feed unavailable</AppText>
            <AppText tone="muted">{concertsError}</AppText>
            <Button icon="refresh" label="Retry" onPress={handleRetryConcerts} />
          </SurfaceCard>
        ) : concerts.length === 0 ? (
          <SurfaceCard variant="default" style={styles.centerStateCard}>
            <MaterialCommunityIcons color={colors.warning} name="calendar-remove-outline" size={24} />
            <AppText variant="subtitle">No published concerts</AppText>
            <AppText tone="muted">The backend did not return any concert that can be used for check-in.</AppText>
          </SurfaceCard>
        ) : (
          <View style={styles.concertStack}>
            {concerts.map((concert) => {
              const isSelected = concert.id === selectedConcertId;
              const showInlineSessions = isSelected && !isDetailLoading && !detailError && gateOptions.length > 0;
              const showInlineLoading = isSelected && isDetailLoading;
              const showInlineError = isSelected && Boolean(detailError);
              const showInlineEmpty = isSelected && !isDetailLoading && !detailError && gateOptions.length === 0;

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
                        <StatusPill label={concert.status} tone="info" />
                        <AppText tone="muted">{formatSchedule(concert.start_time)}</AppText>
                      </View>
                      <AppText variant="title">{concert.name}</AppText>
                      <AppText tone="muted">{concert.location}</AppText>
                    </View>

                    <View style={styles.concertFoot}>
                      <View style={styles.concertFacts}>
                        <View style={styles.factColumn}>
                          <AppText variant="eyebrow" tone="muted">
                            Availability
                          </AppText>
                          <AppText variant="label">Published</AppText>
                        </View>
                        <View style={styles.factColumn}>
                          <AppText variant="eyebrow" tone="muted">
                            Setup
                          </AppText>
                          <AppText variant="label">{concert.id === selectedConcertId && isDetailLoading ? 'Loading gates...' : 'Ready'}</AppText>
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

                    {isSelected ? <View style={styles.inlineDivider} /> : null}

                    {showInlineLoading ? (
                      <View style={styles.inlineStateRow}>
                        <ActivityIndicator color={colors.primary} />
                        <AppText tone="muted">Loading available gate sessions...</AppText>
                      </View>
                    ) : null}

                    {showInlineError ? (
                      <View style={styles.inlineStateCard}>
                        <View style={styles.inlineStateHeader}>
                          <MaterialCommunityIcons color={colors.danger} name="map-marker-alert-outline" size={18} />
                          <AppText variant="label">Gate sessions unavailable</AppText>
                        </View>
                        <AppText tone="muted">{detailError}</AppText>
                      </View>
                    ) : null}

                    {showInlineEmpty ? (
                      <View style={styles.inlineStateCard}>
                        <View style={styles.inlineStateHeader}>
                          <MaterialCommunityIcons color={colors.warning} name="gate-alert" size={18} />
                          <AppText variant="label">No gate sessions configured</AppText>
                        </View>
                        <AppText tone="muted">
                          This concert does not have any `gate_number` configured in its ticket tiers yet.
                        </AppText>
                      </View>
                    ) : null}

                    {showInlineSessions ? (
                      <View style={styles.inlineSessionsBlock}>
                        <View style={styles.inlineSessionsHeader}>
                          <AppText variant="eyebrow" tone="primary">
                            Gates
                          </AppText>
                          <AppText tone="muted">{gateOptions.length} gates</AppText>
                        </View>
                        <View style={styles.inlineSessionGrid}>
                          {gateOptions.map((gate) => {
                            const isGateSelected = gate.gateNumber === selectedGateNumber;

                            return (
                              <Pressable
                                key={`${concert.id}-${gate.gateNumber}`}
                                onPress={() => handleGatePress(gate.gateNumber)}
                                style={[styles.inlineSessionChip, isGateSelected ? styles.inlineSessionChipActive : null]}
                              >
                                <View style={styles.inlineSessionTop}>
                                  <AppText
                                    variant="label"
                                    style={isGateSelected ? styles.inlineSessionPrimaryTextActive : styles.inlineSessionPrimaryText}
                                  >
                                    {gate.label}
                                  </AppText>
                                  {isGateSelected ? (
                                    <MaterialCommunityIcons color={colors.background} name="check-circle" size={16} />
                                  ) : null}
                                </View>
                                <AppText
                                  variant="caption"
                                  style={isGateSelected ? styles.inlineSessionSecondaryTextActive : styles.inlineSessionSecondaryText}
                                >
                                  {gate.lane}
                                </AppText>
                                <AppText
                                  variant="caption"
                                  style={isGateSelected ? styles.inlineSessionSecondaryTextActive : styles.inlineSessionStatusText}
                                >
                                  {gate.status}
                                </AppText>
                              </Pressable>
                            );
                          })}
                        </View>

                        {isGateConfirmationVisible && selectedGateOption ? (
                          <SurfaceCard variant="elevated" style={styles.gateConfirmationCard}>
                            <View style={styles.gateConfirmationHeader}>
                              <View style={styles.gateConfirmationCopy}>
                                <AppText variant="eyebrow" tone="primary">
                                  Ready to scan
                                </AppText>
                                <AppText variant="subtitle">{selectedGateOption.label}</AppText>
                                <AppText tone="muted">
                                  {selectedConcert?.name} - {selectedGateOption.lane}
                                </AppText>
                              </View>
                              <View style={styles.gateConfirmationIcon}>
                                <MaterialCommunityIcons color={colors.primary} name="qrcode-scan" size={22} />
                              </View>
                            </View>
                            {submitError ? (
                              <View style={styles.submitErrorRow}>
                                <MaterialCommunityIcons color={colors.danger} name="alert-circle" size={18} />
                                <AppText tone="danger">{submitError}</AppText>
                              </View>
                            ) : null}
                            <View style={styles.gateConfirmationActions}>
                              <Button
                                icon="qrcode-scan"
                                label="Start scanning with this gate"
                                onPress={handleStartScanning}
                                disabled={isConcertsLoading || isDetailLoading}
                                loading={isSubmitting}
                              />
                              <Button
                                icon="chevron-up"
                                label="Hide"
                                onPress={() => setIsGateConfirmationVisible(false)}
                                variant="ghost"
                              />
                            </View>
                          </SurfaceCard>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <SurfaceCard variant="default" style={styles.syncCard}>
          <View style={styles.syncRow}>
            <View style={styles.syncIconWrap}>
              <MaterialCommunityIcons color={colors.success} name="cloud-download-outline" size={22} />
            </View>
            <View style={styles.syncText}>
              <AppText variant="subtitle">Offline prefetch</AppText>
              <AppText tone="muted">
                Ticket hashes are saved before scanning.
              </AppText>
            </View>
          </View>
          <View style={styles.syncMetaRow}>
            <StatusPill label={selectedGateOption ? 'Ready to prefetch' : 'Choose a gate'} tone={selectedGateOption ? 'success' : 'warning'} />
            <AppText tone="muted">{concertDetail?.ticketTiers.length ?? 0} configured ticket tiers</AppText>
          </View>
        </SurfaceCard>

        <SurfaceCard variant="hero" style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCopy}>
              <AppText variant="eyebrow" tone="primary">
                Launch
              </AppText>
              <AppText variant="subtitle">{selectedConcert?.name ?? 'No concert selected'}</AppText>
              <AppText tone="muted">
                {selectedGateOption ? `${selectedGateOption.label} - ${selectedConcert?.location ?? ''}` : 'Select a gate to continue'}
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
              <AppText variant="label">Checker</AppText>
            </View>
            <View style={styles.summaryMetaDivider} />
            <View style={styles.summaryMetaItem}>
              <AppText variant="eyebrow" tone="muted">
                Strategy
              </AppText>
              <AppText variant="label">Hybrid</AppText>
            </View>
            <View style={styles.summaryMetaDivider} />
            <View style={styles.summaryMetaItem}>
              <AppText variant="eyebrow" tone="muted">
                Lane
              </AppText>
              <AppText variant="label">{selectedGateOption?.lane ?? 'Pending'}</AppText>
            </View>
          </View>

          {submitError ? (
            <View style={styles.submitErrorRow}>
              <MaterialCommunityIcons color={colors.danger} name="alert-circle" size={18} />
              <AppText tone="danger">{submitError}</AppText>
            </View>
          ) : null}

          <Button
            icon="qrcode-scan"
            label="Start scanning"
            onPress={handleStartScanning}
            disabled={!selectedConcert || !selectedGateOption || isConcertsLoading || isDetailLoading}
            loading={isSubmitting}
          />
        </SurfaceCard>
          </View>
        </ScrollView>
      </View>
    </AppScreen>
  );
}

function formatSchedule(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Schedule unavailable';
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
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
  resumeCard: {
    gap: spacing.md,
  },
  resumeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  resumeCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  resumeActions: {
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
  centerStateCard: {
    gap: spacing.md,
    alignItems: 'center',
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
  inlineDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  inlineStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inlineStateCard: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceOverlay,
  },
  inlineStateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  inlineSessionsBlock: {
    gap: spacing.sm,
  },
  gateConfirmationCard: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  gateConfirmationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  gateConfirmationCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  gateConfirmationIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.surfaceOverlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateConfirmationActions: {
    gap: spacing.sm,
  },
  inlineSessionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inlineSessionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  inlineSessionChip: {
    minWidth: '47%',
    flexGrow: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  inlineSessionChipActive: {
    backgroundColor: colors.primary,
  },
  inlineSessionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inlineSessionPrimaryText: {
    color: colors.text,
  },
  inlineSessionPrimaryTextActive: {
    color: colors.background,
  },
  inlineSessionSecondaryText: {
    color: colors.textMuted,
  },
  inlineSessionSecondaryTextActive: {
    color: 'rgba(6, 16, 29, 0.84)',
  },
  inlineSessionStatusText: {
    color: colors.primary,
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
  submitErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
