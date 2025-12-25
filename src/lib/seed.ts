import { firesideFamilyService, firesideService, snippetService } from "@/services/firestoreService";
import { Timestamp } from "firebase/firestore";

export const seedData = async () => {
  console.log("Starting seed...");

  // 1. Create a Fireside Family
  const firesideFamily = await firesideFamilyService.create({
    uid: "seed-uid-1",
    name: "General Firesides",
    description: "A collection of general introductory firesides."
  });
  console.log("Created Fireside Family:", firesideFamily.id);

  // 2. Create a Fireside
  const fireside = await firesideService.create({
    firesideFamilyId: firesideFamily.id,
    name: "Why Life?",
    description: "The purpose of life and the study of the spiritual evolution of mankind",
    date: Timestamp.now(),
  });
  console.log("Created Fireside:", fireside.id);

  // 3. Create Snippets for that Fireside
  const snippets = [
    {
      firesideId: fireside.id,
      name: "The Purpose of Creation",
      text: "The purpose of God in creating man hath been, and will ever be, to enable him to know his Creator and to attain His Presence.",
      naturalOrder: 1.0,
      tags: [{ tagId: "t1", name: "Purpose", weight: 100, distance: 1 }],
      visibility: "public"
    },
    {
      firesideId: fireside.id,
      name: "Spiritual Evolution",
      text: "All beings, whether great or small, were created perfect and complete from the first, but their perfections appear in them by degrees.",
      naturalOrder: 2.0,
      tags: [{ tagId: "t2", name: "Evolution", weight: 90, distance: 2 }],
      visibility: "public"
    },
    {
      firesideId: fireside.id,
      name: "The Soul's Journey",
      text: "Know thou of a truth that the soul, after its separation from the body, will continue to progress until it attaineth the presence of God.",
      naturalOrder: 3.0,
      tags: [{ tagId: "t3", name: "Soul", weight: 95, distance: 1 }],
      visibility: "public"
    }
  ];

  for (const s of snippets) {
    await snippetService.create(s);
    console.log("Created Snippet:", s.name);
  }

  console.log("Seed complete!");
};
