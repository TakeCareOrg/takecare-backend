"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
exports.app = app;
const port = 3000;
app.get("/", (req, res) => {
    res.send("Hello World");
});
const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
exports.server = server;
