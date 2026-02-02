import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import twilio from 'twilio';

// Initialize Twilio
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message;

    console.log(`📣 Vapi Event: ${message.type}`);

    // --- 1. HANDLE INCOMING CALL ---
    if (message.type === 'assistant-request') {
      const calledNumber = message.call.phoneNumberId; 
      
      const { data: assistantRecord } = await supabaseAdmin
        .from('assistants')
        .select('user_id, vapi_assistant_id')
        .eq('vapi_phone_number_id', calledNumber) 
        .single();

      if (assistantRecord) {
        // Check Minutes Limit
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('usage_minutes, monthly_usage_limit')
            .eq('id', assistantRecord.user_id)
            .single();

        const currentUsage = profile?.usage_minutes || 0;
        const limit = profile?.monthly_usage_limit || 200;

        if (currentUsage >= limit) {
             console.warn(`⛔ Limit Reached. Blocking call.`);
             return NextResponse.json({ error: "Limit reached" }, { status: 403 });
        }

        return NextResponse.json({ assistantId: assistantRecord.vapi_assistant_id });
      }
      return NextResponse.json({ assistantId: null });
    }

    // --- 2. HANDLE END OF CALL (SMS LOGIC) ---
    if (message.type === 'end-of-call-report') {
      const call = message.call;
      const analysis = message.analysis || {}; 
      const customerNumber = call.customer?.number || 'Unknown';
      
      console.log(`📞 Call Ended. Customer: ${customerNumber}`);

      const { data: assistantRecord } = await supabaseAdmin
        .from('assistants')
        .select('user_id')
        .eq('vapi_assistant_id', call.assistantId) 
        .maybeSingle();

      if (assistantRecord) {
        const userId = assistantRecord.user_id;
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('business_phone, usage_minutes')
            .eq('id', userId)
            .single();

        if (profile) {
            // A. Log Call to Database
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

            // B. Update Usage Minutes
            const durationMinutes = (message.durationSeconds || 0) / 60;
            await supabaseAdmin
                .from('profiles')
                .update({ usage_minutes: (profile.usage_minutes || 0) + durationMinutes })
                .eq('id', userId);
            
            // C. SEND SMS (GUARANTEED)
            if (profile.business_phone) {
                // 1. Prepare Message
                let smsBody = `NessDial 📞\nCall from: ${customerNumber}`;
                if (analysis.summary) {
                    smsBody += `\n\nSummary: ${analysis.summary}`;
                } else {
                    smsBody += `\n\n(No voice message left)`;
                }

                // 2. Send via Twilio
                try {
                    console.log(`📨 Sending SMS to ${profile.business_phone}...`);
                    await twilioClient.messages.create({
                        body: smsBody,
                        from: process.env.TWILIO_PHONE_NUMBER,
                        to: profile.business_phone
                    });
                    console.log(`✅ SMS Sent Successfully!`);
                } catch (smsError: any) {
                    console.error("❌ SMS FAILED:", smsError.message);
                }
            } else {
                console.warn("⚠️ No business_phone found in profile. SMS skipped.");
            }
        }
      }
      return NextResponse.json({ status: 'Logged' }, { status: 200 });
    }

    return NextResponse.json({ message: 'Handled' });

  } catch (error: any) {
    console.error('🚨 Webhook Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}