import { Game } from "./Game";
import { PlayerHandler } from "./PlayerHandler";

export class HandHandler{
    private handContainer: HTMLDivElement;
    private cardsContainer: HTMLDivElement;
    private isMyHand: boolean = false;

    constructor(private game: Game, private owner: PlayerHandler, private handData: CardInHand[]) {
        // ensure hand container exists in DOM (vanilla JS)
        const parent = document.querySelector('#player-hands-container');
        if (parent) {
            this.handContainer = document.createElement('div');
            this.handContainer.className = 'a-hand-container';
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

        this.setFacedownCountForMobileStretching();
    }

    private insertCardToHand(cardData){ 
        let aCard = this.game.createCardDiv(cardData);
        
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

        if(!this.game.bga.players.isCurrentPlayerActive())
            return;

        if(!['PlayerTurn'].includes(this.game.getGameStateName()))
            return;

        if(this.game.bga.gameui.isInterfaceLocked())
            return;

        if(!(event.target as HTMLElement).classList.contains('a-card'))
            return;
        
        if((event.target as HTMLDivElement).getAttribute('data-state-in-hand') !== 'facedown')
            return;

        this.handCardClicked(event.target as HTMLDivElement);  
    }

    private handCardClicked(cardDiv: HTMLDivElement){
        const selectedCardClass = 'selected-hand-card';
        const cardWasAlreadySelected: boolean = cardDiv.classList.contains(selectedCardClass);
        this.cardsContainer.querySelectorAll('div.a-card').forEach((card) => card.classList.remove(selectedCardClass));
        
        if(cardWasAlreadySelected){
            this.game.centerHandler.cardsUnselected();
            return;
        }

        cardDiv.classList.add(selectedCardClass);
        this.game.centerHandler.checkBothCardsSelected();
    }

    public setFacedownCountForMobileStretching(){
        if(!this.game.isMobile())
            return;

        const newFacedownCount = this.cardsContainer.querySelectorAll('.a-card[data-state-in-hand="facedown"]').length;
        const countInitialized: boolean = this.cardsContainer.hasAttribute('facedown-count-for-mobile-stretching');

        if(!countInitialized){ //page load
            this.cardsContainer.setAttribute('facedown-count-for-mobile-stretching', newFacedownCount.toString());
            return;
        }

        const lastTakenCard: HTMLDivElement = this.cardsContainer.querySelector('.last-taken-card');
        if(!lastTakenCard)
            return;
        const lastTaken_stateInHand: string = lastTakenCard.getAttribute('data-state-in-hand');
        lastTakenCard.setAttribute('data-state-in-hand', 'facedown');

        const cards: HTMLDivElement[] = Array.from(this.cardsContainer.querySelectorAll('div.a-card'));
        const initialMargins:{left: number, right: number}[] = [];
        for(let i = 0; i < cards.length; i++){
            const computed = getComputedStyle(cards[i]);
            initialMargins[i] = { left: parseFloat(computed.marginLeft), right: parseFloat(computed.marginRight) };
        };
        lastTakenCard.setAttribute('data-state-in-hand', lastTaken_stateInHand);

        this.cardsContainer.setAttribute('facedown-count-for-mobile-stretching', newFacedownCount.toString());
        const afterMargins:{left: number, right: number}[] = [];

        for(let i = 0; i < cards.length; i++){
            const computed = getComputedStyle(cards[i]);
            afterMargins[i] = { left: parseFloat(computed.marginLeft), right: parseFloat(computed.marginRight) };
        };

        for(let i = 0; i < cards.length; i++){
            cards[i].style.marginLeft = initialMargins[i].left.toString() + 'px';
            cards[i].style.marginRight = initialMargins[i].right.toString() + 'px';
        };

        const slidingTime = 300;
        for(let i = 0; i < cards.length; i++){
            setTimeout(() => {
                cards[i].style.transition = `margin ${slidingTime}ms ease`;
                cards[i].style.marginLeft = afterMargins[i].left.toString() + 'px';
                cards[i].style.marginRight = afterMargins[i].right.toString() + 'px';
                setTimeout(() => {
                    cards[i].style.marginLeft = null;
                    cards[i].style.marginRight = null;
                    cards[i].style.transition = null;
                }, slidingTime);
            }, 10);
        };
    }

    public setMyHand(isMyHand: boolean): void{
        this.isMyHand = isMyHand;
        this.handContainer.setAttribute('data-is-myself', isMyHand ? 'true' : 'false');
    }
    public getHandContainer(): HTMLDivElement{ return this.handContainer;}
}