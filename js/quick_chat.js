const POST_NEW_THREAD = "${API_PATH_PREFIX}quick_chat/thread";
const GET_CURRENT_CHAT_THREAD = "${API_PATH_PREFIX}quick_chat/thread";
const POST_NEW_MESSAGE = "${API_PATH_PREFIX}quick_chat/message";
const GET_CHAT_MESSAGES = "${API_PATH_PREFIX}quick_chat/messages";
const POST_NEW_VOICE_MESSAGE = "${API_PATH_PREFIX}quick_chat/voice_message";
const POST_SPEAK_MESSAGE = "${API_PATH_PREFIX}quick_chat/speak_message";

const ENABLE_MESSAGE_TIME = "${ENABLE_MESSAGE_TIME}" != "false";

const userProfile = {};

const markDownConverter = new showdown.Converter();

function addMessage(text, sender, scrollTop=true) {
    const messageTextDiv = document.createElement('div');
    messageTextDiv.classList.add(`message-text`, `message-text-${dollar}{sender}`);
    messageTextDiv.innerHTML = markDownConverter.makeHtml(text);

    const messageBox = document.createElement('div');
    messageBox.classList.add('message-box');
    messageBox.appendChild(messageTextDiv);

    const messageDiv = document.createElement('div');
    messageDiv.classList.add(`message-${dollar}{sender}`);
    messageDiv.appendChild(messageBox);

    const messagesContainer = document.getElementById("messagesContainer");
    messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    if(scrollTop){
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    return messageDiv;
}

function addVoiceMessage(audioUrl, duration, scrollTop=true) {
    const audio = {src: audioUrl, audio: null};
    const playBtn = document.createElement('button');
    playBtn.classList.add('user-audio-play-btn');
    playBtn.innerHTML = '<span class="icon-play"></span>';
    playBtn.addEventListener('click', () => toggleAudioPlayback(audio, playBtn));

    const durationDiv = document.createElement('div');
    durationDiv.classList.add('user-audio-duration');
    durationDiv.innerHTML = '<span class="icon-volume"></span> ' + convertSecondsToReadableText(duration);

    const messageAudioDiv = document.createElement('div');
    messageAudioDiv.classList.add('message-audio');
    messageAudioDiv.appendChild(playBtn);
    messageAudioDiv.appendChild(durationDiv);

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message-user');
    messageDiv.appendChild(messageAudioDiv);

    const messagesContainer = document.getElementById("messagesContainer");
    messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    if(scrollTop){
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    return messageDiv;
}

function replaceMessage(message, text) {
    if(!text) message.remove();
    message.firstChild.firstChild.innerHTML = markDownConverter.makeHtml(text);
    return message;
}

function addPlayButtonToMessage(message, messageId){
    const audio = {src: null, audio: null, messageId};

    const speakMessageButton = document.createElement('div');
    speakMessageButton.classList.add('speak-msg-btn');
    speakMessageButton.innerHTML = '<span class="icon-speak-start"></span>';
    speakMessageButton.addEventListener('click', async () => await toggleSpeakMessage(audio, speakMessageButton));

    message.firstChild.appendChild(speakMessageButton);
    return message;
}

function addTimeToMessage(message, time) {
    if(!ENABLE_MESSAGE_TIME) return message;
    const messageTime = document.createTextNode(convertIsoTimestampToReadableText(time));

    const messageTimeDiv = document.createElement('div');
    messageTimeDiv.classList.add(`message-time`);
    messageTimeDiv.appendChild(messageTime);

    message.appendChild(messageTimeDiv);
    return message;
}

function sendMessage(messageInput) {
    const message = messageInput.value.trim();
    if (message === '') return;

    // Add user message to UI
    const userMessage = addMessage(message, 'user');
    addTimeToMessage(userMessage, new Date());

    const aiMessage = addMessage("...", "ai");

    // Clear input
    messageInput.value = '';

    fetch(POST_NEW_MESSAGE, {
        method: "POST",
        body: JSON.stringify({message}),
        headers: {"content-type": "application/json"},
    }).then((res) => {
        if(!res.ok) throw Error(`Http Error. ${dollar}{res.status}.`);
        return res.json();
    }).then((resJson) => {
        replaceMessage(aiMessage, resJson.message);
        addTimeToMessage(aiMessage, new Date(resJson.sent_at));
        addPlayButtonToMessage(aiMessage, resJson.message_id);
    }).catch((err) => {
        console.error("Error sending message to backend", err);
        throw err;
        // TODO: Handle Error.
    });
}

async function populatePastMessages(page=0){
    try {
        const res = await fetch(GET_CHAT_MESSAGES + "?" + new URLSearchParams({page}).toString());
        if(!res.ok) throw Error(`Http Error. ${dollar}{res.status}. ${dollar}{await res.text()}`);
        const resJson = await res.json();
        const messages = resJson.messages || [];

        for(let i=messages.length-1; i>=0; i--){
            let msgRole = '';
            switch (messages[i].message_by) {
                case "user":
                    msgRole = "user";
                    break;
                case "assistant":
                    msgRole = "ai";
                    break;
            }
            const msgDom = addMessage(messages[i].message, msgRole, false);
            addTimeToMessage(msgDom, new Date(messages[i].sent_at));
            if (msgRole != "user") addPlayButtonToMessage(msgDom, messages[i].message_id);
        }
    } catch (err) {
        console.error("Error retrieving messages", err);
        throw err;
        // TODO: Handle Error
    }
}

async function initiateNewChatThread(){
    document.getElementById("messagesContainer").innerHTML = '';
    const aiMessage = addMessage("...", "ai");
    try {
        const createThreadRes = await fetch(POST_NEW_THREAD, { method: "POST" });
        if(!createThreadRes.ok) throw Error(`Http Error. ${dollar}{createThreadRes.status}. ${dollar}{await createThreadRes.text()}`);
        const createThreadResJson = await createThreadRes.json();
        replaceMessage(aiMessage, createThreadResJson.message);
        addTimeToMessage(aiMessage, new Date(createThreadResJson.sent_at));
        addPlayButtonToMessage(aiMessage, createThreadResJson.message_id);
    } catch (err) {
        console.error("Error creating new chat thread", err);
        throw err;
        // TODO: Handle error
    }
}

async function toggleMicButton(micButton, recordingIndicator, recordingTimeSpan, mediaRecorder){
    if(micButton.classList.contains('recording')){
        if (mediaRecorder.recorder && mediaRecorder.recorder.state === 'recording') {
            mediaRecorder.recorder.stop();
            mediaRecorder.recorder = null;

            micButton.classList.remove('recording');
            micButton.querySelector('.icon-mic').classList.remove('recording');
            recordingTimeSpan.textContent = "Recording...";
            recordingIndicator.classList.remove('active');
        }
    } else {
        const recordingTime = {value: 0, interval: null};
        await startRecording(mediaRecorder, recordingTime);
        recordingTime.interval = setInterval(() => {
            recordingTime.value++;
            recordingTimeSpan.textContent = "Recording... " + convertSecondsToReadableText(recordingTime.value);
        }, 1000);
        micButton.classList.add('recording');
        micButton.querySelector('.icon-mic').classList.add('recording');
        recordingIndicator.classList.add('active');
    }
}

function toggleAudioPlayback(audio, button) {
    if(button.firstChild.classList.contains('icon-pause')){
        if (audio.audio) audio.audio.pause();
        audio.audio = null;
        button.innerHTML = '<span class="icon-play"></span>';
    } else {
        audio.audio = new Audio(audio.src);
        audio.audio.play();
        button.innerHTML = '<span class="icon-pause"></span>';

        audio.audio.onended = () => {
            button.innerHTML = '<span class="icon-play"></span>';
        };
    }
}

async function toggleSpeakMessage(audio, button) {
    if(button.firstChild.classList.contains('icon-speak-stop')){
        if (audio.audio) audio.audio.pause();
        audio.audio = null;
        button.innerHTML = '<span class="icon-speak-start"></span>';
    } else if(button.firstChild.classList.contains('icon-speak-start')) {
        if (!audio.src){
            button.innerHTML = '<span class="icon-speak-load"></span>';
            const res = await fetch(POST_SPEAK_MESSAGE, {
                method: "POST",
                body: JSON.stringify({message_id: audio.messageId}),
                headers: {"content-type": "application/json"},
            });
            if(!res.ok) throw Error(`Speak message Http Error. ${dollar}{res.status}. ${dollar}{await res.text()}`);
            audio.src = URL.createObjectURL(await res.blob());
        }
        audio.audio = new Audio(audio.src);
        audio.audio.play();
        button.innerHTML = '<span class="icon-speak-stop"></span>';

        audio.audio.onended = () => {
            button.innerHTML = '<span class="icon-speak-start"></span>';
        };
    }
}

async function startRecording(mediaRecorder, recordingTime){
    try{
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioChunks = [];

        mediaRecorder.recorder = new MediaRecorder(stream);

        mediaRecorder.recorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.recorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);

            addVoiceMessage(audioUrl, recordingTime.value);
            const aiMessage = addMessage("...", "ai");

            // Send audio to backend API
            try {
                const formData = new FormData();
                formData.append("audio", audioBlob);
                const res = await fetch(POST_NEW_VOICE_MESSAGE,{
                    method: "POST",
                    body: formData,
                });

                const resJson = await res.json();
                replaceMessage(aiMessage, resJson.message);
                addTimeToMessage(aiMessage, new Date(resJson.sent_at));
                addPlayButtonToMessage(aiMessage, resJson.message_id);
            } catch (err) {
                console.error('Error sending audio to API', err);
                throw err;
            }

            // Cleanup
            stream.getTracks().forEach(track => track.stop());
            clearInterval(recordingTime.interval);
        };

        mediaRecorder.recorder.start();
    } catch(err) {
        console.error('Error accessing microphone:', err);
        alert('Unable to access microphone. Please check permissions.');
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const micButton = document.getElementById('micButton');
    const recordingIndicator = document.getElementById('recordingIndicator');
    const recordingTimeSpan = document.getElementById('recordingTime');

    // Send message on Enter key
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage(messageInput);
        }
    });
    sendButton.addEventListener('click', () => sendMessage(messageInput));

    const mediaRecorder = {recorder: null};

    micButton.addEventListener('click', async () => await toggleMicButton(micButton, recordingIndicator, recordingTimeSpan, mediaRecorder));

    const currentThreadRes = await fetch(GET_CURRENT_CHAT_THREAD);
    if(!currentThreadRes.ok){
        await initiateNewChatThread();
    } else {
        await populatePastMessages();
    }
});
