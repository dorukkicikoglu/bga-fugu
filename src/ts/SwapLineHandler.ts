import { Game } from "./Game";

const SWAP_LINE_THICKNESS = 3; //px
const SWAP_LINE_DASH_LENGTH = 12; //px
const SWAP_LINE_GAP_LENGTH = 8; //px
const SWAP_LINE_SPEED = 8; //px per second
const SWAP_LINE_OPACITY = 0.5; //0 to 1
const SWAP_LINE_MOBILE_INSET_X = 8; //px, distance from the reef card's left edge
const SWAP_LINE_MOBILE_INSET_Y = 0; //px, distance down from the reef card's top edge

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

//draws the marching dashed line between the two cards selected for a swap. Display only: the selection itself lives in
//the DOM (the selected-center-card/selected-hand-card classes), and refresh() re-derives everything from there, so the
//overlay and its listeners only exist while both cards are selected
export class SwapLineHandler{
    private overlay: SVGSVGElement | null = null;
    private line: SVGLineElement | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private mutationObserver: MutationObserver | null = null;
    private pendingFrame: number | null = null;

    //a single frame can bring several triggers at once (eg. a resize also fires the observers), so they're coalesced
    private readonly scheduleRefresh = (): void => {
        if(this.pendingFrame !== null)
            return;

        this.pendingFrame = requestAnimationFrame(() => {
            this.pendingFrame = null;
            this.refresh();
        });
    };

    constructor(private game: Game) {
    }

    //draws or moves the line if both cards are selected, otherwise removes it
    public refresh(): void{
        const centerCard = this.game.centerHandler.getCenterContainer().querySelector('.selected-center-card');
        const handCard = this.game.myself?.getHand().getHandContainer().querySelector('.selected-hand-card');

        if(!centerCard || !handCard){
            this.hide();
            return;
        }

        if(!this.overlay)
            this.create();

        //CenterHandler puts this class on both selected cards when the pairing would force anchor mode, which is what turns their glow blue
        this.overlay.classList.toggle('anchor-placement', centerCard.classList.contains('swap-preview-anchor'));

        const overlayRect = this.game.getPos(this.overlay);
        const centerCardRect = this.game.getPos(centerCard);
        const handCardRect = this.game.getPos(handCard);

        //runs from the upper card's bottom edge to the lower card's top edge, going by where the cards actually are
        //rather than by which container they're in, so it holds up if the layout changes
        const centerCardIsUpper = centerCardRect.top + centerCardRect.height / 2 <= handCardRect.top + handCardRect.height / 2;
        const centerCardEdgeY = centerCardIsUpper ? centerCardRect.top + centerCardRect.height : centerCardRect.top;
        const handCardEdgeY = centerCardIsUpper ? handCardRect.top : handCardRect.top + handCardRect.height;

        //mobile reef cards overlap so that only their left part shows, so the line aims for the top-left corner instead of the top centre
        const aimForMobileCorner = this.game.isMobile() && centerCardIsUpper;
        const handCardX = aimForMobileCorner ? handCardRect.left + SWAP_LINE_MOBILE_INSET_X : handCardRect.left + handCardRect.width / 2;
        const handCardY = aimForMobileCorner ? handCardEdgeY + SWAP_LINE_MOBILE_INSET_Y : handCardEdgeY;

        this.line.setAttribute('x1', (centerCardRect.left + centerCardRect.width / 2 - overlayRect.left).toString());
        this.line.setAttribute('y1', (centerCardEdgeY - overlayRect.top).toString());
        this.line.setAttribute('x2', (handCardX - overlayRect.left).toString());
        this.line.setAttribute('y2', (handCardY - overlayRect.top).toString());
    }

    //safe to call unconditionally
    public hide(): void{
        if(!this.overlay)
            return;

        if(this.pendingFrame !== null)
            cancelAnimationFrame(this.pendingFrame);
        this.pendingFrame = null;

        this.resizeObserver.disconnect();
        this.mutationObserver.disconnect();
        window.removeEventListener('resize', this.scheduleRefresh);
        window.removeEventListener('scroll', this.scheduleRefresh, { capture: true });

        this.overlay.remove();
        this.overlay = null;
        this.line = null;
    }

    private create(): void{
        const patternLength = SWAP_LINE_DASH_LENGTH + SWAP_LINE_GAP_LENGTH;

        this.overlay = document.createElementNS(SVG_NAMESPACE, 'svg');
        this.overlay.id = 'swap-line-overlay';
        this.overlay.setAttribute('aria-hidden', 'true');
        this.overlay.style.setProperty('--swap-line-thickness', `${SWAP_LINE_THICKNESS}px`);
        this.overlay.style.setProperty('--swap-line-opacity', `${SWAP_LINE_OPACITY}`);
        this.overlay.style.setProperty('--swap-line-dash-length', `${SWAP_LINE_DASH_LENGTH}px`);
        this.overlay.style.setProperty('--swap-line-gap-length', `${SWAP_LINE_GAP_LENGTH}px`);
        //one loop moves the dashes by exactly one pattern length, so it stays seamless at any speed
        this.overlay.style.setProperty('--swap-line-end-offset', `${-patternLength}px`);
        this.overlay.style.setProperty('--swap-line-duration', `${patternLength / SWAP_LINE_SPEED}s`);

        this.line = document.createElementNS(SVG_NAMESPACE, 'line');
        this.overlay.appendChild(this.line);

        const gameArea = this.game.bga.gameArea.getElement();
        const centerContainer = this.game.centerHandler.getCenterContainer();
        const cardsContainer = this.game.myself.getHand().getHandContainer().querySelector('.cards-container');
        gameArea.appendChild(this.overlay);

        window.addEventListener('resize', this.scheduleRefresh);
        window.addEventListener('scroll', this.scheduleRefresh, { capture: true, passive: true }); //capture: scroll events don't bubble, and this also catches inner scrollable ancestors

        //the game area also covers anything above the reef changing height and pushing it down
        this.resizeObserver = new ResizeObserver(this.scheduleRefresh);
        [gameArea, centerContainer, cardsContainer].forEach((element) => this.resizeObserver.observe(element));

        //cards can move without any container resizing: HandHandler spaces mobile reefs through inline margins, and a
        //card being replaced changes nothing about the row's size. class is watched too, in case a selection gets
        //cleared by something other than a click, eg. a swap arriving as a notification (animateCardSwap)
        this.mutationObserver = new MutationObserver(this.scheduleRefresh);
        [centerContainer, cardsContainer].forEach((element) => this.mutationObserver.observe(element, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] }));
    }
}
