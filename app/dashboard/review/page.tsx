'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Star, ThumbsUp } from 'lucide-react';

export default function ReviewPage() {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const { error } = await supabase.from('reviews').insert({
        user_id: user.id,
        rating,
        feedback
      });

      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      alert('Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans p-4 pb-20">
      <div className="max-w-xl mx-auto pt-4">
        <button onClick={() => router.back()} className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </button>
        
        <h1 className="text-2xl font-bold text-white mb-2">Leave a Review</h1>
        <p className="text-slate-400 text-sm mb-8">How are we doing? Your feedback helps us improve.</p>

        {submitted ? (
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-8 rounded-2xl text-center">
            <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white">
              <ThumbsUp className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Thank You!</h2>
            <p className="text-slate-400">We appreciate your feedback.</p>
            <button onClick={() => router.back()} className="mt-6 text-yellow-400 font-bold hover:underline">Return to Dashboard</button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center">
              <p className="text-sm font-bold text-slate-500 uppercase mb-4">Rate your experience</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="transition-transform hover:scale-110 focus:outline-none"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(rating)}
                  >
                    <Star 
                      className={`h-10 w-10 ${star <= (hover || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-700'}`} 
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Any comments? (Optional)</label>
              <textarea 
                rows={4}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-yellow-500 outline-none resize-none placeholder-slate-600" 
                placeholder="What do you like? What could be better?" 
              />
            </div>

            <button 
              onClick={handleSubmit}
              disabled={loading || rating === 0}
              className={`w-full py-4 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all ${
                rating === 0 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                : 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-yellow-900/20'
              }`}
            >
              {loading ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}