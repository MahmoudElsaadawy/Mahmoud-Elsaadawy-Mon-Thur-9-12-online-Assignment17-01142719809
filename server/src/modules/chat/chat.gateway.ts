import { Socket } from "socket.io";
import chatEvents from "./chat.events";

class ChatGateWay {
  register(socket: Socket) {
    chatEvents.sendMessage(socket)
    chatEvents.joinRoom(socket)
  }
}

export default new ChatGateWay();
