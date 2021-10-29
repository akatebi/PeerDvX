// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, doc, getDocs, deleteDoc } from  "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA993SMnQZzsTgAYhBBRP-nkWvPXAFxarc",
  authDomain: "peerdvx.firebaseapp.com",
  projectId: "peerdvx",
  storageBucket: "peerdvx.appspot.com",
  messagingSenderId: "551431675015",
  appId: "1:551431675015:web:50424f44d0d8c7d4c4ec22"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const configuration = {
  iceServers: [
    {
      urls: [
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
  ],
  iceCandidatePoolSize: 10,
};

let peerConnection = null;
let localStream = null;
let remoteStream = null;
let roomDialog = null;

/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////

export async function openUserMedia(localVideo, remoteVideo) {
  console.log("##### Supported", navigator.mediaDevices.getSupportedConstraints().echoCancellation);
  const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
  stream.getTracks().forEach(async track => {
    await track.applyConstraints({ echoCancellation: true });
    console.log("#### Constraints =", track.getConstraints());
  });
  localVideo.current.srcObject = stream;
  remoteVideo.current.srcObject = new MediaStream();
}

/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////

export async function createRoom(localVideo) {
  const db = getFirestore(app);
  const roomCol = collection(db, 'rooms');

  console.log('Create PeerConnection with configuration: ', configuration);
  peerConnection = new RTCPeerConnection(configuration);

  registerPeerConnectionListeners();

  const localStream = localVideo.current.srcObject;
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  // Code for collecting ICE candidates below
  const callerCandidatesCollection = collection(db, 'callerCandidates');

  peerConnection.addEventListener('icecandidate', event => {
    if (!event.candidate) {
      console.log('Got final candidate!');
      return;
    }
    console.log('Got candidate: ', event.candidate);
    addDoc(callerCandidatesCollection, event.candidate.toJSON());
  });
  // Code for collecting ICE candidates above

  // Code for creating a room below
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  console.log('Created offer:', offer);

  const roomWithOffer = {
    'offer': {
      type: offer.type,
      sdp: offer.sdp,
    },
  };
  const roomRef = await addDoc(roomCol, roomWithOffer);
  const roomId = roomRef.id;
  console.log(`New room created with SDP offer. Room ID: ${roomRef.id}`);
  // Code for creating a room above

  peerConnection.addEventListener('track', event => {
    console.log('Got remote track:', event.streams[0]);
    event.streams[0].getTracks().forEach(track => {
      console.log('Add a track to the remoteStream:', track);
      remoteStream.addTrack(track);
    });
  });

  // Listening for remote session description below
  onSnapshot(roomRef, async snapshot => {
    const data = snapshot.data();
    if (!peerConnection.currentRemoteDescription && data && data.answer) {
      console.log('Got remote description: ', data.answer);
      const rtcSessionDescription = new RTCSessionDescription(data.answer);
      await peerConnection.setRemoteDescription(rtcSessionDescription);
    }
  });
  // Listening for remote session description above

  // Listen for remote ICE candidates below
  const calleeCandidates = collection(roomRef, 'calleeCandidates');
  onSnapshot(calleeCandidates, snapshot => {
    snapshot.docChanges().forEach(async change => {
      if (change.type === 'added') {
        let data = change.doc.data();
        console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
        await peerConnection.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });
  // Listen for remote ICE candidates above

  return roomId;
}

/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////

export async function hangUp(localVideo, remoteVideo, roomId) {
  
  const localStream = localVideo.current.srcObject;
  const remoteStream = localVideo.current.srcObject;

  localStream.getTracks().forEach(track => track.stop());

  if (remoteStream) {
    remoteStream.getTracks().forEach(track => track.stop());
  }

  if (peerConnection) {
    peerConnection.close();
  }

  localVideo.current.srcObject = null;
  remoteVideo.current.srcObject = null;

  // Delete room on hangup
  if (roomId) {
    const db = getFirestore(app);
    const roomCol = collection(db, 'rooms');
    const roomRef = doc(roomCol, roomId);
    const calleeCandidates = await getDocs(collection(roomRef, 'calleeCandidates'));
    calleeCandidates.forEach(async candidate => {
      await candidate.ref.delete();
    });
    const callerCandidates = await getDocs(collection(roomRef, 'callerCandidates'));
    callerCandidates.forEach(async candidate => {
      await deleteDoc(candidate);
    });
    await deleteDoc(roomRef);
  }

  // document.location.reload(true);
}

/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////

export function joinRoom() {
  // document.querySelector('#createBtn').disabled = true;
  // document.querySelector('#joinBtn').disabled = true;

  /* document.querySelector('#confirmJoinBtn').
      addEventListener('click', async () => {
        roomId = // document.querySelector('#room-id').value;
        console.log('Join room: ', roomId);
        // document.querySelector(
            '#currentRoom').innerText = `Current room is ${roomId} - You are the callee!`;
        await joinRoomById(roomId);
      }, {once: true});*/
  roomDialog.open();
}

/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////

export async function joinRoomById(roomId) {
  const db = getFirestore(app);
  const roomRef = db.collection('rooms').doc(`${roomId}`);
  const roomSnapshot = await roomRef.get();
  console.log('Got room:', roomSnapshot.exists);

  if (roomSnapshot.exists) {
    console.log('Create PeerConnection with configuration: ', configuration);
    peerConnection = new RTCPeerConnection(configuration);
    registerPeerConnectionListeners();
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });

    // Code for collecting ICE candidates below
    const calleeCandidatesCollection = roomRef.collection('calleeCandidates');
    peerConnection.addEventListener('icecandidate', event => {
      if (!event.candidate) {
        console.log('Got final candidate!');
        return;
      }
      console.log('Got candidate: ', event.candidate);
      calleeCandidatesCollection.add(event.candidate.toJSON());
    });
    // Code for collecting ICE candidates above

    peerConnection.addEventListener('track', event => {
      console.log('Got remote track:', event.streams[0]);
      event.streams[0].getTracks().forEach(track => {
        console.log('Add a track to the remoteStream:', track);
        remoteStream.addTrack(track);
      });
    });

    // Code for creating SDP answer below
    const offer = roomSnapshot.data().offer;
    console.log('Got offer:', offer);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    console.log('Created answer:', answer);
    await peerConnection.setLocalDescription(answer);

    const roomWithAnswer = {
      answer: {
        type: answer.type,
        sdp: answer.sdp,
      },
    };
    await roomRef.update(roomWithAnswer);
    // Code for creating SDP answer above

    // Listening for remote ICE candidates below
    roomRef.collection('callerCandidates').onSnapshot(snapshot => {
      snapshot.docChanges().forEach(async change => {
        if (change.type === 'added') {
          let data = change.doc.data();
          console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
          await peerConnection.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
    // Listening for remote ICE candidates above
  }
}

/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////

export function registerPeerConnectionListeners() {
  peerConnection.addEventListener('icegatheringstatechange', () => {
    console.log(
        `ICE gathering state changed: ${peerConnection.iceGatheringState}`);
  });

  peerConnection.addEventListener('connectionstatechange', () => {
    console.log(`Connection state change: ${peerConnection.connectionState}`);
  });

  peerConnection.addEventListener('signalingstatechange', () => {
    console.log(`Signaling state change: ${peerConnection.signalingState}`);
  });

  peerConnection.addEventListener('iceconnectionstatechange ', () => {
    console.log(
        `ICE connection state change: ${peerConnection.iceConnectionState}`);
  });
}

/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////

