import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import twilio from 'twilio';

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message;

    // 1. INCOMING CALL (Gatekeeper)
    if (message.type === 'assistant-request') {
      const { call } = message;
      // We look up by the Phone Number ID attached to the call
      // This is the most reliable way to find the owner.
      const { data: assistant } = await supabaseAdmin
        .from('assistants')
        .select('user_id, vapi_assistant_id') // We trust the ID in Vapi now
        .eq('vapi_phone_number_id', call.phoneNumberId)
        .single();

      if (!assistant) return NextResponse.json({ assistantId: null });

      // Check Usage
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('usage_minutes, monthly_usage_limit')
        .eq('id', assistant.user_id)
        .single();

      if ((profile?.usage_minutes || 0) >= (profile?.monthly_usage_limit || 200)) {
          return NextResponse.json({ error: "Limit reached" }, { status: 403 });
      }

      // APPROVE: Tell Vapi "Yes, use the assistant currently assigned to this number"
      // We do NOT send an 'assistant' object here. We just say "Proceed".
      // By returning the ID, Vapi uses the config we saved in update-agent.
      return NextResponse.json({ assistantId: assistant.vapi_assistant_id });
    }

    // 2. CALL ENDED (Logger)
    if (message.type === 'end-of-call-report') {
      const { call, analysis } = message;
      
      // Find user again (Stateless)
      const { data: assistant } = await supabaseAdmin
        .from('assistants')
        .select('user_id')
        .eq('vapi_phone_number_id', call.phoneNumberId)
        .single();

      if (assistant) {
        const userId = assistant.user_id;
        
        // Log to DB
        await supabaseAdmin.from('calls').insert({
            user_id: userId,
            assistant_id: call.assistantId,
            customer_number: call.customer?.number || 'Unknown',
            status: message.endedReason,
            duration_seconds: Math.round(message.durationSeconds || 0),
            summary: analysis?.summary || "No summary.",
            recording_url: message.recordingUrl,
            started_at: call.startedAt
        });

        // Update Usage
        const minutes = (message.durationSeconds || 0) / 60;
        const { data: p } = await supabaseAdmin.from('profiles').select('usage_minutes, business_phone').eq('id', userId).single();
        await supabaseAdmin.from('profiles').update({ usage_minutes: (p?.usage_minutes || 0) + minutes }).eq('id', userId);

        // Send SMS
        if (p?.business_phone) {
            const sms = `NessDial 📞\nCall from: ${call.customer?.number}\n\n${analysis?.summary || "(No message)"}`;
            try {
                await twilioClient.messages.create({
                    body: sms,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: p.business_phone
                });
            } catch (e) { console.error("SMS Failed", e); }
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