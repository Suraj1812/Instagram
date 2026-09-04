import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';

/**
 * WHY THIS LOOKS DIFFERENT FROM A NORMAL APP'S CALLING FEATURE:
 *
 * WebRTC media (audio/video) genuinely is peer-to-peer — no server sits in
 * the middle of the call itself. But before two devices can open that
 * connection, they still have to trade a small amount of setup data (an
 * "offer", an "answer", and network candidates — collectively "signaling").
 * Every WebRTC app you've used (WhatsApp, FaceTime, Zoom) has a signaling
 * server doing this handshake invisibly in the background.
 *
 * This app has no server of any kind, by design. So the handshake happens
 * manually instead: the caller generates a block of text (their "call
 * code"), sends it to the other person through any channel they like (read
 * it aloud, AirDrop it, paste it in the in-app chat, scan a QR code shown on
 * the other screen), and the receiver pastes it in to connect. Once that
 * one-time exchange happens, audio/video flows directly device-to-device.
 *
 * This is real, working WebRTC — not a mock. The only thing that's
 * "manual" is the initial handshake a server would normally automate.
 */

const ICE_SERVERS = [
  // STUN only (no TURN relay server run by us) — sufficient for two devices
  // on the same network or with permissive NAT; may fail to connect across
  // strict corporate/carrier NATs, in which case a TURN relay would be
  // needed, which is itself a server. Documented honestly rather than
  // silently failing.
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export type CallKind = 'audio' | 'video';

export interface SignalPayload {
  type: 'offer' | 'answer';
  sdp: any;
  candidates: any[];
}

export class LocalWebRTCCall {
  pc: RTCPeerConnection;
  localStream: MediaStream | null = null;
  remoteStream: MediaStream | null = null;
  private gatheredCandidates: any[] = [];
  private candidateGatherResolve: (() => void) | null = null;
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: string) => void;

  constructor() {
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.pc.onicecandidate = (e: any) => {
      if (e.candidate) this.gatheredCandidates.push(e.candidate.toJSON ? e.candidate.toJSON() : e.candidate);
    };
    this.pc.onicegatheringstatechange = () => {
      if (this.pc.iceGatheringState === 'complete') this.candidateGatherResolve?.();
    };
    this.pc.onconnectionstatechange = () => {
      this.onConnectionStateChange?.(this.pc.connectionState);
    };
    this.pc.ontrack = (e: any) => {
      if (e.streams && e.streams[0]) {
        this.remoteStream = e.streams[0];
        this.onRemoteStream?.(e.streams[0]);
      }
    };
  }

  async startLocalMedia(kind: CallKind) {
    this.localStream = await mediaDevices.getUserMedia({
      audio: true,
      video: kind === 'video' ? { facingMode: 'user' } : false,
    });
    this.localStream.getTracks().forEach((track) => this.pc.addTrack(track, this.localStream!));
    return this.localStream;
  }

  /**
   * Caller side: creates the offer and waits for ICE gathering to finish
   * before reading back localDescription. Waiting matters here more than in
   * a normal (server-signaled) WebRTC app: once gathering completes, the
   * SDP itself already contains the discovered candidates as `a=candidate`
   * lines, so we don't need to also transmit a separate candidates array —
   * that keeps the shareable code (and any QR code built from it)
   * meaningfully smaller.
   */
  async createOfferCode(): Promise<string> {
    const offer = await this.pc.createOffer({});
    await this.pc.setLocalDescription(offer);
    await this.waitForIceGathering();
    const payload: SignalPayload = { type: 'offer', sdp: this.pc.localDescription, candidates: [] };
    return encodeSignal(payload);
  }

  /** Receiver side: takes the caller's code, generates their own answer code to send back. */
  async createAnswerCode(offerCode: string): Promise<string> {
    const offer = decodeSignal(offerCode);
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer.sdp));
    for (const c of offer.candidates) {
      try { await this.pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore stale candidates */ }
    }
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await this.waitForIceGathering();
    const payload: SignalPayload = { type: 'answer', sdp: this.pc.localDescription, candidates: [] };
    return encodeSignal(payload);
  }

  /** Caller side: final step, feed in the receiver's answer code to complete the connection. */
  async acceptAnswerCode(answerCode: string) {
    const answer = decodeSignal(answerCode);
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer.sdp));
    for (const c of answer.candidates) {
      try { await this.pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore stale candidates */ }
    }
  }

  toggleMute(muted: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }

  toggleCamera(off: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = !off));
  }

  switchCamera() {
    const videoTrack = this.localStream?.getVideoTracks()[0] as any;
    videoTrack?._switchCamera?.();
  }

  hangUp() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.pc.close();
  }

  private waitForIceGathering(timeoutMs = 3000): Promise<void> {
    if (this.pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise((resolve) => {
      this.candidateGatherResolve = resolve;
      setTimeout(resolve, timeoutMs); // don't block forever on slow/blocked STUN
    });
  }
}

function encodeSignal(payload: SignalPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, 'utf-8').toString('base64');
}

function decodeSignal(code: string): SignalPayload {
  const json = Buffer.from(code.trim(), 'base64').toString('utf-8');
  return JSON.parse(json);
}
