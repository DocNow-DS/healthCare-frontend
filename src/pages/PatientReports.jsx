import { useEffect, useState } from 'react';
import { API } from '../config/api';
import { DocumentTextIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function PatientReports() {
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState('');
  const [reports, setReports] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);

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
    } catch (e) {
      setWarning(e?.message || 'Unable to load reports');
      setReports([]);
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const allItems = [...reports, ...prescriptions];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#182C61]">Medical Reports</h1>
          <p className="text-[#808e9b] mt-1 font-bold">Reports and prescriptions from backend</p>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="px-4 py-2 bg-[#182C61] text-white rounded-xl font-black text-sm hover:bg-[#182C61]/85"
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
                  <DocumentTextIcon className="h-5 w-5 text-[#182C61]" />
                  <p className="text-sm font-black text-[#182C61]">{item.title || item.name || 'Medical Document'}</p>
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
