begin;

-- ============================================================
-- BOARD REGISTRY
-- ============================================================

create table public.leaderboard_boards (
    board_key text primary key,

    display_name text not null,

    mode text not null
        check (
            mode in (
                'daily_strike',
                'endless',
                'campaign',
                'typing_test'
            )
        ),

    rules_version integer not null
        check (rules_version > 0),

    ranking_strategy text not null,

    is_active boolean not null default false,
    is_visible boolean not null default false,

    created_at timestamptz not null default now()
);

comment on table public.leaderboard_boards is
    'Registry of WORDSTRIKE global leaderboard boards and rule versions.';


-- ============================================================
-- PUBLIC USERNAMES
-- ============================================================

create table public.leaderboard_profiles (
    user_id uuid primary key
        references auth.users(id)
        on delete cascade,

    username text not null,

    username_normalized text
        generated always as (lower(username)) stored,

    username_changed_at timestamptz not null default now(),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint leaderboard_profiles_username_format
        check (username ~ '^[A-Za-z0-9_]{3,20}$'),

    constraint leaderboard_profiles_username_unique
        unique (username_normalized)
);

comment on table public.leaderboard_profiles is
    'Public WORDSTRIKE usernames linked to permanent Google-authenticated users.';


-- ============================================================
-- APPEND-ONLY SCORE SUBMISSIONS
-- ============================================================

create table public.leaderboard_submissions (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    board_key text not null
        references public.leaderboard_boards(board_key),

    rules_version integer not null
        check (rules_version > 0),

    session_id text not null
        check (char_length(session_id) between 1 and 128),

    client_version text not null
        check (char_length(client_version) between 1 and 64),

    score bigint
        check (score is null or score >= 0),

    stage integer
        check (stage is null or stage >= 1),

    level integer
        check (level is null or level >= 1),

    grade text
        check (
            grade is null
            or grade in ('S', 'A', 'B', 'C', 'D', 'FAIL')
        ),

    wpm numeric(8, 2)
        check (
            wpm is null
            or (wpm >= 0 and wpm <= 1000)
        ),

    raw_wpm numeric(8, 2)
        check (
            raw_wpm is null
            or (raw_wpm >= 0 and raw_wpm <= 2000)
        ),

    accuracy numeric(5, 2)
        check (
            accuracy is null
            or (accuracy >= 0 and accuracy <= 100)
        ),

    duration_ms bigint
        check (
            duration_ms is null
            or duration_ms > 0
        ),

    completed boolean,

    words_completed integer
        check (
            words_completed is null
            or words_completed >= 0
        ),

    integrity_remaining integer
        check (
            integrity_remaining is null
            or integrity_remaining >= 0
        ),

    challenge_date date,

    challenge_version integer
        check (
            challenge_version is null
            or challenge_version > 0
        ),

    metrics jsonb not null default '{}'::jsonb
        check (jsonb_typeof(metrics) = 'object'),

    moderation_status text not null default 'accepted'
        check (
            moderation_status in (
                'accepted',
                'flagged',
                'removed'
            )
        ),

    submitted_at timestamptz not null default now(),

    constraint leaderboard_submission_session_unique
        unique (user_id, board_key, session_id)
);

comment on table public.leaderboard_submissions is
    'Append-only validated WORDSTRIKE global leaderboard submissions.';


-- ============================================================
-- INDEXES
-- ============================================================

create index leaderboard_submissions_user_board_idx
    on public.leaderboard_submissions (
        user_id,
        board_key,
        submitted_at desc
    );

create index leaderboard_submissions_daily_rank_idx
    on public.leaderboard_submissions (
        challenge_date,
        challenge_version,
        completed desc,
        score desc,
        accuracy desc,
        duration_ms asc,
        submitted_at asc
    )
    where
        board_key = 'daily-strike-v1'
        and moderation_status = 'accepted';

create index leaderboard_submissions_endless_rank_idx
    on public.leaderboard_submissions (
        stage desc,
        score desc,
        accuracy desc,
        submitted_at asc
    )
    where
        board_key = 'endless-v1'
        and moderation_status = 'accepted';

create index leaderboard_submissions_campaign_rank_idx
    on public.leaderboard_submissions (
        level desc,
        accuracy desc,
        submitted_at asc
    )
    where
        board_key = 'campaign-highest-level-v1'
        and moderation_status = 'accepted';

create index leaderboard_submissions_typing_15_rank_idx
    on public.leaderboard_submissions (
        wpm desc,
        accuracy desc,
        raw_wpm desc,
        submitted_at asc
    )
    where
        board_key = 'typing-15s-english200-v1'
        and moderation_status = 'accepted';

create index leaderboard_submissions_typing_60_rank_idx
    on public.leaderboard_submissions (
        wpm desc,
        accuracy desc,
        raw_wpm desc,
        submitted_at asc
    )
    where
        board_key = 'typing-60s-english200-v1'
        and moderation_status = 'accepted';


-- ============================================================
-- UPDATED-AT TRIGGER
-- ============================================================

create or replace function public.touch_leaderboard_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger leaderboard_profiles_touch_updated_at
before update on public.leaderboard_profiles
for each row
execute function public.touch_leaderboard_profile_updated_at();

revoke execute
on function public.touch_leaderboard_profile_updated_at()
from public, anon, authenticated;


-- ============================================================
-- BOARD DEFINITIONS
-- ============================================================

insert into public.leaderboard_boards (
    board_key,
    display_name,
    mode,
    rules_version,
    ranking_strategy,
    is_active,
    is_visible
)
values
    (
        'daily-strike-v1',
        'Daily Strike',
        'daily_strike',
        1,
        'completion-score-accuracy-time',
        true,
        true
    ),
    (
        'endless-v1',
        'Endless',
        'endless',
        1,
        'stage-score-accuracy',
        true,
        true
    ),
    (
        'campaign-highest-level-v1',
        'Campaign',
        'campaign',
        1,
        'level-grade-accuracy',
        false,
        false
    ),
    (
        'typing-15s-english200-v1',
        'Typing Test 15s',
        'typing_test',
        1,
        'wpm-accuracy-raw-wpm',
        false,
        false
    ),
    (
        'typing-60s-english200-v1',
        'Typing Test 60s',
        'typing_test',
        1,
        'wpm-accuracy-raw-wpm',
        false,
        false
    );


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.leaderboard_boards
    enable row level security;

alter table public.leaderboard_profiles
    enable row level security;

alter table public.leaderboard_submissions
    enable row level security;


-- ============================================================
-- ACCESS CONTROL
-- ============================================================

-- Browser clients cannot directly read or modify the tables.
-- All access will go through controlled Edge Functions.

revoke all
on table public.leaderboard_boards
from anon, authenticated;

revoke all
on table public.leaderboard_profiles
from anon, authenticated;

revoke all
on table public.leaderboard_submissions
from anon, authenticated;

-- Backend Edge Functions use a protected secret key.

grant select, insert, update, delete
on table public.leaderboard_boards
to service_role;

grant select, insert, update, delete
on table public.leaderboard_profiles
to service_role;

grant select, insert, update, delete
on table public.leaderboard_submissions
to service_role;

commit;