import { Game } from "./Game";
import { CardIconDisplayHandler } from "./CardIconDisplayHandler";

export class AnchorCardsDisplayHandler extends CardIconDisplayHandler{
  private prefEnabled = false;

  constructor(game: Game, initialCards: CardInDiscard[]){
    super(game, initialCards);
    this.refreshDisplay();
  }

  public setPrefEnabled(enabled: boolean){
    this.prefEnabled = enabled;
    this.refreshDisplay();
  }

  protected shouldDisplay(): boolean{ return !this.game.isSoloMode() && this.prefEnabled; }
  protected getContainerId(): string{ return 'anchored-card-icons-container'; }
  protected getTitleClass(): string{ return 'anchored-cards-title'; }
  protected getTitleText(): string{ return _('Anchored Cards'); }
  protected getIconClass(): string{ return 'anchored-card-icon'; }

  protected getHideLink(){
    return { linkHTML: '<u>' + _('Hide') + '</u> &nbsp; <i class="fa6 fa-times-circle"></i>', onClick: () => this.game.bga.userPreferences.set(102, 0) };
  }
}
