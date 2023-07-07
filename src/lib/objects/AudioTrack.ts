export default class AudioTrack {
  public title: string;
  public stream: AsyncGenerator<Uint8Array, void, unknown>;

  constructor(
    title: string,
    stream: AsyncGenerator<Uint8Array, void, unknown>
  ) {
    this.title = title;
    this.stream = stream;
  }
}
