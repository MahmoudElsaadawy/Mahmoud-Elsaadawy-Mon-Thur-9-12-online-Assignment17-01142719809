import { Socket } from "socket.io";
import { NotFoundException } from "../../utils/error.exceptions";
import { connectedSocketsKey, redisGet } from "../../utils/redis/redis.service";
import MessageModel from "../message/models/message.model";
import UserModel from "../user/models/user.model";
import ChatModel from "./models/chat.model";

class ChatSocketService {
  async sendMessage({
    socket,
    data,
  }: {
    socket: Socket;
    data: { content: string; conversationId: string };
  }) {
    const createdBy = socket.user._id;
    const { content, conversationId } = data;

    const friend = await UserModel.findById(conversationId);
    if (!friend) {
      throw new NotFoundException("Friend not found");
    }
    const chat = await ChatModel.findOne({
      group: {
        $exists: false,
      },
      participants: {
        $all: [createdBy, friend._id],
      },
    }).populate("messages");

    if (!chat) {
      throw new NotFoundException("Chat not found");
    }
    const createdMessage = await MessageModel.create({
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

    const friendSockets: string[] | string | null = await redisGet(
      connectedSocketsKey(friend.id),
    );
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
}

export default new ChatSocketService();
