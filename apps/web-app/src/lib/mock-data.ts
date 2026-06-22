import {
  Armchair,
  Download,
  UserCog,
  Ticket,
  Shield,
  Landmark,
  MessageCircle,
  Mail,
  Phone,
  CreditCard,
  Wallet,
  QrCode,
} from "lucide-react";

export type Concert = {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  price: string;
  status: string;
  genre: string;
  description: string;
};

export const heroConcert = {
  title: "Neon Nights World Tour",
  badge: "Global Tour",
  date: "Oct 15",
  time: "8:00 PM",
  venue: "Central Stadium",
  city: "Jakarta",
  price: "From $49",
  subtitle:
    "High-energy live performances, immersive lighting, and limited premium seating for the entire weekend run.",
} as const;

export const concerts: Concert[] = [
  {
    id: "sonic-pulse",
    title: "Sonic Pulse Festival",
    date: "Oct 15",
    time: "8:00 PM",
    venue: "Central Stadium",
    city: "Jakarta",
    price: "From $49",
    status: "Selling fast",
    genre: "Electronic",
    description:
      "A neon-lit festival headlined by pulse-heavy electronic acts, laser choreography, and VIP skybox seating.",
  },
  {
    id: "midnight-echo",
    title: "The Midnight Echo",
    date: "Nov 04",
    time: "9:00 PM",
    venue: "Skyline Arena",
    city: "Singapore",
    price: "From $72",
    status: "Top pick",
    genre: "Alternative",
    description:
      "A cinematic arena show with moody visuals, live brass sections, and premium acoustic staging.",
  },
  {
    id: "city-beats-live",
    title: "City Beats Live",
    date: "Dec 09",
    time: "7:30 PM",
    venue: "Riverside Hall",
    city: "Bandung",
    price: "From $35",
    status: "Almost gone",
    genre: "Indie Pop",
    description:
      "An intimate indoor set with local support acts, curated food stalls, and first-row fan zones.",
  },
  {
    id: "afterglow-night",
    title: "Afterglow Night",
    date: "Dec 24",
    time: "10:00 PM",
    venue: "Harbor District",
    city: "Bali",
    price: "From $88",
    status: "VIP available",
    genre: "Dance",
    description:
      "A waterfront after-hours event with immersive projections and a private lounge experience.",
  },
];

export const ticketTiers = [
  {
    name: "General Admission",
    price: "$49",
    note: "Standing zone with clear stage sightlines.",
    highlight: false,
  },
  {
    name: "Priority Access",
    price: "$79",
    note: "Fast-track entry and better floor positioning.",
    highlight: true,
  },
  {
    name: "VIP Lounge",
    price: "$149",
    note: "Private bar, lounge seating, and early entrance.",
    highlight: false,
  },
] as const;

export const seatLegend = [
  { label: "Available", color: "bg-surface-high" },
  { label: "Selected", color: "bg-primary" },
  { label: "Reserved", color: "bg-secondary" },
  { label: "Accessible", color: "bg-tertiary" },
] as const;

export const seatRows = [
  [
    "available",
    "available",
    "reserved",
    "available",
    "available",
    "available",
    "reserved",
    "available",
    "available",
    "available",
  ],
  [
    "available",
    "available",
    "available",
    "selected",
    "selected",
    "available",
    "available",
    "available",
    "available",
    "available",
  ],
  [
    "available",
    "reserved",
    "available",
    "selected",
    "selected",
    "available",
    "available",
    "reserved",
    "available",
    "available",
  ],
  [
    "available",
    "available",
    "available",
    "available",
    "available",
    "available",
    "accessible",
    "accessible",
    "available",
    "available",
  ],
  [
    "available",
    "available",
    "available",
    "available",
    "reserved",
    "available",
    "available",
    "available",
    "available",
    "available",
  ],
] as const;

export const checkoutSeats = ["B4", "B5"];

export const tickets = [
  {
    title: "Sonic Pulse Festival",
    status: "Active",
    zone: "VIP Lounge",
    row: "B",
    seat: "12",
    date: "Oct 15, 2026",
    venue: "Central Stadium",
  },
  {
    title: "The Midnight Echo",
    status: "Upcoming",
    zone: "Floor A",
    row: "C",
    seat: "08",
    date: "Nov 04, 2026",
    venue: "Skyline Arena",
  },
  {
    title: "Afterglow Night",
    status: "Saved",
    zone: "Harbor Deck",
    row: "A",
    seat: "02",
    date: "Dec 24, 2026",
    venue: "Harbor District",
  },
] as const;

export const supportCategories = [
  {
    title: "Ordering & Tickets",
    description:
      "Purchase tickets, transfer ownership, and manage delivery methods.",
    icon: Ticket,
  },
  {
    title: "Account & Security",
    description:
      "Reset passwords, enable two-factor authentication, and secure your profile.",
    icon: Shield,
  },
  {
    title: "Events & Venues",
    description:
      "Parking details, accessibility guidance, and venue-specific information.",
    icon: Landmark,
  },
  {
    title: "Payments",
    description:
      "Refund status, failed card attempts, and supported payment methods.",
    icon: CreditCard,
  },
] as const;

export const supportContacts = [
  {
    title: "Live chat",
    description:
      "Best for urgent order issues and entry problems during an event.",
    action: "Start chat",
    icon: MessageCircle,
  },
  {
    title: "Email support",
    description:
      "Detailed help for refunds, ticket transfers, or account changes.",
    action: "Send email",
    icon: Mail,
  },
  {
    title: "Call hotline",
    description: "Priority line for venue check-in and payment verification.",
    action: "Call now",
    icon: Phone,
  },
] as const;

export const activityTimeline = [
  {
    title: "Profile updated",
    description:
      "Added a new recovery email and refreshed password on the account.",
    time: "Today, 09:40",
    icon: UserCog,
  },
  {
    title: "Tickets downloaded",
    description:
      "Saved two QR passes to mobile wallet for the upcoming weekend show.",
    time: "Yesterday, 18:20",
    icon: Download,
  },
  {
    title: "Seat upgrade confirmed",
    description: "Moved from General Admission to VIP Lounge for Sonic Pulse.",
    time: "Oct 02",
    icon: Armchair,
  },
] as const;

export const orderSummary = {
  orderId: "order-2048",
  event: "Sonic Pulse Festival",
  venue: "Central Stadium",
  date: "Oct 15, 2026",
  seats: "VIP Lounge • B4, B5",
  subtotal: "$298.00",
  fees: "$18.00",
  total: "$316.00",
  timer: "09:12",
} as const;

export const checkoutPayments = [
  {
    label: "Credit or debit card",
    note: "Visa, Mastercard, Amex",
    icon: CreditCard,
    selected: true,
  },
  {
    label: "Digital wallet",
    note: "Apple Pay, Google Pay",
    icon: Wallet,
    selected: false,
  },
  {
    label: "QR transfer",
    note: "Scan and pay within 5 minutes",
    icon: QrCode,
    selected: false,
  },
] as const;

export const orderConfirmed = {
  title: "Your order is confirmed",
  code: "TBX-2048-9911",
  date: "Oct 15, 2026 • 8:00 PM",
  venue: "Central Stadium",
  seats: "VIP Lounge • B4, B5",
} as const;

export const profileStats = [
  { label: "Tickets owned", value: "12" },
  { label: "Events attended", value: "8" },
  { label: "Wallet balance", value: "$24" },
] as const;

export const ticketTabs = ["All", "Upcoming", "Past", "Saved"] as const;
