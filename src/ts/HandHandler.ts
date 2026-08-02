import { Game } from "./Game";
import { PlayerHandler } from "./PlayerHandler";

export class HandHandler{
    private static readonly MOBILE_HAND_SPAN_PERCENT = 99; //cards should span 98%-100% of the container's width
    private static readonly FACEDOWN_TO_FACEUP_OVERLAP_RATIO = 1.8; //facedown cards can overlap more since they don't need to stay readable
    private static readonly MIN_CLICKABLE_CARD_PERCENT = 1; //facedown cards are clickable, so at least this much of one must stay uncovered

    private handContainer: HTMLDivElement;
    private cardsContainer: HTMLDivElement;
    private isMyHand: boolean = false;
    private mobileSpacingApplied: boolean = false;
    private resizeDebounceTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor(private game: Game, private owner: PlayerHandler, private handData: CardInHand[]) {
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
                <div class="my-hand-title">
                    <i class="passed-indicator fa6 fa-ban"></i>
                    <div class="my-hand-title-text">${handTitleText}</div>
                </div>
                <div class="cards-container"></div>
            `;

            parent.appendChild(this.handContainer);
        }

        this.cardsContainer = (this.handContainer && this.handContainer.querySelector('.cards-container')) as HTMLDivElement;
        this.cardsContainer.addEventListener('click', (event: Event) => { this.cardsContainerClicked(event); });

        this.displayHand();
    }

    //called by Game.onScreenWidthChange (BGA's resize hook, covers orientation changes too) since screen dimensions
    //can change without this hand's contents changing, so spacing needs recomputing on its own trigger too
    public recomputeMobileCardSpacing(){
        if(!this.game.isMobile()){
            for(let card of Array.from(this.cardsContainer.querySelectorAll('.a-card')) as HTMLDivElement[]){
                card.style.marginLeft = null;
                card.style.marginRight = null;
            }
            return;
        }

        if(this.resizeDebounceTimeout)
            clearTimeout(this.resizeDebounceTimeout);

        this.resizeDebounceTimeout = setTimeout(() => this.applyMobileCardSpacing(), 100);
    }

    private displayHand(): void{
        this.cardsContainer.innerHTML = ''; // Clear existing cards

        for(let cardData of this.handData)
            this.insertCardToHand(cardData);

        this.updateMobileCardSpacing();
    }

    private insertCardToHand(cardData){ 
        let aCard = this.game.createCardDiv(cardData);
        
        aCard.setAttribute('data-state-in-hand', cardData.state_in_hand);
        aCard.setAttribute('data-location-in-hand', cardData.location_in_hand);

        aCard.style.zIndex = cardData.location_in_hand.toString();

        this.cardsContainer.appendChild(aCard);
    }

    public setHandTitle(title: string): void{
        const titleElement = this.handContainer.querySelector('.my-hand-title-text');
        if(titleElement)
            titleElement.textContent = title;
    }

    private cardsContainerClicked(event: Event){
        if(!this.isMyHand)
            return;

        if(!this.game.bga.players.isCurrentPlayerActive())
            return;

        if(!['PlayerTurn'].includes(this.game.getGameStateName()))
            return;

        if(this.game.bga.gameui.isInterfaceLocked())
            return;

        if(!(event.target as HTMLElement).classList.contains('a-card'))
            return;
        
        if((event.target as HTMLDivElement).getAttribute('data-state-in-hand') !== 'facedown')
            return;

        this.handCardClicked(event.target as HTMLDivElement);  
    }

    private handCardClicked(cardDiv: HTMLDivElement){
        const selectedCardClass = 'selected-hand-card';
        const cardWasAlreadySelected: boolean = cardDiv.classList.contains(selectedCardClass);
        this.cardsContainer.querySelectorAll('div.a-card').forEach((card) => card.classList.remove(selectedCardClass));
        
        if(cardWasAlreadySelected){
            this.game.centerHandler.cardsUnselected();
            return;
        }

        cardDiv.classList.add(selectedCardClass);
        this.game.centerHandler.checkBothCardsSelected(cardDiv);
    }

    public async animateCardSwap(handCardLocation: number, cardInCenter: CardInCenter, cardInHand: CardInHand, newStateInHand: CardStateInHand){
        const centerContainer = this.game.centerHandler.getCenterContainer();
        const cardsContainer: HTMLDivElement = this.getHandContainer().querySelector('.cards-container');
        centerContainer.querySelectorAll('.a-card.selected-center-card').forEach(element => element.classList.remove('selected-center-card'));
        cardsContainer.querySelectorAll('.a-card.selected-hand-card').forEach(element => element.classList.remove('selected-hand-card'));

        const centerCard = centerContainer.querySelector(`[data-card-id="${cardInCenter.card_id}"]`) as HTMLDivElement;
        const handCard = cardsContainer.querySelector(`[data-location-in-hand="${handCardLocation}"]`) as HTMLDivElement;
        const handCardClone = this.game.createCardDiv(cardInHand);
        handCardClone.classList.add('cloned-card');

        if(!centerCard || !handCard || !handCardClone)
            return;

        const centerCardClone = this.game.cloneCard(centerCard);
        handCard.insertAdjacentElement('afterend', centerCardClone);
        centerCard.insertAdjacentElement('afterend', handCardClone);

        centerCardClone.style.margin = '0';
        handCardClone.style.margin = '0';

	    this.game.placeOnObject(centerCardClone, centerCard);
	    this.game.placeOnObject(handCardClone, handCard);

        centerCard.style.opacity = '0';
        handCard.style.opacity = '0';
        centerCardClone.style.zIndex = handCard.style.zIndex

        const pullUpAnimTime = 200;
        centerCardClone.style.transition = `top ${pullUpAnimTime}ms ease`;
	    centerCardClone.style.top = `${parseFloat(centerCardClone.style.top || '0') - 20}px`;

        await this.game.bga.gameui.wait(pullUpAnimTime + 50);

        cardsContainer.style.zIndex = '100';
        centerContainer.style.zIndex = '300';

        const cardMoveAnimTime = 700;
        centerCardClone.style.transition = `inset ${cardMoveAnimTime}ms ease, transform ${cardMoveAnimTime}ms ease`;
        handCardClone.style.transition = `inset ${cardMoveAnimTime}ms ease`;

        centerCardClone.style.top = handCard.offsetTop + 'px';
        centerCardClone.style.left = handCard.offsetLeft + 'px';
        handCardClone.style.top = centerCard.offsetTop + 'px';
        handCardClone.style.left = centerCard.offsetLeft + 'px';

        if(newStateInHand == 'anchor'){
            centerCardClone.style.boxShadow = 'none';
            centerCardClone.style.transform = 'rotate(180deg)';
        }
        
        await this.game.bga.gameui.wait(cardMoveAnimTime);

        cardsContainer.style.zIndex = null;
        
        handCardClone.classList.remove('cloned-card');
        handCardClone.style.margin = null;
        handCardClone.style.top = null;
        handCardClone.style.left = null;
        handCardClone.style.transition = null;

        cardsContainer.querySelectorAll('.a-card.last-taken-card').forEach((card) => { card.classList.remove('last-taken-card'); });

        centerCardClone.classList.remove('cloned-card');
        centerCardClone.style.margin = null;
        centerCardClone.style.top = null;
        centerCardClone.style.left = null;
        centerCardClone.style.transition = null;
        centerCardClone.style.boxShadow = null;
        centerCardClone.style.transform = null;
        centerCardClone.classList.add('last-taken-card'); //this class is needed in HandHandler.updateMobileCardSpacing
        centerCardClone.setAttribute('data-state-in-hand', newStateInHand);
        centerCardClone.setAttribute('data-location-in-hand', cardInHand.location_in_hand.toString());

        centerContainer.style.zIndex = null;

        centerCard.replaceWith(handCardClone);
        handCard.replaceWith(centerCardClone);
    }

    public updateMobileCardSpacing(){
        if(!this.game.isMobile())
            return;

        if(!this.mobileSpacingApplied){ //page load, nothing to animate from
            this.applyMobileCardSpacing();
            this.mobileSpacingApplied = true;
            return;
        }

        const lastTakenCard: HTMLDivElement = this.cardsContainer.querySelector('.last-taken-card');
        if(!lastTakenCard)
            return;

        //the card that was just swapped in occupied this hand slot as a facedown card a moment ago; simulate that to
        //capture what the layout looked like right before this change, so the margin change below can be animated (FLIP)
        const lastTaken_stateInHand: string = lastTakenCard.getAttribute('data-state-in-hand');
        lastTakenCard.setAttribute('data-state-in-hand', 'facedown');

        const cards: HTMLDivElement[] = Array.from(this.cardsContainer.querySelectorAll('.a-card:not(.cloned-card)'));
        this.applyMobileCardSpacing();
        const initialMargins = cards.map(card => {
            const computed = getComputedStyle(card);
            return { left: parseFloat(computed.marginLeft), right: parseFloat(computed.marginRight) };
        });

        lastTakenCard.setAttribute('data-state-in-hand', lastTaken_stateInHand);
        this.applyMobileCardSpacing();
        const afterMargins = cards.map(card => {
            const computed = getComputedStyle(card);
            return { left: parseFloat(computed.marginLeft), right: parseFloat(computed.marginRight) };
        });

        for(let i = 0; i < cards.length; i++){
            cards[i].style.marginLeft = initialMargins[i].left.toString() + 'px';
            cards[i].style.marginRight = initialMargins[i].right.toString() + 'px';
        };

        const slidingTime = 300;
        for(let i = 0; i < cards.length; i++){
            setTimeout(() => {
                cards[i].style.transition = `margin ${slidingTime}ms ease`;
                cards[i].style.marginLeft = afterMargins[i].left.toString() + 'px';
                cards[i].style.marginRight = afterMargins[i].right.toString() + 'px';
            }, 10);
        };

        //once the slide finishes, swap the px snapshot back out for freshly computed %-based margins (there's no CSS
        //fallback to hand off to anymore, and % keeps the spacing correct if the container gets resized later)
        setTimeout(() => {
            cards.forEach(card => card.style.transition = null);
            this.applyMobileCardSpacing();
        }, 10 + slidingTime);
    }

    //computes margin-left/margin-right for every card so the row spans MOBILE_HAND_SPAN_PERCENT of the container width,
    //split so facedown cards absorb most of the overlap and faceup cards stay more visible (FACEDOWN_TO_FACEUP_OVERLAP_RATIO).
    //margin-left is always 0% and the last card's margin-right is always 0%, so the visible span runs exactly from the
    //first card's left edge to the last card's right edge and stays centered no matter which card is first or last
    private applyMobileCardSpacing(){
        const cards: HTMLDivElement[] = Array.from(this.cardsContainer.querySelectorAll('.a-card:not(.cloned-card)'));
        if(cards.length === 0)
            return;

        const containerWidth = this.cardsContainer.getBoundingClientRect().width;
        const cardWidthPercent = (cards[0].getBoundingClientRect().width / containerWidth) * 100;
        const isFacedown = (card: HTMLDivElement) => card.getAttribute('data-state-in-hand') === 'facedown';

        const gapCards = cards.slice(0, -1); //every card but the last pulls its next sibling closer via margin-right
        const facedownGapCount = gapCards.filter(isFacedown).length;
        const faceupGapCount = gapCards.length - facedownGapCount;

        const requiredOverlapPercent = HandHandler.MOBILE_HAND_SPAN_PERCENT - cards.length * cardWidthPercent;
        const spreadDenominator = HandHandler.FACEDOWN_TO_FACEUP_OVERLAP_RATIO * facedownGapCount + faceupGapCount;
        let faceupMarginPercent = spreadDenominator !== 0 ? requiredOverlapPercent / spreadDenominator : 0;
        let facedownMarginPercent = faceupMarginPercent * HandHandler.FACEDOWN_TO_FACEUP_OVERLAP_RATIO;

        //never let a facedown card's own overlap cover it entirely (it needs to stay tappable); whatever squeeze it can no
        //longer absorb gets pushed onto the faceup cards instead, so the row still lands on the same total target width
        const minFacedownMarginPercent = -(cardWidthPercent - HandHandler.MIN_CLICKABLE_CARD_PERCENT);
        if(facedownMarginPercent < minFacedownMarginPercent){
            const shortfallTotal = facedownGapCount * (minFacedownMarginPercent - facedownMarginPercent);
            facedownMarginPercent = minFacedownMarginPercent;
            if(faceupGapCount > 0)
                faceupMarginPercent -= shortfallTotal / faceupGapCount;
        }

        cards.forEach((card, i) => {
            card.style.marginLeft = '0%';
            card.style.marginRight = (i === cards.length - 1) ? '0%' : `${(isFacedown(card) ? facedownMarginPercent : faceupMarginPercent).toFixed(3)}%`;
        });
    }

    public setMyHand(isMyHand: boolean): void{
        this.isMyHand = isMyHand;
        this.handContainer.setAttribute('data-is-myself', isMyHand ? 'true' : 'false');
    }
    public getHandContainer(): HTMLDivElement{ return this.handContainer;}
}