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
    cardIcon.className = 'discarded-card-icon minimised-card-icon';
    cardIcon.setAttribute('data-rank', String(cardData.rank));

    const dummyCard = this.game.createCardDiv(cardData);
    cardIcon.appendChild(dummyCard);

    const existingIcons = Array.from(this.discardedCardIconsContainer.children).filter(child => child.classList.contains('discarded-card-icon')) as HTMLDivElement[];
    const nextHigherRankIcon = existingIcons.find(existingIcon => Number(existingIcon.getAttribute('data-rank')) > cardData.rank);

    if(nextHigherRankIcon)
      this.discardedCardIconsContainer.insertBefore(cardIcon, nextHigherRankIcon);
    else
      this.discardedCardIconsContainer.appendChild(cardIcon);
  }

  public hideDiscardedCardIconsContainer(){
    if(!this.game.isSoloMode())
      return;
    
    if(!this.discardedCardIconsContainer)
      return;

    this.discardedCardIconsContainer.style.transition = 'opacity 500ms ease';
    this.discardedCardIconsContainer.style.opacity = '0';
    setTimeout(() => { this.discardedCardIconsContainer.style.display = 'none'; }, 500)
  }
}