import { Game } from "./Game";

interface LogRowData { //this is used to return strings containing log-class-tag divs
    log_html: string;
    log_class: string;
}

export class LogMutationObserver{
	private nextTimestampValue:string = '';

    constructor(private game: Game) {
		this.observeLogs();
    }

    private observeLogs(): void{
        let observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node: HTMLDivElement) => {
                        if (node.nodeType === 1 && node.tagName.toLowerCase() === 'div' && node.classList.contains('log')){
                            this.processLogDiv(node);
                        }
                    });
                }
            });
        });

        // Configure the MutationObserver to observe changes to the container's child nodes
        const config = {
            childList: true,
            subtree: true // Set to true if you want to observe all descendants of the container
        };

        // Start observing the container
        observer.observe($('logs'), config);
        observer.observe($('chatbar'), config); //mobile notifs

        if(g_archive_mode){ //to observe replayLogs that appears at the bottom of the page on replays
            let replayLogsObserverStarted = false;
            const replayLogsObserver = new MutationObserver((mutations, obs) => {
              for (const mutation of mutations) {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach((node: HTMLDivElement) => {
                        if(!replayLogsObserverStarted && node instanceof HTMLElement && node.id.startsWith('replaylogs')) {
                            this.processLogDiv(node);
                        }
                    });
                }
              }
            });
            replayLogsObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    private processLogDiv(node: HTMLDivElement): void{
        const classTags: HTMLDivElement[] = Array.from(node.querySelectorAll('*[log-class-tag]'));

        for(const classTag of classTags){
            const logClassName: string = classTag.getAttribute('log-class-tag');

            let parentLog: HTMLDivElement = null;
            let current: HTMLDivElement = classTag;
            while (current) {
                if (current.classList.contains('gamelogreview') || current.classList.contains('log')) {
                    parentLog = current;
                    break;
                }
                current = current.parentElement as HTMLDivElement;
            }

            if(parentLog)
                parentLog.classList.add('a-game-log', logClassName);
        }

        classTags.forEach(classTag => classTag.remove());
        
        node.querySelectorAll('.playername').forEach((playerName: HTMLElement) => {
            playerName.setAttribute('player-color', this.game.rgbToHex(window.getComputedStyle(playerName).color));
        });

        if(this.game.isDesktop() && node.classList.contains('a-game-log')){
            let timestamp: HTMLDivElement[] = Array.from(node.querySelectorAll('.timestamp'));
            if(timestamp.length > 0){
                this.nextTimestampValue = timestamp[0].innerText;
            } else if(this.observeLogs.hasOwnProperty('nextTimestampValue')){
                let newTimestamp: HTMLDivElement = document.createElement('div');
                newTimestamp.classList.add('timestamp');
                newTimestamp.innerHTML = this.nextTimestampValue;

                node.appendChild(newTimestamp);
            }
        }
    }

    private addLogClassTag(logHTML: string, logClass: string): LogRowData { return { log_html: logHTML + `<div log-class-tag="${logClass}"></div>`, log_class: logClass }; }

    //create specific log types
    public createLogSwapCards(swapData: CardSwapData): LogRowData {
        const centerCardIcon = `<div class="minimised-card-icon">${this.game.createCardDiv(swapData.cardInCenter).outerHTML}</div>`;
        const handCardIcon = `<div class="minimised-card-icon">${this.game.createCardDiv(swapData.cardInHand).outerHTML}</div>`;

        let logHTML = `
            <div class="swap-cards-row">
                ${this.game.divColoredPlayer(swapData.player_id, {class: 'playername'}, false)}
                ${centerCardIcon}
                <i class="log-arrow log-arrow-exchange fa6 fa-exchange"></i>
                ${handCardIcon}
            </div>` + ' &nbsp;';

        return this.addLogClassTag(logHTML, 'swap-cards-log');
    }

    public createLogCenterCardReplaced(soloCenterCardReplacement: soloCenterCardReplacement): LogRowData {
        const discardedCardIcon = `<div class="minimised-card-icon">${this.game.createCardDiv(soloCenterCardReplacement.discardedCardData).outerHTML}</div>`;
        const newCenterCardIcon = `<div class="minimised-card-icon">${this.game.createCardDiv(soloCenterCardReplacement.newCenterCardData).outerHTML}</div>`;

        let logHTML = `
            <div class="center-card-replaced-row">
                <i class="log-arrow log-arrow-right-1 fa6 fa-arrow-right"></i>
                ${newCenterCardIcon}
                ${discardedCardIcon}
                <i class="log-arrow log-arrow-right-2 fa6 fa-arrow-right"></i>
            </div>` + ' &nbsp;';

        return this.addLogClassTag(logHTML, 'center-card-replaced-log');
    }
}