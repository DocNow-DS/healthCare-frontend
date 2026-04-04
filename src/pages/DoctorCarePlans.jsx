import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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

const parseRequestedTab = (tabValue) => {
  const normalized = String(tabValue || '').trim().toLowerCase();
  if (normalized === 'history') {
    return normalized;
  }
  return 'create';
};

const getPlanTimelineText = (plan) => {
  const appointmentDate = plan?.appointmentDate || plan?.appointmentAt || plan?.appointmentTime || plan?.createdAt;
  if (!appointmentDate) return 'No appointment time';
  const parsed = new Date(appointmentDate);
  if (Number.isNaN(parsed.getTime())) return String(appointmentDate);
  return parsed.toLocaleString();
};

const buildPatientDetailsFromNavigation = (navigationState, fallbackPatientId) => {
  const source = navigationState?.patientDetails || {};
  const id =
    source?._id || source?.id || source?.patientId || source?.userId || (fallbackPatientId ? String(fallbackPatientId) : '');

  return {
    id: String(id || ''),
    name: String(source?.name || source?.fullName || source?.username || ''),
    email: String(source?.email || ''),
    phone: String(source?.phone || ''),
    age: source?.age != null ? String(source.age) : '',
    gender: String(source?.gender || ''),
  };
};

const mapPatientProfile = (profile, fallbackPatientId) => ({
  id: String(profile?._id || profile?.id || profile?.userId || fallbackPatientId || ''),
  name: String(profile?.name || profile?.username || ''),
  email: String(profile?.email || ''),
  phone: String(profile?.phone || ''),
  age: profile?.age != null ? String(profile.age) : '',
  gender: String(profile?.gender || ''),
});

const resolveCanonicalPatientId = (profile, fallbackPatientId) =>
  String(profile?._id || profile?.id || profile?.userId || fallbackPatientId || '').trim();

export default function DoctorCarePlans() {
  const navigate = useNavigate();
  const location = useLocation();
  const { patientId: routePatientId } = useParams();
  const [searchParams] = useSearchParams();
  const initialPatientId = routePatientId || searchParams.get('patientId') || '';
  const initialAppointmentId = searchParams.get('appointmentId') || '';
  const initialTab = parseRequestedTab(searchParams.get('tab'));
  const authUser = useMemo(() => readAuthUser(), []);
  const doctorId = useMemo(() => authUser?.id || authUser?.userId || authUser?.username || '', [authUser]);
  const [activeTab, setActiveTab] = useState(initialTab);

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
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
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

  const [patientId, setPatientId] = useState(initialPatientId);
  const [appointmentId, setAppointmentId] = useState(initialAppointmentId);
  const [patientDetails, setPatientDetails] = useState(() =>
    buildPatientDetailsFromNavigation(location.state, initialPatientId),
  );
  const [patientDetailsLoading, setPatientDetailsLoading] = useState(false);
  const [patientDetailsError, setPatientDetailsError] = useState('');
  const [consultationNotes, setConsultationNotes] = useState('');
  const [allergiesText, setAllergiesText] = useState('');
  const [nextVisitDays, setNextVisitDays] = useState('');
  const [medicines, setMedicines] = useState([emptyMedicine()]);
  const [preVisitServices, setPreVisitServices] = useState([emptyService()]);

  const [historyPatientId, setHistoryPatientId] = useState(initialPatientId);
  const [expandedPlanId, setExpandedPlanId] = useState('');
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

  useEffect(() => {
    setActiveTab(parseRequestedTab(searchParams.get('tab')));
    const resolvedPatientId = routePatientId || searchParams.get('patientId') || '';
    setPatientId(resolvedPatientId);
    setAppointmentId(searchParams.get('appointmentId') || '');
    setHistoryPatientId(resolvedPatientId);
    setPatientDetails(buildPatientDetailsFromNavigation(location.state, resolvedPatientId));
  }, [location.state, routePatientId, searchParams]);

  useEffect(() => {
    const normalizedPatientId = String(patientId || '').trim();
    if (!normalizedPatientId) {
      setPatientDetails((prev) => ({ ...prev, id: '', name: '', email: '', phone: '', age: '', gender: '' }));
      setPatientDetailsError('');
      return;
    }

    setPatientDetails((prev) => ({ ...prev, id: normalizedPatientId }));

    const hasExistingCoreDetails =
      String(patientDetails?.name || '').trim() || String(patientDetails?.email || '').trim() || String(patientDetails?.phone || '').trim();
    if (hasExistingCoreDetails) {
      return;
    }

    let cancelled = false;
    const loadPatientDetails = async () => {
      setPatientDetailsLoading(true);
      setPatientDetailsError('');
      try {
        const looksNumericPatientId = /^\d+$/.test(normalizedPatientId);
        let profile = null;

        if (looksNumericPatientId) {
          profile = await API.patients.getById(normalizedPatientId);
        } else {
          const allPatients = await API.patients.getAll();
          const normalizedLookup = normalizedPatientId.toLowerCase();
          const safePatients = Array.isArray(allPatients) ? allPatients : [];
          profile =
            safePatients.find((item) => {
              const values = [item?._id, item?.id, item?.userId, item?.username, item?.email];
              return values.some((value) => String(value || '').trim().toLowerCase() === normalizedLookup);
            }) || null;
        }

        if (cancelled) return;
        if (profile) {
          const canonicalPatientId = resolveCanonicalPatientId(profile, normalizedPatientId);
          setPatientDetails(mapPatientProfile(profile, canonicalPatientId));
          if (canonicalPatientId && canonicalPatientId !== normalizedPatientId) {
            setPatientId(canonicalPatientId);
            setHistoryPatientId(canonicalPatientId);
          }
          setPatientDetailsError('');
        } else {
          setPatientDetails((prev) => ({ ...prev, id: normalizedPatientId }));
          setPatientDetailsError('Patient profile not found for auto-fill. You can still create the care plan using Patient ID.');
        }
      } catch (e) {
        if (cancelled) return;
        setPatientDetails((prev) => ({ ...prev, id: normalizedPatientId }));
        setPatientDetailsError(e?.payload?.message || e?.message || 'Unable to load patient details');
      } finally {
        if (!cancelled) {
          setPatientDetailsLoading(false);
        }
      }
    };

    loadPatientDetails();
    return () => {
      cancelled = true;
    };
  }, [patientId, patientDetails?.email, patientDetails?.name, patientDetails?.phone]);

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
          <p className="text-[#808e9b] mt-1 font-bold">
            {patientDetails?.name
              ? `${patientDetails.name} (${patientId || 'N/A'})`
              : `Patient ID: ${patientId || 'N/A'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard/patients')}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-black text-sm hover:bg-slate-50"
          >
            Back to Patients
          </button>
          <button
            type="button"
            onClick={loadPlans}
            className="px-4 py-2 bg-[#182C61] text-white rounded-xl font-black text-sm hover:bg-[#182C61]/85"
          >
            Refresh
          </button>
        </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
            History
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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsServiceModalOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-[#182C61] text-[#182C61] text-xs font-black hover:bg-[#182C61]/5"
            >
              View Services
            </button>
            <button
              type="button"
              onClick={loadServiceCatalog}
              className="px-3 py-1.5 rounded-lg bg-[#182C61] text-white text-xs font-black hover:bg-[#182C61]/85"
            >
              Refresh Services
            </button>
          </div>
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
            <p className="text-xs font-bold text-[#808e9b]">{serviceCatalog.length} services available. Click "View Services" to manage them.</p>
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

      {isServiceModalOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-4 sm:p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl border-2 border-slate-100 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-[#182C61]">Pre-Visit Services Catalog</h3>
              <button
                type="button"
                onClick={() => {
                  cancelEditingServiceCatalog();
                  setIsServiceModalOpen(false);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-black text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            {serviceCatalogLoading ? (
              <p className="text-sm font-bold text-[#808e9b]">Loading services...</p>
            ) : serviceCatalog.length === 0 ? (
              <p className="text-sm font-bold text-[#808e9b]">No services found.</p>
            ) : (
              <div className="space-y-3">
                {serviceCatalog.map((item) => (
                  <div key={item.id || item.serviceName} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    {editingServiceId === item.id ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
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
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={updatingServiceCatalog}
                            onClick={() => handleUpdateServiceCatalog(item.id)}
                            className="px-3 py-1.5 rounded-lg bg-[#eb2f06] text-white text-xs font-black disabled:opacity-60"
                          >
                            {updatingServiceCatalog ? 'Saving...' : 'Save Update'}
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
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-[#182C61]">{item.serviceName || 'Unnamed service'}</p>
                          <p className="text-xs font-bold text-[#808e9b] mt-1">
                            LKR {formatCurrency(item.price)} | {item.notes || 'No notes'}
                          </p>
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
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <h3 className="text-sm font-black text-[#182C61] uppercase tracking-wider mb-2">Patient Details</h3>
            {patientDetailsError ? (
              <p className="text-xs font-bold text-amber-700 mb-2">{patientDetailsError}</p>
            ) : null}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-700"
                placeholder="Patient name"
                value={patientDetails.name || ''}
                readOnly
              />
              <input
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-700"
                placeholder="Patient email"
                value={patientDetails.email || ''}
                readOnly
              />
              <input
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-700"
                placeholder="Patient phone"
                value={patientDetails.phone || ''}
                readOnly
              />
              <input
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-700"
                placeholder="Patient age"
                value={patientDetails.age || ''}
                readOnly
              />
              <input
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-700"
                placeholder="Patient gender"
                value={patientDetails.gender || ''}
                readOnly
              />
              <div className="flex items-center px-3 py-2 rounded-lg border border-slate-200 bg-white">
                <span className="text-xs font-bold text-[#808e9b]">
                  {patientDetailsLoading ? 'Loading details...' : 'Details auto-filled from selected appointment'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="w-full px-4 py-2.5 bg-slate-50 border-2 border-transparent rounded-xl focus:outline-none focus:border-[#182C61]"
              placeholder="Patient ID"
              value={patientId}
              readOnly
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
                  list={`dosage-options-${index}`}
                  placeholder="Dosage (select or type custom)"
                  value={medicine.dosage}
                  onChange={(e) => updateMedicine(index, 'dosage', e.target.value)}
                />
                <datalist id={`dosage-options-${index}`}>
                  <option value="250mg" />
                  <option value="500mg" />
                  <option value="750mg" />
                  <option value="1000mg (1g)" />
                  <option value="250mg/5ml" />
                  <option value="500mg/5ml" />
                  <option value="100mg/ml" />
                  <option value="2mg" />
                  <option value="5mg" />
                  <option value="10mg" />
                  <option value="20mg" />
                  <option value="25mg" />
                  <option value="50mg" />
                  <option value="100mg" />
                </datalist>
                <input
                  className="px-3 py-2 rounded-lg border border-slate-200"
                  list={`frequency-options-${index}`}
                  placeholder="Frequency (select or type custom)"
                  value={medicine.frequency}
                  onChange={(e) => updateMedicine(index, 'frequency', e.target.value)}
                />
                <datalist id={`frequency-options-${index}`}>
                  <option value="Once daily" />
                  <option value="Twice daily (BD)" />
                  <option value="Three times daily (TDS)" />
                  <option value="Four times daily (QID)" />
                  <option value="Every 6 hours" />
                  <option value="Every 8 hours" />
                  <option value="Every 12 hours" />
                  <option value="Before meals" />
                  <option value="After meals" />
                  <option value="With meals" />
                  <option value="At bedtime" />
                  <option value="As needed" />
                  <option value="Once weekly" />
                  <option value="Twice weekly" />
                </datalist>
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
          <h2 className="text-lg font-black text-[#182C61]">Appointment History</h2>
          <p className="text-sm font-bold text-[#808e9b]">Click an appointment card to view medicines and services</p>
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
                  <button
                    type="button"
                    onClick={() => setExpandedPlanId((prev) => (prev === String(plan.id) ? '' : String(plan.id)))}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <ClipboardDocumentListIcon className="h-5 w-5 text-[#182C61]" />
                        <p className="text-sm font-black text-[#182C61]">Appointment: {plan.appointmentId || 'N/A'}</p>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-[#182C61]/10 text-[#182C61]">
                        {plan.status || 'ACTIVE'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#808e9b] mt-2">Date &amp; Time: {getPlanTimelineText(plan)}</p>
                    <p className="text-xs font-black text-[#182C61] mt-1">Total Bill: LKR {formatCurrency(plan.totalBill)}</p>
                  </button>

                  {expandedPlanId === String(plan.id) ? (
                    <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
                      <p className="text-xs font-bold text-[#1e272e] whitespace-pre-wrap">{plan.consultationNotes || 'No notes'}</p>

                      <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-[#182C61] mb-2">
                          Medicines ({Array.isArray(plan.medicines) ? plan.medicines.length : 0})
                        </h4>
                        {!Array.isArray(plan.medicines) || plan.medicines.length === 0 ? (
                          <p className="text-xs font-bold text-[#808e9b]">No medicines for this appointment.</p>
                        ) : (
                          <div className="space-y-2">
                            {plan.medicines.map((medicine, index) => (
                              <div key={`${plan.id}-med-${index}`} className="p-2 rounded-lg bg-white border border-slate-200">
                                <p className="text-sm font-black text-[#182C61]">{medicine.medicineName || 'Medicine'}</p>
                                <p className="text-xs font-bold text-[#808e9b] mt-1">
                                  {medicine.dosage || 'N/A'} | {medicine.frequency || 'N/A'} | {medicine.durationDays || 'N/A'} days
                                </p>
                                <p className="text-xs font-semibold text-[#1e272e] mt-1">{medicine.instructions || 'No instructions'}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-[#182C61] mb-2">
                          Pre-Visit Services ({Array.isArray(plan.preVisitServices) ? plan.preVisitServices.length : 0})
                        </h4>
                        {!Array.isArray(plan.preVisitServices) || plan.preVisitServices.length === 0 ? (
                          <p className="text-xs font-bold text-[#808e9b]">No pre-visit services for this appointment.</p>
                        ) : (
                          <div className="space-y-2">
                            {plan.preVisitServices.map((service, index) => (
                              <div key={`${plan.id}-service-${index}`} className="p-2 rounded-lg bg-white border border-slate-200">
                                <p className="text-sm font-black text-[#182C61]">{service.serviceName || 'Service'}</p>
                                <p className="text-xs font-bold text-[#808e9b] mt-1">LKR {formatCurrency(service.price)}</p>
                                <p className="text-xs font-semibold text-[#1e272e] mt-1">{service.notes || 'No notes'}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
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
