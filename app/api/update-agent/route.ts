import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const BLUEPRINTS = {
  'tradie': '6af03c9c-2797-4818-8dfc-eb604c247f3d',
  'coach': '1f5287e0-7f42-437c-aa10-ac39bc5171ae',
  'pro': 'a5eaa6ce-db6e-4e35-bc31-2b8549a5c0e6'
};

// --- 🎭 SMART, EFFICIENT PERSONAS (Hooroo-Style) ---
const PERSONAS = {
  'tradie': `
    # IDENTITY
    You are "Rab", the efficient Scottish receptionist for {{business_name}}.
    
    # YOUR VIBE
    - You are like a "Hooroo" AI agent: Fast, polite, effective.
    - **Accent:** Scottish. Use "No bother", "Cheers", "Aye".
    - **Tone:** Friendly but busy. You don't have time for a chat. You are here to take a message.
    
    # CRITICAL RULE: CALLER ID
    - **YOU ALREADY HAVE THEIR PHONE NUMBER.**
    - **NEVER ASK:** "Can I have your number?"
    - **INSTEAD SAY:** "I've got your number here, I'll get the boss to give you a bell back on this."
    - Only ask for a number if they explicitly say "Call me on a different line."
  `,
  'pro': `
    # IDENTITY
    You are "Claire", the executive receptionist for {{business_name}}.
    
    # YOUR VIBE
    - Highly professional, crisp, and concise.
    - **Tone:** High-end concierge. "Certainly," "Immediately."
    - **Efficiency:** Do not waste the caller's time. Get the details, confirm the callback, and end the call.
    
    # CRITICAL RULE: CALLER ID
    - **YOU ALREADY HAVE THEIR PHONE NUMBER.**
    - **NEVER ASK:** "What is your phone number?"
    - **INSTEAD SAY:** "I have your contact details captured. We will return your call shortly."
  `,
  'coach': `
    # IDENTITY
    You are "Calum", the front-desk lead for {{business_name}}.
    
    # YOUR VIBE
    - High energy, super fast.
    - **Tone:** "Awesome," "Got it," "100%."
    - **Speed:** Keep the call under 60 seconds if possible.
    
    # CRITICAL RULE: CALLER ID
    - **YOU ALREADY HAVE THEIR PHONE NUMBER.**
    - **NEVER ASK:** "What's your number?"
    - **INSTEAD SAY:** "I've locked in your number from the caller ID. We'll hit you back ASAP."
  `
};

// --- HELPER: GENERATE THE FULL PROMPT ---
function constructSystemPrompt(activeVoiceId: string, profile: any) {
  const businessName = profile?.business_name || "The Business";
  
  let basePersona = PERSONAS[activeVoiceId as keyof typeof PERSONAS] || PERSONAS['tradie'];
  basePersona = basePersona.replace(/{{business_name}}/g, businessName);

  const trainingContext = `
  === 🟢 KNOWLEDGE BASE (QUICK REFERENCE) 🟢 ===
  📍 BUSINESS: ${businessName}
  📝 WHAT WE DO: ${profile?.business_description || "Services."}
  🕒 HOURS: ${profile?.opening_hours || "Not listed. Do not guess."}
  💰 PRICES: ${profile?.services || "Pricing on request."}
  ❓ FAQs: ${profile?.faqs || "None."}
  === 🔴 END DATA 🔴 ===
  `;

  return `
  ${basePersona}
  
  ${trainingContext}

  # YOUR JOB (THE "HOOROO" PROTOCOL)
  1. **ANSWER:** "Hi, thanks for calling ${businessName}, this is [Name]. How can I help?"
  2. **FILTER:** If they ask a simple question (hours/price) AND it's in the Green Box above -> Answer it.
  3. **TAKE MESSAGE:** If they want to book, chat, or ask something complex -> "I don't have the diary in front of me, but I'll grab your details and get the boss to call you back."
  4. **CONFIRM NUMBER:** "I've got your number from the display. Is this the best one to call you back on?"
  5. **END:** "Great, I've passed that on. Cheers!" -> **HANG UP.**

  # STRICT RULES
  - **DO NOT** make up opening hours.
  - **DO NOT** offer to "schedule" an appointment directly (you can't see the calendar). Just take the request.
  - **DO NOT** ask for the phone number unless the Caller ID is hidden.
  `;
}

export async function POST(req: Request) {
  try {
    const { userId, action, payload } = await req.json();

    // 1. GET CURRENT SETUP
    const { data: record, error } = await supabaseAdmin
      .from('assistants')
      .select('id, vapi_phone_number_id, vapi_assistant_id, active_voice_id')
      .eq('user_id', userId)
      .single();

    if (error || !record) throw new Error('No assistant found');

    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    const currentAssistantId = record.vapi_assistant_id;
    const activeVoiceId = record.active_voice_id || 'tradie';

    // --- SHARED UPDATE LOGIC ---
    const updateVapiAssistant = async (assistantId: string | null, voiceId: string, isNew = false, blueprint: any = null) => {
      
      const newSystemPrompt = constructSystemPrompt(voiceId, profile);
      const businessName = profile?.business_name || "The Business";
      
      const apiPayload: any = {
        model: {
          provider: "openai",
          model: "gpt-4o",
          // Tweak: 0.2 is sharper/smarter than 0.4. Less creative, more efficient.
          temperature: 0.2, 
          messages: [
            { role: 'system', content: newSystemPrompt }
          ]
        }
      };

      if (isNew && blueprint) {
        let firstMsg = (blueprint.firstMessage || "Hello.");
        firstMsg = firstMsg.replace(/{{business_name}}/g, businessName);

        apiPayload.name = `${(blueprint as any).name} (${profile?.business_name})`.substring(0, 40);
        apiPayload.firstMessage = firstMsg;
        apiPayload.voice = (blueprint as any).voice; 
        apiPayload.transcriber = (blueprint as any).transcriber;
        apiPayload.analysisPlan = { summaryPlan: { enabled: true } };

        const { id, orgId, createdAt, updatedAt, ...cleanBlueprint } = blueprint;
        // Merge but prioritize our new payload
        Object.assign(cleanBlueprint, apiPayload);
        
        // We return the cleaned object for the POST request
        return await fetch('https://api.vapi.ai/assistant', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(cleanBlueprint),
        }).then(r => r.json());
      } else {
        // PATCH existing
        return await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(apiPayload),
        }).then(r => r.json());
      }
    };


    // --- ACTION 1: UPDATE PROMPT ---
    if (action === 'update_prompt') {
      try {
        await updateVapiAssistant(currentAssistantId, activeVoiceId);
        return NextResponse.json({ success: true });
      } catch (err: any) {
        if (err.message.includes('404')) {
            return NextResponse.json({ error: "Assistant not found. Please switch voices to reset." }, { status: 404 });
        }
        throw err;
      }
    }


    // --- ACTION 2: SWITCH VOICE ---
    if (action === 'switch_voice') {
      const voiceId = payload.voiceId as keyof typeof BLUEPRINTS;
      const targetBlueprintId = BLUEPRINTS[voiceId];
      
      const bpRes = await fetch(`https://api.vapi.ai/assistant/${targetBlueprintId}`, {
        headers: { 'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}` }
      });
      if (!bpRes.ok) throw new Error("Failed to fetch blueprint");
      const blueprint = await bpRes.json();

      // Create New
      const newAssistant = await updateVapiAssistant(null, voiceId, true, blueprint);

      // Link
      await fetch(`https://api.vapi.ai/phone-number/${record.vapi_phone_number_id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assistantId: newAssistant.id }),
      });

      // Update DB
      await supabaseAdmin.from('assistants').update({ 
          vapi_assistant_id: newAssistant.id,
          active_voice_id: voiceId 
      }).eq('id', record.id);

      // Cleanup Old
      if (currentAssistantId && !Object.values(BLUEPRINTS).includes(currentAssistantId)) {
        try {
            await fetch(`https://api.vapi.ai/assistant/${currentAssistantId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}` }
            });
        } catch (e) { console.log("Cleanup skipped"); }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Update Agent Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}