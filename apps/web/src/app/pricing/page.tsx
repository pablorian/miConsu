export default function Pricing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-zinc-900">
      <h1 className="text-4xl font-bold mb-12">Pricing Plans</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full">
        {/* Free Plan */}
        <div className="bg-white dark:bg-zinc-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-zinc-700">
          <h2 className="text-2xl font-bold mb-4">Free</h2>
          <p className="text-4xl font-bold mb-6">$0<span className="text-base font-normal text-gray-500">/mo</span></p>
          <ul className="space-y-3 mb-8 text-sm">
            <li>✓ 5 QR Codes</li>
            <li>✓ Basic Analytics</li>
            <li>✓ Standard Support</li>
          </ul>
          <button className="w-full py-2 bg-gray-200 text-black rounded-lg hover:bg-gray-300 transition">Current Plan</button>
        </div>

        {/* Pro Plan */}
        <div className="bg-black text-white dark:bg-white dark:text-black p-8 rounded-2xl shadow-xl transform scale-105 border border-black">
          <h2 className="text-2xl font-bold mb-4">Pro</h2>
          <p className="text-4xl font-bold mb-6">$15<span className="text-base font-normal opacity-70">/mo</span></p>
          <ul className="space-y-3 mb-8 text-sm">
            <li>✓ Unlimited QR Codes</li>
            <li>✓ Advanced Analytics</li>
            <li>✓ Custom Designs</li>
            <li>✓ Priority Support</li>
          </ul>
          <button className="w-full py-2 bg-white text-black dark:bg-black dark:text-white rounded-lg hover:opacity-90 transition">Get Started</button>
        </div>

        {/* Enterprise Plan */}
        <div className="bg-white dark:bg-zinc-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-zinc-700">
          <h2 className="text-2xl font-bold mb-4">Enterprise</h2>
          <p className="text-4xl font-bold mb-6">$Custom</p>
          <ul className="space-y-3 mb-8 text-sm">
            <li>✓ SSO (WorkOS)</li>
            <li>✓ Dedicated Manager</li>
            <li>✓ SLA</li>
          </ul>
          <button className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Contact Sales</button>
        </div>
      </div>
    </div>
  );
}
