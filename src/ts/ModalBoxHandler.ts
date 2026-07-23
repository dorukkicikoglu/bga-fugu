import { Game } from "./Game";

const GAP_TO_TARGET = 10;
const VIEWPORT_MARGIN = 8;
const ARROW_HALF_WIDTH = 8;

export class ModalBoxHandler{
    private boxElement: HTMLDivElement;
    private arrowElement: HTMLDivElement;
    private loadingBarElement: HTMLDivElement | null;
    private resizeListener: () => void;
    private loadingBarTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor(
        private game: Game,
        private targetElement: HTMLElement,
        contentHTML: string,
        shouldNudge: boolean = false,
        loadingBarDurationMs: number | null = null,
        onLoadingBarComplete?: () => void
    ) {
        this.boxElement = document.createElement('div');
        this.boxElement.className = 'a-modal-box';
        this.boxElement.innerHTML = `
            <div class="a-modal-box-inner">
                ${loadingBarDurationMs !== null ? '<div class="a-modal-box-loading-bar"></div>' : ''}
                <div class="a-modal-box-content">${contentHTML}</div>
            </div>
            <div class="a-modal-box-arrow"></div>
        `;
        this.arrowElement = this.boxElement.querySelector('.a-modal-box-arrow');
        this.loadingBarElement = this.boxElement.querySelector('.a-modal-box-loading-bar');

        document.body.appendChild(this.boxElement);
        this.reposition();

        this.resizeListener = () => this.reposition();
        window.addEventListener('resize', this.resizeListener);

        if(shouldNudge)
            this.nudge();

        setTimeout(() => { 
            this.startLoadingBar(loadingBarDurationMs, onLoadingBarComplete); }, 
        shouldNudge ? 80 : 0);
    }

    private startLoadingBar(durationMs: number, onComplete?: () => void): void {
        if(!this.loadingBarElement)
            return;

        this.loadingBarElement.style.transitionDuration = `${durationMs}ms`;

        requestAnimationFrame(() => requestAnimationFrame(() => {
            if(this.loadingBarElement)
                this.loadingBarElement.style.transform = 'scaleX(1)';
        }));

        this.loadingBarTimeout = setTimeout(() => {
            this.loadingBarTimeout = null;
            this.hideLoadingBar();
            onComplete?.();
        }, durationMs);
    }

    private hideLoadingBar(): void {
        if(!this.loadingBarElement)
            return;

        this.loadingBarElement.style.transitionProperty = 'opacity';
        this.loadingBarElement.style.transitionDuration = '250ms';
        this.loadingBarElement.style.opacity = '0';
    }

    public nudge(): void {
        this.boxElement.classList.remove('modal-box-nudge');
        void this.boxElement.offsetWidth; // restart the animation if it's already running
        this.boxElement.classList.add('modal-box-nudge');
        this.boxElement.addEventListener('animationend', () => {
            this.boxElement.classList.remove('modal-box-nudge');
        }, { once: true });
    }

    private reposition(): void {
        const targetRect = this.targetElement.getBoundingClientRect();
        const boxRect = this.boxElement.getBoundingClientRect();

        const placeAbove = (targetRect.top - boxRect.height - GAP_TO_TARGET) >= VIEWPORT_MARGIN;

        const top = placeAbove
            ? targetRect.top - boxRect.height - GAP_TO_TARGET
            : targetRect.bottom + GAP_TO_TARGET;

        const targetCenterX = targetRect.left + targetRect.width / 2;
        const left = Math.max(VIEWPORT_MARGIN, Math.min(targetCenterX - boxRect.width / 2, window.innerWidth - boxRect.width - VIEWPORT_MARGIN));

        this.boxElement.style.top = `${top + window.scrollY}px`;
        this.boxElement.style.left = `${left + window.scrollX}px`;

        this.boxElement.classList.toggle('modal-box-above', placeAbove);
        this.boxElement.classList.toggle('modal-box-below', !placeAbove);

        const arrowLeft = Math.max(ARROW_HALF_WIDTH, Math.min(targetCenterX - left, boxRect.width - ARROW_HALF_WIDTH));
        this.arrowElement.style.left = `${arrowLeft}px`;
    }

    public destroy(): void {
        window.removeEventListener('resize', this.resizeListener);

        if(this.loadingBarTimeout)
            clearTimeout(this.loadingBarTimeout);

        this.boxElement.remove();
    }
}
