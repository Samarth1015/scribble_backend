"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const test_1 = __importDefault(require("./routes/test"));
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
exports.app = app;
app.use(express_1.default.json());
app.use("/api/test", test_1.default);
app.use(errorHandler_1.errorHandler);
