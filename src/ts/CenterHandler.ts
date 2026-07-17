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

        // let lowerCard: {location: number, rank: number} = null; //ekmek sil
        // let higherCard: {location: number, rank: number} = null;

        // handContainer.querySelectorAll('[data-state-in-hand="number"]').forEach((card) => {
        //     const location = Number(card.getAttribute('data-location-in-hand'));
        //     const rank = Number(card.getAttribute('data-rank'));

        //     if(location < cardLocation && (!lowerCard || location > lowerCard.location))
        //         lowerCard = { location, rank };

        //     if(location > cardLocation && (!higherCard || location < higherCard.location))
        //         higherCard = { location, rank };
        // });

        // if(lowerCard && lowerCard.rank > cardRank)
        //     return true;

        // if(higherCard && higherCard.rank < cardRank)
        //     return true;

        // return false;
    }

    public cardsUnselected(){
        this.gameui.playerTurn.getSwapButton().style.display = 'none';
    }

    public getCenterContainer(): HTMLDivElement{ return this.centerContainer; }
}
    