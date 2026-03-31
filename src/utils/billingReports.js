const BILL_REPORTS_KEY = 'billing_generated_reports';

const readStoredReports = () => {
  try {
    const raw = localStorage.getItem(BILL_REPORTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getGeneratedBillingReports = () => readStoredReports();

export const createBillingReportEntry = ({ consultationId, paymentId, amountCents, currency, paidAt }) => {
  if (!consultationId) return;

  const existing = readStoredReports();
  const alreadyExists = existing.some((item) => String(item.consultationId) === String(consultationId));
  if (alreadyExists) return;

  const amount = Number.isFinite(Number(amountCents)) ? Number(amountCents) / 100 : null;
  const safeCurrency = String(currency || 'LKR').toUpperCase();

  const entry = {
    id: `bill-report-${consultationId}`,
    consultationId,
    paymentId: paymentId || '',
    title: `Billing Report #${String(consultationId).slice(-8).toUpperCase()}`,
    description: amount == null
      ? 'Bill settled successfully. Payment was confirmed by payment service.'
      : `Bill settled successfully. Amount paid: ${safeCurrency} ${amount.toFixed(2)}.`,
    createdAt: paidAt || new Date().toISOString(),
    type: 'BILLING',
  };

  const updated = [entry, ...existing];
  localStorage.setItem(BILL_REPORTS_KEY, JSON.stringify(updated));
};
