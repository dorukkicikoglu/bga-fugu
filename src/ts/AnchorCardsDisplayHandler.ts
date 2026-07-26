import { CardIconDisplayHandler } from "./CardIconDisplayHandler";

export class AnchorCardsDisplayHandler extends CardIconDisplayHandler{
  protected shouldDisplay(): boolean{ return !this.game.isSoloMode(); }
  protected getContainerId(): string{ return 'anchored-card-icons-container'; }
  protected getTitleClass(): string{ return 'anchored-cards-title'; }
  protected getTitleText(): string{ return _('Anchored Cards'); }
  protected getIconClass(): string{ return 'anchored-card-icon'; }
}
