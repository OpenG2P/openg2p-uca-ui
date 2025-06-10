const WS_CALL_API = "${API_PATH_PREFIX}call";
const PING_TIME_GAP = 10000;

function getWsCallUrl(){
    const url = new URL(WS_CALL_API, location.href);
    url.protocol = 'wss';
    return url;
}

async function startCall(connection) {
    // 1. Establish WebSocket connection for signaling
    connection.ws = new WebSocket(getWsCallUrl());
    connection.ws.onopen = async () => {
        // 2. Create RTCPeerConnection
        connection.pc = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" }, // Public STUN server
                // TODO: TURN server study.
            ]
        });

        // 3. Handle connection state changes (for debugging)
        connection.pc.onconnectionstatechange = () => {
            console.log("Connection state changed:", connection.pc.connectionState);
            document.getElementById("statusText").innerHTML = `<span>Status: Call ${dollar}{connection.pc.connectionState}</span>`;
            if (connection.pc.connectionState === "connected") {
                connection.ws.send(JSON.stringify({type: "ping"}));
            }
            if (connection.pc.connectionState === "failed" || connection.pc.connectionState === "disconnected") {
                stopCall(connection);
            }
        };

        // 4. Handle incoming remote tracks (audio output)
        connection.pc.ontrack = (event) => {
            console.log("Remote track received:", event.track);
            if (event.track.kind === 'audio') {
                connection.audioElement = new Audio();
                connection.audioElement.srcObject = new MediaStream();
                connection.audioElement.srcObject.addTrack(event.track);
                connection.audioElement.play();
                console.log("Remote audio stream created element.");
            }
        };

        // 5. Get user media (audio)
        try {
            connection.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            connection.localStream.getTracks().forEach(track => {
                connection.pc.addTrack(track, connection.localStream);
                console.log("Added local audio track.");
            });
        } catch (error) {
            console.error("Error accessing media devices:", error);
            return;
        }

        // 6. Create WebRTC Offer
        const offer = await connection.pc.createOffer();
        await connection.pc.setLocalDescription(offer);
        console.log("Sending SDP offer:", offer);
        connection.ws.send(JSON.stringify({
            type: "offer",
            sdp: connection.pc.localDescription.sdp,
            sdp_type: connection.pc.localDescription.type
        }));
    };

    connection.ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "answer") {
            console.log("Received SDP answer:", data.sdp);
            const answer = new RTCSessionDescription({ sdp: data.sdp, type: "answer" });
            await connection.pc.setRemoteDescription(answer);
        } else if (data.type == "ping"){
            console.log("WebSocket Ping received")
            setTimeout(() => connection.ws.send(JSON.stringify({"type": "pong"})), PING_TIME_GAP);
        } else if (data.type == "pong"){
            console.log("WebSocket Pong received")
            setTimeout(() => connection.ws.send(JSON.stringify({"type": "ping"})), PING_TIME_GAP);
        } else {
            console.warn("Unknown message received on websocket", data.type);
        }
    };

    connection.ws.onclose = () => {
        stopCall(connection);
    };

    connection.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
    };
}

function stopCall(connection) {
    if (connection.pc) {
        connection.pc.close();
        connection.pc = null;
        console.log("PeerConnection closed.");
    }
    if (connection.ws) {
        connection.ws.close();
        connection.ws = null;
        console.log("WebSocket closed.");
    }
    if (connection.localStream) {
        connection.localStream.getTracks().forEach(track => track.stop());
        connection.localStream = null;
        console.log("Local media stream stopped.");
    }
    if (connection.audioElement) {
        connection.audioElement.pause();
        connection.audioElement = null;
    }
    document.getElementById("closeCallButton").classList.add("closed");
    document.getElementById("statusText").innerHTML = '<span>Status: Call Terminated</span>';
}

window.addEventListener("DOMContentLoaded", async () => {
    const connection = {pc: null, ws: null, localStream: null, audioElement: null};
    const closeCallButton = document.getElementById("closeCallButton");
    closeCallButton.addEventListener("click", () => stopCall(connection));
    await startCall(connection);
});
