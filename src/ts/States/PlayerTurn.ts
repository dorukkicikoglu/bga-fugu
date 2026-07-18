import { Game } from "../Game";

/**
 * We create one State class per declared state on the PHP side, to handle all state specific code here.
 * onEnteringState, onLeavingState and onPlayerActivationChange are predefined names that will be called by the framework.
 * When executing code in this state, you can access the args using this.args
 */
export class PlayerTurn {
    private swapButton: HTMLButtonElement;

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

        const centerCardDiv = this.game.centerHandler.getCenterContainer().querySelector('.selected-center-card');
        const handCardDiv = this.game.myself.getHand().getHandContainer().querySelector('.selected-hand-card');
        
        if(!centerCardDiv || !handCardDiv)
            return;
        
        const centerCardRank: number = parseInt(centerCardDiv.getAttribute('data-rank'));
        const centerCardID = centerCardDiv.getAttribute('data-card-id');
        const handCardLocation = parseInt(handCardDiv.getAttribute('data-location-in-hand'));

        const playingFirstTurnOnBadHalf = this.isPlayingFirstTurnOnBadHalf(centerCardRank, handCardLocation);
        
        const doPerformSwapCards = () => {
            this.bga.actions.performAction("actSwapCards", { 
                centerCardID: centerCardID,
                handCardLocation: handCardLocation
            }); 
        };

        if(!playingFirstTurnOnBadHalf){
            doPerformSwapCards();
        } else {
            this.bga.dialogs.confirmation(_("Starting with {$centerCardRank} on that half might be a bit of a challenge as the highest card value is {$highestCardInDeck}")
                .replace('{$centerCardRank}', `<b>${centerCardRank.toString()}</b>`)
                .replace('{$highestCardInDeck}', `<b>${this.game.getDeckLength().toString()}</b>`)).then(result => {
                if(result){ 
                    doPerformSwapCards();
                }
            });
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
