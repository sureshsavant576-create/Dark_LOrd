-- Safe demo catalog seed. ON CONFLICT makes re-running the seed idempotent.
insert into public.departments(id,name,code) values
  (1,'Electronics & Communication','ECE'),(2,'Computer Science','CSE'),
  (3,'Mechanical Engineering','ME'),(4,'Physics','PHY'),(5,'Design & Innovation','DES')
on conflict (id) do nothing;

insert into public.users(id,name,department_id,role) values
  (1,'Aarav Sharma',1,'student'),(2,'Priya Nair',2,'student'),
  (3,'Kabir Mehta',3,'student'),(4,'Ananya Iyer',4,'student'),
  (5,'Dr. Meera Rao',1,'faculty'),(6,'Dr. Rohan Das',2,'faculty'),
  (7,'LabLink Admin',5,'admin'),(8,'Project Team Atlas',2,'project_team'),
  (9,'Lab Technician',1,'technician'),(10,'Head of Department',5,'hod')
on conflict (id) do nothing;

insert into public.equipment(id,name,category,department_id,location,description,specs,total_units,training_required,status,tags,technical_profile) values
  (1,'ESP32 Development Kit','Development boards',1,'ECE Lab · Room 204','Wi-Fi and Bluetooth enabled microcontroller board for connected prototypes.','Dual-core 240 MHz · Wi-Fi · Bluetooth · 30 GPIO',12,0,'available','["iot","embedded","microcontroller","wireless"]','{"capabilities":["microcontroller","embedded","iot","wireless","bluetooth","gpio"],"specifications":{"clock_mhz":240,"gpio":30}}'),
  (2,'Oscilloscope · 100 MHz','Test & measurement',1,'ECE Lab · Room 210','Four-channel digital oscilloscope for signal analysis and circuit debugging.','4 channels · 100 MHz · 1 GS/s',3,1,'available','["electronics","signals","circuit","measurement"]','{"capabilities":["oscilloscope","signal_measurement","circuit_debug","electronics"],"specifications":{"bandwidth_mhz":100,"channels":4,"sample_rate_gsps":1}}'),
  (3,'Arduino Uno R4','Development boards',1,'Open Hardware Bench · Room 204','Rapid prototyping microcontroller board with USB-C and LED matrix.','48 MHz · USB-C · 14 digital I/O',10,0,'available','["iot","embedded","microcontroller"]','{"capabilities":["microcontroller","embedded","iot","gpio"],"specifications":{"clock_mhz":48,"gpio":14}}'),
  (4,'Jetson Nano Developer Kit','AI & compute',2,'AI Lab · Room 318','Edge AI development kit for computer vision and robotics projects.','128-core GPU · 4 GB RAM · 4 USB ports',4,1,'available','["ai","computer vision","robotics","edge"]','{"capabilities":["edge_ai","computer_vision","robotics","gpu_compute"],"specifications":{"ram_gb":4,"gpu_cores":128}}'),
  (5,'GPU Workstation','AI & compute',2,'AI Lab · Room 320','High-performance workstation for model training and rendering.','RTX 4070 · 32 GB RAM · Linux',2,0,'available','["ai","machine learning","compute","gpu"]','{"capabilities":["gpu_compute","machine_learning","ai_training","computer_vision"],"specifications":{"ram_gb":32}}'),
  (6,'3D Printer · Prusa MK4','Fabrication',3,'Maker Lab · Ground floor','Reliable FDM printer for functional prototypes and enclosures.','250 × 210 × 220 mm · PLA/PETG/ABS',2,1,'available','["3d print","prototype","fabrication","design"]','{"capabilities":["3d_printing","additive_manufacturing","prototyping","enclosure"],"specifications":{"build_x_mm":250,"build_y_mm":210,"build_z_mm":220}}'),
  (7,'CNC Router','Fabrication',3,'Workshop · Bay 3','Three-axis CNC router for milling sheet materials and soft metals.','600 × 400 mm · 3-axis',1,1,'available','["fabrication","cnc","manufacturing"]','{"capabilities":["cnc_milling","fabrication","manufacturing"],"specifications":{"work_x_mm":600,"work_y_mm":400,"axes":3}}'),
  (8,'Thermal Camera','Sensors & imaging',4,'Applied Physics Lab · Room 115','Infrared imaging camera for thermal studies and diagnostics.','-20°C to 650°C · 320 × 240',2,1,'available','["thermal","imaging","sensor"]','{"capabilities":["thermal_imaging","temperature_measurement","sensor"],"specifications":{"resolution_x":320,"resolution_y":240,"temp_max_c":650}}'),
  (9,'Soldering Station','Electronics & tools',1,'ECE Lab · Room 204','Temperature-controlled soldering iron and safe fume extraction.','200–480°C · lead-free ready',5,0,'available','["electronics","soldering","prototype"]','{"capabilities":["soldering","pcb_rework","electronics"],"specifications":{"temp_min_c":200,"temp_max_c":480}}'),
  (10,'Laser Cutter','Fabrication',5,'Design Studio · Room 012','CO₂ laser for precision cutting and engraving of workshop materials.','600 × 400 mm · 60 W',1,1,'available','["fabrication","laser","design","prototype"]','{"capabilities":["laser_cutting","fabrication","prototyping"],"specifications":{"work_x_mm":600,"work_y_mm":400,"power_w":60}}')
on conflict (id) do nothing;

insert into public.projects(id,user_id,name,description,deadline,requirements) values
  (1,1,'Smart greenhouse monitor','An IoT greenhouse system measuring temperature and humidity with wireless data logging.',current_date+12,'["iot","sensor","microcontroller"]'),
  (2,2,'Edge vision rover','A small rover that detects and classifies objects locally using a camera.',current_date+19,'["robotics","computer vision","edge"]'),
  (3,3,'Rapid prototype enclosure','Design and fabricate a durable enclosure for a wearable device.',current_date+9,'["3d print","prototype","design"]'),
  (4,4,'Thermal materials study','Compare heat dissipation across material samples with infrared imaging.',current_date+25,'["thermal","imaging","sensor"]')
on conflict (id) do nothing;

insert into public.training(user_id,equipment_id) values (1,2),(2,4),(3,6),(3,7),(4,8),(1,10)
on conflict do nothing;

select setval(pg_get_serial_sequence('public.departments','id'), greatest((select coalesce(max(id),1) from public.departments),1));
select setval(pg_get_serial_sequence('public.users','id'), greatest((select coalesce(max(id),1) from public.users),1));
select setval(pg_get_serial_sequence('public.equipment','id'), greatest((select coalesce(max(id),1) from public.equipment),1));
select setval(pg_get_serial_sequence('public.projects','id'), greatest((select coalesce(max(id),1) from public.projects),1));
