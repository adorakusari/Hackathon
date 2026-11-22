-- Reaction Speed Arena: online ranking (Supabase / PostgreSQL)
-- Run this whole file once in Supabase: SQL Editor -> New query -> paste -> Run.

-- 1) The table that stores players. Nobody can read or write it directly.
create table if not exists public.players (
  name_key      text primary key,
  name          text not null check (char_length(name) between 2 and 16),
  token_hash    text not null,
  xp            integer not null default 0 check (xp >= 0),
  avatar        text not null default 'nova',
  custom        jsonb not null default '{}'::jsonb,
  achievements  integer not null default 0,
  best_streak   integer not null default 0,
  updated_at    timestamptz not null default now()
);
alter table public.players enable row level security;

-- 2) A public, read-only view for the leaderboard (it hides the secret token hash).
create or replace view public.leaderboard as
  select name_key, name, xp, avatar, custom, achievements, best_streak, updated_at
  from public.players;

-- 3) The only way to write: a function that checks the player's secret token.
--    The first device that uses a name owns it. Other devices are told "taken".
create or replace function public.submit_score(
  p_name text,
  p_token text,
  p_xp integer,
  p_avatar text,
  p_custom jsonb,
  p_achievements integer,
  p_best_streak integer
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_name text := trim(p_name);
  k text := lower(trim(p_name));
  h text;
  existing public.players%rowtype;
  safe_xp integer := greatest(0, coalesce(p_xp, 0));
  safe_custom jsonb := coalesce(p_custom, '{}'::jsonb);
begin
  if clean_name is null or char_length(clean_name) < 2 or char_length(clean_name) > 16 then
    return json_build_object('ok', false, 'error', 'name');
  end if;
  if p_token is null or char_length(p_token) < 16 then
    return json_build_object('ok', false, 'error', 'token');
  end if;
  if char_length(safe_custom::text) > 1500 then
    safe_custom := '{}'::jsonb;
  end if;
  h := encode(sha256(convert_to(p_token, 'utf8')), 'hex');

  select * into existing from public.players where name_key = k;
  if found then
    if existing.token_hash <> h then
      return json_build_object('ok', false, 'error', 'taken');
    end if;
    update public.players
       set xp = least(safe_xp, existing.xp + 3000),   -- limits sudden jumps
           avatar = left(coalesce(p_avatar, 'nova'), 12),
           custom = safe_custom,
           achievements = least(greatest(coalesce(p_achievements, 0), 0), 50),
           best_streak = least(greatest(coalesce(p_best_streak, 0), 0), 10000),
           updated_at = now()
     where name_key = k;
  else
    insert into public.players (name_key, name, token_hash, xp, avatar, custom, achievements, best_streak)
    values (k, clean_name, h, least(safe_xp, 6000), left(coalesce(p_avatar, 'nova'), 12), safe_custom,
            least(greatest(coalesce(p_achievements, 0), 0), 50), least(greatest(coalesce(p_best_streak, 0), 0), 10000));
  end if;
  return json_build_object('ok', true);
end;
$$;

-- 4) Allow the public (anon) key to read the leaderboard and call the function.
revoke all on public.players from anon, authenticated;
grant select on public.leaderboard to anon, authenticated;
grant execute on function public.submit_score(text, text, integer, text, jsonb, integer, integer) to anon, authenticated;
