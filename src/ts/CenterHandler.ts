import { Game } from "./Game";

export class CenterHandler{
    private centerContainer: HTMLDivElement;

    constructor(private game: Game, private centerCardsData: CardInCenter[]) {
        this.centerContainer = document.querySelector('#center-container');

        for(let cardData of this.centerCardsData)
            this.centerContainer.appendChild(this.game.createCardDiv(cardData));

        this.centerContainer.addEventListener('click', (event: Event) => { this.centerContainerClicked(event); });
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

        if(this.game.isSoloMode())
            this.game.soloDiscardDisplayHandler.insertDiscardedCardIcon(discardedCardData);
    }

    public getCenterContainer(): HTMLDivElement{ return this.centerContainer; }
}
    