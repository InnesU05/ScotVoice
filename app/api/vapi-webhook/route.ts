import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import twilio from 'twilio';

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message;

    // --- 1. INCOMING CALL (DEBUG MODE) ---
    if (message.type === 'assistant-request') {
      
      const calledNumber = message.call.phoneNumberId; 
      console.log(`📞 INCOMING CALL from Vapi. ID: ${calledNumber}`);

      // DEBUG: Let's see if this ID actually exists in your DB
      const { data: debugCheck } = await supabaseAdmin
        .from('assistants')
        .select('id, user_id')
        .eq('vapi_phone_number_id', calledNumber);
      
      console.log(`🔍 DB LOOKUP RESULT for ${calledNumber}:`, debugCheck);

      if (!debugCheck || debugCheck.length === 0) {
          console.error("🚨 CRITICAL: The Vapi Phone ID does not match any 'vapi_phone_number_id' in your 'assistants' table!");
          console.error("This is why the AI is untrained. It falls back to default.");
      }

      // ... Continue with normal lookup ...
      const { data: assistantRecord, error } = await supabaseAdmin
        .from('assistants')
        .select(`
          vapi_assistant_id,
          active_voice_id,
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
      let assistantIdToUse = "6af03c9c-2797-4818-8dfc-eb604c247f3d"; 
      let trainingContext = "No specific business details provided. Take a message.";
      let activePersona = 'tradie'; 

      if (!error && assistantRecord) {
        const profile = assistantRecord.profiles as any;
        businessName = profile?.business_name || "The Business";
        activePersona = assistantRecord.active_voice_id || 'tradie';
        
        console.log(`✅ FOUND USER: ${businessName}`);
        console.log(`🧠 OPENING HOURS: ${profile.opening_hours || 'Empty'}`);

        // --- 🛡️ MINUTE CAP SAFEGUARD ---
        const currentUsage = profile?.usage_minutes || 0;
        const usageLimit = profile?.monthly_usage_limit || 200;

        if (currentUsage >= usageLimit) {
            console.warn(`⛔ Limit Exceeded (${currentUsage}/${usageLimit}). Call rejected.`);
            return NextResponse.json({ error: "Monthly usage limit reached." }, { status: 403 });
        }

        // --- 🧠 CONSTRUCT KNOWLEDGE BASE ---
        if (profile) {
            trainingContext = `
            BUSINESS NAME: ${businessName}
            
            ${profile.business_description ? `WHAT WE DO:\n${profile.business_description}` : ''}
            
            ${profile.opening_hours ? `OPENING HOURS:\n${profile.opening_hours}` : 'OPENING HOURS: Not specified. Do NOT guess.'}
            
            ${profile.services ? `SERVICES & PRICING:\n${profile.services}` : ''}
            
            ${profile.faqs ? `SPECIFIC Q&A (FAQs):\n${profile.faqs}` : ''}
            `;
        }

        if (assistantRecord.vapi_assistant_id) {
            assistantIdToUse = assistantRecord.vapi_assistant_id;
        }
      } else {
          console.log("⚠️ USING FALLBACK PROMPT (Untrained)");
      }

      // --- 🎭 PERSONA DEFINITIONS ---
      const personas = {
        'tradie': `
            # IDENTITY
            You are "Rab", a friendly, grounded, and no-nonsense Scottish receptionist for ${businessName}.
            
            # TONE & STYLE
            - Use natural Scottish/UK phrasing: "No bother", "I'll get that sorted", "Cheers", "Leave it with me".
            - Be efficient but warm. Don't be rude, just be direct.
        `,
        'pro': `
            # IDENTITY
            You are "Claire", a polished, high-end executive receptionist for ${businessName}.
            
            # TONE & STYLE
            - Use formal, polite phrasing: "Certainly", "One moment please", "I would be happy to help with that".
            - Be calm, reassuring, and precise.
        `,
        'coach': `
            # IDENTITY
            You are "Calum", an energetic and motivational front-desk assistant for ${businessName}.
            
            # TONE & STYLE
            - Use upbeat, high-energy phrasing: "Brilliant", "Let's get this sorted", "No worries at all", "100%".
        `
      };

      const selectedPersonaPrompt = personas[activePersona as keyof typeof personas] || personas['tradie'];

      return NextResponse.json({
        assistantId: assistantIdToUse,
        assistant: {
          variableValues: { business_name: businessName },
          model: {
            provider: "openai",
            model: "gpt-4o",
            temperature: 0.1, // Even stricter
            messages: [
              {
                role: "system",
                content: `
                ${selectedPersonaPrompt}
                
                # YOUR GOAL
                Answer calls, answer basic questions using ONLY the Knowledge Base below, and take detailed messages for the boss.
                
                # KNOWLEDGE BASE (THE ONLY TRUTH)
                ${trainingContext}

                # CRITICAL RULES (DO NOT BREAK)
                1. **NO HALLUCINATIONS:** You are an interface to the database above. If the answer is not there, SAY "I don't have that specific information right now." Do NOT make up opening hours (like 9-5) if they aren't listed.
                2. **DIARY CHECK:** If asked for a specific time/date (e.g., "Can you do Tuesday?"), say: "I don't have access to the live diary, but I'll grab your details and get the team to call you back to confirm."
                3. **RECORDING:** If asked, confirm: "Yes, this call is recorded for quality purposes."
                4. **TEXTING:** Say "I'll pass this message on immediately." (Do not say "I will text them").
                5. **CURRENT TIME:** The current time is ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}.

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
      });
    }

    // --- 2. END OF CALL REPORT (Logging) ---
    if (message.type === 'end-of-call-report') {
        // ... (Keep existing logging logic from previous step) ...
        // I've shortened this just for the snippet, but keep the full logic from before!
        // Just verify the console logs appear.
        return NextResponse.json({ status: 'Logged' }, { status: 200 });
    }

    return NextResponse.json({ message: 'Handled' });

  } catch (error: any) {
    console.error('🚨 Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}