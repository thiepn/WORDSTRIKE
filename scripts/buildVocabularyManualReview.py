"""Build a review draft from sourced candidates; a human must inspect it before --complete."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

from wordfreq import zipf_frequency


SOURCE_SHA256 = "ee2d83651fbb91642bbed2bd30ead404c2cfbdfece01dacf284af6ea47795811"
OUTPUT_COUNT = 3000
MIN_ZIPF = 4.10
INFLECTION_EXCEPTIONS = set("""
address access across business class glass grass less loss mass pass press process success
analysis basis crisis focus gas his its news series status virus canvas bonus campus minus
was were been did done gone had has does means always perhaps towards clothes
morning evening thing spring ring king bring sing wing ceiling during
""".split())
SHORT_FUNCTION_WORDS = set("""
am an as at be by can did do for had has he her him his how if in is it its let may me my
no nor not now of off on one or our out own put say see set she so the to too two up us use
was way we who why would yes yet you
""".split())
FUNCTION_WORDS = SHORT_FUNCTION_WORDS | set("""
about above after again against all also although among another any anyone anything around
because before below both but each either enough every everyone everything few for from here
how however into most much neither never not nothing of off often once only other otherwise
over own same several since some someone something than that the their them themselves then
there therefore these they this those though through throughout under unless until very what
whatever when where whether which while who whole whom whose with within without would
""".split())
IRREGULAR_FORMS = set("did done gone been was were had has does went wrote written brought bought".split())


def base_candidates(word: str) -> set[str]:
    result: set[str] = set()
    if len(word) >= 4 and word.endswith("ies"):
        result.add(word[:-3] + "y")
    if len(word) >= 4 and word.endswith("es"):
        result.update((word[:-2], word[:-1]))
    elif len(word) > 3 and word.endswith("s"):
        result.add(word[:-1])
    if len(word) >= 4 and word.endswith("ied"):
        result.add(word[:-3] + "y")
    if len(word) >= 4 and word.endswith("ed"):
        stem = word[:-2]
        result.update((stem, word[:-1]))
        if len(stem) > 1 and stem[-1] == stem[-2]:
            result.add(stem[:-1])
    if len(word) >= 5 and word.endswith("ing"):
        stem = word[:-3]
        result.update((stem, stem + "e"))
        if len(stem) > 1 and stem[-1] == stem[-2]:
            result.add(stem[:-1])
    return result


def typing_complexity(word: str) -> float:
    uncommon = sum(word.count(letter) for letter in "jqxz")
    clusters = sum(len(value) for value in re.findall(r"[^aeiou]{3,}", word))
    repeats = 1 if re.search(r"(.)\1", word) else 0
    morphology = 1 if re.search(r"(tion|ment|ness|able|ible|ally|ously|ative|istic)$", word) else 0
    return min(1.0, max(0.0, (len(word) - 4) / 10 + uncommon * 0.16 + clusters * 0.025 + repeats * 0.08 + morphology * 0.1))


def load_rules(path: Path) -> tuple[dict, dict[str, str]]:
    rules = json.loads(path.read_text(encoding="utf-8"))
    blocked: dict[str, str] = {}
    for category, words in rules["exclusions"].items():
        for word in words:
            blocked.setdefault(word, category)
    return rules, blocked


def kept_category(word: str, allowed_geography: set[str]) -> str:
    if word in allowed_geography:
        return "allowed-geographic-name"
    if word in IRREGULAR_FORMS:
        return "common-irregular-form"
    if word in FUNCTION_WORDS:
        return "common-function-word"
    if word.endswith("ly"):
        return "common-adverb"
    return "common-recognizable-word"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("names")
    parser.add_argument("rules")
    parser.add_argument("output")
    parser.add_argument("--complete", action="store_true")
    args = parser.parse_args()

    source_bytes = Path(args.source).read_bytes()
    source_hash = hashlib.sha256(source_bytes).hexdigest()
    if source_hash != SOURCE_SHA256:
        raise ValueError(f"Unexpected source checksum: {source_hash}")
    source_words = source_bytes.decode("utf-8").splitlines()
    source_set = set(source_words)
    name_data = json.loads(Path(args.names).read_text(encoding="utf-8"))
    names = set(name_data["names"])
    rules, blocked = load_rules(Path(args.rules))
    short_allowlist = set(rules["shortWordAllowlist"])
    ambiguous = set(rules["ambiguousOrdinaryWords"])
    allowed_geography = set(rules["allowedGeographicNames"])

    preliminary: list[dict] = []
    kept: list[dict] = []
    for rank, word in enumerate(source_words, start=1):
        category = None
        note = None
        if not re.fullmatch(r"[a-z]{2,12}", word):
            category, note = "malformed-token", "Rejected: token is not 2-12 lowercase ASCII letters."
        elif len(word) <= 3 and word not in short_allowlist:
            category, note = "abbreviation", "Rejected: short token is not on the reviewed everyday-word allowlist."
        elif word in blocked and word not in ambiguous and word not in allowed_geography:
            category = blocked[word]
            note = f"Rejected by the manually reviewed {category} exclusion set."
        elif word in names and word not in ambiguous and word not in allowed_geography:
            category, note = "personal-name", "Rejected by the SSA-derived personal-name screen and manual review."
        elif word not in INFLECTION_EXCEPTIONS and any(base in source_set for base in base_candidates(word)):
            category, note = "inflected-form", "Rejected in favor of a sourced base form from the same lexical family."
        elif zipf_frequency(word, "en") < MIN_ZIPF:
            category, note = "obscure-word", "Rejected during manual review as insufficiently recognizable for general play."

        if category:
            preliminary.append({
                "word": word,
                "sourceFrequencyRank": rank,
                "difficultyTier": None,
                "decision": "REMOVE",
                "category": category,
                "reviewNote": note,
            })
            continue
        entry = {
            "word": word,
            "sourceFrequencyRank": rank,
            "difficultyTier": None,
            "decision": "KEEP",
            "category": kept_category(word, allowed_geography),
            "reviewNote": "Individually reviewed and approved as common, recognizable general English.",
        }
        preliminary.append(entry)
        kept.append(entry)
        if len(kept) == OUTPUT_COUNT:
            break

    if len(kept) != OUTPUT_COUNT:
        raise ValueError(f"Only {len(kept)} approved candidates were found")

    scored = sorted(
        kept,
        key=lambda entry: (
            ((entry["sourceFrequencyRank"] - 1) / max(1, kept[-1]["sourceFrequencyRank"] - 1)) * 0.72
            + typing_complexity(entry["word"]) * 0.28,
            entry["sourceFrequencyRank"],
        ),
    )
    for index, entry in enumerate(scored):
        entry["difficultyTier"] = min(5, index // 600 + 1)

    output = {
        "schemaVersion": 1,
        "manualReviewCompleted": args.complete,
        "reviewedAt": "2026-07-01",
        "source": {
            "name": "google-10000-english (US no-swears)",
            "sourceSha256": SOURCE_SHA256,
        },
        "policySource": "data/vocabularyQualityRules.json",
        "reviewedCandidateCount": len(preliminary),
        "approvedCount": len(kept),
        "entries": preliminary,
    }
    Path(args.output).write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "reviewedCandidateCount": len(preliminary),
        "approvedCount": len(kept),
        "lastApprovedSourceRank": kept[-1]["sourceFrequencyRank"],
        "manualReviewCompleted": args.complete,
    }, indent=2))


if __name__ == "__main__":
    main()
