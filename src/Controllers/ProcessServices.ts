import {Xpresser} from "../../xpresser";
import {XpresserHttp} from "../../types/http";
import {ServerResponse} from "http";
import ControllerServiceError = require("./ControllerServiceError");

declare const $: Xpresser;

export = async (
    x: XpresserHttp.Engine,
    requestServices: any,
    config: {
        services?: object,
    },
    error: (...args) => any,
) => {
    const DefinedServices = config.services || {};
    const completedServices = {};
    const serviceKeys = Object.keys(requestServices);

    for (const serviceKey of serviceKeys) {
        const options = {
            http: x,
            services: completedServices,
            error: (...args) => {
                return new ControllerServiceError(args);
            },
        };

        const action = DefinedServices[serviceKey];
        let serviceResult: any | ControllerServiceError;

        if (Array.isArray(action)) {
            serviceResult = action[0](
                options,
            );
        } else {
            serviceResult = DefinedServices[serviceKey](
                requestServices[serviceKey],
                options,
            );
        }

        if ($.fn.isPromise(serviceResult)) {
            serviceResult = await serviceResult;
        }

        if (serviceResult instanceof ServerResponse) {
            break;
        }

        // Run user defined error
        if (serviceResult instanceof ControllerServiceError && error) {
            serviceResult = error(x, ...serviceResult.args);
            break;
        }

        // Add ServiceKey to completed service keys.
        completedServices[serviceKey] = serviceResult;
    }

    const completedServiceKeys = Object.keys(completedServices);
    const lastCompletedService = completedServiceKeys[completedServiceKeys.length - 1];

    if (lastCompletedService) {
        return completedServices[lastCompletedService];
    }
};
