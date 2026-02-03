import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import twilio from 'twilio';

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message;

    console.log(`📣 Vapi Event: ${message.type}`);

    // ==========================================
    // 1. INCOMING CALL (Gatekeeper)
    // ==========================================
    if (message.type === 'assistant-request') {
      const { call } = message;
      
      // Look up by Phone ID (Stable)
      const { data: assistant } = await supabaseAdmin
        .from('assistants')
        .select('user_id, vapi_assistant_id')
        .eq('vapi_phone_number_id', call.phoneNumberId)
        .single();

      if (!assistant) return NextResponse.json({ assistantId: null });

      // Check Usage Limits
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('usage_minutes, monthly_usage_limit')
        .eq('id', assistant.user_id)
        .single();

      if ((profile?.usage_minutes || 0) >= (profile?.monthly_usage_limit || 200)) {
          console.warn("⛔ Limit reached. Blocking.");
          return NextResponse.json({ error: "Limit reached" }, { status: 403 });
      }

      // Approve Call
      return NextResponse.json({ assistantId: assistant.vapi_assistant_id });
    }

    // ==========================================
    // 2. CALL ENDED (Logger & SMS)
    // ==========================================
    if (message.type === 'end-of-call-report') {
      const { call, analysis } = message;
      
      // Look up by Phone ID (Stable)
      const { data: assistant } = await supabaseAdmin
        .from('assistants')
        .select('user_id')
        .eq('vapi_phone_number_id', call.phoneNumberId)
        .single();

      if (assistant) {
        const userId = assistant.user_id;
        
        // Log Call
        await supabaseAdmin.from('calls').insert({
            user_id: userId,
            assistant_id: call.assistantId,
            customer_number: call.customer?.number || 'Unknown',
            status: message.endedReason,
            duration_seconds: Math.round(message.durationSeconds || 0),
            summary: analysis?.summary || "No summary provided.",
            recording_url: message.recordingUrl,
            started_at: call.startedAt
        });

        // Update Usage
        const minutes = (message.durationSeconds || 0) / 60;
        const { data: p } = await supabaseAdmin.from('profiles').select('usage_minutes, business_phone').eq('id', userId).single();
        
        if (p) {
            await supabaseAdmin.from('profiles').update({ usage_minutes: (p.usage_minutes || 0) + minutes }).eq('id', userId);

            // Send SMS
            if (p.business_phone) {
                let smsBody = `NessDial 📞\nCall from: ${call.customer?.number}`;
                smsBody += analysis?.summary ? `\n\nSummary: ${analysis.summary}` : `\n\n(No voice message left)`;

                try {
                    await twilioClient.messages.create({
                        body: smsBody,
                        from: process.env.TWILIO_PHONE_NUMBER,
                        to: p.business_phone
                    });
                    console.log(`✅ SMS Sent to ${p.business_phone}`);
                } catch (e) { console.error("❌ SMS Failed", e); }
            }
        }
      }
      return NextResponse.json({ status: 'OK' });
    }

    return NextResponse.json({ status: 'Ignored' });

  } catch (error: any) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}