"use client";

import { useMemo, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { formatCurrency } from "@/lib/format";
import { parseMoneyToCents } from "@/lib/finance";
import { toneClass } from "@/lib/expense";
import {
  adjustmentNeeded,
  evaluatePlan,
  proportionalTrim,
  referenceSplit,
  type PlannerBaseline,
} from "@/lib/planner";

/** Quick savings targets, as a share of income. */
const SAVINGS_PRESETS = [0.1, 0.2, 0.3];

/** Cents → the text that goes in an input. Whole amounts lose the ".00". */
function toInput(cents: number): string {
  if (cents === 0) return "";
  return cents % 100 === 0
    ? String(cents / 100)
    : (cents / 100).toFixed(2);
}

/** Input text → cents. Anything unparseable reads as zero rather than NaN. */
function toCents(value: string): number {
  if (!value.trim()) return 0;
  return parseMoneyToCents(value) ?? 0;
}

/**
 * The what-if planner.
 *
 * Every figure starts from the ledger and every figure is editable, and none of
 * it is ever written back. That is the whole design: a place to ask "what if I
 * spent this instead" without the answer costing you your records.
 *
 * State lives as the raw strings the user typed rather than parsed numbers, so
 * a half-finished "12." behaves the way a text field should instead of
 * snapping to something else under the cursor.
 */
export function PlannerPanel({ baseline }: { baseline: PlannerBaseline }) {
  const t = useT();

  const [income, setIncome] = useState(() => toInput(baseline.incomeCents));
  const [saving, setSaving] = useState(() => toInput(baseline.savingCents));
  const [spend, setSpend] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      baseline.categories.map((c) => [c.id, toInput(c.typicalCents)]),
    ),
  );

  const plan = useMemo(() => {
    const incomeCents = toCents(income);
    const savingCents = toCents(saving);
    const spendingCents = baseline.categories.reduce(
      (sum, category) => sum + toCents(spend[category.id] ?? ""),
      0,
    );

    return evaluatePlan(incomeCents, spendingCents, savingCents);
  }, [income, saving, spend, baseline.categories]);

  const guide = referenceSplit(plan.incomeCents, plan);
  const shortfall = adjustmentNeeded(plan);

  /** What each category would give up to close a shortfall proportionally. */
  const trim = useMemo(() => {
    if (shortfall === null) return new Map<string, number>();
    return proportionalTrim(
      baseline.categories.map((c) => ({
        id: c.id,
        cents: toCents(spend[c.id] ?? ""),
      })),
      shortfall,
    );
  }, [shortfall, spend, baseline.categories]);

  /**
   * Subtracts each category's share of the shortfall, so the plan lands on
   * zero. Only ever moves the numbers in this panel.
   */
  function applyTrim() {
    setSpend((current) => {
      const next = { ...current };
      for (const [id, cut] of trim) {
        const remaining = Math.max(0, toCents(current[id] ?? "") - cut);
        next[id] = toInput(remaining);
      }
      return next;
    });
  }

  function reset() {
    setIncome(toInput(baseline.incomeCents));
    setSaving(toInput(baseline.savingCents));
    setSpend(
      Object.fromEntries(
        baseline.categories.map((c) => [c.id, toInput(c.typicalCents)]),
      ),
    );
  }

  const verdictTone =
    plan.verdict === "shortfall"
      ? "text-danger-text"
      : plan.verdict === "surplus"
        ? "text-[var(--badge-emerald-fg)]"
        : "text-text";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <p className="text-[13px] text-muted">
          {t("planner.intro", { months: baseline.monthsObserved })}
        </p>

        {/* The answer, kept at the top: it is what you came for, and it moves
            as you type rather than after a submit. */}
        <div className="rounded-lg border border-border bg-sunken px-4 py-3">
          <div className="text-xs font-medium tracking-wide text-muted uppercase">
            {t("planner.leftover")}
          </div>
          <div
            className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums ${verdictTone}`}
          >
            {plan.leftoverCents < 0 ? "−" : ""}
            {formatCurrency(Math.abs(plan.leftoverCents))}
          </div>
          <p className="mt-0.5 text-[13px] text-muted">
            {plan.verdict === "shortfall"
              ? t("planner.verdictShortfall")
              : plan.verdict === "surplus"
                ? t("planner.verdictSurplus")
                : t("planner.verdictBalanced")}
          </p>

          <dl className="mt-3 space-y-1 border-t border-border pt-3 text-[13px]">
            <Row label={t("planner.income")} value={plan.incomeCents} />
            <Row
              label={t("planner.spending")}
              value={plan.spendingCents}
              negative
            />
            <Row label={t("planner.saving")} value={plan.savingCents} negative />
          </dl>
        </div>

        <Field label={t("planner.income")}>
          <input
            inputMode="decimal"
            value={income}
            onChange={(event) => setIncome(event.target.value)}
            placeholder="0"
            className={inputClass}
          />
        </Field>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-medium">{t("planner.saving")}</span>
            <div className="flex gap-1">
              {SAVINGS_PRESETS.map((fraction) => (
                <button
                  key={fraction}
                  type="button"
                  onClick={() =>
                    setSaving(
                      toInput(Math.round(plan.incomeCents * fraction)),
                    )
                  }
                  className="rounded-md bg-sunken px-2 py-1 text-xs font-medium text-muted transition-colors hover:text-text"
                >
                  {Math.round(fraction * 100)}%
                </button>
              ))}
            </div>
          </div>
          <input
            inputMode="decimal"
            value={saving}
            onChange={(event) => setSaving(event.target.value)}
            placeholder="0"
            className={inputClass}
          />
          {plan.savingsRate !== null ? (
            <p className="text-xs text-muted">
              {t("planner.savingsRate", { percent: plan.savingsRate })}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-medium">{t("planner.spending")}</span>
            <div className="flex items-baseline gap-3">
              {/*
                The per-category figures below say how much each would give up.
                This turns all of them into one press, which is what a reader
                staring at nine suggested cuts actually wants.
              */}
              {shortfall !== null && trim.size > 0 ? (
                <button
                  type="button"
                  onClick={applyTrim}
                  className="rounded-md bg-sunken px-2 py-1 text-xs font-medium text-muted transition-colors hover:text-text"
                >
                  {t("planner.balance")}
                </button>
              ) : null}
              <span className="text-[13px] text-muted tabular-nums">
                {formatCurrency(plan.spendingCents)}
              </span>
            </div>
          </div>

          {baseline.categories.length === 0 ? (
            <p className="text-[13px] text-muted">{t("planner.noCategories")}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-x-3 gap-y-3">
              {baseline.categories.map((category) => {
                const suggestion = trim.get(category.id);

                return (
                  <li key={category.id} className="min-w-0 space-y-1.5">
                    {/* Label above the field rather than beside it. Side by
                        side, two columns leave each cell about 200px, and a
                        badge and an input cannot share that without both
                        becoming unreadable. */}
                    <span
                      className={`${toneClass(category.tone)} block max-w-full truncate`}
                    >
                      {category.name}
                    </span>

                    <input
                      inputMode="decimal"
                      value={spend[category.id] ?? ""}
                      onChange={(event) =>
                        setSpend((current) => ({
                          ...current,
                          [category.id]: event.target.value,
                        }))
                      }
                      placeholder="0"
                      aria-label={category.name}
                      className={inputClass}
                    />

                    {/* Just the figure in this narrow column — the sentence
                        that explains it wrapped to three lines and made every
                        cell a different height. The full wording stays on the
                        title, and on the Balance button above. */}
                    {suggestion && suggestion > 0 ? (
                      <p
                        title={t("planner.trimHint", {
                          amount: formatCurrency(suggestion),
                        })}
                        className="text-xs text-muted tabular-nums"
                      >
                        −{formatCurrency(suggestion)}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Guidance, clearly labelled as a rule of thumb rather than advice
            about this particular person's circumstances. */}
        {plan.incomeCents > 0 ? (
          <section className="rounded-lg border border-border px-4 py-3">
            <h3 className="text-xs font-medium tracking-wide text-muted uppercase">
              {t("planner.splitHeading")}
            </h3>
            <p className="mt-1 text-[13px] text-muted">
              {t("planner.splitIntro")}
            </p>

            <dl className="mt-3 space-y-1.5 text-[13px]">
              <Row label={t("planner.splitNeeds")} value={guide.needsCents} />
              <Row label={t("planner.splitWants")} value={guide.wantsCents} />
              <Row
                label={t("planner.splitSavings")}
                value={guide.savingsCents}
              />
            </dl>

            <ul className="mt-3 space-y-1 border-t border-border pt-3 text-[13px]">
              <li
                className={
                  guide.withinCeiling ? "text-muted" : "text-danger-text"
                }
              >
                {guide.withinCeiling
                  ? t("planner.ceilingOk", {
                      amount: formatCurrency(guide.spendingCeilingCents),
                    })
                  : t("planner.ceilingOver", {
                      amount: formatCurrency(
                        plan.spendingCents - guide.spendingCeilingCents,
                      ),
                    })}
              </li>
              <li
                className={
                  guide.meetsSavingsFloor ? "text-muted" : "text-danger-text"
                }
              >
                {guide.meetsSavingsFloor
                  ? t("planner.floorOk", {
                      amount: formatCurrency(guide.savingsCents),
                    })
                  : t("planner.floorUnder", {
                      amount: formatCurrency(
                        guide.savingsCents - plan.savingCents,
                      ),
                    })}
              </li>
            </ul>
          </section>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-5 py-3">
        <p className="text-xs text-muted">{t("planner.notSaved")}</p>
        <button
          type="button"
          onClick={reset}
          className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-hover hover:text-text"
        >
          {t("planner.reset")}
        </button>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text tabular-nums outline-none transition-shadow placeholder:text-placeholder focus:border-accent focus:ring-2 focus:ring-focus-ring";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function Row({
  label,
  value,
  negative = false,
}: {
  label: string;
  value: number;
  negative?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium tabular-nums">
        {negative && value > 0 ? "−" : ""}
        {formatCurrency(value)}
      </dd>
    </div>
  );
}
