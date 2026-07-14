import { Game } from "./Game";
import { PlayerHandler } from "./PlayerHandler";

export class HandHandler{
    private handContainer: HTMLDivElement;
    private cardsContainer: HTMLDivElement;
    private isMyHand: boolean = false;

    constructor(private gameui: Game, private owner: PlayerHandler, private handData: CardInHand[]) {
        // ensure hand container exists in DOM (vanilla JS)
        const parent = document.querySelector('#player-hands-container');
        if (parent) {
            this.handContainer = document.createElement('div');
            this.handContainer.className = 'my-hand-container'; //ekmek bu ismi degistir my-hand-container
            this.handContainer.setAttribute('data-owner-id', `${this.owner.getPlayerID()}`);
            this.handContainer.style.setProperty('--hand-owner-color', '#' + this.owner.getPlayerColor());

            const handTitleText = _('{$playerName}\'s Reef').replace('{$playerName}', this.owner.getPlayerName());
            // inline HTML for brevity
            this.handContainer.innerHTML = `
                <div class="my-hand-title">${handTitleText}</div>
                <div class="cards-container"></div>
            `;

            parent.appendChild(this.handContainer);
        }

        this.cardsContainer = (this.handContainer && this.handContainer.querySelector('.cards-container')) as HTMLDivElement;
        this.cardsContainer.addEventListener('click', (event: Event) => { this.cardsContainerClicked(event); });

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
        
        aCard.setAttribute('data-state-in-hand', cardData.state_in_hand);
        aCard.setAttribute('data-location-in-hand', cardData.location_in_hand);

        aCard.style.zIndex = cardData.location_in_hand.toString();

        this.cardsContainer.appendChild(aCard);
    }

    public setHandTitle(title: string): void{
        const titleElement = this.handContainer.querySelector('.my-hand-title');
        if(titleElement)
            titleElement.textContent = title;
    }

    private cardsContainerClicked(event: Event){
        if(!this.isMyHand)
            return;

        if(!this.gameui.bga.players.isCurrentPlayerActive())
            return;

        if(!['PlayerTurn'].includes(this.gameui.getGameStateName()))
            return;

        if(!(event.target as HTMLElement).classList.contains('a-card'))
            return;
        
        if((event.target as HTMLDivElement).getAttribute('data-state-in-hand') !== 'facedown')
            return;

        this.handCardClicked(event.target as HTMLDivElement);  
    }

    private handCardClicked(cardDiv: HTMLDivElement){
        let cardID = cardDiv.getAttribute('data-card-id'); //ekmek gerekli mi?
        const selectedCardClass = 'selected-hand-card';
        const cardWasAlreadySelected: boolean = cardDiv.classList.contains(selectedCardClass);
        this.cardsContainer.querySelectorAll('div.a-card').forEach((card) => card.classList.remove(selectedCardClass));
        
        if(cardWasAlreadySelected){
            this.gameui.centerHandler.cardsUnselected();
            return;
        }

        cardDiv.classList.add(selectedCardClass);
        this.gameui.centerHandler.checkBothCardsSelected();
    }

    public setMyHand(isMyHand: boolean): void{
        this.isMyHand = isMyHand;
        this.handContainer.setAttribute('data-is-myself', isMyHand ? 'true' : 'false');
    }
    public getHandContainer(): HTMLDivElement{ return this.handContainer;}
}