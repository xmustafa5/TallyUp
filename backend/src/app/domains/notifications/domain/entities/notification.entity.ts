import type { NotificationType, Prisma } from '@prisma/client';

export interface NotificationProps {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Prisma.JsonValue | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Prisma.JsonValue | null;
  readAt: string | null;
  createdAt: string;
}

export class Notification {
  private constructor(private readonly props: NotificationProps) {}

  static fromPrisma(data: NotificationProps): Notification {
    return new Notification(data);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get isRead(): boolean {
    return this.props.readAt !== null;
  }

  toResponse(): NotificationResponse {
    return {
      id: this.props.id,
      type: this.props.type,
      title: this.props.title,
      body: this.props.body,
      data: this.props.data ?? null,
      readAt: this.props.readAt ? this.props.readAt.toISOString() : null,
      createdAt: this.props.createdAt.toISOString(),
    };
  }
}
