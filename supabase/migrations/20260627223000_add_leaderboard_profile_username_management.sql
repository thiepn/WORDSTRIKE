begin;

alter table public.leaderboard_profiles
    alter column username_changed_at drop default,
    alter column username_changed_at drop not null;

comment on column public.leaderboard_profiles.username_changed_at is
    'Timestamp of the most recent username change after the initial claim. NULL means no change has occurred.';

create or replace function public.claim_leaderboard_profile(
    p_user_id uuid,
    p_username text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    created_profile public.leaderboard_profiles%rowtype;
begin
    insert into public.leaderboard_profiles (user_id, username, username_changed_at)
    values (p_user_id, p_username, null)
    returning * into created_profile;

    return jsonb_build_object(
        'ok', true,
        'profile', jsonb_build_object(
            'username', created_profile.username,
            'username_changed_at', created_profile.username_changed_at
        )
    );
exception
    when unique_violation then
        if exists (
            select 1
            from public.leaderboard_profiles
            where user_id = p_user_id
        ) then
            return jsonb_build_object('ok', false, 'code', 'PROFILE_ALREADY_EXISTS');
        end if;
        return jsonb_build_object('ok', false, 'code', 'USERNAME_TAKEN');
end;
$$;

create or replace function public.change_leaderboard_username(
    p_user_id uuid,
    p_username text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    current_profile public.leaderboard_profiles%rowtype;
    changed_profile public.leaderboard_profiles%rowtype;
    changed_at timestamptz := clock_timestamp();
    eligible_at timestamptz;
begin
    select *
    into current_profile
    from public.leaderboard_profiles
    where user_id = p_user_id
    for update;

    if not found then
        return jsonb_build_object('ok', false, 'code', 'PROFILE_NOT_FOUND');
    end if;

    if current_profile.username_normalized = lower(p_username) then
        return jsonb_build_object(
            'ok', true,
            'no_op', true,
            'profile', jsonb_build_object(
                'username', current_profile.username,
                'username_changed_at', current_profile.username_changed_at
            )
        );
    end if;

    if current_profile.username_changed_at is not null then
        eligible_at := current_profile.username_changed_at + interval '30 days';
        if eligible_at > changed_at then
            return jsonb_build_object(
                'ok', false,
                'code', 'CHANGE_COOLDOWN',
                'can_change_at', eligible_at
            );
        end if;
    end if;

    update public.leaderboard_profiles
    set username = p_username,
        username_changed_at = changed_at
    where user_id = p_user_id
    returning * into changed_profile;

    return jsonb_build_object(
        'ok', true,
        'profile', jsonb_build_object(
            'username', changed_profile.username,
            'username_changed_at', changed_profile.username_changed_at
        )
    );
exception
    when unique_violation then
        return jsonb_build_object('ok', false, 'code', 'USERNAME_TAKEN');
end;
$$;

revoke all on function public.claim_leaderboard_profile(uuid, text) from public, anon, authenticated;
revoke all on function public.change_leaderboard_username(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_leaderboard_profile(uuid, text) to service_role;
grant execute on function public.change_leaderboard_username(uuid, text) to service_role;

commit;
