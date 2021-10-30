import { openUserMedia, createRoom, joinRoom, hangUp } from "./WebRTC";
import { useState, useRef } from "react";

const Video = () => {
  const [mediaBtn, disableMediaBtn] = useState(false);
  const [createBtn, disableCreateBtn] = useState(true);
  const [joinBtn, disableJoinBtn] = useState(true);
  const [hangupBtn, disableHangupBtn] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [caller, setCaller] = useState(false);
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);

  return (
    <div>
      <h1>Welcome to PeerDvX!</h1>
      <div id="buttons">
        <button
          disabled={mediaBtn}
          onClick={(evt) => {
            openUserMedia(localVideo, remoteVideo);
            disableMediaBtn(true);
            disableCreateBtn(false);
            disableJoinBtn(false);
          }}
        >
          <span>Open camera & microphone</span>
        </button>
        <button
          disabled={createBtn}
          onClick={async (evt) => {
            disableCreateBtn(true);
            disableJoinBtn(true);
            disableHangupBtn(false);
            setCaller(true);
            setRoomId(await createRoom(localVideo, remoteVideo));
          }}
        >
          <span>Create room</span>
        </button>
        <button
          disabled={joinBtn}
          onClick={async (evt) => {
            setOpenDialog(true);
          }}
        >
          <span>Join room</span>
        </button>
        <button
          disabled={hangupBtn}
          onClick={async (evt) => {
            await hangUp(localVideo, remoteVideo, roomId);
            setRoomId(null);
            disableMediaBtn(false);
            disableCreateBtn(true);
            disableJoinBtn(true);
            disableHangupBtn(true);
          }}
        >
          <span>Hangup</span>
        </button>
      </div>
      <div>
        {roomId && (
          <span>{`Current room is ${roomId} - You are the ${
            caller ? "caller" : "callee"
          }  !`}</span>
        )}
      </div>
      <div
        id="room-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="my-dialog-title"
        aria-describedby="my-dialog-content"
        style={{ position: "relative", zIndex: "1" }}
      >
        <dialog open={openDialog}>
          <h2>Join room</h2>
          <div>
            Enter ID for room to join:
            <div>
              <input
                type="text"
                onChange={(evt) => {
                  console.log("### value", evt.target.value);
                  setRoomId(evt.target.value);
                }}
              />
              <label htmlFor="my-text-field">Room ID</label>
            </div>
          </div>
          <footer>
            <button
              onClick={(evt) => {
                setOpenDialog(false);
                setRoomId(null);
              }}
            >
              <span>Cancel</span>
            </button>
            <button
              onClick={async (evt) => {
                if (roomId && await joinRoom(localVideo, remoteVideo, roomId)) {
                  disableCreateBtn(true);
                  disableJoinBtn(true);
                  disableHangupBtn(false);
                }
                setRoomId(null);
                setOpenDialog(false);
              }}
            >
              <span>Join</span>
            </button>
          </footer>
        </dialog>
      </div>
      <div id="videos">
        <video ref={localVideo} muted autoPlay playsInline></video>
        <video ref={remoteVideo} autoPlay playsInline></video>
      </div>
    </div>
  );
};

export default Video;
