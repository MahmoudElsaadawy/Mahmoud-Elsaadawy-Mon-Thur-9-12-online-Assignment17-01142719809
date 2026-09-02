"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const user_model_1 = __importDefault(require("../user/models/user.model"));
const error_exceptions_1 = require("../../utils/error.exceptions");
const chat_model_1 = __importDefault(require("./models/chat.model"));
const message_model_1 = __importDefault(require("../message/models/message.model"));
class ChatSocketService {
    async sendMessage({ socket, data, }) {
        const createdBy = socket.user._id;
        const { content, conversationId } = data;
        const friend = await user_model_1.default.findById(conversationId);
        if (!friend) {
            throw new error_exceptions_1.NotFoundException("Friend not found");
        }
        const chat = await chat_model_1.default.findOne({
            group: {
                $exists: false
            },
            participants: {
                $all: [createdBy, friend._id]
            }
        });
        if (!chat) {
            throw new error_exceptions_1.NotFoundException("Chat not found");
        }
        const newMessage = await message_model_1.default.create({
            content,
            attachments: [],
            createdBy,
            sentTo: friend._id,
        });
    }
}
exports.default = new ChatSocketService();
