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

        this.gameui.playerTurn.getSwapButton().style.display = null;
    }

    public cardsUnselected(){
        this.gameui.playerTurn.getSwapButton().style.display = 'none';
    }

    public getCenterContainer(): HTMLDivElement{ return this.centerContainer; }
}
    