import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { userId, action, payload } = await req.json();

    // 1. Handle Voice Switch
    if (action === 'switch_voice') {
      const { error } = await supabaseAdmin
        .from('assistants')
        .update({ active_voice_id: payload.voiceId })
        .eq('user_id', userId);

      if (error) throw error;
    }

    // 2. Handle Prompt Update (Training Save)
    // We do NOTHING here for Retell, because 'twilio-voice' injects the 
    // training data dynamically on every call. We just return success.
    
    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}