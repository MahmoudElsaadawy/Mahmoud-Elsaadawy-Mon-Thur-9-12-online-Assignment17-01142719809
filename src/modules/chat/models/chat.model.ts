import mongoose from "mongoose";
import { IChat } from "../types/chat.type";
import "../../message/models/message.model"

const chatSchema = new mongoose.Schema<IChat>(
  {
    participants: {
      type: [mongoose.Types.ObjectId],
      ref: "User",
    },
    messages: {
      type: [mongoose.Types.ObjectId],
      ref: "Message",
    },
    group: String,
    groupImage: String,
    roomId: String,
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    strictQuery: true,
    strict: true,
    optimisticConcurrency: true,
    toJSON: {
      getters: true,
    },
    toObject: {
      getters: true,
    },
  },
);

const chatModel = mongoose.model("Chat", chatSchema);

export default chatModel;
