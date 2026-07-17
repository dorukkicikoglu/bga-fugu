import { PlayerTurn } from "./States/PlayerTurn";
import { PlayerHandler } from "./PlayerHandler";
import { CenterHandler } from "./CenterHandler";
import { EndGameScoringHandler } from "./EndGameScoringHandler";
import { TooltipHandler } from "./TooltipHandler";

export class Game {
    public bga: Bga<FuguPlayer, FuguGamedatas>;
    private gamedatas: FuguGamedatas;

    public playerTurn: PlayerTurn;
    public players: Record<number, PlayerHandler> = {};
    private myPlayerID: number;

    public myself: PlayerHandler;
    public centerHandler: CenterHandler;
    private endGameScoringHandler: EndGameScoringHandler;
    private tooltipHandler: TooltipHandler;
    private localCardIDCounter = 1;

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

        document.body.insertAdjacentHTML('afterbegin', `<div class="background-container"></div>`);

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

        this.tooltipHandler = new TooltipHandler(this, gamedatas.deckLength);
        


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
   private format_string_recursive(log, args) {
        try {
            log = _(log);
            if (log && args && !args.processed) {
                args.processed = true;

                // list of special keys we want to replace with images
                const keys = ['BRIBED_ICONS_STR', 'CARDS_FROM_MARKET_STR', 'DRAWN_CARD_STR', 'NEW_CARDS_COUNT', 'MOVING_TREASURE_STR'];
                for(let key of keys) {
                    if(key in args) {
                        // if(key == 'BRIBED_ICONS_STR') //ekmek uncomment
                        //     log = this.logMutationObserver.createLogBribedCards(args['player_id'], args['bribedCards']);
                        // else if(key == 'CARDS_FROM_MARKET_STR')
                        //     log = this.logMutationObserver.createLogMarketVisit(args['player_id'], Object.values(args['discardedCards']), args['cost'], Object.values(args['cardsFromMarket']));
                        // else if(key == 'DRAWN_CARD_STR')
                        //     log = this.logMutationObserver.createLogDrawFromDeck(args['player_id'], args['drawnCardData'] || {card_id: -1, resource_type: -1});
                        // else if(key == 'NEW_CARDS_COUNT')
                        //     log = this.logMutationObserver.createLogCardsDealtToMarket(args['NEW_CARDS_COUNT']);
                        // else if(key == 'MOVING_TREASURE_STR')
                        //     log = this.logMutationObserver.createLogFavorTokenMoved(args['player_id'], args['movingTreasure'], args['moveBy']);
                    }
                }
            }
        } catch (e) {
            console.error(log,args,"Exception thrown", e.stack);
        }
        return (this as any).inherited(arguments);
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
    
    createCardDiv(cardData: CardInCenter | CardInHand): HTMLDivElement {
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

    public getPos(node: HTMLDivElement): DOMRect { 
        let pos = this.bga.gameui.getBoundingClientRectIgnoreZoom(node); 
        // pos.w = pos.width; pos.h = pos.height; //ekmek sil
        return pos;
    }
    public isDesktop(): boolean { return document.body.classList.contains('desktop_version'); }
    public isMobile(): boolean { return document.body.classList.contains('mobile_version'); }
    public clickOrTap(capitalized: boolean = false): string { if(capitalized) { return this.capitalizeFirstLetter(this.clickOrTap()); } return this.isDesktop() ? 'click' : 'tap'; }
    public capitalizeFirstLetter(str: string): string { return `${str[0].toUpperCase()}${str.slice(1)}`; }
    public updateStatusText(statusText): void{ $('gameaction_status').innerHTML = statusText; $('pagemaintitletext').innerHTML = statusText; }

    getGameStateName(): string {
        return this.gamedatas.gamestate.name;
    }
    
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
    
    public async notif_cardsSwapped(args: {player_id: number, handCardLocation: number, cardInHand: CardInHand, cardInCenter: CardInCenter, updatedScore: PlayerScore, newStateInHand: CardStateInHand, game_ended: boolean}) {
        await this.players[args.player_id].animateCardSwap(args.handCardLocation, args.cardInCenter, args.cardInHand, args.newStateInHand);

        this.tooltipHandler.addTooltipToCards();
        this.players[args.player_id].updateScoring(args.updatedScore);

        if(args.game_ended)
            this.players[args.player_id].setGameEnded(true);
    }

    private async notif_displayEndGameScoring(args) {
        console.log('notif_displayEndGameScoring', args);

        this.updateStatusText(_('Reef scores coming up!'));
        await this.endGameScoringHandler.displayEndGameScore(args.endGameScoring);
    }
}