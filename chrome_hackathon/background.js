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
chrome.downloads.onDeterminingFilename.addListener(async function(downloadItem, suggest) {
  // Function to suggest a filename based on the content of the file
  async function suggestFilenameFromContent(url) {
    try {
      // Fetch the content of the file
      const response = await fetch(url);
      const content = await response.text();

      // Use Chrome's built-in AI to suggest a filename
      const { available } = await ai.languageModel.capabilities();
      if (available !== "no") {
        const session = await ai.languageModel.create({
          temperature: 1,
          topK: 1
        });
        const result = await session.prompt(`Summarize the following content in a few words: ${content}`);
        const suggestedFilename = result.replace(/\s+/g, '_') + '.pdf';
        session.destroy();
        return suggestedFilename;
      } else {
        throw new Error('AI model is not available');
      }
    } catch (error) {
      console.error('Failed to suggest filename from content:', error);
      throw error;
    }
  }

  try {
    // Suggest a filename based on the content of the file
    const suggestedFilename = await suggestFilenameFromContent(downloadItem.url);
    suggest({ filename: suggestedFilename, conflictAction: 'uniquify' });
  } catch (error) {
    // Fallback to URL path if content analysis fails
    const url = new URL(downloadItem.url);
    const pathname = url.pathname;
    const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
    suggest({ filename: filename, conflictAction: 'uniquify' });
  }

  return true; // Indicate that the suggestion will be made asynchronously
});
