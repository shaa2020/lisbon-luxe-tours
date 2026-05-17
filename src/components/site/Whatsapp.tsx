export function WhatsappFab() {
  return (
    <a
      href="https://wa.me/351912345678"
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-50 size-14 bg-ink text-paper rounded-full flex items-center justify-center shadow-2xl hover:bg-gold hover:text-ink transition-colors"
    >
      <span className="eyebrow !tracking-tighter">Chat</span>
    </a>
  );
}
