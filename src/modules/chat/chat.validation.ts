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

export type getChatSchemaData = z.infer<
  typeof getChatSchema.params
>;