/// <reference types="node"/>
// Import system required libraries
import fs = require("fs");
import _ = require("lodash");

// Import default config.
import Configurations = require("./config");

// XpresserRouter && ObjectionCollection
import XpresserRouter = require("@xpresser/router");
import ObjectCollection = require("object-collection");

/**
 * Get default Config and Options from Configurations
 */
const {Config, Options} = Configurations;

/**
 * Xpresser Initializer;
 * @param AppConfig
 * @param AppOptions
 * @constructor
 */
const Xpresser = (AppConfig: object | string, AppOptions?: XpresserOptions): Xjs => {

    if (AppConfig === undefined) {
        AppConfig = {};
    }

    if (AppOptions === undefined) {
        AppOptions = {};
    }

    if (typeof AppConfig === "string") {
        const configFile = AppConfig;
        AppConfig = {};
        if (fs.existsSync(configFile) && fs.lstatSync(configFile).isFile()) {

            try {
                AppConfig = require(configFile);
                // tslint:disable-next-line:max-line-length
                if (typeof AppConfig !== "object" || (typeof AppConfig === "object" && !Object.keys(AppConfig).length)) {
                    // noinspection ExceptionCaughtLocallyJS
                    throw new Error(`CONFIG: No exported object not found in config file (${configFile})`);
                }
            } catch (e) {
                console.error(e.message);
                process.exit();
            }

        } else {

            console.error("Config file not found!");
            process.exit();

        }
    }

    // Merge Config with DefaultConfig to replace missing values.
    AppConfig = _.merge(Config, AppConfig);
    AppOptions = _.merge(Options, AppOptions);

    // Set Xjs Global Var: $
    const $ = {} as Xjs;

    // Set $ (Xjs) && _ (lodash) to globals.
    global.$ = $;
    global._ = _;

    // Set Config to AppConfig
    $.config = AppConfig;

    /**
     * Set $.$config to an instance of ObjectCollection
     * To enable access and modify apps config.
     */
    $.$config = new ObjectCollection($.config);
    $.$options = AppOptions;

    /**
     * Engine Data serves as the store
     * for all data store by Xpresser files/components
     */
    $.engineData = new ObjectCollection();

    if (typeof global["XjsCliConfig"] !== "undefined") {
        $.$options.isConsole = true;
    } else if (process.argv[2]) {
        const LaunchType = process.argv[2];
        if (LaunchType === "cli") {
            $.$options.isConsole = true;
        }
    }

    // Include Loggers
    require("./src/Extensions/Loggers");

    $.logIfNotConsole(`Starting ${$.config.name}...`);

    // Include Path Extension
    require("./src/Extensions/Path");

    // Require Plugin Engine and load plugins
    const PluginEngine = require("./src/PluginEngine");
    const PluginData = PluginEngine.loadPlugins();

    $.engineData.set("PluginEngineData", PluginData);

    // Global
    require("./src/global");

    // Add Router
    $.router = new XpresserRouter();

    if ($.$options.isConsole) {
        require("./src/StartConsole");
    } else {
        require("./src/StartHttp");
    }

    return $;
};

export = Xpresser;
