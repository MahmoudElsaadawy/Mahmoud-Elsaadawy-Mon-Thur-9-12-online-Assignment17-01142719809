import { Socket, Server } from "socket.io";
import chatSocketService from "./chat.socket.service";

class ChatEvents {
  async sendMessage(socket: Socket) {
    socket.on("send_message", (data) => {
      chatSocketService.sendMessage({ socket, data });
    })
  }
}

export default new ChatEvents();
