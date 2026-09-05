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
    private swapAnchorButton: HTMLButtonElement;
    private badHalfWarningBox: ModalBoxHandler | null = null;

    constructor(private game: Game, private bga: Bga<FuguPlayer, FuguGamedatas>) {
    }

    /**
     * This method is called each time we are entering the game state. You can use this method to perform some user interface changes at this moment.
     */
    onEnteringState(args: PlayerTurnArgs, isCurrentPlayerActive: boolean) {
        this.game.centerHandler.updatePlaceability(args.centerCardsPlaceability);

        if (isCurrentPlayerActive) {
            //reserve a slot for the pass button inside the title itself; setTitle's args are substituted as raw HTML
            //(same mechanism used for ${you}/${actplayer}), so an empty span placeholder can be targeted right after
            this.bga.statusBar.setTitle(
                this.game.isDesktop() ? _('${you} must swap 2 cards or ${passButton}') : _('${you} must swap or ${passButton}'),
                { passButton: '<span id="pass-button-slot"></span>' }
            );

            //two separate, fixed-appearance buttons: normal number placement (only legal when it wouldn't break
            //ascending order there) and anchor placement (always legal). CenterHandler.checkBothCardsSelected shows
            //whichever are applicable for the current selection - neither button ever changes label/color itself.
            this.swapButton = this.bga.statusBar.addActionButton(this.game.isDesktop() ? _('Swap Selected Cards') : _('Swap'), () => this.swapClicked(false), {id: 'swap-button'});
            this.swapButton.style.display = 'none';

            const anchorPenalty: string = (-1 - this.game.myself.getAnchorCount()).toString();
            this.swapAnchorButton = this.bga.statusBar.addActionButton(_(''), () => this.swapClicked(true), {id: 'swap-anchor-button'});
            this.swapAnchorButton.innerHTML = '<i class="fa6 fa-anchor"></i>&nbsp;' + _('Anchor for ${anchorPenalty}').replace('${anchorPenalty}', anchorPenalty) + '&nbsp;<i class="fa6 fa-anchor"></i>';
            this.swapAnchorButton.classList.remove('bgabutton_blue');
            this.swapAnchorButton.classList.add('purple-button');
            this.swapAnchorButton.style.display = 'none';

            //addActionButton still builds the button through the framework (so markup/behavior stays identical to a
            //normal status bar button); `destination` just relocates it into the title's placeholder span instead
            this.bga.statusBar.addActionButton(_('Pass'), () => this.passClicked(), {
                id: 'pass-button',
                color: 'alert',
                destination: document.getElementById('pass-button-slot'),
            });
        } else {
            this.bga.statusBar.setTitle(_('${actplayer} must play a card or pass'));
        }
    }

    /**
     * This method is called each time we are leaving the game state. You can use this method to perform some user interface changes at this moment.
     */
    onLeavingState(args: PlayerTurnArgs, isCurrentPlayerActive: boolean) {
        document.querySelectorAll('.a-card.selected-center-card').forEach(card => card.classList.remove('selected-center-card'));
        document.querySelectorAll('.a-card.selected-hand-card').forEach(card => card.classList.remove('selected-hand-card'));
        this.game.centerHandler.clearSwapPreviewHighlights();
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
        const confirmationPromise = this.bga.dialogs.confirmation(_("Pass and END YOUR GAME?"));

        const confirmButton = document.getElementById('confirmation-button-yes');
        if(confirmButton){
            confirmButton.textContent = _('Yes, end my game');
            confirmButton.classList.remove('bgabutton_blue');
            confirmButton.classList.add('bgabutton_red');
        }

        confirmationPromise.then(result => {
            if(result){
                this.bga.actions.performAction("actPass");
            }
        });
    }

    swapClicked(placeAsAnchor: boolean) {
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
            handCardLocation: handCardLocation,
            placeAsAnchor: placeAsAnchor
        });
    }

    //shows/hides each swap button independently: number placement is only offered when it's legal there, while
    //anchor placement is always a legal choice
    public showSwapButtons(showSwapButton: boolean, showSwapAnchorButton: boolean): void {
        this.swapButton.style.display = showSwapButton ? null : 'none';
        this.swapAnchorButton.style.display = showSwapAnchorButton ? null : 'none';
    }

    public hideSwapButtons(): void {
        this.showSwapButtons(false, false);
    }

    public updateBadHalfWarning(cardRank: number, handCardLocation: number, lastClickedCardDiv: HTMLDivElement): void {
        this.clearBadHalfWarning();

        if(!this.isPlayingFirstTurnOnBadHalf(cardRank, handCardLocation)){
            this.setSwapButtonsDisabled(false);
            return;
        }

        const warningHTML = _("Starting with {$centerCardRank} there looks hard, since the highest card is {$highestCardInDeck}")
            .replace('{$centerCardRank}', `<b>${cardRank.toString()}</b>`)
            .replace('{$highestCardInDeck}', `<b>${this.game.getDeckLength().toString()}</b>`);

        this.setSwapButtonsDisabled(true);

        this.badHalfWarningBox = new ModalBoxHandler(this.game, lastClickedCardDiv, warningHTML, true, false, false, PlayerTurn.BAD_HALF_LOADING_BAR_MS, () => {
            this.setSwapButtonsDisabled(false);
        });
    }

    public clearBadHalfWarning(): void {
        if(this.badHalfWarningBox){
            this.badHalfWarningBox.destroy();
            this.badHalfWarningBox = null;
        }
    }

    private setSwapButtonsDisabled(disabled: boolean): void {
        this.swapButton.disabled = disabled;
        this.swapAnchorButton.disabled = disabled;
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

        const shouldBePlacedAt = Math.ceil((cardRank / deckLength) * numberOfCardsInHand);
        const offset = Math.abs(shouldBePlacedAt - handLocation);

        const rankDistanceToEdge = Math.min(shouldBePlacedAt - 1, numberOfCardsInHand - shouldBePlacedAt);
        const maxDistance = (rankDistanceToEdge <= 3) ? 2 : 3;

        return offset > maxDistance;
    }
}
