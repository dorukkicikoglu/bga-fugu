import { Game } from "./Game";

const GAP_TO_TARGET = 10;
const VIEWPORT_MARGIN = 8;
const ARROW_HALF_WIDTH = 8;

export class ModalBoxHandler{
    private boxElement: HTMLDivElement;
    private arrowElement: HTMLDivElement;
    private resizeListener: () => void;

    constructor(private game: Game, private targetElement: HTMLElement, contentHTML: string, shouldNudge: boolean = false) {
        this.boxElement = document.createElement('div');
        this.boxElement.className = 'a-modal-box';
        this.boxElement.innerHTML = `
            <div class="a-modal-box-content">${contentHTML}</div>
            <div class="a-modal-box-arrow"></div>
        `;
        this.arrowElement = this.boxElement.querySelector('.a-modal-box-arrow');

        document.body.appendChild(this.boxElement);
        this.reposition();

        this.resizeListener = () => this.reposition();
        window.addEventListener('resize', this.resizeListener);

        if(shouldNudge)
            this.nudge();
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
        this.boxElement.remove();
    }
}
