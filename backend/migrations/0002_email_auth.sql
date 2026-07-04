-- Email/password authentication support (testing mode)
-- Adds a nullable password_hash column and seeds test users.
-- All passwords: password123 (hashed with PBKDF2-SHA256, 100k iterations).

ALTER TABLE users ADD COLUMN password_hash TEXT;

-- Seed test users (only used when EMAIL_AUTH_ENABLED is set)
INSERT OR IGNORE INTO users (id, email, name, password_hash) VALUES
  ('fa900ae3-0fc9-4f0c-a6ae-dddf8f8b84bb', 'test@rumaq.dev',  'Test User One', 'pbkdf2_sha256$100000$pGW_FQUWkZ4LWR5SAXwDbg$eavlQExxmqixP0sIhu9HM8OIZqaxNm5ngKDMQd7Ge3s'),
  ('92d07694-4ae0-4d32-acd4-aa79c45ecdaf', 'alice@rumaq.dev',  'Alice',          'pbkdf2_sha256$100000$IkX0ielgJ0S9m_iCx6Rsig$EV_M44kSQtVzCKKgCt8BEYtVDO62RgMD1Zg9q6cc-Oo'),
  ('4a41fcf1-d5e1-4c64-bd9c-94a9be482d4f', 'bob@rumaq.dev',    'Bob',            'pbkdf2_sha256$100000$QNyNgLB3EkcDacPj2HE7CQ$cx_fx0OYL3uLU9a0jrrbALSEh7hcNzYQy_PvCg75AFU'),
  ('733d350e-ad34-401d-b6c9-986bb359c3b3', 'charlie@rumaq.dev','Charlie',        'pbkdf2_sha256$100000$QDcJMkDVyKFN3nqRAL0xyQ$BCFttx7UOErbVyKzS4NxOehoPgwnu-0blXDKdkctpt4'),
  ('9e41f4ca-6803-4cb8-858b-1aa4ba0985fb', 'diana@rumaq.dev',  'Diana',          'pbkdf2_sha256$100000$PJ-eWY7qOkaAGW2DlmWApA$v17tH4RLT7UzYs9dfoKeLA8w8FW-5zYpYeOw7xfFgBw');
