# Typing Test

Typing Test uses one fixed benchmark vocabulary:

- Public name: **English 200**
- Internal ID: `english-200`
- Version: `1`
- Source: `data/english200.json`
- Actual approved count: `199`

The English 200 name and ID are intentional even though the approved ordered array contains 199 unique lowercase words. Both `I` and `i` are intentionally absent, and no replacement word was added.

There is no English 1k mode, word-set selector, custom vocabulary, punctuation, numbers, language selection, or difficulty selector.

Time configurations remain 15, 30, 60, and 120 seconds. Word configurations remain 25, 50, and 100 words. Generation remains seed-deterministic, avoids immediate duplicates, and extends the queue in shuffled batches. WPM, Raw WPM, CPM, accuracy, error history, spaces, Backspace behavior, and completion timing are unchanged.

English 200 results include the word-set identity in the session configuration, normalized result, record namespace, recent summary, and diagnostics. Records without a word-set ID are interpreted as the preserved `legacy-common-740` benchmark and never compete with English 200 records.

The existing `data/typingTestWords.json` file remains the unchanged 740-word common-vocabulary pool used by other game systems. Campaign, bosses, Endless, and Daily Strike retain their existing vocabulary behavior.
