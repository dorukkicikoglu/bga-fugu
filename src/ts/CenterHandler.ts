import { Game } from "./Game";

export class CenterHandler{
    private centerContainer: HTMLDivElement;
    private lastKnownPlaceability: { [card_id: number]: boolean } = {};

    constructor(private game: Game, private centerCardsData: CardInCenter[]) {
        this.centerContainer = document.querySelector('#center-container');

        for(let cardData of this.centerCardsData)
            this.centerContainer.appendChild(this.createCardContainer(cardData));

        this.centerContainer.addEventListener('click', (event: Event) => { this.centerContainerClicked(event); });
    }

    //wraps each center a-card in a persistent, non-clipping container (a-card itself has overflow:hidden for
    //its sprite background, which would otherwise clip the unplaceable-icon poking out past the card's edge).
    //the icon element is created once here and kept around for the container's lifetime; updatePlaceability
    //only toggles a class on it, so this wrapper must survive card swaps/replacements untouched (see those
    //methods: they only ever replace/mutate the inner .a-card node, never this container).
    private createCardContainer(cardData: CardInCenter): HTMLDivElement {
        const container = document.createElement('div');
        container.className = 'center-card-container';
        container.appendChild(this.game.createCardDiv(cardData));

        const icon = document.createElement('i');
        icon.className = 'unplaceable-icon fa6 fa-anchor';
        container.appendChild(icon);

        return container;
    }

    private centerContainerClicked(event: Event){
        if(!this.game.bga.players.isCurrentPlayerActive())
            return;

        if(!['PlayerTurn'].includes(this.game.getGameStateName()))
            return;

        if(this.game.bga.gameui.isInterfaceLocked())
            return;

        if(!(event.target as HTMLElement).classList.contains('a-card'))
            return;
        
        this.centerCardClicked(event.target as HTMLDivElement);  
    }

    private centerCardClicked(cardDiv: HTMLDivElement){
        const selectedCardClass = 'selected-center-card';
        const cardWasAlreadySelected: boolean = cardDiv.classList.contains(selectedCardClass);
        this.centerContainer.querySelectorAll('div.a-card').forEach((card) => card.classList.remove(selectedCardClass));

        if(cardWasAlreadySelected){
            this.cardsUnselected();
            return;
        }

        cardDiv.classList.add(selectedCardClass);
        this.game.centerHandler.checkBothCardsSelected(cardDiv);
    }

    public checkBothCardsSelected(lastClickedCardDiv: HTMLDivElement): void{
        if(!this.game.myself)
            return;

        const selectedCenterCard = this.centerContainer.querySelector('.selected-center-card');

        const myHandContainer = this.game.myself.getHand().getHandContainer();
        const selectedHandCard = myHandContainer.querySelector('.selected-hand-card');

        if(!selectedCenterCard || !selectedHandCard){
            this.cardsUnselected();
            return;
        }

        const cardRank = Number(selectedCenterCard.getAttribute('data-rank'));
        const handCardLocation = Number(selectedHandCard.getAttribute('data-location-in-hand'));
        const wouldBeAnchor = this.wouldBeAnchorCard(myHandContainer, handCardLocation, cardRank);

        const swapButton = this.game.playerTurn.getSwapButton();
        if(wouldBeAnchor){
            swapButton.innerHTML = '<i class="fa6 fa-anchor"></i> ' + (this.game.isDesktop() ? _('Swap as Anchor') : _('Anchor')) + ' <i class="fa6 fa-anchor"></i>';
            swapButton.classList.remove('bgabutton_blue');
            swapButton.classList.add('purple-button');
        } else {
            swapButton.innerHTML = this.game.isDesktop() ? _('Swap Selected Cards') : _('Swap Cards');
            swapButton.classList.remove('purple-button');
            swapButton.classList.add('bgabutton_blue');
        }
        
        swapButton.style.display = null;

        this.game.playerTurn.updateBadHalfWarning(cardRank, handCardLocation, lastClickedCardDiv);
    }

    private wouldBeAnchorCard(handContainer: HTMLDivElement, cardLocation: number, cardRank: number): boolean{
        const cardsInHand = handContainer.querySelectorAll('[data-state-in-hand="number"]');

        for(let i = 0; i < cardsInHand.length; i++){
            const nextCard = cardsInHand[i];
            const nextLocation = Number(nextCard.getAttribute('data-location-in-hand'));
            const nextRank = Number(nextCard.getAttribute('data-rank'));
   
            if(nextLocation < cardLocation && nextRank > cardRank)
                return true;

            if(nextLocation > cardLocation && nextRank < cardRank)
                return true;
        }

        return false;
    }

    public cardsUnselected(){
        this.game.playerTurn.getSwapButton().style.display = 'none';
        this.game.playerTurn.clearBadHalfWarning();
    }

    public async animateCardReplace(discardedCardData: CardInCenter, newCenterCardData: CardInCenter){
        const oldCenterCard: HTMLDivElement = this.centerContainer.querySelector(`[data-card-id="${discardedCardData.card_id}"]`) as HTMLDivElement;
        this.fadeOutIcon(oldCenterCard); //the discarded card is about to fly away; its icon shouldn't linger over the empty slot mid-animation

        const oldCenterCardClone = this.game.cloneCard(oldCenterCard);

        const newCenterCardClone : HTMLDivElement = this.game.cloneCard(this.game.createCardDiv(newCenterCardData));

        oldCenterCard.insertAdjacentElement('afterend', oldCenterCardClone);
        oldCenterCard.insertAdjacentElement('afterend', newCenterCardClone);

        this.game.placeOnObject(oldCenterCardClone, oldCenterCard);
        this.game.placeOnObject(newCenterCardClone, oldCenterCard);
        
        const newCenterCardOriginalTop = newCenterCardClone.style.top;
        const newCenterCardOriginalLeft = newCenterCardClone.style.left;
        newCenterCardClone.style.top = 'calc(var(--card-width) * -3)';
        newCenterCardClone.style.left = `calc(var(--card-width) * ` + (-1 * (3 + Math.random() * 2)) + ` + ${parseFloat(oldCenterCardClone.style.left || '0')}px)`;
        oldCenterCard.style.opacity = '0';

        const pullUpAnimTime = 200;
        oldCenterCardClone.style.transition = `top ${pullUpAnimTime}ms ease`;
        oldCenterCardClone.style.top = `${parseFloat(oldCenterCardClone.style.top || '0') - 20}px`;

        await this.game.bga.gameui.wait(pullUpAnimTime + 50);

        const flyAwayAnimTime = 400;
        oldCenterCardClone.style.transition = `top ${flyAwayAnimTime}ms ease-out, left ${flyAwayAnimTime}ms ease-out`;

        oldCenterCardClone.style.top = 'calc(var(--card-width) * -3)';
        oldCenterCardClone.style.left = `calc(var(--card-width) * ` + (3 + Math.random() * 2) + ` + ${parseFloat(oldCenterCardClone.style.left || '0')}px)`;
        const flyInAnimTime = 400;
        newCenterCardClone.style.transition = `top ${flyInAnimTime}ms ease-in, left ${flyInAnimTime}ms ease-in`;
        newCenterCardClone.style.top = newCenterCardOriginalTop;
        newCenterCardClone.style.left = newCenterCardOriginalLeft;

        await this.game.bga.gameui.wait(Math.max(flyAwayAnimTime, flyInAnimTime));

        oldCenterCard.setAttribute('data-card-id', newCenterCardData.card_id.toString());
        oldCenterCard.setAttribute('data-rank', newCenterCardData.card_id.toString());
        oldCenterCard.setAttribute('data-suit', newCenterCardData.suit.toString());
        oldCenterCard.style.opacity = null;

        newCenterCardClone.remove();
        oldCenterCardClone.remove();

        this.refreshIcon(oldCenterCard.parentElement as HTMLDivElement); //the replacement card has landed; show its icon if it needs one

        if(this.game.isSoloMode())
            this.game.soloDiscardDisplayHandler.insertCardIcon(discardedCardData);
    }

    //immediately hides a leaving card's icon, ahead of/independent from the next centerCardsPlaceability update,
    //so it doesn't linger fading over a card that's mid-flight out of its slot
    public fadeOutIcon(cardDiv: HTMLDivElement): void{
        cardDiv.parentElement?.classList.remove('anchor-visible');
    }

    //re-applies the last known placeability to a single container's icon (eg. once a new card has finished
    //landing in it), using whatever centerCardsPlaceability was most recently received
    public refreshIcon(container: HTMLDivElement): void{
        const cardDiv = container?.querySelector('.a-card') as HTMLDivElement;
        if(!cardDiv)
            return;

        const cardId = Number(cardDiv.getAttribute('data-card-id'));
        container.classList.toggle('anchor-visible', this.lastKnownPlaceability[cardId] === false);
    }

    public updatePlaceability(centerCardsPlaceability: { [card_id: number]: boolean }): void{
        this.lastKnownPlaceability = centerCardsPlaceability;
        this.centerContainer.querySelectorAll('.center-card-container').forEach((container: HTMLDivElement) => this.refreshIcon(container));
    }

    public getCenterContainer(): HTMLDivElement{ return this.centerContainer; }
}
    