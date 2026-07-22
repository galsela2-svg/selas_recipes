import { redirect } from "next/navigation";

// "מתכונים" ו"חיפוש" אוחדו לטאב אחד — כל מי שעדיין מגיע לכתובת הישנה
// (קיצור דרך שמור, סימנייה) מופנה לשם.
export default function SearchPageRedirect() {
  redirect("/dashboard");
}
