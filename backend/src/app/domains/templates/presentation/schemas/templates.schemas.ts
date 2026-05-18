import { Type } from '@sinclair/typebox';

const Template = Type.Object({
  code: Type.String(),
  name: Type.String(),
  icon: Type.String(),
  description: Type.String(),
  periodType: Type.Union([
    Type.Literal('week'),
    Type.Literal('month'),
    Type.Literal('custom'),
    Type.Literal('oneshot'),
  ]),
  customDays: Type.Union([Type.Integer(), Type.Null()]),
  winnerRule: Type.String(),
  winnerN: Type.Union([Type.Integer(), Type.Null()]),
  loserRule: Type.String(),
  loserN: Type.Union([Type.Integer(), Type.Null()]),
  capAtTarget: Type.Boolean(),
  suggestedTarget: Type.Integer(),
  stake: Type.Union([Type.String(), Type.Null()]),
});

export const listTemplatesSchema = {
  tags: ['Templates'],
  summary: 'List public room templates',
  description: `
Return the catalog of public room templates (PRD 7.3). The create-room
wizard uses these to prefill a new room's configuration. Static data --
no authentication required.

**Returns**
- An array of templates with period, rules, and a suggested target
  `,
  response: {
    200: Type.Object({
      success: Type.Literal(true),
      data: Type.Array(Template),
    }),
  },
};
