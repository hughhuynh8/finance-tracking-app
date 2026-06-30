// Mortgage amortization math. Pure functions, no I/O — given a loan and its
// logged repayments, reconstruct the real balance curve and project forward to
// an estimated payoff date.
//
// Interest on the *actual* history accrues daily (so irregular or fortnightly
// repayments are handled uniformly), while the forward *projection* uses simple
// monthly compounding at the scheduled repayment — matching how a lender quotes
// "X months remaining".

export type MortgageInput = {
  principal: number;
  interestRate: number; // annual nominal rate, percent (e.g. 6.14)
  monthlyRepayment: number; // scheduled monthly repayment used for projection
  // Linked offset account balance. Interest accrues only on the loan balance
  // above this amount, i.e. max(0, balance - offset). Treated as constant over
  // the loan's life (a simplification — see note in computeAmortization).
  offsetBalance: number;
  startDate: Date; // opening-balance date
  repayments: { date: Date; amount: number }[];
};

export type BalancePoint = { date: Date; balance: number };

export type Amortization = {
  currentBalance: number;
  paidOff: boolean; // already fully repaid by the logged repayments
  actual: BalancePoint[]; // opening balance + one point per repayment
  projected: BalancePoint[]; // from the current balance forward to payoff
  payoffDate: Date | null;
  monthsRemaining: number | null;
  totalInterestPaid: number; // interest accrued across the logged history
  totalInterestRemaining: number; // interest still to be paid per the projection
  // True when the scheduled repayment doesn't even cover the first month's
  // interest, so the balance would never fall to zero.
  neverPaysOff: boolean;
};

const MS_PER_DAY = 86_400_000;
// Guard so a too-small (but interest-covering) repayment can't loop forever.
const MAX_PROJECTION_MONTHS = 1200; // 100 years

function daysBetween(a: Date, b: Date): number {
  return Math.max(0, (b.getTime() - a.getTime()) / MS_PER_DAY);
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

export function computeAmortization(m: MortgageInput): Amortization {
  const dailyRate = m.interestRate / 100 / 365;
  const monthlyRate = m.interestRate / 100 / 12;
  const offset = Math.max(0, m.offsetBalance);

  // The portion of the balance that actually accrues interest after the offset
  // account is applied. The offset is treated as constant across the loan's
  // life, so it's applied to historical accrual as well as the projection.
  const offsetAdjusted = (bal: number) => Math.max(0, bal - offset);

  // --- Actual history: replay repayments in date order from the opening balance.
  const sorted = [...m.repayments].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
  const actual: BalancePoint[] = [{ date: m.startDate, balance: m.principal }];
  let balance = m.principal;
  let prevDate = m.startDate;
  let totalInterestPaid = 0;

  for (const r of sorted) {
    const interest =
      offsetAdjusted(balance) * dailyRate * daysBetween(prevDate, r.date);
    totalInterestPaid += interest;
    balance = balance + interest - r.amount;
    if (balance < 0) balance = 0;
    actual.push({ date: r.date, balance });
    prevDate = r.date;
  }

  const currentBalance = balance;
  const paidOff = currentBalance <= 0;

  // --- Projection: compound monthly at the scheduled repayment until cleared.
  const projected: BalancePoint[] = [
    { date: prevDate, balance: currentBalance },
  ];
  let payoffDate: Date | null = paidOff ? prevDate : null;
  let monthsRemaining: number | null = paidOff ? 0 : null;
  let totalInterestRemaining = 0;
  let neverPaysOff = false;

  if (!paidOff) {
    if (m.monthlyRepayment <= offsetAdjusted(currentBalance) * monthlyRate) {
      // Repayment can't outpace interest — the loan never amortizes.
      neverPaysOff = true;
    } else {
      let b = currentBalance;
      let d = prevDate;
      let months = 0;
      while (b > 0 && months < MAX_PROJECTION_MONTHS) {
        const interest = offsetAdjusted(b) * monthlyRate;
        totalInterestRemaining += interest;
        b = b + interest - m.monthlyRepayment;
        if (b < 0) b = 0;
        d = addMonths(d, 1);
        months += 1;
        projected.push({ date: d, balance: b });
      }
      payoffDate = d;
      monthsRemaining = months;
    }
  }

  return {
    currentBalance,
    paidOff,
    actual,
    projected,
    payoffDate,
    monthsRemaining,
    totalInterestPaid,
    totalInterestRemaining,
    neverPaysOff,
  };
}

// Render "X yr Y mo" from a month count, for payoff summaries.
export function formatMonths(months: number): string {
  const y = Math.floor(months / 12);
  const mo = months % 12;
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} yr`);
  if (mo > 0) parts.push(`${mo} mo`);
  return parts.length > 0 ? parts.join(" ") : "0 mo";
}
