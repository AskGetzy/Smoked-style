update products
set
  flavors = array['General Tso', 'Tangy Sweet', 'Teriyaki', 'Spicy', 'Original', 'Honey'],
  weight_options = array[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0],
  is_in_stock = true,
  is_customer_visible = true,
  stock_quantity = greatest(coalesce(stock_quantity, 0), 50),
  jerky_flavor_stock = jsonb_build_object(
    'General Tso', greatest(coalesce((coalesce(jerky_flavor_stock, '{}'::jsonb)->>'General Tso')::numeric, greatest(coalesce(stock_quantity, 0), 50)), 0.25),
    'Tangy Sweet', greatest(coalesce((coalesce(jerky_flavor_stock, '{}'::jsonb)->>'Tangy Sweet')::numeric, (coalesce(jerky_flavor_stock, '{}'::jsonb)->>'BBQ')::numeric, greatest(coalesce(stock_quantity, 0), 50)), 0.25),
    'Teriyaki', greatest(coalesce((coalesce(jerky_flavor_stock, '{}'::jsonb)->>'Teriyaki')::numeric, greatest(coalesce(stock_quantity, 0), 50)), 0.25),
    'Spicy', greatest(coalesce((coalesce(jerky_flavor_stock, '{}'::jsonb)->>'Spicy')::numeric, greatest(coalesce(stock_quantity, 0), 50)), 0.25),
    'Original', greatest(coalesce((coalesce(jerky_flavor_stock, '{}'::jsonb)->>'Original')::numeric, greatest(coalesce(stock_quantity, 0), 50)), 0.25),
    'Honey', greatest(coalesce((coalesce(jerky_flavor_stock, '{}'::jsonb)->>'Honey')::numeric, greatest(coalesce(stock_quantity, 0), 50)), 0.25)
  ),
  jerky_flavor_thresholds = jsonb_build_object(
    'General Tso', greatest(coalesce((coalesce(jerky_flavor_thresholds, '{}'::jsonb)->>'General Tso')::numeric, coalesce(low_stock_threshold, 5)), 0),
    'Tangy Sweet', greatest(coalesce((coalesce(jerky_flavor_thresholds, '{}'::jsonb)->>'Tangy Sweet')::numeric, (coalesce(jerky_flavor_thresholds, '{}'::jsonb)->>'BBQ')::numeric, coalesce(low_stock_threshold, 5)), 0),
    'Teriyaki', greatest(coalesce((coalesce(jerky_flavor_thresholds, '{}'::jsonb)->>'Teriyaki')::numeric, coalesce(low_stock_threshold, 5)), 0),
    'Spicy', greatest(coalesce((coalesce(jerky_flavor_thresholds, '{}'::jsonb)->>'Spicy')::numeric, coalesce(low_stock_threshold, 5)), 0),
    'Original', greatest(coalesce((coalesce(jerky_flavor_thresholds, '{}'::jsonb)->>'Original')::numeric, coalesce(low_stock_threshold, 5)), 0),
    'Honey', greatest(coalesce((coalesce(jerky_flavor_thresholds, '{}'::jsonb)->>'Honey')::numeric, coalesce(low_stock_threshold, 5)), 0)
  )
where category = 'jerky'
  and name = 'Premium Beef Jerky';
