import { Game } from "./Game";

export class PrefHandler{

    constructor(private game: Game, private prefNameToIndex: Record<string, number>) {
        this.game.bga.userPreferences.onChange = (prefIndex, prefValue) => this.onGameUserPreferenceChanged(prefIndex, prefValue);

        const bubbleAmountPrefIndex = this.prefNameToIndex['bubble_amount'];
        this.onGameUserPreferenceChanged(bubbleAmountPrefIndex, this.game.bga.userPreferences.get(bubbleAmountPrefIndex));
    }

    private onGameUserPreferenceChanged(prefIndex: number, prefValue: number): void{
        switch (prefIndex) {
            case 101:
                this.game.backgroundHandler.adjustBubbleAmount(prefValue);
            break;
        }
    }
}
