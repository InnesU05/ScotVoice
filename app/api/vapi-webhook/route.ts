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
    // 1. INCOMING CALL (Injecting the "Perfect" Brain)
    // ==========================================
    if (message.type === 'assistant-request') {
      
      const calledNumber = message.call.phoneNumberId; 
      
      // Look up business info + TRAINING DATA + ACTIVE VOICE
      const { data: assistantRecord, error } = await supabaseAdmin
        .from('assistants')
        .select(`
          vapi_assistant_id,
          user_id,
          active_voice_id,
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
      let assistantIdToUse: string | null = null; 
      
      let trainingContext = "No specific business details provided. Take a message.";
      let activePersona = 'tradie'; 

      if (!error && assistantRecord) {
        const profile = assistantRecord.profiles as any;
        businessName = profile?.business_name || "The Business";
        activePersona = assistantRecord.active_voice_id || 'tradie';
        
        // --- 🛡️ MINUTE CAP SAFEGUARD ---
        const currentUsage = profile?.usage_minutes || 0;
        const usageLimit = profile?.monthly_usage_limit || 200;

        if (currentUsage >= usageLimit) {
            console.warn(`⛔ Limit Exceeded (${currentUsage}/${usageLimit}). Call rejected.`);
            return NextResponse.json({ error: "Monthly usage limit reached." }, { status: 403 });
        }

        // --- 🧠 CONSTRUCT KNOWLEDGE BASE ---
        if (profile) {
            // We build this string to be extremely clear for the AI
            trainingContext = `
            == BUSINESS KNOWLEDGE BASE (USE THIS DATA) ==
            BUSINESS NAME: ${businessName}
            
            ${profile.business_description ? `[WHAT WE DO]:\n${profile.business_description}` : ''}
            
            ${profile.opening_hours ? `[OPENING HOURS]:\n${profile.opening_hours}` : '[OPENING HOURS]: Not specified. Do NOT guess.'}
            
            ${profile.services ? `[SERVICES & PRICING]:\n${profile.services}` : ''}
            
            ${profile.faqs ? `[SPECIFIC Q&A / FAQs]:\n${profile.faqs}` : ''}
            ==============================================
            `;
        }

        if (assistantRecord.vapi_assistant_id) {
            assistantIdToUse = assistantRecord.vapi_assistant_id;
        }
      } 
      
      console.log(`✅ Injecting Name: ${businessName} | Persona: ${activePersona}`);

      // --- 🎭 PERSONA DEFINITIONS (Optimized for Politeness) ---
      const personas = {
        'tradie': `
            # IDENTITY
            You are "Rab", a friendly, warm, and helpful Scottish receptionist for ${businessName}.
            Your accent is Scottish. Your vibe is "trusted local helper".
            
            # TONE & STYLE
            - **Friendly & Polite:** You are NOT rude. You are happy to help.
            - **Phrasing:** Use natural Scottish/UK phrasing: "No bother at all", "I'll get that sorted for you", "Cheers", "Leave it with me".
            - **Professional:** You are casual but respectful. Treat every caller like a valued customer.
        `,
        'pro': `
            # IDENTITY
            You are "Claire", a polished, high-end executive receptionist for ${businessName}.
            Your vibe is "corporate professional".
            
            # TONE & STYLE
            - Use formal, polite phrasing: "Certainly", "One moment please", "I would be happy to help with that".
            - Be calm, reassuring, and precise.
            - Never use slang.
        `,
        'coach': `
            # IDENTITY
            You are "Calum", an energetic and motivational front-desk assistant for ${businessName}.
            Your vibe is "personal trainer / dynamic creative".
            
            # TONE & STYLE
            - Use upbeat, high-energy phrasing: "Brilliant", "Let's get this sorted", "No worries at all", "100%".
            - Be enthusiastic but efficient. Keep the momentum going.
        `
      };

      const selectedPersonaPrompt = personas[activePersona as keyof typeof personas] || personas['tradie'];

      // --- CONSTRUCT RESPONSE ---
      const responsePayload: any = {
        assistant: {
          variableValues: {
            business_name: businessName,
          },
          model: {
            provider: "openai",
            model: "gpt-4o",
            temperature: 0.2, 
            messages: [
              {
                role: "system",
                content: `
                ${selectedPersonaPrompt}
                
                # YOUR GOAL
                Answer calls, answer basic questions using ONLY the Knowledge Base below, and take detailed messages for the boss.
                
                ${trainingContext}

                # CRITICAL RULES (DO NOT BREAK)
                1. **CONSULT KNOWLEDGE BASE FIRST:** Before answering any question about hours, prices, or services, CHECK the Knowledge Base above. If the answer is there, USE IT.
                2. **NO HALLUCINATIONS:** If the answer is NOT in the Knowledge Base, DO NOT GUESS. Say: "I don't have that specific information right here, but I'll get the boss to call you back with the details."
                3. **DIARY CHECK:** If asked for a specific time/date (e.g., "Can you do Tuesday?"), say: "I don't have access to the live diary, but I'll grab your details and get the team to call you back to confirm."
                4. **RECORDING:** If asked, confirm: "Yes, this call is recorded for quality purposes."
                5. **TEXTING:** Say "I'll pass this message on immediately." (Do not say "I will text them").
                6. **CURRENT TIME:** The current time is ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}.

                # CONVERSATION FLOW
                1. Greeting: "Hi, thanks for calling ${businessName}, this is [Your Name]. How can I help?"
                2. Filter: If SPAM/SALES -> "Not interested, thanks" -> Hang up.
                3. Lead: Get Name, Phone, and Job Details.
                4. Closing: "Thanks [Name], I've sent that info to the boss. Expect a call back shortly. [Sign off phrase based on persona]!"
                `
              }
            ]
          },
          transcriber: {
            provider: "deepgram",
            model: "nova-2",
            language: "en-GB",
            endpointing: 300
          }
        }
      };

      // Attach ID if available (Persistent), otherwise transient
      if (assistantIdToUse) {
          responsePayload.assistantId = assistantIdToUse;
      }

      return NextResponse.json(responsePayload);
    }

    // ==========================================
    // 2. END OF CALL REPORT (Logging & SMS)
    // ==========================================
    if (message.type === 'end-of-call-report') {
      const call = message.call;
      const analysis = message.analysis || {}; 
      const customerNumber = call.customer?.number || 'Unknown';
      
      console.log(`📞 Call Ended. ID: ${call.id}`);

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

        // Save Call
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
        const newUsage = (profile?.usage_minutes || 0) + durationMinutes;
        
        await supabaseAdmin
            .from('profiles')
            .update({ usage_minutes: newUsage })
            .eq('id', userId);
        
        console.log(`⏱️ Usage Updated: +${durationMinutes.toFixed(2)} mins.`);

        // SEND SMS
        if (profile?.business_phone && analysis.summary) {
            try {
                await twilioClient.messages.create({
                    body: `NessDial Alert 📞\nCall from: ${customerNumber}\n\nSummary: ${analysis.summary}`,
                    from: process.env.TWILIO_PHONE_NUMBER,
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

    return NextResponse.json({ message: 'Handled' });

  } catch (error: any) {
    console.error('🚨 Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}