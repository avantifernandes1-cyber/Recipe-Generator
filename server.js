require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.post('/api/generate', async (req, res) => {
  const { skipTitles = [] } = req.body;

  const prompt = `Generate exactly 5 new unique recipes as a valid JSON array. Return ONLY the JSON array — no markdown, no code blocks, no explanation. Start with [ and end with ].

User food preferences:
- Proteins ONLY: chicken thighs or seafood (shrimp, tilapia, scallops, cod, halibut). NO beef, pork, or lamb.
- Liked ingredients: garlic, broccoli, cauliflower, cheese, pasta, chickpeas, black beans
- Disliked: brussels sprouts, unusual or exotic vegetables — keep it approachable
- Health: high cholesterol — favor olive oil, high-fiber ingredients, lean proteins, limit saturated fat
- Style: simple weeknight meals inspired by taco bowls, one-pot chicken and rice, blackened fish, chicken over rice platters, shrimp pasta, pot pie skillet, chicken satay with peanut sauce, chicken teriyaki, bourbon chicken, fried rice, chicken tikka masala, malai kebab, turkey burgers, American comfort food
- Also draws from Asian-inspired, Indian-inspired, and classic American flavors

Do NOT generate any of these recently seen recipes: ${skipTitles.slice(0, 35).join(', ')}

Make each recipe feel distinct in technique and flavor profile. Vary the cuisine styles — don't always default to the same type.

Each object must have EXACTLY these fields:
{
  "title": "Recipe Name",
  "category": "Chicken" or "Seafood" or "Pasta" or "Bowl",
  "badge": "badge-chicken" or "badge-seafood" or "badge-pasta" or "badge-bowl",
  "time": "XX min",
  "servings": "X",
  "cholesterol": "Heart-friendly" or "High-fiber" or "Moderate",
  "calories": "~XXX per serving",
  "ingredients": ["ingredient with measurement", "..."],
  "steps": ["Full step description", "..."],
  "link": "https://real-food-blog-url.com/recipe",
  "linkLabel": "Blog Name"
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = message.content[0].text;
    const match = text.match(/\[[\s\S]*\]/);

    if (!match) {
      return res.status(500).json({ error: 'Could not parse recipes from response', raw: text });
    }

    const recipes = JSON.parse(match[0]);

    if (!Array.isArray(recipes)) {
      return res.status(500).json({ error: 'Response was not an array' });
    }

    const valid = recipes
      .filter(r => r.title && Array.isArray(r.steps) && Array.isArray(r.ingredients))
      .map(r => ({
        ...r,
        badge: r.badge || (
          r.category === 'Seafood' ? 'badge-seafood' :
          r.category === 'Pasta'   ? 'badge-pasta'   :
          r.category === 'Bowl'    ? 'badge-bowl'     : 'badge-chicken'
        )
      }));

    res.json({ recipes: valid });
  } catch (err) {
    console.error('Generation error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🍽️  Recipe Generator running at http://localhost:${PORT}\n`);
});
