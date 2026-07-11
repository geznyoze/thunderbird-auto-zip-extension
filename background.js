browser.compose.onBeforeSend.addListener(async (tab, changeInfo) => {
  console.log("[AutoZIP] Send command intercepted.");
  
  const attachments = await browser.compose.listAttachments(tab.id);
  if (attachments.length === 0) return {};

  // Retrieve custom threshold from storage (default to 3MB if missing)
  const settings = await browser.storage.local.get({ sizeLimitMB: 3 });
  const dynamicLimitBytes = settings.sizeLimitMB * 1024 * 1024;

  const files = await Promise.all(attachments.map(att => browser.compose.getAttachmentFile(att.id)));
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  
  console.log(`[AutoZIP] Aggregate size: ${totalSize} bytes. Limit: ${dynamicLimitBytes} bytes.`);

  if (totalSize <= dynamicLimitBytes) {
    return {}; 
  }

  console.log("[AutoZIP] Limit exceeded. Initiating prompt.");
  const userChoice = await promptUser();

  if (userChoice.cancel) return { cancel: true };

  if (userChoice.zip) {
    try {
      const zip = new JSZip();
      for (let i = 0; i < attachments.length; i++) {
        zip.file(attachments[i].name, files[i]);
      }
      
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zippedFile = new File([zipBlob], "attachments.zip", { type: "application/zip" });

      await browser.compose.addAttachment(tab.id, { file: zippedFile });

      for (const attachment of attachments) {
        await browser.compose.removeAttachment(tab.id, attachment.id);
      }
      console.log("[AutoZIP] Archive complete.");
    } catch (e) {
      console.error("[AutoZIP] Compression failure: ", e);
      return { cancel: true }; 
    }
  }

  return {};
});

function promptUser() {
  return new Promise((resolve) => {
    browser.windows.create({
      url: browser.runtime.getURL("dialog.html"),
      type: "popup",
      width: 400,
      height: 200
    }).then((windowObj) => {
      const messageListener = (message) => {
        if (message.action === "user_choice") {
          cleanup();
          resolve({ zip: message.zip, cancel: false });
        }
      };
      const windowListener = (windowId) => {
        if (windowId === windowObj.id) {
          cleanup();
          resolve({ zip: false, cancel: true });
        }
      };
      const cleanup = () => {
        browser.runtime.onMessage.removeListener(messageListener);
        browser.windows.onRemoved.removeListener(windowListener);
      };
      browser.runtime.onMessage.addListener(messageListener);
      browser.windows.onRemoved.addListener(windowListener);
    }).catch(err => {
      resolve({ zip: false, cancel: false });
    });
  });
}