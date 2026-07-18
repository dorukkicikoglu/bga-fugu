import { Game } from "./Game";

export class BackgroundHandler{
    private backgroundContainer: HTMLDivElement;
    private bubblesContainer: HTMLDivElement;

    constructor(private gameui: Game) {
      this.backgroundContainer = document.createElement('div');
      this.backgroundContainer.classList.add('background-container');
      document.body.insertAdjacentElement('afterbegin', this.backgroundContainer);

      this.bubblesContainer = document.createElement('div');
      this.bubblesContainer.classList.add('bubbles-container');
      this.backgroundContainer.appendChild(this.bubblesContainer);

      const initialBubbleCount = 2 + Math.floor(Math.random() * 3);
      for(let i = 0; i < initialBubbleCount; i++)
        this.createBubble();

      this.scheduleNextBubble();
    }

    private scheduleNextBubble(){
        const delay = 3000 + Math.random() * 2000;
        setTimeout(() => {
            this.createBubble();
            this.scheduleNextBubble();
        }, delay);
    }

    private createBubble(){
        const bubble = document.createElement('div');
        bubble.classList.add('bubble');

        const swing = document.createElement('div');
        swing.classList.add('bubble-swing');
        bubble.appendChild(swing);

        const size = 6 + Math.random() * 34;
        const duration = `${12 + Math.random() * 4}s`;
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.left = `${Math.random() * 100}%`;
        bubble.style.animationDuration = duration;

        swing.style.setProperty('--drift', `${(Math.random() * 80) - 40}px`);
        swing.style.setProperty('--rotation', `${(Math.random() * 720) - 360}deg`);
        swing.style.setProperty('--wobble-1', `${10 + Math.random() * 20 * (Math.random() > 0.5 ? 1 : -1)}px`);
        swing.style.setProperty('--wobble-2', `${10 + Math.random() * 20 * (Math.random() > 0.5 ? 1 : -1)}px`);
        swing.style.setProperty('--wobble-3', `${10 + Math.random() * 20 * (Math.random() > 0.5 ? 1 : -1)}px`);
        swing.style.setProperty('--wobble-4', `${10 + Math.random() * 20 * (Math.random() > 0.5 ? 1 : -1)}px`);
        swing.style.animationDuration = duration;

        bubble.addEventListener('animationend', () => bubble.remove());
        this.bubblesContainer.appendChild(bubble);
    }
}
