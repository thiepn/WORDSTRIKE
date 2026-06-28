begin;

create or replace function public.submit_leaderboard_result(
    p_user_id uuid,
    p_board_key text,
    p_session_id text,
    p_client_version text,
    p_score bigint,
    p_stage integer,
    p_accuracy numeric,
    p_duration_ms bigint,
    p_completed boolean,
    p_words_completed integer,
    p_integrity_remaining integer,
    p_challenge_date date,
    p_challenge_version integer,
    p_metrics jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    selected_board public.leaderboard_boards%rowtype;
    existing_id uuid;
    inserted_id uuid;
    recent_count integer;
begin
    perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

    if not exists (
        select 1 from public.leaderboard_profiles where user_id = p_user_id
    ) then
        return jsonb_build_object('ok', false, 'code', 'PROFILE_REQUIRED');
    end if;

    select * into selected_board
    from public.leaderboard_boards
    where board_key = p_board_key
      and board_key in ('daily-strike-v1', 'endless-v1')
      and is_active = true
      and is_visible = true;

    if not found then
        return jsonb_build_object('ok', false, 'code', 'BOARD_UNAVAILABLE');
    end if;

    select id into existing_id
    from public.leaderboard_submissions
    where user_id = p_user_id
      and board_key = p_board_key
      and session_id = p_session_id;

    if existing_id is not null then
        return jsonb_build_object(
            'ok', true,
            'duplicate', true,
            'submission_id', existing_id,
            'rules_version', selected_board.rules_version
        );
    end if;

    select count(*) into recent_count
    from public.leaderboard_submissions
    where user_id = p_user_id
      and moderation_status = 'accepted'
      and submitted_at >= now() - interval '1 hour';

    if recent_count >= 30 then
        return jsonb_build_object('ok', false, 'code', 'RATE_LIMITED');
    end if;

    insert into public.leaderboard_submissions (
        user_id, board_key, rules_version, session_id, client_version,
        score, stage, accuracy, duration_ms, completed, words_completed,
        integrity_remaining, challenge_date, challenge_version, metrics,
        moderation_status
    ) values (
        p_user_id, selected_board.board_key, selected_board.rules_version,
        p_session_id, p_client_version, p_score, p_stage, p_accuracy,
        p_duration_ms, p_completed, p_words_completed, p_integrity_remaining,
        p_challenge_date, p_challenge_version, p_metrics, 'accepted'
    )
    on conflict (user_id, board_key, session_id) do nothing
    returning id into inserted_id;

    if inserted_id is null then
        select id into existing_id
        from public.leaderboard_submissions
        where user_id = p_user_id
          and board_key = p_board_key
          and session_id = p_session_id;
        return jsonb_build_object(
            'ok', true,
            'duplicate', true,
            'submission_id', existing_id,
            'rules_version', selected_board.rules_version
        );
    end if;

    return jsonb_build_object(
        'ok', true,
        'duplicate', false,
        'submission_id', inserted_id,
        'rules_version', selected_board.rules_version
    );
end;
$$;

revoke all on function public.submit_leaderboard_result(
    uuid, text, text, text, bigint, integer, numeric, bigint, boolean,
    integer, integer, date, integer, jsonb
) from public, anon, authenticated;

grant execute on function public.submit_leaderboard_result(
    uuid, text, text, text, bigint, integer, numeric, bigint, boolean,
    integer, integer, date, integer, jsonb
) to service_role;

commit;
