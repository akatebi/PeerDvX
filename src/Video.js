import { openUserMedia, createRoom } from "./WebRTC";
import { useState, useRef } from "react"

const Video = () => {
    const [mediaBtn, disableMediaBtn] = useState(false);
    const [createBtn, disableCreateBtn] = useState(true);
    const [joinBtn, disableJoinBtn] = useState(true);
    const [hangupBtn, disableHangupBtn] = useState(true);
    const localVideo = useRef(null);
    const remoteVideo = useRef(null);

  return (
    <div>
      <h1>Welcome to PeerDvX!</h1>
      <div id="buttons">
        <button disabled={mediaBtn} onClick={ evt => {
            openUserMedia(localVideo, remoteVideo);
            disableMediaBtn(true);
            disableCreateBtn(false);
            disableJoinBtn(false);
        }}>
          <span>Open camera & microphone</span>
        </button>
        <button disabled={createBtn} onClick={ evt => {
            createRoom(localVideo);
            disableCreateBtn(true);
            disableJoinBtn(true);
        }}>
          <span>Create room</span>
        </button>
        <button disabled={joinBtn}>
          <span>Join room</span>
        </button>
        <button disabled={hangupBtn}>
          <span>Hangup</span>
        </button>
      </div>
      <div>
        <span id="currentRoom"></span>
      </div>
      <div id="videos">
        <video ref={localVideo} muted autoPlay playsInline></video>
        <video ref={remoteVideo} autoPlay playsInline></video>
      </div>
      <div
        id="room-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="my-dialog-title"
        aria-describedby="my-dialog-content"
      >
        <div>
          <div>
            <h2 id="my-dialog-title">Join room</h2>
            <div id="my-dialog-content">
              Enter ID for room to join:
              <div>
                <input type="text" id="room-id" />
                <label htmlFor="my-text-field">Room ID</label>
                <div></div>
              </div>
            </div>
            <footer>
              <button type="button" data-mdc-dialog-action="no">
                <span>Cancel</span>
              </button>
              <button
                id="confirmJoinBtn"
                type="button"
                data-mdc-dialog-action="yes"
              >
                <span>Join</span>
              </button>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Video;
