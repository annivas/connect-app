-- Seed data for testing. Run AFTER signing up 2-3 test users via the app UI.
-- The handle_new_user() trigger will create profile rows automatically.
-- This script reads the first 3 profiles and creates sample data.

DO $$
DECLARE
  user1_id UUID;
  user2_id UUID;
  user3_id UUID;
  conv1_id UUID;
  conv2_id UUID;
  group1_id UUID;
  group2_id UUID;
  trip1_id UUID;
  event1_id UUID;
  coll1_id UUID;
BEGIN
  -- Get the first 3 profiles (signed up via the app)
  SELECT id INTO user1_id FROM public.profiles ORDER BY created_at LIMIT 1;
  SELECT id INTO user2_id FROM public.profiles ORDER BY created_at LIMIT 1 OFFSET 1;
  SELECT id INTO user3_id FROM public.profiles ORDER BY created_at LIMIT 1 OFFSET 2;

  IF user1_id IS NULL OR user2_id IS NULL THEN
    RAISE EXCEPTION 'Need at least 2 signed-up users. Sign up via the app first.';
  END IF;

  -- ═══ CONVERSATIONS ═══

  -- Conversation 1: user1 <-> user2
  INSERT INTO public.conversations (id, type)
    VALUES (gen_random_uuid(), 'individual') RETURNING id INTO conv1_id;
  INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (conv1_id, user1_id), (conv1_id, user2_id);
  INSERT INTO public.messages (context_type, context_id, sender_id, content, type) VALUES
    ('conversation', conv1_id, user1_id, 'Hey! How are you doing?', 'text'),
    ('conversation', conv1_id, user2_id, 'Good! Just finished a hike. You?', 'text'),
    ('conversation', conv1_id, user1_id, 'Nice! Want to grab coffee later?', 'text'),
    ('conversation', conv1_id, user2_id, 'Sure! How about 3pm at Blue Bottle?', 'text'),
    ('conversation', conv1_id, user1_id, 'Perfect, see you there!', 'text');

  -- Conversation 2: user1 <-> user3 (if user3 exists)
  IF user3_id IS NOT NULL THEN
    INSERT INTO public.conversations (id, type)
      VALUES (gen_random_uuid(), 'individual') RETURNING id INTO conv2_id;
    INSERT INTO public.conversation_participants (conversation_id, user_id)
      VALUES (conv2_id, user1_id), (conv2_id, user3_id);
    INSERT INTO public.messages (context_type, context_id, sender_id, content, type) VALUES
      ('conversation', conv2_id, user3_id, 'Did you see the game last night?', 'text'),
      ('conversation', conv2_id, user1_id, 'Yes! What a finish!', 'text');
  END IF;

  -- Notes in conversation 1
  INSERT INTO public.notes (conversation_id, title, content, color, created_by, is_private) VALUES
    (conv1_id, 'Coffee spots to try', 'Blue Bottle, Sightglass, Ritual Coffee', '#FFE8D6', user1_id, false),
    (conv1_id, 'Book recommendations', 'The Midnight Library, Project Hail Mary', '#E8F5E9', user2_id, false);

  -- Reminders in conversation 1
  INSERT INTO public.reminders (conversation_id, title, due_date, priority, created_by) VALUES
    (conv1_id, 'Confirm coffee meetup', now() + interval '1 day', 'medium', user1_id),
    (conv1_id, 'Return borrowed book', now() + interval '7 days', 'low', user2_id);

  -- Ledger entries in conversation 1
  INSERT INTO public.ledger_entries (conversation_id, description, amount, paid_by, split_between) VALUES
    (conv1_id, 'Lunch at Thai place', 42.00, user1_id, ARRAY[user1_id, user2_id]),
    (conv1_id, 'Movie tickets', 28.00, user2_id, ARRAY[user1_id, user2_id]);

  -- Shared objects in conversation 1
  INSERT INTO public.shared_objects (conversation_id, type, title, description, url, shared_by) VALUES
    (conv1_id, 'link', 'Best Coffee Shops in SF', 'Eater SF guide', 'https://sf.eater.com/coffee', user1_id),
    (conv1_id, 'place', 'Blue Bottle Coffee', 'Great pour-over coffee', null, user2_id);

  -- ═══ GROUPS ═══

  -- Group 1: Weekend Warriors (general)
  INSERT INTO public.groups (id, name, description, type, created_by)
    VALUES (gen_random_uuid(), 'Weekend Warriors', 'Planning weekend adventures', 'general', user1_id)
    RETURNING id INTO group1_id;
  INSERT INTO public.group_members (group_id, user_id, is_admin) VALUES
    (group1_id, user1_id, true),
    (group1_id, user2_id, false);
  IF user3_id IS NOT NULL THEN
    INSERT INTO public.group_members (group_id, user_id, is_admin) VALUES (group1_id, user3_id, false);
  END IF;

  INSERT INTO public.messages (context_type, context_id, sender_id, content, type) VALUES
    ('group', group1_id, user1_id, 'Who is in for hiking this weekend?', 'text'),
    ('group', group1_id, user2_id, 'I am in! Where are we going?', 'text'),
    ('group', group1_id, user1_id, 'Thinking Mount Tam — the Matt Davis trail', 'text');

  -- Group event
  INSERT INTO public.group_events (id, group_id, title, start_date, end_date, type, created_by)
    VALUES (gen_random_uuid(), group1_id, 'Mount Tam Hike', now() + interval '3 days', now() + interval '3 days' + interval '6 hours', 'hangout', user1_id)
    RETURNING id INTO event1_id;
  INSERT INTO public.event_attendees (event_id, user_id, status) VALUES
    (event1_id, user1_id, 'going'),
    (event1_id, user2_id, 'going');

  -- Group notes
  INSERT INTO public.notes (group_id, title, content, color, created_by, is_private) VALUES
    (group1_id, 'Packing list', 'Water, sunscreen, snacks, hiking boots', '#E8F5E9', user1_id, false);

  -- Group reminders
  INSERT INTO public.reminders (group_id, title, due_date, priority, created_by) VALUES
    (group1_id, 'Book trail permits', now() + interval '2 days', 'high', user1_id);

  -- Group ledger entries
  INSERT INTO public.ledger_entries (group_id, description, amount, paid_by, split_between) VALUES
    (group1_id, 'Trail snacks', 32.50, user1_id, ARRAY[user1_id, user2_id]);

  -- Group shared objects
  INSERT INTO public.shared_objects (group_id, type, title, url, shared_by) VALUES
    (group1_id, 'link', 'Matt Davis Trail Info', 'https://www.alltrails.com/trail/matt-davis', user1_id);

  -- Group poll
  INSERT INTO public.polls (group_id, question, options, created_by, is_multiple_choice) VALUES
    (group1_id, 'When should we start the hike?',
     '[{"id":"opt1","text":"7am (sunrise)","voterIds":[]},{"id":"opt2","text":"9am (relaxed)","voterIds":[]},{"id":"opt3","text":"10am (brunch first)","voterIds":[]}]'::jsonb,
     user1_id, false);

  -- Group 2: Trip group (only if 3 users exist)
  IF user3_id IS NOT NULL THEN
    INSERT INTO public.groups (id, name, description, type, created_by)
      VALUES (gen_random_uuid(), 'Tokyo 2026', 'Planning our Tokyo trip', 'trip', user1_id)
      RETURNING id INTO group2_id;
    INSERT INTO public.group_members (group_id, user_id, is_admin) VALUES
      (group2_id, user1_id, true),
      (group2_id, user2_id, false),
      (group2_id, user3_id, false);

    INSERT INTO public.messages (context_type, context_id, sender_id, content, type) VALUES
      ('group', group2_id, user1_id, 'Flights are booked!', 'text'),
      ('group', group2_id, user2_id, 'Awesome! When do we leave?', 'text'),
      ('group', group2_id, user3_id, 'Can''t wait!', 'text');

    -- Trip
    INSERT INTO public.trips (id, group_id, destination, start_date, end_date, budget, participants)
      VALUES (gen_random_uuid(), group2_id, 'Tokyo, Japan', now() + interval '60 days', now() + interval '67 days', 5000, ARRAY[user1_id, user2_id, user3_id])
      RETURNING id INTO trip1_id;

    INSERT INTO public.itinerary_items (trip_id, day, time, title, description, type, cost) VALUES
      (trip1_id, 1, '14:00', 'Arrive at Narita Airport', 'Take Narita Express to Shinjuku', 'transport', 30),
      (trip1_id, 1, '18:00', 'Check into hotel', 'Shinjuku Granbell Hotel', 'accommodation', 150),
      (trip1_id, 2, '09:00', 'Meiji Shrine', 'Morning visit to the shrine', 'activity', 0),
      (trip1_id, 2, '12:00', 'Harajuku & Takeshita Street', 'Lunch and shopping', 'meal', 25),
      (trip1_id, 3, '10:00', 'TeamLab Borderless', 'Digital art museum', 'activity', 30);

    INSERT INTO public.reminders (group_id, title, due_date, priority, created_by) VALUES
      (group2_id, 'Apply for e-Visa', now() + interval '30 days', 'high', user1_id),
      (group2_id, 'Buy JR Pass', now() + interval '45 days', 'medium', user2_id);

    INSERT INTO public.ledger_entries (group_id, description, amount, paid_by, split_between) VALUES
      (group2_id, 'Airbnb deposit', 450.00, user1_id, ARRAY[user1_id, user2_id, user3_id]);
  END IF;

  -- ═══ COLLECTIONS ═══

  INSERT INTO public.collections (id, name, description, type, created_by, is_public)
    VALUES (gen_random_uuid(), 'Favorite Cafes', 'Best coffee spots in the city', 'places', user1_id, false)
    RETURNING id INTO coll1_id;

  INSERT INTO public.shared_objects (collection_id, type, title, description, shared_by) VALUES
    (coll1_id, 'place', 'Blue Bottle Coffee', 'Amazing pour-over', user1_id),
    (coll1_id, 'place', 'Sightglass Coffee', 'Great espresso and atmosphere', user1_id),
    (coll1_id, 'place', 'Ritual Coffee Roasters', 'Best single-origin beans', user1_id);

  RAISE NOTICE 'Seed data created successfully!';
  RAISE NOTICE 'User 1: %', user1_id;
  RAISE NOTICE 'User 2: %', user2_id;
  RAISE NOTICE 'User 3: %', user3_id;
END $$;
