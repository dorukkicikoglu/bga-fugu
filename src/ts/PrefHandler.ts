import { Game } from "./Game";

export class PrefHandler{

    constructor(private game: Game, private prefNameToIndex: GamePrefs) {
        this.game.bga.userPreferences.onChange = (prefIndex, prefValue) => this.onGameUserPreferenceChanged(prefIndex, prefValue);

        for(const prefName in this.prefNameToIndex){
            const prefIndex = this.prefNameToIndex[prefName];
            this.onGameUserPreferenceChanged(prefIndex, this.game.bga.userPreferences.get(prefIndex));
        }

        if(this.game.isSoloMode())
            this.hidePreferenceChoice(this.prefNameToIndex['show_anchored_cards']);
    }

    private onGameUserPreferenceChanged(prefIndex: number, prefValue: number): void{
        switch (prefIndex) {
            case this.prefNameToIndex.bubble_amount:
                this.game.backgroundHandler.adjustBubbleAmount(prefValue);
            break;
            case this.prefNameToIndex.show_anchored_cards:
                this.game.anchorCardsDisplayHandler.setPrefEnabled(prefValue === 1);
            break;
        }
    }

    private hidePreferenceChoice(prefIndex: number): void{
        document.querySelectorAll(`select[data-preference-id="${prefIndex}"]`).forEach(select => {
            const preferenceChoice = select.closest('.preference_choice') as HTMLElement;
            if(preferenceChoice)
                preferenceChoice.style.display = 'none';
        });
    }

    //game specific functions
    
    public disableAnchorPreference(){ this.onGameUserPreferenceChanged(this.prefNameToIndex.show_anchored_cards, 0); }
    
    //end game specific functions
}
