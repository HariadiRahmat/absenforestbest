/** Tanggal hari ini format YYYY-MM-DD — timezone WIB (Asia/Jakarta) */
export function getTodayStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
  }).format(new Date());
}
