import { useState } from 'react';
import { Play, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface TestPayment {
  orderId: string;
  amount: number;
  plan: string;
  userEmail: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
}

export default function PaymentTest() {
  const [testPayments, setTestPayments] = useState<TestPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState<string | null>(null);

  // Test payment configurations
  const testScenarios = [
    {
      name: 'Successful Kashier Payment',
      plan: 'pro',
      amount: 99,
      paymentMethod: 'kashier',
      status: 'completed' as const,
    },
    {
      name: 'Successful PaySky Payment',
      plan: 'starter',
      amount: 49,
      paymentMethod: 'paysky',
      status: 'completed' as const,
    },
    {
      name: 'Failed Payment',
      plan: 'pro',
      amount: 99,
      paymentMethod: 'kashier',
      status: 'failed' as const,
    },
    {
      name: 'Cancelled Payment',
      plan: 'starter',
      amount: 49,
      paymentMethod: 'paysky',
      status: 'cancelled' as const,
    },
  ];

  /**
   * Create a test payment and simulate the full flow
   */
  const createTestPayment = async (scenario: typeof testScenarios[0]) => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('You must be logged in to test payments');
        return;
      }

      // Generate test order ID
      const orderId = `TEST_${user.id.slice(0, 8)}_${Date.now()}`;

      // Create payment record in database
      const { error: insertError } = await supabase
        .from('payments')
        .insert({
          plan: scenario.plan,
          amount: scenario.amount,
          currency: 'EGP',
          merchant_reference: orderId,
          status: 'pending',
          payment_method: scenario.paymentMethod,
          user_email: user.email,
          is_test: true,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Error creating test payment:', insertError);
        toast.error('Failed to create test payment');
        return;
      }

      // Add to local list
      const newPayment: TestPayment = {
        orderId,
        amount: scenario.amount,
        plan: scenario.plan,
        userEmail: user.email || 'test@example.com',
        status: 'pending',
      };

      setTestPayments([newPayment, ...testPayments]);
      toast.success(`Test payment created: ${orderId}`);
      console.log('✅ Test payment created:', { orderId, ...scenario });
    } catch (error) {
      console.error('Error creating test payment:', error);
      toast.error('Failed to create test payment');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Simulate payment processing - instant redirect
   */
  const simulatePayment = async (payment: TestPayment, finalStatus: 'completed' | 'failed' | 'cancelled') => {
    try {
      setSimulating(payment.orderId);

      // Quick processing animation (1 second)
      console.log(`⏳ Simulating ${finalStatus}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update payment record in background
      supabase
        .from('payments')
        .update({
          status: finalStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('merchant_reference', payment.orderId);

      // Update local state
      setTestPayments(prev =>
        prev.map(p =>
          p.orderId === payment.orderId
            ? { ...p, status: finalStatus }
            : p
        )
      );

      // Show message
      if (finalStatus === 'completed') {
        toast.success(`✅ Payment successful!`);
      } else if (finalStatus === 'failed') {
        toast.error('❌ Payment failed');
      } else {
        toast.success('⚠️ Payment cancelled');
      }

      console.log(`✅ ${finalStatus.toUpperCase()}`);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to simulate payment');
    } finally {
      setSimulating(null);
    }
  };

  /**
   * Simulate callback redirect (like returning from payment provider)
   */
  const simulateCallbackRedirect = async (payment: TestPayment, finalStatus: 'completed' | 'failed' | 'cancelled') => {
    try {
      // Simulate payment first
      await simulatePayment(payment, finalStatus);

      // Then redirect to payment callback page
      setTimeout(() => {
        window.location.href = `/payment-callback?orderId=${payment.orderId}&paymentStatus=${finalStatus}`;
      }, 500);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed');
    }
  };

  /**
   * Clear all test payments
   */
  const clearTestPayments = async () => {
    try {
      setLoading(true);

      // Delete all test payments from database
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('is_test', true);

      if (error) {
        console.error('Error clearing test payments:', error);
        toast.error('Failed to clear test payments');
        return;
      }

      setTestPayments([]);
      toast.success('Test payments cleared');
    } catch (error) {
      console.error('Error clearing test payments:', error);
      toast.error('Failed to clear test payments');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">💳 Payment Testing Dashboard</h1>
          <p className="text-slate-300">
            Simulate the full payment process without real transactions for testing and development.
          </p>
        </div>

        {/* Test Scenarios */}
        <div className="bg-slate-800 rounded-2xl p-8 mb-8 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-6">Test Scenarios</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {testScenarios.map((scenario, idx) => (
              <div
                key={idx}
                className="bg-slate-700 rounded-xl p-6 border border-slate-600 hover:border-indigo-500 transition-all hover:shadow-lg hover:shadow-indigo-500/20"
              >
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white mb-2">{scenario.name}</h3>
                  <div className="space-y-1 text-sm text-slate-300">
                    <p>Plan: <span className="font-mono text-indigo-400">{scenario.plan}</span></p>
                    <p>Amount: <span className="font-mono text-green-400">{scenario.amount} EGP</span></p>
                    <p>Provider: <span className="font-mono text-blue-400">{scenario.paymentMethod}</span></p>
                  </div>
                </div>

                <button
                  onClick={() => createTestPayment(scenario)}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  {loading ? 'Creating...' : 'Create Payment'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Active Test Payments */}
        <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Active Test Payments</h2>
            {testPayments.length > 0 && (
              <button
                onClick={clearTestPayments}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-900 text-white font-semibold rounded-lg transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          {testPayments.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400">No test payments yet. Create one above to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {testPayments.map((payment) => (
                <div
                  key={payment.orderId}
                  className="bg-slate-700 rounded-xl p-6 border border-slate-600 hover:border-slate-500 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <code className="text-sm bg-slate-800 text-slate-300 px-3 py-1 rounded font-mono">
                          {payment.orderId}
                        </code>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            payment.status === 'pending'
                              ? 'bg-yellow-500/20 text-yellow-300'
                              : payment.status === 'completed'
                              ? 'bg-green-500/20 text-green-300'
                              : payment.status === 'failed'
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-orange-500/20 text-orange-300'
                          }`}
                        >
                          {payment.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-300 mt-3">
                        <div>
                          <p className="text-slate-400 text-xs uppercase tracking-wider">Plan</p>
                          <p className="font-semibold text-white capitalize">{payment.plan}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs uppercase tracking-wider">Amount</p>
                          <p className="font-semibold text-green-400">{payment.amount} EGP</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs uppercase tracking-wider">Email</p>
                          <p className="font-mono text-sm text-slate-300">{payment.userEmail}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs uppercase tracking-wider">Status</p>
                          <p className="font-semibold text-white capitalize">{payment.status}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {payment.status === 'pending' && (
                    <div className="flex gap-3 flex-wrap">
                      <button
                        onClick={() => simulateCallbackRedirect(payment, 'completed')}
                        disabled={simulating === payment.orderId || loading}
                        className="flex-1 min-w-[120px] bg-green-600 hover:bg-green-700 disabled:bg-green-900 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        {simulating === payment.orderId ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Simulate Success
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => simulateCallbackRedirect(payment, 'failed')}
                        disabled={simulating === payment.orderId || loading}
                        className="flex-1 min-w-[120px] bg-red-600 hover:bg-red-700 disabled:bg-red-900 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        {simulating === payment.orderId ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4" />
                            Simulate Failure
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => simulateCallbackRedirect(payment, 'cancelled')}
                        disabled={simulating === payment.orderId || loading}
                        className="flex-1 min-w-[120px] bg-orange-600 hover:bg-orange-700 disabled:bg-orange-900 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        {simulating === payment.orderId ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4" />
                            Simulate Cancel
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {payment.status !== 'pending' && (
                    <div className="pt-4 border-t border-slate-600">
                      <p className="text-sm text-slate-400">
                        Status: <span className="font-semibold text-white">{payment.status}</span>
                      </p>
                      <button
                        onClick={() => {
                          setTestPayments(prev =>
                            prev.map(p =>
                              p.orderId === payment.orderId
                                ? { ...p, status: 'pending' }
                                : p
                            )
                          );
                          toast.success('Reset to pending');
                        }}
                        className="mt-3 text-sm text-indigo-400 hover:text-indigo-300 font-semibold"
                      >
                        ↻ Reset to Pending
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Testing Guide */}
        <div className="bg-slate-800 rounded-2xl p-8 mt-8 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4">Testing Guide</h2>
          <div className="space-y-4 text-slate-300">
            <div>
              <h3 className="font-semibold text-white mb-2">1. Create Test Payment</h3>
              <p className="text-sm">Click "Create Payment" on any test scenario to generate a test order in the database.</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">2. Simulate Payment Process</h3>
              <p className="text-sm">Click one of the action buttons (Success, Failure, Cancel) to simulate the payment outcome.</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">3. Verify Results</h3>
              <p className="text-sm">The system will:</p>
              <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                <li>Update payment status in database</li>
                <li>Activate subscription (if success)</li>
                <li>Send email notification (if success)</li>
                <li>Redirect to payment callback page</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">4. Check Database</h3>
              <p className="text-sm">Visit Supabase dashboard → Tables → payments to see test payments marked with is_test=true</p>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-blue-900/30 border border-blue-700 rounded-2xl p-6 mt-8">
          <div className="flex gap-3">
            <AlertCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-white mb-2">Important Notes</h3>
              <ul className="text-sm text-blue-100 space-y-1">
                <li>✓ Test payments are marked with <code className="bg-blue-800 px-2 py-1 rounded text-xs">is_test: true</code> in database</li>
                <li>✓ You can reset pending payments to test again</li>
                <li>✓ Clear all test payments before production deployment</li>
                <li>✓ Polling system will detect status updates automatically</li>
                <li>✓ Emails will be sent to your configured RESEND_API_KEY</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
