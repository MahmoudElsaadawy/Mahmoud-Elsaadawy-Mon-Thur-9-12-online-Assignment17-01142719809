"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chat_socket_service_1 = __importDefault(require("./chat.socket.service"));
class ChatEvents {
    async sendMessage(socket) {
        socket.on("send_message", (data) => {
            chat_socket_service_1.default.sendMessage({ socket, data });
        });
    }
    async joinRoom(socket) {
        socket.on("join_conversation", (roomid) => {
            return chat_socket_service_1.default.joinRoom(socket, roomid);
        });
    }
}
exports.default = new ChatEvents();
