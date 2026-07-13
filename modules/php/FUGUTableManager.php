<?php

namespace Bga\Games\Fugu;

use Bga\Games\Fugu\Game;

class FUGUTableManager{
    public Game $game;

    function __construct(Game $game) {
        $this->game = $game;
    }

    function shuffleAndDealCards(){
        $this->game->cardsDeck->shuffle('returned_to_box');

        $playerIDs = $this->game->getObjectListFromDB("SELECT `player_id` FROM `player`", true);

        $cards = $this->game->getObjectListFromDB("SELECT * FROM `cards` WHERE `card_location` = 'returned_to_box' ORDER BY `card_location_arg` ASC");

        for($i = 0; $i < CENTER_CARD_COUNT; $i++){
            $cardID = $cards[$i]['card_id'];
            $this->game->DbQuery("UPDATE `cards` SET `card_location` = 'center', `card_location_arg` = ".($i + 1)." WHERE `card_id` = $cardID");
        }

        $cardIndex = CENTER_CARD_COUNT;
        foreach($playerIDs as $playerID){
            for($i = 0; $i < CARDS_PER_PLAYER; $i++){
                $cardID = $cards[$cardIndex]['card_id'];
                $this->game->DbQuery("UPDATE `cards` SET `card_location` = 'player', `card_location_arg` = $playerID, `state_in_hand` = 'facedown', `location_in_hand` = ".($i + 1)." WHERE `card_id` = $cardID");
                $cardIndex++;
            }
        }
    }

    
    //ekmek sil?
    // function getRemainingPlayerCardsCount(){ return (int) $this->getUniqueValueFromDB("SELECT count(*) FROM `cards` WHERE `card_location` = 'player'"); }
    // function isLastCards(){ return $this->getRemainingPlayerCardsCount() <= $this->game->customGetPlayersNumber(true); }
    // function arePlayerCardsFinished(){ return (int) $this->getUniqueValueFromDB("SELECT EXISTS (SELECT 1 FROM `cards` WHERE `card_location` = 'player') AS exists_in_player") == 0; }
    // function anyPilesTaken($playerID = false){ return (int) $this->getUniqueValueFromDB("SELECT EXISTS (SELECT 1 FROM `cards` WHERE `card_location` = 'scored'".($playerID ? " AND `card_location_arg` = $playerID" : "").") AS exists_scored_card") != 0; }
    // function getPlayedCards(){ return $this->getDoubleKeyCollectionFromDB("SELECT `suit`, `rank`, `card_id` FROM `cards` WHERE `card_location` IN('pile', 'pile_queue', 'scored')", false); }
}

?>