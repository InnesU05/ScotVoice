import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import twilio from 'twilio';

export const dynamic = 'force-dynamic';

// 🔴 CONFIGURATION
const AGENT_IDS: Record<string, string> = {
  'tradie': 'agent_34811a2936cefcafa15f076233',   
  'pro':    'agent_56bbf189b4a81a1ddd58059a97', 
  'coach':  'agent_9f7085362040154da834b0324b'   
};

const RETELL_API_KEY = process.env.RETELL_API_KEY;

export async function POST(req: Request) {
  try {
    // 1. SAFETY CHECKS
    if (!RETELL_API_KEY) throw new Error("Missing Retell API Key in Vercel.");
    
    const formData = await req.formData();
    const to = formData.get('To') as string;
    const from = formData.get('From') as string;

    console.log(`📞 Call started: ${from} -> ${to}`);

    // 2. DATABASE LOOKUP
    const { data: assistant } = await supabaseAdmin
      .from('assistants')
      .select('user_id, active_voice_id')
      .eq('twilio_phone_number', to)
      .single();

    if (!assistant) throw new Error(`Number ${to} not found in DB`);

    // 3. PROFILE FETCH
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', assistant.user_id)
        .single();

    const businessName = profile?.business_name || "Business";
    const knowledgeBase = `Business: ${businessName}. ${profile?.business_description || ''}`;

    // 4. RETELL HANDOFF
    const selectedVoice = assistant.active_voice_id || 'tradie';
    const agentId = AGENT_IDS[selectedVoice] || AGENT_IDS['tradie'];

    console.log(`🤖 Connecting to Agent ID: ${agentId}`);

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

    // 5. SAFE ERROR HANDLING (The Fix)
    const responseText = await retellRes.text(); // Read text first!
    let retellData;

    try {
        retellData = JSON.parse(responseText); // Try to parse as JSON
    } catch (e) {
        // If it fails, it means Retell sent a text error (e.g. "Unauthorized")
        console.error("❌ Retell Non-JSON Error:", responseText);
        throw new Error(`Retell Raw Error: ${responseText.substring(0, 100)}`);
    }

    if (!retellRes.ok) {
        console.error("❌ Retell API Error:", retellData);
        throw new Error(`Retell API: ${retellData.message || JSON.stringify(retellData)}`);
    }

    // 6. SUCCESS
    return new NextResponse(
      `<Response><Connect><Stream url="wss://api.retellai.com/v2/audio-websocket/${retellData.call_id}" /></Connect></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );

  } catch (error: any) {
    console.error("🚨 Call Failed:", error);
    
    // Clean message for speech (remove special chars)
    const cleanMsg = (error.message || "Unknown").replace(/[^a-zA-Z0-9 .:]/g, "");

    return new NextResponse(
        `<Response><Say>System Error. ${cleanMsg}</Say></Response>`,
        { headers: { "Content-Type": "text/xml" } }
    );
  }
}