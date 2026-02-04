import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import twilio from 'twilio';

export const dynamic = 'force-dynamic';

// 🔴 DOUBLE CHECK THESE IDs MATCH YOUR RETELL DASHBOARD
const AGENT_IDS = {
  'tradie': 'agent_34811a2936cefcafa15f076233',   
  'pro':    'agent_56bbf189b4a81a1ddd58059a97', 
  'coach':  'agent_9f7085362040154da834b0324b'   
};

const RETELL_API_KEY = process.env.RETELL_API_KEY;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const to = formData.get('To') as string;
    const from = formData.get('From') as string;

    console.log(`📞 Call to ${to}`);

    // 1. DATABASE CHECK
    const { data: assistant } = await supabaseAdmin
      .from('assistants')
      .select('user_id, active_voice_id')
      .eq('twilio_phone_number', to)
      .single();

    if (!assistant) {
      // 🛑 DEBUG: PHONE WILL SAY THIS
      return new NextResponse(
        `<Response><Say>Error. Number ${to.split('').join(' ')} not found in database.</Say></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // 2. PROFILE FETCH
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', assistant.user_id)
        .single();

    const businessName = profile?.business_name || "The Business";
    const knowledgeBase = `Business: ${businessName}. ${profile?.business_description || ''}`;

    // 3. RETELL HANDOFF
    const selectedVoice = assistant.active_voice_id || 'tradie';
    const agentId = AGENT_IDS[selectedVoice as keyof typeof AGENT_IDS] || AGENT_IDS['tradie'];

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
        // 🛑 DEBUG: PHONE WILL SAY THIS
        return new NextResponse(
          `<Response><Say>Retell Error: ${retellData.message || 'Unknown Retell Error'}</Say></Response>`,
          { headers: { "Content-Type": "text/xml" } }
        );
    }

    // 4. SUCCESS
    return new NextResponse(
      `<Response><Connect><Stream url="wss://api.retellai.com/v2/audio-websocket/${retellData.call_id}" /></Connect></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );

  } catch (error: any) {
    // 🛑 DEBUG: PHONE WILL SAY THIS
    return new NextResponse(
        `<Response><Say>System Error: ${error.message}</Say></Response>`,
        { headers: { "Content-Type": "text/xml" } }
    );
  }
}