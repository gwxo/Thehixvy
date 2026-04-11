// --- Firebase Integration ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);


// --- Configuration & State ---
const MAX_GUEST_MESSAGES = 5;
const elements = {
    chatForm: document.getElementById("chatForm"),
    chatInput: document.getElementById('chatInput'),
    chatbox: document.getElementById('chatbox'),
    sendButton: document.getElementById("sendButton"),
    cameraButton: document.getElementById("cameraButton"),
    galleryButton: document.getElementById("galleryButton"),
    genImageButton: document.getElementById("genImageButton"),
    imageUpload: document.getElementById("imageUpload"),
    micButton: document.getElementById("micButton"),
    speakerButton: document.getElementById("speakerButton"),
    typingIndicator: document.getElementById('typingIndicator'),
    // Modals
    mediaModal: document.getElementById('mediaModal'),
    developerModal: document.getElementById('developerModal'),
    guestLimitModal: document.getElementById('guestLimitModal'),
    // Sidebar & Auth
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    newChatBtn: document.getElementById('newChatBtn'),
    userProfile: document.getElementById('userProfile'),
    userEmail: document.getElementById('userEmail'),
    logoutBtn: document.getElementById('logoutBtn'),
    devInfoBtn: document.getElementById('devInfoBtn'),
};

let state = {
    isSpeakerOn: true,
    pendingImageFile: null,
    stream: null,
    cropper: null,
    currentUser: null,
    guestMessageCount: 0,
    chatHistory: [],
};

// --- Authentication & Initialization ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        state.currentUser = user;
        elements.userProfile.classList.remove('hidden');
        elements.userProfile.classList.add('flex');
        elements.logoutBtn.classList.remove('hidden');
        elements.userEmail.textContent = user.email;
        loadChatHistory();
    } else {
        // User is signed out (Guest)
        state.currentUser = null;
        elements.userProfile.classList.add('hidden');
        elements.logoutBtn.classList.add('hidden');
        state.guestMessageCount = parseInt(localStorage.getItem('guestMessageCount') || '0');
        loadChatHistory(); // Load guest history if any
    }
    addWelcomeMessage();
});

function loadChatHistory() {
    const key = state.currentUser ? `chatHistory_${state.currentUser.uid}` : 'chatHistory_guest';
    const savedHistory = localStorage.getItem(key);
    if (savedHistory) {
        state.chatHistory = JSON.parse(savedHistory);
        elements.chatbox.innerHTML = ''; // Clear existing
        state.chatHistory.forEach(msg => {
            if (msg.role === 'user') addMessageToChat(msg.content, true, false);
            else if (msg.role === 'ai') addMessageToChat(msg.content, false, false);
            else if (msg.role === 'img-response') addImageResponse(msg.content, false);
        });
    }
}

function saveChatHistory() {
    const key = state.currentUser ? `chatHistory_${state.currentUser.uid}` : 'chatHistory_guest';
    localStorage.setItem(key, JSON.stringify(state.chatHistory));
}

function addWelcomeMessage() {
    const welcomeText = `Hello! I am Hixvy AI.
        <br><br>
        • <b>Ask</b> me any question.<br>
        • <b>Upload/Snap</b> a photo for me to read.<br>
        • <b>Generate</b> images using the wand button.`;
    addMessageToChat(welcomeText, false, false); // Add without saving to history
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    elements.chatInput.focus();
    setupModals();

    // Auto-resize textarea
    elements.chatInput.addEventListener('input', () => {
        elements.chatInput.style.height = 'auto';
        elements.chatInput.style.height = (elements.chatInput.scrollHeight) + 'px';
    });
});

elements.cameraButton.addEventListener('click', openCameraMode);
elements.galleryButton.addEventListener('click', () => elements.imageUpload.click());
elements.genImageButton.addEventListener('click', () => {
    elements.chatInput.value = "/image ";
    elements.chatInput.focus();
});
elements.speakerButton.addEventListener('click', toggleSpeaker);

// Mobile Menu
elements.mobileMenuBtn.addEventListener('click', () => elements.sidebar.classList.add('open'));
elements.sidebarOverlay.addEventListener('click', () => elements.sidebar.classList.remove('open'));

// New Chat
elements.newChatBtn.addEventListener('click', () => {
    elements.chatbox.innerHTML = '';
    state.chatHistory = [];
    saveChatHistory();
    addWelcomeMessage();
});

// Auth buttons
elements.logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    localStorage.removeItem('guestMessageCount'); // Clear guest count on logout
    window.location.href = 'login.html';
});
elements.devInfoBtn.addEventListener('click', () => elements.developerModal.classList.remove('hidden'));

// File Upload
elements.imageUpload.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (evt) => openCropMode(evt.target.result);
        reader.readAsDataURL(e.target.files[0]);
    }
    e.target.value = '';
});

// Chat Submission
elements.chatForm.addEventListener('submit', handleFormSubmit);
elements.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleFormSubmit(e);
    }
});

async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Guest check
    if (!state.currentUser) {
        if (state.guestMessageCount >= MAX_GUEST_MESSAGES) {
            elements.guestLimitModal.classList.remove('hidden');
            return;
        }
    }

    const message = elements.chatInput.value.trim();
    if (!message && !state.pendingImageFile) return;

    if (!state.currentUser) {
        state.guestMessageCount++;
        localStorage.setItem('guestMessageCount', state.guestMessageCount);
    }

    if (message) {
        addMessageToChat(message, true);
    } else if (state.pendingImageFile) {
        addMessageToChat("Analyze this image.", true);
    }

    elements.chatInput.value = '';
    elements.chatInput.style.height = 'auto'; // Reset height

    if (state.pendingImageFile) {
        const imgFile = state.pendingImageFile;
        state.pendingImageFile = null;
        elements.chatInput.placeholder = "Message Hixvy AI...";
        await processImageQuery(imgFile, message || "Explain this image");
    } else {
        await processTextQuery(message);
    }
}


// --- Core AI Processing ---
async function processImageQuery(file, userQuestion) {
    setLoading(true);
    try {
        const { data: { text: ocrText } } = await Tesseract.recognize(file, 'eng');
        const cleanText = ocrText ? ocrText.trim() : "";
        let prompt = cleanText.length > 5 
            ? `Image Analysis Task:\nDetected Text: "${cleanText}"\nUser's Question: "${userQuestion}"\n\nProvide a helpful analysis.`
            : `Image Analysis Task:\nNo text was detected in the image.\nUser's Question: "${userQuestion}"\n\nAnswer based on visual context if possible, or general knowledge.`;
        const response = await callLLM(prompt);
        addMessageToChat(response, false);
        speak(response);
    } catch (error) {
        console.error(error);
        const errorMsg = "I had trouble reading that image. Please try a clearer photo.";
        addMessageToChat(errorMsg, false);
        speak(errorMsg);
    } finally {
        setLoading(false);
    }
}

async function processTextQuery(text) {
    setLoading(true);
    try {
        if (text.toLowerCase().startsWith('/image')) {
            const imgPrompt = text.replace('/image', '').trim();
            if(!imgPrompt) {
                addMessageToChat("Please provide a prompt for the image generation.", false);
                setLoading(false);
                return;
            }
            const data = await callApi('https://backend.buildpicoapps.com/aero/run/image-generation-api?pk=v1-Z0FBQUFBQnBoUUhqOWZGcnEzZ2JMRW5Qcks0eDlGUjJzcGhNY3VLTXNfM0FnblpGYmotbW9QVmlZNk1NSlN5VU15V1d3YmN4ZWhCalcyZjA4bkIyT2VfVlduaGNYazNaOXc9PQ==', imgPrompt);
            if (data.status === 'success') {
                addImageResponse(data.imageUrl);
            } else {
                addMessageToChat("Sorry, I couldn't generate that image.", false);
            }
        } else {
            const response = await callLLM(text);
            addMessageToChat(response, false);
            speak(response);
        }
    } catch (err) {
        const errorMsg = "I'm having trouble connecting right now. Please check your connection and try again.";
        addMessageToChat(errorMsg, false);
        speak(errorMsg);
    } finally {
        setLoading(false);
    }
}

// --- API Utilities ---
async function callLLM(prompt) {
    const data = await callApi('https://backend.buildpicoapps.com/aero/run/llm-api?pk=v1-Z0FBQUFBQnBoUUhqOWZGcnEzZ2JMRW5Qcks0eDlGUjJzcGhNY3VLTXNfM0FnblpGYmotbW9QVmlZNk1NSlN5VU15V1d3YmN4ZWhCalcyZjA4bkIyT2VfVlduaGNYazNaOXc9PQ==', prompt);
    return data.text || "I'm sorry, I couldn't process that request.";
}

async function callApi(url, prompt) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
    });
    if (!res.ok) throw new Error(`API call failed: ${res.status}`);
    return await res.json();
}

// --- UI & DOM Manipulation ---
function addMessageToChat(text, isUser, save = true) {
    const messageType = isUser ? 'user' : 'ai';
    
    if (save) {
        state.chatHistory.push({ role: messageType, content: text });
        saveChatHistory();
    }
    
    const wrapper = document.createElement('div');
    wrapper.className = `message flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`;

    let content = '';
    if (isUser) {
        content = `<div class="message-content max-w-xl lg:max-w-3xl px-4 py-3 rounded-2xl rounded-tr-none shadow-lg">${escapeHtml(text)}</div>`;
    } else {
        content = `
            <div class="flex gap-3 max-w-xl lg:max-w-3xl">
                <div class="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0 flex items-center justify-center text-violet-400 mt-1">
                    <i class="fas fa-brain"></i>
                </div>
                <div class="message-content px-4 py-3 rounded-2xl rounded-tl-none shadow-lg">${formatText(text)}</div>
            </div>`;
    }
    
    wrapper.innerHTML = content;
    elements.chatbox.appendChild(wrapper);
    scrollToBottom();
}

function addImageResponse(url, save = true) {
     if (save) {
        state.chatHistory.push({ role: 'img-response', content: url });
        saveChatHistory();
    }
    const div = document.createElement('div');
    div.className = "message flex justify-start w-full mb-4";
    div.innerHTML = `
        <div class="flex gap-3 max-w-[90%]">
            <div class="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0 flex items-center justify-center text-violet-400 mt-1"><i class="fas fa-brain"></i></div>
            <div class="mt-1">
                <img src="${url}" class="rounded-xl shadow-lg max-w-[250px] border border-gray-700 cursor-pointer hover:opacity-90 transition-opacity" onclick="window.open('${url}', '_blank')">
                <p class="text-xs text-gray-500 mt-1 ml-1">Generated Image</p>
            </div>
        </div>`;
    elements.chatbox.appendChild(div);
    scrollToBottom();
}

function setLoading(isLoading) {
    elements.typingIndicator.classList.toggle('hidden', !isLoading);
    elements.sendButton.disabled = isLoading;
    elements.sendButton.classList.toggle('opacity-50', isLoading);
    if (isLoading) scrollToBottom();
}

function scrollToBottom() {
    elements.chatbox.scrollTop = elements.chatbox.scrollHeight;
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function formatText(text) {
    let formatted = escapeHtml(text);
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>'); // Bold
    formatted = formatted.replace(/\n/g, '<br>'); // Newlines
    return formatted;
}


// --- Voice & Speech ("Mia" Assistant) ---
const synth = window.speechSynthesis;
let voices = [];
function populateVoiceList() {
    voices = synth.getVoices();
}
populateVoiceList();
if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = populateVoiceList;
}

function toggleSpeaker() {
    state.isSpeakerOn = !state.isSpeakerOn;
    const icon = elements.speakerButton.querySelector('i');
    icon.className = state.isSpeakerOn ? 'fas fa-volume-up' : 'fas fa-volume-mute';
    if (!state.isSpeakerOn) synth.cancel();
}

function speak(text) {
    if (!state.isSpeakerOn || !text) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    // Try to find a female English voice, "Mia" is just a label
    const miaVoice = voices.find(voice => voice.name.includes('Female') && voice.lang.includes('en')) || voices.find(voice => voice.lang.includes('en-US')) || voices[0];
    u.voice = miaVoice;
    u.rate = 1.05;
    u.pitch = 1.1;
    synth.speak(u);
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
        elements.micButton.classList.add('text-red-500', 'animate-pulse');
        speak("I'm listening.");
    };
    recognition.onend = () => elements.micButton.classList.remove('text-red-500', 'animate-pulse');
    recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        elements.chatInput.value = transcript;
        elements.chatForm.requestSubmit();
    };
    recognition.onerror = (e) => {
        console.error('Speech recognition error:', e.error);
        speak("Sorry, I didn't catch that.");
    }
    
    elements.micButton.addEventListener('click', () => {
        if (!state.currentUser) {
            alert("The Mia Voice Assistant is only available for logged-in users. Please log in or sign up.");
            return;
        }
        recognition.start();
    });
} else {
    elements.micButton.style.display = 'none';
}


// --- Media Modal & Cropper (Functions from original file, adapted) ---
// (This large block of code remains mostly the same, but is adapted to use the new modal system)

let cropper;

function setupModals() {
    // Developer Modal
    elements.developerModal.innerHTML = `
        <div class="relative w-full max-w-md p-6 rounded-2xl modal-content shadow-2xl">
            <button class="absolute top-3 right-3 w-8 h-8 rounded-full hover:bg-gray-700/50 flex items-center justify-center transition-colors" onclick="document.getElementById('developerModal').classList.add('hidden')"><i class="fas fa-times"></i></button>
            <h2 class="text-xl font-bold text-white">About the Developer</h2>
            <p class="text-sm text-gray-400 mt-1 mb-4">Prashant Kumar Mandal</p>
            <p class="text-gray-300 leading-relaxed">A passionate software and web developer, and UI/UX designer hailing from the small village of Hajipur in Darbhanga, Bihar, India. This project is a showcase of creating a modern, feature-rich AI assistant.</p>
            <div class="flex gap-4 mt-6 text-xl">
                <a href="#" class="text-gray-400 hover:text-violet-400"><i class="fab fa-github"></i></a>
                <a href="#" class="text-gray-400 hover:text-violet-400"><i class="fab fa-linkedin"></i></a>
                <a href="#" class="text-gray-400 hover:text-violet-400"><i class="fab fa-twitter"></i></a>
            </div>
        </div>`;
    
    // Guest Limit Modal
    elements.guestLimitModal.innerHTML = `
        <div class="relative w-full max-w-sm p-8 text-center rounded-2xl modal-content shadow-2xl">
             <h2 class="text-xl font-bold text-white">Guest Limit Reached</h2>
             <p class="text-gray-300 mt-2">You've sent the maximum of ${MAX_GUEST_MESSAGES} messages for a guest user.</p>
             <p class="text-gray-400 mt-4 text-sm">Please log in or create an account to continue the conversation and unlock all features.</p>
             <div class="mt-6 flex gap-4">
                <button class="flex-1 py-2.5 bg-gray-600 rounded-lg hover:bg-gray-700" onclick="document.getElementById('guestLimitModal').classList.add('hidden')">Cancel</button>
                <a href="login.html" class="flex-1 block py-2.5 bg-violet-600 rounded-lg hover:bg-violet-700">Login / Sign Up</a>
             </div>
        </div>`;
}

async function openCameraMode() {
    elements.mediaModal.innerHTML = getMediaModalHtml('Camera');
    elements.mediaModal.classList.remove('hidden');
    bindMediaModalEvents();

    const videoFeed = document.getElementById('videoFeed');
    try {
        state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        videoFeed.srcObject = state.stream;
    } catch (err) {
        alert("Camera access denied or unavailable.");
        closeMediaModal();
    }
}

function capturePhoto() {
    const videoFeed = document.getElementById('videoFeed');
    const canvas = document.createElement('canvas');
    canvas.width = videoFeed.videoWidth;
    canvas.height = videoFeed.videoHeight;
    canvas.getContext('2d').drawImage(videoFeed, 0, 0);
    stopCamera();
    openCropMode(canvas.toDataURL('image/png'));
}

function openCropMode(imageSrc) {
    elements.mediaModal.innerHTML = getMediaModalHtml('Crop & Edit', true);
    elements.mediaModal.classList.remove('hidden');
    bindMediaModalEvents(true);

    const imageToCrop = document.getElementById('imageToCrop');
    imageToCrop.src = imageSrc;

    if (cropper) cropper.destroy();
    cropper = new Cropper(imageToCrop, {
        viewMode: 1, dragMode: 'move', autoCropArea: 0.9, restore: false,
        guides: true, center: true, highlight: false, background: false,
    });
}

function finishCropping() {
    if (!cropper) return;
    cropper.getCroppedCanvas().toBlob((blob) => {
        state.pendingImageFile = new File([blob], "captured.png", { type: "image/png" });
        closeMediaModal();
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'flex justify-end w-full message-anim mb-2';
            div.innerHTML = `
                <div class="relative group">
                    <img src="${e.target.result}" class="max-w-[150px] rounded-2xl border-2 border-violet-500 shadow-md">
                    <div class="absolute -bottom-2 -right-2 bg-violet-600 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center text-xs"><i class="fas fa-check"></i></div>
                </div>`;
            elements.chatbox.appendChild(div);
            scrollToBottom();
            elements.chatInput.placeholder = "Ask a question about this image...";
            elements.chatInput.focus();
        };
        reader.readAsDataURL(state.pendingImageFile);
    }, 'image/png');
}

function closeMediaModal() {
    stopCamera();
    if (cropper) cropper.destroy();
    elements.mediaModal.classList.add('hidden');
    elements.mediaModal.innerHTML = ''; // Clean up
}

function stopCamera() {
    if (state.stream) {
        state.stream.getTracks().forEach(t => t.stop());
        state.stream = null;
    }
}

function getMediaModalHtml(title, isCropMode = false) {
    return `
        <div class="flex justify-between items-center p-4 bg-black/20 backdrop-blur-sm absolute top-0 w-full z-10 text-white">
            <h3 class="font-medium text-sm tracking-wide opacity-80">${title}</h3>
            <button id="closeModalBtn" class="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><i class="fas fa-times"></i></button>
        </div>
        <div class="flex-grow relative bg-black flex items-center justify-center overflow-hidden">
            <video id="videoFeed" class="absolute inset-0 w-full h-full object-cover ${isCropMode ? 'hidden' : ''}" autoplay playsinline></video>
            <div id="cropContainer" class="w-full h-full ${!isCropMode ? 'hidden' : ''} bg-black">
                <img id="imageToCrop" src="" alt="Crop Preview" class="max-w-full max-h-full block">
            </div>
        </div>
        <div class="bg-black/80 backdrop-blur-md p-6 pb-8 flex justify-center items-center gap-8 min-h-[120px]">
            <button id="captureBtn" class="group relative ${isCropMode ? 'hidden' : ''}">
                <div class="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center transition-transform group-hover:scale-95"><div class="w-14 h-14 bg-white rounded-full"></div></div>
            </button>
            <div id="cropControls" class="${!isCropMode ? 'hidden' : 'flex'} gap-4 w-full justify-between max-w-sm">
                <button id="retakeBtn" class="flex-1 py-3 bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-600">Retake</button>
                <button id="confirmCropBtn" class="flex-1 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-500"><i class="fas fa-check mr-2"></i> Use Photo</button>
            </div>
        </div>`;
}

function bindMediaModalEvents(isCropMode = false) {
    document.getElementById('closeModalBtn').addEventListener('click', closeMediaModal);
    if (isCropMode) {
        document.getElementById('retakeBtn').addEventListener('click', openCameraMode);
        document.getElementById('confirmCropBtn').addEventListener('click', finishCropping);
    } else {
        document.getElementById('captureBtn').addEventListener('click', capturePhoto);
    }
}
