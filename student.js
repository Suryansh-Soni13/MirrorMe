import { auth, db, signOut, doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit, serverTimestamp } from './firebase-config.js';
import { requireRole } from './role-manager.js';

let html5Qrcode = null;
let currentStudent = null;

// Require student role to view this page
requireRole('student');

const studentNameEl = document.getElementById('student-name');
const studentIdDisplayEl = document.getElementById('student-id-display');
const studentDivDisplayEl = document.getElementById('student-div-display');
const logoutBtn = document.getElementById('logout-btn');

const dashboardSection = document.getElementById('dashboard-section');
const scannerSection = document.getElementById('scanner-section');
const successSection = document.getElementById('success-section');
const loadingIndicator = document.getElementById('loading-indicator');
const openScannerBtn = document.getElementById('open-scanner-btn');
const closeScannerBtn = document.getElementById('close-scanner-btn');
const backToDashBtn = document.getElementById('back-to-dash-btn');

auth.onAuthStateChanged(async (user) => {
    if (!user) return; // Handled by requireRole
    
    try {
        const studentRef = doc(db, 'users', user.uid);
        const snap = await getDoc(studentRef);
        if (snap.exists()) {
            currentStudent = snap.data();
            studentNameEl.innerText = currentStudent.name || "Student";
            studentIdDisplayEl.innerText = currentStudent.studentId || "No ID";
            studentDivDisplayEl.innerText = currentStudent.division || "No Div";
            
            loadDashboardData(user.uid);
        } else {
            alert("Profile not found.");
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error("Critical Error Loading Profile:", error);
        alert("Error loading profile from database.");
    }
});

logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

openScannerBtn.addEventListener('click', () => {
    dashboardSection.classList.add('hidden');
    scannerSection.classList.remove('hidden');
    initScanner();
});

closeScannerBtn.addEventListener('click', () => {
    if (html5Qrcode) {
        html5Qrcode.stop().catch(e => console.error(e));
    }
    scannerSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
});

backToDashBtn.addEventListener('click', () => {
    window.location.reload();
});

async function loadDashboardData(uid) {
    try {
        // Load attendance history for this student
        const attendanceRef = collection(db, 'attendance');
        const attendanceQuery = query(attendanceRef, where('studentUid', '==', uid));
        const snapshot = await getDocs(attendanceQuery);
        
        let records = [];
        snapshot.forEach(doc => {
            records.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort descending by time
        records.sort((a, b) => {
            const timeA = a.timestamp ? a.timestamp.toMillis() : 0;
            const timeB = b.timestamp ? b.timestamp.toMillis() : 0;
            return timeB - timeA;
        });

        // Compute stats
        const totalClasses = records.length; // Simplified: usually we'd need total *possible* classes
        document.getElementById('total-present').innerText = totalClasses;
        document.getElementById('overall-percentage').innerText = totalClasses > 0 ? "100%" : "0%";
        // Note: Real percentage requires knowing how many sessions the student *should* have attended.
        // That requires a backend function or complex query. For MVP frontend, we show total present.

        // Update history UI
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = '';
        
        if (records.length === 0) {
            historyList.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #888;">No attendance records found.</td></tr>';
        } else {
            records.slice(0, 5).forEach(record => { // Show last 5
                const tr = document.createElement('tr');
                const dateStr = record.timestamp ? record.timestamp.toDate().toLocaleDateString() : "Just now";
                tr.innerHTML = `
                    <td>${dateStr}</td>
                    <td>${record.subject || "Class"}</td>
                    <td><span style="color: var(--success); font-weight: 500;">Present</span></td>
                `;
                historyList.appendChild(tr);
            });
        }
        
        document.getElementById('subject-list').innerHTML = '<div style="font-size: 13px; color: #5f6368; padding: 10px; background: white; border: 1px solid var(--border); border-radius: 8px;">Subject breakdown requires backend sync.</div>';

    } catch (error) {
        console.error("Error loading dashboard data:", error);
    }
}

function initScanner() {
    html5Qrcode = new Html5Qrcode("qr-reader");
    html5Qrcode.start(
        { facingMode: "environment" },
        { fps: 5, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        onScanError
    ).then(() => {
        setupZoom();
    }).catch(err => {
        console.error("Error starting camera: ", err);
        alert("Camera error: Please ensure you have granted camera permissions.");
        closeScannerBtn.click();
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
                            console.warn("Zoom not supported");
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
    
    // The decodedText should contain the sessionId (and maybe a rotating token)
    let sessionId = decodedText.trim();
    // Support parsing if we put a JSON object in the QR to make it dynamic
    try {
        const qrData = JSON.parse(decodedText);
        if (qrData.sessionId) {
            sessionId = qrData.sessionId;
            // E.g. we could validate a short-lived token here if we had cloud functions
        }
    } catch(e) {
        // It's just a raw string session ID
    }
    
    loadingIndicator.classList.remove('hidden');
    scannerSection.classList.add('hidden');
    
    // Polite Client-side duplicate check (Optional, as Firestore rules enforce it anyway)
    const attendanceDocId = `${sessionId}_${auth.currentUser.uid}`;
    const attendanceRef = doc(db, 'attendance', attendanceDocId);
    
    try {
        const existingSnap = await getDoc(attendanceRef);
        if (existingSnap.exists()) {
            alert("You have already submitted attendance for this session!");
            window.location.reload();
            return;
        }
    } catch(e) {
        // Ignore read errors, proceed to write and let rules handle it
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
            
            // Try fetching session details to save subject name
            let subjectName = "Class";
            try {
                const sessionSnap = await getDoc(doc(db, 'sessions', sessionId));
                if (sessionSnap.exists()) {
                    subjectName = sessionSnap.data().subject || "Class";
                }
            } catch(e) {}

            await submitAttendance(sessionId, attendanceDocId, subjectName);
        }
    }, 1000);
}

async function submitAttendance(sessionId, attendanceDocId, subjectName) {
    try {
        // Securely write using the structured ID to prevent duplicates
        await setDoc(doc(db, 'attendance', attendanceDocId), {
            sessionId: sessionId,
            studentUid: auth.currentUser.uid,
            studentId: currentStudent.studentId || "Unknown ID",
            name: currentStudent.name || "Unknown Name",
            division: currentStudent.division || "Unknown Div",
            subject: subjectName,
            timestamp: serverTimestamp()
        });
        
        backToDashBtn.classList.remove('hidden');
    } catch (error) {
        console.error("Error submitting attendance:", error);
        // Error could be due to Firestore rules (e.g., session closed, or duplicate)
        if (error.code === 'permission-denied') {
            alert("Failed to submit attendance. The session might be closed or you already marked your attendance.");
        } else {
            alert("Failed to submit attendance: " + error.message);
        }
        backToDashBtn.classList.remove('hidden');
    }
}
