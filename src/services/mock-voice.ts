import type { ProviderStatus, VoiceState } from './contracts';

export class MockVoiceAdapter {
  public readonly status: ProviderStatus = {
    mode: 'mock',
    ready: true,
    humanTodo: 'Create a RealtimeKit account, issue server-side room tokens, and complete microphone/device acceptance.',
  };

  private state: VoiceState = { joined: false, reconnecting: false, muted: true, pushToTalkActive: false, recordingEnabled: false };
  private permissionGranted = false;

  public join(permission: 'granted' | 'denied'): VoiceState {
    this.permissionGranted = permission === 'granted';
    this.state = permission === 'granted'
      ? { ...this.state, joined: true, reconnecting: false, muted: true }
      : { ...this.state, joined: false, reconnecting: false, muted: true, pushToTalkActive: false };
    return this.state;
  }

  public disconnect(): VoiceState {
    this.state = { ...this.state, joined: false, reconnecting: this.permissionGranted, muted: true, pushToTalkActive: false };
    return this.state;
  }

  public reconnect(): VoiceState {
    this.state = this.permissionGranted
      ? { ...this.state, joined: true, reconnecting: false, muted: true, pushToTalkActive: false }
      : { ...this.state, joined: false, reconnecting: false, muted: true, pushToTalkActive: false };
    return this.state;
  }

  public setMuted(muted: boolean): VoiceState {
    this.state = { ...this.state, muted: !this.state.joined || muted, pushToTalkActive: muted ? false : this.state.pushToTalkActive };
    return this.state;
  }

  public setPushToTalk(active: boolean): VoiceState {
    this.state = { ...this.state, pushToTalkActive: this.state.joined && active, muted: !(this.state.joined && active) };
    return this.state;
  }

  public current(): VoiceState {
    return this.state;
  }
}
