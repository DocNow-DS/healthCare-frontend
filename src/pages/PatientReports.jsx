import { useEffect, useState } from 'react';
import { API } from '../config/api';
import { DocumentTextIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { getGeneratedBillingReports } from '../utils/billingReports';

export default function PatientReports() {
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState('');
  const [reports, setReports] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [billingReports, setBillingReports] = useState([]);

  const loadData = async () => {
    setLoading(true);
    setWarning('');
    try {
      const [rep, pres] = await Promise.all([
        API.patients.getReports(),
        API.patients.getPrescriptions(),
      ]);
      setReports(Array.isArray(rep) ? rep : []);
      setPrescriptions(Array.isArray(pres) ? pres : []);
      setBillingReports(getGeneratedBillingReports());
    } catch (e) {
      setWarning(e?.message || 'Unable to load reports');
      setReports([]);
      setPrescriptions([]);
      setBillingReports(getGeneratedBillingReports());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const allItems = [...billingReports, ...reports, ...prescriptions];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary-500">Medical Reports</h1>
          <p className="text-[#808e9b] mt-1 font-bold">Reports and prescriptions from backend</p>
        </div>
        <button
          type="button"
          onClick={loadData}
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

      <div className="bg-white border-2 border-slate-50 rounded-2xl p-5">
        {loading ? (
          <p className="text-sm font-bold text-[#808e9b]">Loading reports...</p>
        ) : allItems.length === 0 ? (
          <p className="text-sm font-bold text-[#808e9b]">No reports available.</p>
        ) : (
          <div className="space-y-3">
            {allItems.map((item, index) => (
              <div key={item.id || index} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5 text-primary-500" />
                  <p className="text-sm font-black text-primary-500">{item.title || item.name || 'Medical Document'}</p>
                </div>
                <p className="text-xs font-bold text-[#808e9b] mt-1">{item.description || item.notes || 'No description provided'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
