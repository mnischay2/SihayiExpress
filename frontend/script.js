document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadForm');
    const messageDiv = document.getElementById('message');

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageDiv.textContent = '';
        messageDiv.className = '';

        const formData = new FormData(uploadForm);

        try {
            const response = await fetch('http://localhost:5000/upload', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (response.ok) {
                messageDiv.textContent = result.message;
                messageDiv.className = 'alert alert-success';
            } else {
                messageDiv.textContent = result.error;
                messageDiv.className = 'alert alert-danger';
            }
        } catch (error) {
            messageDiv.textContent = 'Error uploading file.';
            messageDiv.className = 'alert alert-danger';
        }
    });
});
