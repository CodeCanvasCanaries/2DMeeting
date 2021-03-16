import React from "react";
import { useHistory } from "react-router";
import { v1 as uuid } from "uuid";

const CreateRoom = () => {
  let history = useHistory();
  const id = uuid();
  history.push(`/room/${id}`);
  return <CreateRoom />;
};

export default CreateRoom;
