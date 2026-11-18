import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type CheckAnswerRequest = {
  questionId: string;
  answer: string;
};

function normalize(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('nl-NL').replace(/[.!?]+$/g, '').replace(/\s+/g, ' ');
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body: unknown = await request.json();

    if (
      typeof body !== 'object' ||
      body === null ||
      !('questionId' in body) ||
      !('answer' in body) ||
      typeof body.questionId !== 'string' ||
      typeof body.answer !== 'string'
    ) {
      return jsonResponse({ error: 'Invalid request body' }, 400);
    }

    const { questionId, answer } = body as CheckAnswerRequest;

    if (!questionId.trim() || questionId.length > 150 || answer.length > 1000) {
      return jsonResponse({ error: 'Invalid question or answer' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    const secretKey = Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !secretKey) {
      console.error('Missing Supabase server configuration');

      return jsonResponse({ error: 'Server configuration error' }, 500);
    }

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

    // Ellenőrizzük, hogy létezik-e aktív kérdés.
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('id')
      .eq('id', questionId)
      .eq('is_active', true)
      .maybeSingle();

    if (questionError) {
      throw questionError;
    }

    if (!question) {
      return jsonResponse({ error: 'Question not found' }, 404);
    }

    // Atomikus limit: maximum 30 beküldés / 60 másodperc / felhasználó.
    const { data: allowed, error: limitError } = await supabase.rpc('register_answer_attempt', {
      p_user_id: user.id,
      p_question_id: questionId,
    });
    if (limitError) throw limitError;
    if (!allowed) return jsonResponse({ error: 'Rate limit exceeded' }, 429);

    // Helyes válaszok lekérése.
    const { data: answers, error: answersError } = await supabase
      .from('question_answers')
      .select('answer')
      .eq('question_id', questionId);

    if (answersError) {
      throw answersError;
    }

    if (!answers?.length) {
      return jsonResponse({ error: 'No answers configured' }, 500);
    }

    const normalizedAnswer = normalize(answer);

    const isCorrect = answers.some(
      ({ answer: correctAnswer }) => normalize(correctAnswer) === normalizedAnswer,
    );

    // Román magyarázat és segítség.
    const { data: translation, error: translationError } = await supabase
      .from('question_translations')
      .select('explanation, hint')
      .eq('question_id', questionId)
      .eq('language', 'ro')
      .maybeSingle();

    if (translationError) {
      throw translationError;
    }

    return jsonResponse({
      questionId,
      correct: isCorrect,
      score: isCorrect ? 100 : 0,
      suggested: answers[0]?.answer ?? '',
      explanation: translation?.explanation ?? '',
      hint: translation?.hint ?? '',
    });
  } catch (error) {
    console.error('Check answer failed:', error);

    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
