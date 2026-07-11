export enum NotificationEvent {
  TICKET_PURCHASED = "TICKET_PURCHASED",
  CONCERT_REMINDER = "CONCERT_REMINDER",
}

export interface TicketPurchasedContext {
  event: NotificationEvent.TICKET_PURCHASED;
  orderId: string;
  userId: string;
  email: string;
  fullName: string;
  concertId: string;
  concertName: string;
  totalAmount: number;
  tickets: Array<{ id: string; categoryName: string; gateNumber: number | null; qrCodeHash: string }>;
}

export interface ConcertReminderContext {
  event: NotificationEvent.CONCERT_REMINDER;
  userId: string;
  email: string;
  fullName: string;
  concertId: string;
  concertName: string;
  startTime: Date;
  location: string;
}

export type NotificationContext = TicketPurchasedContext | ConcertReminderContext;

export interface NotificationChannel {
  readonly name: string;
  supports(event: NotificationEvent): boolean;
  send(context: NotificationContext): Promise<unknown>;
}

export const NOTIFICATION_CHANNELS = Symbol("NOTIFICATION_CHANNELS");
