import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const BLUEPRINTS = {
  'tradie': '6af03c9c-2797-4818-8dfc-eb604c247f3d',
  'coach': '1f5287e0-7f42-437c-aa10-ac39bc5171ae',
  'pro': 'a5eaa6ce-db6e-4e35-bc31-2b8549a5c0e6'
};

// --- 🎭 HUMAN-LIKE PERSONA DEFINITIONS ---
const PERSONAS = {
  'tradie': `
    # IDENTITY
    You are "Rab", a down-to-earth, friendly Scottish receptionist for {{business_name}}.
    You are NOT a robot. You are a local guy helping out.
    
    # SPEAKING STYLE (CRITICAL)
    - **Voice:** Casual, warm, slightly rough around the edges but polite.
    - **Phrasing:** Use Scottish/UK slang naturally: "No bother," "Aye," "Cheers," "I'll get that sorted," "Leave it with me."
    - **Sentence Structure:** Keep it short. Don't give long speeches. Speak like a text message.
    - **Vibe:** You're busy but happy to help. If someone asks a question, answer it directly.
  `,
  'pro': `
    # IDENTITY
    You are "Claire", a highly efficient, warm, and polished executive assistant for {{business_name}}.
    You sound professional but NOT robotic. Think "High-end Hotel Concierge."
    
    # SPEAKING STYLE (CRITICAL)
    - **Voice:** Soft, clear, reassuring, and intelligent.
    - **Phrasing:** "Certainly," "I'd be happy to," "One moment," "Let me check that for you."
    - **Sentence Structure:** Complete sentences, but not wordy. precise.
    - **Vibe:** You are in control. You make the caller feel taken care of immediately.
  `,
  'coach': `
    # IDENTITY
    You are "Calum", a high-energy, super-motivated front-desk guy for {{business_name}}.
    You are hyped to be here!
    
    # SPEAKING STYLE (CRITICAL)
    - **Voice:** Upbeat, fast-paced, energetic.
    - **Phrasing:** "Brilliant," "Awesome," "Let's get this booked," "No worries at all," "100%."
    - **Sentence Structure:** Punchy. Enthusiastic. Use exclamation marks in your tone.
    - **Vibe:** You want to get them sorted out FAST so they can get moving.
  `
};

// --- HELPER: GENERATE THE FULL PROMPT ---
function constructSystemPrompt(activeVoiceId: string, profile: any) {
  const businessName = profile?.business_name || "The Business";
  
  let basePersona = PERSONAS[activeVoiceId as keyof typeof PERSONAS] || PERSONAS['tradie'];
  basePersona = basePersona.replace(/{{business_name}}/g, businessName);

  const trainingContext = `
  === 🟢 KNOWLEDGE BASE (THE TRUTH) 🟢 ===
  📍 BUSINESS: ${businessName}
  📝 ABOUT US: ${profile?.business_description || "Not specified."}
  🕒 HOURS: ${profile?.opening_hours || "Not specified. (Don't guess)"}
  💰 PRICES: ${profile?.services || "Pricing on request. (Don't guess)"}
  ❓ FAQs: ${profile?.faqs || "None."}
  === 🔴 END DATA 🔴 ===
  `;

  return `
  ${basePersona}
  
  ${trainingContext}

  # HOW TO HANDLE QUESTIONS (IMPORTANT)
  1. **CHECK DATA FIRST:** If they ask about Hours/Prices, look at the Green Box above. If it's there, say it naturally.
  2. **MISSING DATA:** If it's NOT in the box, be honest: "I don't actually have that price in front of me, but I'll ask the boss to ring you." (Don't make it up).
  3. **BE HUMAN:** Do not say "According to my knowledge base." Just say "Yeah, we're open until 5."
  4. **DIARY:** You can't see the live calendar. Say: "I'll grab your details and get the team to confirm a slot for you."
  
  # CORE TASKS
  1. Get Name & Phone Number.
  2. Find out what they need.
  3. Answer questions if you know them.
  4. Say goodbye warmly.
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
      
      // Base configuration
      let payloadToVapi: any = {
        model: {
          provider: "openai",
          model: "gpt-4o",
          temperature: 0.4, 
          messages: [
            { role: 'system', content: newSystemPrompt }
          ]
        }
      };

      // If Creating New: We must manually construct the payload from the blueprint
      // We do NOT spread (...blueprint) because it contains 'id' and 'orgId' which causes Vapi errors.
      if (isNew && blueprint) {
        
        let firstMsg = (blueprint.firstMessage || "Hello.");
        firstMsg = firstMsg.replace(/{{business_name}}/g, businessName);

        payloadToVapi = {
            ...payloadToVapi, // Prompt & Model settings
            name: `${blueprint.name} (${businessName})`.substring(0, 40),
            firstMessage: firstMsg,
            // We explicitly copy ONLY the hardware settings we want
            voice: blueprint.voice,
            transcriber: blueprint.transcriber,
            analysisPlan: { summaryPlan: { enabled: true } },
            // Ensure no system fields exist
            serverUrl: process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/vapi-webhook` : undefined
        };
      }

      const url = isNew 
        ? 'https://api.vapi.ai/assistant' 
        : `https://api.vapi.ai/assistant/${assistantId}`;
      
      const method = isNew ? 'POST' : 'PATCH';

      console.log(`Sending to Vapi (${method}):`, JSON.stringify(payloadToVapi));

      const res = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadToVapi),
      });

      if (!res.ok) {
          const errorText = await res.text();
          console.error("Vapi Error:", errorText);
          throw new Error(`Vapi Failed: ${errorText}`);
      }
      
      return await res.json();
    };


    // --- ACTION 1: UPDATE PROMPT ---
    if (action === 'update_prompt') {
      // If the current ID is dead (deleted manually), this will throw 404.
      // We should catch it and tell the user to switch voice to fix it.
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


    // --- ACTION 2: SWITCH VOICE (Self-Healing) ---
    if (action === 'switch_voice') {
      const voiceId = payload.voiceId as keyof typeof BLUEPRINTS;
      const targetBlueprintId = BLUEPRINTS[voiceId];
      
      // 1. Fetch Blueprint
      const bpRes = await fetch(`https://api.vapi.ai/assistant/${targetBlueprintId}`, {
        headers: { 'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}` }
      });
      if (!bpRes.ok) throw new Error("Failed to fetch blueprint");
      const blueprint = await bpRes.json();

      // 2. Create New Assistant (Fresh ID)
      const newAssistant = await updateVapiAssistant(null, voiceId, true, blueprint);

      // 3. Link Number to NEW Assistant
      await fetch(`https://api.vapi.ai/phone-number/${record.vapi_phone_number_id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assistantId: newAssistant.id }),
      });

      // 4. Update DB
      await supabaseAdmin.from('assistants').update({ 
          vapi_assistant_id: newAssistant.id,
          active_voice_id: voiceId 
      }).eq('id', record.id);

      // 5. Cleanup Old (Swallow Errors)
      // If the old one was manually deleted, this will fail (404). We ignore that.
      if (currentAssistantId && !Object.values(BLUEPRINTS).includes(currentAssistantId)) {
        try {
            await fetch(`https://api.vapi.ai/assistant/${currentAssistantId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}` }
            });
        } catch (e) { 
            console.log("Old assistant could not be deleted (likely already gone). Ignoring."); 
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Update Agent Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}