interface BubbleSetting{ maxBubbleCount: number, minScheduleTime: number, maxScheduleTime: number }

import { Game } from "./Game";

const BUBBLE_AMOUNT_BY_PREF: Record<number, BubbleSetting> = {
    0: {maxBubbleCount: 0, minScheduleTime: 0, maxScheduleTime: 0},  // off
    1: {maxBubbleCount: 3, minScheduleTime: 2000, maxScheduleTime: 5000},  // low
    2: {maxBubbleCount: 8, minScheduleTime: 1000, maxScheduleTime: 2000},  // mid
    3: {maxBubbleCount: 20, minScheduleTime: 500, maxScheduleTime: 1000}, // intense
    4: {maxBubbleCount: 50, minScheduleTime: 150, maxScheduleTime: 350}, // bubble bath
};

export class BackgroundHandler{
  private backgroundContainer: HTMLDivElement;
  private bubblesContainer: HTMLDivElement;
  private targetBubbleSetting: BubbleSetting = BUBBLE_AMOUNT_BY_PREF[1];
  private bubblesInitialized = false;

  constructor(private gameui: Game) {
    this.backgroundContainer = document.createElement('div');
    this.backgroundContainer.classList.add('background-container');
    document.body.insertAdjacentElement('afterbegin', this.backgroundContainer);

    this.bubblesContainer = document.createElement('div');
    this.bubblesContainer.classList.add('bubbles-container');
    this.backgroundContainer.appendChild(this.bubblesContainer);
  }

  public adjustBubbleAmount(prefValue: number){
    this.targetBubbleSetting = BUBBLE_AMOUNT_BY_PREF[prefValue] ?? BUBBLE_AMOUNT_BY_PREF[0];

    if(!this.bubblesInitialized){
      const initialBubbleCount = Math.floor(Math.random() * (this.targetBubbleSetting.maxBubbleCount / 2));
      for(let i = 0; i < initialBubbleCount; i++)
        this.createBubble();

      this.scheduleNextBubble();
      this.bubblesInitialized = true;
      return;
    }
    
    //fade out and destroy bubbles
    const bubbles: HTMLDivElement[] = Array.from(this.bubblesContainer.querySelectorAll('.bubble'));

    while(bubbles.length > this.targetBubbleSetting.maxBubbleCount){
      const randomBubbleIndex = Math.floor(Math.random() * bubbles.length);
      const bubbleToPop = bubbles[randomBubbleIndex];
      bubbles[randomBubbleIndex] = bubbles[bubbles.length - 1];
      bubbles.length--;

      const bubbleOpacity = bubbleToPop.querySelector('.bubble-opacity') as HTMLDivElement;
      bubbleOpacity.style.transition = 'opacity 0.2s ease-out';
      bubbleOpacity.style.opacity = '0';

      bubbleOpacity.addEventListener('transitionend', () => {
        bubbleToPop.remove();
      }, { once: true });
    }
  }

  private scheduleNextBubble(){
    const delay = this.targetBubbleSetting.minScheduleTime + Math.random() * (this.targetBubbleSetting.maxScheduleTime - this.targetBubbleSetting.minScheduleTime);
    setTimeout(() => {
        if(this.bubblesContainer.childElementCount < this.targetBubbleSetting.maxBubbleCount)
            this.createBubble();
        this.scheduleNextBubble();
    }, delay);
  }

  private createBubble(){
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
    bubble.style.left = `${Math.random() * 100}%`;
    bubble.style.animationDuration = `${duration}s`;

    if(!bubblesInitialized)
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
