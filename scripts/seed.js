import "dotenv/config";
import { connectDB } from "../src/config/db.js";

const img = (text) =>
  `https://placehold.co/800x600/f5e6e8/7a3b4a?text=${encodeURIComponent(text)}`;

const samples = [
  ["Women's Haircut", "Haircut & Styling", 35, 45, "A precision cut with wash, blow-dry and styling tailored to your face shape."],
  ["Men's Haircut", "Haircut & Styling", 20, 30, "Classic or modern cut finished with a clean neckline and styling."],
  ["Full Hair Coloring", "Hair Coloring", 90, 120, "Complete color service with premium products and a gloss finish."],
  ["Balayage Highlights", "Hair Coloring", 140, 180, "Hand-painted highlights for a soft, natural sun-kissed look."],
  ["Keratin Treatment", "Hair Treatment", 110, 150, "Smoothing treatment that reduces frizz and adds long-lasting shine."],
  ["Deep Conditioning Spa", "Hair Treatment", 45, 60, "Intensive moisture treatment to repair dry and damaged hair."],
  ["Classic Facial", "Facial & Skincare", 60, 60, "Deep cleansing, exfoliation and hydration for fresh, glowing skin."],
  ["Anti-Aging Facial", "Facial & Skincare", 85, 75, "Targeted treatment to firm skin and reduce fine lines."],
  ["Bridal Makeup", "Makeup", 150, 90, "Long-lasting bridal look with trial consultation and lashes included."],
  ["Party Makeup", "Makeup", 65, 60, "Glamorous evening makeup for parties and special occasions."],
  ["Gel Manicure", "Manicure & Pedicure", 40, 50, "Nail shaping, cuticle care and long-wear gel polish."],
  ["Spa Pedicure", "Manicure & Pedicure", 50, 60, "Foot soak, scrub, massage and polish for relaxed, soft feet."],
  ["Aromatherapy Massage", "Spa & Massage", 80, 60, "Full-body relaxation massage with calming essential oils."],
  ["Hot Stone Massage", "Spa & Massage", 95, 75, "Heated stones ease muscle tension and deeply relax the body."],
].map(([serviceName, category, price, duration, description]) => ({
  serviceName,
  category,
  description,
  price,
  duration,
  image: img(serviceName),
  status: "active",
  createdAt: new Date(),
}));

async function seed() {
  const db = await connectDB();
  const count = await db.collection("services").countDocuments();
  if (count > 0) {
    console.log(`Services already exist (${count}). Skipping seed.`);
    process.exit(0);
  }
  await db.collection("services").insertMany(samples);
  console.log(`Inserted ${samples.length} sample services`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});