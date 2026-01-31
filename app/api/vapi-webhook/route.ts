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
        assistant: {
          firstMessage: "Hello! This is a test. I am finally working!",
          model: {
            provider: "openai",
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: "You are a helpful assistant." }
            ]
          },
          // 👇 CHANGED THIS SECTION TO OPENAI (More reliable for testing)
          voice: {
            provider: "openai",
            voiceId: "alloy" 
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