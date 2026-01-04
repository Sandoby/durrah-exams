/**
 * Convex Auth Configuration
 * 
 * This configures Convex to accept Supabase JWTs for authentication.
 * The Supabase JWT is passed from the frontend and verified here.
 * 
 * Setup:
 * 1. Get your Supabase project URL (e.g., https://xxxxx.supabase.co)
 * 2. Get your Supabase JWT secret from Dashboard > Settings > API > JWT Secret
 * 3. Add SUPABASE_JWT_SECRET to Convex environment variables
 */

export default {
  providers: [
    {
      // Supabase project domain (issuer of the JWT)
      domain: process.env.AUTH_SUPABASE_URL || "https://your-project.supabase.co",
      
      // Application ID (usually the Supabase project reference ID)
      applicationID: process.env.AUTH_SUPABASE_PROJECT_ID || "supabase",
    },
  ],
};

/**
 * Alternative: Custom JWT verification
 * 
 * If you need more control, you can implement custom verification:
 * 
 * import { httpAction } from "./_generated/server";
 * import * as jose from "jose";
 * 
 * export const verifySupabaseToken = httpAction(async (ctx, request) => {
 *   const authHeader = request.headers.get("Authorization");
 *   if (!authHeader?.startsWith("Bearer ")) {
 *     return new Response("Unauthorized", { status: 401 });
 *   }
 *   
 *   const token = authHeader.slice(7);
 *   const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);
 *   
 *   try {
 *     const { payload } = await jose.jwtVerify(token, secret);
 *     return { userId: payload.sub, email: payload.email, role: payload.role };
 *   } catch {
 *     return new Response("Invalid token", { status: 401 });
 *   }
 * });
 */
