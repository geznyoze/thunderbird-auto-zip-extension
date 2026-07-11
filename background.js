const TOTAL_SIZE_LIMIT_BYTES = 3 * 1024 * 1024; // 3 MB

browser.compose.onBeforeSend.addListener(async (tab, changeInfo) => {
  console.log("[AutoZIP] Send command intercepted. Verifying aggregate size.");
  
  const attachments = await browser.compose.listAttachments(tab.id);
  
  if (attachments.length === 0) {
    return {};
  }

  // Retrieve file objects for all attachments
  const files = await Promise.all(attachments.map(att => browser.compose.getAttachmentFile(att.id)));
  
  // Calculate the total combined size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  console.log(`[AutoZIP] Aggregate attachment size: ${totalSize} bytes.`);

  if (totalSize <= TOTAL_SIZE_LIMIT_BYTES) {
    console.log("[AutoZIP] Aggregate size within acceptable limits. Proceeding with transmission.");
    return {}; 
  }

  console.log("[AutoZIP] Aggregate size limit exceeded. Initiating user prompt.");
  const userChoice = await promptUser();

  if (userChoice.cancel) {
    console.log("[AutoZIP] Prompt terminated by user. Transmission aborted.");
    return { cancel: true };
  }

  if (userChoice.zip) {
    console.log("[AutoZIP] Compression authorized. Executing batch archive protocol.");
    try {
      const zip = new JSZip();
      
      // Inject all files into the single ZIP instance
      for (let i = 0; i < attachments.length; i++) {
        zip.file(attachments[i].name, files[i]);
      }
      
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zippedFile = new File([zipBlob], "attachments.zip", { type: "application/zip" });

      // Attach the master ZIP file
      await browser.compose.addAttachment(tab.id, { file: zippedFile });

      // Purge all original attachments from the message
      for (const attachment of attachments) {
        await browser.compose.removeAttachment(tab.id, attachment.id);
      }
      
      console.log("[AutoZIP] Batch archive complete. Original files purged.");
    } catch (e) {
      console.error("[AutoZIP] Critical compression failure: ", e);
      return { cancel: true }; // Abort send to prevent data loss
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
      console.error("[AutoZIP] Window instantiation failed:", err);
      resolve({ zip: false, cancel: false });
    });
  });
}