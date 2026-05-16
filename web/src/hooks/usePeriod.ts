import { useState, useMemo } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format, subMonths } from 'date-fns';

export type PeriodPreset = 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom';

export interface Period {
  start: string;
  end: string;
}

export function usePeriod(defaultPreset: PeriodPreset = 'this_month') {
  const [preset, setPreset] = useState<PeriodPreset>(defaultPreset);
  const [custom, setCustom] = useState<Period>({ start: '', end: '' });

  const period = useMemo<Period>(() => {
    const today = new Date();
    const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
    if (preset === 'today') return { start: fmt(today), end: fmt(today) };
    if (preset === 'this_week') return { start: fmt(startOfWeek(today, { weekStartsOn: 1 })), end: fmt(endOfWeek(today, { weekStartsOn: 1 })) };
    if (preset === 'this_month') return { start: fmt(startOfMonth(today)), end: fmt(endOfMonth(today)) };
    if (preset === 'last_month') { const lm = subMonths(today, 1); return { start: fmt(startOfMonth(lm)), end: fmt(endOfMonth(lm)) }; }
    return custom.start && custom.end ? custom : { start: fmt(startOfMonth(today)), end: fmt(endOfMonth(today)) };
  }, [preset, custom]);

  return { period, preset, setPreset, setCustom };
}
