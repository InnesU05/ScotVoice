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
    // 1. INCOMING CALL (Gatekeeper Only)
    // ==========================================
    if (message.type === 'assistant-request') {
      const calledNumber = message.call.phoneNumberId; 
      
      const { data: assistantRecord } = await supabaseAdmin
        .from('assistants')
        .select('user_id, vapi_assistant_id')
        .eq('vapi_phone_number_id', calledNumber) 
        .single();

      if (assistantRecord) {
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('usage_minutes, monthly_usage_limit')
            .eq('id', assistantRecord.user_id)
            .single();

        const currentUsage = profile?.usage_minutes || 0;
        const limit = profile?.monthly_usage_limit || 200;

        if (currentUsage >= limit) {
             console.warn(`⛔ Limit Reached (${currentUsage}/${limit}). Blocking call.`);
             return NextResponse.json({ error: "Limit reached" }, { status: 403 });
        }

        // ✅ WE RETURN THE ID. 
        // This tells Vapi: "Go ahead and use the Assistant I already set up in your dashboard."
        // (The one we updated in Step 2 with all the training data).
        return NextResponse.json({ assistantId: assistantRecord.vapi_assistant_id });
      }

      return NextResponse.json({ assistantId: null });
    }

    // ==========================================
    // 2. END OF CALL REPORT (Logging & SMS)
    // ==========================================
    if (message.type === 'end-of-call-report') {
      const call = message.call;
      const analysis = message.analysis || {}; 
      const customerNumber = call.customer?.number || 'Unknown';
      
      const { data: assistantRecord } = await supabaseAdmin
        .from('assistants')
        .select('user_id')
        .eq('vapi_assistant_id', call.assistantId) 
        .maybeSingle();

      if (assistantRecord) {
        const userId = assistantRecord.user_id;
        const { data: profile } = await supabaseAdmin.from('profiles').select('business_phone, usage_minutes').eq('id', userId).single();

        // Log Call
        await supabaseAdmin.from('calls').insert({
            user_id: userId,
            assistant_id: call.assistantId,
            customer_number: customerNumber,
            status: message.endedReason || 'completed',
            duration_seconds: Math.round(message.durationSeconds || 0),
            summary: analysis.summary || "No summary provided.",
            recording_url: message.recordingUrl || null,
            started_at: call.startedAt || new Date().toISOString()
        });

        // Update Usage
        const durationMinutes = (message.durationSeconds || 0) / 60;
        await supabaseAdmin.from('profiles').update({ usage_minutes: (profile?.usage_minutes || 0) + durationMinutes }).eq('id', userId);
        
        // Send SMS
        if (profile?.business_phone && analysis.summary) {
            try {
                await twilioClient.messages.create({
                    body: `NessDial Alert 📞\nCall from: ${customerNumber}\n\nSummary: ${analysis.summary}`,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: profile.business_phone
                });
            } catch (e) { console.error(e); }
        }
      }
      return NextResponse.json({ status: 'Logged' }, { status: 200 });
    }

    return NextResponse.json({ message: 'Handled' });

  } catch (error: any) {
    console.error('🚨 Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}