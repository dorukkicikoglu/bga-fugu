import { PlayerTurn } from "./States/PlayerTurn";
import { PlayerHandler } from "./PlayerHandler";
import { CenterHandler } from "./CenterHandler";

export class Game {
    public bga: Bga<FuguPlayer, FuguGamedatas>;
    private gamedatas: FuguGamedatas;

    private playerTurn: PlayerTurn; //ekmek default sil?
    public players: Record<number, PlayerHandler> = {};
    public myself: PlayerHandler;
    public centerHandler: CenterHandler;

    constructor(bga: Bga<FuguPlayer, FuguGamedatas>) {
        console.log('fugu constructor');
        this.bga = bga;

        // Declare the State classes
        this.playerTurn = new PlayerTurn(this, bga); //ekmek default sil?
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
            const {name, color, score, player_no} = this.gamedatas.players[player_id];
            const score_num: number = parseInt(score, 10);
            const playerHandData = gamedatas.cardsInHands[parseInt(player_id)] || [];
            this.players[player_id] = new PlayerHandler(this, parseInt(player_id), name, color, score_num, player_no, playerHandData);
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
    
    // TODO: from this point and below, you can write your game notifications handling methods
    
    /*
    Example:
    async notif_cardPlayed( args ) {
        // Note: args contains the arguments specified during you "notifyAllPlayers" / "notifyPlayer" PHP call
        
        // TODO: play the card in the user interface.
    }
    */
}