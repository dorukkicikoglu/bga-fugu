interface FuguPlayer extends Player {
    player_no: number;
    game_ended: boolean;
    scoring_data: SoloPlayerScore;
}

interface FuguGamedatas extends Gamedatas<FuguPlayer> {
    // Add here variables you set up in getAllDatas
    cardsInCenter: CardInCenter[];
    cardsInHands: Record<number, CardInHand[]>;
    endGameScoring: EndGameScoreData;
    deckLength: number;
    isSoloExpertDifficulty: boolean;
    pref_names: any; //ekmek type ekle
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
    anchorCount: number;
    totalScore: number;
}

interface SoloPlayerScore extends PlayerScore{
    soloDifficultyPenalty: number;
}

type CardStateInHand = 'facedown' | 'number' | 'anchor';

interface soloCenterCardReplacement{
    discardedCardData: CardInCenter;
    newCenterCardData: CardInCenter;
}

interface EndGameScoreData {
    winner_ids: number[];
    player_scores: { [player_id: number]: SoloPlayerScore };
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