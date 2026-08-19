import { auth, db, signOut, onAuthStateChanged, collection, addDoc, query, where, onSnapshot, serverTimestamp } from './firebase-config.js';

let currentSessionId = null;
let unsubscribeAttendance = null;
let attendanceData = []; // Store for CSV export

const logoutBtn = document.getElementById('logout-btn');
const createSessionForm = document.getElementById('create-session-form');
const sessionSetup = document.getElementById('session-setup');
const activeSession = document.getElementById('active-session');
const activeSubjectEl = document.getElementById('active-subject');
const attendanceList = document.getElementById('attendance-list');
const endSessionBtn = document.getElementById('end-session-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'index.html';
    }
});

logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

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
        sessionSetup.classList.add('hidden');
        activeSession.classList.remove('hidden');
        activeSubjectEl.innerText = `${subject} (${division})`;
        
        // Generate QR Code
        document.getElementById('qrcode').innerHTML = ''; // clear previous
        new QRCode(document.getElementById("qrcode"), {
            text: currentSessionId,
            width: 256,
            height: 256
        });
        
        startLiveAttendanceListener(currentSessionId);
        
    } catch (error) {
        console.error("Error creating session:", error);
        alert("Failed to create session.");
    }
});

function startLiveAttendanceListener(sessionId) {
    attendanceData = []; // reset
    const q = query(collection(db, 'attendance'), where('sessionId', '==', sessionId));
    
    unsubscribeAttendance = onSnapshot(q, (snapshot) => {
        attendanceList.innerHTML = ''; // clear table
        attendanceData = [];
        
        snapshot.forEach((docSnap) => {
            attendanceData.push(docSnap.data());
        });

        // Sort automatically by Student ID (e.g. 26MCA001 -> 26MCA190)
        attendanceData.sort((a, b) => {
            let idA = (a.studentId || "").toUpperCase();
            let idB = (b.studentId || "").toUpperCase();
            if (idA < idB) return -1;
            if (idA > idB) return 1;
            return 0;
        });
        
        // Render rows
        attendanceData.forEach((data) => {
            const tr = document.createElement('tr');
            
            // Format time safely (handle serverTimestamp delay)
            let timeStr = "Pending...";
            if (data.timestamp) {
                const date = data.timestamp.toDate();
                timeStr = date.toLocaleTimeString();
            }
            
            tr.innerHTML = `
                <td>${timeStr}</td>
                <td>${data.studentId || '-'}</td>
                <td>${data.name || '-'}</td>
                <td>${data.division || '-'}</td>
            `;
            attendanceList.appendChild(tr);
        });
    });
}

endSessionBtn.addEventListener('click', () => {
    if (unsubscribeAttendance) {
        unsubscribeAttendance();
    }
    currentSessionId = null;
    activeSession.classList.add('hidden');
    sessionSetup.classList.remove('hidden');
    document.getElementById('create-session-form').reset();
    document.getElementById('qrcode').innerHTML = '';
});

exportCsvBtn.addEventListener('click', () => {
    if (attendanceData.length === 0) {
        alert("No attendance data to export yet.");
        return;
    }
    
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Time,Student ID,Name,Division\n";
    
    attendanceData.forEach(row => {
        let timeStr = "";
        if (row.timestamp) {
            timeStr = row.timestamp.toDate().toLocaleString();
        }
        
        // Escape quotes and commas
        const safeId = `"${row.studentId || ''}"`;
        const safeName = `"${row.name || ''}"`;
        const safeDiv = `"${row.division || ''}"`;
        
        csvContent += `"${timeStr}",${safeId},${safeName},${safeDiv}\n`;
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    const filename = `Attendance_${activeSubjectEl.innerText.replace(/[^a-z0-9]/gi, '_')}.csv`;
    link.setAttribute("download", filename);
    
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);
});
