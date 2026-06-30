begin;

-- Rules version 2 is intentionally abandoned for these continuous leaderboards.
-- Restoring the active board rows to version 1 makes historical version-1 submissions
-- visible again and causes future submissions to be stored under version 1. The user
-- accepts rankings that mix the minor gameplay revisions introduced during version 2.
update public.leaderboard_boards
set rules_version = 1
where board_key in (
  'campaign-highest-level-v1',
  'endless-v1',
  'daily-strike-v1'
);

-- Version-2 submissions remain stored but inactive. Typing Test boards are unchanged.

commit;
