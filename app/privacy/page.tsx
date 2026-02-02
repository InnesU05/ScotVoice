import Link from 'next/link';
import { ArrowLeft, Lock, Eye, Server } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link href="/" className="inline-flex items-center text-slate-500 hover:text-blue-600 transition-colors mb-6 text-sm font-medium">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
          <p className="text-slate-500">Last Updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12 prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-a:text-blue-600">
          
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-10 not-prose flex gap-4">
            <Lock className="h-6 w-6 text-blue-600 shrink-0" />
            <div>
              <h3 className="font-bold text-blue-900 text-sm mb-1">We respect your data</h3>
              <p className="text-blue-700 text-sm leading-relaxed">
                NessDial handles two types of data: <strong>Your Data</strong> (account info) and <strong>Call Data</strong> (recordings of your customers). This policy explains how we treat both securely.
              </p>
            </div>
          </div>

          <section>
            <h2>1. Who We Are</h2>
            <p>
              NessDial ("we", "our") is a business registered in Scotland. We act as the <strong>Data Controller</strong> for your account information and the <strong>Data Processor</strong> for the call data we process on your behalf.
            </p>
            <p>
              Contact Email: <strong>[innes.urquhart5@gmail.com]</strong>
            </p>
          </section>

          <section>
            <h2>2. Data We Collect</h2>
            <h3>2.1 Information You Provide</h3>
            <ul>
              <li><strong>Account Info:</strong> Name, email address, business name, and password.</li>
              <li><strong>Payment Info:</strong> Billing address and payment method (processed securely by Stripe).</li>
              <li><strong>Configuration Data:</strong> The instructions, opening hours, and scripts you provide to train your AI.</li>
            </ul>

            <h3>2.2 Information Collected Automatically</h3>
            <ul>
              <li><strong>Call Recordings & Transcripts:</strong> Audio of conversations between your callers and the AI.</li>
              <li><strong>Telephony Metadata:</strong> Caller ID, call duration, timestamp, and call status.</li>
              <li><strong>Usage Logs:</strong> Login times, IP addresses, and interaction with our dashboard.</li>
            </ul>
          </section>

          <section className="bg-slate-50 p-6 rounded-xl border border-slate-200 not-prose my-8">
            <div className="flex gap-3">
              <Server className="h-6 w-6 text-slate-600 shrink-0" />
              <div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">3. How We Use AI & Third Parties</h3>
                <p className="text-slate-700 text-sm leading-relaxed mb-3">
                  To provide the AI receptionist service, we must transmit data to trusted third-party infrastructure providers. We do not sell your data.
                </p>
                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-sm">
                    <strong>Vapi.ai / OpenAI</strong>
                    <p className="text-slate-500 text-xs mt-1">AI Voice Processing & Transcription</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-sm">
                    <strong>Twilio</strong>
                    <p className="text-slate-500 text-xs mt-1">Telephony & SMS Delivery</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-sm">
                    <strong>Supabase</strong>
                    <p className="text-slate-500 text-xs mt-1">Secure Database Storage</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-sm">
                    <strong>Stripe</strong>
                    <p className="text-slate-500 text-xs mt-1">Payment Processing</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2>4. Legal Basis for Processing (GDPR)</h2>
            <p>We process your personal data on the following grounds:</p>
            <ul>
              <li><strong>Contract:</strong> To fulfill the subscription service you purchased.</li>
              <li><strong>Legitimate Interest:</strong> To improve our AI models and prevent fraud.</li>
              <li><strong>Legal Obligation:</strong> To comply with tax and accounting laws.</li>
            </ul>
          </section>

          <section>
            <h2>5. Your Rights</h2>
            <p>Under the UK GDPR, you have the right to:</p>
            <ul>
              <li><strong>Access:</strong> Request a copy of the data we hold about you.</li>
              <li><strong>Rectification:</strong> Correct inaccurate data (you can do this in your dashboard).</li>
              <li><strong>Deletion ("Right to be Forgotten"):</strong> Request that we delete your account and all associated call logs.</li>
              <li><strong>Portability:</strong> Receive your data in a structured format.</li>
            </ul>
            <p>To exercise these rights, email us at <strong>[innes.urquhart5@gmail.com]</strong>.</p>
          </section>

          <section>
            <h2>6. Data Retention</h2>
            <p>
              We retain account data for as long as your subscription is active. Call recordings and logs are stored for <strong>[e.g., 12 months]</strong> unless you delete them sooner via the dashboard. Upon account cancellation, data is deleted after a grace period.
            </p>
          </section>

          <section>
            <h2>7. Security</h2>
            <p>
              We use industry-standard encryption (TLS/SSL) for data in transit and at rest. However, no method of transmission over the Internet is 100% secure. You are responsible for keeping your password confidential.
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-slate-200">
            <p className="text-slate-500 text-sm">
              NessDial is registered in Scotland. <br />
              Contact: <a href="mailto:[innes.urquhart5@gmail.com]" className="text-blue-600 hover:underline">[innes.urquhart5@gmail.com]</a>
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}