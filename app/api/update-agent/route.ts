import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// --- 1. THE PERFECT PERSONAS (HOOROO STYLE) ---
const PERSONAS = {
  'tradie': {
    // Rab: Friendly, efficient, Scottish.
    voiceId: "s3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/jennifer/manifest.json", 
    provider: "playht",
    identity: `
      You are Rab, the friendly and efficient Scottish receptionist for {{business_name}}.
      **Vibe:** "No bother," "Cheers," "Aye." Warm but busy.
      **Job:** Take messages and filter calls. You are NOT a support tech. You take the info and pass it on.
    `
  },
  'pro': {
    // Claire: Polished, high-end.
    voiceId: "s3://voice-cloning-zero-shot/820da3d2-3a3b-42e7-844d-e68db835a206/jennifer/manifest.json", 
    provider: "playht",
    identity: `
      You are Claire, the executive receptionist for {{business_name}}.
      **Vibe:** Professional, crisp, concise. "Certainly," "Immediately."
      **Job:** Efficiently capture details and confirm the callback. Do not waste the caller's time.
    `
  },
  'coach': {
    // Calum: High energy.
    voiceId: "s3://voice-cloning-zero-shot/b5175513-3932-4874-9273-5499252c8033/jennifer/manifest.json", 
    provider: "playht",
    identity: `
      You are Calum, the front-desk lead for {{business_name}}.
      **Vibe:** "Awesome," "100%," "Let's go." Fast-paced.
      **Job:** Get the details, get them pumped for a callback, and end the call.
    `
  }
};

// --- 2. GENERATE THE SYSTEM PROMPT ---
function generateSystemPrompt(personaKey: string, profile: any) {
  const businessName = profile?.business_name || "The Business";
  const persona = PERSONAS[personaKey as keyof typeof PERSONAS] || PERSONAS['tradie'];
  
  let systemPrompt = persona.identity.replace(/{{business_name}}/g, businessName);

  systemPrompt += `
    \n\n=== 🟢 KNOWLEDGE BASE (TRUTH) 🟢 ===
    📍 BUSINESS: ${businessName}
    📝 DESCRIPTION: ${profile?.business_description || "Not specified."}
    🕒 HOURS: ${profile?.opening_hours || "Not listed. Do not guess."}
    💰 PRICES: ${profile?.services || "Pricing on request."}
    ❓ FAQs: ${profile?.faqs || "None."}
    
    # 🚨 CRITICAL RULES (DO NOT BREAK)
    1. **CALLER ID IS VISIBLE:** You can see the caller's number on your screen. **NEVER ASK** "Can I have your number?".
    2. **CONFIRMATION:** Instead say: "I've got your number here on the screen, I'll get the boss to ring you back on this."
    3. **NO GUESSING:** If a fact (price/hour) isn't in the Green Box, say: "I don't have that detail handy, but I'll ask the boss."
    4. **EFFICIENCY:** Keep answers short. Get the Name + Reason, then hang up.
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
    
    // B. PREPARE VAPI PAYLOAD
    const personaConfig = PERSONAS[targetVoiceId as keyof typeof PERSONAS] || PERSONAS['tradie'];
    const systemPrompt = generateSystemPrompt(targetVoiceId, profile);
    const businessName = profile?.business_name || "My Business";

    // This URL is where Vapi will send the "Assistant Request" and "End Call" events
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/vapi-webhook`;

    const vapiPayload = {
        name: `${targetVoiceId}_${businessName}`.substring(0, 40),
        // 1. The Brain
        model: {
            provider: "openai",
            model: "gpt-4o",
            temperature: 0.1, // Strict, factual, fast
            messages: [{ role: "system", content: systemPrompt }]
        },
        // 2. The Voice
        voice: {
            provider: personaConfig.provider,
            voiceId: personaConfig.voiceId,
        },
        // 3. The Connection (CRITICAL FIX)
        // This ensures Vapi ALWAYS talks to your webhook
        serverUrl: webhookUrl,
        
        // 4. Settings
        transcriber: {
            provider: "deepgram",
            model: "nova-2",
            language: "en-GB", // Critical for understanding Scots
            smartFormatting: true
        }
    };

    // C. PUSH TO VAPI
    let vapiIdToUpdate = record.vapi_assistant_id;

    if (!vapiIdToUpdate) {
        // Create New
        const createRes = await fetch('https://api.vapi.ai/assistant', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(vapiPayload)
        });
        const newAgent = await createRes.json();
        vapiIdToUpdate = newAgent.id;
        
        // Link Number
        await fetch(`https://api.vapi.ai/phone-number/${record.vapi_phone_number_id}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ assistantId: vapiIdToUpdate })
        });
    } else {
        // Update Existing (Self-Healing)
        await fetch(`https://api.vapi.ai/assistant/${vapiIdToUpdate}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(vapiPayload)
        });
    }

    // D. UPDATE DB
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