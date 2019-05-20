/// <reference types="node"/>
import XpresserRouter from "@xpresser/router";
import fs from "fs";
import _ from "lodash";
import {Xjs} from "./global";
import Configurations = require("./src/config");
import ObjectCollection = require("./src/helpers/ObjectCollection");

const {Config, Options} = Configurations;

const Xpresser = (AppConfig: object | string, AppOptions?: XpresserOptions) => {

    if (AppConfig === undefined) {
        AppConfig = {};
    }
    if (AppOptions === undefined) {
        AppOptions = {};
    }

    if (typeof AppConfig === "string") {
        if (fs.lstatSync(AppConfig).isFile()) {
            AppConfig = require(AppConfig);
        } else {
            console.error("Config file not found!");
            console.error("Using default config.");

            AppConfig = {};
        }
    }

    AppConfig = _.merge(Config, AppConfig);
    AppOptions = _.extend(Options, AppOptions);

    const $ = {} as Xjs;

    global.$ = $;
    global._ = _;

    $.config = AppConfig;
    $.$config = new ObjectCollection($.config);
    $.$options = AppOptions;
    $.engineData = new ObjectCollection();

    // Include Loggers
    require("./src/extensions/Loggers");

    $.logIfNotConsole(`Starting ${$.config.name}...`);

    // Include Path Extension
    require("./src/extensions/Path");

    // Global
    require("./src/global");

    // Require Plugin Engine and load plugins
    const PluginEngine = require("./src/PluginEngine");
    PluginEngine.loadPlugins();

    // Add Router
    $.router = new XpresserRouter();

    if ($.$options.isConsole) {
        require("./src/StartConsole");
    } else {
        require("./src/StartHttp");
    }
};

export = Xpresser;
