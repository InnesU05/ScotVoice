'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Phone, ShieldAlert, Clock, Menu, X, ArrowRight, 
  MessageSquare, ChevronDown, CheckCircle2, Smartphone, Zap, XCircle,
  Mic, UserCircle2, Briefcase, Dumbbell
} from 'lucide-react';

// --- NAVBAR ---
const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-700 to-blue-900 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
               <Phone className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-2xl tracking-tight text-slate-900">NessDial</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#voices" className="text-slate-600 hover:text-blue-700 font-semibold transition">Our Voices</a>
            <a href="#comparison" className="text-slate-600 hover:text-blue-700 font-semibold transition">Why Switch?</a>
            <a href="#how-it-works" className="text-slate-600 hover:text-blue-700 font-semibold transition">How it Works</a>
            <Link 
              href="/login" 
              className="px-6 py-2.5 bg-slate-900 text-white rounded-full font-semibold hover:bg-blue-800 transition-all shadow-lg hover:shadow-xl ring-2 ring-transparent hover:ring-blue-500/50"
            >
              Client Login
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-slate-900 p-2">
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-slate-200 overflow-hidden"
          >
            <div className="p-4 space-y-4">
              <a href="#voices" className="block text-slate-700 font-semibold text-lg" onClick={() => setIsOpen(false)}>Our Voices</a>
              <a href="#comparison" className="block text-slate-700 font-semibold text-lg" onClick={() => setIsOpen(false)}>Why Switch?</a>
              <a href="#how-it-works" className="block text-slate-700 font-semibold text-lg" onClick={() => setIsOpen(false)}>How it Works</a>
              <Link href="/login" className="block w-full text-center py-4 bg-blue-700 text-white rounded-xl font-bold shadow-md">
                Login Area
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// --- HERO SECTION ---
const Hero = () => {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-white">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-3xl mix-blend-multiply opacity-70"></div>
        <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] bg-blue-50/80 rounded-full blur-3xl mix-blend-multiply opacity-70"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-blue-800 font-bold text-sm mb-8 shadow-sm"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
          </span>
          Now Live for Scottish Businesses
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-[1.1]"
        >
          The Smartest Receptionist <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-blue-500">
             You'll Ever Hire.
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-slate-600 max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          NessDial is the automated receptionist built for Scotland. Whether you're a <strong>Tradesperson, PT, or Salon Owner</strong>, it answers calls, filters spam, and books clients directly into your diary.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <button className="px-8 py-4 bg-slate-900 text-white rounded-full font-bold text-lg hover:bg-slate-800 transition shadow-xl shadow-slate-900/20 w-full sm:w-auto flex items-center justify-center gap-2 transform hover:-translate-y-1">
            Get Started Free <ArrowRight size={20} />
          </button>
          <button className="px-8 py-4 bg-white text-slate-700 border-2 border-slate-200 rounded-full font-bold text-lg hover:border-blue-300 hover:bg-blue-50 transition w-full sm:w-auto flex items-center justify-center gap-2 group">
            <Play size={20} className="fill-slate-700 group-hover:fill-blue-600 group-hover:text-blue-600 transition" /> 
            Hear the Demo
          </button>
        </motion.div>
        
        <div className="mt-10 flex items-center justify-center gap-6 text-slate-400 grayscale opacity-60">
           <span className="text-sm font-semibold">SECURE & PRIVATE • UK NUMBERS • 24/7 UPTIME</span>
        </div>
      </div>
    </section>
  );
};

// --- NEW SECTION: VOICE SELECTION ---
const VoiceDemo = () => {
  const [activeVoice, setActiveVoice] = useState<'tradie' | 'pro' | 'coach'>('tradie');

  return (
    <section id="voices" className="py-24 bg-white border-b border-slate-100">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-blue-700 font-bold uppercase tracking-wide text-sm mb-3">Tailored to You</h2>
          <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Pick the Perfect Voice for Your Brand</h3>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            A Plumber might want "Rab". A Salon might want "Morag". A PT might want "Calum". You choose the persona that fits your business image.
          </p>
        </div>

        {/* Voice Toggle UI */}
        <div className="bg-slate-50 rounded-[2rem] border border-slate-200 p-2 md:p-8 max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row gap-6">
            
            {/* Sidebar / Toggle */}
            <div className="flex flex-row md:flex-col gap-2 w-full md:w-1/3">
              
              {/* OPTION 1: THE TRADIE */}
              <button 
                onClick={() => setActiveVoice('tradie')}
                className={`flex items-center gap-4 p-4 rounded-xl text-left transition-all ${activeVoice === 'tradie' ? 'bg-white shadow-md border border-blue-100 ring-1 ring-blue-500/20' : 'hover:bg-slate-100 text-slate-500'}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${activeVoice === 'tradie' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-400'}`}>
                  <Briefcase size={20} />
                </div>
                <div>
                  <h4 className={`font-bold ${activeVoice === 'tradie' ? 'text-slate-900' : 'text-slate-500'}`}>The Tradie</h4>
                  <p className="text-xs text-slate-500">Direct, Deep, Friendly</p>
                </div>
              </button>

              {/* OPTION 2: THE PROFESSIONAL */}
              <button 
                onClick={() => setActiveVoice('pro')}
                className={`flex items-center gap-4 p-4 rounded-xl text-left transition-all ${activeVoice === 'pro' ? 'bg-white shadow-md border border-purple-100 ring-1 ring-purple-500/20' : 'hover:bg-slate-100 text-slate-500'}`}
              >
                 <div className={`w-12 h-12 rounded-full flex items-center justify-center ${activeVoice === 'pro' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-400'}`}>
                  <UserCircle2 size={20} />
                </div>
                <div>
                  <h4 className={`font-bold ${activeVoice === 'pro' ? 'text-slate-900' : 'text-slate-500'}`}>The Professional</h4>
                  <p className="text-xs text-slate-500">Warm, Soft, Polished</p>
                </div>
              </button>

              {/* OPTION 3: THE COACH */}
              <button 
                onClick={() => setActiveVoice('coach')}
                className={`flex items-center gap-4 p-4 rounded-xl text-left transition-all ${activeVoice === 'coach' ? 'bg-white shadow-md border border-teal-100 ring-1 ring-teal-500/20' : 'hover:bg-slate-100 text-slate-500'}`}
              >
                 <div className={`w-12 h-12 rounded-full flex items-center justify-center ${activeVoice === 'coach' ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 text-slate-400'}`}>
                  <Dumbbell size={20} />
                </div>
                <div>
                  <h4 className={`font-bold ${activeVoice === 'coach' ? 'text-slate-900' : 'text-slate-500'}`}>The Coach</h4>
                  <p className="text-xs text-slate-500">Energetic, Upbeat, Local</p>
                </div>
              </button>
            </div>

            {/* Visualizer / Output */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center relative overflow-hidden min-h-[300px]">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
              
              <AnimatePresence mode='wait'>
                <motion.div 
                  key={activeVoice}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center relative z-10"
                >
                  <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-xl 
                    ${activeVoice === 'tradie' ? 'bg-blue-600 shadow-blue-500/30' : 
                      activeVoice === 'pro' ? 'bg-purple-600 shadow-purple-500/30' : 
                      'bg-teal-600 shadow-teal-500/30'}`}>
                    
                    {activeVoice === 'tradie' && <Briefcase className="text-white w-10 h-10" />}
                    {activeVoice === 'pro' && <UserCircle2 className="text-white w-10 h-10" />}
                    {activeVoice === 'coach' && <Dumbbell className="text-white w-10 h-10" />}
                  </div>
                  
                  <div className="flex items-center justify-center gap-1 h-8 mb-6">
                    {[...Array(8)].map((_, i) => (
                      <motion.div 
                        key={i}
                        animate={{ height: [10, 24, 10] }}
                        transition={{ 
                          repeat: Infinity, 
                          duration: 0.8, 
                          delay: i * 0.1,
                          ease: "easeInOut" 
                        }}
                        className={`w-1.5 rounded-full 
                          ${activeVoice === 'tradie' ? 'bg-blue-500' : 
                            activeVoice === 'pro' ? 'bg-purple-500' : 
                            'bg-teal-500'}`}
                      />
                    ))}
                  </div>

                  <p className="text-xl font-medium text-slate-700 italic px-4">
                    "{activeVoice === 'tradie' 
                      ? "Awright there, I'm Rab. I can take your booking or get Davie to call you back." 
                      : activeVoice === 'pro'
                      ? "Hello, this is Morag speaking. I can help schedule your appointment or answer your query."
                      : "Hiya! This is Calum. I'm training a client right now but leave a message and I'll get straight back to you!"}"
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

// --- COMPARISON TABLE ---
const ComparisonTable = () => {
  return (
    <section id="comparison" className="py-24 bg-slate-900 text-white">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            <span className="text-red-400">80% of customers</span> hang up on voicemail.
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            That is not just a missed call. That is money walking out the door to your competitor.
          </p>
        </div>

        <div className="overflow-hidden bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl">
          <div className="grid grid-cols-3 border-b border-slate-700 p-6 bg-slate-800/50">
            <div className="font-semibold text-slate-400">Feature</div>
            <div className="font-bold text-center text-xl text-slate-400">Standard Voicemail</div>
            <div className="font-bold text-center text-xl text-blue-400">NessDial AI</div>
          </div>
          
          {/* Row 1 */}
          <div className="grid grid-cols-3 border-b border-slate-700 p-6 hover:bg-slate-700/30 transition">
            <div className="flex items-center text-slate-300 font-medium">Customer Experience</div>
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-slate-400 text-sm mb-1">Frustrating Beep</span>
              <XCircle className="text-red-500 w-6 h-6" />
            </div>
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-blue-200 text-sm mb-1">Friendly Conversation</span>
              <CheckCircle2 className="text-blue-500 w-6 h-6" />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-3 border-b border-slate-700 p-6 hover:bg-slate-700/30 transition">
            <div className="flex items-center text-slate-300 font-medium">Booking Jobs</div>
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-slate-400 text-sm mb-1">Impossible</span>
              <XCircle className="text-red-500 w-6 h-6" />
            </div>
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-blue-200 text-sm mb-1">Direct to Diary</span>
              <CheckCircle2 className="text-blue-500 w-6 h-6" />
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-3 border-b border-slate-700 p-6 hover:bg-slate-700/30 transition">
            <div className="flex items-center text-slate-300 font-medium">Spam Filtering</div>
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-slate-400 text-sm mb-1">Zero Protection</span>
              <XCircle className="text-red-500 w-6 h-6" />
            </div>
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-blue-200 text-sm mb-1">Filters 99% of Spam</span>
              <CheckCircle2 className="text-blue-500 w-6 h-6" />
            </div>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-3 p-6 bg-blue-900/20">
            <div className="flex items-center text-slate-300 font-medium">Revenue Capture</div>
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-slate-400 text-sm mb-1">Low (Lost Leads)</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-white font-bold text-lg mb-1">Maximised</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- HOW IT WORKS ---
const HowItWorks = () => {
  const steps = [
    {
      icon: <Smartphone className="w-6 h-6 text-white" />,
      title: "1. Pick Your Number",
      desc: "Sign up and choose a UK mobile number (+44 7...) instantly from our dashboard."
    },
    {
      icon: <Zap className="w-6 h-6 text-white" />,
      title: "2. Set Your Rules",
      desc: "Tell the AI your business name (e.g., 'Fiona's Flowers' or 'Davie's Plumbing'), services, and prices."
    },
    {
      icon: <CheckCircle2 className="w-6 h-6 text-white" />,
      title: "3. Divert & Forget",
      desc: "Forward your missed calls to your new NessDial number. We handle the rest."
    }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-slate-50 border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-blue-700 font-bold uppercase tracking-wide text-sm mb-3">Simple Setup</h2>
          <h3 className="text-3xl md:text-4xl font-bold text-slate-900">Up and Running in 2 Minutes</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
           <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-0.5 bg-slate-200 -z-0"></div>

           {steps.map((step, i) => (
             <div key={i} className="relative z-10 flex flex-col items-center text-center">
               <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30 mb-6 transform rotate-3 hover:rotate-0 transition duration-300">
                 {step.icon}
               </div>
               <h4 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h4>
               <p className="text-slate-600 leading-relaxed px-4">{step.desc}</p>
             </div>
           ))}
        </div>
      </div>
    </section>
  );
};

// --- FEATURES BENTO ---
const FeatureBento = () => {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16 max-w-3xl">
          <h2 className="text-4xl font-bold text-slate-900 mb-6">Built for Scottish Business.</h2>
          <p className="text-xl text-slate-600">Traditional call centres cost a fortune and sound like robots. NessDial is designed to sound like a local member of staff who happens to be extremely organised.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
          
          {/* Feature 1: The Accent (Large) */}
          <div className="md:col-span-2 row-span-1 bg-slate-900 p-8 rounded-[2rem] shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition duration-500">
              <Phone size={200} />
            </div>
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center border border-white/10">
                 <span className="text-2xl">🏴󠁧󠁢󠁳󠁣󠁴󠁿</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Native Scottish Understanding</h3>
                <p className="text-slate-400 text-lg leading-relaxed max-w-lg">
                  "Aye", "Naw", "No bother". Generic AI struggles here. We don't. Your clients will feel understood, not frustrated.
                </p>
              </div>
            </div>
          </div>

          {/* Feature 2: Spam Filter (Vertical) */}
          <div className="bg-blue-50 p-8 rounded-[2rem] border border-blue-100 relative overflow-hidden group hover:border-blue-200 transition">
             <div className="absolute -right-4 -top-4 w-32 h-32 bg-blue-100 rounded-full blur-2xl opacity-50"></div>
             <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <ShieldAlert className="text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Spam Blocker</h3>
                <p className="text-slate-600">
                  We politely hang up on sales calls so your phone only buzzes for paying jobs.
                </p>
              </div>
            </div>
          </div>

          {/* Feature 3: SMS Summaries */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 rounded-[2rem] text-white shadow-lg relative overflow-hidden">
             <div className="relative z-10 h-full flex flex-col justify-between">
               <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                 <MessageSquare className="text-white" />
               </div>
               <div>
                 <h3 className="text-xl font-bold mb-2">Instant SMS Summaries</h3>
                 <p className="text-blue-100">
                   "New Enquiry: Sarah, Personal Training, Tuesday at 6pm." Get the details texted to you instantly.
                 </p>
               </div>
             </div>
          </div>

           {/* Feature 4: 24/7 */}
           <div className="md:col-span-2 bg-slate-50 p-8 rounded-[2rem] border border-slate-200 relative overflow-hidden group">
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                <Clock className="text-blue-600" />
              </div>
              <div className="flex justify-between items-end">
                <div className="max-w-md">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">24/7 Coverage</h3>
                  <p className="text-slate-600 text-lg">
                    Capture leads while you're training a client, on a job, or sleeping. Never let a voicemail go unanswered again.
                  </p>
                </div>
                {/* Visual Flair */}
                <div className="hidden sm:flex gap-1 items-end h-16 opacity-50">
                  <div className="w-2 bg-blue-600 h-[40%] rounded-full"></div>
                  <div className="w-2 bg-blue-600 h-[70%] rounded-full"></div>
                  <div className="w-2 bg-blue-600 h-[100%] rounded-full"></div>
                  <div className="w-2 bg-blue-600 h-[60%] rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

// --- FAQ SECTION ---
const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    { q: "Does it really sound Scottish?", a: "Yes. We use advanced voice synthesis fine-tuned for the UK market. It's not a caricature; it's a professional, neutral Scottish accent that builds trust." },
    { q: "I'm a PT/Florist/Consultant, is this for me?", a: "Absolutely. NessDial works for any busy professional who misses calls. Whether you are leading a class, arranging flowers, or in a meeting, we handle the enquiries." },
    { q: "How do I know if I got a lead?", a: "The second the call finishes, we send you an SMS (text) and an email with a summary of the call, the client's details, and what they need." },
    { q: "What happens if I want to answer the phone myself?", a: "You can set your phone to only divert to NessDial when you are busy, decline a call, or are unreachable. You retain full control." },
    { q: "Is there a contract?", a: "No. It is a rolling monthly subscription. You can cancel instantly from your dashboard." },
  ];

  return (
    <section id="faq" className="py-24 bg-slate-50 border-t border-slate-200">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Common Questions</h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition">
              <button 
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex justify-between items-center p-6 text-left"
              >
                <span className="font-bold text-lg text-slate-900">{faq.q}</span>
                <ChevronDown className={`transform transition-transform duration-300 text-slate-400 ${openIndex === i ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 pt-0 text-slate-600 leading-relaxed">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- CTA SECTION ---
const CTA = () => {
  return (
    <section className="py-20 bg-slate-900 text-white overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-800/20 rounded-full blur-3xl"></div>

      <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
        <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Stop Missing Opportunities. Start Making Money.</h2>
        <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
          Join the other smart Scottish businesses who have automated their admin. 
        </p>
        <button className="px-10 py-5 bg-blue-600 text-white rounded-full font-bold text-xl hover:bg-blue-500 transition shadow-2xl shadow-blue-900/50 transform hover:-translate-y-1">
          Get Your Number Now
        </button>
        <p className="mt-6 text-sm text-slate-500">No credit card required for setup • 5-minute process</p>
      </div>
    </section>
  );
};

// --- FOOTER ---
const Footer = () => {
  return (
    <footer className="bg-white text-slate-600 py-12 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
             <Phone className="w-4 h-4 text-white" />
           </div>
           <span className="text-slate-900 font-bold text-xl">NessDial</span>
        </div>
        <p className="text-sm">© {new Date().getFullYear()} NessDial AI. Made in Scotland.</p>
        <div className="flex gap-6 text-sm font-medium">
          <a href="#" className="hover:text-blue-600 transition">Privacy Policy</a>
          <a href="#" className="hover:text-blue-600 transition">Terms of Service</a>
          <a href="mailto:hello@nessdial.ai" className="hover:text-blue-600 transition">Contact</a>
        </div>
      </div>
    </footer>
  );
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white font-sans selection:bg-blue-100 selection:text-blue-900 scroll-smooth">
      <Navbar />
      <Hero />
      <VoiceDemo />
      <ComparisonTable />
      <HowItWorks />
      <FeatureBento />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}