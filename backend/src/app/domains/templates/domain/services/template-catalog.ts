/**
 * Static public room templates (PRD 7.3). These prefill the create-room
 * wizard. Pure data -- no DB. `code` is a stable identifier; the client
 * may localize the display name off it.
 */
export interface RoomTemplate {
  code: string;
  name: string;
  icon: string;
  description: string;
  periodType: 'week' | 'month' | 'custom' | 'oneshot';
  customDays: number | null;
  winnerRule: 'none' | 'highest' | 'lowest' | 'top_n' | 'threshold';
  winnerN: number | null;
  loserRule: 'none' | 'lowest' | 'highest' | 'bottom_n' | 'threshold';
  loserN: number | null;
  capAtTarget: boolean;
  suggestedTarget: number;
  stake: string | null;
}

export const ROOM_TEMPLATES: readonly RoomTemplate[] = [
  {
    code: 'gym_week',
    name: 'Gym Challenge',
    icon: '🏋️',
    description: 'Hit the gym this week. Fewest sessions buys dinner.',
    periodType: 'week',
    customDays: null,
    winnerRule: 'highest',
    winnerN: null,
    loserRule: 'lowest',
    loserN: null,
    capAtTarget: true,
    suggestedTarget: 4,
    stake: 'Loser buys dinner',
  },
  {
    code: 'study_sprint',
    name: 'Study Sprint',
    icon: '📚',
    description: 'Track study hours over 10 days. Top 3 win bragging rights.',
    periodType: 'custom',
    customDays: 10,
    winnerRule: 'top_n',
    winnerN: 3,
    loserRule: 'none',
    loserN: null,
    capAtTarget: false,
    suggestedTarget: 20,
    stake: null,
  },
  {
    code: 'steps_month',
    name: 'Step Count',
    icon: '👟',
    description: 'Monthly steps challenge. Everyone who hits target wins.',
    periodType: 'month',
    customDays: null,
    winnerRule: 'threshold',
    winnerN: null,
    loserRule: 'threshold',
    loserN: null,
    capAtTarget: false,
    suggestedTarget: 300,
    stake: null,
  },
  {
    code: 'no_junk_food',
    name: 'No Junk Food',
    icon: '🥗',
    description: 'A 21-day clean-eating streak. Slackers are called out.',
    periodType: 'custom',
    customDays: 21,
    winnerRule: 'none',
    winnerN: null,
    loserRule: 'threshold',
    loserN: null,
    capAtTarget: true,
    suggestedTarget: 21,
    stake: null,
  },
  {
    code: 'reading_week',
    name: 'Reading Challenge',
    icon: '📖',
    description: 'Read every day this week. Highest wins.',
    periodType: 'week',
    customDays: null,
    winnerRule: 'highest',
    winnerN: null,
    loserRule: 'none',
    loserN: null,
    capAtTarget: true,
    suggestedTarget: 7,
    stake: null,
  },
];
