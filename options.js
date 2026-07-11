// Saves options to browser.storage
function saveOptions() {
  const sizeLimitMB = document.getElementById('sizeLimit').value;
  
  browser.storage.local.set({
    sizeLimitMB: parseFloat(sizeLimitMB)
  }).then(() => {
    // Update status to let user know options were saved.
    const status = document.getElementById('status');
    status.textContent = 'Saved successfully.';
    setTimeout(() => {
      status.textContent = '';
    }, 2000);
  });
}

// Restores input state using the preferences stored in browser.storage
function restoreOptions() {
  // Use default value sizeLimitMB = 3 if it doesn't exist yet
  browser.storage.local.get({
    sizeLimitMB: 3 
  }).then((result) => {
    document.getElementById('sizeLimit').value = result.sizeLimitMB;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('saveBtn').addEventListener('click', saveOptions);