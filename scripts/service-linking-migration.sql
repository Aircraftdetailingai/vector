-- Service Products Linking Table
-- Links services to products from inventory with quantity per service hour or fixed quantity
CREATE TABLE IF NOT EXISTS service_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_per_hour DECIMAL(10,2) DEFAULT 0,
  fixed_quantity DECIMAL(10,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_products_service ON service_products(service_id);
CREATE INDEX IF NOT EXISTS idx_service_products_product ON service_products(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_products_unique ON service_products(service_id, product_id);

-- Service Equipment Linking Table
-- Links services to equipment/tools needed
CREATE TABLE IF NOT EXISTS service_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_equipment_service ON service_equipment(service_id);
CREATE INDEX IF NOT EXISTS idx_service_equipment_equipment ON service_equipment(equipment_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_equipment_unique ON service_equipment(service_id, equipment_id);
