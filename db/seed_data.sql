-- Insert Animals
INSERT INTO animal (a_name, a_species, a_breed, a_status, a_intakedate) VALUES
('Buddy', 'Dog', 'Golden Retriever', 'Adoptable', '2023-01-15'),
('Mittens', 'Cat', 'Siamese', 'Adoptable', '2023-02-20'),
('Rocky', 'Dog', 'Bulldog', 'Foster', '2023-03-10'),
('Luna', 'Cat', 'Maine Coon', 'Adoptable', '2023-04-05'),
('Max', 'Dog', 'German Shepherd', 'Hold', '2023-05-12');

-- Insert Users
-- Note: Passwords are plain text for this seed data. But newly registered users will have hashed passwords.
INSERT INTO app_user (u_name, u_email, u_password, u_role) VALUES
('Admin User', 'admin@acams.com', 'admin123', 'Staff'),
('John Doe', 'john@example.com', 'password123', 'Adopter'),
('Jane Smith', 'jane@example.com', 'password123', 'Adopter');

-- Insert Medical Records
INSERT INTO medical_record (mr_animalid, mr_treatmenttype, mr_treatmentdate) VALUES
-- Buddy (Animal ID 1)
(1, 'Vaccination - Rabies', '2023-01-20'),
(1, 'Deworming', '2023-02-15'),
(1, 'Annual Checkup', '2024-01-15'),
(1, 'Dental Cleaning', '2024-06-10'),
-- Mittens (Animal ID 2)
(2, 'Spay Surgery', '2023-03-01'),
(2, 'Vaccination - FVRCP', '2023-03-15'),
(2, 'Flea Treatment', '2023-08-20'),
(2, 'Annual Checkup', '2024-02-20'),
-- Luna (Animal ID 4)
(4, 'Vaccination - FVRCP', '2023-04-10'),
(4, 'Microchip Implant', '2023-04-12'),
(4, 'Deworming', '2023-05-01'),
(4, 'Annual Checkup', '2024-04-05');

-- Insert Intake Records
INSERT INTO intake_record (ir_animalid, ir_intaketype, ir_intakedate, ir_condition) VALUES
-- Buddy (Animal ID 1)
(1, 'Stray', '2023-01-14', 'Normal'),
(1, 'Transfer', '2023-06-01', 'Normal'),
-- Mittens (Animal ID 2)
(2, 'Surrendered', '2023-02-19', 'Injured'),
(2, 'Stray', '2023-09-01', 'Normal'),
-- Luna (Animal ID 4)
(4, 'Stray', '2023-04-03', 'Sick'),
(4, 'Transfer', '2024-03-30', 'Normal');
