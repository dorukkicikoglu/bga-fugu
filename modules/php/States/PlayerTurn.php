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
        $activePlayerId = $this->game->getActivePlayerId();

        $handLocationsDB = $this->game->getObjectListFromDB("SELECT location_in_hand FROM `cards` WHERE card_location = 'player' AND card_location_arg = $activePlayerId AND state_in_hand = 'facedown' ORDER BY location_in_hand ASC", true);
        $centerCardsDB = $this->game->getObjectListFromDB("SELECT card_id, `rank` FROM `cards` WHERE card_location = 'center' ORDER BY card_location_arg ASC");

        $freeSlotBounds = $this->game->getFreeSlotBounds((int) $activePlayerId);

        $possibleCenterCardIDs = [];
        $centerCardsPlaceability = [];
        foreach ($centerCardsDB as $centerCard) {
            $cardId = (int) $centerCard['card_id'];
            $possibleCenterCardIDs[] = $cardId;
            $centerCardsPlaceability[$cardId] = $this->game->isCardPlaceable($freeSlotBounds, (int) $centerCard['rank']);
        }

        return [
            'possibleHandLocations' => $handLocationsDB,
            'possibleCenterCardIDs' => $possibleCenterCardIDs,
            'centerCardsPlaceability' => $centerCardsPlaceability,
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
    public function actSwapCards(int $centerCardID, int $handCardLocation, bool $placeAsAnchor, int $activePlayerId, array $args)
    {
        if (!in_array($centerCardID, $args['possibleCenterCardIDs']))
            throw new UserException('Invalid center card choice');

        if (!in_array($handCardLocation, $args['possibleHandLocations']))
            throw new UserException('Invalid hand card choice');

        $cardInCenter = $this->game->getObjectFromDB("SELECT * FROM `cards` WHERE `card_id` = $centerCardID AND `card_location` = 'center'");
        $cardInHand = $this->getRandomFaceDownCard($activePlayerId, $handCardLocation); // draw a random facedown cards to prevent initial table data be deterministic

        if(!$cardInCenter)
            throw new UserException('Card in center not found');
        if(!$cardInHand)
            throw new UserException('Card in hand not found');

        // Anchor placement is always legal, regardless of order (per the rules, an anchor card can replace any
        // face-down card). Number placement is only legal when it wouldn't break ascending order at this spot.
        if (!$placeAsAnchor && $this->wouldForceAnchor($activePlayerId, (int) $cardInCenter['rank'], (int) $cardInHand['location_in_hand']))
            throw new UserException('This card cannot be placed here in ascending order; it must be placed as an anchor');

        $centerCardLocation = $cardInCenter['card_location_arg'];
        $stateInHand = $placeAsAnchor ? 'anchor' : 'number';
        $this->game->DbQuery("UPDATE `cards` SET `card_location` = 'player', `card_location_arg` = $activePlayerId, `state_in_hand` = '$stateInHand', `location_in_hand` = ".$cardInHand['location_in_hand']." WHERE `card_id` = $centerCardID");
        $this->game->DbQuery("UPDATE `cards` SET `card_location` = 'center', `card_location_arg` = ".$centerCardLocation.", `state_in_hand` = NULL, `location_in_hand` = NULL WHERE `card_id` = ".$cardInHand['card_id']);

        $soloCenterCardReplacement = $this->game->isSoloMode() ? $this->soloReplaceCenterCard((int) $cardInHand['rank'], (int) $centerCardLocation) : [];

        $anyFacedownCard = $this->game->getObjectFromDB("SELECT * FROM `cards` WHERE `card_location` = 'player' AND `card_location_arg` = $activePlayerId AND `state_in_hand` = 'facedown' LIMIT 1");
        $playerGameEnded = !$anyFacedownCard;
        if($playerGameEnded)
            $this->game->DbQuery("UPDATE `player` SET `game_ended` = 'yes' WHERE `player_id` = $activePlayerId");

        $playerIDToGameEnded = $this->game->getCollectionFromDB("SELECT `player_id`, `game_ended` FROM `player`", true);
        $everyoneEnded = !in_array('no', $playerIDToGameEnded, true);

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
            'preserve' => ['swapData', 'updatedScore', 'player_game_ended', 'soloCenterCardReplacement'],
            'swapData' => $swapData,
            "updatedScore" => $updatedScore,
            'SWAP_NOTIF_STR' => $swapNotifStr,
            "player_game_ended" => $playerGameEnded,
            'everyone_ended' => $everyoneEnded
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

    /**
     * Swaps a random facedown card into the requested hand slot before reading it, then returns that
     * card's row (now reflecting the slot's location). Prevents the card at a given slot from being
     * deterministic to anyone who inspects DB state before this action resolves.
     */
    private function getRandomFaceDownCard(int $activePlayerId, int $handCardLocation): ?array{
        $initialCard = $this->game->getObjectFromDB("SELECT * FROM `cards` WHERE `card_location` = 'player' AND `card_location_arg` = $activePlayerId AND `location_in_hand` = $handCardLocation");
        if(!$initialCard)
            return null;

        $randomFacedownCard = $this->game->getObjectFromDB("SELECT * FROM `cards` WHERE `card_location` = 'player' AND `state_in_hand` = 'facedown' ORDER BY RAND() LIMIT 1");
        if(!$randomFacedownCard)
            return null;

        $this->game->DbQuery("UPDATE `cards` SET `card_location_arg` = ".$initialCard['card_location_arg'].", `location_in_hand` = ".$initialCard['location_in_hand']." WHERE `card_id` = ".$randomFacedownCard['card_id']);
        $this->game->DbQuery("UPDATE `cards` SET `card_location_arg` = ".$randomFacedownCard['card_location_arg'].", `location_in_hand` = ".$randomFacedownCard['location_in_hand']." WHERE `card_id` = ".$initialCard['card_id']);

        $randomFacedownCard['card_location_arg'] = $initialCard['card_location_arg'];
        $randomFacedownCard['location_in_hand'] = $initialCard['location_in_hand'];

        return $randomFacedownCard;
    }

    /**
     * Whether placing cardRank as a 'number' card at cardLocation would break ascending order there, ie. whether
     * the player would be forced to place it as an anchor instead. Anchor placement is always legal regardless
     * of this result; it just determines whether plain number placement is also legal.
     */
    private function wouldForceAnchor(int $activePlayerId, int $cardRank, int $cardLocation): bool{
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
            return true;
        }
        if ($higherCard !== null && $higherCard['rank'] < $cardRank) {
            return true;
        }

        return false;
    }

    private function soloReplaceCenterCard(int $handCardRank, int $centerCardLocation): array{
        if(!$this->game->isSoloMode())
            return[];

        $otherCenterCards = $this->game->getObjectListFromDB("SELECT * FROM `cards` WHERE `card_location` = 'center' AND `card_location_arg` <> $centerCardLocation ORDER BY `rank` ASC;");

        if ($handCardRank < SOLO_COMPARE_THRESHOLD) {
            $cardToDiscard = $otherCenterCards[0]['rank'] < $otherCenterCards[1]['rank'] ? $otherCenterCards[0] : $otherCenterCards[1];
        } else {
            $cardToDiscard = $otherCenterCards[0]['rank'] > $otherCenterCards[1]['rank'] ? $otherCenterCards[0] : $otherCenterCards[1];
        }

        $this->game->DbQuery("UPDATE `cards` SET `card_location` = 'returned_to_box' WHERE `card_id` = ".$cardToDiscard['card_id']);

        $replacementCard = $this->game->getObjectFromDB("SELECT * FROM `cards` WHERE `card_location` = 'solo_deck' ORDER BY RAND() DESC LIMIT 1");
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

        $playerIDToGameEnded = $this->game->getCollectionFromDB("SELECT `player_id`, `game_ended` FROM `player`", true);
        $everyoneEnded = !in_array('no', $playerIDToGameEnded, true);

        // Notify all players about the choice to pass.
        $playerPassedStr = '${player_name} passes';
        $this->bga->notify->all("pass", '${PLAYER_PASSED_STR}', [
            'preserve' => ['player_id'],
            'PLAYER_PASSED_STR' => $playerPassedStr,
            'player_id' => $activePlayerId,
            'everyone_ended' => $everyoneEnded
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