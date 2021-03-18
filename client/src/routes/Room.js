import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";

const stageWidth = 1000;
const stageHeight = 1000;
const nodeWidth = 100;
const nodeHeight = 100;

const Container = styled.div`
  padding: 20px;
  display: flex;
  height: 100vh;
  width: 90%;
  margin: auto;
  flex-wrap: wrap;
`;

const StyledVideo = styled.video`
  height: 100%;
  width: 100%;
  object-fit: cover;
  -ms-display: flex;
  display: flex;
  /* vertical center */
  align-items: center;
  /* horizontal center */
  justify-content: center;
`;

const StyledNode = styled.div`
  classname: node;
  border-radius: 100px;
  position: absolute;
  overflow: hidden;
  box-shadow: 0px 0px 0px 7px rgba(83, 217, 226, 0.514),
    0px 0px 0px 0px rgba(39, 152, 160, 0.932);
  width: ${nodeWidth}px;
  height: ${nodeHeight}px;
  top: ${(props) => props.top};
  left: ${(props) => props.left};
`;

function randomCoordinates() {
  const stageWidth = 1000;
  const stageHeight = 1000;
  const nodeWidth = 100;
  const nodeHeight = 100;

  // Generate a random x position.
  let randomXPosition =
    Math.floor(Math.random() * (stageWidth - nodeWidth)) + 1;

  // Generate a random y position.
  let randomYPosition =
    Math.floor(Math.random() * (stageHeight - nodeHeight)) + 1;
  const xString = randomXPosition + "px";
  const yString = randomYPosition + "px";
  return { x: xString, y: yString };
}

// function initialClick(e) {
//   if (moving) {
//     document.removeEventListener("mousemove", move);
//     moving = !moving;
//     return;
//   }

//   moving = !moving;
//   image = this;
//   document.addEventListener("mousemove", move, false);
// }

// function move(e, socket) {
//   var newX = e.clientX - 10;
//   var newY = e.clientY - 10;

//   image.style.left = newX + "px";
//   image.style.top = newY + "px";

//   socket.emit("update-coordinates", image.style.left, image.style.top, myId);
// }

const MyVideo = (props) => {
  const ref = useRef();

  useEffect(() => {
    if (props.peer) {
      ref.current.srcObject = props.peer.stream;
    }
  }, [props]);
  console.log("My Socket ID is: ", props.peer.id);
  let Video = <StyledVideo muted playsInline autoPlay ref={ref} />;
  const VideoNode = (
    <StyledNode
      id={props.peer.id}
      top={props.peer.coordinates.y}
      left={props.peer.coordinates.x}
    >
      {Video}
    </StyledNode>
  );
  return VideoNode;
};

const Video = (props) => {
  const ref = useRef();

  useEffect(() => {
    props.peerObj.peer.on("stream", (stream) => {
      ref.current.srcObject = stream;
    });
  }, [props]);

  let Video = <StyledVideo playsInline autoPlay ref={ref} />;
  let VideoNode = (
    <StyledNode
      id={props.peerObj.peerID}
      top={props.peerObj.peer.config.coordinates.y}
      left={props.peerObj.peer.config.coordinates.x}
    >
      {Video}
    </StyledNode>
  );
  return VideoNode;
};

const videoConstraints = {
  height: window.innerHeight / 2,
  width: window.innerWidth / 2,
};

const Room = (props) => {
  const [peers, setPeers] = useState([]);
  const [myPeer, setPeer] = useState(null);
  const socketRef = useRef();
  const peersRef = useRef([]);
  const roomID = props.match.params.roomID;

  useEffect(() => {
    socketRef.current = io.connect("/");
    navigator.mediaDevices
      .getUserMedia({ video: videoConstraints, audio: true })
      .then((myStream) => {
        const initialCoordinates = randomCoordinates();

        socketRef.current.emit("join-room", { roomID, initialCoordinates });
        socketRef.current.on("your-welcome-package", (myWelcomePackage) => {
          setPeer({
            id: myWelcomePackage.id,
            coordinates: initialCoordinates,
            stream: myStream,
          });
        });

        socketRef.current.on("existing-users", (users) => {
          const peers = [];
          users.forEach((user) => {
            const peer = createMyPeer(
              user.id,
              socketRef.current.id,
              myStream,
              user.coordinates,
              initialCoordinates
            );
            peersRef.current.push({
              peerID: user.id,
              peer,
            });
            peers.push({
              peerID: user.id,
              peer: peer,
            });
          });
          setPeers(peers);
        });

        // When a user joins, create a peer instance for that user and store it locally
        socketRef.current.on("user-joined", (payload) => {
          const peer = addPeer(
            payload.signal,
            payload.newUserID,
            myStream,
            payload.coordinates
          );
          peersRef.current.push({
            peerID: payload.newUserID,
            peer,
          });

          setPeers((users) => [
            ...users,
            {
              peerID: payload.newUserID,
              peer: peer,
            },
          ]);
        });

        // When Receiving video signal from a peer who is already in the room, attach the signal to the peer in peersRef
        socketRef.current.on(
          "receiving-returned-signal-from-existing-user",
          (payload) => {
            const item = peersRef.current.find((p) => p.peerID === payload.id);
            item.peer.signal(payload.signal);
            //TODO
          }
        );

        // socketRef.current.on("user-moved", (payload) => {
        //     const peer = updatePeerLoc(payload.x, payload.y, payload.socket.id);
        //     peersRef.current.push({
        //       peerID: payload.newUserID,
        //       peer,
        //     });

        //     setPeers((users) => [...users, peer]);
        //   });
      });
  }, []);

  // 1. EXISTING USERS IN THE ROOM
  // Create an instance of my peer and send it to every user who is already in the room
  function createMyPeer(
    existingUserID,
    myID,
    myStream,
    existingUserCoordinates,
    myCoordinates
  ) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: myStream,
      config: { coordinates: existingUserCoordinates }, // Existing user coordinates
    });

    // When my peer above is constructed, receive its signal and emit it to the existing users in the room
    peer.on("signal", (signal) => {
      socketRef.current.emit("stream-to-existing-users", {
        existingUserID,
        myID,
        signal,
        myCoordinates,
      });
    });

    return peer;
  }

  // 2. NEW USERS WHO JOIN LATER
  // When a new user joins, create an instance of my Peer and send it to them
  function addPeer(incomingSignal, newUserID, myStream, newUserCoordinates) {
    // Creating an instance of my peer to communicate with the new user
    const peer = new Peer({
      initiator: false, // We are not initiating the signal in this case, we are waiting for it from the new user
      trickle: false,
      config: { coordinates: newUserCoordinates },
      stream: myStream,
    });

    console.log("Peer config", peer.config.coordinates.x);

    // Triggered when signal port is opened below
    peer.on("signal", (signal) => {
      socketRef.current.emit("returning-signal-to-new-users", {
        signal,
        newUserID,
        // myCoordinates, // Pass my coordinates to the new user
      });
    });

    // Opens a port to receive incoming signal
    peer.signal(incomingSignal);

    return peer;
  }

  let MyNode = <MyVideo peer={myPeer} />;
  //MyNode.addEventListener("mousedown", initialClick, false);

  return (
    <Container>
      {myPeer && MyNode}
      {peers.map((peerObj) => {
        return <Video peerObj={peerObj} />;
      })}
    </Container>
  );
};

export default Room;
