import { Game } from "./Game";

export class PrefHandler{

    constructor(private gameui: Game, private prefNameToIndex: Record<string, number>) {
        this.gameui.bga.userPreferences.onChange = (prefIndex, prefValue) => this.onGameUserPreferenceChanged(prefIndex, prefValue);

        const bubbleAmountPrefIndex = this.prefNameToIndex['bubble_amount'];
        this.onGameUserPreferenceChanged(bubbleAmountPrefIndex, this.gameui.bga.userPreferences.get(bubbleAmountPrefIndex));
    }

    private onGameUserPreferenceChanged(prefIndex: number, prefValue: number): void{
        switch (prefIndex) {
            case 101:
                this.gameui.backgroundHandler.adjustBubbleAmount(prefValue);
            break;
        }
    }
}
