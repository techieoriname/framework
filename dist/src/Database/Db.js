"use strict";
const knex = require("knex");
class DB {
    constructor() {
        if (!$.$config.has("config")) {
            return;
        }
        const database = $.config.database.config;
        const databaseConfigIsValid = $.ovp.validate(database, {
            client: { must: true },
            connection: { checkDbConfig: true },
        });
        if (!databaseConfigIsValid) {
            process.exit();
        }
        try {
            this.knex = knex($.config.database.config);
        }
        catch (e) {
            $.logAndExit(e);
        }
    }
    sql(arg) {
        if (arg == null) {
            return this.knex.queryBuilder();
        }
        return this.knex(arg);
    }
}
module.exports = DB;
//# sourceMappingURL=Db.js.map