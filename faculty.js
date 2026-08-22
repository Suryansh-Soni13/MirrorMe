import { auth, db, signOut, onAuthStateChanged, collection, addDoc, query, where, onSnapshot, serverTimestamp } from './firebase-config.js';
import { allStudentsData } from './studentsData.js';

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

        // We map all students to their attendance status
        const displayData = allStudentsData.map(student => {
            // Find if student scanned
            const record = attendanceData.find(a => a.studentId === student.studentId);
            return {
                ...student,
                timestamp: record ? record.timestamp : null,
                status: record ? 'Present' : 'Absent'
            };
        });
        
        // Render rows
        displayData.forEach((data) => {
            const tr = document.createElement('tr');
            
            let timeStr = "-";
            if (data.status === 'Present' && data.timestamp) {
                const date = data.timestamp.toDate();
                timeStr = date.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            } else if (data.status === 'Present') {
                timeStr = "Pending...";
            }
            
            const statusColor = data.status === 'Present' ? 'green' : 'red';
            
            tr.innerHTML = `
                <td style="font-weight: 500;">${data.studentId || '-'}</td>
                <td>${data.name || '-'}</td>
                <td><span style="background: #e8f0fe; color: #1967d2; padding: 4px 8px; border-radius: 4px; font-size: 0.9em;">${data.division || '-'}</span></td>
                <td style="color: ${statusColor}; font-weight: bold;">${data.status}</td>
                <td style="font-family: monospace;">${timeStr}</td>
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
    // Generate CSV for ALL students
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Student ID,Name,Division,Status,Time\n";
    
    allStudentsData.forEach(student => {
        const record = attendanceData.find(a => a.studentId === student.studentId);
        const status = record ? 'Present' : 'Absent';
        
        let timeStr = "";
        if (record && record.timestamp) {
            const d = record.timestamp.toDate();
            timeStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
        }
        
        const safeId = `"${student.studentId || ''}"`;
        const safeName = `"${student.name || ''}"`;
        const safeDiv = `"${student.division || ''}"`;
        
        csvContent += `${safeId},${safeName},${safeDiv},"${status}","${timeStr}"\n`;
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    const filename = `Attendance_${activeSubjectEl.innerText.replace(/[^a-z0-9]/gi, '_')}.csv`;
    link.setAttribute("download", filename);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});
