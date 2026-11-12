import { Game } from "./Game";

export class TooltipHandler{
    constructor(private game: Game) { 
        this.addTooltipToCards();
        this.addTooltipToReefPlayers();
	}

    //the Reef title's avatar or name: the full title ("<name>'s Reef" or "Your Reef"), since the avatar has none
    private addTooltipToReefPlayers(){
        for(const player_id in this.game.players){
            const titleText = document.querySelector(`#reef-player-${player_id} .my-hand-title-text`)?.textContent || this.game.players[player_id].getPlayerName();
            this.game.bga.gameui.addTooltip('reef-player-' + player_id, titleText, '', 400);
        }
    }

	public addTooltipToCards(){
        if(document.body.classList.contains('safari-browser') && this.game.isMobile()) {
            this.addTooltipToBottomForSafari();
            return;
        }
        const tooltipHTML = this.getTooltipHTML();
        this.game.bga.gameui.addTooltipHtmlToClass('a-card', tooltipHTML, 400);
    }

    private addTooltipToBottomForSafari(){
        if(!document.body.classList.contains('safari-browser') || !this.game.isMobile())
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
        const deckLength = this.game.getDeckLength();
        const deckLengthText = _('Highest card value:') + '<br><b>' + deckLength.toString() + '</b>';
        const tooltipHTML = `
            <div class="tooltip-wrapper">
                <div class="deck-length-text">${deckLengthText}</div>
                <div class="a-card reference-card"></div>
            </div>
        `;

        return tooltipHTML;
    }
}