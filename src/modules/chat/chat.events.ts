import { Socket, Server } from "socket.io";
import chatSocketService from "./chat.socket.service";

class ChatEvents {
  async sendMessage(socket: Socket) {
    socket.on("send_message", (data) => {
      chatSocketService.sendMessage({ socket, data });
    });
  }
  async joinRoom(socket: Socket) {
    socket.on("join_conversation", (roomid)=> {
      return chatSocketService.joinRoom(socket, roomid)
    })
  }
}

export default new ChatEvents();
