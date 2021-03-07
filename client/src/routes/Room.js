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

const randomCoordinates = () => {
  // Generate a random x position.
  let randomXPosition =
    Math.floor(Math.random() * (stageWidth - nodeWidth)) + 1;

  // Generate a random y position.
  let randomYPosition =
    Math.floor(Math.random() * (stageHeight - nodeHeight)) + 1;
  const xString = randomXPosition + "px";
  const yString = randomYPosition + "px";
  return { x: xString, y: yString };
};

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
      .then((stream) => {
        const coordinates = randomCoordinates();
        socketRef.current.emit("join room", roomID);
        socketRef.current.on("yourId", (id) => {
          socketRef.current.emit(
            "update-coordinates",
            (coordinates.x, coordinates.y)
          );
          setPeer({ id: id, coordinates: coordinates, stream: stream });
        });

        socketRef.current.on("all users", (users) => {
          const peers = [];
          users.forEach((userID) => {
            const peer = createPeer(userID, socketRef.current.id, stream);
            peersRef.current.push({
              peerID: userID,
              peer,
            });
            peers.push(peer);
          });
          setPeers(peers);
        });

        socketRef.current.on("user joined", (payload) => {
          const peer = addPeer(payload.signal, payload.callerID, stream);
          peersRef.current.push({
            peerID: payload.callerID,
            peer,
          });

          setPeers((users) => [...users, peer]);
        });

        socketRef.current.on("receiving returned signal", (payload) => {
          const item = peersRef.current.find((p) => p.peerID === payload.id);
          item.peer.signal(payload.signal);
        });

        // socketRef.current.on("user-moved", (payload) => {
        //     const peer = updatePeerLoc(payload.x, payload.y, payload.socket.id);
        //     peersRef.current.push({
        //       peerID: payload.callerID,
        //       peer,
        //     });

        //     setPeers((users) => [...users, peer]);
        //   });
      });
  }, []);

  function createPeer(userToSignal, callerID, stream) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on("signal", (signal) => {
      socketRef.current.emit("sending signal", {
        userToSignal,
        callerID,
        signal,
      });
    });

    return peer;
  }

  function addPeer(incomingSignal, callerID, stream) {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on("signal", (signal) => {
      socketRef.current.emit("returning signal", { signal, callerID });
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
