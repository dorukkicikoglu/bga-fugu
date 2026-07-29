import { Game } from "./Game";
import { CardIconDisplayHandler } from "./CardIconDisplayHandler";
import { ModalBoxHandler } from "./ModalBoxHandler";

const HIDE_CONFIRMATION_BOX_DURATION_MS = 5000;
const PRE_SCROLL_DELAY_MS = 300;
const SCROLL_TO_TOP_DURATION_MS = 400;
const POST_SCROLL_DELAY_MS = 100;

export class AnchorCardsDisplayHandler extends CardIconDisplayHandler{
  private prefEnabled = false;
  private hideConfirmationBox: ModalBoxHandler | null = null;

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
    return {
      linkHTML: '<u>' + _('Hide') + '</u> &nbsp; <i class="fa6 fa-times-circle"></i>',
      onClick: () =>{
        this.game.prefHandler.disableAnchorPreference();
        this.game.bga.gameui.wait(PRE_SCROLL_DELAY_MS)
          .then(() => this.scrollToTop(SCROLL_TO_TOP_DURATION_MS))
          .then(() => this.game.bga.gameui.wait(POST_SCROLL_DELAY_MS))
          .then(() => this.showHideConfirmationBox());
      }
    };
  }

  private scrollToTop(durationMs: number): Promise<void>{
    return new Promise(resolve => {
      const startY = window.scrollY;
      if(startY === 0){
        resolve();
        return;
      }

      const startTime = performance.now();

      const step = (now: number) => {
        const progress = Math.min((now - startTime) / durationMs, 1);
        const eased = 1 - Math.pow(1 - progress, 2);
        window.scrollTo(0, startY * (1 - eased));

        if(progress < 1)
          requestAnimationFrame(step);
        else
          resolve();
      };

      requestAnimationFrame(step);
    });
  }

  private showHideConfirmationBox(){
    this.hideConfirmationBox?.destroy();
    this.hideConfirmationBox = null;

    const menuWheel = document.querySelector('#ingame_menu_wheel') as HTMLElement;
    if(!menuWheel)
      return;

    const contentHTML = `${_('You can display Anchored Cards again from this menu')}<br><span class="modal-box-undo-link">${_('Undo')}</span>`;

    this.hideConfirmationBox = new ModalBoxHandler(this.game, menuWheel, contentHTML, true, true, true, HIDE_CONFIRMATION_BOX_DURATION_MS, () => {
      this.hideConfirmationBox = null;
    });

    this.hideConfirmationBox.getElement().querySelector('.modal-box-undo-link').addEventListener('click', () => {
      this.game.prefHandler.enableAnchorPreference();
      this.hideConfirmationBox?.destroy();
      this.hideConfirmationBox = null;
    });
  }
}
