"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chat_socket_service_1 = __importDefault(require("./chat.socket.service"));
class ChatGateWay {
    register(socket) {
        socket.on("send_message", (data) => {
            chat_socket_service_1.default.sendMessage({ socket, data });
        });
    }
}
exports.default = new ChatGateWay();
