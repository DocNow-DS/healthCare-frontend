import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../config/api.js';

const MIN_CHECKOUT_LKR = 200;

export default function PaymentCheckout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get consultation details from location state or query params
  const consultationId = location.state?.consultationId || new URLSearchParams(location.search).get('consultationId');
  const amount = Number(location.state?.amount || new URLSearchParams(location.search).get('amount') || 2500);
  const doctorId = location.state?.doctorId || new URLSearchParams(location.search).get('doctorId') || '';

  const [formData, setFormData] = useState({
    amountLKR: Number.isFinite(amount) && amount >= MIN_CHECKOUT_LKR ? Math.round(amount) : Math.max(2500, MIN_CHECKOUT_LKR),
    currency: 'lkr',
    consultationId: consultationId || '',
    doctorId: doctorId || '',
    customerEmail: '',
  });

  useEffect(() => {
    // Get user email from localStorage
    const userData = localStorage.getItem('auth_user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setFormData((prev) => ({
          ...prev,
          customerEmail: user.email || '',
        }));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }

    // Check authentication
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/login', { state: { from: location.pathname + location.search } });
    }
  }, [navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const normalizedAmount = Number(formData.amountLKR);
    if (!formData.consultationId) {
      setError('Consultation id is missing. Please go back and retry from Bill Requests.');
      return;
    }
    if (!formData.doctorId) {
      setError('Doctor id is missing. Please go back and retry from Bill Requests.');
      return;
    }
    if (!Number.isFinite(normalizedAmount) || normalizedAmount < MIN_CHECKOUT_LKR) {
      setError(`Amount must be at least ${MIN_CHECKOUT_LKR} LKR.`);
      return;
    }
    if (!formData.customerEmail || !String(formData.customerEmail).includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const cancelParams = new URLSearchParams({
        consultationId: String(formData.consultationId || ''),
      });
      const successUrl = `${window.location.origin}/dashboard/payment/success?session_id={CHECKOUT_SESSION_ID}&consultationId=${encodeURIComponent(String(formData.consultationId || ''))}`;
      const cancelUrl = `${window.location.origin}/dashboard/payment/cancel?${cancelParams.toString()}`;

      const requestData = {
        ...formData,
        amountLKR: Math.round(normalizedAmount),
        successUrl,
        cancelUrl,
      };

      console.log('Creating checkout session:', requestData);
      const response = await API.payment.createCheckoutSession(requestData);

      // Redirect to Stripe checkout
      const redirectUrl = response?.checkoutUrl || response?.url || response?.redirectUrl;
      if (redirectUrl) {
        window.location.assign(redirectUrl);
      } else {
        throw new Error('Gateway did not return a checkout URL.');
      }
    } catch (err) {
      console.error('Payment checkout error:', err);
      if (err.message === 'Authentication required') {
        navigate('/login', { state: { from: location.pathname + location.search } });
        return;
      }
      setError(err.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!consultationId) {
    return (
      <section className="page">
        <div className="max-w-2xl mx-auto">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  No consultation selected. Please select a consultation to pay for.
                </p>
                <button
                  onClick={() => navigate('/profile')}
                  className="mt-2 text-sm font-medium text-yellow-800 hover:text-yellow-900"
                >
                  Go to Appointments →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-linear-to-br from-white via-slate-50 to-primary-50 p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#808e9b]">Payment Gateway</p>
          <h1 className="text-3xl font-black text-primary-500 mt-2 tracking-tight">Complete Your Payment</h1>
          <p className="text-sm font-semibold text-[#808e9b] mt-1">Secure Stripe checkout for this consultation bill.</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Payment Summary */}
          <div className="bg-primary-500 px-6 py-4">
            <h2 className="text-lg font-black text-white tracking-tight">Payment Summary</h2>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-gray-600 font-semibold">Consultation ID</span>
                <span className="font-black text-gray-900">
                  #{formData.consultationId.slice(-8).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-gray-600 font-semibold">Doctor ID</span>
                <span className="font-black text-gray-900">#{formData.doctorId.slice(-8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-gray-600 font-semibold">Service</span>
                <span className="font-black text-gray-900">Medical Consultation</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-lg font-black text-gray-900">Total Amount</span>
                <span className="text-2xl font-black text-primary-500">
                  LKR {formData.amountLKR.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Checkout Form */}
          <form onSubmit={handleSubmit} className="border-t border-gray-200 p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (LKR)
                </label>
                <input
                  type="number"
                  value={formData.amountLKR}
                  onChange={(e) => handleInputChange('amountLKR', Number(e.target.value))}
                  required
                  min={String(MIN_CHECKOUT_LKR)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-[#808e9b] mt-1 font-semibold">Minimum gateway amount: {MIN_CHECKOUT_LKR} LKR</p>
              </div>

              <div className="bg-primary-50 rounded-xl p-4 border border-primary-100">
                <div className="flex items-start">
                  <div className="shrink-0">
                    <svg
                      className="h-5 w-5 text-blue-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-primary-700 font-semibold">
                      You will be redirected to Stripe's secure checkout page to complete your payment.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <svg
                  className="h-5 w-5 text-green-500"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="font-semibold">Secure SSL Encryption</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-black text-white bg-accent-red hover:bg-accent-red/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-red disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Proceed to Gateway Payment'
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-black text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Supported Payment Methods */}
        <div className="mt-2 text-center rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-sm font-black text-primary-500 mb-2">Supported Payment Methods</p>
          <p className="text-xs font-semibold text-[#808e9b]">Visa • Mastercard • Apple Pay • Google Pay • Bank Cards</p>
        </div>
      </div>
    </section>
  );
}
