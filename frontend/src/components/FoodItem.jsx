import { useDrag } from 'react-dnd'
import { motion } from 'framer-motion'

export default function FoodItem({ id, text, onRemove, isDraggable = true }) {
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