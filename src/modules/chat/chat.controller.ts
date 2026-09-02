import { Router } from "express";
import { auth } from "../../middleware/auth.middleware";
import chatService from "./chat.service";
import { successResponse } from "../../utils/success.response";
import * as chatValidation from "./chat.validation"
import { validation } from "../../middleware/validation.middleware";

const router = Router();

export const routes = {
  base: "/chats",
  getChat: "/:id",
};

router.get(routes.getChat, validation(chatValidation.getChatSchema), auth, async (req, res) => {
  const user = req.user;
  const friendId = req.params.id as string;
  const data = await chatService.getChat(user, friendId);

  return successResponse({ res, data });
});

export default router;
