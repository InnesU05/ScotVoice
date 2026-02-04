import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import twilio from 'twilio';

export const dynamic = 'force-dynamic';

// Get Retell API key from environment variable
const RETELL_API_KEY = process.env.RETELL_API_KEY;
if (!RETELL_API_KEY) {
  console.error('❌ Missing RETELL_API_KEY environment variable');
}

// Default Agent IDs (can be overridden per user if needed)
const DEFAULT_AGENT_IDS: Record<string, string> = {
  'tradie': 'agent_34811a2936cefcafa15f076233',   
  'pro':    'agent_56bbf189b4a81a1ddd58059a97', 
  'coach':  'agent_9f7085362040154da834b0324b'   
};

export async function POST(req: Request) {
  try {
    // Check if API key is configured
    if (!RETELL_API_KEY) {
      console.error('❌ RETELL_API_KEY not configured');
      return new NextResponse(
        `<Response><Say>System configuration error. Please contact support.</Say></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    const formData = await req.formData();
    const to = formData.get('To') as string;
    const from = formData.get('From') as string;

    console.log(`📞 Call started: ${from} -> ${to}`);

    if (!to || !from) {
      throw new Error("Missing To or From number in request");
    }

    // 1. DATABASE LOOKUP
    const { data: assistant, error: assistantError } = await supabaseAdmin
      .from('assistants')
      .select('user_id, active_voice_id, agent_id')
      .eq('twilio_phone_number', to)
      .single();

    if (assistantError || !assistant) {
      console.error(`❌ Number ${to} not found in DB:`, assistantError);
      throw new Error(`Number not found: ${to}`);
    }

    // 2. PROFILE FETCH
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('business_name, business_description')
        .eq('id', assistant.user_id)
        .single();

    if (profileError) {
      console.error(`❌ Profile fetch error for user ${assistant.user_id}:`, profileError);
      throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }

    const businessName = profile?.business_name || "Business";
    const knowledgeBase = `Business: ${businessName}. ${profile?.business_description || ''}`;

    // 3. RETELL HANDOFF
    const selectedVoice = assistant.active_voice_id || 'tradie';
    const agentId = assistant.agent_id || DEFAULT_AGENT_IDS[selectedVoice] || DEFAULT_AGENT_IDS['tradie'];

    console.log(`🎯 Using agent: ${agentId} (voice: ${selectedVoice})`);

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
        console.error('❌ Retell API Error:', retellData);
        throw new Error(`Retell API Error: ${retellData.message || 'Unknown error'}`);
    }

    if (!retellData.call_id) {
      throw new Error("Retell API did not return a call_id");
    }

    console.log(`✅ Call registered with Retell: ${retellData.call_id}`);

    // 4. SUCCESS: CONNECT CALL
    return new NextResponse(
      `<Response><Connect><Stream url="wss://api.retellai.com/v2/audio-websocket/${retellData.call_id}" /></Connect></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );

  } catch (error: any) {
    console.error("🚨 Call Failed:", error.message);
    
    // Return error message to Twilio
    return new NextResponse(
        `<Response><Say>We are currently experiencing a system error. Please try again later.</Say></Response>`,
        { headers: { "Content-Type": "text/xml" } }
    );
  }
}