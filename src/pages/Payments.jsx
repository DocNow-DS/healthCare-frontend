import { 
  CreditCardIcon, 
  CheckCircleIcon,
  ShoppingBagIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import { API } from '../config/api';

export default function Payments() {
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState('');
  const [transactions, setTransactions] = useState([]);

  const loadTransactions = async () => {
    setLoading(true);
    setWarning('');
    try {
      const list = await API.admin.getTransactions();
      setTransactions(Array.isArray(list) ? list : []);
    } catch (e) {
      setWarning(e?.message || 'Unable to load transactions from backend');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const toDisplayAmount = (tx) => {
    if (Number.isFinite(Number(tx?.amount))) return Number(tx.amount);
    if (Number.isFinite(Number(tx?.amountLKR))) return Number(tx.amountLKR);
    if (Number.isFinite(Number(tx?.amountCents))) return Number(tx.amountCents) / 100;
    return 0;
  };

  const totals = useMemo(() => {
    const spent = transactions
      .filter((t) => String(t?.status || '').toUpperCase() === 'COMPLETED')
      .reduce((sum, t) => sum + toDisplayAmount(t), 0);

    const unpaid = transactions
      .filter((t) => String(t?.status || '').toUpperCase() !== 'COMPLETED')
      .reduce((sum, t) => sum + toDisplayAmount(t), 0);

    return { spent, unpaid };
  }, [transactions]);

  const resolveTitle = (tx) => {
    if (tx?.type || tx?.category) return tx.type || tx.category;
    if (tx?.consultationId) return `Consultation ${String(tx.consultationId).slice(-8).toUpperCase()}`;
    return 'Payment Transaction';
  };

  const resolveMeta = (tx) => {
    const parts = [];
    if (tx?.patientId) parts.push(`Patient: ${tx.patientId}`);
    if (tx?.doctorId) parts.push(`Doctor: ${tx.doctorId}`);
    if (tx?.customerEmail) parts.push(tx.customerEmail);
    return parts.length > 0 ? parts.join(' • ') : 'N/A';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-slate-50 pb-6">
        <div>
          <h1 className="text-3xl font-black text-[#182C61] tracking-tighter">Billing</h1>
          <p className="text-[#808e9b] mt-2 font-black uppercase tracking-[0.2em] text-[9px]">Secure Management</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadTransactions}
            className="px-4 py-2 bg-[#182C61] text-white rounded-xl font-black text-sm hover:bg-[#182C61]/85"
          >
            Refresh
          </button>
          <div className="flex items-center space-x-2 bg-[#eb2f06]/5 px-4 py-2 rounded-xl border border-[#eb2f06]/10">
            <ShieldCheckIcon className="h-4 w-4 text-[#eb2f06]" />
            <span className="text-[9px] font-black text-[#eb2f06] uppercase tracking-widest">PCI-DSS Compliant</span>
          </div>
        </div>
      </div>

      {warning ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
          <span className="text-sm font-semibold text-amber-800">{warning}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Active Methods */}
          <div className="bg-white border-2 border-slate-50 p-8 rounded-[2rem] shadow-xl shadow-[#182C61]/5">
            <h3 className="text-xl font-black text-[#182C61] mb-8 tracking-tight">Saved Methods</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#182C61] p-6 rounded-[1.5rem] text-white relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer shadow-lg">
                <div className="relative z-10 flex flex-col h-full justify-between min-h-[120px]">
                  <div className="flex justify-between items-start">
                    <CreditCardIcon className="h-8 w-8 text-white/40" />
                    <span className="text-[8px] font-black uppercase tracking-[0.2em]">Primary</span>
                  </div>
                  <div>
                    <p className="text-base font-black tracking-widest">•••• •••• •••• 1289</p>
                    <div className="flex justify-between mt-4 text-[8px] font-black uppercase tracking-widest text-white/50">
                      <span>Exp 12/28</span>
                      <span>Visa</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <button className="border-2 border-dashed border-slate-100 rounded-[1.5rem] p-6 flex flex-col items-center justify-center text-[#808e9b] hover:border-[#182C61]/20 hover:text-[#182C61] transition-all group">
                <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center mb-2 group-hover:bg-[#182C61] group-hover:text-white transition-all">
                  <span className="text-xl font-black">+</span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#182C61]">Add Card</span>
              </button>
            </div>
          </div>

          {/* History */}
          <div className="bg-white border-2 border-slate-50 p-8 rounded-[2rem] shadow-xl shadow-[#182C61]/5">
            <h3 className="text-xl font-black text-[#182C61] mb-8 tracking-tight">Recent Activity</h3>
            <div className="space-y-4">
              {loading ? (
                <p className="text-sm font-bold text-[#808e9b]">Loading transactions...</p>
              ) : transactions.length === 0 ? (
                <p className="text-sm font-bold text-[#808e9b]">No transaction data found.</p>
              ) : transactions.map((tx, idx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-[#182C61]/5 group cursor-pointer">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center shadow-md group-hover:bg-[#182C61] group-hover:text-white transition-all">
                      <ShoppingBagIcon className="h-5 w-5 text-[#182C61] group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <p className="font-black text-[#182C61] text-base leading-none">{resolveTitle(tx)}</p>
                      <p className="text-[9px] font-bold text-[#808e9b] mt-1.5 uppercase tracking-widest">
                        {resolveMeta(tx)} • {tx.date ? tx.date : new Date(tx.createdAt || Date.now()).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-lg text-[#182C61] tracking-tighter leading-none">LKR {toDisplayAmount(tx).toLocaleString()}</p>
                    <div className="flex items-center justify-end space-x-1.5 mt-1.5">
                       <CheckCircleIcon className={`h-3 w-3 ${String(tx.status || '').toUpperCase() === 'COMPLETED' ? 'text-[#eb2f06]' : 'text-amber-500'}`} />
                       <span className="text-[9px] font-black text-[#808e9b] uppercase tracking-widest">{tx.status || (idx === 0 ? 'Completed' : 'Pending')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-[#eb2f06] p-8 rounded-[2rem] shadow-xl shadow-[#eb2f06]/20 text-white relative overflow-hidden">
              <div className="relative z-10 space-y-6">
                 <h3 className="text-2xl font-black tracking-tighter leading-none text-white">Wallet <br /> Summary</h3>
                 <div className="space-y-4 pt-4 border-t border-white/20">
                    <div className="flex justify-between items-center opacity-70">
                       <span className="text-[9px] font-black uppercase tracking-widest">Spent</span>
                        <span className="text-xs font-black">LKR {totals.spent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center opacity-70">
                       <span className="text-[9px] font-black uppercase tracking-widest">Unpaid</span>
                        <span className="text-xs font-black">LKR {totals.unpaid.toLocaleString()}</span>
                    </div>
                 </div>
                 <button className="w-full py-4 bg-[#182C61] text-white font-black rounded-xl shadow-lg hover:scale-[1.02] transition-all uppercase tracking-widest text-[9px]">
                    Settled Pending
                 </button>
              </div>
           </div>

           <div className="bg-[#182C61] p-8 rounded-[2rem] shadow-xl shadow-[#182C61]/20">
              <h3 className="text-white font-black text-lg mb-2">Insurance</h3>
              <p className="text-white/50 text-[10px] font-bold leading-relaxed mb-6">
                AIA Policy is active.
              </p>
              <button className="w-full py-3 bg-white/10 text-white font-black rounded-lg hover:bg-white/20 transition-all uppercase tracking-widest text-[9px] border border-white/10">
                Update Policy
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
