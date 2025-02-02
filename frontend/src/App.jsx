import { useState, useEffect, useCallback, useRef } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TouchBackend } from 'react-dnd-touch-backend'
import { motion, AnimatePresence } from 'framer-motion'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useWallet } from '@solana/wallet-adapter-react'
import { Connection, PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'
import CategoryDropdown from './components/CategoryDropdown'

const emptyFoodCategories = {
  Proteins: [],
  Vegetables: [],
  Fruits: [],
  Grains: [],
  Dairy: [],
  Seasonings: [],
  Custom: []
};

const FoodItem = ({ id, text, onRemove, isDraggable = true }) => {
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: 'food',
    item: { id, text },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    canDrag: () => isDraggable,
  }), [id, text, isDraggable])

  return (
    <div ref={dragRef} className="relative group">
      <motion.div
        animate={{ 
          opacity: isDragging ? 0.6 : 1,
          boxShadow: isDragging 
            ? '0 20px 25px -5px rgb(0 0 0 / 0.2), 0 8px 10px -6px rgb(0 0 0 / 0.2)'
            : '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        }}
        whileHover={{ scale: 1.02 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 20
        }}
        className={`food-item bg-white p-3 rounded-lg shadow-sm border border-gray-100 ${isDraggable ? 'cursor-move' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isDraggable && <span className="text-gray-400 flex-shrink-0">☰</span>}
          <span 
            className="select-none truncate text-sm"
            title={text}
          >
            {text}
          </span>
          {onRemove && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(id);
              }}
              className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors flex-shrink-0"
            >
              ×
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

const DropZone = ({ onDrop, items, onGenerateMeal, isGenerating, onRemoveItem, onClearCanvas }) => {
  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: 'food',
    drop: (item, monitor) => {
      if (!monitor.getClientOffset()) return;
      
      const offset = monitor.getClientOffset()
      const dropZone = document.getElementById('dropZone')
      if (!dropZone) return;
      
      const dropZoneRect = dropZone.getBoundingClientRect()
      
      const x = offset.x - dropZoneRect.left
      const y = offset.y - dropZoneRect.top
      
      const boundedX = Math.max(50, Math.min(x, dropZoneRect.width - 100))
      const boundedY = Math.max(50, Math.min(y, dropZoneRect.height - 100))
      
      onDrop({ ...item, position: { x: boundedX, y: boundedY } })
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }), [onDrop])

  return (
    <div 
      id="dropZone"
      ref={dropRef}
      className={`w-full h-full transition-colors relative flex flex-col ${
        isOver ? 'bg-blue-50' : 'bg-gray-50'
      }`}
    >
      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-6xl mb-4">👨‍🍳</div>
            <p className="text-xl">Drop ingredients here to create your meal</p>
          </div>
        </div>
      ) : (
        <>
          <div className="absolute inset-0">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ scale: 0, x: item.position?.x, y: item.position?.y }}
                  animate={{ 
                    scale: 1,
                    x: item.position?.x, 
                    y: item.position?.y,
                  }}
                  exit={{ scale: 0 }}
                  style={{ 
                    position: 'absolute',
                    transform: `translate(${item.position?.x}px, ${item.position?.y}px)`,
                    width: 'auto',
                    zIndex: 10
                  }}
                  className="meal-item"
                >
                  <FoodItem
                    id={item.id}
                    text={item.text}
                    isDraggable={false}
                    onRemove={onRemoveItem}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
};

const RecipeDisplay = ({ recipe, onClose, wallet, isSaving, isSaved }) => {
  const [servings, setServings] = useState(recipe.servings);
  const [useMetric, setUseMetric] = useState(true);
  const [scaledRecipe, setScaledRecipe] = useState(recipe);

  const scaleRecipe = useCallback(async (newServings) => {
    if (!recipe.id) {
      const scaleFactor = newServings / recipe.servings;
      const scaled = {
        ...recipe,
        servings: newServings,
        ingredients: recipe.ingredients.map(ingredient => ({
          ...ingredient,
          amount: Math.round((ingredient.amount * scaleFactor) * 100) / 100,
          imperialAmount: Math.round((ingredient.imperialAmount * scaleFactor) * 100) / 100
        }))
      };
      setScaledRecipe(scaled);
      return;
    }

    try {
      const API_URL = import.meta.env.PROD 
        ? 'https://api.feedmee.fun'
        : 'http://localhost:3001';

      const response = await fetch(`${API_URL}/recipes/${recipe.id}/scale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ servings: newServings })
      });

      if (!response.ok) throw new Error('Failed to scale recipe');
      const scaled = await response.json();
      setScaledRecipe(scaled);
    } catch (error) {
      console.error('Error scaling recipe:', error);
    }
  }, [recipe]);

  useEffect(() => {
    if (servings !== recipe.servings) {
      scaleRecipe(servings);
    }
  }, [servings, recipe.servings, scaleRecipe]);

  const handleSave = async () => {
    if (!wallet.publicKey) return;
    setIsSaving(true);
    
    try {
      const API_URL = import.meta.env.PROD 
        ? 'https://api.feedmee.fun'
        : 'http://localhost:3001';

      const response = await fetch(`${API_URL}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...scaledRecipe,
          walletAddress: wallet.publicKey.toString()
        })
      });

      if (!response.ok) throw new Error('Failed to save recipe');
      const savedRecipe = await response.json();
      setGeneratedMeal(savedRecipe);
      fetchSavedRecipes();
    } catch (error) {
      console.error('Error saving recipe:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-white overflow-auto">
      <div className="p-6">
        <div className="flex flex-col gap-4">
          <h2 className="text-3xl font-bold">{scaledRecipe.title}</h2>
          <p className="text-gray-600">{scaledRecipe.description}</p>
          
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div>
              <span className="font-semibold">Difficulty:</span> {scaledRecipe.difficulty}
            </div>
            <div>
              <span className="font-semibold">Prep:</span> {scaledRecipe.prepTime} mins
            </div>
            <div>
              <span className="font-semibold">Cook:</span> {scaledRecipe.cookTime} mins
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-orange-50 rounded-2xl p-4 text-center">
              <h4 className="font-medium text-orange-600">Calories</h4>
              <p className="text-3xl font-bold text-orange-700">{scaledRecipe.nutrition.caloriesPerServing}</p>
              <p className="text-sm text-orange-500">per serving</p>
            </div>
            <div className="bg-emerald-50 rounded-2xl p-4 text-center">
              <h4 className="font-medium text-emerald-600">Protein</h4>
              <p className="text-3xl font-bold text-emerald-700">{scaledRecipe.nutrition.macros.protein}g</p>
              <p className="text-sm text-emerald-500">per serving</p>
            </div>
            <div className="bg-purple-50 rounded-2xl p-4 text-center">
              <h4 className="font-medium text-purple-600">Carbs</h4>
              <p className="text-3xl font-bold text-purple-700">{scaledRecipe.nutrition.macros.carbs}g</p>
              <p className="text-sm text-purple-500">per serving</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 mb-8 py-3 border-y border-gray-100">
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600">Servings:</label>
            <input
              type="range"
              min="1"
              max="20"
              value={servings}
              onChange={(e) => setServings(Number(e.target.value))}
              className="w-24 md:w-32"
            />
            <span className="text-sm font-medium">{servings}</span>
          </div>
          <button
            onClick={() => setUseMetric(!useMetric)}
            className="px-3 py-1 rounded-lg bg-gray-100 text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            {useMetric ? 'Metric' : 'Imperial'}
          </button>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Ingredients</h3>
          <ul className="space-y-2">
            {scaledRecipe.ingredients.map((ingredient, index) => (
              <li key={index} className="text-gray-700">
                {useMetric 
                  ? `${ingredient.amount} ${ingredient.unit} ${ingredient.item}`
                  : `${ingredient.imperialAmount} ${ingredient.imperialUnit} ${ingredient.item}`
                }
              </li>
            ))}
          </ul>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Instructions</h3>
          <ol className="space-y-4">
            {scaledRecipe.instructions.map((step, index) => (
              <li key={index} className="text-gray-700">
                <span className="font-medium text-gray-900">{index + 1}.</span> {step}
              </li>
            ))}
          </ol>
        </div>

        {scaledRecipe.tips && (
          <div className="bg-blue-50 rounded-xl p-4 mb-4">
            <h3 className="text-lg font-semibold mb-2">Chef's Tips</h3>
            <p className="text-gray-700 italic">{scaledRecipe.tips}</p>
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  const [inputValue, setInputValue] = useState('')
  const [mealItems, setMealItems] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedMeal, setGeneratedMeal] = useState(null)
  const [strictMode, setStrictMode] = useState(false)
  const [customFoods, setCustomFoods] = useState([])
  const [defaultFoods, setDefaultFoods] = useState(emptyFoodCategories)
  const [activeCategory, setActiveCategory] = useState(null)
  const [user, setUser] = useState(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [savedRecipes, setSavedRecipes] = useState([])
  const [showSavedRecipes, setShowSavedRecipes] = useState(false)
  const [animationAngle, setAnimationAngle] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const animationRef = useRef(null)
  
  const wallet = useWallet()

  const fetchDefaultFoods = useCallback(async () => {
    try {
      const API_URL = import.meta.env.PROD 
        ? 'https://api.feedmee.fun'
        : 'http://localhost:3001';

      const response = await fetch(`${API_URL}/default-foods`);
      if (!response.ok) throw new Error('Failed to fetch default foods');
      const foods = await response.json();
      setDefaultFoods(prev => ({
        ...foods,
        Custom: prev.Custom // Preserve custom foods
      }));
    } catch (error) {
      console.error('Error fetching default foods:', error);
    }
  }, []);

  useEffect(() => {
    fetchDefaultFoods();
  }, [fetchDefaultFoods]);

  const fetchCustomFoods = useCallback(async () => {
    if (!wallet.publicKey) return;
    try {
      const API_URL = import.meta.env.PROD 
        ? 'https://api.feedmee.fun'
        : 'http://localhost:3001';

      const response = await fetch(`${API_URL}/custom-foods/${wallet.publicKey.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch custom foods');
      const foods = await response.json();
      setCustomFoods(foods.map(food => food.name));
    } catch (error) {
      console.error('Error fetching custom foods:', error);
    }
  }, [wallet.publicKey]);

  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      setUser({
        walletAddress: wallet.publicKey.toString(),
        preferences: { strictMode: false, favoriteRecipes: [] }
      });
      fetchCustomFoods();
    } else {
      setUser(null);
      setCustomFoods([]);
    }
  }, [wallet.connected, wallet.publicKey, fetchCustomFoods]);

  const handleAddCustomFood = async (e) => {
    e.preventDefault()
    if (!wallet.publicKey) {
      alert('Please connect your wallet to add custom foods');
      return;
    }

    if (inputValue.trim()) {
      try {
        const API_URL = import.meta.env.PROD 
          ? 'https://api.feedmee.fun'
          : 'http://localhost:3001';

        const response = await fetch(`${API_URL}/custom-foods`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: inputValue.trim(),
            walletAddress: wallet.publicKey.toString()
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to add custom food');
        }

        await fetchCustomFoods();
        setInputValue('');
      } catch (error) {
        console.error('Error adding custom food:', error);
        alert(error.message);
      }
    }
  }

  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      setUser({
        walletAddress: wallet.publicKey.toString(),
        preferences: { strictMode: false, favoriteRecipes: [] }
      });
    } else {
      setUser(null);
    }
  }, [wallet.connected, wallet.publicKey]);

  const updateUserPreferences = async (preferences) => {
    if (!wallet.connected || !wallet.publicKey) return;

    try {
      const API_URL = import.meta.env.PROD 
        ? 'https://api.feedmee.fun'
        : 'http://localhost:3001';

      const response = await fetch(`${API_URL}/user/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: wallet.publicKey.toString(),
          preferences
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const { preferences: updatedPreferences } = await response.json();
      setUser(prev => ({
        ...prev,
        preferences: updatedPreferences
      }));
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  };

  const startSpinningAnimation = () => {
    if (animationRef.current) return;
    const container = document.querySelector('.bg-white.rounded-2xl.shadow-lg');
    if (!container) return;
    const { left, top, width, height } = container.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const radius = Math.min(width, height) * 0.15;
    const items = document.querySelectorAll('.meal-item');
    
    items.forEach((item, index) => {
      const angle = (2 * Math.PI * index) / items.length;
      const x = centerX + radius * Math.cos(angle) - item.offsetWidth / 2;
      const y = centerY + radius * Math.sin(angle) - item.offsetHeight / 2;
      item.style.position = 'fixed';
      item.style.left = `${x}px`;
      item.style.top = `${y}px`;
      item.style.transform = 'scale(1.2)';
      item.style.transition = 'all 0.5s ease-out';
      item.style.zIndex = '9999';
    });

    animationRef.current = setInterval(() => {
      setAnimationAngle(prev => {
        const newAngle = prev + 2;
        const { left: updatedLeft, top: updatedTop } = container.getBoundingClientRect();
        const updatedCenterX = updatedLeft + width / 2;
        const updatedCenterY = updatedTop + height / 2;
        
        items.forEach((item, index) => {
          const angle = (2 * Math.PI * index) / items.length + (newAngle * Math.PI / 180);
          const x = updatedCenterX + radius * Math.cos(angle) - item.offsetWidth / 2;
          const y = updatedCenterY + radius * Math.sin(angle) - item.offsetHeight / 2;
          item.style.left = `${x}px`;
          item.style.top = `${y}px`;
        });
        return newAngle;
      });
    }, 16);
  };

  const stopSpinningAnimation = () => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
    
    const items = document.querySelectorAll('.meal-item');
    items.forEach(item => {
      item.style.position = '';
      item.style.left = '';
      item.style.top = '';
      item.style.transform = '';
      item.style.transition = '';
      item.style.zIndex = '';
    });
  };

  const handleGenerateMeal = async () => {
    if (mealItems.length < 2) return;
    setIsGenerating(true);
    startSpinningAnimation();
    
    try {
      const API_URL = import.meta.env.PROD 
        ? 'https://api.feedmee.fun'
        : 'http://localhost:3001';

      const response = await fetch(`${API_URL}/generate-meal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredients: mealItems.map(item => item.text || item.name),
          strictMode
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate meal');
      }

      const meal = await response.json();
      setGeneratedMeal(meal);
    } catch (error) {
      console.error('Error generating meal:', error);
    } finally {
      setIsGenerating(false);
      stopSpinningAnimation();
    }
  };

  const handleDrop = (item) => {
    const existingItem = mealItems.find(mealItem => mealItem.id === item.id)
    if (!existingItem) {
      const position = item.position || {
        x: Math.random() * 200 + 50,
        y: Math.random() * 200 + 50
      }
      const name = item.text || item.name;
      if (!name) {
        console.error('Item missing both text and name properties:', item);
        return;
      }
      setMealItems(prevItems => [...prevItems, { 
        ...item, 
        position,
        text: name, 
        name: name
      }])
    }
  }

  const handleRemoveItem = (id) => {
    setMealItems(prevItems => prevItems.filter(item => item.id !== id))
  }

  const fetchSavedRecipes = useCallback(async () => {
    if (!wallet.publicKey) return;
    try {
      const API_URL = import.meta.env.PROD 
        ? 'https://api.feedmee.fun'
        : 'http://localhost:3001';

      const response = await fetch(`${API_URL}/recipes/${wallet.publicKey.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch recipes');
      const recipes = await response.json();
      setSavedRecipes(recipes);
    } catch (error) {
      console.error('Error fetching saved recipes:', error);
    }
  }, [wallet.publicKey]);

  useEffect(() => {
    if (wallet.publicKey) {
      fetchSavedRecipes();
    }
  }, [wallet.publicKey, fetchSavedRecipes]);

  const SavedRecipes = ({ recipes, onSelectRecipe, onClose, onRefresh }) => {
    const wallet = useWallet();
    const [isDeleting, setIsDeleting] = useState(null);

    const handleDelete = async (recipeId, e) => {
      e.stopPropagation();
      if (!wallet.publicKey) return;
      setIsDeleting(recipeId);
      
      try {
        const API_URL = import.meta.env.PROD 
          ? 'https://api.feedmee.fun'
          : 'http://localhost:3001';

        const response = await fetch(`${API_URL}/recipes/${recipeId}?walletAddress=${wallet.publicKey.toString()}`, {
          method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete recipe');
        
        onRefresh();
      } catch (error) {
        console.error('Error deleting recipe:', error);
      } finally {
        setIsDeleting(null);
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-0 bg-white rounded-2xl p-6 overflow-y-auto z-[9999]"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold">Saved Recipes</h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </motion.button>
        </div>

        {recipes.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No saved recipes yet. Generate some recipes to see them here!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recipes.map((recipe) => (
              <motion.div
                key={recipe.id}
                whileHover={{ scale: 1.02 }}
                className="bg-gray-50 rounded-xl p-4 relative group"
              >
                <div 
                  className="cursor-pointer"
                  onClick={() => onSelectRecipe(recipe)}
                >
                  <h4 className="font-semibold mb-2">{recipe.title}</h4>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{recipe.description}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                    <span>{recipe.difficulty}</span>
                    <span>•</span>
                    <span>{recipe.prepTime + recipe.cookTime} mins</span>
                    <span>•</span>
                    <span>{recipe.servings} servings</span>
                  </div>
                </div>
                <motion.button
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleDelete(recipe.id, e)}
                  disabled={isDeleting === recipe.id}
                >
                  {isDeleting === recipe.id ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-lg">×</span>
                  )}
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  const isTouchDevice = () => {
    return (('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (navigator.msMaxTouchPoints > 0));
  };

  const handleSave = async () => {
    if (!wallet.publicKey) return;
    setIsSaving(true);
    
    try {
      const API_URL = import.meta.env.PROD 
        ? 'https://api.feedmee.fun'
        : 'http://localhost:3001';

      const response = await fetch(`${API_URL}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...generatedMeal,
          walletAddress: wallet.publicKey.toString()
        })
      });

      if (!response.ok) throw new Error('Failed to save recipe');
      const savedRecipe = await response.json();
      setGeneratedMeal(savedRecipe);
      fetchSavedRecipes();
    } catch (error) {
      console.error('Error saving recipe:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearCanvas = () => {
    setMealItems([]);
  };

  const handleClose = () => {
    setGeneratedMeal(null);
    setMealItems([]);
  };

  // Add event listener for custom food refresh
  useEffect(() => {
    const handleRefreshCustomFoods = () => {
      fetchCustomFoods();
    };

    window.addEventListener('refreshCustomFoods', handleRefreshCustomFoods);
    return () => {
      window.removeEventListener('refreshCustomFoods', handleRefreshCustomFoods);
    };
  }, [fetchCustomFoods]);

  return (
    <DndProvider backend={isTouchDevice() ? TouchBackend : HTML5Backend} options={{ enableMouseEvents: true }}>
      <div className="h-screen flex flex-col">
        <nav className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
          <img src="/feedmee.png" alt="FeedMee Logo" className="h-8" />
          <div className="flex items-center gap-2">
            {wallet.connected && (
              <button
                onClick={() => setShowSavedRecipes(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors wallet-adapter-button"
              >
                Saved Recipes
              </button>
            )}
            <WalletMultiButton />
          </div>
        </nav>
        
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left sidebar */}
          <div className="w-full md:w-64 bg-white p-4 flex flex-col gap-4 order-2 md:order-1">
            {/* Categories container - horizontal on mobile, vertical on desktop */}
            <div className="flex md:flex-col overflow-x-auto md:overflow-x-visible gap-2 pb-2 md:pb-0 scrollbar-hide whitespace-nowrap">
              {Object.keys(defaultFoods).map(category => (
                <CategoryDropdown
                  key={category}
                  category={category}
                  foods={category === 'Custom' ? customFoods : defaultFoods[category]}
                  isCustom={category === 'Custom'}
                  onAddCustomFood={handleAddCustomFood}
                  inputValue={inputValue}
                  setInputValue={setInputValue}
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                />
              ))}
            </div>
            
            {/* Mobile-only buttons */}
            <div className="flex gap-2 md:hidden">
              <button
                onClick={generatedMeal ? handleSave : handleClearCanvas}
                disabled={(generatedMeal && (isSaving || generatedMeal.id)) || (!generatedMeal && mealItems.length === 0)}
                className={`flex-1 px-4 py-2 rounded-lg text-sm transition-colors ${
                  generatedMeal
                    ? generatedMeal.id
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-green-500 text-white hover:bg-green-600'
                    : mealItems.length === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {generatedMeal ? (generatedMeal.id ? 'Saved' : isSaving ? 'Saving...' : 'Save Recipe') : 'Clear Canvas'}
              </button>
              <button
                onClick={generatedMeal ? handleClose : handleGenerateMeal}
                disabled={!generatedMeal && (mealItems.length < 2 || isGenerating)}
                className={`flex-1 px-4 py-2 rounded-lg text-sm transition-colors ${
                  generatedMeal
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : mealItems.length < 2 || isGenerating
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {generatedMeal ? 'New Recipe' : isGenerating ? 'Generating...' : 'Generate Recipe'}
              </button>
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1 p-4 order-1 md:order-2 overflow-hidden">
            <div className="bg-white rounded-lg shadow-sm h-full overflow-hidden flex flex-col">
              <div className="flex-1 relative">
                {generatedMeal ? (
                  <div className="absolute inset-0 z-10">
                    <RecipeDisplay
                      recipe={generatedMeal}
                      onClose={handleClose}
                      wallet={wallet}
                      isSaving={isSaving}
                      isSaved={!!generatedMeal.id}
                    />
                  </div>
                ) : (
                  <DropZone
                    onDrop={handleDrop}
                    items={mealItems}
                    onGenerateMeal={handleGenerateMeal}
                    isGenerating={isGenerating}
                    onRemoveItem={handleRemoveItem}
                    onClearCanvas={handleClearCanvas}
                  />
                )}
              </div>
              
              {/* Desktop-only buttons */}
              <div className="hidden md:flex gap-2 p-4 bg-gray-50 border-t">
                <button
                  onClick={generatedMeal ? handleSave : handleClearCanvas}
                  disabled={(generatedMeal && (isSaving || generatedMeal.id)) || (!generatedMeal && mealItems.length === 0)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    generatedMeal
                      ? generatedMeal.id
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-green-500 text-white hover:bg-green-600'
                      : mealItems.length === 0
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  {generatedMeal ? (generatedMeal.id ? 'Saved' : isSaving ? 'Saving...' : 'Save Recipe') : 'Clear Canvas'}
                </button>
                <button
                  onClick={generatedMeal ? handleClose : handleGenerateMeal}
                  disabled={!generatedMeal && (mealItems.length < 2 || isGenerating)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    generatedMeal
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : mealItems.length < 2 || isGenerating
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {generatedMeal ? 'New Recipe' : isGenerating ? 'Generating...' : 'Generate Recipe'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Saved Recipes Modal */}
        {showSavedRecipes && (
          <SavedRecipes
            recipes={savedRecipes}
            onSelectRecipe={(recipe) => {
              setGeneratedMeal(recipe);
              setShowSavedRecipes(false);
            }}
            onClose={() => setShowSavedRecipes(false)}
            onRefresh={fetchSavedRecipes}
          />
        )}
      </div>
    </DndProvider>
  );
}

export default App