import { Socket } from "socket.io";
import chatSocketService from "./chat.socket.service";

class ChatGateWay {
  register(socket: Socket) {
    socket.on("send_message", (data) => {
      chatSocketService.sendMessage({socket, data});
    });
  }
}

export default new ChatGateWay();
