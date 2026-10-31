/**
 * The what-if planner: does a month's plan balance, and by how much?
 *
 * Everything here is pure arithmetic over integer cents. Nothing in this file
 * reads or writes the ledger — that separation is the point of the feature. The
 * planner starts from what you actually did, then lets you change any of it
 * without a single entry moving.
 */

export type PlannedCategory = {
  id: string;
  name: string;
  tone: string;
  /** What this category typically costs, used as the starting figure. */
  typicalCents: number;
  /** The monthly budget, when one is set. Shown for comparison. */
  budgetCents: number | null;
};

export type PlannerBaseline = {
  /** Typical monthly income, the starting figure for the plan. */
  incomeCents: number;
  /** Typical monthly amount set aside. */
  savingCents: number;
  categories: PlannedCategory[];
  /** How many months the typical figures were averaged over. */
  monthsObserved: number;
};

export type Verdict = "surplus" | "balanced" | "shortfall";

export type PlanOutcome = {
  incomeCents: number;
  spendingCents: number;
  savingCents: number;
  /** Income minus everything you intend to do with it. */
  leftoverCents: number;
  verdict: Verdict;
  /** Share of income set aside, or null when there is no income to divide. */
  savingsRate: number | null;
  /** Share of income spent, or null for the same reason. */
  spendingRate: number | null;
};

/**
 * "Balanced" is a band, not a point. Landing within a dollar of zero is a plan
 * that works; calling it a shortfall because of rounding would be noise.
 */
const BALANCED_BAND_CENTS = 100;

function share(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((part / whole) * 100);
}

export function evaluatePlan(
  incomeCents: number,
  spendingCents: number,
  savingCents: number,
): PlanOutcome {
  const leftoverCents = incomeCents - spendingCents - savingCents;

  return {
    incomeCents,
    spendingCents,
    savingCents,
    leftoverCents,
    verdict:
      Math.abs(leftoverCents) <= BALANCED_BAND_CENTS
        ? "balanced"
        : leftoverCents > 0
          ? "surplus"
          : "shortfall",
    savingsRate: share(savingCents, incomeCents),
    spendingRate: share(spendingCents, incomeCents),
  };
}

// --- a reference split --------------------------------------------------

/**
 * The 50/30/20 rule of thumb: roughly half of take-home on essentials, a third
 * on everything else, a fifth set aside.
 *
 * Offered as a widely used *starting point* for arranging a budget, not as
 * advice about anyone's particular circumstances — it knows nothing about your
 * debts, your dependants, or what your rent costs where you live.
 *
 * Only two of the three lines can be checked against a plan. "Needs" and
 * "wants" would need every category sorted into one or the other, and nothing
 * here can do that honestly — "Transport" is a commute for one person and a
 * hobby for another. So the comparison is drawn where the numbers are
 * unambiguous: total spending against the 80% ceiling, and savings against the
 * 20% floor.
 */
export const REFERENCE_SPLIT = {
  needs: 0.5,
  wants: 0.3,
  savings: 0.2,
} as const;

export type SplitGuide = {
  needsCents: number;
  wantsCents: number;
  savingsCents: number;
  /** needs + wants: everything not set aside. */
  spendingCeilingCents: number;
  /** True when the plan spends no more than the ceiling. */
  withinCeiling: boolean;
  /** True when the plan sets aside at least the floor. */
  meetsSavingsFloor: boolean;
};

export function referenceSplit(
  incomeCents: number,
  plan: PlanOutcome,
): SplitGuide {
  const needsCents = Math.round(incomeCents * REFERENCE_SPLIT.needs);
  const wantsCents = Math.round(incomeCents * REFERENCE_SPLIT.wants);
  const savingsCents = Math.round(incomeCents * REFERENCE_SPLIT.savings);
  const spendingCeilingCents = needsCents + wantsCents;

  return {
    needsCents,
    wantsCents,
    savingsCents,
    spendingCeilingCents,
    withinCeiling: plan.spendingCents <= spendingCeilingCents,
    meetsSavingsFloor: plan.savingCents >= savingsCents,
  };
}

// --- reaching a savings target -----------------------------------------

/**
 * How much spending would have to change for a plan to balance.
 *
 * Answers the question the shortfall case actually raises — "so what do I cut?"
 * — with a number rather than an adjective. Null when the plan already works.
 */
export function adjustmentNeeded(plan: PlanOutcome): number | null {
  return plan.verdict === "shortfall" ? Math.abs(plan.leftoverCents) : null;
}

/**
 * The same figure spread across the categories that carry spending, in
 * proportion to their size.
 *
 * Proportional rather than equal: taking $50 off a $60 grocery line and a $600
 * rent line are not the same request, and a suggestion that ignores that is
 * worse than none.
 */
export function proportionalTrim(
  amounts: { id: string; cents: number }[],
  trimCents: number,
): Map<string, number> {
  const total = amounts.reduce((sum, item) => sum + Math.max(0, item.cents), 0);
  const result = new Map<string, number>();
  if (total <= 0 || trimCents <= 0) return result;

  for (const item of amounts) {
    if (item.cents <= 0) continue;
    result.set(item.id, Math.round((item.cents / total) * trimCents));
  }

  return result;
}
