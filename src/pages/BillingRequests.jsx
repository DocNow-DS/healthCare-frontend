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

const resolveRole = (roles) => {
  const first = Array.isArray(roles) ? String(roles[0] || '').toUpperCase() : '';
  if (first === 'DOCTOR') return 'DOCTOR';
  if (first === 'ADMIN') return 'ADMIN';
  return 'PATIENT';
};

const formatMoney = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0.00';
  return numeric.toFixed(2);
};

const parseBillAmount = (bill) => {
  const direct = Number(bill?.totalBill);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const altFields = [bill?.billAmount, bill?.amount, bill?.totalAmount];
  for (const value of altFields) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  const medicinesTotal = Array.isArray(bill?.medicines)
    ? bill.medicines.reduce((sum, med) => {
        const price = Number(med?.price);
        return Number.isFinite(price) ? sum + price : sum;
      }, 0)
    : 0;

  return medicinesTotal > 0 ? medicinesTotal : 0;
};

const normalizeStatus = (status) => String(status || '').toUpperCase();

export default function BillingRequests() {
  const navigate = useNavigate();
  const authUser = useMemo(() => readAuthUser(), []);
  const role = useMemo(() => resolveRole(authUser?.roles), [authUser]);
  const userId = useMemo(() => authUser?.id || authUser?.userId || authUser?.username || '', [authUser]);

  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState('');
  const [tab, setTab] = useState('active');
  const [bills, setBills] = useState([]);
  const [paymentsByConsultation, setPaymentsByConsultation] = useState({});
  const [payingBillId, setPayingBillId] = useState('');

  const loadBillingData = async () => {
    if (!userId) {
      setWarning('Unable to resolve logged-in account. Please login again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setWarning('');

    try {
      const plans = role === 'DOCTOR'
        ? await API.carePlans.getByDoctor(userId)
        : await API.carePlans.getByPatient(userId);

      const safePlans = Array.isArray(plans) ? plans : [];
      setBills(safePlans);

      if (safePlans.length === 0) {
        setPaymentsByConsultation({});
        return;
      }

      if (role === 'PATIENT') {
        const myPayments = await API.payment.getMyPayments();
        const mapped = (Array.isArray(myPayments) ? myPayments : []).reduce((acc, item) => {
          const key = String(item?.consultationId || '');
          if (key) acc[key] = item;
          return acc;
        }, {});
        setPaymentsByConsultation(mapped);
        return;
      }

      const paymentLookups = await Promise.allSettled(
        safePlans.map((plan) => API.payment.getPaymentByConsultation(String(plan?.id || ''))),
      );

      const mapped = {};
      paymentLookups.forEach((result, index) => {
        const consultationId = String(safePlans[index]?.id || '');
        if (!consultationId) return;
        if (result.status === 'fulfilled' && result.value) {
          mapped[consultationId] = result.value;
        }
      });
      setPaymentsByConsultation(mapped);
    } catch (error) {
      setWarning(error?.payload?.message || error?.message || 'Unable to load bill requests.');
      setBills([]);
      setPaymentsByConsultation({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, role]);

  useEffect(() => {
    if (role !== 'PATIENT') return undefined;

    const intervalId = setInterval(() => {
      loadBillingData();
    }, 8000);

    const handleFocus = () => loadBillingData();
    const handleStorage = (event) => {
      if (event.key === 'billing_refresh_ts') {
        loadBillingData();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const enrichedBills = useMemo(() => {
    return bills.map((bill) => {
      const billId = String(bill?.id || '');
      const payment = paymentsByConsultation[billId] || null;
      const paymentStatus = normalizeStatus(payment?.status || 'UNPAID');
      const isPaid = paymentStatus === 'COMPLETED';
      return { ...bill, paymentStatus, isPaid };
    });
  }, [bills, paymentsByConsultation]);

  const activeBills = useMemo(() => enrichedBills.filter((item) => !item.isPaid), [enrichedBills]);
  const inactiveBills = useMemo(() => enrichedBills.filter((item) => item.isPaid), [enrichedBills]);

  const totals = useMemo(() => {
    const activeTotal = activeBills.reduce((sum, bill) => sum + parseBillAmount(bill), 0);
    const inactiveTotal = inactiveBills.reduce((sum, bill) => sum + parseBillAmount(bill), 0);
    return { activeTotal, inactiveTotal };
  }, [activeBills, inactiveBills]);

  const perspectiveText = role === 'DOCTOR'
    ? 'Doctor view: all bills generated from your care plans'
    : 'Patient view: bill requests you can pay via payment service';

  const handlePayNow = (bill) => {
    if (role !== 'PATIENT') return;

    const consultationId = bill?.id;
    const rawAmount = parseBillAmount(bill);
    if (!consultationId) {
      setWarning('This bill cannot be paid yet because consultation id is missing.');
      return;
    }

    const amount = Math.max(1, Math.round(rawAmount || 0));
    if (rawAmount <= 0) {
      setWarning('Bill amount was missing, using minimum payable amount. Please verify with your doctor.');
    }

    const billId = String(bill?.id || '');
    setPayingBillId(billId);
    navigate('/dashboard/payment/checkout', {
      state: {
        consultationId: String(consultationId),
        amount,
        doctorName: String(bill?.doctorId || 'Doctor'),
      },
    });
  };

  const renderList = (list) => {
    if (loading) return <p className="text-sm font-bold text-[#808e9b]">Loading bill requests...</p>;
    if (list.length === 0) return <p className="text-sm font-bold text-[#808e9b]">No bill requests in this tab.</p>;

    return (
      <div className="space-y-3">
        {list.map((bill) => (
          <div key={bill.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-sm font-black text-primary-500">Bill ID: {String(bill?.id || '').slice(-10).toUpperCase()}</p>
                <p className="text-xs font-bold text-[#808e9b] mt-1">Patient: {bill?.patientId || 'N/A'}</p>
                <p className="text-xs font-bold text-[#808e9b] mt-1">Doctor: {bill?.doctorId || 'N/A'}</p>
                <p className="text-xs font-bold text-[#808e9b] mt-1">Created: {bill?.createdAt ? new Date(bill.createdAt).toLocaleString() : 'N/A'}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black ${bill.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {bill.isPaid ? 'PAID' : 'ACTIVE'}
                  </span>
                  {!bill.isPaid ? (
                    <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                      Gateway Ready
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-primary-500">LKR {formatMoney(parseBillAmount(bill))}</p>
                {bill.isPaid ? (
                  <span className="inline-flex mt-2 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                    Settled
                  </span>
                ) : role === 'PATIENT' ? (
                  <button
                    type="button"
                    onClick={() => handlePayNow(bill)}
                    disabled={payingBillId === String(bill?.id || '')}
                    className="mt-2 px-4 py-2 rounded-lg bg-accent-red text-white text-xs font-black hover:bg-accent-red/90 disabled:opacity-60"
                  >
                    {payingBillId === String(bill?.id || '') ? 'Opening...' : 'Pay Now'}
                  </button>
                ) : (
                  <span className="inline-flex mt-2 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                    Waiting for patient payment
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs font-bold text-[#1e272e] mt-3 whitespace-pre-wrap">
              {bill?.consultationNotes || 'No consultation notes available.'}
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
          <h1 className="text-3xl font-black text-primary-500 tracking-tight">Bill Requests</h1>
          <p className="text-[#808e9b] mt-1 font-bold">{perspectiveText}</p>
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
          <p className="text-xs font-black uppercase tracking-widest text-[#808e9b]">Inactive Bill Value</p>
          <p className="text-2xl font-black text-primary-500 mt-2">LKR {formatMoney(totals.inactiveTotal)}</p>
        </div>
      </div>

      <div className="bg-white border-2 border-slate-50 rounded-2xl p-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTab('active')}
            className={`px-4 py-2.5 rounded-xl text-sm font-black transition ${
              tab === 'active' ? 'bg-primary-500 text-white' : 'bg-slate-50 text-primary-500 hover:bg-slate-100'
            }`}
          >
            Active ({activeBills.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('inactive')}
            className={`px-4 py-2.5 rounded-xl text-sm font-black transition ${
              tab === 'inactive' ? 'bg-primary-500 text-white' : 'bg-slate-50 text-primary-500 hover:bg-slate-100'
            }`}
          >
            Inactive ({inactiveBills.length})
          </button>
        </div>
      </div>

      <div className="bg-white border-2 border-slate-50 rounded-2xl p-5">
        {tab === 'active' ? renderList(activeBills) : renderList(inactiveBills)}
      </div>
    </div>
  );
}