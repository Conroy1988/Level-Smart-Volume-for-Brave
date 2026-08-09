export function userFacingError(error) {
  const message = String(error?.message || error || "Unknown audio error");

  if (/active stream|already (?:being )?captur|already active/i.test(message)) {
    return "Level is already active on this tab. The controls have been refreshed.";
  }
  if (/not been invoked|activeTab/i.test(message)) {
    return "Brave needs a fresh click on Level before this tab can be captured. Close the popup, open it again, and retry.";
  }
  if (
    /protected (?:browser )?page|(?:brave|chrome|edge|about):\/\/|extensions? cannot (?:capture|access)|not allowed to (?:capture|access).*(?:page|url)/i.test(
      message
    )
  ) {
    return "This is a protected browser page and Brave does not allow extensions to process its audio.";
  }
  if (/stream|media|capture/i.test(message)) {
    return "Brave could not open this tab's audio stream. Reload the tab and try Level again.";
  }
  return message;
}
