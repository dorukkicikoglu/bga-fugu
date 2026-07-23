import { PlayerTurn } from "./States/PlayerTurn";
import { PlayerHandler } from "./PlayerHandler";
import { CenterHandler } from "./CenterHandler";
import { LogMutationObserver } from "./LogMutationObserver";
import { EndGameScoringHandler } from "./EndGameScoringHandler";
import { TooltipHandler } from "./TooltipHandler";
import { BackgroundHandler } from "./BackgroundHandler";
import { PrefHandler } from "./PrefHandler";
import { SoloDiscardDisplayHandler } from "./SoloDiscardDisplayHandler";

export class Game {
    public bga: Bga<FuguPlayer, FuguGamedatas>;
    private gamedatas: FuguGamedatas;

    public playerTurn: PlayerTurn;
    public players: Record<number, PlayerHandler> = {};
    private myPlayerID: number;
    private localCardIDCounter = 1;
    public isSoloExpertDifficulty: boolean;
    private autoClickTimeouts: Record<string, ReturnType<typeof setTimeout>[]> = {};
    private autoClickIncrement: number = 1;
    
    public myself: PlayerHandler;
    public centerHandler: CenterHandler;
    public logMutationObserver: LogMutationObserver;
    private endGameScoringHandler: EndGameScoringHandler;
    private tooltipHandler: TooltipHandler;
    private prefHandler: PrefHandler;
    public backgroundHandler: BackgroundHandler;
    public soloDiscardDisplayHandler: SoloDiscardDisplayHandler;

    constructor(bga: Bga<FuguPlayer, FuguGamedatas>) {
        console.log('fugu constructor');
        this.bga = bga;

        // Declare the State classes
        this.playerTurn = new PlayerTurn(this, bga);
        this.bga.states.register('PlayerTurn', this.playerTurn);

        // Uncomment the next line to show debug informations about state changes in the console. Remove before going to production!
        // this.bga.states.logger = console.log;
            
        // Here, you can init the global variables of your user interface
        // Example:
        // this.myGlobalValue = 0;
    }
    
    /*
        setup:
        
        This method must set up the game user interface according to current game situation specified
        in parameters.
        
        The method is called each time the game interface is displayed to a player, ie:
        _ when the game starts
        _ when a player refreshes the game page (F5)
        
        "gamedatas" argument contains all datas retrieved by your "getAllDatas" PHP method.
    */
    
    setup(gamedatas: FuguGamedatas) {
        console.log( "Starting game setup" );
        this.gamedatas = gamedatas;

        this.isSoloExpertDifficulty = gamedatas.isSoloExpertDifficulty;
                
        this.backgroundHandler = new BackgroundHandler(this);
        this.prefHandler = new PrefHandler(this, gamedatas.pref_names);

        this.bga.gameArea.getElement().insertAdjacentHTML('beforeend', `
            <div id="center-container"></div>
            <div id="player-hands-container"></div>
        `);

        this.myPlayerID = this.bga.players.getCurrentPlayerId();
        this.centerHandler = new CenterHandler(this, gamedatas.cardsInCenter);
        this.endGameScoringHandler = new EndGameScoringHandler(this);

        // Setting up player boards
        for(let player_id in gamedatas.players) {
            const {name, color, score, player_no, game_ended, scoring_data} = this.gamedatas.players[player_id];
            const playerHandData = gamedatas.cardsInHands[parseInt(player_id)] || [];
            this.players[player_id] = new PlayerHandler(this, parseInt(player_id), name, color, player_no, playerHandData, game_ended, scoring_data);
        }
        
        if(this.players.hasOwnProperty(this.myPlayerID)){
            this.myself = this.players[this.myPlayerID];
            this.myself.getHand().setHandTitle(_('Your Reef'));
            this.myself.getHand().setMyHand(true);

            for(let next_player_id of gamedatas.playerorder) {
                const nextHandContainer = this.players[next_player_id].getHand().getHandContainer();
                nextHandContainer.parentElement!.append(nextHandContainer);
            }
        }

        this.logMutationObserver = new LogMutationObserver(this);
        this.tooltipHandler = new TooltipHandler(this);
        this.soloDiscardDisplayHandler = new SoloDiscardDisplayHandler(this, gamedatas.discardedCards);
        
        if(gamedatas.hasOwnProperty('endGameScoring'))
            this.endGameScoringHandler.displayEndGameScore(gamedatas.endGameScoring);

        // Setup game notifications to handle (see "setupNotifications" method below)
        this.setupNotifications();

        console.log( "Ending game setup" );
    }

    ///////////////////////////////////////////////////
    //// Utility methods
    
    /*
    
        Here, you can defines some utility methods that you can use everywhere in your javascript
        script. Typically, functions that are used in multiple state classes or outside a state class.
    
    */
   private bgaFormatText(log, args) {
        try {
            log = _(log);
            if (log && args && !args.processed) {
                args.processed = true;

                // list of special keys we want to replace with images
                const keys = ['SWAP_NOTIF_STR', 'CENTER_CARD_REPLACED_STR'];
                for(let key of keys) {
                    if(key in args) {
                        if(key == 'SWAP_NOTIF_STR')
                            log = this.logMutationObserver.createLogSwapCards(args['swapData']).log_html;
                        else if(key == 'CENTER_CARD_REPLACED_STR')
                            log = this.logMutationObserver.createLogCenterCardReplaced(args['soloCenterCardReplacement']).log_html;
                    }
                }
            }
        } catch (e) {
            console.error(log,args,"Exception thrown", e.stack);
        }
        return { log, args };
    }
    public divYou(attributes = {}): string {
        
        let color = this.gamedatas.players[this.myPlayerID].color;
        let color_bg = "";
        if (this.gamedatas.players[this.myPlayerID] && this.gamedatas.players[this.myPlayerID].color_back) {
            color_bg = "background-color:#" + this.gamedatas.players[this.myPlayerID.toString()].color_back + ";";
        }
        attributes['player-color'] = color;
        let html = "<span style=\"font-weight:bold;color:#" + color + ";" + color_bg + "\" " + this.getAttributesHTML(attributes) + ">" + _("You") + "</span>";
        return html;
    }
    public divColoredPlayer(player_id, attributes = {}, detectYou = true): string {
        if(detectYou && parseInt(player_id) === this.myPlayerID)
            return this.divYou(attributes);

        player_id = player_id.toString();

        let color = this.gamedatas.players[player_id].color;
        let color_bg = "";
        if (this.gamedatas.players[player_id] && this.gamedatas.players[player_id].color_back) {
            color_bg = "background-color:#" + this.gamedatas.players[player_id].color_back + ";";
        }
        attributes['player-color'] = color;
        let html = "<span style=\"color:#" + color + ";" + color_bg + "\" " + this.getAttributesHTML(attributes) + ">" + this.gamedatas.players[player_id].name + "</span>";
        return html;
    }
    private getAttributesHTML(attributes): string{ return Object.entries(attributes || {}).map(([key, value]) => `${key}="${value}"`).join(' '); }
    
    createCardDiv(cardData: CardInCenter | CardInHand | CardInDiscard): HTMLDivElement {
        let aCard = document.createElement('div');
        aCard.className = 'a-card';
        aCard.setAttribute('data-suit', cardData.suit);
        aCard.setAttribute('id', 'an-id-required-for-tooltips-' + this.localCardIDCounter);
        this.localCardIDCounter++;
        if('rank' in cardData) aCard.setAttribute('data-rank', String(cardData.rank));
        aCard.setAttribute('data-card-id', String(cardData.card_id));
        return aCard;
    }
   
    cloneCard(card: HTMLDivElement): HTMLDivElement {
        const cardClone: HTMLDivElement = card.cloneNode(true) as HTMLDivElement;
        cardClone.classList.add('cloned-card');
        return cardClone;
    }

    public placeOnObject(mobileObj: HTMLDivElement, targetObj: HTMLDivElement, forceBoundingClientRect: boolean = false): void {
        mobileObj.style.left = '0px';
        mobileObj.style.top = '0px';

        // Get current positions
        const mobileWithinPageContent = document.getElementById('page-content').contains(mobileObj);
        const targetWithinPageContent = document.getElementById('page-content').contains(targetObj);
        
        let targetRect = mobileWithinPageContent ? this.getPos(targetObj) : targetObj.getBoundingClientRect();
        let mobileRect = targetWithinPageContent ? this.getPos(mobileObj) : mobileObj.getBoundingClientRect();
        
        if(forceBoundingClientRect){
            targetRect = targetObj.getBoundingClientRect();
            mobileRect = mobileObj.getBoundingClientRect();
        }

        // Calculate the difference in position
        const deltaX = targetRect.left - mobileRect.left;
        const deltaY = targetRect.top - mobileRect.top;

        // Get current position values
        const currentLeft = parseFloat(mobileObj.style.left || '0');
        const currentTop = parseFloat(mobileObj.style.top || '0');

        // Apply the position difference to current position
        mobileObj.style.left = (currentLeft + deltaX) + 'px';
        mobileObj.style.top = (currentTop + deltaY) + 'px';
    }
    public rgbToHex(rgb: string): string { // Extract the numeric values using a regex
        const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        if (!match){
            console.error('-- rgb --', rgb);
            throw new Error("Invalid RGB format");
        }

        // Convert each component to a two-character hexadecimal
        const [, r, g, b] = match;
        return [r, g, b]
            .map((num) => {
                const hex = parseInt(num, 10).toString(16);
                return hex.padStart(2, '0'); // Ensure two digits
            })
            .join(''); // Combine into a single string
    }
    public getPos(node: HTMLDivElement): DOMRect { 
        let pos = this.bga.gameui.getBoundingClientRectIgnoreZoom(node); 
        return pos;
    }
    public isDesktop(): boolean { return document.body.classList.contains('desktop_version'); }
    public isMobile(): boolean { return document.body.classList.contains('mobile_version'); }
    public clickOrTap(capitalized: boolean = false): string { if(capitalized) { return this.capitalizeFirstLetter(this.clickOrTap()); } return this.isDesktop() ? 'click' : 'tap'; }
    public capitalizeFirstLetter(str: string): string { return `${str[0].toUpperCase()}${str.slice(1)}`; }
    public updateStatusText(statusText): void{ $('gameaction_status').innerHTML = statusText; $('pagemaintitletext').innerHTML = statusText; }
    public getGameStateName(): string { return this.gamedatas.gamestate.name; }
    /**
     * Sets up auto-click functionality for a button after a timeout period
     * @param button - The button HTML element to auto-click
     * @param timeoutDuration - Optional base duration in ms before auto-click occurs (default: 5000)
     * @param randomIncrement - Optional random additional ms to add to timeout (default: 2000)
     * @param autoClickID - Optional ID for the auto-click events, multiple buttons can therefore point to the same autoClick event
     * @param onAnimationEnd - Optional callback that returns boolean to control if click should occur (default: true)
     */
    public setAutoClick(button: HTMLElement, timeoutDuration: number = 5000, randomIncrement = 2000, autoClickID: string | null = null, onAnimationEnd: () => boolean = () => true ): ReturnType<typeof setTimeout> {
        const totalDuration = timeoutDuration + Math.random() * randomIncrement;

        if(!autoClickID)
            autoClickID = 'auto-click-' + this.autoClickIncrement++;

        this.autoClickTimeouts[autoClickID] = this.autoClickTimeouts[autoClickID] || [];

        button.style.setProperty('--bga-autoclick-timeout-duration', `${totalDuration}ms`);
        button.classList.add('bga-autoclick-button');

        const stopDoubleTrigger = () => {
            if(!this.autoClickTimeouts[autoClickID]) return;
            this.autoClickTimeouts[autoClickID].forEach(timeout => clearTimeout(timeout));
            delete this.autoClickTimeouts[autoClickID];
        }
        button.addEventListener('click', stopDoubleTrigger, true);

        const timeout = setTimeout(() => {
            stopDoubleTrigger();
            if (!document.body.contains(button)) return;
            const customEventResult = onAnimationEnd();
            if (customEventResult) button.click();
        }, totalDuration);

        this.autoClickTimeouts[autoClickID].push(timeout);

        return timeout;
    }

    public isSoloMode(): boolean{ return this.bga.gameui.is_solo; }
    public getDeckLength(): number{ return this.gamedatas.deckLength; }
    ///////////////////////////////////////////////////
    //// Reaction to cometD notifications

    /*
        setupNotifications:
        
        In this method, you associate each of your game notifications with your local method to handle it.
        
        Note: game notification names correspond to "bga->notify->all" calls in your Game.php file.
    
    */
    setupNotifications() {
        console.log( 'notifications subscriptions setup' );
        
        // automatically listen to the notifications, based on the `notif_xxx` function on this class. 
        // Uncomment the logger param to see debug information in the console about notifications.
        this.bga.notifications.setupPromiseNotifications({
            // logger: console.log
        });
    }
    
    // Add the notification handlers
    public async notif_pass(args: {player_id: number}) {
        this.players[args.player_id].setGameEnded(true);
    }

    public async notif_cardsSwapped(args: {swapData: CardSwapData, updatedScore: PlayerScore, game_ended: boolean}) {
        const swapData: CardSwapData = args.swapData;
        const swappingPlayer: PlayerHandler = this.players[swapData.player_id];

        await swappingPlayer.animateCardSwap(swapData.handCardLocation, swapData.cardInCenter, swapData.cardInHand, swapData.newStateInHand);
        swappingPlayer.getHand().setFacedownCountForMobileStretching();

        this.tooltipHandler.addTooltipToCards();
        swappingPlayer.updateScoring(args.updatedScore);

        if(args.game_ended)
            swappingPlayer.setGameEnded(true);
    }

    public async notif_centerCardReplaced(args: {soloCenterCardReplacement: soloCenterCardReplacement}) {
        if(!this.isSoloMode())
            return;
        
        await this.centerHandler.animateCardReplace(args.soloCenterCardReplacement.discardedCardData, args.soloCenterCardReplacement.newCenterCardData);
    }

    private async notif_displayEndGameScoring(args) {
        console.log('notif_displayEndGameScoring', args);

        this.updateStatusText(_('Reef scores coming up!'));
        await this.endGameScoringHandler.displayEndGameScore(args.endGameScoring);
    }
}