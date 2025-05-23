"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestRoute = void 0;
const TestRoute = async (req, res, next) => {
    try {
        res.status(200).json({ message: "all Okay" });
    }
    catch (err) {
        next(err);
    }
};
exports.TestRoute = TestRoute;
