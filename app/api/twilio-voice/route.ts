import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import twilio from 'twilio';

export const dynamic = 'force-dynamic';

// 🔴 1. PASTE YOUR NEW RETELL API KEY HERE (Inside the quotes)
// Example: const RETELL_API_KEY = "";
const RETELL_API_KEY = "key_5963e986555abe28071a8a2766f6"; 

// 🔴 2. VERIFY YOUR AGENT IDS (From Retell Dashboard)
const AGENT_IDS: Record<string, string> = {
  'tradie': 'agent_34811a2936cefcafa15f076233',   
  'pro':    'agent_56bbf189b4a81a1ddd58059a97', 
  'coach':  'agent_9f7085362040154da834b0324b'   
};

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const to = formData.get('To') as string;
    const from = formData.get('From') as string;

    console.log(`📞 Call started: ${from} -> ${to}`);

    // 1. DATABASE LOOKUP
    const { data: assistant } = await supabaseAdmin
      .from('assistants')
      .select('user_id, active_voice_id')
      .eq('twilio_phone_number', to)
      .single();

    if (!assistant) {
      console.error(`❌ Number ${to} not found in DB`);
      throw new Error("Number not found");
    }

    // 2. PROFILE FETCH
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', assistant.user_id)
        .single();

    const businessName = profile?.business_name || "Business";
    const knowledgeBase = `Business: ${businessName}. ${profile?.business_description || ''}`;

    // 3. RETELL HANDOFF
    const selectedVoice = assistant.active_voice_id || 'tradie';
    const agentId = AGENT_IDS[selectedVoice] || AGENT_IDS['tradie'];

    const retellRes = await fetch('https://api.retellai.com/v2/register-call', {
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

    const retellData = await retellRes.json();

    if (!retellRes.ok) {
        throw new Error(`Retell API Error: ${retellData.message}`);
    }

    // 4. SUCCESS: CONNECT CALL
    return new NextResponse(
      `<Response><Connect><Stream url="wss://api.retellai.com/v2/audio-websocket/${retellData.call_id}" /></Connect></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );

  } catch (error: any) {
    console.error("🚨 Call Failed:", error);
    
    // Standard "Sorry" message if system crashes (No complex debug reading)
    return new NextResponse(
        `<Response><Say>We are currently experiencing a system error. Please try again later.</Say></Response>`,
        { headers: { "Content-Type": "text/xml" } }
    );
  }
}