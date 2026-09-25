import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { captureCheckoutDraft } from "./abandoned.functions";

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

/** One stable key per browser visit, so repeated typing updates one record. */
function visitKey(prefix: string) {
  if (typeof window === "undefined") return `${prefix}-ssr`;
  const storageKey = `t24_draft_${prefix}`;
  try {
    const found = window.sessionStorage.getItem(storageKey);
    if (found) return found;
    const made = `${prefix}-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    window.sessionStorage.setItem(storageKey, made);
    return made;
  } catch {
    return `${prefix}-${Date.now().toString(36)}`;
  }
}

export type CheckoutDraft = {
  tourSlug: string;
  tourTitle?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  travelDate?: string | null;
  travelTime?: string | null;
  guests?: number | null;
  amountCents?: number | null;
};

/**
 * Quietly saves an unfinished booking once the guest has typed a usable name
 * and email, so the owner can follow it up if they never reach payment.
 */
export function useCheckoutDraft(prefix: string, draft: CheckoutDraft, enabled = true) {
  const capture = useServerFn(captureCheckoutDraft);
  const [key] = useState(() => visitKey(prefix));
  const lastSent = useRef<string>("");

  const { tourSlug, tourTitle, name, email, phone, travelDate, travelTime, guests, amountCents } =
    draft;

  useEffect(() => {
    if (!enabled) return;
    if (!tourSlug || !name.trim() || !isEmail(email)) return;
    const payload = {
      draft_key: key,
      tour_slug: tourSlug,
      tour_title: tourTitle ?? null,
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || null,
      travel_date: travelDate || null,
      travel_time: travelTime || null,
      guests: guests ?? null,
      amount_cents: amountCents ?? null,
    };
    const signature = JSON.stringify(payload);
    if (signature === lastSent.current) return;
    const timer = window.setTimeout(() => {
      lastSent.current = signature;
      void capture({ data: payload }).catch(() => {});
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [
    enabled,
    key,
    capture,
    tourSlug,
    tourTitle,
    name,
    email,
    phone,
    travelDate,
    travelTime,
    guests,
    amountCents,
  ]);
}

/** Reads prefill values from a recovery link (?name=&email=…). */
export function readResumeParams() {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search);
  if (p.get("resume") !== "1") return null;
  return {
    name: p.get("name") ?? "",
    email: p.get("email") ?? "",
    phone: p.get("phone") ?? "",
    date: p.get("date") ?? "",
    time: p.get("time") ?? "",
    guests: Number(p.get("guests")) || 0,
  };
}
