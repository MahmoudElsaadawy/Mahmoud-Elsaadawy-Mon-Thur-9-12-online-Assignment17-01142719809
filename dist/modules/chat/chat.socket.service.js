"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_exceptions_1 = require("../../utils/error.exceptions");
const redis_service_1 = require("../../utils/redis/redis.service");
const message_model_1 = __importDefault(require("../message/models/message.model"));
const user_model_1 = __importDefault(require("../user/models/user.model"));
const chat_model_1 = __importDefault(require("./models/chat.model"));
class ChatSocketService {
    async sendMessage({ socket, data, }) {
        if (data.conversationType == "group") {
            return this.sendGroupMessage({ socket, data });
        }
        return this.sendDirectMessage({ socket, data });
    }
    async sendGroupMessage({ socket, data, }) {
        const createdBy = socket.user._id;
        const { content, conversationId } = data;
        const chat = await chat_model_1.default.findById(conversationId);
        if (!chat) {
            throw new error_exceptions_1.NotFoundException("Group chat not found");
        }
        const createdMessage = await message_model_1.default.create({
            content,
            attachments: [],
            createdBy,
            sentTo: conversationId,
        });
        chat.messages.push(createdMessage._id);
        await chat.save();
        const messagePayload = {
            conversationType: "group",
            conversationId: chat._id.toString(),
            senderId: createdBy.toString(),
            senderName: socket.user.name || "User",
            text: createdMessage.content,
            timestamp: createdMessage.createdAt,
        };
        socket.emit("receive_message", messagePayload);
        socket.to(conversationId).emit("receive_message", messagePayload);
    }
    async sendDirectMessage({ socket, data, }) {
        const createdBy = socket.user._id;
        const { content, conversationId } = data;
        const friend = await user_model_1.default.findById(conversationId);
        if (!friend) {
            throw new error_exceptions_1.NotFoundException("Friend not found");
        }
        const chat = await chat_model_1.default.findOne({
            group: { $exists: false },
            participants: { $all: [createdBy, friend._id] },
        }).populate("messages");
        if (!chat) {
            throw new error_exceptions_1.NotFoundException("Chat not found");
        }
        const createdMessage = await message_model_1.default.create({
            content,
            attachments: [],
            createdBy,
            sentTo: friend._id,
        });
        chat.messages.push(createdMessage._id);
        await chat.save();
        const messagePayloadForSender = {
            conversationType: "dm",
            conversationId: friend.id,
            senderId: createdBy.toString(),
            senderName: socket.user.name || "User",
            text: createdMessage.content,
            timestamp: createdMessage.createdAt,
        };
        socket.emit("receive_message", messagePayloadForSender);
        const friendSockets = await (0, redis_service_1.redisGet)((0, redis_service_1.connectedSocketsKey)(friend.id));
        if (friendSockets) {
            const messagePayloadForRecipient = {
                ...messagePayloadForSender,
                conversationId: createdBy.toString(),
            };
            socket
                .to(JSON.parse(friendSockets))
                .emit("receive_message", messagePayloadForRecipient);
        }
    }
    async joinRoom(socket, roomId) {
        const group = chat_model_1.default.findOne({
            _id: roomId.id,
            group: {
                $exists: true,
            },
            participants: {
                $in: [socket.user._id],
            },
        });
        if (!group) {
            throw new error_exceptions_1.NotFoundException("Group chat not found");
        }
        socket.join(roomId.id);
        console.log(`Socket ${socket.id} successfully joined room: ${roomId.id}`);
    }
}
exports.default = new ChatSocketService();
