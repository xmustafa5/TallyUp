// Types mirroring the TallyUp backend API responses (1:1 with the
// Fastify TypeBox schemas).

export interface UserSummary {
  id: string;
  publicId: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface AuthUser extends UserSummary {
  email: string;
  timezone: string;
  locale: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface FullProfile extends UserSummary {
  email: string;
  timezone: string;
  locale: string;
  notifyHalfwayBehind: boolean;
  notifyDeadline: boolean;
  notifyResults: boolean;
  createdAt: string;
}

export type PeriodType = 'week' | 'month' | 'custom' | 'oneshot';
export type WinnerRule = 'none' | 'highest' | 'lowest' | 'top_n' | 'threshold';
export type LoserRule = 'none' | 'lowest' | 'highest' | 'bottom_n' | 'threshold';
export type RoomStatus = 'draft' | 'active' | 'paused' | 'archived';
export type MemberRole = 'admin' | 'member';

export interface CycleSummary {
  id: string;
  cycleNumber: number;
  startsAt: string;
  endsAt: string;
  status: string;
}

export interface RoomCore {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  adminUserId: string;
  timezone: string;
  periodType: PeriodType;
  customDays: number | null;
  startDayOfWeek: number | null;
  startDayOfMonth: number | null;
  winnerRule: WinnerRule;
  winnerN: number | null;
  loserRule: LoserRule;
  loserN: number | null;
  capAtTarget: boolean;
  stake: string | null;
  status: RoomStatus;
  currentCycleId: string | null;
  createdAt: string;
}

export interface RoomMember {
  user: UserSummary;
  target: number;
  role: MemberRole;
  joinedLate: boolean;
  includeInCurrentCycle: boolean | null;
  leftAt: string | null;
}

export interface RoomDetail extends RoomCore {
  members: RoomMember[];
  myRole: MemberRole;
  currentCycle: CycleSummary | null;
}

export interface RoomListItem extends RoomCore {
  myRole: MemberRole;
  memberCount: number;
  currentCycle: CycleSummary | null;
}

export interface LeaderboardRow {
  userId: string;
  publicId: string;
  displayName: string;
  avatarUrl: string | null;
  points: number;
  target: number;
  percent: number;
  streak: number;
}

export interface RuleParticipant {
  userId: string;
  reason: string;
}

export interface CycleResult {
  scores: { userId: string; points: number; target: number }[];
  winners: RuleParticipant[];
  losers: RuleParticipant[];
  winnerRuleApplied: string;
  loserRuleApplied: string;
  loserSkippedDueToOverlap?: boolean;
  tieBreakRequired?: { kind: string; tiedUserIds: string[] };
}

export interface CycleDetail extends CycleSummary {
  roomId: string;
  leaderboard: LeaderboardRow[];
  resultJson: CycleResult | null;
}

export interface Invitation {
  id: string;
  roomId: string;
  roomName: string;
  status: string;
  from: UserSummary;
  to: UserSummary;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface MyHistoryRecent {
  cycleId: string;
  roomId: string;
  roomName: string;
  cycleNumber: number;
  endsAt: string;
  outcome: 'won' | 'lost' | 'participated';
}

export interface Badge {
  code: string;
  name: string;
  icon: string;
  earnedAt: string;
}

export interface MyHistory {
  participations: number;
  wins: number;
  losses: number;
  avgPercent: number;
  currentStreak: number;
  bestStreak: number;
  badges: Badge[];
  recent: MyHistoryRecent[];
}

export interface RoomTemplate {
  code: string;
  name: string;
  icon: string;
  description: string;
  periodType: PeriodType;
  customDays: number | null;
  winnerRule: WinnerRule;
  winnerN: number | null;
  loserRule: LoserRule;
  loserN: number | null;
  capAtTarget: boolean;
  suggestedTarget: number;
  stake: string | null;
}

export interface Paginated<T> {
  items: T[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

export interface CheckInActivity {
  id: string;
  cycleId: string;
  userId: string;
  points: number;
  note: string | null;
  createdAt: string;
  undoneAt: string | null;
  user: UserSummary;
}

export interface CheckInResult {
  checkIn: {
    id: string;
    cycleId: string;
    userId: string;
    points: number;
    note: string | null;
    createdAt: string;
    undoneAt: string | null;
  };
  myPoints: number;
  target: number;
  percent: number;
}
