"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = void 0;
const app_1 = require("./app");
const port = process.env.PORT || 3000;
const server = app_1.app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
exports.server = server;
