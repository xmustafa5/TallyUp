import type { Cycle, Membership, Room, User } from '@prisma/client';

type MembershipWithUser = Membership & { user: User };

export function serializeRoomCore(room: Room) {
  return {
    id: room.id,
    name: room.name,
    icon: room.icon ?? null,
    description: room.description ?? null,
    adminUserId: room.adminUserId,
    timezone: room.timezone,
    periodType: room.periodType,
    customDays: room.customDays ?? null,
    startDayOfWeek: room.startDayOfWeek ?? null,
    startDayOfMonth: room.startDayOfMonth ?? null,
    winnerRule: room.winnerRule,
    winnerN: room.winnerN ?? null,
    loserRule: room.loserRule,
    loserN: room.loserN ?? null,
    capAtTarget: room.capAtTarget,
    stake: room.stake ?? null,
    status: room.status,
    currentCycleId: room.currentCycleId ?? null,
    createdAt: room.createdAt.toISOString(),
  };
}

export function serializeMember(m: MembershipWithUser) {
  return {
    user: {
      id: m.user.id,
      publicId: m.user.publicId,
      displayName: m.user.displayName,
      avatarUrl: m.user.avatarUrl ?? null,
    },
    target: m.target,
    role: m.role,
    joinedLate: m.joinedLate,
    includeInCurrentCycle: m.includeInCurrentCycle ?? null,
    leftAt: m.leftAt ? m.leftAt.toISOString() : null,
  };
}

export function serializeCycleSummary(c: Cycle | null) {
  if (!c) return null;
  return {
    id: c.id,
    cycleNumber: c.cycleNumber,
    startsAt: c.startsAt.toISOString(),
    endsAt: c.endsAt.toISOString(),
    status: c.status,
  };
}

export function serializeRoomDetail(
  room: Room & { memberships: MembershipWithUser[]; currentCycle: Cycle | null },
  myRole: 'admin' | 'member',
) {
  return {
    ...serializeRoomCore(room),
    members: room.memberships.map(serializeMember),
    myRole,
    currentCycle: serializeCycleSummary(room.currentCycle),
  };
}
