// Listen for when a filename is being determined
// chrome.downloads.onDeterminingFilename.addListener(function(downloadItem, suggest) {
//   // Suggest a new filename
//   suggest({
//     filename: 'X',
//     conflictAction: 'uniquify'
//   });
//   return true; // Indicate that the suggestion will be made asynchronously
// });


// Listen for when a filename is being determined
chrome.downloads.onDeterminingFilename.addListener(function(downloadItem, suggest) {
  // Function to fetch the headers of the download URL
  function fetchHeaders(url) {
    return new Promise((resolve, reject) => {
      fetch(url, { method: 'HEAD' })
        .then(response => resolve(response.headers))
        .catch(error => reject(error));
    });
  }

  // Function to suggest a filename based on the content of the file
  async function suggestFilenameFromContent(url) {
    // Fetch the content of the file
    const response = await fetch(url);
    const content = await response.text();

    // Use Chrome's built-in AI to suggest a filename
    const { available } = await ai.languageModel.capabilities();
    if (available !== "no") {
      const session = await ai.languageModel.create();
      const result = await session.prompt(`Summarize the following content in a few words: ${content}`);
      const suggestedFilename = result.replace(/\s+/g, '_') + '.pdf';
      session.destroy();
      return suggestedFilename;
    } else {
      throw new Error('AI model is not available');
    }
  }

  // Fetch the headers of the download URL
  fetchHeaders(downloadItem.url)
    .then(headers => {
      const contentDisposition = headers.get('Content-Disposition');
      if (contentDisposition) {
        // Extract the filename from the Content-Disposition header
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          const filename = match[1];
          suggest({ filename: filename, conflictAction: 'uniquify' });
        } else {
          // Fallback to URL path if Content-Disposition is present but malformed
          const url = new URL(downloadItem.url);
          const pathname = url.pathname;
          const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
          suggest({ filename: filename, conflictAction: 'uniquify' });
        }
      } else {
        // Suggest a filename based on the content of the file
        suggestFilenameFromContent(downloadItem.url)
          .then(suggestedFilename => {
            suggest({ filename: suggestedFilename, conflictAction: 'uniquify' });
          })
          .catch(error => {
            console.error('Failed to suggest filename from content:', error);
            // Fallback to URL path if content analysis fails
            const url = new URL(downloadItem.url);
            const pathname = url.pathname;
            const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
            suggest({ filename: filename, conflictAction: 'uniquify' });
          });
      }
    })
    .catch(error => {
      console.error('Failed to fetch headers:', error);
      // Fallback to URL path if header fetch fails
      const url = new URL(downloadItem.url);
      const pathname = url.pathname;
      const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
      suggest({ filename: filename, conflictAction: 'uniquify' });
    });

  return true; // Indicate that the suggestion will be made asynchronously
});
