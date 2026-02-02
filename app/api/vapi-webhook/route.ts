import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message;

    console.log(`📣 Vapi Event: ${message.type}`);

    // ==========================================
    // 1. INCOMING CALL (Inject Training Data)
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
        // We build a text block to feed into the AI's system prompt
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
      console.log(`🧠 Injecting Context Length: ${trainingContext.length} chars`);

      return NextResponse.json({
        assistantId: assistantIdToUse,
        assistant: {
          variableValues: {
            business_name: businessName,
          },
          // 💉 INJECT TRAINING DATA INTO SYSTEM PROMPT
          model: {
            messages: [
              {
                role: "system",
                content: `You are the AI receptionist for ${businessName}. 
                
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
    // 2. END OF CALL REPORT (Logging)
    // ==========================================
    if (message.type === 'end-of-call-report') {
      const call = message.call;
      const analysis = message.analysis || {}; 
      
      console.log(`📞 Call Ended. ID: ${call.id}`);

      // A. Find the User
      const { data: assistantRecord } = await supabaseAdmin
        .from('assistants')
        .select('user_id')
        .eq('vapi_assistant_id', call.assistantId) 
        .maybeSingle();

      if (assistantRecord) {
        // B. Save to 'calls' table
        await supabaseAdmin.from('calls').insert({
            user_id: assistantRecord.user_id,
            assistant_id: call.assistantId,
            customer_number: call.customer?.number || 'Unknown',
            status: message.endedReason || 'completed',
            duration_seconds: Math.round(message.durationSeconds || 0),
            summary: analysis.summary || "No summary provided.",
            recording_url: message.recordingUrl || null,
            started_at: call.startedAt || new Date().toISOString()
        });

        // C. Update Usage
        const durationMinutes = (message.durationSeconds || 0) / 60;
        const { data: profile } = await supabaseAdmin.from('profiles').select('usage_minutes').eq('id', assistantRecord.user_id).single();
        const newUsage = (profile?.usage_minutes || 0) + durationMinutes;
        await supabaseAdmin.from('profiles').update({ usage_minutes: newUsage }).eq('id', assistantRecord.user_id);
        
        console.log(`⏱️ Usage Updated: +${durationMinutes.toFixed(2)} mins.`);
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