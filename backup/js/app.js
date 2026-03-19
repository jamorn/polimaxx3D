/**
 * POLIMAXX Application - Main Entry Point
 * Modular OOP implementation of 5-bag controller with gap sliders and rotation controls
 */

import { SceneManager } from '../../js/SceneManager.js';
import { BagManager } from '../../js/BagManager.js';
import { UIController } from '../../js/UIController.js';

class PolimaxxApp {
    constructor() {
        this.sceneManager = null;
        this.bagManager = null;
        this.uiController = null;
        
        this.init();
    }

    /**
     * Initialize the complete application
     */
    async init() {
        try {
            // Create scene and rendering setup
            this.sceneManager = new SceneManager();
            
            // Create bag management system
            this.bagManager = new BagManager(this.sceneManager);
            
            // Create UI controller
            this.uiController = new UIController(this.bagManager, this.sceneManager);
            
            // Initialize gap sliders to current positions
            this.initializeGapSliders();
            
            // Start the animation loop
            this.sceneManager.startAnimation();
            
            console.log('POLIMAXX Application initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize POLIMAXX Application:', error);
        }
    }

    /**
     * Initialize gap sliders with current bag positions
     */
    initializeGapSliders() {
        // Trigger gap slider events to apply current positions
        const gapMiddleSlider = document.getElementById('gapMiddleSlider');
        const gapRowsSlider = document.getElementById('gapRowsSlider');
        
        if (gapMiddleSlider) {
            gapMiddleSlider.dispatchEvent(new Event('input'));
        }
        
        if (gapRowsSlider) {
            gapRowsSlider.dispatchEvent(new Event('input'));
        }
    }

    /**
     * Get application statistics for debugging
     */
    getAppStats() {
        if (!this.bagManager) return null;
        
        return {
            bagCount: this.bagManager.getAllBags().length,
            layoutStats: this.bagManager.getLayoutStats(),
            cameraPosition: this.sceneManager.getCamera().position,
            renderInfo: this.sceneManager.getRenderer().info
        };
    }

    /**
     * Export current configuration
     */
    exportConfiguration() {
        if (!this.bagManager) return null;
        
        const config = {
            timestamp: new Date().toISOString(),
            bags: this.bagManager.getAllBagStates(),
            gapRows: parseFloat(document.getElementById('gapRowsSlider')?.value || 0),
            gapMiddle: parseFloat(document.getElementById('gapMiddleSlider')?.value || 0),
            cameraPosition: this.sceneManager.getCamera().position.toArray(),
            cameraTarget: this.sceneManager.getCameraControls().target.toArray()
        };
        
        return config;
    }

    /**
     * Import and apply configuration
     */
    importConfiguration(config) {
        if (!config || !this.bagManager || !this.uiController) return false;
        
        try {
            // Apply bag states
            if (config.bags) {
                this.bagManager.applyBagStates(config.bags);
            }
            
            // Apply gap values
            if (typeof config.gapRows === 'number') {
                const gapRowsSlider = document.getElementById('gapRowsSlider');
                if (gapRowsSlider) {
                    gapRowsSlider.value = config.gapRows;
                    gapRowsSlider.dispatchEvent(new Event('input'));
                }
            }
            
            if (typeof config.gapMiddle === 'number') {
                const gapMiddleSlider = document.getElementById('gapMiddleSlider');
                if (gapMiddleSlider) {
                    gapMiddleSlider.value = config.gapMiddle;
                    gapMiddleSlider.dispatchEvent(new Event('input'));
                }
            }
            
            // Update UI
            this.uiController.updateDisplay();
            
            return true;
            
        } catch (error) {
            console.error('Failed to import configuration:', error);
            return false;
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Make app globally accessible for debugging
    window.PolimaxxApp = new PolimaxxApp();
    
    // Add some helpful global functions for console debugging
    window.exportConfig = () => {
        const config = window.PolimaxxApp.exportConfiguration();
        console.log('Current Configuration:', JSON.stringify(config, null, 2));
        return config;
    };
    
    window.getStats = () => {
        const stats = window.PolimaxxApp.getAppStats();
        console.log('App Statistics:', stats);
        return stats;
    };
    
    console.log('POLIMAXX loaded. Use exportConfig() or getStats() in console for debugging.');
});