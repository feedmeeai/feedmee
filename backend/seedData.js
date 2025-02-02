// Default food items configuration
// This file serves as a single source of truth for default food items
// Modify this file to update the default food items in the database

const defaultFoods = {
  Beef: [
    'Ground Beef',
    'Ribeye Steak',
    'Sirloin Steak',
    'Beef Tenderloin',
    'Chuck Roast',
    'Brisket',
    'Short Ribs',
    'Flank Steak',
    'Skirt Steak',
    'Beef Shank'
  ],
  Poultry: [
    'Chicken Breast',
    'Chicken Thighs',
    'Chicken Wings',
    'Whole Chicken',
    'Ground Turkey',
    'Turkey Breast',
    'Duck Breast',
    'Chicken Drumsticks',
    'Turkey Thighs',
    'Chicken Liver'
  ],
  Pork: [
    'Pork Chops',
    'Bacon',
    'Ham',
    'Pork Belly',
    'Ground Pork',
    'Pork Tenderloin',
    'Pork Ribs',
    'Pork Shoulder',
    'Prosciutto',
    'Pancetta'
  ],
  Lamb: [
    'Lamb Chops',
    'Leg of Lamb',
    'Lamb Shoulder',
    'Ground Lamb',
    'Lamb Ribs',
    'Lamb Shank',
    'Rack of Lamb',
    'Lamb Loin',
    'Lamb Breast',
    'Lamb Neck'
  ],
  Seafood: [
    'Salmon',
    'Tuna',
    'Cod',
    'Shrimp',
    'Halibut',
    'Sea Bass',
    'Mussels',
    'Crab',
    'Lobster',
    'Scallops',
    'Trout',
    'Sardines',
    'Tilapia',
    'Oysters',
    'Clams'
  ],
  Vegetables: [
    // Leafy Greens
    'Spinach',
    'Kale',
    'Lettuce',
    'Swiss Chard',
    'Arugula',
    'Collard Greens',
    // Root Vegetables
    'Carrots',
    'Potatoes',
    'Sweet Potatoes',
    'Beets',
    'Parsnips',
    'Turnips',
    // Cruciferous
    'Broccoli',
    'Cauliflower',
    'Brussels Sprouts',
    'Cabbage',
    // Nightshades
    'Tomatoes',
    'Bell Peppers',
    'Eggplant',
    // Alliums
    'Onions',
    'Garlic',
    'Shallots',
    'Leeks',
    // Others
    'Mushrooms',
    'Zucchini',
    'Cucumber',
    'Asparagus',
    'Green Beans',
    'Peas',
    'Corn',
    'Celery'
  ],
  Fruits: [
    // Berries
    'Strawberries',
    'Blueberries',
    'Raspberries',
    'Blackberries',
    // Citrus
    'Oranges',
    'Lemons',
    'Limes',
    'Grapefruit',
    // Tropical
    'Mango',
    'Pineapple',
    'Banana',
    'Papaya',
    'Coconut',
    // Stone Fruits
    'Peaches',
    'Plums',
    'Apricots',
    'Cherries',
    // Core Fruits
    'Apples',
    'Pears',
    // Others
    'Grapes',
    'Kiwi',
    'Pomegranate',
    'Avocado',
    'Figs'
  ],
  Grains: [
    // Rice
    'White Rice',
    'Brown Rice',
    'Basmati Rice',
    'Jasmine Rice',
    'Wild Rice',
    // Wheat Products
    'Bread',
    'Pasta',
    'Couscous',
    'Bulgur',
    // Other Grains
    'Quinoa',
    'Oats',
    'Barley',
    'Millet',
    'Buckwheat',
    'Farro',
    'Polenta'
  ],
  Legumes: [
    'Black Beans',
    'Chickpeas',
    'Lentils',
    'Kidney Beans',
    'Pinto Beans',
    'Navy Beans',
    'Edamame',
    'Split Peas',
    'Fava Beans',
    'Lima Beans'
  ],
  Dairy: [
    // Cheese
    'Cheddar Cheese',
    'Mozzarella',
    'Parmesan',
    'Feta',
    'Gouda',
    'Blue Cheese',
    'Brie',
    // Other Dairy
    'Milk',
    'Heavy Cream',
    'Yogurt',
    'Butter',
    'Sour Cream',
    'Cottage Cheese',
    'Ricotta',
    'Greek Yogurt'
  ],
  Herbs: [
    'Basil',
    'Parsley',
    'Cilantro',
    'Mint',
    'Rosemary',
    'Thyme',
    'Sage',
    'Oregano',
    'Dill',
    'Chives',
    'Bay Leaves',
    'Tarragon'
  ],
  Spices: [
    'Black Pepper',
    'Salt',
    'Cumin',
    'Paprika',
    'Cinnamon',
    'Turmeric',
    'Cayenne',
    'Nutmeg',
    'Coriander',
    'Cardamom',
    'Ginger',
    'Cloves',
    'Star Anise',
    'Saffron'
  ],
  Condiments: [
    'Olive Oil',
    'Soy Sauce',
    'Vinegar',
    'Hot Sauce',
    'Mustard',
    'Mayonnaise',
    'Ketchup',
    'Fish Sauce',
    'Worcestershire Sauce',
    'Honey',
    'Maple Syrup',
    'Sesame Oil',
    'Tahini',
    'Miso Paste'
  ],
  Nuts_and_Seeds: [
    'Almonds',
    'Walnuts',
    'Cashews',
    'Pistachios',
    'Pecans',
    'Pine Nuts',
    'Sunflower Seeds',
    'Pumpkin Seeds',
    'Sesame Seeds',
    'Chia Seeds',
    'Flax Seeds',
    'Hemp Seeds'
  ],
  Custom: []
};

// Convert the configuration into a flat array of objects for database seeding
const getFoodItems = () => {
  return Object.entries(defaultFoods).flatMap(([category, items]) =>
    items.map(name => ({
      name,
      category
    }))
  );
};

module.exports = {
  defaultFoods,
  getFoodItems
}; 