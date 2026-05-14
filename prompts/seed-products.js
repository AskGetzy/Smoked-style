module.exports =
  "Create a seed file at supabase/seed.sql that inserts all products into the products table.\n\n" +
  "JERKY (category: jerky, sold_as: per_lb):\n" +
  "- Price: $100/lb for all flavors\n" +
  "- Flavors array: ['General Tso', 'Sweet And Spicy', 'Jalapeno', 'Pepper Crust', 'BBQ', 'Teriyaki']\n" +
  "- Weight options array: [0.5,1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,6.5,7,7.5,8,8.5,9,9.5,10]\n" +
  "- One product row covers all flavors and weights\n\n" +
  "STEAKS (category: steaks, sold_as: per_piece except Skirt Steak):\n" +
  "- Hanger Steak: $200\n" +
  "- Oyster Steak: $30\n" +
  "- Rib Roast: $500\n" +
  "- Skirt Steak: $200, sold_as: per_pack, pack_size: 4\n" +
  "- Surprise Steak: $200\n\n" +
  "JERKY BOARDS (category: boards, subcategory: jerky_board, sold_as: per_board):\n" +
  "- Description: Comes with 3 flavors jerky and some charcuterie\n" +
  "- 8x12: $80\n" +
  "- 10x15: $125\n" +
  "- 12x18: $200\n" +
  "Create one product row per size.\n\n" +
  "MEAT BOARDS (category: boards, subcategory: meat_board, sold_as: per_board):\n" +
  "- Description: Comes with tongue, charcuterie, jerky, smoked meat, steak and more\n" +
  "- 8x12: $100\n" +
  "- 10x15: $175\n" +
  "- 12x18: $250\n" +
  "- 18x26: $500\n" +
  "- 18x52: $1000\n" +
  "- 18x52 with 1 elevated round tray: $1500\n" +
  "- 18x52 with 2 elevated round trays: $2000\n\n" +
  "STEAK BOARDS (category: boards, subcategory: steak_board, sold_as: per_board):\n" +
  "- Description: Comes with skirt steak, surprise steak, oyster steak, beef wellington and some jerky\n" +
  "- 8x12: $185\n" +
  "- 10x15: $275\n" +
  "- 12x18: $400\n\n" +
  "CARPACCIO (category: boards, subcategory: carpaccio, sold_as: per_board):\n" +
  "- 14x14 Tray, comes with few sauces on the side: $75\n\n" +
  "SMOKED (category: smoked, sold_as: per_piece or per_pan as noted):\n" +
  "- Smoked Brisket 2nd Cut: $75, per_piece, desc: Smaller piece about 2 lbs\n" +
  "- Smoked Brisket Large: $350, per_piece, desc: One big piece 10-15 lbs\n" +
  "- Smoked Chicken Wings: $90, per_pan, desc: 9x13 pan with sweet and spicy sauce\n" +
  "- Smoked Flanken Roast Boneless: $125, per_piece, desc: Real flanken smoked with light sauce glaze\n" +
  "- Smoked Flanken 3 Bones: $350, per_piece, desc: Smoked flanken roast with sauce\n" +
  "- Smoked French Roast: $125, per_piece, desc: Soft but not too fatty, great eaten cold\n" +
  "- Smoked Lamb Riblets: $75, per_piece, desc: One of the best cuts, fatty and very tender\n" +
  "- Smoked Lamb Side: $450, per_piece, desc: Full lamb side smoked with herbs and spices, about 15-20 lbs\n" +
  "- Smoked Pastrami Brisket: $500, per_piece, desc: One of our best sellers, big piece about 15 lbs\n" +
  "- Smoked Pulled Meat: $110, per_pan, desc: Smoked pulled flanken meat with sauce, great for events\n" +
  "- Smoked Pulled Meat With Gnocchi: $150, per_pan, desc: Smoked pulled flanken with gnocchi and special sauce\n" +
  "- Smoked Rack Of Lamb: $300, per_piece, desc: Lamb ribs smoked to medium\n" +
  "- Smoked Rib Roast: $500, per_piece, desc: About 15 lb rib roast smoked to medium, great for carving\n" +
  "- Smoked Veal Roast: $450, per_piece, desc: Smoked veal neck roast, soft and tasty\n\n" +
  "NON-SMOKED (category: non_smoked):\n" +
  "- Beef Tongue: $250, per_piece, desc: 1 big non-smoked beef tongue, soft and fatty\n" +
  "- Beef Wellington: $150, per_piece, desc: Lean steak wrapped with mushrooms, charcuterie and flaky dough\n" +
  "- Beef Wellington Large: $400, per_piece, desc: Large beef wellington for bigger families or carving stations\n" +
  "- Finger Meat: $100, per_pan, desc: Non-smoked finger meat, soft and tasty, with sauce\n\n" +
  "DELIVERY AREAS (insert into delivery_areas table):\n" +
  "- Williamsburg: $30\n" +
  "- Boro Park: $30\n" +
  "- Monsey: $30\n" +
  "- Lakewood: $30\n" +
  "- Monroe: $30\n" +
  "- 5 Towns: $30\n" +
  "- Catskills: $30\n" +
  "- Other: $30 (admin sets actual fee per order)\n" +
  "- Personal Delivery: $0, is_backend_only: true\n" +
  "- Uber: $0, is_backend_only: true";
