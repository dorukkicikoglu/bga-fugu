import { Game } from "./Game";
import { HandHandler } from "./HandHandler";

export class PlayerHandler{
    private overallPlayerBoard: HTMLDivElement;
    private scoreCounter: Counter;
    private hand: HandHandler;
    
	constructor(private gameui: Game, public playerID: number, private playerName: string, public playerColor: string, public playerScore: number, public playerNo: number, public playerHandData: CardInHand[]) { //ekmek devam
		this.overallPlayerBoard = document.getElementById('overall_player_board_' + this.playerID) as HTMLDivElement;

        this.scoreCounter = new ebg.counter();
        this.scoreCounter.create(`player_score_${this.playerID}`, {
            value: this.playerScore, //ekmek degistir
            playerCounter: 'Points',
            playerId: this.playerID,
        });

        this.hand = new HandHandler(this.gameui, this, this.playerHandData); 
	}

    public updateScore(newScore: number): void { //ekmek kullan
        this.playerScore = newScore;
        this.scoreCounter.toValue(newScore);
    }

    public getPlayerName(): string { return this.playerName; }
    public getHand(): HandHandler { return this.hand; }
}