import { Game } from "./Game";

export class PrefHandler{
    //"Show players as" (gamepreferences.jsonc, pref 103): the Reef titles show each player's avatar or name
    private static readonly PLAYERS_DISPLAY_AVATAR = 1;
    private static readonly PLAYERS_DISPLAY_NAME = 2;

    private playersDisplay: number = PrefHandler.PLAYERS_DISPLAY_AVATAR;

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
            case this.prefNameToIndex.players_display:
                this.applyPlayersDisplay(prefValue);
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
    
    public disableAnchorPreference(){ this.game.bga.userPreferences.set(this.prefNameToIndex.show_anchored_cards, 0); }
    public enableAnchorPreference(){ this.game.bga.userPreferences.set(this.prefNameToIndex.show_anchored_cards, 1); }

    //every Reef title follows one attribute on #player-hands-container, so all of them switch together. Any value other
    //than Player name is Profile picture (the default; also a missing value, as for a spectator with no saved preference)
    private applyPlayersDisplay(prefValue: number): void{
        this.playersDisplay = prefValue == PrefHandler.PLAYERS_DISPLAY_NAME ? PrefHandler.PLAYERS_DISPLAY_NAME : PrefHandler.PLAYERS_DISPLAY_AVATAR;
        document.getElementById('player-hands-container')?.setAttribute('data-players-display', this.playersDisplay == PrefHandler.PLAYERS_DISPLAY_NAME ? 'name' : 'avatar');
    }

    //a click on any Reef title's avatar or name: switches every Reef at once and saves the choice as the preference, so
    //BGA's preferences menu shows it too. Applied here first, since saving may not be possible (a spectator who isn't logged
    //in); the onChange that follows a successful save applies the same value again, which changes nothing
    public togglePlayersDisplay(): void{
        const newValue = this.playersDisplay == PrefHandler.PLAYERS_DISPLAY_NAME ? PrefHandler.PLAYERS_DISPLAY_AVATAR : PrefHandler.PLAYERS_DISPLAY_NAME;
        this.applyPlayersDisplay(newValue);
        try {
            this.game.bga.userPreferences.set(this.prefNameToIndex.players_display, newValue);
        } catch (e) {
            console.error('Could not save the "Show players as" preference', e);
        }
    }

    //end game specific functions
}
