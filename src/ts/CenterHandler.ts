import { Game } from "./Game";

export class CenterHandler{
    private centerContainer: HTMLDivElement;

    constructor(private gameui: Game, private centerCardsData: CardInCenter[]) {
        this.centerContainer = document.querySelector('#center-container');

        for(let cardData of this.centerCardsData)
            this.centerContainer.appendChild(this.gameui.createCardDiv(cardData));
    }
}
    