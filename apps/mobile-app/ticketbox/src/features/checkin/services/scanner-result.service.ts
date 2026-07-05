import type { ScanTicketResponse, ScanTicketStatus } from '@/features/checkin/types/checkin.types';
import type { CurrentScanSession, RecentScanHistoryItem } from '@/features/checkin/storage/checkin-storage';
import { formatScanTime, shortenQrValue } from '@/features/checkin/utils/checkin-formatters';

export type LiveResultState = {
  description: string;
  gateAction: string;
  guestLabel: string;
  icon: string;
  panelVariant: 'default' | 'elevated' | 'danger';
  status: ScanTicketStatus | 'IDLE' | 'OFFLINE' | 'ERROR';
  title: string;
  tone: 'info' | 'success' | 'warning' | 'danger';
};

export type ScanFeedback = {
  counterDelta: {
    accepted: number;
    duplicate: number;
    scanned: number;
    synced: number;
  };
  historyItem?: RecentScanHistoryItem;
  resultState: LiveResultState;
};

export function createIdleResultState(): LiveResultState {
  return {
    status: 'IDLE',
    tone: 'info',
    title: 'Scanner armed',
    description: 'Center the QR code in the frame.',
    gateAction: 'Await scan',
    guestLabel: 'Ready for next guest',
    icon: 'qrcode-scan',
    panelVariant: 'default',
  };
}

export function createErrorResultState(qrValue: string, description: string): LiveResultState {
  return {
    status: 'ERROR',
    tone: 'danger',
    title: 'Scan request failed',
    description,
    gateAction: 'Retry scan',
    guestLabel: shortenQrValue(qrValue),
    icon: 'server-network-off',
    panelVariant: 'danger',
  };
}

export function createOnlineScanFeedback(
  qrValue: string,
  response: ScanTicketResponse,
  session: CurrentScanSession,
): ScanFeedback {
  const baseHistory = {
    concertId: session.concertId,
    gateNumber: session.gateNumber,
    qrCodeHash: qrValue,
  };

  switch (response.status) {
    case 'ACCEPTED':
      return {
        counterDelta: { scanned: 1, accepted: 1, synced: 1, duplicate: 0 },
        resultState: {
          status: 'ACCEPTED',
          tone: 'success',
          title: 'Entry approved',
          description: 'This ticket is valid for the active concert and gate. The check-in has been recorded on the server.',
          gateAction: 'Allow entry',
          guestLabel: shortenQrValue(qrValue),
          icon: 'check-circle',
          panelVariant: 'elevated',
        },
        historyItem: {
          ...baseHistory,
          id: `online:${session.concertId}:${session.gateNumber}:${qrValue}:${Date.now()}`,
          scannedAt: response.scanned_at ?? new Date().toISOString(),
          status: 'ACCEPTED',
          title: 'Online check-in accepted',
          detail: `${shortenQrValue(qrValue)} was validated by the server for ${session.gateLabel}.`,
        },
      };
    case 'DUPLICATE':
      return {
        counterDelta: { scanned: 1, accepted: 0, synced: 0, duplicate: 1 },
        resultState: {
          status: 'DUPLICATE',
          tone: 'warning',
          title: 'Already checked in',
          description: response.scanned_at
            ? `This ticket was already scanned at ${formatScanTime(response.scanned_at)}.`
            : 'This ticket was already scanned previously.',
          gateAction: 'Verify attendee',
          guestLabel: shortenQrValue(qrValue),
          icon: 'alert-circle',
          panelVariant: 'default',
        },
        historyItem: {
          ...baseHistory,
          id: `duplicate:${session.concertId}:${session.gateNumber}:${qrValue}:${Date.now()}`,
          scannedAt: response.scanned_at ?? new Date().toISOString(),
          status: 'DUPLICATE',
          title: 'Duplicate ticket detected',
          detail: `${shortenQrValue(qrValue)} was already used earlier.`,
        },
      };
    case 'INVALID_GATE':
      return {
        counterDelta: { scanned: 1, accepted: 0, synced: 0, duplicate: 0 },
        resultState: {
          status: 'INVALID_GATE',
          tone: 'danger',
          title: 'Wrong gate for this ticket',
          description: 'The ticket exists but does not match the active gate or concert in this session.',
          gateAction: 'Redirect guest',
          guestLabel: shortenQrValue(qrValue),
          icon: 'close-circle',
          panelVariant: 'danger',
        },
        historyItem: {
          ...baseHistory,
          id: `invalid-gate:${session.concertId}:${session.gateNumber}:${qrValue}:${Date.now()}`,
          scannedAt: new Date().toISOString(),
          status: 'INVALID_GATE',
          title: 'Wrong gate scanned',
          detail: `${shortenQrValue(qrValue)} does not belong to ${session.gateLabel}.`,
        },
      };
    case 'NOT_FOUND':
      return {
        counterDelta: { scanned: 1, accepted: 0, synced: 0, duplicate: 0 },
        resultState: {
          status: 'NOT_FOUND',
          tone: 'danger',
          title: 'Ticket not found',
          description: 'The scanned QR code does not exist in the backend system.',
          gateAction: 'Reject entry',
          guestLabel: shortenQrValue(qrValue),
          icon: 'help-circle',
          panelVariant: 'danger',
        },
        historyItem: {
          ...baseHistory,
          id: `not-found:${session.concertId}:${session.gateNumber}:${qrValue}:${Date.now()}`,
          scannedAt: new Date().toISOString(),
          status: 'NOT_FOUND',
          title: 'Ticket not found',
          detail: `${shortenQrValue(qrValue)} was not found in backend records.`,
        },
      };
    case 'UNPAID':
      return {
        counterDelta: { scanned: 1, accepted: 0, synced: 0, duplicate: 0 },
        resultState: {
          status: 'UNPAID',
          tone: 'warning',
          title: 'Order not paid',
          description: 'The ticket record exists, but the related order has not been paid yet.',
          gateAction: 'Send to support desk',
          guestLabel: shortenQrValue(qrValue),
          icon: 'cash-remove',
          panelVariant: 'default',
        },
        historyItem: {
          ...baseHistory,
          id: `unpaid:${session.concertId}:${session.gateNumber}:${qrValue}:${Date.now()}`,
          scannedAt: new Date().toISOString(),
          status: 'UNPAID',
          title: 'Unpaid ticket',
          detail: `${shortenQrValue(qrValue)} belongs to an unpaid order.`,
        },
      };
  }
}
