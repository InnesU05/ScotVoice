import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { userId, action, payload } = await req.json();

    if (action === 'switch_voice') {
      // Just update the DB preference. 
      // The /api/twilio-voice route handles picking the right Agent ID based on this.
      const { error } = await supabaseAdmin
        .from('assistants')
        .update({ active_voice_id: payload.voiceId })
        .eq('user_id', userId);

      if (error) throw error;
    }

    // Note: 'update_prompt' action is no longer needed because the prompt 
    // is built dynamically on every call in /api/twilio-voice

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}