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
    // 🛠️ TYPE FIX: blueprint is typed as 'any' to allow spreading
    const updateVapiAssistant = async (assistantId: string | null, voiceId: string, isNew = false, blueprint: any = null) => {
      
      const newSystemPrompt = constructSystemPrompt(voiceId, profile);
      
      const apiPayload: any = {
        model: {
          provider: "openai",
          model: "gpt-4o",
          temperature: 0.4, 
          messages: [
            { role: 'system', content: newSystemPrompt }
          ]
        }
      };

      let finalBody = apiPayload;

      // If creating new (Switch Voice), merge with blueprint BUT clean it first
      if (isNew && blueprint) {
        let firstMsg = (blueprint as any).firstMessage || "";
        firstMsg = firstMsg.replace(/{{business_name}}/g, profile?.business_name || "The Business");
        
        apiPayload.name = `${(blueprint as any).name} (${profile?.business_name})`.substring(0, 40);
        apiPayload.firstMessage = firstMsg;
        apiPayload.voice = (blueprint as any).voice; 
        apiPayload.transcriber = (blueprint as any).transcriber;
        apiPayload.analysisPlan = { summaryPlan: { enabled: true } };

        // 🛡️ CRITICAL FIX: Remove System IDs from blueprint to prevent API Error
        const { id, orgId, createdAt, updatedAt, ...cleanBlueprint } = blueprint;
        finalBody = { ...cleanBlueprint, ...apiPayload };
      }

      const url = isNew 
        ? 'https://api.vapi.ai/assistant' 
        : `https://api.vapi.ai/assistant/${assistantId}`;
      
      const method = isNew ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalBody),
      });

      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    };


    // --- ACTION 1: UPDATE PROMPT ---
    if (action === 'update_prompt') {
      await updateVapiAssistant(currentAssistantId, activeVoiceId);
      return NextResponse.json({ success: true });
    }


    // --- ACTION 2: SWITCH VOICE ---
    if (action === 'switch_voice') {
      const voiceId = payload.voiceId as keyof typeof BLUEPRINTS;
      const targetBlueprintId = BLUEPRINTS[voiceId];
      
      // Fetch Blueprint
      const bpRes = await fetch(`https://api.vapi.ai/assistant/${targetBlueprintId}`, {
        headers: { 'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}` }
      });
      const blueprint = await bpRes.json();

      // Create New
      const newAssistant = await updateVapiAssistant(null, voiceId, true, blueprint);

      // Link Number
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
        } catch (e) { console.error(e); }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}