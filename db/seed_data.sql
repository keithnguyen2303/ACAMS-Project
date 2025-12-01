-- Insert Animals
INSERT INTO animal (a_name, a_species, a_breed, a_status, a_intakedate) VALUES
('Buddy', 'Dog', 'Golden Retriever', 'Adoptable', '2023-01-15'),
('Mittens', 'Cat', 'Siamese', 'Adoptable', '2023-02-20'),
('Rocky', 'Dog', 'Bulldog', 'Foster', '2023-03-10'),
('Luna', 'Cat', 'Maine Coon', 'Adoptable', '2023-04-05'),
('Max', 'Dog', 'German Shepherd', 'Hold', '2023-05-12');

-- Insert Users
-- Note: Passwords are plain text for this seed data. In a real app, they should be hashed.
INSERT INTO app_user (u_name, u_email, u_password, u_role) VALUES
('Admin User', 'admin@acams.com', 'admin123', 'Staff'),
('John Doe', 'john@example.com', 'password123', 'Adopter'),
('Jane Smith', 'jane@example.com', 'password123', 'Adopter');
