import { auth, db, signOut, onAuthStateChanged, doc, getDoc, collection, addDoc, query, where, getDocs, serverTimestamp } from './firebase-config.js';

let html5Qrcode = null;
let currentStudent = null;

const studentNameEl = document.getElementById('student-name');
const logoutBtn = document.getElementById('logout-btn');
const scannerSection = document.getElementById('scanner-section');
const successSection = document.getElementById('success-section');
const loadingIndicator = document.getElementById('loading-indicator');

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        // Load student profile
        const studentRef = doc(db, 'students', user.uid);
        const snap = await getDoc(studentRef);
        if (snap.exists()) {
            currentStudent = snap.data();
            studentNameEl.innerText = currentStudent.name;
            initScanner();
        } else {
            alert("Student profile not found. Please register.");
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error("Critical Error Loading Profile:", error);
        alert("Error loading profile from database: " + error.message + "\n\nMake sure your Firestore rules are correct!");
        document.getElementById('student-name').innerText = "ERROR";
    }
});

logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

function initScanner() {
    // Configure to ONLY use back camera and lower FPS to save data/battery, access faster
    html5Qrcode = new Html5Qrcode("qr-reader");
    html5Qrcode.start(
        { facingMode: "environment" },
        {
            fps: 5,
            qrbox: { width: 250, height: 250 }
        },
        onScanSuccess,
        onScanError
    ).then(() => {
        setupZoom();
    }).catch(err => {
        console.error("Error starting camera: ", err);
        alert("Camera error: Please ensure you have granted camera permissions and are using a compatible browser.");
    });
}

function setupZoom() {
    setTimeout(() => {
        const video = document.querySelector('#qr-reader video');
        if (video && video.srcObject) {
            const track = video.srcObject.getVideoTracks()[0];
            const capabilities = track.getCapabilities();
            if (capabilities.zoom) {
                const zoomControls = document.getElementById('zoom-controls');
                const zoomSlider = document.getElementById('zoom-slider');
                if(zoomControls && zoomSlider) {
                    zoomControls.classList.remove('hidden');
                    zoomSlider.min = capabilities.zoom.min;
                    zoomSlider.max = capabilities.zoom.max;
                    zoomSlider.step = capabilities.zoom.step;
                    zoomSlider.value = track.getSettings().zoom || 1;
                    zoomSlider.addEventListener('input', () => {
                        try {
                            track.applyConstraints({ advanced: [ { zoom: zoomSlider.value } ] });
                        } catch(e) {
                            console.warn("Zoom not supported on this device", e);
                        }
                    });
                }
            }
        }
    }, 1000);
}

function onScanError(errorMessage) {
    // Ignore scan errors, it just means no QR found yet
}

async function onScanSuccess(decodedText, decodedResult) {
    if (html5Qrcode) {
        html5Qrcode.stop().catch(err => console.error(err));
    }
    
    const sessionId = decodedText.trim();
    
    // 1. CHECK IF ALREADY ATTENDED THIS SESSION
    loadingIndicator.classList.remove('hidden');
    scannerSection.classList.add('hidden');
    
    const q = query(
        collection(db, 'attendance'), 
        where('sessionId', '==', sessionId),
        where('studentUid', '==', auth.currentUser.uid)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
        alert("You have already submitted attendance for this session!");
        window.location.reload();
        return;
    }

    // 2. PROCEED TO SUBMIT ATTENDANCE
    loadingIndicator.classList.add('hidden');
    successSection.classList.remove('hidden');
    
    document.getElementById('display-name').innerText = currentStudent.name;
    document.getElementById('display-id').innerText = currentStudent.studentId;
    document.getElementById('display-div').innerText = currentStudent.division;
    
    // Wait 3 seconds then submit
    let timeLeft = 3;
    const timerEl = document.getElementById('timer');
    const interval = setInterval(async () => {
        timeLeft--;
        timerEl.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(interval);
            document.getElementById('countdown-text').classList.add('hidden');
            document.getElementById('attendance-done').classList.remove('hidden');
            await submitAttendance(sessionId);
        }
    }, 1000);
}

async function submitAttendance(sessionId) {
    try {
        await addDoc(collection(db, 'attendance'), {
            sessionId: sessionId,
            studentUid: auth.currentUser.uid,
            studentId: currentStudent.studentId || "Unknown ID",
            name: currentStudent.name || "Unknown Name",
            division: currentStudent.division || "Unknown Div",
            timestamp: serverTimestamp()
        });
        
        setTimeout(() => {
            alert("Attendance recorded successfully!");
            window.location.reload(); // Reset state
        }, 2000);
    } catch (error) {
        console.error("Error submitting attendance:", error);
        alert("Failed to submit attendance: " + error.message);
    }
}
