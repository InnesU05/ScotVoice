import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import twilio from 'twilio';

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { event, call } = body;

    // We only care about call analysis (when the call is done and summarized)
    if (event === 'call_analyzed') {
        console.log(`✅ Call Analyzed: ${call.call_id}`);

        // 1. Identify User via the "To" Number (Our Business Number)
        const { data: assistant } = await supabaseAdmin
            .from('assistants')
            .select('user_id')
            .eq('twilio_phone_number', call.to_number)
            .single();

        if (assistant) {
            const userId = assistant.user_id;
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('business_phone, usage_minutes')
                .eq('id', userId)
                .single();

            // 2. Log Call
            await supabaseAdmin.from('calls').insert({
                user_id: userId,
                retell_call_id: call.call_id,
                customer_number: call.from_number,
                status: 'completed',
                duration_seconds: Math.round(call.duration_ms / 1000),
                summary: call.call_analysis?.call_summary || "No summary.",
                recording_url: call.recording_url,
                started_at: new Date(call.start_timestamp).toISOString()
            });

            // 3. Update Minutes
            const minutesUsed = (call.duration_ms / 1000) / 60;
            if (profile) {
                await supabaseAdmin.from('profiles').update({ 
                    usage_minutes: (profile.usage_minutes || 0) + minutesUsed 
                }).eq('id', userId);

                // 4. Send SMS
                if (profile.business_phone) {
                    let smsBody = `NessDial 📞\nCall from: ${call.from_number}`;
                    smsBody += call.call_analysis?.call_summary 
                        ? `\n\nSummary: ${call.call_analysis.call_summary}` 
                        : `\n\n(No message left)`;

                    try {
                        await twilioClient.messages.create({
                            body: smsBody,
                            from: process.env.TWILIO_PHONE_NUMBER,
                            to: profile.business_phone
                        });
                        console.log(`📲 SMS Sent to ${profile.business_phone}`);
                    } catch (e) { console.error("❌ SMS Failed", e); }
                }
            }
        }
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}