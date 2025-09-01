import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface CategoryGridProps {
  onCategorySelect: (categoryId: string) => void;
  selectedCategory: string;
}

const categoryIcons: Record<string, string> = {
  "food": "M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7",
  "stationery": "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z",
  "essentials": "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
  "beverages": "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z",
  "snacks": "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  "services": "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
};

const categoryColors: Record<string, string> = {
  "food": "bg-yellow-500",
  "stationery": "bg-blue-500", 
  "essentials": "bg-teal-500",
  "beverages": "bg-indigo-500",
  "snacks": "bg-orange-500",
  "services": "bg-purple-500"
};

export default function CategoryGrid({ onCategorySelect, selectedCategory }: CategoryGridProps) {
  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories']
  });

  // Ensure categories is always an array
  const safeCategories = Array.isArray(categories) ? categories : [];

  if (isLoading) {
    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">Categories</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center p-4 bg-card rounded-xl border border-border">
              <Skeleton className="w-12 h-12 rounded-full mb-2" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleCategoryClick = (categoryId: string) => {
    if (selectedCategory === categoryId) {
      onCategorySelect(""); // Deselect if already selected
    } else {
      onCategorySelect(categoryId);
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Categories</h3>
        {selectedCategory && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onCategorySelect("")}
            data-testid="button-clear-category"
          >
            Clear Filter
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {safeCategories.map((category) => {
          const iconPath = categoryIcons[category.name.toLowerCase()] || categoryIcons["essentials"];
          const colorClass = categoryColors[category.name.toLowerCase()] || "bg-purple-500";
          const isSelected = selectedCategory === category.id;
          
          return (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className={`flex flex-col items-center p-6 rounded-2xl transition-all duration-300 ${
                isSelected 
                  ? "glass-intense scale-105 glow-purple" 
                  : "glass-card hover:scale-105 card-hover"
              }`}
              data-testid={`button-category-${category.name.toLowerCase()}`}
            >
              <div className={`${colorClass} text-white rounded-2xl p-4 mb-3 ${isSelected ? 'pulse-glow' : ''} hover:scale-110 transition-transform duration-300`}>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={iconPath}></path>
                </svg>
              </div>
              <span className={`text-sm font-medium ${isSelected ? 'gradient-text' : 'text-foreground'}`}>
                {category.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
