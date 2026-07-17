<?php

declare(strict_types=1);

namespace Bga\Games\Fugu\States;

use Bga\GameFramework\StateType;
use Bga\Games\Fugu\Game;

class NextPlayer extends \Bga\GameFramework\States\GameState
{

    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 90,
            type: StateType::GAME,
            updateGameProgression: true,
        );
    }

    /**
     * Game state action, example content.
     *
     * The onEnteringState method of state `nextPlayer` is called everytime the current game state is set to `nextPlayer`.
     */
    function onEnteringState(int $activePlayerId) {
        // Give some extra time to the active player when he completed an action
        $this->game->giveExtraTime($activePlayerId);
        
        $nextPlayerTable = $this->game->getNextPlayerTable();
        $nextPlayerArray = [];
        $nextPlayerID = $activePlayerId;

        do {
            $nextPlayerArray[] = $nextPlayerID;
            $nextPlayerID = $nextPlayerTable[$nextPlayerID];
        } while($nextPlayerID != $activePlayerId);
        array_push($nextPlayerArray, array_shift($nextPlayerArray)); //place the active player to the end

        $playerIDToGameEnded = $this->game->getCollectionFromDB("SELECT `player_id`, `game_ended` FROM `player`", true);
        $nextPlayerInGame = null;
        foreach($nextPlayerArray as $playerID){
            if($playerIDToGameEnded[$playerID] == 'no'){
                $nextPlayerInGame = $playerID;
                break;
            }
        }

        if($nextPlayerInGame){
            $this->game->gamestate->changeActivePlayer($nextPlayerInGame);
            return PlayerTurn::class;
        } else { //the game has ended
            $endGameScoring = $this->game->getEndGameScoring();

            foreach($endGameScoring['player_scores'] as $playerID => $updatedScore)
                $this->game->updatePlayerScore($playerID, $updatedScore); //normally not required, except debug cases where cards table is imported

            $this->saveGameEndStats($endGameScoring, count($playerIDToGameEnded));

            $this->notify->all("displayEndGameScoring", '', ["endGameScoring" => $endGameScoring]);
            return EndScore::class;
        }
    }

    private function saveGameEndStats(array $endGameScoring, int $playerCount): void {
        $cardTypeStats = ['bannerfish', 'pufferfish', 'octopus', 'corals', 'anchor'];
        $cardTypeTotals = array_fill_keys($cardTypeStats, 0);

        foreach ($endGameScoring['player_scores'] as $playerID => $playerScore) {
            foreach (['totalScore', ...$cardTypeStats, 'anchor_count'] as $stat) {
                $this->game->playerStats->set($stat, $playerScore[$stat], (int) $playerID);
            }
            foreach ($cardTypeStats as $stat) {
                $cardTypeTotals[$stat] += $playerScore[$stat];
            }
        }

        foreach ($cardTypeStats as $stat) {
            $averageStatName = $stat . 'Average';
            $this->game->tableStats->set($averageStatName, $cardTypeTotals[$stat] / $playerCount);
        }

        $passCount = (int) $this->game->getUniqueValueFromDB("SELECT COUNT(*) FROM `player` WHERE `passed` = 'yes'");
        $this->game->tableStats->set('passCount', $passCount);
        $this->game->tableStats->set('passCountPerPlayer', $passCount / $playerCount);

        $cardsInHands = $this->game->tableManager->getCardsOnTable()['players'];
        $totalFacedown = 0;
        foreach ($cardsInHands as $playerID => $cards) {
            $facedownCount = count(array_filter($cards, fn($card) => $card['state_in_hand'] == 'facedown'));
            $this->game->playerStats->set('cardsFacedown', $facedownCount, (int) $playerID);
            $totalFacedown += $facedownCount;
        }
        $this->game->tableStats->set('facedownCardPerPlayer', $totalFacedown / $playerCount);
    }
}