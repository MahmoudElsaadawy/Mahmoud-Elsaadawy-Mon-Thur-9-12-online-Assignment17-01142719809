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
    data: {
      content: string;
      conversationId: string;
      conversationType?: string;
    };
  }) {
    if (data.conversationType == "group") {
      return this.sendGroupMessage({ socket, data });
    }
    return this.sendDirectMessage({ socket, data });
  }

  async sendGroupMessage({
    socket,
    data,
  }: {
    socket: Socket;
    data: {
      content: string;
      conversationId: string;
      conversationType?: string;
    };
  }) {
    const createdBy = socket.user._id;
    const { content, conversationId } = data;

    const chat = await ChatModel.findById(conversationId);
    if (!chat) {
      throw new NotFoundException("Group chat not found");
    }

    const createdMessage = await MessageModel.create({
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

  async sendDirectMessage({
    socket,
    data,
  }: {
    socket: Socket;
    data: {
      content: string;
      conversationId: string;
      conversationType?: string;
    };
  }) {
    const createdBy = socket.user._id;
    const { content, conversationId } = data;

    const friend = await UserModel.findById(conversationId);
    if (!friend) {
      throw new NotFoundException("Friend not found");
    }

    const chat = await ChatModel.findOne({
      group: { $exists: false },
      participants: { $all: [createdBy, friend._id] },
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
  
  async joinRoom(socket: Socket, roomId: { type: string; id: string }) {
    const group = ChatModel.findOne({
      _id: roomId.id,
      group: {
        $exists: true,
      },
      participants: {
        $in: [socket.user._id],
      },
    });
    if (!group) {
      throw new NotFoundException("Group chat not found");
    }
    socket.join(roomId.id);
    console.log(`Socket ${socket.id} successfully joined room: ${roomId.id}`);
  }
}

export default new ChatSocketService();
