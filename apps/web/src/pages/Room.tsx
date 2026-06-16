import React from 'react';
import { useParams } from 'react-router-dom';

export default function Room() {
  const { id } = useParams();
  return <div>Room {id}</div>;
}
