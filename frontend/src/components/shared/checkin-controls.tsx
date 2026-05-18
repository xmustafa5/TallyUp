'use client';

import { Plus, Loader2 } from 'lucide-react';
import { useCreateCheckIn } from '@/hooks/use-checkin';
import { useToast } from '@/components/shared/toast';
import { Button } from '@/components/ui/button';

const PRESETS = [2, 3, 5];

export function CheckinControls({
  roomId,
  myUserId,
  disabled,
}: {
  roomId: string;
  myUserId: string | undefined;
  disabled?: boolean;
}) {
  const checkIn = useCreateCheckIn(roomId, myUserId);
  const { toast } = useToast();

  function add(points: number) {
    checkIn.mutate(points, {
      onError: (err: unknown) => {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? 'Could not record check-in';
        toast({ type: 'error', message: msg });
      },
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="lg"
        onClick={() => add(1)}
        disabled={disabled || checkIn.isPending}
      >
        <Loader2
          className={`mr-2 size-4 animate-spin ${checkIn.isPending ? '' : 'hidden'}`}
        />
        <Plus className={`mr-1 size-4 ${checkIn.isPending ? 'hidden' : ''}`} />
        1 point
      </Button>
      {PRESETS.map((p) => (
        <Button
          key={p}
          variant="outline"
          size="lg"
          onClick={() => add(p)}
          disabled={disabled || checkIn.isPending}
        >
          +{p}
        </Button>
      ))}
    </div>
  );
}
