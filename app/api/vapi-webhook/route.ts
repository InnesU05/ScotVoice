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
    // 1. INCOMING CALL (The "Brain" Injection)
    // ==========================================
    if (message.type === 'assistant-request') {
      
      const calledNumber = message.call.phoneNumberId; 
      console.log(`📞 Incoming Call to: ${calledNumber}`);
      
      // A. FIND THE ASSISTANT (Step 1)
      const { data: assistantRecord, error: assistantError } = await supabaseAdmin
        .from('assistants')
        .select('user_id, active_voice_id, vapi_assistant_id')
        .eq('vapi_phone_number_id', calledNumber) 
        .single();

      if (assistantError || !assistantRecord) {
          console.error("🚨 CRITICAL: Could not find Assistant for this number:", calledNumber);
          // Return empty to let Vapi use default behavior (better than crashing)
          return NextResponse.json({ assistantId: null }); 
      }

      const userId = assistantRecord.user_id;
      const activePersona = assistantRecord.active_voice_id || 'tradie';

      // B. FIND THE PROFILE & TRAINING DATA (Step 2 - Separate Query is Safer)
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*') // Get everything including new training columns
        .eq('id', userId)
        .single();

      if (profileError) {
          console.error("🚨 Error fetching profile:", profileError);
      }

      // C. PREPARE THE DATA
      const businessName = profile?.business_name || "The Business";
      
      // --- 🛡️ MINUTE CAP SAFEGUARD ---
      const currentUsage = profile?.usage_minutes || 0;
      const usageLimit = profile?.monthly_usage_limit || 200;

      if (currentUsage >= usageLimit) {
          console.warn(`⛔ Limit Exceeded (${currentUsage}/${usageLimit}). Call rejected.`);
          return NextResponse.json({ error: "Monthly usage limit reached." }, { status: 403 });
      }

      // --- 🧠 CONSTRUCT KNOWLEDGE BASE ---
      // This is the "God Prompt" that overrides everything.
      const trainingContext = `
      === 🟢 BUSINESS KNOWLEDGE BASE (SOURCE OF TRUTH) 🟢 ===
      
      📍 BUSINESS NAME: ${businessName}
      
      📝 DESCRIPTION:
      ${profile?.business_description || "Not specified."}
      
      🕒 OPENING HOURS:
      ${profile?.opening_hours || "Not specified. If asked, say: 'I don't have the calendar in front of me, but I can get the boss to call you back.'"}
      
      💰 SERVICES & PRICING:
      ${profile?.services || "Not specified. Say: 'I can get the team to provide a quote.'"}
      
      ❓ FAQs (Specific Answers):
      ${profile?.faqs || "None."}
      
      === 🔴 END OF KNOWLEDGE BASE 🔴 ===
      `;

      console.log(`✅ Loaded Profile for: ${businessName}`);
      console.log(`🧠 Training Data Length: ${trainingContext.length} chars`);

      // --- 🎭 PERSONA DEFINITIONS ---
      const personas = {
        'tradie': `
            # IDENTITY
            You are "Rab", a friendly, warm, and helpful Scottish receptionist for ${businessName}.
            Your accent is Scottish. Your vibe is "trusted local helper".
            - **Phrasing:** "No bother at all", "I'll get that sorted", "Cheers".
        `,
        'pro': `
            # IDENTITY
            You are "Claire", a polished, high-end executive receptionist for ${businessName}.
            Your vibe is "corporate professional".
            - **Phrasing:** "Certainly", "One moment please", "I would be happy to help".
        `,
        'coach': `
            # IDENTITY
            You are "Calum", an energetic and motivational front-desk assistant for ${businessName}.
            Your vibe is "personal trainer / dynamic creative".
            - **Phrasing:** "Brilliant", "Let's get this sorted", "100%".
        `
      };

      const selectedPersonaPrompt = personas[activePersona as keyof typeof personas] || personas['tradie'];

      // --- D. RETURN THE RESPONSE (GHOST MODE) ---
      // 🚨 CRITICAL CHANGE: We do NOT send 'assistantId'. 
      // This forces Vapi to create a "Transient Assistant" using ONLY the config below.
      // This guarantees your Training Data is used.
      
      return NextResponse.json({
        assistant: {
          variableValues: {
            business_name: businessName,
          },
          model: {
            provider: "openai",
            model: "gpt-4o",
            temperature: 0.1, // Strict adherence to facts
            messages: [
              {
                role: "system",
                content: `
                ${selectedPersonaPrompt}
                
                # YOUR JOB
                You are the receptionist. You answer questions using the KNOWLEDGE BASE below.
                
                ${trainingContext}

                # RULES
                1. **USE THE KNOWLEDGE BASE:** If the caller asks about hours, prices, or services, CHECK the list above. If it's there, SAY IT.
                2. **NO WEBSITE REFERRALS:** Do NOT tell them to check a website. You are the source of info.
                3. **MISSING INFO:** If the info is NOT in the Knowledge Base, say: "I don't have that specific detail to hand, but I'll pass your question to the boss."
                4. **LIVE DIARY:** If asked for a specific date/time, say: "I don't have access to the live calendar, but I'll request a callback for you."
                5. **RECORDING:** Confirm call is recorded if asked.
                6. **TEXTING:** Say "I'll pass this on immediately" (don't say "I will text").

                # CONVERSATION
                1. Greeting: "Hi, thanks for calling ${businessName}, this is [Name]. How can I help?"
                2. Q&A: Answer using Knowledge Base.
                3. Lead: Get Name & Phone.
                4. Bye: "Thanks, expect a call back soon. Cheers!"
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
      });
    }

    // ==========================================
    // 2. END OF CALL REPORT (Logging & SMS)
    // ==========================================
    if (message.type === 'end-of-call-report') {
      const call = message.call;
      const analysis = message.analysis || {}; 
      const customerNumber = call.customer?.number || 'Unknown';
      
      // Fetch user again to get phone number for SMS
      const { data: assistantRecord } = await supabaseAdmin
        .from('assistants')
        .select('user_id')
        .eq('vapi_assistant_id', call.assistantId) 
        .maybeSingle();

      if (assistantRecord) {
        const userId = assistantRecord.user_id;
        
        // Fetch Profile for Usage & Phone
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('business_phone, usage_minutes')
            .eq('id', userId)
            .single();

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