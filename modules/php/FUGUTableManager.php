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

    function getCardsOnTable(){
        $allCardsDB = $this->game->getCollectionFromDb("SELECT * FROM `cards` ORDER BY `card_location_arg` ASC, `location_in_hand` ASC");
        $cardsData = [
            'center' => [],
            'players' => [],
        ];

        foreach($allCardsDB as $cardDB){
            
            if($cardDB['card_location'] === 'center'){
                $card = [
                    'card_id' => (int) $cardDB['card_id'],
                    'location_in_center' => (int) $cardDB['card_location_arg'],
                    'suit' => $cardDB['suit'],
                    'rank' => (int) $cardDB['rank'],
                ];
                $cardsData['center'][] = $card;
            } else if($cardDB['card_location'] === 'player'){
                $player_id = (int) $cardDB['card_location_arg'];
                $state_in_hand = $cardDB['state_in_hand'];

                if(((int) $cardDB['card_id']) % 3 > 0)  //ekmek sil
                    $state_in_hand = 'number'; //ekmek sil
                if(((int) $cardDB['card_id']) % 5 == 3)  //ekmek sil
                    $state_in_hand = 'anchor'; //ekmek sil

                $card = [
                    'card_id' => null,
                    'location_in_hand' => (int) $cardDB['location_in_hand'],
                    'state_in_hand' => $state_in_hand,
                    'suit' => null,
                    'rank' => null,
                ];

                if($state_in_hand === 'number' || $state_in_hand === 'anchor'){
                    $card['card_id'] = (int) $cardDB['card_id'];
                    $card['suit'] = (int) $cardDB['suit'];
                    $card['rank'] = $cardDB['rank'];
                }
                $cardsData['players'][$player_id][] = $card;
            }
        }
        return $cardsData;
    }
}

?>