const GET_CALL_META_API = "${API_PATH_PREFIX}call/meta";
const POST_CALL_OFFER_API = "${API_PATH_PREFIX}call/offer";

async function startCall(connection) {
    // 1. Get Call meta Info
    const callMetaRes = await fetch(GET_CALL_META_API);
    if(!callMetaRes.ok) throw Error(`Call Meta Http Error. ${dollar}{callMetaRes.status}. ${dollar}{await callMetaRes.text()}`);
    const callMetaResJson = await callMetaRes.json();

    // 2. Get user media (audio input)
    let localStream = null;
    try{
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (error) {
        console.error("Error accessing media devices:", error);
        throw err;
    }

    // 3. Create RTCPeerConnection
    connection.pc = new RTCPeerConnection({iceServers: callMetaResJson.iceServers});
    connection.localStream = localStream;
    connection.localStream.getTracks().forEach(track => {
        connection.pc.addTrack(track, connection.localStream);
        console.log("Added local audio track.");
    });

    // 4. Handle connection state changes (for debugging)
    connection.pc.onconnectionstatechange = () => {
        console.log("Connection state changed:", connection.pc.connectionState);
        document.getElementById("statusText").innerHTML = `<span>Status: Call ${dollar}{connection.pc.connectionState}</span>`;
        if (connection.pc.connectionState === "failed" || connection.pc.connectionState === "disconnected") {
            stopCall(connection);
        }
    };

    // 5. Handle incoming remote tracks (audio output)
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

    // 6. Create WebRTC Offer
    await connection.pc.setLocalDescription(await connection.pc.createOffer());
    console.log("Sending SDP offer:", offer);
    const callOfferRes = await fetch(POST_CALL_OFFER_API, {
        method: 'POST',
        body: JSON.stringify({
            sdp: connection.pc.localDescription.sdp,
            sdp_type: connection.pc.localDescription.type,
        }),
        headers: {'Content-Type': 'application/json'},
    });
    if(!callOfferRes.ok) {
        stopCall(connection);
        throw Error(`Call Offer Http Error. ${dollar}{callOfferRes.status}. ${dollar}{await callOfferRes.text()}`);
    }
    const callOfferResJson = await callOfferRes.json();
    console.log("Received SDP answer:", callOfferResJson);
    await connection.pc.setRemoteDescription(new RTCSessionDescription(callOfferResJson));
}

function stopCall(connection) {
    if (connection.audioElement) {
        connection.audioElement.pause();
        connection.audioElement = null;
    }
    if (connection.localStream) {
        connection.localStream.getTracks().forEach(track => track.stop());
        connection.localStream = null;
        console.log("Local media stream stopped.");
    }
    if (connection.pc) {
        // close transceivers
        if (connection.pc.getTransceivers) {
            connection.pc.getTransceivers().forEach((transceiver) => {
                if (transceiver.stop) {
                    transceiver.stop();
                }
            });
        }
        // close local audio / video
        connection.pc.getSenders().forEach((sender) => {
            sender.track.stop();
        });
        // close peer connection
        setTimeout(() => {
            connection.pc.close();
            connection.pc = null;
        }, 500);
        console.log("PeerConnection closed.");
    }
    document.getElementById("closeCallButton").classList.add("closed");
    document.getElementById("statusText").innerHTML = '<span>Status: Call Terminated</span>';
}

window.addEventListener("DOMContentLoaded", async () => {
    const connection = {pc: null, localStream: null, audioElement: null};
    const closeCallButton = document.getElementById("closeCallButton");
    closeCallButton.addEventListener("click", () => stopCall(connection));
    await startCall(connection);
});
