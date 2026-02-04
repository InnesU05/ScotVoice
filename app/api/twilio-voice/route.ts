import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// 🔴 KEEP YOUR KEY (It works!)
const RETELL_API_KEY = "key_5963e986555abe28071a8a2766f6"; 

const AGENT_IDS: Record<string, string> = {
  'tradie': 'agent_34811a2936cefcafa15f076233', 
  'pro':    'agent_56bbf189b4a81a1ddd58059a97', 
  'coach':  'agent_9f7085362040154da834b0324b'   
};

export async function POST(req: Request) {
  try {
    console.log("📞 Call Hit Server...");

    // 1. SAFE DATABASE INIT
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase Keys in Vercel");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await req.formData();
    const to = formData.get('To') as string;
    const from = formData.get('From') as string;

    console.log(`📞 Searching for number: ${to}`);

    // 2. DATABASE LOOKUP
    const { data: assistant, error: dbError } = await supabase
      .from('assistants')
      .select('user_id, active_voice_id')
      .eq('twilio_phone_number', to)
      .single();

    if (dbError || !assistant) {
      console.error("DB Error:", dbError);
      throw new Error("Number not found in DB");
    }

    // 3. PROFILE FETCH
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', assistant.user_id)
        .single();

    const businessName = profile?.business_name || "Business";
    const knowledgeBase = `Business: ${businessName}. ${profile?.business_description || ''}`;

    // 4. RETELL HANDOFF
    const selectedVoice = assistant.active_voice_id || 'tradie';
    const agentId = AGENT_IDS[selectedVoice] || AGENT_IDS['tradie'];

    // 🔴 FIX: CHANGED URL from '/v2/register-call' to '/register-call'
    const retellRes = await fetch('https://api.retellai.com/register-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agentId,
        from_number: from,
        to_number: to,
        retell_llm_dynamic_variables: {
          training_data: knowledgeBase,
          business_name: businessName
        }
      }),
    });

    const responseText = await retellRes.text();
    let retellData;

    try {
        retellData = JSON.parse(responseText);
    } catch (e) {
        throw new Error(`Retell Raw Error: ${responseText}`);
    }

    if (!retellRes.ok) {
        throw new Error(`Retell API: ${retellData.message}`);
    }

    return new NextResponse(
      `<Response><Connect><Stream url="wss://api.retellai.com/v2/audio-websocket/${retellData.call_id}" /></Connect></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );

  } catch (error: any) {
    console.error("🚨 Call Failed:", error);
    
    const safeError = (error.message || "Unknown Error").replace(/[^a-zA-Z0-9 ]/g, " ");

    return new NextResponse(
        `<Response><Say>Connection Error. ${safeError}</Say></Response>`,
        { headers: { "Content-Type": "text/xml" } }
    );
  }
}