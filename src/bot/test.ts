import { cryptoRandomString, opus } from "../deps/deps.ts";
import { VoiceOpcodes } from "../deps/discordeno.ts";
import { bot } from "./setupBot.ts";
import { isUint8Arr } from "../lib/utils/generic.ts";
import sodium from "https://deno.land/x/sodium/basic.ts";
import { iterateReader } from "https://deno.land/std@0.162.0/streams/conversion.ts";

const SAMPLE_RATE = 48000;
const FRAME_DURATION = 20;
const FPS = 1000 / FRAME_DURATION; // Frames per second
const CHANNELS = 2;
const FRAME_SIZE = SAMPLE_RATE / FPS; // Samples per frame

console.log({ SAMPLE_RATE, FRAME_DURATION, FPS, FRAME_SIZE });

await sodium.ready;

export default async () => {
  bot.eventManager.addEventListener(
    "voiceStateUpdate",
    async (_, { channelId, sessionId, userId }) => {
      console.log({ channelId, sessionId, userId });

      bot.eventManager.addEventListener(
        "voiceServerUpdate",
        (_, { token, endpoint, guildId }) => {
          console.log({ token, endpoint, guildId });

          if (!endpoint) return;

          const ws = new WebSocket(`wss://${endpoint}`);

          const socket = Deno.listenDatagram({
            hostname: "0.0.0.0",
            port: 5000,
            transport: "udp",
          });

          ws.addEventListener("error", (event) => {
            console.log({ event });
          });

          ws.addEventListener("open", () => {
            console.log("socket open");

            ws.send(
              JSON.stringify({
                op: VoiceOpcodes.Identify,
                d: {
                  server_id: guildId.toString(),
                  user_id: userId.toString(),
                  session_id: sessionId,
                  token: token,
                },
              })
            );
          });

          let ssrc!: number;
          let ip!: string;
          let port!: number;
          let modes!: string[];
          let key!: Uint8Array;

          ws.addEventListener("message", async (message) => {
            const { op, d } = JSON.parse(message.data);

            console.log(op, "->", d);

            switch (op) {
              case VoiceOpcodes.Ready: {
                ssrc = d.ssrc;
                ip = d.ip;
                port = d.port;
                modes = d.modes;

                const buffer = new ArrayBuffer(74);
                const headerData = new DataView(buffer);

                headerData.setInt16(0, 0x1, false);
                headerData.setInt16(2, 70, false);
                headerData.setInt32(4, ssrc, false);

                console.log("sending to ", { ip, port, buffer });

                socket.send(new Uint8Array(buffer), {
                  transport: "udp",
                  port: port,
                  hostname: ip,
                });

                for (const message of await socket.receive()) {
                  if (!isUint8Arr(message)) continue;

                  console.log("udp received", message);

                  const localAddress = new TextDecoder().decode(
                    message.slice(8, message.indexOf(0, 8))
                  );
                  const localPort = new DataView(message.buffer).getUint16(
                    72,
                    false
                  );

                  console.log({ localAddress, localPort });

                  ws.send(
                    JSON.stringify({
                      op: VoiceOpcodes.SelectProtocol,
                      d: {
                        protocol: "udp",
                        data: {
                          address: localAddress,
                          port: localPort,
                          mode: "xsalsa20_poly1305",
                        },
                      },
                    })
                  );
                }

                break;
              }
              case VoiceOpcodes.Hello: {
                const { heartbeat_interval } = d;

                setInterval(() => {
                  console.log("sending heartbeat");
                  ws.send(
                    JSON.stringify({
                      op: VoiceOpcodes.Heartbeat,
                      d: parseInt(
                        cryptoRandomString({
                          length: 13,
                          type: "numeric",
                        })
                      ),
                    })
                  );
                }, heartbeat_interval);

                break;
              }
              case VoiceOpcodes.SessionDescription: {
                const {
                  video_codec,
                  secret_key,
                  mode,
                  media_session_id,
                  audio_codec,
                } = d;

                key = new Uint8Array(secret_key);

                const process = Deno.run({
                  cmd: [
                    "ffmpeg",
                    "-i",
                    "./src/test2.mp4",
                    "-ac",
                    CHANNELS.toString(),
                    "-ar",
                    SAMPLE_RATE.toString(),
                    "-f",
                    "s16le",
                    "pipe:1",
                  ],
                  stdout: "piped",
                });

                const stream = new opus.Encoder({
                  application: "audio",
                }).encode_pcm_stream(FRAME_SIZE, iterateReader(process.stdout));

                ws.send(
                  JSON.stringify({
                    op: VoiceOpcodes.Speaking,
                    d: {
                      speaking: 1,
                      delay: 5,
                      ssrc,
                    },
                  })
                );

                let sequence = 0;
                let timestamp = 0;
                let nextTimeout = -1;

                for await (const chunk of stream) {
                  sequence++;
                  timestamp += FRAME_SIZE;
                  sequence %= 2 ** 16;
                  timestamp %= 2 ** 32;
                  nextTimeout += FRAME_DURATION - 0.5;

                  const headerBuffer = new ArrayBuffer(12);
                  const headerData = new DataView(headerBuffer);

                  headerData.setUint8(0, 0x80); // 1
                  headerData.setUint8(1, 0x78); // 2
                  headerData.setUint16(2, sequence, false); // 4
                  headerData.setUint32(4, timestamp, false); // 8
                  headerData.setUint32(8, ssrc, false); // 12

                  const header = new Uint8Array(headerBuffer);

                  const keyHeader = new Uint8Array(24);
                  keyHeader.set(header, 0);

                  const encryptedChunk = sodium.crypto_secretbox_easy(
                    chunk,
                    keyHeader,
                    key
                  );

                  const audioBuffer = new Uint8Array(
                    encryptedChunk.length + header.length
                  );

                  audioBuffer.set(header, 0);
                  audioBuffer.set(encryptedChunk, 12);

                  console.log({ nextTimeout });

                  setTimeout(() => {
                    console.log("sending to ", { ip, port }, { audioBuffer });

                    socket.send(audioBuffer, {
                      transport: "udp",
                      port: port,
                      hostname: ip,
                    });
                  }, nextTimeout);
                }

                break;
              }
            }
          });
        }
      );
    }
  );

  await bot.helpers.connectToVoiceChannel(
    "522474524277735464",
    "522474524755755016"
  );
};
