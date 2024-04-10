import SocketServer from "@shared/lib/objects/SocketServer.ts";
import { decodeJwt } from "@utils/api.ts";

export default class AudioStreamSocketServer extends SocketServer {
  constructor(socket: WebSocket) {
    super(socket, async (token) => {
      const payload = await decodeJwt(token);

      if (!payload?.sub) return false;

      if (payload.sub !== "internal") return false;

      return true;
    });
  }
}
