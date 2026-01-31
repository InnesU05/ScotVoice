import { NextResponse } from 'next/server';

// 🛑 DO NOT IMPORT supabaseAdmin here. 
// If that file has a bad Key, it crashes the whole route before it starts.

export async function POST(req: Request) {
  try {
    // 1. Logging to prove Vapi reached us
    console.log("🚀 VAPI REACHED THE SERVER - STARTING RESPONSE");

    const body = await req.json();
    const message = body.message;

    // 2. Handle the "Who is this?" request
    if (message.type === 'assistant-request') {
      console.log("⚡ Sending Hardcoded Rab ID...");

      return NextResponse.json({
        // This is the Rab ID you gave me.
        // If this fails, the ID itself is wrong/from a different account.
        assistantId: "6af03c9c-2797-4818-8dfc-eb604c247f3d", 
        assistant: {
          variableValues: {
            business_name: "CONNECTION SUCCESSFUL",
          }
        }
      });
    }

    // 3. Handle End of Call (Just say OK)
    return NextResponse.json({ message: 'Handled' });

  } catch (error: any) {
    console.error("🚨 Fatal Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}