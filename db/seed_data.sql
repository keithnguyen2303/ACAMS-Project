-- Bulk-load animals from CSV
COPY animal (a_name, a_species, a_breed, a_status, a_intakedate)
FROM '/docker-entrypoint-initdb.d/animals_seed.csv'
WITH (FORMAT csv, HEADER true);

-- Ensure the serial sequence is ahead of the current max ID
SELECT setval(
    'animal_a_animalid_seq',
    COALESCE((SELECT MAX(a_animalid) FROM animal), 1),
    true
);

-- Insert Users
-- Note: Passwords are plain text for this seed data. But newly registered users will have hashed passwords.
INSERT INTO app_user (u_name, u_email, u_password, u_role) VALUES
('Admin User', 'admin@acams.com', 'admin123', 'Staff'),
('John Doe', 'john@example.com', 'password123', 'Adopter'),
('Jane Smith', 'jane@example.com', 'password123', 'Adopter');

-- Insert Medical Records
COPY medical_record (mr_animalid, mr_treatmenttype, mr_treatmentdate)
FROM '/docker-entrypoint-initdb.d/medical_records_seed.csv'
WITH (FORMAT csv, HEADER true);

-- Insert Intake Records
COPY intake_record (ir_animalid, ir_intaketype, ir_intakedate, ir_condition)
FROM '/docker-entrypoint-initdb.d/intake_records_seed.csv'
WITH (FORMAT csv, HEADER true);

