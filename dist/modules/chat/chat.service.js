"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chat_model_1 = __importDefault(require("./models/chat.model"));
const user_model_1 = __importDefault(require("../user/models/user.model"));
const error_exceptions_1 = require("../../utils/error.exceptions");
const nanoid_1 = require("nanoid");
class ChatService {
    async getChat(user, id) {
        const friend = await user_model_1.default.findById(id);
        if (!friend) {
            throw new error_exceptions_1.NotFoundException("Friend not found");
        }
        let chat = await chat_model_1.default.findOne({
            group: {
                $exists: false,
            },
            participants: {
                $all: [user._id, friend._id],
            },
        }).populate("participants messages");
        if (!chat) {
            chat = await chat_model_1.default.create({
                participants: [user._id, friend._id],
                createdBy: user._id,
            });
        }
        return chat;
    }
    async createGroup(group, participants, user) {
        const foundUsers = await user_model_1.default.find({
            _id: {
                $in: participants,
            },
        });
        if (participants.length != foundUsers.length) {
            throw new error_exceptions_1.NotFoundException("Some participants is not found");
        }
        const roomId = (0, nanoid_1.nanoid)(15);
        const newGroup = await chat_model_1.default.create({
            participants: [...participants, user.id],
            group,
            createdBy: user._id,
            roomId,
        });
        return newGroup;
    }
    async getGroupChat(user, groupId) {
        try {
            const chat = await chat_model_1.default.findOne({
                id: groupId,
                group: {
                    $exists: true,
                },
                participants: {
                    $in: [user._id],
                },
            }).populate("messages createdBy");
            if (!chat) {
                throw new error_exceptions_1.NotFoundException("Chat not found");
            }
            return chat;
        }
        catch (e) {
            console.log(e);
        }
    }
}
exports.default = new ChatService();
