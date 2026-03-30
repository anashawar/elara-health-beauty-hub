-- Create Yas Warehouse
INSERT INTO public.warehouses (name, location, is_active)
VALUES ('Yas Warehouse', 'Iraq', true);

-- Create warehouse user 'yas' with hashed password
INSERT INTO public.warehouse_users (username, full_name, password_hash, warehouse_id, is_active)
VALUES (
  'yas',
  'Yas Warehouse Admin',
  public.hash_warehouse_password('Yas@12345'),
  (SELECT id FROM public.warehouses WHERE name = 'Yas Warehouse' LIMIT 1),
  true
);