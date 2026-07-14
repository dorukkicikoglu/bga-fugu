import { Game } from "./Game";
import { HandHandler } from "./HandHandler";

export class PlayerHandler{
    private overallPlayerBoard: HTMLDivElement;
    private scoreCounter: Counter;
    private hand: HandHandler;
    
	constructor(private gameui: Game, private playerID: number, private playerName: string, private playerColor: string, private playerScore: number, private playerNo: number, private playerHandData: CardInHand[], private game_ended: boolean) {
		this.overallPlayerBoard = document.getElementById('overall_player_board_' + this.playerID) as HTMLDivElement;
        this.setGameEnded(this.game_ended);

        this.scoreCounter = new ebg.counter();
        this.scoreCounter.create(`player_score_${this.playerID}`, {
            value: this.playerScore, //ekmek degistir
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

    public updateScore(newScore: number): void { //ekmek kullan
        this.playerScore = newScore;
        this.scoreCounter.toValue(newScore);
    }
    
    public getPlayerID(): number { return this.playerID; }
    public getPlayerName(): string { return this.playerName; }
    public getPlayerColor(): string { return this.playerColor; }
    public getHand(): HandHandler { return this.hand; }
}