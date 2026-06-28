<div align="center">

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&height=240&color=0:0B111A,45:00D9FF,100:FF2DAA&text=WORDSTRIKE&fontColor=FFFFFF&fontSize=58&fontAlignY=38&desc=Precision%20typing.%20Arcade%20pressure.%20Local-first%20progress.&descAlignY=60&animation=fadeIn" alt="WORDSTRIKE animated header" />

<br />

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=600&size=20&duration=2800&pause=900&color=00F5FF&center=true&vCenter=true&width=900&lines=100-level+Campaign+with+boss+encounters;English+200+tests+for+pure+typing+speed;Endless+survival+and+deterministic+Daily+Strike;Local+profiles%2C+records%2C+streaks%2C+and+statistics" alt="Animated WORDSTRIKE feature summary" />

<br /><br />

<a href="https://thiepn.github.io/WORDSTRIKE/">
  <img src="https://img.shields.io/badge/PLAY_LIVE-00F5FF?style=for-the-badge&logo=googlechrome&logoColor=0B111A" alt="Play WORDSTRIKE live" />
</a>
<a href="https://github.com/thiepn/WORDSTRIKE">
  <img src="https://img.shields.io/badge/SOURCE_CODE-0B111A?style=for-the-badge&logo=github&logoColor=FFFFFF" alt="View source code" />
</a>
<a href="#installation">
  <img src="https://img.shields.io/badge/INSTALL-FF2DAA?style=for-the-badge&logo=git&logoColor=FFFFFF" alt="Installation instructions" />
</a>
<a href="#documentation">
  <img src="https://img.shields.io/badge/DOCUMENTATION-0B111A?style=for-the-badge&logo=readthedocs&logoColor=00F5FF" alt="Project documentation" />
</a>

<br /><br />

<img src="https://img.shields.io/badge/status-active%20development-00D98B?style=flat-square&labelColor=0B111A" alt="Status: active development" />
<img src="https://img.shields.io/badge/release-alpha-00F5FF?style=flat-square&labelColor=0B111A" alt="Release status: alpha" />
<img src="https://img.shields.io/badge/tests-46%20test%20files%20passing-00D98B?style=flat-square&labelColor=0B111A" alt="46 test files passing" />
<img src="https://img.shields.io/badge/dependencies-none-00F5FF?style=flat-square&labelColor=0B111A" alt="No runtime dependencies" />
<img src="https://img.shields.io/badge/license-not%20specified-8D99A8?style=flat-square&labelColor=0B111A" alt="License not specified" />

<br />

<img src="https://img.shields.io/badge/HTML5-0B111A?style=flat-square&logo=html5&logoColor=00F5FF" alt="HTML5" />
<img src="https://img.shields.io/badge/CSS3-0B111A?style=flat-square&logo=css3&logoColor=00F5FF" alt="CSS3" />
<img src="https://img.shields.io/badge/JavaScript-0B111A?style=flat-square&logo=javascript&logoColor=FF2DAA" alt="JavaScript" />
<img src="https://img.shields.io/badge/GitHub_Pages-0B111A?style=flat-square&logo=githubpages&logoColor=00F5FF" alt="GitHub Pages" />

</div>

---

## About WORDSTRIKE

**WORDSTRIKE** is a local-first browser typing game that combines traditional speed testing with arcade-style pressure.

Instead of limiting the experience to static text, WORDSTRIKE turns words into active targets. Players defend a central core, progress through a 100-level Campaign, face timed boss encounters, survive escalating Endless stages, compete against a deterministic daily challenge, and track their records locally.

The project is designed for:

* typists who want a more engaging alternative to conventional speed tests;
* players who enjoy score chasing and mechanical progression;
* anyone who wants typing practice without accounts, subscriptions, or cloud tracking.

> [!NOTE]
> WORDSTRIKE is a static browser application. It has no runtime dependencies, account system, server requirement, or mandatory installation process.

---

<div align="center">

[Overview](#feature-overview) ·
[Game Modes](#game-modes) ·
[How to Play](#how-to-use) ·
[Installation](#installation) ·
[Architecture](#project-architecture) ·
[Privacy](#privacy--data-handling) ·
[Testing](#development--testing) ·
[Roadmap](#roadmap)

</div>

---

## Feature Overview

<table>
<tr>
<td width="50%" valign="top">

### 100-Level Campaign

* Fixed 100-level progression
* Increasing movement and spawn pressure
* Accuracy-based grades from **S** to **D**
* Boss encounter every tenth level
* Local unlock and grade persistence
* Deterministic per-attempt generation
* Dedicated Level Select screen

</td>
<td width="50%" valign="top">

### English 200 Typing Test

* Focused pure-speed vocabulary
* Public word-set name: **English 200**
* Approved source contains 199 unique words
* Time tests: **15 / 30 / 60 / 120 seconds**
* Word tests: **25 / 50 / 100 words**
* WPM, Raw WPM, accuracy, errors, backspaces, and word deletes

</td>
</tr>
<tr>
<td width="50%" valign="top">

### Endless Survival

* Three core-integrity points
* Twenty completed words per stage
* Increasing active-word pressure
* Capped mechanical speed progression
* Survival, word, and stage-clear scoring
* Combo and perfect-streak tracking
* Stage-first personal records

</td>
<td width="50%" valign="top">

### Daily Strike

* One deterministic challenge per UTC date
* Three waves and sixty planned words
* Identical challenge plan for every player
* Unlimited same-day attempts
* Daily best-result comparison
* Current and best streak tracking
* Ninety-day detailed local history

</td>
</tr>
<tr>
<td width="50%" valign="top">

### Mixed-Vocabulary Bosses

* Bosses at levels 10–100
* Target speeds from 40 to 100 WPM
* Recognizable common vocabulary
* Mixed short, medium, long, and very-long words
* Character-budget-based difficulty
* Deterministic seeded generation
* Timers based on actual sequence length

</td>
<td width="50%" valign="top">

### Local Profile & Statistics

* Stable local player ID
* Editable Unicode display name
* Lifetime playtime and session totals
* Campaign, Typing Test, Endless, and Daily records
* Weighted accuracy and WPM
* Recent-session filtering
* No account or cloud connection

</td>
</tr>
</table>

---

## Game Modes

### Campaign

Words spawn around the arena and move toward the central core. Type each word before it reaches the center.

Campaign difficulty is controlled through a smooth virtual-difficulty curve:

* Levels 1–5 introduce the core mechanics.
* Levels 6–9 establish moderate pressure.
* Levels 11–40 provide sustained intermediate gameplay.
* Levels 41–70 target advanced typists.
* Levels 71–99 provide expert pressure.
* Every tenth level is a dedicated boss encounter.

Campaign grades are based on accuracy:

| Grade |             Required accuracy |
| :---: | ----------------------------: |
| **S** |                 98% or higher |
| **A** |                 95% or higher |
| **B** |                 90% or higher |
| **C** |                 80% or higher |
| **D** | Below 80% on a successful run |

<details>
<summary><strong>Campaign boss progression</strong></summary>

<br />

| Boss level | Target WPM | Segments | Words per segment |
| ---------: | ---------: | -------: | ----------------: |
|         10 |         40 |        1 |                 5 |
|         20 |         60 |        1 |                 6 |
|         30 |         65 |        2 |                 5 |
|         40 |         70 |        2 |                 7 |
|         50 |         75 |        2 |                 8 |
|         60 |         80 |        3 |                 7 |
|         70 |         85 |        3 |                 9 |
|         80 |         90 |        3 |                10 |
|         90 |         95 |        3 |                11 |
|        100 |        100 |        3 |                12 |

Boss difficulty comes from sustained throughput and character volume rather than obscure vocabulary.

</details>

### Typing Test

Typing Test is optimized for direct speed measurement.

The only active vocabulary is **English 200**. No vocabulary selector, punctuation mode, number mode, or English 1k mode is currently included.

| Category                | Available tests                                              |
| ----------------------- | ------------------------------------------------------------ |
| Time                    | 15, 30, 60, and 120 seconds                                  |
| Words                   | 25, 50, and 100 words                                        |
| Primary metrics         | WPM, Raw WPM, accuracy                                       |
| Additional metrics      | Correct characters, errors, extras, backspaces, word deletes |
| Word-set identity       | `english-200`                                                |
| Actual approved entries | 199                                                          |

> [!IMPORTANT]
> English 200 records are stored separately from legacy records created with the former 740-word vocabulary. The two word sets are not compared as equivalent tests.

### Endless

Endless is a standardized survival mode:

```text
3 integrity
      ↓
20 completed words
      ↓
Advance one stage
      ↓
Continue until the core fails
```

Difficulty rises through:

* spawn pressure;
* active-word capacity;
* word length;
* vocabulary complexity;
* sustained target management.

Movement speed is capped so later stages do not become a pure reaction-speed wall.

### Daily Strike

Daily Strike generates its full challenge from:

```text
UTC date + challenge version
```

The same date and version always reproduce:

* the same words;
* the same wave assignments;
* the same spawn edges;
* the same normalized spawn positions;
* the same challenge seed.

Developer date overrides remain ineligible for normal records.

---

## Screenshots

> [!NOTE]
> Repository image paths have not been embedded here yet. Add committed screenshots or GIFs to this section when their final repository locations are available.

Recommended gallery order:

1. Main menu and Mode Select
2. Campaign gameplay
3. Campaign Results
4. English 200 Typing Test
5. Endless Results
6. Daily Strike
7. Profile & Statistics

<details>
<summary><strong>Suggested screenshot markup</strong></summary>

```html
<p align="center">
  <img src="PATH_TO_SCREENSHOT" width="820" alt="WORDSTRIKE gameplay" />
</p>

<p align="center">
  <sub>Replace the path and caption after committing the image.</sub>
</p>
```

</details>

---

## How to Use

1. **Open WORDSTRIKE** in a modern desktop browser.
2. Select **Play** to open Mode Select.
3. Choose a mode:

   * Campaign
   * Typing Test
   * Endless
   * Daily Strike
4. Begin typing when the challenge starts.
5. Use `Escape` during an active run to open the available pause options.
6. Review the Results screen after completing or failing the run.
7. Open **Profile & Stats** from the main menu to review:

   * personal records;
   * Campaign progression;
   * typing-test records;
   * Endless performance;
   * Daily streaks;
   * recent sessions.
8. Continue from the same browser to retain local progress.

> [!TIP]
> Campaign and survival modes reward more than raw WPM. Prefix recognition, target selection, accuracy, and handling multiple active words all affect performance.

---

## Installation

### Requirements

* A modern browser with JavaScript enabled
* A local HTTP server for development
* Git
* Node.js for running the automated tests

### Clone the repository

```bash
git clone https://github.com/thiepn/WORDSTRIKE.git
cd WORDSTRIKE
```

### Dependencies

WORDSTRIKE has no runtime package dependencies.

There is no required dependency-installation step.

### Start a local development server

Using Python:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

> [!IMPORTANT]
> Use an HTTP server instead of opening `index.html` directly through `file://`. Browser security restrictions can prevent module and data-file loading from working correctly when the project is opened as a local file.

### Production build

No production build is required.

WORDSTRIKE consists of static HTML, CSS, JavaScript, JSON, and documentation files that can be served directly.

### Preview the production files

```bash
python -m http.server 8000
```

The same static files used during development are deployed to production.

---

## Project Architecture

The tree below shows the main project areas rather than every individual test or documentation file.

```text
WORDSTRIKE/
├── index.html
├── style.css
│
├── data/
│   ├── english200.json
│   ├── typingTestWords.json
│   └── bossCommonLongWords.json
│
├── js/
│   ├── main.js
│   ├── state.js
│   ├── ui.js
│   ├── input.js
│   ├── modes.js
│   │
│   ├── campaignDifficulty.js
│   ├── levelGenerator.js
│   ├── bossGenerator.js
│   │
│   ├── speedTest*.js
│   ├── endless*.js
│   ├── daily*.js
│   │
│   ├── sessionManager.js
│   ├── sessionResult.js
│   ├── sessionMetrics.js
│   ├── sessionCleanup.js
│   ├── modeStorage.js
│   │
│   ├── playerProfile.js
│   ├── lifetimeStatistics.js
│   ├── statistics.js
│   ├── statisticsFormat.js
│   └── statisticsUi.js
│
├── docs/
│   ├── MODE_ARCHITECTURE.md
│   ├── CAMPAIGN_DIFFICULTY.md
│   ├── ENDLESS_MODE.md
│   ├── DAILY_STRIKE.md
│   ├── BOSS_VOCABULARY.md
│   ├── TYPING_TEST.md
│   └── PLAYER_PROFILE_AND_STATISTICS.md
│
├── scripts/
│   └── printBossSamples.js
│
└── tests/
    └── *.test.js
```

### Architectural Principles

| Principle             | Implementation                                                        |
| --------------------- | --------------------------------------------------------------------- |
| One active mode       | Gameplay loops are mutually exclusive                                 |
| One input authority   | A single global keyboard-routing architecture                         |
| Shared lifecycle      | Sessions move through preparing, active, paused, and completed states |
| Deterministic content | Seeded generation is used throughout the game                         |
| Local persistence     | Progress and records use browser storage                              |
| Bounded history       | Recent sessions and Daily history have fixed limits                   |
| No modifier rules     | Campaign and Endless use consistent core mechanics                    |
| Static deployment     | No backend or build server is required                                |

---

## Technology Stack

<div align="center">

<img src="https://img.shields.io/badge/HTML5-0B111A?style=for-the-badge&logo=html5&logoColor=00F5FF" alt="HTML5" />
<img src="https://img.shields.io/badge/CSS3-0B111A?style=for-the-badge&logo=css3&logoColor=00F5FF" alt="CSS3" />
<img src="https://img.shields.io/badge/JavaScript-0B111A?style=for-the-badge&logo=javascript&logoColor=FF2DAA" alt="JavaScript" />
<img src="https://img.shields.io/badge/Node.js-0B111A?style=for-the-badge&logo=nodedotjs&logoColor=00F5FF" alt="Node.js" />
<img src="https://img.shields.io/badge/GitHub_Pages-0B111A?style=for-the-badge&logo=githubpages&logoColor=FF2DAA" alt="GitHub Pages" />

</div>

<br />

| Technology          | Role                                                                        |
| ------------------- | --------------------------------------------------------------------------- |
| HTML5               | Application structure, screens, menus, HUDs, and accessibility semantics    |
| CSS3                | Responsive layout, neon visual identity, animations, states, and typography |
| JavaScript          | Gameplay, input, seeded generation, storage, statistics, and navigation     |
| ES modules          | Separation of mode controllers, metrics, storage, and generators            |
| JSON                | Vocabulary data and curated word sources                                    |
| Web Storage         | Local progression, records, profile, statistics, and Daily history          |
| Web Crypto          | Stable local player-ID generation                                           |
| Node.js test runner | Automated unit and integration-style validation                             |
| GitHub Pages        | Static production hosting                                                   |

No frontend framework or runtime library is required.

---

## Documentation

Detailed implementation notes are maintained under [`docs/`](https://github.com/thiepn/WORDSTRIKE/tree/main/docs).

| Document                           | Focus                                                |
| ---------------------------------- | ---------------------------------------------------- |
| `MODE_ARCHITECTURE.md`             | Shared modes, sessions, cleanup, and navigation      |
| `CAMPAIGN_DIFFICULTY.md`           | Virtual Campaign difficulty and balance anchors      |
| `ENDLESS_MODE.md`                  | Endless stages, pressure, scoring, and records       |
| `DAILY_STRIKE.md`                  | UTC challenges, waves, scoring, storage, and streaks |
| `BOSS_VOCABULARY.md`               | Boss vocabulary tiers, budgets, and generation       |
| `TYPING_TEST.md`                   | English 200 identity, metrics, and records           |
| `PLAYER_PROFILE_AND_STATISTICS.md` | Local profile and statistics architecture            |

---

## Privacy & Data Handling

WORDSTRIKE is designed as a **local-first** application.

| Question                               | Answer                                        |
| -------------------------------------- | --------------------------------------------- |
| Is an account required?                | No                                            |
| Is login supported?                    | Optional Google sign-in                       |
| Where is progress stored?              | In the current browser’s local storage        |
| Does gameplay data leave the device?   | Only after explicit Daily/Endless submission  |
| Is cloud synchronization used?         | No                                            |
| Are analytics included?                | No analytics are implemented                  |
| Is a backend required?                 | No for local play; yes for global rankings    |
| Is the local player ID uploaded?       | No                                            |
| Is Daily Strike fetched from a server? | No, it is generated locally from the UTC date |
| Is a global leaderboard supported?     | Yes, for Daily Strike and Endless             |

> [!IMPORTANT]
> The local player ID is a browser-generated identifier intended as a future integration point. It is currently stored and used only on the local device.

Daily Strike and Endless results can be submitted explicitly from their result screens after Google sign-in and public-username setup. Local saving happens first and remains independent of submission success. Historical records are never uploaded automatically, and duplicate retries are safe. Campaign and Typing Test submissions are not supported. Server validation rejects obvious inconsistencies, but—as with any browser-produced score—it cannot make client gameplay fully cheat-proof.

---

## Data Safety, Migration & Compatibility

The main mode data is stored under the existing browser-storage schema:

```text
wordstrike_mode_data_v1
```

The application preserves and sanitizes supported existing data, including:

* Campaign unlocks and grades;
* legacy Typing Test records;
* English 200 records;
* Endless records;
* Daily attempts and streaks;
* local player profile;
* lifetime aggregates;
* recent-session summaries.

Legacy 740-word Typing Test results are retained under a separate internal identity and do not compete with English 200 records.

> [!WARNING]
> Clearing browser site data, using private-browsing storage, or switching browsers or devices can remove access to local progress. Cloud backup and cross-device synchronization are not currently implemented.

### Browser compatibility

A modern browser should support:

* JavaScript modules;
* `localStorage`;
* `requestAnimationFrame`;
* Web Crypto or its supported fallback;
* standard DOM and event APIs.

Clipboard access is optional and is used only for copying the local player ID.

---

## Development & Testing

### Run the automated test suite

```bash
node --test
```

The project currently includes **46 automated test files** covering areas such as:

* Campaign difficulty and progression;
* boss generation and timers;
* English 200 validation;
* Typing Test metrics and records;
* Endless generation, scoring, and records;
* Daily Strike generation, scoring, dates, and streaks;
* profile and statistics storage;
* navigation and cleanup;
* seeded reproducibility;
* input routing and loop exclusivity.

### Check Git whitespace errors

```bash
git diff --check
```

### Build

No build command is required.

### Lint and type checking

No separate lint or static type-check configuration is currently documented.

> [!NOTE]
> Automated tests verify deterministic logic and state transitions. Manual browser validation is still necessary for visual layout, responsive behavior, pointer interaction, and perceived difficulty.

---

## Deployment

WORDSTRIKE is deployed as a static application through GitHub Pages.

### Production model

```text
Repository files
      ↓
GitHub Pages
      ↓
Static HTML, CSS, JavaScript, and JSON
```

No compilation or bundle generation is required.

### GitHub Pages setup

1. Push the latest version to GitHub.
2. Open the repository’s **Settings**.
3. Open **Pages**.
4. Select the intended deployment branch and repository-root folder.
5. Save the Pages configuration.
6. Wait for GitHub Pages to publish the static files.

Expected project URL:

```text
https://thiepn.github.io/WORDSTRIKE/
```

> [!TIP]
> Keep application asset paths compatible with the repository subdirectory. GitHub Pages project sites are served below `/<repository-name>/`, not directly from the domain root.

---

## Current Status

<div align="center">

<img src="https://img.shields.io/badge/CORE_MODES-IMPLEMENTED-00D98B?style=for-the-badge&labelColor=0B111A" alt="Core modes implemented" />
<img src="https://img.shields.io/badge/STATUS-ALPHA-00F5FF?style=for-the-badge&labelColor=0B111A" alt="Alpha status" />
<img src="https://img.shields.io/badge/DEVELOPMENT-ACTIVE-FF2DAA?style=for-the-badge&labelColor=0B111A" alt="Active development" />

</div>

<br />

| Area                                 |      Status     |
| ------------------------------------ | :-------------: |
| Campaign                             |   Implemented   |
| Mixed-vocabulary bosses              |   Implemented   |
| English 200 Typing Test              |   Implemented   |
| Endless                              |   Implemented   |
| Daily Strike                         |   Implemented   |
| Player Profile & Statistics          |   Implemented   |
| Automated test suite                 |     Passing     |
| Practice Lab                         | Not implemented |
| Global Daily/Endless leaderboard     |   Implemented   |
| Accounts and cloud sync              | Not implemented |
| Final visual and accessibility audit |     Pending     |

WORDSTRIKE is suitable for local testing and continued development, but it should still be treated as an active alpha rather than a finalized production release.

---

## Known Limitations

* Progress is tied to the current browser and device.
* No built-in backup, export, import, or cloud synchronization is available.
* Practice Lab is currently disabled.
* No global leaderboard or account system is implemented.
* The game currently focuses on English vocabulary.
* Audio, alternate themes, achievements, and upgrades are not implemented.
* Some result-screen pointer interactions and muted-text contrast are still in the final UI-polish queue.
* Automated tests cannot replace manual checks of layout, readability, responsiveness, and difficulty feel.
* The project does not currently declare a software license.

---

## Roadmap

```text
Current alpha
Core modes, bosses, Daily Strike, English 200, profile, and statistics
      ↓
Interaction and visual polish
Result actions, mouse support, contrast, responsive layout, accessibility
      ↓
Practice Lab
Focused configurable training without changing the core modes
      ↓
Optional global leaderboard
Daily and Endless comparison through a dedicated backend
      ↓
Whole-project audit
Architecture, accessibility, performance, storage, and regression review
      ↓
Release candidate
Documentation, final QA, deployment checks, and license decision
```

### Near-term priorities

* Finish the current UI and pointer-interaction polish pass.
* Validate all screens at multiple widths and zoom levels.
* Improve consistent menu and Results navigation.
* Continue manual Campaign, Endless, boss, and Daily balance testing.
* Decide the final scope of Practice Lab.

### Possible later work

* Practice-specific drills
* Optional cloud profile synchronization
* Backup and restore
* Audio and presentation settings
* Additional accessibility controls

These items are plans, not currently available features.

---

## Contributing

Contributions should remain focused and preserve WORDSTRIKE’s deterministic, local-first architecture.

### Suggested workflow

```bash
git clone https://github.com/thiepn/WORDSTRIKE.git
cd WORDSTRIKE
git checkout -b feature/your-change
```

After making changes:

```bash
node --test
git diff --check
git add -A
git commit -m "Describe the change"
git push -u origin feature/your-change
```

Then open a pull request describing:

* the problem being solved;
* the files and systems changed;
* the tests performed;
* any remaining manual-validation requirements.

### Contribution principles

* Do not introduce dependencies without a clear need.
* Keep gameplay loops mutually exclusive.
* Preserve deterministic seeded behavior.
* Keep storage migrations non-destructive.
* Avoid mixing unrelated refactors with focused bug fixes.
* Add focused tests for behavioral changes.
* Do not reintroduce removed gameplay modifiers.
* Keep documentation synchronized with implemented behavior.

> [!NOTE]
> No software license is currently specified. Clarify licensing before relying on the repository for redistribution or derivative projects.

---

## Repository

<div align="center">

<a href="https://github.com/thiepn/WORDSTRIKE">
  <img src="https://img.shields.io/badge/VIEW_REPOSITORY-0B111A?style=for-the-badge&logo=github&logoColor=00F5FF" alt="View WORDSTRIKE repository" />
</a>
<a href="https://thiepn.github.io/WORDSTRIKE/">
  <img src="https://img.shields.io/badge/LAUNCH_WORDSTRIKE-FF2DAA?style=for-the-badge&logo=googlechrome&logoColor=FFFFFF" alt="Launch WORDSTRIKE" />
</a>

<br /><br />

Built with semantic HTML, modern CSS, vanilla JavaScript, deterministic generation, and local browser storage.

<br />

<sub>No framework · No runtime dependencies · No account required · No cloud required</sub>

</div>

<br />

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&height=150&section=footer&color=0:0B111A,45:00D9FF,100:FF2DAA&animation=fadeIn" alt="WORDSTRIKE footer" />
