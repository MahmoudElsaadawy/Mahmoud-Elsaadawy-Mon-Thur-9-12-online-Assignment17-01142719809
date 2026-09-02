"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const messageSchema = new mongoose_1.default.Schema({
    attachments: {
        type: [String],
    },
    content: {
        type: String,
        required: function () {
            return this.attachments.length == 0;
        },
    },
    createdBy: {
        type: mongoose_1.default.Types.ObjectId,
        required: true,
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
const messageModel = mongoose_1.default.model("Message", messageSchema);
exports.default = messageModel;
