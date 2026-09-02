import { HUser } from "../user/types/user.types";
import ChatModel from "./models/chat.model";
import UserModel from "../user/models/user.model";
import { NotFoundException } from "../../utils/error.exceptions";

class ChatService {
async getChat (user:HUser, id: string) {
  const friend = await UserModel.findById(id)
  if(!friend) {
    throw new NotFoundException("Friend not found")
  }
  let chat = await ChatModel.findOne({
    group: {
      $exists: false
    },
    participants: {
      $all: [user._id, friend._id]
    }
  }).populate("participants messages")

  if (!chat) {
    chat = await ChatModel.create({
      participants: [
        user._id, friend._id
      ],
      createdBy: user._id
    })
  }

  return chat
}

}

export default new ChatService