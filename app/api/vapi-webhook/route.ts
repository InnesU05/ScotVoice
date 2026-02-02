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
    // 1. INCOMING CALL
    // ==========================================
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
             console.warn(`⛔ Limit Reached (${currentUsage}/${limit}). Blocking call.`);
             return NextResponse.json({ error: "Limit reached" }, { status: 403 });
        }

        return NextResponse.json({ assistantId: assistantRecord.vapi_assistant_id });
      }
      return NextResponse.json({ assistantId: null });
    }

    // ==========================================
    // 2. END OF CALL (The Critical Fix)
    // ==========================================
    if (message.type === 'end-of-call-report') {
      const call = message.call;
      const analysis = message.analysis || {}; 
      const customerNumber = call.customer?.number || 'Unknown';
      
      // 🚨 FIX: Identify User by PHONE ID (Permanent), NOT Assistant ID (Changeable)
      // This prevents the "Zombie ID" bug where logs/SMS stop working after a switch.
      const vapiPhoneNumberId = call.phoneNumberId; 

      console.log(`📞 Call Ended. Lookup via Phone ID: ${vapiPhoneNumberId}`);

      const { data: assistantRecord, error: lookupError } = await supabaseAdmin
        .from('assistants')
        .select('user_id, vapi_assistant_id') // We get the user_id from the permanent phone record
        .eq('vapi_phone_number_id', vapiPhoneNumberId) 
        .maybeSingle();

      if (lookupError) console.error("Database Lookup Error:", lookupError);

      if (assistantRecord) {
        const userId = assistantRecord.user_id;
        
        // Fetch Profile for SMS & Usage
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('business_phone, usage_minutes')
            .eq('id', userId)
            .single();

        if (profile) {
            console.log(`✅ User Found (ID: ${userId}). Processing Log & SMS...`);

            // A. LOG CALL
            const { error: logError } = await supabaseAdmin.from('calls').insert({
                user_id: userId,
                assistant_id: call.assistantId, // We log the actual assistant ID from the call
                customer_number: customerNumber,
                status: message.endedReason || 'completed',
                duration_seconds: Math.round(message.durationSeconds || 0),
                summary: analysis.summary || "No summary provided.",
                recording_url: message.recordingUrl || null,
                started_at: call.startedAt || new Date().toISOString()
            });

            if (logError) console.error("❌ Failed to Log Call:", logError);

            // B. UPDATE USAGE
            const durationMinutes = (message.durationSeconds || 0) / 60;
            await supabaseAdmin
                .from('profiles')
                .update({ usage_minutes: (profile.usage_minutes || 0) + durationMinutes })
                .eq('id', userId);
            
            // C. SEND SMS (Force Send)
            if (profile.business_phone) {
                let smsBody = `NessDial 📞\nCall from: ${customerNumber}`;
                
                // If summary exists, add it. If not (short call), say so.
                if (analysis.summary) {
                    smsBody += `\n\nSummary: ${analysis.summary}`;
                } else {
                    smsBody += `\n\n(Caller hung up or no message left)`;
                }

                try {
                    console.log(`📨 Sending SMS to ${profile.business_phone}...`);
                    await twilioClient.messages.create({
                        body: smsBody,
                        from: process.env.TWILIO_PHONE_NUMBER,
                        to: profile.business_phone
                    });
                    console.log(`✅ SMS Sent Successfully!`);
                } catch (smsError: any) {
                    console.error("❌ SMS Failed:", smsError.message);
                }
            } else {
                console.warn("⚠️ No business phone number set. SMS skipped.");
            }
        }
      } else {
          console.error(`🚨 CRITICAL: No user found for Vapi Phone ID: ${vapiPhoneNumberId}`);
      }
      return NextResponse.json({ status: 'Logged' }, { status: 200 });
    }

    return NextResponse.json({ message: 'Handled' });

  } catch (error: any) {
    console.error('🚨 Webhook Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}