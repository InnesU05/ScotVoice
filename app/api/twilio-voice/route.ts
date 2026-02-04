import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import twilio from 'twilio';

export const dynamic = 'force-dynamic';

// 🔴 VERIFY THESE IDs MATCH YOUR RETELL DASHBOARD EXACTLY
const AGENT_IDS: Record<string, string> = {
  'tradie': 'agent_34811a2936cefcafa15f076233',   
  'pro':    'agent_56bbf189b4a81a1ddd58059a97', 
  'coach':  'agent_9f7085362040154da834b0324b'   
};

const RETELL_API_KEY = process.env.RETELL_API_KEY;

export async function POST(req: Request) {
  try {
    // 1. SAFETY CHECK: Are keys missing? (Common crash cause)
    if (!RETELL_API_KEY) throw new Error("Missing Retell API Key in Vercel.");
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase Service Key in Vercel.");

    const formData = await req.formData();
    const to = formData.get('To') as string;
    const from = formData.get('From') as string;

    console.log(`📞 Call started: ${from} -> ${to}`);

    // 2. DATABASE CHECK
    // (Note: Twilio numbers often come as +44..., verify your DB format matches)
    const { data: assistant, error: dbError } = await supabaseAdmin
      .from('assistants')
      .select('user_id, active_voice_id')
      .eq('twilio_phone_number', to)
      .single();

    if (dbError || !assistant) {
      throw new Error(`Number ${to} not found in DB.`);
    }

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
        throw new Error(`Retell Rejected: ${retellData.message}`);
    }

    // 5. SUCCESS
    return new NextResponse(
      `<Response><Connect><Stream url="wss://api.retellai.com/v2/audio-websocket/${retellData.call_id}" /></Connect></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );

  } catch (error: any) {
    console.error("🚨 Call Failed:", error);
    
    // SANITIZE: Remove special characters that break XML
    const cleanMsg = (error.message || "Unknown Error").replace(/[^a-zA-Z0-9 ]/g, "");

    // RETURN ERROR AS SPEECH
    return new NextResponse(
        `<Response><Say>System Error: ${cleanMsg}</Say></Response>`,
        { headers: { "Content-Type": "text/xml" } }
    );
  }
}