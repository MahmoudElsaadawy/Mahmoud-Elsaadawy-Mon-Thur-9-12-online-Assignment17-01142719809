import { HydratedDocument, Types } from "mongoose"

export interface IChat {
  participants: Types.ObjectId[]
  messages: Types.ObjectId[]
  group?: string
  groupImage?: string
  roomId?: string
  createdBy?: Types.ObjectId
  createdAt?: Date
  updatedAt?: Date
}

export type HChat = HydratedDocument<IChat>