import Link from 'next/link';
import { ArrowLeft, FileText, Shield, AlertTriangle } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link href="/" className="inline-flex items-center text-slate-500 hover:text-blue-600 transition-colors mb-6 text-sm font-medium">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Terms of Service</h1>
          <p className="text-slate-500">Last Updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12 prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-a:text-blue-600">
          
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-10 not-prose flex gap-4">
            <Shield className="h-6 w-6 text-blue-600 shrink-0" />
            <div>
              <h3 className="font-bold text-blue-900 text-sm mb-1">Quick Summary</h3>
              <p className="text-blue-700 text-sm leading-relaxed">
                NessDial provides an AI receptionist service. By using it, you agree that AI can sometimes make mistakes ("hallucinations") and that you are responsible for complying with call recording laws (GDPR/RIPA) in your jurisdiction.
              </p>
            </div>
          </div>

          <section>
            <h2>1. Introduction</h2>
            <p>
              Welcome to <strong>NessDial</strong> ("we," "our," or "us"). By creating an account or using our AI receptionist services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
            <p>
              We are a business registered in Scotland. Our contact email is <strong>[innes.urquhart5@gmail.com]</strong>.
            </p>
          </section>

          <section>
            <h2>2. The Service</h2>
            <p>
              NessDial provides an artificial intelligence-based phone answering service. This includes:
            </p>
            <ul>
              <li>Provisioning of a UK telephone number.</li>
              <li>Automated voice interaction with callers.</li>
              <li>Transcription and summarisation of calls.</li>
              <li>SMS and email notifications.</li>
            </ul>
          </section>

          <section className="bg-yellow-50 p-6 rounded-xl border border-yellow-100 not-prose my-8">
            <div className="flex gap-3">
              <AlertTriangle className="h-6 w-6 text-yellow-600 shrink-0" />
              <div>
                <h3 className="font-bold text-yellow-900 text-lg mb-2">3. AI Disclaimer & Limitation of Liability</h3>
                <p className="text-yellow-800 text-sm leading-relaxed mb-4">
                  You acknowledge that our service uses generative Artificial Intelligence (AI). AI technologies are experimental and may occasionally produce incorrect, misleading, or offensive responses ("Hallucinations").
                </p>
                <ul className="list-disc pl-5 text-yellow-800 text-sm space-y-2">
                  <li><strong>NessDial is NOT liable</strong> for any appointments missed, incorrect quotes given, or misinformation provided by the AI to your callers.</li>
                  <li><strong>Verification:</strong> It is your responsibility to verify the accuracy of any information collected by the AI (e.g., client phone numbers, addresses) before acting on it.</li>
                  <li><strong>Emergency Calls:</strong> NessDial is <strong>NOT</strong> a replacement for emergency services (999). You must not use this service for critical safety applications.</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2>4. Call Recording & Legal Compliance</h2>
            <p>
              Our service records conversations to provide you with transcripts and summaries.
            </p>
            <ul>
              <li><strong>Your Responsibility:</strong> As the user of the service, you are the "Data Controller." You agree to comply with all applicable laws regarding call recording, wiretapping, and data privacy, including the UK Data Protection Act 2018 (GDPR) and the Regulation of Investigatory Powers Act 2000 (RIPA).</li>
              <li><strong>Consent:</strong> You warrant that you have obtained any necessary consent from callers to be recorded, or that you have a lawful basis for doing so.</li>
            </ul>
          </section>

          <section>
            <h2>5. Subscriptions, Payments & Cancellation</h2>
            <ul>
              <li><strong>Billing:</strong> Services are billed on a monthly subscription basis via Stripe. Payments are taken in advance.</li>
              <li><strong>Cancellation:</strong> You may cancel your subscription at any time via your dashboard. Your service will continue until the end of your current billing period.</li>
              <li><strong>Refunds:</strong> We do not offer refunds for partial months used. If you cancel, you will not be charged again, but previous payments are non-refundable.</li>
              <li><strong>Fair Use:</strong> We reserve the right to terminate accounts that excessively overuse the system (e.g., thousands of spam calls) or use the service for illegal activities (scams, harassment).</li>
            </ul>
          </section>

          <section>
            <h2>6. Intellectual Property</h2>
            <p>
              <strong>Your Data:</strong> You retain ownership of your customer data, call logs, and transcripts. We claim no ownership over your business information.
            </p>
            <p>
              <strong>Our Platform:</strong> The NessDial software, code, branding, and AI configurations (including the personas "Rab," "Claire," and "Calum") remain the exclusive property of NessDial.
            </p>
          </section>

          <section>
            <h2>7. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, NessDial shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.
            </p>
            <p>
              In no event shall our aggregate liability exceed the amount you paid to NessDial in the past twelve (12) months.
            </p>
          </section>

          <section>
            <h2>8. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of <strong>Scotland</strong>. Any disputes relating to these Terms will be subject to the exclusive jurisdiction of the courts of Scotland.
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-slate-200">
            <p className="text-slate-500 text-sm">
              Questions about these terms? Contact us at <a href="mailto:[innes.urquhart5@gmail.com]" className="text-blue-600 hover:underline">[innes.urquhart5@gmail.com]</a>
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}