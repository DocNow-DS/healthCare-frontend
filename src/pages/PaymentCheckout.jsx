import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../config/api.js';

export default function PaymentCheckout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get consultation details from location state or query params
  const consultationId = location.state?.consultationId || new URLSearchParams(location.search).get('consultationId');
  const amount = location.state?.amount || new URLSearchParams(location.search).get('amount') || 2500;
  const doctorName = location.state?.doctorName || 'Doctor';

  const [formData, setFormData] = useState({
    amountLKR: amount,
    currency: 'lkr',
    consultationId: consultationId || '',
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
    setLoading(true);

    try {
      const successParams = new URLSearchParams({
        session_id: '{CHECKOUT_SESSION_ID}',
        consultationId: String(formData.consultationId || ''),
      });
      const cancelParams = new URLSearchParams({
        consultation_id: String(formData.consultationId || ''),
      });
      const successUrl = `${window.location.origin}/dashboard/payment/success?${successParams.toString()}`;
      const cancelUrl = `${window.location.origin}/dashboard/payment/cancel?${cancelParams.toString()}`;

      const requestData = {
        ...formData,
        successUrl,
        cancelUrl,
      };

      console.log('Creating checkout session:', requestData);
      const response = await API.payment.createCheckoutSession(requestData);

      // Redirect to Stripe checkout
      if (response.checkoutUrl) {
        window.location.href = response.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
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
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Payment</h1>
          <p className="text-gray-600">Secure payment powered by Stripe</p>
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

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Payment Summary */}
          <div className="bg-linear-to-r from-blue-600 to-purple-600 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">Payment Summary</h2>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-gray-600">Consultation ID</span>
                <span className="font-medium text-gray-900">
                  #{formData.consultationId.slice(-8).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-gray-600">Doctor</span>
                <span className="font-medium text-gray-900">{doctorName}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-gray-600">Service</span>
                <span className="font-medium text-gray-900">Medical Consultation</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                <span className="text-2xl font-bold text-blue-600">
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
                  onChange={(e) => handleInputChange('amountLKR', parseInt(e.target.value))}
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-blue-50 rounded-md p-4">
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
                    <p className="text-sm text-blue-700">
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
                <span>Secure SSL Encryption</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  'Proceed to Payment'
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Supported Payment Methods */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 mb-3">Supported Payment Methods</p>
          <div className="flex justify-center items-center space-x-4">
            <div className="bg-white px-3 py-2 rounded shadow-sm">
              <span className="text-lg">💳</span>
              <span className="text-sm text-gray-700 ml-1">Visa</span>
            </div>
            <div className="bg-white px-3 py-2 rounded shadow-sm">
              <span className="text-lg">💳</span>
              <span className="text-sm text-gray-700 ml-1">Mastercard</span>
            </div>
            <div className="bg-white px-3 py-2 rounded shadow-sm">
              <span className="text-lg">🏦</span>
              <span className="text-sm text-gray-700 ml-1">Bank Transfer</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
