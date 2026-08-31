import type { DiscoveryEvent } from "../domain/discoveryEvents";

function isoFromNow(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const discoveryEventsMock: DiscoveryEvent[] = [
  {
    id: "event-carcassonne-live",
    title: "Petit-déjeuner Reco · Carcassonne",
    summary: "Rencontres ciblées, recommandations et mises en relation entre membres Neptune.",
    startsAt: isoFromNow(-45 * 60 * 1000),
    endsAt: isoFromNow(75 * 60 * 1000),
    latitude: 43.213,
    longitude: 2.351,
    city: "Carcassonne",
    address: "Carcassonne, Aude",
    clubName: "Neptune Carcassonne",
    organizer: "Neptune Business",
    webUrl: "https://neptunebusiness.com",
    source: "neptune-business"
  },
  {
    id: "event-toulouse-upcoming",
    title: "Afterwork Neptune · Toulouse",
    summary: "Un format convivial pour rencontrer les membres et provoquer des opportunités business.",
    startsAt: isoFromNow(5 * HOUR),
    endsAt: isoFromNow(8 * HOUR),
    latitude: 43.6045,
    longitude: 1.444,
    city: "Toulouse",
    address: "Toulouse, Haute-Garonne",
    clubName: "Neptune Toulouse",
    organizer: "Neptune Business",
    webUrl: "https://neptunebusiness.com",
    source: "neptune-business"
  },
  {
    id: "event-montpellier-recent",
    title: "Atelier business · Montpellier",
    summary: "Atelier terminé récemment : retrouvez les membres encore présents dans les environs.",
    startsAt: isoFromNow(-150 * 60 * 1000),
    endsAt: isoFromNow(-30 * 60 * 1000),
    latitude: 43.611,
    longitude: 3.877,
    city: "Montpellier",
    address: "Montpellier, Hérault",
    clubName: "Neptune Montpellier",
    organizer: "Neptune Business",
    webUrl: "https://neptunebusiness.com",
    source: "neptune-business"
  },
  {
    id: "event-narbonne-upcoming",
    title: "Rencontre membres · Narbonne",
    summary: "Découverte des entreprises du club et mises en relation utiles autour d'un format court.",
    startsAt: isoFromNow(2 * DAY),
    endsAt: isoFromNow(2 * DAY + 2 * HOUR),
    latitude: 43.184,
    longitude: 3.003,
    city: "Narbonne",
    address: "Narbonne, Aude",
    clubName: "Neptune Narbonne",
    organizer: "Neptune Business",
    webUrl: "https://neptunebusiness.com",
    publicationState: "voting",
    source: "neptune-business"
  }
];
