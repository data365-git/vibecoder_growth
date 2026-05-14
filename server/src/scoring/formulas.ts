export type ComponentKey =
  | 'discipline_reporting'
  | 'deadline_ownership'
  | 'uxui_taste'
  | 'business_thinking'
  | 'professional_learning'
  | 'simple_explanation';

export const COMPONENT_MAX: Record<ComponentKey, number> = {
  discipline_reporting: 10,
  deadline_ownership: 25,
  uxui_taste: 20,
  business_thinking: 20,
  professional_learning: 15,
  simple_explanation: 10,
};

export const COMPONENT_AUTO_MAX: Record<ComponentKey, number> = {
  discipline_reporting: 10,
  deadline_ownership: 15,
  uxui_taste: 10,
  business_thinking: 10,
  professional_learning: 8,
  simple_explanation: 4,
};

export const FORMULAS: Record<ComponentKey, string> = {
  discipline_reporting:
    '7 × (on_time_reports / working_days) + 3 × (no_reminder_needed / working_days)',
  deadline_ownership:
    '10 × (briefs_with_understanding / total_tasks) + 5 × (on_time_deliveries / deliveries) [auto cap 15]',
  uxui_taste: '10 × min(1, design_refs_count / working_days) (each ref ≥ 3 observations)',
  business_thinking: '10 × min(1, business_notes_count / 4)',
  professional_learning: '8 × min(1, learning_notes_count / working_days)',
  simple_explanation: '4 × min(1, explain_notes_count / 4)',
};

export function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}
