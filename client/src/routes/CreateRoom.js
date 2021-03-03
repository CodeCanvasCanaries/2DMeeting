import React from "react";
import { v1 as uuid } from "uuid";

const CreateRoom = () => {
  const id = uuid();
  window.history.push(`/room/${id}`);
  return <CreateRoom />;
};

export default CreateRoom;
