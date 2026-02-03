import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// 1. DEFINE THE TEMPLATES (The "Soul")
// We use these base instructions but inject the user's data into them.
const PERSONAS = {
  'tradie': {
    voiceId: "s3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/jennifer/manifest.json", // Rab's Voice
    provider: "playht",
    basePrompt: `
      You are Rab, a friendly, efficient Scottish receptionist for {{business_name}}.
      **Style:** Casual, warm, Scottish ("No bother", "Cheers").
      **Rule:** You ALREADY see the caller's number. NEVER ask for it. Say "I've got your number on the screen."
    `
  },
  'pro': {
    voiceId: "s3://voice-cloning-zero-shot/820da3d2-3a3b-42e7-844d-e68db835a206/jennifer/manifest.json", // Claire's Voice
    provider: "playht",
    basePrompt: `
      You are Claire, a professional executive receptionist for {{business_name}}.
      **Style:** Polished, crisp, efficient.
      **Rule:** You ALREADY see the caller's number. NEVER ask for it. Say "I have your details captured."
    `
  },
  'coach': {
    voiceId: "s3://voice-cloning-zero-shot/b5175513-3932-4874-9273-5499252c8033/jennifer/manifest.json", // Calum's Voice
    provider: "playht",
    basePrompt: `
      You are Calum, a high-energy front-desk lead for {{business_name}}.
      **Style:** Upbeat, fast, motivating.
      **Rule:** You ALREADY see the caller's number. NEVER ask for it. Say "I've locked in your number."
    `
  }
};

// 2. HELPER: MERGE DATA INTO PROMPT
function generateSystemPrompt(personaKey: string, profile: any) {
  const businessName = profile?.business_name || "The Business";
  const persona = PERSONAS[personaKey as keyof typeof PERSONAS] || PERSONAS['tradie'];
  
  let systemPrompt = persona.basePrompt.replace(/{{business_name}}/g, businessName);

  systemPrompt += `
    \n\n=== 🟢 KNOWLEDGE BASE 🟢 ===
    📍 BUSINESS: ${businessName}
    📝 ABOUT: ${profile?.business_description || "Not specified."}
    🕒 HOURS: ${profile?.opening_hours || "Not listed. Do not guess."}
    💰 PRICES: ${profile?.services || "Pricing on request."}
    ❓ FAQs: ${profile?.faqs || "None."}
    
    # YOUR JOB
    1. Answer questions using the Knowledge Base.
    2. If they want to book/leave a message: "I'll grab your details and get the boss to call you back."
    3. CONFIRM (Don't Ask) Number: "I'll use the number on the display to call you back."
    4. Hang up efficiently.
  `;
  return systemPrompt;
}

export async function POST(req: Request) {
  try {
    const { userId, action, payload } = await req.json();

    // A. GET DATA
    const { data: record } = await supabaseAdmin
      .from('assistants')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!record) throw new Error('No assistant record found');

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const currentVoiceId = record.active_voice_id || 'tradie';
    const targetVoiceId = (action === 'switch_voice') ? payload.voiceId : currentVoiceId;
    
    // B. PREPARE VAPI CONFIG
    // This is the "Native Config" we push to Vapi.
    const personaConfig = PERSONAS[targetVoiceId as keyof typeof PERSONAS] || PERSONAS['tradie'];
    const systemPrompt = generateSystemPrompt(targetVoiceId, profile);
    const businessName = profile?.business_name || "My Business";

    const vapiPayload = {
        name: `${targetVoiceId}_${businessName}`.substring(0, 40),
        // 1. The Brain (Native Vapi Model)
        model: {
            provider: "openai",
            model: "gpt-4o",
            temperature: 0.1, // Keep it smart and strictly factual
            messages: [{ role: "system", content: systemPrompt }]
        },
        // 2. The Voice (Native Vapi Voice)
        voice: {
            provider: personaConfig.provider,
            voiceId: personaConfig.voiceId,
        },
        // 3. The Ears (Native Transcriber - Optimized for Accents)
        transcriber: {
            provider: "deepgram",
            model: "nova-2",
            language: "en-GB", // CRITICAL for Scottish accents
            smartFormatting: true,
        },
        // 4. The Wiring (CRITICAL: Tells Vapi where to send logs)
        serverUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/vapi-webhook`,
        serverUrlSecret: "my-secret-token" // Optional security
    };

    // C. EXECUTE UPDATE OR CREATE
    // We always "Update" the existing assistant ID if it exists. 
    // If we are switching, we update the existing assistant's settings to the new persona.
    // This PREVENTS Zombie IDs because the ID stays the same!
    
    let vapiIdToUpdate = record.vapi_assistant_id;

    // If for some reason we don't have an ID, or it's invalid, we create one.
    if (!vapiIdToUpdate) {
        const createRes = await fetch('https://api.vapi.ai/assistant', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(vapiPayload)
        });
        const newAgent = await createRes.json();
        vapiIdToUpdate = newAgent.id;
        
        // Link to phone number
        await fetch(`https://api.vapi.ai/phone-number/${record.vapi_phone_number_id}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ assistantId: vapiIdToUpdate })
        });
    } else {
        // Update existing ID with new Brain/Voice
        await fetch(`https://api.vapi.ai/assistant/${vapiIdToUpdate}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(vapiPayload)
        });
    }

    // D. SAVE TO DB
    await supabaseAdmin
        .from('assistants')
        .update({ 
            active_voice_id: targetVoiceId,
            vapi_assistant_id: vapiIdToUpdate 
        })
        .eq('id', record.id);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}