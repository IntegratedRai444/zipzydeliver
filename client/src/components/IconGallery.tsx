import React from 'react';

// List of all available 3D product icons
const availableIcons = [
  // Food & Beverages
  { name: 'Margherita Pizza', file: 'Margherita_pizza_3D_c52eadee.png', category: 'Food' },
  { name: 'Chicken Biryani', file: 'Chicken_biryani_bowl_3D_441a1a37.png', category: 'Food' },
  { name: 'Masala Dosa', file: 'Masala_dosa_plate_3D_37f8cf83.png', category: 'Food' },
  { name: 'Vegetarian Burger', file: 'Vegetarian_burger_3D_79678194.png', category: 'Food' },
  { name: 'Paneer Butter Masala', file: 'Paneer_butter_masala_3D_3198cabf.png', category: 'Food' },
  { name: 'Chicken Tikka', file: 'Chicken_tikka_skewers_3D_8bbb3d4e.png', category: 'Food' },
  { name: 'Veg Fried Rice', file: 'Veg_fried_rice_3D_623e1b00.png', category: 'Food' },
  { name: 'Chicken Wrap', file: 'Chicken_wrap_halved_3D_ccdd72d7.png', category: 'Food' },
  { name: 'Pasta Alfredo', file: 'Pasta_alfredo_creamy_3D_bb23a4b7.png', category: 'Food' },
  { name: 'Mutton Biryani', file: 'Mutton_biryani_tender_3D_cb583a6e.png', category: 'Food' },
  
  // Beverages
  { name: 'Cold Coffee', file: 'Cold_coffee_glass_3D_6edc5772.png', category: 'Beverages' },
  { name: 'Orange Juice', file: 'Orange_juice_glass_3D_506e022c.png', category: 'Beverages' },
  { name: 'Mango Smoothie', file: 'Mango_smoothie_glass_3D_74760f4e.png', category: 'Beverages' },
  { name: 'Chocolate Milkshake', file: 'Chocolate_milkshake_glass_3D_90dece7b.png', category: 'Beverages' },
  { name: 'Green Tea', file: 'Green_tea_cup_3D_507e7adc.png', category: 'Beverages' },
  { name: 'Lemon Soda', file: 'Lemon_soda_glass_3D_8be98822.png', category: 'Beverages' },
  { name: 'Cappuccino', file: 'Cappuccino_cup_foam_3D_655873bd.png', category: 'Beverages' },
  { name: 'Fresh Lime Water', file: 'Fresh_lime_water_3D_a8d24422.png', category: 'Beverages' },
  { name: 'Masala Chai', file: 'Masala_chai_traditional_3D_a7e55707.png', category: 'Beverages' },
  { name: 'Coconut Water', file: 'Coconut_water_natural_3D_975b1347.png', category: 'Beverages' },
  
  // Groceries
  { name: 'Fresh Milk', file: 'Fresh_milk_bottle_3D_1426faed.png', category: 'Groceries' },
  { name: 'Basmati Rice', file: 'Basmati_rice_bag_3D_16898cc6.png', category: 'Groceries' },
  { name: 'Fresh Eggs', file: 'Fresh_eggs_carton_3D_4f97b5d1.png', category: 'Groceries' },
  { name: 'Cooking Oil', file: 'Cooking_oil_bottle_3D_bde43972.png', category: 'Groceries' },
  { name: 'Wheat Bread', file: 'Wheat_bread_loaf_3D_35d9d9fa.png', category: 'Groceries' },
  { name: 'Laundry Detergent', file: 'Laundry_detergent_box_3D_d0fca099.png', category: 'Groceries' },
  { name: 'Sugar', file: 'Sugar_package_crystal_3D_95d4da87.png', category: 'Groceries' },
  { name: 'Salt', file: 'Salt_package_white_3D_dcbb69d2.png', category: 'Groceries' },
  { name: 'Onions', file: 'Red_onions_fresh_3D_2fc8e1f4.png', category: 'Groceries' },
  { name: 'Potatoes', file: 'Fresh_potatoes_brown_3D_9b7bc78b.png', category: 'Groceries' },
  { name: 'Tomatoes', file: 'Fresh_tomatoes_red_3D_541f35a2.png', category: 'Groceries' },
  { name: 'Yogurt', file: 'Fresh_yogurt_creamy_3D_13c4bbcb.png', category: 'Groceries' },
  
  // Stationery
  { name: 'Notebook Set', file: 'Notebook_set_stack_3D_504a6548.png', category: 'Stationery' },
  { name: 'Ballpoint Pens', file: 'Ballpoint_pens_pack_3D_ab4ef8e3.png', category: 'Stationery' },
  { name: 'Highlighter Set', file: 'Highlighter_set_colorful_3D_047f6011.png', category: 'Stationery' },
  { name: 'Geometry Box', file: 'Geometry_box_complete_3D_3451204c.png', category: 'Stationery' },
  { name: 'Sticky Notes', file: 'Sticky_notes_colorful_3D_c1b44841.png', category: 'Stationery' },
  { name: 'A4 Paper', file: 'A4_paper_stack_3D_14cb47f8.png', category: 'Stationery' },
  { name: 'Pencil Set', file: 'Pencil_set_wooden_3D_5b4e5dda.png', category: 'Stationery' },
  { name: 'File Folders', file: 'File_folders_manila_3D_ba221b9a.png', category: 'Stationery' },
  
  // Personal Care
  { name: 'Shampoo', file: 'Shampoo_bottle_purple_3D_42a5da47.png', category: 'Personal Care' },
  { name: 'Soap Bar', file: 'Soap_bar_white_3D_535ac7e1.png', category: 'Personal Care' },
  { name: 'Toothpaste', file: 'Toothpaste_tube_white_3D_9e095e9b.png', category: 'Personal Care' },
  { name: 'Hand Sanitizer', file: 'Hand_sanitizer_pump_3D_bfb23cc2.png', category: 'Personal Care' },
  { name: 'Antiseptic Liquid', file: 'Antiseptic_liquid_bottle_3D_cda7ec09.png', category: 'Personal Care' },
  { name: 'Band-aid Pack', file: 'Band-aid_pack_medical_3D_0d7498fa.png', category: 'Personal Care' },
  { name: 'Medicine Tablets', file: 'Medicine_tablets_blister_3D_d963e477.png', category: 'Personal Care' },
  { name: 'Vitamin C', file: 'Vitamin_C_bottle_3D_633c08c9.png', category: 'Personal Care' },
  { name: 'Face Wash', file: 'Face_wash_tube_3D_b6178084.png', category: 'Personal Care' },
  { name: 'Body Lotion', file: 'Body_lotion_pump_3D_dde6d5c4.png', category: 'Personal Care' },
  { name: 'Deodorant', file: 'Deodorant_spray_can_3D_461d1bd4.png', category: 'Personal Care' },
  { name: 'Toothbrush', file: 'Toothbrush_soft_bristle_3D_ca75ecfb.png', category: 'Personal Care' },
  
  // Electronics
  { name: 'Digital Thermometer', file: 'Digital_thermometer_medical_3D_d4653a47.png', category: 'Electronics' },
  { name: 'Phone Charger Cable', file: 'USB_charging_cable_3D_cdf3ba45.png', category: 'Electronics' },
  { name: 'Power Bank', file: 'Power_bank_black_3D_c180205c.png', category: 'Electronics' },
  { name: 'Bluetooth Earphones', file: 'Bluetooth_earphones_wireless_3D_fda99d26.png', category: 'Electronics' },
  { name: 'Phone Case', file: 'Phone_case_protective_3D_b8071670.png', category: 'Electronics' },
  { name: 'Screen Guard', file: 'Screen_guard_tempered_3D_c51cb72a.png', category: 'Electronics' },
  { name: 'USB Flash Drive', file: 'USB_flash_drive_3D_0d429f44.png', category: 'Electronics' },
  { name: 'Computer Mouse', file: 'Computer_mouse_wireless_3D_80acc1f0.png', category: 'Electronics' },
  { name: 'Keyboard', file: 'Keyboard_mechanical_black_3D_d5a8746c.png', category: 'Electronics' },
  { name: 'Webcam', file: 'HD_webcam_modern_3D_11022b83.png', category: 'Electronics' },
  { name: 'Speaker', file: 'Bluetooth_speaker_portable_3D_fc9d5e95.png', category: 'Electronics' },
  { name: 'Memory Card', file: 'Memory_card_microSD_3D_439bedef.png', category: 'Electronics' },
  
  // Snacks
  { name: 'Potato Chips', file: 'Potato_chips_bag_3D_769fb315.png', category: 'Snacks' },
  { name: 'Chocolate Bar', file: 'Chocolate_bar_milk_3D_ba9d92e4.png', category: 'Snacks' },
  { name: 'Biscuit Pack', file: 'Biscuit_pack_cream_3D_9a5aa14b.png', category: 'Snacks' },
  { name: 'Granola Bar', file: 'Granola_bar_healthy_3D_47a0d084.png', category: 'Snacks' },
  { name: 'Ice Cream Cup', file: 'Ice_cream_cup_vanilla_3D_57fda7dc.png', category: 'Snacks' }
];

export default function IconGallery() {
  const getImageUrl = (filename: string) => {
    try {
      return new URL(`../../../attached_assets/generated_images/${filename}`, import.meta.url).href;
    } catch {
      return `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop`;
    }
  };

  const categories = Array.from(new Set(availableIcons.map(icon => icon.category)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">🎨 3D Product Icons Gallery</h1>
          <p className="text-xl text-purple-200">
            All available 3D product icons for Zipzy Delivery App
          </p>
        </div>

        {categories.map(category => (
          <div key={category} className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 border-b border-purple-500 pb-2">
              {category} ({availableIcons.filter(icon => icon.category === category).length} icons)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {availableIcons
                .filter(icon => icon.category === category)
                .map(icon => (
                  <div key={icon.file} className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-center hover:bg-white/20 transition-all">
                    <div className="w-full h-32 mb-3 rounded-lg overflow-hidden bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                      <img
                        src={getImageUrl(icon.file)}
                        alt={icon.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop";
                        }}
                      />
                    </div>
                    <h3 className="text-sm font-medium text-white mb-1">{icon.name}</h3>
                    <p className="text-xs text-purple-200">{icon.file}</p>
                  </div>
                ))}
            </div>
          </div>
        ))}

        <div className="text-center mt-12 p-6 bg-white/10 backdrop-blur-md rounded-xl">
          <h3 className="text-xl font-bold text-white mb-2">📊 Summary</h3>
          <p className="text-purple-200">
            Total 3D Icons Available: <span className="font-bold text-white">{availableIcons.length}</span>
          </p>
          <p className="text-purple-200">
            Categories: <span className="font-bold text-white">{categories.join(', ')}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
