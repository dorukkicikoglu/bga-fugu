interface FuguPlayer extends Player {
    player_no: number; //ekmek sil?
    game_ended: boolean;
    scoring_data: ScoringData;
}

interface FuguGamedatas extends Gamedatas<FuguPlayer> {
    // Add here variables you set up in getAllDatas
    cardsInCenter: CardInCenter[];
    cardsInHands: Record<number, CardInHand[]>;
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

interface ScoringData{
    anchor: number;
    bannerfish: number;
    corals: number;
    octopus: number;
    pufferfish: number;
    totalScore: number;
}

type CardStateInHand = 'facedown' | 'number' | 'anchor';

/*
 * Describe here the types for your state args
 */
interface PlayerTurnArgs {
    playableCardsIds: number[];
}
   
/*
 * Describe here the types for your notif args
 */