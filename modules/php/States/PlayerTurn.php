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
    public function actSwapCards(int $centerCardID, int $handCardLocation, int $activePlayerId, array $args)
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

        $centerCardLocation = $cardInCenter['card_location_arg'];
        $stateInHand = $this->placeCardAsNumberOrAnchor($activePlayerId, (int) $cardInCenter['rank'], (int) $cardInHand['location_in_hand']);
        $this->game->DbQuery("UPDATE `cards` SET `card_location` = 'player', `card_location_arg` = $activePlayerId, `state_in_hand` = '$stateInHand', `location_in_hand` = ".$cardInHand['location_in_hand']." WHERE `card_id` = $centerCardID");
        $this->game->DbQuery("UPDATE `cards` SET `card_location` = 'center', `card_location_arg` = ".$centerCardLocation.", `state_in_hand` = NULL, `location_in_hand` = NULL WHERE `card_id` = ".$cardInHand['card_id']);

        $soloCenterCardReplacement = $this->game->isSoloMode() ? $this->soloReplaceCenterCard((int) $cardInHand['rank'], (int) $centerCardLocation) : [];

        $anyFacedownCard = $this->game->getObjectFromDB("SELECT * FROM `cards` WHERE `card_location` = 'player' AND `card_location_arg` = $activePlayerId AND `state_in_hand` = 'facedown' LIMIT 1");
        $gameEnded = !$anyFacedownCard;
        if($gameEnded)
            $this->game->DbQuery("UPDATE `player` SET `game_ended` = 'yes' WHERE `player_id` = $activePlayerId");

        $updatedScore = $this->game->updatePlayerScore($activePlayerId);

        $player_name = $this->game->getPlayerNameById($activePlayerId);
        $centerCardRank = $cardInCenter['rank'];
        $handCardRank = $cardInHand['rank'];
        $centerCardIconStr = $this->game->getCardLogHTML($cardInCenter);
        $handCardIconStr = $this->game->getCardLogHTML($cardInHand);

        $swapNotifStr = "{$player_name} {$centerCardIconStr} [{$handCardLocation}] ↔ {$handCardIconStr} [{$centerCardLocation}]";
        $swapData = [
            "player_id" => $activePlayerId,
            "centerCardRank" => $centerCardRank,
            "centerCardLocation" => $centerCardLocation,
            "handCardRank" => $handCardRank,
            "handCardLocation" => $handCardLocation,
            "cardInHand" => $cardInHand,
            "cardInCenter" => $cardInCenter,
            "newStateInHand" => $stateInHand,
        ];

        $this->bga->notify->all("cardsSwapped", '${SWAP_NOTIF_STR}', [
            'preserve' => ['swapData', 'updatedScore', 'game_ended', 'soloCenterCardReplacement'],
            'swapData' => $swapData,
            "updatedScore" => $updatedScore,
            'SWAP_NOTIF_STR' => $swapNotifStr,
            "game_ended" => $gameEnded,
        ]);
        
        if($soloCenterCardReplacement){
            $newCardNum = $soloCenterCardReplacement['newCenterCardData']['rank'];
            $oldCardNum = $soloCenterCardReplacement['discardedCardData']['rank'];
            $centerCardReplacedStr = sprintf( clienttranslate('Center: %d replaces %d'), $newCardNum, $oldCardNum);

            $this->bga->notify->all("centerCardReplaced", '${CENTER_CARD_REPLACED_STR}', [
                'preserve' => ['soloCenterCardReplacement'],
                'CENTER_CARD_REPLACED_STR' => $centerCardReplacedStr,
                "soloCenterCardReplacement" => $soloCenterCardReplacement,
            ]);
        }

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

    private function soloReplaceCenterCard(int $handCardRank, int $centerCardLocation): array{
        if(!$this->game->isSoloMode())
            return[];

        $otherCenterCards = $this->game->getObjectListFromDB("SELECT * FROM `cards` WHERE `card_location` = 'center' AND `card_location_arg` <> $centerCardLocation ORDER BY `rank` ASC;");

        if ($handCardRank < SOLO_DIFFICULTY_RANK_THRESHOLD) {
            $cardToDiscard = $otherCenterCards[0]['rank'] < $otherCenterCards[1]['rank'] ? $otherCenterCards[0] : $otherCenterCards[1];
        } else {
            $cardToDiscard = $otherCenterCards[0]['rank'] > $otherCenterCards[1]['rank'] ? $otherCenterCards[0] : $otherCenterCards[1];
        }

        $this->game->DbQuery("UPDATE `cards` SET `card_location` = 'returned_to_box' WHERE `card_id` = ".$cardToDiscard['card_id']);

        $replacementCard = $this->game->getObjectFromDB("SELECT * FROM `cards` WHERE `card_location` = 'solo_deck' ORDER BY `card_location_arg` DESC LIMIT 1");
        $this->game->DbQuery("UPDATE `cards` SET `card_location` = 'center', `card_location_arg` = ".$cardToDiscard['card_location_arg']." WHERE `card_id` = ".$replacementCard['card_id']);

        return [
            'discardedCardData' => $cardToDiscard,
            'newCenterCardData' => $replacementCard,
        ];
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