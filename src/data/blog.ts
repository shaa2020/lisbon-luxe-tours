import sintraImg from "@/assets/tour-sintra.jpg";
import caboImg from "@/assets/tour-caboroca.jpg";
import heroImg from "@/assets/hero-lisbon.jpg";

export type BlogPost = {
  slug: string;
  date: string;
  comments: number;
  shares: number;
  title: string;
  excerpt: string;
  image: string;
  category: string;
  readTime: string;
  content: string[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "lisbon-first-time-private-tour-guide",
    date: "11/22/2024",
    comments: 2,
    shares: 5,
    title: "Your first private day in Lisbon, planned the right way",
    excerpt:
      "A calm, practical guide to structuring your first day in Lisbon so you see the viewpoints, old quarters and riverside monuments without rushing.",
    image: heroImg,
    category: "Lisbon Guide",
    readTime: "5 min read",
    content: [
      "Lisbon rewards a slower rhythm. The best first day is not about seeing everything, but about moving through the city in the right sequence: start high, descend through the old quarters, pause for lunch, and keep the river for late afternoon when the light softens.",
      "Begin in Graça or Senhora do Monte for the broadest city views before the streets fill. From there, drift into Alfama while the lanes are still quiet enough to hear church bells, tram brakes and the distant sound of Fado rehearsal behind tiled walls.",
      "Avoid overloading the morning with monuments. Pair one cultural stop with time to simply walk. A private guide is most valuable here — not only for transport and pacing, but for small detours into courtyards, cafés and viewpoints visitors usually miss.",
      "After lunch, keep the second half of the day flatter and more open: Baixa, Praça do Comércio and the Belém riverside work beautifully. You finish with space, light and room to breathe instead of ending the day climbing hills when your energy is lowest.",
    ],
  },
  {
    slug: "a-weekend-in-sintra-hidden-palaces-and-pine-forests",
    date: "11/15/2024",
    comments: 2,
    shares: 3,
    title: "A weekend in Sintra: hidden palaces & pine forests",
    excerpt:
      "A practical guide to spending two slow days in Portugal's most romantic hilltop town — from breakfast to nightfall.",
    image: caboImg,
    category: "Sintra Guide",
    readTime: "6 min read",
    content: [
      "Sintra is at its best when you treat it like a landscape, not a checklist. The palace icons matter, but the real charm lies in the fog between them: stone walls damp with moss, forest roads that twist out of sight, and small cafés where the morning hangs on a little longer.",
      "Use the first day for one major palace and the village itself. Pena works best early, before queues build and before the terraces feel crowded. Save time afterward for pastries, slow walking and a second site only if your pace still feels easy.",
      "The second day is where Sintra becomes memorable. Choose one quieter place — Monserrate, a coastal drive, or forest viewpoints — and give it room. Rushing across multiple estates often turns a magical place into a transport puzzle.",
      "If you can, end at Cabo da Roca or the Cascais coast. The contrast between woodland and Atlantic cliffs is exactly what makes Sintra feel so cinematic in such a small radius.",
    ],
  },
  {
    slug: "best-time-for-cabo-da-roca-sunset",
    date: "10/29/2024",
    comments: 1,
    shares: 4,
    title: "When to time a Cabo da Roca sunset without the crowds",
    excerpt:
      "How to plan an Atlantic sunset outing so you catch the best light, the right wind conditions and a smoother return to Lisbon.",
    image: sintraImg,
    category: "Coastal Advice",
    readTime: "4 min read",
    content: [
      "Cabo da Roca is dramatic at almost any hour, but sunset only feels effortless when timing, wind and transport are planned together. Arrive too late and you compete for space. Arrive too early and the wait can feel longer than the moment itself.",
      "The ideal approach is to build two smaller stops into the drive — Guincho, a viewpoint, or Cascais — and reach the cliffs roughly 35 to 45 minutes before the sun drops. That leaves enough time to settle in, take photographs and still enjoy the changing sky after the sun meets the horizon.",
      "Bring an extra layer even in warmer months. The Atlantic wind changes the experience quickly, especially once the sun lowers. A sunset that looks golden from Lisbon can feel brisk and exposed on the cliffs.",
      "If you want the outing to feel polished rather than improvised, pre-arranged private transport makes the biggest difference. You enjoy the coast without worrying about parking, dark roads or getting back to the city after the light is gone.",
    ],
  },
];