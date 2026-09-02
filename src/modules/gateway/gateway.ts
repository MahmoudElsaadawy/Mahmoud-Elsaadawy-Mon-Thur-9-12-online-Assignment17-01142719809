import { Server as httpServer } from "http";
import { Server, Socket } from "socket.io";
import { decodeToken } from "../../middleware/auth.middleware";
import {
  connectedSocketsKey,
  redisDel,
  redisGet,
  redisSet,
} from "../../utils/redis/redis.service";
import chatGateway from "../chat/chat.gateway";

export const initializeIo = (httpServer: httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const authorization = `Bearer ${token}`;
      const { user } = await decodeToken(authorization);
      socket.user = user;
      next();
    } catch (e) {
      next(e as Error);
    }
  });

  io.on("connection", (socket: Socket) => {
    registerNewUser(socket);
    socket.on("disconnect", () => {
      revokeUser(socket);
    });
    chatGateway.register(socket)
  });
};

const registerNewUser = async (socket: Socket) => {
  let userSockets: string[] | string | null = await redisGet(
    connectedSocketsKey(socket.user.id),
  );
  if (userSockets) {
    userSockets = JSON.parse(userSockets);
    redisSet(
      connectedSocketsKey(socket.user.id),
      JSON.stringify([socket.id, ...(userSockets as [])]),
      30,
    );
  } else {
    redisSet(
      connectedSocketsKey(socket.user.id),
      JSON.stringify([socket.id]),
      30,
    );
  }
};

const revokeUser = async (socket: Socket) => {
  const userSockets: string[] | string | null = await redisGet(
    connectedSocketsKey(socket.user.id),
  );
  let newUserSockets = JSON.parse(userSockets as string) as string[];
  newUserSockets = newUserSockets.filter((ele) => ele != socket.id);
  redisDel(connectedSocketsKey(socket.user.id));
  if (newUserSockets.length != 0) {
    redisSet(
      connectedSocketsKey(socket.user.id),
      JSON.stringify(newUserSockets),
      30,
    );
  }
};
