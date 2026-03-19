/**
 * UIController - Handles all user interface interactions and controls
 */
export class UIController {
    constructor(bagManager, sceneManager) {
        this.bagManager = bagManager;
        this.sceneManager = sceneManager;
        this.activeBag = null;
        this.defaultValues = null;
        
        this.init();
    }

    /**
     * Initialize all UI event listeners
     */
    init() {
        this.setupBagSelection();
        this.setupPositionControls();
        this.setupGapControls();
        this.setupRotationControls();
        this.setupResetControls();
        this.setupDefaultControls();
        this.setupIndexToggle();
        
        // Set initial active bag (bag 5)
        this.setActiveBag(5);
        this.updateDisplay();
    }

    /**
     * Setup bag selection buttons
     */
    setupBagSelection() {
        document.querySelectorAll('.bag-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const label = parseInt(btn.dataset.bag);
                this.setActiveBag(label);
            });
        });
    }

    /**
     * Setup X position slider control
     */
    setupPositionControls() {
        const xSlider = document.getElementById('xSlider');
        const xValue = document.getElementById('xValue');
        
        xSlider.addEventListener('input', (e) => {
            if (!this.activeBag) return;
            
            const val = parseFloat(e.target.value);
            this.activeBag.position.x = val;
            xValue.textContent = val.toFixed(2);
            this.updateDisplay();
        });
    }

    /**
     * Setup gap control sliders
     */
    setupGapControls() {
        const gapRowsSlider = document.getElementById('gapRowsSlider');
        const gapRowsValue = document.getElementById('gapRowsValue');
        const gapMiddleSlider = document.getElementById('gapMiddleSlider');
        const gapMiddleValue = document.getElementById('gapMiddleValue');

        // Gap Rows: separate front (4,5) and back (1,2,3) rows
        gapRowsSlider.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            gapRowsValue.textContent = v.toFixed(2);
            
            // Move front row forward, back row backward
            [5, 4].forEach(lbl => {
                const bag = this.bagManager.getBagByLabel(lbl);
                if (bag && bag.userData && bag.userData.initialPos) {
                    bag.position.z = bag.userData.initialPos.z + v;
                }
            });
            
            [3, 2, 1].forEach(lbl => {
                const bag = this.bagManager.getBagByLabel(lbl);
                if (bag && bag.userData && bag.userData.initialPos) {
                    bag.position.z = bag.userData.initialPos.z - v;
                }
            });
        });

        // Gap Middle: move bags 1 & 3 away from center bag 2
        gapMiddleSlider.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            gapMiddleValue.textContent = v.toFixed(2);
            
            const bag2 = this.bagManager.getBagByLabel(2);
            const bag1 = this.bagManager.getBagByLabel(1);
            const bag3 = this.bagManager.getBagByLabel(3);
            
            const centerX = (bag2 && bag2.userData && bag2.userData.initialPos) 
                ? bag2.userData.initialPos.x : 0;
            
            if (bag2) bag2.position.x = centerX;
            if (bag1) bag1.position.x = centerX + v;
            if (bag3) bag3.position.x = centerX - v;
            
            // Update X slider if active bag changed
            if (this.activeBag && [1, 2, 3].includes(this.activeBag.userData.label)) {
                document.getElementById('xSlider').value = this.activeBag.position.x;
                document.getElementById('xValue').textContent = this.activeBag.position.x.toFixed(2);
            }
        });

        // Initialize gap middle value from current positions
        const initialGapMiddle = this.bagManager.getInitialGapMiddle();
        gapMiddleSlider.value = initialGapMiddle.toFixed(2);
        gapMiddleValue.textContent = initialGapMiddle.toFixed(2);
    }

    /**
     * Setup rotation control buttons
     */
    setupRotationControls() {
        document.getElementById('rotateCW').addEventListener('click', () => {
            this.rotateActiveBag(90);
        });

        document.getElementById('rotateCCW').addEventListener('click', () => {
            this.rotateActiveBag(-90);
        });
    }

    /**
     * Setup reset control buttons
     */
    setupResetControls() {
        document.getElementById('resetBagBtn').addEventListener('click', () => {
            this.resetActiveBag();
        });

        document.getElementById('resetAllBtn').addEventListener('click', () => {
            this.resetAllBags();
        });

        document.getElementById('alignViewBtn').addEventListener('click', () => {
            this.alignViewToActiveBag();
        });
    }

    /**
     * Setup default value controls
     */
    setupDefaultControls() {
        const lockBtn = document.getElementById('lockBtn');
        
        lockBtn.addEventListener('click', () => {
            this.lockCurrentValues();
        });

        document.getElementById('applyDefaultBtn').addEventListener('click', () => {
            this.applyDefaultValues();
        });
    }

    /**
     * Setup index overlay toggle
     */
    setupIndexToggle() {
        document.getElementById('showIndex').addEventListener('change', (e) => {
            this.bagManager.setIndexVisibility(e.target.checked);
        });

        document.getElementById('showDetails').addEventListener('change', (e) => {
            this.bagManager.setFrontDetailsVisibility(e.target.checked);
        });

        document.getElementById('showTopArtwork').addEventListener('change', (e) => {
            this.bagManager.setTopArtworkVisibility(e.target.checked);
        });

        // Debug controls
        document.getElementById('debugWireframe').addEventListener('change', (e) => {
            this.bagManager.setWireframeMode(e.target.checked);
        });
        
        document.getElementById('debugShadows').addEventListener('change', (e) => {
            this.sceneManager.setShadowsEnabled(e.target.checked);
        });
        
        const debugIndexOffset = document.getElementById('debugIndexOffset');
        const debugIndexOffsetValue = document.getElementById('debugIndexOffsetValue');
        
        debugIndexOffset.addEventListener('input', (e) => {
            const offset = parseFloat(e.target.value);
            debugIndexOffsetValue.textContent = offset.toFixed(3);
            this.bagManager.setIndexZOffset(offset);
        });

        const indexOpacitySlider = document.getElementById('indexOpacitySlider');
        const indexOpacityValue = document.getElementById('indexOpacityValue');
        
        indexOpacitySlider.addEventListener('input', (e) => {
            const opacity = parseFloat(e.target.value);
            indexOpacityValue.textContent = opacity.toFixed(2);
            this.bagManager.setIndexOpacity(opacity);
        });
    }

    /**
     * Set the active bag for editing
     */
    setActiveBag(label) {
        // Update button states
        document.querySelectorAll('.bag-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`[data-bag="${label}"]`).classList.add('active');
        
        // Set active bag reference
        this.activeBag = this.bagManager.getBagByLabel(label);
        
        // Update UI controls to match active bag
        if (this.activeBag) {
            document.getElementById('xSlider').value = this.activeBag.position.x;
            document.getElementById('xValue').textContent = this.activeBag.position.x.toFixed(2);
        }
        
        this.updateDisplay();
    }

    /**
     * Rotate active bag by specified degrees
     */
    rotateActiveBag(degrees) {
        if (!this.activeBag) return;
        
        const currentDeg = (this.activeBag.rotation.y * 180 / Math.PI + 360) % 360;
        let newDeg = Math.round((currentDeg + degrees) / 90) * 90;
        
        // Normalize to 0-270 range
        if (newDeg >= 360) newDeg = 0;
        if (newDeg < 0) newDeg = 270;
        
        this.activeBag.rotation.y = newDeg * Math.PI / 180;
        this.updateDisplay();
    }

    /**
     * Reset active bag to initial position and rotation
     */
    resetActiveBag() {
        if (!this.activeBag) return;
        
        this.activeBag.position.x = this.activeBag.userData.initialPos.x;
        this.activeBag.rotation.y = this.activeBag.userData.initialRot;
        
        document.getElementById('xSlider').value = this.activeBag.position.x;
        document.getElementById('xValue').textContent = this.activeBag.position.x.toFixed(2);
        this.updateDisplay();
    }

    /**
     * Reset all bags to initial positions and rotations
     */
    resetAllBags() {
        this.bagManager.resetAllBags();
        
        if (this.activeBag) {
            document.getElementById('xSlider').value = this.activeBag.position.x;
            document.getElementById('xValue').textContent = this.activeBag.position.x.toFixed(2);
        }
        
        this.updateDisplay();
    }

    /**
     * Align camera view to active bag
     */
    alignViewToActiveBag() {
        if (!this.activeBag) return;
        
        const controls = this.sceneManager.getCameraControls();
        controls.target.copy(this.activeBag.position);
        controls.target.y = 0.5;
    }

    /**
     * Lock current values as defaults
     */
    lockCurrentValues() {
        const bagsSaved = this.bagManager.getAllBagStates();
        const gapRowsSlider = document.getElementById('gapRowsSlider');
        const gapMiddleSlider = document.getElementById('gapMiddleSlider');

        this.defaultValues = {
            bags: bagsSaved,
            gapRows: parseFloat(gapRowsSlider.value),
            gapMiddle: parseFloat(gapMiddleSlider.value)
        };

        const lockBtn = document.getElementById('lockBtn');
        lockBtn.classList.add('locked');
        lockBtn.innerHTML = '🔒 ล็อกค่าแล้ว';

        // Display locked values
        const defaultDisplay = document.getElementById('defaultDisplay');
        defaultDisplay.innerHTML = '<strong>✅ ค่าที่ล็อก:</strong><br>' +
            this.defaultValues.bags.map(v => 
                `ถุง ${v.label}: X=${v.x.toFixed(2)}, ${Math.round(v.rot * 180 / Math.PI)}°`
            ).join('<br>') +
            `<br><br><strong>Gap Rows:</strong> ${this.defaultValues.gapRows.toFixed(2)} m` +
            `<br><strong>Gap Middle:</strong> ${this.defaultValues.gapMiddle.toFixed(2)} m`;
    }

    /**
     * Apply previously locked default values
     */
    applyDefaultValues() {
        if (!this.defaultValues) {
            alert('กรุณาล็อกค่าก่อน');
            return;
        }

        // Apply bag positions and rotations
        this.bagManager.applyBagStates(this.defaultValues.bags);

        // Apply slider values and trigger events
        if (typeof this.defaultValues.gapRows === 'number') {
            const gapRowsSlider = document.getElementById('gapRowsSlider');
            gapRowsSlider.value = this.defaultValues.gapRows.toFixed(2);
            gapRowsSlider.dispatchEvent(new Event('input'));
        }

        if (typeof this.defaultValues.gapMiddle === 'number') {
            const gapMiddleSlider = document.getElementById('gapMiddleSlider');
            gapMiddleSlider.value = this.defaultValues.gapMiddle.toFixed(2);
            gapMiddleSlider.dispatchEvent(new Event('input'));
        }

        // Update UI for active bag
        if (this.activeBag) {
            document.getElementById('xSlider').value = this.activeBag.position.x;
            document.getElementById('xValue').textContent = this.activeBag.position.x.toFixed(2);
        }

        this.updateDisplay();
    }

    /**
     * Update the bag info display
     */
    updateDisplay() {
        if (!this.activeBag) return;
        
        const deg = (this.activeBag.rotation.y * 180 / Math.PI + 360) % 360;
        document.getElementById('bagInfo').innerHTML = 
            `ถุง ${this.activeBag.userData.label} | X: ${this.activeBag.position.x.toFixed(2)} | หมุน Y: ${Math.round(deg)}°`;
    }
}