import { Socket } from "socket.io";
import chatSocketService from "./chat.socket.service";
import chatEvents from "./chat.events";

class ChatGateWay {
  register(socket: Socket) {
    chatEvents.sendMessage(socket)
  }
}

export default new ChatGateWay();
