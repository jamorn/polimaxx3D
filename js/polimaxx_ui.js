import GUI from 'lil-gui';

export function createPolimaxxUI(sceneManager, stack) {
    const state = stack.state;
    const controls = sceneManager.getControls();
    const gridHelper = sceneManager.getGridHelper();
    const allControllers = [];
    const recallControllers = [];
    const dimensionControllers = [];
    const dimensionParams = stack.getDimensionParams();
    let frontZOffsetController = null;
    let rearZOffsetController = null;
    let sizeFolder = null;
    let zOffsetFolder = null;
    let wallFolder = null;

    function registerController(controller) {
        allControllers.push(controller);
        return controller;
    }

    function syncDimensionParams() {
        Object.assign(dimensionParams, stack.getDimensionParams());
    }

    function updateControllerBounds(controller, bounds, fallbackPadding = 20) {
        if (!controller) return;

        if (bounds.min > bounds.max) {
            const center = (bounds.min + bounds.max) / 2;
            controller.min(center - fallbackPadding);
            controller.max(center + fallbackPadding);
        } else {
            controller.min(bounds.min);
            controller.max(bounds.max);
        }

        controller.updateDisplay();
    }

    function refreshZOffsetControllers() {
        updateControllerBounds(frontZOffsetController, stack.getFrontOffsetBoundsMm(), 20);
        updateControllerBounds(rearZOffsetController, stack.getRearOffsetBoundsMm(), 20);
    }

    function refreshUI() {
        syncDimensionParams();
        if (state.showRecallControls) {
            refreshZOffsetControllers();
        }
        allControllers.forEach((controller) => controller.updateDisplay());
    }

    function setFolderVisible(folder, visible) {
        if (!folder || !folder.domElement) return;
        folder.domElement.style.display = visible ? '' : 'none';
    }

    function setControllerEnabled(controller, enabled) {
        if (!controller) return;

        if (enabled) {
            if (typeof controller.enable === 'function') {
                controller.enable();
                return;
            }

            if (controller.domElement) {
                controller.domElement.style.pointerEvents = '';
                controller.domElement.style.opacity = '';
            }
            return;
        }

        if (typeof controller.disable === 'function') {
            controller.disable();
            return;
        }

        if (controller.domElement) {
            controller.domElement.style.pointerEvents = 'none';
            controller.domElement.style.opacity = '0.45';
        }
    }

    function syncRecallControls() {
        const visible = Boolean(state.showRecallControls);

        [sizeFolder, zOffsetFolder, wallFolder].forEach((folder) => setFolderVisible(folder, visible));
        recallControllers.forEach((controller) => setControllerEnabled(controller, visible));
    }

    function alignViewToActive() {
        const active = stack.getBagByLabel(state.activeBag);
        if (!active) return;

        controls.target.copy(active.position);
        controls.target.y = 0.5;
    }

    const existingGui = document.querySelector('.lil-gui');
    if (existingGui) existingGui.remove();
    if (window.gui) {
        try {
            window.gui.destroy();
        } catch (error) {
            console.error(error);
        }
    }

    const gui = new GUI({ title: 'ปรับแต่งโครงสร้าง', width: 300 });
    window.gui = gui;
    window.polimaxx_gui = gui;

    const recallFolder = gui.addFolder('Recall Options');
    registerController(
        recallFolder.add(state, 'showRecallControls').name('แสดง Size / Z / Wall').listen().onChange(() => {
            syncRecallControls();
            refreshUI();
        })
    );
    recallFolder.close();

    sizeFolder = gui.addFolder('ขนาดถุงทั้ง 5 ใบ');
    dimensionControllers.push(
        registerController(
            sizeFolder.add(dimensionParams, 'width_mm', 250, 800, 1).name('WIDTH (X) mm').onChange(() => {
                state.bagWidth = dimensionParams.width_mm / 1000;
                state.bagLength = dimensionParams.length_mm / 1000;
                state.bagHeight = dimensionParams.height_mm / 1000;
                stack.applyBagDimensions();
                refreshUI();
            })
        ),
        registerController(
            sizeFolder.add(dimensionParams, 'length_mm', 150, 500, 1).name('LENGTH (Z) mm').onChange(() => {
                state.bagWidth = dimensionParams.width_mm / 1000;
                state.bagLength = dimensionParams.length_mm / 1000;
                state.bagHeight = dimensionParams.height_mm / 1000;
                stack.applyBagDimensions();
                refreshUI();
            })
        ),
        registerController(
            sizeFolder.add(dimensionParams, 'height_mm', 80, 250, 1).name('HEIGHT (Y) mm').onChange(() => {
                state.bagWidth = dimensionParams.width_mm / 1000;
                state.bagLength = dimensionParams.length_mm / 1000;
                state.bagHeight = dimensionParams.height_mm / 1000;
                stack.applyBagDimensions();
                refreshUI();
            })
        )
    );

    recallControllers.push(registerController(
        sizeFolder.add({ resetSize: () => {
            stack.applyManualPreset();
            refreshUI();
        } }, 'resetSize').name('รีเซ็ตขนาดถุง')
    ));
    recallControllers.push(registerController(
        sizeFolder.add({ fitToPallet: () => {
            stack.applyPackedFootprint();
            refreshUI();
        } }, 'fitToPallet').name('จัดถุงให้เต็มพาเลท')
    ));
    sizeFolder.close();

    zOffsetFolder = gui.addFolder('Z Offset แยกแถว');
    rearZOffsetController = registerController(
        zOffsetFolder.add(state, 'rearRowOffsetMm', -300, 300).name('แถว 1-2-3').step(1).listen().onChange((value) => {
            stack.moveRearGroupZByOffsetMm(value);
            refreshUI();
        })
    );
    frontZOffsetController = registerController(
        zOffsetFolder.add(state, 'frontRowOffsetMm', -300, 300).name('แถว 4-5').step(1).listen().onChange((value) => {
            stack.moveFrontGroupZByOffsetMm(value);
            refreshUI();
        })
    );
    zOffsetFolder.close();

    const bagColorFolder = gui.addFolder('สีถุง');
    registerController(
        bagColorFolder.addColor(state, 'bagColor').name('สีตัวถุง').onChange(() => {
            stack.applyBagBodyColor();
            refreshUI();
        })
    );
    bagColorFolder.open();

    wallFolder = gui.addFolder('ผนังกั้นช่อง');
    recallControllers.push(registerController(
        wallFolder.add(state, 'showWalls').name('แสดงผนัง').listen().onChange((value) => {
            stack.setWallsVisible(value);
            refreshUI();
        })
    ));
    recallControllers.push(registerController(
        wallFolder.add(state, 'wallOpacity', 0, 1).name('ความโปร่งใส').step(0.05).onChange((value) => {
            stack.setWallOpacity(value);
        })
    ));
    recallControllers.push(registerController(
        wallFolder.addColor(state, 'wallColor').name('สี').onChange((value) => {
            stack.setWallColor(value);
        })
    ));
    wallFolder.close();

    const palletFolder = gui.addFolder('พาเลท');
    registerController(
        palletFolder.add(state, 'showPallet').name('แสดงพาเลท').listen().onChange((value) => {
            stack.setPalletVisible(value);
            refreshUI();
        })
    );
    registerController(
        palletFolder.add(state, 'palletOpacity', 0, 1).name('ความโปร่งใส').step(0.05).onChange((value) => {
            stack.setPalletOpacity(value);
        })
    );
    registerController(
        palletFolder.addColor(state, 'palletColor').name('สี').onChange((value) => {
            stack.setPalletColor(value);
        })
    );
    registerController(palletFolder.add(stack.wireframe, 'visible').name('แสดงขอบพาเลท'));
    palletFolder.open();

    const viewFolder = gui.addFolder('มุมมอง');
    registerController(
        viewFolder.add(state, 'visibleLayerCount', 1, stack.getTotalLayers(), 1).name('แสดงถึงชั้น').listen().onChange((value) => {
            stack.setVisibleLayerCount(value);
            refreshUI();
        })
    );
    registerController(
        viewFolder.add(state, 'showGrid').name('แสดง Grid').listen().onChange((value) => {
            stack.setGridVisible(value);
            refreshUI();
        })
    );
    registerController(
        viewFolder.add(state, 'showLabels').name('แสดงตัวเลขถุง').listen().onChange((value) => {
            stack.setLabelsVisible(value);
            refreshUI();
        })
    );
    viewFolder.open();

    const resetButton = document.getElementById('btn-reset');
    const alignButton = document.getElementById('btn-align');
    const wallToggleButton = document.getElementById('btn-wall-toggle');

    if (resetButton) {
        resetButton.addEventListener('click', () => {
            stack.applyManualPreset();
            refreshUI();
        });
    }

    if (alignButton) {
        alignButton.addEventListener('click', () => {
            alignViewToActive();
        });
    }

    if (wallToggleButton) {
        wallToggleButton.addEventListener('click', () => {
            stack.toggleWalls();
            refreshUI();
        });
    }

    if (resetButton) {
        resetButton.classList.add('active');
    }

    gridHelper.visible = state.showGrid;
    recallControllers.push(...dimensionControllers, rearZOffsetController, frontZOffsetController);
    syncRecallControls();
    refreshUI();
    gui.close();

    return {
        gui,
        refreshUI
    };
}