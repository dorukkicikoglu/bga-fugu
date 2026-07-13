interface FuguPlayer extends Player {
    energy: number; // any information you add on each result['players'] //ekmek sil default?
    player_no: number; //ekmek sil?
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
    state_in_hand: number; // adjust type to whatever state_in_hand actually holds
    suit: null;
    rank: null;
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