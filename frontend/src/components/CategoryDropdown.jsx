import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import FoodItem from './FoodItem'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 768
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return isMobile
}

export default function CategoryDropdown({
  category, 
  foods, 
  isCustom, 
  onAddCustomFood, 
  inputValue, 
  setInputValue,
  activeCategory,
  setActiveCategory 
}) {
  const isMobile = useIsMobile()
  const buttonRef = useRef(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const wallet = useWallet()

  const formatCategoryName = (name) => {
    return name.replace(/_/g, ' ')
  }

  const handleDeleteCustomFood = async (foodName) => {
    if (!wallet.publicKey) return;

    try {
      const API_URL = import.meta.env.PROD 
        ? 'https://api.feedmee.fun'
        : 'http://localhost:3001';

      // First, fetch all custom foods to get the ID
      const response = await fetch(`${API_URL}/custom-foods/${wallet.publicKey.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch custom foods');
      const customFoods = await response.json();
      
      const foodItem = customFoods.find(food => food.name === foodName);
      if (!foodItem) {
        console.error('Food item not found:', foodName);
        return;
      }

      const deleteResponse = await fetch(
        `${API_URL}/custom-foods/${foodItem.id}?walletAddress=${wallet.publicKey.toString()}`,
        { method: 'DELETE' }
      );

      if (!deleteResponse.ok) {
        throw new Error('Failed to delete custom food');
      }

      // Refresh the custom foods list
      window.dispatchEvent(new CustomEvent('refreshCustomFoods'));
    } catch (error) {
      console.error('Error deleting custom food:', error);
      alert(error.message);
    }
  };

  useEffect(() => {
    if (!isMobile && buttonRef.current && activeCategory) {
      const rect = buttonRef.current.getBoundingClientRect()
      const windowHeight = window.innerHeight
      const isBottomHalf = rect.top > windowHeight / 2

      setDropdownPosition({
        top: isBottomHalf ? 'auto' : rect.top,
        bottom: isBottomHalf ? (windowHeight - rect.top) : 'auto',
        left: rect.right + 8
      })
    }
  }, [isMobile, activeCategory])

  const toggleCategory = () => {
    const thisCategory = isCustom ? 'Custom' : category
    setActiveCategory(prev =>
      prev === thisCategory ? null : thisCategory
    )
  }

  // Desktop anchored dropdown
  const desktopDropdown = (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="fixed w-64 md:w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-[9999] max-h-[70vh] flex flex-col"
      style={{ 
        top: dropdownPosition.top, 
        bottom: dropdownPosition.bottom,
        left: dropdownPosition.left 
      }}
    >
      {isCustom ? (
        <>
          <form onSubmit={onAddCustomFood} className="flex gap-2 p-3 border-b border-gray-100">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Add custom ingredient..."
              className="flex-1 px-3 py-1.5 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              className="px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
            >
              Add
            </motion.button>
          </form>
          <div className="overflow-y-auto p-3 grid grid-cols-2 gap-2">
            {foods.map((food) => (
              <FoodItem 
                key={food} 
                id={food} 
                text={food} 
                onRemove={isCustom ? () => handleDeleteCustomFood(food) : undefined}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="overflow-y-auto p-3 grid grid-cols-2 gap-2">
          {foods.map((food) => (
            <FoodItem key={food} id={food} text={food} />
          ))}
        </div>
      )}
    </motion.div>
  )

  // Mobile bottom sheet
  const mobileModal = (
    <motion.div 
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 1 }}
      className="fixed inset-x-0 bottom-0 z-[9999]"
    >
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white rounded-t-2xl shadow-xl p-4 max-h-[50vh] flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            {isCustom ? 'Custom Ingredients' : category}
          </h3>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleCategory}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            ×
          </motion.button>
        </div>
        
        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {isCustom && (
            <form 
              onSubmit={onAddCustomFood} 
              className="flex gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Add custom ingredient..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                className="px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm whitespace-nowrap"
              >
                Add
              </motion.button>
            </form>
          )}
          
          <div className="grid grid-cols-2 gap-3 overflow-y-auto pb-safe pr-2">
            {foods.map((food) => (
              <FoodItem 
                key={food} 
                id={food} 
                text={food} 
                onRemove={isCustom ? () => handleDeleteCustomFood(food) : undefined}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )

  const isActive = activeCategory === (isCustom ? 'Custom' : category)

  return (
    <>
      <motion.button
        ref={buttonRef}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`px-4 py-2 rounded-full md:rounded-lg text-sm font-medium transition-colors md:w-full md:text-left
          ${
            activeCategory === (isCustom ? 'Custom' : category)
              ? isCustom
                ? 'bg-purple-500 text-white'
                : 'bg-blue-500 text-white'
              : 'bg-white md:bg-gray-100 text-gray-600 hover:bg-gray-100 md:hover:bg-gray-200'
          }`}
        onClick={toggleCategory}
      >
        {isCustom ? 'Custom' : formatCategoryName(category)}
      </motion.button>

      {isActive && createPortal(
        <AnimatePresence mode="wait">
          {isMobile ? mobileModal : desktopDropdown}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
} 