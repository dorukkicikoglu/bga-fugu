import { Game } from "./Game";

export class TooltipHandler{
    constructor(private gameui: Game, private deckLength: number) { 
        this.addTooltipToCards();
	}

	public addTooltipToCards(){
        if(document.body.classList.contains('safari-browser') && this.gameui.isMobile()) {
            this.addTooltipToBottomForSafari();
            return;
        }
        const tooltipHTML = this.getTooltipHTML();
        this.gameui.bga.gameui.addTooltipHtmlToClass('a-card', tooltipHTML, 400);
    }

    private addTooltipToBottomForSafari(){
        if(!document.body.classList.contains('safari-browser') || !this.gameui.isMobile())
            return;

        if (document.querySelector('.safari-mobile-revealed-cards-container'))
            return;

        const tooltipHTML = this.getTooltipHTML();

        const safariMobileRevealedCardsContainer = document.createElement('div');
        safariMobileRevealedCardsContainer.className = 'safari-mobile-revealed-cards-container';
        document.getElementById('game_play_area').appendChild(safariMobileRevealedCardsContainer);

        document.querySelector('.safari-mobile-revealed-cards-container').innerHTML = tooltipHTML;
    }

    private getTooltipHTML(): string {
        const deckLengthText = _('Highest card count is {$deckLength}').replace('{$deckLength}', '<b>' + this.deckLength.toString() + '</b>');
        const tooltipHTML = `
            <div class="tooltip-wrapper">
                <div class="deck-length-text">${deckLengthText}</div>
                <div class="a-card reference-card"></div>
            </div>
        `;

        return tooltipHTML;
    }
}