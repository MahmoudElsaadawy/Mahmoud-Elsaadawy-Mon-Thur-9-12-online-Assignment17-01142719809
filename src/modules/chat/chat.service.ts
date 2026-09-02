import { HUser } from "../user/types/user.types";
import ChatModel from "./models/chat.model";
import UserModel from "../user/models/user.model";
import { NotFoundException } from "../../utils/error.exceptions";
import { nanoid } from "nanoid";

class ChatService {
  async getChat(user: HUser, id: string) {
    const friend = await UserModel.findById(id);
    if (!friend) {
      throw new NotFoundException("Friend not found");
    }
    let chat = await ChatModel.findOne({
      group: {
        $exists: false,
      },
      participants: {
        $all: [user._id, friend._id],
      },
    }).populate("participants messages");

    if (!chat) {
      chat = await ChatModel.create({
        participants: [user._id, friend._id],
        createdBy: user._id,
      });
    }
    return chat;
  }

  async createGroup(group: string, participants: string[], user: HUser) {
    const foundUsers = await UserModel.find({
      _id: {
        $in: participants,
      },
    });
    if (participants.length != foundUsers.length) {
      throw new NotFoundException("Some participants is not found");
    }
    const roomId = nanoid(15);
    const newGroup = await ChatModel.create({
      participants: [...participants, user.id],
      group,
      createdBy: user._id,
      roomId,
    });
    return newGroup;
  }

  async getGroupChat(user: HUser, groupId: string) {

    const chat = await ChatModel.findOne({
      id: groupId,
      group: {
        $exists: false,
      },
      participants: {
        $in: [user._id]
      }
    }).populate("messages createdBy")

    if(!chat) {
      throw new NotFoundException("Chat not found")
    }
    return chat
  }
}

export default new ChatService();
