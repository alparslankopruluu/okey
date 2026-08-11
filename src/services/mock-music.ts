import type { ProviderStatus } from './contracts';

export class MockMusicAdapter {
  public readonly status: ProviderStatus = {
    mode: 'mock',
    ready: true,
    humanTodo: 'Select, license, and bundle final music tracks before release.',
  };

  public readonly tracks = ['Quiet Orbit', 'Pearl Current', 'Midnight Luma'] as const;
  private trackIndex = 0;
  private playing = false;
  private volume = 0.55;

  public toggle(): boolean {
    this.playing = !this.playing;
    return this.playing;
  }

  public next(): string {
    this.trackIndex = (this.trackIndex + 1) % this.tracks.length;
    return this.tracks[this.trackIndex] ?? this.tracks[0];
  }

  public setVolume(volume: number): number {
    this.volume = Math.max(0, Math.min(1, volume));
    return this.volume;
  }
}
