document.getElementById('yesBtn').addEventListener('click', () => {
  browser.runtime.sendMessage({ action: "user_choice", zip: true });
  window.close();
});

document.getElementById('noBtn').addEventListener('click', () => {
  browser.runtime.sendMessage({ action: "user_choice", zip: false });
  window.close();
});