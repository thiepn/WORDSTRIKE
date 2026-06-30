# Original leaderboard restoration

The version-2 separation for Campaign, Endless, and Daily Strike is intentionally
abandoned. Migration `20260701010000_restore_original_leaderboard_rules.sql` restores
their existing board rows to rules version 1 without editing or deleting any
submissions. Version-2 rows remain stored but inactive.

Daily Strike also uses challenge version 1 again. The current gameplay, vocabulary,
movement, pacing, scoring, and ranking comparators remain unchanged.

## Safe verification

After deployment, inspect the active boards with:

```sql
select
  board_key,
  rules_version,
  is_active,
  is_visible
from public.leaderboard_boards
where board_key in (
  'campaign-highest-level-v1',
  'typing-15s-english200-v1',
  'typing-60s-english200-v1',
  'endless-v1',
  'daily-strike-v1'
)
order by board_key;
```

All five rows should report `rules_version = 1`.

Inspect preserved submissions without modifying them:

```sql
select
  board_key,
  rules_version,
  challenge_version,
  moderation_status,
  count(*) as submission_count
from public.leaderboard_submissions
group by
  board_key,
  rules_version,
  challenge_version,
  moderation_status
order by
  board_key,
  rules_version,
  challenge_version;
```

## Deployment order

1. Apply the rollback migration.
2. Deploy `get-leaderboard` with the restored shared Daily version contract.
3. Deploy `submit-score` with Daily challenge-version-1 validation.
4. Publish the frontend cache and Daily-version update.

Do not delete or rewrite version-1 or version-2 submission rows.
