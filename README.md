# FeedMee

FeedMee is a modern web application that helps you generate creative recipes based on the ingredients you have available. Built with React and Node.js, it features Solana wallet integration and AI-powered recipe generation.

## Features

- 🧠 AI-powered recipe generation based on available ingredients
- 🔒 Secure authentication using Solana wallet
- 💫 Beautiful, modern UI with drag-and-drop functionality
- 📱 Responsive design that works on desktop and mobile
- 🔄 Recipe scaling and customization
- ⭐ Save and favorite recipes
- 🎯 Strict mode for using only specified ingredients
- 📊 Accurate nutritional information calculation

## Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- Framer Motion for animations
- React DnD for drag and drop
- Solana Wallet Adapter

### Backend
- Node.js
- Express
- PostgreSQL with Sequelize ORM
- DeepSeek AI for recipe generation
- CORS enabled for secure cross-origin requests

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- DeepSeek API key
- Solana wallet (for authentication)

## Environment Setup

### Backend (.env)
```
DATABASE_URL=your_postgres_connection_string
DEEPSEEK_API_KEY=your_deepseek_api_key
PORT=3001
POSTGRES_USE_SSL=false  # Set to true in production
NODE_ENV=development    # Set to production in production
```

### Frontend
No additional environment variables needed for basic setup.

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/feedmee.git
cd feedmee
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Set up the database:
- Create a PostgreSQL database
- Update the DATABASE_URL in backend/.env
- The tables will be automatically created on first run

## Running the Application

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Start the frontend development server:
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## API Endpoints

### Recipes
- `GET /recipes/:walletAddress` - Get user's saved recipes
- `POST /recipes` - Save a new recipe
- `POST /recipes/:id/favorite` - Toggle recipe favorite status
- `POST /recipes/:id/scale` - Scale recipe servings
- `DELETE /recipes/:id` - Delete a recipe

### Food Items
- `GET /default-foods` - Get default food items
- `GET /custom-foods/:walletAddress` - Get user's custom food items
- `POST /custom-foods` - Add a custom food item
- `DELETE /custom-foods/:id` - Delete a custom food item

### User Preferences
- `POST /user/preferences` - Update user preferences

### Recipe Generation
- `POST /generate-meal` - Generate a recipe from ingredients

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- DeepSeek AI for recipe generation
- Solana for wallet integration
- All contributors and supporters of the project
