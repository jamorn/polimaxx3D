import { createInitialState } from './polimaxx_config.js';
import { PolimaxxSceneManager } from './polimaxx_scene.js';
import { createPolimaxxStack } from './polimaxx_stack.js';
import { createPolimaxxUI } from './polimaxx_ui.js';

class PolimaxxApp {
    constructor() {
        this.state = createInitialState();
        this.sceneManager = new PolimaxxSceneManager(document.body);
        this.stack = createPolimaxxStack(this.sceneManager, this.state);
        this.ui = createPolimaxxUI(this.sceneManager, this.stack);

        this.sceneManager.startAnimation();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.polimaxxApp = new PolimaxxApp();
});