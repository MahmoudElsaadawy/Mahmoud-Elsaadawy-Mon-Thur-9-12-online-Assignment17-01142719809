"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
require("../../message/models/message.model");
const chatSchema = new mongoose_1.default.Schema({
    participants: {
        type: [mongoose_1.default.Types.ObjectId],
        ref: "User",
    },
    messages: {
        type: [mongoose_1.default.Types.ObjectId],
        ref: "Message",
    },
    group: String,
    groupImage: String,
    roomId: {
        type: String,
        unique: true
    },
    createdBy: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "User",
    },
}, {
    timestamps: true,
    strictQuery: true,
    strict: true,
    optimisticConcurrency: true,
    toJSON: {
        getters: true,
    },
    toObject: {
        getters: true,
    },
});
const chatModel = mongoose_1.default.model("Chat", chatSchema);
exports.default = chatModel;
