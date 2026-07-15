import { PlayerTurn } from "./States/PlayerTurn";
import { PlayerHandler } from "./PlayerHandler";
import { CenterHandler } from "./CenterHandler";

export class Game {
    public bga: Bga<FuguPlayer, FuguGamedatas>;
    private gamedatas: FuguGamedatas;

    public playerTurn: PlayerTurn;
    public players: Record<number, PlayerHandler> = {};
    public myself: PlayerHandler;
    public centerHandler: CenterHandler;

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

        this.bga.gameArea.getElement().insertAdjacentHTML('beforeend', `
            <div id="center-container"></div>
            <div id="player-hands-container"></div>
        `);

        this.centerHandler = new CenterHandler(this, gamedatas.cardsInCenter);

        // Setting up player boards
        for(let player_id in gamedatas.players) {
            const {name, color, score, player_no, game_ended, scoring_data} = this.gamedatas.players[player_id];
            const playerHandData = gamedatas.cardsInHands[parseInt(player_id)] || [];
            this.players[player_id] = new PlayerHandler(this, parseInt(player_id), name, color, player_no, playerHandData, game_ended, scoring_data);
        }

        const currentPlayerID: number = this.bga.players.getCurrentPlayerId();

        if(this.players.hasOwnProperty(currentPlayerID)){
            this.myself = this.players[currentPlayerID];
            this.myself.getHand().setHandTitle(_('Your Reef'));
            this.myself.getHand().setMyHand(true);

            for(let next_player_id of gamedatas.playerorder) {
                const nextHandContainer = this.players[next_player_id].getHand().getHandContainer();
                nextHandContainer.parentElement!.append(nextHandContainer);
            }
        }

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
    createCardDiv(cardData: CardInCenter | CardInHand): HTMLDivElement {
        let aCard = document.createElement('div');
        aCard.className = 'a-card';
        aCard.setAttribute('data-suit', cardData.suit);
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
    
    // Add the notification handler
    public async notif_pass(args: {player_id: number}) {
        this.players[args.player_id].setGameEnded(true);
    }
    
    // Add the notification handler
    public async notif_cardsSwapped(args: {player_id: number, handCardLocation: number, cardInHand: CardInHand, cardInCenter: CardInCenter, updatedScore: ScoringData, newStateInHand: CardStateInHand, game_ended: boolean}) {
        console.log('mein args', args);

        await this.players[args.player_id].animateCardSwap(args.handCardLocation, args.cardInCenter, args.cardInHand, args.newStateInHand);
        this.players[args.player_id].updateScoring(args.updatedScore);

        if(args.game_ended)
            this.players[args.player_id].setGameEnded(true);
    }    
}