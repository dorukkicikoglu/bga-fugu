import { Game } from "./Game";

export class SoloDiscardDisplayHandler{
  private discardedCardIconsContainer: HTMLDivElement;

  constructor(private game: Game, private discardedCards: CardInDiscard[]) {
    this.createDiscardedCardIconsContainer();
	}

	private createDiscardedCardIconsContainer(){
    if(!this.game.isSoloMode())
      return;

    const playerHandsContainer = document.querySelector('#player-hands-container');
    if(!playerHandsContainer)
      return;

    this.discardedCardIconsContainer = document.createElement('div');
    this.discardedCardIconsContainer.id = 'discarded-card-icons-container';
    this.discardedCardIconsContainer.innerHTML = `<div class="container-title discarded-cards-title">${_('Discarded Cards')}</div>`;

    playerHandsContainer.appendChild(this.discardedCardIconsContainer);

    for(const cardData of this.discardedCards)
      this.insertDiscardedCardIcon(cardData);
  }

  public insertDiscardedCardIcon(cardData: CardInDiscard){
    if(!this.game.isSoloMode())
      return;

    const cardIcon = document.createElement('div');
    cardIcon.className = 'discarded-card-icon';

    const dummyCard = this.game.createCardDiv(cardData);
    cardIcon.appendChild(dummyCard);

    this.discardedCardIconsContainer.appendChild(cardIcon);
  }

  public hideDiscardedCardIconsContainer(){ 
    this.discardedCardIconsContainer.style.transition = 'opacity 500ms ease';
    this.discardedCardIconsContainer.style.opacity = '0';
    setTimeout(() => { this.discardedCardIconsContainer.style.display = 'none'; }, 500)
  }
}