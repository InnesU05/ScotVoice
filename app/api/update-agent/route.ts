import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase Admin (Bypasses RLS for secure fetching if needed)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Ensure this is in your .env.local
);

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // 1. Fetch the user's current agent settings to verify connection
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('retell_agent_id')
      .eq('user_id', userId)
      .single();

    if (agentError || !agent?.retell_agent_id) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // 2. Trigger Make.com Webhook
    // REPLACE THIS URL with the Webhook URL you generate in Step 3
    const makeWebhookUrl = 'https://hook.eu1.make.com/h6qcloqahfgl3cvujktx9163kxcrpp1k';
    
    const response = await fetch(makeWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, retellAgentId: agent.retell_agent_id })
    });

    if (!response.ok) {
      throw new Error('Failed to trigger automation workflow');
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Update Agent Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}