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
            this.swapButton = this.bga.statusBar.addActionButton(_(''), () => this.swapClicked(), { id: 'swap-button' });
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
        const centerCardRank = parseInt(centerCardDiv.getAttribute('data-rank'));
        const centerCardID = centerCardDiv.getAttribute('data-card-id');
        const handCardLocation = parseInt(handCardDiv.getAttribute('data-location-in-hand'));
        const playingFirstTurnOnBadHalf = this.isPlayingFirstTurnOnBadHalf(centerCardRank, handCardLocation);
        const doPerformSwapCards = () => {
            this.bga.actions.performAction("actSwapCards", {
                centerCardID: centerCardID,
                handCardLocation: handCardLocation
            });
        };
        if (!playingFirstTurnOnBadHalf) {
            doPerformSwapCards();
        }
        else {
            this.bga.dialogs.confirmation(_("Starting with {$centerCardRank} on that half might be a bit of a challenge....").replace('{$centerCardRank}', centerCardRank.toString())).then(result => {
                if (result) {
                    doPerformSwapCards();
                }
            });
        }
    }
    isPlayingFirstTurnOnBadHalf(cardRank, handLocation) {
        const handContainer = this.game.myself.getHand().getHandContainer();
        const cardsInHand = handContainer.querySelectorAll('.a-card');
        const numberOfCardsInPlayerHand = cardsInHand.length;
        const isFirstTurn = handContainer.querySelectorAll('.a-card:not([data-state-in-hand="facedown"])').length === 0;
        if (!isFirstTurn)
            return false;
        const isCardHigh = cardRank > (this.bga.gameui.gamedatas.deckLength / 2);
        const isLocationHigh = handLocation >= (numberOfCardsInPlayerHand / 2);
        if (isCardHigh === isLocationHigh)
            return false;
        return true;
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
        const star = this.overallPlayerBoard.querySelector('.fa-star');
        if (star) {
            this.anchorTextDiv = document.createElement('div');
            this.anchorTextDiv.classList.add('anchor-text');
            this.anchorTextDiv.innerText = this.scoringData.anchorCount.toString();
            star.insertAdjacentElement('afterend', this.anchorTextDiv);
            this.anchorTextDiv.insertAdjacentHTML('afterend', '<i class="fa6 fa-anchor"></i>');
        }
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
        this.scoreCounter.toValue(this.scoringData.totalScore);
        if (this.anchorTextDiv)
            this.anchorTextDiv.innerText = this.scoringData.anchorCount.toString();
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
        handContainer.style.zIndex = '100';
        const cardMoveAnimTime = 700;
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
        handContainer.style.zIndex = null;
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
        const cardRank = Number(selectedCenterCard.getAttribute('data-rank'));
        const handCardLocation = Number(selectedHandCard.getAttribute('data-location-in-hand'));
        const wouldBeAnchor = this.wouldBeAnchorCard(myHandContainer, handCardLocation, cardRank);
        const swapButton = this.gameui.playerTurn.getSwapButton();
        if (wouldBeAnchor) {
            swapButton.innerHTML = '<i class="fa6 fa-anchor"></i> ' + _('Swap as Anchor') + ' <i class="fa6 fa-anchor"></i>';
            swapButton.classList.remove('bgabutton_blue');
            swapButton.classList.add('orange-button');
        }
        else {
            swapButton.innerHTML = _('Swap Selected Cards');
            swapButton.classList.remove('orange-button');
            swapButton.classList.add('bgabutton_blue');
        }
        swapButton.style.display = null;
    }
    wouldBeAnchorCard(handContainer, cardLocation, cardRank) {
        const cardsInHand = handContainer.querySelectorAll('[data-state-in-hand="number"]');
        for (let i = 0; i < cardsInHand.length; i++) {
            const nextCard = cardsInHand[i];
            const nextLocation = Number(nextCard.getAttribute('data-location-in-hand'));
            const nextRank = Number(nextCard.getAttribute('data-rank'));
            if (nextLocation < cardLocation && nextRank > cardRank)
                return true;
            if (nextLocation > cardLocation && nextRank < cardRank)
                return true;
        }
        return false;
    }
    cardsUnselected() {
        this.gameui.playerTurn.getSwapButton().style.display = 'none';
    }
    async animateCardReplace(discardedCardData, newCenterCardData) {
        const oldCenterCard = this.centerContainer.querySelector(`[data-card-id="${discardedCardData.card_id}"]`);
        const oldCenterCardClone = this.gameui.cloneCard(oldCenterCard);
        const newCenterCard = this.gameui.createCardDiv(newCenterCardData);
        const newCenterCardClone = this.gameui.cloneCard(newCenterCard);
        oldCenterCard.insertAdjacentElement('afterend', oldCenterCardClone);
        oldCenterCard.insertAdjacentElement('afterend', newCenterCardClone);
        this.gameui.placeOnObject(oldCenterCardClone, oldCenterCard);
        this.gameui.placeOnObject(newCenterCardClone, oldCenterCard);
        const newCenterCardOriginalTop = newCenterCardClone.style.top;
        const newCenterCardOriginalLeft = newCenterCardClone.style.left;
        newCenterCardClone.style.top = 'calc(var(--card-width) * -3)';
        newCenterCardClone.style.left = `calc(var(--card-width) * ` + (-1 * (3 + Math.random() * 2)) + ` + ${parseFloat(oldCenterCardClone.style.left || '0')}px)`;
        oldCenterCard.style.opacity = '0';
        const pullUpAnimTime = 200;
        oldCenterCardClone.style.transition = `top ${pullUpAnimTime}ms ease`;
        oldCenterCardClone.style.top = `${parseFloat(oldCenterCardClone.style.top || '0') - 20}px`;
        await this.gameui.bga.gameui.wait(pullUpAnimTime + 50);
        const flyAwayAnimTime = 400;
        oldCenterCardClone.style.transition = `top ${flyAwayAnimTime}ms ease-out, left ${flyAwayAnimTime}ms ease-out`;
        oldCenterCardClone.style.top = 'calc(var(--card-width) * -3)';
        oldCenterCardClone.style.left = `calc(var(--card-width) * ` + (3 + Math.random() * 2) + ` + ${parseFloat(oldCenterCardClone.style.left || '0')}px)`;
        const flyInAnimTime = 400;
        newCenterCardClone.style.transition = `top ${flyInAnimTime}ms ease-in, left ${flyInAnimTime}ms ease-in`;
        newCenterCardClone.style.top = newCenterCardOriginalTop;
        newCenterCardClone.style.left = newCenterCardOriginalLeft;
        await this.gameui.bga.gameui.wait(Math.max(flyAwayAnimTime, flyInAnimTime));
        oldCenterCard.setAttribute('data-rank', newCenterCardData.card_id.toString());
        oldCenterCard.setAttribute('data-card-id', newCenterCardData.card_id.toString());
        oldCenterCard.style.opacity = null;
        newCenterCardClone.remove();
        oldCenterCardClone.remove();
    }
    getCenterContainer() { return this.centerContainer; }
}

class EndGameScoringHandler {
    constructor(gameui) {
        this.gameui = gameui;
        this.bodyClickHandler = null;
        this.delayAfterFadeIns = 5000;
        this.scoringRowNames = ['bannerfish', 'pufferfish', 'octopus', 'corals', 'anchor', 'soloDifficultyPenalty', 'totalScore'];
    }
    async displayEndGameScore(endGameScoring) {
        this.endGameScoring = endGameScoring;
        if (this.scoreContainer) {
            console.error('end-game-score-container already exists');
            return;
        }
        document.body.classList.add('displaying-end-game-score');
        this.endGameScoring.player_scores = endGameScoring.player_scores;
        this.winner_ids = endGameScoring.winner_ids;
        document.getElementById('end-game-score-container')?.remove();
        this.scoreContainer = document.createElement('div');
        this.scoreContainer.classList.add('end-game-score-container');
        this.scoreContainer.style.opacity = '0';
        this.scoreContainer.innerHTML = `
            <div class="show-table-button" style="display: none;" title="${_('Show Scoreboard')}">
                <i class="fa6 fa6-ranking-star"></i>
            </div> 
            <div class="maximized-content"> 
                <i class="fa6 fa6-chevron-circle-left collapse-table-button" title="${_('Collapse Scoreboard')}"></i>
                <table>
                    <thead></thead>
                    <tbody></tbody>
                </table>
                <div class="fast-forward-text"></div> 
            </div>
        `;
        document.querySelector('#game_play_area').appendChild(this.scoreContainer);
        this.thead = this.scoreContainer.querySelector('thead');
        this.tbody = this.scoreContainer.querySelector('tbody');
        this.showButton = this.scoreContainer.querySelector('.show-table-button');
        this.hideButton = this.scoreContainer.querySelector('.collapse-table-button');
        this.fastForwardButton = this.scoreContainer.querySelector('.fast-forward-text');
        this.fillTable();
        this.bindShowHideButtons();
        this.fastForwardButton.innerHTML = '* ' + _(this.gameui.clickOrTap(true) + ' anywhere to fast forward');
        const instantFadeIn = this.gameui.getGameStateName() === 'EndScore';
        const fadeInDuration = instantFadeIn ? 0 : 1000;
        const fadeInDelay = instantFadeIn ? 0 : 100;
        this.scoreContainer.style.transition = `opacity ${fadeInDuration}ms ease ${fadeInDelay}ms`;
        this.scoreContainer.style.opacity = '1';
        await this.gameui.bga.gameui.wait(fadeInDelay + fadeInDuration);
        this.scoreContainer.style.opacity = null;
        this.scoreContainer.style.transition = null;
        this.bindBodyScroll();
        await this.fadeInNextCell();
        document.body.classList.remove('displaying-end-game-score');
    }
    fillTable() {
        // Create header row with player names
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th class="corner-no-border-cell"></th>'; // Empty corner cell
        // Add player name columns
        for (let player_id in this.gameui.players) {
            const playerNameDiv = this.gameui.divColoredPlayer(player_id, {}, false);
            headerRow.innerHTML += `<th class="player-name-cell" player-id="${player_id}">${playerNameDiv}</th>`;
        }
        this.thead.appendChild(headerRow);
        // Add score rows
        for (let i = 0; i < this.scoringRowNames.length; i++) {
            const row = document.createElement('tr');
            const scoreType = this.scoringRowNames[i];
            if (scoreType == 'soloDifficultyPenalty' && !(this.gameui.isSoloMode() && this.gameui.isSoloExpertDifficulty)) {
                continue;
            }
            const isSoloDifficultyPenalty = scoreType == 'soloDifficultyPenalty';
            const iconClass = isSoloDifficultyPenalty ? 'score-type-icon a-card' : 'score-type-icon';
            const facedownAttr = isSoloDifficultyPenalty ? ' data-state-in-hand="facedown"' : '';
            row.innerHTML = `
                <td class="score-type-icon-cell">
                    <div class="${iconClass}" data-score-type="${scoreType}"${facedownAttr}></div>
                </td>`;
            for (let player_id in this.gameui.players) {
                const playerScore = this.endGameScoring.player_scores[player_id];
                const cellScore = playerScore[scoreType];
                row.innerHTML += `<td><div class="cell-text cell-${scoreType}" style="opacity: 0;" row-index="${i}" player-id="${player_id}">${cellScore}</div></td>`;
            }
            this.tbody.appendChild(row);
        }
    }
    bindShowHideButtons() {
        this.hideButton.addEventListener('click', () => {
            this.hideButton.style.display = 'none';
            this.scoreContainer.querySelectorAll('.maximized-content').forEach((node) => { node.style.display = 'none'; });
            this.showButton.style.display = null;
            this.scoreContainer.setAttribute('collapsed', 'true');
        });
        this.showButton.addEventListener('click', () => {
            this.hideButton.style.display = null;
            this.scoreContainer.querySelectorAll('.maximized-content').forEach((node) => { node.style.display = null; });
            this.showButton.style.display = 'none';
            this.scoreContainer.removeAttribute('collapsed');
        });
    }
    bindBodyScroll() {
        this.scoreContainer.style.transition = 'opacity 300ms ease';
        let fadeInGeneration = 0;
        // Bind scroll event listener to the body
        window.addEventListener('scroll', () => {
            const generation = ++fadeInGeneration;
            this.scoreContainer.style.opacity = '0.3';
            this.gameui.bga.gameui.wait(100).then(() => {
                if (generation === fadeInGeneration)
                    this.scoreContainer.style.opacity = '1';
            });
        });
    }
    async fadeInNextCell() {
        const cells = Array.from(this.tbody.querySelectorAll('.cell-text:not(.displayed)'));
        const overallContent = document.getElementById('overall-content');
        overallContent.removeEventListener('click', this.bodyClickHandler);
        if (cells.length <= Object.keys(this.gameui.players).length * 2) {
            this.fastForwardButton.style.transition = 'opacity 400ms ease';
            this.fastForwardButton.style.opacity = '0';
        }
        if (cells.length <= 0) {
            const allCells = Array.from(this.tbody.querySelectorAll('.cell-text'));
            allCells.forEach((cell) => { cell.style.opacity = ''; });
            this.makeWinnersJump();
            this.setEndGamePlayerScores();
            await this.gameui.bga.gameui.wait(this.delayAfterFadeIns);
            return;
        }
        let cell = cells[0];
        const instantFadeIn = this.gameui.getGameStateName() === 'gameEnd';
        cell.classList.add('displayed');
        const fadeInDuration = instantFadeIn ? 0 : 500;
        const fadeInDelay = instantFadeIn ? 0 : 100;
        let fastForwardFadeIn;
        const fastForwarded = new Promise(resolve => { fastForwardFadeIn = resolve; });
        this.bodyClickHandler = async (event) => {
            cell.style.transition = null;
            cell.style.opacity = '1';
            fastForwardFadeIn();
        };
        overallContent.addEventListener('click', this.bodyClickHandler);
        this.addColumnTotal(cell.getAttribute('player-id'));
        cell.style.transition = `opacity ${fadeInDuration}ms ease ${fadeInDelay}ms`;
        cell.style.opacity = '1';
        await Promise.race([
            this.gameui.bga.gameui.wait(fadeInDelay + fadeInDuration),
            fastForwarded
        ]);
        await this.fadeInNextCell();
    }
    addColumnTotal(playerID) {
        const cells = Array.from(this.tbody.querySelectorAll(`.cell-text.displayed[player-id="${playerID}"]:not(.cell-total)`));
        let total = 0;
        cells.forEach(cell => {
            const cellValue = parseInt(cell.textContent || '0');
            const isPenalty = cell.classList.contains('cell-penalty');
            const value = isPenalty ? -1 * Math.abs(cellValue) : cellValue;
            if (!isNaN(value))
                total += value;
        });
        const totalCell = this.tbody.querySelector(`.cell-total[player-id="${playerID}"]`);
        if (totalCell) {
            totalCell.textContent = total.toString();
            totalCell.classList.add('displayed');
            totalCell.style.opacity = '1';
        }
    }
    makeWinnersJump() {
        let delay = 0;
        for (let winner_id of this.winner_ids) {
            this.gameui.bga.gameui.wait(delay).then(() => {
                this.thead.querySelector(`.player-name-cell[player-id="${winner_id}"]`).classList.add('jumping-text');
            });
            delay += 100 + Math.random() * 50;
        }
    }
    setEndGamePlayerScores() {
        for (let player_id in this.gameui.players)
            this.gameui.players[player_id].updateScoring(this.endGameScoring.player_scores[player_id]);
    }
}

class TooltipHandler {
    constructor(gameui, deckLength) {
        this.gameui = gameui;
        this.deckLength = deckLength;
        this.addTooltipToCards();
    }
    addTooltipToCards() {
        if (document.body.classList.contains('safari-browser') && this.gameui.isMobile()) {
            this.addTooltipToBottomForSafari();
            return;
        }
        const tooltipHTML = this.getTooltipHTML();
        this.gameui.bga.gameui.addTooltipHtmlToClass('a-card', tooltipHTML, 400);
    }
    addTooltipToBottomForSafari() {
        if (!document.body.classList.contains('safari-browser') || !this.gameui.isMobile())
            return;
        if (document.querySelector('.safari-mobile-revealed-cards-container'))
            return;
        const tooltipHTML = this.getTooltipHTML();
        const safariMobileRevealedCardsContainer = document.createElement('div');
        safariMobileRevealedCardsContainer.className = 'safari-mobile-revealed-cards-container';
        document.getElementById('game_play_area').appendChild(safariMobileRevealedCardsContainer);
        document.querySelector('.safari-mobile-revealed-cards-container').innerHTML = tooltipHTML;
    }
    getTooltipHTML() {
        const deckLengthText = _('Highest card value is {$deckLength}').replace('{$deckLength}', '<b>' + this.deckLength.toString() + '</b>');
        const tooltipHTML = `
            <div class="tooltip-wrapper">
                <div class="deck-length-text">${deckLengthText}</div>
                <div class="a-card reference-card"></div>
            </div>
        `;
        return tooltipHTML;
    }
}

const BUBBLE_AMOUNT_BY_PREF = {
    0: { maxBubbleCount: 0, minScheduleTime: 0, maxScheduleTime: 0 }, // off
    1: { maxBubbleCount: 3, minScheduleTime: 2000, maxScheduleTime: 5000 }, // low
    2: { maxBubbleCount: 8, minScheduleTime: 1000, maxScheduleTime: 2000 }, // mid
    3: { maxBubbleCount: 20, minScheduleTime: 500, maxScheduleTime: 1000 }, // intense
    4: { maxBubbleCount: 50, minScheduleTime: 150, maxScheduleTime: 350 }, // bubble bath
};
class BackgroundHandler {
    constructor(gameui) {
        this.gameui = gameui;
        this.targetBubbleSetting = BUBBLE_AMOUNT_BY_PREF[1];
        this.bubblesInitialized = false;
        this.backgroundContainer = document.createElement('div');
        this.backgroundContainer.classList.add('background-container');
        document.body.insertAdjacentElement('afterbegin', this.backgroundContainer);
        this.bubblesContainer = document.createElement('div');
        this.bubblesContainer.classList.add('bubbles-container');
        this.backgroundContainer.appendChild(this.bubblesContainer);
        this.bodyClickListener = (event) => {
            if (this.targetBubbleSetting.maxBubbleCount === 0)
                return;
            this.createBubble({ x: event.clientX, y: event.clientY });
        };
        document.body.addEventListener('click', this.bodyClickListener);
    }
    adjustBubbleAmount(prefValue) {
        this.targetBubbleSetting = BUBBLE_AMOUNT_BY_PREF[prefValue] ?? BUBBLE_AMOUNT_BY_PREF[0];
        if (!this.bubblesInitialized) {
            const initialBubbleCount = Math.floor(Math.random() * (this.targetBubbleSetting.maxBubbleCount / 2));
            for (let i = 0; i < initialBubbleCount; i++)
                this.createBubble();
            this.scheduleNextBubble();
            this.bubblesInitialized = true;
            return;
        }
        //fade out and destroy bubbles
        const bubbles = Array.from(this.bubblesContainer.querySelectorAll('.bubble'));
        while (bubbles.length > this.targetBubbleSetting.maxBubbleCount) {
            const randomBubbleIndex = Math.floor(Math.random() * bubbles.length);
            const bubbleToPop = bubbles[randomBubbleIndex];
            bubbles[randomBubbleIndex] = bubbles[bubbles.length - 1];
            bubbles.length--;
            const bubbleOpacity = bubbleToPop.querySelector('.bubble-opacity');
            bubbleOpacity.style.transition = 'opacity 0.2s ease-out';
            bubbleOpacity.style.opacity = '0';
            bubbleOpacity.addEventListener('transitionend', () => {
                bubbleToPop.remove();
            }, { once: true });
        }
    }
    scheduleNextBubble() {
        const delay = this.targetBubbleSetting.minScheduleTime + Math.random() * (this.targetBubbleSetting.maxScheduleTime - this.targetBubbleSetting.minScheduleTime);
        setTimeout(() => {
            if (this.bubblesContainer.childElementCount < this.targetBubbleSetting.maxBubbleCount)
                this.createBubble();
            this.scheduleNextBubble();
        }, delay);
    }
    createBubble(position) {
        const bubblesInitialized = this.bubblesInitialized; //to run even if bubblesInitialized gets changed elsewhere
        const bubble = document.createElement('div');
        bubble.classList.add('bubble');
        const bubbleOpacity = document.createElement('div');
        bubbleOpacity.classList.add('bubble-opacity');
        bubble.appendChild(bubbleOpacity);
        const swing = document.createElement('div');
        swing.classList.add('bubble-swing');
        bubbleOpacity.appendChild(swing);
        const size = 6 + Math.random() * 34;
        const duration = 12 + Math.random() * 4;
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.animationDuration = `${duration}s`;
        if (position) {
            bubble.style.left = `${position.x - size / 2}px`;
            bubble.style.top = `${position.y - size / 2}px`;
            bubble.style.bottom = 'auto';
        }
        else {
            bubble.style.left = `${Math.random() * 100}%`;
        }
        if (!bubblesInitialized)
            bubble.style.animationDelay = `${-1 * Math.random() * duration}s`;
        swing.style.setProperty('--drift', `${(Math.random() * 80) - 40}px`);
        swing.style.setProperty('--rotation', `${(Math.random() * 720) - 360}deg`);
        swing.style.setProperty('--wobble-1', `${10 + Math.random() * 20 * (Math.random() > 0.5 ? 1 : -1)}px`);
        swing.style.setProperty('--wobble-2', `${10 + Math.random() * 20 * (Math.random() > 0.5 ? 1 : -1)}px`);
        swing.style.setProperty('--wobble-3', `${10 + Math.random() * 20 * (Math.random() > 0.5 ? 1 : -1)}px`);
        swing.style.setProperty('--wobble-4', `${10 + Math.random() * 20 * (Math.random() > 0.5 ? 1 : -1)}px`);
        swing.style.animationDuration = `${duration}s`;
        bubble.addEventListener('animationend', () => bubble.remove());
        this.bubblesContainer.appendChild(bubble);
    }
}

class PrefHandler {
    constructor(gameui, prefNameToIndex) {
        this.gameui = gameui;
        this.prefNameToIndex = prefNameToIndex;
        this.gameui.bga.userPreferences.onChange = (prefIndex, prefValue) => this.onGameUserPreferenceChanged(prefIndex, prefValue);
        const bubbleAmountPrefIndex = this.prefNameToIndex['bubble_amount'];
        this.onGameUserPreferenceChanged(bubbleAmountPrefIndex, this.gameui.bga.userPreferences.get(bubbleAmountPrefIndex));
    }
    onGameUserPreferenceChanged(prefIndex, prefValue) {
        switch (prefIndex) {
            case 101:
                this.gameui.backgroundHandler.adjustBubbleAmount(prefValue);
                break;
        }
    }
}

class Game {
    constructor(bga) {
        this.players = {};
        this.localCardIDCounter = 1;
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
        for (let player_id in gamedatas.players) {
            const { name, color, score, player_no, game_ended, scoring_data } = this.gamedatas.players[player_id];
            const playerHandData = gamedatas.cardsInHands[parseInt(player_id)] || [];
            this.players[player_id] = new PlayerHandler(this, parseInt(player_id), name, color, player_no, playerHandData, game_ended, scoring_data);
        }
        if (this.players.hasOwnProperty(this.myPlayerID)) {
            this.myself = this.players[this.myPlayerID];
            this.myself.getHand().setHandTitle(_('Your Reef'));
            this.myself.getHand().setMyHand(true);
            for (let next_player_id of gamedatas.playerorder) {
                const nextHandContainer = this.players[next_player_id].getHand().getHandContainer();
                nextHandContainer.parentElement.append(nextHandContainer);
            }
        }
        this.tooltipHandler = new TooltipHandler(this, gamedatas.deckLength);
        if (gamedatas.hasOwnProperty('endGameScoring'))
            this.endGameScoringHandler.displayEndGameScore(gamedatas.endGameScoring);
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
    format_string_recursive(log, args) {
        try {
            log = _(log);
            if (log && args && !args.processed) {
                args.processed = true;
                // list of special keys we want to replace with images
                const keys = ['BRIBED_ICONS_STR', 'CARDS_FROM_MARKET_STR', 'DRAWN_CARD_STR', 'NEW_CARDS_COUNT', 'MOVING_TREASURE_STR'];
                for (let key of keys) {
                    if (key in args) {
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
        }
        catch (e) {
            console.error(log, args, "Exception thrown", e.stack);
        }
        return this.inherited(arguments);
    }
    divYou(attributes = {}) {
        let color = this.gamedatas.players[this.myPlayerID].color;
        let color_bg = "";
        if (this.gamedatas.players[this.myPlayerID] && this.gamedatas.players[this.myPlayerID].color_back) {
            color_bg = "background-color:#" + this.gamedatas.players[this.myPlayerID.toString()].color_back + ";";
        }
        attributes['player-color'] = color;
        let html = "<span style=\"font-weight:bold;color:#" + color + ";" + color_bg + "\" " + this.getAttributesHTML(attributes) + ">" + _("You") + "</span>";
        return html;
    }
    divColoredPlayer(player_id, attributes = {}, detectYou = true) {
        if (detectYou && parseInt(player_id) === this.myPlayerID)
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
    getAttributesHTML(attributes) { return Object.entries(attributes || {}).map(([key, value]) => `${key}="${value}"`).join(' '); }
    createCardDiv(cardData) {
        let aCard = document.createElement('div');
        aCard.className = 'a-card';
        aCard.setAttribute('data-suit', cardData.suit);
        aCard.setAttribute('id', 'an-id-required-for-tooltips-' + this.localCardIDCounter);
        this.localCardIDCounter++;
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
        // pos.w = pos.width; pos.h = pos.height; //ekmek kalsin mi?
        return pos;
    }
    isDesktop() { return document.body.classList.contains('desktop_version'); }
    isMobile() { return document.body.classList.contains('mobile_version'); }
    clickOrTap(capitalized = false) { if (capitalized) {
        return this.capitalizeFirstLetter(this.clickOrTap());
    } return this.isDesktop() ? 'click' : 'tap'; }
    capitalizeFirstLetter(str) { return `${str[0].toUpperCase()}${str.slice(1)}`; }
    updateStatusText(statusText) { $('gameaction_status').innerHTML = statusText; $('pagemaintitletext').innerHTML = statusText; }
    getGameStateName() { return this.gamedatas.gamestate.name; }
    isSoloMode() { return this.bga.gameui.is_solo; }
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
    // Add the notification handlers
    async notif_pass(args) {
        this.players[args.player_id].setGameEnded(true);
    }
    async notif_cardsSwapped(args) {
        await this.players[args.player_id].animateCardSwap(args.handCardLocation, args.cardInCenter, args.cardInHand, args.newStateInHand);
        if (this.isSoloMode())
            await this.centerHandler.animateCardReplace(args.soloCenterCardReplacement.discardedCardData, args.soloCenterCardReplacement.newCenterCardData);
        this.tooltipHandler.addTooltipToCards();
        this.players[args.player_id].updateScoring(args.updatedScore);
        if (args.game_ended)
            this.players[args.player_id].setGameEnded(true);
    }
    async notif_displayEndGameScoring(args) {
        console.log('notif_displayEndGameScoring', args);
        this.updateStatusText(_('Reef scores coming up!'));
        await this.endGameScoringHandler.displayEndGameScore(args.endGameScoring);
    }
}

export { Game };
