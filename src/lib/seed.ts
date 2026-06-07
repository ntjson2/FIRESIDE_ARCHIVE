import { 
  firesideFamilyRepository, 
  firesideRepository, 
  snippetRepository,
  deepeningRepository,
  tagRepository,
  referenceRepository
} from "@/repositories";
import { 
  FiresideFamilyFactory, 
  FiresideFactory, 
  SnippetFactory,
  DeepeningFactory,
  TagFactory
} from "@/factories";
import { Timestamp } from "firebase/firestore";

export const seedData = async () => {
  console.log("🌱 Starting seed...");

  try {
    // Initialize factories
    const familyFactory = new FiresideFamilyFactory();
    const firesideFactory = new FiresideFactory();
    const snippetFactory = new SnippetFactory();
    const deepeningFactory = new DeepeningFactory();
    const tagFactory = new TagFactory();

    // Helper function to get or create tag
    const getOrCreateTag = async (tagName: string): Promise<string> => {
      let tag = await tagRepository.findByName(tagName);
      if (!tag) {
        const tagData = tagFactory.create({ name: tagName, count: 0 });
        const tagId = await tagRepository.save(tagData);
        console.log(`  ✅ Created tag: ${tagName}`);
        return tagId;
      }
      return tag.id;
    };

    // 1. Create Fireside Families
    console.log("Creating Fireside Families...");
    const family1Data = familyFactory.create({
      uid: "family-general",
      name: "General Firesides",
      description: "A collection of general introductory firesides covering fundamental topics."
    });
    const family1Id = await firesideFamilyRepository.save(family1Data);
    console.log("✅ Created Family:", family1Data.name);

    const family2Data = familyFactory.create({
      uid: "family-deepening",
      name: "Deepening Series",
      description: "In-depth study of Bahá'í teachings and principles."
    });
    const family2Id = await firesideFamilyRepository.save(family2Data);
    console.log("✅ Created Family:", family2Data.name);

    // 2. Create Firesides
    console.log("\nCreating Firesides...");
    const fireside1Data = firesideFactory.create({
      firesideFamilyId: family1Id,
      name: "Why Life?",
      description: "The purpose of life and the study of the spiritual evolution of mankind",
      date: Timestamp.fromDate(new Date("2024-01-15"))
    });
    const fireside1Id = await firesideRepository.save(fireside1Data);
    console.log("✅ Created Fireside:", fireside1Data.name);

    const fireside2Data = firesideFactory.create({
      firesideFamilyId: family1Id,
      name: "The Nature of the Soul",
      description: "Understanding the immortal essence within each human being",
      date: Timestamp.fromDate(new Date("2024-02-20"))
    });
    const fireside2Id = await firesideRepository.save(fireside2Data);
    console.log("✅ Created Fireside:", fireside2Data.name);

    // 3. Create Tags first
    console.log("\nCreating Tags...");
    const tagNames = ["Purpose", "Creation", "Evolution", "Spiritual Growth", "Soul", "Afterlife", "Tests", "Suffering", "Historical Context", "Comparative Religion", "Immortality"];
    const tagMap: Record<string, string> = {};
    
    for (const tagName of tagNames) {
      const tagId = await getOrCreateTag(tagName);
      tagMap[tagName] = tagId;
    }

    // 4. Create Snippets for "Why Life?"
    console.log("\nCreating Snippets...");
    const snippet1Data = snippetFactory.create({
      firesideId: fireside1Id,
      name: "The Purpose of Creation",
      text: `# The Purpose of Creation

The purpose of God in creating man hath been, and will ever be, to enable him to know his Creator and to attain His Presence.

This fundamental truth reveals that humanity's existence is not accidental, but purposeful and meaningful.`,
      naturalOrder: 1.0,
      tags: [
        { tagId: tagMap["Purpose"], weight: 100, distance: 1 },
        { tagId: tagMap["Creation"], weight: 90, distance: 1 }
      ],
      visibility: "public" as const
    });
    const snippet1Id = await snippetRepository.save(snippet1Data);
    console.log("✅ Created Snippet:", snippet1Data.name);
    await tagRepository.incrementCount(tagMap["Purpose"]);
    await tagRepository.incrementCount(tagMap["Creation"]);

    const snippet2Data = snippetFactory.create({
      firesideId: fireside1Id,
      name: "Spiritual Evolution",
      text: `# Spiritual Evolution

All beings, whether great or small, were created perfect and complete from the first, but their perfections appear in them by degrees.

The journey of life is one of manifesting latent spiritual capacities and virtues.`,
      naturalOrder: 2.0,
      tags: [
        { tagId: tagMap["Evolution"], weight: 90, distance: 2 },
        { tagId: tagMap["Spiritual Growth"], weight: 85, distance: 1 }
      ],
      visibility: "public" as const
    });
    const snippet2Id = await snippetRepository.save(snippet2Data);
    console.log("✅ Created Snippet:", snippet2Data.name);
    await tagRepository.incrementCount(tagMap["Evolution"]);
    await tagRepository.incrementCount(tagMap["Spiritual Growth"]);

    const snippet3Data = snippetFactory.create({
      firesideId: fireside1Id,
      name: "The Soul's Journey",
      text: `# The Soul's Journey

Know thou of a truth that the soul, after its separation from the body, will continue to progress until it attaineth the presence of God.

Death is not an end but a transition to continued spiritual development.`,
      naturalOrder: 3.0,
      tags: [
        { tagId: tagMap["Soul"], weight: 95, distance: 1 },
        { tagId: tagMap["Afterlife"], weight: 80, distance: 2 }
      ],
      visibility: "public" as const
    });
    const snippet3Id = await snippetRepository.save(snippet3Data);
    console.log("✅ Created Snippet:", snippet3Data.name);
    await tagRepository.incrementCount(tagMap["Soul"]);
    await tagRepository.incrementCount(tagMap["Afterlife"]);

    const snippet4Data = snippetFactory.create({
      firesideId: fireside1Id,
      name: "Testing and Growth",
      text: `# Testing and Growth

The mind and spirit of man advance when he is tried by suffering. The more the ground is ploughed the better the seed will grow, the better the harvest will be.

Difficulties are opportunities for spiritual refinement and development.`,
      naturalOrder: 4.0,
      tags: [
        { tagId: tagMap["Tests"], weight: 85, distance: 1 },
        { tagId: tagMap["Suffering"], weight: 75, distance: 2 }
      ],
      visibility: "public" as const
    });
    const snippet4Id = await snippetRepository.save(snippet4Data);
    console.log("✅ Created Snippet:", snippet4Data.name);
    await tagRepository.incrementCount(tagMap["Tests"]);
    await tagRepository.incrementCount(tagMap["Suffering"]);

    // 5. Create Deepening
    console.log("\nCreating Deepening...");
    const deepeningData = deepeningFactory.create({
      snippetId: snippet1Id,
      name: "Historical Context of Creation Teachings",
      text: `# Historical Context

This teaching on the purpose of creation reflects a consistent theme found across major world religions:

## Comparative Perspectives
- **Christianity**: "The chief end of man is to glorify God" (Westminster Catechism)
- **Islam**: "I have not created jinn and mankind except to worship Me" (Quran 51:56)
- **Hinduism**: The soul's journey toward union with the divine (moksha)

## Bahá'í Unique Contribution
The Bahá'í teaching emphasizes that knowing God happens through:
1. Recognition of His Manifestations
2. Service to humanity
3. Development of spiritual virtues

This moves beyond mere worship to active participation in civilization building.`,
      tags: [
        { tagId: tagMap["Historical Context"], weight: 70, distance: 3 },
        { tagId: tagMap["Comparative Religion"], weight: 65, distance: 4 }
      ]
    });
    await deepeningRepository.save(deepeningData);
    console.log("✅ Created Deepening:", deepeningData.name);
    await tagRepository.incrementCount(tagMap["Historical Context"]);
    await tagRepository.incrementCount(tagMap["Comparative Religion"]);

    // 6. Create Snippet for "The Nature of the Soul"
    const snippet5Data = snippetFactory.create({
      firesideId: fireside2Id,
      name: "Immortality of the Soul",
      text: `# The Immortal Soul

The soul is not a combination of elements, it is not composed of many atoms, it is of one indivisible substance and therefore eternal.

The human soul transcends physical reality and exists beyond material constraints.`,
      naturalOrder: 1.0,
      tags: [
        { tagId: tagMap["Soul"], weight: 100, distance: 1 },
        { tagId: tagMap["Immortality"], weight: 95, distance: 1 }
      ],
      visibility: "public" as const
    });
    await snippetRepository.save(snippet5Data);
    console.log("✅ Created Snippet:", snippet5Data.name);
    await tagRepository.incrementCount(tagMap["Soul"]);
    await tagRepository.incrementCount(tagMap["Immortality"]);

    // 6. Create References
    console.log("\nCreating References...");

    // Academic Book Reference
    const ref1 = await referenceRepository.save({
      title: "The Purpose of Life: Perspectives from the Bahá'í Writings",
      sourceType: "book" as const,
      citationFormat: "apa-7" as const,
      formattedAPA: "Smith, J. M., & Johnson, K. L. (2021). The purpose of life: Perspectives from the Bahá'í writings. Oxford University Press.",
      authors: [
        { lastName: "Smith", initials: "J.M." },
        { lastName: "Johnson", initials: "K.L." }
      ],
      year: 2021,
      publisher: "Oxford University Press",
      pages: "1-284",
      validationStatus: "valid" as const,
      validatedAt: Timestamp.now(),
      createdBy: "admin",
      linkedItems: [
        { itemId: snippet1Id, itemType: "snippet" as const }
      ]
    });
    console.log("✅ Created Reference: Academic Book");

    // Journal Article Reference
    const ref2 = await referenceRepository.save({
      title: "Spiritual Development and Personal Growth: A Comparative Study",
      sourceType: "journal" as const,
      citationFormat: "apa-7" as const,
      formattedAPA: "Williams, R., Chen, M., & Patel, S. (2022). Spiritual development and personal growth: A comparative study. Journal of Religious Studies, 45(3), 267-289.",
      authors: [
        { lastName: "Williams", initials: "R." },
        { lastName: "Chen", initials: "M." },
        { lastName: "Patel", initials: "S." }
      ],
      year: 2022,
      journal: "Journal of Religious Studies",
      volume: "45",
      issue: "3",
      pages: "267-289",
      doi: "10.1234/jrs.2022.045.003",
      validationStatus: "valid" as const,
      validatedAt: Timestamp.now(),
      createdBy: "admin",
      linkedItems: [
        { itemId: snippet2Id, itemType: "snippet" as const }
      ]
    });
    console.log("✅ Created Reference: Journal Article");

    // Website Reference
    const ref3 = await referenceRepository.save({
      title: "Understanding the Soul in World Religions",
      sourceType: "website" as const,
      citationFormat: "apa-7" as const,
      formattedAPA: "Religious Studies Center. (2024). Understanding the soul in world religions. Retrieved June 7, 2026, from https://example.org/soul-religions",
      url: "https://example.org/soul-religions",
      accessDate: Timestamp.now(),
      validationStatus: "valid" as const,
      validatedAt: Timestamp.now(),
      createdBy: "admin",
      linkedItems: [
        { itemId: snippet3Id, itemType: "snippet" as const }
      ]
    });
    console.log("✅ Created Reference: Website");

    // Bahá'í Text Reference
    const ref4 = await referenceRepository.save({
      title: "Kitáb-i-Íqán (The Book of Certitude)",
      sourceType: "bahai-text" as const,
      citationFormat: "bahai" as const,
      formattedAPA: "Bahá'u'lláh. (1992). The Kitáb-i-Íqán (The Book of Certitude) (J. R. Cole, Trans.). Bahá'í Publishing Trust.",
      speaker: "Bahá'u'lláh",
      pages: "chapters 1-3",
      validationStatus: "valid" as const,
      validatedAt: Timestamp.now(),
      createdBy: "admin",
      linkedItems: [
        { itemId: deepeningData.snippetId, itemType: "snippet" as const }
      ]
    });
    console.log("✅ Created Reference: Bahá'í Text");

    // Spiritual Concept Reference
    const ref5 = await referenceRepository.save({
      title: "The Concept of Suffering as a Path to Spiritual Growth",
      sourceType: "spiritual-concept" as const,
      citationFormat: "descriptive" as const,
      formattedAPA: "The concept of suffering as a path to spiritual growth is found throughout Bahá'í teachings and has been explored in various talks and writings.",
      conceptualMeta: {
        relatedConcepts: ["testing", "spirituality", "personal development", "divine wisdom"],
        teachingContext: "Central to understanding Bahá'í philosophy",
        applicableTo: ["personal challenges", "community struggles", "spiritual education"]
      },
      validationStatus: "valid" as const,
      validatedAt: Timestamp.now(),
      createdBy: "admin",
      linkedItems: [
        { itemId: snippet4Id, itemType: "snippet" as const }
      ]
    });
    console.log("✅ Created Reference: Spiritual Concept");

    // Oral Tradition Reference
    const ref6 = await referenceRepository.save({
      title: "Community Wisdom on Soul Development",
      sourceType: "oral-tradition" as const,
      citationFormat: "descriptive" as const,
      formattedAPA: "Teaching on soul development and immortality documented by the Archive team from community gatherings and study circles, 2024.",
      speaker: "Community Members",
      transcribedBy: "Archive Team",
      date: Timestamp.fromDate(new Date("2024-03-15")),
      validationStatus: "valid" as const,
      validatedAt: Timestamp.now(),
      createdBy: "admin"
    });
    console.log("✅ Created Reference: Oral Tradition");

    console.log("\n🎉 Seed complete! Created:");
    console.log("   - 2 Fireside Families");
    console.log("   - 2 Firesides");
    console.log("   - 5 Snippets");
    console.log("   - 1 Deepening");
    console.log("   - 6 References (Book, Journal, Website, Bahá'í Text, Spiritual Concept, Oral Tradition)");
    
    return {
      success: true,
      message: "Database seeded successfully"
    };
  } catch (error) {
    console.error("❌ Seed error:", error);
    throw error;
  }
};
