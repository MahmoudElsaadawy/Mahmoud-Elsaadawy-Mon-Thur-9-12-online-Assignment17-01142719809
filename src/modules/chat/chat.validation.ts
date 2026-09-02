import { isValidObjectId } from "mongoose";
import z from "zod";

export const getChatSchema = {
  params: z.strictObject({
    id: z.string().refine(
      (value) => {
        return isValidObjectId(value);
      },
      { error: "Invalid id value" },
    ),
  }),
};

export const createGroupSchema = {
  body: z.strictObject({
    group: z.string(),
    participants: z.string().refine(
      (value) => {
        return isValidObjectId(value);
      },
      { error: "Invalid id value" },
    ),
  }),
};
