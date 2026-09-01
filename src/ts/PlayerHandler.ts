import { Game } from "./Game";
import { HandHandler } from "./HandHandler";

export class PlayerHandler{
    private overallPlayerBoard: HTMLDivElement;
    private scoreCounter: Counter;
    private anchorTextDiv: HTMLDivElement;
    private hand: HandHandler;
    private CoralCounterContainer: HTMLDivElement;
    
	constructor(private game: Game, private playerID: number, private playerName: string, private playerColor: string, private playerNo: number, private playerHandData: CardInHand[], private player_game_ended: boolean, private scoringData: PlayerScore) {
        this.overallPlayerBoard = this.game.bga.playerPanels.getElement(this.playerID).closest('.player-board');

        const star = this.overallPlayerBoard.querySelector('.fa-star');
        if(star){
            this.anchorTextDiv = document.createElement('div');
            this.anchorTextDiv.classList.add('anchor-text');
            this.anchorTextDiv.innerText = this.scoringData.anchorCount.toString();
            star.insertAdjacentElement('afterend', this.anchorTextDiv);
            this.anchorTextDiv.insertAdjacentHTML('afterend', '<i class="fa6 fa-anchor"></i>');
        }

        this.scoreCounter = new ebg.counter();
        this.scoreCounter.create(`player_score_${this.playerID}`, {
            value: this.scoringData['totalScore'],
            playerCounter: 'Points',
            playerId: this.playerID,
        });

        this.createCoralCounterContainer();
        this.displayCoralIcons();

        this.hand = new HandHandler(this.game, this, this.playerHandData); 

        this.setGameEnded(this.player_game_ended, false);
	}

    public setGameEnded(gameEnded: boolean, skipDarkening: boolean): void {
        this.player_game_ended = gameEnded;
        if(!gameEnded || skipDarkening)
            return;

        this.overallPlayerBoard.classList.add('game-ended-player-board');
        this.hand.getHandContainer().classList.add('game-ended-player-hand');
    }

    public updateScoring(updatedScoring: PlayerScore): void {
        this.scoringData = updatedScoring;
        this.scoreCounter.toValue(this.scoringData.totalScore);

        if(this.anchorTextDiv)
            this.anchorTextDiv.innerText = this.scoringData.anchorCount.toString();

        this.displayCoralIcons();
    }

    private createCoralCounterContainer(){
        this.CoralCounterContainer = document.createElement('div');
        this.CoralCounterContainer.classList.add('coral-counter-container');
        this.CoralCounterContainer.innerHTML = `
            <div class="coral-counter" data-coral-color="pink">
                <div class="coral-counter-icon" data-coral-icon="pink"></div>
                <div class="coral-counter-text"></div>
            </div>
            <div class="coral-counter" data-coral-color="green">
                <div class="coral-counter-icon" data-coral-icon="green"></div>
                <div class="coral-counter-text"></div>
            </div>
            <div class="coral-counter" data-coral-color="yellow">
                <div class="coral-counter-icon" data-coral-icon="yellow"></div>
                <div class="coral-counter-text"></div>
            </div>
        `;

        const playerScore = this.overallPlayerBoard.querySelector('.player_score');
        playerScore.insertAdjacentElement('afterend', this.CoralCounterContainer);
    }

    public displayCoralIcons(){
        const coralCounts = this.scoringData.coralCounts;
        this.CoralCounterContainer.querySelector('[data-coral-color="pink"] .coral-counter-text').textContent = coralCounts.pinkCount.toString();
        this.CoralCounterContainer.querySelector('[data-coral-color="green"] .coral-counter-text').textContent = coralCounts.greenCount.toString();
        this.CoralCounterContainer.querySelector('[data-coral-color="yellow"] .coral-counter-text').textContent = coralCounts.yellowCount.toString();
    }

    public getPlayerID(): number { return this.playerID; }
    public getPlayerName(): string { return this.playerName; }
    public getPlayerColor(): string { return this.playerColor; }
    public getHand(): HandHandler { return this.hand; }
    public getAnchorCount(): number { return this.scoringData.anchorCount; }
}