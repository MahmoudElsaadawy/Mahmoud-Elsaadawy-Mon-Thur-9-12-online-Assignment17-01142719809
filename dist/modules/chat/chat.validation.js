"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChatSchema = void 0;
const mongoose_1 = require("mongoose");
const zod_1 = __importDefault(require("zod"));
exports.getChatSchema = {
    params: zod_1.default.strictObject({
        id: zod_1.default.string().refine((value) => {
            return (0, mongoose_1.isValidObjectId)(value);
        }, { error: "Invalid id value" }),
    }),
};
