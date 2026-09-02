import mongoose from "mongoose";
import { IMessage } from "../types/message.type";

const messageSchema = new mongoose.Schema<IMessage>(
  {
    attachments: {
      type: [String],
    },
    content: {
      type: String,
      required: function (this: IMessage) {
        return this.attachments.length == 0;
      },
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "User",
    },
    sentTo: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "User",
    }
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

const messageModel = mongoose.model("Message", messageSchema);

export default messageModel;
