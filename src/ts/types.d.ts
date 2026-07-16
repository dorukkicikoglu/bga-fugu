interface FuguPlayer extends Player {
    player_no: number;
    game_ended: boolean;
    scoring_data: PlayerScore;
}

interface FuguGamedatas extends Gamedatas<FuguPlayer> {
    // Add here variables you set up in getAllDatas
    cardsInCenter: CardInCenter[];
    cardsInHands: Record<number, CardInHand[]>;
    endGameScoring: EndGameScoreData;
}

interface CardBase {
    card_id: number;
}

interface CardInCenter extends CardBase {
    zone: 'center';
    location_in_center: number;
    suit: string;
    rank: number;
}

interface CardInHand extends CardBase {
    zone: 'hand';
    location_in_hand: number;
    state_in_hand: CardStateInHand;
    suit: null;
    rank: null;
}

interface PlayerScore{
    anchor: number;
    bannerfish: number;
    corals: number;
    octopus: number;
    pufferfish: number;
    totalScore: number;
}

type CardStateInHand = 'facedown' | 'number' | 'anchor';

interface EndGameScoreData {
    winner_ids: number[];
    player_scores: { [player_id: number]: PlayerScore };
}

/*
 * Describe here the types for your state args
 */
interface PlayerTurnArgs {
    playableCardsIds: number[];
}
   
/*
 * Describe here the types for your notif args
 */