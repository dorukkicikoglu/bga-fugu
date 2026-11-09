import { Game } from "../Game";
import { ModalBoxHandler } from "../ModalBoxHandler";

/**
 * We create one State class per declared state on the PHP side, to handle all state specific code here.
 * onEnteringState, onLeavingState and onPlayerActivationChange are predefined names that will be called by the framework.
 * When executing code in this state, you can access the args using this.args
 */
export class PlayerTurn {
    private static readonly BAD_HALF_LOADING_BAR_MS = 5000;
    private static readonly MAX_INDICATOR_ID = 'status-max';

    private swapButton: HTMLButtonElement;
    private badHalfWarningBox: ModalBoxHandler | null = null;
    private maxIndicatorTooltipAdded = false;

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

            this.swapButton = this.bga.statusBar.addActionButton(_(''), () => this.swapClicked(), {id: 'swap-button'});
            this.swapButton.style.display = 'none';

            //addActionButton still builds the button through the framework (so markup/behavior stays identical to a
            //normal status bar button); `destination` just relocates it into the title's placeholder span instead
            this.bga.statusBar.addActionButton(_('Pass'), () => this.passClicked(), {
                id: 'pass-button',
                color: 'alert',
                destination: document.getElementById('pass-button-slot'),
            });

            this.addMaxIndicator();
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
        this.game.swapLineHandler.hide();
        this.clearBadHalfWarning();
        this.removeMaxIndicator();
    }

    /**
     * This method is called each time the current player becomes active or inactive in a MULTIPLE_ACTIVE_PLAYER state. You can use this method to perform some user interface changes at this moment.
     * on MULTIPLE_ACTIVE_PLAYER states, you may want to call this function in onEnteringState using `this.onPlayerActivationChange(args, isCurrentPlayerActive)` at the end of onEnteringState.
     * If your state is not a MULTIPLE_ACTIVE_PLAYER one, you can delete this function.
     */
    onPlayerActivationChange(args: PlayerTurnArgs, isCurrentPlayerActive: boolean) {
    }

    passClicked() {
        this.game.swapLineHandler.hide();

        const confirmationPromise = this.bga.dialogs.confirmation(_("Pass and END YOUR GAME?"));

        const confirmButton = document.getElementById('confirmation-button-yes');
        if(confirmButton){
            confirmButton.textContent = _('Yes, end my game');
            confirmButton.classList.remove('bgabutton_blue');
            confirmButton.classList.add('bgabutton_red');
        }

        confirmationPromise.then(result => {
            if(result){
                this.restoreSwapLineIfActionFails(this.bga.actions.performAction("actPass"));
            } else {
                this.game.swapLineHandler.refresh(); //pass was cancelled, so the cards are still selected
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

        this.game.swapLineHandler.hide();

        this.restoreSwapLineIfActionFails(this.bga.actions.performAction("actSwapCards", {
            centerCardID: centerCardID,
            handCardLocation: handCardLocation
        }));
    }

    //performAction gives undefined if checkAction prevented the call, and rejects if the server refused it. either way
    //the cards are still selected, so the line that was hidden on click has to come back
    private restoreSwapLineIfActionFails(actionRequest: Promise<any> | undefined): void {
        if(!actionRequest){
            this.game.swapLineHandler.refresh();
            return;
        }

        actionRequest.catch(() => this.game.swapLineHandler.refresh());
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

        this.badHalfWarningBox = new ModalBoxHandler(this.game, lastClickedCardDiv, warningHTML, true, false, false, PlayerTurn.BAD_HALF_LOADING_BAR_MS, () => {
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

        const shouldBePlacedAt = Math.ceil((cardRank / deckLength) * numberOfCardsInHand);
        const offset = Math.abs(shouldBePlacedAt - handLocation);

        const rankDistanceToEdge = Math.min(shouldBePlacedAt - 1, numberOfCardsInHand - shouldBePlacedAt);
        const maxDistance = (rankDistanceToEdge <= 3) ? 2 : 3;

        return offset > maxDistance;
    }
    
    //"max: [highest card] (i)" hint at the end of the status bar actions. the highest card is the deck length, which
    //only depends on player count, so the card icon carries no suit (card art is picked by data-rank alone)
    private addMaxIndicator(): void {
        this.removeMaxIndicator(); //no duplicates if the state is re-entered before the status bar gets cleared

        const generalActions = document.getElementById('generalactions');
        if(!generalActions)
            return;

        const deckLength = this.game.getDeckLength();
        generalActions.insertAdjacentHTML('beforeend', `
            <span id="${PlayerTurn.MAX_INDICATOR_ID}" class="status-max">
                <span class="status-max-label">${_('max:')}</span>
                <div class="minimised-card-icon"><div class="a-card" id="status-max-card" data-rank="${deckLength}"></div></div>
                <i class="status-max-info fa6 fa-circle-info"></i>
            </span>
        `);

        const playerCount = Object.keys(this.bga.gameui.gamedatas.players).length;
        const tooltipText = (this.game.isSoloMode() ? _('Cards in a solo game are numbered from 1 to ${max}') : _('Cards in a ${playerCount}-player game are numbered from 1 to ${max}'))
            .replace('${playerCount}', playerCount.toString())
            .replace('${max}', deckLength.toString());
        //.tooltip-wrapper gives it the same gradient background (and arrow) as the cards' tooltip
        this.bga.gameui.addTooltipHtml(PlayerTurn.MAX_INDICATOR_ID, `<div class="tooltip-wrapper"><div class="status-max-tooltip-text">${tooltipText}</div></div>`);
        this.maxIndicatorTooltipAdded = true;
    }

    private removeMaxIndicator(): void {
        if(this.maxIndicatorTooltipAdded){ //tracked separately: the framework may already have emptied #generalactions
            this.bga.gameui.removeTooltip(PlayerTurn.MAX_INDICATOR_ID);
            this.maxIndicatorTooltipAdded = false;
        }

        document.getElementById(PlayerTurn.MAX_INDICATOR_ID)?.remove();
    }

    //the swap button only toggles an inline display style, so CSS can't tell it's showing; mirror it as a class
    //(hiding itself is mobile-only, see .status-max.swap-button-visible in Game.scss)
    public setMaxIndicatorSwapButtonVisible(visible: boolean): void {
        document.getElementById(PlayerTurn.MAX_INDICATOR_ID)?.classList.toggle('swap-button-visible', visible);
    }

    public getSwapButton(): HTMLButtonElement{ return this.swapButton };
}
