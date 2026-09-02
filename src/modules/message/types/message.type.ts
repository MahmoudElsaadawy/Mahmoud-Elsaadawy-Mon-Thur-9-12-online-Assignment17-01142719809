import { HydratedDocument, Types } from "mongoose"

export interface IMessage {
  createdBy: Types.ObjectId
  sentTo: Types.ObjectId
  content: string
  attachments: string[]
  createdAt: Date
  updatedAt: Date
}

export type HMessage = HydratedDocument<IMessage>