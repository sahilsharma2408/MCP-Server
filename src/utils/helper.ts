export function getCurrentDate() {
  let dateObj = new Date();
  let day = ('0' + dateObj.getDate()).slice(-2);
  let month = ('0' + (dateObj.getUTCMonth() + 1)).slice(-2);
  let year = dateObj.getUTCFullYear();
  return day + '-' + month + '-' + year;
}
