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
  //VideoNode.addEventListener("mousedown", initialClick, false);
  return VideoNode;
};

const Video = (props) => {
  const ref = useRef();

  useEffect(() => {
    props.peer.on("stream", (stream) => {
      ref.current.srcObject = stream;
    });
  }, []);

  let Video = <StyledVideo playsInline autoPlay ref={ref} />;
  let VideoNode = <StyledNode>{Video}</StyledNode>;
  //VideoNode.addEventListener("mousedown", initialClick, false);
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
        socketRef.current.emit("join-room", roomID);
        socketRef.current.on("your-welcome-package", (myWelcomePackage) => {
          setPeer({
            id: myWelcomePackage.id,
            coordinates: myWelcomePackage.coordinates,
            stream: myStream,
          });
        });

        socketRef.current.on("existing-users", (users, myCoordinates) => {
          const peers = [];
          users.forEach((userID) => {
            const peer = createMyPeer(
              userID,
              socketRef.current.id,
              myStream,
              myCoordinates
            );
            peersRef.current.push({
              peerID: userID,
              peer,
            });
            peers.push(peer);
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

          setPeers((users) => [...users, peer]);
        });

        // When Receiving video signal from a peer who is already in the room, attach the signal to the peer in peersRef
        socketRef.current.on("receiving returned signal", (payload) => {
          const item = peersRef.current.find((p) => p.peerID === payload.id);
          item.peer.signal(payload.signal);
          //TODO
        });

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
  function createMyPeer(existingUserID, myID, myStream, myCoordinates) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      myStream,
    });

    // When my peer object receives my stream, send it to the existing users in the room
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
    const peer = new Peer({
      initiator: false,
      trickle: false,
      //config: { coordinates: newUserCoordinates },
      myStream,
    });

    console.log("Peer config", peer.config.coordinates.x);
    peer.on("signal", (signal) => {
      const myCoordinates = myPeer.coordinates;
      socketRef.current.emit("returning signal", {
        signal,
        newUserID,
        myCoordinates,
      });
    });

    peer.signal(incomingSignal);

    return peer;
  }

  return (
    <Container>
      {myPeer && <MyVideo peer={myPeer} />}
      {peers.map((peer, index) => {
        return <Video key={index} peer={peer} />;
      })}
    </Container>
  );
};

export default Room;
