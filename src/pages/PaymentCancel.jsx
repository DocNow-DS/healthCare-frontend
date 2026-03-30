import { Link, useLocation } from 'react-router-dom';

export default function PaymentCancel() {
  const location = useLocation();
  
  // Get consultation_id from URL query params if available
  const queryParams = new URLSearchParams(location.search);
  const consultationId = queryParams.get('consultation_id');

  return (
    <section className="page">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Cancel Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-8 text-center">
            <div className="mx-auto w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-10 h-10 text-orange-500"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Payment Cancelled</h1>
            <p className="text-orange-100">Your payment was not processed</p>
          </div>

          <div className="p-6">
            {/* Info Message */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    No payment has been charged to your account. Your consultation remains pending until payment is completed.
                  </p>
                </div>
              </div>
            </div>

            {/* Common Reasons */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Why was my payment cancelled?</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <span className="text-orange-500">•</span>
                  <span>You clicked the "Back" or "Cancel" button during checkout</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-orange-500">•</span>
                  <span>The payment session expired (sessions expire after 30 minutes)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-orange-500">•</span>
                  <span>There was an issue with your payment method</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-orange-500">•</span>
                  <span>You closed the browser or navigated away</span>
                </div>
              </div>
            </div>

            {/* What You Can Do */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">What would you like to do?</h3>
              <div className="grid grid-cols-1 gap-3">
                {consultationId && (
                  <Link
                    to={`/payment/checkout?consultationId=${consultationId}`}
                    className="flex items-center p-4 border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex-shrink-0 mr-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xl">💳</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Try Payment Again</p>
                      <p className="text-sm text-gray-500">Return to checkout and complete your payment</p>
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}

                <Link
                  to="/profile"
                  className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0 mr-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">📅</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">View My Appointments</p>
                    <p className="text-sm text-gray-500">Check your consultation status</p>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link
                  to="/payments"
                  className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0 mr-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">📊</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Payment History</p>
                    <p className="text-sm text-gray-500">View all your past payments</p>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Need Help */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Need help with your payment?</h3>
              <p className="text-sm text-gray-600 mb-4">
                If you're experiencing issues with payment processing, our support team is here to help.
              </p>
              <div className="flex space-x-3">
                <a
                  href="#"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  📞 Contact Support
                </a>
                <a
                  href="#"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
                >
                  ❓ FAQs
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Return to Home
          </Link>
        </div>
      </div>
    </section>
  );
}
