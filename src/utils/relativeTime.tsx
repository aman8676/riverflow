export default function relativeTime(date: Date) {

    if(date.toString() === "Invalid Date") return "Invalid Date";

    const now = new Date();
    const TimeDiffInMs = now.getTime() - date.getTime();

    const seconds = Math.floor(TimeDiffInMs / 1000);

    if(seconds < 10){
        return "Just now";
    }

    if(seconds <60){
        return `${seconds} seconds ago`;
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    }

     const days = Math.floor(hours / 24);
  if (days < 30) {
      return `${days} day${days !== 1 ? "s" : ""} ago`;
  }

  const months = Math.floor(days / 30.44); // Average days in a month
  if (months < 12) {
      return `${months} month${months !== 1 ? "s" : ""} ago`;
  }

  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? "s" : ""} ago`;

}