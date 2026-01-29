import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

export async function POST(req: Request) {
  try {
    const { userId, email, voiceId, businessName } = await req.json();

    // 1. Save "Pre-Flight" Data
    // We store their choices now so we know what to provision after they pay
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ 
        business_name: businessName, 
        selected_voice: voiceId 
      })
      .eq('id', userId);

    if (error) throw error;

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
              // images: ['https://your-domain.com/logo.png'], // Add your logo URL here later
            },
            unit_amount: 2999, // £29.99
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      // Redirect URLs
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/onboarding`,
      customer_email: email,
      metadata: {
        userId: userId, // Critical for matching payment to user later
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error('Stripe Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}