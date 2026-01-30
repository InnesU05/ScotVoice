import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover' as any, 
});

export async function POST(req: Request) {
  try {
    const { userId, email, voiceId, businessName } = await req.json();

    // 1. Save "Pre-Flight" Data (Using UPSERT to prevent ghost profiles)
    const { error } = await supabaseAdmin
      .from('profiles')
      .upsert({ 
        id: userId, 
        business_name: businessName, 
        selected_voice: voiceId,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Supabase Error:', error);
      throw new Error('Failed to save profile data');
    }

    // 2. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'NessDial AI Receptionist',
              description: `Monthly Subscription (Voice: ${voiceId.toUpperCase()})`,
            },
            unit_amount: 2000, // <--- UPDATED: £20.00 (in pence)
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/onboarding`,
      customer_email: email,
      metadata: {
        userId: userId, 
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error('Stripe Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}