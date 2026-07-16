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
            $this->notify->all("displayEndGameScoring", '', ["endGameScoring" => $endGameScoring]);
            return EndScore::class;
        }
    }
}