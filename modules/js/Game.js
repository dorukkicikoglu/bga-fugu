/**
 * We create one State class per declared state on the PHP side, to handle all state specific code here.
 * onEnteringState, onLeavingState and onPlayerActivationChange are predefined names that will be called by the framework.
 * When executing code in this state, you can access the args using this.args
 */
class PlayerTurn {
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
    }
    /**
     * This method is called each time we are entering the game state. You can use this method to perform some user interface changes at this moment.
     */
    onEnteringState(args, isCurrentPlayerActive) {
        this.bga.statusBar.setTitle(isCurrentPlayerActive ?
            _('${you} must swap 2 cards or pass') :
            _('${actplayer} must play a card or pass'));
        if (isCurrentPlayerActive) {
            this.swapButton = this.bga.statusBar.addActionButton(_('Swap selected cards'), () => this.swapClicked(), { id: 'swap-button' });
            this.swapButton.style.display = 'none';
            this.bga.statusBar.addActionButton(_('Pass'), () => this.passClicked(), { color: 'secondary' });
        }
    }
    /**
     * This method is called each time we are leaving the game state. You can use this method to perform some user interface changes at this moment.
     */
    onLeavingState(args, isCurrentPlayerActive) {
        document.querySelectorAll('.a-card.selected-center-card').forEach(card => card.classList.remove('selected-center-card'));
        document.querySelectorAll('.a-card.selected-hand-card').forEach(card => card.classList.remove('selected-hand-card'));
    }
    /**
     * This method is called each time the current player becomes active or inactive in a MULTIPLE_ACTIVE_PLAYER state. You can use this method to perform some user interface changes at this moment.
     * on MULTIPLE_ACTIVE_PLAYER states, you may want to call this function in onEnteringState using `this.onPlayerActivationChange(args, isCurrentPlayerActive)` at the end of onEnteringState.
     * If your state is not a MULTIPLE_ACTIVE_PLAYER one, you can delete this function.
     */
    onPlayerActivationChange(args, isCurrentPlayerActive) {
    }
    passClicked() {
        this.bga.dialogs.confirmation(_("Pass and end your game?")).then(result => {
            if (result) {
                this.bga.actions.performAction("actPass");
            }
        });
    }
    swapClicked() {
        if (!this.game.myself)
            return;
        const centerCardDiv = this.game.centerHandler.getCenterContainer().querySelector('.selected-center-card');
        const handCardDiv = this.game.myself.getHand().getHandContainer().querySelector('.selected-hand-card');
        if (!centerCardDiv || !handCardDiv)
            return;
        const centerCardID = centerCardDiv.getAttribute('data-card-id');
        const handCardLocation = handCardDiv.getAttribute('data-location-in-hand');
        this.bga.actions.performAction("actSwapCards", {
            centerCardID: centerCardID,
            handCardLocation: handCardLocation
        });
    }
    getSwapButton() { return this.swapButton; }
    ;
}

class HandHandler {
    constructor(gameui, owner, handData) {
        this.gameui = gameui;
        this.owner = owner;
        this.handData = handData;
        this.isMyHand = false;
        // ensure hand container exists in DOM (vanilla JS)
        const parent = document.querySelector('#player-hands-container');
        if (parent) {
            this.handContainer = document.createElement('div');
            this.handContainer.className = 'a-hand-container';
            this.handContainer.setAttribute('data-owner-id', `${this.owner.getPlayerID()}`);
            this.handContainer.style.setProperty('--hand-owner-color', '#' + this.owner.getPlayerColor());
            const handTitleText = _('{$playerName}\'s Reef').replace('{$playerName}', this.owner.getPlayerName());
            // inline HTML for brevity
            this.handContainer.innerHTML = `
                <div class="my-hand-title">${handTitleText}</div>
                <div class="cards-container"></div>
            `;
            parent.appendChild(this.handContainer);
        }
        this.cardsContainer = (this.handContainer && this.handContainer.querySelector('.cards-container'));
        this.cardsContainer.addEventListener('click', (event) => { this.cardsContainerClicked(event); });
        this.displayHand();
    }
    displayHand() {
        this.cardsContainer.innerHTML = ''; // Clear existing cards
        for (let cardData of this.handData)
            this.insertCardToHand(cardData);
        // this.setHandCountAttrForMobileResizing(false); //ekmek devam
    }
    insertCardToHand(cardData) {
        let aCard = this.gameui.createCardDiv(cardData);
        aCard.setAttribute('data-state-in-hand', cardData.state_in_hand);
        aCard.setAttribute('data-location-in-hand', cardData.location_in_hand);
        aCard.style.zIndex = cardData.location_in_hand.toString();
        this.cardsContainer.appendChild(aCard);
    }
    setHandTitle(title) {
        const titleElement = this.handContainer.querySelector('.my-hand-title');
        if (titleElement)
            titleElement.textContent = title;
    }
    cardsContainerClicked(event) {
        if (!this.isMyHand)
            return;
        if (!this.gameui.bga.players.isCurrentPlayerActive())
            return;
        if (!['PlayerTurn'].includes(this.gameui.getGameStateName()))
            return;
        if (this.gameui.bga.gameui.isInterfaceLocked())
            return;
        if (!event.target.classList.contains('a-card'))
            return;
        if (event.target.getAttribute('data-state-in-hand') !== 'facedown')
            return;
        this.handCardClicked(event.target);
    }
    handCardClicked(cardDiv) {
        const selectedCardClass = 'selected-hand-card';
        const cardWasAlreadySelected = cardDiv.classList.contains(selectedCardClass);
        this.cardsContainer.querySelectorAll('div.a-card').forEach((card) => card.classList.remove(selectedCardClass));
        if (cardWasAlreadySelected) {
            this.gameui.centerHandler.cardsUnselected();
            return;
        }
        cardDiv.classList.add(selectedCardClass);
        this.gameui.centerHandler.checkBothCardsSelected();
    }
    setMyHand(isMyHand) {
        this.isMyHand = isMyHand;
        this.handContainer.setAttribute('data-is-myself', isMyHand ? 'true' : 'false');
    }
    getHandContainer() { return this.handContainer; }
}

class PlayerHandler {
    constructor(gameui, playerID, playerName, playerColor, playerNo, playerHandData, game_ended, scoringData) {
        this.gameui = gameui;
        this.playerID = playerID;
        this.playerName = playerName;
        this.playerColor = playerColor;
        this.playerNo = playerNo;
        this.playerHandData = playerHandData;
        this.game_ended = game_ended;
        this.scoringData = scoringData;
        this.overallPlayerBoard = this.gameui.bga.playerPanels.getElement(this.playerID).closest('.player-board');
        this.setGameEnded(this.game_ended);
        this.scoreCounter = new ebg.counter();
        this.scoreCounter.create(`player_score_${this.playerID}`, {
            value: this.scoringData['totalScore'],
            playerCounter: 'Points',
            playerId: this.playerID,
        });
        this.hand = new HandHandler(this.gameui, this, this.playerHandData);
    }
    setGameEnded(gameEnded) {
        this.game_ended = gameEnded;
        if (gameEnded)
            this.overallPlayerBoard.classList.add('player-game-ended');
    }
    updateScoring(updatedScoring) {
        this.scoringData = updatedScoring;
        this.scoreCounter.toValue(this.scoringData['totalScore']);
    }
    async animateCardSwap(handCardLocation, cardInCenter, cardInHand, newStateInHand) {
        const centerContainer = this.gameui.centerHandler.getCenterContainer();
        const handContainer = this.hand.getHandContainer();
        centerContainer.querySelectorAll('.a-card.selected-center-card').forEach(element => element.classList.remove('selected-center-card'));
        handContainer.querySelectorAll('.a-card.selected-hand-card').forEach(element => element.classList.remove('selected-hand-card'));
        const centerCard = centerContainer.querySelector(`[data-card-id="${cardInCenter.card_id}"]`);
        const handCard = handContainer.querySelector(`[data-location-in-hand="${handCardLocation}"]`);
        const handCardClone = this.gameui.createCardDiv(cardInHand);
        handCardClone.classList.add('cloned-card');
        if (!centerCard || !handCard || !handCardClone)
            return;
        const centerCardClone = this.gameui.cloneCard(centerCard);
        handCard.insertAdjacentElement('afterend', centerCardClone);
        centerCard.insertAdjacentElement('afterend', handCardClone);
        centerCardClone.style.margin = '0';
        handCardClone.style.margin = '0';
        this.gameui.placeOnObject(centerCardClone, centerCard);
        this.gameui.placeOnObject(handCardClone, handCard);
        centerCard.style.opacity = '0';
        handCard.style.opacity = '0';
        centerCardClone.style.zIndex = handCard.style.zIndex;
        const pullUpAnimTime = 200;
        centerCardClone.style.transition = `top ${pullUpAnimTime}ms ease`;
        centerCardClone.style.top = `${parseFloat(centerCardClone.style.top || '0') - 20}px`;
        await this.gameui.bga.gameui.wait(pullUpAnimTime + 50);
        const cardMoveAnimTime = 800;
        centerCardClone.style.transition = `inset ${cardMoveAnimTime}ms ease, transform ${cardMoveAnimTime}ms ease`;
        handCardClone.style.transition = `inset ${cardMoveAnimTime}ms ease`;
        centerCardClone.style.top = handCard.offsetTop + 'px';
        centerCardClone.style.left = handCard.offsetLeft + 'px';
        handCardClone.style.top = centerCard.offsetTop + 'px';
        handCardClone.style.left = centerCard.offsetLeft + 'px';
        if (newStateInHand == 'anchor') {
            centerCardClone.style.boxShadow = 'none';
            centerCardClone.style.transform = 'rotate(180deg)';
        }
        await this.gameui.bga.gameui.wait(cardMoveAnimTime);
        handCardClone.classList.remove('cloned-card');
        handCardClone.style.margin = null;
        handCardClone.style.top = null;
        handCardClone.style.left = null;
        handCardClone.style.transition = null;
        centerCardClone.classList.remove('cloned-card');
        centerCardClone.style.margin = null;
        centerCardClone.style.top = null;
        centerCardClone.style.left = null;
        centerCardClone.style.transition = null;
        centerCardClone.style.boxShadow = null;
        centerCardClone.style.transform = null;
        centerCardClone.setAttribute('data-state-in-hand', newStateInHand);
        centerCardClone.setAttribute('data-location-in-hand', cardInHand.location_in_hand.toString());
        centerCard.replaceWith(handCardClone);
        handCard.replaceWith(centerCardClone);
    }
    getPlayerID() { return this.playerID; }
    getPlayerName() { return this.playerName; }
    getPlayerColor() { return this.playerColor; }
    getHand() { return this.hand; }
}

class CenterHandler {
    constructor(gameui, centerCardsData) {
        this.gameui = gameui;
        this.centerCardsData = centerCardsData;
        this.centerContainer = document.querySelector('#center-container');
        for (let cardData of this.centerCardsData)
            this.centerContainer.appendChild(this.gameui.createCardDiv(cardData));
        this.centerContainer.addEventListener('click', (event) => { this.centerContainerClicked(event); });
    }
    centerContainerClicked(event) {
        if (!this.gameui.bga.players.isCurrentPlayerActive())
            return;
        if (!['PlayerTurn'].includes(this.gameui.getGameStateName()))
            return;
        if (this.gameui.bga.gameui.isInterfaceLocked())
            return;
        if (!event.target.classList.contains('a-card'))
            return;
        this.centerCardClicked(event.target);
    }
    centerCardClicked(cardDiv) {
        const selectedCardClass = 'selected-center-card';
        const cardWasAlreadySelected = cardDiv.classList.contains(selectedCardClass);
        this.centerContainer.querySelectorAll('div.a-card').forEach((card) => card.classList.remove(selectedCardClass));
        if (cardWasAlreadySelected) {
            this.cardsUnselected();
            return;
        }
        cardDiv.classList.add(selectedCardClass);
        this.gameui.centerHandler.checkBothCardsSelected();
    }
    checkBothCardsSelected() {
        if (!this.gameui.myself)
            return;
        const selectedCenterCard = this.centerContainer.querySelector('.selected-center-card');
        const myHandContainer = this.gameui.myself.getHand().getHandContainer();
        const selectedHandCard = myHandContainer.querySelector('.selected-hand-card');
        if (!selectedCenterCard || !selectedHandCard) {
            this.cardsUnselected();
            return;
        }
        this.gameui.playerTurn.getSwapButton().style.display = null;
    }
    cardsUnselected() {
        this.gameui.playerTurn.getSwapButton().style.display = 'none';
    }
    getCenterContainer() { return this.centerContainer; }
}

class Game {
    constructor(bga) {
        this.players = {};
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
    setup(gamedatas) {
        console.log("Starting game setup");
        this.gamedatas = gamedatas;
        this.bga.gameArea.getElement().insertAdjacentHTML('beforeend', `
            <div id="center-container"></div>
            <div id="player-hands-container"></div>
        `);
        this.centerHandler = new CenterHandler(this, gamedatas.cardsInCenter);
        // Setting up player boards
        for (let player_id in gamedatas.players) {
            const { name, color, score, player_no, game_ended, scoring_data } = this.gamedatas.players[player_id];
            const playerHandData = gamedatas.cardsInHands[parseInt(player_id)] || [];
            this.players[player_id] = new PlayerHandler(this, parseInt(player_id), name, color, player_no, playerHandData, game_ended, scoring_data);
        }
        const currentPlayerID = this.bga.players.getCurrentPlayerId();
        if (this.players.hasOwnProperty(currentPlayerID)) {
            this.myself = this.players[currentPlayerID];
            this.myself.getHand().setHandTitle(_('Your Reef'));
            this.myself.getHand().setMyHand(true);
            for (let next_player_id of gamedatas.playerorder) {
                const nextHandContainer = this.players[next_player_id].getHand().getHandContainer();
                nextHandContainer.parentElement.append(nextHandContainer);
            }
        }
        // Setup game notifications to handle (see "setupNotifications" method below)
        this.setupNotifications();
        console.log("Ending game setup");
    }
    ///////////////////////////////////////////////////
    //// Utility methods
    /*
    
        Here, you can defines some utility methods that you can use everywhere in your javascript
        script. Typically, functions that are used in multiple state classes or outside a state class.
    
    */
    createCardDiv(cardData) {
        let aCard = document.createElement('div');
        aCard.className = 'a-card';
        aCard.setAttribute('data-suit', cardData.suit);
        if ('rank' in cardData)
            aCard.setAttribute('data-rank', String(cardData.rank));
        aCard.setAttribute('data-card-id', String(cardData.card_id));
        return aCard;
    }
    cloneCard(card) {
        const cardClone = card.cloneNode(true);
        cardClone.classList.add('cloned-card');
        return cardClone;
    }
    placeOnObject(mobileObj, targetObj, forceBoundingClientRect = false) {
        mobileObj.style.left = '0px';
        mobileObj.style.top = '0px';
        // Get current positions
        const mobileWithinPageContent = document.getElementById('page-content').contains(mobileObj);
        const targetWithinPageContent = document.getElementById('page-content').contains(targetObj);
        let targetRect = mobileWithinPageContent ? this.getPos(targetObj) : targetObj.getBoundingClientRect();
        let mobileRect = targetWithinPageContent ? this.getPos(mobileObj) : mobileObj.getBoundingClientRect();
        if (forceBoundingClientRect) {
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
    getPos(node) {
        let pos = this.bga.gameui.getBoundingClientRectIgnoreZoom(node);
        // pos.w = pos.width; pos.h = pos.height; //ekmek sil
        return pos;
    }
    getGameStateName() {
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
        console.log('notifications subscriptions setup');
        // automatically listen to the notifications, based on the `notif_xxx` function on this class. 
        // Uncomment the logger param to see debug information in the console about notifications.
        this.bga.notifications.setupPromiseNotifications({
        // logger: console.log
        });
    }
    // Add the notification handler
    async notif_pass(args) {
        this.players[args.player_id].setGameEnded(true);
    }
    // Add the notification handler
    async notif_cardsSwapped(args) {
        console.log('mein args', args);
        await this.players[args.player_id].animateCardSwap(args.handCardLocation, args.cardInCenter, args.cardInHand, args.newStateInHand);
        this.players[args.player_id].updateScoring(args.updatedScore);
        if (args.game_ended)
            this.players[args.player_id].setGameEnded(true);
    }
}

export { Game };
