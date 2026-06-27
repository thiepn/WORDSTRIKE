begin;

create or replace function public.get_public_leaderboard(
    p_board_key text,
    p_challenge_date date default null,
    p_viewer_user_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    selected_board public.leaderboard_boards%rowtype;
    result jsonb;
begin
    select * into selected_board
    from public.leaderboard_boards
    where board_key = p_board_key
      and board_key in ('daily-strike-v1', 'endless-v1')
      and is_active = true
      and is_visible = true;

    if not found then
        return null;
    end if;

    with eligible as (
        select
            s.id,
            s.user_id,
            p.username,
            s.completed,
            s.score,
            s.stage,
            s.accuracy,
            s.duration_ms,
            s.words_completed,
            case
                when jsonb_typeof(s.metrics -> 'wordsResolved') = 'number'
                then (s.metrics ->> 'wordsResolved')::integer
                else 0
            end as words_resolved,
            s.submitted_at
        from public.leaderboard_submissions s
        join public.leaderboard_profiles p on p.user_id = s.user_id
        where s.board_key = selected_board.board_key
          and s.rules_version = selected_board.rules_version
          and s.moderation_status = 'accepted'
          and p.username ~ '^[A-Za-z0-9_]{3,20}$'
          and (
              selected_board.board_key <> 'daily-strike-v1'
              or (
                  s.challenge_date = p_challenge_date
                  and s.challenge_version = 1
              )
          )
    ),
    player_best as (
        select *
        from (
            select eligible.*,
                row_number() over (
                    partition by user_id
                    order by
                        case when selected_board.board_key = 'daily-strike-v1' then coalesce(completed, false) end desc,
                        case when selected_board.board_key = 'daily-strike-v1' and completed then score end desc nulls last,
                        case when selected_board.board_key = 'daily-strike-v1' and completed then duration_ms end asc nulls last,
                        case when selected_board.board_key = 'daily-strike-v1' and completed then accuracy end desc nulls last,
                        case when selected_board.board_key = 'daily-strike-v1' and completed then words_completed end desc nulls last,
                        case when selected_board.board_key = 'daily-strike-v1' and not coalesce(completed, false) then words_resolved end desc nulls last,
                        case when selected_board.board_key = 'daily-strike-v1' and not coalesce(completed, false) then words_completed end desc nulls last,
                        case when selected_board.board_key = 'daily-strike-v1' and not coalesce(completed, false) then score end desc nulls last,
                        case when selected_board.board_key = 'daily-strike-v1' and not coalesce(completed, false) then accuracy end desc nulls last,
                        case when selected_board.board_key = 'daily-strike-v1' and not coalesce(completed, false) then duration_ms end desc nulls last,
                        case when selected_board.board_key = 'endless-v1' then stage end desc nulls last,
                        case when selected_board.board_key = 'endless-v1' then score end desc nulls last,
                        case when selected_board.board_key = 'endless-v1' then words_completed end desc nulls last,
                        case when selected_board.board_key = 'endless-v1' then accuracy end desc nulls last,
                        submitted_at asc,
                        id asc
                ) as best_order
            from eligible
        ) ordered
        where best_order = 1
    ),
    ranked as (
        select player_best.*,
            row_number() over (
                order by
                    case when selected_board.board_key = 'daily-strike-v1' then coalesce(completed, false) end desc,
                    case when selected_board.board_key = 'daily-strike-v1' and completed then score end desc nulls last,
                    case when selected_board.board_key = 'daily-strike-v1' and completed then duration_ms end asc nulls last,
                    case when selected_board.board_key = 'daily-strike-v1' and completed then accuracy end desc nulls last,
                    case when selected_board.board_key = 'daily-strike-v1' and completed then words_completed end desc nulls last,
                    case when selected_board.board_key = 'daily-strike-v1' and not coalesce(completed, false) then words_resolved end desc nulls last,
                    case when selected_board.board_key = 'daily-strike-v1' and not coalesce(completed, false) then words_completed end desc nulls last,
                    case when selected_board.board_key = 'daily-strike-v1' and not coalesce(completed, false) then score end desc nulls last,
                    case when selected_board.board_key = 'daily-strike-v1' and not coalesce(completed, false) then accuracy end desc nulls last,
                    case when selected_board.board_key = 'daily-strike-v1' and not coalesce(completed, false) then duration_ms end desc nulls last,
                    case when selected_board.board_key = 'endless-v1' then stage end desc nulls last,
                    case when selected_board.board_key = 'endless-v1' then score end desc nulls last,
                    case when selected_board.board_key = 'endless-v1' then words_completed end desc nulls last,
                    case when selected_board.board_key = 'endless-v1' then accuracy end desc nulls last,
                    submitted_at asc,
                    id asc
            ) as rank
        from player_best
    )
    select jsonb_build_object(
        'board', jsonb_build_object(
            'boardKey', selected_board.board_key,
            'displayName', selected_board.display_name,
            'rulesVersion', selected_board.rules_version,
            'challengeDate', case when selected_board.board_key = 'daily-strike-v1' then p_challenge_date else null end
        ),
        'entries', coalesce((
            select jsonb_agg(jsonb_build_object(
                'rank', rank,
                'username', username,
                'stage', stage,
                'score', score,
                'accuracy', accuracy,
                'durationMs', duration_ms,
                'completed', completed,
                'submittedAt', submitted_at
            ) order by rank)
            from ranked where rank <= 100
        ), '[]'::jsonb),
        'viewer', (
            select jsonb_build_object(
                'rank', rank,
                'entry', jsonb_build_object(
                    'rank', rank,
                    'username', username,
                    'stage', stage,
                    'score', score,
                    'accuracy', accuracy,
                    'durationMs', duration_ms,
                    'completed', completed,
                    'submittedAt', submitted_at
                )
            )
            from ranked
            where user_id = p_viewer_user_id
        )
    ) into result;

    return result;
end;
$$;

revoke all on function public.get_public_leaderboard(text, date, uuid) from public, anon, authenticated;
grant execute on function public.get_public_leaderboard(text, date, uuid) to service_role;

commit;
