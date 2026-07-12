import { Injectable, MessageEvent } from "@nestjs/common";
import { Notification } from "@prisma/client";
import { Observable, Subject, finalize, interval, map, merge } from "rxjs";

@Injectable()
export class NotificationStreamService {
  private readonly streams = new Map<string, Set<Subject<MessageEvent>>>();

  connect(userId: string): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();
    const userStreams = this.streams.get(userId) ?? new Set<Subject<MessageEvent>>();
    userStreams.add(subject);
    this.streams.set(userId, userStreams);

    const heartbeat = interval(25_000).pipe(
      map(() => ({ type: "heartbeat", data: { timestamp: new Date().toISOString() } } as MessageEvent)),
    );

    return merge(subject.asObservable(), heartbeat).pipe(
      finalize(() => {
        userStreams.delete(subject);
        if (userStreams.size === 0) this.streams.delete(userId);
      }),
    );
  }

  publish(userId: string, notification: Notification): void {
    for (const stream of this.streams.get(userId) ?? []) {
      stream.next({ id: notification.id, type: "notification", data: notification });
    }
  }
}
