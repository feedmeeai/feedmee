require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const { Sequelize, DataTypes } = require('sequelize');
const { PublicKey } = require('@solana/web3.js');
const bs58 = require('bs58');
const nacl = require('tweetnacl');
const { getFoodItems } = require('./seedData');

const app = express();
const port = process.env.PORT || 3001;

// Middleware to handle CORS with Cloudflare
app.use((req, res, next) => {
  // Allow requests from your domain and localhost
  const allowedOrigins = ['https://feedmee.fun', 'https://www.feedmee.fun', 'http://localhost:3000', 'http://localhost:5173'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  // Required for Cloudflare
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, cf-connecting-ip, cf-ipcountry, cf-ray, x-forwarded-for');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());

// Add these at the top level, after the initial imports
let Recipe;
let User;
let CustomFoodItem;
let DefaultFoodItem;

// Update the model initialization
const initModels = (sequelize) => {
  // User Model
  User = sequelize.define('User', {
    walletAddress: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      primaryKey: true
    },
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: {
        strictMode: false,
        favoriteRecipes: []
      }
    }
  });

  // Recipe Model
  Recipe = sequelize.define('Recipe', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: DataTypes.TEXT,
    servings: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    difficulty: {
      type: DataTypes.ENUM('easy', 'medium', 'hard'),
      allowNull: false
    },
    prepTime: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    cookTime: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ingredients: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    instructions: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false
    },
    tips: DataTypes.TEXT,
    nutrition: {
      type: DataTypes.JSONB,
      defaultValue: {
        caloriesPerServing: 0,
        macros: {
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0
        }
      }
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isFavorite: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  });

  // CustomFoodItem Model
  CustomFoodItem = sequelize.define('CustomFoodItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Custom'
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: User,
        key: 'walletAddress'
      }
    }
  });

  // DefaultFoodItem Model
  DefaultFoodItem = sequelize.define('DefaultFoodItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false
    }
  });

  // Set up associations
  User.hasMany(CustomFoodItem, { foreignKey: 'createdBy' });
  CustomFoodItem.belongsTo(User, { foreignKey: 'createdBy' });

  return { User, Recipe, CustomFoodItem, DefaultFoodItem };
};

// PostgreSQL connection with retry logic
const connectWithRetry = async () => {
  const maxRetries = 5;
  let currentTry = 1;

  while (currentTry <= maxRetries) {
    try {
      console.log(`Attempting database connection (attempt ${currentTry}/${maxRetries})...`);
      
      const sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        dialectOptions: {
          ssl: process.env.POSTGRES_USE_SSL === 'true' ? {
            require: true,
            rejectUnauthorized: false
          } : false
        },
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000
        },
        logging: (msg) => console.log(`[Database] ${msg}`)
      });

      // Test the connection
      await sequelize.authenticate();
      console.log('Database connection established successfully');
      
      // Initialize models
      console.log('Initializing database models...');
      const models = initModels(sequelize);
      
      // Sync database with alter option for safer production updates
      console.log('Syncing database schema...');
      if (process.env.NODE_ENV === 'development') {
        // In development, we can use force: true to reset the database
        await sequelize.sync({ force: true });
        console.log('Database schema synchronized (development mode - forced sync)');
      } else {
        // In production, use alter: true for safer updates
        await sequelize.sync({ alter: true });
        console.log('Database schema synchronized (production mode - alter sync)');
      }

      // Seed default food items
      console.log('Seeding default food items...');
      await models.DefaultFoodItem.destroy({ truncate: true }); // Clear existing items
      await models.DefaultFoodItem.bulkCreate(getFoodItems());
      console.log('Default food items seeded successfully');
      
      return sequelize;
    } catch (error) {
      console.error(`Database connection attempt ${currentTry} failed:`, error.message);
      if (error.original) {
        console.error('Original error:', error.original);
      }
      
      if (currentTry === maxRetries) {
        throw new Error(`Failed to connect to database after ${maxRetries} attempts: ${error.message}`);
      }
      const delay = Math.min(1000 * Math.pow(2, currentTry), 10000);
      console.log(`Waiting ${delay}ms before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      currentTry++;
    }
  }
};

let sequelize;
(async () => {
  try {
    sequelize = await connectWithRetry();
    
    // Start server only after database is ready
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
})();

// Initialize OpenAI with DeepSeek configuration
const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY
});

// User Preferences Endpoint
app.post('/user/preferences', async (req, res) => {
  try {
    const { walletAddress, preferences } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Update or create user
    const [user] = await User.upsert({
      walletAddress,
      preferences: preferences
    });

    res.json({ preferences: user.preferences });
  } catch (error) {
    console.error('Preferences update error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Update the recipe generation prompt
const generateRecipePrompt = (ingredients, strictMode) => `
Create a creative and delicious recipe ${
  strictMode 
    ? 'using ONLY the following ingredients (basic seasonings like salt, pepper, and oil are allowed): ' 
    : 'using some or all of these ingredients: '
}${ingredients.join(', ')}.

${strictMode 
  ? 'You MUST NOT suggest or use ANY additional ingredients except salt, pepper, and oil. The recipe should ONLY use the listed ingredients plus these basic seasonings.' 
  : 'If any essential ingredients are missing, you can suggest adding them.'
}

Please format the response as JSON with the following structure:
{
  "title": "A creative and appealing name for the dish",
  "description": "A brief, appetizing description of the dish",
  "servings": 4,
  "difficulty": "easy|medium|hard",
  "prepTime": "preparation time in minutes",
  "cookTime": "cooking time in minutes",
  "ingredients": [
    {
      "item": "ingredient name",
      "amount": 100,
      "unit": "g",
      "imperialAmount": 3.5,
      "imperialUnit": "oz"
    }
  ],
  "instructions": [
    "Clear, step-by-step cooking instructions",
    "Include cooking times and temperatures in both Celsius and Fahrenheit"
  ],
  "tips": "Helpful cooking tips or serving suggestions",
  "nutrition": {
    "caloriesPerServing": "Calculate this based on ingredients used",
    "macros": {
      "protein": "Calculate protein grams based on ingredients (e.g., meat = ~25g protein per 100g)",
      "carbs": "Calculate carbs grams based on ingredients (e.g., rice = ~28g carbs per 100g)",
      "fat": "Calculate fat grams based on ingredients (e.g., oil = ~100g fat per 100g)",
      "fiber": "Calculate fiber grams based on ingredients (e.g., vegetables ~2-4g fiber per 100g)"
    }
  }
}

Important:
1. All ingredients must include both metric and imperial measurements
2. Calculate accurate nutritional values based on the actual ingredients and amounts used:
   - For proteins: meat/fish ~25g protein per 100g, eggs ~13g per 100g, legumes ~9g per 100g
   - For carbs: rice/pasta ~28g per 100g, bread ~50g per 100g
   - For fats: oils ~100g per 100g, nuts ~50g per 100g
   - For fiber: vegetables ~2-4g per 100g, whole grains ~3g per 100g
3. Instructions should be clear and numbered
4. Temperature should be in both °C and °F
5. Macros should be calculated in grams per serving based on the actual recipe ingredients`;

// Add new save recipe endpoint
app.post('/recipes', async (req, res) => {
  try {
    const { walletAddress, ...recipeData } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Convert time values to integers if they're strings
    if (typeof recipeData.prepTime === 'string') {
      recipeData.prepTime = parseInt(recipeData.prepTime.replace(/[^0-9]/g, ''));
    }
    if (typeof recipeData.cookTime === 'string') {
      recipeData.cookTime = parseInt(recipeData.cookTime.replace(/[^0-9]/g, ''));
    }

    // Save the recipe
    const savedRecipe = await Recipe.create({
      ...recipeData,
      createdBy: walletAddress
    });

    res.json(savedRecipe);
  } catch (error) {
    console.error('Error saving recipe:', error);
    res.status(500).json({ error: 'Failed to save recipe' });
  }
});

// Update the generate-meal endpoint
app.post('/generate-meal', async (req, res) => {
  try {
    const { ingredients, strictMode } = req.body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid ingredients',
        message: 'Please provide a non-empty array of ingredients' 
      });
    }

    const completion = await openai.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: `You are a creative and knowledgeable chef who specializes in creating delicious recipes from available ingredients. ${
            strictMode 
              ? 'You MUST ONLY use the exact ingredients provided, plus basic seasonings (salt, pepper, oil). No other ingredients are allowed under any circumstances.' 
              : 'You can suggest additional ingredients when necessary.'
          } You understand cooking techniques, flavor combinations, and nutritional information. You must calculate accurate nutritional values based on the actual ingredients and amounts used in the recipe. You must ALWAYS return responses in valid JSON format, with NO markdown formatting, NO code blocks, and no additional text before or after the JSON object. For prepTime and cookTime, provide only the number of minutes as an integer.`
        },
        { 
          role: "user", 
          content: generateRecipePrompt(ingredients, strictMode)
        }
      ],
      model: "deepseek-chat",
      temperature: strictMode ? 0.3 : 0.8
    });

    // Get the response content and clean it up
    let content = completion.choices[0].message.content;
    
    // Remove markdown code block if present
    content = content.replace(/^```json\n/, '').replace(/^```\n/, '').replace(/\n```$/, '');
    
    // Remove any leading/trailing whitespace
    content = content.trim();

    // Parse and validate the recipe
    let recipe;
    try {
      recipe = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse recipe JSON:', parseError);
      console.error('Raw content:', content);
      throw new Error('Invalid recipe format returned from AI');
    }

    // Validate required fields
    const requiredFields = ['title', 'description', 'servings', 'difficulty', 'prepTime', 'cookTime', 'ingredients', 'instructions'];
    for (const field of requiredFields) {
      if (!recipe[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Convert time values to integers if they're strings
    if (typeof recipe.prepTime === 'string') {
      recipe.prepTime = parseInt(recipe.prepTime.replace(/[^0-9]/g, ''));
    }
    if (typeof recipe.cookTime === 'string') {
      recipe.cookTime = parseInt(recipe.cookTime.replace(/[^0-9]/g, ''));
    }

    // Additional validation for numeric fields
    if (isNaN(recipe.prepTime) || isNaN(recipe.cookTime) || isNaN(recipe.servings)) {
      throw new Error('Invalid numeric values for prepTime, cookTime, or servings');
    }

    res.json(recipe);
  } catch (error) {
    console.error('Recipe generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate meal',
      message: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get user's saved recipes
app.get('/recipes/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const recipes = await Recipe.findAll({
      where: {
        createdBy: walletAddress
      },
      order: [['createdAt', 'DESC']]
    });
    res.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Toggle recipe favorite status
app.post('/recipes/:id/favorite', async (req, res) => {
  try {
    const { id } = req.params;
    const { walletAddress } = req.body;

    const recipe = await Recipe.findByPk(id);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    if (recipe.createdBy !== walletAddress) {
      return res.status(403).json({ error: 'Not authorized to modify this recipe' });
    }

    recipe.isFavorite = !recipe.isFavorite;
    await recipe.save();

    res.json({ isFavorite: recipe.isFavorite });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ error: 'Failed to toggle favorite status' });
  }
});

// Scale recipe servings
app.post('/recipes/:id/scale', async (req, res) => {
  try {
    const { id } = req.params;
    const { servings } = req.body;

    const recipe = await Recipe.findByPk(id);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const scaleFactor = servings / recipe.servings;
    const scaledRecipe = {
      ...recipe.toJSON(),
      servings,
      ingredients: recipe.ingredients.map(ingredient => ({
        ...ingredient,
        amount: Math.round((ingredient.amount * scaleFactor) * 100) / 100,
        imperialAmount: Math.round((ingredient.imperialAmount * scaleFactor) * 100) / 100
      })),
      nutrition: {
        caloriesPerServing: recipe.nutrition.caloriesPerServing,
        macros: recipe.nutrition.macros // Macros per serving stay the same
      }
    };

    res.json(scaledRecipe);
  } catch (error) {
    console.error('Error scaling recipe:', error);
    res.status(500).json({ error: 'Failed to scale recipe' });
  }
});

// Delete recipe endpoint
app.delete('/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { walletAddress } = req.query;

    const recipe = await Recipe.findByPk(id);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    if (recipe.createdBy !== walletAddress) {
      return res.status(403).json({ error: 'Not authorized to delete this recipe' });
    }

    await recipe.destroy();
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

// Get user's custom food items
app.get('/custom-foods/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const customFoods = await CustomFoodItem.findAll({
      where: {
        createdBy: walletAddress
      },
      order: [['createdAt', 'DESC']]
    });
    res.json(customFoods);
  } catch (error) {
    console.error('Error fetching custom foods:', error);
    res.status(500).json({ error: 'Failed to fetch custom foods' });
  }
});

// Add custom food item
app.post('/custom-foods', async (req, res) => {
  try {
    const { name, category, walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Food name is required' });
    }

    // First ensure the user exists
    await User.findOrCreate({
      where: { walletAddress },
      defaults: {
        preferences: {
          strictMode: false,
          favoriteRecipes: []
        }
      }
    });

    // Check if the food item already exists for this user
    const existingFood = await CustomFoodItem.findOne({
      where: {
        name: name.trim(),
        createdBy: walletAddress
      }
    });

    if (existingFood) {
      return res.status(400).json({ error: 'Food item already exists' });
    }

    const customFood = await CustomFoodItem.create({
      name: name.trim(),
      category: category || 'Custom',
      createdBy: walletAddress
    });

    res.json(customFood);
  } catch (error) {
    console.error('Error adding custom food:', error);
    res.status(500).json({ error: 'Failed to add custom food' });
  }
});

// Delete custom food item
app.delete('/custom-foods/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { walletAddress } = req.query;

    const customFood = await CustomFoodItem.findByPk(id);
    if (!customFood) {
      return res.status(404).json({ error: 'Custom food not found' });
    }

    if (customFood.createdBy !== walletAddress) {
      return res.status(403).json({ error: 'Not authorized to delete this food item' });
    }

    await customFood.destroy();
    res.json({ message: 'Custom food deleted successfully' });
  } catch (error) {
    console.error('Error deleting custom food:', error);
    res.status(500).json({ error: 'Failed to delete custom food' });
  }
});

// Add new endpoint to get default food items
app.get('/default-foods', async (req, res) => {
  try {
    const defaultFoods = await DefaultFoodItem.findAll({
      order: [['category', 'ASC'], ['name', 'ASC']]
    });

    // Transform the flat array into a categorized object
    const categorizedFoods = defaultFoods.reduce((acc, food) => {
      if (!acc[food.category]) {
        acc[food.category] = [];
      }
      acc[food.category].push(food.name);
      return acc;
    }, {});

    res.json(categorizedFoods);
  } catch (error) {
    console.error('Error fetching default foods:', error);
    res.status(500).json({ error: 'Failed to fetch default foods' });
  }
}); 