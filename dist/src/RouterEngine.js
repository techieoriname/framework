"use strict";
const fs = require("fs");
const AllRoutesKey = "RouterEngine:allRoutes";
const NameToRoute = {};
const ProcessedRoutes = [];
class RouterEngine {
    /**
     * Get All Registered Routes
     * @returns {*}
     */
    static allRoutes() {
        return $.engineData.get(AllRoutesKey);
    }
    /**
     * Add Routes to already set routes
     * @param route
     */
    static addToRoutes(route) {
        if (typeof route.routes !== "undefined" && Array.isArray(route.routes)) {
            const allRoutes = $.router.routes;
            $.router.routes = _.concat(allRoutes, route.routes);
            $.engineData.set(AllRoutesKey, $.router.routes);
        }
    }
    /**
     * Get All Processed Routes
     * @returns {*}
     */
    static allProcessedRoutes($format) {
        if ($format === "array") {
            const routesArray = [];
            for (let i = 0; i < ProcessedRoutes.length; i++) {
                const processedRoute = ProcessedRoutes[i];
                const routeArray = [
                    processedRoute.method.toUpperCase(),
                    processedRoute.path,
                    processedRoute.name || null,
                ];
                routesArray.push(routeArray);
            }
            return routesArray;
        }
        return ProcessedRoutes;
    }
    /**
     * @private
     * @param format
     * @returns {string}
     */
    static namedRoutes(format = false) {
        if (format !== false) {
            const names = Object.keys(NameToRoute);
            const newFormat = {};
            for (let i = 0; i < names.length; i++) {
                const name = names[i];
                const route = NameToRoute[name];
                newFormat[route.method + " " + route.path] = "{" + route.name + "} ===> " + route.controller;
            }
            // noinspection JSValidateTypes
            if (typeof format === "string" && format === "json") {
                return JSON.stringify(newFormat, null, 2);
            }
            return newFormat;
        }
        return NameToRoute;
    }
    /**
     * NameToPath
     * @param returnKey
     * @return {Object}
     */
    static nameToPath(returnKey = "path") {
        const localVariableName = "RouterEngine:nameToPath";
        if ($.engineData.has(localVariableName)) {
            return $.engineData.get(localVariableName);
        }
        const names = Object.keys(NameToRoute);
        const newRoutes = {};
        for (let i = 0; i < names.length; i++) {
            const name = names[i];
            newRoutes[name] = NameToRoute[name][returnKey];
        }
        if (returnKey !== "Path.ts") {
            return newRoutes;
        }
        $.engineData.set(localVariableName, newRoutes);
        return newRoutes;
    }
    /**
     * NameToUrl
     * @return {Object}
     */
    static nameToUrl() {
        const localVariableName = "RouterEngine:nameToUrl";
        if ($.engineData.has(localVariableName)) {
            return $.engineData.get(localVariableName);
        }
        const routes = RouterEngine.nameToPath();
        const names = Object.keys(routes);
        const newRoutes = {};
        for (let i = 0; i < names.length; i++) {
            const name = names[i];
            newRoutes[name] = $.helpers.route(name, [], false);
        }
        $.engineData.set(localVariableName, newRoutes);
        return newRoutes;
    }
    /**
     * Process Routes
     * @param routes
     * @param parent
     */
    static processRoutes(routes = null, parent = {}) {
        const Controller = require("./ControllerEngine");
        if (!Array.isArray(routes)) {
            routes = RouterEngine.allRoutes();
        }
        for (let i = 0; i < routes.length; i++) {
            let route = routes[i].data;
            let nameWasGenerated = false;
            /*
            * If Route has children (meaning it is a Group/Path),
            * and also has a parent with children, it extends the parent.
            *
            * This means if a child of a route is a Group/Path and does not have controller set
            * it automatically inherits the parent controller
            *
            * e.g
            * Route.path('/api', () => {
            *   // Another Path here
            *
            *   Route.path('user', ()=> {
            *       // Some Routes
            *   });
            *
            *   // The path above i.e "/api/user" will inherit the parent
            *   // Route controller and its other properties unless it has it's own defined.
            *
            * }).controller('Auth').as('auth');
            */
            if (typeof route.children !== "undefined" && Array.isArray(route.children)) {
                if (parent.children !== "undefined") {
                    // tslint:disable-next-line:max-line-length
                    if (typeof route.as === "string" && typeof parent.as === "string" && route.as.substr(0, 1) === ".") {
                        route.as = parent.as + route.as;
                    }
                    route = _.extend({}, parent, route);
                }
            }
            if (!route.children && parent.useMethodAsName && !route.name) {
                route.name = route.controller;
                nameWasGenerated = true;
            }
            if (parent.as && typeof route.name === "string" && route.name.substr(0, 1) !== "/") {
                if (route.path === "" && nameWasGenerated) {
                    route.name = parent.as;
                }
                else {
                    route.name = parent.as + "." + route.name;
                }
            }
            if (route.name) {
                if (route.name.substr(0, 1) === "/") {
                    route.name = route.name.substr(1);
                }
                route.name = route.name.toLowerCase();
            }
            if (!route.children && parent.controller && route.controller && !route.controller.includes("@")) {
                route.controller = parent.controller + "@" + route.controller;
            }
            if (parent.path) {
                if (route.path.length && parent.path.substr(-1) !== "/" && route.path.substr(0, 1) !== "/") {
                    route.path = "/" + route.path;
                }
                route.path = parent.path + route.path;
            }
            if (route.path.substr(0, 2) === "//") {
                route.path = route.path.substr(1);
            }
            if (typeof route.name !== "undefined") {
                NameToRoute[route.name] = route;
            }
            if (typeof route.controller === "string" && route.controller.includes("@")) {
                const split = route.controller.split("@");
                let controller = split[0];
                const method = split[1];
                let controllerPath = $.use.controller(controller + $.config.project.fileExtension);
                if (!fs.existsSync(controllerPath)) {
                    if (!controller.toLowerCase().includes("controller")) {
                        controllerPath = $.use.controller(controller + "Controller" + $.config.project.fileExtension);
                        if (!fs.existsSync(controllerPath)) {
                            $.logErrorAndExit("Controller: " + split.join("@") + " not found");
                        }
                        controller = controller + "Controller";
                    }
                }
                route.controller = controller + "@" + method;
            }
            if (typeof route.children !== "undefined" && Array.isArray(route.children) && route.children.length) {
                RouterEngine.processRoutes(route.children, route);
            }
            else {
                // Add To All Routes
                ProcessedRoutes.push(route);
                if ($.app && (!$.$options.isTinker && !$.$options.isConsole)) {
                    $.app[route.method](route.path, Controller(route));
                }
            }
        }
    }
}
module.exports = RouterEngine;
//# sourceMappingURL=RouterEngine.js.map