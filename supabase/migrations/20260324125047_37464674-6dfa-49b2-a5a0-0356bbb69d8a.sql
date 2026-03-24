
-- Delete conversation members for the duplicate conversation
DELETE FROM conversation_members WHERE conversation_id = 'e7b4312a-36f5-417d-8e51-01f17544b08a';

-- Delete the duplicate conversation
DELETE FROM conversations WHERE id = 'e7b4312a-36f5-417d-8e51-01f17544b08a';
