import { Game } from "./Game";
import { HandHandler } from "./HandHandler";

export class PlayerHandler{
    private overallPlayerBoard: HTMLDivElement;
    private scoreCounter: Counter;
    private hand: HandHandler;
    
	constructor(private gameui: Game, private playerID: number, private playerName: string, private playerColor: string, private playerNo: number, private playerHandData: CardInHand[], private game_ended: boolean, private scoringData) {
		this.overallPlayerBoard = document.getElementById('overall_player_board_' + this.playerID) as HTMLDivElement;
        this.setGameEnded(this.game_ended);

        this.scoreCounter = new ebg.counter();
        this.scoreCounter.create(`player_score_${this.playerID}`, {
            value: this.scoringData['totalScore'],
            playerCounter: 'Points',
            playerId: this.playerID,
        });

        this.hand = new HandHandler(this.gameui, this, this.playerHandData); 
	}

    public setGameEnded(gameEnded){
        this.game_ended = gameEnded;
        if(gameEnded)
            this.overallPlayerBoard.classList.add('player-game-ended');
    }

    public updateScoring(updatedScoring: ScoringData): void {
        this.scoringData = updatedScoring;
        this.scoreCounter.toValue(this.scoringData['totalScore']);
    }
    
    public async animateCardSwap(handCardLocation: number, cardInCenter: CardInCenter, cardInHand: CardInHand, newStateInHand: CardStateInHand){
        const centerContainer = this.gameui.centerHandler.getCenterContainer();
        const handContainer = this.hand.getHandContainer();
        centerContainer.querySelectorAll('.a-card.selected-center-card').forEach(element => element.classList.remove('selected-center-card'));
        handContainer.querySelectorAll('.a-card.selected-hand-card').forEach(element => element.classList.remove('selected-hand-card'));
        
        const centerCard = centerContainer.querySelector(`[data-card-id="${cardInCenter.card_id}"]`) as HTMLDivElement;
        const handCard = handContainer.querySelector(`[data-location-in-hand="${handCardLocation}"]`) as HTMLDivElement;
        const handCardClone = this.gameui.createCardDiv(cardInHand);
        handCardClone.classList.add('cloned-card');

        if(!centerCard || !handCard || !handCardClone)
            return;

        const centerCardClone = this.gameui.cloneCard(centerCard);
        handCard.insertAdjacentElement('afterend', centerCardClone);
        centerCard.insertAdjacentElement('afterend', handCardClone);

        centerCardClone.style.margin = '0';
        handCardClone.style.margin = '0';

	    this.gameui.placeOnObject(centerCardClone, centerCard);
	    this.gameui.placeOnObject(handCardClone, handCard);

        centerCard.style.opacity = '0';
        handCard.style.opacity = '0';
        centerCardClone.style.zIndex = handCard.style.zIndex

        const pullUpAnimTime = 200;
        centerCardClone.style.transition = `top ${pullUpAnimTime}ms ease`;
	    centerCardClone.style.top = `${parseFloat(centerCardClone.style.top || '0') - 20}px`;

        await this.gameui.bga.gameui.wait(pullUpAnimTime + 50);

        const cardMoveAnimTime = 800;
        centerCardClone.style.transition = `inset ${cardMoveAnimTime}ms ease, transform ${cardMoveAnimTime}ms ease`;
        handCardClone.style.transition = `inset ${cardMoveAnimTime}ms ease`;
        
        centerCardClone.style.top = handCard.offsetTop + 'px';
        centerCardClone.style.left = handCard.offsetLeft + 'px';
        handCardClone.style.top = centerCard.offsetTop + 'px';
        handCardClone.style.left = centerCard.offsetLeft + 'px';

        if(newStateInHand == 'anchor'){
            centerCardClone.style.boxShadow = 'none';
            centerCardClone.style.transform = 'rotate(180deg)';
        }
        
        await this.gameui.bga.gameui.wait(cardMoveAnimTime);
        
        handCardClone.classList.remove('cloned-card');
        handCardClone.style.margin = null;
        handCardClone.style.top = null;
        handCardClone.style.left = null;
        handCardClone.style.transition = null;

        centerCardClone.classList.remove('cloned-card');
        centerCardClone.style.margin = null;
        centerCardClone.style.top = null;
        centerCardClone.style.left = null;
        centerCardClone.style.transition = null;
        centerCardClone.style.boxShadow = null;
        centerCardClone.style.transform = null;
        centerCardClone.setAttribute('data-state-in-hand', newStateInHand);
        centerCardClone.setAttribute('data-location-in-hand', cardInHand.location_in_hand.toString());

        centerCard.replaceWith(handCardClone);
        handCard.replaceWith(centerCardClone);
    }

    public getPlayerID(): number { return this.playerID; }
    public getPlayerName(): string { return this.playerName; }
    public getPlayerColor(): string { return this.playerColor; }
    public getHand(): HandHandler { return this.hand; }
}