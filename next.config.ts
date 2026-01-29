import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

// --- DEBUGGING: PRINT KEYS ON STARTUP ---
console.log("---------------------------------------");
console.log("🔍 CHECKING ENVIRONMENT VARIABLES:");
console.log("1. URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ FOUND" : "❌ MISSING");
console.log("2. ANON KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ FOUND" : "❌ MISSING");
console.log("3. SERVICE KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ FOUND" : "❌ MISSING");
console.log("---------------------------------------");

export default nextConfig;