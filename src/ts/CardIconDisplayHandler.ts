import { Game } from "./Game";

export abstract class CardIconDisplayHandler{
  protected iconsContainer: HTMLDivElement;

  constructor(protected game: Game, private initialCards: CardInDiscard[]) {
    this.createIconsContainer();
	}

  protected abstract shouldDisplay(): boolean;
  protected abstract getContainerId(): string;
  protected abstract getTitleClass(): string;
  protected abstract getTitleText(): string;
  protected abstract getIconClass(): string;

	private createIconsContainer(){
    if(!this.shouldDisplay())
      return;

    const playerHandsContainer = document.querySelector('#player-hands-container');
    if(!playerHandsContainer)
      return;

    this.iconsContainer = document.createElement('div');
    this.iconsContainer.id = this.getContainerId();
    this.iconsContainer.classList.add('card-icons-display');
    this.iconsContainer.innerHTML = `<div class="container-title ${this.getTitleClass()}">${this.getTitleText()}</div>`;

    playerHandsContainer.appendChild(this.iconsContainer);
    this.updateContainerOpacity();

    for(const cardData of this.initialCards)
      this.insertCardIcon(cardData);
  }

  private updateContainerOpacity(){
    const hasCards = !!this.iconsContainer.querySelector('.a-card');
    this.showCardIconsContainer(hasCards);
  }

  public insertCardIcon(cardData: CardInDiscard){
    if(!this.shouldDisplay())
      return;

    const iconClass = this.getIconClass();
    const existingIcons = Array.from(this.iconsContainer.children).filter(child => child.classList.contains(iconClass)) as HTMLDivElement[];

    //FLIP: record where the existing icons are before the new one shifts the centered row, so they can
    //slide into their new spot instead of jumping there
    const previousLefts = new Map<HTMLDivElement, number>(existingIcons.map(icon => [icon, icon.getBoundingClientRect().left]));

    const cardIcon = document.createElement('div');
    cardIcon.className = `${iconClass} minimised-card-icon`;
    cardIcon.setAttribute('data-rank', String(cardData.rank));
    cardIcon.style.opacity = '0';

    const dummyCard = this.game.createCardDiv(cardData);
    cardIcon.appendChild(dummyCard);

    const nextHigherRankIcon = existingIcons.find(existingIcon => Number(existingIcon.getAttribute('data-rank')) > cardData.rank);

    if(nextHigherRankIcon)
      this.iconsContainer.insertBefore(cardIcon, nextHigherRankIcon);
    else
      this.iconsContainer.appendChild(cardIcon);

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

  public showCardIconsContainer(show: boolean){
    if(!this.shouldDisplay())
      return;

    if(!this.iconsContainer)
      return;

    this.iconsContainer.style.opacity = show ? '1' : null;
  }
}
