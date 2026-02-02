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
    // 1. INCOMING CALL (Injecting the "Knowledge-First" Brain)
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
      let activePersona = 'tradie'; 
      
      // Default Context (Empty)
      let trainingContext = "No specific business details provided. Please take a detailed message.";

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

        // --- 🧠 CONSTRUCT KNOWLEDGE BASE (Aggressive Injection) ---
        // We structure this as a clear "Fact Sheet" for the AI
        if (profile) {
            trainingContext = `
            === 🟢 APPROVED BUSINESS KNOWLEDGE BASE 🟢 ===
            (You MUST use this information to answer customer questions)

            📍 BUSINESS NAME: ${businessName}
            
            📝 WHAT WE DO:
            ${profile.business_description || "General inquiries."}
            
            🕒 OPENING HOURS:
            ${profile.opening_hours || "Not specified. (If asked, say: 'I don't have the specific hours in front of me, but I can get the boss to confirm.')"}
            
            💰 SERVICES & PRICING:
            ${profile.services || "Pricing is available on request."}
            
            ❓ FREQUENTLY ASKED QUESTIONS (Q&A):
            ${profile.faqs || "No specific FAQs provided."}
            
            === 🔴 END OF KNOWLEDGE BASE 🔴 ===
            `;
        }

        if (assistantRecord.vapi_assistant_id) {
            assistantIdToUse = assistantRecord.vapi_assistant_id;
        }
      } 
      
      console.log(`✅ Injecting Name: ${businessName} | Persona: ${activePersona}`);
      console.log(`🧠 Context Length: ${trainingContext.length} chars`);

      // --- 🎭 PERSONA DEFINITIONS ---
      const personas = {
        'tradie': `
            # IDENTITY
            You are "Rab", a friendly, warm, and helpful Scottish receptionist for ${businessName}.
            Your accent is Scottish. Your vibe is "trusted local helper".
            
            # TONE & STYLE
            - **Friendly & Polite:** You are happy to help. Never rude.
            - **Phrasing:** Use natural Scottish/UK phrasing: "No bother at all", "I'll get that sorted for you", "Cheers", "Leave it with me".
            - **Professional:** Casual but respectful.
        `,
        'pro': `
            # IDENTITY
            You are "Claire", a polished, high-end executive receptionist for ${businessName}.
            Your vibe is "corporate professional".
            
            # TONE & STYLE
            - Use formal, polite phrasing: "Certainly", "One moment please", "I would be happy to help with that".
            - Be calm, reassuring, and precise.
        `,
        'coach': `
            # IDENTITY
            You are "Calum", an energetic and motivational front-desk assistant for ${businessName}.
            Your vibe is "personal trainer / dynamic creative".
            
            # TONE & STYLE
            - Use upbeat, high-energy phrasing: "Brilliant", "Let's get this sorted", "No worries at all", "100%".
            - Be enthusiastic but efficient.
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
            // Increased slightly to 0.4 to allow him to "read" the notes more naturally, 
            // but the instructions below are strict about facts.
            temperature: 0.4, 
            messages: [
              {
                role: "system",
                content: `
                ${selectedPersonaPrompt}
                
                # YOUR MAIN GOAL
                You are the front desk receptionist. Your job is to answer customer questions using the KNOWLEDGE BASE below, and take messages if you cannot help.
                
                ${trainingContext}

                # 🟢 INSTRUCTIONS (HOW TO USE THE DATA)
                1. **CHECK THE DATA FIRST:** If a customer asks "How much is X?" or "Are you open?", LOOK at the Knowledge Base above. 
                2. **ANSWER CONFIDENTLY:** If the answer is in the Knowledge Base, GIVE IT. You are authorized to quote prices and hours listed there. Do NOT say "I'll ask the boss" if the price is written right there.
                3. **BE HELPFUL:** If the user asks something vaguely related to the services listed, try to help based on the description.

                # 🔴 RESTRICTIONS (WHEN TO STOP)
                1. **MISSING INFO:** If the answer is *NOT* in the Knowledge Base, THEN say: "I don't have that specific detail to hand, but I'll get the boss to call you back with an answer."
                2. **LIVE DIARY:** If asked for a specific appointment slot (e.g. "Is 2pm free?"), say: "I don't have access to the live calendar, but I'll take your request and the team will confirm it shortly."
                3. **RECORDING:** If asked, confirm: "Yes, this call is recorded for quality purposes."
                4. **TEXTING:** Say "I'll pass this message on immediately." (Do not say "I will text them").

                # CONVERSATION FLOW
                1. Greeting: "Hi, thanks for calling ${businessName}, this is [Your Name]. How can I help?"
                2. Listen & Solve: If they have a question, answer it using the Knowledge Base.
                3. Take Details: If they want to book or need a callback, get their Name and Phone Number.
                4. Closing: "Thanks [Name], I've passed that on. Expect a call back shortly. [Sign off]!"
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