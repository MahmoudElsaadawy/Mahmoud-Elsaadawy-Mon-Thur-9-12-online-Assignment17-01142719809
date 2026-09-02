"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chat_model_1 = __importDefault(require("./models/chat.model"));
const user_model_1 = __importDefault(require("../user/models/user.model"));
const error_exceptions_1 = require("../../utils/error.exceptions");
class ChatService {
    async getChat(user, id) {
        const friend = await user_model_1.default.findById(id);
        if (!friend) {
            throw new error_exceptions_1.NotFoundException("Friend not found");
        }
        let chat = await chat_model_1.default.findOne({
            group: {
                $exists: false
            },
            participants: {
                $all: [user._id, friend._id]
            }
        }).populate("participants messages");
        if (!chat) {
            chat = await chat_model_1.default.create({
                participants: [
                    user._id, friend._id
                ],
                createdBy: user._id
            });
        }
        return chat;
    }
}
exports.default = new ChatService;
