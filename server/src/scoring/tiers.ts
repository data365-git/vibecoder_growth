export type BonusTier = 'tier_100' | 'tier_70' | 'tier_40' | 'tier_0';

export const TIER_PERCENT: Record<BonusTier, number> = {
  tier_100: 1.0,
  tier_70: 0.7,
  tier_40: 0.4,
  tier_0: 0,
};

export function tierForTotal(total: number): BonusTier {
  if (total >= 90) return 'tier_100';
  if (total >= 75) return 'tier_70';
  if (total >= 60) return 'tier_40';
  return 'tier_0';
}

export function bonusAmount(total: number, baselineUzs: number): number {
  return Math.round(baselineUzs * TIER_PERCENT[tierForTotal(total)]);
}
