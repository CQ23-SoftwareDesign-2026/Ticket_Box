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
import { concertApi } from '@/features/checkin/api/concert-api';
import { useCurrentScanSession } from '@/features/checkin/hooks/use-current-scan-session';
import type { CheckinAssignment } from '@/features/checkin/types/checkin.types';
import { getErrorMessage } from '@/lib/errors';
import { routes } from '@/lib/routes';
import { prefetchStorage, scanSessionStorage } from '@/lib/storage';

type AssignmentWithTicketTypes = CheckinAssignment & {
  ticketTypeLabels: string[];
};

export function SessionSetupScreen() {
  const router = useRouter();
  const { session: currentSession } = useCurrentScanSession();
  const [assignments, setAssignments] = useState<AssignmentWithTicketTypes[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadAssignments() {
      setIsAssignmentsLoading(true);
      setAssignmentsError(null);

      try {
        const response = await checkinApi.getMyAssignments();
        const enrichedAssignments = await enrichAssignmentsWithTicketTypes(response);
        setAssignments(enrichedAssignments);

        if (enrichedAssignments.length > 0) {
          setSelectedAssignmentId((current) => current ?? buildAssignmentId(enrichedAssignments[0]));
        }
      } catch (error) {
        setAssignmentsError(getErrorMessage(error, 'Unable to load assignments right now.'));
      } finally {
        setIsAssignmentsLoading(false);
      }
    }

    void loadAssignments();
  }, []);

  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => buildAssignmentId(assignment) === selectedAssignmentId) ?? null,
    [assignments, selectedAssignmentId],
  );

  useEffect(() => {
    if (assignments.length === 0) {
      setSelectedAssignmentId(null);
      return;
    }

    setSelectedAssignmentId((current) => {
      if (current && assignments.some((assignment) => buildAssignmentId(assignment) === current)) {
        return current;
      }

      return buildAssignmentId(assignments[0]);
    });
  }, [assignments]);

  const handleRetryAssignments = async () => {
    setIsAssignmentsLoading(true);
    setAssignmentsError(null);

    try {
      const response = await checkinApi.getMyAssignments();
      const enrichedAssignments = await enrichAssignmentsWithTicketTypes(response);
      setAssignments(enrichedAssignments);

      if (enrichedAssignments.length > 0) {
        setSelectedAssignmentId(buildAssignmentId(enrichedAssignments[0]));
      }
    } catch (error) {
      setAssignmentsError(getErrorMessage(error, 'Unable to load assignments right now.'));
    } finally {
      setIsAssignmentsLoading(false);
    }
  };

  const handleStartScanning = async () => {
    if (!selectedAssignment) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const hashes = await checkinApi.prefetchTickets(selectedAssignment.concert_id, selectedAssignment.gate_number);
      const prefetchedAt = new Date().toISOString();

      await prefetchStorage.setPrefetchedTicketSet({
        concertId: selectedAssignment.concert_id,
        gateNumber: selectedAssignment.gate_number,
        hashes,
        prefetchedAt,
      });

      await scanSessionStorage.setCurrentSession({
        concertId: selectedAssignment.concert_id,
        concertTitle: selectedAssignment.concert_name,
        concertVenue: selectedAssignment.location,
        gateNumber: selectedAssignment.gate_number,
        gateLabel: selectedAssignment.gate_label,
        ticketTypeLabels: selectedAssignment.ticketTypeLabels,
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
              Choose one assigned gate, then start scanning.
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
                {currentSession.ticketTypeLabels?.length ? (
                  <AppText tone="muted">
                    Ticket types: {formatTicketTypes(currentSession.ticketTypeLabels)}
                  </AppText>
                ) : null}
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
            <AppText variant="label">Assign</AppText>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressStep}>
            <View style={[styles.progressBadge, selectedAssignment ? styles.progressBadgeActive : null]}>
              <AppText variant="eyebrow" style={selectedAssignment ? styles.progressTextActive : undefined} tone={selectedAssignment ? undefined : 'muted'}>
                2
              </AppText>
            </View>
            <AppText variant="label">Prefetch</AppText>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressStep}>
            <View style={[styles.progressBadge, selectedAssignment ? styles.progressBadgeActive : null]}>
              <AppText variant="eyebrow" style={selectedAssignment ? styles.progressTextActive : undefined} tone={selectedAssignment ? undefined : 'muted'}>
                3
              </AppText>
            </View>
            <AppText variant="label">Launch</AppText>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <AppText variant="eyebrow" tone="muted">
            Your assignments
          </AppText>
          <AppText tone="primary">{assignments.length} active</AppText>
        </View>

        {isAssignmentsLoading ? (
          <SurfaceCard variant="default" style={styles.centerStateCard}>
            <ActivityIndicator color={colors.primary} />
            <AppText tone="muted">Loading assigned gates...</AppText>
          </SurfaceCard>
        ) : assignmentsError ? (
          <SurfaceCard variant="danger" style={styles.centerStateCard}>
            <MaterialCommunityIcons color={colors.danger} name="alert-circle-outline" size={24} />
            <AppText variant="subtitle">Assignments unavailable</AppText>
            <AppText tone="muted">{assignmentsError}</AppText>
            <Button icon="refresh" label="Retry" onPress={handleRetryAssignments} />
          </SurfaceCard>
        ) : assignments.length === 0 ? (
          <SurfaceCard variant="default" style={styles.centerStateCard}>
            <MaterialCommunityIcons color={colors.warning} name="clipboard-account-outline" size={24} />
            <AppText variant="subtitle">No gate assignments</AppText>
            <AppText tone="muted">This account has not been assigned to any concert gate yet.</AppText>
          </SurfaceCard>
        ) : (
          <View style={styles.concertStack}>
            {assignments.map((assignment) => {
              const assignmentId = buildAssignmentId(assignment);
              const isSelected = assignmentId === selectedAssignmentId;

              return (
                <Pressable
                  key={assignmentId}
                  onPress={() => {
                    setSelectedAssignmentId(assignmentId);
                    setSubmitError(null);
                  }}
                  style={[styles.concertCard, isSelected ? styles.concertCardActive : null]}
                >
                  <View style={styles.concertGlow} />
                  <View style={[styles.concertAccent, isSelected ? styles.concertAccentActive : null]} />
                  <View style={styles.concertContent}>
                    <View style={styles.concertMeta}>
                      <View style={styles.concertTopline}>
                        <StatusPill label={assignment.gate_label} tone="info" />
                        <AppText tone="muted">{formatSchedule(assignment.start_time)}</AppText>
                      </View>
                      <AppText variant="title">{assignment.concert_name}</AppText>
                      <AppText tone="muted">{assignment.location}</AppText>
                      <AppText tone="muted">
                        Ticket types: {formatTicketTypes(assignment.ticketTypeLabels)}
                      </AppText>
                    </View>

                    <View style={styles.concertFoot}>
                      <View style={styles.concertFacts}>
                        <View style={styles.factColumn}>
                          <AppText variant="eyebrow" tone="muted">
                            Gate
                          </AppText>
                          <AppText variant="label">{assignment.gate_label}</AppText>
                        </View>
                        <View style={styles.factColumn}>
                          <AppText variant="eyebrow" tone="muted">
                            Remaining
                          </AppText>
                          <AppText variant="label">{assignment.ticket_count.toLocaleString()} tickets</AppText>
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
                    {isSelected ? (
                      <View style={styles.inlineSessionsBlock}>
                        <SurfaceCard variant="elevated" style={styles.gateConfirmationCard}>
                          <View style={styles.gateConfirmationHeader}>
                            <View style={styles.gateConfirmationCopy}>
                              <AppText variant="eyebrow" tone="primary">
                                Ready to scan
                              </AppText>
                              <AppText variant="subtitle">{assignment.gate_label}</AppText>
                              <AppText tone="muted">
                                {assignment.concert_name} - {assignment.ticket_count.toLocaleString()} tickets remaining
                              </AppText>
                              <AppText tone="muted">
                                Ticket types: {formatTicketTypes(assignment.ticketTypeLabels)}
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
                              disabled={isAssignmentsLoading}
                              loading={isSubmitting}
                            />
                          </View>
                        </SurfaceCard>
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
                Hashes are downloaded only for the selected assignment.
              </AppText>
            </View>
          </View>
          <View style={styles.syncMetaRow}>
            <StatusPill label={selectedAssignment ? 'Ready to prefetch' : 'Choose an assignment'} tone={selectedAssignment ? 'success' : 'warning'} />
            <AppText tone="muted">{selectedAssignment ? `${selectedAssignment.ticket_count.toLocaleString()} tickets ready` : 'No assignment selected'}</AppText>
          </View>
        </SurfaceCard>

        <SurfaceCard variant="hero" style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCopy}>
              <AppText variant="eyebrow" tone="primary">
                Launch
              </AppText>
              <AppText variant="subtitle">{selectedAssignment?.concert_name ?? 'No assignment selected'}</AppText>
              <AppText tone="muted">
                {selectedAssignment ? `${selectedAssignment.gate_label} - ${selectedAssignment.location}` : 'Select an assignment to continue'}
              </AppText>
              {selectedAssignment ? (
                <AppText tone="muted">
                  Ticket types: {formatTicketTypes(selectedAssignment.ticketTypeLabels)}
                </AppText>
              ) : null}
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
              <AppText variant="label">{selectedAssignment ? `${selectedAssignment.ticket_count.toLocaleString()} tickets` : 'Pending'}</AppText>
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
            disabled={!selectedAssignment || isAssignmentsLoading}
            loading={isSubmitting}
          />
        </SurfaceCard>
          </View>
        </ScrollView>
      </View>
    </AppScreen>
  );
}

function buildAssignmentId(assignment: CheckinAssignment) {
  return `${assignment.concert_id}:${assignment.gate_number}`;
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

async function enrichAssignmentsWithTicketTypes(assignments: CheckinAssignment[]): Promise<AssignmentWithTicketTypes[]> {
  const concertCache = new Map<string, string[]>();

  return Promise.all(
    assignments.map(async (assignment) => {
      const cacheKey = `${assignment.concert_id}:${assignment.gate_number}`;
      const cachedLabels = concertCache.get(cacheKey);

      if (cachedLabels) {
        return {
          ...assignment,
          ticketTypeLabels: cachedLabels,
        };
      }

      try {
        const concert = await concertApi.getConcert(assignment.concert_id);
        const ticketTypeLabels = concert.ticketTiers
          .filter((tier) => tier.gate_number === assignment.gate_number)
          .map((tier) => tier.name);

        concertCache.set(cacheKey, ticketTypeLabels);

        return {
          ...assignment,
          ticketTypeLabels,
        };
      } catch {
        return {
          ...assignment,
          ticketTypeLabels: [],
        };
      }
    }),
  );
}

function formatTicketTypes(labels: string[]) {
  if (labels.length === 0) {
    return 'Not configured';
  }

  return labels.join(', ');
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
    backgroundColor: '#10261f',
    borderColor: 'rgba(52, 199, 138, 0.18)',
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
    backgroundColor: '#101d33',
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: '#0f1c31',
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
    backgroundColor: '#132846',
  },
  concertGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(94, 161, 255, 0.10)',
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
    backgroundColor: '#132846',
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
    borderColor: 'rgba(94, 161, 255, 0.2)',
    backgroundColor: '#132846',
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
    color: '#d9e8ff',
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
    backgroundColor: '#10261f',
    borderColor: 'rgba(52, 199, 138, 0.16)',
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
    backgroundColor: '#10233d',
    borderColor: 'rgba(94, 161, 255, 0.18)',
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
    backgroundColor: '#17355f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
