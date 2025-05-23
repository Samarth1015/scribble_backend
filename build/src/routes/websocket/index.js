"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const socket_1 = require("../../controller/test/socket");
const router = (0, express_1.Router)();
router.get("/", socket_1.TestSocket);
exports.default = router;
