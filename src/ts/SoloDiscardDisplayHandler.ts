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
    this.updateContainerOpacity();

    for(const cardData of this.discardedCards)
      this.insertDiscardedCardIcon(cardData);
  }

  private updateContainerOpacity(){
    const hasCards = !!this.discardedCardIconsContainer.querySelector('.a-card');
    this.showDiscardedCardIconsContainer(hasCards);
  }

  public insertDiscardedCardIcon(cardData: CardInDiscard){
    if(!this.game.isSoloMode())
      return;

    const existingIcons = Array.from(this.discardedCardIconsContainer.children).filter(child => child.classList.contains('discarded-card-icon')) as HTMLDivElement[];

    //FLIP: record where the existing icons are before the new one shifts the centered row, so they can
    //slide into their new spot instead of jumping there
    const previousLefts = new Map<HTMLDivElement, number>(existingIcons.map(icon => [icon, icon.getBoundingClientRect().left]));

    const cardIcon = document.createElement('div');
    cardIcon.className = 'discarded-card-icon minimised-card-icon';
    cardIcon.setAttribute('data-rank', String(cardData.rank));
    cardIcon.style.opacity = '0';

    const dummyCard = this.game.createCardDiv(cardData);
    cardIcon.appendChild(dummyCard);

    const nextHigherRankIcon = existingIcons.find(existingIcon => Number(existingIcon.getAttribute('data-rank')) > cardData.rank);

    if(nextHigherRankIcon)
      this.discardedCardIconsContainer.insertBefore(cardIcon, nextHigherRankIcon);
    else
      this.discardedCardIconsContainer.appendChild(cardIcon);

    this.updateContainerOpacity();

    for(const icon of existingIcons){
      const deltaX = previousLefts.get(icon)! - icon.getBoundingClientRect().left;
      icon.style.transition = 'none';
      icon.style.transform = deltaX ? `translateX(${deltaX}px)` : '';
    }

    requestAnimationFrame(() => requestAnimationFrame(() => {
      for(const icon of existingIcons){
        icon.style.transition = 'transform 300ms ease';
        icon.style.transform = '';
      }
      cardIcon.style.transition = 'opacity 300ms ease';
      cardIcon.style.opacity = '1';
    }));
  }

  public showDiscardedCardIconsContainer(show: boolean){
    if(!this.game.isSoloMode())
      return;
    
    if(!this.discardedCardIconsContainer)
      return;

    this.discardedCardIconsContainer.style.opacity = show ? '1' : null;
  }
}