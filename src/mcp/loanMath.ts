export interface InstallmentRow {
  no: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

export interface InstallmentPlan {
  principal: number;
  months: number;
  monthlyRatePercent: number;
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  schedule: InstallmentRow[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// Eşit taksitli (annuity) kredi: taksit = P * r / (1 - (1+r)^-n)
export function calculateInstallments(
  principal: number,
  months: number,
  monthlyRatePercent: number,
): InstallmentPlan {
  const r = monthlyRatePercent / 100;
  const payment =
    r === 0 ? principal / months : (principal * r) / (1 - Math.pow(1 + r, -months));

  let balance = principal;
  const schedule: InstallmentRow[] = [];
  for (let no = 1; no <= months; no++) {
    const interest = balance * r;
    const principalPart = payment - interest;
    balance = Math.max(balance - principalPart, 0);
    schedule.push({
      no,
      payment: round2(payment),
      interest: round2(interest),
      principal: round2(principalPart),
      balance: round2(balance),
    });
  }

  return {
    principal,
    months,
    monthlyRatePercent,
    monthlyPayment: round2(payment),
    totalPayment: round2(payment * months),
    totalInterest: round2(payment * months - principal),
    schedule,
  };
}