// Mock/seed data for the LMS UI. Frontend-only; nothing persists to a backend.
export type Category = { id: string; name: string; slug: string; courses: number; color: string; image?: string };
export type Course = {
  id: string;
  title: string;
  slug: string;
  category: string;
  teacher: string;
  price: number;
  students: number;
  rating: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  hours: number;
  lessons: number;
  status: "Published" | "Draft" | "Archived";
  cover: string;
  description: string;
  updatedAt: string;
};
export type User = {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Teacher" | "Student";
  status: "Active" | "Suspended" | "Pending";
  joined: string;
  avatar?: string;
};
export type Subscription = {
  id: string;
  user: string;
  plan: "Free" | "Pro" | "Team" | "Enterprise";
  status: "Active" | "Canceled" | "Trialing" | "Past due";
  renewsAt: string;
  amount: number;
};
export type Payment = {
  id: string;
  user: string;
  method: "Card" | "PayPal" | "Bank";
  amount: number;
  status: "Paid" | "Refunded" | "Failed" | "Pending";
  date: string;
  invoice: string;
};

const names = [
  "Amelia Carter", "Noah Bennett", "Olivia Reyes", "Liam Fischer", "Sofia Patel",
  "Ethan Nakamura", "Isabella Rossi", "Mateo Alvarez", "Ava Thompson", "Lucas Kim",
  "Mia Johansson", "Elijah Okafor", "Charlotte Dubois", "James Ivanov", "Harper Chen",
  "Benjamin Cohen", "Evelyn Silva", "Henry Larsen", "Aria Moreno", "Alexander Wu",
];
const emails = names.map((n) => n.toLowerCase().replace(/\s+/g, ".") + "@example.com");

export const categories: Category[] = [
  { id: "c1", name: "Web Development", slug: "web", courses: 42, color: "#3b82f6" },
  { id: "c2", name: "Data Science", slug: "data", courses: 28, color: "#8b5cf6" },
  { id: "c3", name: "Design", slug: "design", courses: 34, color: "#ec4899" },
  { id: "c4", name: "Business", slug: "business", courses: 19, color: "#10b981" },
  { id: "c5", name: "Marketing", slug: "marketing", courses: 22, color: "#f59e0b" },
  { id: "c6", name: "Photography", slug: "photo", courses: 12, color: "#06b6d4" },
];

const covers = [
  "linear-gradient(135deg,#3b82f6,#8b5cf6)",
  "linear-gradient(135deg,#0ea5e9,#22d3ee)",
  "linear-gradient(135deg,#6366f1,#ec4899)",
  "linear-gradient(135deg,#10b981,#3b82f6)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#8b5cf6,#06b6d4)",
];

const courseTitles = [
  "Modern React Patterns", "TypeScript from Zero to Hero", "Design Systems Mastery",
  "Data Analytics with Python", "Product Management Essentials", "SEO & Content Growth",
  "Figma for Product Designers", "Machine Learning Foundations", "Full-Stack Next.js",
  "UX Research in Practice", "Cloud Architecture on AWS", "Photography Composition",
  "Advanced CSS & Tailwind", "Leadership for Engineers", "Growth Marketing Playbook",
  "SQL for Analysts", "Docker & Kubernetes", "iOS Development with Swift",
];

export const courses: Course[] = courseTitles.map((title, i) => ({
  id: `co${i + 1}`,
  title,
  slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  category: categories[i % categories.length].name,
  teacher: names[i % names.length],
  price: [0, 29, 49, 79, 99, 129][i % 6],
  students: 200 + ((i * 137) % 4800),
  rating: 4 + ((i * 13) % 10) / 10,
  level: (["Beginner", "Intermediate", "Advanced"] as const)[i % 3],
  hours: 4 + (i % 20),
  lessons: 12 + (i % 40),
  status: (["Published", "Published", "Draft", "Published", "Archived"] as const)[i % 5],
  cover: covers[i % covers.length],
  description:
    "A comprehensive, hands-on course designed to take you from fundamentals to real-world mastery through curated lessons, projects, and expert guidance.",
  updatedAt: new Date(Date.now() - i * 86400000 * 3).toISOString().slice(0, 10),
}));

export const users: User[] = names.map((name, i) => ({
  id: `u${i + 1}`,
  name,
  email: emails[i],
  role: (["Student", "Student", "Student", "Teacher", "Admin"] as const)[i % 5],
  status: (["Active", "Active", "Pending", "Active", "Suspended"] as const)[i % 5],
  joined: new Date(Date.now() - i * 86400000 * 7).toISOString().slice(0, 10),
}));

export const students = users.filter((u) => u.role === "Student");
export const teachers = users.filter((u) => u.role === "Teacher");

export const subscriptions: Subscription[] = names.slice(0, 14).map((name, i) => ({
  id: `s${i + 1}`,
  user: name,
  plan: (["Free", "Pro", "Team", "Enterprise"] as const)[i % 4],
  status: (["Active", "Trialing", "Active", "Past due", "Canceled"] as const)[i % 5],
  renewsAt: new Date(Date.now() + i * 86400000 * 4).toISOString().slice(0, 10),
  amount: [0, 19, 49, 199][i % 4],
}));

export const payments: Payment[] = names.slice(0, 16).map((name, i) => ({
  id: `p${i + 1}`,
  user: name,
  method: (["Card", "PayPal", "Bank"] as const)[i % 3],
  amount: [19, 29, 49, 79, 99, 199][i % 6],
  status: (["Paid", "Paid", "Paid", "Refunded", "Failed", "Pending"] as const)[i % 6],
  date: new Date(Date.now() - i * 86400000 * 2).toISOString().slice(0, 10),
  invoice: `INV-${2024000 + i}`,
}));

export const revenueSeries = Array.from({ length: 12 }, (_, i) => ({
  month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i],
  revenue: 12000 + Math.round(Math.sin(i / 2) * 4000 + i * 900),
  signups: 200 + Math.round(Math.cos(i / 3) * 60 + i * 22),
}));
