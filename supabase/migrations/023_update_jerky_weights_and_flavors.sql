update products
set
  flavors = case
    when flavors is null then null
    else array_replace(flavors, 'BBQ', 'Tangy Sweet')
  end,
  weight_options = array[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0],
  jerky_flavor_stock = case
    when jerky_flavor_stock ? 'BBQ'
      then (jerky_flavor_stock - 'BBQ') || jsonb_build_object('Tangy Sweet', jerky_flavor_stock->'BBQ')
    else jerky_flavor_stock
  end,
  jerky_flavor_thresholds = case
    when jerky_flavor_thresholds ? 'BBQ'
      then (jerky_flavor_thresholds - 'BBQ') || jsonb_build_object('Tangy Sweet', jerky_flavor_thresholds->'BBQ')
    else jerky_flavor_thresholds
  end
where category = 'jerky';
