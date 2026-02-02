import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import twilio from 'twilio';

// Initialize Twilio Client for sending SMS
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message;

    console.log(`📣 Vapi Event: ${message.type}`);

    // ==========================================
    // 1. INCOMING CALL (Inject Training & Instructions)
    // ==========================================
    if (message.type === 'assistant-request') {
      
      const calledNumber = message.call.phoneNumberId; 
      
      // Look up business info + TRAINING DATA
      const { data: assistantRecord, error } = await supabaseAdmin
        .from('assistants')
        .select(`
          vapi_assistant_id,
          user_id,
          profiles:user_id ( 
            business_name, 
            business_description,
            opening_hours,
            services,
            faqs,
            usage_minutes, 
            monthly_usage_limit 
          )
        `)
        .eq('vapi_phone_number_id', calledNumber) 
        .single();

      let businessName = "Valued Customer";
      let assistantIdToUse = "6af03c9c-2797-4818-8dfc-eb604c247f3d"; // Default
      let trainingContext = "";

      if (!error && assistantRecord) {
        const profile = assistantRecord.profiles as any;
        businessName = profile?.business_name || "Our Business";
        
        // --- 🛡️ MINUTE CAP SAFEGUARD ---
        const currentUsage = profile?.usage_minutes || 0;
        const usageLimit = profile?.monthly_usage_limit || 200;

        if (currentUsage >= usageLimit) {
            console.warn(`⛔ Limit Exceeded (${currentUsage}/${usageLimit}). Call rejected.`);
            return NextResponse.json({ error: "Monthly usage limit reached." }, { status: 403 });
        }

        // --- 🧠 CONSTRUCT TRAINING CONTEXT ---
        if (profile) {
            if (profile.business_description) trainingContext += `\nABOUT US: ${profile.business_description}`;
            if (profile.opening_hours) trainingContext += `\nOPENING HOURS: ${profile.opening_hours}`;
            if (profile.services) trainingContext += `\nSERVICES & PRICING: ${profile.services}`;
            if (profile.faqs) trainingContext += `\nFAQ / KNOWLEDGE BASE: ${profile.faqs}`;
        }

        if (assistantRecord.vapi_assistant_id) {
            assistantIdToUse = assistantRecord.vapi_assistant_id;
        }
      } 
      
      console.log(`✅ Injecting Name: ${businessName}`);

      return NextResponse.json({
        assistantId: assistantIdToUse,
        assistant: {
          variableValues: {
            business_name: businessName,
          },
          // 💉 INJECT TRAINING DATA + RECORDING INSTRUCTION
          model: {
            messages: [
              {
                role: "system",
                content: `You are the AI receptionist for ${businessName}. 
                
                IMPORTANT LEGAL NOTICE: 
                This call IS being recorded for quality and business purposes. If the caller asks if they are being recorded, you MUST say "Yes, this call is being recorded." Do not lie.

                HERE IS YOUR KNOWLEDGE BASE FOR THIS BUSINESS:
                ${trainingContext}
                
                INSTRUCTIONS:
                - Use the information above to answer customer questions accurately.
                - If the answer is not in the knowledge base, ask for their details so a human can call them back.
                - Be polite, professional, and concise.`
              }
            ]
          },
          voice: {
            provider: "playht",
            voiceId: "jennifer" 
          }
        }
      });
    }

    // ==========================================
    // 2. END OF CALL REPORT (Logging & SMS)
    // ==========================================
    if (message.type === 'end-of-call-report') {
      const call = message.call;
      const analysis = message.analysis || {}; 
      const customerNumber = call.customer?.number || 'Unknown';
      
      console.log(`📞 Call Ended. ID: ${call.id}`);

      // A. Find the User
      const { data: assistantRecord } = await supabaseAdmin
        .from('assistants')
        .select(`
            user_id, 
            profiles:user_id ( 
                business_phone, 
                usage_minutes 
            )
        `)
        .eq('vapi_assistant_id', call.assistantId) 
        .maybeSingle();

      if (assistantRecord) {
        const userId = assistantRecord.user_id;
        const profile = assistantRecord.profiles as any;

        // B. Save to 'calls' table
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

        // C. Update Usage
        const durationMinutes = (message.durationSeconds || 0) / 60;
        const newUsage = (profile?.usage_minutes || 0) + durationMinutes;
        
        await supabaseAdmin
            .from('profiles')
            .update({ usage_minutes: newUsage })
            .eq('id', userId);
        
        console.log(`⏱️ Usage Updated: +${durationMinutes.toFixed(2)} mins.`);

        // D. SEND SMS TO BUSINESS OWNER (Text the Boss)
        if (profile?.business_phone && analysis.summary) {
            try {
                // Ensure number format is correct (Twilio needs E.164, e.g. +447...)
                // We assume user entered it correctly or we rely on Twilio's lenient formatting for UK numbers
                await twilioClient.messages.create({
                    body: `NessDial Alert 📞\nCall from: ${customerNumber}\n\nSummary: ${analysis.summary}`,
                    from: process.env.TWILIO_PHONE_NUMBER, // Your main Twilio number (the "sender")
                    to: profile.business_phone
                });
                console.log(`📲 SMS Sent to ${profile.business_phone}`);
            } catch (smsError) {
                console.error("❌ Failed to send SMS:", smsError);
            }
        }
      }
      
      return NextResponse.json({ status: 'Logged' }, { status: 200 });
    }

    // Default handler for other events
    return NextResponse.json({ message: 'Handled' });

  } catch (error: any) {
    console.error('🚨 Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}