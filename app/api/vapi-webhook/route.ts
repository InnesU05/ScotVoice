import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message;

    console.log(`📣 Vapi Event: ${message.type}`);

    if (message.type === 'assistant-request') {
      console.log('⚡ BYPASSING ID: Sending Transient Assistant...');

      return NextResponse.json({
        // ❌ NO assistantId (This removes the "Not Found" risk)
        // ✅ Define the assistant completely here:
        assistant: {
          firstMessage: "This is a test. The connection is working perfectly.",
          model: {
            provider: "openai",
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: "You are a helpful assistant." }
            ]
          },
          voice: {
            provider: "11labs",
            voiceId: "cjVigVc5kqAkXjuOp3xK" // Standard Voice
          }
        }
      });
    }

    return NextResponse.json({ message: 'Handled' });

  } catch (error: any) {
    console.error('🚨 Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}