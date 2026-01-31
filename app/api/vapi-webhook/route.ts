import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Only handle the request for settings/variables
    if (body.message.type === 'assistant-request') {
      console.log("👉 VAPI IS HITTING THE ENDPOINT");

      return NextResponse.json({
        assistant: {
          variableValues: {
            business_name: "SUPER TEST SUCCESS",
          }
        }
      });
    }

    return NextResponse.json({ message: 'Handled' });
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}