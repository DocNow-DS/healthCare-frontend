import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API } from '../config/api';
import { ClipboardDocumentListIcon, PlusIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const readAuthUser = () => {
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const emptyMedicine = () => ({
  medicineName: '',
  price: '',
  dosage: '',
  frequency: '',
  durationDays: '',
  instructions: '',
});

const emptyService = () => ({
  serviceName: '',
  price: '',
  notes: '',
});

const parsePrice = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
};

const formatCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '0.00';
  return amount.toFixed(2);
};

export default function DoctorCarePlans() {
  const [searchParams] = useSearchParams();
  const authUser = useMemo(() => readAuthUser(), []);
  const doctorId = useMemo(() => authUser?.id || authUser?.userId || authUser?.username || '', [authUser]);
  const [activeTab, setActiveTab] = useState('create');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [plans, setPlans] = useState([]);
  const [medicineCatalog, setMedicineCatalog] = useState([]);
  const [medicineCatalogLoading, setMedicineCatalogLoading] = useState(false);
  const [medicineCatalogError, setMedicineCatalogError] = useState('');
  const [serviceCatalog, setServiceCatalog] = useState([]);
  const [serviceCatalogLoading, setServiceCatalogLoading] = useState(false);
  const [serviceCatalogError, setServiceCatalogError] = useState('');
  const [addingMedicine, setAddingMedicine] = useState(false);
  const [addingServiceCatalog, setAddingServiceCatalog] = useState(false);
  const [isMedicineModalOpen, setIsMedicineModalOpen] = useState(false);
  const [editingMedicineId, setEditingMedicineId] = useState('');
  const [updatingMedicine, setUpdatingMedicine] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState('');
  const [updatingServiceCatalog, setUpdatingServiceCatalog] = useState(false);
  const [editMedicineForm, setEditMedicineForm] = useState({
    name: '',
    price: '',
    form: '',
    strength: '',
    notes: '',
  });
  const [newMedicine, setNewMedicine] = useState({
    name: '',
    price: '',
    form: '',
    strength: '',
    notes: '',
  });
  const [newServiceCatalogItem, setNewServiceCatalogItem] = useState({
    serviceName: '',
    price: '',
    notes: '',
  });
  const [editServiceCatalogForm, setEditServiceCatalogForm] = useState({
    serviceName: '',
    price: '',
    notes: '',
  });

  const [patientId, setPatientId] = useState(searchParams.get('patientId') || '');
  const [appointmentId, setAppointmentId] = useState(searchParams.get('appointmentId') || '');
  const [consultationNotes, setConsultationNotes] = useState('');
  const [allergiesText, setAllergiesText] = useState('');
  const [nextVisitDays, setNextVisitDays] = useState('');
  const [medicines, setMedicines] = useState([emptyMedicine()]);
  const [preVisitServices, setPreVisitServices] = useState([emptyService()]);

  const [historyPatientId, setHistoryPatientId] = useState(searchParams.get('patientId') || '');
  const [consultationSessions, setConsultationSessions] = useState([]);
  const [consultationLoading, setConsultationLoading] = useState(false);
  const [consultationError, setConsultationError] = useState('');

  const sortPlans = (list) => {
    const copy = Array.isArray(list) ? [...list] : [];
    copy.sort((a, b) => {
      const aTime = new Date(a?.createdAt || 0).getTime();
      const bTime = new Date(b?.createdAt || 0).getTime();
      return bTime - aTime;
    });
    return copy;
  };

  const loadPlans = async () => {
    if (!doctorId) return;
    setLoading(true);
    setError('');
    try {
      const list = historyPatientId
        ? await API.carePlans.getByDoctorAndPatient(doctorId, historyPatientId)
        : await API.carePlans.getByDoctor(doctorId);
      setPlans(sortPlans(list));
    } catch (e) {
      setPlans([]);
      setError(e?.payload?.message || e?.message || 'Unable to load care plans');
    } finally {
      setLoading(false);
    }
  };

  const loadMedicineCatalog = async () => {
    setMedicineCatalogLoading(true);
    setMedicineCatalogError('');
    try {
      const list = await API.medicines.getAll();
      setMedicineCatalog(Array.isArray(list) ? list : []);
    } catch (e) {
      setMedicineCatalog([]);
      setMedicineCatalogError(e?.payload?.message || e?.message || 'Unable to load medicine catalog');
    } finally {
      setMedicineCatalogLoading(false);
    }
  };

  const loadServiceCatalog = async () => {
    setServiceCatalogLoading(true);
    setServiceCatalogError('');
    try {
      const list = await API.preVisitServices.getAll();
      setServiceCatalog(Array.isArray(list) ? list : []);
    } catch (e) {
      setServiceCatalog([]);
      setServiceCatalogError(e?.payload?.message || e?.message || 'Unable to load pre-visit service catalog');
    } finally {
      setServiceCatalogLoading(false);
    }
  };

  const loadConsultationSessions = async () => {
    if (!doctorId) return;
    setConsultationLoading(true);
    setConsultationError('');
    try {
      const list = await API.telemedicine.listForDoctor(doctorId);
      const sessions = Array.isArray(list) ? list : [];
      const filtered = historyPatientId
        ? sessions.filter((session) => String(session?.patientId || '') === String(historyPatientId))
        : sessions;
      setConsultationSessions(sortPlans(filtered));
    } catch (e) {
      setConsultationSessions([]);
      setConsultationError(e?.payload?.message || e?.message || 'Unable to load consultation session history');
    } finally {
      setConsultationLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId, historyPatientId]);

  useEffect(() => {
    loadConsultationSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId, historyPatientId]);

  useEffect(() => {
    loadMedicineCatalog();
    loadServiceCatalog();
  }, []);

  const medicineCatalogByName = useMemo(() => {
    const map = new Map();
    medicineCatalog.forEach((item) => {
      const key = String(item?.name || '').trim().toLowerCase();
      if (key) map.set(key, item);
    });
    return map;
  }, [medicineCatalog]);

  const totalMedicineCost = useMemo(() => {
    return medicines.reduce((sum, medicine) => sum + parsePrice(medicine.price), 0);
  }, [medicines]);

  const serviceCatalogByName = useMemo(() => {
    const map = new Map();
    serviceCatalog.forEach((item) => {
      const key = String(item?.serviceName || '').trim().toLowerCase();
      if (key) map.set(key, item);
    });
    return map;
  }, [serviceCatalog]);

  const totalServiceCost = useMemo(() => {
    return preVisitServices.reduce((sum, service) => sum + parsePrice(service.price), 0);
  }, [preVisitServices]);

  const grandTotalCost = useMemo(() => totalMedicineCost + totalServiceCost, [totalMedicineCost, totalServiceCost]);

  const updateMedicine = (index, key, value) => {
    setMedicines((prev) => prev.map((m, i) => (i === index ? { ...m, [key]: value } : m)));
  };

  const updateMedicineName = (index, medicineName) => {
    const matched = medicineCatalogByName.get(String(medicineName || '').trim().toLowerCase());
    setMedicines((prev) =>
      prev.map((m, i) =>
        i === index
          ? {
              ...m,
              medicineName,
              price: matched?.price != null ? String(matched.price) : m.price,
            }
          : m,
      ),
    );
  };

  const updateService = (index, key, value) => {
    setPreVisitServices((prev) => prev.map((s, i) => (i === index ? { ...s, [key]: value } : s)));
  };

  const updateServiceName = (index, serviceName) => {
    const matched = serviceCatalogByName.get(String(serviceName || '').trim().toLowerCase());
    setPreVisitServices((prev) =>
      prev.map((s, i) =>
        i === index
          ? {
              ...s,
              serviceName,
              price: matched?.price != null ? String(matched.price) : s.price,
            }
          : s,
      ),
    );
  };

  const addMedicine = () => setMedicines((prev) => [...prev, emptyMedicine()]);
  const removeMedicine = (index) => setMedicines((prev) => prev.filter((_, i) => i !== index));

  const addService = () => setPreVisitServices((prev) => [...prev, emptyService()]);
  const removeService = (index) => setPreVisitServices((prev) => prev.filter((_, i) => i !== index));

  const resetForm = () => {
    setConsultationNotes('');
    setAllergiesText('');
    setNextVisitDays('');
    setMedicines([emptyMedicine()]);
    setPreVisitServices([emptyService()]);
  };

  const handleAddMedicineToCatalog = async (e) => {
    e.preventDefault();
    if (!newMedicine.name.trim()) {
      setMedicineCatalogError('Medicine name is required');
      return;
    }
    if (!newMedicine.price || parsePrice(newMedicine.price) <= 0) {
      setMedicineCatalogError('Medicine price is required and must be greater than 0');
      return;
    }

    setAddingMedicine(true);
    setMedicineCatalogError('');
    try {
      await API.medicines.create({
        name: newMedicine.name.trim(),
        price: parsePrice(newMedicine.price),
        form: newMedicine.form.trim(),
        strength: newMedicine.strength.trim(),
        notes: newMedicine.notes.trim(),
        active: true,
      });
      setNewMedicine({ name: '', price: '', form: '', strength: '', notes: '' });
      await loadMedicineCatalog();
      setSuccess('Medicine added to catalog.');
    } catch (e2) {
      setMedicineCatalogError(e2?.payload?.message || e2?.message || 'Failed to add medicine');
    } finally {
      setAddingMedicine(false);
    }
  };

  const startEditingMedicine = (medicine) => {
    setEditingMedicineId(medicine.id || '');
    setEditMedicineForm({
      name: medicine.name || '',
      price: medicine.price != null ? String(medicine.price) : '',
      form: medicine.form || '',
      strength: medicine.strength || '',
      notes: medicine.notes || '',
    });
  };

  const cancelEditingMedicine = () => {
    setEditingMedicineId('');
    setEditMedicineForm({ name: '', price: '', form: '', strength: '', notes: '' });
  };

  const handleUpdateMedicine = async (medicineId) => {
    if (!medicineId) return;
    if (!editMedicineForm.name.trim()) {
      setMedicineCatalogError('Medicine name is required');
      return;
    }

    setUpdatingMedicine(true);
    setMedicineCatalogError('');
    try {
      await API.medicines.update(medicineId, {
        name: editMedicineForm.name.trim(),
        price: parsePrice(editMedicineForm.price),
        form: editMedicineForm.form.trim(),
        strength: editMedicineForm.strength.trim(),
        notes: editMedicineForm.notes.trim(),
      });
      await loadMedicineCatalog();
      setSuccess('Medicine updated successfully.');
      cancelEditingMedicine();
    } catch (err) {
      setMedicineCatalogError(err?.payload?.message || err?.message || 'Failed to update medicine');
    } finally {
      setUpdatingMedicine(false);
    }
  };

  const handleAddServiceToCatalog = async (e) => {
    e.preventDefault();
    if (!newServiceCatalogItem.serviceName.trim()) {
      setServiceCatalogError('Service name is required');
      return;
    }
    if (!newServiceCatalogItem.price || parsePrice(newServiceCatalogItem.price) <= 0) {
      setServiceCatalogError('Service price is required and must be greater than 0');
      return;
    }

    setAddingServiceCatalog(true);
    setServiceCatalogError('');
    try {
      await API.preVisitServices.create({
        serviceName: newServiceCatalogItem.serviceName.trim(),
        price: parsePrice(newServiceCatalogItem.price),
        notes: newServiceCatalogItem.notes.trim(),
        active: true,
      });
      setNewServiceCatalogItem({ serviceName: '', price: '', notes: '' });
      await loadServiceCatalog();
      setSuccess('Pre-visit service added to catalog.');
    } catch (e2) {
      setServiceCatalogError(e2?.payload?.message || e2?.message || 'Failed to add pre-visit service');
    } finally {
      setAddingServiceCatalog(false);
    }
  };

  const startEditingServiceCatalog = (service) => {
    setEditingServiceId(service.id || '');
    setEditServiceCatalogForm({
      serviceName: service.serviceName || '',
      price: service.price != null ? String(service.price) : '',
      notes: service.notes || '',
    });
  };

  const cancelEditingServiceCatalog = () => {
    setEditingServiceId('');
    setEditServiceCatalogForm({ serviceName: '', price: '', notes: '' });
  };

  const handleUpdateServiceCatalog = async (serviceId) => {
    if (!serviceId) return;
    if (!editServiceCatalogForm.serviceName.trim()) {
      setServiceCatalogError('Service name is required');
      return;
    }

    setUpdatingServiceCatalog(true);
    setServiceCatalogError('');
    try {
      await API.preVisitServices.update(serviceId, {
        serviceName: editServiceCatalogForm.serviceName.trim(),
        price: parsePrice(editServiceCatalogForm.price),
        notes: editServiceCatalogForm.notes.trim(),
      });
      await loadServiceCatalog();
      setSuccess('Pre-visit service updated successfully.');
      cancelEditingServiceCatalog();
    } catch (err) {
      setServiceCatalogError(err?.payload?.message || err?.message || 'Failed to update pre-visit service');
    } finally {
      setUpdatingServiceCatalog(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!doctorId) {
      setError('Doctor identity not found. Please login again.');
      return;
    }
    if (!patientId.trim()) {
      setError('Patient ID is required');
      return;
    }

    const parsedNextVisit = nextVisitDays ? Number(nextVisitDays) : null;
    const payload = {
      doctorId,
      patientId: patientId.trim(),
      appointmentId: appointmentId.trim() || null,
      consultationNotes: consultationNotes.trim(),
      allergies: allergiesText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      nextVisitDays: Number.isFinite(parsedNextVisit) && parsedNextVisit > 0 ? parsedNextVisit : null,
      medicines: medicines
        .filter((m) => m.medicineName.trim())
        .map((m) => ({
          medicineName: m.medicineName.trim(),
          price: parsePrice(m.price),
          dosage: m.dosage.trim(),
          frequency: m.frequency.trim(),
          durationDays: m.durationDays ? Number(m.durationDays) : null,
          instructions: m.instructions.trim(),
        })),
      preVisitServices: preVisitServices
        .filter((s) => s.serviceName.trim())
        .map((s) => ({
          serviceName: s.serviceName.trim(),
          price: parsePrice(s.price),
          notes: s.notes.trim(),
        })),
    };

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await API.carePlans.create(payload);
      setSuccess('Care plan created successfully.');
      if (!historyPatientId) {
        setHistoryPatientId(patientId.trim());
      }
      resetForm();
      await loadPlans();
    } catch (e2) {
      setError(e2?.payload?.message || e2?.message || 'Failed to create care plan');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#182C61]">Patient Care Plans</h1>
          <p className="text-[#808e9b] mt-1 font-bold">Create post-appointment care plans and track your plan history</p>
        </div>
        <button
          type="button"
          onClick={loadPlans}
          className="px-4 py-2 bg-[#182C61] text-white rounded-xl font-black text-sm hover:bg-[#182C61]/85"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
          <span className="text-sm font-semibold text-amber-800">{error}</span>
        </div>
      ) : null}

      {success ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm font-semibold text-emerald-800">
          {success}
        </div>
      ) : null}

      <div className="bg-white border-2 border-slate-50 rounded-2xl p-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2.5 rounded-xl text-sm font-black transition ${
              activeTab === 'create' ? 'bg-[#182C61] text-white' : 'bg-slate-50 text-[#182C61] hover:bg-slate-100'
            }`}
          >
            Create Care Plan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 rounded-xl text-sm font-black transition ${
              activeTab === 'history' ? 'bg-[#182C61] text-white' : 'bg-slate-50 text-[#182C61] hover:bg-slate-100'
            }`}
          >
            Maintain History
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('medicine-services')}
            className={`px-4 py-2.5 rounded-xl text-sm font-black transition ${
              activeTab === 'medicine-services' ? 'bg-[#182C61] text-white' : 'bg-slate-50 text-[#182C61] hover:bg-slate-100'
            }`}
          >
            Medicine &amp; Services
          </button>
        </div>
      </div>

      {activeTab === 'medicine-services' ? (
      <>
      <div className="bg-white border-2 border-slate-50 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-black text-[#182C61]">Medicine Catalog</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsMedicineModalOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-[#182C61] text-[#182C61] text-xs font-black hover:bg-[#182C61]/5"
            >
              View Medicines
            </button>
            <button
              type="button"
              onClick={loadMedicineCatalog}
              className="px-3 py-1.5 rounded-lg bg-[#182C61] text-white text-xs font-black hover:bg-[#182C61]/85"
            >
              Refresh Catalog
            </button>
          </div>
        </div>

        {medicineCatalogError ? (
          <p className="text-xs font-bold text-amber-700">{medicineCatalogError}</p>
        ) : null}

        <form onSubmit={handleAddMedicineToCatalog} className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <input
            className="px-3 py-2 rounded-lg border border-slate-200"
            placeholder="Medicine name"
            value={newMedicine.name}
            onChange={(e) => setNewMedicine((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <input
            type="number"
            min="0"
            step="0.01"
            className="px-3 py-2 rounded-lg border border-slate-200"
            placeholder="Price (LKR)"
            value={newMedicine.price}
            onChange={(e) => setNewMedicine((prev) => ({ ...prev, price: e.target.value }))}
            required
          />
          <input
            className="px-3 py-2 rounded-lg border border-slate-200"
            placeholder="Form (tablet, syrup)"
            value={newMedicine.form}
            onChange={(e) => setNewMedicine((prev) => ({ ...prev, form: e.target.value }))}
          />
          <input
            className="px-3 py-2 rounded-lg border border-slate-200"
            placeholder="Strength (e.g. 500mg)"
            value={newMedicine.strength}
            onChange={(e) => setNewMedicine((prev) => ({ ...prev, strength: e.target.value }))}
          />
          <button
            type="submit"
            disabled={addingMedicine}
            className="px-3 py-2 rounded-lg bg-[#eb2f06] text-white text-xs font-black disabled:opacity-60"
          >
            {addingMedicine ? 'Adding...' : 'Add Medicine'}
          </button>
          <input
            className="md:col-span-5 px-3 py-2 rounded-lg border border-slate-200"
            placeholder="Notes (optional)"
            value={newMedicine.notes}
            onChange={(e) => setNewMedicine((prev) => ({ ...prev, notes: e.target.value }))}
          />
        </form>

        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
          {medicineCatalogLoading ? (
            <p className="text-xs font-bold text-[#808e9b]">Loading medicine catalog...</p>
          ) : medicineCatalog.length === 0 ? (
            <p className="text-xs font-bold text-[#808e9b]">No medicines in catalog yet.</p>
          ) : (
            <p className="text-xs font-bold text-[#808e9b]">{medicineCatalog.length} medicines available for care-plan selection.</p>
          )}
        </div>
      </div>

      <div className="bg-white border-2 border-slate-50 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-black text-[#182C61]">Pre-Visit Service Catalog</h2>
          <button
            type="button"
            onClick={loadServiceCatalog}
            className="px-3 py-1.5 rounded-lg bg-[#182C61] text-white text-xs font-black hover:bg-[#182C61]/85"
          >
            Refresh Services
          </button>
        </div>

        {serviceCatalogError ? (
          <p className="text-xs font-bold text-amber-700">{serviceCatalogError}</p>
        ) : null}

        <form onSubmit={handleAddServiceToCatalog} className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            className="px-3 py-2 rounded-lg border border-slate-200"
            placeholder="Service name"
            value={newServiceCatalogItem.serviceName}
            onChange={(e) => setNewServiceCatalogItem((prev) => ({ ...prev, serviceName: e.target.value }))}
            required
          />
          <input
            type="number"
            min="0"
            step="0.01"
            className="px-3 py-2 rounded-lg border border-slate-200"
            placeholder="Price (LKR)"
            value={newServiceCatalogItem.price}
            onChange={(e) => setNewServiceCatalogItem((prev) => ({ ...prev, price: e.target.value }))}
            required
          />
          <input
            className="px-3 py-2 rounded-lg border border-slate-200"
            placeholder="Notes (optional)"
            value={newServiceCatalogItem.notes}
            onChange={(e) => setNewServiceCatalogItem((prev) => ({ ...prev, notes: e.target.value }))}
          />
          <button
            type="submit"
            disabled={addingServiceCatalog}
            className="px-3 py-2 rounded-lg bg-[#eb2f06] text-white text-xs font-black disabled:opacity-60"
          >
            {addingServiceCatalog ? 'Adding...' : 'Add Service'}
          </button>
        </form>

        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
          {serviceCatalogLoading ? (
            <p className="text-xs font-bold text-[#808e9b]">Loading pre-visit services...</p>
          ) : serviceCatalog.length === 0 ? (
            <p className="text-xs font-bold text-[#808e9b]">No pre-visit services in catalog yet.</p>
          ) : (
            <div className="space-y-2">
              {serviceCatalog.map((item) => (
                <div key={item.id || item.serviceName} className="p-3 rounded-lg bg-white border border-slate-100">
                  {editingServiceId === item.id ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <input
                        className="px-3 py-2 rounded-lg border border-slate-200"
                        placeholder="Service name"
                        value={editServiceCatalogForm.serviceName}
                        onChange={(e) => setEditServiceCatalogForm((prev) => ({ ...prev, serviceName: e.target.value }))}
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="px-3 py-2 rounded-lg border border-slate-200"
                        placeholder="Price (LKR)"
                        value={editServiceCatalogForm.price}
                        onChange={(e) => setEditServiceCatalogForm((prev) => ({ ...prev, price: e.target.value }))}
                      />
                      <input
                        className="px-3 py-2 rounded-lg border border-slate-200"
                        placeholder="Notes"
                        value={editServiceCatalogForm.notes}
                        onChange={(e) => setEditServiceCatalogForm((prev) => ({ ...prev, notes: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={updatingServiceCatalog}
                          onClick={() => handleUpdateServiceCatalog(item.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#eb2f06] text-white text-xs font-black disabled:opacity-60"
                        >
                          {updatingServiceCatalog ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditingServiceCatalog}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-black text-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-[#182C61]">{item.serviceName || 'Unnamed service'}</p>
                        <p className="text-xs font-bold text-[#808e9b] mt-1">LKR {formatCurrency(item.price)} | {item.notes || 'No notes'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => startEditingServiceCatalog(item)}
                        className="px-3 py-1.5 rounded-lg border border-[#182C61] text-[#182C61] text-xs font-black hover:bg-[#182C61]/5"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isMedicineModalOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-4 sm:p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl border-2 border-slate-100 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-[#182C61]">Added Medicines</h3>
              <button
                type="button"
                onClick={() => {
                  cancelEditingMedicine();
                  setIsMedicineModalOpen(false);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-black text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            {medicineCatalogLoading ? (
              <p className="text-sm font-bold text-[#808e9b]">Loading medicines...</p>
            ) : medicineCatalog.length === 0 ? (
              <p className="text-sm font-bold text-[#808e9b]">No medicines found.</p>
            ) : (
              <div className="space-y-3">
                {medicineCatalog.map((item) => (
                  <div key={item.id || item.name} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    {editingMedicineId === item.id ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input
                            className="px-3 py-2 rounded-lg border border-slate-200"
                            placeholder="Medicine name"
                            value={editMedicineForm.name}
                            onChange={(e) => setEditMedicineForm((prev) => ({ ...prev, name: e.target.value }))}
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="px-3 py-2 rounded-lg border border-slate-200"
                            placeholder="Price (LKR)"
                            value={editMedicineForm.price}
                            onChange={(e) => setEditMedicineForm((prev) => ({ ...prev, price: e.target.value }))}
                          />
                          <input
                            className="px-3 py-2 rounded-lg border border-slate-200"
                            placeholder="Form"
                            value={editMedicineForm.form}
                            onChange={(e) => setEditMedicineForm((prev) => ({ ...prev, form: e.target.value }))}
                          />
                          <input
                            className="px-3 py-2 rounded-lg border border-slate-200"
                            placeholder="Strength"
                            value={editMedicineForm.strength}
                            onChange={(e) => setEditMedicineForm((prev) => ({ ...prev, strength: e.target.value }))}
                          />
                        </div>
                        <input
                          className="w-full px-3 py-2 rounded-lg border border-slate-200"
                          placeholder="Notes"
                          value={editMedicineForm.notes}
                          onChange={(e) => setEditMedicineForm((prev) => ({ ...prev, notes: e.target.value }))}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={updatingMedicine}
                            onClick={() => handleUpdateMedicine(item.id)}
                            className="px-3 py-1.5 rounded-lg bg-[#eb2f06] text-white text-xs font-black disabled:opacity-60"
                          >
                            {updatingMedicine ? 'Saving...' : 'Save Update'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditingMedicine}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-black text-slate-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-[#182C61]">{item.name || 'Unnamed medicine'}</p>
                          <p className="text-xs font-bold text-[#808e9b] mt-1">
                            LKR {formatCurrency(item.price)} | {item.form || 'No form'} | {item.strength || 'No strength'}
                          </p>
                          <p className="text-xs font-bold text-[#1e272e] mt-1">{item.notes || 'No notes'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => startEditingMedicine(item)}
                          className="px-3 py-1.5 rounded-lg border border-[#182C61] text-[#182C61] text-xs font-black hover:bg-[#182C61]/5"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      </>
      ) : null}

      {activeTab === 'create' ? (
      <div className="bg-white border-2 border-slate-50 rounded-2xl p-5">
        <h2 className="text-lg font-black text-[#182C61] mb-4">Create Care Plan</h2>
        <datalist id="medicine-catalog-options">
          {medicineCatalog.map((item) => (
            <option key={item.id || item.name} value={item.name} />
          ))}
        </datalist>
        <datalist id="service-catalog-options">
          {serviceCatalog.map((item) => (
            <option key={item.id || item.serviceName} value={item.serviceName} />
          ))}
        </datalist>
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="w-full px-4 py-2.5 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:border-[#182C61]"
              placeholder="Patient ID"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              required
            />
            <input
              className="w-full px-4 py-2.5 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:border-[#182C61]"
              placeholder="Appointment ID (optional)"
              value={appointmentId}
              onChange={(e) => setAppointmentId(e.target.value)}
            />
            <input
              type="number"
              min="1"
              className="w-full px-4 py-2.5 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:border-[#182C61]"
              placeholder="Next visit in days"
              value={nextVisitDays}
              onChange={(e) => setNextVisitDays(e.target.value)}
            />
          </div>

          <textarea
            className="w-full px-4 py-2.5 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:border-[#182C61] min-h-[110px]"
            placeholder="Consultation notes"
            value={consultationNotes}
            onChange={(e) => setConsultationNotes(e.target.value)}
            required
          />

          <input
            className="w-full px-4 py-2.5 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:border-[#182C61]"
            placeholder="Allergies (comma separated)"
            value={allergiesText}
            onChange={(e) => setAllergiesText(e.target.value)}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#182C61] uppercase tracking-wider">Medicines</h3>
              <button
                type="button"
                onClick={addMedicine}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#182C61] text-white text-xs font-black"
              >
                <PlusIcon className="h-4 w-4" />
                Add
              </button>
            </div>

            {medicines.map((medicine, index) => (
              <div key={`med-${index}`} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                <input
                  className="px-3 py-2 rounded-lg border border-slate-200"
                  list="medicine-catalog-options"
                  placeholder="Medicine (choose from catalog or type)"
                  value={medicine.medicineName}
                  onChange={(e) => updateMedicineName(index, e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-700"
                  placeholder="Auto price (LKR)"
                  value={medicine.price}
                  readOnly
                />
                <input
                  className="px-3 py-2 rounded-lg border border-slate-200"
                  placeholder="Dosage"
                  value={medicine.dosage}
                  onChange={(e) => updateMedicine(index, 'dosage', e.target.value)}
                />
                <input
                  className="px-3 py-2 rounded-lg border border-slate-200"
                  placeholder="Frequency"
                  value={medicine.frequency}
                  onChange={(e) => updateMedicine(index, 'frequency', e.target.value)}
                />
                <input
                  type="number"
                  min="1"
                  className="px-3 py-2 rounded-lg border border-slate-200"
                  placeholder="Duration days"
                  value={medicine.durationDays}
                  onChange={(e) => updateMedicine(index, 'durationDays', e.target.value)}
                />
                <div className="flex gap-2">
                  <input
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200"
                    placeholder="Instructions"
                    value={medicine.instructions}
                    onChange={(e) => updateMedicine(index, 'instructions', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeMedicine(index)}
                    disabled={medicines.length === 1}
                    className="px-2 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                </div>
                <p className="text-xs font-black text-[#182C61]">
                  Line Cost: LKR {formatCurrency(parsePrice(medicine.price))}
                </p>
                {!medicine.price ? (
                  <p className="text-[11px] font-bold text-amber-700">
                    Price not found in catalog for this medicine name. Select a catalog medicine to auto-fill.
                  </p>
                ) : null}
              </div>
            ))}

            <div className="rounded-xl border border-[#182C61]/20 bg-[#182C61]/5 p-3 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-[#182C61]">Total Medicine Cost</span>
              <span className="text-base font-black text-[#182C61]">LKR {formatCurrency(totalMedicineCost)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#182C61] uppercase tracking-wider">Pre-Visit Services</h3>
              <button
                type="button"
                onClick={addService}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#182C61] text-white text-xs font-black"
              >
                <PlusIcon className="h-4 w-4" />
                Add
              </button>
            </div>

            {preVisitServices.map((service, index) => (
              <div key={`service-${index}`} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  className="px-3 py-2 rounded-lg border border-slate-200"
                  list="service-catalog-options"
                  placeholder="Service name (choose from catalog or type)"
                  value={service.serviceName}
                  onChange={(e) => updateServiceName(index, e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-700"
                  placeholder="Auto price (LKR)"
                  value={service.price}
                  readOnly
                />
                <div className="flex gap-2">
                  <input
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200"
                    placeholder="Notes"
                    value={service.notes}
                    onChange={(e) => updateService(index, 'notes', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeService(index)}
                    disabled={preVisitServices.length === 1}
                    className="px-2 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                </div>
                <p className="text-xs font-black text-[#182C61]">
                  Line Service Cost: LKR {formatCurrency(parsePrice(service.price))}
                </p>
                {!service.price ? (
                  <p className="text-[11px] font-bold text-amber-700">
                    Price not found in service catalog for this service name. Select a catalog service to auto-fill.
                  </p>
                ) : null}
              </div>
            ))}

            <div className="rounded-xl border border-[#182C61]/20 bg-[#182C61]/5 p-3 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-[#182C61]">Total Service Cost</span>
              <span className="text-base font-black text-[#182C61]">LKR {formatCurrency(totalServiceCost)}</span>
            </div>
          </div>

          <div className="rounded-xl border border-[#eb2f06]/20 bg-[#eb2f06]/5 p-3 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-[#eb2f06]">Estimated Grand Total</span>
            <span className="text-lg font-black text-[#eb2f06]">LKR {formatCurrency(grandTotalCost)}</span>
          </div>

          <div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 rounded-xl bg-[#eb2f06] text-white font-black text-sm hover:bg-[#eb2f06]/90 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Create Care Plan'}
            </button>
          </div>
        </form>
      </div>
      ) : null}

      {activeTab === 'history' ? (
      <div className="bg-white border-2 border-slate-50 rounded-2xl p-5 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h2 className="text-lg font-black text-[#182C61]">Maintain History</h2>
          <input
            className="px-4 py-2.5 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:border-[#182C61] max-w-sm"
            placeholder="Filter by patient ID"
            value={historyPatientId}
            onChange={(e) => setHistoryPatientId(e.target.value)}
          />
        </div>

        <div className="rounded-2xl border border-slate-100 p-4">
          <h3 className="text-base font-black text-[#182C61] mb-3">Care Plan History</h3>
          {loading ? (
            <p className="text-sm font-bold text-[#808e9b]">Loading care plans...</p>
          ) : plans.length === 0 ? (
            <p className="text-sm font-bold text-[#808e9b]">No care plans found.</p>
          ) : (
            <div className="space-y-3">
              {plans.map((plan) => (
                <div key={plan.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <ClipboardDocumentListIcon className="h-5 w-5 text-[#182C61]" />
                      <p className="text-sm font-black text-[#182C61]">Patient: {plan.patientId || 'N/A'}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-[#182C61]/10 text-[#182C61]">
                      {plan.status || 'ACTIVE'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#808e9b] mt-2">Appointment: {plan.appointmentId || 'N/A'}</p>
                  <p className="text-xs font-bold text-[#808e9b] mt-1">Created: {formatDate(plan.createdAt)}</p>
                  <p className="text-xs font-black text-[#182C61] mt-1">Total Bill: LKR {formatCurrency(plan.totalBill)}</p>
                  <p className="text-xs font-bold text-[#1e272e] mt-2 whitespace-pre-wrap">{plan.consultationNotes || 'No notes'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 p-4">
          <h3 className="text-base font-black text-[#182C61] mb-3">Consultation Session History</h3>
          {consultationError ? (
            <p className="text-sm font-bold text-amber-700 mb-2">{consultationError}</p>
          ) : null}
          {consultationLoading ? (
            <p className="text-sm font-bold text-[#808e9b]">Loading consultation sessions...</p>
          ) : consultationSessions.length === 0 ? (
            <p className="text-sm font-bold text-[#808e9b]">No consultation sessions found.</p>
          ) : (
            <div className="space-y-3">
              {consultationSessions.map((session) => (
                <div
                  key={session.id || session.consultationId || `${session.patientId}-${session.createdAt}`}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-[#182C61]">Patient: {session.patientId || 'N/A'}</p>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-[#182C61]/10 text-[#182C61]">
                      {session.status || 'N/A'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#808e9b] mt-2">Doctor: {session.doctorId || 'N/A'}</p>
                  <p className="text-xs font-bold text-[#808e9b] mt-1">Started: {formatDate(session.startedAt || session.createdAt)}</p>
                  <p className="text-xs font-bold text-[#808e9b] mt-1">Ended: {formatDate(session.endedAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      ) : null}

    </div>
  );
}
