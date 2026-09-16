import React, { useEffect, useRef, useState } from 'react';
import { CallSession } from '../types';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Phone,
  Volume2,
} from 'lucide-react';
import { sounds } from '../utils/audio';
import { collection, doc, onSnapshot, setDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { updateCallStatus } from '../services/callService';

interface CallModalProps {
  session: CallSession | null;
  onAcceptCall: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  currentUserId: string;
}

export const CallModal: React.FC<CallModalProps> = ({
  session,
  onAcceptCall,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  currentUserId,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [callSeconds, setCallSeconds] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);

  // Call duration counter when connected
  useEffect(() => {
    let timer: number | null = null;
    if (session?.direction === 'connected') {
      timer = window.setInterval(() => {
        setCallSeconds((s) => s + 1);
      }, 1000);
    } else {
      setCallSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [session?.direction]);

  // Handle ringtones
  useEffect(() => {
    if (!session) {
      sounds.stopRingtone();
      return;
    }

    if (session.direction === 'incoming' || session.direction === 'outgoing') {
      sounds.startRingtone();
    } else {
      sounds.stopRingtone();
    }

    return () => {
      sounds.stopRingtone();
    };
  }, [session?.direction]);

  // Real WebRTC media + Firestore offer/answer/ICE signalling.
  useEffect(() => {
    if (!session || !session.callId || !isFirebaseConfigured || typeof RTCPeerConnection === 'undefined') return;
    let cancelled = false;
    let unsubCall: (() => void) | undefined;
    let unsubCandidates: (() => void) | undefined;

    const setup = async () => {
      try {
        const local = await navigator.mediaDevices.getUserMedia({ video: session.type === 'video', audio: true });
        if (cancelled) { local.getTracks().forEach(t => t.stop()); return; }
        setStream(local); setHasCameraPermission(true);
        if (localVideoRef.current) localVideoRef.current.srcObject = local;

        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] });
        peerRef.current = pc;
        local.getTracks().forEach(track => pc.addTrack(track, local));
        pc.ontrack = (event) => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0]; };

        const callRef = doc(db, 'calls', session.callId);
        const candidatesRef = collection(db, 'calls', session.callId, 'candidates');
        pc.onicecandidate = async (event) => {
          if (event.candidate) await addDoc(candidatesRef, { from: currentUserId, candidate: event.candidate.toJSON(), createdAt: serverTimestamp() });
        };

        unsubCandidates = onSnapshot(candidatesRef, async snap => {
          for (const change of snap.docChanges()) {
            const data = change.doc.data() as any;
            if (data.from === currentUserId || !data.candidate) continue;
            try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch {}
          }
        });

        if (session.direction === 'outgoing') {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await updateDoc(callRef, { offer: { type: offer.type, sdp: offer.sdp } });
          unsubCall = onSnapshot(callRef, async snap => {
            const data = snap.data() as any;
            if (!data) return;
            if (data.answer && !pc.currentRemoteDescription) {
              await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
            if (data.status === 'ended' || data.status === 'declined') onEndCall();
          });
        } else {
          unsubCall = onSnapshot(callRef, async snap => {
            const data = snap.data() as any;
            if (!data) return;
            if (data.status === 'accepted' && data.offer && !pc.currentRemoteDescription) {
              await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await updateDoc(callRef, { answer: { type: answer.type, sdp: answer.sdp } });
            }
            if (data.status === 'ended' || data.status === 'declined') onEndCall();
          });
        }
      } catch (err) {
        console.error('WebRTC setup failed:', err);
        setHasCameraPermission(false);
      }
    };
    setup();
    return () => { cancelled = true; unsubCall?.(); unsubCandidates?.(); peerRef.current?.close(); peerRef.current = null; };
  }, [session?.callId]);

  // Toggle video track mute
  useEffect(() => {
    if (stream) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !session?.isVideoOff;
      });
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !session?.isMuted;
      });
    }
  }, [session?.isMuted, session?.isVideoOff, stream]);

  if (!session || !session.isActive) return null;

  const formatCallTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // INCOMING CALL UI
  if (session.direction === 'incoming') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-violet-600/30 rounded-full blur-2xl pointer-events-none" />

          {/* Caller Avatar with Pulse */}
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full bg-violet-500/30 animate-ping"></div>
            <img
              src={
                session.contact.avatar ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${session.contact.username}`
              }
              alt={session.contact.name}
              className="w-24 h-24 rounded-full object-cover ring-4 ring-violet-500 relative z-10"
            />
          </div>

          <h3 className="text-xl font-bold text-white mb-0.5">{session.contact.name}</h3>
          <p className="text-xs text-violet-400 font-semibold mb-2">@{session.contact.username}</p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-xs text-slate-300 font-medium mb-6">
            <Volume2 className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
            <span>Incoming {session.type === 'video' ? 'Video' : 'Audio'} Call…</span>
          </div>

          {/* Accept / Decline Buttons */}
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => {
                sounds.playCallEnd();
                onEndCall();
              }}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-900/40 transition group-active:scale-95">
                <PhoneOff className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold text-rose-400">Decline</span>
            </button>

            <button
              onClick={async () => { if (session.callId) await updateCallStatus(session.callId, 'accepted'); onAcceptCall(); }}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-900/40 transition group-active:scale-95 animate-bounce">
                <Phone className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold text-emerald-400">Accept</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE / OUTGOING CALL UI
  return (
    <div className="fixed inset-0 z-50 bg-[#05070d] text-white flex flex-col items-center justify-between p-4 sm:p-6 select-none overflow-hidden animate-in fade-in duration-200">
      {/* Top Bar: Contact info & Timer */}
      <div className="w-full max-w-4xl flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <img
            src={
              session.contact.avatar ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${session.contact.username}`
            }
            alt={session.contact.name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-violet-500"
          />
          <div>
            <h4 className="text-sm sm:text-base font-bold text-white">{session.contact.name}</h4>
            <p className="text-xs text-violet-400">
              {session.direction === 'outgoing'
                ? 'Ringing…'
                : `Connected • ${formatCallTime(callSeconds)}`}
            </p>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-xs font-semibold text-slate-300">
          SB {session.type === 'video' ? 'Video Call' : 'Encrypted Audio'}
        </div>
      </div>

      {/* Center Stage: Video feed or Audio Wave Visualizer */}
      <div className="relative w-full max-w-4xl flex-1 my-4 rounded-3xl bg-slate-950 border border-slate-800/80 overflow-hidden flex items-center justify-center shadow-2xl">
        {session.type === 'video' ? (
          <div className="relative w-full h-full bg-black">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute top-4 right-4 w-32 sm:w-44 aspect-video rounded-2xl overflow-hidden border-2 border-violet-500/80 bg-black shadow-2xl">
              <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${session.isVideoOff ? 'hidden' : 'block'}`} />
              {session.isVideoOff && <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400 text-xs">Camera Off</div>}
            </div>
            {!stream && <div className="absolute inset-0 flex items-center justify-center text-slate-400">Camera/microphone permission required</div>}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6">
            <div className="relative mb-6">
              <div className="absolute -inset-4 rounded-full bg-violet-600/20 blur-xl animate-pulse"></div>
              <img src={session.contact.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${session.contact.username}`} alt={session.contact.name} className="w-32 h-32 rounded-full object-cover ring-4 ring-violet-500/60 shadow-2xl relative z-10" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">{session.contact.name}</h3>
            <p className="text-sm text-violet-400 font-medium mb-6">@{session.contact.username}</p>
            <audio ref={(el) => { if (el && remoteVideoRef.current?.srcObject) el.srcObject = remoteVideoRef.current.srcObject; }} autoPlay />
            <div className="flex items-center gap-1.5 h-12">
              {[4,8,12,7,10,5].map((h, i) => <span key={i} className={`w-1.5 h-${h} rounded-full bg-violet-400 animate-pulse`} />)}
            </div>
          </div>
        )}
      </div>

      {/* In-Call Controls Bottom Bar */}
      <div className="w-full max-w-md flex items-center justify-center gap-4 z-10 pb-4">
        {/* Mute Mic */}
        <button
          onClick={onToggleMute}
          className={`p-4 rounded-full transition ${
            session.isMuted
              ? 'bg-rose-600 text-white'
              : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200'
          }`}
          title={session.isMuted ? 'Unmute' : 'Mute'}
        >
          {session.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {/* End Call Button */}
        <button
          onClick={() => {
            sounds.playCallEnd();
            onEndCall();
          }}
          className="px-8 py-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-2 shadow-xl shadow-rose-900/40 cursor-pointer active:scale-95 transition"
        >
          <PhoneOff className="w-6 h-6" />
          <span>End Call</span>
        </button>

        {/* Video Toggle (only for video call) */}
        {session.type === 'video' && (
          <button
            onClick={onToggleVideo}
            className={`p-4 rounded-full transition ${
              session.isVideoOff
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200'
            }`}
            title={session.isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {session.isVideoOff ? (
              <VideoOff className="w-6 h-6" />
            ) : (
              <VideoIcon className="w-6 h-6" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};
