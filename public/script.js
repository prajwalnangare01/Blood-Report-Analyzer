document.addEventListener('DOMContentLoaded', () => {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const resultsSection = document.getElementById('resultsSection');
    const homeSection = document.getElementById('home');

    const navLinks = document.querySelectorAll('.nav-links a');

    // Handle Nav Active State
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // Drag and Drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFile(files[0]);
    });

    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });

    let isProcessing = false;

    async function handleFile(file) {
        if (isProcessing) return;
        if (!file.type.startsWith('image/')) {
            alert('Please upload a valid image file of your report.');
            return;
        }

        isProcessing = true;
        // Show loading
        loadingOverlay.classList.remove('hidden');
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Processing...';

        const formData = new FormData();
        formData.append('report', file);

        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || 'Failed to analyze report');
            }

            loadingOverlay.classList.add('hidden');
            showResults(data);
            resultsSection.classList.remove('hidden');
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error(error);
            alert(`Error: ${error.message}`);
            loadingOverlay.classList.add('hidden');
        } finally {
            isProcessing = false;
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Choose File';
        }
    }

    function showResults(data) {
        // Populate Table
        const tbody = document.querySelector('#biomarkerTable tbody');
        tbody.innerHTML = '';
        data.biomarkers.forEach(item => {
            const row = `<tr>
                <td>${item.parameter}</td>
                <td>${item.result}</td>
                <td>${item.range}</td>
                <td style="color: ${item.status.includes('⚠️') ? 'var(--warning)' : 'var(--secondary)'}">${item.status}</td>
            </tr>`;
            tbody.insertAdjacentHTML('beforeend', row);
        });

        // Populate Summaries
        document.getElementById('englishSummary').textContent = data.docsNote;
        document.getElementById('hindiSummary').textContent = data.hindiSummary;

        // Populate Action Steps
        const stepsUl = document.getElementById('actionSteps');
        stepsUl.innerHTML = '';
        data.actionableSteps.forEach(step => {
            const li = `<li>${step}</li>`;
            stepsUl.insertAdjacentHTML('beforeend', li);
        });

        // Risk Alert
        const riskAlert = document.getElementById('riskAlert');
        if (data.risk) {
            riskAlert.classList.remove('hidden');
            document.getElementById('alertMessage').textContent = data.risk;
        } else {
            riskAlert.classList.add('hidden');
        }

        document.getElementById('reportDate').textContent = new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }
});
