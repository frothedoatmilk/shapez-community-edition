/* typehints:start */
import { Application } from "../application";
/* typehints:end */

import { IS_MOBILE } from "../core/config";
import { NoAchievementProvider } from "./no_achievement_provider";
import { createLogger } from "../core/logging";
import { clamp } from "../core/utils";

const logger = createLogger("electron-wrapper");

export class PlatformWrapperImplElectron {
    constructor(app) {
        /** @type {Application} */
        this.app = app;
    }

    initialize() {
        this.dlcs = {
            puzzle: false,
        };

        this.steamOverlayCanvasFix = document.createElement("canvas");
        this.steamOverlayCanvasFix.width = 1;
        this.steamOverlayCanvasFix.height = 1;
        this.steamOverlayCanvasFix.id = "steamOverlayCanvasFix";

        this.steamOverlayContextFix = this.steamOverlayCanvasFix.getContext("2d");
        document.documentElement.appendChild(this.steamOverlayCanvasFix);

        this.app.ticker.frameEmitted.add(this.steamOverlayFixRedrawCanvas, this);

        return this.initializeAchievementProvider()
            .then(() => this.initializeDlcStatus())
            .then(() => {
                document.documentElement.classList.add("p-" + this.getId());
                return Promise.resolve();
            });
    }

    steamOverlayFixRedrawCanvas() {
        this.steamOverlayContextFix.clearRect(0, 0, 1, 1);
    }

    getId() {
        return "electron";
    }

    getSupportsRestart() {
        return true;
    }

    /**
     * Attempt to open an external url
     * @param {string} url
     */
    openExternalLink(url) {
        logger.log(this, "Opening external:", url);
        window.open(url, "about:blank");
    }

    /**
     * Returns the strength of touch pans with the mouse
     */
    getTouchPanStrength() {
        return 1;
    }

    /**
     * Should return if this platform supports ads at all
     */
    getSupportsAds() {
        return false;
    }

    /**
     * Attempt to restart the app
     */
    performRestart() {
        logger.log(this, "Performing restart");
        window.location.reload();
    }

    initializeAchievementProvider() {
        return this.app.achievementProvider.initialize().catch(err => {
            logger.error("Failed to initialize achievement provider, disabling:", err);

            this.app.achievementProvider = new NoAchievementProvider(this.app);
        });
    }

    initializeDlcStatus() {
        logger.log("Checking DLC ownership ...");
        // @todo: Don't hardcode the app id
        return ipcRenderer.invoke("steam:check-app-ownership", 1625400).then(
            res => {
                logger.log("Got DLC ownership:", res);
                this.dlcs.puzzle = Boolean(res);
            },
            err => {
                logger.error("Failed to get DLC ownership:", err);
            }
        );
    }

    /**
     * Returns the UI scale, called on every resize
     * @returns {number} */
    getUiScale() {
        if (IS_MOBILE) {
            return 1;
        }

        const avgDims = Math.min(this.app.screenWidth, this.app.screenHeight);
        return clamp((avgDims / 1000.0) * 1.9, 0.1, 10);
    }

    /**
     * Returns whether this platform supports a toggleable fullscreen
     */
    getSupportsFullscreen() {
        return true;
    }

    /**
     * Should set the apps fullscreen state to the desired state
     * @param {boolean} flag
     */
    setFullscreen(flag) {
        ipcRenderer.send("set-fullscreen", flag);
    }

    getSupportsAppExit() {
        return true;
    }
    /**
     * Attempts to quit the app
     */
    exitApp() {
        logger.log(this, "Sending app exit signal");
        ipcRenderer.send("exit-app");
    }

    /**
     * Whether this platform supports a keyboard
     */
    getSupportsKeyboard() {
        return true;
    }

    /**
     * Should return the minimum supported zoom level
     * @returns {number}
     */
    getMinimumZoom() {
        return 0.1 * this.getScreenScale();
    }

    /**
     * Should return the maximum supported zoom level
     * @returns {number}
     */
    getMaximumZoom() {
        return 3.5 * this.getScreenScale();
    }

    getScreenScale() {
        return Math.min(window.innerWidth, window.innerHeight) / 1024.0;
    }
}
