import alfama from "@/assets/tour-alfama.jpg";
import sintra from "@/assets/tour-sintra.jpg";
import caboroca from "@/assets/tour-caboroca.jpg";
import belem from "@/assets/dest-belem.jpg";
import cascais from "@/assets/dest-cascais.jpg";
import van from "@/assets/fleet-van.jpg";

export type Tour = {
  slug: string;
  title: string;
  category: string;
  categorySlug: string;
  duration: string;
  priceFrom: number;
  image: string;
  tagline: string;
  description: string;
  highlights: string[];
  itinerary: { time: string; title: string; detail: string }[];
  included: string[];
  notIncluded: string[];
  featured?: boolean;
};

export const tours: Tour[] = [
  {
    slug: "alfama-heritage-tuk-tuk",
    title: "Alfama Heritage Tuk-Tuk",
    category: "Lisbon Tuk Tuk Tours",
    categorySlug: "tuk-tuk",
    duration: "4 Hours",
    priceFrom: 120,
    image: alfama,
    tagline: "Cultural Immersion",
    description:
      "A slow, silent passage through Lisbon's oldest neighborhood — Fado houses, miradouros and bougainvillea-draped balconies seen from our private electric tuk-tuk.",
    highlights: [
      "Private electric tuk-tuk",
      "Local guide born in Alfama",
      "Two miradouro stops",
      "Ginjinha tasting included",
    ],
    itinerary: [
      { time: "09:00", title: "Hotel pick-up", detail: "Concierge meets you at your lobby." },
      { time: "09:30", title: "Sé Cathedral & Castelo viewpoint", detail: "Photo stop at Portas do Sol." },
      { time: "11:00", title: "Alfama labyrinth", detail: "Walking interlude through hidden alleys." },
      { time: "12:30", title: "Ginjinha tasting", detail: "Traditional cherry liqueur at a century-old tasca." },
    ],
    included: ["Private guide", "Bottled water", "Hotel pick-up & drop-off", "All entrance donations"],
    notIncluded: ["Meals", "Gratuities", "Personal expenses"],
    featured: true,
  },
  {
    slug: "mists-of-sintra",
    title: "The Mists of Sintra",
    category: "Sintra Private Tours",
    categorySlug: "sintra",
    duration: "Full Day",
    priceFrom: 450,
    image: sintra,
    tagline: "Private SUV Collection",
    description:
      "A full-day private chauffeured journey to the romantic palaces and pine-misted hills of Sintra, ending on the cliffs of Cabo da Roca.",
    highlights: [
      "Mercedes V-Class or equivalent",
      "Skip-the-line at Pena Palace",
      "Quinta da Regaleira gardens",
      "Cabo da Roca sunset",
    ],
    itinerary: [
      { time: "09:00", title: "Lisbon pick-up", detail: "Private chauffeur, climate controlled." },
      { time: "10:30", title: "Pena Palace", detail: "Skip-the-line guided tour." },
      { time: "13:00", title: "Lunch in Sintra village", detail: "Reservation at a chef's table (optional)." },
      { time: "15:00", title: "Quinta da Regaleira", detail: "Mystical gardens and initiation wells." },
      { time: "17:30", title: "Cabo da Roca", detail: "Westernmost point of continental Europe." },
    ],
    included: ["Private vehicle & driver", "English-speaking guide", "Palace tickets", "Refreshments"],
    notIncluded: ["Lunch (~€60pp)", "Personal expenses"],
    featured: true,
  },
  {
    slug: "cabo-da-roca-sunset",
    title: "Cabo da Roca Sunset",
    category: "Sunset Tours",
    categorySlug: "sunset",
    duration: "3.5 Hours",
    priceFrom: 180,
    image: caboroca,
    tagline: "Coastal Romance",
    description:
      "Drive west along the Atlantic coast to watch the sun fall into the sea from Europe's edge — with sparkling wine in hand.",
    highlights: [
      "Private chauffeured car",
      "Sparkling wine & nibbles",
      "Guincho beach photo stop",
      "Cliff-top blankets provided",
    ],
    itinerary: [
      { time: "17:00", title: "Lisbon pick-up", detail: "Hotel concierge meet." },
      { time: "18:00", title: "Guincho beach", detail: "Atlantic coast viewpoints." },
      { time: "19:30", title: "Cabo da Roca", detail: "Sunset toast on the cliffs." },
      { time: "21:00", title: "Return to Lisbon", detail: "Door-to-door drop-off." },
    ],
    included: ["Private chauffeur", "Sparkling wine & nibbles", "Hotel pick-up"],
    notIncluded: ["Dinner", "Gratuities"],
    featured: true,
  },
  {
    slug: "belem-monuments-tuk-tuk",
    title: "Belém Monuments by Tuk-Tuk",
    category: "Belém Tours",
    categorySlug: "belem",
    duration: "3 Hours",
    priceFrom: 110,
    image: belem,
    tagline: "Age of Discoveries",
    description:
      "Open-air ride along the Tagus from central Lisbon to the iconic Jerónimos Monastery and Belém Tower — with a stop for the city's most famous pastel de nata.",
    highlights: [
      "Open-air tuk-tuk",
      "Jerónimos & Belém Tower",
      "Pastéis de Belém tasting",
      "MAAT riverside views",
    ],
    itinerary: [
      { time: "10:00", title: "Pick-up", detail: "From your Lisbon hotel." },
      { time: "10:45", title: "Jerónimos Monastery", detail: "UNESCO Manueline architecture." },
      { time: "12:00", title: "Pastéis de Belém", detail: "The original 1837 recipe." },
      { time: "13:00", title: "Belém Tower", detail: "Riverside photo stop." },
    ],
    included: ["Private tuk-tuk", "Guide", "Pastry tasting", "Bottled water"],
    notIncluded: ["Monument tickets (~€15pp)", "Lunch"],
  },
  {
    slug: "cascais-coast-private",
    title: "Cascais Coastal Day",
    category: "Cascais Tours",
    categorySlug: "cascais",
    duration: "6 Hours",
    priceFrom: 360,
    image: cascais,
    tagline: "Riviera Escape",
    description:
      "Follow the marginal coastline to the elegant former fishing village of Cascais — beaches, marinas and old-world charm.",
    highlights: [
      "Private luxury SUV",
      "Estoril casino drive-by",
      "Boca do Inferno cliffs",
      "Free time in Cascais centro",
    ],
    itinerary: [
      { time: "10:00", title: "Pick-up in Lisbon", detail: "Mercedes private vehicle." },
      { time: "11:00", title: "Estoril & Tamariz beach", detail: "Belle époque promenade." },
      { time: "12:30", title: "Boca do Inferno", detail: "Dramatic cliffs and blowhole." },
      { time: "13:30", title: "Cascais lunch & free time", detail: "Marina restaurants." },
      { time: "16:00", title: "Return", detail: "Scenic coastal drive home." },
    ],
    included: ["Private vehicle", "Driver-guide", "Refreshments"],
    notIncluded: ["Lunch", "Personal shopping"],
  },
  {
    slug: "airport-luxury-transfer",
    title: "Airport Luxury Transfer",
    category: "Airport Transfers",
    categorySlug: "airport",
    duration: "On-demand",
    priceFrom: 65,
    image: van,
    tagline: "Door-to-Door Concierge",
    description:
      "A discreet, on-time meet-and-greet from Lisbon Humberto Delgado airport to your hotel or villa anywhere in greater Lisbon.",
    highlights: [
      "Meet-and-greet at arrivals",
      "Mercedes V-Class up to 6 pax",
      "Flight tracking included",
      "Child seats on request",
    ],
    itinerary: [
      { time: "—", title: "Arrival meet", detail: "Driver waits with a personalized sign." },
      { time: "—", title: "Luggage assistance", detail: "Direct path to the vehicle." },
      { time: "—", title: "Transfer", detail: "Climate controlled, complimentary water." },
    ],
    included: ["Flight tracking", "60 min wait", "Water & wifi"],
    notIncluded: ["Tolls beyond Lisbon district"],
  },
];

export const categories = [
  { slug: "tuk-tuk", title: "Lisbon Tuk Tuk Tours" },
  { slug: "sintra", title: "Sintra Private Tours" },
  { slug: "belem", title: "Belém Tours" },
  { slug: "cascais", title: "Cascais Tours" },
  { slug: "sunset", title: "Sunset Tours" },
  { slug: "airport", title: "Airport Transfers" },
  { slug: "custom", title: "Custom Tours" },
];
