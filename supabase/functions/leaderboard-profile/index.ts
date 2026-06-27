import { createClient } from "npm:@supabase/supabase-js@2";
import {
  getCorsHeaders,
  normalizeUsername,
  toPublicProfile,
  validateUsername,
} from "../_shared/leaderboardProfile.js";

const ERROR_MESSAGES: Record<string, string> = Object.freeze({
  NOT_AUTHENTICATED: "Sign in to manage your public username.",
  INVALID_REQUEST: "The profile request is invalid.",
  INVALID_USERNAME: "Use 3–20 letters, numbers, or underscores.",
  USERNAME_TAKEN: "That username is already taken.",
  PROFILE_ALREADY_EXISTS: "A public profile already exists for this account.",
  PROFILE_NOT_FOUND: "No public profile exists for this account.",
  CHANGE_COOLDOWN: "Your username cannot be changed yet.",
  METHOD_NOT_ALLOWED: "This request method is not supported.",
  SERVER_ERROR: "Public profile services are temporarily unavailable.",
});

function jsonResponse(
  payload: unknown,
  status: number,
  corsHeaders: Record<string, string>,
) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function failure(
  code: keyof typeof ERROR_MESSAGES,
  status: number,
  corsHeaders: Record<string, string>,
  extra: Record<string, unknown> = {},
) {
  return jsonResponse({
    ok: false,
    error: { code, message: ERROR_MESSAGES[code], ...extra },
  }, status, corsHeaders);
}

function success(data: Record<string, unknown>, corsHeaders: Record<string, string>) {
  return jsonResponse({ ok: true, data }, 200, corsHeaders);
}

function profileData(profile: Record<string, unknown> | null) {
  return { profile: toPublicProfile(profile) };
}

Deno.serve(async (request) => {
  const corsHeaders = getCorsHeaders(request.headers.get("Origin"));
  if (!corsHeaders) return failure("INVALID_REQUEST", 403, {});
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return failure("METHOD_NOT_ALLOWED", 405, corsHeaders);

  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return failure("NOT_AUTHENTICATED", 401, corsHeaders);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return failure("SERVER_ERROR", 500, corsHeaders);

  const serverClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: userData, error: userError } = await serverClient.auth.getUser(token);
  const userId = userData?.user?.id;
  if (userError || !userId) return failure("NOT_AUTHENTICATED", 401, corsHeaders);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return failure("INVALID_REQUEST", 400, corsHeaders);
  }
  const action = body?.action;
  if (!["get", "check", "claim", "change"].includes(String(action))) {
    return failure("INVALID_REQUEST", 400, corsHeaders);
  }

  try {
    if (action === "get") {
      const { data, error } = await serverClient
        .from("leaderboard_profiles")
        .select("username, username_changed_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return failure("SERVER_ERROR", 500, corsHeaders);
      return success(profileData(data), corsHeaders);
    }

    const validation = validateUsername(body.username);
    if (!validation.valid) return failure("INVALID_USERNAME", 400, corsHeaders);

    if (action === "check") {
      const { data, error } = await serverClient
        .from("leaderboard_profiles")
        .select("user_id")
        .eq("username_normalized", validation.normalized)
        .maybeSingle();
      if (error) return failure("SERVER_ERROR", 500, corsHeaders);
      return success({
        username: validation.username,
        available: !data || data.user_id === userId,
      }, corsHeaders);
    }

    const rpcName = action === "claim"
      ? "claim_leaderboard_profile"
      : "change_leaderboard_username";
    const { data, error } = await serverClient.rpc(rpcName, {
      p_user_id: userId,
      p_username: normalizeUsername(body.username),
    });
    if (error || !data || typeof data !== "object") {
      console.error("leaderboard-profile RPC failed", { action, hasError: Boolean(error) });
      return failure("SERVER_ERROR", 500, corsHeaders);
    }
    if (data.ok !== true) {
      const code = String(data.code || "SERVER_ERROR") as keyof typeof ERROR_MESSAGES;
      if (!(code in ERROR_MESSAGES)) return failure("SERVER_ERROR", 500, corsHeaders);
      const extra = code === "CHANGE_COOLDOWN" && data.can_change_at
        ? { canChangeAt: data.can_change_at }
        : {};
      return failure(code, code === "CHANGE_COOLDOWN" ? 409 : 400, corsHeaders, extra);
    }
    return success(profileData(data.profile), corsHeaders);
  } catch {
    console.error("leaderboard-profile request failed", { action });
    return failure("SERVER_ERROR", 500, corsHeaders);
  }
});
