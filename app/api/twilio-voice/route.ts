import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import twilio from 'twilio';

export const dynamic = 'force-dynamic';

// 1. CONFIG: Your 3 Static Retell Agents
// Go to Retell Dashboard -> Create Agent -> Copy Agent ID
const AGENT_IDS = {
  'tradie': 'agent_34811a2936cefcafa15f076233',   // Replace with actual Retell Agent ID for Rab
  'pro':    'agent_56bbf189b4a81a1ddd58059a97', // Replace with actual Retell Agent ID for Claire
  'coach':  'agent_9f7085362040154da834b0324b'   // Replace with actual Retell Agent ID for Calum
};

const RETELL_API_KEY = process.env.RETELL_API_KEY;

export async function POST(req: Request) {
  try {
    // 1. Parse Twilio Incoming Call Data (Form Data)
    const formData = await req.formData();
    const to = formData.get('To') as string;     // Your Business Number
    const from = formData.get('From') as string; // Customer Number

    console.log(`📞 Incoming Call to ${to} from ${from}`);

    // 2. Find the User who owns this Twilio Number
    const { data: assistant } = await supabaseAdmin
      .from('assistants')
      .select('user_id, active_voice_id')
      .eq('twilio_phone_number', to)
      .single();

    if (!assistant) {
      console.error("❌ No user found for this number");
      return new NextResponse("<Response><Reject/></Response>", { 
          headers: { "Content-Type": "text/xml" } 
      });
    }

    // 3. Fetch User's Training Data
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', assistant.user_id)
        .single();

    // 4. Construct the Dynamic Knowledge Base
    const businessName = profile?.business_name || "The Business";
    const knowledgeBase = `
      📍 BUSINESS: ${businessName}
      📝 ABOUT: ${profile?.business_description || "Not specified."}
      🕒 HOURS: ${profile?.opening_hours || "Not listed."}
      💰 PRICES: ${profile?.services || "Pricing on request."}
      ❓ FAQs: ${profile?.faqs || "None."}
    `;

    // 5. Select the Agent ID
    const selectedVoice = assistant.active_voice_id || 'tradie';
    const agentId = AGENT_IDS[selectedVoice as keyof typeof AGENT_IDS] || AGENT_IDS['tradie'];

    // 6. Register Call with Retell (Injecting the Data)
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
        // INJECTION MAGIC: This variable is sent to the Retell Agent
        retell_llm_dynamic_variables: {
          training_data: knowledgeBase,
          business_name: businessName
        }
      }),
    });

    const retellData = await retellRes.json();

    if (!retellRes.ok) {
        throw new Error(`Retell Error: ${JSON.stringify(retellData)}`);
    }

    // 7. Return TwiML to Connect the Audio Stream
    // This tells Twilio: "Connect this audio stream to Retell"
    const twiml = `
      <Response>
        <Connect>
          <Stream url="wss://api.retellai.com/v2/audio-websocket/${retellData.call_id}" />
        </Connect>
      </Response>
    `;

    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" }
    });

  } catch (error: any) {
    console.error("🚨 Error handling call:", error);
    return new NextResponse("<Response><Reject/></Response>", { 
        headers: { "Content-Type": "text/xml" } 
    });
  }
}