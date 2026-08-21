import { auth, db, signOut, doc, updateDoc, collection, addDoc, query, where, onSnapshot, getDocs, serverTimestamp } from './firebase-config.js';
import { requireRole } from './role-manager.js';

let currentSessionId = null;
let unsubscribeAttendance = null;
let attendanceData = []; 

// Restrict access to faculty only
requireRole('faculty');

const logoutBtn = document.getElementById('logout-btn');
const createSessionForm = document.getElementById('create-session-form');
const dashboardMain = document.getElementById('dashboard-main');
const activeSession = document.getElementById('active-session');
const activeSubjectEl = document.getElementById('active-subject');
const attendanceList = document.getElementById('attendance-list');
const presentCountEl = document.getElementById('present-count');
const endSessionBtn = document.getElementById('end-session-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');

auth.onAuthStateChanged(async (user) => {
    if (user) {
        loadFacultyStats(user.uid);
    }
});

logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

async function loadFacultyStats(uid) {
    try {
        const q = query(collection(db, 'sessions'), where('facultyUid', '==', uid));
        const snapshot = await getDocs(q);
        document.getElementById('total-sessions-stat').innerText = snapshot.size;
    } catch(e) {
        console.error("Failed to load stats", e);
    }
}

createSessionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const subject = document.getElementById('session-subject').value;
    const division = document.getElementById('session-division').value;
    
    try {
        const sessionRef = await addDoc(collection(db, 'sessions'), {
            facultyUid: auth.currentUser.uid,
            subject: subject,
            division: division,
            createdAt: serverTimestamp(),
            active: true
        });
        
        currentSessionId = sessionRef.id;
        
        // Show Active Session View
        dashboardMain.classList.add('hidden');
        activeSession.classList.remove('hidden');
        activeSubjectEl.innerText = `${subject} (${division})`;
        
        // Generate QR Code
        document.getElementById('qrcode').innerHTML = '';
        new QRCode(document.getElementById("qrcode"), {
            text: currentSessionId, // A dynamic rotating token could go here if backed by cloud functions
            width: 256,
            height: 256,
            colorDark : "#1a73e8",
            colorLight : "#ffffff",
        });
        
        startLiveAttendanceListener(currentSessionId);
        
    } catch (error) {
        console.error("Error creating session:", error);
        alert("Failed to create session.");
    }
});

function startLiveAttendanceListener(sessionId) {
    attendanceData = [];
    const q = query(collection(db, 'attendance'), where('sessionId', '==', sessionId));
    
    unsubscribeAttendance = onSnapshot(q, (snapshot) => {
        attendanceList.innerHTML = ''; 
        attendanceData = [];
        
        snapshot.forEach((docSnap) => {
            attendanceData.push(docSnap.data());
        });

        presentCountEl.innerText = attendanceData.length;

        if (attendanceData.length === 0) {
            attendanceList.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #888;">Waiting for students...</td></tr>';
            return;
        }

        // Sort by Student ID
        attendanceData.sort((a, b) => {
            let idA = (a.studentId || "").toUpperCase();
            let idB = (b.studentId || "").toUpperCase();
            return idA.localeCompare(idB);
        });
        
        attendanceData.forEach((data) => {
            const tr = document.createElement('tr');
            
            let timeStr = "Pending...";
            if (data.timestamp) {
                const date = data.timestamp.toDate();
                timeStr = date.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            }
            
            tr.innerHTML = `
                <td style="font-weight: bold; font-family: monospace;">${data.studentId || '-'}</td>
                <td>${data.name || '-'}</td>
                <td><span style="background: #e8f0fe; color: #1967d2; padding: 2px 6px; border-radius: 4px; font-size: 0.8em;">${data.division || '-'}</span></td>
                <td style="font-family: monospace; font-size: 0.9em; color: #555;">${timeStr}</td>
            `;
            attendanceList.appendChild(tr);
        });
    });
}

endSessionBtn.addEventListener('click', async () => {
    if (!confirm("Are you sure you want to close this session? Students will no longer be able to mark attendance.")) return;

    try {
        // Mark session as inactive in Firestore. 
        // This triggers Firestore rules to reject any new attendance submissions.
        if (currentSessionId) {
            await updateDoc(doc(db, 'sessions', currentSessionId), {
                active: false,
                closedAt: serverTimestamp()
            });
        }
    } catch(e) {
        console.error("Error closing session", e);
        alert("Failed to close session properly.");
    }

    if (unsubscribeAttendance) {
        unsubscribeAttendance();
    }
    currentSessionId = null;
    activeSession.classList.add('hidden');
    dashboardMain.classList.remove('hidden');
    document.getElementById('create-session-form').reset();
    document.getElementById('qrcode').innerHTML = '';
    
    // Refresh stats
    if(auth.currentUser) loadFacultyStats(auth.currentUser.uid);
});

exportCsvBtn.addEventListener('click', () => {
    if (attendanceData.length === 0) {
        alert("No attendance data to export.");
        return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Student ID,Name,Division,Time\n";
    
    attendanceData.forEach(row => {
        let timeStr = "";
        if (row.timestamp) {
            const d = row.timestamp.toDate();
            timeStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
        }
        
        const safeId = `"${row.studentId || ''}"`;
        const safeName = `"${row.name || ''}"`;
        const safeDiv = `"${row.division || ''}"`;
        
        csvContent += `${safeId},${safeName},${safeDiv},"${timeStr}"\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filename = `Attendance_${activeSubjectEl.innerText.replace(/[^a-z0-9]/gi, '_')}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});
