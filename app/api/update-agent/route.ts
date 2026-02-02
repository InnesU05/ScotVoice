import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const BLUEPRINTS = {
  'tradie': '6af03c9c-2797-4818-8dfc-eb604c247f3d',
  'coach': '1f5287e0-7f42-437c-aa10-ac39bc5171ae',
  'pro': 'a5eaa6ce-db6e-4e35-bc31-2b8549a5c0e6'
};

const PERSONAS = {
  'tradie': `
    # IDENTITY
    You are "Rab", a friendly, warm, and helpful Scottish receptionist for {{business_name}}.
    Your accent is Scottish. Your vibe is "trusted local helper".
    - **Phrasing:** Use natural Scottish/UK phrasing: "No bother at all", "I'll get that sorted for you", "Cheers".
    - **Tone:** Casual but professional. Never rude.
  `,
  'pro': `
    # IDENTITY
    You are "Claire", a polished, high-end executive receptionist for {{business_name}}.
    - **Phrasing:** "Certainly", "One moment please", "I would be happy to help with that".
    - **Tone:** Formal, calm, reassuring.
  `,
  'coach': `
    # IDENTITY
    You are "Calum", an energetic and motivational front-desk assistant for {{business_name}}.
    - **Phrasing:** "Brilliant", "Let's get this sorted", "100%".
    - **Tone:** Upbeat, high-energy.
  `
};

// --- HELPER: GENERATE THE FULL PROMPT ---
function constructSystemPrompt(activeVoiceId: string, profile: any) {
  const businessName = profile?.business_name || "The Business";
  
  // Get the base personality (Rab, Claire, etc.)
  let basePersona = PERSONAS[activeVoiceId as keyof typeof PERSONAS] || PERSONAS['tradie'];
  basePersona = basePersona.replace(/{{business_name}}/g, businessName);

  const trainingContext = `
  === 🟢 BUSINESS KNOWLEDGE BASE (SOURCE OF TRUTH) 🟢 ===
  📍 BUSINESS NAME: ${businessName}
  
  📝 DESCRIPTION:
  ${profile?.business_description || "Not specified."}
  
  🕒 OPENING HOURS:
  ${profile?.opening_hours || "Not specified. Do not guess."}
  
  💰 SERVICES & PRICING:
  ${profile?.services || "Pricing available on request. Do not guess."}
  
  ❓ FAQs:
  ${profile?.faqs || "None."}
  === 🔴 END OF KNOWLEDGE BASE 🔴 ===
  `;

  return `
  ${basePersona}
  
  ${trainingContext}

  # CRITICAL RULES
  1. **USE KNOWLEDGE BASE:** For hours, prices, or services, CHECK the list above. If present, state it.
  2. **NO GUESSING:** If info is missing, say "I don't have that detail handy, but I'll ask the boss."
  3. **DIARY:** If asked for dates, say "I don't have access to the live calendar, but I'll request a callback."
  4. **RECORDING:** Confirm call is recorded if asked.
  5. **TEXTING:** Say "I'll pass this on immediately."
  `;
}

export async function POST(req: Request) {
  try {
    const { userId, action, payload } = await req.json();

    // 1. GET CURRENT SETUP & PROFILE
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

    // --- CASE 1: UPDATE PROMPT (User clicked Save in Training) ---
    if (action === 'update_prompt') {
      // 1. Generate the new "Baked" prompt
      const newSystemPrompt = constructSystemPrompt(activeVoiceId, profile);

      // 2. Push to Vapi
      await fetch(`https://api.vapi.ai/assistant/${currentAssistantId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: {
            // We use GPT-4o for intelligence
            provider: "openai",
            model: "gpt-4o",
            temperature: 0.1, 
            messages: [
              { role: 'system', content: newSystemPrompt }
            ]
          }
        }),
      });

      return NextResponse.json({ success: true });
    }

    // --- CASE 2: SWITCH VOICE (New Agent + Bake Training) ---
    if (action === 'switch_voice') {
      const voiceId = payload.voiceId as keyof typeof BLUEPRINTS;
      const targetBlueprintId = BLUEPRINTS[voiceId];
      if (!targetBlueprintId) throw new Error('Invalid Voice ID');

      // Fetch Blueprint to get voice settings (speed, voice ID, etc.)
      const bpRes = await fetch(`https://api.vapi.ai/assistant/${targetBlueprintId}`, {
        headers: { 'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}` }
      });
      const blueprint = await bpRes.json();

      // BAKE TRAINING DATA IN IMMEDIATELY
      const newSystemPrompt = constructSystemPrompt(voiceId, profile);
      
      let firstMessage = blueprint.firstMessage || "";
      firstMessage = firstMessage.replace(/{{business_name}}/g, profile?.business_name || "The Business");

      const safeName = `${blueprint.name} (${profile?.business_name})`.substring(0, 40);

      // Create new assistant with OUR prompt (ignoring blueprint prompt)
      const createRes = await fetch('https://api.vapi.ai/assistant', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...blueprint,
          name: safeName,
          firstMessage: firstMessage,
          model: {
            provider: "openai",
            model: "gpt-4o",
            temperature: 0.1,
            messages: [
              { role: 'system', content: newSystemPrompt }
            ]
          },
          analysisPlan: { summaryPlan: { enabled: true } },
          id: undefined, orgId: undefined, createdAt: undefined, updatedAt: undefined, isServerUrlSecretSet: undefined
        }),
      });

      if (!createRes.ok) throw new Error(await createRes.text());
      const newAssistant = await createRes.json();

      await fetch(`https://api.vapi.ai/phone-number/${record.vapi_phone_number_id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assistantId: newAssistant.id }),
      });

      await supabaseAdmin.from('assistants').update({ 
          vapi_assistant_id: newAssistant.id,
          active_voice_id: voiceId 
      }).eq('id', record.id);

      // Cleanup Old Assistant
      if (currentAssistantId && !Object.values(BLUEPRINTS).includes(currentAssistantId)) {
        try {
            await fetch(`https://api.vapi.ai/assistant/${currentAssistantId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}` }
            });
        } catch (e) { console.error(e); }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}