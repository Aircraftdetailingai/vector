-- Aircraft pricing table with surface area data for precision quoting
CREATE TABLE IF NOT EXISTS aircraft (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('piston', 'turboprop', 'light_jet', 'midsize_jet', 'super_midsize_jet', 'large_jet', 'helicopter')),
  seats INT,
  wingspan_ft DECIMAL(6,2),
  length_ft DECIMAL(6,2),
  footprint_sqft DECIMAL(8,2) GENERATED ALWAYS AS (wingspan_ft * length_ft) STORED,
  surface_area_sqft DECIMAL(8,2),
  ext_wash_hours DECIMAL(4,2),
  int_detail_hours DECIMAL(4,2),
  leather_hours DECIMAL(4,2),
  carpet_hours DECIMAL(4,2),
  wax_hours DECIMAL(4,2),
  polish_hours DECIMAL(4,2),
  ceramic_hours DECIMAL(4,2),
  brightwork_hours DECIMAL(4,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(manufacturer, model)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_aircraft_manufacturer ON aircraft(manufacturer);
CREATE INDEX IF NOT EXISTS idx_aircraft_category ON aircraft(category);

-- Add quote display preference to detailers
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS quote_display_preference TEXT DEFAULT 'package' CHECK (quote_display_preference IN ('package', 'labor_products', 'full_breakdown'));

-- Add fcm_token column if not exists
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Seed aircraft data
INSERT INTO aircraft (manufacturer, model, category, seats, wingspan_ft, length_ft, surface_area_sqft, ext_wash_hours, int_detail_hours, leather_hours, carpet_hours, wax_hours, polish_hours, ceramic_hours, brightwork_hours) VALUES

-- PISTONS
('Cessna', '172 Skyhawk', 'piston', 4, 36.1, 27.2, 619, 1.5, 1.0, 0.5, 0.5, 2.0, 3.0, 4.0, 0.5),
('Cessna', '182 Skylane', 'piston', 4, 36.0, 29.0, 700, 1.75, 1.25, 0.5, 0.5, 2.25, 3.5, 4.5, 0.5),
('Cessna', '206 Stationair', 'piston', 6, 36.0, 28.5, 750, 2.0, 1.5, 0.75, 0.75, 2.5, 4.0, 5.0, 0.5),
('Cessna', 'TTx', 'piston', 4, 36.0, 25.2, 650, 1.75, 1.0, 0.5, 0.5, 2.0, 3.0, 4.0, 0.5),
('Cirrus', 'SR20', 'piston', 4, 38.3, 26.0, 550, 1.5, 1.0, 0.5, 0.5, 1.75, 2.75, 3.5, 0.5),
('Cirrus', 'SR22', 'piston', 4, 38.3, 26.0, 585, 1.5, 1.0, 0.5, 0.5, 1.75, 2.75, 3.5, 0.5),
('Cirrus', 'SR22T', 'piston', 4, 38.3, 26.0, 585, 1.5, 1.0, 0.5, 0.5, 1.75, 2.75, 3.5, 0.5),
('Piper', 'Cherokee', 'piston', 4, 32.3, 23.8, 500, 1.25, 0.75, 0.5, 0.5, 1.5, 2.5, 3.0, 0.5),
('Piper', 'Archer', 'piston', 4, 35.4, 24.0, 550, 1.5, 1.0, 0.5, 0.5, 1.75, 2.75, 3.5, 0.5),
('Piper', 'Saratoga', 'piston', 6, 36.2, 27.7, 700, 1.75, 1.25, 0.75, 0.75, 2.25, 3.5, 4.5, 0.5),
('Piper', 'Malibu', 'piston', 6, 43.0, 28.9, 850, 2.0, 1.5, 0.75, 0.75, 2.5, 4.0, 5.0, 0.75),
('Piper', 'M350', 'piston', 6, 43.0, 28.9, 850, 2.0, 1.5, 0.75, 0.75, 2.5, 4.0, 5.0, 0.75),
('Beechcraft', 'Bonanza A36', 'piston', 6, 33.5, 27.5, 650, 1.75, 1.25, 0.5, 0.5, 2.0, 3.25, 4.0, 0.5),
('Beechcraft', 'Bonanza G36', 'piston', 6, 33.5, 27.5, 650, 1.75, 1.25, 0.5, 0.5, 2.0, 3.25, 4.0, 0.5),
('Beechcraft', 'Baron 58', 'piston', 6, 37.8, 29.8, 800, 2.0, 1.5, 0.75, 0.75, 2.5, 4.0, 5.0, 0.75),
('Mooney', 'M20', 'piston', 4, 36.1, 26.8, 575, 1.5, 1.0, 0.5, 0.5, 1.75, 2.75, 3.5, 0.5),
('Diamond', 'DA40', 'piston', 4, 39.2, 26.3, 600, 1.5, 1.0, 0.5, 0.5, 1.75, 2.75, 3.5, 0.5),
('Diamond', 'DA62', 'piston', 7, 47.9, 30.2, 900, 2.25, 1.75, 1.0, 1.0, 3.0, 4.5, 5.5, 0.75),

-- TURBOPROPS
('Beechcraft', 'King Air 90', 'turboprop', 8, 50.3, 35.5, 750, 3.0, 2.5, 1.5, 1.0, 4.0, 5.5, 7.0, 1.0),
('Beechcraft', 'King Air 200', 'turboprop', 9, 54.5, 43.8, 800, 3.5, 3.0, 1.75, 1.25, 4.5, 6.0, 7.5, 1.25),
('Beechcraft', 'King Air 250', 'turboprop', 9, 57.9, 43.8, 850, 3.75, 3.25, 2.0, 1.5, 4.75, 6.5, 8.0, 1.25),
('Beechcraft', 'King Air 350', 'turboprop', 11, 57.9, 46.7, 900, 4.0, 3.5, 2.0, 1.5, 5.0, 7.0, 8.5, 1.5),
('Beechcraft', 'King Air 360', 'turboprop', 11, 57.9, 46.7, 900, 4.0, 3.5, 2.0, 1.5, 5.0, 7.0, 8.5, 1.5),
('Pilatus', 'PC-12', 'turboprop', 9, 53.3, 47.3, 800, 3.5, 3.0, 1.75, 1.25, 4.5, 6.0, 7.5, 1.0),
('Pilatus', 'PC-12 NGX', 'turboprop', 9, 53.3, 47.3, 800, 3.5, 3.0, 1.75, 1.25, 4.5, 6.0, 7.5, 1.0),
('Cessna', 'Caravan', 'turboprop', 14, 52.1, 41.6, 750, 3.25, 2.75, 1.5, 1.0, 4.25, 5.75, 7.0, 1.0),
('Cessna', 'Grand Caravan EX', 'turboprop', 14, 52.1, 44.0, 800, 3.5, 3.0, 1.75, 1.25, 4.5, 6.0, 7.5, 1.0),
('Daher', 'TBM 900', 'turboprop', 6, 42.1, 35.2, 700, 2.75, 2.25, 1.25, 1.0, 3.75, 5.0, 6.5, 0.75),
('Daher', 'TBM 930', 'turboprop', 6, 42.1, 35.2, 700, 2.75, 2.25, 1.25, 1.0, 3.75, 5.0, 6.5, 0.75),
('Daher', 'TBM 960', 'turboprop', 6, 42.1, 35.8, 700, 2.75, 2.25, 1.25, 1.0, 3.75, 5.0, 6.5, 0.75),
('Piper', 'M600', 'turboprop', 6, 43.2, 33.3, 750, 2.75, 2.25, 1.25, 1.0, 3.75, 5.0, 6.5, 0.75),
('Piaggio', 'Avanti EVO', 'turboprop', 9, 46.1, 47.3, 950, 3.75, 3.25, 2.0, 1.5, 5.0, 6.5, 8.0, 1.25),

-- LIGHT JETS
('Cessna', 'Citation M2', 'light_jet', 7, 47.3, 42.6, 1700, 3.5, 2.5, 1.5, 1.0, 5.0, 7.0, 10.0, 1.0),
('Cessna', 'Citation CJ2', 'light_jet', 8, 49.0, 47.7, 1800, 3.75, 2.75, 1.75, 1.25, 5.5, 7.5, 11.0, 1.0),
('Cessna', 'Citation CJ3', 'light_jet', 9, 53.3, 51.2, 1900, 4.0, 3.0, 2.0, 1.5, 6.0, 8.0, 12.0, 1.25),
('Cessna', 'Citation CJ3+', 'light_jet', 9, 53.3, 51.2, 1900, 4.0, 3.0, 2.0, 1.5, 6.0, 8.0, 12.0, 1.25),
('Cessna', 'Citation CJ4', 'light_jet', 10, 53.3, 53.3, 2100, 4.5, 3.5, 2.25, 1.75, 6.5, 9.0, 13.0, 1.5),
('Embraer', 'Phenom 100', 'light_jet', 6, 40.4, 42.1, 1600, 3.25, 2.25, 1.25, 1.0, 4.5, 6.5, 9.5, 0.75),
('Embraer', 'Phenom 100EV', 'light_jet', 6, 40.4, 42.1, 1600, 3.25, 2.25, 1.25, 1.0, 4.5, 6.5, 9.5, 0.75),
('Embraer', 'Phenom 300', 'light_jet', 10, 52.2, 51.2, 2100, 4.5, 3.5, 2.25, 1.75, 6.5, 9.0, 13.0, 1.5),
('Embraer', 'Phenom 300E', 'light_jet', 10, 52.2, 51.2, 2100, 4.5, 3.5, 2.25, 1.75, 6.5, 9.0, 13.0, 1.5),
('Honda', 'HondaJet', 'light_jet', 6, 39.8, 42.6, 1700, 3.5, 2.5, 1.5, 1.0, 5.0, 7.0, 10.0, 1.0),
('Honda', 'HondaJet Elite', 'light_jet', 6, 39.8, 43.0, 1750, 3.5, 2.5, 1.5, 1.0, 5.0, 7.0, 10.0, 1.0),
('Honda', 'HondaJet Elite II', 'light_jet', 6, 39.8, 43.0, 1750, 3.5, 2.5, 1.5, 1.0, 5.0, 7.0, 10.0, 1.0),
('Pilatus', 'PC-24', 'light_jet', 10, 55.9, 55.3, 2300, 5.0, 4.0, 2.5, 2.0, 7.0, 9.5, 14.0, 1.5),
('Cirrus', 'Vision Jet', 'light_jet', 7, 38.7, 30.7, 1400, 3.0, 2.0, 1.25, 1.0, 4.0, 6.0, 8.5, 0.75),

-- MIDSIZE JETS
('Cessna', 'Citation XLS', 'midsize_jet', 9, 56.3, 52.5, 2600, 5.5, 4.5, 2.75, 2.0, 8.0, 11.0, 16.0, 1.75),
('Cessna', 'Citation XLS+', 'midsize_jet', 9, 56.3, 52.5, 2600, 5.5, 4.5, 2.75, 2.0, 8.0, 11.0, 16.0, 1.75),
('Cessna', 'Citation Sovereign', 'midsize_jet', 12, 63.6, 63.5, 3200, 6.5, 5.5, 3.5, 2.5, 9.5, 13.0, 18.0, 2.0),
('Cessna', 'Citation Sovereign+', 'midsize_jet', 12, 63.6, 63.5, 3200, 6.5, 5.5, 3.5, 2.5, 9.5, 13.0, 18.0, 2.0),
('Hawker', '800XP', 'midsize_jet', 9, 54.4, 51.2, 2500, 5.25, 4.25, 2.5, 1.75, 7.5, 10.5, 15.0, 1.5),
('Hawker', '900XP', 'midsize_jet', 9, 54.4, 53.2, 2600, 5.5, 4.5, 2.75, 2.0, 8.0, 11.0, 16.0, 1.75),
('Bombardier', 'Learjet 45', 'midsize_jet', 9, 47.8, 57.6, 2400, 5.0, 4.0, 2.5, 1.75, 7.5, 10.0, 14.5, 1.5),
('Bombardier', 'Learjet 60', 'midsize_jet', 8, 43.8, 58.7, 2500, 5.25, 4.25, 2.5, 1.75, 7.5, 10.5, 15.0, 1.5),
('Bombardier', 'Learjet 75', 'midsize_jet', 9, 50.8, 57.8, 2700, 5.75, 4.75, 3.0, 2.25, 8.5, 11.5, 16.5, 1.75),

-- SUPER MIDSIZE JETS
('Cessna', 'Citation Latitude', 'super_midsize_jet', 9, 72.3, 62.1, 3750, 7.5, 6.5, 4.0, 3.0, 11.0, 15.0, 22.0, 2.5),
('Cessna', 'Citation Longitude', 'super_midsize_jet', 12, 68.9, 73.2, 4200, 8.5, 7.5, 4.5, 3.5, 12.5, 17.0, 24.0, 2.75),
('Embraer', 'Praetor 500', 'super_midsize_jet', 9, 69.4, 64.2, 3800, 7.75, 6.75, 4.25, 3.25, 11.5, 15.5, 22.5, 2.5),
('Embraer', 'Praetor 600', 'super_midsize_jet', 12, 69.4, 68.2, 4100, 8.25, 7.25, 4.5, 3.5, 12.0, 16.5, 24.0, 2.75),
('Bombardier', 'Challenger 350', 'super_midsize_jet', 10, 69.0, 68.7, 4000, 8.0, 7.0, 4.5, 3.5, 12.0, 16.0, 23.0, 2.5),
('Gulfstream', 'G280', 'super_midsize_jet', 10, 63.0, 66.8, 3700, 7.5, 6.5, 4.0, 3.0, 11.0, 15.0, 21.5, 2.25),
('Dassault', 'Falcon 2000S', 'super_midsize_jet', 10, 70.2, 66.3, 3900, 8.0, 7.0, 4.25, 3.25, 11.5, 15.5, 22.5, 2.5),
('Dassault', 'Falcon 2000LXS', 'super_midsize_jet', 10, 70.2, 66.3, 3900, 8.0, 7.0, 4.25, 3.25, 11.5, 15.5, 22.5, 2.5),

-- LARGE JETS
('Bombardier', 'Challenger 650', 'large_jet', 12, 69.0, 68.5, 4500, 9.0, 8.0, 5.0, 4.0, 13.5, 18.0, 26.0, 3.0),
('Gulfstream', 'G450', 'large_jet', 16, 77.8, 89.3, 4800, 9.5, 8.5, 5.5, 4.25, 14.5, 19.5, 28.0, 3.25),
('Gulfstream', 'G500', 'large_jet', 19, 87.0, 91.2, 5000, 10.0, 9.0, 5.75, 4.5, 15.0, 20.5, 29.0, 3.5),
('Gulfstream', 'G550', 'large_jet', 19, 93.5, 96.4, 5096, 10.5, 9.5, 6.0, 4.75, 15.5, 21.0, 30.0, 3.5),
('Gulfstream', 'G600', 'large_jet', 19, 94.2, 96.1, 5500, 11.0, 10.0, 6.25, 5.0, 16.5, 22.0, 32.0, 3.75),
('Gulfstream', 'G650', 'large_jet', 19, 99.6, 99.8, 6000, 12.0, 11.0, 7.0, 5.5, 18.0, 24.0, 35.0, 4.0),
('Gulfstream', 'G650ER', 'large_jet', 19, 99.6, 99.8, 6000, 12.0, 11.0, 7.0, 5.5, 18.0, 24.0, 35.0, 4.0),
('Gulfstream', 'G700', 'large_jet', 19, 103.0, 109.8, 6800, 13.5, 12.5, 8.0, 6.0, 20.0, 27.0, 39.0, 4.5),
('Gulfstream', 'G800', 'large_jet', 19, 103.0, 111.1, 7000, 14.0, 13.0, 8.25, 6.25, 21.0, 28.0, 40.0, 4.5),
('Bombardier', 'Global 5500', 'large_jet', 16, 94.0, 96.8, 5600, 11.5, 10.5, 6.5, 5.25, 17.0, 22.5, 33.0, 3.75),
('Bombardier', 'Global 6500', 'large_jet', 17, 94.0, 99.4, 5800, 12.0, 11.0, 6.75, 5.5, 17.5, 23.5, 34.0, 4.0),
('Bombardier', 'Global 7500', 'large_jet', 19, 104.0, 111.0, 7400, 14.5, 13.5, 8.5, 6.5, 22.0, 29.5, 43.0, 4.75),
('Bombardier', 'Global 8000', 'large_jet', 19, 104.0, 111.0, 7400, 14.5, 13.5, 8.5, 6.5, 22.0, 29.5, 43.0, 4.75),
('Dassault', 'Falcon 900LX', 'large_jet', 14, 70.2, 66.3, 4200, 8.5, 7.5, 4.75, 3.75, 12.5, 17.0, 24.5, 2.75),
('Dassault', 'Falcon 7X', 'large_jet', 16, 86.1, 76.1, 5000, 10.0, 9.0, 5.75, 4.5, 15.0, 20.5, 29.0, 3.5),
('Dassault', 'Falcon 8X', 'large_jet', 16, 86.3, 80.3, 5300, 10.75, 9.75, 6.0, 4.75, 16.0, 21.5, 31.0, 3.75),
('Dassault', 'Falcon 6X', 'large_jet', 16, 85.1, 77.7, 5100, 10.25, 9.25, 5.75, 4.5, 15.5, 20.75, 30.0, 3.5),
('Dassault', 'Falcon 10X', 'large_jet', 19, 101.4, 83.9, 6500, 13.0, 12.0, 7.5, 5.75, 19.5, 26.0, 38.0, 4.25),

-- HELICOPTERS
('Robinson', 'R22', 'helicopter', 2, 25.2, 28.8, 120, 0.75, 0.5, 0.25, 0.25, 1.0, 1.5, 2.0, 0.25),
('Robinson', 'R44', 'helicopter', 4, 33.3, 38.3, 165, 1.0, 0.75, 0.5, 0.5, 1.25, 2.0, 2.5, 0.5),
('Robinson', 'R66', 'helicopter', 5, 33.4, 37.8, 200, 1.25, 1.0, 0.5, 0.5, 1.5, 2.25, 3.0, 0.5),
('Bell', '206', 'helicopter', 5, 33.4, 39.0, 200, 1.25, 1.0, 0.5, 0.5, 1.5, 2.25, 3.0, 0.5),
('Bell', '407', 'helicopter', 7, 35.4, 41.8, 225, 1.5, 1.25, 0.75, 0.75, 1.75, 2.75, 3.5, 0.75),
('Bell', '429', 'helicopter', 8, 42.0, 46.9, 325, 2.0, 1.75, 1.0, 1.0, 2.5, 3.75, 5.0, 1.0),
('Bell', '505', 'helicopter', 5, 35.4, 34.4, 185, 1.25, 1.0, 0.5, 0.5, 1.5, 2.25, 3.0, 0.5),
('Bell', '525', 'helicopter', 16, 56.0, 65.0, 550, 3.5, 3.0, 2.0, 1.5, 4.5, 6.0, 8.0, 1.5),
('Airbus', 'H125', 'helicopter', 6, 35.1, 42.6, 200, 1.25, 1.0, 0.5, 0.5, 1.5, 2.25, 3.0, 0.5),
('Airbus', 'H130', 'helicopter', 8, 35.1, 39.2, 225, 1.5, 1.25, 0.75, 0.75, 1.75, 2.75, 3.5, 0.75),
('Airbus', 'H135', 'helicopter', 8, 36.1, 42.0, 275, 1.75, 1.5, 0.75, 0.75, 2.0, 3.25, 4.25, 0.75),
('Airbus', 'H145', 'helicopter', 10, 36.1, 45.0, 350, 2.25, 2.0, 1.25, 1.0, 2.75, 4.25, 5.5, 1.0),
('Airbus', 'H155', 'helicopter', 13, 46.6, 46.3, 400, 2.5, 2.25, 1.5, 1.25, 3.25, 4.75, 6.0, 1.25),
('Airbus', 'H160', 'helicopter', 12, 45.9, 51.2, 425, 2.75, 2.5, 1.5, 1.25, 3.5, 5.0, 6.5, 1.25),
('Airbus', 'H175', 'helicopter', 18, 52.2, 62.7, 500, 3.25, 2.75, 1.75, 1.5, 4.0, 5.5, 7.5, 1.5),
('Sikorsky', 'S-76', 'helicopter', 12, 44.0, 52.5, 400, 2.5, 2.25, 1.5, 1.25, 3.25, 4.75, 6.0, 1.25),
('Sikorsky', 'S-92', 'helicopter', 19, 56.3, 66.3, 600, 3.75, 3.25, 2.25, 1.75, 5.0, 6.75, 9.0, 1.75),
('Leonardo', 'AW109', 'helicopter', 8, 36.1, 42.8, 300, 1.75, 1.5, 1.0, 0.75, 2.25, 3.5, 4.5, 0.75),
('Leonardo', 'AW119', 'helicopter', 8, 35.9, 42.5, 275, 1.75, 1.5, 0.75, 0.75, 2.0, 3.25, 4.25, 0.75),
('Leonardo', 'AW139', 'helicopter', 15, 45.3, 54.7, 450, 3.0, 2.5, 1.75, 1.5, 3.75, 5.25, 7.0, 1.25),
('Leonardo', 'AW169', 'helicopter', 10, 42.7, 46.3, 375, 2.25, 2.0, 1.25, 1.0, 3.0, 4.5, 6.0, 1.0),
('MD Helicopters', 'MD 500', 'helicopter', 5, 26.4, 30.5, 150, 1.0, 0.75, 0.5, 0.5, 1.25, 2.0, 2.5, 0.5),
('MD Helicopters', 'MD 530F', 'helicopter', 5, 27.4, 32.4, 175, 1.0, 0.75, 0.5, 0.5, 1.25, 2.0, 2.5, 0.5),
('MD Helicopters', 'MD 902', 'helicopter', 8, 35.1, 38.0, 250, 1.5, 1.25, 0.75, 0.75, 2.0, 3.0, 4.0, 0.75)

ON CONFLICT (manufacturer, model) DO UPDATE SET
  category = EXCLUDED.category,
  seats = EXCLUDED.seats,
  wingspan_ft = EXCLUDED.wingspan_ft,
  length_ft = EXCLUDED.length_ft,
  surface_area_sqft = EXCLUDED.surface_area_sqft,
  ext_wash_hours = EXCLUDED.ext_wash_hours,
  int_detail_hours = EXCLUDED.int_detail_hours,
  leather_hours = EXCLUDED.leather_hours,
  carpet_hours = EXCLUDED.carpet_hours,
  wax_hours = EXCLUDED.wax_hours,
  polish_hours = EXCLUDED.polish_hours,
  ceramic_hours = EXCLUDED.ceramic_hours,
  brightwork_hours = EXCLUDED.brightwork_hours,
  updated_at = NOW();
