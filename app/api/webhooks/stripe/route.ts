import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe'; // Fix Error 1: Import directly
import { supabaseAdmin } from '@/lib/supabase-admin';

// Fix Error 2: Initialize inline and bypass strict version check
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia' as any, // Cast to any to fix the "2026" or version mismatch error
  typescript: true,
});

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('Stripe-Signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // 1. Handle Successful Subscription
  if (event.type === 'checkout.session.completed') {
    const subscriptionId = session.subscription as string;
    const userId = session.metadata?.userId;

    if (!userId) {
      return new NextResponse('User ID missing', { status: 400 });
    }

    // Activate Profile
    await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: 'active',
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: session.customer as string,
      })
      .eq('id', userId);

    // Initialize Assistant Record
    await supabaseAdmin
      .from('assistants')
      .upsert({ 
          user_id: userId, 
          active_voice_id: 'tradie' 
      }, { onConflict: 'user_id' });
  }

  // 2. Handle Cancellation
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_subscription_id', subscription.id)
        .single();
    
    if (profile) {
        await supabaseAdmin.from('profiles').update({ subscription_status: 'canceled' }).eq('id', profile.id);
    }
  }

  return new NextResponse(null, { status: 200 });
}