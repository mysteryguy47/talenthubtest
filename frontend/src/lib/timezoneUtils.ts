/**
 * Timezone utility functions for converting UTC to IST (India Standard Time, UTC+5:30)
 * 
 * Note: Backend now stores timestamps in IST, but JavaScript Date objects interpret
 * ISO strings without timezone info as local time. We use toLocaleString with 
 * timeZone: "Asia/Kolkata" to ensure correct display.
 */

/**
 * Convert datetime string (IST or UTC) to IST and format for display
 * Backend stores timestamps in IST, so we display them directly in IST timezone
 */
export function formatDateToIST(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  
  try {
    // Backend sends ISO strings with IST timezone (e.g., "2024-01-15T14:30:00+05:30")
    // JavaScript Date() parses these correctly
    const date = new Date(dateString);
    
    // Validate date
    if (isNaN(date.getTime())) {
      console.error("Invalid date string:", dateString);
      return "Invalid date";
    }
    
    // If the date string includes timezone info, Date() will parse it correctly
    // If it doesn't, we need to treat it as IST (since backend stores IST)
    // Use toLocaleString with timeZone to ensure correct display
    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  } catch (error) {
    console.error("Error formatting date to IST:", error);
    // Fallback: try to parse and display
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return "Invalid date";
    }
  }
}

/**
 * Convert UTC datetime string to IST date only (no time)
 */
export function formatDateOnlyToIST(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
    
    return date.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch (error) {
    console.error("Error formatting date to IST:", error);
    return dateString;
  }
}

/**
 * Get current time in IST as ISO string
 */
export function getCurrentISTTime(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // 5:30 hours in milliseconds
  const istTime = new Date(now.getTime() + istOffset);
  return istTime.toISOString();
}
