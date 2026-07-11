document.addEventListener('DOMContentLoaded', async () => {
  const settings = await browser.storage.local.get({ sizeLimitMB: 3 });
  document.getElementById('sizeLimit').textContent = `${settings.sizeLimitMB}`;
});

document.getElementById('yesBtn').addEventListener('click', () => {
  browser.runtime.sendMessage({ action: "user_choice", zip: true });
  window.close();
});

document.getElementById('noBtn').addEventListener('click', () => {
  browser.runtime.sendMessage({ action: "user_choice", zip: false });
  window.close();
});