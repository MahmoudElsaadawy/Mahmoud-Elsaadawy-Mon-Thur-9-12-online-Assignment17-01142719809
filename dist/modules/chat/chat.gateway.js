"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chat_events_1 = __importDefault(require("./chat.events"));
class ChatGateWay {
    register(socket) {
        chat_events_1.default.sendMessage(socket);
        chat_events_1.default.joinRoom(socket);
    }
}
exports.default = new ChatGateWay();
