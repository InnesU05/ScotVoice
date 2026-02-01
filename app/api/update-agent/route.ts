import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const BLUEPRINTS = {
  'tradie': '6af03c9c-2797-4818-8dfc-eb604c247f3d',
  'coach': '1f5287e0-7f42-437c-aa10-ac39bc5171ae',
  'pro': 'a5eaa6ce-db6e-4e35-bc31-2b8549a5c0e6'
};

export async function POST(req: Request) {
  try {
    const { userId, action, payload } = await req.json();

    // 1. GET CURRENT SETUP
    const { data: record, error } = await supabaseAdmin
      .from('assistants')
      .select('id, vapi_phone_number_id, vapi_assistant_id, profiles:user_id ( business_name )')
      .eq('user_id', userId)
      .single();

    if (error || !record) throw new Error('No assistant found');

    const profile = record.profiles as any;
    let businessName = profile?.business_name || "Valued Customer";
    const phoneId = record.vapi_phone_number_id;
    let currentAssistantId = record.vapi_assistant_id;

    // --- CASE 1: UPDATE BUSINESS NAME ---
    if (action === 'update_name') {
      const newName = payload.name;
      await supabaseAdmin.from('profiles').update({ business_name: newName }).eq('id', userId);
      
      const agentRes = await fetch(`https://api.vapi.ai/assistant/${currentAssistantId}`, {
        headers: { 'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}` }
      });
      const agent = await agentRes.json();

      let systemMsg = agent.model.messages.find((m: any) => m.role === 'system')?.content || "";
      systemMsg = systemMsg.replace(businessName, newName);
      let firstMsg = agent.firstMessage || "";
      firstMsg = firstMsg.replace(businessName, newName);

      // PATCH with Summary Enabled
      await fetch(`https://api.vapi.ai/assistant/${currentAssistantId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${agent.name.split('(')[0].trim()} (${newName})`.substring(0, 40),
          firstMessage: firstMsg,
          model: {
            ...agent.model,
            messages: [
              { role: 'system', content: systemMsg },
              ...agent.model.messages.filter((m: any) => m.role !== 'system')
            ]
          },
          // 🔧 FIX: Force Enable Summaries
          analysisPlan: {
            summaryPlan: { enabled: true }
          }
        }),
      });

      return NextResponse.json({ success: true });
    }

    // --- CASE 2: SWITCH VOICE ---
    if (action === 'switch_voice') {
      const targetBlueprintId = BLUEPRINTS[payload.voiceId as keyof typeof BLUEPRINTS];
      if (!targetBlueprintId) throw new Error('Invalid Voice ID');

      const bpRes = await fetch(`https://api.vapi.ai/assistant/${targetBlueprintId}`, {
        headers: { 'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}` }
      });
      const blueprint = await bpRes.json();

      let systemMessage = blueprint.model.messages.find((m: any) => m.role === 'system')?.content || "";
      systemMessage = systemMessage.replace(/{{business_name}}/g, businessName);

      let firstMessage = blueprint.firstMessage || "";
      firstMessage = firstMessage.replace(/{{business_name}}/g, businessName);

      const safeName = `${blueprint.name} (${businessName})`.substring(0, 40);

      const createRes = await fetch('https://api.vapi.ai/assistant', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...blueprint,
          name: safeName,
          firstMessage: firstMessage,
          model: {
            ...blueprint.model,
            messages: [
              { role: 'system', content: systemMessage },
              ...blueprint.model.messages.filter((m: any) => m.role !== 'system')
            ]
          },
          // 🔧 FIX: Force Enable Summaries
          analysisPlan: {
            summaryPlan: { enabled: true }
          },
          id: undefined, orgId: undefined, createdAt: undefined, updatedAt: undefined, isServerUrlSecretSet: undefined
        }),
      });

      if (!createRes.ok) throw new Error(await createRes.text());
      const newAssistant = await createRes.json();

      await fetch(`https://api.vapi.ai/phone-number/${phoneId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assistantId: newAssistant.id }),
      });

      await supabaseAdmin.from('assistants').update({ vapi_assistant_id: newAssistant.id }).eq('id', record.id);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid Action" }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}