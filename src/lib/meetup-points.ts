export type MeetupPoint = {
  id: string;
  name: string;
  address: string;
  map_url: string | null;
  latitude: number | null;
  longitude: number | null;
  instructions: string | null;
  active: boolean;
  sort_order: number;
};

export type PickupType = "meetup" | "hotel";

export type PickupSelection =
  | {
      type: "meetup";
      meetupPointId: string;
      meetupName: string;
      meetupAddress: string;
      meetupInstructions: string | null;
    }
  | {
      type: "hotel";
      placeName: string;
      address: string;
      latitude: number | null;
      longitude: number | null;
      placeId: string | null;
    };

/** Short human line for confirmations, emails and admin lists. */
export function pickupSummary(selection: PickupSelection | null): string {
  if (!selection) return "Not selected";
  return selection.type === "meetup"
    ? `Meetup point — ${selection.meetupName}`
    : `Hotel pickup — ${selection.placeName}`;
}
