import { Game } from "../Game";
import { ModalBoxHandler } from "../ModalBoxHandler";

/**
 * We create one State class per declared state on the PHP side, to handle all state specific code here.
 * onEnteringState, onLeavingState and onPlayerActivationChange are predefined names that will be called by the framework.
 * When executing code in this state, you can access the args using this.args
 */
export class PlayerTurn {
    private static readonly BAD_HALF_LOADING_BAR_MS = 5000;

    private swapButton: HTMLButtonElement;
    private badHalfWarningBox: ModalBoxHandler | null = null;

    constructor(private game: Game, private bga: Bga<FuguPlayer, FuguGamedatas>) {
    }

    /**
     * This method is called each time we are entering the game state. You can use this method to perform some user interface changes at this moment.
     */
    onEnteringState(args: PlayerTurnArgs, isCurrentPlayerActive: boolean) {
        this.bga.statusBar.setTitle(isCurrentPlayerActive ? 
            (this.game.isDesktop() ? _('${you} must swap 2 cards or pass') :  _('${you} must swap or pass')) :
            _('${actplayer} must play a card or pass')
        );

        if (isCurrentPlayerActive) {
            this.swapButton = this.bga.statusBar.addActionButton(_(''), () => this.swapClicked(), {id: 'swap-button'});
            this.swapButton.style.display = 'none';
            
            this.bga.statusBar.addActionButton(_('Pass'), () => this.passClicked(), { color: 'secondary' }); 
        }
    }

    /**
     * This method is called each time we are leaving the game state. You can use this method to perform some user interface changes at this moment.
     */
    onLeavingState(args: PlayerTurnArgs, isCurrentPlayerActive: boolean) {
        document.querySelectorAll('.a-card.selected-center-card').forEach(card => card.classList.remove('selected-center-card'));
        document.querySelectorAll('.a-card.selected-hand-card').forEach(card => card.classList.remove('selected-hand-card'));
        this.clearBadHalfWarning();
    }

    /**
     * This method is called each time the current player becomes active or inactive in a MULTIPLE_ACTIVE_PLAYER state. You can use this method to perform some user interface changes at this moment.
     * on MULTIPLE_ACTIVE_PLAYER states, you may want to call this function in onEnteringState using `this.onPlayerActivationChange(args, isCurrentPlayerActive)` at the end of onEnteringState.
     * If your state is not a MULTIPLE_ACTIVE_PLAYER one, you can delete this function.
     */
    onPlayerActivationChange(args: PlayerTurnArgs, isCurrentPlayerActive: boolean) {
    }

    passClicked() {
        this.bga.dialogs.confirmation(_("Pass and end your game?")).then(result => {
            if(result){ 
                this.bga.actions.performAction("actPass");
            }
        });
    }

    swapClicked() {
        if(!this.game.myself)
            return;
        
        this.clearBadHalfWarning();

        const centerCardDiv = this.game.centerHandler.getCenterContainer().querySelector('.selected-center-card');
        const handCardDiv = this.game.myself.getHand().getHandContainer().querySelector('.selected-hand-card');

        if(!centerCardDiv || !handCardDiv)
            return;

        const centerCardID = centerCardDiv.getAttribute('data-card-id');
        const handCardLocation = parseInt(handCardDiv.getAttribute('data-location-in-hand'));

        this.bga.actions.performAction("actSwapCards", {
            centerCardID: centerCardID,
            handCardLocation: handCardLocation
        });
    }

    public updateBadHalfWarning(cardRank: number, handCardLocation: number, lastClickedCardDiv: HTMLDivElement): void {
        this.clearBadHalfWarning();

        if(!this.isPlayingFirstTurnOnBadHalf(cardRank, handCardLocation)){
            this.swapButton.disabled = false;
            return;
        }

        const warningHTML = _("Starting with {$centerCardRank} on that half looks hard, since the highest card is {$highestCardInDeck}")
            .replace('{$centerCardRank}', `<b>${cardRank.toString()}</b>`)
            .replace('{$highestCardInDeck}', `<b>${this.game.getDeckLength().toString()}</b>`);

        this.swapButton.disabled = true;

        this.badHalfWarningBox = new ModalBoxHandler(this.game, lastClickedCardDiv, warningHTML, true, PlayerTurn.BAD_HALF_LOADING_BAR_MS, () => {
            this.swapButton.disabled = false;
        });
    }

    public clearBadHalfWarning(): void {
        if(this.badHalfWarningBox){
            this.badHalfWarningBox.destroy();
            this.badHalfWarningBox = null;
        }
    }

    private isPlayingFirstTurnOnBadHalf(cardRank: number, handLocation: number): boolean{
        const handContainer = this.game.myself.getHand().getHandContainer();
        const cardsInHand = handContainer.querySelectorAll('.a-card');
        const numberOfCardsInPlayerHand = cardsInHand.length;

        const isFirstTurn = handContainer.querySelectorAll('.a-card:not([data-state-in-hand="facedown"])').length === 0;

        if(!isFirstTurn)
            return false;

        const isCardHigh: boolean = cardRank > (this.bga.gameui.gamedatas.deckLength / 2);
        const isLocationHigh: boolean = handLocation >= (numberOfCardsInPlayerHand / 2);

        if(isCardHigh === isLocationHigh)
            return false;

        return true;
    }
    
    public getSwapButton(): HTMLButtonElement{ return this.swapButton };
}
