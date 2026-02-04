import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 🔴 YOUR KEY (Keep this hardcoded for the test)
const RETELL_API_KEY = "key_5963e986555abe28071a8a2766f6"; 

// 🔴 YOUR AGENT ID (Hardcoding 'tradie' for the test)
const TEST_AGENT_ID = 'agent_34811a2936cefcafa15f076233'; 

export async function POST(req: Request) {
  try {
    console.log("📞 Call Hit Server (Bypass Mode)...");

    const formData = await req.formData();
    const to = formData.get('To') as string;
    const from = formData.get('From') as string;

    console.log(`📞 Call from ${from} to ${to}`);

    // 🛑 BYPASSING DATABASE FOR THIS TEST
    // We are manually setting the data to prove Retell works
    const businessName = "NessDial Test";
    const knowledgeBase = "You are a helpful AI receptionist testing the system.";
    const agentId = TEST_AGENT_ID;

    console.log(`🚀 Connecting to Agent ${agentId}...`);

    // ⚡️ CALL RETELL (New v2 Endpoint)
    const retellRes = await fetch('https://api.retellai.com/v2/register-phone-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agentId,
        from_number: from,
        to_number: to,
        direction: 'inbound',
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
        throw new Error(`Retell API Error: ${retellData.message}`);
    }

    console.log("✅ Retell Connected! Stream URL:", retellData.call_id);

    return new NextResponse(
      `<Response><Connect><Stream url="wss://api.retellai.com/v2/audio-websocket/${retellData.call_id}" /></Connect></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );

  } catch (error: any) {
    console.error("🚨 Call Failed:", error);
    const safeError = (error.message || "Unknown").replace(/[^a-zA-Z0-9 ]/g, " ");
    return new NextResponse(
        `<Response><Say>System Error. ${safeError}</Say></Response>`,
        { headers: { "Content-Type": "text/xml" } }
    );
  }
}