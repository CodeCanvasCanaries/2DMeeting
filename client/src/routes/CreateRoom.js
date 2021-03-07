import React from "react";
import { v1 as uuid } from "uuid";

const CreateRoom = (props) => {
  const id = uuid();
  props.history.push(`/room/${id}`);
  return <CreateRoom />;
};

export default CreateRoom;
