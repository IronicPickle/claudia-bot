import { Bot, VoiceOpcodes } from "discordeno";
import AudioPlayer from "@objects/AudioPlayer.ts";
import AudioStream from "@objects/AudioStream.ts";

export interface AudioPlayerWsServerDetails {
  token: string;
  endpoint: string;
}

export interface AudioPlayerWsSessionDetials {
  channelId: bigint;
  sessionId: string;
  userId: bigint;
}

export interface AudioPlayerUdpServerDetails {
  ip: string;
  port: number;
  ssrc: number;
}

export interface AudioPlayerUdpSessionDetails {
  videoCodec: string;
  secretKey: Uint8Array;
  mode: string;
  mediaSessionId: string;
  audioCodec: string;
}

export interface AudioStreamFilters {
  pitch: number;
  volume: number;
  bass: number;
  treble: number;
}

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
  // [VoiceOpcodes.Heartbeat]: {};
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
  [VoiceOpcodes.Heartbeat]: {
    op: VoiceOpcodes.Heartbeat;
    d: number;
  };
  [VoiceOpcodes.Resume]: {};
  [VoiceOpcodes.Hello]: {
    op: VoiceOpcodes.Hello;
    d: { heartbeat_interval: number };
  };
  [VoiceOpcodes.Resumed]: {
    op: VoiceOpcodes.Resumed;
    d: null;
  };
  [VoiceOpcodes.ClientDisconnect]: {};
}

export type VoiceWsRes =
  | VoiceWsEventData[VoiceOpcodes.Ready]
  | VoiceWsEventData[VoiceOpcodes.Resumed]
  | VoiceWsEventData[VoiceOpcodes.SessionDescription]
  | VoiceWsEventData[VoiceOpcodes.Hello]
  | VoiceWsEventData[VoiceOpcodes.Heartbeat];

export interface AudioBot extends Bot {
  audio: {
    streams: Record<string, AudioStream>;
    players: Record<string, AudioPlayer>;
  };
}

export type AudioAsyncIterator =
  | AsyncGenerator<Uint8Array, void, unknown>
  | AsyncIterableIterator<Uint8Array>;

export interface FfprobeMetadata<T extends Record<string, any>> {
  format?: {
    filename?: string;
    nb_streams?: number;
    nb_programs?: number;
    format_name?: string;
    format_long_name?: string;
    start_time?: string;
    duration?: string;
    size?: string;
    bit_rate?: string;
    probe_score?: number;
    tags?: T;
  };
}

export type YoutubeMetadata = FfprobeMetadata<{
  title?: string;
  ARTIST?: string;
  ALBUM?: string;
  DATE?: string;
  DESCRIPTION?: string;
  SYNOPSIS?: string;
  PURL?: string;
  COMMENT?: string;
  ENCODER?: string;
}>;

export type SpotifyMetadata = FfprobeMetadata<{
  title?: string;
  artist?: string;
  track?: string;
  album?: string;
  disc?: string;
  date?: string;
  encoded_by?: string;
  album_artist?: string;
  encoder?: string;
  copyright?: string;
  comment?: string;
  "lyrics-xxx"?: string;
}>;

export type SoundCloudMetadata = FfprobeMetadata<{
  title?: string;
  artist?: string;
  date?: string;
  genre?: string;
  comment?: string;
}>;
