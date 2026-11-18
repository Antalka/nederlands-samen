import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
  try {
    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null || !('questionId' in body) ||
        typeof body.questionId !== 'string' || !body.questionId.trim() || body.questionId.length > 150) {
      return jsonResponse({ error: 'Invalid question ID' }, 400);
    }
    const questionId = body.questionId;
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const secretKey = Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !secretKey) return jsonResponse({ error: 'Server configuration error' }, 500);
    // Felhasználói JWT ellenőrzése.
    const authorization = request.headers.get('Authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY');

    if (!publishableKey) {
      console.error('Missing Supabase publishable key');
      return jsonResponse({ error: 'Server configuration error' }, 500);
    }

    const authClient = createClient(supabaseUrl, publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse({ error: 'Invalid session' }, 401);
    }

    const supabase = createClient(supabaseUrl, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: question, error: questionError } = await supabase
      .from('questions').select('id').eq('id', questionId).eq('is_active', true).maybeSingle();
    if (questionError) throw questionError;
    if (!question) return jsonResponse({ error: 'Question not found' }, 404);
    const { data: translation, error: translationError } = await supabase
      .from('question_translations').select('hint')
      .eq('question_id', questionId).eq('language', 'ro').maybeSingle();
    if (translationError) throw translationError;
    // Csak a segítséget küldjük vissza, helyes választ és magyarázatot soha.
    return jsonResponse({ questionId, hint: translation?.hint ?? '' });
  } catch (error) {
    console.error('Get hint failed:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
