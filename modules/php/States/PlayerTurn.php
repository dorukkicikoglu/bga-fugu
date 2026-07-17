<?php

declare(strict_types=1);

namespace Bga\Games\Fugu\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\Fugu\Game;

class PlayerTurn extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 10,
            type: StateType::ACTIVE_PLAYER,
        );
    }

    /**
     * Game state arguments, example content.
     *
     * This method returns some additional information that is very specific to the `PlayerTurn` game state.
     */
    public function getArgs(): array
    {
        // Get some values from the current game situation from the database.
        $handLocationsDB = $this->game->getObjectListFromDB("SELECT location_in_hand FROM `cards` WHERE card_location = 'player' AND card_location_arg = ".$this->game->getActivePlayerId()." AND state_in_hand = 'facedown' ORDER BY location_in_hand ASC", true);
        $centerCardsDB = $this->game->getObjectListFromDB("SELECT card_id FROM `cards` WHERE card_location = 'center' ORDER BY card_location_arg ASC", true);
        return [
            'possibleHandLocations' => $handLocationsDB,
            'possibleCenterCardIDs' => $centerCardsDB
        ];
    }    

    /**
     * Player action, example content.
     *
     * In this scenario, each time a player plays a card, this method will be called. This method is called directly
     * by the action trigger on the front side with `bgaPerformAction`.
     *
     * @throws UserException
     */
    #[PossibleAction]
    public function actSwapCards(int $centerCardID, int $handCardLocation , int $activePlayerId, array $args)
    {
        if (!in_array($centerCardID, $args['possibleCenterCardIDs']))
            throw new UserException('Invalid center card choice');

        if (!in_array($handCardLocation, $args['possibleHandLocations']))
            throw new UserException('Invalid hand card choice');

        $cardInCenter = $this->game->getObjectFromDB("SELECT * FROM `cards` WHERE `card_id` = $centerCardID AND `card_location` = 'center'");
        $cardInHand = $this->game->getObjectFromDB("SELECT * FROM `cards` WHERE `card_location` = 'player' AND `card_location_arg` = $activePlayerId AND location_in_hand = $handCardLocation");

        if(!$cardInCenter)
            throw new UserException('Card in center not found');
        if(!$cardInHand)
            throw new UserException('Card in hand not found');

        $stateInHand = $this->placeCardAsNumberOrAnchor($activePlayerId, (int) $cardInCenter['rank'], (int) $cardInHand['location_in_hand']);
        $this->game->DbQuery("UPDATE `cards` SET `card_location` = 'player', `card_location_arg` = $activePlayerId, `state_in_hand` = '$stateInHand', `location_in_hand` = ".$cardInHand['location_in_hand']." WHERE `card_id` = $centerCardID");
        $this->game->DbQuery("UPDATE `cards` SET `card_location` = 'center', `card_location_arg` = ".$cardInCenter['card_location_arg'].", `state_in_hand` = NULL, `location_in_hand` = NULL WHERE `card_id` = ".$cardInHand['card_id']);

        $anyFacedownCard = $this->game->getObjectFromDB("SELECT * FROM `cards` WHERE `card_location` = 'player' AND `card_location_arg` = $activePlayerId AND `state_in_hand` = 'facedown' LIMIT 1");
        $gameEnded = !$anyFacedownCard;
        if($gameEnded)
            $this->game->DbQuery("UPDATE `player` SET `game_ended` = 'yes' WHERE `player_id` = $activePlayerId");

        $updatedScore = $this->game->updatePlayerScore($activePlayerId);

        $this->bga->notify->all("cardsSwapped", clienttranslate('${player_name} takes ${centerCardRank}'), [
            "player_id" => $activePlayerId,
            "centerCardRank" => $cardInCenter['rank'],
            "handCardLocation" => $handCardLocation,
            "cardInHand" => $cardInHand,
            "cardInCenter" => $cardInCenter,
            "newStateInHand" => $stateInHand,
            "updatedScore" => $updatedScore,
            "game_ended" => $gameEnded,
        ]);

        return NextPlayer::class;
    }

    private function placeCardAsNumberOrAnchor(int $activePlayerId, int $cardRank, int $cardLocation): string{
        $numberCards = $this->game->getObjectListFromDB("SELECT * FROM `cards` WHERE `card_location` = 'player' AND `card_location_arg` = $activePlayerId AND `state_in_hand` = 'number'");

        $lowerCard = null;
        $higherCard = null;
        foreach ($numberCards as $card) {
            if ($card['location_in_hand'] < $cardLocation && ($lowerCard === null || $card['location_in_hand'] > $lowerCard['location_in_hand'])) {
                $lowerCard = $card;
            }
            if ($card['location_in_hand'] > $cardLocation && ($higherCard === null || $card['location_in_hand'] < $higherCard['location_in_hand'])) {
                $higherCard = $card;
            }
        }

        if ($lowerCard !== null && $lowerCard['rank'] > $cardRank) {
            return "anchor";
        }
        if ($higherCard !== null && $higherCard['rank'] < $cardRank) {
            return "anchor";
        }

        return "number";
    }

    /**
     * Player action, example content.
     *
     * In this scenario, each time a player pass, this method will be called. This method is called directly
     * by the action trigger on the front side with `bgaPerformAction`.
     */
    #[PossibleAction]
    public function actPass(int $activePlayerId)
    {
        $this->game->DbQuery("UPDATE `player` SET `passed` = 'yes', `game_ended` = 'yes' WHERE `player_id` = $activePlayerId");

        // Notify all players about the choice to pass.
        $this->notify->all("pass", clienttranslate('${player_name} passes'), [
            "player_id" => $activePlayerId,
        ]);
        
        // at the end of the action, move to the next state
        return NextPlayer::class;
    }

    /**
     * This method is called each time it is the turn of a player who has quit the game (= "zombie" player).
     * You can do whatever you want in order to make sure the turn of this player ends appropriately
     * (ex: play a random card).
     * 
     * See more about Zombie Mode: https://en.doc.boardgamearena.com/Zombie_Mode
     *
     * Important: your zombie code will be called when the player leaves the game. This action is triggered
     * from the main site and propagated to the gameserver from a server, not from a browser.
     * As a consequence, there is no current player associated to this action. In your zombieTurn function,
     * you must _never_ use `getCurrentPlayerId()` or `getCurrentPlayerName()`, 
     * but use the $playerId passed in parameter and $this->game->getPlayerNameById($playerId) instead.
     */
    function zombie(int $playerId) { return $this->actPass($playerId); }
}