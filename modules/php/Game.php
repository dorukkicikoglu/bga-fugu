<?php
/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * Fugu implementation : © Doruk Kicikoglu <doruk.kicikoglu@gmail.com>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * Game.php
 *
 * This is the main file for your game logic.
 *
 * In this PHP file, you are going to defines the rules of the game.
 */
declare(strict_types=1);

namespace Bga\Games\Fugu;

use Bga\Games\Fugu\States\PlayerTurn;
use Bga\GameFramework\Components\Deck;
use Bga\Games\Fugu\FUGUTableManager;

class Game extends \Bga\GameFramework\Table
{
    public Deck $cardsDeck;
    public FUGUTableManager $tableManager;

    /**
     * Your global variables labels:
     *
     * Here, you can assign labels to global variables you are using for this game. You can use any number of global
     * variables with IDs between 10 and 99. If you want to store any type instead of int, use $this->globals instead.
     *
     * NOTE: afterward, you can get/set the global variables with `getGameStateValue`, `setGameStateInitialValue` or
     * `setGameStateValue` functions.
     */
    public function __construct()
    {
        parent::__construct();

        require_once 'material.inc.php'; 

        // automatically complete notification args when needed
        $this->bga->notify->addDecorator(function(string $message, array $args) {
            if (isset($args['player_id']) && !isset($args['player_name']) && str_contains($message, '${player_name}')) {
                $args['player_name'] = $this->getPlayerNameById($args['player_id']);
            }
        
            return $args;
        });

        $this->cardsDeck = $this->deckFactory->createDeck("cards");
        $this->tableManager = new FUGUTableManager($this);
    }

    public function getGameProgression()
    {
        $playerIDToGameEnded = $this->getCollectionFromDB("SELECT `player_id`, `game_ended` FROM `player`", true);

        $cardsOnTable = $this->tableManager->getCardsOnTable();
        $cardsInHands = $cardsOnTable['players'];

        $totalPlayableCards = 0;
        $totalCardsInHands = 0;
        foreach ($cardsInHands as $playerID => $playerData) {
            $totalCardsInHands += count($cardsInHands[$playerID]);
            if ($playerIDToGameEnded[$playerID] === 'yes')
                continue;

            foreach ($cardsInHands[$playerID] as $card) {
                if ($card['state_in_hand'] == 'facedown')
                    $totalPlayableCards++;
            }
        }

        $progress = (int) floor(100 * (1 - $totalPlayableCards / $totalCardsInHands));

        return $progress;
    }

    /**
     * Migrate database.
     *
     * You don't have to care about this until your game has been published on BGA. Once your game is on BGA, this
     * method is called everytime the system detects a game running with your old database scheme. In this case, if you
     * change your database scheme, you just have to apply the needed changes in order to update the game database and
     * allow the game to continue to run with your new version.
     *
     * @param int $from_version
     * @return void
     */
    public function upgradeTableDb($from_version)
    {
//       if ($from_version <= 1404301345)
//       {
//            // ! important ! Use `DBPREFIX_<table_name>` for all tables
//
//            $sql = "ALTER TABLE `DBPREFIX_xxxxxxx` ....";
//            $this->applyDbUpgradeToAllDB( $sql );
//       }
//
//       if ($from_version <= 1405061421)
//       {
//            // ! important ! Use `DBPREFIX_<table_name>` for all tables
//
//            $sql = "CREATE TABLE `DBPREFIX_xxxxxxx` ....";
//            $this->applyDbUpgradeToAllDB( $sql );
//       }
    }

    /*
     * Gather all information about current game situation (visible by the current player).
     *
     * The method is called each time the game interface is displayed to a player, i.e.:
     *
     * - when the game starts
     * - when a player refreshes the game page (F5)
     */
    protected function getAllDatas(int $currentPlayerId): array
    {
        $result = [];
        // WARNING: We must only return information visible by the current player (using $currentPlayerId).

        // Get information about players.
        // NOTE: you can retrieve some extra field you added for "player" table in `dbmodel.sql` if you need it.
        $result["players"] = $this->getCollectionFromDb("SELECT `player_id`, `player_no`, `player_score` score, game_ended FROM `player`");
        $allScoringData = $this->getAllPlayersScoring();
        foreach($result["players"] as $player_id => $row){
            $result["players"][$player_id]['game_ended'] = ($row['game_ended'] == 'yes') ? true : false;
            $result["players"][$player_id]['scoring_data'] = $allScoringData[$player_id];
        }

        $cardsOnTable = $this->tableManager->getCardsOnTable();
        $result['cardsInCenter'] = $cardsOnTable['center'];
        $result['cardsInHands'] = $cardsOnTable['players'];
        $result['deckLength'] = DECK_LENGTHS[count($result["players"])]; 

        $state = $this->gamestate->getCurrentMainState();
        if($state->name == 'gameEnd')
            $result['endGameScoring'] = $this->getEndGameScoring();
        
        return $result;
    }

    /**
     * This method is called only once, when a new game is launched. In this method, you must setup the game
     *  according to the game rules, so that the game is ready to be played.
     */
    protected function setupNewGame($players, $options = [])
    {
        // $this->playerEnergy->initDb(array_keys($players), initialValue: 2);

        // Set the colors of the players with HTML color code. The default below is red/green/blue/orange/brown. The
        // number of colors defined here must correspond to the maximum number of players allowed for the gams.
        $gameinfos = $this->getGameinfos();
        $default_colors = $gameinfos['player_colors'];

        foreach ($players as $player_id => $player) {
            // Now you can access both $player_id and $player array
            $query_values[] = vsprintf("(%s, '%s', '%s')", [
                $player_id,
                array_shift($default_colors),
                addslashes($player["player_name"]),
            ]);
        }

        // Create players based on generic information.
        //
        // NOTE: You can add extra field on player table in the database (see dbmodel.sql) and initialize
        // additional fields directly here.
        static::DbQuery(
            sprintf(
                "INSERT INTO `player` (`player_id`, `player_color`, `player_name`) VALUES %s",
                implode(",", $query_values)
            )
        );

        $this->reattributeColorsBasedOnPreferences($players, $gameinfos["player_colors"]);
        $this->reloadPlayersBasicInfos();

        // Init global values with their initial values.

        // Init game statistics.
        //
        // NOTE: statistics used in this file must be defined in your `stats.inc.php` file.

        // Dummy content.
        // $this->tableStats->init('table_teststat1', 0);
        // $this->playerStats->init('player_teststat1', 0);

        //Setup the initial game situation 
        //create cards Deck object

        $deckLength = DECK_LENGTHS[count($players)]; 
        
        $cardRows = array();
        for($i = 1; $i <= $deckLength; $i++){
            $cardType = CARD_NUM_TO_CARD_TYPE[$i];
            $cardRows[] = "('$i', 'card', '0', 'returned_to_box', '0', '$cardType', '$i')";
        }
        self::DbQuery("INSERT INTO `cards` (`card_id`, `card_type`, `card_type_arg`, `card_location`, `card_location_arg`, `suit`, `rank`) VALUES ".implode(',', $cardRows)); 

        $this->tableManager->shuffleAndDealCards();

        // Activate first player once everything has been initialized and ready.
        $this->activeNextPlayer();

        return PlayerTurn::class;
    }

    //utility functions

    public function getAllPlayersScoring(): array {
        $playerIDs = $this->getObjectListFromDB("SELECT `player_id` FROM `player`", true);

        $scores = [];
        foreach ($playerIDs as $playerID) {
            $scores[$playerID] = $this->getPlayerScore($playerID);
        }
        return $scores;
    }

    public function updatePlayerScore(int $playerID, array $updatedScore = []){
        if(empty($updatedScore))
            $updatedScore = $this->getPlayerScore($playerID);
        $totalScore = $updatedScore['totalScore'];

        $this->bga->playerScore->set($playerID, $totalScore);
        $this->bga->playerScoreAux->set($playerID, -1 * (int) $updatedScore['anchorCount']);

        return $updatedScore;
    }

    private function isSoloMode(): bool{ return $this->getPlayersNumber() === 1; }

    //end utility functions

    /**
     * Compute a player's full score breakdown from the current state of their row.
     *
     * The row is read in play order (`location_in_hand` ASC) and includes face-down
     * cards and anchor-flipped cards: both are needed to correctly detect Bannerfish
     * groups (which they break) and Pufferfish/Octopus neighbours (which they don't
     * satisfy, since their suit isn't showing).
     *
     * @param int $playerID
     * @return array{total: int, bannerfish: int, pufferfish: int, octopus: int, corals: int, anchor: int}
     */
    public function getPlayerScore($playerID): array
    {
        $playerID = (int) $playerID;

        $row = $this->getObjectListFromDB(
            "SELECT `suit`, `state_in_hand` FROM `cards`
             WHERE `card_location` = 'player' AND `card_location_arg` = $playerID
             ORDER BY `location_in_hand` ASC"
        );
        $rowSize = count($row);

        // A card only reveals its suit when it's played face-up as a "number" card.
        // Face-down cards (unplayed) and anchor-flipped cards hide their suit, so for
        // scoring purposes they're treated as if no Bannerfish/Pufferfish/Coral is there.
        $isVisibleSuit = fn(array $card): bool => ($card['state_in_hand'] === 'number' || $card['state_in_hand'] === 'anchor');

        $bannerfishScore = 0;
        $pufferfishScore = 0;
        $octopusScore = 0;
        $coralCounts = ['coral_pink' => 0, 'coral_green' => 0, 'coral_yellow' => 0];
        $anchorCount = 0;

        // --- BANNERFISH -----------------------------------------------------
        // Walk the row tracking the length of the current run of consecutive,
        // visible Bannerfish cards. Any other card (face-down, anchor, or a
        // different suit) ends the run, so we score it and start counting again.
        $currentRunLength = 0;
        foreach ($row as $card) {
            $isBannerfish = $isVisibleSuit($card) && $card['suit'] === 'bannerfish';
            if ($isBannerfish) {
                $currentRunLength++;
                continue;
            }
            $bannerfishScore += $this->scoreBannerfishRun($currentRunLength);
            $currentRunLength = 0;
        }
        $bannerfishScore += $this->scoreBannerfishRun($currentRunLength); // flush a run ending at the last card

        // --- PUFFERFISH / OCTOPUS / CORAL / ANCHOR --------------------------
        // These only ever need to look at the immediate left/right neighbour (or
        // just tally totals), so a single pass over indices is enough.
        for ($i = 0; $i < $rowSize; $i++) {
            $card = $row[$i];

            if ($card['state_in_hand'] === 'anchor') {
                $anchorCount++;
            }

            if (!$isVisibleSuit($card)) {
                continue; // face-down/anchor cards don't themselves score as Pufferfish/Octopus/Coral
            }

            if (in_array($card['suit'], ['coral_pink', 'coral_green', 'coral_yellow'], true)) {
                $coralCounts[$card['suit']]++;
                continue;
            }

            if ($card['suit'] !== 'pufferfish' && $card['suit'] !== 'octopus') {
                continue;
            }

            $left = $i > 0 ? $row[$i - 1] : null;
            $right = $i < $rowSize - 1 ? $row[$i + 1] : null;

            if ($card['suit'] === 'pufferfish') {
                $countingNeighbours = 0;
                foreach ([$left, $right] as $neighbour) {
                    if ($neighbour !== null && $isVisibleSuit($neighbour) && in_array($neighbour['suit'], ['bannerfish', 'pufferfish'], true)) {
                        $countingNeighbours++;
                    }
                }
                $pufferfishScore += PUFFERFISH_SCORING_TABLE[$countingNeighbours] ?? 0;
            } else { // octopus
                $coralNeighbours = 0;
                foreach ([$left, $right] as $neighbour) {
                    if ($neighbour !== null && $isVisibleSuit($neighbour) && in_array($neighbour['suit'], ['coral_pink', 'coral_green', 'coral_yellow'])) {
                        $coralNeighbours++;
                    }
                }
                $octopusScore += $coralNeighbours * OCTOPUS_SCORING;
            }
        }

        // --- CORALS: position doesn't matter, only completed pink/green/yellow sets ---
        $completeSets = min($coralCounts['coral_pink'], $coralCounts['coral_green'], $coralCounts['coral_yellow']);
        $coralScore = $completeSets * CORAL_SCORING;

        // --- ANCHOR: triangular-number penalty, already negative ---
        // ANCHOR_SCORING is a constant holding a Closure; it must be fetched into a
        // variable before it can be invoked (PHP parses `ANCHOR_SCORING(...)` as a
        // function call, not a call to the constant of the same name).
        $anchorScoringFn = ANCHOR_SCORING;
        $anchorScore = (int) $anchorScoringFn($anchorCount);

        $totalScore = $bannerfishScore + $pufferfishScore + $octopusScore + $coralScore + $anchorScore;
        
        return [
            'totalScore' => $totalScore,
            'bannerfish' => $bannerfishScore,
            'pufferfish' => $pufferfishScore,
            'octopus' => $octopusScore,
            'corals' => $coralScore,
            'anchor' => $anchorScore,
            'anchorCount' => $anchorCount,
        ];
    }
    private function scoreBannerfishRun(int $length): int { return ($length <= 0) ? 0 : BANNERFISH_SCORING_TABLE[min($length, count(BANNERFISH_SCORING_TABLE) - 1)]; }

    public function getEndGameScoring(): array {
        $allScoringData = $this->getAllPlayersScoring();

        $winnerIDs = [];
        $maxScore = 0;
        $minAnchorCount = 0;

        foreach ($allScoringData as $playerID => $playerScore) {
            if ($playerScore['totalScore'] < $maxScore) {
                continue;
            }
            if ($playerScore['totalScore'] > $maxScore || ($playerScore['totalScore'] == $maxScore && $playerScore['anchorCount'] < $minAnchorCount)) { //new sole winner
                $winnerIDs = [$playerID];
                $maxScore = $playerScore['totalScore'];
                $minAnchorCount = (int) $playerScore['anchorCount'];
            } else if ($playerScore['totalScore'] == $maxScore && $playerScore['anchorCount'] == $minAnchorCount) { //share victory
                $winnerIDs[] = $playerID;
            }
        }

        return [
            'winner_ids' => $winnerIDs,
            'player_scores' => $allScoringData, 
        ];
    }

    /**
     * Example of debug function.
     * Here, jump to a state you want to test (by default, jump to next player state)
     * You can trigger it on Studio using the Debug button on the right of the top bar.
     */
    public function debug_goToState(int $state = 3) {
        $this->gamestate->jumpToState($state);
    }

    /**
     * Another example of debug function, to easily test the zombie code.
     */
    public function debug_playOneMove() {
        $this->bga->debug->playUntil(fn(int $count) => $count == 1);
    }

    /*
    Another example of debug function, to easily create situations you want to test.
    Here, put a card you want to test in your hand (assuming you use the Deck component).

    public function debug_setCardInHand(int $cardType, int $playerId) {
        $card = array_values($this->cards->getCardsOfType($cardType))[0];
        $this->cards->moveCard($card['id'], 'hand', $playerId);
    }
    */

    public function message($txt, $desc = '', $color = 'blue') {
        if ($this->getBgaEnvironment() != "studio")
            return;

        if (is_array($txt))
            $txt = json_encode($txt);

        if($desc != '')
            $txt .= "   ".json_encode($desc);

        self::trace("Logging: <span style='color: $color;'>$txt</span>");
        self::notifyAllPlayers('plop',"<textarea style='height: 104px; width: 230px;color:$color'>$txt</textarea>",array());
    }
}
