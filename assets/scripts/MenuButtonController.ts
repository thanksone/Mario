const { ccclass, property } = cc._decorator;

import GameManager from './GameManager';

@ccclass
export default class MenuButtonController extends cc.Component {
    @property
    public levelSceneName: string = 'Level1';

    public onStartButtonClicked() {
        if (GameManager.instance) GameManager.instance.showLevelSelect();
    }

    public onLevelButtonClicked() {
        if (GameManager.instance) GameManager.instance.startLevel(this.levelSceneName);
    }

    public onRestartButtonClicked() {
        if (GameManager.instance) GameManager.instance.restartCurrentLevel();
    }

    public onBackToMenuClicked() {
        if (GameManager.instance) GameManager.instance.returnToMenu();
    }
}
