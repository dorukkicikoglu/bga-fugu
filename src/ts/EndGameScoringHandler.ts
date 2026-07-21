import { Game } from "./Game";

export class EndGameScoringHandler{
    private endGameScoring: EndGameScoreData;
    private scoreContainer: HTMLDivElement;
    private thead: HTMLTableSectionElement;
    private tbody: HTMLTableSectionElement;
    private showButton: HTMLButtonElement;
    private hideButton: HTMLButtonElement;
    private fastForwardButton: HTMLButtonElement;
    private soloScoreFlavorText: HTMLDivElement;
    private soloScoreFlavorImage: HTMLDivElement;
    private bodyClickHandler = null;
    private winner_ids: number[];
    private delayAfterFadeIns = 5000;
    private scoringRowNames = ['bannerfish', 'pufferfish', 'octopus', 'corals', 'anchor', 'soloDifficultyPenalty', 'totalScore'];

	constructor(private game: Game) { }

    public async displayEndGameScore(endGameScoring: EndGameScoreData) {
        this.endGameScoring = endGameScoring;
        
        if(this.scoreContainer){
            console.error('end-game-score-container already exists');
            return;
        }

        if(this.game.isSoloMode())
            this.game.soloDiscardDisplayHandler.showDiscardedCardIconsContainer(false);
        
        document.body.classList.add('displaying-end-game-score');

        this.endGameScoring.player_scores = endGameScoring.player_scores;
        this.winner_ids = endGameScoring.winner_ids;

        document.getElementById('end-game-score-container')?.remove();

        this.scoreContainer = document.createElement('div');
        this.scoreContainer.classList.add('end-game-score-container');
        this.scoreContainer.style.opacity = '0';
        this.scoreContainer.innerHTML = `
            <div class="show-table-button" style="display: none;" title="${_('Show Scoreboard')}">
                <i class="fa6 fa6-ranking-star"></i>
            </div> 
            <div class="maximized-content"> 
                <i class="fa6 fa6-chevron-circle-left collapse-table-button" title="${_('Collapse Scoreboard')}"></i>
                <table>
                    <thead></thead>
                    <tbody></tbody>
                </table>
                <div class="fast-forward-text"></div>
                ${this.game.isSoloMode() ? `
                    <div class="solo-score-flavor-container">
                        <div class="solo-score-flavor-image" style="display: none;"></div>
                        <div class="solo-score-flavor-text" style="opacity: 0;"></div>
                    </div>
                ` : ''}
            </div>
        `;

        document.querySelector('#game_play_area').appendChild(this.scoreContainer);

        this.thead = this.scoreContainer.querySelector('thead');
        this.tbody = this.scoreContainer.querySelector('tbody');
        this.showButton = this.scoreContainer.querySelector('.show-table-button');
        this.hideButton = this.scoreContainer.querySelector('.collapse-table-button');
        this.fastForwardButton = this.scoreContainer.querySelector('.fast-forward-text');
        this.soloScoreFlavorText = this.scoreContainer.querySelector('.solo-score-flavor-text');
        this.soloScoreFlavorImage = this.scoreContainer.querySelector('.solo-score-flavor-image');

        this.fillTable();
        this.bindShowHideButtons();

        this.fastForwardButton.innerHTML = '* ' + _(this.game.clickOrTap(true) + ' anywhere to fast forward');

        const instantFadeIn = this.game.getGameStateName() === 'EndScore';
        const fadeInDuration = instantFadeIn ? 0 : 1000;
        const fadeInDelay = instantFadeIn ? 0 : 100;

        this.scoreContainer.style.transition = `opacity ${fadeInDuration}ms ease ${fadeInDelay}ms`;
        this.scoreContainer.style.opacity = '1';

        await this.game.bga.gameui.wait(fadeInDelay + fadeInDuration);
        this.scoreContainer.style.opacity = null;
        this.scoreContainer.style.transition = null;
        this.bindBodyScroll();

        await this.fadeInNextCell();

        document.body.classList.remove('displaying-end-game-score');
    }

    private fillTable() {
        // Create header row with player names
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th class="corner-no-border-cell"></th>'; // Empty corner cell
        
        // Add player name columns
        for(let player_id in this.game.players) {
            const playerNameDiv = this.game.divColoredPlayer(player_id, {}, false);
            headerRow.innerHTML += `<th class="player-name-cell" player-id="${player_id}">${playerNameDiv}</th>`;
        }
        this.thead.appendChild(headerRow);

        // Add score rows
        for(let i = 0; i < this.scoringRowNames.length; i++) {
            const row = document.createElement('tr');
            const scoreType = this.scoringRowNames[i];

            if(scoreType == 'soloDifficultyPenalty' && !(this.game.isSoloMode() && this.game.isSoloExpertDifficulty)){
                continue;
            }
            const isSoloDifficultyPenalty = scoreType == 'soloDifficultyPenalty';
            const iconClass = isSoloDifficultyPenalty ? 'score-type-icon a-card' : 'score-type-icon';
            const facedownAttr = isSoloDifficultyPenalty ? ' data-state-in-hand="facedown"' : '';
            row.innerHTML = `
                <td class="score-type-icon-cell">
                    <div class="${iconClass}" data-score-type="${scoreType}"${facedownAttr}></div>
                </td>`;

            for(let player_id in this.game.players) {
                const playerScore = this.endGameScoring.player_scores[player_id];
                const cellScore = playerScore[scoreType];

                row.innerHTML += `<td><div class="cell-text cell-${scoreType}" style="opacity: 0;" row-index="${i}" player-id="${player_id}">${cellScore}</div></td>`;
            }
            
            this.tbody.appendChild(row);
        }
    }

    private bindShowHideButtons() {
        this.hideButton.addEventListener('click', () => {
            this.hideButton.style.display = 'none';
            this.scoreContainer.querySelectorAll('.maximized-content').forEach((node: HTMLDivElement) => { node.style.display = 'none'; });
            this.showButton.style.display = null;
            this.scoreContainer.setAttribute('collapsed', 'true');
        });

        this.showButton.addEventListener('click', () => {
            this.hideButton.style.display = null;
            this.scoreContainer.querySelectorAll('.maximized-content').forEach((node: HTMLDivElement) => { node.style.display = null; });
            this.showButton.style.display = 'none';
            this.scoreContainer.removeAttribute('collapsed');
        });
    }

    private bindBodyScroll() {
        this.scoreContainer.style.transition = 'opacity 300ms ease';
        let fadeInGeneration = 0;

        // Bind scroll event listener to the body
        window.addEventListener('scroll', () => {
            const generation = ++fadeInGeneration;
            this.scoreContainer.style.opacity = '0.3';

            this.game.bga.gameui.wait(100).then(() => {
                if(generation === fadeInGeneration)
                    this.scoreContainer.style.opacity = '1';
            });
        });
    }

    private async fadeInNextCell() {
        const cells: HTMLDivElement[] = Array.from(this.tbody.querySelectorAll('.cell-text:not(.displayed)'));

        const overallContent: HTMLDivElement = document.getElementById('overall-content') as HTMLDivElement;
        overallContent.removeEventListener('click', this.bodyClickHandler);
    
        if(cells.length <= Object.keys(this.game.players).length * 2){
            this.fastForwardButton.style.transition = 'opacity 400ms ease';
            this.fastForwardButton.style.opacity = '0';
        }

        if(cells.length <= 0){
            const allCells = Array.from(this.tbody.querySelectorAll('.cell-text'));
            allCells.forEach((cell: HTMLDivElement) => { cell.style.opacity = ''; });
            this.makeWinnersJump();
            this.setEndGamePlayerScores();
            this.displaySoloScoreFlavorText();

            await this.game.bga.gameui.wait(this.delayAfterFadeIns);
            return;
        }

        let cell: HTMLDivElement = cells[0];
        const instantFadeIn = this.game.getGameStateName() === 'gameEnd';
        cell.classList.add('displayed');

        const fadeInDuration = instantFadeIn ? 0 : 500;
        const fadeInDelay = instantFadeIn ? 0 : 100;

        let fastForwardFadeIn: () => void;
        const fastForwarded = new Promise<void>(resolve => { fastForwardFadeIn = resolve; });

        this.bodyClickHandler = async (event: MouseEvent) => {
            cell.style.transition = null;
            cell.style.opacity = '1';
            fastForwardFadeIn();
        };

        overallContent.addEventListener('click', this.bodyClickHandler);

        this.addColumnTotal(cell.getAttribute('player-id'));

        cell.style.transition = `opacity ${fadeInDuration}ms ease ${fadeInDelay}ms`;
        cell.style.opacity = '1';

        await Promise.race([
            this.game.bga.gameui.wait(fadeInDelay + fadeInDuration),
            fastForwarded
        ]);
        await this.fadeInNextCell();
    }

    private addColumnTotal(playerID: string) {
        const cells = Array.from(this.tbody.querySelectorAll(`.cell-text.displayed[player-id="${playerID}"]:not(.cell-total)`)) as HTMLDivElement[];
        let total: number = 0;
        cells.forEach(cell => {
            const cellValue: number = parseInt(cell.textContent || '0');
            const isPenalty = cell.classList.contains('cell-penalty');
            const value = isPenalty ? -1 * Math.abs(cellValue) : cellValue;
            if (!isNaN(value))
                total += value;
        });

        const totalCell = this.tbody.querySelector(`.cell-total[player-id="${playerID}"]`) as HTMLDivElement;
        if (totalCell){
            totalCell.textContent = total.toString();
            totalCell.classList.add('displayed');
            totalCell.style.opacity = '1';
        }
    }

    private makeWinnersJump() {
        let delay = 0;
        for(let winner_id of this.winner_ids){
            this.game.bga.gameui.wait(delay).then(() => {
                this.thead.querySelector(`.player-name-cell[player-id="${winner_id}"]`).classList.add('jumping-text');
            });
            delay += 100 + Math.random() * 50;
        }
    }

    private displaySoloScoreFlavorText() {
        if(!this.game.isSoloMode())
            return;

        const player_id = Object.keys(this.game.players)[0];
        const totalScore = this.endGameScoring.player_scores[player_id].totalScore;
        let text: string;

        if(totalScore >= 25){
            text = _('Fish whisperer alert! You’ve mastered it and the Okinawa Sea calls you by name.');
            this.soloScoreFlavorImage.style.display = 'block';
        } else if(totalScore >= 20)
            text = _('Nice work! You glide through water like a fish, feeling the ocean’s rhythm.');
        else if(totalScore >= 15)
            text = _('Not bad! You can hold your breath, but remember: you’re still human and far away from sea experience.');
        else if(totalScore >= 10)
            text = _('Wading toes only... Sitting in the tub staring at your feet isn’t quite feeling like a fish yet!');
        else text = _('Splash! You prefer dry land. Maybe hiking the mountains is more your speed than diving like fish.');

        this.soloScoreFlavorText.textContent = text;
        this.soloScoreFlavorText.style.transition = 'opacity 500ms ease';
        this.soloScoreFlavorText.style.opacity = '1';
    }

    private setEndGamePlayerScores() {
        for(let player_id in this.game.players)
            this.game.players[player_id].updateScoring(this.endGameScoring.player_scores[player_id]);
    }
}