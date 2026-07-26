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
        this.bga.dialogs.confirmation(_("Pass and END YOUR GAME?")).then(result => {
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

        const warningHTML = _("Starting with {$centerCardRank} there looks hard, since the highest card is {$highestCardInDeck}")
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
        const isFirstTurn = handContainer.querySelectorAll('.a-card:not([data-state-in-hand="facedown"])').length === 0;

        if(!isFirstTurn)
            return false;

        const cardsInHand = handContainer.querySelectorAll('.a-card');
        const numberOfCardsInHand = cardsInHand.length;
        const deckLength = this.bga.gameui.gamedatas.deckLength;

        if(cardRank < handLocation) //each card lower than this card would have a space on the left
            return true;
        if(deckLength - cardRank < numberOfCardsInHand - handLocation) //each card lower than this card would have a space on the left
            return true;
        // if(cardRank == 1 && handLocation > 1) //place 1 to beginning
        //     return true;
        // if(cardRank == this.bga.gameui.gamedatas.deckLength && handLocation < numberOfCardsInHand) //place highest card to the end
        //     return true; //ekmek sil

        const shouldBePlacedAt = Math.ceil((cardRank / deckLength) * numberOfCardsInHand);
        const offset = Math.abs(shouldBePlacedAt - handLocation);

        const rankDistanceToEdge = Math.min(shouldBePlacedAt - 1, numberOfCardsInHand - shouldBePlacedAt);
        console.log('---------');
        console.log('rankDistanceToEdge', rankDistanceToEdge);
        console.log('shouldBePlacedAt', shouldBePlacedAt);
        console.log('offset', offset);
        const maxDistance = (rankDistanceToEdge <= 3) ? 2 : 3;
        console.log('maxDistance', maxDistance);

        return offset > maxDistance;
    }
    
    public getSwapButton(): HTMLButtonElement{ return this.swapButton };
}
