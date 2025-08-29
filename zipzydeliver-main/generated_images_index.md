# Generated Product Images Index - Zipzy Delivery App

This file contains an index of all custom 3D product images generated for the Zipzy delivery application.

## Food Category Icons

| Product Name | Image File | Path |
|--------------|------------|------|
| Margherita Pizza | Margherita_pizza_3D_c52eadee.png | @assets/generated_images/Margherita_pizza_3D_c52eadee.png |
| Chicken Biryani | Chicken_biryani_bowl_3D_441a1a37.png | @assets/generated_images/Chicken_biryani_bowl_3D_441a1a37.png |
| Masala Dosa | Masala_dosa_plate_3D_37f8cf83.png | @assets/generated_images/Masala_dosa_plate_3D_37f8cf83.png |
| Vegetarian Burger | Vegetarian_burger_3D_79678194.png | @assets/generated_images/Vegetarian_burger_3D_79678194.png |
| Paneer Butter Masala | Paneer_butter_masala_3D_3198cabf.png | @assets/generated_images/Paneer_butter_masala_3D_3198cabf.png |
| Chicken Tikka | Chicken_tikka_skewers_3D_8bbb3d4e.png | @assets/generated_images/Chicken_tikka_skewers_3D_8bbb3d4e.png |
| Veg Fried Rice | Veg_fried_rice_3D_623e1b00.png | @assets/generated_images/Veg_fried_rice_3D_623e1b00.png |
| Chicken Wrap | Chicken_wrap_halved_3D_ccdd72d7.png | @assets/generated_images/Chicken_wrap_halved_3D_ccdd72d7.png |

## Beverage Category Icons

| Product Name | Image File | Path |
|--------------|------------|------|
| Cold Coffee | Cold_coffee_glass_3D_6edc5772.png | @assets/generated_images/Cold_coffee_glass_3D_6edc5772.png |
| Fresh Orange Juice | Orange_juice_glass_3D_506e022c.png | @assets/generated_images/Orange_juice_glass_3D_506e022c.png |
| Mango Smoothie | Mango_smoothie_glass_3D_74760f4e.png | @assets/generated_images/Mango_smoothie_glass_3D_74760f4e.png |
| Chocolate Milkshake | Chocolate_milkshake_glass_3D_90dece7b.png | @assets/generated_images/Chocolate_milkshake_glass_3D_90dece7b.png |

## Grocery Category Icons

| Product Name | Image File | Path |
|--------------|------------|------|
| Fresh Eggs | Fresh_eggs_carton_3D_4f97b5d1.png | @assets/generated_images/Fresh_eggs_carton_3D_4f97b5d1.png |
| Cooking Oil | Cooking_oil_bottle_3D_bde43972.png | @assets/generated_images/Cooking_oil_bottle_3D_bde43972.png |
| Fresh Milk | Fresh_milk_bottle_3D_1426faed.png | @assets/generated_images/Fresh_milk_bottle_3D_1426faed.png |
| Basmati Rice | Basmati_rice_bag_3D_16898cc6.png | @assets/generated_images/Basmati_rice_bag_3D_16898cc6.png |
| Wheat Bread | Wheat_bread_loaf_3D_35d9d9fa.png | @assets/generated_images/Wheat_bread_loaf_3D_35d9d9fa.png |
| Onions | Red_onions_fresh_3D_2fc8e1f4.png | @assets/generated_images/Red_onions_fresh_3D_2fc8e1f4.png |
| Potatoes | Fresh_potatoes_brown_3D_9b7bc78b.png | @assets/generated_images/Fresh_potatoes_brown_3D_9b7bc78b.png |

## Stationery Category Icons

| Product Name | Image File | Path |
|--------------|------------|------|
| Notebook Set | Notebook_set_stack_3D_504a6548.png | @assets/generated_images/Notebook_set_stack_3D_504a6548.png |
| Ballpoint Pens | Ballpoint_pens_pack_3D_ab4ef8e3.png | @assets/generated_images/Ballpoint_pens_pack_3D_ab4ef8e3.png |
| Highlighter Set | Highlighter_set_colorful_3D_047f6011.png | @assets/generated_images/Highlighter_set_colorful_3D_047f6011.png |
| Geometry Box | Geometry_box_complete_3D_3451204c.png | @assets/generated_images/Geometry_box_complete_3D_3451204c.png |

## Personal Care Category Icons

| Product Name | Image File | Path |
|--------------|------------|------|
| Shampoo Bottle | Shampoo_bottle_purple_3D_42a5da47.png | @assets/generated_images/Shampoo_bottle_purple_3D_42a5da47.png |
| Toothpaste Tube | Toothpaste_tube_white_3D_9e095e9b.png | @assets/generated_images/Toothpaste_tube_white_3D_9e095e9b.png |
| Soap Bar | Soap_bar_white_3D_535ac7e1.png | @assets/generated_images/Soap_bar_white_3D_535ac7e1.png |
| Hand Sanitizer | Hand_sanitizer_pump_3D_bfb23cc2.png | @assets/generated_images/Hand_sanitizer_pump_3D_bfb23cc2.png |

## Electronics Category Icons

| Product Name | Image File | Path |
|--------------|------------|------|
| Digital Thermometer | Digital_thermometer_medical_3D_d4653a47.png | @assets/generated_images/Digital_thermometer_medical_3D_d4653a47.png |
| Power Bank | Power_bank_black_3D_c180205c.png | @assets/generated_images/Power_bank_black_3D_c180205c.png |

## Snacks Category Icons

| Product Name | Image File | Path |
|--------------|------------|------|
| Potato Chips | Potato_chips_bag_3D_769fb315.png | @assets/generated_images/Potato_chips_bag_3D_769fb315.png |

## Usage Instructions

1. **Frontend Integration**: Use the @assets alias path for importing images in React components
2. **Database Updates**: Run the `product_images_mapping.sql` file to update all product image URLs
3. **Image Management**: All generated images are stored in `attached_assets/generated_images/`
4. **Vite Configuration**: The @assets alias is configured in `vite.config.ts` to point to `attached_assets`

## Example Frontend Usage

```jsx
import pizzaImage from '@assets/generated_images/Margherita_pizza_3D_c52eadee.png';

function ProductCard({ product }) {
  return (
    <div className="product-card">
      <img src={product.image_url} alt={product.name} />
      <h3>{product.name}</h3>
    </div>
  );
}
```

## Image Specifications

- **Format**: PNG with transparency support
- **Aspect Ratio**: 1:1 (Square)
- **Background**: Clean white or transparent
- **Style**: 3D rendered, photorealistic
- **Quality**: High resolution suitable for web display
- **Lighting**: Professional studio lighting with soft shadows