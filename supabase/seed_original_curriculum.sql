-- ============================================================
-- Beo School of Art Vol.1 — Supabase Seed File
-- Tables: lessons, quiz_questions
-- Run this in your Supabase SQL editor after creating tables
-- ============================================================

-- This seed targets the schema in supabase/schema.sql.
-- It is safe to rerun: lessons are updated and lesson questions are replaced.

BEGIN;

ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS question_order INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ============================================================
-- LESSONS
-- youtube_video_id: fill these in after uploading to YouTube
-- week_number: Discovery unlocks all at once (all week 1)
--              Drawing and Painting unlock one per week
-- ============================================================

INSERT INTO public.lessons (track, lesson_code, title, youtube_video_id, week_number) VALUES

-- DISCOVERY (all unlock immediately — all set to week 1)
('Discovery', 'D1',  'What is Art and Why Does It Matter?',                        NULL, 1),
('Discovery', 'D2',  'How Your Eye Actually Sees',                                 NULL, 1),
('Discovery', 'D3',  'What Makes Art Look Real vs Flat',                           NULL, 1),
('Discovery', 'D4',  'Why Artists Obsess Over Light',                              NULL, 1),
('Discovery', 'D5',  'Value, Hue and Saturation Explained Simply',                 NULL, 1),
('Discovery', 'D6',  'Primary and Secondary Colours Explained Simply',             NULL, 1),
('Discovery', 'D7',  'Famous Artworks Explained Through Light and Shadow',         NULL, 1),

-- DRAWING (one per week, weeks 1–12)
('Drawing',   'DR1',  'What is Drawing?',                                          NULL, 1),
('Drawing',   'DR2',  'Types of Drawing',                                          NULL, 2),
('Drawing',   'DR3',  'Pencil Grades — Which One to Use and When',                 NULL, 3),
('Drawing',   'DR4',  'What is Shading and Why Every Drawing Needs It',            NULL, 4),
('Drawing',   'DR5',  'Types of Shading Techniques',                               NULL, 5),
('Drawing',   'DR6',  'Best Way to Blend Pencil',                                  NULL, 6),
('Drawing',   'DR7',  'How to Shade Darkest to Lightest',                          NULL, 7),
('Drawing',   'DR8',  'How to Make Art Look Realistic',                            NULL, 8),
('Drawing',   'DR9',  'Getting Proportions Right',                                 NULL, 9),
('Drawing',   'DR10', 'Grid Method vs Tracing vs Drawing by Eye',                  NULL, 10),
('Drawing',   'DR11', 'Portrait Drawing — How to Approach a Face',                 NULL, 11),
('Drawing',   'DR12', 'We Draw Together — Your Observation Drawing',               NULL, 12),

-- PAINTING (one per week, weeks 1–13 — P3.5 adds a week)
('Painting',  'P1',   'What is Painting?',                                         NULL, 1),
('Painting',  'P2',   'Types of Paintings',                                        NULL, 2),
('Painting',  'P3',   'Types of Paints and Mediums',                               NULL, 3),
('Painting',  'P3.5', 'Surfaces for Painting',                                     NULL, 4),
('Painting',  'P4',   'Sketch and Painting — Starting from a Drawing',             NULL, 5),
('Painting',  'P5',   'How to Apply Colour with a Brush',                          NULL, 6),
('Painting',  'P6',   'How to Blend Your Colours',                                 NULL, 7),
('Painting',  'P7',   'Colour Mixing — What Happens When You Mix',                 NULL, 8),
('Painting',  'P8',   'Colour is Relative',                                        NULL, 9),
('Painting',  'P9',   'How to Let Paint Dry — and Why Patience Matters',           NULL, 10),
('Painting',  'P10',  'Layers in Painting — Darkest to Lightest',                  NULL, 11),
('Painting',  'P11',  'Painting is Easier Than You Think',                         NULL, 12),
('Painting',  'P12',  'We Paint Together — Your Final Painting',                   NULL, 13)
ON CONFLICT (lesson_code) DO UPDATE SET
  track = EXCLUDED.track,
  title = EXCLUDED.title,
  week_number = EXCLUDED.week_number;

-- ============================================================
-- QUIZ QUESTIONS
-- 3 questions per lesson × 32 lessons = 96 questions total
-- ============================================================

DELETE FROM public.quiz_questions
WHERE lesson_code IN (
  'D1','D2','D3','D4','D5','D6','D7',
  'DR1','DR2','DR3','DR4','DR5','DR6','DR7','DR8','DR9','DR10','DR11','DR12',
  'P1','P2','P3','P3.5','P4','P5','P6','P7','P8','P9','P10','P11','P12'
);

INSERT INTO public.quiz_questions (lesson_code, question_text, option_a, option_b, option_c, option_d, correct_answer, question_order) VALUES

-- ── D1 ──────────────────────────────────────────────────
('D1', 'What is art?',
 'Only painting and drawing',
 'The way a person expresses themselves in any form',
 'Something only famous people do',
 'A type of school subject',
 'b', 1),

('D1', 'Why did people use art before cameras existed?',
 'To decorate their walls',
 'To keep records of events',
 'To sell paintings',
 'To copy nature',
 'b', 2),

('D1', 'Which of these is an example of art?',
 'A maths sum',
 'A beautifully designed building',
 'A science experiment',
 'A shopping list',
 'b', 3),

-- ── D2 ──────────────────────────────────────────────────
('D2', 'How many colours can the human eye see?',
 'Up to 100',
 'Up to 1,000',
 'Up to 10 million',
 'Up to 50',
 'c', 1),

('D2', 'What do the sensors in your eye do?',
 'Help you hear sounds',
 'Pick up colour information',
 'Keep your eye wet',
 'Make tears',
 'b', 2),

('D2', 'What does an artist notice that others might miss?',
 'The name of the object',
 'The dark and light parts of what they see',
 'The weight of the object',
 'The smell of the paint',
 'b', 3),

-- ── D3 ──────────────────────────────────────────────────
('D3', 'What makes a drawing look real?',
 'Using lots of colours',
 'Clear separation between dark and light',
 'Drawing very slowly',
 'Using expensive pencils',
 'b', 1),

('D3', 'What does a drawing look like with no dark and light separation?',
 'It looks 3D',
 'It looks flat, like a sticker',
 'It looks colourful',
 'It looks realistic',
 'b', 2),

('D3', 'What is the most important idea in this course?',
 'Learning to hold a pencil',
 'Separating dark from light',
 'Drawing perfect circles',
 'Knowing all the colours',
 'b', 3),

-- ── D4 ──────────────────────────────────────────────────
('D4', 'What does light do for a piece of art?',
 'Makes it more colourful',
 'Brings it to life and creates depth',
 'Makes it easier to draw',
 'Makes it dry faster',
 'b', 1),

('D4', 'What is the most important question before shading?',
 'What colour should I use?',
 'Where is the light coming from?',
 'How big should the drawing be?',
 'Should I use pencil or pen?',
 'b', 2),

('D4', 'What do shadows and highlights both come from?',
 'Different pencils',
 'The same light source',
 'Different colours',
 'Imagination',
 'b', 3),

-- ── D5 ──────────────────────────────────────────────────
('D5', 'What does VALUE describe?',
 'The name of a colour',
 'How dark or light something is',
 'How strong a colour is',
 'The type of paint used',
 'b', 1),

('D5', 'What is HUE?',
 'How bright a colour is',
 'How dark a colour is',
 'The colour itself — red, blue, yellow',
 'A type of paintbrush',
 'c', 2),

('D5', 'A colour that looks faded and grey has...',
 'High saturation',
 'Low saturation',
 'High value',
 'Low hue',
 'b', 3),

-- ── D6 ──────────────────────────────────────────────────
('D6', 'What are primary colours?',
 'Colours made by mixing two others',
 'Colours you cannot make by mixing — the starting point',
 'The darkest colours',
 'Colours only used in painting',
 'b', 1),

('D6', 'What do you get when you mix two primary colours?',
 'A primary colour',
 'A secondary colour',
 'White',
 'Black',
 'b', 2),

('D6', 'Why is understanding primary colours important?',
 'So you can name all the colours',
 'From them you can mix almost any colour',
 'Because they are the prettiest',
 'Because you need them to shade',
 'b', 3),

-- ── D7 ──────────────────────────────────────────────────
('D7', 'What technique did Leonardo da Vinci use to make shadows very soft?',
 'Hatching',
 'Sfumato',
 'Stippling',
 'Blending stump',
 'b', 1),

('D7', 'In a pencil drawing, where are the darkest marks placed?',
 'On the lightest areas',
 'In the deepest shadow areas',
 'Along the outline only',
 'In the middle',
 'b', 2),

('D7', 'After learning about light and shadow, what happens when you look at art?',
 'You stop enjoying it',
 'You see it completely differently — looking for the light',
 'You only want to look at pencil drawings',
 'You find it too complicated',
 'b', 3),

-- ── DR1 ─────────────────────────────────────────────────
('DR1', 'What is drawing?',
 'Mixing colours on a palette',
 'Making art with a dry medium on paper',
 'Painting with a brush',
 'Printing an image',
 'b', 1),

('DR1', 'What makes drawing different from painting?',
 'Drawing uses colour',
 'Drawing uses a dry medium not a wet one',
 'Drawing is harder',
 'Drawing always uses charcoal',
 'b', 2),

('DR1', 'Why is drawing the foundation of other art skills?',
 'Because it is cheapest',
 'Because it trains your eye to see proportion, light, and form',
 'Because all artists start with pens',
 'Because drawing is most popular',
 'b', 3),

-- ── DR2 ─────────────────────────────────────────────────
('DR2', 'What is portrait drawing?',
 'Drawing outdoor scenery',
 'Drawing objects on a table',
 'Drawing a person or face',
 'Drawing animals',
 'c', 1),

('DR2', 'Which type is good for practising because the subject stays still?',
 'Gesture drawing',
 'Portrait drawing',
 'Still life drawing',
 'Landscape drawing',
 'c', 2),

('DR2', 'What type does this course focus on?',
 'Portrait only',
 'Gesture drawing',
 'Observational drawing from real objects',
 'Landscape only',
 'c', 3),

-- ── DR3 ─────────────────────────────────────────────────
('DR3', 'What does the H stand for in pencil grades?',
 'Heavy',
 'Hard',
 'High',
 'Highlight',
 'b', 1),

('DR3', 'Which pencil is best for deep dark shadows?',
 '4H',
 'HB',
 '6B',
 '2H',
 'c', 2),

('DR3', 'Why start your sketch with an H pencil?',
 'H pencils are more expensive',
 'H pencils make light marks that are easy to erase',
 'H pencils are faster',
 'H pencils make the darkest marks',
 'b', 3),

-- ── DR4 ─────────────────────────────────────────────────
('DR4', 'What is shading?',
 'Drawing the outline of an object',
 'Adding different levels of dark and light to a drawing',
 'Choosing the right pencil',
 'Erasing unwanted lines',
 'b', 1),

('DR4', 'What does a drawing without shading look like?',
 'Three-dimensional and real',
 'Flat, like a cut-out shape',
 'Very colourful',
 'Very detailed',
 'b', 2),

('DR4', 'Why is shading important?',
 'It makes drawings look flat',
 'It creates the illusion of a three-dimensional object',
 'It is only used in painting',
 'It makes drawing faster',
 'b', 3),

-- ── DR5 ─────────────────────────────────────────────────
('DR5', 'What is hatching?',
 'Random marks in all directions',
 'Parallel lines drawn close together',
 'Small dots packed together',
 'Lines that cross each other',
 'b', 1),

('DR5', 'Which technique uses two sets of lines crossing over each other?',
 'Hatching',
 'Stippling',
 'Cross-hatching',
 'Contour',
 'c', 2),

('DR5', 'Which technique is best for rounded objects because the strokes follow the shape?',
 'Hatching',
 'Stippling',
 'Cross-hatching',
 'Contour shading',
 'd', 3),

-- ── DR6 ─────────────────────────────────────────────────
('DR6', 'Which of these is NOT a pencil blending tool?',
 'Finger',
 'Tissue paper',
 'Blending stump',
 'Paintbrush with water',
 'd', 1),

('DR6', 'What must happen when you blend?',
 'Lines become more visible',
 'Lines completely disappear',
 'Shading becomes lighter',
 'Paper becomes wet',
 'b', 2),

('DR6', 'What is the correct order for building deep shadow?',
 'Blend, then shade',
 'Shade, blend, shade, blend — repeat',
 'Shade once then stop',
 'Blend first then shade',
 'b', 3),

-- ── DR7 ─────────────────────────────────────────────────
('DR7', 'What must you know before starting to shade?',
 'The name of your pencil',
 'The direction of your light',
 'The size of the paper',
 'The type of object',
 'b', 1),

('DR7', 'Where do you start shading on the object?',
 'The brightest area',
 'The middle',
 'The darkest area',
 'Anywhere',
 'c', 2),

('DR7', 'What is reflected light?',
 'The brightest highlight on the object',
 'A sliver of lighter tone on the shadow edge',
 'Light reflected in a mirror',
 'The light from a lamp',
 'b', 3),

-- ── DR8 ─────────────────────────────────────────────────
('DR8', 'What is the most important thing to do when drawing realistically?',
 'Draw from imagination',
 'Draw what you actually observe in front of you',
 'Draw quickly without thinking',
 'Copy someone else''s drawing',
 'b', 1),

('DR8', 'What are the two most important things for realism?',
 'Colour and size',
 'Speed and confidence',
 'Accurate shapes and consistent light',
 'A good eraser and fine pencil',
 'c', 2),

('DR8', 'What does this lesson recommend for training your eye?',
 'Drawing the whole picture as fast as possible',
 'Zooming into one small part and drawing it in full detail',
 'Drawing the outline first and filling in last',
 'Copying from a famous artist',
 'b', 3),

-- ── DR9 ─────────────────────────────────────────────────
('DR9', 'What does proportion mean?',
 'How dark a drawing is',
 'How big the paper is',
 'Making sure sizes and positions relate correctly to each other',
 'How fast you draw',
 'c', 1),

('DR9', 'What is the triangle drill?',
 'Drawing triangles for decoration',
 'Copying a triangle from a reference over and over to train your eye',
 'A special type of shading',
 'A way to draw hair',
 'b', 2),

('DR9', 'What should you do first when drawing a complicated object?',
 'Start drawing immediately',
 'Look for the basic simple shapes inside it first',
 'Close your eyes and imagine it',
 'Ask someone else to draw it',
 'b', 3),

-- ── DR10 ────────────────────────────────────────────────
('DR10', 'What does the grid method involve?',
 'Drawing squares as decoration',
 'Dividing the reference into squares and copying each one',
 'Tracing the image directly',
 'Drawing from memory',
 'b', 1),

('DR10', 'Why should tracing be a learning tool and not a permanent habit?',
 'Tracing is too slow',
 'Your freehand eye will not grow if you always trace',
 'Tracing uses too much paper',
 'Tracing is only for children',
 'b', 2),

('DR10', 'Which method is the long-term goal?',
 'Grid method',
 'Tracing method',
 'Drawing by eye freehand',
 'Photograph method',
 'c', 3),

-- ── DR11 ────────────────────────────────────────────────
('DR11', 'If you are right-handed, where should you start drawing the face?',
 'Right side',
 'Top',
 'Left side',
 'The nose first',
 'c', 1),

('DR11', 'What must your sketch lines be?',
 'Very dark so you can see them',
 'Very light — almost invisible',
 'In pen so they do not smudge',
 'In coloured pencil',
 'b', 2),

('DR11', 'Which step comes LAST?',
 'Sketching',
 'Blending',
 'First dark layer',
 'Adding highlights',
 'd', 3),

-- ── DR12 ────────────────────────────────────────────────
('DR12', 'What is the first thing to decide before drawing?',
 'The size of your paper',
 'Where the light is coming from',
 'Which shading technique to use',
 'How long it will take',
 'b', 1),

('DR12', 'What do you draw in step two?',
 'Final highlights',
 'Deep shadows',
 'Basic shapes lightly',
 'Cast shadow',
 'c', 2),

('DR12', 'What happens to your drawing skill the more you draw?',
 'It stays the same',
 'It gets worse before better',
 'Your eye gets better every single time',
 'It only improves with expensive materials',
 'c', 3),

-- ── P1 ──────────────────────────────────────────────────
('P1', 'What is painting?',
 'Drawing with charcoal',
 'Representing an image using colour and a wet medium',
 'Sketching with a pencil',
 'Printing an image',
 'b', 1),

('P1', 'What does painting add that drawing does not?',
 'Pencil grades',
 'Colour and wet medium',
 'Proportion skills',
 'Blending stumps',
 'b', 2),

('P1', 'Which skills from Drawing carry into painting?',
 'None — painting starts fresh',
 'Only pencil grades',
 'Light, shadow, proportion, and value',
 'Only portrait drawing',
 'c', 3),

-- ── P2 ──────────────────────────────────────────────────
('P2', 'What is the goal of realism in painting?',
 'To express a feeling',
 'To make the artwork look as close to real life as possible',
 'To paint with only three colours',
 'To paint abstract shapes',
 'b', 1),

('P2', 'What makes expressionism different from realism?',
 'Expressionism is more detailed',
 'Expressionism exaggerates colour and form to show emotion',
 'Expressionism uses only black and white',
 'Expressionism is always abstract',
 'b', 2),

('P2', 'What type of painting does this course focus on?',
 'Abstract only',
 'Expressionism',
 'Observational and realistic painting',
 'Landscape only',
 'c', 3),

-- ── P3 ──────────────────────────────────────────────────
('P3', 'Which paint uses oil as its medium?',
 'Watercolour',
 'Acrylic',
 'Oil paint',
 'Gouache',
 'c', 1),

('P3', 'What makes acrylic good for beginners?',
 'It never dries',
 'It is expensive',
 'It is versatile and dries fast',
 'It is only for landscapes',
 'c', 2),

('P3', 'In what order do you load your brush?',
 'Paint first then medium',
 'Medium first then paint',
 'Brush first then palette',
 'Water first then oil',
 'b', 3),

-- ── P3.5 ────────────────────────────────────────────────
('P3.5', 'What is the standard painting surface?',
 'Watercolour paper',
 'Printer paper',
 'Canvas',
 'Cardboard',
 'c', 1),

('P3.5', 'Which canvas type is best for beginners?',
 'Stretched canvas',
 'Canvas board',
 'Canvas pad',
 'Canvas roll',
 'b', 2),

('P3.5', 'What surface should you use for watercolour paint?',
 'Canvas board',
 'Stretched canvas',
 'Watercolour paper',
 'Any paper works',
 'c', 3),

-- ── P4 ──────────────────────────────────────────────────
('P4', 'What is the first thing to do before painting?',
 'Mix colours',
 'Do a sketch to plan the composition',
 'Apply base layer of paint',
 'Add highlights',
 'b', 1),

('P4', 'What is an underpainting sketch?',
 'A thick first layer of paint',
 'A sketch made with thin diluted paint on the canvas',
 'A sketch done in black only',
 'A second painting on top of the first',
 'b', 2),

('P4', 'Why do drawing skills help at this stage?',
 'They make the canvas cleaner',
 'They make the sketch stage faster and more confident',
 'Drawing skills are not needed for painting',
 'They help choose the palette',
 'b', 3),

-- ── P5 ──────────────────────────────────────────────────
('P5', 'What type of brush is best for large areas?',
 'Small round brush',
 'Large flat brush',
 'Filbert brush',
 'Fan brush',
 'b', 1),

('P5', 'How do you load your brush?',
 'Paint first then medium',
 'Medium first then paint',
 'Water and paint mixed on the brush',
 'Dry brush only',
 'b', 2),

('P5', 'Why should you not scrub back and forth?',
 'It wastes paint',
 'It takes too long',
 'It damages the brush and creates muddy paint',
 'It makes paint too light',
 'c', 3),

-- ── P6 ──────────────────────────────────────────────────
('P6', 'Where do you blend two colours?',
 'Anywhere on the canvas',
 'Only at the edges',
 'Where they meet — at the boundary between them',
 'On the palette only',
 'c', 1),

('P6', 'What creates the smoothest blending?',
 'A wet brush loaded with paint',
 'A large stiff brush',
 'A clean dry brush feathered over the edge',
 'A fan brush',
 'c', 2),

('P6', 'What is the key to good blending?',
 'Pressing hard with the brush',
 'A light touch and patience',
 'Adding lots of water',
 'Using only one colour',
 'b', 3),

-- ── P7 ──────────────────────────────────────────────────
('P7', 'What should you avoid to lighten a colour?',
 'Black',
 'White as your main lightener',
 'Yellow',
 'Water',
 'b', 1),

('P7', 'To make a lighter green, what should you add?',
 'More white',
 'More yellow',
 'More blue',
 'More red',
 'b', 2),

('P7', 'What happens when one colour dominates a mix?',
 'Both colours disappear',
 'The dominant colour takes over the mix',
 'The result is always grey',
 'Nothing changes',
 'b', 3),

-- ── P8 ──────────────────────────────────────────────────
('P8', 'What does colour is relative mean?',
 'All colours are the same value',
 'The same colour can look different depending on what surrounds it',
 'Colours change when they dry',
 'Colour mixing is unpredictable',
 'b', 1),

('P8', 'Why should you step back from your painting regularly?',
 'To take a break',
 'To see how colours relate to each other across the whole picture',
 'To let paint dry faster',
 'To clean your brushes',
 'b', 2),

('P8', 'Where should you test a new colour before applying it fully?',
 'Anywhere on the canvas',
 'On the palette alone',
 'On a small area of canvas next to surrounding colours',
 'On a piece of paper',
 'c', 3),

-- ── P9 ──────────────────────────────────────────────────
('P9', 'How quickly does acrylic paint dry?',
 'Several days',
 'Six months',
 'Within minutes to hours',
 'After one week',
 'c', 1),

('P9', 'What happens if you paint on top of a wet oil layer?',
 'Nothing — it is fine',
 'You can muddy colours and disturb the layer below',
 'The colour gets brighter',
 'The paint dries faster',
 'b', 2),

('P9', 'How long does oil paint take to fully cure?',
 'One day',
 'One week',
 'One month',
 'Up to six months',
 'd', 3),

-- ── P10 ─────────────────────────────────────────────────
('P10', 'What is the goal of Layer One?',
 'Add final highlights',
 'Block in basic shapes and separate dark from light roughly',
 'Define all the details',
 'Blend everything smooth',
 'b', 1),

('P10', 'In which layer do you define specific details like eyes and lips?',
 'Layer One',
 'Layer Two',
 'Layer Three',
 'Layer Four',
 'd', 2),

('P10', 'Which layer is your final pass?',
 'Layer One',
 'Layer Two',
 'Layer Three',
 'Layer Five',
 'd', 3),

-- ── P11 ─────────────────────────────────────────────────
('P11', 'What makes painting feel complicated at first?',
 'It is actually very difficult',
 'All the materials and layers before you know the process',
 'You need special talent',
 'It requires expensive tools',
 'b', 1),

('P11', 'What is the full painting process in order?',
 'Highlights, layers, sketch',
 'Sketch, base, colour separation, blending, details, highlights',
 'Mix colours then paint everything at once',
 'Outline, fill, done',
 'b', 2),

('P11', 'What is the real difference between a beginner and experienced artist?',
 'Natural talent',
 'Better materials',
 'The number of times they have followed the process',
 'Age',
 'c', 3),

-- ── P12 ─────────────────────────────────────────────────
('P12', 'What are the five layers in order?',
 'Base, sketch, blend, details, highlights',
 'Sketch, base, colour separation, blend and depth, details and highlights',
 'Mix, apply, wait, repeat',
 'Outline, fill, done',
 'b', 1),

('P12', 'What should you do after finishing your painting?',
 'Frame it immediately',
 'Paint over it and start again',
 'Photograph it and send it on WhatsApp for your review call',
 'Wait three months before looking at it',
 'c', 2),

('P12', 'What does this course say you can paint?',
 'Only simple objects',
 'Only faces',
 'Anything',
 'Only still life',
 'c', 3);

COMMIT;

-- ============================================================
-- CONFIRMATION
-- ============================================================
SELECT
  track,
  COUNT(*) AS lesson_count
FROM public.lessons
GROUP BY track
ORDER BY track;

SELECT
  l.track,
  COUNT(q.id) AS question_count
FROM public.quiz_questions q
JOIN public.lessons l ON l.lesson_code = q.lesson_code
GROUP BY l.track
ORDER BY l.track;
