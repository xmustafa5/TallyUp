'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useCreateRoom } from '@/hooks/use-rooms';
import { useToast } from '@/components/shared/toast';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const schema = z
  .object({
    name: z.string().min(1, 'Name is required').max(80),
    icon: z.string().max(8).optional(),
    description: z.string().max(500).optional(),
    periodType: z.enum(['week', 'month', 'custom', 'oneshot']),
    customDays: z.coerce.number().int().min(1).max(365).optional(),
    winnerRule: z.enum(['none', 'highest', 'lowest', 'top_n', 'threshold']),
    loserRule: z.enum(['none', 'lowest', 'highest', 'bottom_n', 'threshold']),
    winnerN: z.coerce.number().int().min(1).optional(),
    loserN: z.coerce.number().int().min(1).optional(),
    capAtTarget: z.boolean(),
    stake: z.string().max(280).optional(),
  })
  .refine(
    (v) =>
      !(['custom', 'oneshot'].includes(v.periodType) && !v.customDays),
    { message: 'Enter the number of days', path: ['customDays'] },
  );

type FormValues = z.infer<typeof schema>;

const selectCls =
  'h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

export default function CreateRoomPage() {
  const router = useRouter();
  const { toast } = useToast();
  const createRoom = useCreateRoom();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      periodType: 'week',
      winnerRule: 'highest',
      loserRule: 'lowest',
      capAtTarget: true,
    },
  });

  const periodType = watch('periodType');
  const winnerRule = watch('winnerRule');
  const loserRule = watch('loserRule');

  function onSubmit(values: FormValues) {
    createRoom.mutate(
      {
        name: values.name,
        icon: values.icon || null,
        description: values.description || null,
        periodType: values.periodType,
        customDays: ['custom', 'oneshot'].includes(values.periodType)
          ? values.customDays
          : null,
        winnerRule: values.winnerRule,
        winnerN: values.winnerRule === 'top_n' ? values.winnerN : null,
        loserRule: values.loserRule,
        loserN: values.loserRule === 'bottom_n' ? values.loserN : null,
        capAtTarget: values.capAtTarget,
        stake: values.stake || null,
      },
      {
        onSuccess: (room) => {
          toast({ type: 'success', message: 'Room created' });
          router.push(`/rooms/${room.id}/settings`);
        },
        onError: (e: unknown) =>
          toast({
            type: 'error',
            message:
              (e as { response?: { data?: { message?: string } } })?.response
                ?.data?.message ?? 'Could not create room',
          }),
      },
    );
  }

  return (
    <div>
      <PageHeader
        title="New room"
        description="Set up the challenge. Invite friends and set targets next."
      />
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto max-w-2xl space-y-6 p-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Basics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="w-20">
                <Label htmlFor="icon">Icon</Label>
                <Input id="icon" placeholder="🏋️" {...register('icon')} />
              </div>
              <div className="flex-1">
                <Label htmlFor="name">Room name</Label>
                <Input
                  id="name"
                  placeholder="Gym Challenge"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Input id="description" {...register('description')} />
            </div>
            <div>
              <Label htmlFor="stake">Stake (optional, just for fun)</Label>
              <Input
                id="stake"
                placeholder="Loser buys dinner"
                {...register('stake')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="periodType">How long is each cycle?</Label>
              <select
                id="periodType"
                className={selectCls}
                {...register('periodType')}
              >
                <option value="week">Weekly (7 days)</option>
                <option value="month">Monthly</option>
                <option value="custom">Custom number of days</option>
                <option value="oneshot">One-shot (no repeat)</option>
              </select>
            </div>
            {['custom', 'oneshot'].includes(periodType) && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="customDays">Number of days</Label>
                <Input
                  id="customDays"
                  type="number"
                  min={1}
                  max={365}
                  {...register('customDays')}
                />
                {errors.customDays && (
                  <p className="text-xs text-destructive">
                    {errors.customDays.message}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="winnerRule">Winner rule</Label>
              <select
                id="winnerRule"
                className={selectCls}
                {...register('winnerRule')}
              >
                <option value="none">No winner</option>
                <option value="highest">Highest points wins</option>
                <option value="lowest">Lowest points wins</option>
                <option value="top_n">Top N win</option>
                <option value="threshold">Everyone above target wins</option>
              </select>
            </div>
            {winnerRule === 'top_n' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="winnerN">How many winners (N)?</Label>
                <Input
                  id="winnerN"
                  type="number"
                  min={1}
                  {...register('winnerN')}
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loserRule">Loser rule</Label>
              <select
                id="loserRule"
                className={selectCls}
                {...register('loserRule')}
              >
                <option value="none">No loser</option>
                <option value="lowest">Lowest points loses</option>
                <option value="highest">Highest points loses</option>
                <option value="bottom_n">Bottom N lose</option>
                <option value="threshold">Everyone below target loses</option>
              </select>
            </div>
            {loserRule === 'bottom_n' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="loserN">How many losers (N)?</Label>
                <Input
                  id="loserN"
                  type="number"
                  min={1}
                  {...register('loserN')}
                />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                {...register('capAtTarget')}
              />
              Cap check-ins at each member&apos;s target
            </label>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createRoom.isPending}>
            <Loader2
              className={`mr-2 size-4 animate-spin ${createRoom.isPending ? '' : 'hidden'}`}
            />
            Create room
          </Button>
        </div>
      </form>
    </div>
  );
}
