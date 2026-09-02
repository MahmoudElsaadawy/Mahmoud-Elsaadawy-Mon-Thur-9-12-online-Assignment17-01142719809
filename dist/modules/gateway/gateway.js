"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeIo = void 0;
const socket_io_1 = require("socket.io");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const redis_service_1 = require("../../utils/redis/redis.service");
const chat_gateway_1 = __importDefault(require("../chat/chat.gateway"));
const initializeIo = (httpServer) => {
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: "*",
        },
    });
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            const authorization = `Bearer ${token}`;
            const { user } = await (0, auth_middleware_1.decodeToken)(authorization);
            socket.user = user;
            next();
        }
        catch (e) {
            next(e);
        }
    });
    io.on("connection", (socket) => {
        registerNewUser(socket);
        socket.on("disconnect", () => {
            revokeUser(socket);
        });
        chat_gateway_1.default.register(socket);
    });
};
exports.initializeIo = initializeIo;
const registerNewUser = async (socket) => {
    let userSockets = await (0, redis_service_1.redisGet)((0, redis_service_1.connectedSocketsKey)(socket.user.id));
    if (userSockets) {
        userSockets = JSON.parse(userSockets);
        (0, redis_service_1.redisSet)((0, redis_service_1.connectedSocketsKey)(socket.user.id), JSON.stringify([socket.id, ...userSockets]), 30);
    }
    else {
        (0, redis_service_1.redisSet)((0, redis_service_1.connectedSocketsKey)(socket.user.id), JSON.stringify([socket.id]), 30);
    }
};
const revokeUser = async (socket) => {
    const userSockets = await (0, redis_service_1.redisGet)((0, redis_service_1.connectedSocketsKey)(socket.user.id));
    let newUserSockets = JSON.parse(userSockets);
    newUserSockets = newUserSockets.filter((ele) => ele != socket.id);
    (0, redis_service_1.redisDel)((0, redis_service_1.connectedSocketsKey)(socket.user.id));
    if (newUserSockets.length != 0) {
        (0, redis_service_1.redisSet)((0, redis_service_1.connectedSocketsKey)(socket.user.id), JSON.stringify(newUserSockets), 30);
    }
};
