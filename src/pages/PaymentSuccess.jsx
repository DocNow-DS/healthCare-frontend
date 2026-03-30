import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import API from '../config/api.js';

export default function PaymentSuccess() {
  const location = useLocation();
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get session_id from URL query params
  const queryParams = new URLSearchParams(location.search);
  const sessionId = queryParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      const response = await API.payment.getPaymentBySession(sessionId);
      setPaymentDetails(response);
    } catch (error) {
      console.error('Error verifying payment:', error);
      setPaymentDetails({
        stripeSessionId: sessionId,
        status: 'UNKNOWN',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="page">
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Verifying your payment...</h2>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Success Header */}
          <div className="bg-gradient-to-r from-green-500 to-teal-500 px-6 py-8 text-center">
            <div className="mx-auto w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-10 h-10 text-green-500"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Payment Successful!</h1>
            <p className="text-green-100">Your consultation has been confirmed</p>
          </div>

          <div className="p-6">
            {/* Payment Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID</span>
                  <span className="font-medium text-gray-900">
                    {(paymentDetails?.stripeSessionId || sessionId) ? (paymentDetails?.stripeSessionId || sessionId).slice(-12).toUpperCase() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentDetails?.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {paymentDetails?.status === 'COMPLETED' ? 'Completed' : 'Processing'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date</span>
                  <span className="font-medium text-gray-900">
                    {new Date().toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* What Happens Next */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">What Happens Next?</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Confirmation Email</p>
                    <p className="text-sm text-gray-500">
                      You'll receive a confirmation email with your appointment details shortly.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Doctor Notification</p>
                    <p className="text-sm text-gray-500">
                      Your doctor has been notified about your confirmed appointment.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Join Consultation</p>
                    <p className="text-sm text-gray-500">
                      At your scheduled time, join the video consultation from your appointments page.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Receipt Info */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <svg
                  className="h-5 w-5 text-blue-400 mt-0.5"
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
                <p className="text-sm text-blue-700">
                  A detailed receipt has been sent to your email address. You can also view your payment history anytime.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Link
                to="/profile"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                View My Appointments
              </Link>
              <Link
                to="/payments"
                className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                View Payment History
              </Link>
              <Link
                to="/"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-blue-600 bg-transparent hover:bg-blue-50 focus:outline-none"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Need help?{' '}
            <a href="#" className="text-blue-600 hover:text-blue-500 font-medium">
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
