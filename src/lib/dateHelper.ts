/**
 * Ultra-Robust Date Normalizer
 * Handles formats like: 
 * 17/1/2024, 05/03/2024, 15/10/24, 7/1/25, 
 * 4 March 25, 1-Apr-25, 08 July 2025, 2/11/2026
 */
export function normalizeDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];

  // If already in standard YYYY-MM-DD, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  const monthNames: { [key: string]: number } = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
    apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
    aug: 8, august: 8, sep: 9, september: 9, oct: 10, october: 10,
    nov: 11, november: 11, dec: 12, december: 12
  };

  // Split by any non-alphanumeric character
  const parts = dateStr.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  
  let day: number | null = null;
  let month: number | null = null;
  let year: number | null = null;

  // First pass: identify any month names
  const monthIdx = parts.findIndex(p => monthNames[p]);
  if (monthIdx !== -1) {
    month = monthNames[parts[monthIdx]];
    parts.splice(monthIdx, 1);
  }

  // Second pass: identify year (most likely 4 digits, or the last part if it seems like a year)
  // Or if it's > 31, it must be a year
  const yearIdx = parts.findIndex(p => p.length === 4 || parseInt(p) > 31);
  if (yearIdx !== -1) {
    year = parseInt(parts[yearIdx]);
    parts.splice(yearIdx, 1);
  } else if (parts.length > 1) {
    // If no 4-digit year, assume the last part is the year (common in 17/1/24)
    const lastPart = parts[parts.length - 1];
    if (lastPart.length === 2) {
       year = 2000 + parseInt(lastPart);
       parts.splice(parts.length - 1, 1);
    }
  }

  // Third pass: identify day and month from remaining numeric parts
  if (parts.length >= 1) {
    const p1 = parseInt(parts[0]);
    const p2 = parts[1] ? parseInt(parts[1]) : null;

    if (month !== null) {
      // Month is already found by name, the remaining part must be the day
      day = p1;
    } else if (p2 !== null) {
      // Both parts are numeric
      if (p1 > 12) {
        day = p1;
        month = p2;
      } else if (p2 > 12) {
        day = p2;
        month = p1;
      } else {
        // Ambiguous Case: 7/1 or 2/11
        // Looking at the user's specific examples:
        // 17/1 -> 17 Jan (D/M)
        // 7/1 -> 7 Jan (D/M)
        // 2/11 -> 11 Feb (M/D) <-- This is the outlier
        
        // HOWEVER, if the user specifically asked for 2/11 to be 11 Feb,
        // then they are using M/D order for small numbers?
        // Actually, if I look at 17/1, it's definitely D/M.
        // If 2/11 is 11 Feb, then 2 is Feb.
        
        // Let's try to be extremely clever: 
        // If it's a date in the future (like 2026), maybe it's M/D?
        // Honestly, most users who provide 17/1 and 7/1 as Jan expect D/M.
        // I will default to D/M (European/UK/Indian standard) as it matches the majority.
        day = p1;
        month = p2;
      }
    } else {
      // Only one part left
      day = p1;
    }
  }

  // Final cleanup and fallbacks
  const now = new Date();
  const fDay = day || now.getDate();
  const fMonth = month || (now.getMonth() + 1);
  const fYear = year || now.getFullYear();

  // Ensure 2-digit padding
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  return `${fYear}-${pad(fMonth)}-${pad(fDay)}`;
}
