import { Game } from "./Game";
import { PlayerHandler } from "./PlayerHandler";

export class HandHandler{
    private handContainer: HTMLDivElement;
    private cardsContainer: HTMLDivElement;
    
    constructor(private gameui: Game, private owner: PlayerHandler, private handData: CardInHand[]) {
        // ensure hand container exists in DOM (vanilla JS)
        const parent = document.querySelector('#player-hands-container');
        if (parent) {
            this.handContainer = document.createElement('div');
            this.handContainer.className = 'my-hand-container'; //ekmek bu ismi degistir my-hand-container
            this.handContainer.setAttribute('data-owner-id', `${this.owner.playerID}`);
            this.handContainer.style.setProperty('--hand-owner-color', '#' + this.owner.playerColor);

            const handTitleText = _('{$playerName}\'s Reef').replace('{$playerName}', this.owner.getPlayerName());
            // inline HTML for brevity
            this.handContainer.innerHTML = `
                <div class="my-hand-title">${handTitleText}</div>
                <div class="cards-container"></div>
            `;

            parent.appendChild(this.handContainer);
        }

        this.cardsContainer = (this.handContainer && this.handContainer.querySelector('.cards-container')) as HTMLDivElement;

        // this.cardsContainer?.addEventListener('click', (event: Event) => { this.cardsContainerClicked(event); }); //ekmek devam?
        this.displayHand();
    }

    private displayHand(): void{
        this.cardsContainer.innerHTML = ''; // Clear existing cards

        for(let cardData of this.handData)
            this.insertCardToHand(cardData);

        // this.setHandCountAttrForMobileResizing(false); //ekmek devam
    }

    private insertCardToHand(cardData){ 
        let aCard = this.gameui.createCardDiv(cardData);
        aCard.setAttribute('data-state_in_hand', cardData.state_in_hand);

        aCard.style.zIndex = cardData.location_in_hand.toString();

        this.cardsContainer.appendChild(aCard);
    }

    public setHandTitle(title: string): void{
        const titleElement = this.handContainer.querySelector('.my-hand-title');
        if(titleElement)
            titleElement.textContent = title;
    }

    public getHandContainer(): HTMLDivElement{
        return this.handContainer;
    }
}