import { Game } from "./Game";

export class CenterHandler{
    private centerContainer: HTMLDivElement;

    constructor(private gameui: Game, private centerCardsData: CardInCenter[]) {
        this.centerContainer = document.querySelector('#center-container');

        for(let cardData of this.centerCardsData)
            this.centerContainer.appendChild(this.gameui.createCardDiv(cardData));

        this.centerContainer.addEventListener('click', (event: Event) => { this.centerContainerClicked(event); });
    }

    private centerContainerClicked(event: Event){
        if(!this.gameui.bga.players.isCurrentPlayerActive())
            return;

        if(!['PlayerTurn'].includes(this.gameui.getGameStateName()))
            return;

        if(this.gameui.bga.gameui.isInterfaceLocked())
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
        this.gameui.centerHandler.checkBothCardsSelected();
    }

    public checkBothCardsSelected(): void{
        if(!this.gameui.myself)
            return;

        const selectedCenterCard = this.centerContainer.querySelector('.selected-center-card');
        
        const myHandContainer = this.gameui.myself.getHand().getHandContainer();
        const selectedHandCard = myHandContainer.querySelector('.selected-hand-card');
        
        if(!selectedCenterCard || !selectedHandCard){
            this.cardsUnselected();
            return;
        }

        const cardRank = Number(selectedCenterCard.getAttribute('data-rank'));
        const handCardLocation = Number(selectedHandCard.getAttribute('data-location-in-hand'));
        const wouldBeAnchor = this.wouldBeAnchorCard(myHandContainer, handCardLocation, cardRank);

        const swapButton = this.gameui.playerTurn.getSwapButton();
        if(wouldBeAnchor){
            swapButton.innerHTML = '<i class="fa6 fa-anchor"></i> ' + _('Swap as Anchor') + ' <i class="fa6 fa-anchor"></i>';
            swapButton.classList.remove('bgabutton_blue');
            swapButton.classList.add('orange-button');
        } else {
            swapButton.innerHTML = _('Swap Selected Cards');
            swapButton.classList.remove('orange-button');
            swapButton.classList.add('bgabutton_blue');
        }
        
        swapButton.style.display = null;
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
        this.gameui.playerTurn.getSwapButton().style.display = 'none';
    }

    public async animateCardReplace(discardedCardData: CardInCenter, newCenterCardData: CardInCenter){
        const oldCenterCard: HTMLDivElement = this.centerContainer.querySelector(`[data-card-id="${discardedCardData.card_id}"]`) as HTMLDivElement;
        const oldCenterCardClone = this.gameui.cloneCard(oldCenterCard);

        const newCenterCard : HTMLDivElement = this.gameui.createCardDiv(newCenterCardData);
        const newCenterCardClone = this.gameui.cloneCard(newCenterCard);

        oldCenterCard.insertAdjacentElement('afterend', oldCenterCardClone);
        oldCenterCard.insertAdjacentElement('afterend', newCenterCardClone);

        this.gameui.placeOnObject(oldCenterCardClone, oldCenterCard);
        this.gameui.placeOnObject(newCenterCardClone, oldCenterCard);
        
        const newCenterCardOriginalTop = newCenterCardClone.style.top;
        const newCenterCardOriginalLeft = newCenterCardClone.style.left;
        newCenterCardClone.style.left = 'calc(var(--card-width) * -2)';
        newCenterCardClone.style.top = (parseInt(newCenterCardOriginalTop) - 160) + 'px';
        oldCenterCard.style.opacity = '0';

        const flyAwayAnimTime = 400;
        oldCenterCardClone.style.transition = `top ${flyAwayAnimTime}ms ease-out, left ${flyAwayAnimTime}ms ease-out`;

        oldCenterCardClone.style.top = 'calc(var(--card-width) * -3)';
        oldCenterCardClone.style.left = `calc(var(--card-width) * ` + (3 + Math.random() * 2) + ` + ${parseFloat(oldCenterCardClone.style.left || '0')}px)`;
        const flyInAnimTime = 400;
        newCenterCardClone.style.transition = `top ${flyInAnimTime}ms ease-in, left ${flyInAnimTime}ms ease-in`;
        newCenterCardClone.style.top = newCenterCardOriginalTop;
        newCenterCardClone.style.left = newCenterCardOriginalLeft;

        await this.gameui.bga.gameui.wait(Math.max(flyAwayAnimTime, flyInAnimTime));

        oldCenterCard.setAttribute('data-rank', newCenterCardData.card_id.toString());
        oldCenterCard.setAttribute('data-card-id', newCenterCardData.card_id.toString());
        oldCenterCard.style.opacity = null;

        newCenterCardClone.remove();
        oldCenterCardClone.remove();
    }

    public getCenterContainer(): HTMLDivElement{ return this.centerContainer; }
}
    