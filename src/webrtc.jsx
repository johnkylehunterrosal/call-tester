export const initializeWebRTC = async (
  localVideoRef,
  remoteVideoRef,
  socket
) => {
  // Get media devices
  const localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  if (localVideoRef.current) {
    localVideoRef.current.srcObject = localStream;
  }

  // Create peer connection
  const peerConnection = new RTCPeerConnection();

  // Add local stream tracks to the peer connection
  localStream
    .getTracks()
    .forEach((track) => peerConnection.addTrack(track, localStream));

  // Handle remote stream
  peerConnection.ontrack = (event) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = event.streams[0];
    }
  };
};
