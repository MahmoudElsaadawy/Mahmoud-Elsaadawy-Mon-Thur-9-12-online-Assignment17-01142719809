import { Router } from "express";
import { auth } from "../../middleware/auth.middleware";
import { successResponse } from "../../utils/success.response";
import chatRouter from "../chat/chat.controller";
import userServices from "./user.service";

const router = Router();
router.use("/:id/chats", chatRouter)

export const routes = {
  base: "/users",
  myProfile: "/profile",
  listFriends: "/list-friends",
};

router.get(routes.myProfile, auth, (req, res) => {
  const user = req.user;
  successResponse({
    res,
    data: {
      user,
    },
  });
});

router.get(routes.listFriends, auth, async (req, res) => {
  const userId = req.user.id;
  const data = await userServices.listFriends(userId);
  successResponse({
    res,
    data,
  });
});

export default router;
