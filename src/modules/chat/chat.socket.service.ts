import { Socket } from "socket.io";
import UserModel from "../user/models/user.model";
import { NotFoundException } from "../../utils/error.exceptions";
import ChatModel from "./models/chat.model";
import MessageModel from "../message/models/message.model";

class ChatSocketService {
  async sendMessage({
    socket,
    data,
  }: {
    socket: Socket;
    data: { content: string; conversationId: string };
  }) {
    const createdBy = socket.user._id
    const {content, conversationId} = data

    const friend = await UserModel.findById(conversationId)
    if(!friend) {
      throw new NotFoundException("Friend not found")
    }
    const chat = await ChatModel.findOne({
      group: {
        $exists: false
      },
      participants: {
        $all: [createdBy, friend._id]
      }
    })
    if(!chat) {
      throw new NotFoundException("Chat not found")
    }
    const newMessage = await MessageModel.create({
      content,
      attachments: [],
      createdBy,
      sentTo: friend._id,
    })
  }
}

export default new ChatSocketService();
