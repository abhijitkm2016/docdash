import { supabase } from './supabase'

// Authorization header for our own /api/* calls. The server verifies the token;
// an empty object means "not signed in".
export async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}
