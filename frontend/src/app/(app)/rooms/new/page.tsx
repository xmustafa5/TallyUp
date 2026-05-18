'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCreateRoom } from '@/hooks/use-rooms';
import { useTemplates } from '@/hooks/use-templates';
import { useToast } from '@/components/shared/toast';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { RoomTemplate } from '@/types/tallyup';

const schema = z
  .object({
    name: z.string().min(1, 'errorNameRequired').max(80),
    icon: z.string().max(8).optional(),
    description: z.string().max(500).optional(),
    periodType: z.enum(['week', 'month', 'custom', 'oneshot']),
    customDays: z.coerce.number().int().min(1).max(365).optional(),
    startDayOfWeek: z.string().optional(),
    startDayOfMonth: z.coerce.number().int().min(1).max(28).optional(),
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
    { message: 'enterNumberOfDays', path: ['customDays'] },
  );

type FormValues = z.infer<typeof schema>;

const defaultValues: Partial<FormValues> = {
  periodType: 'week',
  winnerRule: 'highest',
  loserRule: 'lowest',
  capAtTarget: true,
};

function templateToForm(tpl: RoomTemplate): FormValues {
  return {
    name: tpl.name,
    icon: tpl.icon || undefined,
    description: tpl.description || undefined,
    periodType: tpl.periodType,
    customDays: tpl.customDays ?? undefined,
    startDayOfWeek: undefined,
    startDayOfMonth: undefined,
    winnerRule: tpl.winnerRule,
    loserRule: tpl.loserRule,
    winnerN: tpl.winnerN ?? undefined,
    loserN: tpl.loserN ?? undefined,
    capAtTarget: tpl.capAtTarget,
    stake: tpl.stake || undefined,
  };
}

const selectCls =
  'h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

export default function CreateRoomPage() {
  const t = useTranslations('createRoom');
  const router = useRouter();
  const { toast } = useToast();
  const createRoom = useCreateRoom();
  const { data: templates, isError: templatesError } = useTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(
    null,
  );
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const periodType = watch('periodType');
  const winnerRule = watch('winnerRule');
  const loserRule = watch('loserRule');

  function selectTemplate(tpl: RoomTemplate) {
    setSelectedTemplate(tpl.code);
    reset(templateToForm(tpl));
  }

  function startFromScratch() {
    setSelectedTemplate(null);
    reset(defaultValues);
  }

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
        startDayOfWeek:
          values.periodType === 'week' && values.startDayOfWeek
            ? Number(values.startDayOfWeek)
            : null,
        startDayOfMonth:
          values.periodType === 'month' && values.startDayOfMonth
            ? values.startDayOfMonth
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
          toast({ type: 'success', message: t('roomCreated') });
          router.push(`/rooms/${room.id}/settings`);
        },
        onError: (e: unknown) =>
          toast({
            type: 'error',
            message:
              (e as { response?: { data?: { message?: string } } })?.response
                ?.data?.message ?? t('couldNotCreate'),
          }),
      },
    );
  }

  return (
    <div>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto max-w-2xl space-y-6 p-6"
      >
        {templatesError ? (
          <p className="text-sm text-muted-foreground">
            {t('couldNotLoadTemplates')}
          </p>
        ) : (
          templates &&
          templates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('startFromTemplate')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {t('startFromTemplateHint')}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {templates.map((tpl) => {
                    const active = selectedTemplate === tpl.code;
                    return (
                      <button
                        key={tpl.code}
                        type="button"
                        onClick={() => selectTemplate(tpl)}
                        aria-pressed={active}
                        className={cn(
                          'flex items-start gap-3 rounded-md border p-3 text-start transition-colors hover:bg-muted/50',
                          active &&
                            'border-primary bg-primary/5 ring-1 ring-primary',
                        )}
                      >
                        <span className="text-xl leading-none" aria-hidden>
                          {tpl.icon}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">
                            {tpl.name}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {tpl.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p
                    className={cn(
                      'text-xs text-muted-foreground',
                      selectedTemplate ? '' : 'invisible',
                    )}
                  >
                    {t('templateSelected')}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={startFromScratch}
                    disabled={!selectedTemplate}
                  >
                    <Sparkles className="me-1.5 size-4" />
                    {t('startFromScratch')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t('basics')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="w-20">
                <Label htmlFor="icon">{t('icon')}</Label>
                <Input id="icon" placeholder="🏋️" {...register('icon')} />
              </div>
              <div className="flex-1">
                <Label htmlFor="name">{t('roomName')}</Label>
                <Input
                  id="name"
                  placeholder={t('roomNamePlaceholder')}
                  {...register('name')}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-destructive">
                    {t(errors.name.message as 'errorNameRequired')}
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="description">{t('description')}</Label>
              <Input id="description" {...register('description')} />
            </div>
            <div>
              <Label htmlFor="stake">{t('stake')}</Label>
              <Input
                id="stake"
                placeholder={t('stakePlaceholder')}
                {...register('stake')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('period')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="periodType">{t('cycleLength')}</Label>
              <select
                id="periodType"
                className={selectCls}
                {...register('periodType')}
              >
                <option value="week">{t('periodWeek')}</option>
                <option value="month">{t('periodMonth')}</option>
                <option value="custom">{t('periodCustom')}</option>
                <option value="oneshot">{t('periodOneshot')}</option>
              </select>
            </div>
            {['custom', 'oneshot'].includes(periodType) && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="customDays">{t('numberOfDays')}</Label>
                <Input
                  id="customDays"
                  type="number"
                  min={1}
                  max={365}
                  {...register('customDays')}
                />
                {errors.customDays && (
                  <p className="text-xs text-destructive">
                    {t(errors.customDays.message as 'enterNumberOfDays')}
                  </p>
                )}
              </div>
            )}
            {periodType === 'week' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="startDayOfWeek">{t('startDayOfWeek')}</Label>
                <select
                  id="startDayOfWeek"
                  className={selectCls}
                  {...register('startDayOfWeek')}
                >
                  <option value="">{t('startDayDefault')}</option>
                  <option value="0">{t('sunday')}</option>
                  <option value="1">{t('monday')}</option>
                  <option value="2">{t('tuesday')}</option>
                  <option value="3">{t('wednesday')}</option>
                  <option value="4">{t('thursday')}</option>
                  <option value="5">{t('friday')}</option>
                  <option value="6">{t('saturday')}</option>
                </select>
              </div>
            )}
            {periodType === 'month' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="startDayOfMonth">
                  {t('startDayOfMonth')}
                </Label>
                <Input
                  id="startDayOfMonth"
                  type="number"
                  min={1}
                  max={28}
                  placeholder={t('startDayOfMonthPlaceholder')}
                  {...register('startDayOfMonth')}
                />
                {errors.startDayOfMonth && (
                  <p className="text-xs text-destructive">
                    {errors.startDayOfMonth.message}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('rules')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="winnerRule">{t('winnerRule')}</Label>
              <select
                id="winnerRule"
                className={selectCls}
                {...register('winnerRule')}
              >
                <option value="none">{t('winnerNone')}</option>
                <option value="highest">{t('winnerHighest')}</option>
                <option value="lowest">{t('winnerLowest')}</option>
                <option value="top_n">{t('winnerTopN')}</option>
                <option value="threshold">{t('winnerThreshold')}</option>
              </select>
            </div>
            {winnerRule === 'top_n' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="winnerN">{t('howManyWinners')}</Label>
                <Input
                  id="winnerN"
                  type="number"
                  min={1}
                  {...register('winnerN')}
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loserRule">{t('loserRule')}</Label>
              <select
                id="loserRule"
                className={selectCls}
                {...register('loserRule')}
              >
                <option value="none">{t('loserNone')}</option>
                <option value="lowest">{t('loserLowest')}</option>
                <option value="highest">{t('loserHighest')}</option>
                <option value="bottom_n">{t('loserBottomN')}</option>
                <option value="threshold">{t('loserThreshold')}</option>
              </select>
            </div>
            {loserRule === 'bottom_n' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="loserN">{t('howManyLosers')}</Label>
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
              {t('capAtTarget')}
            </label>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={createRoom.isPending}>
            <Loader2
              className={`me-2 size-4 animate-spin ${createRoom.isPending ? '' : 'hidden'}`}
            />
            {t('create')}
          </Button>
        </div>
      </form>
    </div>
  );
}
