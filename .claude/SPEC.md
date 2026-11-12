# Fugu: game spec for the BGA adaptation

Fugu (Helvetiq, BGG 466239), 1 to 4 players, about 25 minutes. This file describes the rules as the code implements them: **the code is the rules**. Items marked **[BGA]** are deliberate choices for the BGA version, where the physical game works differently or says nothing.

## Glossary

- **Type**: what a card shows: bannerfish, pufferfish, octopus or coral (pink, green or yellow). **The code says "suit" for the same thing** (`suit` DB column, `data-suit`, `$card['suit']`); use "type" in docs and UI text, and don't rename the code.
- **Number** (rank): the card's value, 1 to the deck length. Also `rank` in the code. A card's `card_id` equals its number (see Conventions in CLAUDE.md).
- **Reef**: a player's row of 18 cards (`card_location = 'player'`, `location_in_hand` 1 to 18). Called "hand" in the code (`HandHandler`, `#player-hands-container`, `.a-hand-container`). Titled "Your Reef" / "<name>'s Reef".
- **Centre row**: the 3 face-up cards everyone can take (`card_location = 'center'`, `card_location_arg` = slot 1 to 3). `#center-container`, `CenterHandler`.
- **Facedown card**: an unplayed reef card (`state_in_hand = 'facedown'`). Its identity is hidden from everyone, its owner included.
- **Number card**: a card placed in the reef that keeps ascending order (`state_in_hand = 'number'`).
- **Anchor**: a card placed in the reef that breaks ascending order. It sits on its anchor side (rotated 180 degrees, `state_in_hand = 'anchor'`), costs anchor points, and **still counts for its type** in scoring.
- **Swap**: a turn's main action: one centre card goes into one of my facedown slots, and the facedown card from that slot goes face up into the centre slot.
- **Pass**: ending my game voluntarily ("Pass and END YOUR GAME?"). I take no more turns.
- **Game ended** (for a player): `player.game_ended = 'yes'`, after passing or once no facedown card is left. The table ends when every player's game has ended.

## Components

- Cards numbered 1 to N. **Deck length N depends on player count** (`DECK_LENGTHS`): 39 for 1 or 2 players, 57 for 3, 75 for 4. The client gets it as `gamedatas.deckLength`. Only cards 1 to N are inserted into the DB.
- Every number has a fixed type (`CARD_NUM_TO_CARD_TYPE` in `material.inc.php`). The types repeat in a fixed pattern of pink coral, octopus, bannerfish, green coral, pufferfish, bannerfish, yellow coral, octopus, bannerfish... so roughly a third of the deck is bannerfish. The numbers 39, 57 and 75 are all bannerfish.
- 18 reef slots per player (`CARDS_PER_PLAYER`), 3 centre slots (`CENTER_CARD_COUNT`).

### Sprite

`img/fugu_cards.webp` (2840x4400) is a 10-column x 8-row grid of 284x550 frames, row-major. Frame index for number `n` is `n - 1` (cards 1 to 75 fill indexes 0 to 74). Index 75 (col 5, row 7) is the reference card shown in the card tooltip, index 76 (col 6, row 7) is the card back used for facedown cards. `Game.scss` generates one `[data-rank="n"]::before` rule per number with `background-size: 1000% 800%`. The art is chosen by `data-rank` alone; no CSS reads `data-suit`.

Other art: `coral_icons.webp` (3 coral icons, player board counters), `score_icons.webp` (6 icons for the end-game table: bannerfish, pufferfish, octopus, corals, anchor, total), `backParallax.webp` / `frontParallax.webp` (background layers), `victoryPuff.webp` (jumping pufferfish, solo victory image), `jumpingBannerfish.webp` (400x607, faces left). Photoshop sources live in `misc/`.

## Setup

- All N cards are shuffled. 3 go to the centre (slots 1 to 3), then 18 to each player's reef, all facedown, slots 1 to 18. With 2 to 4 players this uses the whole deck (3 + 18 x players = N), so there is no draw pile.
- **Solo**: the 18 cards left go to `solo_deck` (random order).
- The first player is BGA's default first active player. Player colors come from `gameinfos.jsonc` with favorite-color support.

## Turn

The active player either **swaps** or **passes**.

### Swap

1. Choose one centre card and one facedown card in my reef (click order doesn't matter; clicking a selected card again deselects it).
2. The centre card goes into that reef slot face up. It becomes a **number card** if it keeps ascending order against the nearest number cards on each side (anchors are ignored for this), otherwise an **anchor** (`placeCardAsNumberOrAnchor`).
3. The facedown card that was in the slot goes face up into the centre slot the centre card came from.
4. If I have no facedown card left, my game ends.

**[BGA] Random facedown draw**: on the physical table the facedown card in each slot is fixed. On BGA the card is drawn at random at the moment of the swap (`getRandomFaceDownCard`: a random facedown card from any player's reef trades places with the card in the chosen slot, then that one is revealed), so someone with database access still can't know which card is coming. All facedown cards are unknown to everyone, so the trade changes nothing anyone could see.

### Pass

Ends my game for good. **[BGA]** A confirmation dialog asks "Pass and END YOUR GAME?" with a red "Yes, end my game" button. The log row shows a stop sign before the name.

### Turn order

`NextPlayer` walks the table order from the active player and activates the next player whose game hasn't ended. When none is left, the table ends.

## Scoring

Scored live after every swap (`Game::getPlayerScore`) and shown on player boards. Only played cards count: number cards and anchors alike count for their type; facedown cards count for nothing and break runs and neighbours.

| Type | Rule (`material.inc.php`) |
|---|---|
| Bannerfish | Each run of consecutive bannerfish in the reef: 1 = 0, 2 = 2, 3 = 5, 4 or more = 9 (`BANNERFISH_SCORING_TABLE`) |
| Pufferfish | Each pufferfish by how many of its 2 neighbours are fish (bannerfish or pufferfish): 0 = 3, 1 = 1, 2 = 0 (`PUFFERFISH_SCORING_TABLE`) |
| Octopus | 2 per neighbouring coral (`OCTOPUS_SCORING`) |
| Coral | 3 per complete set of pink + green + yellow, anywhere in the reef (`CORAL_SCORING`) |
| Anchor | Minus the triangular number of anchors: -1, -3, -6, -10... (`ANCHOR_SCORING`) |
| Solo penalty | Solo only: -1 per facedown card left at the end (`SOLO_DIFFICULTY_FACEDOWN_PENALTY`), already counted from the start (setup scores the solo player) |

**Decided**: an anchor still counts for its type (bannerfish runs, pufferfish and octopus neighbours, coral sets) on top of the anchor penalty. This is the rule, not a bug.

## Game end and winner

- The table ends once every player's game has ended (`NextPlayer` → `EndScore` → `gameEnd`).
- Highest total wins. **Tie-break: fewer anchors** (`player_score_aux = -anchorCount`, `gameinfos` "The player with fewest anchors"). Still tied: shared win.
- **Solo**: no winner with 0 points or less.
- End-game table: one row per scoring type (plus the solo penalty row in solo), cells fading in one by one, a click anywhere fast-forwards, winners' names jump, and the winners get a bubble bath. In solo, a flavour text by total: 25+ (with the victory pufferfish image), 20+, 15+, 10+, below 10.
- Game progression: the share of facedown cards gone, among players whose game hasn't ended.

## Solo mode

- 39 cards: 3 centre, 18 reef, 18 solo deck.
- **Centre replacement after every swap** (`soloReplaceCenterCard`): look at the number of the card that just came out of my reef into the centre. Below 20 (`SOLO_COMPARE_THRESHOLD`), the lower-numbered of the other two centre cards is discarded; 20 or more, the higher-numbered one. The discarded card goes to the box (`returned_to_box`) and a random solo deck card takes its slot. Log row "Center: X replaces Y".
- Discarded cards are shown in a "Discarded Cards" panel under the reefs.
- The facedown penalty always applies. **[BGA]** An Expert/Standard "Solo Difficulty Mode" option existed but is commented out in `gameoptions.jsonc` (expert made the default, Aug 14); `SOLO_DIFFICULTY_OPTION` / `SOLO_DIFFICULTY_STANDARD` are unused leftovers.
- The "Show anchored cards" preference is hidden in solo.

## [BGA] Helps and display choices

- **Anchor previews**: during my turn, centre cards that can't be placed as a number card anywhere in my reef get an anchor icon and a blue glow (server `centerCardsPlaceability` in `PlayerTurn` args, from `getFreeSlotBounds` / `isCardPlaceable`; active player only). With one side selected, the cards on the other side that would make an anchor glow blue. With both selected and an anchor coming, both cards glow blue and the Swap button turns purple: "[anchor] Swap for -X [anchor]", X being the next anchor's marginal cost.
- **Bad-half warning** (`PlayerTurn.isPlayingFirstTurnOnBadHalf`): on my first swap only (no card of mine face up yet), if the centre card's number looks badly placed for that slot (fewer lower numbers than slots to its left, fewer higher numbers than slots to its right, or more than 2 or 3 slots from its proportional spot), a modal box says "Starting with X there looks hard, since the highest card is N" and the Swap button is disabled for 5 seconds (loading bar).
- **Max indicator**: after the Pass button, "max: [card N] (i)", with the tooltip "Cards in a solo game / an N-player game are numbered from 1 to N". Hidden while the Swap button shows.
- **Swap line**: a marching dashed line between the two selected cards, gold for a number placement, blue for an anchor.
- **Anchored cards panel** (preference, not in solo): every anchor on the table as a small card icon, sorted by number. Its "Hide" link turns the preference off, scrolls to the top and points a modal box at BGA's menu wheel ("You can display Anchored Cards again from this menu", with Undo).
- **Player boards**: anchor count after the score star, coral counters (pink, green, yellow). A player whose game has ended gets a sand-coloured board and a tilted, slightly faded reef with a stop sign by the name, while the game goes on.
- **Status bar**: "You must swap 2 cards or [Pass]" (mobile: "You must swap or [Pass]"); others see "<name> must play a card or pass".

## Preferences [BGA]

| Id | Name | Values |
|---|---|---|
| 101 | Bubble amount | None, Low (default), Mid, Intense, Bubble Bath! |
| 102 | Show anchored cards | Off, On (default). Hidden in solo |
| 103 | Show players as | Profile picture (default), Player name. Each reef title shows the owner's avatar or "<name>'s Reef"; clicking either switches every reef and saves the preference (same as Riviera and Yaxha) |

No game options are active.

## Hidden information

- Facedown cards are hidden from everyone, their owner included. `getCardsOnTable()` sends them with `card_id`, `suit` and `rank` set to null, only `location_in_hand` and `state_in_hand`.
- Since `card_id` equals the number, never send the id of a facedown card.
- Centre cards, number cards and anchors are public.

## BGA states

- `PlayerTurn` (10, active player): `actSwapCards(centerCardID, handCardLocation)`, `actPass`. Args: `possibleHandLocations`, `possibleCenterCardIDs`, `centerCardsPlaceability`. Zombie: passes.
- `NextPlayer` (90, game, `updateGameProgression`): next player still in, or end-game scoring, stats and the `displayEndGameScoring` notification → `EndScore`.
- `EndScore` (98, game) → 99 (`gameEnd`).

Notifications: `cardsSwapped`, `centerCardReplaced` (solo), `pass`, `displayEndGameScoring` (no log row).

## Statistics (stats.jsonc)

- Table: players who passed (10), passes per player count (11), facedown cards left per player (12), average score per type: bannerfish, pufferfish, octopus, coral, anchor (13 to 17).
- Player: total score (10), score per type: bannerfish, pufferfish, octopus, coral, anchor (11 to 15), anchor count (16), facedown cards left (17).
- All set once, at the end (`NextPlayer::saveGameEndStats`).
