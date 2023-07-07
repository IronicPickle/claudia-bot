import { Bot, VoiceOpcodes } from "../../deps/discordeno.ts";
import AudioPlayer from "../objects/AudioPlayer.ts";

export interface VoiceWsEventData {
  [VoiceOpcodes.Identify]: {};
  [VoiceOpcodes.SelectProtocol]: {};
  [VoiceOpcodes.Ready]: {
    op: VoiceOpcodes.Ready;
    d: {
      ssrc: number;
      ip: string;
      port: number;
      modes: string[];
    };
  };
  [VoiceOpcodes.Heartbeat]: {};
  [VoiceOpcodes.SessionDescription]: {
    op: VoiceOpcodes.SessionDescription;
    d: {
      video_codec: string;
      secret_key: number[];
      mode: string;
      media_session_id: string;
      audio_codec: string;
    };
  };
  [VoiceOpcodes.Speaking]: {};
  [VoiceOpcodes.HeartbeatACK]: {};
  [VoiceOpcodes.Resume]: {};
  [VoiceOpcodes.Hello]: {
    op: VoiceOpcodes.Hello;
    d: { heartbeat_interval: number };
  };
  [VoiceOpcodes.Resumed]: {};
  [VoiceOpcodes.ClientDisconnect]: {};
}

export type VoiceWsRes =
  | VoiceWsEventData[VoiceOpcodes.Ready]
  | VoiceWsEventData[VoiceOpcodes.SessionDescription]
  | VoiceWsEventData[VoiceOpcodes.Hello];

export interface AudioBot extends Bot {
  audio: {
    players: Record<string, AudioPlayer>;
  };
}
