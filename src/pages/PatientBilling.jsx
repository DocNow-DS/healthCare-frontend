import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../config/api';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const readAuthUser = () => {
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const formatMoney = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0.00';
  return numeric.toFixed(2);
};

const parseBillAmount = (bill) => {
  const raw = bill?.totalBill;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeStatus = (status) => String(status || '').toUpperCase();

export default function PatientBilling() {
  const navigate = useNavigate();
  const authUser = useMemo(() => readAuthUser(), []);
  const patientId = useMemo(() => authUser?.id || authUser?.userId || authUser?.username || '', [authUser]);

  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState('');
  const [billTab, setBillTab] = useState('active');
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);

  const paymentsByConsultation = useMemo(() => {
    const map = new Map();
    (Array.isArray(payments) ? payments : []).forEach((payment) => {
      const consultationId = String(payment?.consultationId || '');
      if (!consultationId) return;
      map.set(consultationId, payment);
    });
    return map;
  }, [payments]);

  const enrichedBills = useMemo(() => {
    return (Array.isArray(bills) ? bills : []).map((bill) => {
      const billId = String(bill?.id || '');
      const payment = billId ? paymentsByConsultation.get(billId) : null;
      const paymentStatus = normalizeStatus(payment?.status || 'UNPAID');
      const isPaid = paymentStatus === 'COMPLETED';
      return {
        ...bill,
        payment,
        paymentStatus,
        isPaid,
      };
    });
  }, [bills, paymentsByConsultation]);

  const activeBills = useMemo(() => enrichedBills.filter((item) => !item.isPaid), [enrichedBills]);
  const inactiveBills = useMemo(() => enrichedBills.filter((item) => item.isPaid), [enrichedBills]);

  const totals = useMemo(() => {
    const activeTotal = activeBills.reduce((sum, bill) => sum + parseBillAmount(bill), 0);
    const inactiveTotal = inactiveBills.reduce((sum, bill) => sum + parseBillAmount(bill), 0);
    return { activeTotal, inactiveTotal };
  }, [activeBills, inactiveBills]);

  const loadBillingData = async () => {
    if (!patientId) {
      setWarning('Unable to resolve patient account. Please login again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setWarning('');
    try {
      const [carePlans, patientPayments] = await Promise.all([
        API.carePlans.getByPatient(patientId),
        API.payment.getMyPayments(),
      ]);
      setBills(Array.isArray(carePlans) ? carePlans : []);
      setPayments(Array.isArray(patientPayments) ? patientPayments : []);
    } catch (error) {
      setWarning(error?.payload?.message || error?.message || 'Unable to load billing data.');
      setBills([]);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const handlePayNow = (bill) => {
    const consultationId = bill?.id;
    const amount = parseBillAmount(bill);

    if (!consultationId || amount <= 0) {
      setWarning('This bill cannot be paid yet because it has an invalid bill amount.');
      return;
    }

    const params = new URLSearchParams({
      consultationId: String(consultationId),
      amount: String(Math.round(amount)),
      doctorName: String(bill?.doctorId || 'Doctor'),
    });

    navigate(`/dashboard/payment/checkout?${params.toString()}`);
  };

  const renderBills = (list) => {
    if (loading) {
      return <p className="text-sm font-bold text-[#808e9b]">Loading bill requests...</p>;
    }

    if (list.length === 0) {
      return <p className="text-sm font-bold text-[#808e9b]">No bills in this section.</p>;
    }

    return (
      <div className="space-y-3">
        {list.map((bill) => (
          <div key={bill.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-sm font-black text-primary-500">Bill ID: {String(bill.id || '').slice(-10).toUpperCase()}</p>
                <p className="text-xs font-bold text-[#808e9b] mt-1">Doctor: {bill.doctorId || 'N/A'}</p>
                <p className="text-xs font-bold text-[#808e9b] mt-1">Created: {bill.createdAt ? new Date(bill.createdAt).toLocaleString() : 'N/A'}</p>
                <p className="text-xs font-black text-primary-500 mt-1">Status: {bill.isPaid ? 'PAID' : 'PENDING PAYMENT'}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-primary-500">LKR {formatMoney(parseBillAmount(bill))}</p>
                {bill.isPaid ? (
                  <span className="inline-flex mt-2 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                    Settled
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handlePayNow(bill)}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-accent-red text-white text-xs font-black hover:bg-accent-red/90"
                  >
                    Pay via Payment Service
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs font-bold text-[#1e272e] mt-3 whitespace-pre-wrap">
              {bill.consultationNotes || 'No consultation notes available for this bill.'}
            </p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary-500 tracking-tight">Billing</h1>
          <p className="text-[#808e9b] mt-1 font-bold">Bill requests generated from doctor care plans</p>
        </div>
        <button
          type="button"
          onClick={loadBillingData}
          className="px-4 py-2 bg-primary-500 text-white rounded-xl font-black text-sm hover:bg-primary-500/85"
        >
          Refresh
        </button>
      </div>

      {warning ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
          <span className="text-sm font-semibold text-amber-800">{warning}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border-2 border-slate-50 rounded-2xl p-4">
          <p className="text-xs font-black uppercase tracking-widest text-[#808e9b]">Active Bill Value</p>
          <p className="text-2xl font-black text-primary-500 mt-2">LKR {formatMoney(totals.activeTotal)}</p>
        </div>
        <div className="bg-white border-2 border-slate-50 rounded-2xl p-4">
          <p className="text-xs font-black uppercase tracking-widest text-[#808e9b]">Settled Bill Value</p>
          <p className="text-2xl font-black text-primary-500 mt-2">LKR {formatMoney(totals.inactiveTotal)}</p>
        </div>
      </div>

      <div className="bg-white border-2 border-slate-50 rounded-2xl p-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setBillTab('active')}
            className={`px-4 py-2.5 rounded-xl text-sm font-black transition ${
              billTab === 'active' ? 'bg-primary-500 text-white' : 'bg-slate-50 text-primary-500 hover:bg-slate-100'
            }`}
          >
            Bill Requests - Active ({activeBills.length})
          </button>
          <button
            type="button"
            onClick={() => setBillTab('inactive')}
            className={`px-4 py-2.5 rounded-xl text-sm font-black transition ${
              billTab === 'inactive' ? 'bg-primary-500 text-white' : 'bg-slate-50 text-primary-500 hover:bg-slate-100'
            }`}
          >
            Bill Requests - Inactive ({inactiveBills.length})
          </button>
        </div>
      </div>

      <div className="bg-white border-2 border-slate-50 rounded-2xl p-5">
        {billTab === 'active' ? renderBills(activeBills) : renderBills(inactiveBills)}
      </div>
    </div>
  );
}
