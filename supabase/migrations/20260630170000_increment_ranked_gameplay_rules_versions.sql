-- Vocabulary, directional movement, Daily challenge generation, and Endless pacing changed.
-- Board keys remain stable; existing rows retain their historical rules_version and are
-- excluded by the existing active-board rules-version joins.
update public.leaderboard_boards
set rules_version = 2
where board_key in (
  'campaign-highest-level-v1',
  'endless-v1',
  'daily-strike-v1'
);

-- Typing boards intentionally remain on rules version 1 because English 200 v1 and
-- authoritative Typing metrics are unchanged.
