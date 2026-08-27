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
  private static readonly POP_INVULNERABLE_MS = 500;
  private static readonly PARALLAX_SPEED_BACK = 0.075;
  private static readonly PARALLAX_SPEED_FRONT = 0.18;
  private static readonly PARALLAX_REFERENCE_HEIGHT = 500;
  private static readonly PUFFERFISH_RISE_SPEED_DESKTOP = 0.75;
  private static readonly PUFFERFISH_RISE_SPEED_MOBILE = 0.45;
  private static readonly PUFFERFISH_ROTATION_SPEED_DESKTOP = 0.35;
  private static readonly PUFFERFISH_ROTATION_SPEED_MOBILE = 0.45;
  private static readonly PUFFERFISH_JUMP_DISTANCE_DESKTOP = 0.3;
  private static readonly PUFFERFISH_JUMP_DISTANCE_MOBILE = 0.8;
  private static readonly PUFFERFISH_HOLD_FRACTION = 0.12;

  private backgroundContainer: HTMLDivElement;
  private backdropParallax: HTMLDivElement;
  private backgroundBackdrop: HTMLDivElement;
  private slidingPufferfish: HTMLDivElement;
  private foregroundParallax: HTMLDivElement;
  private backgroundForeground: HTMLDivElement;
  private bubblesContainer: HTMLDivElement;
  private targetBubbleSetting: BubbleSetting = BUBBLE_AMOUNT_BY_PREF[1];
  private bubblesInitialized = false;
  private bodyClickListener: (event: MouseEvent) => void;
  private nextBubbleTimeout: ReturnType<typeof setTimeout> | null = null;

  private pufferfishRiseSpeed: number;
  private pufferfishRotationSpeed: number;
  private parallaxSpeedBack: number;
  private parallaxSpeedFront: number;
  private latestScrollY = 0;
  private parallaxFramePending = false;

  constructor(private game: Game) {
    this.backgroundContainer = document.createElement('div');
    this.backgroundContainer.classList.add('background-container');
    document.body.insertAdjacentElement('afterbegin', this.backgroundContainer);

    //the gentle-parallax-* CSS animation already drives this element's own `transform` (translate3d + rotate),
    //and a running animation always wins the cascade over an inline style on the same property - so the
    //scroll-driven translate is applied to this dedicated wrapper instead, the same way .bubble-swing's
    //wobble is kept off the separate .bubble-pop-wrapper below
    this.backdropParallax = document.createElement('div');
    this.backdropParallax.classList.add('parallax-layer');
    this.backgroundContainer.appendChild(this.backdropParallax);

    this.backgroundBackdrop = document.createElement('div');
    this.backgroundBackdrop.classList.add('background-backdrop');
    this.backdropParallax.appendChild(this.backgroundBackdrop);

    //appended after backdropParallax and before foregroundParallax, so it starts out visually
    //covered by the foreground layer and only emerges once it rises above it while scrolling.
    //no CSS animation targets its transform, so it can be translated/rotated directly, no wrapper needed
    this.slidingPufferfish = document.createElement('div');
    this.slidingPufferfish.classList.add('sliding-pufferfish');
    this.backgroundContainer.appendChild(this.slidingPufferfish);

    //appended after backdropParallax so it renders on top of it, no z-index needed
    this.foregroundParallax = document.createElement('div');
    this.foregroundParallax.classList.add('parallax-layer');
    this.backgroundContainer.appendChild(this.foregroundParallax);

    this.backgroundForeground = document.createElement('div');
    this.backgroundForeground.classList.add('background-foreground');
    this.foregroundParallax.appendChild(this.backgroundForeground);

    this.bubblesContainer = document.createElement('div');
    this.bubblesContainer.classList.add('bubbles-container');
    //kept as a sibling, not a child, of backgroundBackdrop: backgroundBackdrop is animated with a
    //CSS transform (gentle-parallax-backdrop) and is offset/oversized relative to the viewport, and a transformed
    //ancestor becomes the containing block for position:fixed descendants - nesting bubblesContainer inside
    //it would offset bubbles away from the viewport-relative click coordinates they're placed at
    this.backgroundContainer.appendChild(this.bubblesContainer);

    this.bodyClickListener = (event: MouseEvent) => this.onBodyClick(event);
    document.body.addEventListener('click', this.bodyClickListener);

    this.bindBodyScroll();
  }

  private bindBodyScroll(){
    this.pufferfishRiseSpeed = this.game.isMobile() ? BackgroundHandler.PUFFERFISH_RISE_SPEED_MOBILE : BackgroundHandler.PUFFERFISH_RISE_SPEED_DESKTOP;
    this.pufferfishRotationSpeed = this.game.isMobile() ? BackgroundHandler.PUFFERFISH_ROTATION_SPEED_MOBILE : BackgroundHandler.PUFFERFISH_ROTATION_SPEED_DESKTOP;

    //capped at 1 so shorter windows aren't sped up past the tuned base speeds, only taller ones slowed down
    const heightFactor = Math.min(1, BackgroundHandler.PARALLAX_REFERENCE_HEIGHT / window.innerHeight);
    this.parallaxSpeedBack = BackgroundHandler.PARALLAX_SPEED_BACK * heightFactor;
    this.parallaxSpeedFront = BackgroundHandler.PARALLAX_SPEED_FRONT * heightFactor;

    //passive: the listener never calls preventDefault, so it doesn't have to wait for us before it can scroll.
    //the heavy work itself is deferred to a single rAF-batched update below, so bursts of scroll events
    //(fired far more often than the display refreshes on mobile) collapse into one style write per frame
    window.addEventListener('scroll', () => {
      this.latestScrollY = window.scrollY;

      if(this.parallaxFramePending)
        return;

      this.parallaxFramePending = true;
      requestAnimationFrame(() => this.updateParallax());
    }, { passive: true });
  }

  private updateParallax(){
    this.parallaxFramePending = false;
    const scrollY = this.latestScrollY;

    //read phase: all layout-triggering reads happen up front, before any styles below are written, so this
    //never has to force a synchronous layout (and every write below is transform-only, so it can't cause
    //the *next* frame's read to force one either)
    //looked up live rather than cached: it doesn't exist yet when BackgroundHandler is constructed (added later in Game.setup)
    const playerHandsContainer = document.getElementById('player-hands-container');
    const playerHandsBottom = playerHandsContainer ? playerHandsContainer.getBoundingClientRect().bottom + scrollY : Infinity;

    //write phase
    this.backdropParallax.style.transform = `translate3d(0, ${-scrollY * this.parallaxSpeedBack}px, 0)`;
    this.foregroundParallax.style.transform = `translate3d(0, ${-scrollY * this.parallaxSpeedFront}px, 0)`;

    const scrollPastPlayerHands = Math.max(0, scrollY - (playerHandsBottom - window.innerHeight * 0.6));
    if(scrollPastPlayerHands === 0){
      this.slidingPufferfish.style.display = null;      
      return;
    }

    //bounces up then back down: rises for the first maxRise of travel, then retraces the same
    //distance back down to its starting position, at which point it's hidden again below
    const maxRise = window.innerWidth * (this.game.isDesktop() ? BackgroundHandler.PUFFERFISH_JUMP_DISTANCE_DESKTOP : BackgroundHandler.PUFFERFISH_JUMP_DISTANCE_MOBILE); //proportional to screen width because that's what determines the distance between ocean surface and the rocks
    const riseDistance = scrollPastPlayerHands * this.pufferfishRiseSpeed;
    if(riseDistance >= maxRise * 2){
      this.slidingPufferfish.style.display = null;
      return;
    }

    this.slidingPufferfish.style.display = 'block';

    //eased bounce: quad ease-out into the top (decelerating), a short hold there, then quad ease-in
    //away from it (accelerating) back down - a linear reflection here looked like it hit an invisible
    //wall at the top instead of turning around
    const holdFraction = BackgroundHandler.PUFFERFISH_HOLD_FRACTION;
    const moveFraction = (1 - holdFraction) / 2;
    const progress = riseDistance / (maxRise * 2);

    let pufferfishY: number;
    if(progress < moveFraction){
      const p = progress / moveFraction;
      pufferfishY = -maxRise * (1 - (1 - p) * (1 - p)); //ease-out: fast start, slows into the top
    } else if(progress < moveFraction + holdFraction){
      pufferfishY = -maxRise; //hold at the top
    } else {
      const p = (progress - moveFraction - holdFraction) / moveFraction;
      pufferfishY = -maxRise * (1 - p * p); //ease-in: slow start, accelerates back to the bottom
    }

    this.slidingPufferfish.style.transform = `translate3d(0, ${pufferfishY}px, 0) rotate(${scrollPastPlayerHands * this.pufferfishRotationSpeed}deg)`;
  }

  private onBodyClick(event: MouseEvent){
    if(this.targetBubbleSetting.maxBubbleCount === 0)
      return;

    const hitBubble = this.getBubbleAt(event.clientX, event.clientY);
    if(hitBubble){
      const age = Date.now() - Number(hitBubble.dataset.createdAt);
      if(age >= BackgroundHandler.POP_INVULNERABLE_MS){
        this.popBubble(hitBubble);
        return;
      }
    }

    this.createBubble({ x: event.clientX, y: event.clientY });
  }

  private getBubbleAt(x: number, y: number): HTMLDivElement | null {
    const bubbles = Array.from(this.bubblesContainer.children) as HTMLDivElement[];
    for(let i = bubbles.length - 1; i >= 0; i--){
      const bubble = bubbles[i];
      if(bubble.classList.contains('popping'))
        continue;

      //hit-test against bubble-swing rather than bubble itself: the wobble animation's translateX/rotate
      //is applied there, so only its rect reflects where the bubble is actually rendered on screen
      const swing = bubble.querySelector('.bubble-swing') as HTMLDivElement;
      const rect = swing.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const radius = rect.width / 2;
      const dx = x - centerX;
      const dy = y - centerY;
      if(dx * dx + dy * dy <= radius * radius)
        return bubble;
    }
    return null;
  }

  private popBubble(bubble: HTMLDivElement){
    bubble.classList.add('popping');

    //pop plays on its own wrapper, never on bubble-swing, so the wobble's transform is never touched
    const popWrapper = bubble.querySelector('.bubble-pop-wrapper') as HTMLDivElement;
    popWrapper.addEventListener('animationend', (event) => {
      if(event.target === popWrapper)
        bubble.remove();
    });
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

    while(bubbles.length > this.targetBubbleSetting.maxBubbleCount){ //remove any extra bubbles from the previous higher setting
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

    if(this.nextBubbleTimeout !== null)
      clearTimeout(this.nextBubbleTimeout);
    this.scheduleNextBubble();
  }

  public displayMaxBubbles(){
    if(this.targetBubbleSetting.maxBubbleCount === 0)
      return;

    const highestKey = Math.max(...Object.keys(BUBBLE_AMOUNT_BY_PREF).map(Number));
    this.adjustBubbleAmount(highestKey);

    const initialBubbleCount = 20;

    let squirtDelay = 0;
    let slowDownBy = 1;
    while(squirtDelay <= 5000 + (initialBubbleCount * 1000)){
      const slowing: boolean = (squirtDelay > 5000);
      const bubbleCount = Math.max(1, slowing ? initialBubbleCount - slowDownBy : initialBubbleCount);
      slowDownBy += 1;
      squirtDelay += slowing ? 1000 : 500;

      setTimeout(() => {
        for(let i = 0; i <= bubbleCount; i++){
          this.createBubble(); 
        }
      }, squirtDelay);
    }
  }

  private scheduleNextBubble(){
    const delay = this.targetBubbleSetting.minScheduleTime + Math.random() * (this.targetBubbleSetting.maxScheduleTime - this.targetBubbleSetting.minScheduleTime);
    this.nextBubbleTimeout = setTimeout(() => {
        if(this.bubblesContainer.childElementCount < this.targetBubbleSetting.maxBubbleCount)
            this.createBubble();
        this.scheduleNextBubble();
    }, delay);
  }

  private createBubble(position?: { x: number, y: number }){
    const bubblesInitialized = this.bubblesInitialized; //to run even if bubblesInitialized gets changed elsewhere
    const bubble = document.createElement('div');
    bubble.classList.add('bubble');
    bubble.dataset.createdAt = `${Date.now()}`;

    const bubbleOpacity = document.createElement('div');
    bubbleOpacity.classList.add('bubble-opacity');
    bubble.appendChild(bubbleOpacity);

    const popWrapper = document.createElement('div');
    popWrapper.classList.add('bubble-pop-wrapper');
    bubbleOpacity.appendChild(popWrapper);

    const swing = document.createElement('div');
    swing.classList.add('bubble-swing');
    popWrapper.appendChild(swing);

    const size = 6 + Math.random() * 34;
    const duration = 12 + Math.random() * 4;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.animationDuration = `${duration}s`;

    if(position){
      bubble.style.left = `${position.x - size / 2}px`;
      bubble.style.top = `${position.y - size / 2}px`;
      bubble.style.bottom = 'auto';
    } else {
      bubble.style.left = `${Math.random() * 100}%`;
    }

    if(!bubblesInitialized)
      bubble.style.animationDelay = `${-1 * Math.random() * duration}s`;

    swing.style.setProperty('--drift', `${(Math.random() * 80) - 40}px`);
    swing.style.setProperty('--rotation', `${(Math.random() * 720) - 360}deg`);
    swing.style.setProperty('--wobble-1', `${10 + Math.random() * 20 * (Math.random() > 0.5 ? 1 : -1)}px`);
    swing.style.setProperty('--wobble-2', `${10 + Math.random() * 20 * (Math.random() > 0.5 ? 1 : -1)}px`);
    swing.style.setProperty('--wobble-3', `${10 + Math.random() * 20 * (Math.random() > 0.5 ? 1 : -1)}px`);
    swing.style.setProperty('--wobble-4', `${10 + Math.random() * 20 * (Math.random() > 0.5 ? 1 : -1)}px`);
    swing.style.animationDuration = `${duration}s`;

    bubble.addEventListener('animationend', (event) => {
      if(event.target === bubble)
        bubble.remove();
    });
    this.bubblesContainer.appendChild(bubble);
  }
}