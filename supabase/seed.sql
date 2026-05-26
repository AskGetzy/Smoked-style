-- Delivery areas
insert into delivery_areas (name, delivery_fee, is_backend_only) values
  ('Williamsburg', 30, false),
  ('Boro Park', 30, false),
  ('Crown Heights', 30, false),
  ('Flatbush', 30, false),
  ('Five Towns', 45, false),
  ('Lakewood', 45, false),
  ('Monsey', 50, false),
  ('Teaneck / Bergenfield', 45, false),
  ('Personal Delivery', 0, true),
  ('Uber', 0, true);

-- Products: Jerky
insert into products (name, description, category, price, customer_inquiry_only, sold_as, flavors, weight_options, stock_quantity, low_stock_threshold) values
  ('Premium Beef Jerky', 'House-smoked, hand-pulled beef jerky in 6 signature flavors', 'jerky', 100, false, 'per_lb',
   array['General Tso', 'Tangy Sweet', 'Teriyaki', 'Spicy', 'Original', 'Honey'],
   array[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0], 50, 5),
  ('Charcutrie', 'House-crafted charcutrie sliced fresh and sold by the pound', 'jerky', 100, false, 'per_lb',
   array['Original'],
   array[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0], 50, 5),
  ('Wholesale Jerky', 'Bulk jerky sold through direct inquiry and special wholesale orders', 'jerky', 75, true, 'per_lb',
   array['Original'],
   array[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0], 50, 5);

-- Products: Steaks
insert into products (name, description, category, price, sold_as, pack_size, stock_quantity, low_stock_threshold) values
  ('Skirt Steak', 'Premium marinated skirt steak, sold in packs of 4', 'steaks', 85, 'per_pack', 4, 20, 3),
  ('Rib Eye Steak', 'USDA choice rib eye, perfectly seasoned', 'steaks', 120, 'per_piece', null, 15, 3),
  ('Center Cut Rib Eye', 'Thick-cut center rib eye with rich marbling and bold steakhouse flavor', 'steaks', 250, 'per_piece', null, 12, 3),
  ('Flat Iron Steak', 'Tender flat iron steak with deep beefy flavor, perfect for grilling', 'steaks', 65, 'per_piece', null, 18, 4),
  ('Tomahawk Steak', 'Large bone-in tomahawk steak for an impressive centerpiece', 'steaks', 200, 'per_piece', null, 10, 2),
  ('London Broil', 'Marinated and smoked London broil', 'steaks', 75, 'per_piece', null, 20, 4);

-- Products: Smoked
insert into products (name, description, category, subcategory, price, sold_as, weight_options, size_label, stock_quantity, low_stock_threshold) values
  ('Smoked Brisket', 'Low and slow smoked brisket, whole or sliced', 'smoked', null, 180, 'per_piece', null, null, 10, 2),
  ('Lamb Roast Roll', 'Smoked lamb roast roll, ready for carving and serving', 'smoked', null, 250, 'per_piece', null, null, 10, 2),
  ('Smoked Pastrami', 'New York-style smoked pastrami', 'smoked', null, 90, 'per_piece', null, null, 15, 3),
  ('Smoked Pastrami Thin Sliced', 'Thin-sliced smoked pastrami sold by the pound', 'smoked', null, 50, 'per_lb', array[1, 2, 3, 4, 5], null, 25, 5),
  ('Smoked Rib Eye Boneless', 'Smoked boneless rib eye roast, ready for carving and serving', 'smoked', null, 500, 'per_piece', null, null, 8, 2),
  ('Smoked Turkey Breast', 'Whole smoked turkey breast', 'smoked', null, 95, 'per_piece', null, null, 12, 3),
  ('Smoked Pulled Chicken', 'Tender smoked pulled chicken', 'smoked', null, 65, 'per_piece', null, null, 20, 4),
  ('Smoked Flanken Roast Boneless', 'Boneless smoked flanken roast with selectable cut options', 'smoked', 'smoked_flanken_roast_boneless', 125, 'per_piece', null, '3 Bone Cut (Boneless)', 12, 3),
  ('Smoked Flanken Roast Boneless', 'Boneless smoked flanken roast with selectable cut options', 'smoked', 'smoked_flanken_roast_boneless', 200, 'per_piece', null, '3+5 Bone Cut (Boneless)', 10, 2),
  ('Smoked Flanken Roast Boneless', 'Boneless smoked flanken roast with selectable cut options', 'smoked', 'smoked_flanken_roast_boneless', 100, 'per_piece', null, '5 Bone Cut (Boneless)', 12, 3);

-- Products: Non-Smoked
insert into products (name, description, category, price, sold_as, stock_quantity, low_stock_threshold) values
  ('Garlic Chicken', 'Roasted garlic chicken, whole', 'non_smoked', 55, 'per_piece', 20, 4),
  ('Honey Glazed Salmon', 'Wild-caught salmon with honey glaze', 'non_smoked', 70, 'per_piece', 15, 3),
  ('Stuffed Chicken Breast', 'Spinach and mushroom stuffed chicken', 'non_smoked', 65, 'per_piece', 18, 4),
  ('Minute Roast', 'Tender minute roast prepared for quick roasting and easy serving', 'non_smoked', 75, 'per_piece', 18, 4),
  ('9x13 Pulled Beef Gnocchi', 'Pulled beef gnocchi prepared in a 9x13 pan for family-style serving', 'non_smoked', 150, 'per_pan', 12, 3);

-- Products: Boards
insert into products (name, description, category, subcategory, price, sold_as, size_label, stock_quantity, low_stock_threshold) values
  ('Meat Board — Small', 'Curated selection of smoked meats and accompaniments', 'boards', 'meat_board', 150, 'per_board', '8x12', 10, 2),
  ('Meat Board — Large', 'Grand curated selection of smoked meats', 'boards', 'meat_board', 250, 'per_board', '12x18', 8, 2),
  ('Jerky Board', 'Assorted jerky flavors beautifully presented', 'boards', 'jerky_board', 120, 'per_board', '10x14', 12, 3),
  ('Steak Board', 'Premium steak cuts with sauces and sides', 'boards', 'steak_board', 200, 'per_board', '10x16', 8, 2),
  ('Carpaccio Board', 'Thinly sliced cured meats, artisan style', 'jerky', 'carpaccio', 135, 'per_board', '10x14', 10, 2);
