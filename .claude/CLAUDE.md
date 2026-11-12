# Fugu: BGA adaptation

This folder is the BGA Studio project for **Fugu** (Helvetiq). The game is playable end to end (multiplayer and solo); current work is polish and small features.
Game rules and every design decision live in `.claude/SPEC.md` (imported below, so it loads every session). Read it before changing game logic.

@SPEC.md

Fugu is the reference project for my later BGA games: Riviera (`../riviera`) was built to mirror Fugu's structure, and Yaxha (`../yaxha`) shares some features. A feature I added to those games can often be ported back by following their commits (the "Show players as" preference came from Riviera `66db1be`, plus the avatar loading fix from Yaxha `98ce56b`).

## Environment and deployment

- Only BGA's servers run the game, so nothing can be tested locally. I deploy to BGA Studio and test there myself; I'll paste errors back. Don't invent framework APIs: check `bga-framework.d.ts` and `_ide_helper.php`.
- Files upload to Studio over SFTP via the VS Code SFTP extension (`.vscode/sftp.json`, gitignored): `uploadOnSave` plus a watcher with `autoUpload` (`autoDelete` is off, so a deleted or renamed file stays on Studio until removed there). Saving a file may push it live at once. `.claude/` uploads too, which is fine. Uploads can fail silently: after a server error, check the server copy matches before blaming the code.
- `php -l` only checks syntax; it can't catch framework-level errors (method signatures against `\Bga\GameFramework\Table`, etc.).
- `dbmodel.sql` changes need a new table.

## Build

- `npm run build` = `rollup -c` (`src/ts/Game.ts` → `modules/js/Game.js`) then `sass src/scss/Game.scss fugu.css`. Both outputs are committed.
- **The browser runs the compiled `modules/js/Game.js`, never the TS.** After any TS/SCSS change run `npm run build`, fix every error, and when it matters grep the output for the new code. A stale `Game.js` once made a fixed bug look unfixed.
- The Sass deprecation warnings about `/` division (the `text-shade` mixin) were there before; ignore them.
- `tsconfig.json` has `strict: false`. `npx tsc --noEmit -p .` type-checks without building.

## Code map

**Server (`modules/php/`, namespace `Bga\Games\Fugu`)**
- `Game.php`: setup and deal, `getAllDatas`, scoring (`getPlayerScore`, `getEndGameScoring`), placement helpers (`getFreeSlotBounds`, `isCardPlaceable`), game progression, `$userPrefs` (preference ids sent to the client as `gamedatas.pref_names`), a notification decorator that fills `player_name`, and a Studio-only `message()` debug helper.
- `FUGUTableManager.php`: shuffle and deal, `getCardsOnTable()` (hides facedown cards).
- `material.inc.php`: deck lengths, scoring tables, solo constants, `CARD_NUM_TO_CARD_TYPE`.
- `States/`: `PlayerTurn` (10), `NextPlayer` (90, also end-game stats), `EndScore` (98). One class per state, using the `GameState` class API.

**Client (`src/ts/`)**: `Game.ts` creates the game area (`#center-container`, `#player-hands-container`, `#card-animation-layer`) and owns one handler per concern:
- `PlayerHandler` (one per player: player board score counter, anchor count, coral counters, game-ended look) → owns its `HandHandler` (the reef: cards, mobile spacing, swap animation, reef title and avatar).
- `CenterHandler` (centre row, selection, anchor previews, solo replacement animation), `States/PlayerTurn.ts` (status bar, Pass/Swap, bad-half warning, max indicator).
- `SwapLineHandler`, `TooltipHandler`, `PrefHandler`, `LogMutationObserver`, `EndGameScoringHandler`, `ModalBoxHandler` (a positioned hint box with an arrow and an optional loading bar), `BackgroundHandler` (parallax, jumping fish, bubbles).
- `CardIconDisplayHandler` (abstract: a panel of small card icons sorted by number) with `SoloDiscardDisplayHandler` and `AnchorCardsDisplayHandler`.
- `types.d.ts` holds the gamedatas, card, score and pref interfaces.

All styles are in `src/scss/Game.scss`.

## Client: how the main pieces work

- **Flying cards** go through `#card-animation-layer` (`position: absolute`, `z-index: 1000`, zero size, `pointer-events: none`), never inside a row: `#center-container` and `.cards-container` aren't positioned, and resting reef cards carry `z-index = location_in_hand` in the shared stacking context, so a card flying inside a row slid under other reefs. `HandHandler.animateCardSwap()` measures each clone's destination with `placeOnObject` before setting any transition, then places it on its start (no jump). The cards resting on top of the target slot (higher z-index, same reef) are lifted to `layerZIndex + 1 + their index` for the whole swap, so the incoming card slides in under them as it will rest (no pop on landing) and restored after. On landing, clones lose `.cloned-card` and their inline styles in the same task as `replaceWith()`. `CenterHandler.animateCardReplace()` (solo) uses the same layer.
- **Center card wrapper**: each centre `.a-card` sits in a `.center-card-container` that also holds the anchor icon (`.unplaceable-icon`), because `.a-card` has `overflow: hidden`. The wrapper lives for the whole game; swaps and replacements only replace or mutate the inner `.a-card`. Its icon shows through `anchor-visible` (`updatePlaceability()` / `refreshIcon()`), hidden at once when the card starts to fly (`fadeOutIcon()`).
- **Selection** is DOM state only: `selected-center-card` / `selected-hand-card` classes, and `swap-preview-anchor` for the blue anchor glow. `CenterHandler.checkBothCardsSelected()` and `cardsUnselected()` derive everything from the DOM. Selected cards get an outline in my player color (`--swap-color`, set on the game area in `Game.setup`).
- **Swap line** (`SwapLineHandler`): an SVG overlay (`#swap-line-overlay`, `z-index: 50`) appended to the game area while both cards are selected. It runs from the upper card's bottom edge to the lower card's top edge (top-left corner + `SWAP_LINE_MOBILE_INSET_X/Y` on mobile, where reef cards overlap), deciding upper/lower from positions, not containers. Gold, or blue when the centre card has `swap-preview-anchor`. `refresh()` re-derives everything; it's rAF-coalesced from window resize and scroll (capture), a `ResizeObserver` (game area, centre row, my cards container), a `MutationObserver` (style and class) and `transitionend` on the game area (settles after a margin slide that resizes nothing). `hide()` removes the overlay and every listener and is safe to call any time: on deselect, Pass (restored if the dialog is cancelled), swap confirm, failed actions (`restoreSwapLineIfActionFails`) and `onLeavingState`. Tweakable constants at the top of the file; the dash animation duration is derived from `SWAP_LINE_SPEED` and the pattern length so the loop never jumps; no animation with `prefers-reduced-motion`.
- **Mobile reef spacing** (`HandHandler`): reef cards zigzag (every even card `0.4 x width` lower). `applyMobileCardSpacing()` sets inline `%` left/right margins so the row spans `MOBILE_HAND_SPAN_PERCENT` (99%) of the width, facedown cards taking `FACEDOWN_TO_FACEUP_OVERLAP_RATIO` (1.8x) more overlap but never less than `MIN_CLICKABLE_CARD_PERCENT` visible. `updateMobileCardSpacing()` animates a swap's change FLIP-style: it pretends the `.last-taken-card` is still facedown to read the old margins, slides px margins over 300ms, then hands back to fresh `%` margins. Desktop clears the inline margins. `Game.onScreenWidthChange` (BGA's resize hook, also fires at load) calls `recomputeMobileCardSpacing()` (100ms debounce).
- **Contracted reef** (mobile, my reef only, while my game goes on): when any card shows less than `CONTRACTED_VISIBLE_CARD_PERCENT` (10%) of its width, judged from the computed margins (not rendered positions, so a slide can't skew it), the cards container gets `reef-contracted`: every facedown card moves `CONTRACTED_SHIFT_CARD_PERCENT` (10% of card height) further from the other row than its face-up neighbours. Upper-row cards can't move up without covering the reef title, so the whole row drops one shift and upper-row facedown cards stay put. All of it is `margin-top`, so the existing 0.3s transition animates every card and the reef height. `refreshContractedShift()` is the only place the class is toggled; `setGameEnded(true)` keeps it off for good (also on load of a finished table). Other reefs and spectators never get it.
- **Reef title** ("Show players as", pref 103): `data-players-display` (`avatar` / `name`) on `#player-hands-container` switches every title together. Each title's `.reef-player` (`role="button"`, Enter/Space, click area 20% bigger via a `::before`) holds both the avatar and the "<name>'s Reef" text; clicking calls `PrefHandler.togglePlayersDisplay()`, which applies at once, then saves the preference (in a try/catch for spectators). The avatar (`--reef-avatar-size`, 37px, 47px on mobile) is `bga.players.getPlayerAvatarUrl(id, 184)`, falling back to the board avatar with its size suffix swapped to `_184`, then the board's own src, then the name's initial on the owner's color (dark text on light colors). A 3px ring in the owner's color plus a drop shadow. Tooltip: the full title.
- **Status bar** (`States/PlayerTurn.ts`): the Pass button sits inside the title, through a `${passButton}` placeholder span that `statusBar.setTitle()` substitutes as raw HTML, then `addActionButton(..., {destination})`. The Swap button is created empty and hidden with an inline `display: none`; `CenterHandler` fills its label and shows it. Anything appended to `#generalactions` must be removed on leaving the state, and re-entry must not duplicate it (`addMaxIndicator()` calls `removeMaxIndicator()` first; the tooltip is tracked with a flag because the framework may have emptied `#generalactions` already). CSS can't see the Swap button's inline display, so `setMaxIndicatorSwapButtonVisible()` mirrors it as `swap-button-visible`.
- **Logs**: each log type has a `${X_STR}` server placeholder (`SWAP_NOTIF_STR`, `CENTER_CARD_REPLACED_STR`, `PLAYER_PASSED_STR`) plus `preserve` for the args the row needs; `Game.bgaFormatText` swaps it for `LogMutationObserver.createLog*()` HTML, which ends with a `log-class-tag` div. `processLogDiv()` (live logs, mobile chatbar, replay logs) turns the tag into `a-game-log` + the type's class on the row and removes it. Cards in logs are `.minimised-card-icon` wrappers around a full `.a-card`.
- **Tooltips**: every `.a-card` gets the same reference tooltip ("Highest card value: N" + the reference card) through `addTooltipHtmlToClass('a-card')`; call `tooltipHandler.addTooltipToCards()` again after a notification that creates cards. Card divs come from `Game.createCardDiv()`, which gives each a unique id (`an-id-required-for-tooltips-N`; BGA tooltips need ids). Custom-colored tooltips wrap their HTML in `.tooltip-wrapper` (gradient background, colored arrow). On Safari mobile the reference is shown at the bottom of the page instead.
- **Background** (`BackgroundHandler`, first child of `<body>`): two parallax layers move with scroll inside `.parallax-layer` wrappers, because the `gentle-parallax-*` CSS animation already owns each image's `transform` (a running animation beats inline styles). Scroll is passive and rAF-batched, with all layout reads before any writes (`updateParallax`). Scrolling past the reefs makes one fish jump from behind the rocks: pufferfish (spins) or bannerfish (points north rising, south falling, turns during the hold; direction from scroll travel with `BANNERFISH_DIRECTION_FLIP_THRESHOLD` hysteresis against jitter). `pickNextFish()` balances the two: the less-jumped fish gets a higher chance by the count difference, and the second jump after load is always the other fish. A jump ends as soon as the fish is back behind the rocks (`FISH_HIDDEN_BELOW_FRACTION`), since a short page may never scroll to its end point. Fish are always rendered, hidden with `opacity` (not `display: none`, which made them pop in late). `#game_play_area` has a large `padding-bottom` (150vh, 280vh on mobile) to give room to scroll. Bubbles (pref 101) rise on a timer; a click creates one, or pops one older than 500ms; the bubble container is a sibling of the transformed backdrop, since a transformed ancestor would offset `position: fixed` bubbles from the click point.
- **End-game table** (`EndGameScoringHandler`): fixed, collapsible, fades in cell by cell (instant on reload), and the per-player total updates as cells appear.

## Workflow rules

- After any TS/SCSS change run `npm run build` and fix all compiler errors before saying you're done. Run `php -l` on every PHP file you touch.
- All player-facing strings go through `_()` (client) / `clienttranslate()` (server). With placeholders, translate the whole sentence and substitute after (`_('...${max}').replace('${max}', ...)`); separate sentences (solo vs multiplayer) are separate strings.
- Put tweakable values (sizes, speeds, thresholds, durations) in named constants at the top of the file (`static readonly` or module `const`), and tell me where they live.
- When I ask a question ("just curious"), answer it; don't change code.
- When I ask for a diff, show it. Say plainly what was built, what was checked (build, `php -l`, a stubbed test) and what wasn't (Studio, a real phone).
- For fiddly UI behaviour, a headless Chromium harness with the BGA framework stubbed, loading the compiled `Game.js` and `fugu.css`, worked well (swap line, contracted reef). Keep it in the scratchpad; it gets wiped between days, so be ready to rebuild it.
- Don't commit without asking. When I ask, I name the branch and message; never push. Commit messages are short and imperative ("Add swap line", "Bug Fix: ...").

## Conventions

- **Terms**: use the SPEC.md glossary. Cards have **types**, not suits (the code still says `suit`: don't rename it). The code calls the reef a "hand".
- **`card_id` equals the card's number**: `setupNewGame` inserts card `i` with id `i` and rank `i`. Code relies on it (e.g. `animateCardReplace` sets `data-rank` from the card id). It is also why facedown cards must never carry their id to the client.
- **Mobile detection**: BGA's body classes through `Game.isMobile()` / `isDesktop()` (`mobile_version` / `desktop_version`). Don't add a breakpoint of your own.
- **Measuring**: `Game.getPos()` (BGA's zoom-aware `getBoundingClientRectIgnoreZoom`) for elements inside `#page-content`; plain `getBoundingClientRect()` is off when BGA zooms.
- **Glow colors**: `--glow-gold` (number placement, selectable cards) and `--glow-anchor` (anchor) in `:root` are the one source for the card glows and the swap line. The pulse peak colors (`#ffd483`, `#1d2ab0`) are still hardcoded in the keyframes.
- **z-index ladder**: resting reef cards 1 to 18 (`location_in_hand`); swap line 50; `.cloned-card` 100; end-game table 100 (fixed); animation layer 1000 (lifted reef cards just above it during a swap); modal boxes 1200; BGA dialogs and tooltips above.
- **Reef cards move vertically with `margin-top` only.** `transform` is taken by anchors (`rotate(-180deg)`) and the game-ended tilt (`rotate(5deg)`), and margins make the reef box grow with the cards. Any rule that sets a `transition` on reef cards must keep `margin-top 0.3s` in it (the game-ended rule does), or the shift jumps.
- **Preferences**: ids in `Game.php` `$userPrefs` → `gamedatas.pref_names` → `GamePrefs` in `types.d.ts` → a case in `PrefHandler.onGameUserPreferenceChanged()`, which applies at load and on every change, with no reload.
- **Code style**: TS 4-space indent in most files (some handlers use 2: match the file), `if(` with no space, braces on the same line, one-line getters at the bottom of a class. Comments are lowercase `//` with no space, and explain why. PHP has the BGA copyright header.

## Gotchas

- **Spectators** have no `game.myself`; guard every use (`if(!this.game.myself) return;`).
- **`transitionend`** doesn't fire for an interrupted transition (`transitioncancel` does), and it bubbles, so one listener on the game area catches any card.
- **Fish sizes**: the bannerfish sets its own width, height, top and left (desktop and mobile), so changing the shared fish rule doesn't resize it. When resizing a fish, offset `top`/`left` by half the size change so it stays centred on the same spot as the other fish.
- **`[selected="true"]`** in the reef SCSS is never set by any code: dead rule.
- **`getRandomFaceDownCard`** draws from every player's facedown cards on purpose (see SPEC.md > Swap).
- **`misc/dump/*.sql`** are `cards` table dumps to import on Studio for testing given positions (2-player games, and solo with 5 facedown cards left). `NextPlayer` re-scores everyone at the end because an imported table may not match the stored scores. `misc/` is never packaged for production.

## Keeping the docs current

These files are the project's memory between sessions, so keep them true:

- All docs live in `.claude/` (`CLAUDE.md`, `SPEC.md`), tracked in git except `settings.local.json`.
- **Whenever I decide something new or change a rule** during a session: update the relevant section of `.claude/SPEC.md` right away, marked **[BGA]** if it differs from the physical game.
- **New code conventions** (a pattern we settle on, a framework gotcha): add them to this file.
- When you learn something durable about this project, such as a decision, a convention or a gotcha, update the relevant file in `.claude/` before finishing the task.
- When a session has been long or covered several tasks, before wrapping up ask me whether to update the `.claude/` docs with anything from this chat worth keeping.
- Don't rewrite or reorganise these files beyond what changed. Show me the diff of any doc edit.
