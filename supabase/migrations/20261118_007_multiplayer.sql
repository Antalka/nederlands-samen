-- Nederlands Samen multiplayer. Run once in Supabase SQL Editor.
-- SECURITY DEFINER RPCs own all mutations; no browser writes to game tables.
create table if not exists public.group_games (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[0-9]{6}$'),
  host_id uuid not null,
  topic text not null default 'mixed',
  question_count integer not null default 10 check (question_count between 5 and 20),
  question_ids text[] not null default '{}',
  current_index integer not null default 0,
  question_started_at timestamptz,
  status text not null default 'lobby' check (status in ('lobby','playing','finished')),
  created_at timestamptz not null default now()
);
create table if not exists public.group_players (
  game_id uuid not null references public.group_games(id) on delete cascade,
  user_id uuid not null,
  nickname text not null check (char_length(nickname) between 1 and 32),
  score integer not null default 0,
  answered_index integer not null default -1,
  last_correct boolean,
  primary key (game_id,user_id)
);
create table if not exists public.group_responses (
  game_id uuid not null references public.group_games(id) on delete cascade,
  user_id uuid not null,
  question_index integer not null,
  submitted_at timestamptz not null default now(),
  primary key(game_id,user_id,question_index),
  foreign key(game_id,user_id) references public.group_players(game_id,user_id) on delete cascade
);
create index if not exists group_games_created_idx on public.group_games(created_at);
create index if not exists group_players_game_idx on public.group_players(game_id);
alter table public.group_games enable row level security;
alter table public.group_players enable row level security;
alter table public.group_responses enable row level security;

create or replace function public.group_is_member(p_game uuid) returns boolean
language sql security definer set search_path = '' stable as $$
  select exists(select 1 from public.group_players p where p.game_id=p_game and p.user_id=(select auth.uid()));
$$;
revoke all on function public.group_is_member(uuid) from public;
grant execute on function public.group_is_member(uuid) to authenticated;

drop policy if exists group_games_member_read on public.group_games;
create policy group_games_member_read on public.group_games for select to authenticated using (public.group_is_member(id));
drop policy if exists group_players_member_read on public.group_players;
create policy group_players_member_read on public.group_players for select to authenticated using (public.group_is_member(game_id));
-- No direct INSERT/UPDATE/DELETE policies. No access to group_responses.

create or replace function public.group_create(p_nickname text, p_topic text default 'mixed', p_count integer default 10)
returns text language plpgsql security definer set search_path = '' as $$
declare v_code text; v_game uuid; v_try int;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if length(trim(coalesce(p_nickname,''))) not between 1 and 32 then raise exception 'Invalid nickname'; end if;
  if p_topic not in ('mixed','negation','modal','verbs','vocab','situations','order','translation','general') then raise exception 'Invalid category'; end if;
  if p_count not between 5 and 20 then raise exception 'Invalid question count'; end if;
  for v_try in 1..20 loop
    v_code := lpad((floor(random()*1000000))::integer::text,6,'0');
    begin
    insert into public.group_games(code,host_id,topic,question_count) values(v_code,auth.uid(),p_topic,p_count) returning id into v_game;
    exit;
    exception when unique_violation then null;
    end;
  end loop;
  if v_game is null then raise exception 'Could not allocate game code'; end if;
  insert into public.group_players(game_id,user_id,nickname) values(v_game,auth.uid(),trim(p_nickname));
  return v_code;
end $$;

create or replace function public.group_join(p_code text, p_nickname text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_game public.group_games%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if length(trim(coalesce(p_nickname,''))) not between 1 and 32 then raise exception 'Invalid nickname'; end if;
  select * into v_game from public.group_games where code=p_code for update;
  if not found then raise exception 'Room not found'; end if;
  if v_game.status <> 'lobby' and not exists(select 1 from public.group_players where game_id=v_game.id and user_id=auth.uid()) then
    raise exception 'Game already started';
  end if;
  if not exists(select 1 from public.group_players where game_id=v_game.id and user_id=auth.uid()) and
      (select count(*) from public.group_players where game_id=v_game.id)>=20 then raise exception 'Room is full'; end if;
  insert into public.group_players(game_id,user_id,nickname) values(v_game.id,auth.uid(),trim(p_nickname))
  on conflict(game_id,user_id) do update set nickname=excluded.nickname;
  return v_game.id;
end $$;

create or replace function public.group_start(p_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_game public.group_games%rowtype; v_ids text[];
begin
  select * into v_game from public.group_games where code=p_code for update;
  if not found or v_game.host_id is distinct from auth.uid() then raise exception 'Only the host can start'; end if;
  if v_game.status <> 'lobby' then raise exception 'Game already started'; end if;
  select array_agg(id) into v_ids from (
    select id from public.questions where is_active=true and (v_game.topic='mixed' or topic=v_game.topic)
    order by random() limit v_game.question_count
  ) q;
  if coalesce(array_length(v_ids,1),0)<v_game.question_count then raise exception 'Not enough questions in this category'; end if;
  update public.group_games set question_ids=v_ids,status='playing',current_index=0,question_started_at=now() where id=v_game.id;
end $$;

create or replace function public.group_submit(p_code text, p_answer text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_game public.group_games%rowtype; v_question text; v_correct boolean; v_points int; v_elapsed numeric;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if length(coalesce(p_answer,''))>1000 or trim(coalesce(p_answer,''))='' then raise exception 'Invalid answer'; end if;
  select * into v_game from public.group_games where code=p_code for update;
  if not found or v_game.status<>'playing' then raise exception 'Game is not active'; end if;
  if not exists(select 1 from public.group_players where game_id=v_game.id and user_id=auth.uid()) then raise exception 'Not a player'; end if;
  if now()>v_game.question_started_at+interval '30 seconds' then raise exception 'Time is up'; end if;
  insert into public.group_responses(game_id,user_id,question_index) values(v_game.id,auth.uid(),v_game.current_index)
  on conflict do nothing;
  if not found then raise exception 'Already answered'; end if;
  v_question := v_game.question_ids[v_game.current_index+1];
  select exists(select 1 from public.question_answers a where a.question_id=v_question and
    lower(regexp_replace(trim(a.answer),'[.!?]+$','','g'))=lower(regexp_replace(trim(p_answer),'[.!?]+$','','g')))
  into v_correct;
  v_elapsed := extract(epoch from (now()-v_game.question_started_at));
  v_points := case when v_correct then greatest(300,1000-floor(v_elapsed*20)::int) else 0 end;
  update public.group_players set score=score+v_points,answered_index=v_game.current_index,last_correct=v_correct
  where game_id=v_game.id and user_id=auth.uid();
  return jsonb_build_object('correct',v_correct,'points',v_points);
end $$;

create or replace function public.group_advance(p_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_game public.group_games%rowtype; v_total int; v_answered int;
begin
  select * into v_game from public.group_games where code=p_code for update;
  if not found or v_game.host_id is distinct from auth.uid() then raise exception 'Only the host can continue'; end if;
  if v_game.status<>'playing' then raise exception 'Game is not active'; end if;
  select count(*) into v_total from public.group_players where game_id=v_game.id;
  select count(*) into v_answered from public.group_responses where game_id=v_game.id and question_index=v_game.current_index;
  if v_answered<v_total and now()<v_game.question_started_at+interval '30 seconds' then
    raise exception 'Wait for all players or the timer';
  end if;
  if v_game.current_index+1 >= array_length(v_game.question_ids,1) then
    update public.group_games set status='finished',question_started_at=null where id=v_game.id;
  else
    update public.group_games set current_index=current_index+1,question_started_at=now() where id=v_game.id;
  end if;
end $$;

create or replace function public.group_state(p_code text)
returns jsonb language plpgsql security definer set search_path = '' stable as $$
declare v_game public.group_games%rowtype; v_players jsonb; v_question jsonb; v_me public.group_players%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_game from public.group_games where code=p_code;
  if not found then raise exception 'Room not found'; end if;
  select * into v_me from public.group_players where game_id=v_game.id and user_id=auth.uid();
  if not found then raise exception 'Not a member'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('nickname',nickname,'score',score,'answered',answered_index=v_game.current_index,'isHost',user_id=v_game.host_id) order by score desc,nickname),'[]'::jsonb)
  into v_players from public.group_players where game_id=v_game.id;
  if v_game.status='playing' then
    select jsonb_build_object('id',id,'type',type,'topic',topic,'level',level,'prompt',prompt,'options',options)
    into v_question from public.questions where id=v_game.question_ids[v_game.current_index+1];
  end if;
  return jsonb_build_object('code',v_game.code,'status',v_game.status,'isHost',v_game.host_id=auth.uid(),
    'index',v_game.current_index,'count',v_game.question_count,'startedAt',v_game.question_started_at,
    'question',v_question,'players',v_players,'answered',v_me.answered_index=v_game.current_index,
    'lastCorrect',case when v_me.answered_index=v_game.current_index then v_me.last_correct else null end);
end $$;

revoke all on function public.group_create(text,text,integer),public.group_join(text,text),public.group_start(text),public.group_submit(text,text),public.group_advance(text),public.group_state(text) from public,anon;
grant execute on function public.group_create(text,text,integer),public.group_join(text,text),public.group_start(text),public.group_submit(text,text),public.group_advance(text),public.group_state(text) to authenticated;
-- Realtime optional: the frontend also polls every 2 seconds for resilience.
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='group_games') then
    alter publication supabase_realtime add table public.group_games;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='group_players') then
    alter publication supabase_realtime add table public.group_players;
  end if;
end $$;
