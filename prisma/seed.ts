import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
// Relative import: this script runs outside Next's module resolution, so the
// "@/" alias is not available here.
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

// Local development credentials. Override with SEED_ADMIN_EMAIL /
// SEED_ADMIN_PASSWORD, and change them before this runs anywhere real.
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@crm.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "Admin User";
const ADMIN_ADDRESS =
  process.env.SEED_ADMIN_ADDRESS ??
  "Level 8, Vattanac Capital, 66 Monivong Blvd, Phnom Penh, Cambodia";
// Seeded already-verified so password recovery can be walked through without
// first setting a number by hand. Local development only.
const ADMIN_PHONE = process.env.SEED_ADMIN_PHONE ?? "+85512345678";

// Additional sign-in accounts so the Members page has something to show.
// All share ADMIN_PASSWORD — local development only.
const TEAM = [
  {
    email: "mei.chan@crm.local",
    name: "Mei Chan",
    language: "en",
    address: "88 Robinson Road, Singapore 068898",
  },
  {
    email: "ravi.patel@crm.local",
    name: "Ravi Patel",
    language: "en",
    address: "14 Turner Street, Manchester M4 1DZ, United Kingdom",
  },
  {
    email: "sokha.chea@crm.local",
    name: "Sokha Chea",
    language: "km",
    address: "St. 271, Sen Sok, Phnom Penh, Cambodia",
  },
];

type SeedSource = { name: string; kind: string; active: boolean; note?: string };

type MonthlyPlan = {
  /** Income, keyed by source name. */
  income: Record<string, number>;
  /** Expenses, keyed by category. */
  expenses: Record<string, number>;
  /** Savings, keyed by bucket. */
  savings: Record<string, number>;
};

/**
 * A ledger is only interesting once it has a year of history behind it, so the
 * entries are generated relative to today rather than pinned to fixed dates —
 * the trend chart is then populated whenever the seed happens to be run.
 *
 * `vary` nudges each month by a deterministic amount so the chart has texture
 * without being random: a re-seed on a fresh database produces the same figures.
 */
function vary(base: number, monthsAgo: number, spread = 0.12): number {
  // A cheap deterministic oscillation — no RNG, so runs are reproducible.
  const wave = Math.sin(monthsAgo * 1.7) * spread;
  return Math.round(base * (1 + wave));
}

const ADMIN_SOURCES: SeedSource[] = [
  { name: "Salary — Vattanac", kind: "SALARY", active: true, note: "Paid on the 28th." },
  { name: "Freelance design", kind: "FREELANCE", active: true },
  { name: "Apartment rental", kind: "RENTAL", active: true, note: "Two-bed, Toul Kork." },
  { name: "Old consulting retainer", kind: "BUSINESS", active: false, note: "Contract ended." },
];

function adminMonth(monthsAgo: number): MonthlyPlan {
  return {
    income: {
      "Salary — Vattanac": vary(3_200_00, monthsAgo, 0.02),
      // Freelance is lumpy on purpose: it is what makes the concentration
      // figure move month to month.
      "Freelance design": monthsAgo % 3 === 0 ? vary(1_450_00, monthsAgo, 0.35) : 0,
      "Apartment rental": 650_00,
    },
    expenses: {
      HOUSING: 900_00,
      FOOD: vary(520_00, monthsAgo, 0.18),
      TRANSPORT: vary(180_00, monthsAgo, 0.25),
      UTILITIES: vary(140_00, monthsAgo, 0.2),
      HEALTH: monthsAgo % 4 === 1 ? vary(210_00, monthsAgo, 0.3) : 0,
      EDUCATION: monthsAgo % 6 === 2 ? 400_00 : 0,
      LEISURE: vary(260_00, monthsAgo, 0.4),
      DEBT: 320_00,
    },
    savings: {
      EMERGENCY: 400_00,
      INVESTMENT: vary(600_00, monthsAgo, 0.3),
      RETIREMENT: 250_00,
    },
  };
}

const SOKHA_SOURCES: SeedSource[] = [
  { name: "ប្រាក់ខែ", kind: "SALARY", active: true },
  { name: "លក់អនឡាញ", kind: "BUSINESS", active: true },
];

function sokhaMonth(monthsAgo: number): MonthlyPlan {
  return {
    income: {
      "ប្រាក់ខែ": 1_100_00,
      "លក់អនឡាញ": vary(380_00, monthsAgo, 0.45),
    },
    expenses: {
      HOUSING: 300_00,
      FOOD: vary(260_00, monthsAgo, 0.15),
      TRANSPORT: vary(90_00, monthsAgo, 0.2),
      UTILITIES: 70_00,
      LEISURE: vary(110_00, monthsAgo, 0.35),
    },
    savings: { GOAL: 200_00 },
  };
}

/** Date-only at UTC midnight, matching how the app stores `occurredOn`. */
function dayIn(monthsAgo: number, day: number, now: Date): Date {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() - monthsAgo;
  // Clamp to the month's real length so day 28–31 never rolls into the next one.
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
}

type EntryRow = {
  type: string;
  amountCents: number;
  occurredOn: Date;
  category: string | null;
  note: string | null;
  userId: string;
  sourceId: string | null;
};

function buildEntries(
  userId: string,
  sourceIds: Map<string, string>,
  plan: (monthsAgo: number) => MonthlyPlan,
  now: Date,
): EntryRow[] {
  const rows: EntryRow[] = [];

  for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo -= 1) {
    const { income, expenses, savings } = plan(monthsAgo);

    for (const [name, amountCents] of Object.entries(income)) {
      const sourceId = sourceIds.get(name);
      if (!sourceId || amountCents <= 0) continue;

      rows.push({
        type: "INCOME",
        amountCents,
        occurredOn: dayIn(monthsAgo, 28, now),
        category: null,
        note: null,
        userId,
        sourceId,
      });
    }

    for (const [category, amountCents] of Object.entries(expenses)) {
      if (amountCents <= 0) continue;

      rows.push({
        type: "EXPENSE",
        amountCents,
        occurredOn: dayIn(monthsAgo, 12, now),
        category,
        note: null,
        userId,
        sourceId: null,
      });
    }

    for (const [category, amountCents] of Object.entries(savings)) {
      if (amountCents <= 0) continue;

      rows.push({
        type: "SAVING",
        amountCents,
        occurredOn: dayIn(monthsAgo, 29, now),
        category,
        note: null,
        userId,
        sourceId: null,
      });
    }
  }

  return rows;
}

/**
 * Sources upsert on their (userId, name) unique index, so re-seeding is safe.
 * Entries have no natural key, so they are written only when the account has an
 * empty ledger — a re-seed never duplicates or overwrites real entries.
 */
async function seedLedger(
  prisma: PrismaClient,
  userId: string,
  sources: SeedSource[],
  plan: (monthsAgo: number) => MonthlyPlan,
  now: Date,
): Promise<number> {
  const sourceIds = new Map<string, string>();

  for (const source of sources) {
    const row = await prisma.incomeSource.upsert({
      where: { userId_name: { userId, name: source.name } },
      update: { kind: source.kind, active: source.active, note: source.note ?? null },
      create: {
        userId,
        name: source.name,
        kind: source.kind,
        active: source.active,
        note: source.note ?? null,
      },
      select: { id: true },
    });
    sourceIds.set(source.name, row.id);
  }

  const existing = await prisma.entry.count({ where: { userId } });
  if (existing > 0) return 0;

  const rows = buildEntries(userId, sourceIds, plan, now);
  await prisma.entry.createMany({ data: rows });
  return rows.length;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");

  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  });
  const now = new Date();

  try {
    // Password is only rewritten on create, so a changed password survives
    // a re-seed.
    let admin = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
      select: { id: true, address: true, phone: true },
    });

    if (!admin) {
      admin = await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          name: ADMIN_NAME,
          address: ADMIN_ADDRESS,
          phone: ADMIN_PHONE,
          phoneVerifiedAt: new Date(),
          passwordHash: await hashPassword(ADMIN_PASSWORD),
        },
        // Must match the shape selected above, or the assignment leaves `admin`
        // nullable and every later use of it fails to compile.
        select: { id: true, address: true, phone: true },
      });
      console.log(`Created admin user ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    } else if (!admin.phone) {
      // Backfill only when empty, same rule as the address below.
      await prisma.user.update({
        where: { id: admin.id },
        data: { phone: ADMIN_PHONE, phoneVerifiedAt: new Date() },
      });
      console.log(`Admin user ${ADMIN_EMAIL} already exists — added recovery phone ${ADMIN_PHONE}.`);
    } else if (!admin.address) {
      // Backfill only when empty — never clobber an address edited in Settings.
      await prisma.user.update({
        where: { id: admin.id },
        data: { address: ADMIN_ADDRESS },
      });
      console.log(`Admin user ${ADMIN_EMAIL} already exists — filled in missing address.`);
    } else {
      console.log(`Admin user ${ADMIN_EMAIL} already exists — left unchanged.`);
    }

    // Same rule for team accounts: create only, never overwrite a password or
    // a profile the user has since edited.
    let createdTeam = 0;
    for (const member of TEAM) {
      const existing = await prisma.user.findUnique({
        where: { email: member.email },
        select: { id: true },
      });
      if (existing) continue;

      await prisma.user.create({
        data: { ...member, passwordHash: await hashPassword(ADMIN_PASSWORD) },
      });
      createdTeam += 1;
    }
    if (createdTeam > 0) {
      console.log(`Created ${createdTeam} team member account(s).`);
    }

    const adminEntries = await seedLedger(
      prisma,
      admin.id,
      ADMIN_SOURCES,
      adminMonth,
      now,
    );

    // A second populated ledger, so the per-account separation is visible:
    // sign in as Sokha and the figures are entirely different.
    const sokha = await prisma.user.findUnique({
      where: { email: "sokha.chea@crm.local" },
      select: { id: true },
    });
    const sokhaEntries = sokha
      ? await seedLedger(prisma, sokha.id, SOKHA_SOURCES, sokhaMonth, now)
      : 0;

    const [sourceCount, entryCount, userCount] = await Promise.all([
      prisma.incomeSource.count(),
      prisma.entry.count(),
      prisma.user.count(),
    ]);

    console.log(
      `Seeded ${adminEntries + sokhaEntries} new entries ` +
        `(${sourceCount} sources, ${entryCount} entries, ${userCount} users in db).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
