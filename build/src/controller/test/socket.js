"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestSocket = void 0;
const TestSocket = async (req, res, next) => {
    res.status(200).json({ message: "sam" });
};
exports.TestSocket = TestSocket;
