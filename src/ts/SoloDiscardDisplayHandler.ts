import { Game } from "./Game";
import { CardIconDisplayHandler } from "./CardIconDisplayHandler";

export class SoloDiscardDisplayHandler extends CardIconDisplayHandler{
  constructor(game: Game, initialCards: CardInDiscard[]){
    super(game, initialCards);
    this.refreshDisplay();
  }

  protected shouldDisplay(): boolean{ return this.game.isSoloMode(); }
  protected getContainerId(): string{ return 'discarded-card-icons-container'; }
  protected getTitleClass(): string{ return 'discarded-cards-title'; }
  protected getTitleText(): string{ return _('Discarded Cards'); }
  protected getIconClass(): string{ return 'discarded-card-icon'; }
}
