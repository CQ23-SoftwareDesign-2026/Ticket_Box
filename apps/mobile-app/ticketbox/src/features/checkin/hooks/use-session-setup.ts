import { useEffect, useMemo, useState } from 'react';

import { getErrorMessage } from '@/lib/errors';
import type { CheckinAssignment } from '@/features/checkin/types/checkin.types';
import {
  buildAssignmentId,
  loadAssignmentsWithTicketTypes,
  startCheckinSession,
  type AssignmentWithTicketTypes,
} from '@/features/checkin/services/session-setup.service';

export function useSessionSetup() {
  const [assignments, setAssignments] = useState<AssignmentWithTicketTypes[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAssignments = async (shouldResetSelection = false) => {
    setIsAssignmentsLoading(true);
    setAssignmentsError(null);

    try {
      const nextAssignments = await loadAssignmentsWithTicketTypes();
      setAssignments(nextAssignments);

      if (nextAssignments.length > 0) {
        setSelectedAssignmentId((current) => {
          if (!shouldResetSelection && current) {
            return current;
          }

          return buildAssignmentId(nextAssignments[0]);
        });
      }
    } catch (error) {
      setAssignmentsError(getErrorMessage(error, 'Unable to load assignments right now.'));
    } finally {
      setIsAssignmentsLoading(false);
    }
  };

  useEffect(() => {
    void loadAssignments();
  }, []);

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

  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => buildAssignmentId(assignment) === selectedAssignmentId) ?? null,
    [assignments, selectedAssignmentId],
  );

  const retryAssignments = async () => {
    await loadAssignments(true);
  };

  const beginScanning = async (assignment: AssignmentWithTicketTypes | null) => {
    if (!assignment) {
      return false;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await startCheckinSession(assignment);
      return true;
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Prefetch failed. Please try again before entering scan mode.'));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    assignments,
    selectedAssignment,
    selectedAssignmentId,
    assignmentsError,
    submitError,
    isAssignmentsLoading,
    isSubmitting,
    setSelectedAssignmentId,
    setSubmitError,
    retryAssignments,
    beginScanning,
  };
}

export function getAssignmentId(assignment: CheckinAssignment) {
  return buildAssignmentId(assignment);
}
